import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Warehouse from "@/models/warehouseModels";
import Country from "@/app/api/countries/schema";
import State from "@/app/api/states/schema";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Role-based Access Check
function isAuthorized(user) {
  return     user?.type === "company" || user?.role === "Admin" || user?.permissions?.includes("warehouse");
}

// ✅ Validate Token & Permissions
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
   📥 GET /api/warehouses
======================================== */
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  
  try {
  const warehouses = await Warehouse.find({ companyId: user.companyId })
  .sort({ createdAt: -1 })
  .populate("country", "name") // Only fetch the 'name' field from Country
  .populate("state", "name");  // Only fetch the 'name' field from State

return NextResponse.json({ success: true, data: warehouses }, { status: 200 });

  } catch (err) {
    console.error("GET /warehouses error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch warehouses" }, { status: 500 });
  }
}

/* ========================================
   ✏️ POST /api/warehouses
======================================== */
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const data = await req.json();

    // ✅ Validate Required Fields
     if (!data.warehouseCode || !data.warehouseName || !data.country || !data.state) {
    return new Response(
      JSON.stringify({ success: false, message: "All required fields must be provided" }),
      { status: 400 }
    );
  }

    // ✅ Check for duplicate warehouse code
    const existingWarehouse = await Warehouse.findOne({ code: data.warehouseCode, companyId: user.companyId });
    if (existingWarehouse) {
      return NextResponse.json({ success: false, message: "Warehouse code already exists" }, { status: 400 });
    }

    const newWarehouse = new Warehouse({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await newWarehouse.save();
    return NextResponse.json({ success: true, data: newWarehouse }, { status: 201 });
  } catch (err) {
    console.error("POST /warehouses error:", err);
    return NextResponse.json({ success: false, message: "Failed to create warehouse" }, { status: 500 });
  }
}




// import dbConnect from "@/lib/db";
// import Warehouse from "@/models/warehouseModels";

// // ✅ GET ALL WAREHOUSES
// export async function GET() {
//   try {
//     await dbConnect();
//     const warehouses = await Warehouse.find({});
//     return new Response(JSON.stringify(warehouses), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching warehouses:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching warehouses", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// // ✅ CREATE A NEW WAREHOUSE
// export async function POST(req) {
//   try {
//     await dbConnect();
//     const body = await req.json();
//     const newWarehouse = await Warehouse.create(body);
//     return new Response(JSON.stringify(newWarehouse), {
//       status: 201,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error creating warehouse:", error);
//     return new Response(
//       JSON.stringify({ message: "Error creating warehouse", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
