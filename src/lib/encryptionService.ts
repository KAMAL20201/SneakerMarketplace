// Secure encryption service for payment method data
// Uses Web Crypto API for client-side encryption before sending to database

class EncryptionService {
  private static readonly ALGORITHM = "AES-GCM";
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;

  // Generate a cryptographic key from user's session
  private static async deriveKey(
    userId: string,
    sessionId: string
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw",
      encoder.encode(userId + sessionId),
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: encoder.encode("SneakInMarket_PaymentEncryption_v1"),
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ["encrypt", "decrypt"]
    );
  }

  // Encrypt payment data
  static async encryptPaymentData(
    data: PaymentMethodData,
    userId: string,
    sessionId: string
  ): Promise<string> {
    try {
      const key = await this.deriveKey(userId, sessionId);
      const encoder = new TextEncoder();
      const dataString = JSON.stringify(data);

      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encoder.encode(dataString)
      );

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Convert to base64 for storage
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error("Encryption failed:", error);
      throw new Error("Failed to encrypt payment data");
    }
  }

  // Decrypt payment data
  static async decryptPaymentData(
    encryptedData: string,
    userId: string,
    sessionId: string
  ): Promise<PaymentMethodData> {
    try {
      const key = await this.deriveKey(userId, sessionId);
      const decoder = new TextDecoder();

      // Convert from base64
      const combined = new Uint8Array(
        atob(encryptedData)
          .split("")
          .map((char) => char.charCodeAt(0))
      );

      // Extract IV and encrypted data
      const iv = combined.slice(0, this.IV_LENGTH);
      const encrypted = combined.slice(this.IV_LENGTH);

      const decryptedData = await window.crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encrypted
      );

      const dataString = decoder.decode(decryptedData);
      return JSON.parse(dataString);
    } catch (error) {
      console.error("Decryption failed:", error);
      throw new Error("Failed to decrypt payment data");
    }
  }
}

// Types for payment method data
export interface UPIData {
  upiId: string;
  holderName: string;
}

export interface BankAccountData {
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  bankName: string;
  accountType: "savings" | "current";
}

export type PaymentMethodData = UPIData | BankAccountData;

export interface PaymentMethod {
  id: string;
  user_id: string;
  method_type: "upi" | "bank_account";
  method_name: string;
  encrypted_data: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface DecryptedPaymentMethod
  extends Omit<PaymentMethod, "encrypted_data"> {
  data: PaymentMethodData;
}

export default EncryptionService;
