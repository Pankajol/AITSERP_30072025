// src/app/api/helpdesk/agents/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose"; // <-- REQUIRED
import CompanyUser from "@/models/CompanyUser";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";

/* --------------------- Helper: admin checker ---------------------- */
function isAdminUser(auth) {
  if (!auth) return false;

  // role or role.name
  const roleStr = auth?.role?.name || auth?.role;
  if (roleStr && String(roleStr).toLowerCase() === "admin") return true;

  // roles array
  if (Array.isArray(auth.roles)) {
    const lower = auth.roles.map((r) => String(r).toLowerCase());
    if (lower.includes("admin")) return true;
  }

  return false;
}

/* ---------------------------- GET AGENT ---------------------------- */
export async function GET(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token)
    return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let auth;
  try {
    auth = verifyJWT(token);
  } catch (e) {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  try {
    const id = params.id;

    // ensure companyId type matches
    const companyId = auth.companyId;
    const queryCompany = mongoose.isValidObjectId(companyId)
      ? new mongoose.Types.ObjectId(companyId)
      : companyId;

    const agent = await CompanyUser.findOne({
      _id: id,
      companyId: queryCompany,
    }).lean();

    if (!agent)
      return NextResponse.json(
        { success: false, msg: "Agent not found" },
        { status: 404 }
      );

    const tickets = await Ticket.find({
      companyId: queryCompany,
      agentId: id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ success: true, agent, tickets });
  } catch (err) {
    console.error("helpdesk.agents.[id].GET:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}

/* ---------------------------- UPDATE AGENT ---------------------------- */
export async function PUT(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token)
    return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let auth;
  try {
    auth = verifyJWT(token);
  } catch (e) {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  if (!isAdminUser(auth))
    return NextResponse.json({ success: false, msg: "Admin only" }, { status: 403 });

  try {
    const id = params.id;
    const body = await req.json();

    const agent = await CompanyUser.findById(id);
    if (!agent)
      return NextResponse.json({ success: false, msg: "Not found" }, { status: 404 });

    if (agent.companyId.toString() !== auth.companyId.toString())
      return NextResponse.json({ success: false, msg: "Forbidden" }, { status: 403 });

    const { name, email, password, roles, avatar, modules } = body;

    if (name) agent.name = name;
    if (email) agent.email = email;
    if (roles) agent.roles = Array.isArray(roles) ? roles : [roles];
    if (modules) agent.modules = modules;
    if (avatar) agent.avatar = avatar;

    if (password && password.trim() !== "")
      agent.password = await bcrypt.hash(password, 10);

    await agent.save();

    return NextResponse.json({
      success: true,
      agent: {
        _id: agent._id,
        name: agent.name,
        email: agent.email,
        roles: agent.roles,
        avatar: agent.avatar,
      },
    });
  } catch (err) {
    console.error("helpdesk.agents.[id].PUT:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}

/* ---------------------------- DELETE AGENT ---------------------------- */
export async function DELETE(req, { params }) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token)
    return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let auth;
  try {
    auth = verifyJWT(token);
  } catch (e) {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  if (!isAdminUser(auth))
    return NextResponse.json({ success: false, msg: "Admin only" }, { status: 403 });

  try {
    const id = params.id;

    const agent = await CompanyUser.findById(id);
    if (!agent)
      return NextResponse.json({ success: false, msg: "Not found" }, { status: 404 });

    if (agent.companyId.toString() !== auth.companyId.toString())
      return NextResponse.json({ success: false, msg: "Forbidden" }, { status: 403 });

    // Unassign tickets (set agentId = null)
    await Ticket.updateMany(
      { companyId: auth.companyId, agentId: id },
      { $set: { agentId: null } }
    );

    await CompanyUser.deleteOne({ _id: id });

    return NextResponse.json({ success: true, msg: "Deleted" });
  } catch (err) {
    console.error("helpdesk.agents.[id].DELETE:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
