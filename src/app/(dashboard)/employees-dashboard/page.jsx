"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

export default function EmployeeDashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({
    present: 0,
    absent: 0,
    hours: 0,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    const decoded = jwtDecode(token);

    // ✅ ONLY ADMIN / HR redirect
    if (
      decoded.roles?.includes("Admin") ||
      decoded.roles?.includes("HR")
    ) {
      window.location.href = "/hr/dashboard";
      return;
    }

    setUser(decoded);
    loadStats(token);
  }, []);

  async function loadStats(token) {
    try {
      const res = await axios.get("/api/hr/attendance/my-summary", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) setStats(res.data.data);
    } catch (err) {
      console.error(err.response?.data || err.message);
    }
  }

  if (!user)
    return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user.email}</h1>
        <p className="text-sm text-slate-500">Employee Dashboard</p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Present Days</p>
          <p className="text-2xl font-bold text-green-600">
            {stats.present}
          </p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Absent Days</p>
          <p className="text-2xl font-bold text-red-500">
            {stats.absent}
          </p>
        </div>
         <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Haf Days</p>
          <p className="text-2xl font-bold text-red-500">
            {stats.halfDay}
          </p>
        </div>

        <div className="bg-white p-4 rounded shadow">
          <p className="text-sm">Total Hours</p>
          <p className="text-2xl font-bold text-indigo-600">
            {stats.totalHours}
          </p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold mb-3">Quick Actions</h2>

        <div className="flex gap-3 flex-wrap">
          <Link
            href="/employees-dashboard/attendance"
            className="px-4 py-2 bg-black text-white rounded"
          >
            My Attendance
          </Link>

          <Link
            href="/employees-dashboard/leaves"
            className="px-4 py-2 bg-slate-700 text-white rounded"
          >
            My Leaves
          </Link>
        </div>
      </div>
    </div>
  );
}
