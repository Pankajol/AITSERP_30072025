import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import MachineOutput from '@/models/ppc/machineOutputModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

const isAuthorized = (user) =>
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_production_data");

// ---------------- GET ----------------
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user))
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const outputs = await MachineOutput.find({ companyId: user.companyId })
      .populate('machine', 'name code') 
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: outputs }, { status: 200 });
  } catch (err) {
    console.error("GET /api/machine-outputs error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

// ---------------- POST ----------------
export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user))
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await req.json();

    const requiredFields = ["itemCode", "itemName", "machine", "perDayOutput", "machineRunningCost"];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { success: false, message: `Validation Error: The '${field}' field is required.` },
          { status: 400 }
        );
      }
    }

    const newOutput = new MachineOutput({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await newOutput.save();
    return NextResponse.json({ success: true, data: newOutput, message: "Machine output created successfully" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/machine-outputs error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

// ---------------- PUT ----------------
export async function PUT(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user))
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const { id } = params; // e.g., /api/machine-outputs/:id
    const body = await req.json();

    const requiredFields = ["itemCode", "itemName", "machine", "perDayOutput", "machineRunningCost"];
    for (const field of requiredFields) {
      if (!body[field] && body[field] !== 0) {
        return NextResponse.json(
          { success: false, message: `Validation Error: The '${field}' field is required.` },
          { status: 400 }
        );
      }
    }

    const updated = await MachineOutput.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...body },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Machine output not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated, message: "Machine output updated successfully" }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/machine-outputs error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

// ---------------- DELETE ----------------
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user))
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const { id } = params;

    const deleted = await MachineOutput.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) {
      return NextResponse.json({ success: false, message: "Machine output not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Machine output deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/machine-outputs error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}
