import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import JobCard from "@/models/ppc/JobCardModel";
import ProductionOrder from "@/models/ppc/ProductionOrder";
import Machine from "@/models/ppc/machineModel";
import Operator from "@/models/ppc/operatorModel";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";

// Auth helpers (same as before)
function isAuthorized(user) {
  if (!user) return false;
  if (user.type === "company") return true;
  const allowedRoles = ["admin", "production head", "project manager", "site engineer"];
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

export async function GET(req) {
  await dbConnect();
  const { user, error, status } = await validateUser(req);
  if (error) return NextResponse.json({ success: false, message: error }, { status });

  const companyId = getCompanyId(user);
  if (!companyId) return NextResponse.json({ success: false, message: "No company" }, { status: 400 });

  try {
    // Run all counts in parallel
    const [
      totalJobCards,
      completedJobCards,
      inProgressJobCards,
      totalProductionOrders,
      completedOrders,
      totalMachines,
      totalOperators,
      // Downtime aggregation (optional – if you have a Downtime model)
      // You can add similar counts for downtime if needed
    ] = await Promise.all([
      JobCard.countDocuments({ companyId }),
      JobCard.countDocuments({ companyId, status: "completed" }),
      JobCard.countDocuments({ companyId, status: "in progress" }),
      ProductionOrder.countDocuments({ companyId }),
      ProductionOrder.countDocuments({ companyId, status: "Completed" }),
      Machine.countDocuments({ companyId }),
      Operator.countDocuments({ companyId }),
    ]);

    // Calculate job card completion rate
    const completionRate = totalJobCards > 0
      ? Math.round((completedJobCards / totalJobCards) * 100)
      : 0;

    // Order completion rate
    const orderCompletionRate = totalProductionOrders > 0
      ? Math.round((completedOrders / totalProductionOrders) * 100)
      : 0;

    // Average job card duration (simple: total duration / completed count)
    const avgDurationResult = await JobCard.aggregate([
      { $match: { companyId, status: "completed", totalDuration: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgDuration: { $avg: "$totalDuration" } } }
    ]);
    const avgJobDurationSeconds = avgDurationResult[0]?.avgDuration || 0;

    // Machine utilisation: count unique machines used in active job cards
    const activeMachines = await JobCard.distinct("machine", {
      companyId,
      status: { $in: ["in progress", "on_hold"] }
    });
    const machineUtilisationPercent = totalMachines > 0
      ? Math.round((activeMachines.length / totalMachines) * 100)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        jobCards: {
          total: totalJobCards,
          completed: completedJobCards,
          inProgress: inProgressJobCards,
          completionRate,
          avgDurationSeconds: Math.round(avgJobDurationSeconds),
        },
        productionOrders: {
          total: totalProductionOrders,
          completed: completedOrders,
          completionRate: orderCompletionRate,
        },
        machines: {
          total: totalMachines,
          active: activeMachines.length,
          utilisationPercent: machineUtilisationPercent,
        },
        operators: {
          total: totalOperators,
          // You can add active operators count similarly
        },
      },
    });
  } catch (err) {
    console.error("Reports API error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}