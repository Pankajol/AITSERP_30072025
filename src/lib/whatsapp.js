import axios from "axios";

export async function sendWhatsApp({ to, message }) {
  if (!to) return;
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_NUMBER_ID}/messages`,
      {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    console.error("WhatsApp error", e.message);
  }
}
