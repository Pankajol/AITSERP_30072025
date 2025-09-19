import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/TaskModel";
import Notification from "@/models/project/NotificationModel";
// import "@/models/project/ProjectModel";
import "@/models/CompanyUser";
// import "@/models/project/SubTaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const task = new Task({ ...body, company: decoded.companyId });
    await task.save();

    console.log("✅ Task created:", task);

    // ✅ Create notifications for each assignee
    if (task.assignees?.length > 0) {
      const notifications = task.assignees.map((userId) => ({
        user: userId,
        task: task._id,
        type: "task-assigned",
 
        message: `You have been assigned a new task: "${task.title}"`,
        read: false,
      }));

      const saved = await Notification.insertMany(notifications);
      console.log("✅ Notifications created:", saved.length);
    } else {
      console.log("⚠️ No assignees found, no notifications created.");
    }

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    console.error("❌ Task creation error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}



export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    console.log("Decoded:", decoded);

    let query = { company: decoded.companyId };

    // ✅ If employee, restrict to tasks assigned to them
    if (decoded.roles?.includes("Employee")) {
      query.assignees = decoded.id;
    }

    const tasks = await Task.find(query)
     
      .populate("assignees", "name email")
   
    console.log(tasks);
    return NextResponse.json(tasks, { status: 200 });
   
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}


// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Task from "@/models/project/TaskModel";
// import "@/models/project/ProjectModel";  // ✅ just import, don't assign
// import "@/models/CompanyUser"; // ✅ just import, don't assign
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     console.log("Decoded:", decoded);

//     const tasks = await Task.find({ company: decoded.companyId })
//       .populate("project", "name")        // get project name
//       .populate("assignees", "name email"); // get user details
      

//     return NextResponse.json(tasks, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching tasks:", err);
//     return NextResponse.json({ error: err.message }, { status: 401 });
//   }
// }

// export async function POST(req) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const body = await req.json();
//     const task = new Task({ ...body, company: decoded.companyId });
//     await task.save();

//     return NextResponse.json(task, { status: 201 });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }


