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
  ordered_size?: string;
  /** UUID of the product_variant that was ordered (null for legacy listings) */
  variant_id?: string | null;
  /** Display name of the ordered variant e.g. "University Blue" */
  variant_name?: string | null;
  coupon_id?: string | null;
  coupon_code?: string | null;
  discount_amount?: number;
  original_amount?: number | null;
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
  ordered_size?: string;
  variant_id?: string | null;
  variant_name?: string | null;
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
  /** UUID of the selected product_variant (null for legacy listings) */
  variantId?: string | null;
  /** Display name of the selected variant e.g. "University Blue" */
  variantName?: string | null;
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
          p_ordered_size: orderData.ordered_size || null,
          p_variant_id: orderData.variant_id || null,
          p_variant_name: orderData.variant_name || null,
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
        ordered_size: orderData.ordered_size || null,
        variant_id: orderData.variant_id || null,
        variant_name: orderData.variant_name || null,
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
        // Pass size + variantId so variant-based listings are checked correctly
        const availability = await StockValidationService.checkProductAvailability(
          item.productId,
          item.size,
          item.variantId
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

        // Mark the specific size (or whole product for single-size) as sold
        // This prevents race conditions where multiple users try to buy the same item
        const markedAsSold = await StockValidationService.markSizeAsSold(
          item.productId,
          item.size,
          item.variantId
        );

        if (!markedAsSold) {
          logger.error(
            `Failed to mark product ${item.productName} (size ${item.size}) as sold - already sold or unavailable`
          );
          failedItems.push(item.productName);
          continue;
        }

        // Use the server-side price from the DB, never trust the client-supplied price.
        const verifiedPrice: number = productDetails.price;

        // Create order
        const order = await this.createOrder({
          buyer_id: buyerId,
          seller_id: item.sellerId,
          product_id: item.productId,
          payment_id: paymentId,
          razorpay_order_id: razorpayOrderId,
          amount: verifiedPrice,
          shipping_address: shippingAddress || undefined,
          // [GUEST CHECKOUT] Store guest buyer contact info on each order
          buyer_email: buyerDetails.email,
          buyer_name: buyerDetails.full_name,
          buyer_phone: buyerDetails.phone,
          ordered_size: item.size,
          variant_id: item.variantId || null,
          variant_name: item.variantName || null,
        });

        orders.push(order);

        // Prepare order email data
        const orderEmailData: OrderEmailData = {
          order_id: order.id,
          product_title: item.productName,
          product_image:
            productDetails.product_images?.find((img) => img.is_poster_image)
              ?.image_url || productDetails.product_images?.[0]?.image_url,
          amount: verifiedPrice,
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
    buyerId: string,
    buyerDetails: { full_name: string; email: string; phone?: string },
    shippingAddress?: ShippingAddress,
    couponCode?: string | null,
    couponDiscountAmount?: number
  ): Promise<Order[]> {
    try {
      // Validate all cart items are still available before processing
      await StockValidationService.validateBeforeCheckout(cartItems);

      const orders: Order[] = [];
      const failedItems: string[] = [];

      for (const item of cartItems) {
        const availability =
          await StockValidationService.checkProductAvailability(item.productId, item.size, item.variantId);

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

        // Use the server-side price from the DB, never trust the client-supplied price.
        const verifiedPrice: number = productDetails.price;

        // Create order with pending_payment status
        const order = await this.createOrder({
          buyer_id: buyerId,
          seller_id: item.sellerId,
          product_id: item.productId,
          amount: verifiedPrice,
          shipping_address: shippingAddress || undefined,
          status: "pending_payment",
          buyer_email: buyerDetails.email,
          buyer_name: buyerDetails.full_name,
          buyer_phone: buyerDetails.phone,
          ordered_size: item.size,
          variant_id: item.variantId || null,
          variant_name: item.variantName || null,
        });

        orders.push(order);
        // NOTE: Emails are NOT sent here. Order confirmation emails are sent
        // only when the admin confirms payment from the orders dashboard.
      }

      if (failedItems.length > 0) {
        throw new Error(
          `Some items could not be processed: ${failedItems.join(", ")}. Please refresh your cart and try again.`
        );
      }

      // Store the coupon reference on the order WITHOUT redeeming it yet.
      // Redemption (incrementing used_count + patching order amount) is deferred
      // until the admin confirms payment via finalize_coupon_redemption.
      if (couponCode && couponDiscountAmount && couponDiscountAmount > 0 && orders.length > 0) {
        try {
          const { data: couponRow } = await supabase
            .from("coupons")
            .select("id, applicable_product_ids")
            .eq("code", couponCode.toUpperCase())
            .single();

          if (couponRow) {
            // Find the first eligible order (the one whose item the coupon applies to).
            // If the coupon has no product restriction, use the first order.
            let targetOrder = orders[0];
            if (couponRow.applicable_product_ids) {
              const eligible = orders.find((o) =>
                (couponRow.applicable_product_ids as string[]).includes(o.product_id)
              );
              if (eligible) targetOrder = eligible;
            }

            const { error: saveError } = await supabase.rpc("save_pending_coupon", {
              p_order_id:        targetOrder.id,
              p_coupon_id:       couponRow.id,
              p_coupon_code:     couponCode.toUpperCase(),
              p_discount_amount: couponDiscountAmount,
            });

            if (saveError) {
              logger.warn(`Failed to save pending coupon (non-fatal): ${saveError.message}`);
            }
          }
        } catch (couponErr) {
          logger.warn(
            `Coupon save error (non-fatal): ${couponErr instanceof Error ? couponErr.message : "Unknown error"}`
          );
        }
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

      // When an order is delivered, send a review request email to the buyer
      if (status === "delivered") {
        await this.sendReviewRequestEmail(orderId);
      }
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }

  // Send a review-request email after delivery
  private static async sendReviewRequestEmail(orderId: string): Promise<void> {
    try {
      // Fetch order with product details needed for the email
      const { data: order, error } = await supabase
        .from("orders")
        .select(`
          id,
          product_id,
          buyer_id,
          buyer_email,
          buyer_name,
          product_listings (
            id,
            title,
            slug,
            product_images ( image_url, is_poster_image )
          )
        `)
        .eq("id", orderId)
        .single();

      if (error || !order) {
        logger.warn(`sendReviewRequestEmail: order ${orderId} not found`);
        return;
      }

      // Resolve buyer email — guest orders store it directly, logged-in buyers may not
      let buyerEmail = order.buyer_email ?? null;
      let buyerName = order.buyer_name ?? "Customer";

      if (!buyerEmail && order.buyer_id) {
        const { data: profile } = await supabase
          .from("sellers")
          .select("email, display_name")
          .eq("id", order.buyer_id)
          .single();
        buyerEmail = profile?.email ?? null;
        buyerName = profile?.display_name ?? buyerName;
      }

      if (!buyerEmail) {
        logger.warn(`sendReviewRequestEmail: no buyer email for order ${orderId}`);
        return;
      }

      const listing = Array.isArray(order.product_listings)
        ? order.product_listings[0]
        : order.product_listings;

      if (!listing) {
        logger.warn(`sendReviewRequestEmail: no listing for order ${orderId}`);
        return;
      }

      const listingImages = Array.isArray(listing.product_images) ? listing.product_images : [];
      const posterImage =
        listingImages.find((img: { is_poster_image: boolean }) => img.is_poster_image)?.image_url ??
        listingImages[0]?.image_url ??
        undefined;

      // Create a single-use review token via SECURITY DEFINER RPC
      const { data: token, error: tokenError } = await supabase.rpc(
        "create_review_token",
        {
          p_order_id:   orderId,
          p_listing_id: listing.id,
          p_email:      buyerEmail,
        }
      );

      if (tokenError || !token) {
        logger.warn(`sendReviewRequestEmail: failed to create token — ${tokenError?.message}`);
        return;
      }

      const reviewUrl = `${window.location.origin}/review?token=${token}`;

      // Send email via the existing edge function
      await supabase.functions.invoke("send-order-email", {
        body: {
          type:            "review_request",
          recipient_email: buyerEmail,
          recipient_name:  buyerName,
          order_data: {
            order_id:      orderId,
            product_title: listing.title,
            product_image: posterImage,
            amount:        0,
            currency:      "INR",
            order_status:  "delivered",
          },
          template_data: {
            action_url: reviewUrl,
          },
        },
      });

      logger.info(`Review request email sent to ${buyerEmail} for order ${orderId}`);
    } catch (err) {
      // Never let review email failure bubble up and break the status update
      logger.warn(
        `sendReviewRequestEmail failed (non-fatal): ${err instanceof Error ? err.message : "Unknown error"}`
      );
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

  // Delete an order (admin only — enforced server-side via SECURITY DEFINER RPC)
  static async deleteOrder(orderId: string): Promise<void> {
    try {
      const { error } = await supabase.rpc("delete_order", {
        p_order_id: orderId,
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error deleting order:", error);
      throw error;
    }
  }

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
