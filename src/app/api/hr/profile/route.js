import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import { withAuth } from "@/lib/rbac";
import Employee from "@/models/hr/Employee";
import User from "@/models/CompanyUser";

export async function GET(req) {
  try {
    const auth = await withAuth(req);

    if (auth?.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status || 401 }
      );
    }

    const { user } = auth;

    await connectDB();

    // If employee account
    let profile = await Employee.findOne({
      _id: user.id,
      companyId: user.companyId,
    })
      .populate("department", "name")
      .populate("designation", "title");

    // If not found in Employee (admin/company account)
    if (!profile) {
      profile = await User.findOne({ _id: user.id }).select(
        "name email phone roles"
      );
    }

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      employee: {
        id: profile._id,
        name: profile.fullName || profile.name,
        email: profile.email,
        department: profile.department?.name || "N/A",
        designation: profile.designation?.title || "N/A",
        roles: user.roles || [],
      },
    });
  } catch (err) {
    console.error("PROFILE ERROR:", err);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
