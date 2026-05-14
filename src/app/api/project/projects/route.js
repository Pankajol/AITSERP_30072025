import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import Notification from "@/models/project/NotificationModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import "@/models/CompanyUser";
import "@/models/project/WorkspaceModel";
import "@/models/CustomerModel";
import "@/models/SalesOrder";

// ✅ GET: fetch projects (owner or member)
export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("No token provided");

    const user = verifyJWT(token);

    const projects = await Project.find({
      $or: [{ owner: user.id }, { members: user.id }],
    })
      .populate("owner", "name email")
      .populate("workspace", "name")
      .populate("members", "name email")
      .populate("customer", "customerName")
      .populate("salesOrder", "documentNumberOrder");

    return NextResponse.json(projects, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

// ✅ POST: create new project & send notifications
export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    if (!token) throw new Error("No token provided");

    const decoded = verifyJWT(token);
    const body = await req.json();

    // Create project
    const project = new Project({
      ...body,
      company: decoded.companyId,
      owner: decoded.id,
      members: body.members?.length ? body.members : [decoded.id],
    });

    await project.save();

    // 🔔 Notifications
    // Admin notification
    await Notification.create({
      user: decoded.id,
      company: decoded.companyId,
      type: "project_created",
      message: `Project "${project.name}" created by ${decoded.name || "a user"}`,
      project: project._id,
      role: "admin",
    });

    // Member notifications
    for (const memberId of project.members) {
      await Notification.create({
        user: decoded.id,
        company: decoded.companyId,
        type: "project_assigned",
        message: `You have been assigned to project "${project.name}"`,
        project: project._id,
        role: "user",
        assignedTo: memberId,
      });
    }

    // Repopulate before sending response
    const populatedProject = await Project.findById(project._id)
      .populate("owner", "name email")
      .populate("workspace", "name")
      .populate("members", "name email")
      .populate("customer", "customerName")
      .populate("salesOrder", "documentNumberOrder");

    return NextResponse.json(populatedProject, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}



// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Project from "@/models/project/ProjectModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import "@/models/CompanyUser"
// import "@/models/project/WorkspaceModel"

// export async function GET(req) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const user = verifyJWT(token);

//     const projects = await Project.find({  $or: [{ owner: user.id }, { members: user.id }] })
//   .populate("owner", "name email")
//   .populate("workspace", "name");
//     return NextResponse.json(projects, { status: 200 });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 401 });
//   }
// }

// export async function POST(req) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const body = await req.json();

//     const project = new Project({
//       ...body,

//       company: decoded.companyId,
//       owner: decoded.id, // ✅ add logged-in user as owner
//        // optional: make owner also a member
//     });

//     await project.save();

  
//     return NextResponse.json(project, { status: 201 });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }

