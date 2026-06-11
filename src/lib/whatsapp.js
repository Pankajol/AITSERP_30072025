// src/lib/whatsapp.js
// ─── WhatsApp Business Cloud API — Notification Hub ────────────────────────
//
// All WhatsApp messages sent by this app flow through here:
//   • OTP verification
//   • Order placed confirmation
//   • Order status updates (packed, shipped, delivered)
//   • Payment confirmation
//
// Env variables (already in .env.local):
//   WHATSAPP_TOKEN=EAAWfe...
//   PHONE_NUMBER_ID=791489644055633
//
// Optional (for template messages — needed for first-time contacts):
//   WHATSAPP_OTP_TEMPLATE=your_otp_template_name
// ──────────────────────────────────────────────────────────────────────────

const TOKEN         = process.env.WHATSAPP_TOKEN;
const PHONE_ID      = process.env.PHONE_NUMBER_ID;
const OTP_TEMPLATE  = process.env.WHATSAPP_OTP_TEMPLATE;
const API_VERSION   = 'v19.0';
const API_BASE      = `https://graph.facebook.com/${API_VERSION}/${PHONE_ID}/messages`;

// ── Core sender ────────────────────────────────────────────────────────────
async function sendMessage(payload) {
  if (!TOKEN || !PHONE_ID) {
    console.warn('[WhatsApp] Not configured — WHATSAPP_TOKEN or PHONE_NUMBER_ID missing');
    return { success: false, message: 'WhatsApp not configured' };
  }

  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && data.messages?.[0]?.id) {
      console.log(`[WhatsApp] ✅ Sent to ${payload.to} | MsgID: ${data.messages[0].id}`);
      return { success: true, messageId: data.messages[0].id };
    } else {
      const err = data.error?.message || JSON.stringify(data);
      console.error(`[WhatsApp] ❌ Failed to ${payload.to}:`, err);
      return { success: false, message: err };
    }
  } catch (err) {
    console.error('[WhatsApp] Network error:', err.message);
    return { success: false, message: err.message };
  }
}

// ── Helper: format Indian phone number for WhatsApp ────────────────────────
function toWANumber(phone) {
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits;
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

// ──────────────────────────────────────────────────────────────────────────
// 1. Send OTP
// ──────────────────────────────────────────────────────────────────────────
export async function sendOTPWhatsApp(phone, otp) {
  const to = toWANumber(phone);

  const payload = OTP_TEMPLATE
    ? {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: OTP_TEMPLATE,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: [{ type: 'text', text: otp }],
            },
          ],
        },
      }
    : {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: {
          body:
            `🔐 *Verification Code*\n\n` +
            `Your OTP is: *${otp}*\n\n` +
            `⏱ Valid for 5 minutes.\n` +
            `🚫 Do not share this with anyone.`,
        },
      };

  return sendMessage(payload);
}

// ──────────────────────────────────────────────────────────────────────────
// 2. Order Placed Confirmation
// ──────────────────────────────────────────────────────────────────────────
export async function sendOrderConfirmation(phone, { orderNumber, customerName, totalAmount, itemCount }) {
  const to = toWANumber(phone);
  return sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body:
        `✅ *Order Confirmed!*\n\n` +
        `Hi ${customerName},\n\n` +
        `Your order has been placed successfully.\n\n` +
        `📦 Order ID: *${orderNumber}*\n` +
        `🛒 Items: ${itemCount}\n` +
        `💰 Total: ₹${totalAmount}\n\n` +
        `We will notify you when it is packed and shipped. Thank you! 🙏`,
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 3. Order Status Update
// ──────────────────────────────────────────────────────────────────────────
const STATUS_EMOJI = {
  confirmed:        '✅ Confirmed',
  packed:           '📦 Packed',
  shipped:          '🚚 Shipped',
  out_for_delivery: '🛵 Out for Delivery',
  delivered:        '🎉 Delivered',
  cancelled:        '❌ Cancelled',
};

export async function sendOrderStatusUpdate(phone, { orderNumber, status, customerName, trackingNumber }) {
  const to = toWANumber(phone);
  const statusLabel = STATUS_EMOJI[status] || status;

  let body =
    `📬 *Order Update*\n\n` +
    `Hi ${customerName},\n\n` +
    `Order *${orderNumber}* is now: *${statusLabel}*\n`;

  if (trackingNumber && status === 'shipped') {
    body += `\n🔍 Tracking No: ${trackingNumber}`;
  }
  if (status === 'delivered') {
    body += `\n\nThank you for your order! We hope you love it. 🙏`;
  }
  if (status === 'cancelled') {
    body += `\n\nIf you have questions, just reply to this message.`;
  }

  return sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// 4. Payment Confirmation
// ──────────────────────────────────────────────────────────────────────────
export async function sendPaymentConfirmation(phone, { orderNumber, amount, paymentId, customerName }) {
  const to = toWANumber(phone);
  return sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body:
        `💳 *Payment Received*\n\n` +
        `Hi ${customerName},\n\n` +
        `We received your payment of *₹${amount}*.\n\n` +
        `📦 Order: ${orderNumber}\n` +
        `🆔 Payment ID: ${paymentId}\n\n` +
        `Your order is now being processed. Thank you! 🙏`,
    },
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Legacy export (used by existing ERP campaign code — do NOT remove)
// ──────────────────────────────────────────────────────────────────────────
export async function sendWhatsApp({ to, message }) {
  if (!to) return;
  return sendMessage({
    messaging_product: 'whatsapp',
    to: toWANumber(to),
    type: 'text',
    text: { body: message },
  });
}
