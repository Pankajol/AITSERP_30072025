import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OperatorMachineMapping from '@/models/ppc/operatorMachineMappingModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_production_data");

export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const mappings = await OperatorMachineMapping.find({ companyId: user.companyId })
      .populate('operator', 'name code')
      .populate('machine', 'name code')
      .sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: mappings }, { status: 200 });
  } catch (err) {
    console.error("GET /api/operator-machine-mappings error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const requiredFields = ["operator", "machine"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `Validation Error: The '${field}' field is required.` }, { status: 400 });
      }
    }
    
    // Prevent duplicate mapping
    const existingMapping = await OperatorMachineMapping.findOne({ 
        operator: body.operator, 
        machine: body.machine, 
        companyId: user.companyId 
    });
    if (existingMapping) {
        return NextResponse.json({ success: false, message: 'This operator is already mapped to this machine.' }, { status: 409 });
    }

    const newMapping = new OperatorMachineMapping({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });
    await newMapping.save();
    return NextResponse.json({ success: true, data: newMapping, message: "Mapping created successfully" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/operator-machine-mappings error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}
