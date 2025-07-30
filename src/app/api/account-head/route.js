import dbConnect from "@/lib/db";
import AccountHead from "@/models/AccountHead";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Auth helper
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

/**
 * ✅ GET: Fetch all account heads
 */
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const accountHeads = await AccountHead.find({ companyId: user.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: accountHeads }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * ✅ POST: Create a new account head
 */
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { accountHeadCode, accountHeadDescription, status } = await req.json();

    if (!accountHeadCode || !accountHeadDescription || !status) {
      return NextResponse.json({ success: false, message: "All fields are required" }, { status: 400 });
    }

    const newAccountHead = new AccountHead({
      accountHeadCode,
      accountHeadDescription,
      status,
      companyId: user.companyId, // ✅ multi-tenant
    });

    await newAccountHead.save();
    return NextResponse.json({ success: true, message: "Account head created successfully", data: newAccountHead }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
