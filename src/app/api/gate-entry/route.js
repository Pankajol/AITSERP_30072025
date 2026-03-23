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
    
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded || !decoded.companyId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const currentYear = new Date().getFullYear();

    // 1. Find the LATEST entry SPECIFIC to this company only
    const lastEntry = await GateEntry.findOne({ 
      companyId: decoded.companyId 
    })
    .sort({ createdAt: -1 }) // Sirf is company ki sabse nayi entry
    .select("entryNo");

    let nextNumber = 1;

    if (lastEntry && lastEntry.entryNo) {
      // Format: GE-2026-0001
      // Split karke aakhri part (0001) nikalenge
      const parts = lastEntry.entryNo.split("-");
      const lastNum = parseInt(parts[parts.length - 1], 10);
      
      if (!isNaN(lastNum)) {
        nextNumber = lastNum + 1;
      }
    }

    // 2. Generate New Entry Number (e.g., GE-2026-0001)
    const entryNo = `GE-${currentYear}-${nextNumber.toString().padStart(4, '0')}`;

    // 3. Create entry with companyId linkage
    const newEntry = await GateEntry.create({
      ...body,
      companyId: decoded.companyId, // Token se aya hua ID
      entryNo,
      purchaseOrders: body.purchaseOrders || []
    });

    return NextResponse.json({ success: true, data: newEntry });

  } catch (error) {
    console.error("Gate Entry POST Error:", error);

    // Duplicate key handle karein (agar do guards ek sath enter karein)
    if (error.code === 11000) {
      return NextResponse.json({ 
        success: false, 
        error: "Sequence Conflict: Please save again to get the next number." 
      }, { status: 409 });
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}