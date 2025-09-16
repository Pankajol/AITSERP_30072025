import dbConnect from "@/lib/db";
import Task from "@/models/project/TaskModel";
import SubTask from "@/models/project/SubTaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

// 🔹 Create subtask under a task
export async function POST(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const taskId = params.id;
    const data = await req.json();

    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.company.toString() !== decoded.companyId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const subtask = await SubTask.create({
      taskId: task._id,
      company: task.company,
      title: data.title,
      description: data.description,
      assignees: data.assignees,
      projectedStartDate: data.projectedStartDate,
      projectedEndDate: data.projectedEndDate,
      startDate: data.startDate,
      endDate: data.endDate,
      dueDate: data.dueDate,
      priority: data.priority,
      progress: data.progress,
      status: data.status,
    });

    task.subTasks.push(subtask._id);
    await task.save();

    return NextResponse.json(subtask, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating subtask:", err);
    return NextResponse.json({ error: "Error creating subtask" }, { status: 500 });
  }
}

// 🔹 Get all subtasks of a task
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const taskId = params.id;
    console.log("🔎 Fetching subtasks for TaskId:", taskId, "Company:", decoded.companyId);

    const subtasks = await SubTask.find({
      taskId,
      company: decoded.companyId,
    }).populate("assignees", "name email");

    return NextResponse.json(subtasks, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching subtasks:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
