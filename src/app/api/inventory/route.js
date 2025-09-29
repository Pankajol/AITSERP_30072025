



import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';


import "@/models/warehouseModels"; // ✅ Import Warehouse schema
import "@/models/ItemModels"; // ✅ Import Item schema
import "@/models/BOM"; // ✅ If needed for productNo population

import BOM from '@/models/BOM';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

export async function GET(req) {
  await dbConnect();

  try {
    // ✅ 1. Authentication
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Token missing' }, { status: 401 });
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // ✅ 2. Extract search and pagination params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // ✅ 3. Build query
    // const query = {};
    const query = { companyId: user.companyId };
    if (search) {
      query.$or = [
        { 'item.itemCode': { $regex: search, $options: 'i' } },
        { 'item.itemName': { $regex: search, $options: 'i' } },
      ];
    }

    // ✅ 4. Fetch inventory with population
    const inventories = await Inventory.find(query)
      .populate('warehouse', 'warehouseName binLocations bin')
      .populate('item', 'itemCode itemName')
  
      .populate({
        path: 'productNo',        // Inventory → BOM
        model: 'BOM',
        populate: {
          path: 'productNo',      // BOM → Item
          model: 'Item',
          select: 'itemCode itemName',
        },
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ 5. Count total documents for pagination
    const totalRecords = await Inventory.countDocuments(query);
    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: inventories,
      pagination: { page, limit, totalRecords, totalPages },
    });
  } catch (error) {
    console.error('Error fetching inventory:', error);
    return NextResponse.json(
      { success: false, message: 'Server error', error: error.message },
      { status: 500 }
    );
  }
}



