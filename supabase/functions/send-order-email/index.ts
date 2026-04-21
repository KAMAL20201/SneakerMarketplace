import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "https://theplugmarket.in",
  "https://www.theplugmarket.in",
  "http://localhost:5173",
  "http://localhost:3000",
];

const FROM_ADDRESS = "The Plug Market <support@theplugmarket.in>";

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };
}

// ── Types ──────────────────────────────────────────────────────────────────────

interface ShippingAddress {
  full_name?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
}

interface SimilarProduct {
  id: string;
  slug?: string;
  title: string;
  price: number;
  image_url?: string;
}

interface OrderEmailData {
  order_id: string;
  product_title: string;
  product_image?: string;
  amount: number;
  currency: string;
  buyer_name?: string;
  buyer_email?: string;
  seller_name?: string;
  seller_email?: string;
  shipping_address?: ShippingAddress;
  tracking_number?: string;
  courier_name?: string;
  order_status: string;
  estimated_delivery?: string;
  product_id?: string;
  brand?: string;
  similar_products?: SimilarProduct[];
}

interface EmailRequest {
  type:
    | "order_confirmed"
    | "order_shipped"
    | "order_delivered"
    | "order_cancelled"
    | "payment_received"
    | "shipping_reminder"
    | "review_request"
    | "admin_otp";
  recipient_email: string;
  recipient_name: string;
  order_data: OrderEmailData;
  template_data?: {
    subject?: string;
    action_text?: string;
    action_url?: string;
    otp_code?: string;
  };
}

// ── HTML Templates ─────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  return `${currency === "INR" ? "₹" : currency}${amount.toLocaleString("en-IN")}`;
}

