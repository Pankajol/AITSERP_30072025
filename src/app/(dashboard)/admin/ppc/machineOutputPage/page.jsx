"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaCogs } from "react-icons/fa";
import Select from "react-select";

const MachineOutputPage = () => {
  const [machineOutputs, setMachineOutputs] = useState([]);
  const [machines, setMachines] = useState([]);   // dropdown
  const [items, setItems] = useState([]);         // dropdown
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOutput, setEditOutput] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formItem, setFormItem] = useState(null);     // react‑select value object
  const [formMachine, setFormMachine] = useState(null);
  const [formPerDayOutput, setFormPerDayOutput] = useState("");
  const [formRunningCost, setFormRunningCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ─── Fetch Data ──────────────────────────────────────────────────────────
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    };
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [outputsRes, machinesRes, itemsRes] = await Promise.all([
        fetch("/api/ppc/machineOutputs", { headers: getAuthHeaders() }),
        fetch("/api/ppc/machines", { headers: getAuthHeaders() }),
        fetch("/api/items", { headers: getAuthHeaders() }),
      ]);

      if (!outputsRes.ok) throw new Error("Failed to fetch machine outputs");
      if (!machinesRes.ok) throw new Error("Failed to fetch machines");
      if (!itemsRes.ok) throw new Error("Failed to fetch items");

      const outputsData = await outputsRes.json();
      const machinesData = await machinesRes.json();
      const itemsData = await itemsRes.json();

      setMachineOutputs(
        Array.isArray(outputsData) ? outputsData : outputsData.data || []
      );
      setMachines(
        Array.isArray(machinesData) ? machinesData : machinesData.data || []
      );
      setItems(Array.isArray(itemsData) ? itemsData : itemsData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Modal ──────────────────────────────────────────────────────────────
  const openModal = (output = null) => {
    setEditOutput(output);
    if (output) {
      // When editing, set the react‑select values to match the populated objects
      setFormItem(
        output.item
          ? {
              value: output.item._id || output.item,
              label: `${output.item.itemCode || ""} - ${output.item.itemName || ""}`,
            }
          : null
      );
      setFormMachine(
        output.machine
          ? {
              value: output.machine._id || output.machine,
              label: `${output.machine.code || output.machine.machineCode || ""} - ${
                output.machine.name || ""
              }`,
            }
          : null
      );
      setFormPerDayOutput(output.perDayOutput || "");
      setFormRunningCost(output.machineRunningCost || "");
    } else {
      setFormItem(null);
      setFormMachine(null);
      setFormPerDayOutput("");
      setFormRunningCost("");
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditOutput(null);
    setModalError(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formItem?.value || !formMachine?.value || !formPerDayOutput) {
      setModalError("Item, Machine, and Per Day Output are required.");
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      item: formItem.value,
      machine: formMachine.value,
      perDayOutput: parseFloat(formPerDayOutput) || 0,
      machineRunningCost: parseFloat(formRunningCost) || 0,
    };

    const method = editOutput ? "PUT" : "POST";
    const url = editOutput
      ? `/api/ppc/machineOutputs/${editOutput._id}`
      : "/api/ppc/machineOutputs";

    try {
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save");
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const res = await fetch(`/api/ppc/machineOutputs/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete");
      }
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── Filtered data for search (by item name/code or machine name/code) ──
  const filteredOutputs = machineOutputs.filter((output) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const itemCode = output.item?.itemCode?.toLowerCase() || "";
    const itemName = output.item?.itemName?.toLowerCase() || "";
    const machineCode = output.machine?.code?.toLowerCase() || output.machine?.machineCode?.toLowerCase() || "";
    const machineName = output.machine?.name?.toLowerCase() || "";
    return (
      itemCode.includes(query) ||
      itemName.includes(query) ||
      machineCode.includes(query) ||
      machineName.includes(query)
    );
  });

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
  const OutputCard = ({ output }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">
            {output.item?.itemCode || "N/A"}
          </p>
          <p className="text-sm font-semibold text-gray-800">
            {output.item?.itemName || "N/A"}
          </p>
        </div>
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          Machine:{" "}
          {output.machine
            ? `${output.machine.code || output.machine.machineCode} - ${output.machine.name}`
            : "N/A"}
        </p>
        <p>Per Day: {output.perDayOutput}</p>
        <p>Running Cost: ₹{output.machineRunningCost}</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={() => openModal(output)}
          className="p-1.5 text-gray-300 hover:text-indigo-600"
          aria-label="Edit"
        >
          <FaEdit size={14} />
        </button>
        <button
          onClick={() => handleDelete(output._id)}
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
              <FaCogs className="text-indigo-600" /> Machine Output Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage item outputs per machine and running costs
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Machine Output
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
                  placeholder="Search by item code, name, or machine..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
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
                    Item Code
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Item Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Machine
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Per Day Output
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Running Cost
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
                ) : filteredOutputs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-10 text-center text-gray-400 italic">
                      No machine outputs found.
                    </td>
                  </tr>
                ) : (
                  filteredOutputs.map((output) => (
                    <tr key={output._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {output.item?.itemCode || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-800">
                        {output.item?.itemName || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-gray-800">
                        {output.machine
                          ? `${output.machine.code || output.machine.machineCode} - ${output.machine.name}`
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-gray-700">
                        {output.perDayOutput}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        ₹{output.machineRunningCost || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(output)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(output._id)}
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
          ) : filteredOutputs.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No machine outputs found.</p>
          ) : (
            filteredOutputs.map((output) => <OutputCard key={output._id} output={output} />)
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
                {editOutput ? "Edit Machine Output" : "Add Machine Output"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
                  {modalError}
                </div>
              )}

              <div>
                <Lbl text="Item" req />
                <Select
                  placeholder="Select Item"
                  value={formItem}
                  options={items.map((item) => ({
                    value: item._id,
                    label: `${item.itemCode} - ${item.itemName}`,
                  }))}
                  onChange={(selected) => setFormItem(selected)}
                  isClearable
                  className="text-sm"
                />
              </div>

              <div>
                <Lbl text="Machine" req />
                <Select
                  placeholder="Select Machine"
                  value={formMachine}
                  options={machines.map((machine) => ({
                    value: machine._id,
                    label: `${machine.code || machine.machineCode} - ${machine.name}`,
                  }))}
                  onChange={(selected) => setFormMachine(selected)}
                  isClearable
                  className="text-sm"
                />
              </div>

              <div>
                <Lbl text="Per Day Output" req />
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={formPerDayOutput}
                  onChange={(e) => setFormPerDayOutput(e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div>
                <Lbl text="Machine Running Cost (₹)" />
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formRunningCost}
                  onChange={(e) => setFormRunningCost(e.target.value)}
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

export default MachineOutputPage;