import { supabase } from "./supabase";
import type {
  CreateOrderRequest,
  CreateOrderResponse,
  PaymentDetails,
} from "../types/cashfree";

export class PaymentService {
  // Create a new order using Supabase Edge Function
  static async createOrder(
    orderData: CreateOrderRequest
  ): Promise<CreateOrderResponse> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "create-cashfree-order",
        {
          body: orderData,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error("Error creating order:", error);
      throw error;
    }
  }

  // Verify payment signature using Supabase Edge Function
  static async verifyPayment(paymentData: {
    cf_order_id: string;
  }): Promise<{ verified: boolean; payment?: PaymentDetails }> {
    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-cashfree-payment",
        {
          body: paymentData,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error("Error verifying payment:", error);
      throw error;
    }
  }

  // Save payment details to Supabase
  static async savePayment(
    payment: Omit<PaymentDetails, "id" | "created_at" | "updated_at">
  ): Promise<PaymentDetails> {
    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([payment])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error("Error saving payment:", error);
      throw error;
    }
  }
}
