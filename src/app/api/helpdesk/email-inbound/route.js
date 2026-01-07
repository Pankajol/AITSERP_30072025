export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import Company from "@/models/Company";
import { getNextAvailableAgent } from "@/utils/getNextAvailableAgent";
import { analyzeSentimentAI } from "@/utils/aiSentiment";
import { simpleParser } from "mailparser"; // Ise install kar lena: npm install mailparser
import cloudinary from "@/lib/cloudinary";

/* ===================== HELPERS ===================== */

function normalizeId(id) {
  if (!id) return "";
  let s = String(id).trim();
  if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
  return s.replace(/[\r\n\s]+/g, "");
}

function extractEmail(value) {
  if (!value) return "";
  if (Array.isArray(value)) value = value[0];
  if (typeof value === "object") return (value.email || value.address || "").toLowerCase();
  const m = String(value).match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  return m ? m[1].toLowerCase() : "";
}

// Cloudinary Upload Helper (Fix for Inbound)
async function uploadToCloudinary(buffer, filename, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto", public_id: filename.split('.')[0] },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
}

/* ===================== MAIN ROUTE ===================== */

export async function POST(req) {
  try {
    await dbConnect();
    
    // Auth Check
    const { searchParams } = new URL(req.url);
    if (searchParams.get("secret") !== process.env.INBOUND_EMAIL_SECRET) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse Multi-part or JSON Body
    const contentType = req.headers.get("content-type") || "";
    let rawBody;
    
    // Sabse safe method: Pure email source ko pakadna
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      rawBody = Object.fromEntries(formData);
    } else {
      rawBody = await req.json();
    }

    // 1. Parse Email with SimpleParser (Sabse important step for files)
    const emailSource = rawBody.raw || rawBody.email || rawBody.content || rawBody.body;
    const parsedEmail = await simpleParser(emailSource);

    const fromEmail = extractEmail(parsedEmail.from?.text || rawBody.from);
    const toEmail = extractEmail(parsedEmail.to?.text || rawBody.to);
    const subject = parsedEmail.subject || rawBody.subject || "No Subject";
    const bodyText = parsedEmail.text || rawBody.text || "";
    const messageId = normalizeId(parsedEmail.messageId || rawBody.messageId);
    
    if (!fromEmail || !toEmail) {
      return Response.json({ error: "Missing email info" }, { status: 400 });
    }

    // 2. Threading Logic: Existing Ticket Check
    const threadIds = [messageId, normalizeId(parsedEmail.inReplyTo), ...(parsedEmail.references || [])].filter(Boolean);
    
    let ticket = await Ticket.findOne({
      $or: [
        { emailThreadId: { $in: threadIds } },
        { "messages.messageId": { $in: threadIds } }
      ]
    });

    // 3. Handle Attachments
    let uploadedFiles = [];
    const attachments = parsedEmail.attachments || [];
    
    for (const file of attachments) {
      try {
        const result = await uploadToCloudinary(
          file.content, // Yeh buffer hota hai simpleParser mein
          file.filename || "attachment",
          `helpdesk/tickets/${ticket?._id || "inbound"}`
        );
        uploadedFiles.push({
          filename: file.filename,
          url: result.secure_url,
          contentType: file.contentType,
          size: file.size,
        });
      } catch (err) {
        console.error("Cloudinary Individual Upload Error:", err);
      }
    }

    const sentiment = await analyzeSentimentAI(bodyText);

    if (ticket) {
      // Logic: Duplicate Message Check
      const isDuplicate = ticket.messages.some(m => m.messageId === messageId);
      if (isDuplicate) return Response.json({ success: true, msg: "Duplicate" });

      // Re-open if closed
      if (ticket.status === "closed") ticket.status = "open";

      ticket.messages.push({
        senderType: "customer",
        externalEmail: fromEmail,
        message: bodyText,
        messageId,
        sentiment,
        attachments: uploadedFiles,
        createdAt: new Date()
      });
      
      ticket.lastReplyAt = new Date();
      await ticket.save();
      return Response.json({ success: true, ticketId: ticket._id });
    }

    // 4. New Ticket Logic
    const company = await Company.findOne({ supportEmails: toEmail });
    if (!company) return Response.json({ error: "Company not found" }, { status: 404 });

    const customer = await Customer.findOne({ emailId: fromEmail, companyId: company._id });
    if (!customer) return Response.json({ error: "Customer not registered" }, { status: 403 });

    const agentId = await getNextAvailableAgent(customer);
    const newTicket = await Ticket.create({
      companyId: company._id,
      customerId: customer._id,
      customerEmail: fromEmail,
      subject,
      source: "email",
      status: "open",
      agentId,
      sentiment,
      emailThreadId: messageId,
      messages: [{
        senderType: "customer",
        externalEmail: fromEmail,
        message: bodyText,
        messageId,
        sentiment,
        attachments: uploadedFiles,
        createdAt: new Date()
      }],
      lastCustomerReplyAt: new Date(),
    });

    return Response.json({ success: true, ticketId: newTicket._id });

  } catch (err) {
    console.error("Critical Inbound Error:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}