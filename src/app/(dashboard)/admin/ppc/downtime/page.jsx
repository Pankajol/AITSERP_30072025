"use client";

import { useEffect, useState, Suspense } from "react";
import axios from "axios";
import {
  Plus,
  Edit,
  Trash2,
  Save,
  Search,
  Clock,
  AlertCircle,
  Gauge,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

/* ─── Stop reasons list ──────────────────────────────────── */
const stopReasons = [
  "Excessive machine set up time",
  "Unplanned machine maintenance",
  "On-machine press checks",
  "Machine operator errors",
  "Machine malfunction",
  "Electricity down",
  "Other",
];

/* ─── Wrapper for useSearchParams (optional) ── */
export default function DowntimePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading…</div>}>
      <DowntimePage />
    </Suspense>
  );
}

function DowntimePage() {
  const [token, setToken] = useState(null);
  const [downtimes, setDowntimes] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState({});

  const [form, setForm] = useState({
    machine: "",
    operator: "",
    fromTime: "",
    toTime: "",
    stopReason: "",
    remarks: "",
  });

  // ── Token ────────────────────────────────────────────────
  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) setToken(tk);
  }, []);

  // ── Fetch data ───────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    fetchAll();
  }, [token]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const headers = { Authorization: `Bearer ${token}` };
      const [downtimeRes, machineRes, operatorRes] = await Promise.all([
        axios.get("/api/ppc/downtime", { headers }),
        axios.get("/api/ppc/machines", { headers }),
        axios.get("/api/ppc/operators", { headers }),
      ]);
      setDowntimes(downtimeRes.data.data || []);
      setMachines(machineRes.data.data || []);
      setOperators(operatorRes.data.data || []);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  // ── Helper: calculate duration in minutes ────────────────
  const calcDuration = (from, to) => {
    const diff = new Date(to) - new Date(from);
    return diff > 0 ? Math.round(diff / 60000) : 0;
  };

  // ── Handlers ─────────────────────────────────────────────
  const resetForm = () => {
    setForm({
      machine: "",
      operator: "",
      fromTime: "",
      toTime: "",
      stopReason: "",
      remarks: "",
    });
    setEditing(null);
  };

  const handleEdit = (item) => {
    setForm({
      machine: item.machine?._id || "",
      operator: item.operator?._id || "",
      fromTime: item.fromTime?.slice(0, 16) || "",
      toTime: item.toTime?.slice(0, 16) || "",
      stopReason: item.stopReason,
      remarks: item.remarks,
    });
    setEditing(item._id);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.machine || !form.operator || !form.fromTime || !form.toTime || !form.stopReason) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editing) {
        await axios.put(`/api/ppc/downtime?id=${editing}`, form, { headers });
        toast.success("Downtime updated");
      } else {
        await axios.post("/api/ppc/downtime", form, { headers });
        toast.success("Downtime added");
      }
      resetForm();
      setShowModal(false);
      fetchAll();
    } catch (err) {
      toast.error("Error saving downtime");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this downtime entry?")) return;
    try {
      await axios.delete(`/api/ppc/downtime?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted successfully");
      fetchAll();
    } catch {
      toast.error("Error deleting downtime");
    }
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Filtering ────────────────────────────────────────────
  const filteredDowntimes = downtimes.filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.machine?.name?.toLowerCase().includes(q) ||
      d.operator?.name?.toLowerCase().includes(q) ||
      d.stopReason?.toLowerCase().includes(q) ||
      d.remarks?.toLowerCase().includes(q)
    );
  });

  // ── Stats (safe now because calcDuration is defined) ─────
  const totalDowntimeMinutes = filteredDowntimes.reduce(
    (sum, d) => sum + calcDuration(d.fromTime, d.toTime),
    0
  );
  const uniqueMachinesAffected = new Set(
    filteredDowntimes.map((d) => d.machine?._id).filter(Boolean)
  ).size;

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <Clock className="animate-spin h-10 w-10 text-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4 sm:px-10">
      <div className="max-w-6xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
              <Clock className="h-6 w-6 text-sky-600" />
              Machine Downtime Tracking
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Record and analyse production stops</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-50 outline-none w-64 transition-all"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all"
            >
              <Plus className="h-4 w-4" />
              Add Downtime
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Entries", value: filteredDowntimes.length, icon: Layers, color: "bg-sky-100 text-sky-700" },
            { label: "Total Downtime (min)", value: totalDowntimeMinutes, icon: Clock, color: "bg-amber-100 text-amber-700" },
            { label: "Machines Affected", value: uniqueMachinesAffected, icon: AlertCircle, color: "bg-rose-100 text-rose-700" },
            { label: "Avg Duration (min)", value: filteredDowntimes.length ? Math.round(totalDowntimeMinutes / filteredDowntimes.length) : 0, icon: Gauge, color: "bg-emerald-100 text-emerald-700" },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-400">{stat.label}</p>
                <p className="text-xl font-extrabold text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Expandable Card List ── */}
        <div className="space-y-4">
          {filteredDowntimes.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <Gauge className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-500">No downtime entries found</p>
              <p className="text-xs text-gray-400 mt-1">Add one using the button above.</p>
            </div>
          ) : (
            filteredDowntimes.map((d) => {
              const isExpanded = expandedIds[d._id] || false;
              const duration = calcDuration(d.fromTime, d.toTime);
              return (
                <div key={d._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
                  {/* Card header */}
                  <div
                    onClick={() => toggleExpand(d._id)}
                    className="flex items-center justify-between p-5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-sky-50 flex items-center justify-center text-sky-600 font-extrabold text-sm">
                        {d.machine?.name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{d.machine?.name || "Unknown Machine"}</p>
                        <p className="text-xs text-gray-500">{d.stopReason}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <span className="text-xs font-bold text-gray-500">{duration} min</span>
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded details */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                    }`}
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400">Operator</span>
                          <p className="font-medium">{d.operator?.name || "—"}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">From</span>
                          <p className="font-medium">{new Date(d.fromTime).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">To</span>
                          <p className="font-medium">{new Date(d.toTime).toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Remarks</span>
                          <p className="font-medium">{d.remarks || "—"}</p>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleEdit(d)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100"
                        >
                          <Edit className="h-4 w-4" /> Edit
                        </button>
                        <button
                          onClick={() => handleDelete(d._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100"
                        >
                          <Trash2 className="h-4 w-4" /> Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Modal ── */}
        {showModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-100 bg-sky-50/50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sky-600 shadow-sm">
                  <Clock className="h-5 w-5" />
                </div>
                <h2 className="text-lg font-black text-gray-900">
                  {editing ? "Edit Downtime" : "Add Downtime"}
                </h2>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Machine *</label>
                    <select
                      name="machine"
                      value={form.machine}
                      onChange={(e) => setForm({ ...form, machine: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    >
                      <option value="">Select Machine</option>
                      {machines.map((m) => (
                        <option key={m._id} value={m._id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Operator *</label>
                    <select
                      name="operator"
                      value={form.operator}
                      onChange={(e) => setForm({ ...form, operator: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    >
                      <option value="">Select Operator</option>
                      {operators.map((o) => (
                        <option key={o._id} value={o._id}>{o.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">From Time *</label>
                    <input
                      type="datetime-local"
                      name="fromTime"
                      value={form.fromTime}
                      onChange={(e) => setForm({ ...form, fromTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">To Time *</label>
                    <input
                      type="datetime-local"
                      name="toTime"
                      value={form.toTime}
                      onChange={(e) => setForm({ ...form, toTime: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Stop Reason *</label>
                    <select
                      name="stopReason"
                      value={form.stopReason}
                      onChange={(e) => setForm({ ...form, stopReason: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none"
                    >
                      <option value="">Select Reason</option>
                      {stopReasons.map((r, i) => (
                        <option key={i} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Remarks</label>
                    <textarea
                      name="remarks"
                      value={form.remarks}
                      onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none h-24"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all"
                  >
                    <Save className="h-4 w-4" />
                    {editing ? "Update" : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}