import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Company from "@/models/Company";

const SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    // ✅ Token lo Authorization header se
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { success: false, msg: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    // ✅ Verify karo
    let decoded;
    try {
      decoded = jwt.verify(token, SECRET);
    } catch (err) {
      const msg =
        err.name === "TokenExpiredError"
          ? "Session expired, please login again"
          : "Invalid token";
      return NextResponse.json({ success: false, msg }, { status: 401 });
    }

    await dbConnect();

    let user = null;
    const userType = decoded.type;

    if (userType === "company") {
      // ✅ Company model se uthao
      const rawUser = await Company.findById(decoded.id).select("-password -__v");

      if (rawUser) {
        user = rawUser.toObject();
        user.type = "company";
      }
    } else {
      // ✅ CompanyUser model se uthao — .toObject() use karo lean() nahi
      const rawUser = await CompanyUser.findById(decoded.id).select("-password -__v");

      if (rawUser) {
        user = rawUser.toObject(); // ✅ Map automatically plain object ban jaata hai

        // ✅ Agar phir bhi Map instance ho toh convert karo
        if (user.modules instanceof Map) {
          user.modules = Object.fromEntries(user.modules);
        }

        // ✅ Har module ki value fix karo — selected aur permissions ensure karo
        if (user.modules && typeof user.modules === "object") {
          const fixedModules = {};
          for (const [moduleName, moduleData] of Object.entries(user.modules)) {
            fixedModules[moduleName] = {
              selected: moduleData?.selected ?? false,
              permissions: moduleData?.permissions ?? {},
            };
          }
          user.modules = fixedModules;
        }
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, msg: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (err) {
    console.error("Error fetching user data:", err);
    return NextResponse.json(
      { success: false, msg: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// import { verifyJWT } from "@/lib/auth";
// import dbConnect from "@/lib/db";
// // import { User } from "@/models/CompanyUser";


// export async function GET(req) {
//   await dbConnect();

//   try {
//     const token = req.headers.get("Authorization")?.split(" ")[1];

//     if (!token) {
//       return new Response(
//         JSON.stringify({ success: false, message: "No token provided" }),
//         { status: 401, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     const decoded = verifyJWT(token);

//     if (!decoded || !decoded.id) {
//       return new Response(
//         JSON.stringify({ success: false, message: "Invalid token" }),
//         { status: 401, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     const user = await User.findById(decoded.id).populate("role").lean();

//     if (!user) {
//       return new Response(
//         JSON.stringify({ success: false, message: "User not found" }),
//         { status: 404, headers: { "Content-Type": "application/json" } }
//       );
//     }

//     // Remove sensitive information
//     delete user.password;
//     delete user.failedLoginAttempts;
//     delete user.lockedUntil;

//     return new Response(
//       JSON.stringify({
//         success: true,
//         user: user,
//         permissions: user.permissions, // Assuming permissions are directly on the user or populated
//       }),
//       { status: 200, headers: { "Content-Type": "application/json" } }
//     );
//   } catch (error) {
//     console.error("Error fetching user data:", error);
//     return new Response(
//       JSON.stringify({ success: false, message: error.message }),
//       { status: 500, headers: { "Content-Type": "application/json" } }
//     );
//   }
// }