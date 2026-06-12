import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import Company from "@/models/Company";
import ProductReview from "@/models/marketplace/ProductReview";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/** Map DB Item to mobile Product shape (duplicated here to avoid cross-route import issues in Next.js) */
function mapItemToProduct(item) {
  const basePrice = item.salesPrice || 0;
  const baseMrp   = item.mrp || basePrice;

  const variants = (item.variants || []).map((v) => {
    const vPrice    = v.price ?? basePrice;
    const vMrp      = baseMrp;
    const vDiscount = vMrp > vPrice ? Math.round(((vMrp - vPrice) / vMrp) * 100) : 0;
    const attrs     = v.attributes instanceof Map
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
    specifications: (item.qualityCheckDetails || []).map((q) => ({
      key:   q.parameter,
      value: `${q.min || ""}–${q.max || ""}`.replace(/^–$/, ""),
    })),
    variants:    variants.length > 1 ? variants : [],
    variantType: variants.length > 1 ? (item.variantType || "Size") : null,
  };
}

export async function GET(req, { params }) {
  try {
    await dbConnect();
    const resolvedParams = await params;
    const slug = resolvedParams.slug;

    // Resolve companyId from JWT or companySlug param
    let companyId;
    const token = getTokenFromHeader(req);
    if (token) {
      const decoded = verifyJWT(token);
      if (decoded?.companyId) companyId = decoded.companyId;
    }
    if (!companyId) {
      const { searchParams } = new URL(req.url);
      const slugParam = searchParams.get("companySlug");
      if (slugParam) {
        const company = await Company.findOne({ slug: slugParam });
        if (company) companyId = company._id;
      }
    }

    // Find by itemCode (slug) OR by MongoDB _id
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(slug);
    const query = companyId
      ? { companyId, $or: [{ itemCode: slug }, ...(isMongoId ? [{ _id: slug }] : [])] }
      : { $or: [{ itemCode: slug }, ...(isMongoId ? [{ _id: slug }] : [])] };

    const item = await Item.findOne(query).lean();
    if (!item) {
      return NextResponse.json({ message: "Product not found" }, { status: 404 });
    }

    const product = mapItemToProduct(item);

    // Attach real review aggregates
    const reviews = await ProductReview.find({
      productId: item._id,
      status: "approved",
    })
      .select("rating")
      .lean();

    if (reviews.length > 0) {
      const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
      product.avgRating   = Math.round(avg * 10) / 10;
      product.reviewCount = reviews.length;
    }

    // Related products — same category, exclude self
    const related = await Item.find({
      companyId: item.companyId,
      itemGroup: item.itemGroup,
      _id:       { $ne: item._id },
      status:    "active",
    })
      .limit(6)
      .select("itemCode itemName salesPrice mrp images imageUrl itemGroup inStock stockQuantity isFeatured")
      .lean();

    product.relatedProducts = related.map(mapItemToProduct);

    return NextResponse.json({ item: product, product });
  } catch (err) {
    console.error("[mobile/items/:slug GET]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
