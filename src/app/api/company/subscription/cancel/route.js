// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";
// import jwt from "jsonwebtoken";
// import Razorpay from "razorpay";

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

// export async function POST(req) {
//   try {
//     const authHeader = req.headers.get("authorization");
//     const token = authHeader?.split(" ")[1];
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const companyId = decoded.companyId || decoded.id;

//     await dbConnect();
//     const company = await Company.findById(companyId);
//     if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

//     if (company.razorpaySubscriptionId) {
//       await razorpay.subscriptions.cancel(company.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
//     }

//     company.cancelAtPeriodEnd = true;
//     await company.save();

//     return NextResponse.json({ success: true, message: "Auto‑renewal cancelled" });
//   } catch (err) {
//     console.error("Cancel error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }