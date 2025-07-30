import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import State from "./schema";
import Country from "@/app/api/countries/schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Role-based access check
function isAuthorized(user) {
  return (
    user?.type === "company" ||
    user?.role === "Admin" ||
    user?.permissions?.includes("state")
  );
}

// ✅ Validate User Helper
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
   📥 GET /api/states?country=IN
======================================== */
export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const countryParam = url.searchParams.get("country");
    const search = url.searchParams.get("search") || "";

    if (!countryParam) {
      return NextResponse.json({ success: false, message: "Country is required" }, { status: 400 });
    }

    // ✅ Find country by code OR name
    const country = await Country.findOne({
      $or: [{ code: countryParam }, { name: new RegExp(`^${countryParam}$`, "i") }],
    });

    if (!country) {
      return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
    }

    // ✅ Fetch states for the country with optional search filter
    const states = await State.find({
      country: country._id,
      name: { $regex: search, $options: "i" }, // search by name if provided
    }).sort({ name: 1 });

    return NextResponse.json({ success: true, data: states }, { status: 200 });
  } catch (error) {
    console.error("GET /states error:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch states" }, { status: 500 });
  }
}

/* ========================================
   ✏️ POST /api/states
======================================== */
export async function POST(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { name, code, country } = await req.json();

    if (!name || !code || !country) {
      return NextResponse.json({ success: false, message: "Name, code, and country are required" }, { status: 400 });
    }

    // ✅ Find country by code
    const countryDoc = await Country.findOne({ code: country });
    if (!countryDoc) {
      return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
    }

    // ✅ Prevent duplicate state code in the same country
    const existingState = await State.findOne({ code, country: countryDoc._id });
    if (existingState) {
      return NextResponse.json({ success: false, message: "State code already exists for this country" }, { status: 400 });
    }

    // ✅ Create new state
    const newState = new State({
      name,
      code,
      country: countryDoc._id,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await newState.save();
    return NextResponse.json({ success: true, data: newState }, { status: 201 });
  } catch (error) {
    console.error("POST /states error:", error);
    return NextResponse.json({ success: false, message: "Failed to create state" }, { status: 500 });
  }
}

/* ========================================
   ❌ DELETE /api/states?id=123
======================================== */
export async function DELETE(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    const stateId = url.searchParams.get("id");

    if (!stateId) {
      return NextResponse.json({ success: false, message: "State ID is required" }, { status: 400 });
    }

    const deletedState = await State.findByIdAndDelete(stateId);
    if (!deletedState) {
      return NextResponse.json({ success: false, message: "State not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "State deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /states error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete state" }, { status: 500 });
  }
}



// not working part ---------------------------------------------------
// src/app/api/states/route.js

// import { NextResponse } from 'next/server';
// import State from './schema';
// import Country from '../countries/schema';

// export async function GET(req) {
//   const { country } = req.query;
  
//   try {
//     const states = await State.find({ country: country });
//     return NextResponse.json(states);
//   } catch (error) {
//     console.error('Error fetching states:', error);
//     return NextResponse.json({ message: 'Failed to fetch states' }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   const { name, code, country } = await req.json();

//   try {
//     const countryDoc = await Country.findById(country);
//     if (!countryDoc) {
//       return NextResponse.json({ message: 'Country not found' }, { status: 404 });
//     }

//     const newState = new State({ name, code, country: countryDoc._id });
//     await newState.save();

//     return NextResponse.json(newState, { status: 201 });
//   } catch (error) {
//     console.error('Error adding state:', error);
//     return NextResponse.json({ message: 'Failed to add state' }, { status: 500 });
//   }
// }
