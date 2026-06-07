"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { format } from "date-fns";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Pie } from "react-chartjs-2";
import {
  FiHome, FiUserCheck, FiAlertCircle, FiDollarSign, FiTruck, FiUsers,
  FiLoader, FiCalendar, FiBell, FiArrowRight, FiTrendingUp, FiTrendingDown
} from "react-icons/fi";

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement,
  ArcElement, Title, Tooltip, Legend, Filler
);

const statusColor = (status) => {
  const map = {
    Pending: "bg-yellow-100 text-yellow-800",
    Assigned: "bg-blue-100 text-blue-800",
    InProgress: "bg-indigo-100 text-indigo-800",
    Resolved: "bg-green-100 text-green-800",
    Closed: "bg-gray-100 text-gray-800",
    Approved: "bg-green-100 text-green-800",
  };
  return map[status] || "bg-gray-100 text-gray-800";
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [greeting, setGreeting] = useState("");
  const [stats, setStats] = useState(null);
  const [recentComplaints, setRecentComplaints] = useState([]);
  const [recentPasses, setRecentPasses] = useState([]);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }
      // Decode role for UI customisation
      let role = "Admin";
      try {
        const decoded = jwtDecode(token);
        role = decoded.role || (decoded.roles?.[0]) || "Admin";
      } catch (e) {}
      setUserRole(role);

      try {
        const response = await axios.get("/api/societymanagement/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data.success) {
          const data = response.data.data;
          setStats(data);
          setRecentComplaints(data.recentComplaints || []);
          setRecentPasses(data.recentPasses || []);
          setNotifications(data.notifications || []);
        } else {
          console.error("Dashboard API error:", response.data.message);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-28 bg-white rounded-2xl shadow-sm border border-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-center py-20 text-gray-400">Unable to load dashboard data. Please try again later.</div>;
  }

  const isAdmin = userRole !== "Resident" && userRole !== "Guard" && userRole !== "Housekeeper";
  const isResident = userRole === "Resident";
  const isGuard = userRole === "Guard" || userRole === "Housekeeper";

  // KPI Cards (using real stats)
  const adminCards = [
    { label: "Total Societies", value: stats.totalSocieties, icon: FiHome, color: "text-indigo-600 bg-indigo-50", change: "+12%", trend: "up" },
    { label: "Active Deployments", value: stats.activeDeployments, icon: FiUserCheck, color: "text-green-600 bg-green-50", change: "+5%", trend: "up" },
    { label: "Pending Complaints", value: stats.pendingComplaints, icon: FiAlertCircle, color: "text-red-600 bg-red-50", change: "-2%", trend: "down" },
    { label: "Guards On Duty", value: stats.todayGuardsOnDuty, icon: FiUsers, color: "text-blue-600 bg-blue-50", change: "0%", trend: "neutral" },
    { label: "Today's Visitors", value: stats.todayVisitors, icon: FiTruck, color: "text-purple-600 bg-purple-50", change: "+8%", trend: "up" },
    { label: "Collection (Month)", value: `₹${stats.monthMaintenanceCollected?.toLocaleString()}`, icon: FiDollarSign, color: "text-yellow-600 bg-yellow-50", change: "+15%", trend: "up" },
  ];
  const residentCards = [
    { label: "My Society", value: stats.totalSocieties || 1, icon: FiHome, color: "text-indigo-600 bg-indigo-50" },
    { label: "My Complaints", value: stats.myComplaints || 0, icon: FiAlertCircle, color: "text-red-600 bg-red-50" },
    { label: "Pending Complaints", value: stats.pendingComplaints || 0, icon: FiAlertCircle, color: "text-orange-600 bg-orange-50" },
    { label: "Active Visitor Passes", value: stats.todayVisitors || 0, icon: FiTruck, color: "text-purple-600 bg-purple-50" },
    { label: "Maintenance Due", value: stats.myMaintenanceDue || 0, icon: FiDollarSign, color: "text-yellow-600 bg-yellow-50" },
  ];
  const guardCards = [
    { label: "Today's Shift", value: stats.myShifts || "Morning", icon: FiUserCheck, color: "text-blue-600 bg-blue-50" },
    { label: "Today's Visitors", value: stats.todayVisitors || 0, icon: FiTruck, color: "text-purple-600 bg-purple-50" },
    { label: "Pending Complaints", value: stats.pendingComplaints || 0, icon: FiAlertCircle, color: "text-red-600 bg-red-50" },
  ];
  const cards = isAdmin ? adminCards : (isResident ? residentCards : guardCards);

  // Charts data (only for admin)
  const complaintsTrendData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [{ label: "Complaints", data: stats.complaintsTrend || [0,0,0,0,0,0,0], borderColor: "rgb(99, 102, 241)", backgroundColor: "rgba(99, 102, 241, 0.1)", tension: 0.4, fill: true, pointBackgroundColor: "rgb(99, 102, 241)" }],
  };
  const monthlyCollectionData = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [{ label: "Maintenance Collection (₹)", data: stats.monthlyCollection || [0,0,0,0,0,0], backgroundColor: "rgba(34, 197, 94, 0.6)", borderRadius: 8 }],
  };
  const complaintStatusData = {
    labels: Object.keys(stats.complaintStatusDistribution || {}),
    datasets: [{ data: Object.values(stats.complaintStatusDistribution || {}), backgroundColor: ["#f59e0b", "#3b82f6", "#8b5cf6", "#10b981"], borderWidth: 0 }],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{greeting}, {isResident ? "Resident" : (userRole || "Admin")}!</h1>
          <p className="text-gray-500 mt-1">Here's what's happening with your society today.</p>
        </div>
        <div className="mt-2 sm:mt-0 flex items-center gap-2 text-sm text-gray-500">
          <FiCalendar className="text-base" />
          <span>{format(new Date(), "EEEE, MMMM d, yyyy")}</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 mb-8">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-start justify-between">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <Icon className="text-xl" />
                </div>
                {card.change && (
                  <span className={`text-xs font-semibold flex items-center gap-1 ${card.trend === 'up' ? 'text-green-600' : card.trend === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                    {card.trend === 'up' ? <FiTrendingUp /> : card.trend === 'down' ? <FiTrendingDown /> : null}
                    {card.change}
                  </span>
                )}
              </div>
              <div className="mt-3">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{card.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts – Admin only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4">Complaints Trend (Last 7 Days)</h3>
            <Line data={complaintsTrendData} options={{ responsive: true, maintainAspectRatio: true }} height={250} />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-800 mb-4">Monthly Maintenance Collection</h3>
            <Bar data={monthlyCollectionData} options={{ responsive: true, maintainAspectRatio: true }} height={250} />
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 lg:col-span-2 flex flex-col lg:flex-row gap-6">
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-800 mb-4">Complaint Status Distribution</h3>
              <Pie data={complaintStatusData} options={{ responsive: true, maintainAspectRatio: true }} height={200} />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-800 mb-4">Quick Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Resolution Rate</span>
                  <span className="font-bold text-green-600">{stats.resolutionRate || 0}%</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Avg. Response Time</span>
                  <span className="font-bold text-blue-600">{stats.avgResponseTime || 0} hrs</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                  <span className="text-sm text-gray-600">Active Residents</span>
                  <span className="font-bold text-indigo-600">{stats.totalResidents || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Complaints */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">Recent Complaints</h3>
            <a href="/societymanagement/complaint" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">View All <FiArrowRight /></a>
          </div>
          <div className="divide-y divide-gray-100">
            {recentComplaints.length === 0 ? (
              <p className="text-gray-400 text-sm p-5 text-center">No complaints yet</p>
            ) : (
              recentComplaints.slice(0, 4).map((complaint) => (
                <div key={complaint._id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{complaint.category}</p>
                      <p className="text-sm text-gray-500 line-clamp-1">{complaint.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Flat {complaint.flatId?.flatNumber}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColor(complaint.status)}`}>
                      {complaint.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Visitor Passes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-base font-bold text-gray-800">{isResident ? "My Visitor Passes" : "Recent Visitor Passes"}</h3>
            <a href="/societymanagement/visitor-pass" className="text-indigo-600 text-sm hover:underline flex items-center gap-1">View All <FiArrowRight /></a>
          </div>
          <div className="divide-y divide-gray-100">
            {recentPasses.length === 0 ? (
              <p className="text-gray-400 text-sm p-5 text-center">No visitor passes</p>
            ) : (
              recentPasses.slice(0, 4).map((pass) => (
                <div key={pass._id} className="p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{pass.visitorName}</p>
                      <p className="text-sm text-gray-500">Flat {pass.flatId?.flatNumber}</p>
                      <p className="text-xs text-gray-400">Valid: {format(new Date(pass.validFrom), "dd MMM")}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      pass.status === "Approved" ? "bg-green-100 text-green-800" : 
                      pass.status === "Pending" ? "bg-yellow-100 text-yellow-800" : "bg-gray-100 text-gray-800"
                    }`}>
                      {pass.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FiBell className="text-gray-500" />
          <h3 className="text-base font-bold text-gray-800">Notifications</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {notifications.length === 0 ? (
            <p className="text-gray-400 text-sm p-5 text-center">No new notifications</p>
          ) : (
            notifications.map((notif, idx) => (
              <div key={idx} className="p-4 flex items-start gap-3 hover:bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                  {notif.type === "complaint" ? <FiAlertCircle /> : <FiBell />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{notif.title}</p>
                  <p className="text-xs text-gray-500">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{format(new Date(notif.createdAt), "dd MMM, hh:mm a")}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}