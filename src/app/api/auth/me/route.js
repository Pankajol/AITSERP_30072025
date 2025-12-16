import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";

const SECRET = process.env.JWT_SECRET;

export async function GET(req) {
  try {
    const auth = req.headers.get("authorization") || "";
    const [, token] = auth.split(" ");

    if (!token) {
      return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, SECRET);

    await dbConnect();

    const user = await CompanyUser.findById(decoded.id)
      .select("-password")
      .lean();

    if (!user) {
      return NextResponse.json({ success: false, msg: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user,
    });

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