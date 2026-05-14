import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import Task from "@/models/project/TaskModel";
import User from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const companyId = decoded.company;
    const { type } = params;

    let data = {};

    if (type === "projects") {
      data = await Project.find({ company: companyId }).select("name status startDate endDate");
    } else if (type === "tasks") {
      data = await Task.find({ company: companyId })
        .select("title status dueDate assignedTo")
        .populate("assignedTo", "name email");
    } else if (type === "users") {
      data = await User.find({ company: companyId }).select("name email role");
    } else {
      return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
