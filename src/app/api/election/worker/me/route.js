// app/api/election/worker/me/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function GET(req) {
  await dbConnect();
  const { user: tokenUser, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const user = await CompanyUser.findById(tokenUser.id)
      .select("-password")
      .populate("assignedConstituency", "name")
      .populate("assignedBooths", "boothNumber name")
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    // Ensure the user is actually a worker (optional but safe)
    if (!user.isWorker) {
      return NextResponse.json({ success: false, message: "Not a worker account" }, { status: 403 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("GET /api/election/worker/me error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}





// // app/api/election/worker/me/route.js
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// export async function GET(req) {
//   try {
//     await dbConnect();
//     const token = getTokenFromHeader(req);
//     if (!token) {
//       return NextResponse.json({ success: false, message: "Token missing" }, { status: 401 });
//     }

//     const decoded = verifyJWT(token);
//     // decoded में id, type, companyId होना चाहिए

//     const user = await CompanyUser.findById(decoded.id)
//       .select("-password")
//       .populate("assignedConstituency", "name")
//       .populate("assignedBooths", "boothNumber name")
//       .lean();

//     if (!user) {
//       return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
//     }

//     return NextResponse.json({ success: true, data: user });
//   } catch (error) {
//     console.error("GET /api/election/worker/me error:", error);
//     return NextResponse.json({ success: false, message: error.message }, { status: 500 });
//   }
// }