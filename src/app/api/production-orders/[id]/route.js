import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProductionOrder from "@/models/ProductionOrder";
import "@/models/CustomerModel";
import "@/models/ItemModels";
import "@/models/warehouseModels";
import "@/models/BOM";

import CompanyUser from "@/models/CompanyUser";
import StockMovement from "@/models/StockMovement";
import JobCard from "@/models/ppc/JobCardModel";
import Machine from "@/models/ppc/machineModel";
import Operation from "@/models/ppc/operationModel";
import Operator from "@/models/ppc/operatorModel";

import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Unauthorized: No token", status: 401 };
  try {
    const user = await verifyJWT(token);
    return { user };
  } catch (error) {
    console.error("JWT verification failed:", error.message);
    return { error: "Invalid token", status: 401 };
  }
}

function getCompanyId(user) {
  if (user.companyId) return user.companyId;
  if (user.type === "company") return user.id || user._id;
  return user.company || null;
}

export async function GET(req, { params }) {
  await connectDB();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ error: "Company ID missing" }, { status: 400 });

  try {
    const { id } = await params;   // await in App Router
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const order = await ProductionOrder.findOne({ _id: id, companyId })
      .populate("warehouse", "warehouseName name")
      .populate("items.warehouse", "warehouseName name")
      .populate({
        path: "bomId",
        populate: { path: "productNo", select: "itemCode itemName" },
        select: "productNo productDesc",
      })
      .populate("items.item", "unitPrice itemName itemCode")
      .populate("operationFlow.operation")
      .populate("operationFlow.machine")
      .populate("operationFlow.operator")
      .lean();

    if (!order) return NextResponse.json({ error: "Production order not found" }, { status: 404 });

    return NextResponse.json(order, { status: 200 });
  } catch (err) {
    console.error("GET production-order error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  await connectDB();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ error: "Company ID missing" }, { status: 400 });

  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const body = await req.json();

    // 🔧 Sanitise: convert empty warehouse strings to null for items and resources
    if (body.items && Array.isArray(body.items)) {
      body.items = body.items.map((item) => ({
        ...item,
        warehouse: item.warehouse && item.warehouse !== "" ? item.warehouse : null,
      }));
    }
    if (body.resources && Array.isArray(body.resources)) {
      body.resources = body.resources.map((res) => ({
        ...res,
        warehouse: res.warehouse && res.warehouse !== "" ? res.warehouse : null,
      }));
    }
    // Also sanitise top-level warehouse
    if (body.warehouse === "") body.warehouse = null;

    // Remove fields that shouldn't be updated
    delete body.companyId;
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const updatedOrder = await ProductionOrder.findOneAndUpdate(
      { _id: id, companyId },
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("warehouse", "warehouseName name")
      .populate("items.warehouse", "warehouseName name")
      .populate({
        path: "bomId",
        populate: { path: "productNo", select: "itemCode itemName" },
        select: "productNo productDesc",
      })
      .populate("items.item", "unitPrice itemName itemCode")
      .populate("operationFlow.operation")
      .populate("operationFlow.machine")
      .populate("operationFlow.operator")
      .lean();

    if (!updatedOrder) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    return NextResponse.json(updatedOrder, { status: 200 });
  } catch (err) {
    console.error("PUT production-order error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
export async function DELETE(req, { params }) {
  await connectDB();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ error: "Company ID missing" }, { status: 400 });

  try {
    const { id } = await params;
    const deleted = await ProductionOrder.findOneAndDelete({ _id: id, companyId });
    if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ message: "Deleted" }, { status: 200 });
  } catch (err) {
    console.error("DELETE production-order error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}


















// "use server";
// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import ProductionOrder from '@/models/ProductionOrder';
// // import  Warehouse from '@/models/Warehouse'; 
// // import BOM from '@/models/BOM';

// import '@/models/warehouseModels'; 
// import '@/models/BOM';
// import '@/models/ItemModels'; // Ensure Item model is imported if used in population


// export async function GET(request, { params }) {
//   const { id } = await params;
//   await connectDB();

//   try {
//     const order = await ProductionOrder.findById(id)
//       .populate('warehouse', 'warehouseName')
//       .populate('items.warehouse', 'warehouseName')
//       .populate({
//         path: 'bomId',
//         populate: {
//           path: 'productNo', // populate the productNo inside bomId
//           select: 'itemCode itemName',
//         },
//         select: 'productNo productDesc', // fields in BOM
//       })
//       .populate('items','managedBy')
//       .populate({
//   path: 'items.item',
//   select: 'unitPrice itemName itemCode',
// });

//       // const order1 = await ProductionOrder.findById(id)

      

//     if (!order) {
//       return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
//     }

//     return NextResponse.json(order.toObject(), { status: 200 });
//   } catch (err) {
//     console.error('Error fetching production order:', err);
//     return NextResponse.json({ error: 'Failed to fetch production order' }, { status: 500 });
//   }
// }





// export async function PUT(request, context) {
//   const { id } = await context.params;
//   await connectDB();

//   try {
//     const data = await request.json();

//     // If transferQty is present, handle it with validation
//     if (typeof data.transferQty === 'number') {
//       const { transferQty } = data;

//       if (transferQty < 1) {
//         return NextResponse.json(
//           { error: 'transferQty must be at least 1' },
//           { status: 400 }
//         );
//       }

//       const order = await ProductionOrder.findById(id);
//       if (!order) {
//         return NextResponse.json(
//           { error: 'Production order not found' },
//           { status: 404 }
//         );
//       }

//       const totalTransferred = (order.transferQty || 0) + transferQty;
//       if (totalTransferred > order.quantity) {
//         return NextResponse.json(
//           { error: `Transfer quantity exceeds available production quantity. Allowed max: ${order.quantity - (order.transferQty || 0)}` },
//           { status: 400 }
//         );
//       }

//       // Update transferQty
//       order.transferQty = totalTransferred;

//       // Apply other data fields (optional updates)
//       for (const [key, value] of Object.entries(data)) {
//         if (key !== 'transferQty') {
//           order[key] = value;
//         }
//       }

//       const updated = await order.save();
//       return NextResponse.json(updated, { status: 200 });
//     }

//     // Fallback: regular update if no transferQty
//     const updated = await ProductionOrder.findByIdAndUpdate(id, data, {
//       new: true,
//       runValidators: true,
//     });

//     if (!updated) {
//       return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
//     }

//     return NextResponse.json(updated, { status: 200 });

//   } catch (err) {
//     console.error('Error updating production order:', err);
//     return NextResponse.json(
//       { error: err.message || 'Failed to update production order' },
//       { status: 400 }
//     );
//   }
// }

  

  
//   export async function DELETE(request, { params }) {
//     const { id } = await params;
//     await connectDB();
//     try {
//       const deleted = await ProductionOrder.findByIdAndDelete(id);
//       if (!deleted) {
//         return NextResponse.json({ error: 'Production order not found' }, { status: 404 });
//       }
//       return NextResponse.json({ success: true }, { status: 200 });
//     } catch (err) {
//       console.error('Error deleting production order:', err);
//       return NextResponse.json({ error: 'Failed to delete production order' }, { status: 400 });
//     }
//   }
  