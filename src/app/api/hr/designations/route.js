import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Designation from "@/models/hr/Designation";
import { withAuth, hasRole } from "@/lib/rbac";

/* ================= GET Designations ================= */
export async function GET(req) {
  try {
    await connectDB();

    const auth = await withAuth(req);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;

    const data = await Designation.find({
      companyId: user.companyId,
    }).sort({ title: 1 });

    return NextResponse.json({ data });

  } catch (error) {
    console.error("GET Designations Error:", error.message);

    return NextResponse.json(
      { error: "Failed to fetch designations" },
      { status: 500 }
    );
  }
}

/* ================= CREATE Designation ================= */
export async function POST(req) {
  try {
    await connectDB();

    const auth = await withAuth(req);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;

    // ✅ Only Admin / HR / Manager can create designation
    if (!hasRole(user, ["Admin", "HR", "Manager"])) {
      return NextResponse.json(
        { error: "You do not have permission" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const data = await Designation.create({
      companyId: user.companyId,
      ...body,
    });

    return NextResponse.json({ data });

  } catch (error) {
    console.error("POST Designation Error:", error.message);

    return NextResponse.json(
      { error: "Failed to create designation" },
      { status: 500 }
    );
  }
}
