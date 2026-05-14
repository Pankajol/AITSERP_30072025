import dbConnect from "@/lib/db";
import SubTask from "@/models/project/SubTaskModel";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

// 🔹 Get a single subtask by its ID
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id: taskId, subtaskId } = params;

    const subtask = await SubTask.findOne({
      _id: subtaskId,
      taskId,
      company: decoded.companyId,
    }).populate("assignees", "name email");

    if (!subtask) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

    return NextResponse.json(subtask, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching single subtask:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔹 Update subtask
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const { id: taskId, subtaskId } = params;
    const body = await req.json();

    // Fetch existing subtask to detect changes
    const existingSubtask = await SubTask.findOne({
      _id: subtaskId,
      taskId,
      company: decoded.companyId,
    });

    if (!existingSubtask) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }

    // Update subtask
    const updatedSubtask = await SubTask.findByIdAndUpdate(subtaskId, body, { new: true });

    // 🔔 Handle notifications for newly assigned users
    const oldAssignees = existingSubtask.assignees.map((id) => id.toString());
    const newAssignees = body.assignees || [];
    const addedAssignees = newAssignees.filter((id) => !oldAssignees.includes(id));

    if (addedAssignees.length > 0) {
      const notifications = addedAssignees.map((userId) => ({
        user: decoded.id, // creator/updater
        company: decoded.companyId,
        task: taskId,
        subTask: subtaskId,
        type: "subtask-assigned",
        message: `You have been assigned to subtask: "${updatedSubtask.title}"`,
        assignedTo: userId,
        read: false,
      }));
      await Notification.insertMany(notifications);
    }

    return NextResponse.json(updatedSubtask, { status: 200 });
  } catch (err) {
    console.error("❌ Error updating subtask:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// 🔹 Delete subtask
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
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
    console.error("❌ Error deleting subtask:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}




// import dbConnect from "@/lib/db";
// import SubTask from "@/models/project/SubTaskModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { NextResponse } from "next/server";

// // 🔹 Get a single subtask by its ID
// export async function GET(req, { params }) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     const decoded = verifyJWT(token);
//     if (!decoded) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const { id: taskId, subtaskId } = params;
//     console.log("🔎 Fetching subtask:", subtaskId, "for task:", taskId);

//     const subtask = await SubTask.findOne({
//       _id: subtaskId,
//       taskId,
//       company: decoded.companyId,
//     }).populate("assignees", "name email");

//     if (!subtask) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });

//     return NextResponse.json(subtask, { status: 200 });
//   } catch (err) {
//     console.error("❌ Error fetching single subtask:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


// export async function PUT(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const { id: taskId, subtaskId } = params;
//     const body = await req.json();

//     const subtask = await SubTask.findOneAndUpdate(
//       { _id: subtaskId, taskId, company: decoded.companyId },
//       body,
//       { new: true }
//     );

//     if (!subtask) {
//       return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
//     }

//     return NextResponse.json(subtask, { status: 200 });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }

// export async function DELETE(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const { id: taskId, subtaskId } = params;

//     const deleted = await SubTask.findOneAndDelete({
//       _id: subtaskId,
//       taskId,
//       company: decoded.companyId,
//     });

//     if (!deleted) {
//       return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
//     }

//     return NextResponse.json({ message: "Subtask deleted" }, { status: 200 });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }
