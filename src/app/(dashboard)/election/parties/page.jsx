// app/(dashboard)/election/parties/page.js
"use client";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiSearch, FiFlag, FiX } from "react-icons/fi";

const PARTY_FORM_FIELDS = [
  { name: "name", label: "Party Name *", type: "text", required: true },
  { name: "acronym", label: "Acronym", type: "text" },
  { name: "candidateName", label: "Candidate Name *", type: "text", required: true },
  { name: "electionType", label: "Election Type *", type: "select", required: true,
    options: [
      { value: "LokSabha", label: "Lok Sabha" },
      { value: "VidhanSabha", label: "Vidhan Sabha" },
      { value: "LocalBody", label: "Local Body" },
    ]
  },
  { name: "campaignSlogan", label: "Slogan", type: "text" },
];

const STATUS_STYLE = {
  Active: "bg-green-50 text-green-600 border-green-200",
  Inactive: "bg-gray-50 text-gray-500 border-gray-200",
};

export default function PartiesPage() {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchParties = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/election/party", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setParties(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchParties(); }, [token]);

  const resetForm = () => {
    setForm({});
    setEditingId(null);
    setError("");
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (party) => {
    setEditingId(party._id);
    setForm({
      name: party.name,
      acronym: party.acronym,
      candidateName: party.candidateName,
      electionType: party.electionType,
      campaignSlogan: party.campaignSlogan,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.candidateName || !form.electionType) {
      return setError("Please fill required fields.");
    }
    setSaving(true);
    try {
      if (editingId) {
        await axios.put(`/api/election/party?id=${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/election/party", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchParties();
    } catch (e) {
      setError(e.response?.data?.message || "Error saving party");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this party?")) return;
    await axios.delete(`/api/election/party?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setParties(prev => prev.filter(p => p._id !== id));
  };

  const filtered = useMemo(
    () => parties.filter(p =>
      !search.trim() ||
      p.name?.toLowerCase().includes(search.toLowerCase()) ||
      p.candidateName?.toLowerCase().includes(search.toLowerCase()) ||
      (p.acronym && p.acronym.toLowerCase().includes(search.toLowerCase()))
    ),
    [parties, search]
  );

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Parties & Candidates</h1>
          <p className="text-sm text-gray-400 mt-0.5">{parties.length} records</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Party
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search parties..."
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
            <FiFlag className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No parties match your search" : "No parties yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Party" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(party => (
            <div key={party._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{party.name}</h3>
                  <p className="text-sm text-gray-500">{party.candidateName}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(party)}
                    className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                    <FiEdit2 className="text-xs" />
                  </button>
                  <button onClick={() => handleDelete(party._id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {party.acronym && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100">
                    {party.acronym}
                  </span>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${STATUS_STYLE[party.status] || "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {party.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-violet-50 text-violet-600 border border-violet-100">
                  {party.electionType}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal (same as your CompanyUser modal style) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiFlag className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Party" : "New Party"}</h2>
                  <p className="text-xs text-gray-400">{editingId ? "Update details" : "Enter party information"}</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all">
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
                {PARTY_FORM_FIELDS.map(field => (
                  <div key={field.name}>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{field.label}</label>
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
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
                    saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
                  }`}>
                  {saving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </span>
                  ) : (
                    <><FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}</>
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