// app/(dashboard)/election/page.js
"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { FiUsers, FiFlag, FiTrendingUp, FiDollarSign } from "react-icons/fi";

export default function DashboardPage() {
  const [stats, setStats] = useState([
    { label: "Total Voters", value: 0, icon: FiUsers },
    { label: "Booths Covered", value: "0/0", icon: FiFlag },
    { label: "Support Rate", value: "0%", icon: FiTrendingUp },
    { label: "Expenses", value: "₹ 0", icon: FiDollarSign },
  ]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const { data } = await axios.get("/api/election/dashboard/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setStats([
            { label: "Total Voters", value: data.data.totalVoters, icon: FiUsers },
            { label: "Booths Covered", value: data.data.boothsCovered, icon: FiFlag },
            { label: "Support Rate", value: data.data.supportRate ?? "0%", icon: FiTrendingUp },
            { label: "Expenses", value: `₹ ${data.data.totalExpenses ?? 0}`, icon: FiDollarSign },
          ]);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  return (
    <div className="max-w-screen-xl mx-auto space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Election Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500">{stat.label}</span>
                <Icon className="h-4 w-4 text-gray-400" />
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {loading ? <div className="h-6 w-20 bg-gray-200 rounded animate-pulse" /> : stat.value}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}