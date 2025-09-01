import { supabase } from "./supabase";
import { logger } from "@/components/ui/Logger";
import AWSSESService from "./aws-ses";
import EMAIL_TEMPLATES from "./emailTemplates";
import type { ShippingAddress } from "@/types/shipping";

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
  order_status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  estimated_delivery?: string;
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
  private static readonly USE_SES = import.meta.env.VITE_USE_SES === "true";

  /**
   * Format shipping address for email display
   */
  private static formatShippingAddress(address?: ShippingAddress): string {
    if (!address) return "Address not provided";

    const parts = [
      address.full_name,
      address.address_line1,
      address.address_line2,
      `${address.city}, ${address.state} - ${address.pincode}`,
      address.landmark && `Near: ${address.landmark}`,
      address.phone,
    ].filter(Boolean);

    return parts.join(", ");
  }

  /**
   * Send email using the configured service (SES or Supabase)
   */
  private static async sendEmail(
    type: string,
    recipientEmail: string,
    recipientName: string,
    orderData: OrderEmailData,
    templateData: Record<string, string>
  ): Promise<boolean> {
    if (this.USE_SES) {
      return await this.sendEmailViaSES(
        type,
        recipientEmail,
        recipientName,
        orderData,
        templateData
      );
    } else {
      return await this.sendEmailViaSupabase(
        type,
        recipientEmail,
        recipientName,
        orderData,
        templateData
      );
    }
  }

  /**
   * Send email via AWS SES
   */
  private static async sendEmailViaSES(
    type: string,
    recipientEmail: string,
    _recipientName: string,
    orderData: OrderEmailData,
    templateData: Record<string, string>
  ): Promise<boolean> {
    try {
      const template = EMAIL_TEMPLATES[type];
      if (!template) {
        logger.error(`Email template not found for type: ${type}`);
        return false;
      }

      // Prepare template data
      const emailData = {
        buyer_name: orderData.buyer_name || "Buyer",
        seller_name: orderData.seller_name || "Seller",
        order_id: orderData.order_id,
        product_title: orderData.product_title,
        amount: orderData.amount.toString(),
        currency: orderData.currency,
        shipping_address: this.formatShippingAddress(
          orderData.shipping_address
        ),
        tracking_number: orderData.tracking_number || "Not available",
        estimated_delivery: orderData.estimated_delivery || "To be determined",
        delivery_date: new Date().toLocaleDateString(),
        action_url: templateData.action_url || "#",
      };

      const success = await AWSSESService.sendTemplatedEmail(
        [recipientEmail],
        template,
        emailData
      );

      if (success) {
        logger.info(`SES email sent successfully to: ${recipientEmail}`);
        return true;
      } else {
        logger.error(`Failed to send SES email to: ${recipientEmail}`);
        return false;
      }
    } catch (error) {
      logger.error(
        `Error sending SES email: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
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
    return await this.sendEmail(
      "order_confirmed",
      buyerEmail,
      buyerName,
      orderData,
      {
        subject: "🎉 Order Confirmed! Your purchase is being processed",
        action_text: "View Order Details",
        action_url: `${window.location.origin}/orders/${orderData.order_id}`,
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
        action_text: "View Order Details",
        action_url: `${window.location.origin}/seller/orders/${orderData.order_id}`,
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
    return await this.sendEmail(
      "order_shipped",
      buyerEmail,
      buyerName,
      orderData,
      {
        subject: "📦 Your order has been shipped!",
        action_text: "Track Order",
        action_url: `${window.location.origin}/orders/${orderData.order_id}`,
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
    return await this.sendEmail(
      "order_delivered",
      buyerEmail,
      buyerName,
      orderData,
      {
        subject: "✅ Your order has been delivered!",
        action_text: "Review Product",
        action_url: `${window.location.origin}/orders/${orderData.order_id}/review`,
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
    return await this.sendEmail(
      "order_cancelled",
      buyerEmail,
      buyerName,
      orderData,
      {
        subject: "❌ Order Cancelled",
        action_text: "View Refund Status",
        action_url: `${window.location.origin}/orders/${orderData.order_id}`,
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
        action_text: "Mark as Shipped",
        action_url: `${window.location.origin}/seller/orders/${orderData.order_id}/ship`,
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

    const sesResult = await this.sendEmailViaSES(
      "order_confirmed",
      testEmail,
      "Test User",
      testData,
      { action_url: "#" }
    );

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
