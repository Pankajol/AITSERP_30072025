import dbConnect from "@/lib/db";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import Lead from "@/models/crm/load";
import { NextResponse } from "next/server";

// GET /api/crm/lead-pipeline – returns leads grouped by status
export async function GET(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded?.companyId) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const companyId = decoded.companyId;

  // Define pipeline stages (order matters)
  const stages = ["New", "Contacted", "Qualified", "Lost", "Converted"];

  // Aggregate leads grouped by status
  const leads = await Lead.find({ companyId }).lean();

  const grouped = stages.reduce((acc, stage) => {
    acc[stage] = leads.filter(lead => lead.status === stage);
    return acc;
  }, {});

  return NextResponse.json({ success: true, stages, data: grouped });
}

// PATCH /api/crm/lead-pipeline – update lead stage (drag-drop)
export async function PATCH(req) {
  await dbConnect();
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const decoded = verifyJWT(token);
  if (!decoded?.companyId) return NextResponse.json({ error: "Invalid token" }, { status: 403 });

  const { leadId, newStage } = await req.json();
  if (!leadId || !newStage) {
    return NextResponse.json({ error: "leadId and newStage required" }, { status: 400 });
  }

  const lead = await Lead.findOneAndUpdate(
    { _id: leadId, companyId: decoded.companyId },
    { status: newStage },
    { new: true }
  );

  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Optional: trigger automation event here
  // await handleEvent({ companyId, entity: "Lead", entityId: lead._id, action: "stage_changed", data: lead });

  return NextResponse.json({ success: true, data: lead });
}