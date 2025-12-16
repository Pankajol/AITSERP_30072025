import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, msg: "Unauthorized" }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    let user;
    try {
      user = verifyJWT(token);
    } catch {
      return new Response(
        JSON.stringify({ success: false, msg: "Invalid token" }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" }
        }
      );
    }

    // -------------------------
    // NO COMPANYID FILTER AT ALL
    // -------------------------
    let query = {};

    if (user.roles?.includes("customer")) {
      query.customerId = user.id;
    }

    if (user.roles?.includes("agent")) {
      query.agentId = user.id;
    }

    // admin → see all tickets
    // (no filters needed)

    const tickets = await Ticket.find(query)
      .sort({ createdAt: -1 })
       .populate("agentId", "name email avatar") // 🔥 REQUIRED
      .populate("customerId", "customerName email");;

    return new Response(
      JSON.stringify({ success: true, tickets }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err) {
    console.error("GET /tickets error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}



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
//     .sort({ createdAt: -1 });

//   return NextResponse.json({ success: true, tickets });
// }