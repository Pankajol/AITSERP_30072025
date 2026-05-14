import dbConnect from "@/lib/db";
import Warehouse from "@/models/warehouseModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

// ✅ PATCH - Set warehouse as default
export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const { id } = params;
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 });
    }
    
    const warehouse = await Warehouse.findOne({ 
      _id: id, 
      companyId: decoded.companyId 
    });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    // Remove default from all warehouses in this company
    await Warehouse.updateMany(
      { companyId: decoded.companyId },
      { $set: { isDefault: false } }
    );
    
    // Set the selected warehouse as default
    warehouse.isDefault = true;
    await warehouse.save();
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse,
      message: `${warehouse.warehouseName} is now the default warehouse` 
    });
  } catch (error) {
    console.error("Error setting default warehouse:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error setting default warehouse", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ GET - Get default warehouse
export async function GET(req, { params }) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const defaultWarehouse = await Warehouse.findOne({ 
      companyId: decoded.companyId, 
      isDefault: true,
      status: "Active"
    });
    
    return NextResponse.json({ 
      success: true, 
      data: defaultWarehouse,
      message: defaultWarehouse ? "Default warehouse found" : "No default warehouse set"
    });
  } catch (error) {
    console.error("Error fetching default warehouse:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error fetching default warehouse", 
      details: error.message 
    }, { status: 500 });
  }
}