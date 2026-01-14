import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';

import "@/models/warehouseModels";
import "@/models/ItemModels";
import "@/models/BOM";

import BOM from '@/models/BOM';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

export async function GET(req) {
  await dbConnect();

  try {
    // ✅ 1. Authentication
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Token missing' },
        { status: 401 }
      );
    }

    const user = await verifyJWT(token);
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // ✅ 2. Extract search and pagination params
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    // ✅ NEW: posOnly flag
    const posOnly = searchParams.get("posOnly") === "true";

    // ✅ NEW: warehouseId filter
    const warehouseId = searchParams.get("warehouseId");

    const skip = (page - 1) * limit;

    // ✅ 3. Build query (Inventory query ONLY)
    const query = { companyId: user.companyId };

    // ✅ add warehouse filter (no flow change)
    if (warehouseId) {
      query.warehouse = warehouseId;
    }

    // ⚠️ DO NOT put item.itemCode search in Inventory query
    // Because Inventory doesn't have itemCode/itemName directly (it's in populated item)

    // ✅ 4. Prepare item populate filter
    const itemMatch = {};

    // ✅ search should go inside item populate match
    if (search) {
      itemMatch.$or = [
        { itemCode: { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
        { "posConfig.barcode": { $regex: search, $options: "i" } },
      ];
    }

    // ✅ posOnly conditions
    if (posOnly) {
      itemMatch.posEnabled = true;
      itemMatch.active = true;
      itemMatch.status = "active";
      itemMatch["posConfig.showInPOS"] = { $ne: false };
    }

    // ✅ 5. Fetch inventory with population
    const inventories = await Inventory.find(query)
      .populate('warehouse', 'warehouseName binLocations bin')
      .populate({
        path: "item",
        select: "itemCode itemName unitPrice gstRate posEnabled posConfig active status",
        match: itemMatch, // ✅ combined match: search + posOnly
      })
      .populate({
        path: 'productNo',
        model: 'BOM',
        populate: {
          path: 'productNo',
          model: 'Item',
          select: 'itemCode itemName',
        },
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ IMPORTANT: item match ke baad item null ho sakta hai
    const filteredInventories =
      (posOnly || search)
        ? inventories.filter((inv) => inv.item)
        : inventories;

    // ✅ 6. Count total documents for pagination
    // For accurate count with search/posOnly, count needs same filter logic.
    let totalRecords = await Inventory.countDocuments(query);

    if (posOnly || search) {
      const allForCount = await Inventory.find(query)
        .populate({
          path: "item",
          select: "_id",
          match: itemMatch,
        })
        .select("_id item")
        .lean();

      totalRecords = allForCount.filter((inv) => inv.item).length;
    }

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: filteredInventories,
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


// import { NextResponse } from 'next/server';
// import dbConnect from '@/lib/db';
// import Inventory from '@/models/Inventory';

// import "@/models/warehouseModels";
// import "@/models/ItemModels";
// import "@/models/BOM";

// import BOM from '@/models/BOM';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// export async function GET(req) {
//   await dbConnect();

//   try {
//     // ✅ 1. Authentication
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, message: 'Unauthorized: Token missing' }, { status: 401 });
//     }

//     const user = await verifyJWT(token);
//     if (!user) {
//       return NextResponse.json({ success: false, message: 'Unauthorized: Invalid token' }, { status: 401 });
//     }

//     // ✅ 2. Extract search and pagination params
//     const { searchParams } = new URL(req.url);

//     const page = parseInt(searchParams.get('page') || '1');
//     const limit = parseInt(searchParams.get('limit') || '20');
//     const search = searchParams.get('search') || '';

//     // ✅ NEW: posOnly flag
//     const posOnly = searchParams.get("posOnly") === "true";

//     const skip = (page - 1) * limit;

//     // ✅ 3. Build query
//     const query = { companyId: user.companyId };

//     // NOTE: existing search logic same
//     if (search) {
//       query.$or = [
//         { 'item.itemCode': { $regex: search, $options: 'i' } },
//         { 'item.itemName': { $regex: search, $options: 'i' } },
//       ];
//     }

//     // ✅ 4. Fetch inventory with population
//     const inventories = await Inventory.find(query)
//       .populate('warehouse', 'warehouseName binLocations bin')

//       // ✅ UPDATED: item populate includes optional POS filtering
//       .populate({
//         path: "item",
//         select: "itemCode itemName unitPrice gstRate posEnabled posConfig active status",
//         match: posOnly
//           ? {
//               posEnabled: true,
//               active: true,
//               status: "active",
//               "posConfig.showInPOS": { $ne: false },
//             }
//           : {},
//       })

//       .populate({
//         path: 'productNo',
//         model: 'BOM',
//         populate: {
//           path: 'productNo',
//           model: 'Item',
//           select: 'itemCode itemName',
//         },
//       })
//       .skip(skip)
//       .limit(limit)
//       .lean();

//     // ✅ IMPORTANT: if posOnly true then remove inventories where item becomes null
//     const filteredInventories = posOnly
//       ? inventories.filter((inv) => inv.item) // item null means not matching pos filter
//       : inventories;

//     // ✅ 5. Count total documents for pagination
//     // Keep logic same for normal flow.
//     // For POS flow, count should reflect filtered results.
//     let totalRecords = await Inventory.countDocuments(query);

//     if (posOnly) {
//       // Accurate count for POS only
//       const allForCount = await Inventory.find(query)
//         .populate({
//           path: "item",
//           select: "_id",
//           match: {
//             posEnabled: true,
//             active: true,
//             status: "active",
//             "posConfig.showInPOS": { $ne: false },
//           },
//         })
//         .select("_id item")
//         .lean();

//       totalRecords = allForCount.filter((inv) => inv.item).length;
//     }

//     const totalPages = Math.ceil(totalRecords / limit);

//     return NextResponse.json({
//       success: true,
//       data: filteredInventories,
//       pagination: { page, limit, totalRecords, totalPages },
//     });
//   } catch (error) {
//     console.error('Error fetching inventory:', error);
//     return NextResponse.json(
//       { success: false, message: 'Server error', error: error.message },
//       { status: 500 }
//     );
//   }
// }





