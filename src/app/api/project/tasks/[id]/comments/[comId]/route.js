import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Comment from "@/models/project/CommentModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const comment = await Comment.findOne({ _id: params.id, company: decoded.companyId });
    if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(comment);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const updated = await Comment.findOneAndUpdate(
      { _id: params.id, company: decoded.companyId, user: decoded.userId }, // only owner can edit
      body,
      { new: true }
    );

    if (!updated) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const deleted = await Comment.findOneAndDelete({
      _id: params.id,
      company: decoded.companyId,
      user: decoded.userId, // only owner can delete
    });

    if (!deleted) return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
