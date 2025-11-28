export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";

const SECRET = process.env.INBOUND_EMAIL_SECRET;
const SUPPORT_EMAIL = "pankajal2099@gmail.com"; // jis mail pe tickets aayegi

export async function POST(req) {
  try {
    console.log("📩 EMAIL INBOUND HIT");

    const { searchParams } = new URL(req.url);
    const secret = (searchParams.get("secret") || "").trim();

    if (!SECRET) {
      console.log("❌ SECRET NOT SET IN ENV");
      return new Response(JSON.stringify({ error: "Server secret missing" }), { status: 500 });
    }

    if (secret !== SECRET) {
      console.log("❌ INVALID SECRET:", secret);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    await dbConnect();

    const body = await req.json();
    console.log("📨 EMAIL PAYLOAD:", body);

    const {
      fromEmail,
      to,
      subject,
      text,
      html,
      messageId,
      inReplyTo,
    } = body;

    if (!to || !fromEmail || (!text && !html)) {
      console.log("❌ INVALID PAYLOAD");
      return new Response(
        JSON.stringify({ error: "Invalid email payload" }),
        { status: 400 }
      );
    }

    // ✅ Extra Protection: Only allow support email
    if (!to.includes(SUPPORT_EMAIL)) {
      console.log("❌ NOT SUPPORT EMAIL:", to);
      return new Response(JSON.stringify({ error: "Invalid mailbox" }), {
        status: 403,
      });
    }

    let ticket = null;

    // ✅ Thread locate
    if (inReplyTo) {
      ticket = await Ticket.findOne({ emailThreadId: inReplyTo });
    }

    if (!ticket && messageId) {
      ticket = await Ticket.findOne({ emailThreadId: messageId });
    }

    // ✅ Create ticket
    if (!ticket) {
      console.log("🆕 Creating new ticket");

      ticket = await Ticket.create({
        customerEmail: fromEmail,
        subject: subject || "No Subject",
        source: "email",
        status: "open",
        emailThreadId: messageId,
        messages: [],
      });
    }

    // ✅ Add message
    ticket.messages.push({
      senderType: "customer",
      externalEmail: fromEmail,
      message: text || html,
      messageId,
      inReplyTo,
    });

    ticket.lastReplyAt = new Date();
    await ticket.save();

    console.log("✅ TICKET UPDATED:", ticket._id.toString());

    return new Response(
      JSON.stringify({
        success: true,
        ticketId: ticket._id,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ EMAIL INBOUND ERROR:", err.message);

    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500 }
    );
  }
}

// ✅ TEST ROUTE
export async function GET() {
  return new Response(
    JSON.stringify({
      success: true,
      message: "Email inbound API is working ✅",
    }),
    { status: 200 }
  );
}
