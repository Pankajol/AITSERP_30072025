import dbConnect from "@/lib/db";
import Warehouse from "@/models/warehouseModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import mongoose from "mongoose";

// ✅ GET - Fetch warehouses
export async function GET(req) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const warehouseCode = searchParams.get("warehouseCode");
    const getDefault = searchParams.get("getDefault") === "true";
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 100);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "All";
    
    // ✅ Get default warehouse
    if (getDefault) {
      const defaultWarehouse = await Warehouse.findOne({ 
        companyId: decoded.companyId, 
        isDefault: true,
        status: "Active"
      });
      return NextResponse.json({ 
        success: true, 
        data: defaultWarehouse,
        message: defaultWarehouse ? "Default warehouse found" : "No default warehouse set"
      });
    }
    
    // ✅ Get single warehouse by ID
    if (id) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 });
      }
      const warehouse = await Warehouse.findOne({ _id: id, companyId: decoded.companyId });
      if (!warehouse) {
        return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: warehouse });
    }
    
    // ✅ Get single warehouse by Code
    if (warehouseCode) {
      const warehouse = await Warehouse.findOne({ 
        warehouseCode: warehouseCode.toUpperCase(), 
        companyId: decoded.companyId 
      });
      if (!warehouse) {
        return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: warehouse });
    }
    
    // ✅ Build query for list
    const query = { companyId: decoded.companyId };
    if (status !== "All") {
      query.status = status;
    }
    if (search) {
      query.$or = [
        { warehouseCode: { $regex: search, $options: "i" } },
        { warehouseName: { $regex: search, $options: "i" } },
        { city: { $regex: search, $options: "i" } }
      ];
    }
    
    const skip = (page - 1) * limit;
    
    const [warehouses, total] = await Promise.all([
      Warehouse.find(query)
        .sort({ isDefault: -1, warehouseName: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Warehouse.countDocuments(query)
    ]);
    
    return NextResponse.json({
      success: true,
      data: warehouses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error fetching warehouses", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ POST - Create new warehouse
export async function POST(req) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const body = await req.json();
    
    // Check if warehouse code already exists
    const existingWarehouse = await Warehouse.findOne({ 
      warehouseCode: body.warehouseCode?.toUpperCase(),
      companyId: decoded.companyId 
    });
    
    if (existingWarehouse) {
      return NextResponse.json({ 
        success: false, 
        error: "Warehouse code already exists" 
      }, { status: 400 });
    }
    
    // If this warehouse is set as default, unset other defaults
    if (body.isDefault) {
      await Warehouse.updateMany(
        { companyId: decoded.companyId },
        { $set: { isDefault: false } }
      );
    }
    
    const warehouse = await Warehouse.create({
      ...body,
      companyId: decoded.companyId,
      createdBy: decoded.id,
      warehouseCode: body.warehouseCode?.toUpperCase(),
      status: body.status || "Active"
    });
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse, 
      message: "Warehouse created successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error creating warehouse", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ PUT - Update warehouse by ID
export async function PUT(req) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Warehouse ID required" }, { status: 400 });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 });
    }
    
    const updateData = await req.json();
    
    // If setting as default, unset other defaults
    if (updateData.isDefault) {
      await Warehouse.updateMany(
        { companyId: decoded.companyId, _id: { $ne: id } },
        { $set: { isDefault: false } }
      );
    }
    
    const updatedWarehouse = await Warehouse.findOneAndUpdate(
      { _id: id, companyId: decoded.companyId },
      { 
        ...updateData, 
        warehouseCode: updateData.warehouseCode?.toUpperCase(),
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedWarehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: updatedWarehouse, 
      message: "Warehouse updated successfully" 
    });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error updating warehouse", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ PATCH - Set warehouse as default
export async function PATCH(req) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 });
    }
    
    const warehouse = await Warehouse.findOne({ 
      _id: id, 
      companyId: decoded.companyId 
    });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    // Remove default from all warehouses
    await Warehouse.updateMany(
      { companyId: decoded.companyId },
      { $set: { isDefault: false } }
    );
    
    // Set new default
    warehouse.isDefault = true;
    await warehouse.save();
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse,
      message: `${warehouse.warehouseName} is now the default warehouse` 
    });
  } catch (error) {
    console.error("Error setting default warehouse:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error setting default warehouse", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ DELETE - Delete warehouse by ID
export async function DELETE(req) {
  try {
    await dbConnect();
    
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = verifyJWT(token);
    if (!decoded?.companyId) {
      return NextResponse.json({ success: false, error: "Invalid company ID" }, { status: 401 });
    }
    
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ success: false, error: "Warehouse ID required" }, { status: 400 });
    }
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid warehouse ID" }, { status: 400 });
    }
    
    const warehouse = await Warehouse.findOne({ _id: id, companyId: decoded.companyId });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    // Check if it's default warehouse
    if (warehouse.isDefault) {
      return NextResponse.json({ 
        success: false, 
        error: "Cannot delete default warehouse. Please set another warehouse as default first." 
      }, { status: 400 });
    }
    
    await Warehouse.deleteOne({ _id: id, companyId: decoded.companyId });
    
    return NextResponse.json({ 
      success: true, 
      message: "Warehouse deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error deleting warehouse", 
      details: error.message 
    }, { status: 500 });
  }
}


// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Warehouse from "@/models/warehouseModels";
// import Country from "@/app/api/countries/schema";
// import State from "@/app/api/states/schema";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // ✅ Role-based Access Check
// function isAuthorized(user) {
//   if (!user) return false;

//   if (user.type === "company") return true;

//   const allowedRoles = [
//     "admin",
//     "sales manager",
//     "purchase manager",
//     "inventory manager",
//     "accounts manager",
//     "hr manager",
//     "support executive",
//     "production head",
//     "project manager",
//   ];

//   const userRoles = Array.isArray(user.roles)
//     ? user.roles
//     : [];

//   return userRoles.some(role =>
//     allowedRoles.includes(role.trim().toLowerCase())
//   );
// }

// // ✅ Validate Token & Permissions
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
//    📥 GET /api/warehouses
// ======================================== */
// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });
  
//   try {
//   const warehouses = await Warehouse.find({ companyId: user.companyId })
//   .sort({ createdAt: -1 })
//   .populate("country", "name") // Only fetch the 'name' field from Country
//   .populate("state", "name");  // Only fetch the 'name' field from State

// return NextResponse.json({ success: true, data: warehouses }, { status: 200 });

//   } catch (err) {
//     console.error("GET /warehouses error:", err);
//     return NextResponse.json({ success: false, message: "Failed to fetch warehouses" }, { status: 500 });
//   }
// }

// /* ========================================
//    ✏️ POST /api/warehouses
// ======================================== */
// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const data = await req.json();

//     // ✅ Validate Required Fields
//      if (!data.warehouseCode || !data.warehouseName || !data.country || !data.state) {
//     return new Response(
//       JSON.stringify({ success: false, message: "All required fields must be provided" }),
//       { status: 400 }
//     );
//   }

//     // ✅ Check for duplicate warehouse code
//     const existingWarehouse = await Warehouse.findOne({ code: data.warehouseCode, companyId: user.companyId });
//     if (existingWarehouse) {
//       return NextResponse.json({ success: false, message: "Warehouse code already exists" }, { status: 400 });
//     }

//     const newWarehouse = new Warehouse({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });

//     await newWarehouse.save();
//     return NextResponse.json({ success: true, data: newWarehouse }, { status: 201 });
//   } catch (err) {
//     console.error("POST /warehouses error:", err);
//     return NextResponse.json({ success: false, message: "Failed to create warehouse" }, { status: 500 });
//   }
// }




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
