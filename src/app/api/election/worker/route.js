// app/api/election/worker/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Constituency from "@/models/election/Constituency"; // ✅ added
import Booth from "@/models/election/Booth";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

const ROLE_MAPPING = {
  BoothAgent: "Booth Worker",
  BoothPresident: "Booth Worker",
  BoothWorker: "Booth Worker",
  Canvasser: "Election Agent",
  WardPresident: "Election Agent",
  WardCoordinator: "Election Agent",
  BlockPresident: "Election Manager",
  BlockIncharge: "Election Manager",
  DistrictPresident: "Election Manager",
  DistrictCoordinator: "Election Analyst",
  StatePresident: "Election Admin",
  StateSecretary: "Election Manager",
  StateSpokesperson: "Election Analyst",
  NationalPresident: "Election Admin",
  NationalSecretary: "Election Manager",
  CentralCommitteeMember: "Election Analyst",
  Coordinator: "Election Agent",
  MediaHandler: "Campaign Manager",
  SocialMediaManager: "Campaign Manager",
};

const DEFAULT_MODULES = {
  "Booth Worker": {
    selected: true,
    permissions: { create: true, view: true, edit: true, delete: false, print: false, approve: false, reject: false, import: false, export: false, upload: false, download: false, email: false, copy: false, whatsapp: false }
  },
  "Election Agent": {
    selected: true,
    permissions: { create: true, view: true, edit: true, delete: false, print: false, approve: false, reject: false, import: false, export: true, upload: false, download: false, email: true, copy: false, whatsapp: true }
  },
  "Election Manager": {
    selected: true,
    permissions: { create: true, view: true, edit: true, delete: true, print: true, approve: true, reject: true, import: true, export: true, upload: true, download: true, email: true, copy: true, whatsapp: true }
  },
  "Election Analyst": {
    selected: true,
    permissions: { create: false, view: true, edit: false, delete: false, print: true, approve: false, reject: false, import: false, export: true, upload: false, download: true, email: false, copy: false, whatsapp: false }
  },
  "Campaign Manager": {
    selected: true,
    permissions: { create: true, view: true, edit: true, delete: false, print: true, approve: false, reject: false, import: false, export: true, upload: true, download: false, email: true, copy: false, whatsapp: true }
  },
  "Election Admin": {
    selected: true,
    permissions: { create: true, view: true, edit: true, delete: true, print: true, approve: true, reject: true, import: true, export: true, upload: true, download: true, email: true, copy: true, whatsapp: true }
  },
};

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

// Helper to create or update CompanyUser for a worker
async function syncCompanyUser(workerData, companyId, createdBy) {
  let email = workerData.email;
  if (!email && workerData.phone) {
    email = `${workerData.phone}@election.local`;
  }
  if (!email) throw new Error("Email or phone required");

  let companyUser = await CompanyUser.findOne({ companyId, $or: [{ email }, { phone: workerData.phone }] });
  const electionRole = ROLE_MAPPING[workerData.role] || "Election Agent";
  const modules = DEFAULT_MODULES[electionRole] ? { [electionRole]: DEFAULT_MODULES[electionRole] } : {};

  if (companyUser) {
    // Update existing user
    companyUser.name = workerData.name;
    companyUser.phone = workerData.phone;
    companyUser.roles = [electionRole];
    companyUser.isWorker = true;
    companyUser.workerRole = workerData.role;
    companyUser.assignedConstituency = workerData.constituencyId || null;
    companyUser.assignedBooths = workerData.boothIds || [];
    companyUser.modules = modules;
    await companyUser.save();
  } else {
    // Create new user with default password
    const defaultPassword = "Worker@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    companyUser = new CompanyUser({
      companyId,
      name: workerData.name,
      email,
      phone: workerData.phone,
      password: hashedPassword,
      roles: [electionRole],
      isWorker: true,
      workerRole: workerData.role,
      assignedConstituency: workerData.constituencyId || null,
      assignedBooths: workerData.boothIds || [],
      modules,
      createdBy,
    });
    await companyUser.save();
  }
  return companyUser;
}

export async function GET(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Workers", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  const workers = await CompanyUser.find({ companyId: user.companyId, isWorker: true })
    .populate("assignedConstituency", "name")
    .populate("assignedBooths", "boothNumber name")
    .select("-password")
    .sort({ createdAt: -1 });
  return NextResponse.json({ success: true, data: workers });
}

export async function POST(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Workers", "create")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  try {
    const body = await req.json();
    const { name, phone, email, role, levelGroup, constituencyId, boothIds, ward, block, district, state } = body;
    if (!name || !phone || !role) {
      return NextResponse.json({ success: false, message: "Name, phone and role required" }, { status: 400 });
    }
    const companyUser = await syncCompanyUser(
      { name, phone, email, role, constituencyId, boothIds, ward, block, district, state },
      user.companyId,
      user.id
    );
    return NextResponse.json({ success: true, data: companyUser }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function PUT(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Workers", "edit")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    const body = await req.json();
    const { name, phone, email, role, constituencyId, boothIds, ward, block, district, state } = body;
    const existing = await CompanyUser.findOne({ _id: id, companyId: user.companyId });
    if (!existing) return NextResponse.json({ success: false, message: "Worker not found" }, { status: 404 });
    const updated = await syncCompanyUser(
      { name: name || existing.name, phone: phone || existing.phone, email, role: role || existing.workerRole, constituencyId, boothIds, ward, block, district, state },
      user.companyId,
      user.id
    );
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  const { user, error, status } = await getUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });
  if (!hasPermission(user, "Workers", "delete")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
    const deleted = await CompanyUser.findOneAndDelete({ _id: id, companyId: user.companyId, isWorker: true });
    if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, message: "Worker deleted" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}






// // app/api/election/worker/route.js
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import CompanyUser from "@/models/CompanyUser";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

// async function getUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   const user = await verifyJWT(token);
//   if (!user) return { error: "Invalid token", status: 401 };
//   return { user };
// }

// export async function GET(req) {
//   await dbConnect();
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });

//   if (!hasPermission(user, "Workers", "view")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }

//   try {
//     const { searchParams } = new URL(req.url);
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);
//     const search = searchParams.get("search") || "";

//     const query = {
//       companyId: user.companyId,
//       isWorker: true,
//     };

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [workers, total] = await Promise.all([
//       CompanyUser.find(query)
//         .select("-password")
//         .populate("assignedConstituency", "name")
//         .populate("assignedBooths", "boothNumber name")
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//       CompanyUser.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: workers,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }




// // app/api/election/worker/route.js
// import { NextResponse } from "next/server";
// import dbConnect from "@/lib/db";
// import CompanyUser from "@/models/CompanyUser";  // आपका CompanyUser मॉडल
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
//     const page = Math.max(parseInt(searchParams.get("page")) || 1, 1);
//     const limit = Math.min(parseInt(searchParams.get("limit")) || 20, 100);
//     const search = searchParams.get("search") || "";

//     const query = {
//       companyId: user.companyId,
//       isWorker: true,
//     };

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { email: { $regex: search, $options: "i" } },
//       ];
//     }

//     const skip = (page - 1) * limit;
//     const [workers, total] = await Promise.all([
//       CompanyUser.find(query)
//         .select("-password")
//         .populate("assignedConstituency", "name")
//         .populate("assignedBooths", "boothNumber name")
//         .skip(skip)
//         .limit(limit)
//         .sort({ createdAt: -1 })
//         .lean(),
//       CompanyUser.countDocuments(query),
//     ]);

//     return NextResponse.json({
//       success: true,
//       data: workers,
//       meta: { page, limit, total, pages: Math.ceil(total / limit) },
//     });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
//   }
// }