import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Attendance from "@/models/hr/Attendance";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ IST-safe date — prevents UTC/IST mismatch at midnight
function getTodayDate() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().split("T")[0]; // "YYYY-MM-DD"
}

/* =========================
   GET → Today Attendance
========================= */
export async function GET(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));
    if (!user || !user.employeeId) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const today = getTodayDate();

    const attendance = await Attendance.findOne({
      employeeId: user.employeeId,
      date: today,
    });

    return NextResponse.json({ success: true, data: attendance || null });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/* =========================
   POST → Punch In / Out
========================= */
export async function POST(req) {
  try {
    await connectDB();

    const user = verifyJWT(getTokenFromHeader(req));
    if (!user || !user.employeeId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { type, latitude, longitude } = await req.json();

    if (!type || !["in", "out"].includes(type)) {
      return NextResponse.json(
        { message: "Invalid type. Must be 'in' or 'out'" },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = getTodayDate();
    const time = now.toLocaleTimeString("en-IN", { hour12: true });

    // ✅ Schema mein timestamp: Number hai
    // Pehle new Date() (Date object) pass kar rahe the — Mongoose Number field
    // mein Date object ko NaN bana deta hai, isliye hours = NaN aur save fail hota tha
    const timestamp = Date.now(); // Number e.g. 1712345678000

    let attendance = await Attendance.findOne({
      employeeId: user.employeeId,
      date: today,
    });

    // 🟢 Punch In
    if (type === "in") {
      if (attendance?.punchIn?.time) {
        return NextResponse.json(
          { message: "Already punched in today" },
          { status: 400 }
        );
      }

      attendance = await Attendance.create({
        companyId: user.companyId,
        employeeId: user.employeeId,
        date: today,
        punchIn: {
          time,       // "09:30:00 AM"
          timestamp,  // ✅ Number — schema se match
          latitude,
          longitude,
        },
      });

      return NextResponse.json(
        { message: "Punch In Success", data: attendance },
        { status: 201 }
      );
    }

    // 🔴 Punch Out
    if (type === "out") {
      if (!attendance || !attendance.punchIn?.time) {
        return NextResponse.json(
          { message: "Cannot punch out without punching in first" },
          { status: 400 }
        );
      }

      if (attendance.punchOut?.time) {
        return NextResponse.json(
          { message: "Already punched out today" },
          { status: 400 }
        );
      }

      // ✅ punchIn.timestamp ab Number hai — seedha subtract karo, no .getTime() needed
      const punchInMs = attendance.punchIn.timestamp || 0;
      const hours = punchInMs ? (timestamp - punchInMs) / (1000 * 60 * 60) : 0;

      // ✅ Sirf valid enum values use karo: "Present" | "Half Day" | "Absent" | "Geo-Violation"
      // Pehle "Short Day" use kar rahe the — yeh schema enum mein nahi tha!
      // Mongoose runValidators: true ke saath yeh error deta tha aur punch out fail hota tha
      const status = hours >= 4 ? "Present" : "Half Day";

      const updated = await Attendance.findOneAndUpdate(
        { _id: attendance._id },
        {
          $set: {
            "punchOut.time": time,
            "punchOut.timestamp": timestamp, // ✅ Number — schema se match
            "punchOut.latitude": latitude,
            "punchOut.longitude": longitude,
            totalHours: Number(hours.toFixed(2)),
            status,
          },
        },
        { new: true, runValidators: true }
      );

      return NextResponse.json(
        { message: "Punch Out Success", data: updated },
        { status: 200 }
      );
    }

  } catch (err) {
    console.error("Attendance POST error:", err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Attendance from "@/models/hr/Attendance";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// /* =========================
//    GET → Today Attendance
// ========================= */
// export async function GET(req) {
//   try {
//     await connectDB();

//     const user = verifyJWT(getTokenFromHeader(req));

//     if (!user || !user.employeeId) {
//       return NextResponse.json({ success: false }, { status: 401 });
//     }

//     const today = new Date().toISOString().split("T")[0];

//     const attendance = await Attendance.findOne({
//       employeeId: user.employeeId,
//       date: today,
//     });

//     return NextResponse.json({
//       success: true,
//       data: attendance,
//     });

//   } catch (err) {
//     return NextResponse.json({ success: false, message: err.message });
//   }
// }

// /* =========================
//    POST → Punch In / Out
// ========================= */
// export async function POST(req) {
//   try {
//     await connectDB();

//     const user = verifyJWT(getTokenFromHeader(req));

//     if (!user || !user.employeeId) {
//       return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
//     }

//     const { latitude, longitude } = await req.json();

//     const now = new Date();
//     const today = now.toISOString().split("T")[0];

//     const time = now.toLocaleTimeString();
//     const timestamp = Date.now();

//     let attendance = await Attendance.findOne({
//       employeeId: user.employeeId,
//       date: today,
//     });

//     // 🟢 Punch In
//     if (!attendance) {
//       attendance = await Attendance.create({
//         companyId: user.companyId,
//         employeeId: user.employeeId,
//         date: today,
//         punchIn: {
//           time,
//           timestamp,
//           latitude,
//           longitude,
//         },
//       });

//       return NextResponse.json({
//         message: "Punch In Success",
//         data: attendance,
//       });
//     }

//     // 🔴 Punch Out
//     if (!attendance.punchOut) {
//       attendance.punchOut = {
//         time,
//         timestamp,
//         latitude,
//         longitude,
//       };

//       const hours =
//         (timestamp - attendance.punchIn.timestamp) /
//         (1000 * 60 * 60);

//       attendance.totalHours = Number(hours.toFixed(2));

//       attendance.status = hours < 4 ? "Half Day" : "Present";

//       await attendance.save();

//       return NextResponse.json({
//         message: "Punch Out Success",
//         data: attendance,
//       });
//     }

//     return NextResponse.json({ message: "Already Done" });

//   } catch (err) {
//     return NextResponse.json({ message: err.message }, { status: 500 });
//   }
// }