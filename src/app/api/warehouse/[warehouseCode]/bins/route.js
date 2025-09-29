// POST /api/warehouse/[warehouseCode]/bins
import Warehouse from "@/models/warehouseModels";
import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function POST(req, { params }) {
  await dbConnect();

  try {
    // 1️⃣ Authenticate
    const token = getTokenFromHeader(req);
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized: No token provided" }),
        { status: 401 }
      );
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return new Response(
        JSON.stringify({ success: false, message: "Unauthorized: Invalid token" }),
        { status: 401 }
      );
    }

    // 2️⃣ Get warehouseCode from URL
    const { warehouseCode } = params;

    if (!warehouseCode) {
      return new Response(
        JSON.stringify({ success: false, message: "warehouseCode is required" }),
        { status: 400 }
      );
    }

    // 3️⃣ Find warehouse by code
    const warehouse = await Warehouse.findOne({ warehouseCode });
    if (!warehouse) {
      return new Response(
        JSON.stringify({ success: false, message: "Warehouse not found" }),
        { status: 404 }
      );
    }

    // 4️⃣ Parse body
    const body = await req.json();
    const { code, aisle, rack, bin, maxCapacity } = body;

    if (!code || !bin) {
      return new Response(
        JSON.stringify({ success: false, message: "Bin 'code' and 'bin' are required" }),
        { status: 400 }
      );
    }

    // 5️⃣ Prevent duplicate bin code
    const duplicate = warehouse.binLocations.find((b) => b.code === code);
    if (duplicate) {
      return new Response(
        JSON.stringify({ success: false, message: `Bin code '${code}' already exists` }),
        { status: 400 }
      );
    }

    // 6️⃣ Add bin
    warehouse.binLocations.push({
      code,
      aisle: aisle || "",
      rack: rack || "",
      bin,
      maxCapacity: maxCapacity ? Number(maxCapacity) : 0,
    });

    await warehouse.save();

    return new Response(
      JSON.stringify({ success: true, data: warehouse }),
      { status: 201 }
    );
  } catch (err) {
    console.error("❌ Error adding bin:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500 }
    );
  }
}

// GET /api/warehouse/[warehouseCode]/bins
export async function GET(req, { params }) {
  await dbConnect();

  try {
    const { warehouseCode } = params;

    if (!warehouseCode) {
      return new Response(
        JSON.stringify({ success: false, message: "warehouseCode is required" }),
        { status: 400 }
      );
    }

    const warehouse = await Warehouse.findOne({ warehouseCode });
    if (!warehouse) {
      return new Response(
        JSON.stringify({ success: false, message: "Warehouse not found" }),
        { status: 404 }
      );
    }

    // Return the bins array
    const bins = warehouse.binLocations || [];

    return new Response(
      JSON.stringify({ success: true, data: bins }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Error fetching bins:", err);
    return new Response(
      JSON.stringify({ success: false, message: err.message }),
      { status: 500 }
    );
  }
}



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


