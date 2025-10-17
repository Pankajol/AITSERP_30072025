import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Resource from '@/models/ppc/resourceModel';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// Helper function for authorization check for resources
const isAuthorized = (user) => 
  user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("manage_resources");

/**
 * Handles GET requests to fetch a single resource by its ID.
 */
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const resource = await Resource.findOne({ _id: id, companyId: user.companyId });

    if (!resource) {
      return NextResponse.json({ success: false, message: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: resource }, { status: 200 });
  } catch (err) {
    console.error(`GET /api/resources/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

/**
 * Handles PUT requests to update a resource by its ID.
 */
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();

    const updatedResource = await Resource.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...body, updatedBy: user.id || user._id },
      { new: true, runValidators: true }
    );

    if (!updatedResource) {
      return NextResponse.json({ success: false, message: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updatedResource, message: "Resource updated successfully" }, { status: 200 });
  } catch (err) {
    console.error(`PUT /api/resources/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

/**
 * Handles DELETE requests to remove a resource by its ID.
 */
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const token = getTokenFromHeader(req);
    if (!token) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

    const user = verifyJWT(token);
    if (!user || !user.companyId || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const deletedResource = await Resource.deleteOne({ _id: id, companyId: user.companyId });

    if (deletedResource.deletedCount === 0) {
      return NextResponse.json({ success: false, message: 'Resource not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Resource deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error(`DELETE /api/resources/[id] error:`, err);
    return NextResponse.json({ success: false, message: 'Server Error' }, { status: 500 });
  }
}

