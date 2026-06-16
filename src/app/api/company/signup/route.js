import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import bcrypt from "bcryptjs";

// Simple in‑memory rate limiter (for single instance; replace with Redis in production)
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 10; // max 10 requests per IP per minute

function isRateLimited(ip) {
  const now = Date.now();
  const record = rateLimit.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    rateLimit.set(ip, record);
    return false;
  }
  record.count++;
  rateLimit.set(ip, record);
  return record.count > RATE_LIMIT_MAX;
}

export async function POST(req) {
  try {
    // --- Rate limiting (by IP) ---
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
    }

    await dbConnect();
    const body = await req.json();

    // --- Required fields ---
    const required = ["companyName", "contactName", "email", "phone", "country", "address", "pinCode", "password"];
    const missing = required.filter(k => !body[k]?.toString().trim());
    if (missing.length) {
      return NextResponse.json({ message: `Missing: ${missing.join(", ")}` }, { status: 400 });
    }
    if (!body.agreeToTerms) {
      return NextResponse.json({ message: "You must agree to terms" }, { status: 400 });
    }
    if (typeof body.password !== "string" || body.password.length < 8) {
      return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
    }

    // --- Phone validation ---
    const digitsOnly = body.phone.replace(/\D/g, "");
    if (digitsOnly.length < 5 || digitsOnly.length > 15) {
      return NextResponse.json({ message: "Invalid phone number length" }, { status: 400 });
    }

    // --- Country‑specific PIN validation ---
    const { country, pinCode, gstNumber } = body;
    if (country === "India" && !/^\d{6}$/.test(pinCode.trim())) {
      return NextResponse.json({ message: "PIN must be exactly 6 digits" }, { status: 400 });
    }
    if (country === "United States" && !/^\d{5}(-\d{4})?$/.test(pinCode.trim())) {
      return NextResponse.json({ message: "ZIP must be 5 digits or 5+4" }, { status: 400 });
    }
    if (country === "United Kingdom" && !/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i.test(pinCode.trim())) {
      return NextResponse.json({ message: "Invalid UK postcode format" }, { status: 400 });
    }

    // --- GST (optional, only for India) ---
    let gst = gstNumber?.trim().toUpperCase() || undefined;
    if (country === "India" && gst && !/^[0-9A-Z]{15}$/.test(gst)) {
      return NextResponse.json({ message: "GST must be 15 alphanumeric characters" }, { status: 400 });
    }

    const normalEmail = body.email.toLowerCase().trim();

    // --- Duplicate checks ---
    const existing = await Company.findOne({ email: normalEmail });
    if (existing) {
      return NextResponse.json({ message: "Email already registered" }, { status: 409 });
    }
    if (gst) {
      const gstExists = await Company.findOne({ gstNumber: gst });
      if (gstExists) {
        return NextResponse.json({ message: "GST number already registered" }, { status: 409 });
      }
    }

    // --- Hash password ---
    const hashedPassword = await bcrypt.hash(body.password, 12);

    // --- Plan dates & subscription status (NEW) ---
    const now = new Date();
    const planActivatedAt = now;
    const isTrial = body.paymentMethod === "trial";

    let trialEndsAt = null;
    let currentPeriodStart = now;
    let currentPeriodEnd = null;
    let planType = isTrial ? "trial" : (body.planType || "monthly"); // allow planType from frontend, default monthly
    let subscriptionStatus = isTrial ? "trialing" : "active";

    if (isTrial) {
      // 7‑day trial
      trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      currentPeriodEnd = trialEndsAt;
    } else {
      // For paid plans (monthly/yearly) – set current period end accordingly
      // In a real scenario, you would create a Razorpay subscription first.
      // For now, set a placeholder period (e.g., 1 month for monthly, 1 year for yearly)
      const duration = planType === "yearly" ? 12 : 1;
      currentPeriodEnd = new Date(now);
      currentPeriodEnd.setMonth(now.getMonth() + duration);
    }

    // --- Create company (including new subscription fields) ---
    const company = await Company.create({
      companyName:    body.companyName.trim(),
      contactName:    body.contactName.trim(),
      email:          normalEmail,
      phone:          digitsOnly,
      country:        body.country,
      address:        body.address.trim(),
      pinCode:        body.pinCode.trim(),
      password:       hashedPassword,
      agreeToTerms:   true,
      businessType:   body.businessType || undefined,
      industry:       body.industry || undefined,
      gstNumber:      gst,
      plan:           body.plan || "starter",
      paymentMethod:  body.paymentMethod || undefined,
      planActivatedAt,
      trialEndsAt,
      managementType: body.managementType || "erp",
      // Theme specific fields (unchanged)
      erpModules:    body.erpModules,
      employeeCount: body.employeeCount,
      societyRegNo:   body.societyRegNo,
      totalFlats:     body.totalFlats,
      committeeName:  body.committeeName,
      licenseNumber:  body.licenseNumber,
      facilityType:   body.facilityType,
      bedCapacity:    body.bedCapacity,
      institutionCode: body.institutionCode,
      boardOrUniversity: body.boardOrUniversity,
      studentCapacity: body.studentCapacity,
      storePan:       body.storePan,
      outletCount:    body.outletCount,
      primaryCategory: body.primaryCategory,
      constituencyName: body.constituencyName,
      electionType:   body.electionType,
      electionDate:   body.electionDate,
      boothCount:     body.boothCount,
      isActive: true,
      
      // NEW SUBSCRIPTION FIELDS
      planType: planType,
      subscriptionStatus: subscriptionStatus,
      currentPeriodStart: currentPeriodStart,
      currentPeriodEnd: currentPeriodEnd,
      cancelAtPeriodEnd: false,
      razorpaySubscriptionId: null,   // will be set when paid subscription created
      razorpayPlanId: null,
    });

    console.log(`New registration: ${normalEmail} from IP ${ip} - ${isTrial ? "Trial" : "Paid"} plan`);

    return NextResponse.json(
      { success: true, id: company._id, message: "Registration successful" },
      { status: 201 }
    );
  } catch (err) {
    console.error("[signup error]", err);
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue || {})[0] || "field";
      return NextResponse.json({ message: `${field === "email" ? "Email" : "GST number"} already exists` }, { status: 409 });
    }
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map(e => e.message);
      return NextResponse.json({ message: messages.join(". ") }, { status: 400 });
    }
    return NextResponse.json({ message: "Registration failed. Please try again." }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";
// import bcrypt from "bcryptjs";

// // Simple in‑memory rate limiter (for single instance; replace with Redis in production)
// const rateLimit = new Map();
// const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
// const RATE_LIMIT_MAX = 10; // max 10 requests per IP per minute

// function isRateLimited(ip) {
//   const now = Date.now();
//   const record = rateLimit.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
//   if (now > record.resetTime) {
//     record.count = 1;
//     record.resetTime = now + RATE_LIMIT_WINDOW;
//     rateLimit.set(ip, record);
//     return false;
//   }
//   record.count++;
//   rateLimit.set(ip, record);
//   return record.count > RATE_LIMIT_MAX;
// }

// export async function POST(req) {
//   try {
//     // --- Rate limiting (by IP) ---
//     const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
//     if (isRateLimited(ip)) {
//       return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
//     }

//     await dbConnect();
//     const body = await req.json();

//     // --- Required fields ---
//     const required = ["companyName", "contactName", "email", "phone", "country", "address", "pinCode", "password"];
//     const missing = required.filter(k => !body[k]?.toString().trim());
//     if (missing.length) {
//       return NextResponse.json({ message: `Missing: ${missing.join(", ")}` }, { status: 400 });
//     }
//     if (!body.agreeToTerms) {
//       return NextResponse.json({ message: "You must agree to terms" }, { status: 400 });
//     }
//     if (typeof body.password !== "string" || body.password.length < 8) {
//       return NextResponse.json({ message: "Password must be at least 8 characters" }, { status: 400 });
//     }

//     // --- Phone validation ---
//     const digitsOnly = body.phone.replace(/\D/g, "");
//     if (digitsOnly.length < 5 || digitsOnly.length > 15) {
//       return NextResponse.json({ message: "Invalid phone number length" }, { status: 400 });
//     }

//     // --- Country‑specific PIN validation ---
//     const { country, pinCode, gstNumber } = body;
//     if (country === "India" && !/^\d{6}$/.test(pinCode.trim())) {
//       return NextResponse.json({ message: "PIN must be exactly 6 digits" }, { status: 400 });
//     }
//     if (country === "United States" && !/^\d{5}(-\d{4})?$/.test(pinCode.trim())) {
//       return NextResponse.json({ message: "ZIP must be 5 digits or 5+4" }, { status: 400 });
//     }
//     if (country === "United Kingdom" && !/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i.test(pinCode.trim())) {
//       return NextResponse.json({ message: "Invalid UK postcode format" }, { status: 400 });
//     }

//     // --- GST (optional, only for India) ---
//     let gst = gstNumber?.trim().toUpperCase() || undefined;
//     if (country === "India" && gst && !/^[0-9A-Z]{15}$/.test(gst)) {
//       return NextResponse.json({ message: "GST must be 15 alphanumeric characters" }, { status: 400 });
//     }

//     const normalEmail = body.email.toLowerCase().trim();

//     // --- Duplicate checks ---
//     const existing = await Company.findOne({ email: normalEmail });
//     if (existing) {
//       return NextResponse.json({ message: "Email already registered" }, { status: 409 });
//     }
//     if (gst) {
//       const gstExists = await Company.findOne({ gstNumber: gst });
//       if (gstExists) {
//         return NextResponse.json({ message: "GST number already registered" }, { status: 409 });
//       }
//     }

//     // --- Hash password ---
//     const hashedPassword = await bcrypt.hash(body.password, 12);

//     // --- Plan dates ---
//     const now = new Date();
//     const planActivatedAt = now;
//     let trialEndsAt = null;
//     if (body.paymentMethod === "trial") {
//       trialEndsAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
//     }

//     // --- Create company (active immediately – email verification can be added later) ---
//     const company = await Company.create({
//       companyName:    body.companyName.trim(),
//       contactName:    body.contactName.trim(),
//       email:          normalEmail,
//       phone:          digitsOnly,
//       country:        body.country,
//       address:        body.address.trim(),
//       pinCode:        body.pinCode.trim(),
//       password:       hashedPassword,
//       agreeToTerms:   true,
//       businessType:   body.businessType || undefined,
//       industry:       body.industry || undefined,
//       gstNumber:      gst,
//       plan:           body.plan || "starter",
//       paymentMethod:  body.paymentMethod || undefined,
//       planActivatedAt,
//       trialEndsAt,
//       managementType: body.managementType || "erp",
//       erpModules:    body.erpModules,
//       employeeCount: body.employeeCount,
//       societyRegNo:   body.societyRegNo,
//       totalFlats:     body.totalFlats,
//       committeeName:  body.committeeName,
//       licenseNumber:  body.licenseNumber,
//       facilityType:   body.facilityType,
//       bedCapacity:    body.bedCapacity,
//       institutionCode: body.institutionCode,
//       boardOrUniversity: body.boardOrUniversity,
//       studentCapacity: body.studentCapacity,
//       storePan:       body.storePan,
//       outletCount:    body.outletCount,
//       primaryCategory: body.primaryCategory,
//       constituencyName: body.constituencyName,
//       electionType:   body.electionType,
//       electionDate:   body.electionDate,
//       boothCount:     body.boothCount,
//       isActive: true,   // Account active immediately (no email verification)
//     });

//     console.log(`New registration: ${normalEmail} from IP ${ip}`);

//     return NextResponse.json(
//       { success: true, id: company._id, message: "Registration successful" },
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("[signup error]", err);
//     if (err.code === 11000) {
//       const field = Object.keys(err.keyValue || {})[0] || "field";
//       return NextResponse.json({ message: `${field === "email" ? "Email" : "GST number"} already exists` }, { status: 409 });
//     }
//     if (err.name === "ValidationError") {
//       const messages = Object.values(err.errors).map(e => e.message);
//       return NextResponse.json({ message: messages.join(". ") }, { status: 400 });
//     }
//     return NextResponse.json({ message: "Registration failed. Please try again." }, { status: 500 });
//   }
// }
