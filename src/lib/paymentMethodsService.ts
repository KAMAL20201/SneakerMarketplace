import { supabase } from "./supabase";
import EncryptionService from "./encryptionService";
import type {
  PaymentMethod,
  PaymentMethodData,
  DecryptedPaymentMethod,
} from "./encryptionService";

export class PaymentMethodsService {
  // Get user's session ID for encryption
  private static async getSessionId(): Promise<string> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token
        ? session.access_token.substring(0, 32)
        : "fallback_key";
    } catch (error) {
      return "fallback_key";
    }
  }

  // Create a new payment method
  static async createPaymentMethod(
    userId: string,
    methodType: "upi" | "bank_account",
    paymentData: PaymentMethodData,
    isDefault: boolean = false
  ): Promise<PaymentMethod> {
    try {
      const sessionId = await this.getSessionId();
      const encryptedData = await EncryptionService.encryptPaymentData(
        paymentData,
        userId,
        sessionId
      );

      const { data, error } = await supabase
        .from("seller_payment_methods")
        .insert({
          user_id: userId,
          encrypted_data: encryptedData,
          is_default: isDefault,
          method_type: methodType,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error creating payment method:", error);
      throw error;
    }
  }

  // Get all payment methods for a user
  static async getPaymentMethods(userId: string): Promise<PaymentMethod[]> {
    try {
      const { data, error } = await supabase
        .from("seller_payment_methods")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      throw error;
    }
  }

  // Get decrypted payment methods for a user
  static async getDecryptedPaymentMethods(
    userId: string
  ): Promise<DecryptedPaymentMethod[]> {
    try {
      const paymentMethods = await this.getPaymentMethods(userId);
      const sessionId = await this.getSessionId();

      const decryptedMethods = await Promise.all(
        paymentMethods.map(async (method) => {
          try {
            const decryptedData = await EncryptionService.decryptPaymentData(
              method.encrypted_data,
              userId,
              sessionId
            );

            return {
              ...method,
              data: decryptedData,
            } as DecryptedPaymentMethod;
          } catch (error) {
            console.error(
              `Failed to decrypt payment method ${method.id}:`,
              error
            );
            // Return method with empty data if decryption fails
            return {
              ...method,
              data: {} as PaymentMethodData,
            } as DecryptedPaymentMethod;
          }
        })
      );

      return decryptedMethods;
    } catch (error) {
      console.error("Error fetching decrypted payment methods:", error);
      throw error;
    }
  }

  // Update a payment method
  static async updatePaymentMethod(
    methodId: string,
    userId: string,
    updates: {
      payment_data?: PaymentMethodData;
      is_default?: boolean;
    }
  ): Promise<PaymentMethod> {
    try {
      const updateData: any = {};

      if (updates.payment_data) {
        const sessionId = await this.getSessionId();
        updateData.encrypted_data = await EncryptionService.encryptPaymentData(
          updates.payment_data,
          userId,
          sessionId
        );
      }

      if (updates.is_default !== undefined) {
        updateData.is_default = updates.is_default;
      }

      const { data, error } = await supabase
        .from("seller_payment_methods")
        .update(updateData)
        .eq("id", methodId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error updating payment method:", error);
      throw error;
    }
  }

  // Set a payment method as default
  static async setDefaultPaymentMethod(
    methodId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("seller_payment_methods")
        .update({ is_default: true })
        .eq("id", methodId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.error("Error setting default payment method:", error);
      throw error;
    }
  }

  // Delete (deactivate) a payment method
  static async deletePaymentMethod(
    methodId: string,
    userId: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from("seller_payment_methods")
        .update({ is_active: false })
        .eq("id", methodId)
        .eq("user_id", userId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting payment method:", error);
      throw error;
    }
  }

  // Get default payment method for a user
  static async getDefaultPaymentMethod(
    userId: string
  ): Promise<PaymentMethod | null> {
    try {
      const { data, error } = await supabase
        .from("seller_payment_methods")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .eq("is_default", true)
        .single();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is "no rows returned"
      return data || null;
    } catch (error) {
      console.error("Error fetching default payment method:", error);
      throw error;
    }
  }

  // Validate UPI ID format
  static validateUPIId(upiId: string): boolean {
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+$/;
    return upiRegex.test(upiId);
  }

  // Validate IFSC code format
  static validateIFSC(ifsc: string): boolean {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return ifscRegex.test(ifsc.toUpperCase());
  }

  // Validate bank account number (basic validation)
  static validateAccountNumber(accountNumber: string): boolean {
    return /^\d{9,18}$/.test(accountNumber);
  }

  // Format account number for display (mask middle digits)
  static formatAccountNumber(accountNumber: string): string {
    if (accountNumber.length < 4) return accountNumber;
    const start = accountNumber.slice(0, 2);
    const end = accountNumber.slice(-2);
    const middle = "*".repeat(accountNumber.length - 4);
    return `${start}${middle}${end}`;
  }

  // Format UPI ID for display (mask part of the ID)
  static formatUPIId(upiId: string): string {
    const [username, domain] = upiId.split("@");
    if (!username || !domain) return upiId;

    if (username.length <= 4) return upiId;
    const maskedUsername =
      username.slice(0, 2) +
      "*".repeat(username.length - 4) +
      username.slice(-2);
    return `${maskedUsername}@${domain}`;
  }
}
