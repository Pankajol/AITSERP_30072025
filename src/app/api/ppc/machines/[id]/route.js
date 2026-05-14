// make the [id] dynamic route file
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Machine from "@/models/ppc/machineModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/**
 * GET: Fetch a specific machine by ID
 */
export async function GET(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;

    // ===== Auth =====
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }
    const user = verifyJWT(token);
    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or missing companyId" },
        { status: 401 }
      );
    }
    // Role-based access
    const isAuthorized =
      user.type === "company" ||
      user.role === "Admin" ||
      user.permissions?.includes("manage_machines");    
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not have permission" },
        { status: 403 }
      );
    }
    // ===== Fetch Machine =====
    const machine = await Machine.findOne({ _id: id, companyId: user.companyId });
    if (!machine) {
      return NextResponse.json(
        { success: false, message: `Machine with ID ${id} not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: machine }, { status: 200 });
    } catch (err) {
    console.error("GET /api/ppc/machines/:id error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update a specific machine by ID
 */
export async function PUT(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    // ===== Auth =====
    const token = getTokenFromHeader(req); 
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }
    const user = verifyJWT(token);  
    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or missing companyId" },
        { status: 401 }
      );
    }
    // Role-based access
    const isAuthorized =
      user.type === "company" ||
      user.role === "Admin" ||
      user.permissions?.includes("manage_machines");
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not have permission" },
        { status: 403 }
      );
    }
    // ===== Parse Body =====
    const body = await req.json();
    const { machineCode, name, brandName, productionCapacity } = body;  
    if (!machineCode || !name || !brandName || !productionCapacity) {
      return NextResponse.json(
        { success: false, message: "Validation Error: Missing required fields" },
        { status: 400 }
      );
    }
    // ===== Fetch Existing Machine =====
    const machine = await Machine.findOne({ _id: id, companyId: user.companyId });  
    if (!machine) {
      return NextResponse.json(
        { success: false, message: `Machine with ID ${id} not found` },
        { status: 404 }
      );
    }
    // ===== Duplicate Check if machineCode changed =====
    if (machine.machineCode !== machineCode) {
      const existing = await Machine.findOne({ machineCode, companyId: user.companyId });
      if (existing) {
        return NextResponse.json(
          { success: false, message: `Conflict: Machine machineCode '${machineCode}' already exists` },
          { status: 409 }
        );
      }
    }
    // ===== Update Machine =====
    Object.assign(machine, body);
    await machine.save();
    return NextResponse.json({ success: true, data: machine }, { status: 200 });
  } catch (err) {
    console.error("PUT /api/ppc/machines/:id error:", err);         
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Conflict: Duplicate machineCode for this company" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete a specific machine by ID
 */
export async function DELETE(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    // ===== Auth =====
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }
    const user = verifyJWT(token);
    if (!user?.companyId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Invalid token or missing companyId" },
        { status: 401 }
      );
    } 
    // Role-based access
    const isAuthorized =
      user.type === "company" ||
      user.role === "Admin" ||
      user.permissions?.includes("manage_machines");
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, message: "Forbidden: You do not have permission" },
        { status: 403 }
      );
    }
    // ===== Delete Machine =====
    const machine = await Machine.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!machine) {
        return NextResponse.json(
        { success: false, message: `Machine with ID ${id} not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, message: "Machine deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /api/ppc/machines/:id error:", err);
    return NextResponse.json(
      { success: false, message: "Server Error" },
      { status: 500 }
    );
  }
}