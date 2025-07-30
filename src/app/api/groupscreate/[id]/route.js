import dbConnect from "@/lib/db";
import Group from "@/models/groupModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/**
 * ✅ Validate JWT & Return User
 */
async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return { error: "Token missing", status: 401 };
  }

  try {
    const user = await verifyJWT(token);
    if (!user) {
      return { error: "Invalid token", status: 401 };
    }
    return { user };
  } catch (err) {
    console.error("Auth Error:", err.message);
    return { error: "Authentication failed", status: 401 };
  }
}

/* =========================================
   ✅ UPDATE GROUP (PUT)
========================================= */
export async function PUT(req, { params }) {
  await dbConnect();

  const { user, error, status } = await authenticate(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const { id } = params;
    const { name, description } = await req.json();

    if (!name || !description) {
      return NextResponse.json(
        { success: false, message: "Name and description are required" },
        { status: 400 }
      );
    }

    const updatedGroup = await Group.findOneAndUpdate(
      { _id: id, companyId: user.companyId }, // ✅ Ensures user can only update their company group
      { name, description },
      { new: true }
    );

    if (!updatedGroup) {
      return NextResponse.json(
        { success: false, message: "Group not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Group updated successfully", data: updatedGroup },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating group:", error.message);
    return NextResponse.json(
      { success: false, message: "Error updating group" },
      { status: 500 }
    );
  }
}

/* =========================================
   ✅ DELETE GROUP (DELETE)
========================================= */
export async function DELETE(req, { params }) {
  await dbConnect();

  const { user, error, status } = await authenticate(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const { id } = params;

    const deletedGroup = await Group.findOneAndDelete({
      _id: id,
      companyId: user.companyId, // ✅ Ensure user can only delete their company group
    });

    if (!deletedGroup) {
      return NextResponse.json(
        { success: false, message: "Group not found or not authorized" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Group deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting group:", error.message);
    return NextResponse.json(
      { success: false, message: "Error deleting group" },
      { status: 500 }
    );
  }
}
