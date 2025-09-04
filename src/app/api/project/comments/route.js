import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Comment from "@/models/project/CommentModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const comments = await Comment.find({ company: decoded.companyId });
    return NextResponse.json(comments, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const comment = new Comment({
      ...body,
      user: decoded.userId,
      company: decoded.companyId,
    });
    await comment.save();

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
