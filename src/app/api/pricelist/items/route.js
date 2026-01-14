export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import PriceListItem from "@/models/PriceListItem";
import Item from "@/models/ItemModels"; // ✅ validate POS enabled item
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

function bad(status, message) {
  return NextResponse.json({ success: false, message }, { status });
}

function toNum(v, def = 0) {
  if (v === "" || v === null || v === undefined) return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function parseDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/* =========================================================
   GET
   /api/pricelist/items?priceListId=...&warehouseId=...&search=...
========================================================= */
export async function GET(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized: Token missing");

    const user = verifyJWT(token);
    if (!user?.companyId) return bad(401, "Unauthorized: Invalid token");

    const { searchParams } = new URL(req.url);
    const priceListId = searchParams.get("priceListId");
    const warehouseId = searchParams.get("warehouseId");
    const search = (searchParams.get("search") || "").trim();

    if (!priceListId || !warehouseId) {
      return bad(400, "priceListId & warehouseId required");
    }

    const filter = {
      companyId: user.companyId,
      priceListId,
      warehouseId,
      active: true,
    };

    let query = PriceListItem.find(filter)
      .populate("itemId", "itemName itemCode uom unitPrice posEnabled posConfig active status")
      .sort({ updatedAt: -1 })
      .lean();

    const rows = await query;

    // ✅ optional search (item populated fields)
    const filtered = search
      ? rows.filter((r) => {
          const it = r.itemId;
          if (!it) return false;
          return (
            it.itemName?.toLowerCase().includes(search.toLowerCase()) ||
            it.itemCode?.toLowerCase().includes(search.toLowerCase()) ||
            it.posConfig?.barcode?.toLowerCase().includes(search.toLowerCase())
          );
        })
      : rows;

    return NextResponse.json({ success: true, data: filtered }, { status: 200 });
  } catch (err) {
    console.error("PRICE LIST ITEM GET ERROR:", err);
    return bad(500, "Failed to fetch price list items");
  }
}

/* =========================================================
   POST (UPSERT)
========================================================= */
export async function POST(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized: Token missing");

    const user = verifyJWT(token);
    if (!user?.companyId) return bad(401, "Unauthorized: Invalid token");

    const body = await req.json();

    const {
      priceListId,
      warehouseId,
      itemId,

      sellingPrice,
      gstPercent,

      discountPercent,
      discountAmount,

      validFrom,
      validUpto,

      currency,
      buying,
      selling,
      batchNo,
      leadTimeDays,
      note,
      packingUnit,
      uom,
    } = body;

    if (!priceListId || !warehouseId || !itemId) {
      return bad(400, "Missing required fields: priceListId, warehouseId, itemId");
    }

    // ✅ Ensure item belongs to company and is POS Enabled
    const itemDoc = await Item.findOne({
      _id: itemId,
      companyId: user.companyId,
      active: true,
      status: "active",
      posEnabled: true,
      "posConfig.showInPOS": { $ne: false },
    }).select("_id posConfig").lean();

    if (!itemDoc) return bad(400, "Item is not valid for POS");

    const sp = toNum(sellingPrice, -1);
    if (sp <= 0) return bad(400, "sellingPrice must be greater than 0");

    const gp = toNum(gstPercent, 18);
    if (gp < 0 || gp > 100) return bad(400, "gstPercent must be 0-100");

    const dp = toNum(discountPercent, 0);
    if (dp < 0 || dp > 100) return bad(400, "discountPercent must be 0-100");

    const da = toNum(discountAmount, 0);
    if (da < 0) return bad(400, "discountAmount cannot be negative");

    // ✅ discount allowed check (POS item config)
    if (itemDoc?.posConfig?.allowDiscount === false && (dp > 0 || da > 0)) {
      return bad(400, "Discount not allowed for this item");
    }

    // ✅ final price validate
    let final = sp;
    if (dp > 0) final -= (final * dp) / 100;
    if (da > 0) final -= da;
    if (final <= 0) return bad(400, "Final price cannot be 0");

    // ✅ max discount validation
    const maxDisc = toNum(itemDoc?.posConfig?.maxDiscountPercent, 100);
    if (dp > maxDisc) return bad(400, `Discount % cannot exceed ${maxDisc}`);

    // ✅ date validation
    const vf = parseDate(validFrom);
    const vu = parseDate(validUpto);
    if (validFrom && !vf) return bad(400, "validFrom invalid date");
    if (validUpto && !vu) return bad(400, "validUpto invalid date");
    if (vf && vu && vu < vf) return bad(400, "validUpto cannot be before validFrom");

    const doc = await PriceListItem.findOneAndUpdate(
      {
        companyId: user.companyId,
        priceListId,
        warehouseId,
        itemId,
      },
      {
        sellingPrice: sp,
        gstPercent: gp,

        discountPercent: dp,
        discountAmount: da,

        validFrom: vf || undefined,
        validUpto: vu || undefined,

        currency: currency || "INR",
        buying: !!buying,
        selling: selling === undefined ? true : !!selling,
        batchNo: batchNo || "",
        leadTimeDays: toNum(leadTimeDays, 0),
        note: note || "",
        packingUnit: toNum(packingUnit, 0),
        uom: uom || "",

        active: true,
      },
      { upsert: true, new: true }
    );

    return NextResponse.json({ success: true, data: doc }, { status: 200 });
  } catch (err) {
    console.error("PRICE LIST ITEM POST ERROR:", err);

    if (err?.code === 11000) {
      return bad(409, "Duplicate already exists for same item + warehouse");
    }

    return bad(500, "Failed to save price");
  }
}

