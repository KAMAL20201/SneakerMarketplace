import { supabase } from "./supabase";
import { logger } from "@/components/ui/Logger";
import type { ShippingAddress } from "@/types/shipping";

const BASE_URL =
  typeof window !== "undefined" && !window.location.origin.includes("localhost")
    ? window.location.origin
    : "https://theplugmarket.in";

export interface SimilarProduct {
  id: string;
  slug?: string;
  title: string;
  price: number;
  image_url?: string;
}

export interface OrderEmailData {
  order_id: string;
  product_title: string;
  product_image?: string;
  amount: number;
  original_amount?: number;
  discount_amount?: number;
  currency: string;
  buyer_name?: string;
  buyer_email?: string;
  seller_name?: string;
  seller_email?: string;
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  courier_name?: string;
  order_status: "pending" | "pending_payment" | "confirmed" | "shipped" | "delivered" | "cancelled";
  estimated_delivery?: string;
  product_id?: string;
  brand?: string;
  variant_name?: string;
  ordered_size?: string;
  custom_message?: string;
  similar_products?: SimilarProduct[];
  tracking_url?: string;
}

export interface EmailNotificationRequest {
  type:
    | "order_confirmed"
    | "order_shipped"
    | "order_delivered"
    | "order_cancelled"
    | "payment_received"
    | "payment_reminder"
    | "preorder_live"
    | "whatsapp_invite";
  recipient_email: string;
  recipient_name: string;
  order_data: OrderEmailData;
  template_data?: Record<string, string>;
}

export class EmailService {

  private static async fetchSimilarProducts(
    brand: string,
    excludeProductId: string
  ): Promise<SimilarProduct[]> {
    try {
      const { data } = await supabase
        .from("listings_with_images")
        .select("id, slug, title, price, image_url")
        .eq("status", "active")
        .eq("brand", brand)
        .neq("id", excludeProductId)
        .order("created_at", { ascending: false })
        .limit(4);
      return (data as SimilarProduct[]) ?? [];
    } catch {
      return [];
    }
  }

  private static async withSimilarProducts(
    orderData: OrderEmailData
  ): Promise<OrderEmailData> {
    if (!orderData.brand || !orderData.product_id) return orderData;
    const similar_products = await this.fetchSimilarProducts(
      orderData.brand,
      orderData.product_id
    );
    return { ...orderData, similar_products };
  }

  /**
   * Send email via Supabase Edge Function (server-side SES)
   */
  private static async sendEmail(
    type: string,
    recipientEmail: string,
    recipientName: string,
    orderData: OrderEmailData,
    templateData: Record<string, string>
  ): Promise<boolean> {
    return await this.sendEmailViaSupabase(
      type,
      recipientEmail,
      recipientName,
      orderData,
      templateData
    );
  }

