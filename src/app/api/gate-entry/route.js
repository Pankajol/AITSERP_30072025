import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import GateEntry from "@/models/GateEntry";
import Supplier from "@/models/SupplierModels";
import PurchaseOrder from "@/models/PurchaseOrder";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await connectDB();

    // Verify Token
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Filter by companyId
    const entries = await GateEntry.find({ companyId: decoded.companyId })
      .populate("supplier", "supplierName supplierCode")
      .populate("purchaseOrders", " documentNumberPurchaseOrder grandTotal")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("Gate Entry GET Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await connectDB();
    
    // Verify Token
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Auto-generate Entry No (GE-YEAR-COUNT)
    const count = await GateEntry.countDocuments({ companyId: decoded.companyId });
    const entryNo = `GE-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;

    const newEntry = await GateEntry.create({
      ...body,
      companyId: decoded.companyId, // Attach company ID from token
      entryNo,
      purchaseOrders: body.purchaseOrders || []
    });

    return NextResponse.json({ success: true, data: newEntry });
  } catch (error) {
    console.error("Gate Entry POST Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}