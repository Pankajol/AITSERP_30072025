"use client";

import { useEffect, useState, useRef } from "react";
import axios from "axios";
import TiptapEditor from "@/components/TiptapEditor";
import {
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck, FaSearch,
  FaEnvelope, FaSync, FaExclamationCircle, FaGlobe, FaBuilding
} from "react-icons/fa";
import { toast } from "react-toastify";

export default function EmailTemplatesAdmin() {
  const [templates,      setTemplates]      = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [modalOpen,      setModalOpen]      = useState(false);
  const [editMode,       setEditMode]       = useState("create"); // 'create' | 'edit'
  const [editDoc,        setEditDoc]        = useState(null);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [html,           setHtml]           = useState("<p></p>");
  const [companyIdInput, setCompanyIdInput] = useState("");
  const [errs,           setErrs]           = useState({});

  const nameRef    = useRef("");
  const subjectRef = useRef("");

  // axios with token
  const axiosAuth = axios.create();
  axiosAuth.interceptors.request.use((cfg) => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (token) cfg.headers.Authorization = `Bearer ${token}`;
    } catch { }
    return cfg;
  });

  useEffect(() => { loadTemplates(); }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await axiosAuth.get("/api/email-templates");
      setTemplates(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to load templates");
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditMode("create"); setEditDoc(null);
    nameRef.current = ""; subjectRef.current = "";
    setHtml("<p></p>"); setCompanyIdInput(""); setErrs({});
    setModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditMode("edit"); setEditDoc(doc);
    nameRef.current    = doc.name    || "";
    subjectRef.current = doc.subject || "";
    setHtml(doc.contentHtml || "<p></p>");
    setCompanyIdInput(doc.companyId || "");
    setErrs({}); setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setErrs({}); };

  const validate = () => {
    const e = {};
    if (!nameRef.current?.trim())    e.name    = "Template name is required";
    if (!subjectRef.current?.trim()) e.subject = "Subject is required";
    if (!html || html === "<p></p>") e.html    = "Email content is required";
    setErrs(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return false; }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name:        nameRef.current,
        subject:     subjectRef.current,
        contentHtml: html,
        companyId:   companyIdInput || undefined,
      };
      if (editMode === "create") {
        const res = await axiosAuth.post("/api/email-templates", payload);
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Template created!");
      } else {
        const res = await axiosAuth.put(`/api/email-templates/${editDoc._id}`, payload);
        if (res.data?.error) throw new Error(res.data.error);
        toast.success("Template updated!");
      }
      await loadTemplates();
      closeModal();
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || "Save failed");
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this template?")) return;
    try {
      await axiosAuth.delete(`/api/email-templates/${id}`);
      toast.success("Template deleted");
      await loadTemplates();
    } catch (err) {
      toast.error(err?.response?.data?.error || "Delete failed");
    }
  };

  const filtered = templates.filter(t =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total:   templates.length,
    global:  templates.filter(t => !t.companyId).length,
    company: templates.filter(t => !!t.companyId).length,
  };

  // ── UI helpers ──
  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium"><FaExclamationCircle className="text-[10px] shrink-0" />{errs[k]}</p>
    : null;

  const fi = (k, extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
     ${errs[k]
       ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300"
       : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Email Templates</h1>
            <p className="text-sm text-gray-400 mt-0.5">{templates.length} total templates</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadTemplates}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-300 transition-all">
              <FaSync className={`text-xs ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> New Template
            </button>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          {[
            { label: "Total Templates", value: stats.total,   emoji: "📧" },
            { label: "Global",          value: stats.global,  emoji: "🌐" },
            { label: "Company-Specific",value: stats.company, emoji: "🏢" },
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

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by name or subject…" />
            </div>
            <p className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["", "Template Name", "Subject", "Scope", "Actions"].map(h => (
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
                    <div className="text-4xl mb-2 opacity-20">📧</div>
                    <p className="text-sm font-medium text-gray-300">
                      {searchTerm ? "No templates match your search" : "No templates yet — create your first one!"}
                    </p>
                  </td></tr>
                ) : filtered.map(t => (
                  <tr key={t._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">

                    {/* Avatar */}
                    <td className="px-4 py-3 w-12">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-100">
                        <FaEnvelope className="text-xs" />
                      </div>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{t.name || <span className="text-gray-300 italic font-normal">Unnamed</span>}</p>
                    </td>

                    {/* Subject */}
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-gray-500 truncate">{t.subject || <span className="text-gray-200">—</span>}</p>
                    </td>

                    {/* Scope */}
                    <td className="px-4 py-3">
                      {t.companyId
                        ? <span className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 w-fit"><FaBuilding className="text-[9px]" /> Company</span>
                        : <span className="flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 w-fit"><FaGlobe className="text-[9px]" /> Global</span>}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(t)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(t._id)}
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

      {/* ══════════════════════════════════════════
          ── MODAL — Create / Edit Template ──
      ══════════════════════════════════════════ */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />

          {/* Modal card */}
          <div className="relative z-10 w-full max-w-3xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                <FaEnvelope className="text-sm" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-900">
                  {editMode === "create" ? "New Email Template" : "Edit Template"}
                </h3>
                <p className="text-xs text-gray-400">Fill in the template details below</p>
              </div>
              <button onClick={closeModal}
                className="ml-auto w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all">
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* Modal body */}
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Template Name" req />
                  <input
                    className={fi("name")}
                    placeholder="e.g. Welcome Email, Invoice Sent"
                    defaultValue={nameRef.current}
                    onChange={e => { nameRef.current = e.target.value; if (errs.name) setErrs(p => { const n = { ...p }; delete n.name; return n; }); }}
                  />
                  <Err k="name" />
                </div>
                <div>
                  <Lbl text="Email Subject" req />
                  <input
                    className={fi("subject")}
                    placeholder="e.g. Welcome to our platform!"
                    defaultValue={subjectRef.current}
                    onChange={e => { subjectRef.current = e.target.value; if (errs.subject) setErrs(p => { const n = { ...p }; delete n.subject; return n; }); }}
                  />
                  <Err k="subject" />
                </div>
              </div>

              <div>
                <Lbl text="Company ID" />
                <input
                  className={fi("")}
                  placeholder="Leave blank for global template"
                  value={companyIdInput}
                  onChange={e => setCompanyIdInput(e.target.value)}
                />
                <p className="text-[11px] text-gray-400 mt-1">Optional — if blank, template applies globally across all companies</p>
              </div>

              <div>
                <Lbl text="Email Content" req />
                <div className={`rounded-xl border overflow-hidden transition-all ${errs.html ? "border-red-400 ring-2 ring-red-100" : "border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100"}`}>
                  <div className="min-h-[260px] p-2">
                    <TiptapEditor
                      content={html}
                      onChange={val => { setHtml(val); if (errs.html) setErrs(p => { const n = { ...p }; delete n.html; return n; }); }}
                    />
                  </div>
                </div>
                <Err k="html" />
              </div>

            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
              <button onClick={closeModal}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-300 transition-all">
                <FaTimes className="text-xs" /> Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
                {saving
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                  : <><FaCheck className="text-xs" /> {editMode === "create" ? "Create Template" : "Update Template"}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}