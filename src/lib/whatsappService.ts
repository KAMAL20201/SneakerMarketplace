import type { CartItem } from "./orderService";
import type { ShippingAddress } from "@/types/shipping";

// WhatsApp business number (with country code, no + sign)
// Update this with your WhatsApp number via VITE_WHATSAPP_NUMBER env variable
const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || "919999999999";

export class WhatsAppService {
  /**
   * Generate a short order reference ID
   */
  static generateOrderRef(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TPM-${timestamp}-${random}`;
  }

  /**
   * Format the WhatsApp message with order details
   */
  static formatOrderMessage(
    items: CartItem[],
    shippingAddress: ShippingAddress,
    orderRef: string,
    totalAmount: number
  ): string {
    let message = `Hi! I'd like to place an order on The Plug Market.\n\n`;
    message += `*Order Ref:* ${orderRef}\n\n`;

    message += `*Items:*\n`;
    items.forEach((item, index) => {
      message += `${index + 1}. ${item.productName}`;
      if (item.size) message += ` (Size: ${item.size})`;
      message += ` - ₹${item.price}\n`;
      message += `   Brand: ${item.brand} | Condition: ${item.condition}\n`;
    });

    message += `\n*Total: ₹${totalAmount}*\n\n`;

    message += `*Shipping Address:*\n`;
    message += `${shippingAddress.full_name}\n`;
    message += `${shippingAddress.address_line1}\n`;
    if (shippingAddress.address_line2) {
      message += `${shippingAddress.address_line2}\n`;
    }
    message += `${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}\n`;
    if (shippingAddress.landmark) {
      message += `Landmark: ${shippingAddress.landmark}\n`;
    }
    message += `Phone: ${shippingAddress.phone}\n`;
    if (shippingAddress.email) {
      message += `Email: ${shippingAddress.email}\n`;
    }

    message += `\nPlease share the payment details. Thank you!`;

    return message;
  }

  /**
   * Generate WhatsApp redirect URL with prefilled message
   */
  static generateWhatsAppURL(
    items: CartItem[],
    shippingAddress: ShippingAddress,
    orderRef: string,
    totalAmount: number
  ): string {
    const message = this.formatOrderMessage(
      items,
      shippingAddress,
      orderRef,
      totalAmount
    );
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  }
}
