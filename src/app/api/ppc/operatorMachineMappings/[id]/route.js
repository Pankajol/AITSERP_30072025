import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OperatorMachineMapping from '@/models/ppc/operatorMachineMappingModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_production_data");

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const mapping = await OperatorMachineMapping.findOne({ _id: params.id, companyId: user.companyId })
        .populate('operator', 'name code')
        .populate('machine', 'name code');
    if (!mapping) return NextResponse.json({ success: false, message: 'Mapping not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: mapping }, { status: 200 });
  } catch (err) {
    console.error(`GET /api/operator-machine-mappings/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const updatedMapping = await OperatorMachineMapping.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      { ...body, updatedBy: user.id || user._id },
      { new: true, runValidators: true }
    );
    if (!updatedMapping) return NextResponse.json({ success: false, message: 'Mapping not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updatedMapping, message: "Mapping updated successfully" }, { status: 200 });
  } catch (err) {
    console.error(`PUT /api/operator-machine-mappings/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const deletedMapping = await OperatorMachineMapping.deleteOne({ _id: params.id, companyId: user.companyId });
    if (deletedMapping.deletedCount === 0) return NextResponse.json({ success: false, message: 'Mapping not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: "Mapping deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/operator-machine-mappings/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
