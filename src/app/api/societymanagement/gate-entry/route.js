import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import GateEntry from "@/models/society/GateEntry";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

// ── GET – list gate entries ──────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Gate Entry", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id         = searchParams.get("id");
    const societyId  = searchParams.get("societyId");
    const date       = searchParams.get("date");
    const category   = searchParams.get("category");
    const search     = searchParams.get("search") || "";
    const page       = Math.max(parseInt(searchParams.get("page"))  || 1,   1);
    const limit      = Math.min(parseInt(searchParams.get("limit")) || 20, 200); // allow up to 200 for active-entry fetch

    let query = { companyId: user.companyId };
    if (societyId) query.societyId = societyId;
    if (category)  query.category  = category;

    if (date) {
      const start = new Date(date);
      const end   = new Date(start);
      end.setDate(end.getDate() + 1);
      query.timestamp = { $gte: start, $lt: end };
    }

    // Single record lookup
    if (id) {
      const entry = await GateEntry.findOne({ _id: id, ...query }).lean();
      if (!entry) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: entry });
    }

    if (search) {
      query.$or = [
        { personName:    { $regex: search, $options: "i" } },
        { vehicleNumber: { $regex: search, $options: "i" } },
        { purpose:       { $regex: search, $options: "i" } },
        { contactNumber: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [entries, total] = await Promise.all([
      GateEntry.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
      GateEntry.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data:    entries,
      meta:    { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[gate-entry GET]", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ── POST – create a gate entry (IN or OUT) ───────────────────────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Gate Entry", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const { societyId, entryType, category } = data;

    if (!societyId || !entryType || !category) {
      return NextResponse.json(
        { success: false, message: "societyId, entryType, category are required" },
        { status: 400 }
      );
    }

    if (!["IN", "OUT"].includes(entryType)) {
      return NextResponse.json(
        { success: false, message: "entryType must be IN or OUT" },
        { status: 400 }
      );
    }

    const entry = new GateEntry({
      societyId:     data.societyId,
      gateName:      data.gateName      || "Main Gate",
      entryType:     data.entryType,
      category:      data.category,
      personName:    data.personName    || "",
      contactNumber: data.contactNumber || "",
      vehicleNumber: data.vehicleNumber || "",
      purpose:       data.purpose       || "",
      timestamp:     new Date(),
      companyId:     user.companyId,
      recordedBy:    user._id,
    });

    await entry.save();
    return NextResponse.json({ success: true, data: entry }, { status: 201 });
  } catch (err) {
    console.error("[gate-entry POST]", err);
    return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import GateEntry from "@/models/society/GateEntry";   // ✅ Correct model
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

// async function getUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   const user = await verifyJWT(token);
//   if (!user) return { error: "Invalid token", status: 401 };
//   return { user };
// }

// // ── GET – list gate entries ──────────────────────────────────────
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   if (!hasPermission(user, "Gate Entry", "view")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const societyId = searchParams.get("societyId");
//     const date = searchParams.get("date");
//     const category = searchParams.get("category");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);
//     const search = searchParams.get("search") || "";

//     let query = { companyId: user.companyId };
//     if (societyId) query.societyId = societyId;
//     if (category) query.category = category;
//     if (date) {
//       const start = new Date(date);
//       const end = new Date(start);
//       end.setDate(end.getDate() + 1);
//       query.timestamp = { $gte: start, $lt: end };
//     }

//     if (id) {
//       const entry = await GateEntry.findOne({ _id: id, ...query }).lean();
//       if (!entry) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//       return NextResponse.json({ success: true, data: entry });
//     }

//     if (search) {
//       query.$or = [
//         { personName: { $regex: search, $options: "i" } },
//         { vehicleNumber: { $regex: search, $options: "i" } },
//         { purpose: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [entries, total] = await Promise.all([
//       GateEntry.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
//       GateEntry.countDocuments(query),
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

// // ── POST – record a gate entry ──────────────────────────────────
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   if (!hasPermission(user, "Gate Entry", "create")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const data = await req.json();
//     // Required fields check
//     if (!data.societyId || !data.entryType || !data.category) {
//       return NextResponse.json(
//         { success: false, message: "societyId, entryType, category required" },
//         { status: 400 }
//       );
//     }

//     const entry = new GateEntry({
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