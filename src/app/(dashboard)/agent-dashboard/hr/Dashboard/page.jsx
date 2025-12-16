"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/hr/PageHeader";
import StatCard from "@/components/hr/StatCard";

export default function HrDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);
  const [latestEmployees, setLatestEmployees] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [activeTab, setActiveTab] = useState("attendance");

  useEffect(() => {
    async function loadData() {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Unauthorized - No token found");
        }

        const [statsRes, empRes, attRes] = await Promise.all([
          fetch("/api/hr/dashboard", {
            headers: { Authorization: "Bearer " + token },
          }),
          fetch("/api/hr/employees?limit=5", {
            headers: { Authorization: "Bearer " + token },
          }),
          fetch("/api/hr/attendance/today", {
            headers: { Authorization: "Bearer " + token },
          }),
        ]);

        const statsJson = await statsRes.json();
        const empJson = await empRes.json();
        const attJson = await attRes.json();

        if (!statsRes.ok) throw new Error(statsJson?.msg || "Stats error");
        if (!empRes.ok) throw new Error(empJson?.msg || "Employee error");
        if (!attRes.ok) throw new Error(attJson?.msg || "Attendance error");

        setStats(statsJson?.data || statsJson || null);
        setLatestEmployees(empJson?.data || []);
        setTodayAttendance(attJson?.data || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  /* ---------- RENDER ---------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Dashboard"
        subtitle="Quick overview of workforce, attendance & payroll."
      />

      {/* ERROR */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* ================= STATS ================= */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-slate-100 animate-pulse"
            />
          ))
        ) : (
          <>
            <StatCard
              label="Active Employees"
              value={stats?.employees?.active ?? 0}
              hint={stats?.employees?.changeText || "—"}
            />
            <StatCard
              label="Present Today"
              value={stats?.attendance?.present ?? 0}
              hint={stats?.attendance?.presentHint || "—"}
            />
            <StatCard
              label="On Leave Today"
              value={stats?.attendance?.leave ?? 0}
              hint={stats?.attendance?.leaveHint || "—"}
            />
            <StatCard
              label="Payroll (This Month)"
              value={`₹${stats?.payroll?.total ?? 0}`}
              hint={stats?.payroll?.statusText || "—"}
            />
          </>
        )}
      </div>

      {/* ================ TABS ================= */}
      <div className="space-y-4">
        <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
          {["attendance", "employees", "alerts"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-full capitalize ${
                activeTab === tab
                  ? "bg-white shadow text-slate-900"
                  : "text-slate-500"
              }`}
            >
              {tab === "attendance" && "Today’s Attendance"}
              {tab === "employees" && "Latest Employees"}
              {tab === "alerts" && "Alerts"}
            </button>
          ))}
        </div>

        {/* ================= ATTENDANCE ================= */}
        {activeTab === "attendance" && (
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Employee</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-left font-medium">
                      Punch In
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Punch Out
                    </th>
                    <th className="px-4 py-3 text-left font-medium">Hours</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && todayAttendance.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        No attendance records for today.
                      </td>
                    </tr>
                  )}

                  {todayAttendance.map((row) => (
                    <tr key={row._id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {row.employeeName || "—"}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            row.status === "Present"
                              ? "bg-green-100 text-green-700"
                              : row.status === "Absent"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {row.status || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {row?.punchIn?.time || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {row?.punchOut?.time || "-"}
                      </td>

                      <td className="px-4 py-3">
                        {row?.totalHours ?? "0"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= EMPLOYEES ================= */}
        {activeTab === "employees" && (
          <div className="rounded-2xl border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Department
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Designation
                    </th>
                    <th className="px-4 py-3 text-left font-medium">
                      Joining Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && latestEmployees.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-6 text-center text-slate-400"
                      >
                        No employees found.
                      </td>
                    </tr>
                  )}

                  {latestEmployees.map((emp) => (
                    <tr key={emp._id} className="border-b last:border-0">
                      <td className="px-4 py-3">
                        {emp.fullName}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {emp.departmentName || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {emp.designationTitle || "-"}
                      </td>

                      <td className="px-4 py-3 text-slate-500">
                        {emp.joiningDateFormatted || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= ALERTS ================= */}
        {activeTab === "alerts" && (
          <div className="rounded-2xl border bg-white p-6 text-sm text-slate-500 text-center">
            Configure alerts like:
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>Upcoming employee joining</li>
              <li>Probation end date</li>
              <li>Contract expiry</li>
              <li>Low attendance warning</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
