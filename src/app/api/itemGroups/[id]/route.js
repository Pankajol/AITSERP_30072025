import dbConnect from "@/lib/db";
import ItemGroup from "@/models/ItemGroupModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    return { user };
  } catch {
    return { error: "Authentication failed", status: 401 };
  }
}

export async function PUT(req, { params }) {
  await dbConnect();

  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = params;
  const { name, code } = await req.json();

  const updated = await ItemGroup.findOneAndUpdate(
    { _id: id, companyId: user.companyId },
    { name, code },
    { new: true }
  );

  if (!updated) return NextResponse.json({ success: false, message: "Item Group not found" }, { status: 404 });

  return NextResponse.json({ success: true, data: updated, message: "Item Group updated" }, { status: 200 });
}

export async function DELETE(req, { params }) {
  await dbConnect();

  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const { id } = params;

  const deleted = await ItemGroup.findOneAndDelete({ _id: id, companyId: user.companyId });
  if (!deleted) return NextResponse.json({ success: false, message: "Item Group not found" }, { status: 404 });

  return NextResponse.json({ success: true, message: "Item Group deleted" }, { status: 200 });
}
