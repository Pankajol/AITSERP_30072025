// src/app/api/helpdesk/agents/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import mongoose from "mongoose";               // <-- REQUIRED
import CompanyUser from "@/models/CompanyUser";
import Ticket from "@/models/helpdesk/Ticket";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import bcrypt from "bcryptjs";
const DEFAULT_AVATAR = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

export async function GET(req) {
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let auth;
  try { auth = verifyJWT(token); } catch (e) {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  try {
    // optional search query ?q=
    const url = new URL(req.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();

    // fetch all users in company (companyId might be string; using string is fine here)
    const all = await CompanyUser.find({ companyId: auth.companyId }).lean();

    // ---- FIX: create ObjectId with `new` ----
    // make sure companyId is a valid ObjectId string
    let companyObjId;
    try {
      companyObjId = new mongoose.Types.ObjectId(auth.companyId);
    } catch (e) {
      // if companyId is not a valid ObjectId, fallback to matching by string (safe)
      companyObjId = auth.companyId;
    }

    // aggregate assigned tickets counts
    const aggr = await Ticket.aggregate([
      {
        $match: {
          companyId: companyObjId,
          agentId: { $exists: true, $ne: null },
        },
      },
      { $group: { _id: "$agentId", count: { $sum: 1 } } },
    ]);

    const counts = {};
    (aggr || []).forEach((r) => { counts[r._id.toString()] = r.count; });

    // determine agents heuristically (roles containing 'agent' or 'support' or explicit flag)
    let agents = all
      .map((u) => ({
        _id: u._id,
        name: u.name,
        email: u.email,
        avatar: u.avatar || DEFAULT_AVATAR,
        roles: u.roles || [],
        assignedCount: counts[u._id.toString()] || 0,
      }))
      .filter((u) => {
        const roles = (u.roles || []).map((r) => String(r || "").toLowerCase());
        // treat users as agents if they explicitly have "agent" in roles or "support" keywords,
        // OR if they have assigned tickets (counts > 0)
        const likelyAgent = roles.some((r) => r.includes("agent") || r.includes("support") || r.includes("support executive"));
        return likelyAgent || (u.assignedCount && u.assignedCount > 0);
      });

    // apply simple search filter
    if (q) {
      agents = agents.filter((a) => (a.name || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q));
    }

    return NextResponse.json({ success: true, agents });
  } catch (err) {
    console.error("helpdesk.agents.GET:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  // Create a new helpdesk agent (company-scoped). Admin-only (company admin).
  await dbConnect();

  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ success: false, msg: "Unauthorized" }, { status: 401 });

  let auth;
  try { auth = verifyJWT(token); } catch (e) {
    return NextResponse.json({ success: false, msg: "Invalid token" }, { status: 403 });
  }

  // Only admin users should create agents (use robust admin check in production)
  const isAdmin = (auth.roles && Array.isArray(auth.roles) && auth.roles.map(r => String(r).toLowerCase()).includes("admin"))
                  || String(auth.role || "").toLowerCase() === "admin";
  if (!isAdmin) return NextResponse.json({ success: false, msg: "Admin only" }, { status: 403 });

  try {
    const body = await req.json();
    const { name, email, password, roles = ["Agent"], avatar, modules } = body;

    if (!name || !email) return NextResponse.json({ success: false, msg: "Name and email required" }, { status: 400 });

    const exists = await CompanyUser.findOne({ companyId: auth.companyId, email });
    if (exists) return NextResponse.json({ success: false, msg: "User already exists" }, { status: 409 });

    const rawPassword = password || Math.random().toString(36).slice(-8);
    const hash = await bcrypt.hash(rawPassword, 10);

    const u = await CompanyUser.create({
      companyId: auth.companyId,
      name,
      email,
      password: hash,
      roles: Array.isArray(roles) ? roles : [roles],
      avatar: avatar || DEFAULT_AVATAR,
      modules: modules || {},
    });

    return NextResponse.json({
      success: true,
      user: { _id: u._id, name: u.name, email: u.email, roles: u.roles, avatar: u.avatar },
    });
  } catch (err) {
    console.error("helpdesk.agents.POST:", err);
    return NextResponse.json({ success: false, msg: err.message }, { status: 500 });
  }
}
