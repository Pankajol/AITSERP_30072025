// [id]


import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Downtime from "@/models/ppc/downtimeModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";


await dbConnect();

/* ---------------- GET /api/downtime ---------------- */
export async function GET(req, { params }) {
  try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if (!decoded) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

    const downtime = await Downtime.findById(params.id);
    if (!downtime) return NextResponse.json({ success: false, message: "Downtime not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: downtime });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
    try {
    const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if(!decoded) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        const body = await req.json();
        const downtime = await Downtime.findByIdAndUpdate(params.id, body, { new: true });
        if(!downtime)  return NextResponse.json({success: false, message: "Downtime not found"}, {status: 404})
        return NextResponse.json({success: true,    data: downtime});
} catch (err){
    return NextResponse.json({success: false, message: err.message}, {status: 500})

}
}

export async function DELETE(req, { params }) {
    try {
         const token = getTokenFromHeader(req);
    const decoded = verifyJWT(token);
    if(!decoded) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 })
        const downtime = await Downtime.findByIdAndDelete(params.id);
       if(!downtime) return NextResponse.json({success: false, message: "Downtime not found"}, {status: 404})
        return NextResponse.json({success: true, message: "Downtime deleted"});
        
    } catch (error) {
        return NextResponse.json({ success: false, message: err.message }, { status: 500 });
    }
}






