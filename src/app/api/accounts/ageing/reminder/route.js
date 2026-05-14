import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Customer from "@/models/CustomerModel";
import Supplier from "@/models/SupplierModels";
import EmailMaster from "@/models/emailMaster/emailMaster";
import nodemailer from "nodemailer";
import crypto from "crypto";

// Decrypt app password (if encrypted)
function decryptPassword(encryptedText) {
  try {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || "default-secret-key-32-chars-long!", "salt", 32);
    const [encrypted, iv] = encryptedText.split(":");
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, "hex"));
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("Decryption error:", err);
    return encryptedText;
  }
}

// Create email transporter from EmailMaster config
async function getEmailTransporter(companyId) {
  try {
    // Get active email configuration for the company
    const emailConfig = await EmailMaster.findOne({ 
      companyId, 
      status: "Active" 
    }).sort({ createdAt: -1 });
    
    if (!emailConfig) {
      throw new Error("No active email configuration found. Please configure email settings in Email Master.");
    }

    let transporterConfig;
    const service = emailConfig.service.toLowerCase();

    if (service === "gmail") {
      transporterConfig = {
        service: "gmail",
        auth: {
          user: emailConfig.email,
          pass: decryptPassword(emailConfig.encryptedAppPassword),
        },
      };
    } else if (service === "outlook") {
      transporterConfig = {
        service: "hotmail",
        auth: {
          user: emailConfig.email,
          pass: decryptPassword(emailConfig.encryptedAppPassword),
        },
      };
    } else {
      // Custom SMTP
      transporterConfig = {
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: emailConfig.email,
          pass: decryptPassword(emailConfig.encryptedAppPassword),
        },
      };
    }

    return nodemailer.createTransport(transporterConfig);
  } catch (err) {
    console.error("Get email transporter error:", err);
    throw err;
  }
}

// Generate reminder email HTML
function generateReminderEmail(partyName, partyType, outstandingAmount, dueDetails) {
  const isCustomer = partyType === "Customer";
  const subject = isCustomer 
    ? `Payment Reminder - Outstanding Balance of ${outstandingAmount}`
    : `Payment Due Reminder - Outstanding Balance of ${outstandingAmount}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
        <h2 style="color: white; margin: 0;">${isCustomer ? "Payment Reminder" : "Outstanding Payment Alert"}</h2>
      </div>
      
      <div style="border: 1px solid #e0e0e0; border-top: none; padding: 20px; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #333;">Dear <strong>${partyName}</strong>,</p>
        
        <p style="font-size: 14px; color: #555;">This is a friendly reminder regarding your outstanding balance with us.</p>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Outstanding Amount:</td>
              <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${outstandingAmount}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0;">${dueDetails.dueDate || "Overdue"}</td>
            </tr>
            ${dueDetails.ageBucket ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Overdue Period:</td>
              <td style="padding: 8px 0; color: #f59e0b;">${dueDetails.ageBucket}</td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <p style="font-size: 14px; color: #555;">Please arrange the payment at your earliest convenience.</p>
        
        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
          <p style="font-size: 12px; color: #999;">This is an auto-generated reminder. Please contact us for any queries.</p>
          <p style="font-size: 12px; color: #999;">Thank you for your business!</p>
        </div>
      </div>
    </div>
  `;

  return { subject, html };
}

export async function POST(req) {
  try {
    await connectDB();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }
    
    const user = verifyJWT(token);
    if (!user || !user.companyId) {
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });
    }

    const { partyId, partyType, amount, dueDetails } = await req.json();

    if (!partyId || !partyType) {
      return NextResponse.json({ success: false, message: "partyId and partyType are required" }, { status: 400 });
    }

    let party = null;
    let emailId = null;
    let partyName = "";

    // Fetch party details based on type
    if (partyType === "Customer") {
      party = await Customer.findById(partyId);
      if (!party) {
        return NextResponse.json({ success: false, message: "Customer not found" }, { status: 404 });
      }
      emailId = party.emailId || party.email;
      partyName = party.customerName;
    } else if (partyType === "Supplier") {
      party = await Supplier.findById(partyId);
      if (!party) {
        return NextResponse.json({ success: false, message: "Supplier not found" }, { status: 404 });
      }
      emailId = party.emailId || party.email;
      partyName = party.supplierName;
    } else {
      return NextResponse.json({ success: false, message: "Invalid partyType" }, { status: 400 });
    }

    if (!emailId) {
      return NextResponse.json({ 
        success: false, 
        message: `${partyType} email not found. Please update contact information.` 
      }, { status: 404 });
    }

    // Get email transporter from EmailMaster configuration
    let transporter;
    try {
      transporter = await getEmailTransporter(user.companyId);
    } catch (err) {
      console.error("Email transporter error:", err);
      return NextResponse.json({ 
        success: false, 
        message: err.message || "Email configuration not found. Please setup email settings." 
      }, { status: 500 });
    }

    // Format outstanding amount
    const formattedAmount = new Intl.NumberFormat("en-IN", { 
      style: "currency", 
      currency: "INR",
      maximumFractionDigits: 0 
    }).format(amount || 0);

    // Generate email content
    const { subject, html } = generateReminderEmail(
      partyName, 
      partyType, 
      formattedAmount, 
      dueDetails || { dueDate: "Not specified" }
    );

    // Send email
    await transporter.sendMail({
      from: process.env.SMTP_FROM || transporter.options.auth?.user,
      to: emailId,
      subject: subject,
      html: html,
    });

    // Optional: Also send to CC if specified
    if (process.env.REMINDER_CC_EMAIL) {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || transporter.options.auth?.user,
        to: process.env.REMINDER_CC_EMAIL,
        subject: `Copy: ${subject}`,
        html: `<p>A reminder email was sent to ${emailId} (${partyName})</p>${html}`,
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Reminder sent successfully to ${partyName} (${emailId})` 
    });

  } catch (error) {
    console.error("Reminder API error:", error);
    return NextResponse.json({ 
      success: false, 
      message: error.message || "Failed to send reminder" 
    }, { status: 500 });
  }
}