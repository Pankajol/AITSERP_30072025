export const runtime = "nodejs";

import dbConnect from "@/lib/db";
import PriceList from "@/models/PriceList";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json(
        { success: false, message: "Token missing" },
        { status: 401 }
      );

    const user = verifyJWT(token);
    if (!user?.companyId)
      return NextResponse.json(
        { success: false, message: "Invalid token" },
        { status: 401 }
      );

    const pl = await PriceList.findOne({
      companyId: user.companyId,
      active: true,
      isDefault: true,
    }).lean();

    return NextResponse.json({ success: true, data: pl || null });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, message: "Failed to fetch default price list" },
      { status: 500 }
    );
  }
}