function baseTemplate(content: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
              <div style="font-size:28px;font-weight:800;color:#fff;letter-spacing:-0.5px;">
                ⚡ The Plug Market
              </div>
              <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
                Hyped Sneakers · Streetwear · Collectibles
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#fff;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} The Plug Market · All rights reserved
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">
                <a href="https://theplugmarket.in" style="color:#7c3aed;text-decoration:none;">theplugmarket.in</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align:center;margin:32px 0;">
    <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
      ${text}
    </a>
  </div>`;
}

function orderSummaryRow(label: string, value: string): string {
  return `<tr>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#6b7280;font-size:14px;">${label}</td>
    <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;color:#111827;font-size:14px;font-weight:600;text-align:right;">${value}</td>
  </tr>`;
}

const BASE_URL = "https://theplugmarket.in";

function addressBlock(address: ShippingAddress): string {
  const parts = [
    address.full_name,
    address.address_line1,
    address.address_line2,
    `${address.city ?? ""}${address.state ? ", " + address.state : ""}${address.pincode ? " - " + address.pincode : ""}`,
    address.phone ? `📞 ${address.phone}` : "",
  ].filter(Boolean);
  return parts.join("<br/>");
}

function buildSimilarProductsSection(products: SimilarProduct[]): string {
  if (!products || products.length === 0) return "";

  const cards = products.map((p) => {
    const url = `${BASE_URL}/product/${p.slug || p.id}`;
    const imageHtml = p.image_url
      ? `<img src="${p.image_url}" alt="" width="120" style="width:120px;height:120px;object-fit:cover;border-radius:8px;display:block;margin:0 auto 10px;" />`
      : `<div style="width:120px;height:120px;background:#f3f4f6;border-radius:8px;margin:0 auto 10px;"></div>`;
    const title = p.title.length > 38 ? p.title.slice(0, 38) + "…" : p.title;
    return `<td style="padding:8px;vertical-align:top;width:50%;">
        <a href="${url}" style="text-decoration:none;display:block;text-align:center;">
          ${imageHtml}
          <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#111827;line-height:1.4;">${title}</p>
          <p style="margin:0;font-size:14px;font-weight:700;color:#7c3aed;">${formatAmount(p.price, "INR")}</p>
        </a>
      </td>`;
  });

  const rows: string[] = [];
  for (let i = 0; i < cards.length; i += 2) {
    rows.push(`<tr>${cards[i]}${cards[i + 1] ?? "<td></td>"}</tr>`);
  }

  return `<div style="margin-top:32px;border-top:1px solid #e5e7eb;padding-top:24px;">
    <h3 style="margin:0 0 16px;font-size:16px;font-weight:700;color:#111827;">You might also like</h3>
    <table width="100%" cellpadding="0" cellspacing="0">${rows.join("")}</table>
    <div style="text-align:center;margin-top:16px;">
      <a href="${BASE_URL}" style="color:#7c3aed;font-size:13px;font-weight:600;text-decoration:none;">Browse all products →</a>
    </div>
  </div>`;
}

// ── Email content builders ─────────────────────────────────────────────────────

function buildOrderConfirmed(
  name: string,
  order: OrderEmailData,
  actionUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">🎉 Order Confirmed!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, your order has been confirmed and is being processed.</p>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">You ordered</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${orderSummaryRow("Order ID", `#${order.order_id.slice(0, 8).toUpperCase()}`)}
      ${orderSummaryRow("Amount Paid", formatAmount(order.amount, order.currency))}
      ${order.estimated_delivery ? orderSummaryRow("Estimated Delivery", order.estimated_delivery) : ""}
    </table>

    ${order.shipping_address ? `
    <div style="margin-top:24px;background:#f9fafb;border-radius:12px;padding:20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Delivering to</p>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${addressBlock(order.shipping_address)}</p>
    </div>` : ""}

    ${ctaButton("Continue Shopping", actionUrl)}

    <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
      We'll email you when your order ships. Thank you for shopping with us!
    </p>
  `;
}

function buildPaymentReceived(
  name: string,
  order: OrderEmailData,
  actionUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">💰 Payment Received!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, you have a new order to fulfill.</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">Item sold</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${orderSummaryRow("Order ID", `#${order.order_id.slice(0, 8).toUpperCase()}`)}
      ${orderSummaryRow("Sale Amount", formatAmount(order.amount, order.currency))}
      ${order.buyer_name ? orderSummaryRow("Buyer", order.buyer_name) : ""}
    </table>

    ${order.shipping_address ? `
    <div style="margin-top:24px;background:#f9fafb;border-radius:12px;padding:20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Ship to</p>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${addressBlock(order.shipping_address)}</p>
    </div>` : ""}

    ${ctaButton("View Orders", actionUrl)}

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-top:8px;">
      <p style="margin:0;color:#92400e;font-size:13px;font-weight:600;">⏰ Please ship within 2 business days to maintain your seller rating.</p>
    </div>
  `;
}

function buildOrderShipped(
  name: string,
  order: OrderEmailData,
  actionUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">📦 Your Order is On Its Way!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, great news — your order has been shipped!</p>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#1d4ed8;text-transform:uppercase;letter-spacing:0.5px;">In transit</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${orderSummaryRow("Order ID", `#${order.order_id.slice(0, 8).toUpperCase()}`)}
      ${order.courier_name ? orderSummaryRow("Courier", order.courier_name) : ""}
      ${order.tracking_number ? orderSummaryRow("Tracking Number", order.tracking_number) : ""}
      ${order.estimated_delivery ? orderSummaryRow("Expected Delivery", order.estimated_delivery) : ""}
    </table>

    ${ctaButton("Contact Support", actionUrl)}

    <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
      Keep an eye on your tracking number for live updates.
    </p>

    <div style="margin-top:28px;background:#fdf4ff;border:2px solid #e9d5ff;border-radius:14px;padding:20px 24px;">
      <p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#6d28d9;">📹 Record Your Unboxing Video</p>
      <p style="margin:0 0 14px;color:#4b5563;font-size:14px;line-height:1.6;">
        When your package arrives, <strong>please record a continuous unboxing video</strong> before and while opening the package. This protects you in case of:
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:5px 0;font-size:14px;color:#374151;">
            <span style="color:#7c3aed;font-weight:700;margin-right:8px;">✦</span> Defective or damaged product
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:14px;color:#374151;">
            <span style="color:#7c3aed;font-weight:700;margin-right:8px;">✦</span> Wrong size or incorrect item received
          </td>
        </tr>
        <tr>
          <td style="padding:5px 0;font-size:14px;color:#374151;">
            <span style="color:#7c3aed;font-weight:700;margin-right:8px;">✦</span> Missing items or accessories
          </td>
        </tr>
      </table>
      <div style="margin-top:14px;background:#f3e8ff;border-radius:8px;padding:12px 14px;">
        <p style="margin:0;color:#5b21b6;font-size:13px;font-weight:600;">
          ⚠️ Return or replacement requests without an unboxing video may not be accepted. Keep the video safe until you're fully satisfied with your order.
        </p>
      </div>
    </div>
  `;
}

function buildReviewRequest(
  name: string,
  order: OrderEmailData,
  reviewUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">How was your purchase?</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, we hope you're loving your new pickup. Your review helps other sneaker heads make better decisions!</p>

    ${order.product_image ? `
    <div style="text-align:center;margin-bottom:24px;">
      <img src="${order.product_image}" alt="${order.product_title}" style="max-width:180px;max-height:180px;object-fit:contain;border-radius:16px;background:#f9fafb;padding:12px;" />
    </div>` : ""}

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Your purchase</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <div style="text-align:center;margin:8px 0 20px;">
      <p style="margin:0 0 12px;color:#374151;font-size:15px;font-weight:600;">Tap a star to rate your experience:</p>
      <div style="font-size:36px;letter-spacing:4px;">
        <a href="${reviewUrl}&rating=1" style="text-decoration:none;">⭐</a>
        <a href="${reviewUrl}&rating=2" style="text-decoration:none;">⭐</a>
        <a href="${reviewUrl}&rating=3" style="text-decoration:none;">⭐</a>
        <a href="${reviewUrl}&rating=4" style="text-decoration:none;">⭐</a>
        <a href="${reviewUrl}&rating=5" style="text-decoration:none;">⭐</a>
      </div>
    </div>

    ${ctaButton("Leave a Review", reviewUrl)}

    <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">
      This link is personal to you and expires in 30 days.
    </p>
  `;
}

