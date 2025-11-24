import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attendance from "@/models/hr/Attendance";
import { withAuth, hasRole } from "@/lib/rbac";

/* ========================= GET ATTENDANCE ========================= */
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

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    if (!date) {
      return NextResponse.json(
        { success: false, error: "Date is required" },
        { status: 400 }
      );
    }

    let query = { companyId: user.companyId, date };

    // Only Admin/HR/Manager can see all employees
    if (!hasRole(user, ["Admin", "HR", "Manager"])) {
      query.employeeId = user.id;
    }

    const records = await Attendance.find(query)
      .populate({
        path: "employeeId",
        select: "fullName employeeCode",
      })
      .sort({ createdAt: -1 });

    const data = records.map((r) => ({
      _id: r._id,
      date: r.date,
      status: r.status || "Absent",
      totalHours: r.totalHours || 0,
      punchIn: r.punchIn || null,
      punchOut: r.punchOut || null,
      employee: {
        _id: r.employeeId?._id,
        fullName: r.employeeId?.fullName || "You",
        employeeCode: r.employeeId?.employeeCode || "",
      },
    }));

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    });
  } catch (err) {
    console.error("ATTENDANCE GET ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

/* ========================= POST ATTENDANCE =========================
   BODY:
   {
     "date": "2025-11-22",
     "latitude": 19.123,
     "longitude": 72.123,
     "action": "punch-in" | "punch-out"
   }
==================================================================== */

export async function POST(req) {
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

    const { date, latitude, longitude, action } = await req.json();

    if (!date || !action) {
      return NextResponse.json(
        { success: false, error: "Date and action are required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const time = now.toLocaleTimeString();

    let attendance = await Attendance.findOne({
      companyId: user.companyId,
      employeeId: user.id,
      date,
    });

    /* ------------------ PUNCH IN ------------------ */
    if (action === "punch-in") {
      if (attendance?.punchIn?.time) {
        return NextResponse.json(
          { success: false, error: "Already punched in today" },
          { status: 400 }
        );
      }

      if (!attendance) {
        attendance = new Attendance({
          companyId: user.companyId,
          employeeId: user.id,
          date,
        });
      }

      attendance.punchIn = {
        time,
        latitude,
        longitude,
        withinGeofence: true,
      };

      attendance.status = "Present";
      await attendance.save();

      return NextResponse.json({
        success: true,
        message: "Punch In successful",
        data: attendance,
      });
    }

    /* ------------------ PUNCH OUT ------------------ */
    if (action === "punch-out") {
      if (!attendance || !attendance.punchIn?.time) {
        return NextResponse.json(
          { success: false, error: "Punch in first" },
          { status: 400 }
        );
      }

      if (attendance.punchOut?.time) {
        return NextResponse.json(
          { success: false, error: "Already punched out today" },
          { status: 400 }
        );
      }

      attendance.punchOut = {
        time,
        latitude,
        longitude,
        withinGeofence: true,
      };

      // Calculate hours
      const inTime = new Date(`${date} ${attendance.punchIn.time}`);
      const outTime = new Date();

      const diff = (outTime - inTime) / (1000 * 60 * 60);
      const hours = diff.toFixed(2);

      attendance.totalHours = hours;
      attendance.status = diff < 4 ? "Half Day" : "Present";

      await attendance.save();

      return NextResponse.json({
        success: true,
        message: "Punch Out successful",
        data: attendance,
      });
    }

    return NextResponse.json(
      { success: false, error: "Invalid action type" },
      { status: 400 }
    );
  } catch (err) {
    console.error("ATTENDANCE POST ERROR:", err);
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
