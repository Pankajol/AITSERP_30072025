import { NextResponse } from "next/server";
import Item from "@/models/ItemModels";
import dbConnect from "@/lib/db";

// 🧠 Function to extract CSV headers and sample data from schema
function extractTemplateFromModel(schema) {
  const headers = [];
  const sample = [];

  for (const [key, field] of Object.entries(schema.paths)) {
    // Exclude internal fields
    if (["_id", "__v", "companyId", "createdBy", "itemCode", "createdAt", "updatedAt"].includes(key)) continue;

    headers.push(key);

    // Example sample values
    if (key === "itemName") sample.push("Cement Bag");
    else if (key === "category") sample.push("Construction");
    else if (key === "unitPrice") sample.push("350.00");
    else if (key === "hsnCode") sample.push("2523");
    else if (key === "gstRate") sample.push("18");
    else if (key === "unitOfMeasure") sample.push("BAG");
    else if (key === "status") sample.push("active");
    else if (key === "description") sample.push("High-quality cement bag for building.");
    else sample.push("");
  }

  return { headers, sample };
}

export async function GET() {
  await dbConnect();

  try {
    const { headers, sample } = extractTemplateFromModel(Item.schema);

    const csvContent = [headers.join(","), sample.join(",")].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=item_bulk_upload_template.csv",
      },
    });
  } catch (err) {
    console.error("Error generating template:", err);
    return NextResponse.json(
      { success: false, message: "Failed to generate template" },
      { status: 500 }
    );
  }
}
