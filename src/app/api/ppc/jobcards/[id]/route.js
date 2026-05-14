import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import JobCard from "@/models/ppc/JobCardModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ PUT: Update job card with totalDuration and cascading logic
export async function PUT(req, { params }) {
  try {
    await connectDB();
    const { id } = params;

    // --- Auth check ---
    const token = getTokenFromHeader(req);
    if (!token || !verifyJWT(token)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    // --- Parse body ---
    const body = await req.json();
    let { completedQty, status, actualStartDate, actualEndDate, totalDuration } = body;

    // --- Find current job card ---
    const currentJobCard = await JobCard.findById(id);
    if (!currentJobCard) {
      return NextResponse.json({ success: false, message: "Job card not found" }, { status: 404 });
    }

    // --- Validate completedQty ---
    completedQty = Number(completedQty) || 0;
    if (completedQty < 0 || completedQty > currentJobCard.qtyToManufacture) {
      return NextResponse.json({
        success: false,
        message: `Completed quantity must be between 0 and ${currentJobCard.qtyToManufacture}`,
      }, { status: 400 });
    }

    // --- Update fields ---
    currentJobCard.completedQty = completedQty;
    if (status) currentJobCard.status = status;
    if (actualStartDate) currentJobCard.actualStartDate = actualStartDate;
    if (actualEndDate) currentJobCard.actualEndDate = actualEndDate;
    if (totalDuration !== undefined) currentJobCard.totalDuration = Number(totalDuration);

    // --- Determine status ---
    if (completedQty >= currentJobCard.qtyToManufacture) {
      currentJobCard.status = "completed";
      if (!currentJobCard.actualEndDate) currentJobCard.actualEndDate = new Date();
    } else if (completedQty > 0) {
      currentJobCard.status = "partially completed";
      if (!currentJobCard.actualStartDate) currentJobCard.actualStartDate = new Date();
    } else {
      currentJobCard.status = "planned";
    }

    const updatedJobCard = await currentJobCard.save();

    // --- CASCADING: Trigger next job card automatically ---
    const nextJobCard = await JobCard.findOne({
      productionOrder: currentJobCard.productionOrder,
      sequence: currentJobCard.sequence + 1,
    });

    if (nextJobCard) {
      nextJobCard.allowedQty = completedQty;
      await nextJobCard.save();
    }

    // --- Populate for frontend ---
    const populatedJobCard = await JobCard.findById(updatedJobCard._id)
      .populate("operation", "name")
      .populate("machine", "name")
      .populate("operator", "name");

    return NextResponse.json({
      success: true,
      message: "Job card updated successfully",
      data: populatedJobCard,
    });

  } catch (err) {
    console.error("Error updating job card:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ GET: Get all job cards of a production order
export async function GET(req, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const token = getTokenFromHeader(req);
    if (!token || !verifyJWT(token)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const jobCards = await JobCard.find({ productionOrder: id })
      .populate("operation", "name")
      .populate("machine", "name")
      .populate("operator", "name")
      .sort({ sequence: 1 });

    return NextResponse.json({ success: true, data: jobCards });
  } catch (err) {
    console.error("Error fetching job cards:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ DELETE: Remove a job card
export async function DELETE(req, { params }) {
  try {
    await connectDB();
    const { id } = params;

    const token = getTokenFromHeader(req);
    if (!token || !verifyJWT(token)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const deleted = await JobCard.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Job card not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting job card:", err);
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
