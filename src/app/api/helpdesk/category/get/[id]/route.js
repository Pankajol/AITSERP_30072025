import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let user;
  try { user = verifyJWT(token); } catch {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  try {
    const cat = await TicketCategory.findById(params.id);
    if (!cat) return NextResponse.json({ success: false, msg: "Not found" }, { status: 404 });

    // ensure company match
    if (cat.companyId.toString() !== user.companyId)
      return NextResponse.json({ success: false, msg: "Forbidden" }, { status: 403 });

    return NextResponse.json({ success: true, category: cat });
  } catch (err) {
    console.error("category.get:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
