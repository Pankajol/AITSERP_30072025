import dbConnect from "@/lib/db";
import Task from "@/models/project/TaskModel";
import SubTask from "@/models/project/SubTaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(req, { params }) {
  try {
    await dbConnect();

    // 🔹 Get token & verify
    const token = getTokenFromHeader(req);
    if (!token) return new Response("Unauthorized", { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded) return new Response("Unauthorized", { status: 401 });

    const taskId = params.id;   // ✅ will now be available
    const data = await req.json();

    // 🔹 Find parent task
    const task = await Task.findById(taskId);
    if (!task) return new Response("Task not found", { status: 404 });
    if (task.company.toString() !== decoded.companyId)
      return new Response("Forbidden", { status: 403 });

    // 🔹 Create subtask
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

    // 🔹 Link subtask to parent task
    task.subTasks.push(subtask._id);
    await task.save();

    return new Response(JSON.stringify(subtask), { status: 201 });
  } catch (err) {
    console.error("❌ Error creating subtask:", err);
    return new Response("Error creating subtask", { status: 500 });
  }
}



export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized - no token" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: "Unauthorized - invalid token" }, { status: 401 });
    }

    const taskId = params.id;

    const subtasks = await SubTask.find({
      taskId,
      company: decoded.companyId,
    }).populate("assignees", "name email");

    return NextResponse.json(subtasks, { status: 200 });
  } catch (err) {
    console.error("Error fetching subtasks:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
