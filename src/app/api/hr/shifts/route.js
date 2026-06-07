import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Shift from "@/models/hr/Shift";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

// GET all shifts (by companyId)
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Shift", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const shifts = await Shift.find({ companyId: user.companyId }).sort({ name: 1 }).lean();
    return NextResponse.json({ success: true, data: shifts });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// POST create new shift
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Shift", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    if (!data.name || !data.startTime || !data.endTime) {
      return NextResponse.json({ success: false, message: "Name, startTime, endTime required" }, { status: 400 });
    }

    const shift = await Shift.create({ ...data, companyId: user.companyId });
    return NextResponse.json({ success: true, data: shift }, { status: 201 });
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      return NextResponse.json({ success: false, message: "Shift name already exists" }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: "Create failed" }, { status: 500 });
  }
}

// PUT update
export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Shift", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    delete data.companyId;

    const updated = await Shift.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Shift not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Shift", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Shift.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";
// import Shift from "@/models/hr/Shift";

// export async function GET(req) {
//   try {
//     await connectDB();
//     const user = verifyJWT(getTokenFromHeader(req));
//     if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

//     const shifts = await Shift.find({ companyId: user.companyId }).sort({ name: 1 });
//     return NextResponse.json({ success: true, data: shifts });
//   } catch (err) {
//     console.error("GET /api/hr/shifts error:", err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   try {
//     await connectDB();
//     const user = verifyJWT(getTokenFromHeader(req));
//     if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
//     if (!hasPermission(user, "shifts", "create"))
//       return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

//     const body  = await req.json();
//     const shift = await Shift.create({ ...body, companyId: user.companyId });
//     return NextResponse.json({ success: true, data: shift }, { status: 201 });
//   } catch (err) {
//     console.error("POST /api/hr/shifts error:", err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }