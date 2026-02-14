import { useCallback } from "react";
import { EmailService, type OrderEmailData } from "@/lib/emailService";
import { toast } from "sonner";

export const useOrderEmails = () => {
  /**
   * Send order confirmation email to buyer
   */
  const sendOrderConfirmationEmails = useCallback(
    async (
      buyerEmail: string,
      buyerName: string,
      orderData: OrderEmailData
    ) => {
      try {
        const result = await EmailService.sendOrderConfirmationToBuyer(
          buyerEmail,
          buyerName,
          orderData
        );

        if (result) {
          toast.success("Order confirmation email sent successfully");
          return { success: true };
        } else {
          toast.error("Failed to send order confirmation email");
          return { success: false };
        }
      } catch (error) {
        toast.error("Error sending order confirmation email");
        console.error("Error sending order confirmation email:", error);
        return { success: false };
      }
    },
    []
  );

  /**
   * Send shipping notification to buyer
   */
  const sendShippingNotification = useCallback(
    async (
      buyerEmail: string,
      buyerName: string,
      orderData: OrderEmailData
    ) => {
      try {
        const success = await EmailService.sendShippingNotificationToBuyer(
          buyerEmail,
          buyerName,
          orderData
        );

        if (success) {
          toast.success("Shipping notification sent to buyer");
          return true;
        } else {
          toast.error("Failed to send shipping notification");
          return false;
        }
      } catch (error) {
        toast.error("Error sending shipping notification");
        console.error("Error sending shipping notification:", error);
        return false;
      }
    },
    []
  );

  /**
   * Send delivery confirmation to buyer
   */
  const sendDeliveryConfirmation = useCallback(
    async (
      buyerEmail: string,
      buyerName: string,
      orderData: OrderEmailData
    ) => {
      try {
        const success = await EmailService.sendDeliveryConfirmationToBuyer(
          buyerEmail,
          buyerName,
          orderData
        );

        if (success) {
          toast.success("Delivery confirmation sent to buyer");
          return true;
        } else {
          toast.error("Failed to send delivery confirmation");
          return false;
        }
      } catch (error) {
        toast.error("Error sending delivery confirmation");
        console.error("Error sending delivery confirmation:", error);
        return false;
      }
    },
    []
  );

  /**
   * Send order cancellation notification to buyer
   */
  const sendOrderCancellation = useCallback(
    async (
      buyerEmail: string,
      buyerName: string,
      orderData: OrderEmailData
    ) => {
      try {
        const success = await EmailService.sendOrderCancellationToBuyer(
          buyerEmail,
          buyerName,
          orderData
        );

        if (success) {
          toast.success("Order cancellation notification sent to buyer");
          return true;
        } else {
          toast.error("Failed to send order cancellation notification");
          return false;
        }
      } catch (error) {
        toast.error("Error sending order cancellation notification");
        console.error("Error sending order cancellation notification:", error);
        return false;
      }
    },
    []
  );

  /**
   * Send bulk email notifications
   */
  const sendBulkNotifications = useCallback(
    async (
      notifications: Array<{
        type:
          | "order_confirmed"
          | "order_shipped"
          | "order_delivered"
          | "order_cancelled";
        recipient_email: string;
        recipient_name: string;
        order_data: OrderEmailData;
        template_data?: Record<string, string>;
      }>
    ) => {
      try {
        const result = await EmailService.sendBulkOrderNotifications(
          notifications
        );

        if (result.success > 0) {
          toast.success(`${result.success} emails sent successfully`);
        }

        if (result.failed > 0) {
          toast.error(`${result.failed} emails failed to send`);
        }

        return result;
      } catch (error) {
        toast.error("Error sending bulk notifications");
        console.error("Error sending bulk notifications:", error);
        return { success: 0, failed: notifications.length };
      }
    },
    []
  );

  return {
    sendOrderConfirmationEmails,
    sendShippingNotification,
    sendDeliveryConfirmation,
    sendOrderCancellation,
    sendBulkNotifications,
  };
};
