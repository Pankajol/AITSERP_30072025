import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import ProductionOrder from "@/models/ProductionOrder";
import SalesOrder from "@/models/SalesOrder";
import BOM from "@/models/BOM";
import Item from "@/models/ItemModels";
import Warehouse from "@/models/warehouseModels";
import CompanyUser from "@/models/CompanyUser";
import StockMovement from "@/models/StockMovement";
import JobCard from "@/models/ppc/JobCardModel";
import Machine from "@/models/ppc/machineModel";
import Operation from "@/models/ppc/operationModel";
import Operator from "@/models/ppc/operatorModel";


import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Create a new Production Order
export async function POST(request) {
  await connectDB();

  try {
    const token = getTokenFromHeader(request);
    const user = verifyJWT(token);

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "Company ID missing in token" },
        { status: 401 }
      );
    }

    const data = await request.json();

    // ✅ Attach company & user info
    data.companyId = user.companyId;
    data.createdBy = user._id || user.id;

    // Make warehouse optional
    if (!data.warehouse) data.warehouse = null;

    // Ensure items array is clean
    if (Array.isArray(data.items)) {
      data.items = data.items.map((it) => ({
        ...it,
        warehouse: it.warehouse || null,
      }));
    }

    // ✅ Save Production Order
    const order = new ProductionOrder(data);
    const saved = await order.save();

    // ✅ Update Sales Order if linked
    if (saved.salesOrder?.length > 0) {
      await SalesOrder.updateMany(
        {
          _id: { $in: saved.salesOrder },
          companyId: user.companyId,
        },
        {
          $set: {
            status: "LinkedToProductionOrder",
            linkedProductionOrder: saved._id,
          },
        }
      );
    }

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error("❌ Error creating production order:", err);
    return NextResponse.json(
      { error: err.message || "Failed to create production order" },
      { status: 400 }
    );
  }
}

// ✅ Get all Production Orders for the company
export async function GET(request) {
  await connectDB();

  try {
    const token = getTokenFromHeader(request);
    const user = verifyJWT(token);

    if (!user?.companyId) {
      return NextResponse.json(
        { error: "Company ID missing in token" },
        { status: 401 }
      );
    }
const orders = await ProductionOrder.find({ companyId: user.companyId })
  .populate("operationFlow.operation")  
  .populate("operationFlow.machine")    
  .populate("operationFlow.operator")   
  .lean();

    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching production orders:", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch production orders" },
      { status: 400 }
    );
  }
}




// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import ProductionOrder from '@/models/ProductionOrder';
// import StockMovement from '@/models/StockMovement'; // ✅ added
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';
// import salesOrder from '@/models/SalesOrder';
// import BOM from '@/models/BOM';
// import Item from '@/models/ItemModels';
// import Warehouse from '@/models/warehouseModels';
// import CompanyUser from '@/models/CompanyUser';







// export async function POST(request) {
//   await connectDB();

//   try {
//     // ✅ Extract and verify token
//     const token = getTokenFromHeader(request);
//     const user = verifyJWT(token); // decoded payload

//     if (!user?.companyId) {
//       return NextResponse.json(
//         { error: "Company ID missing in token" },
//         { status: 401 }
//       );
//     }

//     const data = await request.json();

//     // ✅ Attach company & user info
//     data.companyId = user.companyId;
//     data.createdBy = user._id || user.id;

//     const order = new ProductionOrder(data);
//     const saved = await order.save();

//     // ✅ Record stock movements for BOM items (consumption)
//     if (saved.bomId) {
//       const bomDoc = await BOM.findById(saved.bomId).populate("items.item");

//       if (bomDoc && Array.isArray(bomDoc.items)) {
//         for (const bomItem of bomDoc.items) {
//           const { item, quantity, warehouse } = bomItem;

//           await StockMovement.create({
//             companyId: user.companyId,
//             createdBy: user._id || user.id,
//             item,
//             warehouse,
//             movementType: "OUT",
//             quantity: quantity, // planned consumption for production
//             reference: saved._id.toString(),
//             remarks: `Raw material consumption for Production Order ${saved._id}`,
//           });
//         }
//       }
//     }

//     // ✅ Update SalesOrder status if linked
//     if (saved.salesOrder) {
//       const salesOrdersToUpdate = Array.isArray(saved.salesOrder)
//         ? saved.salesOrder
//         : [saved.salesOrder];

//       console.log("Sales Orders to update:", salesOrdersToUpdate);

//       const res = await salesOrder.updateMany(
//         { _id: { $in: salesOrdersToUpdate }, companyId: user.companyId },
//         {
//           $set: {
//             status: "LinkedToProductionOrder",
//             linkedProductionOrder: saved._id, // 👈 link back to the ProductionOrder
//           },
//         }
//       );

//       console.log("SalesOrder update result:", res);
//     }

