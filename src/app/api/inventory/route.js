import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Inventory from '@/models/Inventory';
import "@/models/warehouseModels";
import "@/models/ItemModels";
import "@/models/BOM";
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
import { Types } from 'mongoose';

export async function GET(req) {
  await dbConnect();

  try {
    // ✅ Authentication
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

    // ✅ Parse query parameters
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const posOnly = searchParams.get('posOnly') === 'true';
    const warehouseId = searchParams.get('warehouseId');
    const variantSku = searchParams.get('variantSku'); // NEW: filter by variant SKU

    const skip = (page - 1) * limit;

    // ✅ Build inventory query
    const inventoryQuery = { companyId: user.companyId };
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      inventoryQuery.warehouse = warehouseId;
    }

    // ✅ Prepare item match filter (applied during populate)
    const itemMatch = {};
    if (search) {
      itemMatch.$or = [
        { itemCode: { $regex: search, $options: "i" } },
        { itemName: { $regex: search, $options: "i" } },
        { "posConfig.barcode": { $regex: search, $options: "i" } },
      ];
    }
    if (posOnly) {
      itemMatch.posEnabled = true;
      itemMatch.active = true;
      itemMatch.status = "active";
      itemMatch["posConfig.showInPOS"] = { $ne: false };
    }

    // ✅ Fetch inventories with population
    let inventories = await Inventory.find(inventoryQuery)
      .populate('warehouse', 'warehouseName warehouseCode')
      .populate({
        path: "item",
        select: "itemCode itemName unitPrice gstRate posEnabled posConfig active status variants",
        match: itemMatch,
      })
      .populate({
        path: 'productNo',
        model: 'BOM',
        populate: { path: 'productNo', model: 'Item', select: 'itemCode itemName' }
      })
      .skip(skip)
      .limit(limit)
      .lean();

    // ✅ Filter out records where item was removed by match
    inventories = inventories.filter(inv => inv.item !== null);

    // ✅ If variant SKU is provided, filter inside variantInventory
    if (variantSku) {
      inventories = inventories.map(inv => {
        if (!inv.hasVariants || !inv.variantInventory) return null;
        const matchedVariant = inv.variantInventory.find(v => v.sku === variantSku);
        if (!matchedVariant) return null;
        // Return a copy with only that variant's data
        return {
          ...inv,
          variantInventory: [matchedVariant],
          quantity: matchedVariant.quantity,
          committed: matchedVariant.committed,
          onOrder: matchedVariant.onOrder,
          batches: matchedVariant.batches,
        };
      }).filter(inv => inv !== null);
    }

    // ✅ Count total matching documents for pagination
    let totalRecords = await Inventory.countDocuments(inventoryQuery);
    if (Object.keys(itemMatch).length > 0 || variantSku) {
      // For precise count, we need to count after filtering
      const allIds = await Inventory.find(inventoryQuery).select('_id item').populate({ path: "item", select: "_id", match: itemMatch }).lean();
      let filteredIds = allIds.filter(inv => inv.item !== null);
      if (variantSku) {
        // Further filter by variant SKU existence (simplified: count after mapping)
        const fullInventories = await Inventory.find({ _id: { $in: filteredIds.map(i => i._id) } }).lean();
        filteredIds = fullInventories.filter(inv => inv.variantInventory?.some(v => v.sku === variantSku));
      }
      totalRecords = filteredIds.length;
    }

    const totalPages = Math.ceil(totalRecords / limit);

    return NextResponse.json({
      success: true,
      data: inventories,
      pagination: {
        page,
        limit,
        totalRecords,
        totalPages,
      },
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
//       return NextResponse.json(
//         { success: false, message: 'Unauthorized: Token missing' },
//         { status: 401 }
//       );
//     }

//     const user = await verifyJWT(token);
//     if (!user) {
//       return NextResponse.json(
//         { success: false, message: 'Unauthorized: Invalid token' },
//         { status: 401 }
//       );
//     }

//     // ✅ 2. Extract search and pagination params
//     const { searchParams } = new URL(req.url);

//     const page = parseInt(searchParams.get('page') || '1');
//     const limit = parseInt(searchParams.get('limit') || '20');
//     const search = searchParams.get('search') || '';

//     // ✅ NEW: posOnly flag
//     const posOnly = searchParams.get("posOnly") === "true";

//     // ✅ NEW: warehouseId filter
//     const warehouseId = searchParams.get("warehouseId");

//     const skip = (page - 1) * limit;

//     // ✅ 3. Build query (Inventory query ONLY)
//     const query = { companyId: user.companyId };

//     // ✅ add warehouse filter (no flow change)
//     if (warehouseId) {
//       query.warehouse = warehouseId;
//     }

//     // ⚠️ DO NOT put item.itemCode search in Inventory query
//     // Because Inventory doesn't have itemCode/itemName directly (it's in populated item)

//     // ✅ 4. Prepare item populate filter
//     const itemMatch = {};

//     // ✅ search should go inside item populate match
//     if (search) {
//       itemMatch.$or = [
//         { itemCode: { $regex: search, $options: "i" } },
//         { itemName: { $regex: search, $options: "i" } },
//         { "posConfig.barcode": { $regex: search, $options: "i" } },
//       ];
//     }

//     // ✅ posOnly conditions
//     if (posOnly) {
//       itemMatch.posEnabled = true;
//       itemMatch.active = true;
//       itemMatch.status = "active";
//       itemMatch["posConfig.showInPOS"] = { $ne: false };
//     }

//     // ✅ 5. Fetch inventory with population
//     const inventories = await Inventory.find(query)
//       .populate('warehouse', 'warehouseName binLocations bin')
//       .populate({
//         path: "item",
//         select: "itemCode itemName unitPrice gstRate posEnabled posConfig active status",
//         match: itemMatch, // ✅ combined match: search + posOnly
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

//     // ✅ IMPORTANT: item match ke baad item null ho sakta hai
//     const filteredInventories =
//       (posOnly || search)
//         ? inventories.filter((inv) => inv.item)
//         : inventories;

//     // ✅ 6. Count total documents for pagination
//     // For accurate count with search/posOnly, count needs same filter logic.
//     let totalRecords = await Inventory.countDocuments(query);

//     if (posOnly || search) {
//       const allForCount = await Inventory.find(query)
//         .populate({
//           path: "item",
//           select: "_id",
//           match: itemMatch,
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

