import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Country from "./schema"; // ✅ Ensure correct model path
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Role-based access check
function isAuthorized(user) {
  return (
    user?.type === "company" ||
    user?.role === "Admin" ||
    user?.permissions?.includes("country")
  );
}

// ✅ Validate token & permissions
async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch (err) {
    console.error("JWT Verification Failed:", err.message);
    return { error: "Invalid token", status: 401 };
  }
}

/* ========================================
   📥 GET /api/countries?search=India
======================================== */
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    // ✅ Extract search query from URL
    const searchParams = req.nextUrl.searchParams;
    const search = searchParams.get("search");

    // ✅ Build query
    const query = { companyId: user.companyId };
    if (search && search.trim()) {
      query.name = { $regex: search.trim(), $options: "i" }; // Case-insensitive
    }

    // ✅ Fetch countries
    const countries = await Country.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: countries }, { status: 200 });
  } catch (err) {
    console.error("GET /countries error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch countries" }, { status: 500 });
  }
}

/* ========================================
   ✏️ POST /api/countries
======================================== */
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();

    if (!data.name || !data.code) {
      return NextResponse.json({ success: false, message: "Name and Code are required" }, { status: 400 });
    }

    // ✅ Prevent duplicate country for the same company
    const existingCountry = await Country.findOne({ code: data.code, companyId: user.companyId });
    if (existingCountry) {
      return NextResponse.json({ success: false, message: "Country code already exists" }, { status: 400 });
    }

    const country = new Country({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await country.save();
    return NextResponse.json({ success: true, message: "Country created successfully", data: country }, { status: 201 });
  } catch (err) {
    console.error("POST /countries error:", err);
    return NextResponse.json({ success: false, message: "Failed to create country" }, { status: 500 });
  }
}

/* ========================================
   🗑️ DELETE /api/countries?id=countryId
======================================== */
export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ success: false, message: "Country ID required" }, { status: 400 });

    const deletedCountry = await Country.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deletedCountry) {
      return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Country deleted successfully" }, { status: 200 });
  } catch (err) {
    console.error("DELETE /countries error:", err);
    return NextResponse.json({ success: false, message: "Failed to delete country" }, { status: 500 });
  }
}