/* =========================================================
   PATCH
   Body: { _id, active } OR { _id, sellingPrice, gstPercent, ... }
========================================================= */
export async function PATCH(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized: Token missing");

    const user = verifyJWT(token);
    if (!user?.companyId) return bad(401, "Unauthorized: Invalid token");

    const body = await req.json();
    const { _id } = body;

    if (!_id) return bad(400, "_id required");

    // ✅ Only allow updating within same company
    const updated = await PriceListItem.findOneAndUpdate(
      { _id, companyId: user.companyId },
      { $set: { ...body } },
      { new: true }
    );

    if (!updated) return bad(404, "PriceList item not found");

    return NextResponse.json({ success: true, data: updated }, { status: 200 });
  } catch (err) {
    console.error("PRICE LIST ITEM PATCH ERROR:", err);
    return bad(500, "Failed to update price list item");
  }
}

/* =========================================================
   DELETE
   /api/pricelist/items?_id=...
========================================================= */
export async function DELETE(req) {
  try {
    await dbConnect();

    const token = getTokenFromHeader(req);
    if (!token) return bad(401, "Unauthorized: Token missing");

    const user = verifyJWT(token);
    if (!user?.companyId) return bad(401, "Unauthorized: Invalid token");

    const { searchParams } = new URL(req.url);
    const _id = searchParams.get("_id");

    if (!_id) return bad(400, "_id required");

    const del = await PriceListItem.deleteOne({
      _id,
      companyId: user.companyId,
    });

    if (!del?.deletedCount) return bad(404, "Price list item not found");

    return NextResponse.json({ success: true, message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("PRICE LIST ITEM DELETE ERROR:", err);
    return bad(500, "Failed to delete price list item");
  }
}




// export const runtime = "nodejs";

// import dbConnect from "@/lib/db";
// import PriceListItem from "@/models/PriceListItem";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import { NextResponse } from "next/server";

// /* =========================
//    GET → Fetch price list items (warehouse wise)
// ========================= */
// export async function GET(req) {
//   try {
//     await dbConnect();
//     const user = verifyJWT(getTokenFromHeader(req));

//     const { searchParams } = new URL(req.url);
//     const priceListId = searchParams.get("priceListId");
//     const warehouseId = searchParams.get("warehouseId");

//     if (!priceListId || !warehouseId) {
//       return NextResponse.json(
//         { success: false, message: "priceListId & warehouseId required" },
//         { status: 400 }
//       );
//     }

//     const items = await PriceListItem.find({
//       companyId: user.companyId,
//       priceListId,
//       warehouseId,
//       active: true,
//     })
//       .populate("itemId", "itemName itemCode")
//       .lean();

//     return NextResponse.json({ success: true, data: items });
//   } catch (err) {
//     console.error("PRICE LIST ITEM GET ERROR:", err);
//     return NextResponse.json(
//       { success: false, message: "Failed to fetch price list items" },
//       { status: 500 }
//     );
//   }
// }

// /* =========================
//    POST → Create / Update price
// ========================= */
// export async function POST(req) {
//   try {
//     await dbConnect();
//     const user = verifyJWT(getTokenFromHeader(req));

//     const {
//       priceListId,
//       warehouseId,
//       itemId,
//       sellingPrice,
//       gstPercent,
//     } = await req.json();

//     if (!priceListId || !warehouseId || !itemId) {
//       return NextResponse.json(
//         { success: false, message: "Missing required fields" },
//         { status: 400 }
//       );
//     }

//     const item = await PriceListItem.findOneAndUpdate(
//       {
//         companyId: user.companyId,
//         priceListId,
//         warehouseId,
//         itemId,
//       },
//       {
//         sellingPrice,
//         gstPercent: gstPercent ?? 18,
//         active: true,
//       },
//       { upsert: true, new: true }
//     );

//     return NextResponse.json({ success: true, data: item });
//   } catch (err) {
//     console.error("PRICE LIST ITEM POST ERROR:", err);
//     return NextResponse.json(
//       { success: false, message: "Failed to save price" },
//       { status: 500 }
//     );
//   }
// }
