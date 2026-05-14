import dbConnect from "@/lib/db";
import Operator from "@/models/ppc/operatorModel";
import { NextResponse } from "next/server";

// ✅ Generate next operator code
async function generateOperatorCode() {
  const count = await Operator.countDocuments();
  const next = count + 1;
  return `OPR${String(next).padStart(3, "0")}`;
}

// ✅ GET (List or Search)
export async function GET(req) {
  try {
    await dbConnect();

    const { searchParams } = new URL(req.url);
    const searchQuery = searchParams.get("searchQuery") || "";

    const query = searchQuery
      ? {
          $or: [
            { name: { $regex: searchQuery, $options: "i" } },
            { operatorCode: { $regex: searchQuery, $options: "i" } },
          ],
        }
      : {};

    const operators = await Operator.find(query)
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, data: operators }, { status: 200 });
  } catch (err) {
    console.error("Error fetching operators:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ POST (Create)
export async function POST(req) {
  try {
    await dbConnect();
    const body = await req.json();

    // Auto-generate operator code if not provided
    if (!body.operatorCode) {
      body.operatorCode = await generateOperatorCode();
    }

    // Prevent duplicate operatorCode
    const existing = await Operator.findOne({ operatorCode: body.operatorCode });
    if (existing) {
      return NextResponse.json(
        { success: false, message: "Operator code already exists." },
        { status: 400 }
      );
    }

    const operator = await Operator.create(body);
    return NextResponse.json(
      { success: true, data: operator, message: "Operator created successfully!" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating operator:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}
