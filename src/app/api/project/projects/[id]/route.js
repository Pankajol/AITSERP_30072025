import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import Task from "@/models/project/TaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// preload related models (must be imported for population to work)
import "@/models/CompanyUser";
import "@/models/project/WorkspaceModel";
import "@/models/CustomerModel";
import "@/models/SalesOrder";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // ✅ Check token
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = verifyJWT(token);
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 403 });
    }

    // ✅ Find project
    const project = await Project.findOne({
      _id: params.id,
      company: decoded.companyId,
    })
      .populate("owner", "name email")
      .populate("workspace", "name")
      .populate("members", "name email")
      .populate("customer", "customerName")
      .populate("salesOrder", "documentNumberOrder")
      .lean();

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // ✅ Get tasks for project
    const tasks = await Task.find({
      project: params.id,
      company: decoded.companyId,
    })
      .populate("assignees", "name email")
      .lean();

    // ✅ Transform tasks for frontend (ISO dates + progress)
    const formattedTasks = tasks.map((t) => ({
      ...t,
      // start: t.startDate ? t.startDate.toISOString() : null,
      // end: t.endDate ? t.endDate.toISOString() : null,
      projectedStartDate: t.projectedStartDate
        ? t.projectedStartDate.toISOString()
        : null,
      projectedEndDate: t.projectedEndDate
        ? t.projectedEndDate.toISOString()
        : null,
      progress: t.progress ?? 0, // 🚗 car uses this
    }));

    console.log("formattedTasks", formattedTasks);

    return NextResponse.json(
      {
        ...project,
        tasks: formattedTasks,
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error("❌ Error fetching project:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


// ================= PUT: update project =================
export async function PUT(req, { params }) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    let body = await req.json();

    // ✅ Fix react-select objects (convert to ObjectId strings)
    if (body.customer && body.customer.value) {
      body.customer = body.customer.value;
    }
    if (body.salesOrder && body.salesOrder.value) {
      body.salesOrder = body.salesOrder.value;
    }
    if (Array.isArray(body.members)) {
      body.members = body.members.map(m => (m.value ? m.value : m));
    }

    const updated = await Project.findOneAndUpdate(
      { _id: params.id, company: decoded.companyId },
      body,
      { new: true }
    )
      .populate("owner", "name email")
      .populate("workspace", "name")
      .populate("members", "name email")
      .populate("customer", "customerName")
      .populate("salesOrder", "documentNumberOrder");

    if (!updated) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("❌ Error updating project:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// ================= DELETE: remove project =================
export async function DELETE(req, { params }) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);

    console.log("🟢 DELETE params:", params); // should log { id: "68b81d..." }

    const deleted = await Project.findOneAndDelete({
      _id: params.id,
      company: decoded.companyId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting project:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}



// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Project from "@/models/project/ProjectModel";
// import Task from "@/models/project/TaskModel"; 
// import User from "@/models/CompanyUser"; 
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req, { params }) {
//   try {
//     await connectDB();

//     // 🔒 Auth check
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);

//     // ✅ Fetch project
//     const project = await Project.findOne({
//       _id: params.id,
//       company: decoded.companyId,
//     });

//     if (!project) {
//       return NextResponse.json({ error: "Project not found" }, { status: 404 });
//     }

//     // ✅ Fetch tasks (linked by project)
//     const tasks = await Task.find({
//       project: params.id,
//       company: decoded.companyId,
//     })
//       .populate("assignees", "name email") // show assigned user names
//       .lean();

//     // ✅ Return full response
//     console.log("Data is here",tasks)
//     return NextResponse.json({
//       ...project.toObject(),
//       tasks,
//     });
//   } catch (err) {
//     console.error("❌ Error fetching project:", err);
//     return NextResponse.json(
//       { error: "Internal Server Error", details: err.message },
//       { status: 500 }
//     );
//   }
// }


// export async function PUT(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const body = await req.json();
//     const updated = await Project.findOneAndUpdate(
//       { _id: params.id, company: decoded.companyId },
//       body,
//       { new: true }
//     );

//     if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
//     return NextResponse.json(updated);
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }

// export async function DELETE(req, { params }) {
//   try {
//     await connectDB();
//     const token = getTokenFromHeader(req);
//     const decoded = verifyJWT(token);

//     const deleted = await Project.findOneAndDelete({ _id: params.id, company: decoded.companyId });
//     if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

//     return NextResponse.json({ message: "Deleted successfully" });
//   } catch (err) {
//     return NextResponse.json({ error: err.message }, { status: 400 });
//   }
// }
