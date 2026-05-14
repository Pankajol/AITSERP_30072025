// src/app/(dashboard)/admin/hr/page.jsx
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const modules = [
  { key: "employees",    label: "Employees",    icon: "👥", desc: "Manage workforce",         href: "/admin/hr/employees",    color: "#6366f1" },
  { key: "attendance",   label: "Attendance",   icon: "🕐", desc: "Track punch in/out",        href: "/admin/hr/attendance",   color: "#0ea5e9" },
  { key: "leaves",       label: "Leaves",       icon: "🌿", desc: "Leave requests & balance",  href: "/admin/hr/leaves",       color: "#22c55e" },
  { key: "payroll",      label: "Payroll",       icon: "💰", desc: "Salary & payments",        href: "/admin/hr/payroll",      color: "#f59e0b" },
  { key: "performance",  label: "Performance",  icon: "📈", desc: "Reviews & ratings",         href: "/admin/hr/performance",  color: "#ec4899" },
  { key: "departments",  label: "Departments",  icon: "🏢", desc: "Org structure",             href: "/admin/hr/departments",  color: "#8b5cf6" },
  { key: "designations", label: "Designations", icon: "🎖️", desc: "Roles & levels",           href: "/admin/hr/designations", color: "#14b8a6" },
  { key: "shifts",       label: "Shifts",       icon: "⏰", desc: "Shift schedules",           href: "/admin/hr/shifts",       color: "#f97316" },
  { key: "holidays",     label: "Holidays",     icon: "🎉", desc: "Holiday calendar",          href: "/admin/hr/holidays",     color: "#ef4444" },
];

