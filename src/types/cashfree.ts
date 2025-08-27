export interface CashfreeOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: CashfreeResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
  // Cashfree specific options for one-click checkout
  oneClick?: boolean;
}

export interface CashfreeResponse {
  cf_payment_id: string;
  cf_order_id: string;
  cf_signature: string;
  order_id: string;
  payment_status: string;
}

export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "completed" | "failed";
  order_id: string;
  payment_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CreateOrderRequest {
  amount: number;
  currency: string;
  receipt: string;
  notes?: Record<string, string>;
  customer_details: {
    customer_id: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
  };
  cart_details?: {
    cart_items?: Array<{
      item_id: string;
      item_name: string;
      item_description: string;
      item_original_unit_price: number;
      item_discounted_unit_price: number;
      item_quantity: number;
      item_currency: string;
    }>;
  };
  cart_items?: Array<{
    item_id: string;
    item_name: string;
    item_description: string;
    item_details_url?: string;
    item_image_url?: string;
    item_original_unit_price: number;
    item_discounted_unit_price: number;
    item_quantity: number;
    item_currency: string;
  }>;
}

export interface CreateOrderResponse {
  cf_order_id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  payment_session_id: string;
}
