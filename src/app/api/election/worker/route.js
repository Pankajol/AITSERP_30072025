import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import Constituency from "@/models/election/Constituency";
import Booth from "@/models/election/Booth";
import Block from "@/models/election/Block";
import Ward from "@/models/election/Ward";
import bcrypt from "bcryptjs";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

// Mapping from worker role (as shown in UI) to internal system role
// This is still needed for access control in other parts of the app
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
  DistrictSpokesperson: "Election Analyst",
  StatePresident: "Election Admin",
  StateSecretary: "Election Manager",
  StateSpokesperson: "Election Analyst",
  StateCoordinator: "Election Manager",
  NationalPresident: "Election Admin",
  NationalSecretary: "Election Manager",
  NationalSpokesperson: "Election Analyst",
  CentralCommitteeMember: "Election Analyst",
  Coordinator: "Election Agent",
  MediaHandler: "Campaign Manager",
  SocialMediaManager: "Campaign Manager",
  DivisionPresident: "Election Manager",
};

async function getUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  const user = await verifyJWT(token);
  if (!user) return { error: "Invalid token", status: 401 };
  return { user };
}

/**
 * Create or update a CompanyUser (worker)
 * @param {Object} workerData - { name, phone, email, role, constituencyId, boothIds, blockId, wardId, district, state }
 * @param {string} companyId
 * @param {string} createdBy
 * @param {Object} modules - modules config from UI (required, no defaults)
 */
