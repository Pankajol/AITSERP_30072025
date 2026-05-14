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

// import  dbConnect from "@/lib/db";
// import Warehouse from "@/models/warehouseModels";

// // ✅ GET WAREHOUSE BY CODE
// export async function GET(req, { params }) {
//   try {
//     await dbConnect();
//     const { warehouseCode } = params;
//     const warehouse = await Warehouse.findOne({ warehouseCode });

//     if (!warehouse) {
//       return new Response(
//         JSON.stringify({ message: "Warehouse not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(JSON.stringify(warehouse), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching warehouse:", error);
//     return new Response(
//       JSON.stringify({ message: "Error fetching warehouse", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// // ✅ UPDATE WAREHOUSE BY CODE
// export async function PUT(req, { params }) {
//   try {
//     await dbConnect();
//     const { warehouseCode } = params;
//     const updateData = await req.json();
//     const updatedWarehouse = await Warehouse.findOneAndUpdate(
//       { warehouseCode },
//       updateData,
//       { new: true }
//     );

//     if (!updatedWarehouse) {
//       return new Response(
//         JSON.stringify({ message: "Warehouse not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(JSON.stringify(updatedWarehouse), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error updating warehouse:", error);
//     return new Response(
//       JSON.stringify({ message: "Error updating warehouse", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }

// // ✅ DELETE WAREHOUSE BY CODE
// export async function DELETE(req, { params }) {
//   try {
//     await dbConnect();
//     const { warehouseCode } = params;
//     const deletedWarehouse = await Warehouse.findOneAndDelete({ warehouseCode });

//     if (!deletedWarehouse) {
//       return new Response(
//         JSON.stringify({ message: "Warehouse not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     return new Response(
//       JSON.stringify({ message: "Warehouse deleted successfully" }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error deleting warehouse:", error);
//     return new Response(
//       JSON.stringify({ message: "Error deleting warehouse", error: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }
