// app/api/election/worker/leaderboard/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import CompanyUser from "@/models/CompanyUser";
import { getTokenFromHeader, verifyJWT, hasPermission } from "@/lib/auth";

export async function GET(req) {
  const token = getTokenFromHeader(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await verifyJWT(token);
  if (!user || !hasPermission(user, "Workers", "view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await dbConnect();
  try {
    const workers = await CompanyUser.aggregate([
      { $match: { companyId: user.companyId, isWorker: true } },
      { $unwind: "$workerReports" },
      { $unwind: "$workerReports.activities" },
      {
        $group: {
          _id: "$_id",
          name: { $first: "$name" },
          workerRole: { $first: "$workerRole" },
          totalContacts: { $sum: "$workerReports.activities.votersContacted" },
          totalSurveys: { $sum: "$workerReports.activities.newSurveys" },
        }
      },
      { $sort: { totalContacts: -1 } },
      { $limit: 20 }
    ]);
    return NextResponse.json({ success: true, data: workers });
  } catch (err) {
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}