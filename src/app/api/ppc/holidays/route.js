import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Holiday from '@/models/ppc/holidayModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// Authorization check for holidays - adjust permissions as needed
const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_holidays");

export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query = { companyId: user.companyId };

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else {
      // Default to current year if no dates are provided
      const year = new Date().getFullYear();
      query.date = { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) };
    }

    const holidays = await Holiday.find(query).sort({ date: 'asc' });
    return NextResponse.json({ success: true, data: holidays }, { status: 200 });
  } catch (err) {
    console.error("GET /api/holidays error:", err);
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
    const requiredFields = ["name", "date", "holidayType"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `Validation Error: The '${field}' field is required.` }, { status: 400 });
      }
    }

    const newHoliday = new Holiday({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });
    await newHoliday.save();
    return NextResponse.json({ success: true, data: newHoliday, message: "Holiday created successfully" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/holidays error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

