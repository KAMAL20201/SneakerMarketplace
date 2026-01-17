import { supabase } from "./supabase";

export interface PaymentDetails {
  id?: string;
  amount: number;
  currency: string;
  status: "pending_payment" | "completed" | "failed";
  whatsapp_order_ref: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export class PaymentService {
  // Save payment details to Supabase for WhatsApp orders
  static async savePayment(
    payment: Omit<PaymentDetails, "id" | "created_at" | "updated_at">
  ): Promise<PaymentDetails> {
    try {
      const { data, error } = await supabase
        .from("payments")
        .insert([{
          amount: payment.amount,
          currency: payment.currency,
          status: payment.status,
          order_id: payment.whatsapp_order_ref, // Using order_id field for whatsapp ref
          user_id: payment.user_id,
        }])
        .select()
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return {
        ...data,
        whatsapp_order_ref: data.order_id,
      };
    } catch (error) {
      console.error("Error saving payment:", error);
      throw error;
    }
  }

  // Update payment status (for manual confirmation after WhatsApp payment)
  static async updatePaymentStatus(
    whatsappOrderRef: string,
    status: PaymentDetails["status"]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("payments")
        .update({ status })
        .eq("order_id", whatsappOrderRef);

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error("Error updating payment status:", error);
      throw error;
    }
  }

  // Get payment by WhatsApp order reference
  static async getPaymentByRef(whatsappOrderRef: string): Promise<PaymentDetails | null> {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("order_id", whatsappOrderRef)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Not found
        }
        throw new Error(error.message);
      }

      return {
        ...data,
        whatsapp_order_ref: data.order_id,
      };
    } catch (error) {
      console.error("Error fetching payment:", error);
      throw error;
    }
  }
}
