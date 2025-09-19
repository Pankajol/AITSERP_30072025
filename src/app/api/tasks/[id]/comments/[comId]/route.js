import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Comment from "@/models/project/CommentModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// =================== GET ONE COMMENT ===================
export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded?.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const comment = await Comment.findOne({ 
      _id: params.id, 
      companyId: decoded.companyId 
    }).populate("author", "name email");

    if (!comment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(comment, { status: 200 });
  } catch (err) {
    console.error("Error fetching comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// =================== UPDATE COMMENT ===================
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded?.companyId || !decoded?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const updated = await Comment.findOneAndUpdate(
      { _id: params.id, companyId: decoded.companyId, author: decoded._id }, // only owner can edit
      body,
      { new: true }
    ).populate("author", "name email");

    if (!updated) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("Error updating comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// =================== DELETE COMMENT ===================
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    if (!decoded?.companyId || !decoded?._id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const deleted = await Comment.findOneAndDelete({
      _id: params.id,
      companyId: decoded.companyId,
      author: decoded._id, // only owner can delete
    });

    if (!deleted) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("Error deleting comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
