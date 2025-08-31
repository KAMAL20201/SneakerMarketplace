import { useCallback } from "react";
import { EmailService, type OrderEmailData } from "@/lib/emailService";
import { toast } from "sonner";

export const useOrderEmails = () => {
  /**
   * Send order confirmation emails to both buyer and seller
   */
  const sendOrderConfirmationEmails = useCallback(
    async (
      buyerEmail: string,
      buyerName: string,
      sellerEmail: string,
      sellerName: string,
      orderData: OrderEmailData
    ) => {
      try {
        const [buyerEmailSent, sellerEmailSent] = await Promise.allSettled([
          EmailService.sendOrderConfirmationToBuyer(
            buyerEmail,
            buyerName,
            orderData
          ),
          EmailService.sendOrderConfirmationToSeller(
            sellerEmail,
            sellerName,
            orderData
          ),
        ]);

        const buyerSuccess =
          buyerEmailSent.status === "fulfilled" && buyerEmailSent.value;
        const sellerSuccess =
          sellerEmailSent.status === "fulfilled" && sellerEmailSent.value;

        if (buyerSuccess && sellerSuccess) {
          toast.success("Order confirmation emails sent successfully");
          return { success: true, buyer: true, seller: true };
        } else if (buyerSuccess || sellerSuccess) {
          toast.warning("Some confirmation emails failed to send");
          return {
            success: false,
            buyer: buyerSuccess,
            seller: sellerSuccess,
          };
        } else {
          toast.error("Failed to send order confirmation emails");
          return { success: false, buyer: false, seller: false };
        }
      } catch (error) {
        toast.error("Error sending order confirmation emails");
        console.error("Error sending order confirmation emails:", error);
        return { success: false, buyer: false, seller: false };
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
   * Send shipping reminder to seller
   */
  const sendShippingReminder = useCallback(
    async (
      sellerEmail: string,
      sellerName: string,
      orderData: OrderEmailData
    ) => {
      try {
        const success = await EmailService.sendShippingReminderToSeller(
          sellerEmail,
          sellerName,
          orderData
        );

        if (success) {
          toast.success("Shipping reminder sent to seller");
          return true;
        } else {
          toast.error("Failed to send shipping reminder");
          return false;
        }
      } catch (error) {
        toast.error("Error sending shipping reminder");
        console.error("Error sending shipping reminder:", error);
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
          | "order_cancelled"
          | "payment_received";
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
    sendShippingReminder,
    sendBulkNotifications,
  };
};
