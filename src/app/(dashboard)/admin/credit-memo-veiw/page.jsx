"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import {
  FaEdit, FaTrash, FaCopy, FaEye,
  FaEnvelope, FaSearch, FaPlus,
  FaCloudUploadAlt, FaDownload
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function CreditMemoList() {
  const [memos, setMemos]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [uploading, setUploading]   = useState(false);
  const router = useRouter();

  const fetchMemos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/credit-note", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setMemos(res.data.data);
      }
    } catch (error) {
      toast.error("Error fetching credit memos");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMemos(); }, []);

  const filtered = useMemo(() => {
    return memos.filter((o) => {
      const matchSearch = !search.trim() ||
        (o.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.documentNumberCreditNote || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [memos, search, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this credit memo?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/credit-note/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMemos((prev) => prev.filter((o) => o._id !== id));
      toast.success("Credit memo deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/api/credit-note/template";
    link.download = "credit_memo_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",");
      const jsonData = lines.slice(1).map((line) => {
        const values = line.split(",");
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || ""; });
        return obj;
      });
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/credit-note/bulk", { memos: jsonData }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success(`Upload complete: ${res.data.successCount} success`);
        fetchMemos();
      }
    } catch {
      toast.error("Invalid CSV file");
    } finally {
      setUploading(false);
    }
  };

  const stats = {
    total:     memos.length,
    approved:  memos.filter(o => o.status === "Approved" || o.status === "Closed").length,
    pending:   memos.filter(o => o.status === "Pending" || o.status === "Open").length,
    cancelled: memos.filter(o => o.status === "Cancelled").length,
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Approved:  "bg-emerald-50 text-emerald-600",
      Closed:    "bg-emerald-50 text-emerald-600",
      Pending:   "bg-amber-50 text-amber-600",
      Open:      "bg-blue-50 text-blue-600",
      Draft:     "bg-gray-100 text-gray-500",
      Cancelled: "bg-red-50 text-red-500",
      Rejected:  "bg-red-50 text-red-500",
    };
    return (
      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
        {status || "—"}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Credit Memos</h1>
            <p className="text-sm text-gray-400 mt-0.5">{memos.length} total credit memos</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
              <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
              <FaCloudUploadAlt className="text-xs" /> {uploading ? "Uploading..." : "Bulk Upload"}
              <input type="file" hidden accept=".csv" onChange={handleBulkUpload} />
            </label>
            <Link href="/admin/credit-memo-veiw/new">
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
                <FaPlus className="text-xs" /> Create Credit Memo
              </button>
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",     value: stats.total,     emoji: "📋", filter: "All" },
            { label: "Approved",  value: stats.approved,  emoji: "✅", filter: "Approved" },
            { label: "Pending",   value: stats.pending,   emoji: "⏳", filter: "Pending" },
            { label: "Cancelled", value: stats.cancelled, emoji: "❌", filter: "Cancelled" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterStatus === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
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
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search credit memos..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "Pending", "Approved", "Cancelled"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Doc Number", "Customer", "Memo Date", "Ref Invoice", "Status", "Amount", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(8).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-16 text-gray-300">
                    <div className="text-4xl mb-2 opacity-30">📋</div>
                    <p className="text-sm font-medium">No credit memos found</p>
                  </td></tr>
                ) : filtered.map((o, idx) => (
                  <tr key={o._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {o.documentNumberCreditNote || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{o.customerName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {o.postingDate ? new Date(o.postingDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {o.refInvoice ? (
                        <span className="font-mono text-[11px] font-semibold text-gray-500 bg-gray-50 px-2 py-0.5 rounded">{o.refInvoice}</span>
                      ) : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-800">₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <CreditMemoRowMenu memo={o} onDelete={handleDelete} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-4 border-b border-gray-100">
                  <div className="h-4 w-32 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.4s_infinite] mb-2" />
                  <div className="h-3 w-24 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-[shimmer_1.4s_infinite]" />
                </div>
              ))
            ) : filtered.map((o, idx) => (
              <div key={o._id} className="p-4 hover:bg-indigo-50/20 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{o.documentNumberCreditNote || `#${idx + 1}`}</span>
                    <p className="font-bold text-gray-900 text-sm mt-1.5">{o.customerName}</p>
                  </div>
                  <CreditMemoRowMenu memo={o} onDelete={handleDelete} />
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-xs text-gray-400">{o.postingDate ? new Date(o.postingDate).toLocaleDateString("en-GB") : "—"}</span>
                  <StatusBadge status={o.status} />
                  <span className="font-mono font-bold text-gray-800 text-xs ml-auto">₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}</span>
                </div>
                {o.refInvoice && (
                  <p className="text-xs text-gray-400 mt-1">Ref: {o.refInvoice}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function CreditMemoRowMenu({ memo, onDelete }) {
  const router = useRouter();

  const actions = [
    { icon: <FaEye />,    label: "View", onClick: () => router.push(`/admin/credit-memo-veiw/view/${memo._id}`) },
    { icon: <FaEdit />,   label: "Edit", onClick: () => router.push(`/admin/credit-memo-veiw/new?editId=${memo._id}`) },
    { icon: <FaEnvelope />, label: "Email", onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "credit-memo", id: memo._id });
          if (res.data.success) toast.success("Email sent!");
        } catch { toast.error("Email error"); }
      }
    },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(memo._id) },
  ];

  return <ActionMenu actions={actions} />;
}

// 'use client';

// import { useState, useEffect, useMemo, useRef } from 'react';
// import Link from 'next/link';
// import axios from 'axios';
// import { useRouter } from 'next/navigation';
// import {
//   FaEdit,
//   FaTrash,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
//   FaEllipsisV,
// } from 'react-icons/fa';
// import ActionMenu from '@/components/ActionMenu';

// /* ============================================================= */
// /*  Credit Note List                                             */
// /* ============================================================= */
// export default function CreditNoteList() {
//   const [notes, setNotes] = useState([]);
//   const [search, setSearch] = useState('');
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   /* -------- fetch data -------- */
//   const fetchNotes = async () => {
//     setLoading(true);
//     try {
      
//       // const res = await axios.get('/api/credit-note');
//       const token = localStorage.getItem("token");
// if (!token) {
//   console.error("Unauthorized: No token found");
//   return;
// }

// const res = await axios.get("/api/credit-note", {
//   headers: { Authorization: `Bearer ${token}` },
// });

//       if (res.data?.success && Array.isArray(res.data.data)) {
//         setNotes(res.data.data);
//       } else {
//         setNotes([]);
//       }
//     } catch (err) {
//       console.error('Error fetching credit notes:', err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchNotes();
//   }, []);

//   /* -------- filter -------- */
//   const displayNotes = useMemo(() => {
//     if (!search.trim()) return notes;
//     const q = search.toLowerCase();
//     return notes.filter((n) =>
//       (n.customerName || '').toLowerCase().includes(q)
//     );
//   }, [notes, search]);

//   /* -------- actions -------- */
//   const handleDelete = async (id) => {
//     if (!confirm('Delete this credit note?')) return;
//     try {
//       await axios.delete(`/api/credit-note/${id}`);
//       setNotes((prev) => prev.filter((n) => n._id !== id));
//     } catch {
//       alert('Failed to delete');
//     }
//   };

//   /* ============================================================= */
//   /*  UI                                                           */
//   /* ============================================================= */
//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
//         Credit Notes
//       </h1>

//       {/* toolbar */}
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
//         <div className="relative max-w-sm flex-1">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search customer…"
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <Link href="/admin/credit-memo-veiw/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit className="mr-2" />
//             New Credit Note
//           </button>
//         </Link>
//       </div>

//       {loading ? (
//         <p className="text-center text-gray-500">Loading…</p>
//       ) : (
//         <>
//           {/* desktop table */}
//           <div className="hidden md:block overflow-x-auto">
//             <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
//               <thead className="bg-gray-100">
//                 <tr>
//                   {[
//                     '#',
//                     'Documents No.',
//                     'Customer',
//                     'Contact',
//                     'Reference',
//                     'Actions',
//                   ].map((h) => (
//                     <th
//                       key={h}
//                       className="px-4 py-3 text-left text-sm font-semibold text-gray-700"
//                     >
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {displayNotes.map((n, i) => (
//                   <tr
//                     key={n._id}
//                     className="border-b hover:bg-gray-50"
//                   >
//                     <td className="px-4 py-3">{i + 1}</td>
//                     <td className="px-4 py-3">{n.documentNumberCreditNoteCreditNote}</td>
//                     <td className="px-4 py-3">{n.customerName}</td>
//                     <td className="px-4 py-3">{n.contactPerson}</td>
//                     <td className="px-4 py-3">{n.refNumber}</td>
//                     <td className="px-4 py-3">
//                       <RowMenu note={n} onDelete={handleDelete} />
//                     </td>
//                   </tr>
//                 ))}
//                 {!displayNotes.length && (
//                   <tr>
//                     <td
//                       colSpan={5}
//                       className="text-center py-5 text-gray-500"
//                     >
//                       No credit notes found.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* mobile cards */}
//           <div className="md:hidden space-y-4">
//             {displayNotes.map((n, i) => (
//               <div
//                 key={n._id}
//                 className="bg-white p-4 rounded-lg shadow border"
//               >
//                 <div className="flex justify-between">
//                   <div className="font-semibold">
//                     #{i + 1} • {n.documentNumberCreditNoteCreditNote}
//                   </div>
//                   <RowMenu note={n} onDelete={handleDelete} isMobile />
//                 </div>
//                 <p className="text-sm text-gray-600 mt-1">
//                   Customer: {n.customerName}
//                 </p>
//                 <p className="text-sm text-gray-600">
//                   Contact: {n.contactPerson}
//                 </p>
//               </div>
//             ))}
//             {!displayNotes.length && (
//               <p className="text-center text-gray-500">
//                 No credit notes found.
//               </p>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* ============================================================= */
// /*  Row Action Menu                                              */
// /* ============================================================= */
// function RowMenu({ note, onDelete }) {
//   const [open, setOpen] = useState(false);

//   const actions = [
//     {
//       icon: <FaEye />,
//       label: 'View',
//       onClick: () =>
//         (window.location.href = `/admin/credit-memo-veiw/${note._id}`),
//     },
//     {
//       icon: <FaEdit />,
//       label: 'Edit',
//       onClick: () =>
//         (window.location.href = `/admin/credit-memo-veiw/new?editId=${note._id}`),
//     },
//     {
//       icon: <FaEnvelope />,
//       label: 'Email',
//       onClick: () =>
//         (window.location.href = `/admin/credit-note/${note._id}/send-email`),
//     },
//     {
//       icon: <FaWhatsapp />,
//       label: 'WhatsApp',
//       onClick: () =>
//         (window.location.href = `/admin/credit-note/${note._id}/send-whatsapp`),
//     },
//     {
//       icon: <FaTrash />,
//       label: 'Delete',
//       onClick: () => onDelete(note._id),
//       color: 'text-red-600',
//     },
//   ];

//   return (
//     <ActionMenu  actions={actions}  />
//   );
// }



// "use client";
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

// export default function CreditNoteView() {
//   const [notes, setNotes] = useState([]);
//   const router = useRouter();

//   const fetchCreditNotes = async () => {
//     try {
//       const res = await axios.get("/api/credit-note");
//       // Assuming your API returns { success: true, creditNotes: [...] }
//       if (res.data.success) {
//         setNotes(Array.isArray(res.data.creditNotes) ? res.data.creditNotes : []);
//       } else {
//         setNotes([]);
//       }
//     } catch (error) {
//       console.error("Error fetching Credit Notes:", error);
//     }
//   };

//   useEffect(() => {
//     fetchCreditNotes();
//   }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this Credit Note?")) return;
//     try {
//       const res = await axios.delete(`/api/credit-note/${creditMemoId}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchCreditNotes();
//       }
//     } catch (error) {
//       console.error("Error deleting Credit Note:", error);
//       alert("Failed to delete Credit Note");
//     }
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">Credit Note List</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/credit-memo">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Credit Note
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Customer Code</th>
//               <th className="py-3 px-4 border-b">Customer Name</th>
//               <th className="py-3 px-4 border-b">Contact Person</th>
//               <th className="py-3 px-4 border-b">Reference Number</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {notes.map((note) => (
//               <tr key={note._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{note.customerCode}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.customerName}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.contactPerson}</td>
//                 <td className="py-3 px-4 border-b text-center">{note.refNumber}</td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     <Link href={`/admin/credit-memo-veiw/${note._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     <Link href={`/admin/credit-memo-veiw/${note._id}/edit`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
//                         title="Edit"
//                       >
//                         <FaEdit />
//                       </button>
//                     </Link>
//                     <button
//                       onClick={() => handleDelete(note._id)}
//                       className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
//                       title="Delete"
//                     >
//                       <FaTrash />
//                     </button>
//                     <Link href={`/admin/credit-note/${note._id}/send-email`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
//                         title="Send Email"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     <Link href={`/admin/credit-note/${note._id}/send-whatsapp`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
//                         title="Send WhatsApp"
//                       >
//                         <FaWhatsapp />
//                       </button>
//                     </Link>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//             {notes.length === 0 && (
//               <tr>
//                 <td colSpan="5" className="text-center py-4">
//                   No Credit Notes found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }


