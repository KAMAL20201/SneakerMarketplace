import type { CartItem } from "./orderService";
import type { ShippingAddress } from "@/types/shipping";

// WhatsApp Business number from environment variable
export const WHATSAPP_BUSINESS_NUMBER = import.meta.env.VITE_WHATSAPP_BUSINESS_NUMBER || "";

export interface WhatsAppOrderData {
  items: CartItem[];
  totalAmount: number;
  shippingAddress?: ShippingAddress;
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  orderReference: string;
}

/**
 * Formats the WhatsApp message with order details
 */
export const formatWhatsAppMessage = (orderData: WhatsAppOrderData): string => {
  const { items, totalAmount, shippingAddress, buyerName, buyerEmail, orderReference } = orderData;

  let message = `*New Order Request*\n\n`;
  message += `*Order Reference:* ${orderReference}\n\n`;
  message += `*Order Details:*\n`;

  // Add each item
  items.forEach((item) => {
    message += `${item.productName} - ${item.brand} - Size: ${item.size} - ₹${item.price} x ${item.quantity}\n`;
  });

  message += `\n*Total Amount:* ₹${totalAmount}\n\n`;

  // Add shipping address if available
  if (shippingAddress) {
    message += `*Shipping Address:*\n`;
    message += `${shippingAddress.full_name}\n`;
    message += `${shippingAddress.address_line1}\n`;
    if (shippingAddress.address_line2) {
      message += `${shippingAddress.address_line2}\n`;
    }
    message += `${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}\n`;
    message += `Phone: ${shippingAddress.phone}\n\n`;
  }

  message += `*Buyer:* ${buyerName}\n`;
  message += `*Email:* ${buyerEmail}\n\n`;
  message += `Please confirm payment and shipping details.`;

  return message;
};

/**
 * Constructs the WhatsApp Business URL with the encoded message
 */
export const constructWhatsAppUrl = (message: string): string => {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?text=${encodedMessage}`;
};

/**
 * Opens WhatsApp with the order details
 * Returns true if successful, false if WhatsApp number is not configured
 */
export const openWhatsApp = (orderData: WhatsAppOrderData): boolean => {
  if (!WHATSAPP_BUSINESS_NUMBER) {
    console.error("WhatsApp Business number not configured");
    return false;
  }

  const message = formatWhatsAppMessage(orderData);
  const url = constructWhatsAppUrl(message);

  // Open in new window/tab
  window.open(url, "_blank");
  return true;
};

/**
 * Generates a unique order reference for WhatsApp orders
 */
export const generateWhatsAppOrderRef = (): string => {
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `WA-${timestamp}-${randomPart}`;
};

/**
 * Checks if WhatsApp is likely installed on the device
 * Note: This is a heuristic check and may not be 100% accurate
 */
export const isWhatsAppConfigured = (): boolean => {
  return !!WHATSAPP_BUSINESS_NUMBER;
};
