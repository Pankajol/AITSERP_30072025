import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Opportunity from "@/models/crm/Opportunity";
import { NextResponse } from "next/server";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return null;
  return verifyJWT(token);
}



export async function GET(req, { params }) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded) return NextResponse.json({ message: "Invalid token" }, { status: 401 });
  const { id } = await params;

  try {
    const opportunity = await Opportunity.findOne({ _id: id, companyId: decoded.companyId });
    if (!opportunity) return NextResponse.json({ message: "Not found" }, { status: 404 });
    // ✅ return wrapped object
    return NextResponse.json({ success: true, data: opportunity }, { status: 200 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
// ------------------------- PUT update by path param -------------------------
export async function PUT(req, { params }) {
  await dbConnect();
  const user = await getUser(req);
  if (!user?.companyId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  const body = await req.json();
  try {
    const updated = await Opportunity.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      body,
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// ------------------------- DELETE by path param -------------------------
export async function DELETE(req, { params }) {
  await dbConnect();
  const user = await getUser(req);
  if (!user?.companyId) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = params;
  try {
    const deleted = await Opportunity.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



// import dbConnect from "@/lib/db";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
// import Opportunity from "@/models/crm/Opportunity";
// import { NextResponse } from "next/server";

// // ✅ UPDATE Opportunity
// export async function PUT(req, { params }) {
//   await dbConnect();
//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//   const decoded = verifyJWT(token);
//   if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

//   const { id } = params;
//   const body = await req.json();

//   try {
//     const opp = await Opportunity.findOneAndUpdate(
//       { _id: id, companyId: decoded.companyId },
//       body,
//       { new: true, runValidators: true }
//     );
//     if (!opp) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
//     return NextResponse.json({ success: true, data: opp });
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

// // ✅ DELETE Opportunity
// export async function DELETE(req, { params }) {
//   await dbConnect();
//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//   const decoded = verifyJWT(token);
//   if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

//   const { id } = params;

//   try {
//     const opp = await Opportunity.findOneAndDelete({ _id: id, companyId: decoded.companyId });
//     if (!opp) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
//     return NextResponse.json({ success: true, message: "Deleted" });
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }

// // ✅ GET single Opportunity
// export async function GET(req, { params }) {
//   await dbConnect();
//   const token = getTokenFromHeader(req);
//   if (!token) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
//   const decoded = verifyJWT(token);
//   if (!decoded?.companyId) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 403 });

//   const { id } = params;
//   try {
//     const opp = await Opportunity.findOne({ _id: id, companyId: decoded.companyId });
//     if (!opp) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
//     return NextResponse.json({ success: true, data: opp });
//   } catch (err) {
//     return NextResponse.json({ success: false, error: err.message }, { status: 500 });
//   }
// }