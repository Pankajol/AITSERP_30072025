"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaCogs } from "react-icons/fa";

const OperationPage = () => {
  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOperation, setEditOperation] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formCost, setFormCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ─── Fetch Operations ──────────────────────────────────────────────────
  const fetchOperations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Authentication token not found. Please log in again.");
        setLoading(false);
        return;
      }
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);

      const res = await fetch(`/api/ppc/operations?${params.toString()}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch operations");
      const data = await res.json();
      setOperations(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchOperations();
  }, [fetchOperations]);

  // ─── Modal ──────────────────────────────────────────────────────────────
  const openModal = (operation = null) => {
    setEditOperation(operation);
    if (operation) {
      setFormCode(operation.code || "");
      setFormName(operation.name || "");
      setFormCost(operation.cost || "");
    } else {
      setFormCode("");
      setFormName("");
      setFormCost("");
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditOperation(null);
    setModalError(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formCode.trim() || !formName.trim()) {
      setModalError("Code and Name are required.");
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      code: formCode.trim(),
      name: formName.trim(),
      cost: parseFloat(formCost) || 0,
    };
    const method = editOperation ? "PUT" : "POST";
    const url = editOperation
      ? `/api/ppc/operations/${editOperation._id}`
      : "/api/ppc/operations";

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save");
      }
      await fetchOperations();
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this operation?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/ppc/operations/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete");
      }
      await fetchOperations();
    } catch (err) {
      setError(err.message);
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
  const OperationCard = ({ operation }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">{operation.code}</p>
          <p className="text-sm font-semibold text-gray-800">{operation.name}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        <p>Cost per Hour: ₹{operation.cost || 0}</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={() => openModal(operation)}
          className="p-1.5 text-gray-300 hover:text-indigo-600"
          aria-label="Edit"
        >
          <FaEdit size={14} />
        </button>
        <button
          onClick={() => handleDelete(operation._id)}
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
              <FaCogs className="text-indigo-600" /> Operation Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage production operations and their hourly costs
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Operation
          </button>
        </div>

        {/* Search Filter */}
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
                  placeholder="Search by code or name..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

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
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Cost per Hour
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">
                      Loading...
                    </td>
                  </tr>
                ) : operations.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">
                      No operations found.
                    </td>
                  </tr>
                ) : (
                  operations.map((op) => (
                    <tr key={op._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{op.code}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{op.name}</td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        ₹{op.cost || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(op)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(op._id)}
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
          ) : operations.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No operations found.</p>
          ) : (
            operations.map((op) => <OperationCard key={op._id} operation={op} />)
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaCogs size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editOperation ? "Edit Operation" : "Add Operation"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {modalError}
                </div>
              )}

              <div>
                <Lbl text="Code" req />
                <input
                  type="text"
                  className={inputClass}
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                  placeholder="e.g., OPR-001"
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
                <Lbl text="Cost per Hour (₹)" />
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formCost}
                  onChange={(e) => setFormCost(e.target.value)}
                  placeholder="0.00"
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

export default OperationPage;