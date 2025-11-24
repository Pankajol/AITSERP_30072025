import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import SalesOrder from "@/models/SalesOrder";

// Extract simple (non-array, non-nested) fields
function extractBaseFields(schema) {
  const headers = [];
  const sample = [];

  for (const [key, field] of Object.entries(schema.paths)) {
    // Skip internal fields
    if (
      [
        "_id",
        "__v",
        "companyId",
        "createdBy",
        "quotation",
        "orderId",
        "linkedPurchaseOrder",
        "linkedProductionOrder",
        "attachments",
        "items", // items handled separately
        "customer",
        "createdAt",
        "updatedAt",
      ].includes(key)
    ) continue;

    headers.push(key);

    // Sample values based on schema field names
    if (key === "documentNumberOrder") sample.push("SO-1001");
    else if (key === "customerCode") sample.push("CUST-0001");
    else if (key === "customerName") sample.push("John Traders");
    else if (key === "postingDate") sample.push("2025-02-10");
    else if (key === "orderDate") sample.push("2025-02-10");
    else if (key === "expectedDeliveryDate") sample.push("2025-02-15");
    else if (key === "remarks") sample.push("Urgent order");
    else if (key.toLowerCase().includes("address1")) sample.push("Address Line 1");
    else if (key.toLowerCase().includes("address2")) sample.push("Address Line 2");
    else if (key.toLowerCase().includes("city")) sample.push("Mumbai");
    else if (key.toLowerCase().includes("state")) sample.push("Maharashtra");
    else if (key.toLowerCase().includes("zip")) sample.push("400001");
    else if (key.toLowerCase().includes("country")) sample.push("India");
    else if (key === "freight") sample.push("0");
    else if (key === "rounding") sample.push("0");
    else sample.push(""); // default empty
  }

  return { headers, sample };
}

// Extract item fields from ItemSchema
function extractItemFields(itemSchema, itemCount) {
  const headers = [];
  const sample = [];

  const itemFields = Object.keys(itemSchema.paths).filter((field) => {
    return !["_id"].includes(field);
  });

  for (let i = 1; i <= itemCount; i++) {
    itemFields.forEach((field) => {
      // item.itemName → item1_itemName
      const headerName = `item${i}_${field}`;
      headers.push(headerName);

      // add smart sample values
      if (field === "itemCode") sample.push(`ITEM-${i}`);
      else if (field === "itemName") sample.push(`Item ${i} Name`);
      else if (field === "quantity") sample.push("10");
      else if (field === "unitPrice") sample.push("500");
      else if (field === "discount") sample.push("0");
      else if (field === "gstRate") sample.push("18");
      else if (field === "warehouseCode") sample.push(`WH-${i}`);
      else sample.push("");
    });
  }

  return { headers, sample };
}

export async function GET(req) {
  await dbConnect();

  try {
    const url = new URL(req.url);
    const itemCount = Number(url.searchParams.get("items") || 5);

    // Extract base fields from SalesOrder schema
    const { headers: baseHeaders, sample: baseSample } = extractBaseFields(SalesOrder.schema);

    // Extract item fields dynamically
    const itemSchema = SalesOrder.schema.paths.items.schema; // ItemSchema
    const { headers: itemHeaders, sample: itemSample } = extractItemFields(itemSchema, itemCount);

    // Combine headers & sample row
    const allHeaders = [...baseHeaders, ...itemHeaders];
    const allSample = [...baseSample, ...itemSample];

    const csv = [allHeaders.join(","), allSample.join(",")].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="sales_order_template_${itemCount}_items.csv"`,
      },
    });
  } catch (err) {
    console.error("Template Generation Error:", err);
    return NextResponse.json(
      { success: false, message: "Failed to generate sales order template", error: err.message },
      { status: 500 }
    );
  }
}
