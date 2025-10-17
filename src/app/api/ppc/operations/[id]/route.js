import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ProductionOrder from '@/models/ppc/operationModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_production_orders");

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const order = await ProductionOrder.findOne({ _id: params.id, companyId: user.companyId })
      .populate('item', 'name code')
      .populate('machine', 'name code')
      .populate('operator', 'name')
      .populate('resource', 'name code');
    if (!order) return NextResponse.json({ success: false, message: 'Production order not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: order }, { status: 200 });
  } catch (err) {
    console.error(`GET /api/production-orders/[id] error:`, err);
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
    const updatedOrder = await ProductionOrder.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      { ...body, updatedBy: user.id || user._id },
      { new: true, runValidators: true }
    );
    if (!updatedOrder) return NextResponse.json({ success: false, message: 'Production order not found' }, { status: 404 });
    return NextResponse.json({ success: true, data: updatedOrder, message: "Production order updated successfully" }, { status: 200 });
  } catch (err) {
    console.error(`PUT /api/production-orders/[id] error:`, err);
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

    const deletedOrder = await ProductionOrder.deleteOne({ _id: params.id, companyId: user.companyId });
    if (deletedOrder.deletedCount === 0) return NextResponse.json({ success: false, message: 'Production order not found' }, { status: 404 });
    return NextResponse.json({ success: true, message: "Production order deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/production-orders/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}
