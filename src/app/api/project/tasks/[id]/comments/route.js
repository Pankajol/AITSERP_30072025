

import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Comment from "@/models/project/CommentModel";
import Task from "@/models/project/TaskModel";
import { getUserFromToken } from "@/lib/auth"; // 👈 helper to decode token

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




// POST /api/project/comments
export async function POST(req) {
  try {
    await dbConnect();

    const body = await req.json();
    const { taskId, text } = body;

    const token = req.headers.get("authorization")?.split(" ")[1];
    const user = await getUserFromToken(token);

    if (!taskId || !text) {
      return NextResponse.json({ error: "taskId and text required" }, { status: 400 });
    }

    // create comment
    const newComment = await Comment.create({
      task: taskId,
      author: user._id,
      text,
    });

    // push into Task
    await Task.findByIdAndUpdate(taskId, {
      $push: { comments: newComment._id },
    });

    // return populated comment
    const populated = await Comment.findById(newComment._id)
      .populate("author", "name email");

    return NextResponse.json(populated, { status: 201 });
  } catch (err) {
    console.error("Error creating comment:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


