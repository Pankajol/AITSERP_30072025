import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/db";
import Inventory from "@/models/Inventory";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

const { Types } = mongoose;

export async function GET(req, { params }) {
  await dbConnect();
  const { itemId, warehouseId } = params;

  try {
    if (!itemId || !warehouseId) {
      return NextResponse.json({ success: false, message: "Item ID and Warehouse ID are required." }, { status: 400 });
    }

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized: No token provided." }, { status: 401 });
    }
    const decoded = verifyJWT(token);
    // Ensure companyId is present in decoded token for filtering
    if (!decoded || !decoded.companyId) {
        console.error("Authentication Error (inventory-batch GET): Decoded JWT is missing 'companyId' claim.", { decoded });
        return NextResponse.json({ success: false, message: "Unauthorized: Invalid token (missing companyId)." }, { status: 401 });
    }

    if (!Types.ObjectId.isValid(itemId) || !Types.ObjectId.isValid(warehouseId)) {
      return NextResponse.json({ success: false, message: "Invalid Item ID or Warehouse ID provided." }, { status: 400 });
    }

    // Find the inventory document for the specific item, warehouse, and company
    const inventoryDoc = await Inventory.findOne({
      item: new Types.ObjectId(itemId),
      warehouse: new Types.ObjectId(warehouseId),
      companyId: decoded.companyId, // Filter by companyId
    });

    if (!inventoryDoc) {
      return NextResponse.json({ success: true, data: { batches: [] } }, { status: 200 });
    }

    const batches = (inventoryDoc.batches || []).map(b => ({
      batchNumber: b.batchNumber || '',
      quantity: Number(b.quantity) || 0,
      expiryDate: b.expiryDate || null,
      manufacturer: b.manufacturer || '',
      unitPrice: Number(b.unitPrice) || 0,
    }));

    return NextResponse.json({ success: true, data: { batches } }, { status: 200 });

  } catch (error) {
    console.error("Error fetching inventory batches:", error);
    return NextResponse.json(
      { success: false, message: error.message || "An unexpected error occurred while fetching batches." },
      { status: 500 }
    );
  }
}