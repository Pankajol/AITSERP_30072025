"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaPeopleArrows } from "react-icons/fa";

const OperatorMachineMappingPage = () => {
  const [mappings, setMappings] = useState([]);
  const [operators, setOperators] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editMapping, setEditMapping] = useState(null);

  // Form state
  const [formOperator, setFormOperator] = useState("");
  const [formMachine, setFormMachine] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── Fetch all data ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [mappingsRes, operatorsRes, machinesRes] = await Promise.all([
        fetch("/api/ppc/operatorMachineMappings", { headers }),
        fetch("/api/ppc/operators", { headers }),
        fetch("/api/ppc/machines", { headers }),
      ]);

      if (!mappingsRes.ok) throw new Error("Failed to fetch mappings");
      if (!operatorsRes.ok) throw new Error("Failed to fetch operators");
      if (!machinesRes.ok) throw new Error("Failed to fetch machines");

      const mappingsData = await mappingsRes.json();
      const operatorsData = await operatorsRes.json();
      const machinesData = await machinesRes.json();

      setMappings(mappingsData.data || []);
      setOperators(operatorsData.data || []);
      setMachines(machinesData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchData();
  }, [fetchData, token]);

  // ─── Modal handlers ─────────────────────────────────────────────────
  const openModal = (mapping = null) => {
    setEditMapping(mapping);
    if (mapping) {
      setFormOperator(mapping.operator?._id || mapping.operator || "");
      setFormMachine(mapping.machine?._id || mapping.machine || "");
    } else {
      setFormOperator(operators[0]?._id || "");
      setFormMachine(machines[0]?._id || "");
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditMapping(null);
    setModalError(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formOperator || !formMachine) {
      setModalError("Please select both an operator and a machine.");
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      operator: formOperator,
      machine: formMachine,
    };
    const method = editMapping ? "PUT" : "POST";
    const url = editMapping
      ? `/api/ppc/operatorMachineMappings/${editMapping._id}`
      : "/api/ppc/operatorMachineMappings";

    try {
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
        throw new Error(errData.message || "Failed to save mapping");
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this mapping?")) return;
    try {
      const res = await fetch(`/api/ppc/operatorMachineMappings/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete mapping");
      }
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Client‑side search ──────────────────────────────────────────────
  const filteredMappings = mappings.filter((mapping) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const opName = mapping.operator?.name?.toLowerCase() || "";
    const machName = mapping.machine?.name?.toLowerCase() || "";
    return opName.includes(q) || machName.includes(q);
  });

  // ─── UI Helpers ──────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  // ─── Mobile Card ─────────────────────────────────────────────────────
  const MappingCard = ({ mapping }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <p className="font-bold text-indigo-600">
        {mapping.operator?.name || "N/A"}
      </p>
      <p className="text-xs text-gray-500">
        Machine: {mapping.machine?.name || "N/A"}
      </p>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={() => openModal(mapping)}
          className="p-1.5 text-gray-300 hover:text-indigo-600"
          aria-label="Edit"
        >
          <FaEdit size={14} />
        </button>
        <button
          onClick={() => handleDelete(mapping._id)}
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
              <FaPeopleArrows className="text-indigo-600" /> Operator-Machine Mappings
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Link operators to the machines they work on
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Mapping
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
                  placeholder="Search by operator or machine name..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
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
                    Operator
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Machine
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">
                      Loading...
                    </td>
                  </tr>
                ) : filteredMappings.length === 0 ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic">
                      No mappings found.
                    </td>
                  </tr>
                ) : (
                  filteredMappings.map((mapping) => (
                    <tr key={mapping._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {mapping.operator?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-800">
                        {mapping.machine?.name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(mapping)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(mapping._id)}
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
          ) : filteredMappings.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No mappings found.</p>
          ) : (
            filteredMappings.map((mapping) => (
              <MappingCard key={mapping._id} mapping={mapping} />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaPeopleArrows size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editMapping ? "Edit Mapping" : "Add Mapping"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {modalError}
                </div>
              )}

              <div>
                <Lbl text="Operator" req />
                <select
                  className={inputClass}
                  value={formOperator}
                  onChange={(e) => setFormOperator(e.target.value)}
                  required
                >
                  <option value="">Select Operator</option>
                  {operators.map((op) => (
                    <option key={op._id} value={op._id}>
                      {op.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Lbl text="Machine" req />
                <select
                  className={inputClass}
                  value={formMachine}
                  onChange={(e) => setFormMachine(e.target.value)}
                  required
                >
                  <option value="">Select Machine</option>
                  {machines.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name}
                    </option>
                  ))}
                </select>
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

export default OperatorMachineMappingPage;