"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaArrowLeft,
  FaFileUpload, FaDownload, FaCheck, FaTimes, FaUniversity
} from "react-icons/fa";

export default function AccountHeadPage() {
  const [view, setView] = useState("list");
  const [accountHeads, setAccountHeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    accountHeadCode: "",
    accountHeadDescription: "",
    status: "Active",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    fetchAccountHeads();
  }, []);

  const fetchAccountHeads = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/account-head", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setAccountHeads(res.data.data);
      } else {
        toast.error(res.data.message || "Failed to fetch data");
      }
    } catch (error) {
      toast.error("Error fetching account heads");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const token = localStorage.getItem("token");

    try {
      if (editingId) {
        const res = await axios.put(`/api/account-head/${editingId}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Account head updated");
          setAccountHeads((prev) =>
            prev.map((item) => (item._id === editingId ? res.data.data : item))
          );
          resetForm();
        } else {
          toast.error(res.data.message);
        }
      } else {
        const res = await axios.post("/api/account-head", formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) {
          toast.success("Account head created");
          setAccountHeads([...accountHeads, res.data.data]);
          resetForm();
        } else {
          toast.error(res.data.message);
        }
      }
    } catch (error) {
      toast.error("Error saving account head");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this account head?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/account-head/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success("Deleted successfully");
        setAccountHeads(accountHeads.filter((item) => item._id !== id));
      } else {
        toast.error(res.data.message);
      }
    } catch (error) {
      toast.error("Error deleting account head");
    }
  };

  const handleEdit = (head) => {
    setFormData({
      accountHeadCode: head.accountHeadCode,
      accountHeadDescription: head.accountHeadDescription,
      status: head.status,
    });
    setEditingId(head._id);
    setView("form");
  };

  const resetForm = () => {
    setFormData({
      accountHeadCode: "",
      accountHeadDescription: "",
      status: "Active",
    });
    setEditingId(null);
    setView("list");
  };

  const handleBulk = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    // Placeholder for bulk upload logic if needed, similar to supplier
    // For now just simulate delay
    setTimeout(() => {
        toast.info("Bulk upload not implemented for Account Heads yet.");
        setUploading(false);
        e.target.value = "";
    }, 1000);
  };

  const downloadTemplate = () => {
    const h = ["accountHeadCode", "accountHeadDescription", "status"];
    const r = ["AH001", "General Expenses", "Active"];
    const blob = new Blob([[h, r].map(x => x.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "account_head_template.csv"; a.click();
  };

  const filtered = accountHeads.filter(h => {
    const q = searchTerm.toLowerCase();
    const mQ = [h.accountHeadCode, h.accountHeadDescription].some(v => v?.toLowerCase().includes(q));
    const mT = filterType === "All" || h.status === filterType;
    return mQ && mT;
  });

  const stats = {
    total: accountHeads.length,
    active: accountHeads.filter(h => h.status === "Active").length,
    inactive: accountHeads.filter(h => h.status === "Inactive").length,
  };

  const fi = (extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 ${extra}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        <ToastContainer />
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Account Heads</h1>
            <p className="text-sm text-gray-400 mt-0.5">{accountHeads.length} total records</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
              <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
              {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
              <input type="file" hidden accept=".csv" onChange={handleBulk} />
            </label>
            <button onClick={() => { resetForm(); setView("form"); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> Add Account Head
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total, emoji: "📊", filter: "All" },
            { label: "Active", value: stats.active, emoji: "✅", filter: "Active" },
            { label: "Inactive", value: stats.inactive, emoji: "❌", filter: "Inactive" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilterType(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Active", "Inactive"].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Code", "Description", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(4).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">📇</div>
                    <p className="text-sm font-medium text-gray-300">No records found</p>
                  </td></tr>
                ) : filtered.map(h => (
                  <tr key={h._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-600">{h.accountHeadCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{h.accountHeadDescription}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${h.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                        {h.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(h)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(h._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
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

  // Form View
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
        <ToastContainer />
        <button onClick={resetForm} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to List
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              <FaUniversity className="text-base" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{editingId ? "Edit Account Head" : "New Account Head"}</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Lbl text="Account Head Code" req />
              <input
                className={fi()}
                value={formData.accountHeadCode}
                onChange={e => setFormData({ ...formData, accountHeadCode: e.target.value })}
                placeholder="e.g. AH001"
                required
              />
            </div>
            <div>
              <Lbl text="Description" req />
              <input
                className={fi()}
                value={formData.accountHeadDescription}
                onChange={e => setFormData({ ...formData, accountHeadDescription: e.target.value })}
                placeholder="e.g. General Expenses"
                required
              />
            </div>
            <div>
              <Lbl text="Status" req />
              <select
                className={fi()}
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="pt-4 flex gap-3">
              <button type="button" onClick={resetForm}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200 disabled:opacity-60">
                {submitting ? "Saving…" : (editingId ? "Update" : "Create")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}





// "use client";
// import React, { useState } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const AccountHeadDetails = () => {
//   const [formData, setFormData] = useState({
//     accountHeadCode: "",
//     accountHeadDescription: "",
//     status: "",
//   });

//   const validateForm = () => {
//     if (!formData.accountHeadCode.trim()) {
//       toast.error("Account head code is required");
//       return false;
//     }
//     if (!formData.accountHeadDescription.trim()) {
//       toast.error("Account head description is required");
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
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validateForm()) return;
//     try {
//       const response = await fetch("/api/account-head", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
          
//         },
//         body: JSON.stringify(formData),
//       });
//       const result = await response.json();
//       if (response.ok) {
//         console.log("Submitted Account Head Details:", result.data);
//         toast.success("Account head details submitted successfully!");
//         // Optionally clear the form after successful submission:
//         setFormData({
//           accountHeadCode: "",
//           accountHeadDescription: "",
//           status: "",
//         });
//       } else {
//         toast.error(result.message || "Error submitting form");
//       }
//     } catch (error) {
//       console.error("Error submitting account head details:", error);
//       toast.error("Error submitting account head details");
//     }
//   };
  

//   const handleClear = () => {
//     setFormData({ accountHeadCode: "", accountHeadDescription: "", status: "" });
//     toast.info("Form cleared");
//   };

//   return (
//     <div className="max-w-xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-2xl font-semibold mb-4">Account Head Details</h2>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         {/* Account Head Code */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head Code
//           </label>
//           <input
//             type="text"
//             name="accountHeadCode"
//             value={formData.accountHeadCode}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account head code"
//           />
//         </div>
//         {/* Account Head Description */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Account Head Description
//           </label>
//           <input
//             type="text"
//             name="accountHeadDescription"
//             value={formData.accountHeadDescription}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded-md shadow-sm"
//             placeholder="Enter account head description"
//           />
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
//             className="w-full p-2 border rounded-md shadow-sm"
//           >
//             <option value="">Select status</option>
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

// export default AccountHeadDetails;
