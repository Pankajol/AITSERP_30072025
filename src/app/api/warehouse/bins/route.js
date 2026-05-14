import dbConnect from "@/lib/db";
import Warehouse from "@/models/warehouseModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ GET - Get all bins for a warehouse
export async function GET(req, { params }) {
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
    
    const { warehouseCode } = params;
    
    const warehouse = await Warehouse.findOne({ 
      warehouseCode: warehouseCode.toUpperCase(),
      companyId: decoded.companyId 
    });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse.binLocations || [] 
    });
  } catch (error) {
    console.error("Error fetching bins:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error fetching bins", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ POST - Add bin to warehouse
export async function POST(req, { params }) {
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
    
    const { warehouseCode } = params;
    const binData = await req.json();
    
    const warehouse = await Warehouse.findOne({ 
      warehouseCode: warehouseCode.toUpperCase(),
      companyId: decoded.companyId 
    });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    // Check if bin code already exists
    const binExists = warehouse.binLocations.some(bin => bin.code === binData.code);
    if (binExists) {
      return NextResponse.json({ 
        success: false, 
        error: "Bin code already exists in this warehouse" 
      }, { status: 400 });
    }
    
    warehouse.binLocations.push(binData);
    await warehouse.save();
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse.binLocations,
      message: "Bin added successfully" 
    }, { status: 201 });
  } catch (error) {
    console.error("Error adding bin:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error adding bin", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ PUT - Update bin in warehouse
export async function PUT(req, { params }) {
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
    
    const { warehouseCode } = params;
    const { searchParams } = new URL(req.url);
    const binId = searchParams.get("binId");
    const binData = await req.json();
    
    if (!binId) {
      return NextResponse.json({ success: false, error: "Bin ID required" }, { status: 400 });
    }
    
    const warehouse = await Warehouse.findOne({ 
      warehouseCode: warehouseCode.toUpperCase(),
      companyId: decoded.companyId 
    });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    const binIndex = warehouse.binLocations.findIndex(b => b._id.toString() === binId);
    if (binIndex === -1) {
      return NextResponse.json({ success: false, error: "Bin not found" }, { status: 404 });
    }
    
    warehouse.binLocations[binIndex] = { ...warehouse.binLocations[binIndex].toObject(), ...binData };
    await warehouse.save();
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse.binLocations,
      message: "Bin updated successfully" 
    });
  } catch (error) {
    console.error("Error updating bin:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error updating bin", 
      details: error.message 
    }, { status: 500 });
  }
}

// ✅ DELETE - Remove bin from warehouse
export async function DELETE(req, { params }) {
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
    
    const { warehouseCode } = params;
    const { searchParams } = new URL(req.url);
    const binId = searchParams.get("binId");
    
    if (!binId) {
      return NextResponse.json({ success: false, error: "Bin ID required" }, { status: 400 });
    }
    
    const warehouse = await Warehouse.findOne({ 
      warehouseCode: warehouseCode.toUpperCase(),
      companyId: decoded.companyId 
    });
    
    if (!warehouse) {
      return NextResponse.json({ success: false, error: "Warehouse not found" }, { status: 404 });
    }
    
    warehouse.binLocations = warehouse.binLocations.filter(b => b._id.toString() !== binId);
    await warehouse.save();
    
    return NextResponse.json({ 
      success: true, 
      data: warehouse.binLocations,
      message: "Bin deleted successfully" 
    });
  } catch (error) {
    console.error("Error deleting bin:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Error deleting bin", 
      details: error.message 
    }, { status: 500 });
  }
}




// // POST /api/warehouse/[warehouseCode]/bins
// import Warehouse from "@/models/warehouseModels";
// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function POST(req, { params }) {
//   await dbConnect();

//   try {
//     // 1️⃣ Authenticate
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Unauthorized: No token provided" }),
//         { status: 401 }
//       );
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Unauthorized: Invalid token" }),
//         { status: 401 }
//       );
//     }

//     // 2️⃣ Get warehouseCode from URL
//     const { warehouseCode } = params;

//     if (!warehouseCode) {
//       return new Response(
//         JSON.stringify({ success: false, message: "warehouseCode is required" }),
//         { status: 400 }
//       );
//     }

