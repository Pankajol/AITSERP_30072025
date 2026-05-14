import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attendance from "@/models/hr/Attendance";
import { withAuth } from "@/lib/rbac";

const PRESENT_HOURS = 8;
const HALF_DAY_HOURS = 4;

export async function POST(req) {
  try {
    const auth = await withAuth(req);
    if (auth.error) {
      return NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const { date, latitude, longitude } = await req.json();

    if (!date || latitude == null || longitude == null) {
      return NextResponse.json(
        { error: "Date and location are required" },
        { status: 400 }
      );
    }

    await connectDB();

    const record = await Attendance.findOne({
      companyId: user.companyId,
      employeeId: user.id,
      date,
    });

    if (!record || !record.punchIn?.timestamp) {
      return NextResponse.json(
        { error: "Please punch in first" },
        { status: 400 }
      );
    }

    if (record.punchOut?.timestamp) {
      return NextResponse.json(
        { error: "Already punched out" },
        { status: 400 }
      );
    }

    const punchOutTime = new Date();

    // ✅ PERFECT TIME DIFFERENCE LOGIC
    const totalHours =
      (punchOutTime.getTime() - record.punchIn.timestamp) / (1000 * 60 * 60);

    // Save punchOut
    record.punchOut = {
      time: punchOutTime.toLocaleTimeString(),
      timestamp: punchOutTime.getTime(),
      latitude,
      longitude,
      withinGeofence: true
    };

    record.totalHours = totalHours.toFixed(2);

    // ✅ Correct Status (NO BUG NOW)
    if (totalHours >= PRESENT_HOURS) {
      record.status = "Present";
    } else if (totalHours >= HALF_DAY_HOURS) {
      record.status = "Half Day";
    } else {
      record.status = "Absent";
    }

    await record.save();

    return NextResponse.json({
      success: true,
      message: "Punch out successful",
      data: {
        status: record.status,
        totalHours: record.totalHours,
        punchIn: record.punchIn.time,
        punchOut: record.punchOut.time
      }
    });

  } catch (err) {
    console.error("❌ PUNCH-OUT ERROR:", err);

    return NextResponse.json(
      { error: "Punch out failed" },
      { status: 500 }
    );
  }
}
