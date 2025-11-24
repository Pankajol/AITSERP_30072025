import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Employee from "@/models/hr/Employee";
import { withAuth, hasRole } from "@/lib/rbac";
import Department from "@/models/hr/Department";
import Designation from "@/models/hr/Designation";

/* ================= UPDATE EMPLOYEE ================= */
export async function PUT(req, context) {
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

    // ✅ Only Admin / HR / Manager can update employees
    if (!hasRole(user, ["Admin", "HR", "Manager"])) {
      return NextResponse.json(
        { error: "You do not have permission" },
        { status: 403 }
      );
    }

    // ✅ VERY IMPORTANT CHANGE
    const { id } = await context.params;

    const body = await req.json();

    const updated = await Employee.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updated });

  } catch (error) {
    console.error("UPDATE Employee Error:", error.message);

    return NextResponse.json(
      { error: "Failed to update employee" },
      { status: 500 }
    );
  }
}

/* ================= DELETE EMPLOYEE ================= */
export async function DELETE(req, context) {
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

    // ✅ Only Admin / HR
    if (!hasRole(user, ["Admin", "HR"])) {
      return NextResponse.json(
        { error: "You do not have permission" },
        { status: 403 }
      );
    }

    // ✅ VERY IMPORTANT CHANGE
    const { id } = await context.params;

    const deleted = await Employee.findOneAndDelete({
      _id: id,
      companyId: user.companyId,
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Employee deleted" });

  } catch (error) {
    console.error("DELETE Employee Error:", error.message);

    return NextResponse.json(
      { error: "Failed to delete employee" },
      { status: 500 }
    );
  }
}
