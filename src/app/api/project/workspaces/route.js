import dbConnect from "@/lib/db";
import Workspace from "@/models/project/WorkspaceModel";
import "@/models/CompanyUser"
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ===================== GET all workspaces (for logged-in user) =====================
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);

    // fetch workspaces where user is owner or member
    const workspaces = await Workspace.find({
      $or: [{ owner: user.id }, { members: user.id }],
    }).populate("owner", "name email");

    return NextResponse.json(workspaces, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to fetch workspaces" }, { status: 500 });
  }
}

// ===================== POST create workspace =====================
export async function POST(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    const body = await req.json();

    const workspace = await Workspace.create({
      name: body.name,
      description: body.description,
      owner: user.id,
      members: [user.id], // owner is auto member
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to create workspace" }, { status: 500 });
  }
}
