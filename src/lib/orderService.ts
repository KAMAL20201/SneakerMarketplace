import { supabase } from "./supabase";
// import { NotificationService } from "./notificationService";
// import type { OrderNotificationData } from "../types/notifications";

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  payment_id: string;
  razorpay_order_id: string;
  amount: number;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  shipping_address?: any;
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
  shipping_address?: any;
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

  // Get buyer details for notification
  static async getBuyerDetails(buyerId: string) {
    try {
      const { data, error } = await supabase
        .from("auth.users")
        .select("user_metadata")
        .eq("id", buyerId)
        .single();

      if (error) {
        // Fallback: try to get from profile or return generic name
        return { full_name: "Customer" };
      }

      return {
        full_name: data?.user_metadata?.full_name || "Customer",
      };
    } catch (error) {
      console.error("Error fetching buyer details:", error);
      return { full_name: "Customer" };
    }
  }

  // Process cart checkout - create orders and notify sellers
  static async processCartCheckout(
    cartItems: CartItem[],
    paymentId: string,
    razorpayOrderId: string,
    buyerId: string,
    buyerName: string
  ): Promise<Order[]> {
    try {
      const orders: Order[] = [];

      // Create orders for each item and notify sellers
      for (const item of cartItems) {
        // Get product details
        const productDetails = await this.getProductDetails(item.productId);

        if (!productDetails) {
          console.warn(`Product ${item.productId} not found, skipping`);
          continue;
        }

        // Create order
        const order = await this.createOrder({
          buyer_id: buyerId,
          seller_id: item.sellerId,
          product_id: item.productId,
          payment_id: paymentId,
          razorpay_order_id: razorpayOrderId,
          amount: item.price
        });

        orders.push(order);

        // // Create notification data
        // const notificationData: OrderNotificationData = {
        //   order_id: order.id,
        //   product_id: item.productId,
        //   product_title: item.productName,
        //   product_image:
        //     productDetails.product_images?.find((img) => img.is_poster_image)
        //       ?.image_url || productDetails.product_images?.[0]?.image_url,
        //   buyer_name: buyerName,
        //   seller_name: item.sellerName,
        //   amount: item.price,
        // };

        // // Notify seller about the sale
        // await NotificationService.notifyOrderReceived(
        //   item.sellerId,
        //   notificationData
        // );

        // // Also send payment confirmation notification
        // await NotificationService.notifyPaymentConfirmed(
        //   item.sellerId,
        //   notificationData
        // );

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
      const updateData: any = { status };
      if (trackingNumber) {
        updateData.tracking_number = trackingNumber;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating order status:", error);
      throw error;
    }
  }
}
