import dbConnect from "@/lib/db";
import AccountHead from "@/models/AccountHead";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    return { user };
  } catch (err) {
    return { error: "Authentication failed", status: 401 };
  }
}

/* ✅ PUT - Update account head */
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = params;
    const { accountHeadCode, accountHeadDescription, status: headStatus } = await req.json();

    const updatedHead = await AccountHead.findByIdAndUpdate(
      id,
      { accountHeadCode, accountHeadDescription, status: headStatus },
      { new: true }
    );

    if (!updatedHead) {
      return NextResponse.json({ success: false, message: "Account head not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedHead }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* ✅ DELETE - Remove account head */
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = params;
    const deletedHead = await AccountHead.findByIdAndDelete(id);

    if (!deletedHead) {
      return NextResponse.json({ success: false, message: "Account head not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
