import { supabase } from "./supabase";
import { EmailService, type OrderEmailData } from "./emailService";
import { logger } from "@/components/ui/Logger";
import type { ShippingAddress } from "@/types/shipping";
import { StockValidationService } from "./stockValidationService";

export interface Order {
  id: string;
  // [GUEST CHECKOUT] buyer_id is nullable for guest orders
  buyer_id: string | null;
  seller_id: string;
  product_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  status: "pending" | "pending_payment" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  // [GUEST CHECKOUT] Guest buyer contact info stored directly on order
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  buyer_id: string;
  seller_id: string;
  product_id: string;
  payment_id?: string;
  razorpay_order_id?: string;
  amount: number;
  shipping_address?: ShippingAddress;
  status?: Order["status"];
  // [GUEST CHECKOUT] Guest buyer contact info stored directly on order
  buyer_email?: string;
  buyer_name?: string;
  buyer_phone?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  sellerId: string;
  productName: string;
  brand: string;
  price: number;
  image?: string;
  size: string;
  condition: string;
  sellerName: string;
  sellerEmail: string;
  quantity: number;
}

export class OrderService {
  // Create a new order
  static async createOrder(orderData: CreateOrderRequest): Promise<Order> {
    try {
      const isGuestOrder = !orderData.buyer_id;

      // [GUEST CHECKOUT] Use SECURITY DEFINER RPC function to bypass RLS for
      // guest orders, since anonymous users can't insert into the orders table.
      if (isGuestOrder) {
        const { data, error } = await supabase.rpc("create_guest_order", {
          p_seller_id: orderData.seller_id,
          p_product_id: orderData.product_id,
          p_amount: orderData.amount,
          p_shipping_address: orderData.shipping_address || {},
          p_status: orderData.status || "pending_payment",
          p_buyer_email: orderData.buyer_email || null,
          p_buyer_name: orderData.buyer_name || null,
          p_buyer_phone: orderData.buyer_phone || null,
          p_payment_id: orderData.payment_id || null,
        });

        if (error) throw error;
        if (!data) throw new Error("Failed to create order — no data returned");
        // RPC with RETURNS SETOF returns an array; take the first row
        const order = Array.isArray(data) ? data[0] : data;
        return order;
      }

      // Authenticated user — direct insert (existing RLS policies allow this)
      const insertData: Record<string, unknown> = {
        buyer_id: orderData.buyer_id,
        seller_id: orderData.seller_id,
        product_id: orderData.product_id,
        amount: orderData.amount,
        shipping_address: orderData.shipping_address || {},
        status: orderData.status || "confirmed",
        buyer_email: orderData.buyer_email || null,
        buyer_name: orderData.buyer_name || null,
        buyer_phone: orderData.buyer_phone || null,
      };
      if (orderData.payment_id) {
        insertData.payment_id = orderData.payment_id;
      }
      const { data, error } = await supabase
        .from("orders")
        .insert([insertData])
        .select()
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Failed to create order — no data returned");
      return data;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  // Get product details for notification
  static async getProductDetails(productId: string) {
    try {
      const { data, error } = await supabase
        .from("product_listings")
        .select(
          `
          id,
          title,
          price,
          user_id,
          product_images (
            image_url,
            is_poster_image
          )
        `
        )
        .eq("id", productId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching product details:", error);
      throw error;
    }
  }

  // Process cart checkout - create orders and notify sellers
  static async processCartCheckout(
    cartItems: CartItem[],
    paymentId: string,
    razorpayOrderId: string,
    buyerId: string,
    // [GUEST CHECKOUT] phone added for guest buyer contact info
    buyerDetails: { full_name: string; email: string; phone?: string },
    shippingAddress?: ShippingAddress
  ): Promise<Order[]> {
    try {
      // CRITICAL: Validate all cart items are still available before processing
      await StockValidationService.validateBeforeCheckout(cartItems);

      const orders: Order[] = [];
      const failedItems: string[] = [];

      // Create orders for each item and notify sellers
      for (const item of cartItems) {
        // Double-check product availability (in case of race condition)
        const availability = await StockValidationService.checkProductAvailability(
          item.productId
        );

        if (!availability.isAvailable) {
          logger.warn(
            `Product ${item.productName} (${item.productId}) is no longer available. Status: ${availability.currentStatus}`
          );
          failedItems.push(item.productName);
          continue;
        }

        // Get product details
        const productDetails = await this.getProductDetails(item.productId);

        if (!productDetails) {
          logger.warn(`Product ${item.productId} not found, skipping`);
          failedItems.push(item.productName);
          continue;
        }

        // Mark product as sold using optimistic locking
        // This prevents race conditions where multiple users try to buy the same item
        const markedAsSold = await StockValidationService.markProductAsSold(
          item.productId
        );

        if (!markedAsSold) {
          logger.error(
            `Failed to mark product ${item.productName} as sold - already sold or unavailable`
          );
          failedItems.push(item.productName);
          continue;
        }

        // Create order
        const order = await this.createOrder({
          buyer_id: buyerId,
          seller_id: item.sellerId,
          product_id: item.productId,
          payment_id: paymentId,
          razorpay_order_id: razorpayOrderId,
          amount: item.price,
          shipping_address: shippingAddress || undefined,
          // [GUEST CHECKOUT] Store guest buyer contact info on each order
          buyer_email: buyerDetails.email,
          buyer_name: buyerDetails.full_name,
          buyer_phone: buyerDetails.phone,
        });

        orders.push(order);

        // Prepare order email data
        const orderEmailData: OrderEmailData = {
          order_id: order.id,
          product_title: item.productName,
          product_image:
            productDetails.product_images?.find((img) => img.is_poster_image)
              ?.image_url || productDetails.product_images?.[0]?.image_url,
          amount: item.price,
          currency: "INR",
          buyer_name: buyerDetails.full_name,
          buyer_email: buyerDetails.email,
          seller_name: item.sellerName,
          seller_email: item.sellerEmail,
          order_status: "confirmed",
          shipping_address: shippingAddress || undefined,
        };

        // Send email notifications
        try {
          // Send order confirmation to buyer
          if (buyerDetails.email) {
            await EmailService.sendOrderConfirmationToBuyer(
              buyerDetails.email,
              buyerDetails.full_name,
              orderEmailData
            );
          }

          // Send payment confirmation to seller
          if (item.sellerEmail) {
            await EmailService.sendOrderConfirmationToSeller(
              item.sellerEmail,
              item.sellerName,
              orderEmailData
            );
          }
        } catch (emailError) {
          logger.warn(
            `Failed to send email notifications: ${
              emailError instanceof Error ? emailError.message : "Unknown error"
            }`
          );
          // Don't fail the order creation if emails fail
        }
      }

      // If any items failed to process, throw an error with details
      if (failedItems.length > 0) {
        throw new Error(
          `Some items could not be processed: ${failedItems.join(", ")}. Please refresh your cart and try again.`
        );
      }

      return orders;
    } catch (error) {
      console.error("Error processing cart checkout:", error);
      throw error;
    }
  }

  // Process WhatsApp checkout - create orders with pending_payment status
  static async processWhatsAppCheckout(
    cartItems: CartItem[],
    orderRef: string,
    buyerId: string,
    buyerDetails: { full_name: string; email: string; phone?: string },
    shippingAddress?: ShippingAddress
  ): Promise<Order[]> {
    try {
      // Validate all cart items are still available before processing
      await StockValidationService.validateBeforeCheckout(cartItems);

      const orders: Order[] = [];
      const failedItems: string[] = [];

      for (const item of cartItems) {
        const availability =
          await StockValidationService.checkProductAvailability(item.productId);

        if (!availability.isAvailable) {
          logger.warn(
            `Product ${item.productName} (${item.productId}) is no longer available. Status: ${availability.currentStatus}`
          );
          failedItems.push(item.productName);
          continue;
        }

        const productDetails = await this.getProductDetails(item.productId);

        if (!productDetails) {
          logger.warn(`Product ${item.productId} not found, skipping`);
          failedItems.push(item.productName);
          continue;
        }

        // NOTE: Product is NOT marked as sold here because:
        // 1. Guest users can't update product_listings (RLS)
        // 2. Payment hasn't been received yet — marking sold prematurely
        //    would lock products if the buyer never pays.
        // Product will be marked as sold when admin clicks "Confirm Payment".

        // Create order with pending_payment status
        const order = await this.createOrder({
          buyer_id: buyerId,
          seller_id: item.sellerId,
          product_id: item.productId,
          amount: item.price,
          shipping_address: shippingAddress || undefined,
          status: "pending_payment",
          buyer_email: buyerDetails.email,
          buyer_name: buyerDetails.full_name,
          buyer_phone: buyerDetails.phone,
        });

        orders.push(order);

        // Prepare order email data
        const orderEmailData: OrderEmailData = {
          order_id: order.id,
          product_title: item.productName,
          product_image:
            productDetails.product_images?.find(
              (img: { is_poster_image: boolean }) => img.is_poster_image
            )?.image_url || productDetails.product_images?.[0]?.image_url,
          amount: item.price,
          currency: "INR",
          buyer_name: buyerDetails.full_name,
          buyer_email: buyerDetails.email,
          seller_name: item.sellerName,
          seller_email: item.sellerEmail,
          order_status: "pending_payment",
          shipping_address: shippingAddress || undefined,
        };

        // Send email notifications
        try {
          if (buyerDetails.email) {
            await EmailService.sendOrderConfirmationToBuyer(
              buyerDetails.email,
              buyerDetails.full_name,
              orderEmailData
            );
          }

          if (item.sellerEmail) {
            await EmailService.sendOrderConfirmationToSeller(
              item.sellerEmail,
              item.sellerName,
              orderEmailData
            );
          }
        } catch (emailError) {
          logger.warn(
            `Failed to send email notifications: ${
              emailError instanceof Error ? emailError.message : "Unknown error"
            }`
          );
        }
      }

      if (failedItems.length > 0) {
        throw new Error(
          `Some items could not be processed: ${failedItems.join(", ")}. Please refresh your cart and try again.`
        );
      }

      return orders;
    } catch (error) {
      console.error("Error processing WhatsApp checkout:", error);
      throw error;
    }
  }

  // Get orders for a user (as buyer)
  static async getBuyerOrders(buyerId: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          product_listings (
            title,
            brand,
            product_images (
              image_url,
              is_poster_image
            )
          )
        `
        )
        .eq("buyer_id", buyerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching buyer orders:", error);
      throw error;
    }
  }

  // Get orders for a user (as seller)
  static async getSellerOrders(sellerId: string): Promise<Order[]> {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          `
          *,
          product_listings (
            title,
            brand,
            product_images (
              image_url,
              is_poster_image
            )
          )
        `
        )
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching seller orders:", error);
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(
    orderId: string,
    status: Order["status"],
    trackingNumber?: string
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = { status };
      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Send email notifications based on status change
      // await this.sendStatusUpdateEmails(orderId, status, trackingNumber);
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  // Send email notifications when order status changes
  // private static async sendStatusUpdateEmails(
  //   orderId: string,
  //   status: Order["status"],
  //   trackingNumber?: string
  // ): Promise<void> {
  //   try {
  //     // Get order details with buyer and seller information
  //     const { data: order, error } = await supabase
  //       .from("orders")
  //       .select(
  //         `
  //         *,
  //         product_listings (
  //           title,
  //           product_images (
  //             image_url,
  //             is_poster_image
  //           )
  //         )
  //       `
  //       )
  //       .eq("id", orderId)
  //       .single();

  //     if (error || !order) {
  //       logger.warn(`Order ${orderId} not found for email notifications`);
  //       return;
  //     }

  //     // Get buyer and seller details
  //     const buyerDetails = await this.getBuyerDetails(order.buyer_id);
  //     const sellerDetails = await this.getSellerDetails(order.seller_id);

  //     // Prepare order email data
  //     const orderEmailData: OrderEmailData = {
  //       order_id: order.id,
  //       product_title: order.product_listings?.title || "Product",
  //       product_image:
  //         order.product_listings?.product_images?.find(
  //           (img: { is_poster_image: boolean }) => img.is_poster_image
  //         )?.image_url ||
  //         order.product_listings?.product_images?.[0]?.image_url,
  //       amount: order.amount,
  //       currency: "INR",
  //       buyer_name: buyerDetails.full_name,
  //       buyer_email: buyerDetails.email,
  //       seller_name: sellerDetails.full_name,
  //       seller_email: sellerDetails.email,
  //       order_status: status,
  //       tracking_number: trackingNumber,
  //     };

  //     // Send appropriate emails based on status
  //     switch (status) {
  //       case "shipped":
  //         if (buyerDetails.email) {
  //           await EmailService.sendShippingNotificationToBuyer(
  //             buyerDetails.email,
  //             buyerDetails.full_name,
  //             orderEmailData
  //           );
  //         }
  //         break;

  //       case "delivered":
  //         if (buyerDetails.email) {
  //           await EmailService.sendDeliveryConfirmationToBuyer(
  //             buyerDetails.email,
  //             buyerDetails.full_name,
  //             orderEmailData
  //           );
  //         }
  //         break;

  //       case "cancelled":
  //         if (buyerDetails.email) {
  //           await EmailService.sendOrderCancellationToBuyer(
  //             buyerDetails.email,
  //             buyerDetails.full_name,
  //             orderEmailData
  //           );
  //         }
  //         break;
  //     }
  //   } catch (emailError) {
  //     logger.warn(
  //       `Failed to send status update emails: ${
  //         emailError instanceof Error ? emailError.message : "Unknown error"
  //       }`
  //     );
  //     // Don't fail the order update if emails fail
  //   }
  // }

  // Get order by ID
  // private static async getOrderById(orderId: string): Promise<Order | null> {
  //   try {
  //     const { data, error } = await supabase
  //       .from("orders")
  //       .select("*")
  //       .eq("id", orderId)
  //       .single();

  //     if (error) return null;
  //     return data;
  //   } catch {
  //     return null;
  //   }
  // }
}
