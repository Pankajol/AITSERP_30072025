"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import {
  FiPlus, FiTrash2, FiEdit2, FiSearch, FiHome, FiX
} from "react-icons/fi";

// ── Ward form fields (added block field) ──
const WARD_FORM_FIELDS = [
  { name: "wardNumber", label: "Ward Number *", type: "text", required: true },
  { name: "name", label: "Name", type: "text" },
  { name: "constituency", label: "Constituency *", type: "select", required: true, options: [] },
  { name: "block", label: "Block", type: "select", options: [] },        // NEW: block selection
  { name: "address.line1", label: "Address Line 1", type: "text" },
  { name: "address.village", label: "Village", type: "text" },
  { name: "address.postOffice", label: "Post Office", type: "text" },
  { name: "address.pincode", label: "PIN Code", type: "text" },
  { name: "address.location.latitude", label: "Latitude", type: "number", step: "any" },
  { name: "address.location.longitude", label: "Longitude", type: "number", step: "any" },
  { name: "totalVoters", label: "Total Voters", type: "number" },
];

export default function WardsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [constituencies, setConstituencies] = useState([]);
  const [workersList, setWorkersList] = useState([]);
  const [blocksList, setBlocksList] = useState([]);      // NEW: blocks for selected constituency
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ── Fetch wards ──
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/election/ward", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [token]);

  // ── Fetch constituencies ──
  const fetchConstituencies = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/election/constituency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const list = data.data.map(c => ({ value: c._id, label: c.name }));
        WARD_FORM_FIELDS.find(f => f.name === "constituency").options = list;
        setConstituencies(list);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // ── Fetch blocks for a given constituency ──
  const fetchBlocksForConstituency = useCallback(async (constituencyId) => {
    if (!constituencyId) {
      setBlocksList([]);
      return;
    }
    try {
      const { data } = await axios.get(`/api/election/block?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const list = data.data.map(b => ({ value: b._id, label: `${b.blockNumber} - ${b.name || ''}` }));
        // update the block field options dynamically
        const blockField = WARD_FORM_FIELDS.find(f => f.name === "block");
        if (blockField) blockField.options = list;
        setBlocksList(list);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // ── Fetch workers ──
  const fetchWorkers = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/election/worker", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setWorkersList(data.data.map(w => ({ value: w._id, label: w.name })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => {
    fetchData();
    fetchConstituencies();
    fetchWorkers();
  }, [fetchData, fetchConstituencies, fetchWorkers]);

  // When constituency changes in form, reload blocks
  useEffect(() => {
    if (form.constituency) {
      fetchBlocksForConstituency(form.constituency);
    } else {
      setBlocksList([]);
    }
  }, [form.constituency, fetchBlocksForConstituency]);

  const resetForm = () => {
    setForm({});
    setEditingId(null);
    setError("");
    setBlocksList([]);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      wardNumber: item.wardNumber || "",
      name: item.name || "",
      constituency: item.constituency?._id || "",
      block: item.block?._id || "",
      "address.line1": item.address?.line1 || "",
      "address.village": item.address?.village || "",
      "address.postOffice": item.address?.postOffice || "",
      "address.pincode": item.address?.pincode || "",
      "address.location.latitude": item.address?.location?.coordinates?.[1] ?? "",
      "address.location.longitude": item.address?.location?.coordinates?.[0] ?? "",
      totalVoters: item.totalVoters ?? "",
      assignedAgent: item.assignedAgent?._id || "",
      incharge: item.incharge?._id || "",
    });
    // load blocks for this constituency (to populate dropdown)
    if (item.constituency?._id) {
      fetchBlocksForConstituency(item.constituency._id);
    }
    setModalOpen(true);
  };

  const buildPayload = () => {
    const payload = {
      wardNumber: form.wardNumber,
      name: form.name,
      constituency: form.constituency,
      block: form.block || undefined,          // include block if selected
      totalVoters: form.totalVoters ? parseInt(form.totalVoters, 10) : 0,
      assignedAgent: form.assignedAgent || undefined,
      incharge: form.incharge || undefined,
      address: {
        line1: form["address.line1"] || "",
        village: form["address.village"] || "",
        postOffice: form["address.postOffice"] || "",
        pincode: form["address.pincode"] || "",
      },
    };

    const lat = form["address.location.latitude"];
    const lng = form["address.location.longitude"];
    if (lat !== undefined && lat !== "" && lng !== undefined && lng !== "") {
      payload.address.location = {
        type: "Point",
        coordinates: [parseFloat(lng), parseFloat(lat)],
      };
    }

    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.wardNumber || !form.constituency) {
      return setError("Ward Number and Constituency are required.");
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await axios.put(`/api/election/ward?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/election/ward", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this ward?")) return;
    await axios.delete(`/api/election/ward?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecords(prev => prev.filter(r => r._id !== id));
  };

  const filtered = useMemo(
    () => records.filter(r =>
      !search.trim() ||
      r.wardNumber?.toLowerCase().includes(search.toLowerCase()) ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.constituency?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.block?.blockNumber?.toLowerCase().includes(search.toLowerCase())
    ),
    [records, search]
  );

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    // If constituency changes, reset block selection
    if (name === "constituency") {
      setForm(prev => ({ ...prev, [name]: value, block: "" }));
    } else {
      setForm(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Wards</h1>
          <p className="text-sm text-gray-400 mt-0.5">{records.length} records</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200"
        >
          <FiPlus className="text-base" /> Add Ward
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search ward number, name, block..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
              <div className="flex gap-1.5">
                {[1,2].map(j => <div key={j} className="h-5 w-16 bg-gray-100 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiHome className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No wards yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Ward" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.wardNumber}</h3>
                  {item.name && <p className="text-sm text-gray-600">{item.name}</p>}
                  <p className="text-xs text-gray-400">{item.constituency?.name || "-"}</p>
                  {item.block && (
                    <p className="text-xs text-indigo-500 mt-0.5">
                      Block: {item.block.blockNumber} {item.block.name ? `- ${item.block.name}` : ''}
                    </p>
                  )}
                  {(item.address?.line1 || item.address?.village || item.address?.postOffice || item.address?.pincode) && (
                    <p className="text-xs text-gray-400 mt-1">
                      {item.address?.line1 ? `${item.address.line1}, ` : ""}
                      {item.address?.village ? `${item.address.village}, ` : ""}
                      {item.address?.postOffice ? `${item.address.postOffice} - ` : ""}
                      {item.address?.pincode || ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)}
                    className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                    <FiEdit2 className="text-xs" />
                  </button>
                  <button onClick={() => handleDelete(item._id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.assignedAgent?.name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-50 text-green-600 border border-green-100">
                    Agent: {item.assignedAgent.name}
                  </span>
                )}
                {item.incharge?.name && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
                    Incharge: {item.incharge.name}
                  </span>
                )}
                {item.totalVoters != null && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                    {item.totalVoters} voters
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiHome className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {editingId ? "Edit Ward" : "New Ward"}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {editingId ? "Update details" : "Enter ward information"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setModalOpen(false); resetForm(); }}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all"
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <FiX className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 font-medium">{error}</p>
                  </div>
                )}

                {/* Standard fields */}
                {WARD_FORM_FIELDS.map(field => {
                  // For block field, use blocksList as options (will be updated when constituency changes)
                  if (field.name === "block") {
                    return (
                      <div key={field.name}>
                        <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                          Block
                        </label>
                        <select
                          name="block"
                          value={form.block || ""}
                          onChange={handleFieldChange}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                          disabled={!form.constituency}
                        >
                          <option value="">-- Select Block (optional) --</option>
                          {blocksList.map(block => (
                            <option key={block.value} value={block.value}>
                              {block.label}
                            </option>
                          ))}
                        </select>
                        {!form.constituency && (
                          <p className="text-xs text-amber-600 mt-1">Select a constituency first to load blocks</p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div key={field.name}>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        {field.label}
                      </label>
                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          value={form[field.name] || ""}
                          onChange={handleFieldChange}
                          required={field.required}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        >
                          <option value="">Select...</option>
                          {field.options?.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={field.name}
                          type={field.type}
                          value={form[field.name] || ""}
                          onChange={handleFieldChange}
                          required={field.required}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
                          placeholder={`Enter ${field.label.replace(" *","")}`}
                          step={field.step}
                        />
                      )}
                    </div>
                  );
                })}

                {/* Assigned Agent dropdown */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Assigned Agent
                  </label>
                  <select
                    name="assignedAgent"
                    value={form.assignedAgent || ""}
                    onChange={handleFieldChange}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">None</option>
                    {workersList.map(w => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>

                {/* Incharge dropdown */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Incharge
                  </label>
                  <select
                    name="incharge"
                    value={form.incharge || ""}
                    onChange={handleFieldChange}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  >
                    <option value="">None</option>
                    {workersList.map(w => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
                    saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                  }`}
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}