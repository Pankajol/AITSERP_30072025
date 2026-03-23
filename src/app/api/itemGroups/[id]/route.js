import dbConnect from "@/lib/db";
import ItemGroup from "@/models/ItemGroupModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Role-based access for item management (ERPNext Style)
function isAuthorized(user) {
  if (!user) return false;

  // Company owner has full access
  if (user.type === "company") return true;

  const allowedRoles = [
    "admin",
    "sales manager",
    "purchase manager",
    "inventory manager",
    "accounts manager",
    "hr manager",
    "support executive",
    "production head",
    "project manager",
  ];

  // Role check logic
  const userRoles = Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [];

  return userRoles.some(role =>
    allowedRoles.includes(role.trim().toLowerCase())
  );
}

// ✅ Validate user token & permissions
async function validateUser(req) {
  const token = getTokenFromHeader(req);
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

// ✍️ UPDATE Item Group
export async function PUT(req, { params }) {
  try {
    await dbConnect();

    // 1. Corrected function call to validateUser
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const { id } = params;
    const body = await req.json();
    const { name, code } = body;

    // 2. Map data and update only for current company
    const updated = await ItemGroup.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { 
        name, 
        code,
        modifiedBy: user.email // ERPNext style tracking
      },
      { new: true, runValidators: true }
    );

    if (!updated) {
      return NextResponse.json({ success: false, message: "Item Group not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: updated, 
      message: "Item Group updated successfully" 
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

// 🗑️ DELETE Item Group
export async function DELETE(req, { params }) {
  try {
    await dbConnect();

    // 1. Corrected function call to validateUser
    const { user, error, status } = await validateUser(req);
    if (error) return NextResponse.json({ success: false, message: error }, { status });

    const { id } = params;

    // 2. Find and delete only for current company
    const deleted = await ItemGroup.findOneAndDelete({ 
      _id: id, 
      companyId: user.companyId 
    });

    if (!deleted) {
      return NextResponse.json({ success: false, message: "Item Group not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      message: "Item Group deleted successfully" 
    }, { status: 200 });

  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}



// import dbConnect from "@/lib/db";
// import ItemGroup from "@/models/ItemGroupModels";
// import { NextResponse } from "next/server";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// async function authenticate(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };

//   try {
//     const user = await verifyJWT(token);
//     if (!user) return { error: "Invalid token", status: 401 };
//     return { user };
//   } catch {
//     return { error: "Authentication failed", status: 401 };
//   }
// }

// export async function PUT(req, { params }) {
//   await dbConnect();

//   const { user, error, status } = await authenticate(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   const { id } = params;
//   const { name, code } = await req.json();

//   const updated = await ItemGroup.findOneAndUpdate(
//     { _id: id, companyId: user.companyId },
//     { name, code },
//     { new: true }
//   );

//   if (!updated) return NextResponse.json({ success: false, message: "Item Group not found" }, { status: 404 });

//   return NextResponse.json({ success: true, data: updated, message: "Item Group updated" }, { status: 200 });
// }

// export async function DELETE(req, { params }) {
//   await dbConnect();

//   const { user, error, status } = await authenticate(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   const { id } = params;

//   const deleted = await ItemGroup.findOneAndDelete({ _id: id, companyId: user.companyId });
//   if (!deleted) return NextResponse.json({ success: false, message: "Item Group not found" }, { status: 404 });

//   return NextResponse.json({ success: true, message: "Item Group deleted" }, { status: 200 });
// }