function buildOrderDelivered(
  name: string,
  order: OrderEmailData,
  actionUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">✅ Order Delivered!</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, your order has been delivered. Enjoy your purchase!</p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;letter-spacing:0.5px;">Delivered</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${orderSummaryRow("Order ID", `#${order.order_id.slice(0, 8).toUpperCase()}`)}
      ${orderSummaryRow("Amount", formatAmount(order.amount, order.currency))}
    </table>

    ${ctaButton("Shop Again", actionUrl)}

    <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
      Loved your purchase? Share it with friends and tag us on Instagram!
    </p>
  `;
}

function buildOrderCancelled(
  name: string,
  order: OrderEmailData,
  actionUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">❌ Order Cancelled</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, your order has been cancelled.</p>

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;">Cancelled order</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${orderSummaryRow("Order ID", `#${order.order_id.slice(0, 8).toUpperCase()}`)}
      ${orderSummaryRow("Refund Amount", formatAmount(order.amount, order.currency))}
    </table>

    <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px;margin:24px 0;">
      <p style="margin:0;color:#92400e;font-size:14px;">Your refund will be processed within 5–7 business days to your original payment method.</p>
    </div>

    ${ctaButton("Contact Support", actionUrl)}

    <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
      Sorry for the inconvenience. Browse our other listings to find something you'll love!
    </p>
  `;
}

function buildShippingReminder(
  name: string,
  order: OrderEmailData,
  actionUrl: string
): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">⏰ Shipping Reminder</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, this is a reminder to ship the following order.</p>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#b45309;text-transform:uppercase;letter-spacing:0.5px;">Pending shipment</p>
      <p style="margin:0;font-size:17px;font-weight:700;color:#111827;">${order.product_title}</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0">
      ${orderSummaryRow("Order ID", `#${order.order_id.slice(0, 8).toUpperCase()}`)}
      ${order.buyer_name ? orderSummaryRow("Buyer", order.buyer_name) : ""}
    </table>

    ${order.shipping_address ? `
    <div style="margin-top:24px;background:#f9fafb;border-radius:12px;padding:20px;">
      <p style="margin:0 0 8px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Ship to</p>
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${addressBlock(order.shipping_address)}</p>
    </div>` : ""}

    ${ctaButton("View Orders", actionUrl)}

    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-top:8px;">
      <p style="margin:0;color:#dc2626;font-size:13px;font-weight:600;">Please ship within 24 hours to avoid order cancellation.</p>
    </div>
  `;
}

function buildAdminOtp(name: string, otpCode: string): string {
  return `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">🔐 Admin Login OTP</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Hi ${name}, use the code below to complete your admin login.</p>

    <div style="background:#f5f3ff;border:2px solid #7c3aed;border-radius:16px;padding:32px;margin-bottom:24px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:1px;">Your one-time code</p>
      <p style="margin:0;font-size:48px;font-weight:900;color:#111827;letter-spacing:0.3em;font-family:monospace;">${otpCode}</p>
    </div>

    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:12px;padding:16px;margin-bottom:24px;">
      <p style="margin:0;color:#92400e;font-size:13px;">
        ⏰ This code expires in <strong>10 minutes</strong>. Do not share it with anyone.
      </p>
    </div>

    <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
      If you didn't request this code, your account may be at risk. Please change your password immediately.
    </p>
  `;
}

// ── Build email for a given type ───────────────────────────────────────────────

const DEFAULT_ACTION_URLS: Record<EmailRequest["type"], string> = {
  order_confirmed:   BASE_URL,
  payment_received:  `${BASE_URL}/my-orders`,
  order_shipped:     `${BASE_URL}/contact-us`,
  order_delivered:   BASE_URL,
  order_cancelled:   `${BASE_URL}/contact-us`,
  shipping_reminder: `${BASE_URL}/my-orders`,
  review_request:    `${BASE_URL}/review`,
  admin_otp:         `${BASE_URL}/login`,
};

function buildEmailContent(req: EmailRequest): { subject: string; html: string } {
  const { type, recipient_name, order_data, template_data } = req;
  const actionUrl = template_data?.action_url ?? DEFAULT_ACTION_URLS[type] ?? BASE_URL;
  const subject =
    template_data?.subject ?? getDefaultSubject(type, order_data.product_title);

  const BUYER_EMAIL_TYPES = new Set([
    "order_confirmed",
    "order_shipped",
    "order_delivered",
    "order_cancelled",
    "review_request",
  ]);

  let body: string;
  switch (type) {
    case "order_confirmed":
      body = buildOrderConfirmed(recipient_name, order_data, actionUrl);
      break;
    case "payment_received":
      body = buildPaymentReceived(recipient_name, order_data, actionUrl);
      break;
    case "order_shipped":
      body = buildOrderShipped(recipient_name, order_data, actionUrl);
      break;
    case "order_delivered":
      body = buildOrderDelivered(recipient_name, order_data, actionUrl);
      break;
    case "order_cancelled":
      body = buildOrderCancelled(recipient_name, order_data, actionUrl);
      break;
    case "shipping_reminder":
      body = buildShippingReminder(recipient_name, order_data, actionUrl);
      break;
    case "review_request":
      body = buildReviewRequest(recipient_name, order_data, actionUrl);
      break;
    case "admin_otp":
      body = buildAdminOtp(recipient_name, template_data?.otp_code ?? "------");
      break;
    default:
      body = `<p>Notification for order #${order_data.order_id}</p>`;
  }

  if (BUYER_EMAIL_TYPES.has(type) && order_data.similar_products?.length) {
    body += buildSimilarProductsSection(order_data.similar_products);
  }

  return { subject, html: baseTemplate(body, subject) };
}

