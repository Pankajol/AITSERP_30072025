import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import BuildingEntry from "@/models/society/BuildingEntry";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

// ── GET – list building entries ──────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Building Entry", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const societyId    = searchParams.get("societyId");
    const buildingName = searchParams.get("buildingName");
    const date         = searchParams.get("date");
    const search       = searchParams.get("search") || "";
    const page         = Math.max(parseInt(searchParams.get("page"))  || 1,   1);
    const limit        = Math.min(parseInt(searchParams.get("limit")) || 20, 200);

    let query = { companyId: user.companyId };
    if (societyId)    query.societyId    = societyId;
    if (buildingName) query.buildingName = buildingName;

    if (date) {
      const start = new Date(date);
      const end   = new Date(start);
      end.setDate(end.getDate() + 1);
      query.timestamp = { $gte: start, $lt: end };
    }

    if (search) {
      query.$or = [
        { personName: { $regex: search, $options: "i" } },
        { phone:      { $regex: search, $options: "i" } },
        { purpose:    { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      BuildingEntry.find(query)
        .populate("recordedBy", "name")
        .populate("flatId",     "flatNumber")
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      BuildingEntry.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data:    entries,
      meta:    { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[building-entry GET]", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST – create a building entry (IN or OUT) ───────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Building Entry", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const { societyId, buildingName, personName, entryType } = data;

    if (!societyId || !buildingName || !personName || !entryType) {
      return NextResponse.json(
        { success: false, message: "societyId, buildingName, personName, entryType are required" },
        { status: 400 }
      );
    }

    if (!["IN", "OUT"].includes(entryType)) {
      return NextResponse.json(
        { success: false, message: "entryType must be IN or OUT" },
        { status: 400 }
      );
    }

    const entry = new BuildingEntry({
      societyId:    data.societyId,
      buildingName: data.buildingName,
      personName:   data.personName,
      personType:   data.personType  || "Staff",
      phone:        data.phone       || "",
      flatId:       data.flatId      || null,
      entryType:    data.entryType,
      purpose:      data.purpose     || "",
      timestamp:    new Date(),
      companyId:    user.companyId,
      recordedBy:   user._id,
    });

    await entry.save();
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    console.error("[building-entry POST]", err);
    return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import BuildingEntry from "@/models/society/BuildingEntry";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

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

//   if (!hasPermission(user, "Building Entry", "view")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const { searchParams } = new URL(req.url);
//     const societyId = searchParams.get("societyId");
//     const buildingName = searchParams.get("buildingName");
//     const date = searchParams.get("date");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

//     let query = { companyId: user.companyId };
//     if (societyId) query.societyId = societyId;
//     if (buildingName) query.buildingName = buildingName;
//     if (date) {
//       const start = new Date(date);
//       const end = new Date(start);
//       end.setDate(end.getDate() + 1);
//       query.timestamp = { $gte: start, $lt: end };
//     }

//     const skip = (page - 1) * limit;
//     const [entries, total] = await Promise.all([
//       BuildingEntry.find(query)
//         .populate("recordedBy", "name")
//         .sort({ timestamp: -1 })
//         .skip(skip).limit(limit).lean(),
//       BuildingEntry.countDocuments(query),
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

//   if (!hasPermission(user, "Building Entry", "create")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const data = await req.json();
//     if (!data.societyId || !data.buildingName || !data.personName || !data.entryType) {
//       return NextResponse.json({ success: false, message: "societyId, buildingName, personName, entryType required" }, { status: 400 });
//     }

//     const entry = new BuildingEntry({
//       ...data,
//       companyId: user.companyId,
//       recordedBy: user._id,
//     });
//     await entry.save();
//     return NextResponse.json({ success: true, data: entry }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
//   }
// }