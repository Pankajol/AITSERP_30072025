import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import TicketCategory from "@/models/helpdesk/TicketCategory";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function DELETE(req) {
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
    const { id, reassignTo } = await req.json();
    if (!id) return NextResponse.json({ success: false, msg: "Category id required" }, { status: 400 });

    const cat = await TicketCategory.findById(id);
    if (!cat) return NextResponse.json({ success: false, msg: "Not found" }, { status: 404 });

    if (cat.companyId.toString() !== user.companyId)
      return NextResponse.json({ success: false, msg: "Forbidden" }, { status: 403 });

    if (cat.type === "default") {
      return NextResponse.json({ success: false, msg: "Default categories cannot be deleted" }, { status: 403 });
    }

    // If tickets reference this category, either reassign or set to 'general'
    const fallback = reassignTo || "general";
    await Ticket.updateMany(
      { companyId: user.companyId, category: cat.name },
      { $set: { category: fallback } }
    );

    await TicketCategory.deleteOne({ _id: cat._id });

    return NextResponse.json({ success: true, msg: "Deleted and tickets reassigned", fallback });
  } catch (err) {
    console.error("category.delete:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
