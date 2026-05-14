import dbConnect from "@/lib/db";
import BankHead from "@/models/BankHead";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };

  try {
    const user = await verifyJWT(token);
    if (!user) return { error: "Invalid token", status: 401 };
    return { user };
  } catch (error) {
    return { error: "Authentication failed", status: 401 };
  }
}

// ✅ GET all Bank Heads
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const bankHeads = await BankHead.find({ companyId: user.companyId }).sort({ createdAt: -1 });
    return NextResponse.json({ success: true, data: bankHeads }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ✅ POST create Bank Head
export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await authenticate(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const body = await req.json();
    console.log("Request Body:", body);

    const { accountCode, accountName, isActualBank, accountHead, status: headStatus } = body;

    if (!accountCode || !accountName || !accountHead || !headStatus) {
      return NextResponse.json({ success: false, message: "All fields required" }, { status: 400 });
    }

    const newBankHead = await BankHead.create({
      accountCode,
      accountName,
      isActualBank,
      accountHead,
      status: headStatus,
      companyId: user.companyId,
    });

    return NextResponse.json({ success: true, data: newBankHead }, { status: 201 });
  } catch (err) {
    console.error("POST /api/bank-head Error:", err.message);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}




// import dbConnect from "@/lib/db";
// import BankHead from "@/models/BankHead";

// // GET /api/bank-head: Retrieve all Bank Head records
// export async function GET(req) {
//   try {
//     await dbConnect();
//     const bankHeads = await BankHead.find({});
//     return new Response(JSON.stringify({ success: true, data: bankHeads }), {
//       status: 200,
//       headers: { "Content-Type": "application/json" },
//     });
//   } catch (error) {
//     console.error("Error fetching bank head details:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   }
// }

// // POST /api/bank-head: Create a new Bank Head record
// export async function POST(req) {
//   try {
//     await dbConnect();
//     const body = await req.json();
//     const { accountCode, accountName, accountHead, status } = body;
//     if (!accountCode || !accountName || !accountHead || !status) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Missing required fields" }),
//         {
//           status: 400,
//           headers: { "Content-Type": "application/json" },
//         }
//       );
//     }
//     const newBankHead = new BankHead({
//       accountCode,
//       accountName,
//       accountHead,
//       status,
//     });
//     await newBankHead.save();
//     return new Response(
//       JSON.stringify({ success: true, data: newBankHead }),
//       {
//         status: 201,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   } catch (error) {
//     console.error("Error creating bank head:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       {
//         status: 500,
//         headers: { "Content-Type": "application/json" },
//       }
//     );
//   }
// }
