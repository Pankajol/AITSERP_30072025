"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import {
  Activity,
  CheckCircle2,
  Clock,
  Gauge,
  Layers,
  AlertCircle,
  BarChart3,
  PieChart,
  TrendingUp,
  Loader2,
} from "lucide-react";

export default function ReportsPage() {
  const [token, setToken] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) setToken(tk);
  }, []);

  useEffect(() => {
    if (!token) return;
    const fetchReports = async () => {
      try {
        const res = await axios.get("/api/ppc/reports", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data.data);
      } catch (err) {
        console.error("Failed to load reports", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-sky-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-sm">
          <AlertCircle className="mx-auto h-10 w-10 text-gray-400 mb-4" />
          <h2 className="text-lg font-bold text-gray-900">No report data available</h2>
          <p className="text-sm text-gray-500 mt-1">Reports will appear once production data is recorded.</p>
        </div>
      </div>
    );
  }

  const formatSeconds = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h}h ${m}m ${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-sky-600" />
            Production Reports
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Real‑time overview of your manufacturing floor</p>
        </div>

        {/* Top‑level KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Job Cards"
            value={data.jobCards.total}
            sub={`${data.jobCards.completionRate}% completed`}
            icon={Layers}
            color="bg-sky-100 text-sky-700"
          />
          <StatCard
            label="In Progress"
            value={data.jobCards.inProgress}
            icon={Activity}
            color="bg-amber-100 text-amber-700"
          />
          <StatCard
            label="Completed Orders"
            value={data.productionOrders.completed}
            sub={`${data.productionOrders.completionRate}% of total`}
            icon={CheckCircle2}
            color="bg-emerald-100 text-emerald-700"
          />
          <StatCard
            label="Avg Job Duration"
            value={formatSeconds(data.jobCards.avgDurationSeconds)}
            icon={Clock}
            color="bg-violet-100 text-violet-700"
          />
        </div>

        {/* Detailed sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Job completion gauge */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-sky-600" />
              Job Card Completion
            </h3>
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                  <circle
                    cx="18"
                    cy="18"
                    r="15.9"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${data.jobCards.completionRate} ${100 - data.jobCards.completionRate}`}
                    strokeLinecap="round"
                    transform="rotate(-90 18 18)"
                    className="text-sky-600 transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-extrabold text-gray-800">
                  {data.jobCards.completionRate}%
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Completed</span>
                  <span className="font-bold">{data.jobCards.completed}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>In Progress</span>
                  <span className="font-bold">{data.jobCards.inProgress}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Remaining</span>
                  <span className="font-bold">
                    {data.jobCards.total - data.jobCards.completed}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Machine utilisation bar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-sky-600" />
              Machine Utilisation
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Active machines</span>
                <span className="font-bold">
                  {data.machines.active} / {data.machines.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="h-3 rounded-full bg-sky-500 transition-all duration-500"
                  style={{ width: `${data.machines.utilisationPercent}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">
                {data.machines.utilisationPercent}% of machines currently in use
              </p>
            </div>

            <div className="mt-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-2">Order Completion</h4>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Completed Orders</span>
                <span className="font-bold">
                  {data.productionOrders.completed} / {data.productionOrders.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-1">
                <div
                  className="h-3 rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${data.productionOrders.completionRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* You can add more sections: recent job cards, top operators, downtime reasons, etc. */}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
        <p className="text-xl font-extrabold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}