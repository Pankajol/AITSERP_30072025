import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobCard from "@/models/ppc/JobCardModel";   // use your correct model path
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers (same as before) ─────────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "production head", "project manager", "site engineer"];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(r => allowedRoles.includes(r.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

function getCompanyId(user) {
  if (user.companyId) return user.companyId;
  if (user.type === "company") return user.id || user._id;
  return user.company || user.company_id || null;
}

// ─── GET: List by productionOrderId or single by id ──────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const productionOrderId = searchParams.get("productionOrderId");

  try {
    if (id) {
      const jc = await JobCard.findOne({ _id: id, companyId })
        .populate("operation", "name")
        .populate("machine", "name")
        .populate("operator", "name")
        .lean();
      if (!jc) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: jc });
    }

    if (productionOrderId) {
      const jobCards = await JobCard.find({ productionOrder: productionOrderId, companyId })
        .populate("operation", "name")
        .populate("machine", "name")
        .populate("operator", "name")
        .sort({ createdAt: 1 })
        .lean();
      return NextResponse.json({ success: true, data: jobCards });
    }

    return NextResponse.json({ success: false, message: "Missing productionOrderId or id" }, { status: 400 });
  } catch (err) {
    console.error("GET jobcards error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// ─── POST: Create one or more job cards (used from production orders page) ────
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  try {
    const body = await req.json();
    const { productionOrderId, operations } = body;

    if (!productionOrderId || !operations || !Array.isArray(operations)) {
      return NextResponse.json({ success: false, message: "Invalid payload" }, { status: 400 });
    }

    const createdCards = [];
    for (const op of operations) {
      // Generate a simple job card number
      const count = await JobCard.countDocuments({ companyId });
      const jobCardNo = `JC-${String(count + 1).padStart(5, "0")}`;

      const data = {
        companyId,
        productionOrder: productionOrderId,
        operation: op.operationId,
        machine: op.machineId,
        operator: op.operatorId,
        jobCardNo,
        qtyToManufacture: op.qtyToManufacture,
        expectedStartDate: op.expectedStartDate,
        expectedEndDate: op.expectedEndDate,
        createdBy: user.id || user._id,
      };

      const jobCard = new JobCard(data);
      await jobCard.save();
      createdCards.push(jobCard);
    }

    return NextResponse.json({ success: true, data: createdCards, message: "Job cards created" }, { status: 201 });
  } catch (err) {
    console.error("POST jobcards error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── PUT: Update job card (for save/update) ─────────────────────
export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

  try {
    const body = await req.json();
    delete body.companyId;
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const updated = await JobCard.findOneAndUpdate(
      { _id: id, companyId },
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("operation", "name")
      .populate("machine", "name")
      .populate("operator", "name")
      .lean();

    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated, message: "Updated" });
  } catch (err) {
    console.error("PUT jobcards error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── PATCH: Start or End a job card (action = start | end) ──────────
export async function PATCH(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const action = searchParams.get("action");

  if (!id || !action) return NextResponse.json({ success: false, message: "Missing id or action" }, { status: 400 });

  try {
    const jc = await JobCard.findOne({ _id: id, companyId });
    if (!jc) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });

    if (action === "start") {
      if (jc.status === "in progress") return NextResponse.json({ success: false, message: "Already in progress" });
      jc.status = "in progress";
      if (!jc.actualStartDate) jc.actualStartDate = new Date();
      await jc.save();
      return NextResponse.json({ success: true, data: jc, message: "Started" });
    }

    if (action === "end") {
      const { completedQty, status: newStatus } = await req.json();
      if (!completedQty || completedQty <= 0) return NextResponse.json({ success: false, message: "Invalid qty" });
      jc.completedQty = completedQty;
      jc.status = newStatus || "completed";
      jc.actualEndDate = new Date();
      await jc.save();
      return NextResponse.json({ success: true, data: jc, message: "Ended" });
    }

    return NextResponse.json({ success: false, message: "Invalid action" }, { status: 400 });
  } catch (err) {
    console.error("PATCH jobcards error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ─── DELETE: Remove job card ──────────────────────────────────────
export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

  try {
    const deleted = await JobCard.findOneAndDelete({ _id: id, companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error("DELETE jobcards error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import JobCard from "@/models/ppc/JobCardModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ✅ GET: Fetch job cards for a specific production order
// export async function GET(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded)
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const jobCards = await JobCard.find({ productionOrder: id })
//       .populate("operation")
//       .populate("machine")
//       .populate("operator");

//     return NextResponse.json({ success: true, data: jobCards }, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching job cards:", err);
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

// // ✅ PUT: Update job card (with timeLogs, totalDuration, etc.)
// export async function PUT(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;
//     const token = getTokenFromHeader(req);

//     if (!token)
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded)
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const body = await req.json();

//     const updateData = {};
//     const pushData = {};

//     // ✅ Handle general updates
//     if (body.status) updateData.status = body.status;
//     if (body.completedQty !== undefined) updateData.completedQty = body.completedQty;
//     if (body.actualStartDate) updateData.actualStartDate = body.actualStartDate;
//     if (body.actualEndDate) updateData.actualEndDate = body.actualEndDate;
//     if (body.totalDuration !== undefined) updateData.totalDuration = body.totalDuration;

//     // ✅ Handle timeLogs push
//     if (body.$push?.timeLogs) {
//       pushData.timeLogs = body.$push.timeLogs;
//     } else if (body.timeLogs && Array.isArray(body.timeLogs)) {
//       pushData.timeLogs = { $each: body.timeLogs };
//     }

//     const updateQuery = Object.keys(pushData).length
//       ? { $set: updateData, $push: pushData }
//       : { $set: updateData };

//     const updatedJobCard = await JobCard.findByIdAndUpdate(id, updateQuery, { new: true })
//       .populate("operation")
//       .populate("machine")
//       .populate("operator");

//     if (!updatedJobCard)
//       return NextResponse.json({ success: false, error: "Job card not found" }, { status: 404 });

//     return NextResponse.json({ success: true, data: updatedJobCard });
//   } catch (err) {
//     console.error("Error updating job card:", err);
//     return NextResponse.json({ success: false, error: err.message }, { status: 400 });
//   }
// }

// // ✅ DELETE: Remove job card
// export async function DELETE(req, { params }) {
//   try {
//     await dbConnect();
//     const { id } = await params;
//     const token = getTokenFromHeader(req);

//     if (!token)
//       return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded)
//       return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

//     const deleted = await JobCard.findByIdAndDelete(id);
//     if (!deleted)
//       return NextResponse.json({ success: false, error: "Job card not found" }, { status: 404 });

//     return NextResponse.json({ success: true, message: "Deleted successfully" });
//   } catch (err) {
//     console.error("Error deleting job card:", err);
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }
