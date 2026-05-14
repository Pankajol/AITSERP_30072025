import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let user;
  try { user = verifyJWT(token); } catch {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  if (!user || !user.companyId) {
    return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) return NextResponse.json({ success: false, msg: "Name required" }, { status: 400 });

    // prevent duplicate category names within same company (case-insensitive)
    const exists = await TicketCategory.findOne({
      companyId: user.companyId,
      name: { $regex: `^${name}$`, $options: "i" }
    });
    if (exists) return NextResponse.json({ success: false, msg: "Category already exists" }, { status: 409 });

    const item = await TicketCategory.create({
      companyId: user.companyId,
      createdBy: user.id,
      name,
      type: body.type || "custom"
    });

    return NextResponse.json({ success: true, category: item });
  } catch (err) {
    console.error("category.create:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
