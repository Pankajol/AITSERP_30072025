import dbConnect from "@/lib/db";
import Task from "@/models/project/TaskModel";
import SubTask from "@/models/project/SubTaskModel";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

// 🔹 Create a subtask under a task
export async function POST(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const taskId = params.id;
    const data = await req.json();

    // Fetch parent task
    const task = await Task.findById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    if (task.company.toString() !== decoded.companyId)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Create subtask
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

    // Link subtask to parent task
    task.subTasks.push(subtask._id);
    await task.save();

    // 🔔 Create notifications for assignees
    if (subtask.assignees?.length > 0) {
      const notifications = subtask.assignees.map((userId) => ({
        user: decoded.id, // creator
        company: decoded.companyId,
        task: task._id,
        subTask: subtask._id,
        type: "subtask-assigned",
        message: `You have been assigned a new subtask: "${subtask.title}"`,
        assignedTo: userId,
        read: false,
      }));
      await Notification.insertMany(notifications);
    }

    // Populate assignees for response
    const populatedSubtask = await SubTask.findById(subtask._id).populate("assignees", "name email");

    return NextResponse.json(populatedSubtask, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating subtask:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
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

    // Role-based query: Employees only see assigned subtasks
    const query = { taskId, company: decoded.companyId };
    if (decoded.roles?.includes("Employee")) {
      query.assignees = decoded.id;
    }

    const subtasks = await SubTask.find(query).populate("assignees", "name email").sort({ createdAt: -1 });

    return NextResponse.json(subtasks, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching subtasks:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}




// import dbConnect from "@/lib/db";
// import Task from "@/models/project/TaskModel";
// import SubTask from "@/models/project/SubTaskModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { NextResponse } from "next/server";

// // 🔹 Create subtask under a task
// export async function POST(req, { params }) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     const decoded = verifyJWT(token);
//     if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const taskId = params.id;
//     const data = await req.json();

//     const task = await Task.findById(taskId);
//     if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
//     if (task.company.toString() !== decoded.companyId)
//       return NextResponse.json({ error: "Forbidden" }, { status: 403 });

//     const subtask = await SubTask.create({
//       taskId: task._id,
//       company: task.company,
//       title: data.title,
//       description: data.description,
//       assignees: data.assignees,
//       projectedStartDate: data.projectedStartDate,
//       projectedEndDate: data.projectedEndDate,
//       startDate: data.startDate,
//       endDate: data.endDate,
//       dueDate: data.dueDate,
//       priority: data.priority,
//       progress: data.progress,
//       status: data.status,
//     });

//     task.subTasks.push(subtask._id);
//     await task.save();

//     return NextResponse.json(subtask, { status: 201 });
//   } catch (err) {
//     console.error("❌ Error creating subtask:", err);
//     return NextResponse.json({ error: "Error creating subtask" }, { status: 500 });
//   }
// }

// // 🔹 Get all subtasks of a task
// export async function GET(req, { params }) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     const decoded = verifyJWT(token);
//     if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const taskId = params.id;
//     console.log("🔎 Fetching subtasks for TaskId:", taskId, "Company:", decoded.companyId);

//     const subtasks = await SubTask.find({
//       taskId,
//       company: decoded.companyId,
//     }).populate("assignees", "name email");

//     return NextResponse.json(subtasks, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching subtasks:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }
