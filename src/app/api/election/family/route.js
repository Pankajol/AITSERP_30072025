// app/api/election/voter-family/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import VoterFamily from "@/models/election/VoterFamily";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const booth = searchParams.get("booth");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
    const search = searchParams.get("search") || "";

    if (id) {
      const family = await VoterFamily.findOne({ _id: id, companyId: user.companyId })
        .populate("members")
        .populate("booth", "boothNumber name")
        .lean();
      if (!family) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: family });
    }

    const query = { companyId: user.companyId };
    if (booth) query.booth = booth;
    if (search) {
      query.$or = [
        { headName: { $regex: search, $options: "i" } },
        { familyId: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [families, total] = await Promise.all([
      VoterFamily.find(query)
        .populate("members", "firstName lastName voterId")
        .populate("booth", "boothNumber")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      VoterFamily.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: families,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

export async function POST(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const required = ["headName", "booth"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const family = new VoterFamily({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await family.save();
    return NextResponse.json({ success: true, data: family }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create family" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const updated = await VoterFamily.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Family not found" }, { status: 404 });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Voters", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await VoterFamily.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}



// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import VoterFamily from "@/models/election/VoterFamily";
// import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// function isAuthorized(user) {
//   if (!user) return false;
//   if (user.type === "company") return true;
//   const allowedRoles = ["admin", "election manager", "canvasser"];
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

// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const booth = searchParams.get("booth");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
//     const search = searchParams.get("search") || "";

//     if (id) {
//       const family = await VoterFamily.findOne({ _id: id, companyId: user.companyId })
//         .populate("members")
//         .populate("booth", "boothNumber name")
//         .lean();
//       if (!family) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//       return NextResponse.json({ success: true, data: family });
//     }

//     const query = { companyId: user.companyId };
//     if (booth) query.booth = booth;
//     if (search) {
//       query.$or = [
//         { headName: { $regex: search, $options: "i" } },
//         { familyId: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [families, total] = await Promise.all([
//       VoterFamily.find(query)
//         .populate("members", "firstName lastName voterId")
//         .populate("booth", "boothNumber")
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//       VoterFamily.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: families,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }

// export async function POST(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const data = await req.json();
//     const required = ["headName", "booth"];
//     for (const field of required) {
//       if (!data[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }

//     const family = new VoterFamily({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });
//     await family.save();
//     return NextResponse.json({ success: true, data: family }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to create family" }, { status: 500 });
//   }
// }

// export async function PUT(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

//     const data = await req.json();
//     const updated = await VoterFamily.findOneAndUpdate(
//       { _id: id, companyId: user.companyId },
//       { ...data },
//       { new: true, runValidators: true }
//     );
//     if (!updated) return NextResponse.json({ success: false, message: "Family not found" }, { status: 404 });
//     return NextResponse.json({ success: true, data: updated });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Update failed" }, { status: 500 });
//   }
// }

// export async function DELETE(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

//     const deleted = await VoterFamily.findOneAndDelete({ _id: id, companyId: user.companyId });
//     if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//     return NextResponse.json({ success: true, message: "Deleted" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
//   }
// }