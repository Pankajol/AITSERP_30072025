import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function PUT(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let user;
  try { user = verifyJWT(token); } catch {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  if (!user.roles?.includes("admin")) {
    return NextResponse.json({ success: false, msg: "Admin only" }, { status: 403 });
  }

  try {
    const { id, name, type } = await req.json();
    if (!id) return NextResponse.json({ success: false, msg: "Category id required" }, { status: 400 });

    const cat = await TicketCategory.findById(id);
    if (!cat) return NextResponse.json({ success: false, msg: "Not found" }, { status: 404 });

    if (cat.companyId.toString() !== user.companyId)
      return NextResponse.json({ success: false, msg: "Forbidden" }, { status: 403 });

    // prevent renaming default categories to duplicate another category
    if (name && name.trim() !== cat.name) {
      const exists = await TicketCategory.findOne({
        companyId: user.companyId,
        name: { $regex: `^${name.trim()}$`, $options: "i" },
        _id: { $ne: cat._id }
      });
      if (exists) return NextResponse.json({ success: false, msg: "Another category with this name exists" }, { status: 409 });
      cat.name = name.trim();
    }

    if (type) cat.type = type;
    await cat.save();

    return NextResponse.json({ success: true, category: cat });
  } catch (err) {
    console.error("category.update:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
