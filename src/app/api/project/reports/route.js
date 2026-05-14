import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import Task from "@/models/project/TaskModel";
import User from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const companyId = decoded.company;

    // Project stats
    const totalProjects = await Project.countDocuments({ company: companyId });
    const completedProjects = await Project.countDocuments({
      company: companyId,
      status: "Completed",
    });

    // Task stats
    const totalTasks = await Task.countDocuments({ company: companyId });
    const overdueTasks = await Task.countDocuments({
      company: companyId,
      dueDate: { $lt: new Date() },
      status: { $ne: "Completed" },
    });

    // User stats
    const totalUsers = await User.countDocuments({ company: companyId });

    const data = {
      projects: { total: totalProjects, completed: completedProjects },
      tasks: { total: totalTasks, overdue: overdueTasks },
      users: { total: totalUsers },
    };

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}
