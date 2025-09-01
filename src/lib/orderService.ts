import { supabase } from "./supabase";
import { EmailService, type OrderEmailData } from "./emailService";
import { logger } from "@/components/ui/Logger";
import type { ShippingAddress } from "@/types/shipping";

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  buyer_id: string;
  seller_id: string;
  product_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  shipping_address?: ShippingAddress;
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
      const { data, error } = await supabase
        .from("orders")
        .insert([
          {
            buyer_id: orderData.buyer_id,
            seller_id: orderData.seller_id,
            product_id: orderData.product_id,
            payment_id: orderData.payment_id,
            razorpay_order_id: orderData.razorpay_order_id,
            amount: orderData.amount,
            shipping_address: orderData.shipping_address || {},
            status: "confirmed",
          },
        ])
        .select()
        .single();

      if (error) throw error;
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
    buyerDetails: { full_name: string; email: string },
    shippingAddress?: ShippingAddress
  ): Promise<Order[]> {
    try {
      const orders: Order[] = [];

      // Create orders for each item and notify sellers
      for (const item of cartItems) {
        // Get product details
        const productDetails = await this.getProductDetails(item.productId);

        if (!productDetails) {
          logger.warn(`Product ${item.productId} not found, skipping`);
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

        // Update product listing status to sold
        await supabase
          .from("product_listings")
          .update({ status: "sold" })
          .eq("id", item.productId);
      }

      return orders;
    } catch (error) {
      console.error("Error processing cart checkout:", error);
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
