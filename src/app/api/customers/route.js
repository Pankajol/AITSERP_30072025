import { NextResponse } from "next/server";
import dbConnect from "@/lib/db.js";
import Customer from "@/models/CustomerModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import BankHead from "@/models/BankHead";
import Country from "@/app/api/countries/schema"
import State from "../states/schema";

/* -------------------------------
   🔐 Role-Based Access Check
-------------------------------- */
function isAuthorized(user) {
  return (
    user?.type === "company" ||
    user?.role === "Admin" ||
    user?.permissions?.includes("customer")
  );
}

/* ✅ Validate User Helper */
async function validateUser(req) {
  const token = getTokenFromHeader(req); // ✅ Works if getTokenFromHeader handles Request object
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

// export async function GET(req) {
//   await dbConnect();

//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const search = searchParams.get("search");

//     const query = { companyId: user.companyId };
//     if (search) {
//       query.$or = [
//         { customerName: { $regex: search, $options: "i" } },
//         { customerCode: { $regex: search, $options: "i" } },
//       ];
//     }

//     const customers = await Customer.find(query)
//       .select("_id customerCode customerName contactPersonName")
//       .limit(10);

//     return NextResponse.json({ success: true, data: customers }, { status: 200 });
//   } catch (err) {
//     console.error("GET /customers error:", err);
//     return NextResponse.json({ success: false, message: "Failed to fetch customers" }, { status: 500 });
//   }
// }

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const customers = await Customer.find({ companyId: user.companyId }).populate('glAccount');
      // .populate("glAccount", "accountName accountCode") // ✅ Fetch only necessary fields
      // .sort({ createdAt: -1 });
      //  const customers = await Customer.find({})

    return NextResponse.json({ success: true, data: customers }, { status: 200 });
  } catch (err) {
    console.error("GET /customers error:", err);
    return NextResponse.json({ success: false, message: "Failed to fetch customers" }, { status: 500 });
  }
}



/* ========================================
   ✏️ POST /api/customers
   Access: Admin, Sales Manager, Company
======================================== */
export async function POST(req) {
  await dbConnect();

  try {
    const token = getTokenFromHeader(req);
    const user = await verifyJWT(token);

    if (!user || !isAuthorized(user)) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json({ success: false, message: "Invalid content type" }, { status: 400 });
    }

    const body = await req.json();

    const customer = new Customer({
      ...body,
      companyId: user.companyId,
      createdBy: user.id,
    });

    await customer.save();

    const populated = await Customer.findById(customer._id).populate("glAccount");

    return NextResponse.json({ success: true, data: populated }, { status: 201 });

  } catch (error) {
    console.error("POST /customers error:", error);
    return NextResponse.json({ success: false, message: "Failed to create customer" }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db.js";
// import Customer from "@/models/CustomerModel";

// export async function GET() {
//   await dbConnect();
//   const customers = await Customer.find({})
//   return NextResponse.json(customers);
// }
// export async function POST(req) {
//   await dbConnect();
//   try {
//     const body = await req.json();
//     // const data = await req.json();
//     console.log("Received customer data:", body);
//     const customer = new Customer(body);
//     await customer.save();
//     const populated = await Customer.findById(customer._id).populate("glAccount");
//     return NextResponse.json(populated, { status: 201 });
//   } catch (error) {
//     return NextResponse.json({ message: error.message }, { status: 500 });
//   }
// }































































// export async function GET() {
//   await dbConnect();
//   try {
//     // const customers = await Customer.find({});
//     const customers = await Customer.find().populate("glAccount");
//   return NextResponse.json(customers);
   
//   } catch (error) {
//     return NextResponse.json({ error: "Error fetching customers" }, { status: 400 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   try {
//     const data = await req.json();
//     console.log('Received customer data:', data);
//     const customer = await Customer.create(data);
//     return NextResponse.json(customer, { status: 201 });
//   } catch (error) {
//     return NextResponse.json({ error: "Error creating customer" }, { status: 400 });
//   }
// }
