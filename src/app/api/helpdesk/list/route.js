import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import Customer from "@/models/CustomerModel";
import CompanyUser from "@/models/CompanyUser";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

export async function GET(req) {
  try {
    await dbConnect();

    /* ================= AUTH ================= */
    const token = getTokenFromHeader(req);

    if (!token) {
      return NextResponse.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );
    }

    let user;
    try {
      user = await verifyJWT(token);
    } catch {
      return NextResponse.json(
        { success: false, msg: "Invalid token" },
        { status: 403 }
      );
    }

    console.log("👤 Logged in user:", user);

    /* ================= COMPANY VALIDATION ================= */
    if (!user.companyId || !mongoose.Types.ObjectId.isValid(user.companyId)) {
      return NextResponse.json(
        { success: false, msg: "Company context missing" },
        { status: 403 }
      );
    }

    const query = {
      companyId: new mongoose.Types.ObjectId(user.companyId),
    };

    /* ================= ROLE DETECTION ================= */

    const roles =
      user.roles?.map((r) => r.toLowerCase()) || [];

    const isCompany = user.type === "company";
    const isCustomer = user.type === "customer";
    const isAgent = roles.includes("agent");

    // ================= CUSTOMER LOGIN =================
if (isCustomer) {
  const customer = await Customer.findOne({
    emailId: user.email,        // JWT email
    companyId: user.companyId,
  }).select("_id");

  console.log("🧾 Found customer:", customer?._id);

  if (customer) {
    query.customerId = customer._id;
  }
}



    // ================= AGENT LOGIN =================
    if (isAgent) {
      if (mongoose.Types.ObjectId.isValid(user.id)) {
        query.agentId = new mongoose.Types.ObjectId(user.id);
      }
    }

    // ================= COMPANY LOGIN =================
    // no extra filter → show all company tickets

    console.log("🎯 Ticket list query:", query);

    /* ================= FETCH ================= */
    const tickets = await Ticket.find(query)
      .sort({ lastCustomerReplyAt: -1, updatedAt: -1 })
      .populate("agentId", "name email avatar")
      .populate("customerId", "customerName emailId")
      .populate("companyId", "companyName");

    console.log(`📦 Tickets found: ${tickets.length}`);

    return NextResponse.json({
      success: true,
      tickets,
    });
  } catch (err) {
    console.error("❌ List route error:", err);

    return NextResponse.json(
      { success: false, msg: "Server error", error: err.message },
      { status: 500 }
    );
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import Customer from "@/models/CustomerModel";
// import CompanyUser from "@/models/CompanyUser";
// import Company from "@/models/Company";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import mongoose from "mongoose";

// export async function GET(req) {
//   try {
//     await dbConnect();

//     /* ================= AUTH ================= */
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json(
//         { success: false, msg: "Unauthorized" },
//         { status: 401 }
//       );
//     }

//     let user;
//     try {
//       user = verifyJWT(token);
//     } catch {
//       return NextResponse.json(
//         { success: false, msg: "Invalid token" },
//         { status: 403 }
//       );
//     }

//     console.log("👤 Logged in user:", user);

//     /* ================= QUERY BUILD ================= */

//     const query = {};

//     // 🔒 company isolation (MANDATORY)
//     if (user.companyId && mongoose.Types.ObjectId.isValid(user.companyId)) {
//       query.companyId = new mongoose.Types.ObjectId(user.companyId);
//     } else {
//       console.log("⛔ companyId missing in token");
//       return NextResponse.json(
//         { success: false, msg: "Company context missing" },
//         { status: 403 }
//       );
//     }
//    const roles = user.roles || [];
//     // 👤 role based restriction
//     if (user.role === "customer") {
//       query.customerId = new mongoose.Types.ObjectId(user.id);
//     }

//    // AGENT
// if (roles.includes("Agent")) {
//   query.agentId = new mongoose.Types.ObjectId(user.id);
// }


//     console.log("🎯 Ticket list query:", query);

//     /* ================= FETCH ================= */

//    const tickets = await Ticket.find(query)
//   .sort({ lastCustomerReplyAt: -1, updatedAt: -1 })
//   .populate("agentId", "name email")
//   .populate("customerId", "customerName emailId")
//   .populate("companyId", "companyName");


//     console.log(`📦 Tickets found: ${tickets.length}`);

//     return NextResponse.json({
//       success: true,
//       tickets,
//     });
//   } catch (err) {
//     console.error("❌ List route error:", err);
//     return NextResponse.json(
//       { success: false, msg: err.message },
//       { status: 500 }
//     );
//   }
// }



