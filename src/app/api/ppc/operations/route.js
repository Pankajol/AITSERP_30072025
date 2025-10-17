import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Operation from '@/models/ppc/operationModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// Helper function for authorization check for operators
const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_operators");

/**
 * Handles GET requests to fetch all operators for a company.
 */
export async function GET(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const operators = await Operation.find({ companyId: user.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: operators }, { status: 200 });
  } catch (err) {
    console.error("GET /api/operators error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

/**
 * Handles POST requests to create a new operator.
 */
export async function POST(req) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const requiredFields = ["code", "name", "cost"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `Validation Error: The '${field}' field is required.` }, { status: 400 });
      }
    }

    const existingOperation = await Operation.findOne({ code: body.code, companyId: user.companyId });
    if (existingOperation) {
      return NextResponse.json({ success: false, message: `Conflict: An operator with code '${body.code}' already exists.` }, { status: 409 });
    }

    const newOperation = new Operation({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await newOperation.save();
    return NextResponse.json({ success: true, data: newOperation, message: "Operation created successfully" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/operators error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