  /**
   * Send email via Supabase (fallback)
   */
  private static async sendEmailViaSupabase(
    type: string,
    recipientEmail: string,
    recipientName: string,
    orderData: OrderEmailData,
    templateData: Record<string, string>
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          order_data: orderData,
          template_data: templateData,
        },
      });

      if (error) {
        logger.error(
          `Failed to send Supabase email: ${error.message || "Unknown error"}`
        );
        return false;
      }

      logger.info(`Supabase email sent successfully to: ${recipientEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending Supabase email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send order confirmation email to buyer
   */
  static async sendOrderConfirmationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    const enriched = await this.withSimilarProducts(orderData);
    return await this.sendEmail(
      "order_confirmed",
      buyerEmail,
      buyerName,
      enriched,
      {
        subject: "🎉 Order Confirmed! Your purchase is being processed",
        action_text: "Continue Shopping",
        action_url: `${BASE_URL}/`,
      }
    );
  }

  /**
   * Send order confirmation email to seller
   */
  static async sendOrderConfirmationToSeller(
    sellerEmail: string,
    sellerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    return await this.sendEmail(
      "payment_received",
      sellerEmail,
      sellerName,
      orderData,
      {
        subject: "💰 Payment Received! New order to fulfill",
        action_text: "View Orders",
        action_url: `${BASE_URL}/my-orders`,
      }
    );
  }

  /**
   * Send shipping notification to buyer
   */
  static async sendShippingNotificationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    const enriched = await this.withSimilarProducts(orderData);
    return await this.sendEmail(
      "order_shipped",
      buyerEmail,
      buyerName,
      enriched,
      {
        subject: "📦 Your order has been shipped!",
        action_text: "Contact Support",
        action_url: `${BASE_URL}/contact-us`,
      }
    );
  }

  /**
   * Send delivery confirmation to buyer
   */
  static async sendDeliveryConfirmationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    const enriched = await this.withSimilarProducts(orderData);
    return await this.sendEmail(
      "order_delivered",
      buyerEmail,
      buyerName,
      enriched,
      {
        subject: "✅ Your order has been delivered!",
        action_text: "Shop Again",
        action_url: `${BASE_URL}/`,
      }
    );
  }

  /**
   * Send order cancellation notification to buyer
   */
  static async sendOrderCancellationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    const enriched = await this.withSimilarProducts(orderData);
    return await this.sendEmail(
      "order_cancelled",
      buyerEmail,
      buyerName,
      enriched,
      {
        subject: "❌ Order Cancelled",
        action_text: "Contact Support",
        action_url: `${BASE_URL}/contact-us`,
      }
    );
  }

  /**
   * Send shipping reminder to seller
   */
  static async sendShippingReminderToSeller(
    sellerEmail: string,
    sellerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    return await this.sendEmail(
      "shipping_reminder",
      sellerEmail,
      sellerName,
      orderData,
      {
        subject: "⏰ Reminder: Ship your order within 24 hours",
        action_text: "View Orders",
        action_url: `${BASE_URL}/my-orders`,
      }
    );
  }

  /**
   * Send bulk email notifications for multiple orders
   */
  static async sendBulkOrderNotifications(
    notifications: EmailNotificationRequest[]
  ): Promise<{ success: number; failed: number }> {
    let successCount = 0;
    let failedCount = 0;

    for (const notification of notifications) {
      try {
        const emailResult = await this.sendEmail(
          notification.type,
          notification.recipient_email,
          notification.recipient_name,
          notification.order_data,
          notification.template_data || {}
        );

        if (emailResult) {
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        logger.error(
          `Error sending email notification: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }

  /**
   * Send payment reminder email to buyer who has a pending_payment order
   */
  static async sendPaymentReminderEmail(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    const productUrl = orderData.product_id
      ? `${BASE_URL}/product/${orderData.product_id}`
      : `${BASE_URL}/`;
    const enriched = await this.withSimilarProducts(orderData);
    return await this.sendEmail(
      "payment_reminder",
      buyerEmail,
      buyerName,
      enriched,
      {
        subject: `Don't miss out — complete your order for ${orderData.product_title}`,
        action_text: "Complete Your Purchase",
        action_url: productUrl,
      }
    );
  }

  /**
   * Send "Pre-Orders Are Live!" email to buyer
   */
  static async sendPreOrderLiveEmail(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    const productUrl = orderData.product_id
      ? `${BASE_URL}/product/${orderData.product_id}`
      : `${BASE_URL}/pre-orders`;
    const enriched = await this.withSimilarProducts(orderData);
    return await this.sendEmail(
      "preorder_live",
      buyerEmail,
      buyerName,
      enriched,
      {
        subject: `🔥 Pre-Order Open: ${orderData.product_title} — Reserve Yours Now!`,
        action_text: "Pre-Order Now",
        action_url: productUrl,
      }
    );
  }

  /**
   * Send review request email to buyer with a token-gated link
   */
  static async sendReviewRequestEmail(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData,
    reviewToken: string
  ): Promise<boolean> {
    const reviewUrl = `${BASE_URL}/review?token=${reviewToken}`;
    return await this.sendEmail(
      "review_request",
      buyerEmail,
      buyerName,
      orderData,
      {
        subject: `How was your ${orderData.product_title}? Leave a review`,
        action_url: reviewUrl,
      }
    );
  }

  /**
   * Send WhatsApp community invite email to a single recipient
   */
  static async sendWhatsAppInviteEmail(
    recipientEmail: string,
    recipientName: string
  ): Promise<boolean> {
    // Minimal order_data required by edge function schema
    const dummyOrderData: OrderEmailData = {
      order_id: "whatsapp-invite",
      product_title: "",
      amount: 0,
      currency: "INR",
      order_status: "confirmed",
    };
    return await this.sendEmail(
      "whatsapp_invite",
      recipientEmail,
      recipientName,
      dummyOrderData,
      { subject: "🔥 Exclusive Deals Inside — Join Our WhatsApp Community" }
    );
  }

  /**
   * Send WhatsApp invite to a list of recipients in batches.
   * Records each send in campaign_sends so the same email is never sent twice.
   * Adds a 300ms delay between sends to stay within Resend rate limits.
   */
  static async sendBulkWhatsAppInvite(
    recipients: Array<{ email: string; name: string }>
  ): Promise<{
    success: number;
    failed: number;
    results: Array<{ email: string; status: "success" | "failed" }>;
  }> {
    let success = 0;
    let failed = 0;
    const results: Array<{ email: string; status: "success" | "failed" }> = [];

    for (const recipient of recipients) {
      let status: "success" | "failed" = "failed";
      try {
        const sent = await this.sendWhatsAppInviteEmail(recipient.email, recipient.name);
        if (sent) {
          success++;
          status = "success";
        } else {
          failed++;
        }
      } catch (err) {
        failed++;
        logger.error(
          `WhatsApp invite failed for ${recipient.email}: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }

      // Record result in campaign_sends regardless of success/failure
      try {
        await supabase.from("campaign_sends").insert({
          campaign: "whatsapp_invite",
          email: recipient.email,
          status,
        });
      } catch (dbErr) {
        logger.error(
          `Failed to record campaign_send for ${recipient.email}: ${
            dbErr instanceof Error ? dbErr.message : "Unknown"
          }`
        );
      }

      results.push({ email: recipient.email, status });

      // 300ms delay between sends — keeps us within Resend's rate limit
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return { success, failed, results };
  }

  /**
   * Test email service configuration
   */
  static async testEmailService(): Promise<{
    ses: boolean;
    supabase: boolean;
  }> {
    const testEmail = "test@example.com";
    const testData: OrderEmailData = {
      order_id: "test-123",
      product_title: "Test Product",
      amount: 1000,
      currency: "INR",
      order_status: "confirmed",
    };

    const sesResult = false;

    const supabaseResult = await this.sendEmailViaSupabase(
      "order_confirmed",
      testEmail,
      "Test User",
      testData,
      { action_url: "#" }
    );

    return {
      ses: sesResult,
      supabase: supabaseResult,
    };
  }
}
