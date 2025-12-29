import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success:false, msg:"Unauthorized" },
        { status:401 }
      );

    let user;
    try {
      user = verifyJWT(token);
    } catch {
      return NextResponse.json(
        { success:false, msg:"Invalid token" },
        { status:403 }
      );
    }

    let query = {};

    // ===============================
    // COMPANY ADMIN (type = company)
    // ===============================
    if (user.type === "company" || user.role === "admin" || user.role === "owner") {
      query = {
        companyId: user.companyId,
      };
    }

    // ===============================
    // AGENT
    // ===============================
    else if (user.role === "agent") {
      query = {
        companyId: user.companyId,
        agentId: user.id,
      };
    }

    // ===============================
    // CUSTOMER
    // ===============================
    else if (user.role === "customer") {
      query = {
        customerId: user.id,
      };
    }

    else {
      return NextResponse.json(
        { success:false, msg:"Role not allowed" },
        { status:403 }
      );
    }

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
      .populate("agentId", "name email")
      .populate("customerId", "name email")
      .populate("companyId", "name");

    return NextResponse.json({ success: true, tickets });

  } catch (err) {
    console.error("List route error:", err);
    return NextResponse.json(
      { success:false, msg:err.message },
      { status:500 }
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

// export async function GET(req) {
//   try {
//     await dbConnect();

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });

//     let user;
//     try {
//       user = verifyJWT(token);
//     } catch {
//       return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 });
//     }

//     let query = { companyId: user.companyId };

//     if (user.role === "customer") query.customerId = user.id;
//     if (user.role === "agent") query.agentId = user.id;

//     const tickets = await Ticket.find(query)
//       .sort({ createdAt: -1 })
//       .populate("agentId", "name email")
//       .populate("customerId", "name email")
//       .populate("companyId", "name");

//     return NextResponse.json({ success: true, tickets });
//   } catch (err) {
//     console.error("List route error:", err);
//     return NextResponse.json({ success:false, msg:err.message }, { status:500 });
//   }
// }



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Ticket from "@/models/helpdesk/Ticket";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// export async function GET(req) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });

//   let user;
//   try { user = verifyJWT(token); } 
//   catch { return NextResponse.json({ success:false, msg:"Invalid token" }, { status:403 }); }

//   let query = { companyId: user.companyId };

//   if (user.roles?.includes("customer"))
//     query.customerId = user.id;

//   if (user.roles?.includes("agent"))
//     query.agentId = user.id;

//   const tickets = await Ticket.find(query)
//     .sort({ createdAt: -1 })
//           .sort({ createdAt: -1 })
//       .populate("agentId", "name email")
//       .populate("customerId", "name email")
//       .populate("companyId", "name");


//   return NextResponse.json({ success: true, tickets });
// }