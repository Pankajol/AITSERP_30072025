"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaUsers } from "react-icons/fa";

export default function OperatorPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOperator, setEditOperator] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Form state – all fields the model expects
  const [formName, setFormName] = useState("");
  const [formOperatorCode, setFormOperatorCode] = useState("");
  const [formSkill, setFormSkill] = useState("other");
  const [formCostPerHour, setFormCostPerHour] = useState("");
  const [formCostPerDay, setFormCostPerDay] = useState("");
  const [formEfficiency, setFormEfficiency] = useState(100);
  const [formStatus, setFormStatus] = useState("active");
  const [saving, setSaving] = useState(false);

  // ─── Fetch Operators ──────────────────────────────────────────────────
  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);

      const res = await axios.get(`/api/ppc/operators?${params.toString()}`, headers);
      setOperators(res.data?.data || []);
    } catch (err) {
      console.error("Fetch operators error:", err);
      toast.error("Failed to fetch operators");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  // ─── Modal ──────────────────────────────────────────────────────────────
  const openModal = (operator = null) => {
    setEditOperator(operator);
    if (operator) {
      setFormName(operator.name || "");
      setFormOperatorCode(operator.operatorCode || "");
      setFormSkill(operator.skill || "other");
      setFormCostPerHour(operator.costPerHour || "");
      setFormCostPerDay(operator.costPerDay || "");
      setFormEfficiency(operator.efficiency || 100);
      setFormStatus(operator.status || "active");
    } else {
      setFormName("");
      setFormOperatorCode("");
      setFormSkill("other");
      setFormCostPerHour("");
      setFormCostPerDay("");
      setFormEfficiency(100);
      setFormStatus("active");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditOperator(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formOperatorCode.trim()) {
      toast.error("Name and operator code are required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      const payload = {
        name: formName.trim(),
        operatorCode: formOperatorCode.trim(),
        skill: formSkill,
        costPerHour: parseFloat(formCostPerHour) || 0,
        costPerDay: parseFloat(formCostPerDay) || 0,
        efficiency: parseFloat(formEfficiency) || 100,
        status: formStatus,
      };

      if (editOperator) {
        const res = await axios.put(`/api/ppc/operators?id=${editOperator._id}`, payload, headers);
        setOperators(operators.map((o) => (o._id === editOperator._id ? res.data.data : o)));
        toast.success("Operator updated!");
      } else {
        const res = await axios.post("/api/ppc/operators", payload, headers);
        setOperators([res.data.data, ...operators]);
        toast.success("Operator created!");
      }
      closeModal();
    } catch (err) {
      console.error("Save error:", err);
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      const token = localStorage.getItem("token");
      const headers = { headers: { Authorization: `Bearer ${token}` } };
      await axios.delete(`/api/ppc/operators?id=${id}`, headers);
      setOperators(operators.filter((o) => o._id !== id));
      toast.success("Operator deleted!");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete");
    }
  };

  // ─── UI Helpers ──────────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const StatusBadge = ({ status }) => {
    const colors = {
      active: "bg-emerald-100 text-emerald-700",
      inactive: "bg-gray-100 text-gray-600",
      "on-leave": "bg-amber-100 text-amber-700",
    };
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || colors.active}`}>
        {status}
      </span>
    );
  };

  // ─── Mobile Card ─────────────────────────────────────────────────────────
  const OperatorCard = ({ op }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">{op.operatorCode}</p>
          <p className="text-sm font-semibold text-gray-800">{op.name}</p>
        </div>
        <StatusBadge status={op.status} />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>Skill: {op.skill}</span>
        <span className="font-bold text-gray-700">₹{op.costPerHour || 0}/hr</span>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={() => openModal(op)} className="p-1.5 text-gray-300 hover:text-indigo-600" aria-label="Edit">
          <FaEdit size={14} />
        </button>
        <button onClick={() => handleDelete(op._id)} className="p-1.5 text-gray-300 hover:text-red-500" aria-label="Delete">
          <FaTrash size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaUsers className="text-indigo-600" /> Operator Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage machine operators and their costs</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Operator
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Lbl text="Search" />
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  className={`${inputClass} pl-9`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or code..."
                />
              </div>
            </div>
            <div>
              <Lbl text="Status" />
              <select className={inputClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on-leave">On Leave</option>
              </select>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Code</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Name</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Skill</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Cost/Hour</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td>
                  </tr>
                ) : operators.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">No operators found.</td>
                  </tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{op.operatorCode}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{op.name}</td>
                      <td className="px-6 py-4 text-gray-500 uppercase text-[11px]">{op.skill}</td>
                      <td className="px-6 py-4 text-right font-bold text-gray-700">₹{op.costPerHour || 0}/hr</td>
                      <td className="px-6 py-4 text-center"><StatusBadge status={op.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openModal(op)} className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors">
                            <FaEdit size={14} />
                          </button>
                          <button onClick={() => handleDelete(op._id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors">
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading...</p>
          ) : operators.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No operators found.</p>
          ) : (
            operators.map((op) => <OperatorCard key={op._id} op={op} />)
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaUsers size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editOperator ? "Edit Operator" : "Add Operator"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <Lbl text="Operator Code" req />
                <input
                  type="text"
                  className={inputClass}
                  value={formOperatorCode}
                  onChange={(e) => setFormOperatorCode(e.target.value)}
                  placeholder="Enter operator code"
                  required
                />
              </div>
              <div>
                <Lbl text="Name" req />
                <input
                  type="text"
                  className={inputClass}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Lbl text="Skill" />
                  <select className={inputClass} value={formSkill} onChange={(e) => setFormSkill(e.target.value)}>
                    <option value="machine">Machine Operator</option>
                    <option value="assembly">Assembly</option>
                    <option value="welding">Welding</option>
                    <option value="fabrication">Fabrication</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Status" />
                  <select className={inputClass} value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on-leave">On Leave</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Lbl text="Cost Per Hour (₹)" />
                  <input type="number" step="0.01" className={inputClass} value={formCostPerHour} onChange={(e) => setFormCostPerHour(e.target.value)} placeholder="0" />
                </div>
                <div>
                  <Lbl text="Cost Per Day (₹)" />
                  <input type="number" step="0.01" className={inputClass} value={formCostPerDay} onChange={(e) => setFormCostPerDay(e.target.value)} placeholder="0" />
                </div>
              </div>
              <div>
                <Lbl text="Efficiency (%)" />
                <input type="number" className={inputClass} value={formEfficiency} onChange={(e) => setFormEfficiency(e.target.value)} min="0" max="100" />
              </div>
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}