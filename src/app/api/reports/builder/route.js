import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import PurchaseInvoice from "@/models/InvoiceModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Helper to convert frontend filters to $match
function buildMatch(filters, companyId) {
  const match = { companyId };
  if (!filters) return match;
  for (const { field, operator, value } of filters) {
    if (operator === "eq") match[field] = value;
    if (operator === "gte") match[field] = { $gte: value };
    if (operator === "lte") match[field] = { $lte: value };
    // add more operators as needed
  }
  return match;
}

export async function POST(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded?.companyId) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const body = await req.json();
  const { fields, filters, groupBy, aggregations, sort, skip = 0, limit = 100 } = body;

  let pipeline = [];

  // 1. $match
  const match = buildMatch(filters, decoded.companyId);
  if (Object.keys(match).length) pipeline.push({ $match: match });

  // 2. $lookup for supplier name if needed
  const needsSupplier = fields.some(f => f === "supplierName") || groupBy?.includes("supplierName");
  if (needsSupplier) {
    pipeline.push({
      $lookup: { from: "suppliers", localField: "supplier", as: "supplierObj" }
    });
    pipeline.push({ $unwind: { path: "$supplierObj", preserveNullAndEmptyArrays: true } });
    // rename fields
    pipeline.push({
      $addFields: {
        supplierName: "$supplierObj.name",
        supplierCode: "$supplierObj.supplierCode"
      }
    });
  }

  // 3. Grouping + aggregations
  if (groupBy && groupBy.length) {
    const groupId = {};
    groupBy.forEach(g => { groupId[g] = `$${g}`; });
    const groupStage = { _id: groupId };
    for (const agg of aggregations) {
      if (agg.operator === "sum") groupStage[agg.alias] = { $sum: `$${agg.field}` };
      if (agg.operator === "count") groupStage[agg.alias] = { $sum: 1 };
      if (agg.operator === "avg") groupStage[agg.alias] = { $avg: `$${agg.field}` };
    }
    pipeline.push({ $group: groupStage });
    // Flatten _id
    const project = {};
    groupBy.forEach(g => { project[g] = `$_id.${g}`; });
    aggregations.forEach(agg => { project[agg.alias] = 1; });
    pipeline.push({ $project: { ...project, _id: 0 } });
  } else {
    // Just project selected fields
    const project = {};
    fields.forEach(f => { project[f] = 1; });
    pipeline.push({ $project: project });
  }

  // 4. Sorting & pagination
  if (sort && Object.keys(sort).length) pipeline.push({ $sort: sort });
  pipeline.push({ $skip: skip });
  pipeline.push({ $limit: limit });

  const data = await PurchaseInvoice.aggregate(pipeline);
  return NextResponse.json({ data });
}