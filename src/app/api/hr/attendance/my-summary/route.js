import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attendance from "@/models/hr/Attendance";
import { withAuth } from "@/lib/rbac";

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

    // Optional: filter by month
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // format: 2025-11

    const query = {
      companyId: user.companyId,
      employeeId: user.id
    };

    if (month) {
      query.date = { $regex: `^${month}` }; // example: 2025-11
    }

    const data = await Attendance.find(query);

    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let working = 0;
    let totalHours = 0;

    data.forEach((a) => {
      if (a.status === "Present") present++;
      if (a.status === "Absent") absent++;
      if (a.status === "Half Day") halfDay++;
      if (a.status === "Working") working++;

      if (a.totalHours) {
        totalHours += parseFloat(a.totalHours);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        present,
        halfDay,
        absent,
        working,
        totalDays: data.length,
        totalHours: totalHours.toFixed(2)
      }
    });

  } catch (err) {
    console.error("SUMMARY ERROR:", err);

    return NextResponse.json(
      { success: false, error: "Failed to load summary" },
      { status: 500 }
    );
  }
}