//     return NextResponse.json(saved, { status: 201 });
//   } catch (err) {
//     console.error("Error creating production order:", err);
//     return NextResponse.json(
//       { error: err.message || "Failed to create production order" },
//       { status: 400 }
//     );
//   }
// }





// ========================= GET =========================

// export async function GET(request) {
//   await connectDB();

//   try {
//     const token = getTokenFromHeader(request);
//     const user = verifyJWT(token);

//     console.log("Decoded JWT user:", user); // ✅ debug

//     if (!user || !user.companyId) {
//       return NextResponse.json(
//         { error: 'Unauthorized - companyId missing in token' },
//         { status: 401 }
//       );
//     }

//     const orders = await ProductionOrder.find({ companyId: user.companyId })
//       // .populate("bomId")
//       // .populate("warehouse")
//       // .populate("items.item")
//       // .populate("createdBy");

//     return NextResponse.json(orders, { status: 200 });
//   } catch (err) {
//     console.error('Error fetching production orders:', err);
//     return NextResponse.json(
//       { error: 'Failed to fetch production orders' },
//       { status: 500 }
//     );
//   }
// }





// ========================= POST =========================
// export async function POST(request) {
//   await connectDB();

//   try {
//     // ✅ Extract and verify token
//     const token = getTokenFromHeader(request);
//     const user = verifyJWT(token); // decoded payload

//     if (!user?.companyId) {
//       return NextResponse.json(
//         { error: 'Company ID missing in token' },
//         { status: 401 }
//       );
//     }

//     const data = await request.json();

//     // ✅ Attach company & user info
//     data.company = user.companyId;
//     data.createdBy = user._id || user.id;

//     const order = new ProductionOrder(data);
//     const saved = await order.save();

//     // ✅ Record stock movements for BOM items (consumption)
//     if (saved.bom && Array.isArray(saved.bom.items)) {
//       for (const bomItem of saved.bom.items) {
//         const { item, quantity, warehouse } = bomItem;

//         await StockMovement.create({
//           companyId: user.companyId,
//           createdBy: user._id || user.id,
//           item,
//           warehouse,
//           movementType: 'OUT',
//           quantity: quantity, // planned consumption for production
//           reference: saved._id.toString(),
//           remarks: `Raw material consumption for Production Order ${saved._id}`,
//         });
//       }
//     }
//     // ✅ Update SalesOrder status if linked
//     if (saved.salesOrder) {
//   const salesOrdersToUpdate = Array.isArray(saved.salesOrder)
//     ? saved.salesOrder
//     : [saved.salesOrder];

//   await salesOrder.updateMany(
//     { _id: { $in: salesOrdersToUpdate }, companyId: user.companyId },
//     { $set: { status: 'LinkedToProductionOrder' } }
//   );
// }



//     return NextResponse.json(saved, { status: 201 });
//   } catch (err) {
//     console.error('Error creating production order:', err);
//     return NextResponse.json(
//       { error: err.message || 'Failed to create production order' },
//       { status: 400 }
//     );
//   }
// }








































// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import ProductionOrder from '@/models/ProductionOrder';
// import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

// // ========================= GET =========================
// export async function GET(request) {
//   await connectDB();

//   try {
//     // ✅ Extract and verify token
//     const token = getTokenFromHeader(request);
//     const user = verifyJWT(token); // decoded payload

//     if (!user?.companyId) {
//       return NextResponse.json(
//         { error: 'Company ID missing in token' },
//         { status: 401 }
//       );
//     }

//     // ✅ Fetch company-wise orders
//     const orders = await ProductionOrder.find({ company: user.companyId })
//       .populate('bom')
//       .sort('-createdAt');

//     return NextResponse.json(orders, { status: 200 });
//   } catch (err) {
//     console.error('Error fetching production orders:', err);
//     return NextResponse.json(
//       { error: 'Failed to fetch production orders' },
//       { status: 500 }
//     );
//   }
// }

// // ========================= POST =========================
// export async function POST(request) {
//   await connectDB();

//   try {
//     // ✅ Extract and verify token
//     const token = getTokenFromHeader(request);
//     const user = verifyJWT(token); // decoded payload

//     if (!user?.companyId) {
//       return NextResponse.json(
//         { error: 'Company ID missing in token' },
//         { status: 401 }
//       );
//     }

//     const data = await request.json();

//     // ✅ Attach company & user info
//     data.company = user.companyId;
//     data.createdBy = user._id || user.id;

//     const order = new ProductionOrder(data);
//     const saved = await order.save();

//     return NextResponse.json(saved, { status: 201 });
//   } catch (err) {
//     console.error('Error creating production order:', err);
//     return NextResponse.json(
//       { error: err.message || 'Failed to create production order' },
//       { status: 400 }
//     );
//   }
// }
