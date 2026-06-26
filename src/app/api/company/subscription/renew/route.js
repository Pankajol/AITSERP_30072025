// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Company from "@/models/Company";
// import jwt from "jsonwebtoken";
// import Razorpay from "razorpay";

// // Log environment variables (without exposing secrets)
// console.log("RAZORPAY_KEY_ID exists?", !!process.env.RAZORPAY_KEY_ID);
// console.log("RAZORPAY_SECRET exists?", !!process.env.RAZORPAY_SECRET);

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_SECRET,
// });

// const PRICES = {
//   starter: { monthly: 2, yearly: 3 },
//   growth: { monthly: 3, yearly: 4 },
// };

// export async function POST(req) {
//   try {
//     const authHeader = req.headers.get("authorization");
//     const token = authHeader?.split(" ")[1];
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const companyId = decoded.companyId || decoded.id;
//     const { planId, planType } = await req.json();

//     if (!planId || !planType) {
//       return NextResponse.json({ error: "planId and planType required" }, { status: 400 });
//     }
//     const amount = PRICES[planId]?.[planType];
//     if (!amount) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });

//     await dbConnect();
//     const company = await Company.findById(companyId);
//     if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });

//     // Cancel existing subscription at period end (if any)
//     if (company.razorpaySubscriptionId) {
//       try {
//         await razorpay.subscriptions.cancel(company.razorpaySubscriptionId, { cancel_at_cycle_end: 1 });
//       } catch (err) {
//         console.log("Old subscription cancel error:", err.message);
//       }
//     }

//     // Create a Razorpay Plan
//     const plan = await razorpay.plans.create({
//       period: planType === "monthly" ? "monthly" : "yearly",
//       interval: 1,
//       item: {
//         name: `${planId} ${planType}`,
//         amount: amount * 100,
//         currency: "INR",
//       },
//     });

//     // Create subscription
//     const subscription = await razorpay.subscriptions.create({
//       plan_id: plan.id,
//       customer_notify: 0,
//       total_count: planType === "monthly" ? 12 : 1,
//       notes: { companyId: company._id.toString() },
//     });

//     // Update company (will be finalized via webhook)
//     company.razorpaySubscriptionId = subscription.id;
//     company.razorpayPlanId = plan.id;
//     company.plan = planId;
//     company.planType = planType;
//     company.currentPeriodStart = new Date();
//     const end = new Date();
//     end.setMonth(end.getMonth() + (planType === "yearly" ? 12 : 1));
//     company.currentPeriodEnd = end;
//     company.subscriptionStatus = "active";
//     company.cancelAtPeriodEnd = false;
//     await company.save();

//     return NextResponse.json({
//       success: true,
//       subscription_id: subscription.id,
//       amount: amount,
//       currency: "INR",
//       companyName: company.companyName,
//       contactName: company.contactName,
//       email: company.email,
//     });
//   } catch (err) {
//     console.error("Renew error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }