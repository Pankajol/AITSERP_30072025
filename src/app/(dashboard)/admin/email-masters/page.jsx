"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";
import { toast } from "react-toastify";
import {
  FaPlus, FaEdit, FaTrash, FaSearch, FaCheck,
  FaArrowLeft, FaEnvelope, FaExclamationCircle,
  FaGoogle, FaMicrosoft, FaServer
} from "react-icons/fa";

// ── decode companyId from JWT ──
const getCompanyIdFromToken = () => {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return "";
    const b64    = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const obj    = JSON.parse(atob(padded));
    return obj.companyId || obj.cid || obj.company || "";
  } catch { return ""; }
};

const EMPTY = {
  companyId: "", email: "", purpose: "", service: "gmail",
  recoveryEmail: "", owner: "", appPassword: "",
  status: "Active", notes: "",
};

const SERVICE_ICON = {
  gmail:   <FaGoogle   className="text-red-400 text-xs"  />,
  outlook: <FaMicrosoft className="text-blue-400 text-xs" />,
  custom:  <FaServer   className="text-gray-400 text-xs" />,
};

export default function EmailMasterPage() {
  const [view,    setView]    = useState("list");
  const [emails,  setEmails]  = useState([]);
  const [search,  setSearch]  = useState("");
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [editId,  setEditId]  = useState(null);
  const [form,    setForm]    = useState({ ...EMPTY });
  const [errs,    setErrs]    = useState({});

  useEffect(() => { fetchEmails(); }, []);

  // listen for external refresh events (original code pattern)
  useEffect(() => {
    window.addEventListener("emails:refresh", fetchEmails);
    return () => window.removeEventListener("emails:refresh", fetchEmails);
  }, []);

  const fetchEmails = async () => {
    setLoading(true);
    try {
      const res = await api.get("/email-masters");
      setEmails(res.data?.data || res.data || []);
    } catch { toast.error("Failed to load email accounts"); }
    setLoading(false);
  };

  const validate = () => {
    const e = {};
    if (!form.email?.trim())          e.email  = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email format";
    if (!form.owner?.trim())          e.owner  = "Owner is required";
    setErrs(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return false; }
    return true;
  };

  const handleChange = (k) => (e) => {
    setForm(p => ({ ...p, [k]: e.target.value }));
    if (errs[k]) setErrs(p => { const n = { ...p }; delete n[k]; return n; });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { ...form, companyId: form.companyId || getCompanyIdFromToken() };
      if (editId) {
        await api.put("/email-masters", { ...payload, _id: editId });
        toast.success("Email account updated!");
      } else {
        await api.post("/email-masters", payload);
        toast.success("Email account created!");
      }
      window.dispatchEvent(new Event("emails:refresh"));
      reset();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || "Save failed");
    }
    setSaving(false);
  };

  const handleEdit = (item) => {
    setForm({
      companyId:     item.companyId     || "",
      email:         item.email         || "",
      purpose:       item.purpose       || "",
      service:       item.service       || "gmail",
      recoveryEmail: item.recoveryEmail || "",
      owner:         item.owner         || "",
      appPassword:   "",  // never pre-fill password
      status:        item.status        || "Active",
      notes:         item.notes         || "",
    });
    setEditId(item._id);
    setErrs({});
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this email account?")) return;
    try {
      await api.delete(`/email-masters/${id}`);
      toast.success("Deleted successfully");
      fetchEmails();
    } catch { toast.error("Delete failed"); }
  };

  const reset = () => {
    setForm({ ...EMPTY });
    setEditId(null); setErrs({}); setView("list");
    fetchEmails();
  };

  const openCreate = () => {
    setForm({ ...EMPTY, companyId: getCompanyIdFromToken() });
    setEditId(null); setErrs({}); setView("form");
  };

  const filtered = emails.filter(e =>
    e.email?.toLowerCase().includes(search.toLowerCase()) ||
    e.owner?.toLowerCase().includes(search.toLowerCase()) ||
    e.purpose?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total:    emails.length,
    active:   emails.filter(e => e.status === "Active").length,
    inactive: emails.filter(e => e.status === "Inactive").length,
    gmail:    emails.filter(e => e.service === "gmail").length,
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

  // ════════════════════════════════════════
  // ── LIST VIEW ──
  // ════════════════════════════════════════
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Email Accounts</h1>
            <p className="text-sm text-gray-400 mt-0.5">{emails.length} total accounts</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaPlus className="text-xs" /> Add Email Account
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",    value: stats.total,    emoji: "📧" },
            { label: "Active",   value: stats.active,   emoji: "✅" },
            { label: "Inactive", value: stats.inactive, emoji: "⛔" },
            { label: "Gmail",    value: stats.gmail,    emoji: "📮" },
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
                value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by email, owner, purpose…" />
            </div>
            <p className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["", "Email", "Owner", "Purpose", "Service", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">📧</div>
                    <p className="text-sm font-medium text-gray-300">
                      {search ? "No accounts match your search" : "No email accounts yet — add your first one!"}
                    </p>
                  </td></tr>
                ) : filtered.map(item => (
                  <tr key={item._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">

                    {/* Avatar */}
                    <td className="px-4 py-3 w-12">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm shadow-indigo-100">
                        <FaEnvelope className="text-xs" />
                      </div>
                    </td>

                    {/* Email */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{item.email}</p>
                      {item.recoveryEmail && <p className="text-[11px] text-gray-400 mt-0.5">↩ {item.recoveryEmail}</p>}
                    </td>

                    {/* Owner */}
                    <td className="px-4 py-3 text-xs text-gray-600 font-semibold">
                      {item.owner || <span className="text-gray-200">—</span>}
                    </td>

                    {/* Purpose */}
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[140px] truncate">
                      {item.purpose || <span className="text-gray-200">—</span>}
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3">
                      <span className={`flex items-center gap-1.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full w-fit
                        ${item.service === "gmail"   ? "bg-red-50 text-red-600"
                          : item.service === "outlook" ? "bg-blue-50 text-blue-600"
                          : "bg-gray-100 text-gray-500"}`}>
                        {SERVICE_ICON[item.service] || <FaServer className="text-[9px]" />}
                        {item.service || "—"}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${item.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(item)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(item._id)}
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
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Email Accounts
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
          {editId ? "Edit Email Account" : "New Email Account"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {editId ? "Update the email account details below" : "Fill in the details to add a new email account"}
        </p>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">

          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <FaEnvelope className="text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Account Details</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>

          <div className="space-y-5">

            {/* Email + Owner */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl text="Email Address" req />
                <input className={fi("email")} type="email" value={form.email} onChange={handleChange("email")} placeholder="e.g. info@company.com" />
                <Err k="email" />
              </div>
              <div>
                <Lbl text="Owner" req />
                <input className={fi("owner")} value={form.owner} onChange={handleChange("owner")} placeholder="e.g. Finance Team" />
                <Err k="owner" />
              </div>
            </div>

            {/* Service + Status */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl text="Service" />
                <select className={fi("")} value={form.service} onChange={handleChange("service")}>
                  <option value="gmail">Gmail</option>
                  <option value="outlook">Outlook</option>
                  <option value="custom">Custom SMTP</option>
                </select>
              </div>
              <div>
                <Lbl text="Status" />
                <select className={fi("")} value={form.status} onChange={handleChange("status")}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Recovery Email + Purpose */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl text="Recovery Email" />
                <input className={fi("")} type="email" value={form.recoveryEmail} onChange={handleChange("recoveryEmail")} placeholder="e.g. backup@company.com" />
              </div>
              <div>
                <Lbl text="Purpose" />
                <input className={fi("")} value={form.purpose} onChange={handleChange("purpose")} placeholder="e.g. Invoice emails, Support" />
              </div>
            </div>

            {/* App Password */}
            <div>
              <Lbl text={editId ? "App Password (leave blank to keep existing)" : "App Password"} />
              <input
                className={`${fi("")} font-mono tracking-widest`}
                type="password"
                value={form.appPassword}
                onChange={handleChange("appPassword")}
                placeholder={editId ? "Enter only to change…" : "App-specific password"}
                autoComplete="new-password"
              />
              <p className="text-[11px] text-gray-400 mt-1">
                {form.service === "gmail"
                  ? "Gmail → Google Account → Security → 2-Step Verification → App passwords"
                  : form.service === "outlook"
                  ? "Outlook → Account Settings → Security → App passwords"
                  : "Enter your SMTP password or app-specific password"}
              </p>
            </div>

            {/* Notes */}
            <div>
              <Lbl text="Notes" />
              <textarea className={`${fi("")} resize-none`} rows={3} value={form.notes} onChange={handleChange("notes")} placeholder="Any additional notes about this account…" />
            </div>

          </div>
        </div>

        {/* Footer navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <FaArrowLeft className="text-xs" /> Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
            {saving
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><FaCheck className="text-xs" /> {editId ? "Update Account" : "Add Account"}</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}



// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
// import api from "@/lib/api"; // your axios instance
// import { toast } from "react-toastify";
// import EmailForm from "@/components/email-master/EmailForm";
// import EmailList from "@/components/email-master/EmailList";

// /**
//  * Page wrapper — uses EmailList component below.
//  * (Kept simple: EmailList handles fetching; page shows header + Add button)
//  */
// export default function EmailMasterPage() {
//   const [showAddModal, setShowAddModal] = useState(false);
//   const [editItem, setEditItem] = useState(null);

//   const openAdd = () => {
//     setEditItem(null);
//     setShowAddModal(true);
//   };
//   const openEdit = (item) => {
//     setEditItem(item);
//     setShowAddModal(true);
//   };
//   const closeModal = () => {
//     setEditItem(null);
//     setShowAddModal(false);
//   };

//   return (
//     <div className="p-8 font-sans bg-gray-50 min-h-screen">
//       <div className="flex items-center justify-between mb-6">
//         <h1 className="text-3xl font-bold text-gray-800">Email & App Password Master</h1>
//         <div className="flex gap-3 items-center">
//           <button onClick={openAdd} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
//             <Plus size={16} /> Add Email
//           </button>
//         </div>
//       </div>

//       <EmailList onEdit={openEdit} />

//       {/* Modal: uses EmailForm for create/update */}
//       {showAddModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
//           <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-semibold">{editItem ? "Edit Email" : "Add Email"}</h2>
//               <button onClick={closeModal} className="text-gray-600">✕</button>
//             </div>

//             <EmailForm
//               initial={editItem || {}}
//               onSaved={() => {
//                 // notify list to refresh via custom event
//                 window.dispatchEvent(new Event("emails:refresh"));
//                 toast.success("Saved");
//                 closeModal();
//               }}
//               onCancel={closeModal}
//             />
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
