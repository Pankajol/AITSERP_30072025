import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import GuardEntry from "@/models/society/GuardEntry";
import GuardAssignment from "@/models/society/GuardAssignment";
import Society from "@/models/society/Society";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
import { isWithinGeofence } from "@/lib/geofence";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

// ── GET – list guard attendance punches ─────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Guard Entry", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get("employeeId");
    const societyId  = searchParams.get("societyId");
    const date       = searchParams.get("date");
    const page       = Math.max(parseInt(searchParams.get("page"))  || 1,   1);
    const limit      = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

    let query = { companyId: user.companyId };
    if (employeeId) query.employeeId = employeeId;
    if (societyId)  query.societyId  = societyId;

    if (date) {
      const start = new Date(date);
      const end   = new Date(start);
      end.setDate(end.getDate() + 1);
      query.timestamp = { $gte: start, $lt: end };
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      GuardEntry.find(query)
        .populate("employeeId", "name")
        .sort({ timestamp: 1 })           // ascending so UI shows punches in order
        .skip(skip)
        .limit(limit)
        .lean(),
      GuardEntry.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data:    entries,
      meta:    { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[guard-entry GET]", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST – record a guard checkpoint punch ───────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Guard Entry", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const { companyUserId, checkpointName, checkpointType, latitude, longitude } = data;

    if (!companyUserId || !checkpointName || !checkpointType) {
      return NextResponse.json(
        { success: false, message: "companyUserId, checkpointName, checkpointType are required" },
        { status: 400 }
      );
    }

    if (!["IN", "OUT"].includes(checkpointType)) {
      return NextResponse.json(
        { success: false, message: "checkpointType must be IN or OUT" },
        { status: 400 }
      );
    }

    // Verify the guard user exists
    const CompanyUser = (await import("@/models/CompanyUser")).default;
    const guardUser   = await CompanyUser.findById(companyUserId);
    if (!guardUser) {
      return NextResponse.json({ success: false, message: "Guard user not found" }, { status: 404 });
    }

    // Find the guard's active assignment
    const assignment = await GuardAssignment.findOne({
      userId:   companyUserId,
      isActive: true,
    });
    if (!assignment) {
      return NextResponse.json(
        { success: false, message: "No active assignment found for this guard" },
        { status: 400 }
      );
    }

    // Load the society (needed for checkpoint list)
    const society = await Society.findById(assignment.societyId);
    if (!society) {
      return NextResponse.json({ success: false, message: "Society not found" }, { status: 400 });
    }

    // Ensure the checkpoint exists in this society
    const checkpoint = (society.checkpoints || []).find(cp => cp.name === checkpointName);
    if (!checkpoint) {
      return NextResponse.json(
        { success: false, message: `Checkpoint "${checkpointName}" is not configured for this society` },
        { status: 400 }
      );
    }

    // Geofence check (only when both the checkpoint and the device provide coordinates)
    let withinGeofence = null;
    if (checkpoint.latitude && checkpoint.longitude && latitude != null && longitude != null) {
      withinGeofence = isWithinGeofence(
        latitude,
        longitude,
        checkpoint.latitude,
        checkpoint.longitude,
        checkpoint.radius || 50
      );
    }

    const entry = new GuardEntry({
      companyId:      user.companyId,
      employeeId:     companyUserId,
      societyId:      society._id,
      assignmentId:   assignment._id,   // ✅ correct field name (was deploymentId)
      checkpointName,
      checkpointType,
      timestamp:      new Date(),
      latitude:       latitude  ?? null,
      longitude:      longitude ?? null,
      withinGeofence,
    });

    await entry.save();
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    console.error("[guard-entry POST]", err);
    return NextResponse.json({ success: false, message: "Punch failed" }, { status: 500 });
  }
}





// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import GuardEntry from "@/models/society/GuardEntry";
// import GuardAssignment from "@/models/society/GuardAssignment";   // ✅ changed
// import Society from "@/models/society/Society";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
// import { isWithinGeofence } from "@/lib/geofence";

// async function getUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   const user = await verifyJWT(token);
//   if (!user) return { error: "Invalid token", status: 401 };
//   return { user };
// }

// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   if (!hasPermission(user, "Guard Entry", "view")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const { searchParams } = new URL(req.url);
//     const employeeId = searchParams.get("employeeId");
//     const societyId = searchParams.get("societyId");
//     const date = searchParams.get("date");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

//     let query = { companyId: user.companyId };
//     if (employeeId) query.employeeId = employeeId;
//     if (societyId) query.societyId = societyId;
//     if (date) {
//       const start = new Date(date);
//       const end = new Date(start);
//       end.setDate(end.getDate() + 1);
//       query.timestamp = { $gte: start, $lt: end };
//     }

//     const skip = (page - 1) * limit;
//     const [entries, total] = await Promise.all([
//       GuardEntry.find(query)
//         .populate("employeeId", "name")
//         .sort({ timestamp: -1 })
//         .skip(skip).limit(limit)
//         .lean(),
//       GuardEntry.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: entries,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   if (!hasPermission(user, "Guard Entry", "create")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const data = await req.json();
//     const { companyUserId, checkpointName, checkpointType, latitude, longitude } = data;

//     if (!companyUserId || !checkpointName || !checkpointType) {
//       return NextResponse.json(
//         { success: false, message: "companyUserId, checkpointName, checkpointType required" },
//         { status: 400 }
//       );
//     }

//     const CompanyUser = (await import("@/models/CompanyUser")).default;
//     const guardUser = await CompanyUser.findById(companyUserId);
//     if (!guardUser)
//       return NextResponse.json({ success: false, message: "Guard user not found" }, { status: 404 });

//     // ✅ Use GuardAssignment instead of Deployment
//     const assignment = await GuardAssignment.findOne({
//       userId: companyUserId,
//       isActive: true,
//     });
//     if (!assignment)
//       return NextResponse.json(
//         { success: false, message: "No active assignment" },
//         { status: 400 }
//       );

//     const society = await Society.findById(assignment.societyId);
//     if (!society)
//       return NextResponse.json({ success: false, message: "Society not found" }, { status: 400 });

//     // Validate checkpoint exists in the society
//     const checkpoint = society.checkpoints.find(cp => cp.name === checkpointName);
//     if (!checkpoint)
//       return NextResponse.json(
//         { success: false, message: "Checkpoint not configured for this society" },
//         { status: 400 }
//       );

//     // Geofence check
//     let within = true;
//     if (checkpoint.latitude && checkpoint.longitude && latitude && longitude) {
//       within = isWithinGeofence(
//         latitude, longitude,
//         checkpoint.latitude, checkpoint.longitude,
//         checkpoint.radius || 50
//       );
//     }

//     const entry = new GuardEntry({
//       companyId: user.companyId,
//       employeeId: companyUserId,
//       societyId: society._id,
//       deploymentId: assignment._id,   // store assignment id if needed
//       checkpointName,
//       checkpointType,
//       timestamp: new Date(),
//       latitude,
//       longitude,
//       withinGeofence: within,
//     });
//     await entry.save();

//     return NextResponse.json({ success: true, data: entry }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Punch failed" }, { status: 500 });
//   }
// }