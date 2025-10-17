import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Machine from "@/models/ppc/machineModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/**
 * GET: Fetch all machines for the user's company
 */
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    if (!user?.companyId)
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });

    const isAuthorized =
      user.type === "company" ||
      user.role === "Admin" ||
      user.permissions?.includes("manage_machines");

    if (!isAuthorized)
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("searchQuery") || "";

    const query = { companyId: user.companyId };
    if (searchQuery) {
      query.$or = [
        { code: { $regex: searchQuery, $options: "i" } },
        { name: { $regex: searchQuery, $options: "i" } },
        { brandName: { $regex: searchQuery, $options: "i" } },
      ];
    }

    const machines = await Machine.find(query).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: machines }, { status: 200 });
  } catch (err) {
    console.error("GET /api/ppc/machines error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

/**
 * POST: Create a new machine
 */
export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const user = verifyJWT(token);
    if (!user?.companyId)
      return NextResponse.json({ success: false, message: "Invalid token" }, { status: 401 });

    const isAuthorized =
      user.type === "company" ||
      user.role === "Admin" ||
      user.permissions?.includes("manage_machines");

    if (!isAuthorized)
      return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });

    const body = await req.json();
    // accept both machineCode and code
    const code = body.code || body.machineCode;
    const { name, model, brandName, productionCapacity } = body;

    if (!code || !name || !brandName || !productionCapacity) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const existing = await Machine.findOne({ code, companyId: user.companyId });
    if (existing) {
      return NextResponse.json(
        { success: false, message: `Machine code '${code}' already exists` },
        { status: 409 }
      );
    }

    const machine = new Machine({
      code,
      name,
      model,
      brandName,
      productionCapacity,
      companyId: user.companyId,
      createdBy: user.id || user._id,
    });

    await machine.save();

    return NextResponse.json(
      { success: true, message: "Machine created successfully", data: machine },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/ppc/machines error:", err);
    if (err.code === 11000) {
      return NextResponse.json(
        { success: false, message: "Duplicate machine code for this company" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
