import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/project/TaskModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    console.log("Decoded:", decoded);

    const tasks = await Task.find({ company: decoded.companyId })
    .populate("project", "name")        // get project name
    .populate("assignees", "name email"); // get user details
    console.log("Tasks Found:", tasks);

    return NextResponse.json(tasks, { status: 200 });
  } catch (err) {
    console.error("Error fetching tasks:", err);
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}


export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();
    const task = new Task({ ...body, company: decoded.companyId });
    await task.save();

    // await task.save();

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
