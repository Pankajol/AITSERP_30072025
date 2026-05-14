import { NextResponse } from "next/server";
import axios from "axios";
import FormData from "form-data";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const phone = formData.get("phone");
    const message = formData.get("message");
    const file = formData.get("file");

    if (!phone) {
      return NextResponse.json(
        { success: false, message: "Phone number is required" },
        { status: 400 }
      );
    }

    // STEP 1: Upload file to WhatsApp
    let mediaId = null;
    if (file && file.name) {
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const uploadForm = new FormData();
      uploadForm.append("file", fileBuffer, {
        filename: file.name,
        contentType: file.type || "application/pdf",
      });
      uploadForm.append("type", "application/pdf");
      uploadForm.append("messaging_product", "whatsapp");

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/media`,
        uploadForm,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            ...uploadForm.getHeaders(),
          },
        }
      );

      mediaId = uploadRes.data.id;
      console.log("✅ Uploaded PDF to WhatsApp:", mediaId);
    }

    // STEP 2: Send message (text or PDF)
    const payload = {
      messaging_product: "whatsapp",
      to: phone,
      type: mediaId ? "document" : "text",
      ...(mediaId
        ? {
            document: {
              id: mediaId,
              caption: message || "📎 Here is your document",
            },
          }
        : {
            text: { body: message },
          }),
    };

    const sendRes = await axios.post(
      `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${WHATSAPP_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );

    return NextResponse.json({ success: true, data: sendRes.data });
  } catch (error) {
    console.error("❌ WhatsApp send error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        success: false,
        message: "Error sending WhatsApp message",
        metaError: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}





// import { NextResponse } from "next/server";
// import axios from "axios";

// const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
// const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// export async function POST(req) {
//   try {
//     const { phone, message } = await req.json();

//     if (!phone || !message) {
//       return NextResponse.json(
//         { success: false, message: "Phone and message are required" },
//         { status: 400 }
//       );
//     }

//     const response = await axios.post(
//       `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
//       {
//         messaging_product: "whatsapp",
//         to: phone,
//         type: "text",
//         text: { body: message },
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${WHATSAPP_TOKEN}`,
//           "Content-Type": "application/json",
//         },
//       }
//     );

//     console.log("✅ WhatsApp Response:", response.data);
//     return NextResponse.json({ success: true, data: response.data });
//   } catch (error) {
//     console.error("❌ WhatsApp send error:", error.response?.data || error.message);
//     return NextResponse.json(
//       {
//         success: false,
//         message: "Error sending WhatsApp message",
//         metaError: error.response?.data || error.message,
//       },
//       { status: 500 }
//     );
//   }
// }
