import { NextResponse } from "next/server";
import connectDB from "@/lib/db";

import Leave from "@/models/hr/Leave";
import LeaveBalance from "@/models/hr/LeaveBalance";
import Employee from "@/models/hr/Employee";

import { verifyJWT, getTokenFromHeader } from "@/lib/auth";

/* =====================================================
   GET → All company leaves
   Allowed:
   - Company
   - Admin / HR / Manager / Employee
===================================================== */
export async function GET(req) {
  try {
    await connectDB();

    /* ---------- AUTH ---------- */
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyJWT(token);

    if (!user?.companyId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    /* ---------- FILTERS ---------- */
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const query = {
      companyId: user.companyId,
    };

    if (status) query.status = status;

    if (from || to) {
      query.$and = [];
      if (from) query.$and.push({ toDate: { $gte: new Date(from) } });
      if (to) query.$and.push({ fromDate: { $lte: new Date(to) } });
    }

    const leaves = await Leave.find(query)
      .populate("employeeId", "fullName email phone")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ data: leaves }, { status: 200 });
  } catch (error) {
    console.error("GET /api/hr/leaves error:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaves" },
      { status: 500 }
    );
  }
}

/* =====================================================
   POST → Apply leave
   Allowed:
   - Employee
   - Admin / HR (acting as employee)
===================================================== */
export async function POST(req) {
  try {
    await connectDB();

    /* ---------- AUTH ---------- */
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyJWT(token);

    console.log("USER FROM TOKEN:", user);

    if (!user?.companyId) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // ❌ Company itself cannot apply leave
    if (user.type === "company") {
      return NextResponse.json(
        { error: "Company cannot apply leave" },
        { status: 403 }
      );
    }

    /* ---------- BODY ---------- */
    const {
      fromDate,
      toDate,
      leaveType,
      reason,
      attachmentUrl,
    } = await req.json();

    if (!fromDate || !toDate || !leaveType || !reason) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    if (new Date(fromDate) > new Date(toDate)) {
      return NextResponse.json(
        { error: "From date cannot be greater than To date" },
        { status: 400 }
      );
    }

    /* ---------- RESOLVE EMPLOYEE ---------- */
    let employeeId = user.employeeId;

    if (!employeeId) {
      const emp = await Employee.findOne({
        companyId: user.companyId,
        email: user.email,
      }).select("_id");

      if (!emp) {
        return NextResponse.json(
          { error: "Employee profile not linked" },
          { status: 400 }
        );
      }

      employeeId = emp._id;
    }

    /* ---------- OVERLAP CHECK ---------- */
    const existing = await Leave.findOne({
      companyId: user.companyId,
      employeeId,
      $and: [
        { fromDate: { $lte: new Date(toDate) } },
        { toDate: { $gte: new Date(fromDate) } },
      ],
    });

    if (existing) {
      return NextResponse.json(
        { error: "Leave already applied for overlapping dates" },
        { status: 409 }
      );
    }

    /* ---------- CREATE LEAVE ---------- */
    const leave = await Leave.create({
      companyId: user.companyId,
      employeeId,
      fromDate,
      toDate,
      leaveType,
      reason,
      attachmentUrl: attachmentUrl || "",
      status: "Pending",
    });

    /* ---------- ENSURE BALANCE ---------- */
    await LeaveBalance.findOneAndUpdate(
      { companyId: user.companyId, employeeId },
      {},
      { upsert: true, new: true }
    );

    return NextResponse.json(
      {
        message: "Leave applied successfully",
        data: leave,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/hr/leaves error:", error);
    return NextResponse.json(
      { error: "Failed to apply leave" },
      { status: 500 }
    );
  }
}



// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import Leave from "@/models/hr/Leave";
// import { withAuth, hasRole } from "@/lib/rbac";

// /* =======================
//    GET → All company leaves
// ======================= */
// export async function GET(req) {
//   try {
//     await connectDB();

//     const auth = await withAuth(req);
//     if (auth.error) {
//       return NextResponse.json(
//         { error: auth.error },
//         { status: auth.status }
//       );
//     }

//     const { user } = auth;

//     // ✅ ALLOW:
//     // 1) Company token
//     // 2) Admin / HR / Manager
//     const isCompany = user.type === "company";
//     const isPrivilegedUser = hasRole(user, ["Admin", "HR", "Manager"]);

//     if (!isCompany && !isPrivilegedUser) {
//       return NextResponse.json(
//         { error: "Only Company / Admin / HR / Manager can view all leaves" },
//         { status: 403 }
//       );
//     }

//     /* -----------------------
//        Query params
//     ----------------------- */
//     const { searchParams } = new URL(req.url);
//     const status = searchParams.get("status");
//     const from = searchParams.get("from");
//     const to = searchParams.get("to");

//     const query = {
//       companyId: user.companyId,
//     };

//     if (status) {
//       query.status = status;
//     }

//     // Date overlap logic
//     if (from || to) {
//       query.$and = [];

//       if (from) {
//         query.$and.push({ toDate: { $gte: new Date(from) } });
//       }

//       if (to) {
//         query.$and.push({ fromDate: { $lte: new Date(to) } });
//       }
//     }

//     const leaves = await Leave.find(query)
//       .populate("employeeId", "fullName email phone")
//       .sort({ createdAt: -1 })
//       .lean();

//       console.log("Leaves fetched:", leaves);

//     return NextResponse.json({ data: leaves });
//   } catch (error) {
//     console.error("GET /api/hr/leaves error:", error);

//     return NextResponse.json(
//       { error: "Failed to fetch leaves" },
//       { status: 500 }
//     );
//   }
// }


// /* =======================
//    POST → Apply leave
// ======================= */
// export async function POST(req) {
//   try {
//     await connectDB();

//     const auth = await withAuth(req);

//     if (auth.error) {
//       return NextResponse.json(
//         { error: auth.error },
//         { status: auth.status }
//       );
//     }

//     const { user } = auth;

//     const body = await req.json();

//     const {
//       fromDate,
//       toDate,
//       leaveType,
//       reason,
//       attachmentUrl,
//     } = body;

//     // ✅ Validation
//     if (!fromDate || !toDate || !leaveType || !reason) {
//       return NextResponse.json(
//         { error: "All fields are required" },
//         { status: 400 }
//       );
//     }

//     if (new Date(fromDate) > new Date(toDate)) {
//       return NextResponse.json(
//         { error: "From date cannot be greater than To date" },
//         { status: 400 }
//       );
//     }

//     // ✅ Prevent duplicate leave for same dates
//     const existing = await Leave.findOne({
//       companyId: user.companyId,
//       employeeId: user.id,
//       fromDate: new Date(fromDate),
//       toDate: new Date(toDate),
//     });

//     if (existing) {
//       return NextResponse.json(
//         { error: "Leave already applied for these dates" },
//         { status: 409 }
//       );
//     }

//     // ✅ Create Leave
//     const leave = await Leave.create({
//       companyId: user.companyId,
//       employeeId: user.id,
//       fromDate,
//       toDate,
//       leaveType,
//       reason,
//       attachmentUrl: attachmentUrl || "",
//       status: "Pending",
//     });

//     // ✅ Ensure Leave Balance exists
//     let balance = await LeaveBalance.findOne({
//       companyId: user.companyId,
//       employeeId: user.id,
//     });

//     if (!balance) {
//       balance = await LeaveBalance.create({
//         companyId: user.companyId,
//         employeeId: user.id,
//       });
//     }

//     return NextResponse.json({
//       message: "Leave applied successfully",
//       data: leave,
//     });

//   } catch (error) {
//     console.error("POST /leaves error:", error.message);

//     return NextResponse.json(
//       { error: "Failed to apply leave" },
//       { status: 500 }
//     );
//   }
// }