//     // 3️⃣ Find warehouse by code
//     const warehouse = await Warehouse.findOne({ warehouseCode });
//     if (!warehouse) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Warehouse not found" }),
//         { status: 404 }
//       );
//     }

//     // 4️⃣ Parse body
//     const body = await req.json();
//     const { code, aisle, rack, bin, maxCapacity } = body;

//     if (!code || !bin) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Bin 'code' and 'bin' are required" }),
//         { status: 400 }
//       );
//     }

//     // 5️⃣ Prevent duplicate bin code
//     const duplicate = warehouse.binLocations.find((b) => b.code === code);
//     if (duplicate) {
//       return new Response(
//         JSON.stringify({ success: false, message: `Bin code '${code}' already exists` }),
//         { status: 400 }
//       );
//     }

//     // 6️⃣ Add bin
//     warehouse.binLocations.push({
//       code,
//       aisle: aisle || "",
//       rack: rack || "",
//       bin,
//       maxCapacity: maxCapacity ? Number(maxCapacity) : 0,
//     });

//     await warehouse.save();

//     return new Response(
//       JSON.stringify({ success: true, data: warehouse }),
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("❌ Error adding bin:", err);
//     return new Response(
//       JSON.stringify({ success: false, message: err.message }),
//       { status: 500 }
//     );
//   }
// }

// // GET /api/warehouse/[warehouseCode]/bins
// export async function GET(req, { params }) {
//   await dbConnect();

//   try {
//     const { warehouseCode } = params;

//     if (!warehouseCode) {
//       return new Response(
//         JSON.stringify({ success: false, message: "warehouseCode is required" }),
//         { status: 400 }
//       );
//     }

//     const warehouse = await Warehouse.findOne({ warehouseCode });
//     if (!warehouse) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Warehouse not found" }),
//         { status: 404 }
//       );
//     }

//     // Return the bins array
//     const bins = warehouse.binLocations || [];

//     return new Response(
//       JSON.stringify({ success: true, data: bins }),
//       { status: 200 }
//     );
//   } catch (err) {
//     console.error("❌ Error fetching bins:", err);
//     return new Response(
//       JSON.stringify({ success: false, message: err.message }),
//       { status: 500 }
//     );
//   }
// }



// // POST /api/warehouse/[warehouseCode]/bins
// import Warehouse from "@/models/warehouseModels";
// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import mongoose from "mongoose";

// export async function POST(req, context) {
//   await dbConnect();

//   try {
//     // 1️⃣ Authenticate
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Unauthorized: No token provided" }),
//         { status: 401 }
//       );
//     }

//     const decoded = verifyJWT(token);
//     if (!decoded) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Unauthorized: Invalid token" }),
//         { status: 401 }
//       );
//     }

//     // 2️⃣ Params (folder is [warehouseCode], but actually you are sending _id here)
//     const { warehouseCode } = await context.params;
//     console.log("Incoming warehouseCode (actually _id):", warehouseCode);

//     if (!mongoose.Types.ObjectId.isValid(warehouseCode)) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Invalid warehouse ID" }),
//         { status: 400 }
//       );
//     }

//     const warehouse = await Warehouse.findById(warehouseCode);
//     if (!warehouse) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Warehouse not found" }),
//         { status: 404 }
//       );
//     }

//     // 3️⃣ Parse body
//     const body = await req.json();
//     console.log("Request body:", body);

//     const { code, aisle, rack, bin, maxCapacity } = body;

//     if (!code || !bin) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Bin 'code' and 'bin' are required" }),
//         { status: 400 }
//       );
//     }

//     // 4️⃣ Prevent duplicate bin code
//     const duplicate = warehouse.binLocations.find((b) => b.code === code);
//     if (duplicate) {
//       return new Response(
//         JSON.stringify({ success: false, message: `Bin code '${code}' already exists` }),
//         { status: 400 }
//       );
//     }

//     // 5️⃣ Add bin
//     warehouse.binLocations.push({
//       code,
//       aisle: aisle || "",
//       rack: rack || "",
//       bin,
//       maxCapacity: maxCapacity ? Number(maxCapacity) : 0,
//     });

//     await warehouse.save();

//     return new Response(
//       JSON.stringify({ success: true, data: warehouse }),
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("❌ Error adding bin:", err);
//     return new Response(
//       JSON.stringify({ success: false, message: err.message }),
//       { status: 500 }
//     );
//   }
// }