function getDefaultSubject(type: string, productTitle: string): string {
  switch (type) {
    case "order_confirmed":   return `🎉 Order Confirmed — ${productTitle}`;
    case "payment_received":  return `💰 Payment Received — New Order to Fulfill`;
    case "order_shipped":     return `📦 Your order has been shipped — ${productTitle}`;
    case "order_delivered":   return `✅ Order Delivered — ${productTitle}`;
    case "order_cancelled":   return `❌ Order Cancelled — ${productTitle}`;
    case "shipping_reminder": return `⏰ Reminder: Ship your order within 24 hours`;
    case "review_request":    return `How was your ${productTitle}? Leave a review`;
    case "admin_otp":         return `🔐 Your Admin Login OTP`;
    default:                  return `Order Update — ${productTitle}`;
  }
}

// ── Send via Resend API ────────────────────────────────────────────────────────

async function sendViaResend(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) throw new Error("RESEND_API_KEY is not set");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Resend API error (${res.status}): ${error}`);
  }
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body: EmailRequest = await req.json();

    if (!body.recipient_email || !body.type || !body.order_data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: recipient_email, type, order_data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = buildEmailContent(body);
    await sendViaResend(body.recipient_email, subject, html);

    console.log(`Email sent: type=${body.type} to=${body.recipient_email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("send-order-email error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
