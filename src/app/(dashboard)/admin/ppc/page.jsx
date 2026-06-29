"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FaUsers,
  FaCogs,
  FaBoxes,
  FaTools,
  FaIndustry,
  FaClipboardList,
  FaTruck,
  FaChartBar,
  FaSpinner,
  FaCheck,
  FaArrowRight,
} from "react-icons/fa";

export default function PPCDashboard() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchDashboard = async () => {
      try {
        const res = await axios.get("/api/ppc/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, [token]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin text-3xl text-indigo-600" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
            <FaChartBar className="text-indigo-600" /> PPC Dashboard
          </h1>
          <button
            onClick={() => router.push("/admin/ppc/production-orders")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100"
          >
            Production Orders <FaArrowRight size={12} />
          </button>
        </div>

        {/* Section: Resources / Machines / Operators */}
        <Section title="Manufacturing Resources">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Operators"
              value={data?.operators?.total}
              sub={`${data?.operators?.active || 0} active`}
              icon={FaUsers}
              color="bg-blue-500"
              onClick={() => router.push("/admin/ppc/operators")}
            />
            <KpiCard
              label="Machines"
              value={data?.machines?.total}
              icon={FaCogs}
              color="bg-emerald-500"
              onClick={() => router.push("/admin/ppc/machines")}
            />
            <KpiCard
              label="Resources"
              value={data?.resources?.total}
              icon={FaBoxes}
              color="bg-yellow-500"
              onClick={() => router.push("/admin/ppc/resources")}
            />
            <KpiCard
              label="Operations"
              value={data?.operations?.total}
              icon={FaTools}
              color="bg-purple-500"
              onClick={() => router.push("/admin/ppc/operations")}
            />
          </div>
        </Section>

        {/* Section: Production Orders */}
        <Section title="Production Orders">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Total Orders"
              value={data?.productionOrders?.total}
              icon={FaIndustry}
              color="bg-indigo-500"
              onClick={() => router.push("/admin/ppc/production-orders")}
            />
            <KpiCard
              label="Pending"
              value={data?.productionOrders?.pending}
              icon={FaSpinner}
              color="bg-orange-500"
            />
            <KpiCard
              label="In Progress"
              value={data?.productionOrders?.inProgress}
              icon={FaCogs}
              color="bg-blue-500"
            />
            <KpiCard
              label="Completed"
              value={data?.productionOrders?.completed}
              icon={FaCheck}
              color="bg-green-500"
            />
          </div>
        </Section>

        {/* Section: Job Cards (Standard) */}
        <Section title="Standard Production Job Cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="Total Job Cards"
              value={data?.jobCards?.total}
              icon={FaClipboardList}
              color="bg-teal-500"
              onClick={() => router.push("/admin/ppc/production-jobcards")}
            />
            <KpiCard
              label="Completed"
              value={data?.jobCards?.completed}
              icon={FaCheck}
              color="bg-green-500"
            />
          </div>
        </Section>

        {/* Section: Tyre Job Cards */}
        <Section title="Tyre Retreading Job Cards">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <KpiCard
              label="Total Tyre JCs"
              value={data?.tyreJobCards?.total}
              icon={FaTruck}
              color="bg-cyan-500"
              onClick={() => router.push("/admin/ppc/tyre-jobcards")}
            />
            <KpiCard
              label="Active / In Progress"
              value={data?.tyreJobCards?.active}
              icon={FaSpinner}
              color="bg-blue-500"
            />
            <KpiCard
              label="Delivered"
              value={data?.tyreJobCards?.delivered}
              icon={FaCheck}
              color="bg-green-500"
            />
          </div>
        </Section>
      </div>
    </div>
  );
}

// ─── Reusable components ──────────────────────────────────

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-lg font-bold text-gray-700 mb-4 flex items-center gap-2">
        <span className="w-1 h-5 bg-indigo-600 rounded-full" />
        {title}
      </h2>
      {children}
    </div>
  );
}

function KpiCard({ label, value = 0, sub, icon: Icon, color, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-xs font-bold uppercase text-gray-400">{label}</p>
          <p className="text-2xl font-extrabold text-gray-800">{value}</p>
          {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}