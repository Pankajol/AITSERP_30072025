import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Project from "@/models/project/ProjectModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import "@/models/CompanyUser"
import "@/models/project/WorkspaceModel"

export async function GET(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const user = verifyJWT(token);

    const projects = await Project.find({  $or: [{ owner: user.id }, { members: user.id }] })
  .populate("owner", "name email")
  .populate("workspace", "name");
    return NextResponse.json(projects, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 401 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);

    const body = await req.json();

    const project = new Project({
      ...body,
      company: decoded.companyId,
      owner: decoded.id, // ✅ add logged-in user as owner
      members: [decoded.id], // optional: make owner also a member
    });

    await project.save();

    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

