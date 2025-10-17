import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProductionOrder from "@/models/ProductionOrder"; // Although not used directly here, good to keep if related
import JobCard from "@/models/ppc/JobCardModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Ensure these models are registered for population to work correctly
import "@/models/ppc/machineModel";
import "@/models/ppc/operationModel";
import "@/models/ppc/operatorModel";

// ======================== GET JOB CARDS (Optional productionOrderId) ========================
export async function GET(req) {
  try {
    await connectDB();

    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ success: false, error: "Missing token" }, { status: 401 });
    }

    const decoded = verifyJWT(token);
    if (!decoded) {
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productionOrderId = searchParams.get("productionOrderId");

    // 1. Create a dynamic query object.
    // By default, it's empty, which will fetch all documents.
    const query = {};

    // 2. If a productionOrderId is provided in the URL, add it to the query.
    // This will filter the results for that specific order.
    if (productionOrderId) {
      query.productionOrder = productionOrderId;
    }

    // 3. Use the dynamic query object in the find method.
    const jobCards = await JobCard.find(query)
      .populate("productionOrder")
      .populate("operation")
      .populate("machine")
      .populate("operator")
      .lean();

    return NextResponse.json({ success: true, data: jobCards }, { status: 200 });
  } catch (err) {
    console.error("Error fetching job cards:", err);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ======================== CREATE JOB CARDS ========================




export async function POST(req) {
  await connectDB();

  try {
    // 🔒 Verify token
    const token = getTokenFromHeader(req);
    if (!token)
      return NextResponse.json({ error: "Missing token" }, { status: 401 });

    const user = verifyJWT(token);
    if (!user)
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    // 🧾 Parse body
    const { productionOrderId, operations } = await req.json();
    if (!productionOrderId || !operations?.length)
      return NextResponse.json(
        { error: "productionOrderId and operations are required" },
        { status: 400 }
      );

    // 🏭 Fetch Production Order with flow details
    const order = await ProductionOrder.findById(productionOrderId)
      .populate("operationFlow.operation operationFlow.machine operationFlow.operator")
      .lean();

    if (!order)
      return NextResponse.json(
        { error: "Production order not found" },
        { status: 404 }
      );

    // 🧩 Build job cards
    const jobCardsToCreate = operations
      .map((op) => {
        const flow = order.operationFlow.find(
          (f) => f.operation?._id.toString() === op.operationId
        );
        if (!flow) return null;

        const qty = op.qtyToManufacture || order.quantity || 0;

        return {
          companyId: user.companyId,
          productionOrder: order._id,
          operation: flow.operation._id,
          machine: flow.machine?._id,
          operator: flow.operator?._id,
          qtyToManufacture: qty,
          allowedQty: qty, // ✅ Required for schema validation
          remainingQty: qty, // ✅ Initially same as allowedQty
          completedQty: 0, // ✅ Initially 0
          jobCardNo: `JC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          createdBy: user._id,
          status: "Planned", // ✅ Default status
          timeLogs: [], // ✅ Initialize empty
        };
      })
      .filter(Boolean);

    if (!jobCardsToCreate.length)
      return NextResponse.json(
        { error: "No valid operations to create job cards" },
        { status: 400 }
      );

    // 💾 Create Job Cards
    const createdJobCards = await JobCard.insertMany(jobCardsToCreate);

    // 🔍 Populate for response
    const populatedJobCards = await JobCard.find({
      _id: { $in: createdJobCards.map((jc) => jc._id) },
    })
      .populate("productionOrder operation machine operator")
      .lean();

    return NextResponse.json({ success: true, data: populatedJobCards }, { status: 201 });
  } catch (err) {
    console.error("Error creating job cards:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}






// import { NextResponse } from "next/server";
// import connectDB from "@/lib/db";
// import ProductionOrder from "@/models/ProductionOrder";
// import JobCard from "@/models/ppc/JobCardModel";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// // Ensure these models are registered
// import "@/models/ppc/machineModel";
// import "@/models/ppc/operationModel";
// import "@/models/ppc/operatorModel";

// // ======================== GET JOB CARDS ========================
// export async function GET(req) {
//   try {
//     await connectDB();

//     // ✅ Extract productionOrderId from query string
//     const { searchParams } = new URL(req.url);
//     const productionOrderId = searchParams.get("productionOrderId");

//     if (!productionOrderId) {
//       return NextResponse.json(
//         { success: false, error: "Missing productionOrderId query parameter" },
//         { status: 400 }
//       );
//     }

//     const token = getTokenFromHeader(req);
//     if (!token)
//       return NextResponse.json({ error: "Missing token" }, { status: 401 });

//     const decoded = verifyJWT(token);
//     if (!decoded)
//       return NextResponse.json({ error: "Invalid token" }, { status: 401 });

//     // ✅ Fetch all job cards linked to this production order
//     const jobCards = await JobCard.find({ productionOrder: productionOrderId })
//       .populate("productionOrder")
//       .populate("operation")
//       .populate("machine")
//       .populate("operator")
//       .lean();

//     return NextResponse.json({ success: true, data: jobCards }, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching job cards by order:", err);
//     return NextResponse.json(
//       { success: false, error: "Internal Server Error" },
//       { status: 500 }
//     );
//   }
// }

// // ======================== CREATE JOB CARDS ========================
// export async function POST(request) {
//   await connectDB();

//   try {
//     const token = getTokenFromHeader(request);
//     if (!token)
//       return NextResponse.json({ error: "Missing token" }, { status: 401 });

//     const user = verifyJWT(token);
//     if (!user)
//       return NextResponse.json({ error: "Invalid token" }, { status: 401 });

//     const { productionOrderId } = await request.json();

//     if (!productionOrderId) {
//       return NextResponse.json(
//         { error: "productionOrderId is required" },
//         { status: 400 }
//       );
//     }

//     const order = await ProductionOrder.findById(productionOrderId)
//       .populate("operationFlow.operation operationFlow.machine operationFlow.operator")
//       .lean();

//     if (!order)
//       return NextResponse.json(
//         { error: "Production order not found" },
//         { status: 404 }
//       );

//     if (!order.operationFlow || order.operationFlow.length === 0)
//       return NextResponse.json(
//         { error: "No operations in production order" },
//         { status: 400 }
//       );

//     // ✅ Create job cards for each operation
//     const jobCards = await Promise.all(
//       order.operationFlow.map((flow, idx) =>
//         JobCard.create({
//           companyId: user.companyId,
//           productionOrder: order._id,
//           operation: flow.operation?._id,
//           machine: flow.machine?._id,
//           operator: flow.operator?._id,
//           qtyToManufacture: order.quantity || 0,
//           jobCardNo: `JC-${Date.now()}-${idx + 1}`,
//           createdBy: user._id,
//           status: "In Progress",
//         })
//       )
//     );

//     // ✅ Populate before returning
//     const populatedJobCards = await JobCard.find({
//       productionOrder: order._id,
//     })
//       .populate("productionOrder")
//       .populate("operation")
//       .populate("machine")
//       .populate("operator")
//       .lean();

//     return NextResponse.json(
//       { message: "Job Cards Created", jobCards: populatedJobCards },
//       { status: 201 }
//     );
//   } catch (err) {
//     console.error("Error creating job cards:", err);
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }



