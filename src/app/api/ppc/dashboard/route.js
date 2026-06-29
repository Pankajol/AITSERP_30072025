import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Operator from "@/models/ppc/operatorModel";
import Machine from "@/models/ppc/machineModel";
import Resource from "@/models/ppc/resourceModel";
import Operation from "@/models/ppc/operationModel";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import JobCard from "@/models/ppc/ProductionJobCard";

import TyreJobCard from "@/models/ppc/TyreJobCard";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// ─── Auth helpers (copy from existing) ────────────────────────
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = [
    "admin", "production head", "project manager", "site engineer",
    "sales manager", "purchase manager", "inventory manager",
    "accounts manager", "hr manager", "support executive",
  ];
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some(r => allowedRoles.includes(r.trim().toLowerCase()));
}

async function validateUser(req) {
  const token = getTokenFromHeader(req);
  if (!token) return { error: "Token missing", status: 401 };
  try {
    const user = await verifyJWT(token);
    if (!user || !isAuthorized(user)) return { error: "Unauthorized", status: 403 };
    return { user };
  } catch {
    return { error: "Invalid token", status: 401 };
  }
}

function getCompanyId(user) {
  if (user.companyId) return user.companyId;
  if (user.type === "company") return user.id || user._id;
  return user.company || user.company_id || null;
}

// ─── GET ────────────────────────────────────────────────────────
export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  try {
    // Run all counts in parallel
    const [
      totalOperators,
      activeOperators,
      totalMachines,
      totalResources,
      totalOperations,
      totalProductionOrders,
      pendingOrders,
      inProgressOrders,
      completedOrders,
      totalJobCards,
      completedJobCards,
      totalTyreJobCards,
      activeTyreJobCards,
      deliveredTyreJobCards,
      // MachineOutputs and mappings could be counted too, but we'll keep it simple
    ] = await Promise.all([
      Operator.countDocuments({ companyId }),
      Operator.countDocuments({ companyId, status: "active" }),
      Machine.countDocuments({ companyId }),
      Resource.countDocuments({ companyId }),
      Operation.countDocuments({ companyId }),
      ProductionOrder.countDocuments({ companyId }),
      ProductionOrder.countDocuments({ companyId, status: "Pending" }),
      ProductionOrder.countDocuments({ companyId, status: "In Progress" }),
      ProductionOrder.countDocuments({ companyId, status: "Completed" }),
      JobCard.countDocuments({ companyId }),
      JobCard.countDocuments({ companyId, status: "Completed" }),
      TyreJobCard.countDocuments({ companyId }),
      TyreJobCard.countDocuments({ companyId, status: { $ne: "Delivered" } }),
      TyreJobCard.countDocuments({ companyId, status: "Delivered" }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        operators: { total: totalOperators, active: activeOperators },
        machines: { total: totalMachines },
        resources: { total: totalResources },
        operations: { total: totalOperations },
        productionOrders: {
          total: totalProductionOrders,
          pending: pendingOrders,
          inProgress: inProgressOrders,
          completed: completedOrders,
        },
        jobCards: {
          total: totalJobCards,
          completed: completedJobCards,
        },
        tyreJobCards: {
          total: totalTyreJobCards,
          active: activeTyreJobCards,
          delivered: deliveredTyreJobCards,
        },
      },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}