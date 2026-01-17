import type { ShippingAddress } from "@/types/shipping";

export interface WhatsAppOrderData {
  items: WhatsAppCartItem[];
  totalAmount: number;
  shippingAddress?: ShippingAddress;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  orderReference: string;
}

export interface WhatsAppCartItem {
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
}

export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: "pending_payment" | "completed" | "failed";
  whatsapp_order_ref: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}
