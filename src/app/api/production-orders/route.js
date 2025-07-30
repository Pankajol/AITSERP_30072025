import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import ProductionOrder from '@/models/ProductionOrder';
import { getTokenFromHeader, verifyJWT } from '@/lib/auth';

export async function GET() {
  await connectDB();
  try {
    const orders = await ProductionOrder.find().sort('-createdAt');
    return NextResponse.json(orders, { status: 200 });
  } catch (err) {
    console.error('Error fetching production orders:', err);
    return NextResponse.json({ error: 'Failed to fetch production orders' }, { status: 500 });
  }
}





export async function POST(request) {
  await connectDB();

  try {
    // ✅ Extract and verify token
    const token = getTokenFromHeader(request);
    const user = verifyJWT(token); // throws if invalid

    const data = await request.json();

    // Optional: attach user ID to the production order
    data.createdBy = user._id || user.id;

    const order = new ProductionOrder(data);
    const saved = await order.save();

    return NextResponse.json(saved, { status: 201 });
  } catch (err) {
    console.error('Error creating production order:', err);
    return NextResponse.json({ error: err.message || 'Failed to create production order' }, { status: 400 });
  }
}











// // File: app/api/production-orders/route.js (Next.js App Router)
// import { NextResponse } from 'next/server';
// import connectDB from '@/lib/db';
// import ProductionOrder from '@/models/ProductionOrder';
// import Bom from '@/models/BOM'; // Import BOM model



// export async function GET() {
//   await connectDB();
//   try {
    
//     const orders = await ProductionOrder.find().sort('-createdAt');

//     return NextResponse.json(orders, { status: 200 });
//   } catch (err) {
//     console.error('Error fetching production orders:', err);
//     return NextResponse.json({ error: 'Failed to fetch production orders' }, { status: 500 });
//   }
// }

// export async function POST(request) {
//   await connectDB();
//   try {
//     const data = await request.json();
//     const order = new ProductionOrder(data);
//     const saved = await order.save();
//     return NextResponse.json(saved, { status: 201 });
//   } catch (err) {
//     console.error('Error creating production order:', err);
//     return NextResponse.json({ error: 'Failed to create production order' }, { status: 400 });
//   }
// }



