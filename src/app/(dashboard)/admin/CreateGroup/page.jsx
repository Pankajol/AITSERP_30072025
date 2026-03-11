"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaCheck,
  FaLayerGroup, FaExclamationCircle, FaArrowLeft
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function GroupsPage() {
  const [view,       setView]       = useState("list");
  const [groups,     setGroups]     = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [editId,     setEditId]     = useState(null);
  const [name,       setName]       = useState("");
  const [description,setDesc]       = useState("");
  const [errs,       setErrs]       = useState({});

  useEffect(() => { fetchGroups(); }, []);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get("/api/groupscreate", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setGroups(res.data.data || []);
      else toast.error(res.data.message || "Failed to fetch groups");
    } catch { toast.error("Error fetching groups"); }
    setLoading(false);
  };

  const validate = () => {
    const e = {};
    if (!name.trim())        e.name = "Group name is required";
    if (!description.trim()) e.desc = "Description is required";
    setErrs(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      if (editId) {
        const res = await axios.put(`/api/groupscreate/${editId}`, { name, description }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { setGroups(p => p.map(g => g._id === editId ? res.data.data : g)); toast.success("Group updated!"); }
      } else {
        const res = await axios.post("/api/groupscreate", { name, description }, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) { setGroups(p => [...p, res.data.data]); toast.success("Group created!"); }
      }
      reset();
    } catch { toast.error("Error saving group"); }
    setSaving(false);
  };

  const handleEdit = (g) => {
    setName(g.name);
    setDesc(g.description);
    setEditId(g._id);
    setErrs({});
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this group?")) return;
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.delete(`/api/groupscreate/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) { setGroups(p => p.filter(g => g._id !== id)); toast.success("Group deleted"); }
    } catch { toast.error("Error deleting group"); }
  };

  const reset = () => { setName(""); setDesc(""); setEditId(null); setErrs({}); setView("list"); };

  const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

  const filtered = groups.filter(g =>
    g.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── UI helpers ──
  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
    : null;

  const fi = (k) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
     ${errs[k]
       ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300"
       : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  // ════════════════════════════════════════
  // ── LIST VIEW ──
  // ════════════════════════════════════════
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Groups</h1>
            <p className="text-sm text-gray-400 mt-0.5">{groups.length} total groups</p>
          </div>
          <button
            onClick={() => { reset(); setView("form"); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaPlus className="text-xs" /> Create Group
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Groups",     value: groups.length,                                                                                                         emoji: "🗂️" },
            { label: "With Description", value: groups.filter(g => g.description?.trim()).length,                                                                      emoji: "📝" },
            { label: "Added This Week",  value: groups.filter(g => g.createdAt && (Date.now() - new Date(g.createdAt)) < 7 * 24 * 60 * 60 * 1000).length,             emoji: "🆕" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl p-4 flex items-center gap-3 border-2 border-transparent shadow-sm hover:-translate-y-0.5 hover:border-indigo-100 transition-all cursor-default">
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search groups…"
              />
            </div>
            <p className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["", "Group Name", "Description", "Created", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(5).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">🗂️</div>
                    <p className="text-sm font-medium text-gray-300">
                      {searchTerm ? "No groups match your search" : "No groups yet — create your first one!"}
                    </p>
                  </td></tr>
                ) : filtered.map(g => (
                  <tr key={g._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">

                    {/* Avatar */}
                    <td className="px-4 py-3 w-12">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-indigo-100">
                        {(g.name || "?")[0].toUpperCase()}
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{g.name}</p>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-500 truncate">{g.description || <span className="text-gray-200 italic">No description</span>}</p>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-400 font-medium">
                        {g.createdAt
                          ? new Date(g.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                          : <span className="text-gray-200">—</span>}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(g)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(g._id)}
                          className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  // ════════════════════════════════════════
  // ── FORM VIEW ──
  // ════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-xl mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Groups
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
          {editId ? "Edit Group" : "New Group"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {editId ? "Update the group details below" : "Fill in the details to create a new group"}
        </p>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">

          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <FaLayerGroup className="text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Group Details</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <Lbl text="Group Name" req />
              <input
                className={fi("name")}
                type="text"
                value={name}
                onChange={e => { setName(e.target.value); clearErr("name"); }}
                placeholder="e.g. Electronics, Raw Materials, Wholesale"
              />
              <Err k="name" />
            </div>

            <div>
              <Lbl text="Description" req />
              <textarea
                className={`${fi("desc")} resize-none`}
                rows={4}
                value={description}
                onChange={e => { setDesc(e.target.value); clearErr("desc"); }}
                placeholder="Brief description of what this group represents…"
              />
              <Err k="desc" />
            </div>
          </div>
        </div>

        {/* Footer navigation — exact same as Supplier/Item */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <FaArrowLeft className="text-xs" /> Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><FaCheck className="text-xs" /> {editId ? "Update Group" : "Create Group"}</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}