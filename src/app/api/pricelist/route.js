export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import PriceList from "@/models/PriceList";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

/**
 * 🔹 GET → Fetch all price lists (company wise)
 */
export async function GET(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));

    const lists = await PriceList.find({
      companyId: user.companyId,
      active: true,
    }).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: lists });
  } catch (err) {
    console.error("PRICE LIST GET ERROR", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch price lists" },
      { status: 500 }
    );
  }
}

/**
 * 🔹 POST → Create price list
 */
export async function POST(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    const { name, isDefault, active } = await req.json();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Price list name required" },
        { status: 400 }
      );
    }

    // If new list is default → unset previous default
    if (isDefault) {
      await PriceList.updateMany(
        { companyId: user.companyId, isDefault: true },
        { isDefault: false }
      );
    }

    const list = await PriceList.create({
      companyId: user.companyId,
      name,
      isDefault: !!isDefault,
      active: active !== false,
    });

    return NextResponse.json({ success: true, data: list });
  } catch (err) {
    console.error("PRICE LIST POST ERROR", err);
    return NextResponse.json(
      { success: false, message: "Failed to create price list" },
      { status: 500 }
    );
  }
}

/**
 * 🔹 PATCH → Update price list (set default / activate / rename)
 */
export async function PATCH(req) {
  try {
    await dbConnect();
    const user = verifyJWT(getTokenFromHeader(req));
    const { _id, name, isDefault, active } = await req.json();

    if (!_id) {
      return NextResponse.json(
        { success: false, message: "Price list ID required" },
        { status: 400 }
      );
    }

    if (isDefault) {
      await PriceList.updateMany(
        { companyId: user.companyId },
        { isDefault: false }
      );
    }

    const updated = await PriceList.findOneAndUpdate(
      { _id, companyId: user.companyId },
      {
        ...(name !== undefined && { name }),
        ...(active !== undefined && { active }),
        ...(isDefault !== undefined && { isDefault }),
      },
      { new: true }
    );

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PRICE LIST PATCH ERROR", err);
    return NextResponse.json(
      { success: false, message: "Failed to update price list" },
      { status: 500 }
    );
  }
}
