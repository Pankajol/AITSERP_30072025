import { NextResponse } from "next/server";
import Item from '@/models/ItemModels'; // Assuming you have an Item model
import connectDB from "@/lib/db"; // Your MongoDB connection utility

export async function GET() {
  try {
    await connectDB();

    // Find the item with the highest item code
    const lastItem = await Item.findOne()
      .sort({ itemCode: -1 })
      .limit(1);

    // Default to "ITEM-0000" if no items exist
    const lastItemCode = lastItem?.itemCode || "ITEM-000";

    return NextResponse.json({ lastItemCode });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch last item code" },
      { status: 500 }
    );
  }
}
