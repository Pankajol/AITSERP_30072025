"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FaPlus, FaEye, FaSearch, FaIndustry, FaSpinner, FaCheck, FaTruck } from "react-icons/fa";

export default function TyreJobCardList() {
  const [jobCards, setJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [kpi, setKpi] = useState({});
  const router = useRouter();

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await axios.get(`/api/ppc/tyre-jobcards?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobCards(res.data.data || []);
      // Compute KPIs (could also fetch from a dashboard API)
      const cards = res.data.data || [];
      setKpi({
        total: cards.length,
        inProgress: cards.filter(c => !["Ready","Delivered"].includes(c.status)).length,
        completed: cards.filter(c => c.status === "Ready").length,
        delivered: cards.filter(c => c.status === "Delivered").length,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [search, statusFilter]);

  const statusBadge = (status) => {
    const colors = {
      Received: "bg-gray-100 text-gray-700",
      Inspection: "bg-purple-100 text-purple-700",
      Buffing: "bg-indigo-100 text-indigo-700",
      Repair: "bg-orange-100 text-orange-700",
      Building: "bg-teal-100 text-teal-700",
      Curing: "bg-cyan-100 text-cyan-700",
      Finishing: "bg-blue-100 text-blue-700",
      QC: "bg-yellow-100 text-yellow-700",
      Ready: "bg-green-100 text-green-700",
      Delivered: "bg-emerald-100 text-emerald-700",
    };
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100"}`}>
        {status}
      </span>
    );
  };

  const KPI_CARDS = [
    { label: "Total Job Cards", value: kpi.total, icon: FaIndustry, color: "bg-blue-500" },
    { label: "In Progress", value: kpi.inProgress, icon: FaSpinner, color: "bg-yellow-500" },
    { label: "Ready / Completed", value: kpi.completed, icon: FaCheck, color: "bg-green-500" },
    { label: "Delivered", value: kpi.delivered, icon: FaTruck, color: "bg-indigo-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6 flex items-center gap-3">
          <FaIndustry className="text-indigo-600" /> Tyre Retreading Job Cards
        </h1>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {KPI_CARDS.map((card, idx) => (
            <div key={idx} className="bg-white rounded-2xl shadow-sm border p-5">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${card.color}`}>
                  <card.icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-gray-400">{card.label}</p>
                  <p className="text-xl font-extrabold text-gray-800">{card.value ?? 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              className="pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500 outline-none w-full"
              placeholder="Search by job card no, tyre serial, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm focus:border-indigo-500 outline-none"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            {["Received","Inspection","Buffing","Repair","Building","Curing","Finishing","QC","Ready","Delivered"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            onClick={() => router.push("/admin/ppc/tyre-jobcards/new")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg"
          >
            <FaPlus size={12} /> New Job Card
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Job Card No</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Customer</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Vehicle</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-400">Tyre Serial</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400">Status</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading...</td></tr>
              ) : jobCards.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">No job cards found.</td></tr>
              ) : (
                jobCards.map(jc => (
                  <tr key={jc._id} className="hover:bg-indigo-50/20">
                    <td className="px-6 py-4 font-bold text-indigo-600">{jc.jobCardNo}</td>
                    <td className="px-6 py-4">{jc.customer?.customerName || "N/A"}</td>
                    <td className="px-6 py-4">{jc.vehicleNumber || "-"}</td>
                    <td className="px-6 py-4">{jc.tyreSerialNumber}</td>
                    <td className="px-6 py-4 text-center">{statusBadge(jc.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => router.push(`/admin/ppc/tyre-jobcards/${jc._id}`)}
                        className="p-1.5 text-gray-300 hover:text-indigo-600"
                      >
                        <FaEye size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}