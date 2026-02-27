"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEdit, FaTrash, FaCopy, FaEye,
  FaEnvelope, FaWhatsapp, FaSearch, FaPlus,
  FaFileAlt, FaCheckCircle, FaClock, FaTimesCircle,
} from "react-icons/fa";
import { toast } from "react-toastify";
import ActionMenu from "@/components/ActionMenu";

export default function SalesQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [search,     setSearch]     = useState("");
  const [loading,    setLoading]    = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/sales-quotation", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setQuotations(res.data.data);
    } catch (error) {
      toast.error("Failed to fetch quotations");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuotations(); }, []);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch = !search.trim() ||
        (q.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.documentNumberQuatation || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || q.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [quotations, search, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/sales-quotation/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotations((prev) => prev.filter((q) => q._id !== id));
      toast.success("Quotation deleted");
    } catch {
      toast.error("Failed to delete quotation");
    }
  };

  const handleCopyTo = (quotation, dest) => {
    if (dest === "Order") {
      const data = { ...quotation, sourceId: quotation._id, sourceModel: "Quotation" };
      sessionStorage.setItem("salesOrderData", JSON.stringify(data));
      router.push("/admin/sales-order-view/new");
    }
  };

  // ── Stat counts ──
  const stats = {
    total:    quotations.length,
    approved: quotations.filter(q => q.status === "Approved").length,
    pending:  quotations.filter(q => q.status === "Pending" || q.status === "Draft").length,
    rejected: quotations.filter(q => q.status === "Rejected" || q.status === "Cancelled").length,
  };

  // ── Status badge helper ──
  const StatusBadge = ({ status }) => {
    const map = {
      Approved:  "bg-emerald-50 text-emerald-600",
      Accepted:  "bg-emerald-50 text-emerald-600",
      Pending:   "bg-amber-50 text-amber-600",
      Draft:     "bg-gray-100 text-gray-500",
      Rejected:  "bg-red-50 text-red-500",
      Cancelled: "bg-red-50 text-red-500",
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

        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Sales Quotations</h1>
            <p className="text-sm text-gray-400 mt-0.5">{quotations.length} total quotations</p>
          </div>
          <Link href="/admin/sales-quotation-view/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> Create Quotation
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",    value: stats.total,    emoji: "📋", filter: "All" },
            { label: "Approved", value: stats.approved, emoji: "✅", filter: "Approved" },
            { label: "Pending",  value: stats.pending,  emoji: "⏳", filter: "Pending" },
            { label: "Rejected", value: stats.rejected, emoji: "❌", filter: "Rejected" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterStatus === s.filter
                  ? "border-indigo-400 shadow-md shadow-indigo-100"
                  : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
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
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by customer or doc no…" />
            </div>

            {/* Status filter pills */}
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Approved", "Pending", "Draft", "Rejected"].map(s => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {s}
                </button>
              ))}
            </div>

            <p className="text-xs text-gray-400 font-semibold whitespace-nowrap">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</p>
          </div>

          {/* ── Desktop Table ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Doc Number", "Customer", "Date", "Status", "Total", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
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
                    <div className="text-4xl mb-2 opacity-20">📋</div>
                    <p className="text-sm font-medium text-gray-300">No quotations found</p>
                  </td></tr>
                ) : filtered.map((q, idx) => (
                  <tr key={q._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">

                    {/* # */}
                    <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>

                    {/* Doc Number */}
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {q.documentNumberQuatation || "—"}
                      </span>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{q.customerName || "—"}</p>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 text-xs text-gray-500 font-medium whitespace-nowrap">
                      {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={q.status} /></td>

                    {/* Total */}
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Mobile Cards ── */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-2 opacity-20">📋</div>
                <p className="text-sm text-gray-300 font-medium">No quotations found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {filtered.map((q, idx) => (
                  <div key={q._id} className="p-4 hover:bg-indigo-50/20 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {q.documentNumberQuatation || `#${idx + 1}`}
                        </span>
                        <p className="font-bold text-gray-900 text-sm mt-1.5">{q.customerName || "—"}</p>
                      </div>
                      <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-xs text-gray-400 font-medium">
                        {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </span>
                      <StatusBadge status={q.status} />
                      <span className="font-mono font-bold text-gray-800 text-xs ml-auto">₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

// ── RowMenu — unchanged logic, same ActionMenu component ──
function RowMenu({ quotation, onDelete, onCopy }) {
  const router = useRouter();

  const actions = [
    {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/admin/sales-quotation-view/view/${quotation._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () => router.push(`/admin/sales-quotation-view/new?editId=${quotation._id}`),
    },
    {
      icon: <FaCopy />,
      label: "Copy → Order",
      onClick: () => onCopy(quotation, "Order"),
    },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "quotation", id: quotation._id });
          if (res.data.success) toast.success("Email sent!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    {
      icon: <FaWhatsapp />,
      label: "WhatsApp",
      onClick: () => router.push(`/admin/sales-quotation-whatsapp/${quotation._id}`),
    },
    {
      icon: <FaTrash />,
      label: "Delete",
      color: "text-red-600",
      onClick: () => onDelete(quotation._id),
    },
  ];

  return <ActionMenu actions={actions} />;
}


// "use client";

// import { useState, useEffect, useMemo, useRef } from "react";
// import { createPortal } from "react-dom";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import {
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
//   FaEllipsisV,
// } from "react-icons/fa";
// import { toast } from "react-toastify";
// import ActionMenu from "@/components/ActionMenu";

// export default function SalesQuotationList() {
//   const [quotations, setQuotations] = useState([]);
//   const [search, setSearch] = useState("");
//   const [loading, setLoading] = useState(true);
//   const router = useRouter();

//   // ✅ Fetch Quotations with Authentication
//   const fetchQuotations = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         console.error("No token found. Redirect to login.");
//         return;
//       }

//       const res = await axios.get("/api/sales-quotation", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (res.data.success) {
//         setQuotations(res.data.data);
//       } else {
//         console.error("Failed to fetch quotations:", res.data.message);
//       }
//     } catch (error) {
//       console.error("Error fetching quotations:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchQuotations();
//   }, []);

//   // ✅ Filtered list
//   const filtered = useMemo(() => {
//     if (!search.trim()) return quotations;
//     return quotations.filter((q) =>
//       (q.customerName || "").toLowerCase().includes(search.toLowerCase())
//     );
//   }, [quotations, search]);

//   // ✅ Delete Quotation without Reload
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this quotation?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/sales-quotation/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setQuotations((prev) => prev.filter((q) => q._id !== id)); // ✅ Remove from state
//     } catch {
//       alert("Failed to delete quotation");
//     }
//   };

//   // ✅ Copy to Order (no reload)
//   const handleCopyTo = (quotation, dest) => {
//     if (dest === "Order") {
//       const {  ...rest } = quotation;
//       const data = {
//         ...quotation,
//         sourceId: quotation._id,
//         sourceModel: "Quotation",
       
//       };
//       sessionStorage.setItem("salesOrderData", JSON.stringify(data));
//       router.push("/admin/sales-order-view/new");
//     }
//   };

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
//         Sales Quotations
//       </h1>

//       {/* Toolbar */}
//       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
//         <div className="flex-1 relative max-w-sm">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             type="text"
//             placeholder="Filter by customer name…"
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <Link href="/admin/sales-quotation-view/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit className="mr-2" />
//             Create New Quotation
//           </button>
//         </Link>
//       </div>

//       {loading ? (
//         <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
//       ) : (
//         <>
//           {/* Desktop Table */}
//           <div className="hidden md:block overflow-x-auto">
//             <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
//               <thead className="bg-gray-100 dark:bg-gray-700">
//                 <tr>
//                   {["#", "Document Number", "Customer", "Date", "Status", "Total", "Actions"].map((h) => (
//                     <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {filtered.map((q, idx) => (
//                   <tr key={q._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
//                     <td className="px-4 py-3">{idx + 1}</td>
//                     <td className="px-4 py-3">{q.documentNumberQuatation}</td>
//                     <td className="px-4 py-3">{q.customerName}</td>
//                     <td className="px-4 py-3">{q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}</td>
//                     <td className="px-4 py-3">{q.status}</td>
//                     <td className="px-4 py-3">₹ {q.grandTotal}</td>
//                     <td className="px-4 py-3">
//                       <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
//                     </td>
//                   </tr>
//                 ))}
//                 {!filtered.length && (
//                   <tr>
//                     <td colSpan={7} className="text-center py-5 text-gray-500 dark:text-gray-400">
//                       No matching quotations.
//                     </td>
//                   </tr>
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Mobile Cards */}
//           <div className="md:hidden space-y-4">
//             {filtered.map((q, idx) => (
//               <div key={q._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
//                 <div className="flex justify-between items-start mb-2">
//                   <div className="font-semibold text-gray-700 dark:text-gray-100">
//                     #{idx + 1} • {q.documentNumberQuatation}
//                   </div>
//                   <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
//                 </div>
//                 <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Customer:</strong> {q.customerName}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Date:</strong> {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Status:</strong> {q.status}</div>
//                 <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Total:</strong> ₹ {q.grandTotal}</div>
//               </div>
//             ))}
//             {!filtered.length && <div className="text-center text-gray-500 dark:text-gray-400">No matching quotations.</div>}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// // ✅ RowMenu without Page Reload
// function RowMenu({ quotation, onDelete, onCopy }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);
//   const menuRef = useRef(null);
//   const router = useRouter();

//     const actions = [
//     { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/sales-quotation-view/view/${quotation._id}`) },
//     { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/sales-quotation-view/new?editId=${quotation._id}`) },
//     { icon: <FaCopy />, label: "Copy → Order", onClick: () => onCopy(quotation, "Order") },
//     {
//       icon: <FaEnvelope />,
//       label: "Email",
//       onClick: async () => {
//         try {
//           const res = await axios.post("/api/email", { type: "quotation", id: quotation._id });
//           if (res.data.success) toast.success("Email sent successfully!");
//           else toast.error(res.data.message || "Failed to send email.");
//         } catch {
//           toast.error("Error sending email.");
//         }
//       },
//     },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/sales-quotation-whatsapp/${quotation._id}`) },
//     { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(quotation._id) },
//   ];

//   return (
//     <ActionMenu actions={actions} />
//   )
// }