async function syncCompanyUser(workerData, companyId, createdBy, modules) {
  let email = workerData.email;
  if (!email && workerData.phone) {
    email = `${workerData.phone}@election.local`;
  }
  if (!email) throw new Error("Email or phone required");

  let companyUser = await CompanyUser.findOne({ companyId, $or: [{ email }, { phone: workerData.phone }] });
  const electionRole = ROLE_MAPPING[workerData.role] || "Election Agent";

  // 🔥 NO DEFAULT MODULES – use exactly what UI sends (could be empty object)
  const modulesToStore = modules && typeof modules === 'object' ? modules : {};

const updateData = {
  name: workerData.name,
  phone: workerData.phone,
  roles: [electionRole],
  isWorker: true,
  workerRole: workerData.role,
  assignedConstituency: workerData.constituencyId || null,
  assignedBooths: workerData.boothIds || [],
  assignedBlock: (workerData.blockId && workerData.blockId !== "") ? workerData.blockId : null,
  assignedWard: (workerData.wardId && workerData.wardId !== "") ? workerData.wardId : null,
  district: workerData.district || null,
  state: workerData.state || null,
  modules: modulesToStore,
};

  if (companyUser) {
    Object.assign(companyUser, updateData);
    await companyUser.save();
  } else {
    const defaultPassword = "Worker@123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    companyUser = new CompanyUser({
      companyId,
      email,
      password: hashedPassword,
      createdBy,
      ...updateData,
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
    .populate("assignedBlock", "blockNumber name")
    .populate("assignedWard", "wardNumber name")
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
    const { name, phone, email, role, constituencyId, boothIds, blockId, wardId, district, state, modules } = body;

    if (!name || !phone || !role) {
      return NextResponse.json({ success: false, message: "Name, phone and role required" }, { status: 400 });
    }

    // Validate block ID if provided
    if (blockId) {
      const blockExists = await Block.findOne({ _id: blockId, companyId: user.companyId });
      if (!blockExists) {
        return NextResponse.json({ success: false, message: "Invalid block ID" }, { status: 400 });
      }
    }
    // Validate ward ID if provided
    if (wardId) {
      const wardExists = await Ward.findOne({ _id: wardId, companyId: user.companyId });
      if (!wardExists) {
        return NextResponse.json({ success: false, message: "Invalid ward ID" }, { status: 400 });
      }
    }

    // modules is required – UI always sends it
    if (!modules) {
      return NextResponse.json({ success: false, message: "Permissions configuration (modules) is required" }, { status: 400 });
    }

    const companyUser = await syncCompanyUser(
      { name, phone, email, role, constituencyId, boothIds, blockId, wardId, district, state },
      user.companyId,
      user.id,
      modules
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
    const { name, phone, email, role, constituencyId, boothIds, blockId, wardId, district, state, modules } = body;

    const existing = await CompanyUser.findOne({ _id: id, companyId: user.companyId });
    if (!existing) return NextResponse.json({ success: false, message: "Worker not found" }, { status: 404 });

    // Generate email from phone if not provided
    let finalEmail = email;
    if (!finalEmail && phone) {
      finalEmail = `${phone}@election.local`;
    }

    // Update fields – only if provided (fallback to existing)
    existing.name = name || existing.name;
    existing.phone = phone || existing.phone;
    existing.email = finalEmail || existing.email;
    existing.workerRole = role || existing.workerRole;
    existing.roles = [ROLE_MAPPING[role] || "Election Agent"];
    existing.assignedConstituency = constituencyId !== undefined ? (constituencyId || null) : existing.assignedConstituency;
    existing.assignedBooths = boothIds !== undefined ? boothIds : existing.assignedBooths;
    existing.assignedBlock = blockId !== undefined ? (blockId || null) : existing.assignedBlock;
    existing.assignedWard = wardId !== undefined ? (wardId || null) : existing.assignedWard;
    existing.district = district !== undefined ? (district || null) : existing.district;
    existing.state = state !== undefined ? (state || null) : existing.state;
    if (modules !== undefined) existing.modules = modules;

    await existing.save();

    // Return populated user (optional)
    const updated = await CompanyUser.findById(id)
      .populate("assignedConstituency", "name")
      .populate("assignedBooths", "boothNumber name")
      .populate("assignedBlock", "blockNumber name")
      .populate("assignedWard", "wardNumber name")
      .select("-password");
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
// import Constituency from "@/models/election/Constituency"; // ✅ added
// import Booth from "@/models/election/Booth";
// import bcrypt from "bcryptjs";
// import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

// const ROLE_MAPPING = {
//   BoothAgent: "Booth Worker",
//   BoothPresident: "Booth Worker",
//   BoothWorker: "Booth Worker",
//   Canvasser: "Election Agent",
//   WardPresident: "Election Agent",
//   WardCoordinator: "Election Agent",
//   BlockPresident: "Election Manager",
//   BlockIncharge: "Election Manager",
//   DistrictPresident: "Election Manager",
//   DistrictCoordinator: "Election Analyst",
//   StatePresident: "Election Admin",
//   StateSecretary: "Election Manager",
//   StateSpokesperson: "Election Analyst",
//   NationalPresident: "Election Admin",
//   NationalSecretary: "Election Manager",
//   CentralCommitteeMember: "Election Analyst",
//   Coordinator: "Election Agent",
//   MediaHandler: "Campaign Manager",
//   SocialMediaManager: "Campaign Manager",
// };

// const DEFAULT_MODULES = {
//   "Booth Worker": {
//     selected: true,
//     permissions: { create: true, view: true, edit: true, delete: false, print: false, approve: false, reject: false, import: false, export: false, upload: false, download: false, email: false, copy: false, whatsapp: false }
//   },
//   "Election Agent": {
//     selected: true,
//     permissions: { create: true, view: true, edit: true, delete: false, print: false, approve: false, reject: false, import: false, export: true, upload: false, download: false, email: true, copy: false, whatsapp: true }
//   },
//   "Election Manager": {
//     selected: true,
//     permissions: { create: true, view: true, edit: true, delete: true, print: true, approve: true, reject: true, import: true, export: true, upload: true, download: true, email: true, copy: true, whatsapp: true }
//   },
//   "Election Analyst": {
//     selected: true,
//     permissions: { create: false, view: true, edit: false, delete: false, print: true, approve: false, reject: false, import: false, export: true, upload: false, download: true, email: false, copy: false, whatsapp: false }
//   },
//   "Campaign Manager": {
//     selected: true,
//     permissions: { create: true, view: true, edit: true, delete: false, print: true, approve: false, reject: false, import: false, export: true, upload: true, download: false, email: true, copy: false, whatsapp: true }
//   },
//   "Election Admin": {
//     selected: true,
//     permissions: { create: true, view: true, edit: true, delete: true, print: true, approve: true, reject: true, import: true, export: true, upload: true, download: true, email: true, copy: true, whatsapp: true }
//   },
// };

// async function getUser(req) {
//   const token = getTokenFromHeader(req);
//   if (!token) return { error: "Token missing", status: 401 };
//   const user = await verifyJWT(token);
//   if (!user) return { error: "Invalid token", status: 401 };
//   return { user };
// }

// // Helper to create or update CompanyUser for a worker
// async function syncCompanyUser(workerData, companyId, createdBy) {
//   let email = workerData.email;
//   if (!email && workerData.phone) {
//     email = `${workerData.phone}@election.local`;
//   }
//   if (!email) throw new Error("Email or phone required");

//   let companyUser = await CompanyUser.findOne({ companyId, $or: [{ email }, { phone: workerData.phone }] });
//   const electionRole = ROLE_MAPPING[workerData.role] || "Election Agent";
//   const modules = DEFAULT_MODULES[electionRole] ? { [electionRole]: DEFAULT_MODULES[electionRole] } : {};

//   if (companyUser) {
//     // Update existing user
//     companyUser.name = workerData.name;
//     companyUser.phone = workerData.phone;
//     companyUser.roles = [electionRole];
//     companyUser.isWorker = true;
//     companyUser.workerRole = workerData.role;
//     companyUser.assignedConstituency = workerData.constituencyId || null;
//     companyUser.assignedBooths = workerData.boothIds || [];
//     companyUser.modules = modules;
//     await companyUser.save();
//   } else {
//     // Create new user with default password
//     const defaultPassword = "Worker@123";
//     const hashedPassword = await bcrypt.hash(defaultPassword, 10);
//     companyUser = new CompanyUser({
//       companyId,
//       name: workerData.name,
//       email,
//       phone: workerData.phone,
//       password: hashedPassword,
//       roles: [electionRole],
//       isWorker: true,
//       workerRole: workerData.role,
//       assignedConstituency: workerData.constituencyId || null,
//       assignedBooths: workerData.boothIds || [],
//       modules,
//       createdBy,
//     });
//     await companyUser.save();
//   }
//   return companyUser;
// }

// export async function GET(req) {
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });
//   if (!hasPermission(user, "Workers", "view")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }
//   await dbConnect();
//   const workers = await CompanyUser.find({ companyId: user.companyId, isWorker: true })
//     .populate("assignedConstituency", "name")
//     .populate("assignedBooths", "boothNumber name")
//     .select("-password")
//     .sort({ createdAt: -1 });
//   return NextResponse.json({ success: true, data: workers });
// }

// export async function POST(req) {
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });
//   if (!hasPermission(user, "Workers", "create")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }
//   await dbConnect();
//   try {
//     const body = await req.json();
//     const { name, phone, email, role, levelGroup, constituencyId, boothIds, ward, block, district, state } = body;
//     if (!name || !phone || !role) {
//       return NextResponse.json({ success: false, message: "Name, phone and role required" }, { status: 400 });
//     }
//     const companyUser = await syncCompanyUser(
//       { name, phone, email, role, constituencyId, boothIds, ward, block, district, state },
//       user.companyId,
//       user.id
//     );
//     return NextResponse.json({ success: true, data: companyUser }, { status: 201 });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }

