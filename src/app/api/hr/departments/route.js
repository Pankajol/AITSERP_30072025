import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Department from "@/models/hr/Department";
import { withAuth, hasRole } from "@/lib/rbac";

/* ================= GET Departments ================= */
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

    const data = await Department.find({
      companyId: user.companyId
    }).sort({ name: 1 });

    return NextResponse.json({ data });

  } catch (error) {
    console.error("GET Departments Error:", error.message);

    return NextResponse.json(
      { error: "Failed to fetch departments" },
      { status: 500 }
    );
  }
}

/* ================= CREATE Department ================= */
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

    if (!hasRole(user, ["Admin", "HR", "Manager"])) {
      return NextResponse.json(
        { error: "You do not have permission" },
        { status: 403 }
      );
    }

    const body = await req.json();

    const data = await Department.create({
      companyId: user.companyId,
      ...body,
    });

    return NextResponse.json({ data });

  } catch (error) {
    console.error("POST Department Error:", error.message);

    return NextResponse.json(
      { error: "Failed to create department" },
      { status: 500 }
    );
  }
}
