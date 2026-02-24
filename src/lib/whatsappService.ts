// WhatsApp business number (with country code, no + sign)
// Update this with your WhatsApp number via VITE_WHATSAPP_NUMBER env variable
const WHATSAPP_NUMBER =
  import.meta.env.VITE_WHATSAPP_NUMBER || "919999999999";

export class WhatsAppService {
  /**
   * Format a minimal WhatsApp message containing only the DB order IDs.
   * The admin can look up all details (items, address) on the orders dashboard.
   */
  static formatOrderMessage(orderIds: string[]): string {
    const shortIds = orderIds.map((id) => `#${id.slice(0, 8)}`);

    if (shortIds.length === 1) {
      return (
        `Hi! I'd like to confirm my order on The Plug Market.\n\n` +
        `*Order ID:* ${shortIds[0]}\n\n` +
        `Please share the payment details. Thank you!`
      );
    }

    return (
      `Hi! I'd like to confirm my orders on The Plug Market.\n\n` +
      `*Order IDs:*\n${shortIds.join("\n")}\n\n` +
      `Please share the payment details. Thank you!`
    );
  }

  /**
   * Generate WhatsApp redirect URL with prefilled message containing order IDs.
   */
  static generateWhatsAppURL(orderIds: string[]): string {
    const message = this.formatOrderMessage(orderIds);
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`;
  }
}
