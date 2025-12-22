


import dbConnect from "@/lib/db";
import Ticket from "@/models/helpdesk/Ticket";
import { verifyJWT, getTokenFromHeader } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return Response.json(
        { success: false, msg: "Unauthorized" },
        { status: 401 }
      );

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (e) {
      return Response.json(
        { success: false, msg: "Invalid token" },
        { status: 403 }
      );
    }

    const companyId = decoded.companyId;
    if (!companyId) {
      return Response.json(
        { success: false, msg: "companyId missing" },
        { status: 400 }
      );
    }

    const tickets = await Ticket.find({ companyId })
      .sort({ createdAt: -1 })
      .populate("agentId", "name email")
      .populate("customerId", "name email")
      .populate("companyId", "name");

    return Response.json({
      success: true,
      tickets,
    });
  } catch (err) {
    console.error("List error:", err);
    return Response.json(
      { success: false, msg: err.message },
      { status: 500 }
    );
  }
}

// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import CSAT from "@/models/helpdesk/CSAT";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   await dbConnect();

//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success:false, msg:"Unauthorized" }, { status:401 });
//   let user;
//   try { user = verifyJWT(token); } catch {}

//   if (!user.roles?.includes("admin")) return NextResponse.json({ success:false, msg:"Admin only" }, { status:403 });

//   const csats = await CSAT.find({ companyId: user.companyId }).sort({ createdAt: -1 });

//   return NextResponse.json({ success:true, csats });
// }
