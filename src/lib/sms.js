// src/lib/sms.js
// ─── Redirects to WhatsApp ─────────────────────────────────────────────────
// OTP is sent via WhatsApp (not SMS/Twilio).
// All logic lives in src/lib/whatsapp.js
// This file exists only so register/request-otp routes don't need to change.
// ──────────────────────────────────────────────────────────────────────────
import { sendOTPWhatsApp } from './whatsapp';

export async function sendOTP(phone, otp) {
  return sendOTPWhatsApp(phone, otp);
}
