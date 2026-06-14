// app/api/election/worker/assign/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Workers", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId, role, constituencyId, boothIds } = body;

    if (!userId || !role) {
      return NextResponse.json({ success: false, message: "userId and role are required" }, { status: 400 });
    }

    const updated = await CompanyUser.findOneAndUpdate(
      { _id: userId, companyId: user.companyId },
      {
        isWorker: true,
        workerRole: role,
        assignedConstituency: constituencyId || null,
        assignedBooths: boothIds || [],
        assignedBlock: body.blockId || null,
        assignedWard: body.wardId || null,
      },
      { new: true }
    ).select("-password");

    if (!updated) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}



// // app/api/election/worker/assign/route.js
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager"];
//   const userRoles = Array.isArray(user.roles) ? user.roles : [];
//   return userRoles.some(role => allowedRoles.includes(role.trim().toLowerCase()));
// }

// async function validateUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   try {
//     const user = await verifyJWT(token);
//     if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
//     return { user };
//   } catch {
//     return { error: "Invalid token", status: 401 };
//   }
// }

// export async function PUT(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const body = await req.json();
//     const { userId, role, constituencyId, boothIds } = body;

//     if (!userId || !role) {
//       return NextResponse.json({ success: false, message: "userId and role are required" }, { status: 400 });
//     }

//     const updated = await CompanyUser.findOneAndUpdate(
//       { _id: userId, companyId: user.companyId },
//       {
//         isWorker: true,
//         workerRole: role,
//         assignedConstituency: constituencyId || null,
//         assignedBooths: boothIds || [],
//       },
//       { new: true }
//     ).select("-password");

//     if (!updated) return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });

//     return NextResponse.json({ success: true, data: updated });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }