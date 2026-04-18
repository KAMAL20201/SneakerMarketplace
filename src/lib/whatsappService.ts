// WhatsApp business number (with country code, no + sign)
// Update this with your WhatsApp number via VITE_WHATSAPP_NUMBER env variable
const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || "919999999999";

export class WhatsAppService {
  /**
   * Format a minimal WhatsApp message containing the DB order IDs.
   * Optionally includes coupon code and discount amount so the admin
   * knows the agreed price.
   */
  static formatOrderMessage(
    orderIds: string[],
    couponCode?: string | null,
    discountAmount?: number
  ): string {
    const shortIds = orderIds.map((id) => `#${id.slice(0, 8)}`);
    const couponLine =
      couponCode
        ? `\n*Coupon:* ${couponCode}${discountAmount ? ` (−₹${discountAmount})` : ""}`
        : "";

    if (shortIds.length === 1) {
      return (
        `Hi! I've completed my UPI payment for my order on The Plug Market.\n\n` +
        `*Order ID:* ${shortIds[0]}` +
        couponLine +
        `\n\nPlease confirm once you've received the payment. Thank you!`
      );
    }

    return (
      `Hi! I've completed my UPI payment for my orders on The Plug Market.\n\n` +
      `*Order IDs:*\n${shortIds.join("\n")}` +
      couponLine +
      `\n\nPlease confirm once you've received the payment. Thank you!`
    );
  }

  /**
   * Generate WhatsApp redirect URL with prefilled message containing order IDs.
   */
  static generateWhatsAppURL(
    orderIds: string[],
    couponCode?: string | null,
    discountAmount?: number
  ): string {
    const message = this.formatOrderMessage(orderIds, couponCode, discountAmount);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  }
}
