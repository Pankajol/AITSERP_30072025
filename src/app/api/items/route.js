import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Role-based access (unchanged)
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "sales manager", "purchase manager", "inventory manager",
    "accounts manager", "hr manager", "support executive",
    "production head", "project manager",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const stats = searchParams.get("stats") === "true";
    const posOnly = searchParams.get("posOnly") === "true";
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const itemType = searchParams.get("itemType");

    // 1) Fetch single item for editing (full data)
    if (id) {
      const item = await Item.findOne({ _id: id, companyId: user.companyId }).lean();
      if (!item) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: item });
    }

    // 2) Stats endpoint (accurate totals)
    if (stats) {
      const aggregation = await Item.aggregate([
        { $match: { companyId: user.companyId } },
        { $group: { _id: "$itemType", count: { $sum: 1 } } }
      ]);
      const result = { total: 0, product: 0, service: 0, rawMat: 0 };
      aggregation.forEach(s => {
        if (s._id === "Product") result.product = s.count;
        else if (s._id === "Service") result.service = s.count;
        else if (s._id === "Raw Material") result.rawMat = s.count;
        result.total += s.count;
      });
      return NextResponse.json({ success: true, data: result });
    }

    // 3) POS only (unchanged)
    if (posOnly) {
      const items = await Item.find({
        companyId: user.companyId,
        posEnabled: true,
        active: true,
        status: "active",
        "posConfig.showInPOS": { $ne: false },
      }).sort({ createdAt: -1 }).lean();
      return NextResponse.json({ success: true, data: items });
    }

    // 4) Paginated list – now includes tax fields
    const query = { companyId: user.companyId };
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { itemCode: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }
    if (itemType && itemType !== "All") {
      query.itemType = itemType;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Item.find(query)
        .select("itemCode itemName category imageUrl itemType unitPrice uom status posEnabled imageUrl manufacturer variants createdAt includeGST includeIGST gstCode gstName gstRate cgstRate sgstRate igstCode igstName igstRate")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Item.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: items,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();
    const required = ["itemCode", "itemName", "category", "unitPrice", "quantity"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const existing = await Item.findOne({ itemCode: data.itemCode, companyId: user.companyId });
    if (existing) {
      return NextResponse.json({ success: false, message: "Item Code already exists" }, { status: 400 });
    }

    const item = new Item({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await item.save();
    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create item" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const id = params?.id || new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const updated = await Item.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data, updatedBy: user.id },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const id = params?.id || new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Item.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Item from "@/models/ItemModels";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ✅ Role-based access for item management
// function isAuthorized(user) {
//   if (!user) return false;

//   if (user.type === "company") return true;

//   const allowedRoles = [
//     "admin",
//     "sales manager",
//     "purchase manager",
//     "inventory manager",
//     "accounts manager",
//     "hr manager",
//     "support executive",
//     "production head",
//     "project manager",
//   ];

//   const userRoles = Array.isArray(user.roles)
//     ? user.roles
//     : [];

//   return userRoles.some(role =>
//     allowedRoles.includes(role.trim().toLowerCase())
//   );
// }

// // ✅ Validate user token & permissions
// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch (err) {
//     console.error("JWT Verification Failed:", err.message);
//     return { error: "Invalid token", status: 401 };
//   }
// }

// /* ========================================
//    📥 GET /api/item
// ======================================== */
// export async function GET(req) {
//   await dbConnect();

//   const { user, error, status } = await validateUser(req);
//   if (error)
//     return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const posOnly = searchParams.get("posOnly") === "true";

//     // ✅ Old logic as it is
//     const query = { companyId: user.companyId };

//     // ✅ Only when posOnly=true (POS items only)
//     if (posOnly) {
//       query.posEnabled = true;
//       query.active = true;
//       query.status = "active";
//       query["posConfig.showInPOS"] = { $ne: false };
//     }

//     const items = await Item.find(query).sort({ createdAt: -1 });

//     return NextResponse.json({ success: true, data: items }, { status: 200 });
//   } catch (err) {
//     console.error("GET /item error:", err);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch items" },
//       { status: 500 }
//     );
//   }
// }


// /* ========================================
//    ✏️ POST /api/item
// ======================================== */
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const data = await req.json();

//     // ✅ Validate required fields
//     const requiredFields = ["itemCode", "itemName", "category", "unitPrice", "quantity"];
//     for (let field of requiredFields) {
//       if (!data[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }

//     // ✅ Prevent duplicate itemCode within the company
//     const existingItem = await Item.findOne({
//       itemCode: data.itemCode,
//       companyId: user.companyId,
//     });
//     if (existingItem) {
//       return NextResponse.json({ success: false, message: "Item Code already exists" }, { status: 400 });
//     }

//     // ✅ Save item
//     const item = new Item({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });

//     await item.save();
//     return NextResponse.json({ success: true, data: item }, { status: 201 });
//   } catch (err) {
//     console.error("POST /item error:", err);
//     return NextResponse.json({ success: false, message: "Failed to create item" }, { status: 500 });
//   }
// }



