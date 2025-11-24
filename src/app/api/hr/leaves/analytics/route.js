import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Leave from "@/models/hr/Leave";
import { withAuth, hasRole } from "@/lib/rbac";

export async function GET(req) {
  const auth = await withAuth(req);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const { user } = auth;
  await connectDB();

  if (!hasRole(user, ["Admin", "HR", "Manager"])) {
    return NextResponse.json(
      { error: "Only Admin / HR / Manager can view analytics" },
      { status: 403 }
    );
  }

  const thisYear = new Date().getFullYear();

  const agg = await Leave.aggregate([
    {
      $match: {
        companyId: user.companyId,
        fromDate: {
          $gte: new Date(`${thisYear}-01-01`),
          $lte: new Date(`${thisYear}-12-31`),
        },
        status: "Approved",
      },
    },
    {
      $group: {
        _id: {
          month: { $month: "$fromDate" },
          type: "$leaveType",
        },
        days: {
          $sum: {
            $add: [
              {
                $divide: [
                  { $subtract: ["$toDate", "$fromDate"] },
                  1000 * 60 * 60 * 24,
                ],
              },
              1,
            ],
          },
        },
      },
    },
  ]);

  // Simple heuristic "prediction": next month ≈ average of last 3 months
  const byMonth = {};
  agg.forEach((row) => {
    const month = row._id.month;
    byMonth[month] = (byMonth[month] || 0) + row.days;
  });

  const months = Object.keys(byMonth)
    .map((m) => parseInt(m))
    .sort((a, b) => a - b);

  const last3 = months.slice(-3);
  let predictedNext = 0;
  if (last3.length > 0) {
    const sum = last3.reduce((acc, m) => acc + byMonth[m], 0);
    predictedNext = sum / last3.length;
  }

  return NextResponse.json({
    year: thisYear,
    monthly: byMonth,
    predictedNextMonthDays: Number(predictedNext.toFixed(1)),
  });
}
