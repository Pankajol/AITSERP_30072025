"use client";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiSearch, FiMic, FiX } from "react-icons/fi";
import { SearchableSelect } from "@/components/SearchableSelect"; // for unrestricted users

const RALLY_FORM_FIELDS = [
  { name: "name", label: "Name *", type: "text", required: true },
  { name: "type", label: "Type", type: "select", options: [
    { value: "JanSabha", label: "Jan Sabha" },
    { value: "RoadShow", label: "Road Show" },
    { value: "Meeting", label: "Meeting" },
    { value: "CornerMeeting", label: "Corner Meeting" },
  ]},
  { name: "date", label: "Date *", type: "datetime-local", required: true },
  { name: "venue", label: "Venue *", type: "text", required: true },
  { name: "budget", label: "Budget", type: "number" },
  { name: "expectedCrowd", label: "Expected Crowd", type: "number" },
  { name: "actualCrowd", label: "Actual Crowd", type: "number" },
  { name: "status", label: "Status", type: "select", options: [
    { value: "Planned", label: "Planned" },
    { value: "Approved", label: "Approved" },
    { value: "Ongoing", label: "Ongoing" },
    { value: "Completed", label: "Completed" },
    { value: "Cancelled", label: "Cancelled" },
  ]},
];

export default function RalliesPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignedConstituency, setAssignedConstituency] = useState(null);
  const [isRestricted, setIsRestricted] = useState(false);
  const [constituencyOptions, setConstituencyOptions] = useState([]); // for unrestricted

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Decode JWT to get assigned constituency
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const assigned = payload.assignedConstituency;
      if (assigned && assigned._id) {
        setAssignedConstituency({ _id: assigned._id, name: assigned.name });
        setIsRestricted(true);
      } else {
        setIsRestricted(false);
      }
    } catch (err) {
      console.error("Failed to decode token", err);
    }
  }, [token]);

  // Fetch constituencies (only for unrestricted users)
  useEffect(() => {
    if (!token || isRestricted) return;
    const load = async () => {
      try {
        const { data } = await axios.get("/api/election/constituency", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setConstituencyOptions(data.data.map(c => ({ value: c._id, label: c.name })));
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [token, isRestricted]);

  // Fetch rallies – automatically filter by assigned constituency if restricted
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = "/api/election/rally";
      if (isRestricted && assignedConstituency) {
        url += `?constituency=${assignedConstituency._id}`;
      }
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (token && (assignedConstituency !== null || !isRestricted)) {
      fetchData();
    }
  }, [token, assignedConstituency, isRestricted]);

  const resetForm = () => { setForm({}); setEditingId(null); setError(""); };

  const openCreate = () => {
    resetForm();
    if (isRestricted && assignedConstituency) {
      setForm(prev => ({ ...prev, constituency: assignedConstituency._id }));
    }
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      name: item.name,
      type: item.type || "JanSabha",
      date: item.date ? new Date(item.date).toISOString().slice(0, 16) : "",
      venue: item.venue,
      constituency: item.constituency?._id || "",
      budget: item.budget,
      expectedCrowd: item.expectedCrowd,
      actualCrowd: item.actualCrowd,
      status: item.status || "Planned",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date || !form.venue) return setError("Name, Date and Venue are required.");
    setSaving(true);
    try {
      // Ensure constituency is set for restricted users
      const payload = { ...form };
      if (isRestricted && assignedConstituency) {
        payload.constituency = assignedConstituency._id;
      }
      if (editingId) {
        await axios.put(`/api/election/rally?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/election/rally", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchData();
    } catch (e) {
      setError(e.response?.data?.message || "Error saving rally");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this rally?")) return;
    await axios.delete(`/api/election/rally?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setRecords(prev => prev.filter(r => r._id !== id));
  };

  const filtered = useMemo(
    () => records.filter(r =>
      !search.trim() ||
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.venue?.toLowerCase().includes(search.toLowerCase())
    ),
    [records, search]
  );

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      {isRestricted && assignedConstituency && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
          🔒 You are restricted to constituency: <strong>{assignedConstituency.name}</strong>. Only rallies in this constituency are shown.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Rallies & Events</h1>
          <p className="text-sm text-gray-400 mt-0.5">{records.length} records</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Rally
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rallies..." />
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
            <FiMic className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No rallies yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Rally" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{new Date(item.date).toLocaleDateString()} - {item.venue}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
                    <FiEdit2 className="text-xs" />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
                  {item.type}
                </span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                  item.status === "Completed" ? "bg-green-50 text-green-600 border-green-200" :
                  item.status === "Cancelled" ? "bg-red-50 text-red-600 border-red-200" :
                  "bg-blue-50 text-blue-600 border-blue-200"}`}>
                  {item.status}
                </span>
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
                  <FiMic className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Rally" : "New Rally"}</h2>
                  <p className="text-xs text-gray-400">Enter rally details</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600">
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

                {/* Constituency field – locked for restricted users */}
                <div>
                  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Constituency</label>
                  {isRestricted ? (
                    <input
                      type="text"
                      value={assignedConstituency?.name || "Assigned constituency"}
                      disabled
                      className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
                    />
                  ) : (
                    <SearchableSelect
                      options={constituencyOptions}
                      value={form.constituency || ""}
                      onChange={(val) => setForm(prev => ({ ...prev, constituency: val }))}
                      placeholder="Select constituency (optional)"
                    />
                  )}
                </div>

                {RALLY_FORM_FIELDS.map(field => (
                  <div key={field.name}>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{field.label}</label>
                    {field.type === "select" ? (
                      <select name={field.name} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                        <option value="">Select...</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input name={field.name} type={field.type} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        placeholder={`Enter ${field.label.replace(" *","")}`} />
                    )}
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving} className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"}`}>
                  {saving ? (<><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>) : (<><FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}