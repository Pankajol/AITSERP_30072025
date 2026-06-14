// app/(dashboard)/election/page.js
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import {
  FiUsers, FiHome, FiTrendingUp, FiDollarSign, FiBarChart2,
  FiUserPlus, FiActivity, FiPieChart, FiMic, FiRadio
} from "react-icons/fi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import WorkerLeaderboard from "@/components/election/WorkerLeaderboard";
import MediaImpactChart from "@/components/election/MediaImpactChart";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// Worker role mapping (same as in Workers page)
const WORKER_ROLES = {
  "Booth Level": [
    "BoothAgent", "BoothPresident", "BoothWorker"
  ],
  "Ward / Village Level": [
    "WardPresident", "WardCoordinator", "Canvasser"
  ],
  "Block / Taluka Level": [
    "BlockPresident", "BlockIncharge"
  ],
  "District Level": [
    "DistrictPresident", "DistrictCoordinator", "DistrictSpokesperson"
  ],
  "State Level": [
    "StatePresident", "StateSecretary", "StateSpokesperson", "StateCoordinator"
  ],
  "National Level": [
    "NationalPresident", "NationalSecretary", "NationalSpokesperson", "CentralCommitteeMember"
  ],
};

// Helper: get the level name from workerRole
function getWorkerLevel(workerRole) {
  for (const [level, roles] of Object.entries(WORKER_ROLES)) {
    if (roles.includes(workerRole)) return level;
  }
  return null;
}

