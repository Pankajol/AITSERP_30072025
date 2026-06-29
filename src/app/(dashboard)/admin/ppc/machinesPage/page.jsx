"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaCog } from "react-icons/fa";

const MachinePage = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMachine, setEditMachine] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formModel, setFormModel] = useState("");
  const [formBrand, setFormBrand] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [saving, setSaving] = useState(false);

  // ─── Fetch Machines ──────────────────────────────────────────────────
  const fetchMachines = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/ppc/machines?${params.toString()}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch machines");
      const data = await res.json();
      setMachines(data.data || []);
    } catch (err) {
      console.error("Fetch machines error:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // ─── Modal ──────────────────────────────────────────────────────────────
  const openModal = (machine = null) => {
    setEditMachine(machine);
    if (machine) {
      setFormCode(machine.code || "");
      setFormName(machine.name || "");
      setFormModel(machine.model || "");
      setFormBrand(machine.brandName || "");
      setFormCapacity(machine.productionCapacity || "");
    } else {
      setFormCode("");
      setFormName("");
      setFormModel("");
      setFormBrand("");
      setFormCapacity("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditMachine(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      alert("Code and Name are required");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const payload = {
        code: formCode.trim(),
        name: formName.trim(),
        model: formModel.trim(),
        brandName: formBrand.trim(),
        productionCapacity: parseFloat(formCapacity) || 0,
      };

      const method = editMachine ? "PUT" : "POST";
      const url = editMachine
        ? `/api/ppc/machines/${editMachine._id}`
        : "/api/ppc/machines";

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save");
      }
      const data = await res.json();
      if (editMachine) {
        setMachines(machines.map((m) => (m._id === editMachine._id ? data.data || m : m)));
      } else {
        setMachines([data.data, ...machines]);
      }
      closeModal();
    } catch (err) {
      console.error("Save error:", err);
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ppc/machines/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }
      setMachines(machines.filter((m) => m._id !== id));
    } catch (err) {
      console.error("Delete error:", err);
      alert(err.message);
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

  // ─── Mobile Card ─────────────────────────────────────────────────────────
  const MachineCard = ({ machine }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">{machine.code}</p>
          <p className="text-sm font-semibold text-gray-800">{machine.name}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p>Model: {machine.model}</p>
        <p>Brand: {machine.brandName}</p>
        <p>Capacity: {machine.productionCapacity || "N/A"}</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={() => openModal(machine)}
          className="p-1.5 text-gray-300 hover:text-indigo-600"
          aria-label="Edit"
        >
          <FaEdit size={14} />
        </button>
        <button
          onClick={() => handleDelete(machine._id)}
          className="p-1.5 text-gray-300 hover:text-red-500"
          aria-label="Delete"
        >
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
              <FaCog className="text-indigo-600" /> Machine Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage machines and their production capacity
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Machine
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1">
            <div>
              <Lbl text="Search" />
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  className={`${inputClass} pl-9`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by code, name or brand..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Code
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Model
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Brand
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Capacity
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                      Loading...
                    </td>
                  </tr>
                ) : machines.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                      No machines found.
                    </td>
                  </tr>
                ) : (
                  machines.map((m) => (
                    <tr key={m._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{m.code}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{m.name}</td>
                      <td className="px-6 py-4 text-gray-600">{m.model}</td>
                      <td className="px-6 py-4 text-gray-600">{m.brandName}</td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        {m.productionCapacity || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(m)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(m._id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                          >
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
          ) : machines.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No machines found.</p>
          ) : (
            machines.map((m) => <MachineCard key={m._id} machine={m} />)
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaCog size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editMachine ? "Edit Machine" : "Add Machine"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <Lbl text="Code" req />
                <input
                  type="text"
                  className={inputClass}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g. MCH-001"
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
              <div>
                <Lbl text="Model" />
                <input
                  type="text"
                  className={inputClass}
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                />
              </div>
              <div>
                <Lbl text="Brand" />
                <input
                  type="text"
                  className={inputClass}
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                />
              </div>
              <div>
                <Lbl text="Production Capacity" />
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={formCapacity}
                  onChange={(e) => setFormCapacity(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MachinePage;