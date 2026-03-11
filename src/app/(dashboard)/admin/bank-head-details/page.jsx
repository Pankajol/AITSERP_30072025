"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaCheck,
  FaExclamationCircle, FaArrowLeft, FaUniversity
} from "react-icons/fa";
import { toast } from "react-toastify";

const EMPTY = { accountCode: "", accountName: "", isActualBank: false, accountHead: "", status: "" };

export default function BankHeadPage() {
  const [view,         setView]         = useState("list");
  const [bankHeads,    setBankHeads]    = useState([]);
  const [accountHeads, setAccountHeads] = useState([]);
  const [searchTerm,   setSearchTerm]   = useState("");
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [editId,       setEditId]       = useState(null);
  const [fd,           setFd]           = useState({ ...EMPTY }); // fd = formData
  const [errs,         setErrs]         = useState({});

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const [bankRes, headRes] = await Promise.all([
        axios.get("/api/bank-head",    { headers: { Authorization: `Bearer ${token}` } }),
        axios.get("/api/account-head", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setBankHeads(bankRes.data.data    || []);
      setAccountHeads(headRes.data.data || []);
    } catch { toast.error("Error fetching data"); }
    setLoading(false);
  };

  const validate = () => {
    const e = {};
    if (!fd.accountCode?.trim()) e.accountCode = "Account Code is required";
    if (!fd.accountName?.trim()) e.accountName = "Account Name is required";
    if (!fd.accountHead)         e.accountHead = "Account Head is required";
    if (!fd.status)              e.status      = "Status is required";
    setErrs(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); return false; }
    return true;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFd(p => ({ ...p, [name]: type === "checkbox" ? checked : value }));
    if (errs[name]) setErrs(p => { const n = { ...p }; delete n[name]; return n; });
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    const token = localStorage.getItem("token");
    try {
      if (editId) {
        const res = await axios.put(`/api/bank-head/${editId}`, fd, { headers: { Authorization: `Bearer ${token}` } });
        setBankHeads(p => p.map(b => b._id === editId ? res.data.data : b));
        toast.success("Bank Head updated!");
      } else {
        const res = await axios.post("/api/bank-head", fd, { headers: { Authorization: `Bearer ${token}` } });
        setBankHeads(p => [...p, res.data.data]);
        toast.success("Bank Head created!");
      }
      reset();
    } catch { toast.error("Error saving data"); }
    setSaving(false);
  };

  const handleEdit = (item) => {
    setFd({ ...item });
    setEditId(item._id);
    setErrs({});
    setView("form");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this bank head?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/bank-head/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setBankHeads(p => p.filter(b => b._id !== id));
      toast.success("Deleted successfully");
    } catch { toast.error("Error deleting"); }
  };

  const reset = () => { setFd({ ...EMPTY }); setEditId(null); setErrs({}); setView("list"); };

  const filtered = bankHeads.filter(b =>
    b.accountCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accountName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.accountHead?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total:    bankHeads.length,
    actual:   bankHeads.filter(b => b.isActualBank).length,
    active:   bankHeads.filter(b => b.status === "Active").length,
    inactive: bankHeads.filter(b => b.status === "Inactive").length,
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
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Bank Heads</h1>
            <p className="text-sm text-gray-400 mt-0.5">{bankHeads.length} total bank heads</p>
          </div>
          <button
            onClick={() => { reset(); setView("form"); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaPlus className="text-xs" /> Add Bank Head
          </button>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",        value: stats.total,    emoji: "🏦" },
            { label: "Actual Banks", value: stats.actual,   emoji: "🏛️" },
            { label: "Active",       value: stats.active,   emoji: "✅" },
            { label: "Inactive",     value: stats.inactive, emoji: "⛔" },
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
                placeholder="Search by code, name or head…"
              />
            </div>
            <p className="ml-auto text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["", "Code", "Account Name", "Account Head", "Actual Bank", "Status", "Actions"].map(h => (
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
                    <div className="text-4xl mb-2 opacity-20">🏦</div>
                    <p className="text-sm font-medium text-gray-300">
                      {searchTerm ? "No bank heads match your search" : "No bank heads yet — add your first one!"}
                    </p>
                  </td></tr>
                ) : filtered.map(b => (
                  <tr key={b._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">

                    {/* Avatar */}
                    <td className="px-4 py-3 w-12">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-sm shadow-sm shadow-indigo-100">
                        {(b.accountName || "?")[0].toUpperCase()}
                      </div>
                    </td>

                    {/* Code */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {b.accountCode}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{b.accountName}</p>
                    </td>

                    {/* Account Head */}
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium">
                      {b.accountHead || <span className="text-gray-200">—</span>}
                    </td>

                    {/* Actual Bank */}
                    <td className="px-4 py-3">
                      {b.isActualBank
                        ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">✓ Yes</span>
                        : <span className="text-gray-300 text-xs">No</span>}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${b.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                        {b.status || "—"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(b)}
                          className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(b._id)}
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
          <FaArrowLeft className="text-xs" /> Back to Bank Heads
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
          {editId ? "Edit Bank Head" : "New Bank Head"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          {editId ? "Update the bank head details below" : "Fill in the details to add a new bank head"}
        </p>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">

          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <FaUniversity className="text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Bank Head Details</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>

          <div className="space-y-5">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Lbl text="Account Code" req />
                <input className={fi("accountCode")} name="accountCode" type="text"
                  value={fd.accountCode} onChange={handleChange} placeholder="e.g. BNK001" />
                <Err k="accountCode" />
              </div>
              <div>
                <Lbl text="Account Name" req />
                <input className={fi("accountName")} name="accountName" type="text"
                  value={fd.accountName} onChange={handleChange} placeholder="e.g. HDFC Current Account" />
                <Err k="accountName" />
              </div>
            </div>

            <div>
              <Lbl text="Account Head" req />
              <select className={fi("accountHead")} name="accountHead" value={fd.accountHead} onChange={handleChange}>
                <option value="">Select Account Head…</option>
                {accountHeads.map(h => (
                  <option key={h._id} value={h.accountHeadCode}>
                    {h.accountHeadCode} — {h.accountHeadDescription}
                  </option>
                ))}
              </select>
              <Err k="accountHead" />
            </div>

            <div>
              <Lbl text="Status" req />
              <select className={fi("status")} name="status" value={fd.status} onChange={handleChange}>
                <option value="">Select Status…</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
              <Err k="status" />
            </div>

            {/* Is Actual Bank toggle */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setFd(p => ({ ...p, isActualBank: !p.isActualBank }))}
                className={`relative w-9 h-5 rounded-full transition-all shrink-0 ${fd.isActualBank ? "bg-indigo-500" : "bg-gray-200"}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${fd.isActualBank ? "translate-x-4" : "translate-x-0"}`} />
              </button>
              <div>
                <p className="text-sm font-semibold text-gray-700">Is Actual Bank?</p>
                <p className="text-xs text-gray-400">Enable if this is a real bank account (not a ledger head)</p>
              </div>
            </div>

          </div>
        </div>

        {/* Footer navigation */}
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
              : <><FaCheck className="text-xs" /> {editId ? "Update Bank Head" : "Create Bank Head"}</>}
          </button>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}


// "use client";
// import React, { useState, useEffect } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const BankHeadDetails = () => {
//   const [accountHeads, setAccountHeads] = useState([]);
//   const [formData, setFormData] = useState({
//     accountCode: "",
//     accountName: "",
//     accountHead: "", // Use "accountHead" consistently
//     status: "",
//   });

//   useEffect(() => {
//     // Fetch account heads from the API
//     const fetchAccountHeads = async () => {
//       try {
//         const response = await fetch("/api/account-head"); // Adjust the API endpoint as needed
//         if (!response.ok) {
//           throw new Error("Failed to fetch account heads");
//         }
//         const data = await response.json();
//         console.log("Fetched account heads:", data);
//         setAccountHeads(data.data);
//       } catch (error) {
//         console.error("Error fetching account heads:", error);
//       }
//     };

//     fetchAccountHeads();
//   }, []);

//   const validateForm = () => {
//     if (!formData.accountCode.trim()) {
//       toast.error("Account Code is required");
//       return false;
//     }
//     if (!formData.accountName.trim()) {
//       toast.error("Account Name is required");
//       return false;
//     }
//     if (!formData.accountHead) {
//       toast.error("Please select an Account Head From");
//       return false;
//     }
//     if (!formData.status) {
//       toast.error("Please select a status");
//       return false;
//     }
//     return true;
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/bank-head", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok && result.success) {
//         toast.success("Bank head details submitted successfully!");
//         setFormData({
//           accountCode: "",
//           accountName: "",
//           accountHead: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting bank head details");
//       }
//     } catch (error) {
//       console.error("Error submitting bank head details:", error);
//       toast.error("Error submitting bank head details");
//     }
//   };

//   const handleClear = () => {
//     setFormData({
//       accountCode: "",
//       accountName: "",
//       accountHead: "",
//       status: "",
//     });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Code</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Code
//           </label>
//           <input
//             type="text"
//             name="accountCode"
//             value={formData.accountCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account code"
//           />
//         </div>
//         {/* Account Name */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Name
//           </label>
//           <input
//             type="text"
//             name="accountName"
//             value={formData.accountName}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account name"
//           />
//         </div>
//         {/* Account Head From (Selectable) */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head From
//           </label>
//           <select
//             name="accountHead"  // Changed from accountHeadFrom to accountHead
//             value={formData.accountHead}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Account Head From</option>
//             {accountHeads.map((option, index) => (
//               <option key={option.accountHeadCode || index} value={option.accountHeadCode}>
//                 {option.accountHeadCode} - {option.accountHeadDescription}
//               </option>
//             ))}
//           </select>
//         </div>
//         {/* Status */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Status
//           </label>
//           <select
//             name="status"
//             value={formData.status}
//             onChange={handleInputChange}
//             className="mt-1 block w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select Status</option>
//             <option value="Active">Active</option>
//             <option value="Inactive">Inactive</option>
//           </select>
//         </div>
//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <button
//             type="submit"
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//           >
//             Submit
//           </button>
//           <button
//             type="button"
//             onClick={handleClear}
//             className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//           >
//             Clear
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// };

// export default BankHeadDetails;