// export async function PUT(req) {
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });
//   if (!hasPermission(user, "Workers", "edit")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }
//   await dbConnect();
//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
//     const body = await req.json();
//     const { name, phone, email, role, constituencyId, boothIds, ward, block, district, state } = body;
//     const existing = await CompanyUser.findOne({ _id: id, companyId: user.companyId });
//     if (!existing) return NextResponse.json({ success: false, message: "Worker not found" }, { status: 404 });
//     const updated = await syncCompanyUser(
//       { name: name || existing.name, phone: phone || existing.phone, email, role: role || existing.workerRole, constituencyId, boothIds, ward, block, district, state },
//       user.companyId,
//       user.id
//     );
//     return NextResponse.json({ success: true, data: updated });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }

// export async function DELETE(req) {
//   const { user, error, status } = await getUser(req);
//   if (error) return NextResponse.json({ success: false, message: error }, { status });
//   if (!hasPermission(user, "Workers", "delete")) {
//     return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
//   }
//   await dbConnect();
//   try {
//     const { searchParams } = new URL(req.url);
//     const id = searchParams.get("id");
//     if (!id) return NextResponse.json({ success: false, message: "ID required" }, { status: 400 });
//     const deleted = await CompanyUser.findOneAndDelete({ _id: id, companyId: user.companyId, isWorker: true });
//     if (!deleted) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
//     return NextResponse.json({ success: true, message: "Worker deleted" });
//   } catch (err) {
//     console.error(err);
//     return NextResponse.json({ success: false, message: err.message }, { status: 500 });
//   }
// }





