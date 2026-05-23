// app/api/election/survey/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Survey from "@/models/election/Survey";
import CompanyUser from "@/models/CompanyUser";
import Constituency from "@/models/election/Constituency";
import Booth from "@/models/election/Booth";
import Voter from "@/models/election/Voter";
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

  if (!hasPermission(user, "Election Surveys", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
    const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
    const statusFilter = searchParams.get("status");
    const constituency = searchParams.get("constituency");
    const search = searchParams.get("search") || "";

    if (id) {
      const survey = await Survey.findOne({ _id: id, companyId: user.companyId })
        .populate("assignedWorkers", "name email")
        .populate("constituency", "name")
        .lean();
      if (!survey) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
      return NextResponse.json({ success: true, data: survey });
    }

    const query = { companyId: user.companyId };
    if (statusFilter) query.status = statusFilter;
    if (constituency) query.constituency = constituency;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [surveys, total] = await Promise.all([
      Survey.find(query)
        .populate("assignedWorkers", "name")
        .populate("constituency", "name")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean(),
      Survey.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: surveys,
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

  if (!hasPermission(user, "Election Surveys", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await req.json();
    const required = ["title"];
    for (const field of required) {
      if (!data[field]) {
        return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
      }
    }

    const survey = new Survey({
      ...data,
      companyId: user.companyId,
      createdBy: user.id,
    });
    await survey.save();
    return NextResponse.json({ success: true, data: survey }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Failed to create survey" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  if (!hasPermission(user, "Election Surveys", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const data = await req.json();
    const updated = await Survey.findOneAndUpdate(
      { _id: id, companyId: user.companyId },
      { ...data },
      { new: true, runValidators: true }
    );
    if (!updated) return NextResponse.json({ success: false, message: "Survey not found" }, { status: 404 });
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

  if (!hasPermission(user, "Election Surveys", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });

    const deleted = await Survey.findOneAndDelete({ _id: id, companyId: user.companyId });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
  }
}




// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import Survey from "@/models/election/Survey";
// import CompanyUser from "@/models/CompanyUser";
// import Constituency from "@/models/election/Constituency";

// import Booth from "@/models/election/Booth";
// import Voter from "@/models/election/Voter";
// import VoterFamily from "@/models/election/VoterFamily";
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

// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await validateUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 10, 50);
//     const statusFilter = searchParams.get("status");
//     const constituency = searchParams.get("constituency");
//     const search = searchParams.get("search") || "";

//     if (id) {
//       const survey = await Survey.findOne({ _id: id, companyId: user.companyId })
//         .populate("assignedWorkers", "name email")
//         .populate("constituency", "name")
//         .lean();
//       if (!survey) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//       return NextResponse.json({ success: true, data: survey });
//     }

//     const query = { companyId: user.companyId };
//     if (statusFilter) query.status = statusFilter;
//     if (constituency) query.constituency = constituency;
//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [surveys, total] = await Promise.all([
//       Survey.find(query)
//         .populate("assignedWorkers", "name")
//         .populate("constituency", "name")
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//       Survey.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: surveys,
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
//     const required = ["title"];
//     for (const field of required) {
//       if (!data[field]) {
//         return NextResponse.json({ success: false, message: `${field} is required` }, { status: 400 });
//       }
//     }

//     const survey = new Survey({
//       ...data,
//       companyId: user.companyId,
//       createdBy: user.id,
//     });
//     await survey.save();
//     return NextResponse.json({ success: true, data: survey }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Failed to create survey" }, { status: 500 });
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
//     const updated = await Survey.findOneAndUpdate(
//       { _id: id, companyId: user.companyId },
//       { ...data },
//       { new: true, runValidators: true }
//     );
//     if (!updated) return NextResponse.json({ success: false, message: "Survey not found" }, { status: 404 });
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

//     const deleted = await Survey.findOneAndDelete({ _id: id, companyId: user.companyId });
//     if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//     return NextResponse.json({ success: true, message: "Deleted" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Delete failed" }, { status: 500 });
//   }
// }