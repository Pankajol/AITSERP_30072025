import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Resource from '@/models/ppc/resourceModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// Helper function for authorization check for resources
const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_resources");

/**
 * Handles GET requests to fetch all resources for a company.
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

    const resources = await Resource.find({ companyId: user.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: resources }, { status: 200 });
  } catch (err) {
    console.error("GET /api/resources error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

/**
 * Handles POST requests to create a new resource.
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
    const requiredFields = ["code", "name", "unitPrice"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `Validation Error: The '${field}' field is required.` }, { status: 400 });
      }
    }

    const existingResource = await Resource.findOne({ code: body.code, companyId: user.companyId });
    if (existingResource) {
      return NextResponse.json({ success: false, message: `Conflict: A resource with code '${body.code}' already exists.` }, { status: 409 });
    }

    const newResource = new Resource({
      ...body,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await newResource.save();
    return NextResponse.json({ success: true, data: newResource, message: "Resource created successfully" }, { status: 201 });
  } catch (err) {
    console.error("POST /api/resources error:", err);
    return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
  }
}

