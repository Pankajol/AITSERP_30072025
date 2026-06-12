import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    // Resolve companyId from JWT (authenticated) or companySlug (guest)
    let companyId;
    const token = getTokenFromHeader(req);
    if (token) {
      const decoded = verifyJWT(token);
      if (decoded?.companyId) companyId = decoded.companyId;
    }
    if (!companyId) {
      const slug = searchParams.get("companySlug");
      if (!slug) {
        return NextResponse.json({ message: "companySlug is required" }, { status: 400 });
      }
      const company = await Company.findOne({ slug });
      if (!company) return NextResponse.json({ message: "Company not found" }, { status: 404 });
      companyId = company._id;
    }

    // Filters
    const search   = searchParams.get("search")   || "";
    const category = searchParams.get("category") || "";
    const featured = searchParams.get("featured") === "true";
    const sort     = searchParams.get("sort")     || "newest";
    const page     = Math.max(parseInt(searchParams.get("page"))  || 1, 1);
    const limit    = Math.min(parseInt(searchParams.get("limit")) || 20, 100);

    const query = { companyId, status: "active" };

    if (search) {
      query.$or = [
        { itemName:    { $regex: search, $options: "i" } },
        { itemCode:    { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
    if (category) query.itemGroup = { $regex: category, $options: "i" };
    if (featured)  query.isFeatured = true;

    const sortMap = {
      price_asc:  { salesPrice: 1 },
      price_desc: { salesPrice: -1 },
      newest:     { createdAt: -1 },
      popular:    { isFeatured: -1, createdAt: -1 },
    };
    const sortQuery = sortMap[sort] || { createdAt: -1 };

    const [items, total] = await Promise.all([
      Item.find(query)
        .sort(sortQuery)
        .skip((page - 1) * limit)
        .limit(limit)
        .select(
          "itemCode itemName itemGroup salesPrice mrp imageUrl images description " +
          "inStock stockQuantity isFeatured unit weightPerPiece variants variantType " +
          "qualityCheckDetails tags"
        )
        .lean(),
      Item.countDocuments(query),
    ]);

    const products = items.map((item) => mapItemToProduct(item));

    return NextResponse.json({
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[mobile/items GET]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}

/** Shared mapper — converts a DB Item document to the mobile Product shape */
function mapItemToProduct(item) {
  const basePrice = item.salesPrice || 0;
  const baseMrp   = item.mrp || basePrice;

  // Map DB variants to mobile ProductVariant shape
  const variants = (item.variants || []).map((v) => {
    const vPrice    = v.price ?? basePrice;
    const vMrp      = baseMrp;
    const vDiscount = vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;
    // Convert Map to plain object if needed
    const attrs = v.attributes instanceof Map
      ? Object.fromEntries(v.attributes)
      : v.attributes || {};
    const label = Object.values(attrs)[0] || v.sku || "Default";

    return {
      _id:            v._id,
      label,
      sku:            v.sku || "",
      storePrice:     vPrice,
      mrp:            vMrp,
      discount:       vDiscount,
      stockQty:       v.quantity ?? 0,
      inStock:        (v.quantity ?? 0) > 0,
      weightPerPiece: item.weightPerPiece || null,
      itemCode:       v.sku || item.itemCode,
      images:         v.imageUrl ? [v.imageUrl] : [],
    };
  });

  const discount = baseMrp > basePrice
    ? Math.round(((baseMrp - basePrice) / baseMrp) * 100)
    : 0;

  return {
    _id:            item._id,
    slug:           item.itemCode,
    itemCode:       item.itemCode,
    name:           item.itemName,
    category:       item.itemGroup || "General",
    storePrice:     basePrice,
    mrp:            baseMrp,
    discount,
    images:         item.images?.length ? item.images : (item.imageUrl ? [item.imageUrl] : []),
    description:    item.description || "",
    inStock:        item.inStock !== false,
    stockQty:       item.stockQuantity || 0,
    isFeatured:     item.isFeatured || false,
    unit:           item.unit || "piece",
    weightPerPiece: item.weightPerPiece || null,
    tags:           item.tags || [],
    avgRating:      0,
    reviewCount:    0,
    specifications: (item.qualityCheckDetails || []).map((q) => ({
      key:   q.parameter,
      value: `${q.min || ""}–${q.max || ""}`.replace(/^–$/, ""),
    })),
    // Variants — only expose if item has 2+ variants
    variants:    variants.length > 1 ? variants : [],
    variantType: variants.length > 1 ? (item.variantType || "Size") : null,
  };
}

export { mapItemToProduct };