// Decode JWT payload
function decodeTokenPayload(token) {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

export default function ElectionDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    stats: { totalVoters: 0, totalBooths: 0, strongSupporters: 0, totalExpenses: 0 },
    topBooths: [],
    recentVoters: [],
    expenseCategories: [],
    supportDist: [],
    workerActivities: [],
    rallies: [],
    mediaCampaigns: [],
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // 1. Decode user from token
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    const payload = decodeTokenPayload(token);
    if (!payload) {
      setLoading(false);
      return;
    }
    const userObj = {
      id: payload.id,
      email: payload.email,
      type: payload.type,
      companyId: payload.companyId,
      name: payload.companyName || payload.name,
      roles: payload.roles || [],
      workerRole: payload.workerRole || null,
      modules: payload.modules || {},
      assignedBooths: payload.assignedBooths || [],
      assignedBlock: payload.assignedBlock || null,
      assignedWard: payload.assignedWard || null,
      assignedConstituency: payload.assignedConstituency || null,
    };
    if (payload.type === "company") userObj.type = "company";
    setUser(userObj);
  }, [token]);

  // 2. Permission helpers
  const isFullAccess = user?.type === "company" ||
    user?.roles?.includes("Admin") ||
    user?.roles?.includes("admin") ||
    user?.roles?.includes("Election Admin");

  const hasModuleView = (moduleName) => {
    if (isFullAccess) return true;
    const mod = user?.modules?.[moduleName];
    return !!(mod?.selected && mod?.permissions?.view === true);
  };

  const isManager = isFullAccess || (user?.roles || []).includes("Election Manager");
  const isAnalyst = isFullAccess || (user?.roles || []).includes("Election Analyst");
  const isCampaignManager = isFullAccess || (user?.roles || []).includes("Campaign Manager");
  const isFieldWorker = !!user?.workerRole && !isFullAccess;

  // 3. Fetch dashboard data
  useEffect(() => {
    if (!token || !user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };

        // Build filter parameters from assigned area
        let filterParams = {};
        if (user.assignedBooths?.length) {
          filterParams.boothId = user.assignedBooths[0]?._id || user.assignedBooths[0];
        }
        if (user.assignedWard && !filterParams.boothId) {
          filterParams.wardId = user.assignedWard?._id || user.assignedWard;
        }
        if (user.assignedBlock && !filterParams.wardId && !filterParams.boothId) {
          filterParams.blockId = user.assignedBlock?._id || user.assignedBlock;
        }
        if (user.assignedConstituency && !filterParams.blockId && !filterParams.wardId && !filterParams.boothId) {
          filterParams.constituencyId = user.assignedConstituency?._id || user.assignedConstituency;
        }

        // Stats (always)
        const statsRes = await axios.get("/api/election/dashboard/stats", { params: filterParams, headers })
          .catch(() => ({ data: { success: false } }));

        // Analytics (only if permitted)
        let analyticsRes = { data: { success: false } };
        if (hasModuleView("Election Analytics")) {
          analyticsRes = await axios.get("/api/election/dashboard/analytics", { params: filterParams, headers })
            .catch(() => ({ data: { success: false } }));
        }

        // Voters (module)
        let votersRes = { data: { success: false } };
        if (hasModuleView("Voters")) {
          votersRes = await axios.get("/api/election/voter?limit=5&page=1", { params: filterParams, headers })
            .catch(() => ({ data: { success: false } }));
        }

        // Rallies (Campaign)
        let ralliesRes = { data: { success: false } };
        if (hasModuleView("Election Campaign")) {
          ralliesRes = await axios.get("/api/election/rally?limit=3", { params: filterParams, headers })
            .catch(() => ({ data: { success: false } }));
        }

        // Media (Communication)
        let mediaRes = { data: { success: false } };
        if (hasModuleView("Election Communication")) {
          mediaRes = await axios.get("/api/election/media?limit=3", { params: filterParams, headers })
            .catch(() => ({ data: { success: false } }));
        }

        let totalExpenses = 0;
        if (analyticsRes.data.success && analyticsRes.data.data.expenseByCategory) {
          totalExpenses = analyticsRes.data.data.expenseByCategory.reduce((s, c) => s + (c.total || 0), 0);
        }

        setDashboardData({
          stats: statsRes.data.success ? {
            totalVoters: statsRes.data.data.totalVoters || 0,
            totalBooths: statsRes.data.data.totalBooths || 0,
            strongSupporters: statsRes.data.data.strongSupporters || 0,
            totalExpenses,
          } : { totalVoters: 0, totalBooths: 0, strongSupporters: 0, totalExpenses: 0 },
          topBooths: analyticsRes.data.success ? (analyticsRes.data.data.boothWiseVoters || []).slice(0, 5) : [],
          supportDist: analyticsRes.data.success ? (analyticsRes.data.data.supportDistribution || []) : [],
          expenseCategories: analyticsRes.data.success ? (analyticsRes.data.data.expenseByCategory || []) : [],
          workerActivities: analyticsRes.data.success ? (analyticsRes.data.data.workerActivities || []).slice(0, 5) : [],
          recentVoters: votersRes.data.success ? (votersRes.data.data || []).slice(0, 5) : [],
          rallies: ralliesRes.data.success ? (ralliesRes.data.data || []).slice(0, 3) : [],
          mediaCampaigns: mediaRes.data.success ? (mediaRes.data.data || []).slice(0, 3) : [],
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token, user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64 text-gray-400">
        Please sign in to view the dashboard.
      </div>
    );
  }

  const supportRate = dashboardData.stats.totalVoters > 0
    ? ((dashboardData.stats.strongSupporters / dashboardData.stats.totalVoters) * 100).toFixed(1)
    : "0";

  // Build restriction banner text based on worker role and assigned area
  const workerLevel = getWorkerLevel(user.workerRole);
  const assignedAreas = [];
  if (user.assignedConstituency?.name) assignedAreas.push(`Constituency: ${user.assignedConstituency.name}`);
  if (user.assignedBlock?.blockNumber) assignedAreas.push(`Block: ${user.assignedBlock.blockNumber}`);
  if (user.assignedWard?.wardNumber) assignedAreas.push(`Ward: ${user.assignedWard.wardNumber}`);
  if (user.assignedBooths?.length) assignedAreas.push(`Booths: ${user.assignedBooths.map(b => b.boothNumber).join(", ")}`);
  const restrictionText = isFieldWorker && assignedAreas.length
    ? `🔒 You are logged in as a ${workerLevel || "field worker"}. Data is restricted to your assigned ${assignedAreas.join(" • ")}.`
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-gray-900">🗳️ Election Dashboard</h1>
        <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
          Role: {user.type === "company" ? "Company Admin" : (user.workerRole || user.roles?.join(", ") || "User")}
        </div>
      </div>

      {/* Restriction banner (only for field workers) */}
      {restrictionText && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
          {restrictionText}
        </div>
      )}

      {/* Basic stats cards – visible to any logged‑in user */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Voters" value={dashboardData.stats.totalVoters} icon={FiUsers} color="blue" />
        <StatCard label="Booths Covered" value={dashboardData.stats.totalBooths} icon={FiHome} color="green" />
        <StatCard label="Support Rate" value={`${supportRate}%`} icon={FiTrendingUp} color="purple" />
        {(isManager || isAnalyst || isCampaignManager) && (
          <StatCard label="Total Expenses" value={`₹ ${dashboardData.stats.totalExpenses.toLocaleString()}`} icon={FiDollarSign} color="red" />
        )}
      </div>

      {/* Two‑column: Worker Leaderboard + Media Impact (module‑gated) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasModuleView("Workers") && <WorkerLeaderboard />}
        {hasModuleView("Election Communication") && <MediaImpactChart />}
      </div>

      {/* Support Distribution – requires Analytics or manager/analyst */}
      {(isManager || isAnalyst) && dashboardData.supportDist.length > 0 && (
        <ChartCard title="Support Distribution" icon={<FiPieChart />}>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={dashboardData.supportDist.map(s => ({ name: s._id, value: s.count }))}
                cx="50%" cy="50%" outerRadius={80} dataKey="value"
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              >
                {dashboardData.supportDist.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Top Booths – requires Analytics or manager/analyst */}
      {(isManager || isAnalyst) && dashboardData.topBooths.length > 0 && (
        <ChartCard title="Top 5 Booths (by voters)" icon={<FiBarChart2 />}>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dashboardData.topBooths} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="boothNumber" />
              <Tooltip />
              <Bar dataKey="totalVoters" fill="#4F46E5" name="Voters" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Expense Categories – for managers/analysts/campaign managers */}
      {(isManager || isAnalyst || isCampaignManager) && dashboardData.expenseCategories.length > 0 && (
        <ChartCard title="Expense by Category" icon={<FiDollarSign />}>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.expenseCategories.map((cat, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-2 capitalize">{cat._id || "Others"}</td>
                    <td className="px-4 py-2 text-right">{cat.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>
      )}

      {/* Rallies & Media Campaigns – module‑gated */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {hasModuleView("Election Campaign") && dashboardData.rallies.length > 0 && (
          <ChartCard title="Upcoming Rallies" icon={<FiMic />}>
            <ul className="divide-y">
              {dashboardData.rallies.map(rally => (
                <li key={rally._id} className="py-2">
                  <p className="font-medium">{rally.name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(rally.date).toLocaleDateString()} – {rally.venue}
                  </p>
                </li>
              ))}
            </ul>
          </ChartCard>
        )}
        {hasModuleView("Election Communication") && dashboardData.mediaCampaigns.length > 0 && (
          <ChartCard title="Recent Media Campaigns" icon={<FiRadio />}>
            <ul className="divide-y">
              {dashboardData.mediaCampaigns.map(camp => (
                <li key={camp._id} className="py-2">
                  <p className="font-medium">{camp.title}</p>
                  <p className="text-xs text-gray-500">
                    {camp.platform} • Reach: {camp.reach || 'N/A'}
                  </p>
                </li>
              ))}
            </ul>
          </ChartCard>
        )}
      </div>

      {/* Recent Voters – Voters module */}
      {hasModuleView("Voters") && dashboardData.recentVoters.length > 0 && (
        <ChartCard title="Recently Added Voters" icon={<FiUserPlus />}>
          <ul className="divide-y">
            {dashboardData.recentVoters.map(v => (
              <li key={v._id} className="py-2 flex justify-between items-center">
                <div>
                  <p className="font-medium">{v.firstName} {v.lastName}</p>
                  <p className="text-xs text-gray-400">{v.phone || 'No phone'}</p>
                </div>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{v.supportLevel || 'Unknown'}</span>
              </li>
            ))}
          </ul>
        </ChartCard>
      )}

      {/* Worker Activity – requires Workers module AND manager/analyst/agent */}
      {hasModuleView("Workers") && (isManager || isAnalyst || (user?.roles || []).includes("Election Agent")) && dashboardData.workerActivities.length > 0 && (
        <ChartCard title="Top Workers (contacts/surveys)" icon={<FiActivity />}>
          <div className="space-y-3">
            {dashboardData.workerActivities.map((w, idx) => (
              <div key={idx} className="flex justify-between items-center border-b pb-2">
                <div>
                  <p className="font-medium">{w.name}</p>
                  <p className="text-xs text-gray-400">{w.workerRole || 'Worker'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm"><span className="font-bold">{w.totalContacts}</span> contacts</p>
                  <p className="text-xs text-gray-500">{w.totalSurveys} surveys</p>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
}

// Helper components (unchanged)
function StatCard({ label, value, icon: Icon, color }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <div className={`w-8 h-8 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-gray-500">{icon}</span>
        <h2 className="font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}


// // app/(dashboard)/election/page.js
// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   FiUsers, FiFlag, FiTrendingUp, FiDollarSign, FiBarChart2,
//   FiUserPlus, FiActivity, FiPieChart, FiList, FiHome, FiMic, FiRadio
// } from "react-icons/fi";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
//   ResponsiveContainer, PieChart, Pie, Cell
// } from "recharts";

// const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// // Helper to get user from localStorage (parsed)
// function getUser() {
//   if (typeof window === "undefined") return null;
//   const userStr = localStorage.getItem("user");
//   if (!userStr) return null;
//   try {
//     return JSON.parse(userStr);
//   } catch {
//     return null;
//   }
// }

// // Helper to check if user has a specific role
// function hasRole(user, roleName) {
//   if (!user || !user.roles) return false;
//   return user.roles.includes(roleName);
// }

// // Helper to check module permission (uses same hasPermission logic)
// function canAccess(user, moduleName, action = "view") {
//   if (!user) return false;
//   // Company or admin override
//   if (user.type === "company" || user.role === "Admin") return true;
//   const module = user.modules?.[moduleName];
//   if (!module || !module.selected) return false;
//   return module.permissions?.[action] === true;
// }

// export default function ElectionDashboard() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [dashboardData, setDashboardData] = useState({
//     stats: { totalVoters: 0, totalBooths: 0, strongSupporters: 0, totalExpenses: 0 },
//     topBooths: [],
//     recentVoters: [],
//     expenseCategories: [],
//     supportDist: [],
//     workerActivities: [],
//     rallies: [],
//     mediaCampaigns: [],
//   });

//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // Load user on mount
//   useEffect(() => {
//     const u = getUser();
//     setUser(u);
//   }, []);

//   // Fetch data based on user role / permissions
//   useEffect(() => {
//     if (!token || !user) return;

//     const fetchData = async () => {
//       setLoading(true);
//       try {
//         // 1. Base stats (total voters etc.) – uses Election Dashboard module permission
//         let statsRes = { data: { success: false } };
//         if (canAccess(user, "Election Dashboard", "view")) {
//           statsRes = await axios.get("/api/election/dashboard/stats", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//         }

//         // 2. Analytics data – supports filters per role
//         let analyticsParams = {};
//         // If Booth Worker or Election Agent, restrict to their assigned booth(s)
//         if (hasRole(user, "Booth Worker") || hasRole(user, "Election Agent")) {
//           // Assigned booth ID from user object (you need to store assignedBooths in JWT or fetch from API)
//           const assignedBooth = user.assignedBooths?.[0]?._id || user.assignedBooth;
//           if (assignedBooth) analyticsParams.boothId = assignedBooth;
//         } else if (hasRole(user, "Surveyor")) {
//           // Surveyors might see only their surveys – but we can show general survey stats
//           // For simplicity, we still show analytics but maybe limit constituency later
//         }

//         let analyticsRes = { data: { success: false } };
//         if (canAccess(user, "Election Analytics", "view")) {
//           analyticsRes = await axios.get("/api/election/dashboard/analytics", {
//             params: analyticsParams,
//             headers: { Authorization: `Bearer ${token}` },
//           });
//         }

//         // 3. Recent voters (if Voters module accessible)
//         let votersRes = { data: { success: false } };
//         if (canAccess(user, "Voters", "view")) {
//           votersRes = await axios.get("/api/election/voter?limit=5&page=1", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//         }

//         // 4. Rallies (if Election Campaign module accessible)
//         let ralliesRes = { data: { success: false } };
//         if (canAccess(user, "Election Campaign", "view")) {
//           ralliesRes = await axios.get("/api/election/rallies?limit=3", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//         }

//         // 5. Media Campaigns (if Media Campaigns module)
//         let mediaRes = { data: { success: false } };
//         if (canAccess(user, "Election Campaign", "view")) { // same module
//           mediaRes = await axios.get("/api/election/media?limit=3", {
//             headers: { Authorization: `Bearer ${token}` },
//           });
//         }

//         // Compute total expenses from analytics if available
//         let totalExpenses = 0;
//         if (analyticsRes.data.success && analyticsRes.data.data.expenseByCategory) {
//           totalExpenses = analyticsRes.data.data.expenseByCategory.reduce((sum, cat) => sum + cat.total, 0);
//         }

//         setDashboardData({
//           stats: statsRes.data.success ? {
//             totalVoters: statsRes.data.data.totalVoters || 0,
//             totalBooths: statsRes.data.data.totalBooths || 0,
//             strongSupporters: statsRes.data.data.strongSupporters || 0,
//             totalExpenses,
//           } : { totalVoters: 0, totalBooths: 0, strongSupporters: 0, totalExpenses },
//           topBooths: analyticsRes.data.success ? (analyticsRes.data.data.boothWiseVoters || []).slice(0, 5) : [],
//           supportDist: analyticsRes.data.success ? (analyticsRes.data.data.supportDistribution || []) : [],
//           expenseCategories: analyticsRes.data.success ? (analyticsRes.data.data.expenseByCategory || []) : [],
//           workerActivities: analyticsRes.data.success ? (analyticsRes.data.data.workerActivities || []).slice(0, 5) : [],
//           recentVoters: votersRes.data.success ? (votersRes.data.data || []).slice(0, 5) : [],
//           rallies: ralliesRes.data.success ? (ralliesRes.data.data || []).slice(0, 3) : [],
//           mediaCampaigns: mediaRes.data.success ? (mediaRes.data.data || []).slice(0, 3) : [],
//         });
//       } catch (err) {
//         console.error("Dashboard fetch error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchData();
//   }, [token, user]);

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//       </div>
//     );
//   }

//   const supportRate = dashboardData.stats.totalVoters > 0
//     ? ((dashboardData.stats.strongSupporters / dashboardData.stats.totalVoters) * 100).toFixed(1)
//     : 0;

//   const isAdmin = hasRole(user, "Election Admin") || user?.type === "company";
//   const isAnalyst = hasRole(user, "Election Analyst");
//   const isCampaignManager = hasRole(user, "Campaign Manager");
//   const isSurveyor = hasRole(user, "Surveyor");
//   const isBoothWorker = hasRole(user, "Booth Worker") || hasRole(user, "Election Agent");

//   return (
//     <div className="max-w-7xl mx-auto space-y-6">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-extrabold text-gray-900">🗳️ Election Dashboard</h1>
//         {user && (
//           <div className="text-sm bg-gray-100 px-3 py-1 rounded-full">
//             Role: {(user.roles || []).join(", ")}
//           </div>
//         )}
//       </div>

//       {/* Summary Cards – everyone sees basic stats */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <StatCard label="Total Voters" value={dashboardData.stats.totalVoters} icon={FiUsers} color="blue" />
//         <StatCard label="Booths Covered" value={dashboardData.stats.totalBooths} icon={FiHome} color="green" />
//         <StatCard label="Support Rate" value={`${supportRate}%`} icon={FiTrendingUp} color="purple" />
//         <StatCard label="Total Expenses" value={`₹ ${dashboardData.stats.totalExpenses.toLocaleString()}`} icon={FiDollarSign} color="red" />
//       </div>

//       {/* Role‑based sections */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Support Distribution – visible to Admin, Analyst, Campaign Manager */}
//         {(isAdmin || isAnalyst || isCampaignManager) && dashboardData.supportDist.length > 0 && (
//           <ChartCard title="Support Distribution" icon={<FiPieChart />}>
//             <ResponsiveContainer width="100%" height={260}>
//               <PieChart>
//                 <Pie
//                   data={dashboardData.supportDist.map(s => ({ name: s._id, value: s.count }))}
//                   cx="50%" cy="50%" outerRadius={80} dataKey="value"
//                   label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}
//                 >
//                   {dashboardData.supportDist.map((entry, idx) => (
//                     <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//               </PieChart>
//             </ResponsiveContainer>
//           </ChartCard>
//         )}

//         {/* Top Booths – only Admin and Analyst (booth workers see only their booth, but we show top in constituency?) */}
//         {(isAdmin || isAnalyst) && dashboardData.topBooths.length > 0 && (
//           <ChartCard title="Top 5 Booths (by voters)" icon={<FiBarChart2 />}>
//             <ResponsiveContainer width="100%" height={260}>
//               <BarChart data={dashboardData.topBooths} layout="vertical" margin={{ left: 40 }}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis type="number" />
//                 <YAxis type="category" dataKey="boothNumber" />
//                 <Tooltip />
//                 <Bar dataKey="totalVoters" fill="#4F46E5" name="Voters" />
//               </BarChart>
//             </ResponsiveContainer>
//           </ChartCard>
//         )}
//       </div>

//       {/* Expense Categories – Admin, Analyst, Campaign Manager */}
//       {(isAdmin || isAnalyst || isCampaignManager) && dashboardData.expenseCategories.length > 0 && (
//         <ChartCard title="Expense by Category" icon={<FiDollarSign />}>
//           <div className="overflow-x-auto">
//             <table className="min-w-full text-sm">
//               <thead className="bg-gray-50">
//                 <tr><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-right">Amount (₹)</th></tr>
//               </thead>
//               <tbody>
//                 {dashboardData.expenseCategories.map((cat, i) => (
//                   <tr key={i} className="border-b">
//                     <td className="px-4 py-2 capitalize">{cat._id}</td>
//                     <td className="px-4 py-2 text-right">{cat.total.toLocaleString()}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </ChartCard>
//       )}

//       {/* Rallies & Media Campaigns – Campaign Manager and Admin */}
//       {(isAdmin || isCampaignManager) && (
//         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//           {dashboardData.rallies.length > 0 && (
//             <ChartCard title="Upcoming Rallies" icon={<FiMic />}>
//               <ul className="divide-y">
//                 {dashboardData.rallies.map(rally => (
//                   <li key={rally._id} className="py-2">
//                     <p className="font-medium">{rally.name}</p>
//                     <p className="text-xs text-gray-500">{new Date(rally.date).toLocaleDateString()} – {rally.venue}</p>
//                   </li>
//                 ))}
//               </ul>
//             </ChartCard>
//           )}
//           {dashboardData.mediaCampaigns.length > 0 && (
//             <ChartCard title="Recent Media Campaigns" icon={<FiRadio />}>
//               <ul className="divide-y">
//                 {dashboardData.mediaCampaigns.map(camp => (
//                   <li key={camp._id} className="py-2">
//                     <p className="font-medium">{camp.title}</p>
//                     <p className="text-xs text-gray-500">{camp.platform} • Reach: {camp.reach || 'N/A'}</p>
//                   </li>
//                 ))}
//               </ul>
//             </ChartCard>
//           )}
//         </div>
//       )}

//       {/* Recent Voters – visible to anyone with Voters module access */}
//       {canAccess(user, "Voters", "view") && dashboardData.recentVoters.length > 0 && (
//         <ChartCard title="Recently Added Voters" icon={<FiUserPlus />}>
//           <ul className="divide-y">
//             {dashboardData.recentVoters.map(v => (
//               <li key={v._id} className="py-2 flex justify-between items-center">
//                 <div>
//                   <p className="font-medium">{v.firstName} {v.lastName}</p>
//                   <p className="text-xs text-gray-400">{v.phone || 'No phone'}</p>
//                 </div>
//                 <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{v.supportLevel || 'Unknown'}</span>
//               </li>
//             ))}
//           </ul>
//         </ChartCard>
//       )}

//       {/* Worker Activity – Admin, Analyst, Agent */}
//       {(isAdmin || isAnalyst || hasRole(user, "Election Agent")) && dashboardData.workerActivities.length > 0 && (
//         <ChartCard title="Top Workers (contacts/surveys)" icon={<FiActivity />}>
//           <div className="space-y-3">
//             {dashboardData.workerActivities.map((w, idx) => (
//               <div key={idx} className="flex justify-between items-center border-b pb-2">
//                 <div>
//                   <p className="font-medium">{w.name}</p>
//                   <p className="text-xs text-gray-400">{w.workerRole || 'Worker'}</p>
//                 </div>
//                 <div className="text-right">
//                   <p className="text-sm"><span className="font-bold">{w.totalContacts}</span> contacts</p>
//                   <p className="text-xs text-gray-500">{w.totalSurveys} surveys</p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </ChartCard>
//       )}

//       {/* For Booth Worker only – show personal booth info (if needed) */}
//       {isBoothWorker && (
//         <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-sm text-blue-700">
//           🔍 You are logged in as a booth worker. Shown data is filtered to your assigned booth only.
//         </div>
//       )}
//     </div>
//   );
// }

// // Helper components
// function StatCard({ label, value, icon: Icon, color }) {
//   const colorMap = {
//     blue: "bg-blue-50 text-blue-600",
//     green: "bg-green-50 text-green-600",
//     purple: "bg-purple-50 text-purple-600",
//     red: "bg-red-50 text-red-600",
//   };
//   return (
//     <div className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all">
//       <div className="flex items-center justify-between mb-3">
//         <span className="text-sm font-medium text-gray-500">{label}</span>
//         <div className={`w-8 h-8 rounded-xl ${colorMap[color]} flex items-center justify-center`}>
//           <Icon className="h-4 w-4" />
//         </div>
//       </div>
//       <div className="text-2xl font-bold text-gray-900">{value}</div>
//     </div>
//   );
// }

// function ChartCard({ title, icon, children }) {
//   return (
//     <div className="bg-white rounded-2xl p-5 shadow-sm border">
//       <div className="flex items-center gap-2 mb-4">
//         <span className="text-gray-500">{icon}</span>
//         <h2 className="font-semibold text-gray-800">{title}</h2>
//       </div>
//       {children}
//     </div>
//   );
// }




// // app/(dashboard)/election/page.js
// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   FiUsers, FiFlag, FiTrendingUp, FiDollarSign, FiBarChart2,
//   FiUserPlus, FiActivity, FiPieChart, FiList, FiHome
// } from "react-icons/fi";
// import {
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
//   ResponsiveContainer, PieChart, Pie, Cell
// } from "recharts";

// const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// export default function ElectionDashboard() {
//   const [stats, setStats] = useState({
//     totalVoters: 0,
//     totalBooths: 0,
//     strongSupporters: 0,
//     totalExpenses: 0,
//   });
//   const [topBooths, setTopBooths] = useState([]);
//   const [recentVoters, setRecentVoters] = useState([]);
//   const [expenseCategories, setExpenseCategories] = useState([]);
//   const [supportDist, setSupportDist] = useState([]);
//   const [workerActivities, setWorkerActivities] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   useEffect(() => {
//     if (!token) return;

//     const fetchDashboardData = async () => {
//       try {
//         // 1. Stats from dedicated endpoint (or fallback to analytics)
//         const statsRes = await axios.get("/api/election/dashboard/stats", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
        
//         // 2. Analytics data (includes supportDist, topBooths, expenses, workerActivities)
//         const analyticsRes = await axios.get("/api/election/dashboard/analytics", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         // 3. Recent voters (latest 5)
//         const votersRes = await axios.get("/api/election/voter?limit=5&page=1", {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (statsRes.data.success) {
//           const { totalVoters, totalBooths, strongSupporters } = statsRes.data.data;
//           setStats(prev => ({
//             ...prev,
//             totalVoters,
//             totalBooths,
//             strongSupporters,
//           }));
//         }

//         if (analyticsRes.data.success) {
//           const { supportDistribution, boothWiseVoters, expenseByCategory, workerActivities } = analyticsRes.data.data;
//           setSupportDist(supportDistribution || []);
//           setTopBooths((boothWiseVoters || []).slice(0, 5));
//           setExpenseCategories(expenseByCategory || []);
//           setWorkerActivities((workerActivities || []).slice(0, 5));
//         }

//         if (votersRes.data.success) {
//           setRecentVoters(votersRes.data.data.slice(0, 5));
//         }

//         // Fetch total expenses (or use from analytics if available)
//         const expenseSum = expenseCategories.reduce((sum, cat) => sum + cat.total, 0);
//         setStats(prev => ({ ...prev, totalExpenses: expenseSum }));

//       } catch (err) {
//         console.error("Dashboard error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchDashboardData();
//   }, [token]);

//   const supportRate = stats.totalVoters > 0 ? ((stats.strongSupporters / stats.totalVoters) * 100).toFixed(1) : 0;

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-64">
//         <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto space-y-6">
//       <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">🗳️ Election Dashboard</h1>

//       {/* Summary Cards */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//         <StatCard label="Total Voters" value={stats.totalVoters} icon={FiUsers} color="blue" />
//         <StatCard label="Booths Covered" value={stats.totalBooths} icon={FiHome} color="green" />
//         <StatCard label="Support Rate" value={`${supportRate}%`} icon={FiTrendingUp} color="purple" />
//         <StatCard label="Total Expenses" value={`₹ ${stats.totalExpenses.toLocaleString()}`} icon={FiDollarSign} color="red" />
//       </div>

//       {/* Two column layout */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Support Distribution Pie */}
//         {supportDist.length > 0 && (
//           <div className="bg-white rounded-2xl p-5 shadow-sm border">
//             <div className="flex items-center gap-2 mb-4">
//               <FiPieChart className="text-gray-500" />
//               <h2 className="font-semibold text-gray-800">Support Distribution</h2>
//             </div>
//             <ResponsiveContainer width="100%" height={260}>
//               <PieChart>
//                 <Pie
//                   data={supportDist.map(s => ({ name: s._id, value: s.count }))}
//                   cx="50%" cy="50%" outerRadius={80} dataKey="value"
//                   label={({ name, percent }) => `${name} (${(percent*100).toFixed(0)}%)`}
//                 >
//                   {supportDist.map((entry, idx) => (
//                     <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         )}

//         {/* Top Booths Chart */}
//         {topBooths.length > 0 && (
//           <div className="bg-white rounded-2xl p-5 shadow-sm border">
//             <div className="flex items-center gap-2 mb-4">
//               <FiBarChart2 className="text-gray-500" />
//               <h2 className="font-semibold text-gray-800">Top 5 Booths (by voters)</h2>
//             </div>
//             <ResponsiveContainer width="100%" height={260}>
//               <BarChart data={topBooths} layout="vertical" margin={{ left: 40 }}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis type="number" />
//                 <YAxis type="category" dataKey="boothNumber" />
//                 <Tooltip />
//                 <Bar dataKey="totalVoters" fill="#4F46E5" name="Voters" />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         )}
//       </div>

//       {/* Expense Categories (if any) */}
//       {expenseCategories.length > 0 && (
//         <div className="bg-white rounded-2xl p-5 shadow-sm border">
//           <div className="flex items-center gap-2 mb-4">
//             <FiDollarSign className="text-gray-500" />
//             <h2 className="font-semibold text-gray-800">Expense by Category</h2>
//           </div>
//           <div className="overflow-x-auto">
//             <table className="min-w-full text-sm">
//               <thead className="bg-gray-50">
//                 <tr><th className="px-4 py-2 text-left">Category</th><th className="px-4 py-2 text-right">Amount (₹)</th></tr>
//               </thead>
//               <tbody>
//                 {expenseCategories.map((cat, i) => (
//                   <tr key={i} className="border-b">
//                     <td className="px-4 py-2 capitalize">{cat._id}</td>
//                     <td className="px-4 py-2 text-right">{cat.total.toLocaleString()}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}

//       {/* Recent Voters & Worker Activity side by side */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
//         {/* Recent Voters */}
//         <div className="bg-white rounded-2xl p-5 shadow-sm border">
//           <div className="flex items-center gap-2 mb-4">
//             <FiUserPlus className="text-gray-500" />
//             <h2 className="font-semibold text-gray-800">Recently Added Voters</h2>
//           </div>
//           {recentVoters.length === 0 ? (
//             <p className="text-gray-400 text-sm">No recent voters</p>
//           ) : (
//             <ul className="divide-y">
//               {recentVoters.map(v => (
//                 <li key={v._id} className="py-2 flex justify-between items-center">
//                   <div>
//                     <p className="font-medium">{v.firstName} {v.lastName}</p>
//                     <p className="text-xs text-gray-400">{v.phone || 'No phone'}</p>
//                   </div>
//                   <span className="text-xs bg-gray-100 px-2 py-1 rounded-full">{v.supportLevel || 'Unknown'}</span>
//                 </li>
//               ))}
//             </ul>
//           )}
//         </div>

//         {/* Worker Activity */}
//         <div className="bg-white rounded-2xl p-5 shadow-sm border">
//           <div className="flex items-center gap-2 mb-4">
//             <FiActivity className="text-gray-500" />
//             <h2 className="font-semibold text-gray-800">Top Workers (contacts/surveys)</h2>
//           </div>
//           {workerActivities.length === 0 ? (
//             <p className="text-gray-400 text-sm">No worker activity yet</p>
//           ) : (
//             <div className="space-y-3">
//               {workerActivities.map((w, idx) => (
//                 <div key={idx} className="flex justify-between items-center border-b pb-2">
//                   <div>
//                     <p className="font-medium">{w.name}</p>
//                     <p className="text-xs text-gray-400">{w.workerRole || 'Worker'}</p>
//                   </div>
//                   <div className="text-right">
//                     <p className="text-sm"><span className="font-bold">{w.totalContacts}</span> contacts</p>
//                     <p className="text-xs text-gray-500">{w.totalSurveys} surveys</p>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// // Helper component for stat cards
// function StatCard({ label, value, icon: Icon, color }) {
//   const colorClasses = {
//     blue: "bg-blue-50 text-blue-600",
//     green: "bg-green-50 text-green-600",
//     purple: "bg-purple-50 text-purple-600",
//     red: "bg-red-50 text-red-600",
//   };
//   return (
//     <div className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all">
//       <div className="flex items-center justify-between mb-3">
//         <span className="text-sm font-medium text-gray-500">{label}</span>
//         <div className={`w-8 h-8 rounded-xl ${colorClasses[color]} flex items-center justify-center`}>
//           <Icon className="h-4 w-4" />
//         </div>
//       </div>
//       <div className="text-2xl font-bold text-gray-900">{value}</div>
//     </div>
//   );
// }