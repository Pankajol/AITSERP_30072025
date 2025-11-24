import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let user;
  try { user = verifyJWT(token); } catch {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  try {
    // list categories for this company only
    const categories = await TicketCategory.find({ companyId: user.companyId }).sort({ type: 1, name: 1 });
    return NextResponse.json({ success: true, categories });
  } catch (err) {
    console.error("category.list:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
