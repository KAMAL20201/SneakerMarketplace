import { supabase } from "./supabase";
import { logger } from "@/components/ui/Logger";
import type { ShippingAddress } from "@/types/shipping";

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
  similar_products?: SimilarProduct[];
}

export interface EmailNotificationRequest {
  type:
    | "order_confirmed"
    | "order_shipped"
    | "order_delivered"
    | "order_cancelled"
    | "payment_received";
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
        action_url: `${window.location.origin}/`,
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
        action_url: `${window.location.origin}/my-orders`,
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
        action_url: `${window.location.origin}/contact-us`,
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
        action_url: `${window.location.origin}/`,
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
        action_url: `${window.location.origin}/contact-us`,
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
        action_url: `${window.location.origin}/my-orders`,
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
