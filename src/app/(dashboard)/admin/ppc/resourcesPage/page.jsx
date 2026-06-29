"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaBoxes } from "react-icons/fa";

const ResourcePage = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editResource, setEditResource] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formUnitPrice, setFormUnitPrice] = useState("");
  const [saving, setSaving] = useState(false);

  // ─── Fetch Resources ──────────────────────────────────────────────────
  const fetchResources = useCallback(async () => {
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

      const res = await fetch(`/api/ppc/resources?${params.toString()}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch resources");
      const data = await res.json();
      setResources(data.data || []);
    } catch (err) {
      console.error("Fetch resources error:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  // ─── Modal ──────────────────────────────────────────────────────────────
  const openModal = (resource = null) => {
    setEditResource(resource);
    if (resource) {
      setFormCode(resource.code || "");
      setFormName(resource.name || "");
      setFormUnitPrice(resource.unitPrice || "");
    } else {
      setFormCode("");
      setFormName("");
      setFormUnitPrice("");
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditResource(null);
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
        unitPrice: parseFloat(formUnitPrice) || 0,
      };

      const method = editResource ? "PUT" : "POST";
      const url = editResource
        ? `/api/ppc/resources/${editResource._id}`
        : "/api/ppc/resources";

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
      if (editResource) {
        setResources(
          resources.map((r) => (r._id === editResource._id ? data.data || r : r))
        );
      } else {
        setResources([data.data, ...resources]);
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
      const res = await fetch(`/api/ppc/resources/${id}`, {
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
      setResources(resources.filter((r) => r._id !== id));
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
  const ResourceCard = ({ resource }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">{resource.code}</p>
          <p className="text-sm font-semibold text-gray-800">{resource.name}</p>
        </div>
      </div>
      <div className="text-xs text-gray-500">
        <p>Unit Price: ₹{resource.unitPrice || 0}</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={() => openModal(resource)}
          className="p-1.5 text-gray-300 hover:text-indigo-600"
          aria-label="Edit"
        >
          <FaEdit size={14} />
        </button>
        <button
          onClick={() => handleDelete(resource._id)}
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
              <FaBoxes className="text-indigo-600" /> Resource Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage resources and their unit prices
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Resource
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
                  placeholder="Search by code or name..."
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
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Unit Price
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
                ) : resources.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-10 text-center text-gray-400 italic">
                      No resources found.
                    </td>
                  </tr>
                ) : (
                  resources.map((r) => (
                    <tr key={r._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{r.code}</td>
                      <td className="px-6 py-4 font-bold text-gray-800">{r.name}</td>
                      <td className="px-6 py-4 text-right text-gray-700">
                        ₹{r.unitPrice || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(r)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(r._id)}
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
          ) : resources.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No resources found.</p>
          ) : (
            resources.map((r) => <ResourceCard key={r._id} resource={r} />)
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaBoxes size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editResource ? "Edit Resource" : "Add Resource"}
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
                  placeholder="e.g. RES-001"
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
                <Lbl text="Unit Price (₹)" />
                <input
                  type="number"
                  step="0.01"
                  className={inputClass}
                  value={formUnitPrice}
                  onChange={(e) => setFormUnitPrice(e.target.value)}
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

export default ResourcePage;