import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attendance from "@/models/hr/Attendance";
import { withAuth } from "@/lib/rbac";

export async function POST(req) {
  try {
    const auth = await withAuth(req);
    if (auth?.error) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const { user } = auth;
    const { date, latitude, longitude } = await req.json();

    if (!date || latitude == null || longitude == null) {
      return NextResponse.json(
        { success: false, error: "Date and location are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // ✅ Check if already exists
    let record = await Attendance.findOne({
      companyId: user.companyId,
      employeeId: user.id,
      date,
    });

    if (record?.punchIn?.timestamp) {
      return NextResponse.json(
        { success: false, error: "Already punched in today" },
        { status: 400 }
      );
    }

    const punchInTime = new Date();

    // ✅ Create if not exists
    if (!record) {
      record = new Attendance({
        companyId: user.companyId,
        employeeId: user.id,
        date
      });
    }

    // ✅ Set punch-in properly
    record.punchIn = {
      time: punchInTime.toLocaleTimeString(),
      timestamp: punchInTime.getTime(),
      latitude,
      longitude,
      withinGeofence: true
    };

    record.status = "Working";

    await record.save();

    return NextResponse.json({
      success: true,
      message: "Punch In successful",
      data: {
        time: record.punchIn.time,
        latitude: record.punchIn.latitude,
        longitude: record.punchIn.longitude,
        status: record.status
      }
    });

  } catch (err) {
    console.error("❌ PUNCH-IN ERROR:", err);

    return NextResponse.json(
      { success: false, error: "Punch in failed" },
      { status: 500 }
    );
  }
}
