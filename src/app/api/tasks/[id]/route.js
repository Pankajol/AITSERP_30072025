import { NextResponse } from "next/server";

import connectDB from "@/lib/db";
import Task from "@/models/TaskModel";
// import "@/models/project/ProjectModel";  // ✅ just import
import "@/models/CompanyUser";           // ✅ just import
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const task = await Task.findOne({ _id: params.id, company: decoded.companyId });
    if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json(task);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}


export async function PUT(req, { params }) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const body = await req.json();

    // Base query: company + task id
    let query = { _id: params.id, company: decoded.companyId };

    // Safe check for employee role
    if (decoded?.roles?.includes("Employee")) {
      query.assignees = decoded.id;
    }

    const updated = await Task.findOneAndUpdate(query, body, { new: true });

    if (!updated) {
      return NextResponse.json(
        { error: "Not authorized or task not found" },
        { status: 403 }
      );
    }

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error("PUT /api/tasks/[id] error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const deleted = await Task.findOneAndDelete({ _id: params.id, company: decoded.companyId });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ message: "Deleted successfully" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
