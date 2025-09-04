import dbConnect from "@/lib/db";
import Workspace from "@/models/project/WorkspaceModel";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ===================== GET single workspace =====================
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    const workspace = await Workspace.findById(params.id).populate("owner members", "name email");

    if (!workspace) return NextResponse.json({ message: "Not found" }, { status: 404 });

    // check if user is member or owner
    if (
      workspace.owner._id.toString() !== user.id &&
      !workspace.members.some((m) => m._id.toString() === user.id)
    ) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(workspace, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to fetch workspace" }, { status: 500 });
  }
}

// ===================== PUT update workspace =====================
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    const body = await req.json();

    // only owner can update
    const workspace = await Workspace.findById(params.id);
    if (!workspace) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (workspace.owner.toString() !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    workspace.name = body.name || workspace.name;
    workspace.description = body.description || workspace.description;

    await workspace.save();

    return NextResponse.json(workspace, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to update workspace" }, { status: 500 });
  }
}

// ===================== DELETE workspace =====================
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    const workspace = await Workspace.findById(params.id);

    if (!workspace) return NextResponse.json({ message: "Not found" }, { status: 404 });

    if (workspace.owner.toString() !== user.id) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    await Workspace.findByIdAndDelete(params.id);
    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Failed to delete workspace" }, { status: 500 });
  }
}
