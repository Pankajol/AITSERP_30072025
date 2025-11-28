export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const SECRET = process.env.INBOUND_EMAIL_SECRET;

export async function POST(req) {
  try {
    console.log("📩 EMAIL INBOUND HIT");

    // ✅ SECURITY - secret check
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    if (!secret || secret !== SECRET) {
      console.log("❌ INVALID SECRET");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // ✅ GET TOKEN FROM HEADER
    const token = getTokenFromHeader(req);
    if (!token) {
      console.log("❌ TOKEN MISSING");
      return new Response(JSON.stringify({ error: "Token required" }), {
        status: 401,
      });
    }

    const decoded = verifyJWT(token);

    if (!decoded?.companyId) {
      console.log("❌ INVALID TOKEN");
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 403,
      });
    }

    const companyId = decoded.companyId;

    await dbConnect();

    const body = await req.json();
    console.log("📨 EMAIL PAYLOAD:", body);

    const {
      fromEmail,
      subject,
      text,
      html,
      messageId,
      inReplyTo,
    } = body;

    if (!fromEmail || (!text && !html)) {
      console.log("❌ INVALID PAYLOAD");
      return new Response(
        JSON.stringify({ error: "Invalid email payload" }),
        { status: 400 }
      );
    }

    // ✅ FIND EXISTING TICKET (Thread)
    let ticket = null;

    if (inReplyTo) {
      ticket = await Ticket.findOne({
        companyId,
        emailThreadId: inReplyTo,
      });
    }

    if (!ticket && messageId) {
      ticket = await Ticket.findOne({
        companyId,
        emailThreadId: messageId,
      });
    }

    // ✅ CREATE NEW TICKET
    if (!ticket) {
      console.log("🆕 Creating new ticket");

      ticket = await Ticket.create({
        companyId,
        customerEmail: fromEmail,
        subject: subject || "No Subject",
        source: "email",
        status: "open",
        emailThreadId: messageId,
        messages: [],
      });
    }

    // ✅ ADD MESSAGE
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
