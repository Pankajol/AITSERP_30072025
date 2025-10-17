import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Holiday from '@/models/ppc/holidayModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// Authorization check
const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_holidays");

// GET /api/ppc/holidays/[id]
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const holiday = await Holiday.findOne({ _id: params.id, companyId: user.companyId });
    if (!holiday) return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: holiday }, { status: 200 });
  } catch (err) {
    console.error("GET /api/holidays/[id] error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

// PUT /api/ppc/holidays/[id]
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const requiredFields = ["name", "date", "holidayType", "description"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `Validation Error: The '${field}' field is required.` }, { status: 400 });
      }
    }

    const updatedHoliday = await Holiday.findOneAndUpdate(
      { _id: params.id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );

    if (!updatedHoliday) return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: updatedHoliday, message: "Holiday updated successfully" }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/holidays/[id] error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

// DELETE /api/ppc/holidays/[id]
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const deletedHoliday = await Holiday.findOneAndDelete({ _id: params.id, companyId: user.companyId });
    if (!deletedHoliday) return NextResponse.json({ success: false, message: 'Holiday not found' }, { status: 404 });

    return NextResponse.json({ success: true, message: 'Holiday deleted successfully' }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/holidays/[id] error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}
