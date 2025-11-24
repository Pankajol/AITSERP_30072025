import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req) {
  await dbConnect();

  try {
    // ✅ 1️⃣ Authenticate user
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );

    const decoded = verifyJWT(token);
    const companyId = decoded.companyId;
    const createdBy = decoded.userId;

    // ✅ 2️⃣ Parse body
    const { items } = await req.json();
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Invalid or empty items array" },
        { status: 400 }
      );
    }

    const results = [];
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // ✅ 3️⃣ Get last item for auto-code generation
    const lastItem = await Item.findOne({ companyId }).sort({ createdAt: -1 });
    let nextCodeNumber = lastItem
      ? parseInt(lastItem.itemCode?.split("-")[1] || "0", 10) + 1
      : 1;

    // ✅ 4️⃣ Loop over each row
    for (let i = 0; i < items.length; i++) {
      const row = items[i];
      const errors = [];

      // Validation
      if (!row.itemName) errors.push("itemName missing");
      if (!row.category) errors.push("category missing");
      if (!row.unitPrice) errors.push("unitPrice missing");

      if (row.unitPrice && isNaN(parseFloat(row.unitPrice))) {
        errors.push("unitPrice must be a number");
      }
      if (row.gstRate && isNaN(parseFloat(row.gstRate))) {
        errors.push("gstRate must be numeric");
      }

      const validStatus = ["active", "inactive"];
      if (row.status && !validStatus.includes(row.status.toLowerCase())) {
        errors.push("status must be 'active' or 'inactive'");
      }

      if (errors.length > 0) {
        skippedCount++;
        results.push({ row: i + 1, success: false, errors });
        continue;
      }

      // ✅ Check if item already exists (by name or code)
      const existingItem = await Item.findOne({
        companyId,
        $or: [{ itemName: row.itemName }, { itemCode: row.itemCode }],
      });

      // ✅ Build common data
      const itemData = {
        companyId,
        createdBy,
        itemName: row.itemName,
        category: row.category,
        unitPrice: parseFloat(row.unitPrice),
        hsnCode: row.hsnCode || "",
        gstRate: row.gstRate ? parseFloat(row.gstRate) : 0,
        unitOfMeasure: row.unitOfMeasure || "NOS",
        status: row.status?.toLowerCase() || "active",
        description: row.description || "",
      };

      if (existingItem) {
        // ✅ Update existing item
        Object.assign(existingItem, itemData);
        await existingItem.save();
        updatedCount++;
        results.push({
          row: i + 1,
          success: true,
          action: "updated",
        });
      } else {
        // ✅ Create new item with auto code
        const itemCode = `ITEM-${nextCodeNumber.toString().padStart(4, "0")}`;
        nextCodeNumber++;
        itemData.itemCode = itemCode;

        await Item.create(itemData);
        createdCount++;
        results.push({
          row: i + 1,
          success: true,
          action: "created",
        });
      }
    }

    // ✅ 5️⃣ Build summary response
    const message = `Bulk upload complete: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`;

    return NextResponse.json({
      success: true,
      message,
      results,
    });
  } catch (err) {
    console.error("Item Bulk Upload Error:", err);
    return NextResponse.json(
      { success: false, message: "Server error", error: err.message },
      { status: 500 }
    );
  }
}




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import Item from "@/models/ItemModels"; // ✅ your item schema file
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req) {
//   await dbConnect();

//   try {
//     // ✅ 1️⃣ Get JWT token
//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json(
//         { success: false, message: "Unauthorized" },
//         { status: 401 }
//       );

//     const decoded = verifyJWT(token);
//     const companyId = decoded.companyId;
//     const createdBy = decoded.userId;

//     // ✅ 2️⃣ Parse request body
//     const { items } = await req.json();
//     if (!Array.isArray(items) || items.length === 0) {
//       return NextResponse.json(
//         { success: false, message: "Invalid or empty items array" },
//         { status: 400 }
//       );
//     }

//     const results = [];

//     // ✅ 3️⃣ Find the last item for auto-code generation
//     const lastItem = await Item.findOne({ companyId }).sort({ createdAt: -1 });
//     let nextCodeNumber = lastItem
//       ? parseInt(lastItem.itemCode?.split("-")[1] || "0", 10) + 1
//       : 1;

//     // ✅ 4️⃣ Loop through all uploaded items
//     for (let i = 0; i < items.length; i++) {
//       const row = items[i];
//       let errors = [];

//       // ✅ Validation: Required fields
//       if (!row.itemName) errors.push("itemName missing");
//       if (!row.category) errors.push("category missing");
//       if (!row.unitPrice) errors.push("unitPrice missing");

//       // ✅ Validate numeric price
//       if (row.unitPrice && isNaN(parseFloat(row.unitPrice))) {
//         errors.push("unitPrice must be a number");
//       }

//       // ✅ Validate GST rate (if given)
//       if (row.gstRate && isNaN(parseFloat(row.gstRate))) {
//         errors.push("gstRate must be numeric");
//       }

//       // ✅ Validate status
//       const validStatus = ["active", "inactive"];
//       if (row.status && !validStatus.includes(row.status.toLowerCase())) {
//         errors.push("status must be 'active' or 'inactive'");
//       }

//       if (errors.length > 0) {
//         results.push({ row: i + 1, success: false, errors });
//         continue;
//       }

//       // ✅ Auto-generate item code
//       const itemCode = `ITEM-${nextCodeNumber
//         .toString()
//         .padStart(4, "0")}`;
//       nextCodeNumber++;

//       // ✅ Build item data
//       const itemData = {
//         companyId,
//         createdBy,
//         itemCode,
//         itemName: row.itemName,
//         category: row.category,
//         unitPrice: parseFloat(row.unitPrice),
//         hsnCode: row.hsnCode || "",
//         gstRate: row.gstRate ? parseFloat(row.gstRate) : null,
//         unitOfMeasure: row.unitOfMeasure || "NOS",
//         status: row.status?.toLowerCase() || "active",
//         description: row.description || "",
//       };

//       try {
//         await Item.create(itemData);
//         results.push({ row: i + 1, success: true });
//       } catch (err) {
//         results.push({
//           row: i + 1,
//           success: false,
//           errors: [err.message],
//         });
//       }
//     }

//     // ✅ 5️⃣ Return response with summary
//     return NextResponse.json({
//       success: true,
//       message: "Bulk upload complete",
//       results,
//     });
//   } catch (err) {
//     console.error("Item Bulk Upload Error:", err);
//     return NextResponse.json(
//       { success: false, message: "Server error", error: err.message },
//       { status: 500 }
//     );
//   }
// }
