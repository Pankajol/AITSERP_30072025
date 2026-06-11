import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Item from "@/models/ItemModels";
import Company from "@/models/Company";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req) {
  try {
    await dbConnect();
    let companyId;

    const token = getTokenFromHeader(req);
    if (token) {
      const decoded = verifyJWT(token);
      if (decoded?.companyId) companyId = decoded.companyId;
    }
    if (!companyId) {
      const { searchParams } = new URL(req.url);
      const company = await Company.findOne({ slug: searchParams.get("companySlug") || "pankaj-steel" });
      if (!company) return NextResponse.json({ message: "Company not found" }, { status: 404 });
      companyId = company._id;
    }

    const categories = await Item.distinct("itemGroup", { companyId });
    return NextResponse.json({ categories: categories.filter(Boolean) });
  } catch (err) {
    console.error("[mobile/categories]", err);
    return NextResponse.json({ message: "Server error", error: err.message }, { status: 500 });
  }
}
