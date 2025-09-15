import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import SubTask from "@/models/project/SubTaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id: taskId, subtaskId } = params;
    const subtask = await SubTask.findOne({
      _id: subtaskId,
      taskId,
      company: decoded.companyId,
    });

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    return NextResponse.json(subtask, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id: taskId, subtaskId } = params;
    const body = await req.json();

    const subtask = await SubTask.findOneAndUpdate(
      { _id: subtaskId, taskId, company: decoded.companyId },
      body,
      { new: true }
    );

    if (!subtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    return NextResponse.json(subtask, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id: taskId, subtaskId } = params;

    const deleted = await SubTask.findOneAndDelete({
      _id: subtaskId,
      taskId,
      company: decoded.companyId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Subtask deleted" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