export default function HRDashboard() {
  const [stats, setStats] = useState(null);
  const [user, setUser]   = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/hr/dashboard/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch {}
  }

  const canAccess = (mod) => {
    if (!user) return false;
    if (user.role === "Admin" || user.type === "company") return true;
    return user.permissions?.[mod]?.length > 0;
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <p style={styles.breadcrumb}>Dashboard / HR</p>
          <h1 style={styles.title}>Human Resources</h1>
          <p style={styles.subtitle}>Manage your entire workforce from one place</p>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.badge}>
            <span style={styles.dot} />
            {stats?.activeEmployees ?? "—"} Active Employees
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={styles.statsBar}>
        {[
          { label: "Total Employees",  val: stats?.totalEmployees  ?? "—", icon: "👥" },
          { label: "Present Today",    val: stats?.presentToday    ?? "—", icon: "✅" },
          { label: "On Leave Today",   val: stats?.onLeaveToday    ?? "—", icon: "🌿" },
          { label: "Pending Leaves",   val: stats?.pendingLeaves   ?? "—", icon: "⏳" },
          { label: "Payroll (Month)",  val: stats?.monthPayroll    ? `₹${stats.monthPayroll.toLocaleString()}` : "—", icon: "💰" },
        ].map((s) => (
          <div key={s.label} style={styles.statCard}>
            <span style={styles.statIcon}>{s.icon}</span>
            <div>
              <div style={styles.statVal}>{s.val}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Module Grid */}
      <div style={styles.grid}>
        {modules.map((m) => {
          const accessible = canAccess(m.key);
          return (
            <div key={m.key} style={{ ...styles.card, opacity: accessible ? 1 : 0.4 }}>
              {accessible ? (
                <Link href={m.href} style={styles.cardLink}>
                  <CardContent m={m} />
                </Link>
              ) : (
                <div style={styles.cardLocked}>
                  <CardContent m={m} />
                  <div style={styles.lockBadge}>🔒 No Access</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardContent({ m }) {
  return (
    <>
      <div style={{ ...styles.cardIcon, background: m.color + "22", color: m.color }}>
        {m.icon}
      </div>
      <div style={styles.cardLabel}>{m.label}</div>
      <div style={styles.cardDesc}>{m.desc}</div>
      <div style={{ ...styles.cardAccent, background: m.color }} />
    </>
  );
}

const styles = {
  page:        { padding: "2rem", fontFamily: "'DM Sans', sans-serif", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem" },
  breadcrumb:  { fontSize: "0.75rem", color: "#64748b", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.4rem" },
  title:       { fontSize: "2rem", fontWeight: 800, color: "#f1f5f9", margin: 0 },
  subtitle:    { color: "#64748b", marginTop: "0.25rem", fontSize: "0.9rem" },
  headerRight: { display: "flex", gap: "1rem" },
  badge:       { display: "flex", alignItems: "center", gap: "0.5rem", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", padding: "0.5rem 1rem", fontSize: "0.85rem" },
  dot:         { width: 8, height: 8, borderRadius: "50%", background: "#22c55e", display: "inline-block" },
  statsBar:    { display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" },
  statCard:    { flex: 1, minWidth: 150, background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "0.75rem" },
  statIcon:    { fontSize: "1.5rem" },
  statVal:     { fontSize: "1.4rem", fontWeight: 700, color: "#f1f5f9" },
  statLabel:   { fontSize: "0.72rem", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" },
  card:        { background: "#1e293b", border: "1px solid #334155", borderRadius: "16px", overflow: "hidden", position: "relative", transition: "transform 0.2s, box-shadow 0.2s" },
  cardLink:    { display: "block", padding: "1.5rem", textDecoration: "none", color: "inherit" },
  cardLocked:  { padding: "1.5rem", position: "relative" },
  cardIcon:    { width: 48, height: 48, borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", marginBottom: "1rem" },
  cardLabel:   { fontWeight: 700, fontSize: "1rem", color: "#f1f5f9", marginBottom: "0.25rem" },
  cardDesc:    { fontSize: "0.8rem", color: "#64748b" },
  cardAccent:  { position: "absolute", bottom: 0, left: 0, right: 0, height: 3 },
  lockBadge:   { position: "absolute", top: "0.75rem", right: "0.75rem", background: "#334155", borderRadius: "6px", padding: "0.2rem 0.5rem", fontSize: "0.7rem", color: "#94a3b8" },
};




// "use client";

// import { useEffect, useState } from "react";
// import PageHeader from "@/components/hr/PageHeader";
// import StatCard from "@/components/hr/StatCard";


// export default function HrDashboardPage() {
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [stats, setStats] = useState(null);
//   const [latestEmployees, setLatestEmployees] = useState([]);
//   const [todayAttendance, setTodayAttendance] = useState([]);
//   const [activeTab, setActiveTab] = useState("attendance");

//   useEffect(() => {
//     async function loadData() {
//       try {
//         const token = localStorage.getItem("token");

//         if (!token) {
//           throw new Error("Unauthorized - No token found");
//         }

//         const [statsRes, empRes, attRes] = await Promise.all([
//           fetch("/api/hr/dashboard", {
//             headers: { Authorization: "Bearer " + token },
//           }),
//           fetch("/api/hr/employees?limit=5", {
//             headers: { Authorization: "Bearer " + token },
//           }),
//           fetch("/api/hr/attendance/today", {
//             headers: { Authorization: "Bearer " + token },
//           }),
//         ]);

//         const statsJson = await statsRes.json();
//         const empJson = await empRes.json();
//         const attJson = await attRes.json();

//         if (!statsRes.ok) throw new Error(statsJson?.msg || "Stats error");
//         if (!empRes.ok) throw new Error(empJson?.msg || "Employee error");
//         if (!attRes.ok) throw new Error(attJson?.msg || "Attendance error");

//         setStats(statsJson?.data || statsJson || null);
//         setLatestEmployees(empJson?.data || []);
//         setTodayAttendance(attJson?.data || []);
//       } catch (err) {
//         console.error(err);
//         setError(err.message || "Failed to load dashboard data");
//       } finally {
//         setLoading(false);
//       }
//     }

//     loadData();
//   }, []);

//   /* ---------- RENDER ---------- */

//   return (
//     <div className="space-y-6">
//       <PageHeader
//         title="HR Dashboard"
//         subtitle="Quick overview of workforce, attendance & payroll."
//       />

//       {/* ERROR */}
//       {error && (
//         <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4">
//           {error}
//         </div>
//       )}

//       {/* ================= STATS ================= */}
//       <div className="grid gap-4 md:grid-cols-4">
//         {loading ? (
//           [...Array(4)].map((_, i) => (
//             <div
//               key={i}
//               className="h-28 rounded-2xl bg-slate-100 animate-pulse"
//             />
//           ))
//         ) : (
//           <>
//             <StatCard
//               label="Active Employees"
//               value={stats?.employees?.active ?? 0}
//               hint={stats?.employees?.changeText || "—"}
//             />
//             <StatCard
//               label="Present Today"
//               value={stats?.attendance?.present ?? 0}
//               hint={stats?.attendance?.presentHint || "—"}
//             />
//             <StatCard
//               label="On Leave Today"
//               value={stats?.attendance?.leave ?? 0}
//               hint={stats?.attendance?.leaveHint || "—"}
//             />
//             <StatCard
//               label="Payroll (This Month)"
//               value={`₹${stats?.payroll?.total ?? 0}`}
//               hint={stats?.payroll?.statusText || "—"}
//             />
//           </>
//         )}
//       </div>

//       {/* ================ TABS ================= */}
//       <div className="space-y-4">
//         <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
//           {["attendance", "employees", "alerts"].map((tab) => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               className={`px-3 py-1 rounded-full capitalize ${
//                 activeTab === tab
//                   ? "bg-white shadow text-slate-900"
//                   : "text-slate-500"
//               }`}
//             >
//               {tab === "attendance" && "Today’s Attendance"}
//               {tab === "employees" && "Latest Employees"}
//               {tab === "alerts" && "Alerts"}
//             </button>
//           ))}
//         </div>

//         {/* ================= ATTENDANCE ================= */}
//         {activeTab === "attendance" && (
//           <div className="rounded-2xl border bg-white overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="border-b bg-slate-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left font-medium">Employee</th>
//                     <th className="px-4 py-3 text-left font-medium">Status</th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Punch In
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Punch Out
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">Hours</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {!loading && todayAttendance.length === 0 && (
//                     <tr>
//                       <td
//                         colSpan={5}
//                         className="px-4 py-6 text-center text-slate-400"
//                       >
//                         No attendance records for today.
//                       </td>
//                     </tr>
//                   )}

//                   {todayAttendance.map((row) => (
//                     <tr key={row._id} className="border-b last:border-0">
//                       <td className="px-4 py-3">
//                         {row.employeeName || "—"}
//                       </td>

//                       <td className="px-4 py-3">
//                         <span
//                           className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
//                             row.status === "Present"
//                               ? "bg-green-100 text-green-700"
//                               : row.status === "Absent"
//                               ? "bg-red-100 text-red-700"
//                               : "bg-yellow-100 text-yellow-700"
//                           }`}
//                         >
//                           {row.status || "N/A"}
//                         </span>
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {row?.punchIn?.time || "-"}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {row?.punchOut?.time || "-"}
//                       </td>

//                       <td className="px-4 py-3">
//                         {row?.totalHours ?? "0"}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {/* ================= EMPLOYEES ================= */}
//         {activeTab === "employees" && (
//           <div className="rounded-2xl border bg-white overflow-hidden">
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead className="border-b bg-slate-50">
//                   <tr>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Name
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Department
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Designation
//                     </th>
//                     <th className="px-4 py-3 text-left font-medium">
//                       Joining Date
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {!loading && latestEmployees.length === 0 && (
//                     <tr>
//                       <td
//                         colSpan={4}
//                         className="px-4 py-6 text-center text-slate-400"
//                       >
//                         No employees found.
//                       </td>
//                     </tr>
//                   )}

//                   {latestEmployees.map((emp) => (
//                     <tr key={emp._id} className="border-b last:border-0">
//                       <td className="px-4 py-3">
//                         {emp.fullName}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {emp.departmentName || "-"}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {emp.designationTitle || "-"}
//                       </td>

//                       <td className="px-4 py-3 text-slate-500">
//                         {emp.joiningDateFormatted || "-"}
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}
    

//         {/* ================= ALERTS ================= */}
//         {activeTab === "alerts" && (
//           <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 text-center">
//             Configure alerts like:
//             <ul className="mt-3 space-y-1 list-disc list-inside">
//               <li>Upcoming employee joining</li>
//               <li>Probation end date</li>
//               <li>Contract expiry</li>
//               <li>Low attendance warning</li>
//             </ul>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
