import dbConnect from "@/lib/db";
import ItemGroup from "@/models/ItemGroupModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ✅ Check user role/permissions
function isAuthorized(user) {
  return (
    user?.type === "company" ||
    user?.role === "Admin" ||
    user?.permissions?.includes("item")
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

// ✅ GET Item Groups
// export async function GET(req) {
//   await dbConnect();

//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const itemGroups = await ItemGroup.find({ companyId: user.companyId }).sort({
//       createdAt: -1,
//     });
//     return NextResponse.json({ success: true, data: itemGroups }, { status: 200 });
//   } catch (err) {
//     console.error("Error fetching item groups:", err.message);
//     return NextResponse.json(
//       { success: false, message: "Error fetching item groups" },
//       { status: 500 }
//     );
//   }
// }

// ✅ POST Create Item Group
export async function POST(req) {
  await dbConnect();

  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  try {
    const { name, code } = await req.json();
    if (!name || !code) {
      return NextResponse.json(
        { success: false, message: "Name and Code are required" },
        { status: 400 }
      );
    }

    const newItemGroup = new ItemGroup({ name, code, companyId: user.companyId });
    await newItemGroup.save();

    return NextResponse.json(
      { success: true, data: newItemGroup, message: "Item Group created" },
      { status: 201 }
    );
  } catch (err) {
    console.error("Error creating item group:", err.message);
    return NextResponse.json(
      { success: false, message: "Error creating item group" },
      { status: 500 }
    );
  }
}


export async function GET(req) {
  await dbConnect();

  const { user, error, status } = await validateUser(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";

    const filter = {
      companyId: user.companyId,
      ...(search ? { name: { $regex: search, $options: "i" } } : {}),
    };

    const itemGroups = await ItemGroup.find(filter).sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: itemGroups }, { status: 200 });
  } catch (err) {
    console.error("❌ Error fetching item groups:", err.message);
    return NextResponse.json({ success: false, message: "Error fetching item groups" }, { status: 500 });
  }
}

