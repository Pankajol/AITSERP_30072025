// import { NextResponse } from 'next/server'
// import connectDB from '@/lib/db'
// import BOM from '@/models/BOM'

// // GET /api/bom/:id
// export async function GET(request, { params }) {
//   // first await the params promise
//   const { id } = await params

//   // then connect to the database
//   await connectDB()

//   try {
//     const bom = await BOM.findById(id)
//     if (!bom) {
//       return NextResponse.json({ error: 'BOM not found' }, { status: 404 })
//     }
//     return NextResponse.json(bom, { status: 200 })
//   } catch (err) {
//     console.error('Error fetching BOM by ID:', err)
//     return NextResponse.json({ error: 'Failed to fetch BOM' }, { status: 500 })
//   }
// }


import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import BOM from "@/models/BOM";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

export async function GET(req, { params }) {
  try {
    await connectDB();

    // ✅ Authenticate
    const token = getTokenFromHeader(req);
    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = verifyJWT(token);
    if (!user) {
      return NextResponse.json({ message: "Invalid token" }, { status: 403 });
    }

    const { id } = params;

    // ✅ Fetch BOM with population
    const bom = await BOM.findOne({ _id: id, companyId: user.companyId })
      .populate("productNo", "itemName itemCode")
      .populate("warehouse", "warehouseName")
      .populate("items.item", "itemName unit");

    if (!bom) {
      return NextResponse.json({ message: "BOM not found" }, { status: 404 });
    }

    return NextResponse.json(bom, { status: 200 });
  } catch (err) {
    console.error("Error fetching BOM:", err);
    return NextResponse.json({ error: "Failed to fetch BOM" }, { status: 500 });
  }
}
