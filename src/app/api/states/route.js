import { NextResponse } from "next/server";
import connectDb from "@/lib/db";
import State from "./schema";
import Country from "@/app/api/countries/schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

// ✅ Role-based access check
function isAuthorized(user) {
  return (
    user?.type === "company" ||
    user?.role === "Admin" ||
    user?.permissions?.includes("state")
  );
}

function escapeRegExp(str = "") {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// validateUser returns { user, error, status }
async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    if (!isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user, error: null, status: 200 };
  } catch (err) {
    console.error("JWT Verification Failed:", err?.message || err);
    return { error: "Invalid token", status: 401 };
  }
}

/* ========================================
   GET /api/states?country=IN&search=m
   - If country is missing or 'undefined', return all states for company (filtered by search)
   - If country is present, filter by country (code/name/_id)
======================================== */
export async function GET(req) {
  await connectDb();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const url = new URL(req.url);
    let countryParam = url.searchParams.get("country");
    const search = url.searchParams.get("search") || "";

    // Normalize and detect "meaningless" values
    const badValues = ["", "undefined", "null"];
    if (countryParam) countryParam = countryParam.trim();

    // If country is not provided or is a meaningless token, we'll NOT filter by country
    const shouldFilterByCountry =
      countryParam && !badValues.includes(countryParam.toLowerCase());

    let countryId = null;
    if (shouldFilterByCountry) {
      // Try to resolve country to an _id (by _id / code / name)
      const orConditions = [];
      if (mongoose.Types.ObjectId.isValid(countryParam)) {
        orConditions.push({ _id: countryParam });
      }
      orConditions.push({ code: countryParam.toUpperCase() });
      orConditions.push({ name: new RegExp(`^${escapeRegExp(countryParam)}$`, "i") });

      const country = await Country.findOne({
        companyId: user.companyId,
        $or: orConditions,
      });

      if (!country) {
        // If client asked for a specific country but it doesn't exist, return 404
        return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
      }
      countryId = country._id;
    }

    // Build state query
    const stateQuery = {
      companyId: user.companyId,
      name: { $regex: escapeRegExp(search), $options: "i" },
    };

    if (shouldFilterByCountry && countryId) {
      stateQuery.country = countryId;
    }

    // Fetch states
    const states = await State.find(stateQuery).sort({ name: 1 });

    // Helpful debug info (remove or change log level in production)
    // console.info("GET /api/states params:", { countryParam, search, shouldFilterByCountry, resultCount: states.length });

    return NextResponse.json({ success: true, data: states }, { status: 200 });
  } catch (err) {
    console.error("GET /states error:", err);
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

    // ✅ Find country by code AND companyId
    const countryDoc = await Country.findOne({ code: country, companyId: user.companyId });
    if (!countryDoc) {
      return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
    }

    // ✅ Prevent duplicate state code in the same country & same company
    const existingState = await State.findOne({
      code,
      country: countryDoc._id,
      companyId: user.companyId,
    });
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

    const deletedState = await State.findOneAndDelete({
      _id: stateId,
      companyId: user.companyId,
    });

    if (!deletedState) {
      return NextResponse.json({ success: false, message: "State not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "State deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /states error:", error);
    return NextResponse.json({ success: false, message: "Failed to delete state" }, { status: 500 });
  }
}






// import { NextResponse } from "next/server";
// import connectDb from "@/lib/db";
// import State from "./schema";
// import Country from "@/app/api/countries/schema";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ✅ Role-based access check
// function isAuthorized(user) {
//   return (
//     user?.type === "company" ||
//     user?.role === "Admin" ||
//     user?.permissions?.includes("state")
//   );
// }

// // ✅ Validate User Helper
// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch (err) {
//     console.error("JWT Verification Failed:", err.message);
//     return { error: "Invalid token", status: 401 };
//   }
// }

// /* ========================================
//    📥 GET /api/states?country=IN
// ======================================== */
// export async function GET(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const url = new URL(req.url);
//     const countryParam = url.searchParams.get("country");
//     const search = url.searchParams.get("search") || "";

//     if (!countryParam) {
//       return NextResponse.json({ success: false, message: "Country is required" }, { status: 400 });
//     }

//     // ✅ Find country by code or name AND companyId
//     const country = await Country.findOne({
//       companyId: user.companyId,
//       $or: [
//         { code: countryParam.toUpperCase() },
//         { name: new RegExp(`^${countryParam}$`, "i") },
//       ],
//     });

//     if (!country) {
//       return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
//     }

//     // ✅ Fetch states for the country and company with optional search filter
//     const states = await State.find({
//       companyId: user.companyId,
//       country: country._id,
//       name: { $regex: search, $options: "i" },
//     }).sort({ name: 1 });

//     return NextResponse.json({ success: true, data: states }, { status: 200 });
//   } catch (error) {
//     console.error("GET /states error:", error);
//     return NextResponse.json({ success: false, message: "Failed to fetch states" }, { status: 500 });
//   }
// }


// /* ========================================
//    ✏️ POST /api/states
// ======================================== */
// export async function POST(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { name, code, country } = await req.json();

//     if (!name || !code || !country) {
//       return NextResponse.json({ success: false, message: "Name, code, and country are required" }, { status: 400 });
//     }

//     // ✅ Find country by code
//     const countryDoc = await Country.findOne({ code: country });
//     if (!countryDoc) {
//       return NextResponse.json({ success: false, message: "Country not found" }, { status: 404 });
//     }

//     // ✅ Prevent duplicate state code in the same country
//     const existingState = await State.findOne({ code, country: countryDoc._id });
//     if (existingState) {
//       return NextResponse.json({ success: false, message: "State code already exists for this country" }, { status: 400 });
//     }

//     // ✅ Create new state
//     const newState = new State({
//       name,
//       code,
//       country: countryDoc._id,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });

//     await newState.save();
//     return NextResponse.json({ success: true, data: newState }, { status: 201 });
//   } catch (error) {
//     console.error("POST /states error:", error);
//     return NextResponse.json({ success: false, message: "Failed to create state" }, { status: 500 });
//   }
// }

// /* ========================================
//    ❌ DELETE /api/states?id=123
// ======================================== */
// export async function DELETE(req) {
//   await connectDb();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const url = new URL(req.url);
//     const stateId = url.searchParams.get("id");

//     if (!stateId) {
//       return NextResponse.json({ success: false, message: "State ID is required" }, { status: 400 });
//     }

//     const deletedState = await State.findByIdAndDelete(stateId);
//     if (!deletedState) {
//       return NextResponse.json({ success: false, message: "State not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, message: "State deleted successfully" }, { status: 200 });
//   } catch (error) {
//     console.error("DELETE /states error:", error);
//     return NextResponse.json({ success: false, message: "Failed to delete state" }, { status: 500 });
//   }
// }

