import { supabase } from "./supabase";
import {
  type Notification,
  type CreateNotificationRequest,
  NotificationType,
  type OrderNotificationData,
} from "../types/notifications";

export class NotificationService {
  // Create a new notification
  static async createNotification(
    request: CreateNotificationRequest
  ): Promise<Notification> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert([
          {
            user_id: request.user_id,
            type: request.type,
            title: request.title,
            message: request.message,
            data: request.data || {},
            read: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  // Get notifications for a user
  static async getUserNotifications(
    userId: string,
    limit = 50
  ): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read: true, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  }

  // Delete a notification
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  }

  // Get unread count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("read", false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  // Helper method to create order-related notifications
  static async notifyOrderReceived(
    sellerId: string,
    orderData: OrderNotificationData
  ): Promise<Notification> {
    return this.createNotification({
      user_id: sellerId,
      type: NotificationType.ITEM_SOLD,
      title: "🎉 Item Sold!",
      message: `Your ${orderData.product_title} has been purchased for ₹${orderData.amount}. Ship it within 24 hours!`,
      data: orderData,
    });
  }

  // Helper method to create payment confirmation notifications
  static async notifyPaymentConfirmed(
    sellerId: string,
    orderData: OrderNotificationData
  ): Promise<Notification> {
    return this.createNotification({
      user_id: sellerId,
      type: NotificationType.PAYMENT_CONFIRMED,
      title: "💰 Payment Received!",
      message: `Payment of ₹${orderData.amount} confirmed for ${orderData.product_title}. Ready to ship!`,
      data: orderData,
    });
  }

  // Helper method to create shipping reminders
  static async notifyShippingReminder(
    sellerId: string,
    orderData: OrderNotificationData
  ): Promise<Notification> {
    return this.createNotification({
      user_id: sellerId,
      type: NotificationType.SHIPPING_REMINDER,
      title: "⏰ Shipping Reminder",
      message: `Don't forget to ship ${orderData.product_title}. Maintain your seller rating!`,
      data: orderData,
    });
  }
}
