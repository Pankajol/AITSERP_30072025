"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaPlus,
  FaFileAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function PurchaseQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    copiedToOrder: 0,
    convertedToOrder: 0,
    partiallyOrdered: 0,
    fullyOrdered: 0,
    totalValue: 0,
  });
  const router = useRouter();
  const limit = 10;

  useEffect(() => {
    console.log("📦 quotations state updated:", quotations);
  }, [quotations]);

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/purchase-quotation?stats=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("📊 Stats API response:", res.data);
      if (res.data?.success && res.data.data) {
        setStats(res.data.data);
        if (res.data.data.totalValue === 0 && quotations.length > 0) {
          console.warn("⚠️ Stats API returned 0 totalValue, but quotations exist. Using current page total as fallback.");
          const pageTotal = quotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
          setStats(prev => ({ ...prev, totalValue: pageTotal }));
        }
      }
    } catch (err) {
      console.error("Stats fetch failed:", err);
      const pageTotal = quotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
      setStats(prev => ({ ...prev, totalValue: pageTotal }));
      toast.warn("Using current page total for Potential Value");
    }
  }, [quotations]);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = {
        page: currentPage,
        limit,
        search: search.trim(),
        status: filterStatus === "All" ? "" : filterStatus,
      };
      console.log("🔍 Fetching with params:", params);
      const res = await axios.get("/api/purchase-quotation", {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✅ API response:", res.data);
      if (res.data?.success) {
        const data = res.data.data;
        setQuotations(Array.isArray(data) ? data : []);
        if (res.data.meta) {
          setTotalPages(res.data.meta.pages || 1);
          setTotalCount(res.data.meta.total || 0);
        } else {
          setTotalPages(1);
          setTotalCount(data.length);
        }
      } else {
        setQuotations([]);
      }
    } catch (error) {
      console.error("Error fetching purchase quotations:", error);
      toast.error("Failed to fetch quotations");
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, filterStatus]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/purchase-quotation?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchQuotations();
      await fetchStats();
      toast.success("Quotation deleted");
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete");
    }
  };

  // ✅ Fix: Redirect to Purchase Order form with pqId query parameter
  const handleCopyTo = (quotation) => {
    router.push(`/admin/purchase-order-view/new?pqId=${quotation._id}`);
    toast.success("Redirecting to Purchase Order with quotation data...");
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Open: "bg-blue-50 text-blue-600",
      CopiedToOrder: "bg-amber-50 text-amber-600",
      ConvertedToOrder: "bg-purple-50 text-purple-600",
      PartiallyOrdered: "bg-orange-50 text-orange-600",
      FullyOrdered: "bg-emerald-50 text-emerald-600",
      Approved: "bg-emerald-50 text-emerald-600",
      Pending: "bg-amber-50 text-amber-600",
      Draft: "bg-gray-100 text-gray-500",
      Rejected: "bg-red-50 text-red-500",
      Cancelled: "bg-red-50 text-red-500",
    };
    return (
      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
        {status || "—"}
      </span>
    );
  };

  const displayStats = {
    total: stats.total || totalCount,
    open: stats.open ?? 0,
    copiedToOrder: stats.copiedToOrder ?? 0,
    convertedToOrder: stats.convertedToOrder ?? 0,
    partiallyOrdered: stats.partiallyOrdered ?? 0,
    fullyOrdered: stats.fullyOrdered ?? 0,
    totalValue: stats.totalValue ?? 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Header with Refresh button */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Quotations</h1>
            <p className="text-sm text-gray-400 mt-0.5">Compare supplier quotes and pricing</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { fetchQuotations(); fetchStats(); }}
              className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300"
            >
              Refresh
            </button>
            <Link href="/admin/PurchaseQuotationList/new">
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
                <FaPlus className="text-xs" /> New Quotation
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Quotes", value: displayStats.total, emoji: "📝", filter: "All" },
            { label: "Open", value: displayStats.open, emoji: "📄", filter: "Open" },
            { label: "Copied to PO", value: displayStats.copiedToOrder, emoji: "📋", filter: "CopiedToOrder" },
            { label: "Converted", value: displayStats.convertedToOrder, emoji: "✅", filter: "ConvertedToOrder" },
            { label: "Partially Ordered", value: displayStats.partiallyOrdered, emoji: "⏳", filter: "PartiallyOrdered" },
            { label: "Fully Ordered", value: displayStats.fullyOrdered, emoji: "🎯", filter: "FullyOrdered" },
            { label: "Potential Value", value: displayStats.totalValue, emoji: "💰", filter: "All", noFilter: true, isCurrency: true },
          ].map(s => (
            <div key={s.label} 
              onClick={() => !s.noFilter && setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all
                ${!s.noFilter && filterStatus === s.filter 
                  ? "border-indigo-400 shadow-md shadow-indigo-100" 
                  : "border-transparent shadow-sm hover:border-indigo-200 cursor-pointer"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">
                  {s.isCurrency ? `₹${Number(s.value).toLocaleString("en-IN")}` : s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search supplier or doc no..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "CopiedToOrder", "ConvertedToOrder", "PartiallyOrdered", "FullyOrdered"].map(s => (
                <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {s === "CopiedToOrder" ? "Copied to PO" : s === "ConvertedToOrder" ? "Converted" : s === "PartiallyOrdered" ? "Partial" : s === "FullyOrdered" ? "Fully Ordered" : s}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Document No.", "Supplier", "Date", "Status", "Total", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : quotations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20">
                      <FaFileAlt className="mx-auto text-4xl text-gray-100 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No purchase quotations found</p>
                    </td>
                  </tr>
                ) : (
                  quotations.map((q, idx) => (
                    <tr key={q._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">
                        {(currentPage - 1) * limit + idx + 1}
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {q.documentNumber || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900">{q.supplierName || "—"}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={q.status} /></td>
                      <td className="px-4 py-4 font-mono font-bold text-gray-800">
                        ₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-4">
                        <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : quotations.length === 0 ? (
              <div className="p-4 text-center text-gray-400">No quotations found</div>
            ) : (
              quotations.map((q, idx) => (
                <div key={q._id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {q.documentNumber || `#${idx + 1}`}
                    </span>
                    <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm">{q.supplierName}</h3>
                  <div className="flex justify-between items-end mt-3">
                    <div className="space-y-1">
                      <StatusBadge status={q.status} />
                      <p className="text-[10px] text-gray-400">{q.postingDate ? new Date(q.postingDate).toLocaleDateString() : ""}</p>
                    </div>
                    <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(q.grandTotal || 0).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1"
              >
                <FaChevronLeft className="text-xs" /> Prev
              </button>
              <span className="text-sm text-gray-500 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1"
              >
                Next <FaChevronRight className="text-xs" />
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function RowMenu({ quotation, onDelete, onCopy }) {
  const router = useRouter();

  const handleEmail = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/email",
        { type: "purchase-quotation", id: quotation._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) toast.success("Email sent successfully!");
      else toast.error(res.data.message || "Failed to send email");
    } catch (err) {
      console.error(err);
      toast.error("Error sending email.");
    }
  };

  const actions = [
    { icon: <FaEye />, label: "View Quotation", onClick: () => router.push(`/admin/PurchaseQuotationList/view/${quotation._id}`) },
    { icon: <FaEdit />, label: "Edit Quotation", onClick: () => router.push(`/admin/PurchaseQuotationList/new?editId=${quotation._id}`) },
    { icon: <FaCopy />, label: "Copy → PO", onClick: () => onCopy(quotation) }, // ✅ now redirects with pqId
    { icon: <FaEnvelope />, label: "Email PDF", onClick: handleEmail },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/purchase-quotation/${quotation._id}/send-whatsapp`) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(quotation._id) },
  ];

  return <ActionMenu actions={actions} />;
}



// "use client";

// import { useState, useEffect, useCallback } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";
// import {
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
//   FaPlus,
//   FaFileAlt,
//   FaChevronLeft,
//   FaChevronRight,
// } from "react-icons/fa";
// import ActionMenu from "@/components/ActionMenu";

// export default function PurchaseQuotationList() {
//   const [quotations, setQuotations] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [filterStatus, setFilterStatus] = useState("All");
//   const [currentPage, setCurrentPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [totalCount, setTotalCount] = useState(0);
//   const [stats, setStats] = useState({
//     total: 0,
//     open: 0,
//     copiedToOrder: 0,
//     convertedToOrder: 0,
//     partiallyOrdered: 0,
//     fullyOrdered: 0,
//     totalValue: 0,
//   });
//   const router = useRouter();
//   const limit = 10;

//   // Debug logs
//   useEffect(() => {
//     console.log("📦 quotations state updated:", quotations);
//   }, [quotations]);

//   const fetchStats = useCallback(async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/purchase-quotation?stats=true", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       console.log("📊 Stats API response:", res.data);
//       if (res.data?.success && res.data.data) {
//         setStats(res.data.data);
//         // If totalValue is zero but we have quotations, show warning and use page total as fallback
//         if (res.data.data.totalValue === 0 && quotations.length > 0) {
//           console.warn("⚠️ Stats API returned 0 totalValue, but quotations exist. Using current page total as fallback.");
//           const pageTotal = quotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
//           setStats(prev => ({ ...prev, totalValue: pageTotal }));
//         }
//       }
//     } catch (err) {
//       console.error("Stats fetch failed:", err);
//       // Fallback: compute from current page quotations
//       const pageTotal = quotations.reduce((sum, q) => sum + (Number(q.grandTotal) || 0), 0);
//       setStats(prev => ({ ...prev, totalValue: pageTotal }));
//       toast.warn("Using current page total for Potential Value");
//     }
//   }, [quotations]);

//   const fetchQuotations = useCallback(async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const params = {
//         page: currentPage,
//         limit,
//         search: search.trim(),
//         status: filterStatus === "All" ? "" : filterStatus,
//       };
//       console.log("🔍 Fetching with params:", params);
//       const res = await axios.get("/api/purchase-quotation", {
//         params,
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       console.log("✅ API response:", res.data);
//       if (res.data?.success) {
//         const data = res.data.data;
//         setQuotations(Array.isArray(data) ? data : []);
//         if (res.data.meta) {
//           setTotalPages(res.data.meta.pages || 1);
//           setTotalCount(res.data.meta.total || 0);
//         } else {
//           setTotalPages(1);
//           setTotalCount(data.length);
//         }
//       } else {
//         setQuotations([]);
//       }
//     } catch (error) {
//       console.error("Error fetching purchase quotations:", error);
//       toast.error("Failed to fetch quotations");
//     } finally {
//       setLoading(false);
//     }
//   }, [currentPage, search, filterStatus]);

//   useEffect(() => {
//     fetchQuotations();
//   }, [fetchQuotations]);

//   useEffect(() => {
//     setCurrentPage(1);
//   }, [search, filterStatus]);

//   useEffect(() => {
//     fetchStats();
//   }, [fetchStats]); // will re-run when quotations changes

//   const handleDelete = async (id) => {
//     if (!confirm("Delete this quotation?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/purchase-quotation?id=${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       await fetchQuotations();
//       await fetchStats();
//       toast.success("Quotation deleted");
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to delete");
//     }
//   };

//   const handleCopyTo = (quotation) => {
//     sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
//     toast.success("Copied to Purchase Order");
//     router.push("/admin/purchase-order-view/new");
//   };

//   const StatusBadge = ({ status }) => {
//     const map = {
//       Open: "bg-blue-50 text-blue-600",
//       CopiedToOrder: "bg-amber-50 text-amber-600",
//       ConvertedToOrder: "bg-purple-50 text-purple-600",
//       PartiallyOrdered: "bg-orange-50 text-orange-600",
//       FullyOrdered: "bg-emerald-50 text-emerald-600",
//       Approved: "bg-emerald-50 text-emerald-600",
//       Pending: "bg-amber-50 text-amber-600",
//       Draft: "bg-gray-100 text-gray-500",
//       Rejected: "bg-red-50 text-red-500",
//       Cancelled: "bg-red-50 text-red-500",
//     };
//     return (
//       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
//         {status || "—"}
//       </span>
//     );
//   };

//   const displayStats = {
//     total: stats.total || totalCount,
//     open: stats.open ?? 0,
//     copiedToOrder: stats.copiedToOrder ?? 0,
//     convertedToOrder: stats.convertedToOrder ?? 0,
//     partiallyOrdered: stats.partiallyOrdered ?? 0,
//     fullyOrdered: stats.fullyOrdered ?? 0,
//     totalValue: stats.totalValue ?? 0,
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
//         {/* Header */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Quotations</h1>
//             <p className="text-sm text-gray-400 mt-0.5">Compare supplier quotes and pricing</p>
//           </div>
//           <div className="flex gap-2">
//             <button
//               onClick={() => { fetchQuotations(); fetchStats(); }}
//               className="px-3 py-2 rounded-lg bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300"
//             >
//               Refresh
//             </button>
//             <Link href="/admin/PurchaseQuotationList/new">
//               <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
//                 <FaPlus className="text-xs" /> New Quotation
//               </button>
//             </Link>
//           </div>
//         </div>

//         {/* Stats Cards */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
//           {[
//             { label: "Total Quotes", value: displayStats.total, emoji: "📝", filter: "All" },
//             { label: "Open", value: displayStats.open, emoji: "📄", filter: "Open" },
//             { label: "Copied to PO", value: displayStats.copiedToOrder, emoji: "📋", filter: "CopiedToOrder" },
//             { label: "Converted", value: displayStats.convertedToOrder, emoji: "✅", filter: "ConvertedToOrder" },
//             { label: "Partially Ordered", value: displayStats.partiallyOrdered, emoji: "⏳", filter: "PartiallyOrdered" },
//             { label: "Fully Ordered", value: displayStats.fullyOrdered, emoji: "🎯", filter: "FullyOrdered" },
//             { label: "Potential Value", value: displayStats.totalValue, emoji: "💰", filter: "All", noFilter: true, isCurrency: true },
//           ].map(s => (
//             <div key={s.label} 
//               onClick={() => !s.noFilter && setFilterStatus(s.filter)}
//               className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all
//                 ${!s.noFilter && filterStatus === s.filter 
//                   ? "border-indigo-400 shadow-md shadow-indigo-100" 
//                   : "border-transparent shadow-sm hover:border-indigo-200 cursor-pointer"}`}>
//               <span className="text-2xl">{s.emoji}</span>
//               <div>
//                 <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
//                 <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">
//                   {s.isCurrency ? `₹${Number(s.value).toLocaleString("en-IN")}` : s.value}
//                 </p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Table Card */}
//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
//           <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
//             <div className="relative flex-1 min-w-[180px] max-w-xs">
//               <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
//               <input
//                 className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
//                 value={search} onChange={e => setSearch(e.target.value)}
//                 placeholder="Search supplier or doc no..." />
//             </div>
//             <div className="flex gap-2 flex-wrap ml-auto">
//               {["All", "Open", "CopiedToOrder", "ConvertedToOrder", "PartiallyOrdered", "FullyOrdered"].map(s => (
//                 <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
//                   className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
//                     ${filterStatus === s 
//                       ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
//                       : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                   {s === "CopiedToOrder" ? "Copied to PO" : s === "ConvertedToOrder" ? "Converted" : s === "PartiallyOrdered" ? "Partial" : s === "FullyOrdered" ? "Fully Ordered" : s}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Desktop Table */}
//           <div className="hidden md:block overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   {["#", "Document No.", "Supplier", "Date", "Status", "Total", "Actions"].map(h => (
//                     <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {loading ? (
//                   Array(5).fill(0).map((_, i) => (
//                     <tr key={i} className="border-b border-gray-50">
//                       {Array(7).fill(0).map((__, j) => (
//                         <td key={j} className="px-4 py-4">
//                           <div className="h-3 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
//                         </td>
//                       ))}
//                     </tr>
//                   ))
//                 ) : quotations.length === 0 ? (
//                   <tr>
//                     <td colSpan={7} className="text-center py-20">
//                       <FaFileAlt className="mx-auto text-4xl text-gray-100 mb-3" />
//                       <p className="text-sm font-medium text-gray-400">No purchase quotations found</p>
//                     </td>
//                   </tr>
//                 ) : (
//                   quotations.map((q, idx) => (
//                     <tr key={q._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
//                       <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">
//                         {(currentPage - 1) * limit + idx + 1}
//                       </td>
//                       <td className="px-4 py-4">
//                         <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
//                           {q.documentNumber || "—"}
//                         </span>
//                       </td>
//                       <td className="px-4 py-4 font-bold text-gray-900">{q.supplierName || "—"}</td>
//                       <td className="px-4 py-4 text-xs text-gray-500">
//                         {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : "—"}
//                       </td>
//                       <td className="px-4 py-4"><StatusBadge status={q.status} /></td>
//                       <td className="px-4 py-4 font-mono font-bold text-gray-800">
//                         ₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}
//                       </td>
//                       <td className="px-4 py-4">
//                         <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
//                       </td>
//                     </tr>
//                   ))
//                 )}
//               </tbody>
//             </table>
//           </div>

//           {/* Mobile View */}
//           <div className="md:hidden divide-y divide-gray-100">
//             {loading ? (
//               <div className="p-4 text-center">Loading...</div>
//             ) : quotations.length === 0 ? (
//               <div className="p-4 text-center text-gray-400">No quotations found</div>
//             ) : (
//               quotations.map((q, idx) => (
//                 <div key={q._id} className="p-4 hover:bg-gray-50 transition-colors">
//                   <div className="flex justify-between items-start mb-2">
//                     <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
//                       {q.documentNumber || `#${idx + 1}`}
//                     </span>
//                     <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
//                   </div>
//                   <h3 className="font-bold text-gray-900 text-sm">{q.supplierName}</h3>
//                   <div className="flex justify-between items-end mt-3">
//                     <div className="space-y-1">
//                       <StatusBadge status={q.status} />
//                       <p className="text-[10px] text-gray-400">{q.postingDate ? new Date(q.postingDate).toLocaleDateString() : ""}</p>
//                     </div>
//                     <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(q.grandTotal || 0).toLocaleString()}</span>
//                   </div>
//                 </div>
//               ))
//             )}
//           </div>

//           {/* Pagination */}
//           {totalPages > 1 && (
//             <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
//               <button
//                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                 disabled={currentPage === 1}
//                 className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1"
//               >
//                 <FaChevronLeft className="text-xs" /> Prev
//               </button>
//               <span className="text-sm text-gray-500 font-medium">
//                 Page {currentPage} of {totalPages}
//               </span>
//               <button
//                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
//                 disabled={currentPage === totalPages}
//                 className="px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 disabled:opacity-50 text-sm font-medium hover:bg-gray-50 transition-all flex items-center gap-1"
//               >
//                 Next <FaChevronRight className="text-xs" />
//               </button>
//             </div>
//           )}
//         </div>
//       </div>
//       <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
//     </div>
//   );
// }

// function RowMenu({ quotation, onDelete, onCopy }) {
//   const router = useRouter();

//   const handleEmail = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.post(
//         "/api/email",
//         { type: "purchase-quotation", id: quotation._id },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (res.data.success) toast.success("Email sent successfully!");
//       else toast.error(res.data.message || "Failed to send email");
//     } catch (err) {
//       console.error(err);
//       toast.error("Error sending email.");
//     }
//   };

//   const actions = [
//     { icon: <FaEye />, label: "View Quotation", onClick: () => router.push(`/admin/PurchaseQuotationList/view/${quotation._id}`) },
//     { icon: <FaEdit />, label: "Edit Quotation", onClick: () => router.push(`/admin/PurchaseQuotationList/new?editId=${quotation._id}`) },
//     { icon: <FaCopy />, label: "Copy → PO", onClick: () => onCopy(quotation) },
//     { icon: <FaEnvelope />, label: "Email PDF", onClick: handleEmail },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/purchase-quotation/${quotation._id}/send-whatsapp`) },
//     { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(quotation._id) },
//   ];

//   return <ActionMenu actions={actions} />;
// }