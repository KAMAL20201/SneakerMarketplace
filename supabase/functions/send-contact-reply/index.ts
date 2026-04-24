import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "https://theplugmarket.in",
  "https://www.theplugmarket.in",
  "http://localhost:5173",
  "http://localhost:3000",
];

const FROM_ADDRESS = "The Plug Market <support@theplugmarket.in>";
const BASE_URL = "https://theplugmarket.in";

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

interface ContactReplyRequest {
  to_email: string;
  reply_message: string;
  original_message: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReplyEmail(replyMessage: string, originalMessage: string): string {
  const safeReply = escapeHtml(replyMessage);
  const safeOriginal = escapeHtml(originalMessage);
  const content = `
    <h2 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#111827;">We've replied to your message</h2>
    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;">Thanks for reaching out to The Plug Market. Here's our response:</p>

    <div style="background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:0 12px 12px 0;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#7c3aed;text-transform:uppercase;letter-spacing:0.5px;">Our reply</p>
      <p style="margin:0;color:#111827;font-size:15px;line-height:1.6;white-space:pre-wrap;">${safeReply}</p>
    </div>

    <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;">Your original message</p>
      <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;white-space:pre-wrap;">${safeOriginal}</p>
    </div>

    <div style="text-align:center;margin:32px 0;">
      <a href="${BASE_URL}/contact-us" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:12px;">
        Send Another Message
      </a>
    </div>

    <p style="margin:0;color:#9ca3af;font-size:13px;text-align:center;">
      Need more help? Reply to this email or visit us at <a href="${BASE_URL}" style="color:#7c3aed;text-decoration:none;">theplugmarket.in</a>
    </p>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reply from The Plug Market</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
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
          <tr>
            <td style="background:#fff;padding:40px;border-radius:0 0 16px 16px;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:24px 0;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © ${new Date().getFullYear()} The Plug Market · All rights reserved
              </p>
              <p style="margin:8px 0 0;color:#9ca3af;font-size:12px;">
                <a href="${BASE_URL}" style="color:#7c3aed;text-decoration:none;">theplugmarket.in</a>
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
    const body: ContactReplyRequest = await req.json();

    if (!body.to_email || !body.reply_message || !body.original_message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to_email, reply_message, original_message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = buildReplyEmail(body.reply_message, body.original_message);
    await sendViaResend(body.to_email, "Re: Your message to The Plug Market", html);

    console.log(`Contact reply sent to: ${body.to_email}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("send-contact-reply error:", message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
