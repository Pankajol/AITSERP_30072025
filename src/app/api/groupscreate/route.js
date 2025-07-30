import dbConnect from "@/lib/db";
import Group from "@/models/groupModels";
import { NextResponse } from "next/server";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

/**
 * ✅ Validate JWT & Return User
 */
async function authenticate(req) {
  const token = getTokenFromHeader(req);
  if (!token) {
    return { error: "Token missing", status: 401 };
  }

  try {
    const user = await verifyJWT(token);
    if (!user) {
      return { error: "Invalid token", status: 401 };
    }
    return { user };
  } catch (err) {
    console.error("Auth Error:", err.message);
    return { error: "Authentication failed", status: 401 };
  }
}

/* =========================================
   📥 GET All Groups
========================================= */
export async function GET(req) {
  await dbConnect();

  const { user, error, status } = await authenticate(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const groups = await Group.find({ companyId: user.companyId }).sort({ createdAt: -1 });

    return NextResponse.json(
      { success: true, data: groups },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching groups:", error.message);
    return NextResponse.json(
      { success: false, message: "Error fetching groups" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  await dbConnect();

  const { user, error, status } = await authenticate(req);
  if (error) {
    return NextResponse.json({ success: false, message: error }, { status });
  }

  try {
    const body = await req.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required" },
        { status: 400 }
      );
    }

    const newGroup = new Group({
      name,
      description,
      companyId: user.companyId, // associate with user's company
    });

    await newGroup.save();

    return NextResponse.json(
      { success:"true", message: "Group created successfully", data: newGroup },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST Error:", err.message);
    return NextResponse.json(
      { success: false, message: "Error creating group" },
      { status: 500 }
    );
  }
}





// import Group from "@/models/groupModels";

// import dbConnect from "@/lib/db";
// import { NextResponse } from "next/server";

// // Handle GET request to fetch all groups
// export async function GET() {
//   await dbConnect(); // Ensure connection is established

//   try {
//     const groups = await Group.find(); // Get all groups from the database
//     return NextResponse.json(groups, { status: 200 });
//   } catch (error) {
//     console.error("Error fetching groups:", error);
//     return NextResponse.json({ message: "Error fetching groups" }, { status: 500 });
//   }
// }

// // Handle POST request to create a new group
// export async function POST(req) {
//   await dbConnect(); // Ensure connection is established

//   try {
//     const body = await req.json();
//     const { name, description, masterId } = body;

//     // Create a new group document
//     const newGroup = new Group({
//       name,
//       description,
//       //masterId,
//       //members: [masterId], // Add the master as the first member
//     });

//     // Save the new group to the database
//     await newGroup.save();

//     return NextResponse.json(newGroup, { status: 201 });
//   } catch (error) {
//     console.error("Error creating group:", error);
//     return NextResponse.json({ message: "Error creating group" }, { status: 500 });
//   }
// }
