import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Comment from "@/models/project/CommentModel";
import Task from "@/models/project/TaskModel";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// 🔹 Add comment to a task
export async function POST(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json();
    if (!body.text) return NextResponse.json({ error: "Comment text required" }, { status: 400 });

    // Ensure task exists
    const task = await Task.findOne({ _id: params.id, company: decoded.companyId });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    // Create comment
    const comment = await Comment.create({
      text: body.text,
      task: task._id,
      user: decoded.userId,
      company: decoded.companyId,
    });

    // Push comment reference into task.comments[]
    task.comments.push(comment._id);
    await task.save();

    // 🔔 Notify task assignees (except the commenter)
    if (task.assignees?.length > 0) {
      const notifications = task.assignees
        .filter((userId) => userId.toString() !== decoded.userId)
        .map((userId) => ({
          user: decoded.userId,          // commenter
          company: decoded.companyId,
          task: task._id,
          comment: comment._id,
          type: "comment-added",
          message: `New comment on task "${task.title}": "${body.text}"`,
          assignedTo: userId,
          read: false,
        }));

      await Notification.insertMany(notifications);
    }

    // Populate user info for response
    const populatedComment = await Comment.findById(comment._id).populate("user", "name email");

    return NextResponse.json(populatedComment, { status: 201 });
  } catch (err) {
    console.error("POST /comments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 🔹 Get all comments for a task
export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decoded = verifyJWT(token);

    const task = await Task.findOne({ _id: params.id, company: decoded.companyId })
      .populate({
        path: "comments",
        populate: { path: "user", select: "name email" }, // get user info
      });

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json(task.comments, { status: 200 });
  } catch (err) {
    console.error("GET /comments error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
















// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Comment from "@/models/project/CommentModel";
// import Task from "@/models/project/TaskModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

//     const body = await req.json();
//     if (!body.text) {
//       return NextResponse.json({ error: "Comment text required" }, { status: 400 });
//     }

//     // Ensure task exists
//     const task = await Task.findOne({ _id: params.id, company: decoded.companyId });
//     if (!task) {
//       return NextResponse.json({ error: "Task not found" }, { status: 404 });
//     }

//     // Create comment
//     const comment = await Comment.create({
//       text: body.text,
//       task: task._id,
//       user: decoded.userId,
//       company: decoded.companyId,
//     });

//     // Push comment reference into task.comments[]
//     task.comments.push(comment._id);
//     await task.save();

//     return NextResponse.json(comment, { status: 201 });
//   } catch (err) {
//     console.error("POST /comments error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }



// export async function GET(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);

//     const task = await Task.findOne({ _id: params.id, company: decoded.companyId })
//       .populate({
//         path: "comments",
//         populate: { path: "user", select: "name email" }, // get user info
//       });

//     if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

//     return NextResponse.json(task.comments, { status: 200 });
//   } catch (err) {
//     console.error("GET /comments error:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }


// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Comment from "@/models/project/CommentModel";
// import Task from "@/models/project/TaskModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ================== GET comments for a task ==================
// export async function GET(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const comments = await Comment.find({
//       task: params.id,
//       company: decoded.companyId,
//     }).populate("author", "name email");

//     return NextResponse.json(comments, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching comments:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // ================== POST new comment ==================
// export async function POST(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const { text } = await req.json();
//     if (!text) {
//       return NextResponse.json(
//         { error: "Text is required" },
//         { status: 400 }
//       );
//     }

//     // create comment
//     const newComment = await Comment.create({
//       task: params.id,
//       company: decoded.companyId,
//       author: decoded.userId,
//       text,
//     });

//     // push into Task
//     await Task.findByIdAndUpdate(params.id, {
//       $push: { comments: newComment._id },
//     });

//     const populated = await Comment.findById(newComment._id).populate(
//       "author",
//       "name email"
//     );

//     return NextResponse.json(populated, { status: 201 });
//   } catch (err) {
//     console.error("Error creating comment:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }
