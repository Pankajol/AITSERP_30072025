import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Society from "@/models/society/Society";
import Resident from "@/models/society/Resident";
import Complaint from "@/models/society/Complaint";
import Flat from "@/models/society/Flat";
import VisitorPass from "@/models/society/VisitorPass";
import MaintenanceBill from "@/models/society/MaintenanceBill";
import GuardEntry from "@/models/society/GuardEntry";
import { getTokenFromHeader, verifyJWT } from "@/lib/auth";
import { startOfMonth, endOfMonth, subDays, format } from "date-fns";

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

  const isResident = user.role === "Resident" || user.roles?.includes("Resident");
  const isGuard = user.roles?.includes("Guard") || user.roles?.includes("Housekeeper");
  const isAdmin = !isResident && !isGuard;

  try {
    let data = {};

    // 1. KPI counts based on role
    if (isAdmin) {
      const totalSocieties = await Society.countDocuments({ companyId: user.companyId });
      const activeDeployments = await GuardEntry.countDocuments({ companyId: user.companyId, status: "Active" });
      const pendingComplaints = await Complaint.countDocuments({ companyId: user.companyId, status: "Pending" });
      const todayGuardsOnDuty = await GuardEntry.countDocuments({
        companyId: user.companyId,
        date: { $gte: new Date().setHours(0,0,0), $lte: new Date().setHours(23,59,59) },
        status: "OnDuty"
      });
      const todayVisitors = await VisitorPass.countDocuments({
        companyId: user.companyId,
        validFrom: { $lte: new Date() },
        validTill: { $gte: new Date() },
        status: "Approved"
      });
      const monthMaintenanceCollected = await MaintenanceBill.aggregate([
        { $match: {
            companyId: user.companyId,
            paymentStatus: "Paid",
            paidAt: { $gte: startOfMonth(new Date()), $lte: endOfMonth(new Date()) }
        } },
        { $group: { _id: null, total: { $sum: "$paidAmount" } } }
      ]);

      // Complaints trend (last 7 days)
      const complaintsTrend = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const count = await Complaint.countDocuments({
          companyId: user.companyId,
          createdAt: { $gte: new Date(day.setHours(0,0,0)), $lte: new Date(day.setHours(23,59,59)) }
        });
        complaintsTrend.push(count);
      }

      // Monthly maintenance collection (last 6 months)
      const monthlyCollection = [];
      for (let i = 5; i >= 0; i--) {
        const month = new Date();
        month.setMonth(month.getMonth() - i);
        const total = await MaintenanceBill.aggregate([
          { $match: {
              companyId: user.companyId,
              paymentStatus: "Paid",
              paidAt: { $gte: startOfMonth(month), $lte: endOfMonth(month) }
          } },
          { $group: { _id: null, total: { $sum: "$paidAmount" } } }
        ]);
        monthlyCollection.push(total[0]?.total || 0);
      }

      // Complaint status distribution
      const statusDist = await Complaint.aggregate([
        { $match: { companyId: user.companyId } },
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]);
      const complaintStatusDistribution = {};
      statusDist.forEach(s => { complaintStatusDistribution[s._id] = s.count; });

      // Recent complaints (last 5)
      const recentComplaints = await Complaint.find({ companyId: user.companyId })
        .sort({ createdAt: -1 }).limit(5).populate("flatId", "flatNumber").lean();

      // Recent visitor passes (last 5)
      const recentPasses = await VisitorPass.find({ companyId: user.companyId })
        .sort({ createdAt: -1 }).limit(5).populate("flatId", "flatNumber").lean();

      // Notifications (example: pending complaints > 5)
      const notifications = [];
      if (pendingComplaints > 5) {
        notifications.push({
          type: "complaint",
          title: "High pending complaints",
          message: `${pendingComplaints} complaints awaiting action`,
          createdAt: new Date()
        });
      }

      data = {
        totalSocieties,
        activeDeployments,
        pendingComplaints,
        todayGuardsOnDuty,
        todayVisitors,
        monthMaintenanceCollected: monthMaintenanceCollected[0]?.total || 0,
        complaintsTrend,
        monthlyCollection,
        complaintStatusDistribution,
        recentComplaints,
        recentPasses,
        notifications,
        totalResidents: await Resident.countDocuments({ companyId: user.companyId }),
      };
    }
    else if (isResident) {
      const resident = await Resident.findOne({ email: user.email, companyId: user.companyId }).populate("flatIds");
      if (!resident) throw new Error("Resident profile not found");
      const flatIds = resident.flatIds.map(f => f._id || f);
      const myComplaints = await Complaint.countDocuments({ companyId: user.companyId, flatId: { $in: flatIds } });
      const pendingComplaints = await Complaint.countDocuments({ companyId: user.companyId, flatId: { $in: flatIds }, status: "Pending" });
      const myVisitorPasses = await VisitorPass.countDocuments({ companyId: user.companyId, flatId: { $in: flatIds }, status: "Approved", validTill: { $gte: new Date() } });
      const myMaintenanceDue = await MaintenanceBill.countDocuments({ companyId: user.companyId, flatId: { $in: flatIds }, paymentStatus: "Pending" });
      const recentComplaints = await Complaint.find({ companyId: user.companyId, flatId: { $in: flatIds } }).sort({ createdAt: -1 }).limit(5).populate("flatId", "flatNumber").lean();
      const recentPasses = await VisitorPass.find({ companyId: user.companyId, flatId: { $in: flatIds } }).sort({ createdAt: -1 }).limit(5).populate("flatId", "flatNumber").lean();
      data = {
        totalSocieties: 1,
        myComplaints,
        pendingComplaints,
        todayVisitors: myVisitorPasses,
        myMaintenanceDue,
        recentComplaints,
        recentPasses,
        notifications: [],
        totalResidents: 0,
      };
    }
    else if (isGuard) {
      // Guard specific data
      const todayVisitors = await VisitorPass.countDocuments({
        companyId: user.companyId,
        validFrom: { $lte: new Date() },
        validTill: { $gte: new Date() },
        status: "Approved"
      });
      const pendingComplaints = await Complaint.countDocuments({ companyId: user.companyId, status: "Pending" });
      data = {
        myShifts: "Morning", // You can fetch from GuardAssignment model
        todayVisitors,
        pendingComplaints,
        notifications: [],
        recentComplaints: [],
        recentPasses: [],
      };
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ success: false, message: err.message }, { status: 500 });
  }
}