import { supabase } from "./supabase";
import { logger } from "@/components/ui/Logger";

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
  shipping_address?: string;
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
  /**
   * Send order confirmation email to buyer
   */
  static async sendOrderConfirmationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type: "order_confirmed",
          recipient_email: buyerEmail,
          recipient_name: buyerName,
          order_data: orderData,
          template_data: {
            subject: "🎉 Order Confirmed! Your purchase is being processed",
            action_text: "View Order Details",
            action_url: `${window.location.origin}/orders/${orderData.order_id}`,
          },
        },
      });

      if (error) {
        logger.error(
          `Failed to send order confirmation email to buyer: ${
            error.message || "Unknown error"
          }`
        );
        return false;
      }

      logger.info(`Order confirmation email sent to buyer: ${buyerEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending order confirmation email to buyer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send order confirmation email to seller
   */
  static async sendOrderConfirmationToSeller(
    sellerEmail: string,
    sellerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type: "payment_received",
          recipient_email: sellerEmail,
          recipient_name: sellerName,
          order_data: orderData,
          template_data: {
            subject: "💰 Payment Received! New order to fulfill",
            action_text: "View Order Details",
            action_url: `${window.location.origin}/seller/orders/${orderData.order_id}`,
          },
        },
      });

      if (error) {
        logger.error(
          `Failed to send order confirmation email to seller: ${
            error.message || "Unknown error"
          }`
        );
        return false;
      }

      logger.info(`Order confirmation email sent to seller: ${sellerEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending order confirmation email to seller: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send shipping notification to buyer
   */
  static async sendShippingNotificationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type: "order_shipped",
          recipient_email: buyerEmail,
          recipient_name: buyerName,
          order_data: orderData,
          template_data: {
            subject: "📦 Your order has been shipped!",
            action_text: "Track Order",
            action_url: `${window.location.origin}/orders/${orderData.order_id}`,
          },
        },
      });

      if (error) {
        logger.error(
          `Failed to send shipping notification to buyer: ${
            error.message || "Unknown error"
          }`
        );
        return false;
      }

      logger.info(`Shipping notification email sent to buyer: ${buyerEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending shipping notification to buyer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send delivery confirmation to buyer
   */
  static async sendDeliveryConfirmationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type: "order_delivered",
          recipient_email: buyerEmail,
          recipient_name: buyerName,
          order_data: orderData,
          template_data: {
            subject: "✅ Your order has been delivered!",
            action_text: "Review Product",
            action_url: `${window.location.origin}/orders/${orderData.order_id}/review`,
          },
        },
      });

      if (error) {
        logger.error(
          `Failed to send delivery confirmation to buyer: ${
            error.message || "Unknown error"
          }`
        );
        return false;
      }

      logger.info(`Delivery confirmation email sent to buyer: ${buyerEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending delivery confirmation to buyer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send order cancellation notification to buyer
   */
  static async sendOrderCancellationToBuyer(
    buyerEmail: string,
    buyerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type: "order_cancelled",
          recipient_email: buyerEmail,
          recipient_name: buyerName,
          order_data: orderData,
          template_data: {
            subject: "❌ Order Cancelled",
            action_text: "View Refund Status",
            action_url: `${window.location.origin}/orders/${orderData.order_id}`,
          },
        },
      });

      if (error) {
        logger.error(
          `Failed to send order cancellation to buyer: ${
            error.message || "Unknown error"
          }`
        );
        return false;
      }

      logger.info(`Order cancellation email sent to buyer: ${buyerEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending order cancellation to buyer: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send shipping reminder to seller
   */
  static async sendShippingReminderToSeller(
    sellerEmail: string,
    sellerName: string,
    orderData: OrderEmailData
  ): Promise<boolean> {
    try {
      const { error } = await supabase.functions.invoke("send-order-email", {
        body: {
          type: "shipping_reminder",
          recipient_email: sellerEmail,
          recipient_name: sellerName,
          order_data: orderData,
          template_data: {
            subject: "⏰ Reminder: Ship your order within 24 hours",
            action_text: "Mark as Shipped",
            action_url: `${window.location.origin}/seller/orders/${orderData.order_id}/ship`,
          },
        },
      });

      if (error) {
        logger.error(
          `Failed to send shipping reminder to seller: ${
            error.message || "Unknown error"
          }`
        );
        return false;
      }

      logger.info(`Shipping reminder email sent to seller: ${sellerEmail}`);
      return true;
    } catch (error) {
      logger.error(
        `Error sending shipping reminder to seller: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return false;
    }
  }

  /**
   * Send bulk email notifications for multiple orders
   */
  static async sendBulkOrderNotifications(
    notifications: EmailNotificationRequest[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      try {
        const { error } = await supabase.functions.invoke("send-order-email", {
          body: notification,
        });

        if (error) {
          logger.error(
            `Failed to send email notification: ${
              error.message || "Unknown error"
            }`
          );
          failed++;
        } else {
          success++;
        }
      } catch (error) {
        logger.error(
          `Error sending email notification: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        failed++;
      }
    }

    return { success, failed };
  }
}
