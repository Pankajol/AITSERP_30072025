import dbConnect from "@/lib/db";
import BankHead from "@/models/BankHead";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    return { user };
  } catch (error) {
    return { error: "Authentication failed", status: 401 };
  }
}

// ✅ PUT (Update)
export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = params;
    const { accountCode, accountName, isActualBank, accountHead, status: headStatus } = await req.json();

    const updated = await BankHead.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { accountCode, accountName, isActualBank, accountHead, status: headStatus },
      { new: true }
    );

    if (!updated) return NextResponse.json({ success: false, message: "Bank head not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ DELETE
export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { id } = params;
    const deleted = await BankHead.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Bank head not found" }, { status: 404 });

    return NextResponse.json({ success: true, message: "Bank head deleted successfully" }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
