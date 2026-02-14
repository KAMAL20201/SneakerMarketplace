export interface Notification {
  id: string;
  user_id: string;
  type: NotificationTypeValue;
  title: string;
  message: string;
  data?: Record<string, unknown>; // Additional context data
  read: boolean;
  created_at: string;
  updated_at: string;
}

export const NotificationType = {
  ORDER_RECEIVED: "order_received",
  ORDER_SHIPPED: "order_shipped",
  ORDER_DELIVERED: "order_delivered",
} as const;

export type NotificationTypeValue =
  (typeof NotificationType)[keyof typeof NotificationType];

export interface CreateNotificationRequest {
  user_id: string;
  type: NotificationTypeValue;
  title: string;
  message: string;
  data?: Record<string, unknown> | OrderNotificationData;
}

export interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
}

// Order related types for notifications
export interface OrderNotificationData {
  order_id: string;
  product_id: string;
  product_title: string;
  product_image?: string;
  buyer_name?: string;
  amount: number;
  shipping_address?: string;
}
