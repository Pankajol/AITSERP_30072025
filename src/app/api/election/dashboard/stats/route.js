// app/api/election/dashboard/stats/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Voter from "@/models/election/Voter";
import Booth from "@/models/election/Booth";
import Constituency from "@/models/election/Constituency";
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

  if (!hasPermission(user, "Election Dashboard", "view")) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  try {
    const companyId = user.companyId;
    const [totalVoters, totalBooths, totalConstituencies, strongSupporters] = await Promise.all([
      Voter.countDocuments({ companyId }),
      Booth.countDocuments({ companyId }),
      Constituency.countDocuments({ companyId }),
      Voter.countDocuments({ companyId, supportLevel: "StrongSupporter" }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalVoters,
        totalBooths,
        totalConstituencies,
        strongSupporters,
        // Also provide supportRate as a helper field (optional)
        supportRate: totalVoters > 0 ? ((strongSupporters / totalVoters) * 100).toFixed(1) : "0",
      },
    });
  } catch (err) {
    console.error("Stats error:", err);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}