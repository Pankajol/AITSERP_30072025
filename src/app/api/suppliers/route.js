import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Supplier from "@/models/SupplierModels";
import BankHead from "@/models/BankHead";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/* -------------------------------
   🔐 Role-Based Access Check
-------------------------------- */
function isAuthorized(user) {
  return user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("supplier");
}

/* ✅ Validate User Helper */
async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT Verification Failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}


export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const suppliers = await Supplier.find({ companyId: user.companyId })
      .populate("glAccount", "accountName accountCode") // ✅ Fetch only necessary fields
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: suppliers }, { status: 200 });
  } catch (err) {
    console.error("GET /suppliers error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch suppliers" }, { status: 500 });
  }
}


export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();

    // ✅ Validate required fields
    const requiredFields = ["supplierCode", "supplierName", "supplierType", "pan"];
    for (let field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    // ✅ Prevent duplicate supplierCode within the same company
    const existingSupplier = await Supplier.findOne({ supplierCode: body.supplierCode, companyId: user.companyId });
    if (existingSupplier) {
      return NextResponse.json({ success: false, message: "Supplier Code already exists" }, { status: 400 });
    }

    // ✅ Create supplier
    const supplier = new Supplier({
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await supplier.save();
    const populated = await Supplier.findById(supplier._id).populate("glAccount", "accountName accountCode");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });
  } catch (err) {
    console.error("POST /suppliers error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return NextResponse.json({ success: false, message: `${field} already exists` }, { status: 400 });
    }

    return NextResponse.json({ success: false, message: "Failed to create supplier" }, { status: 500 });
  }
}
