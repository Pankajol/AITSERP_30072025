"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  FaFileInvoice,
  FaChevronLeft,   // ✅ added
  FaChevronRight,  // ✅ added
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function PurchaseInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const router = useRouter();

  // Pagination state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Stats (global, not affected by pagination)
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    totalAmount: 0,
    totalPaid: 0,
    pendingAmount: 0,
  });

  // Fetch global stats (without pagination)
  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get("/api/purchaseInvoice?limit=10000", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success) {
        const all = res.data.data;
        const paid = all.filter(i => i.paymentStatus === "Paid").length;
        const unpaid = all.filter(i => i.paymentStatus !== "Paid").length;
        const totalAmount = all.reduce((sum, i) => sum + (Number(i.grandTotal) || 0), 0);
        const totalPaid = all.reduce((sum, i) => sum + (Number(i.paidAmount) || 0), 0);
        const pendingAmount = totalAmount - totalPaid;
        setStats({
          total: all.length,
          paid,
          unpaid,
          totalAmount,
          totalPaid,
          pendingAmount,
        });
      }
    } catch (err) {
      console.error("Failed to fetch stats", err);
    }
  }, []);

  // Fetch paginated invoices
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("No authentication token found");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (search.trim()) params.append("search", search);
      if (paymentStatusFilter !== "All") params.append("paymentStatus", paymentStatusFilter);

      const res = await axios.get(`/api/purchaseInvoice?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setInvoices(res.data.data || []);
        setTotalRecords(res.data.pagination?.total || 0);
        setTotalPages(res.data.pagination?.pages || 0);
      } else {
        setInvoices([]);
        toast.warning(res.data?.message || "No invoices found");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to fetch invoices");
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, paymentStatusFilter]);

  // Fetch stats once on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Reset page when search or filter changes
  useEffect(() => {
    setPage(1);
  }, [search, paymentStatusFilter]);

  // Fetch when dependencies change
  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Delete handler
  const handleDelete = async (id) => {
    if (!confirm("Delete this invoice?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/purchaseInvoice/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Invoice deleted");
      fetchInvoices();  // refresh current page
      fetchStats();     // refresh global stats
    } catch (error) {
      toast.error(error.response?.data?.message || "Delete failed");
    }
  };

  // Copy to Debit Note
  const handleCopyTo = (invoice, destination) => {
    if (destination === "debitNote") {
      sessionStorage.setItem("invoiceData", JSON.stringify(invoice));
      router.push("/admin/debit-notes-view/new");
    }
  };

  const PaymentStatusBadge = ({ paymentStatus }) => {
    const status = paymentStatus || "Pending";
    const map = {
      Paid: "bg-emerald-50 text-emerald-600",
      Partial: "bg-amber-50 text-amber-600",
      Pending: "bg-red-50 text-red-600",
    };
    return (
      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
        {status}
      </span>
    );
  };

  // Pagination handlers
  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) setPage(newPage);
  };

  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Purchase Invoices
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {stats.total} total invoices recorded
            </p>
          </div>
          <Link href="/admin/purchaseInvoice-view/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              <FaPlus className="text-xs" /> New Invoice
            </button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
          {[
            { label: "Total Invoices", value: stats.total, emoji: "📄", filter: "All" },
            { label: "Paid", value: stats.paid, emoji: "✅", filter: "Paid" },
            { label: "Unpaid/Partial", value: stats.unpaid, emoji: "⏳", filter: "Pending" },
            { label: "Total Billed", value: `₹${stats.totalAmount.toLocaleString("en-IN")}`, emoji: "💰", noFilter: true },
            { label: "Pending Payment", value: `₹${stats.pendingAmount.toLocaleString("en-IN")}`, emoji: "🔴", noFilter: true },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => !s.noFilter && setPaymentStatusFilter(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all cursor-pointer
                ${!s.noFilter && paymentStatusFilter === s.filter
                  ? "border-indigo-400 shadow-md shadow-indigo-100"
                  : "border-transparent shadow-sm hover:border-indigo-200"}`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or supplier..."
              />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Paid", "Partial", "Pending"].map((s) => (
                <button
                  key={s}
                  onClick={() => setPaymentStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${paymentStatusFilter === s
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}
                >
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
                  {["#", "Invoice No.", "Supplier", "Date", "Payment Status", "Grand Total", "Paid", "Pending", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(limit).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(9).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-3 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                         </td>
                      ))}
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-20">
                      <FaFileInvoice className="mx-auto text-4xl text-gray-100 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No invoices found</p>
                     </td>
                   </tr>
                ) : (
                  invoices.map((invoice, idx) => (
                    <tr key={invoice._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                      <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {invoice.documentNumberPurchaseInvoice || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900">{invoice.supplierName || "—"}</td>
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString("en-GB") : "—"}
                      </td>
                      <td className="px-4 py-4"><PaymentStatusBadge paymentStatus={invoice.paymentStatus} /></td>
                      <td className="px-4 py-4 font-mono font-bold text-gray-800">₹{Number(invoice.grandTotal || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-4 text-green-600 font-mono">₹{Number(invoice.paidAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-4 text-red-500 font-mono">₹{Number(invoice.remainingAmount || 0).toLocaleString("en-IN")}</td>
                      <td className="px-4 py-4">
                        <InvoiceRowMenu invoice={invoice} onDelete={handleDelete} onCopyTo={handleCopyTo} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {invoices.map((invoice, idx) => (
              <div key={invoice._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {invoice.documentNumberPurchaseInvoice || `#${(page - 1) * limit + idx + 1}`}
                  </span>
                  <InvoiceRowMenu invoice={invoice} onDelete={handleDelete} onCopyTo={handleCopyTo} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{invoice.supplierName}</h3>
                <div className="flex justify-between items-end mt-3">
                  <div className="space-y-1">
                    <PaymentStatusBadge paymentStatus={invoice.paymentStatus} />
                    <p className="text-[10px] text-gray-400">
                      {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString("en-GB") : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(invoice.grandTotal || 0).toLocaleString()}</span>
                    <p className="text-[10px] text-green-600">Paid: ₹{Number(invoice.paidAmount || 0).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t border-gray-100 bg-gray-50/30">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Show</span>
                <select
                  value={limit}
                  onChange={handleLimitChange}
                  className="px-2 py-1 rounded border border-gray-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>entries</span>
              </div>

              <div className="text-xs text-gray-500">
                Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, totalRecords)} of {totalRecords} records
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1
                    ${page === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}
                >
                  <FaChevronLeft className="text-[10px]" /> Previous
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all
                          ${page === pageNum
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1
                    ${page === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}
                >
                  Next <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// Helper component for row actions
function InvoiceRowMenu({ invoice, onDelete, onCopyTo }) {
  const router = useRouter();

  const handleView = () => router.push(`/admin/purchaseInvoice-view/view/${invoice._id}`);
  const handleEdit = () => router.push(`/admin/purchaseInvoice-view/new/?editId=${invoice._id}`);

  const handleEmail = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/email",
        { type: "purchase-invoice", id: invoice._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) toast.success("Email sent!");
      else toast.error(res.data.message || "Failed to send email");
    } catch (error) {
      toast.error("Error sending email");
    }
  };

  const handleWhatsApp = () => {
    router.push(`/admin/purchaseInvoice-view/${invoice._id}/send-whatsapp`);
  };

  const actions = [
    { icon: <FaEye />, label: "View Invoice", onClick: handleView },
    { icon: <FaEdit />, label: "Edit Invoice", onClick: handleEdit },
    { icon: <FaCopy />, label: "Copy → Debit Note", onClick: () => onCopyTo(invoice, "debitNote") },
    { icon: <FaEnvelope />, label: "Email PDF", onClick: handleEmail },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: handleWhatsApp },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(invoice._id) },
  ];

  return <ActionMenu actions={actions} />;
}

// "use client";

// import { useState, useEffect, useMemo } from "react";
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
//   FaFileInvoice,
// } from "react-icons/fa";
// import ActionMenu from "@/components/ActionMenu";

// export default function PurchaseInvoiceList() {
//   const [invoices, setInvoices] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const [filterStatus, setFilterStatus] = useState("All");
//   const router = useRouter();

//   const fetchInvoices = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/purchaseInvoice", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data?.success && Array.isArray(res.data.data)) {
//         setInvoices(res.data.data);
//       } else {
//         setInvoices([]);
//       }
//     } catch (error) {
//       console.error("Error fetching invoices:", error);
//       toast.error("Failed to fetch invoices.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchInvoices();
//   }, []);

//   const filtered = useMemo(() => {
//     return invoices.filter((invoice) => {
//       const q = search.toLowerCase();
//       const matchSearch =
//         !search.trim() ||
//         (invoice.supplierName || "").toLowerCase().includes(q) ||
//         (invoice.documentNumberPurchaseInvoice || "").toLowerCase().includes(q);
      
//       const matchStatus = filterStatus === "All" || invoice.status === filterStatus;
//       return matchSearch && matchStatus;
//     });
//   }, [invoices, search, filterStatus]);

//   const stats = {
//     total: invoices.length,
//     paid: invoices.filter((i) => i.status === "Paid" || i.status === "Closed").length,
//     unpaid: invoices.filter((i) => i.status === "Unpaid" || i.status === "Open").length,
//     totalAmount: invoices.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0),
//   };

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this invoice?")) return;
//     try {
//       const res = await axios.delete(`/api/purchaseInvoice/${id}`);
//       if (res.data.success) {
//         toast.success("Invoice deleted successfully!");
//         setInvoices((prev) => prev.filter((i) => i._id !== id));
//       } else {
//         toast.error(res.data.message || "Failed to delete invoice.");
//       }
//     } catch (error) {
//       toast.error("Failed to delete invoice.");
//     }
//   };

//   const handleCopyTo = (invoice, destination) => {
//     if (destination === "debitNote") {
//       sessionStorage.setItem("invoiceData", JSON.stringify(invoice));
//       router.push("/admin/debit-notes-view/new");
//     }
//   };

//   const StatusBadge = ({ status }) => {
//     const map = {
//       Paid: "bg-emerald-50 text-emerald-600",
//       Closed: "bg-emerald-50 text-emerald-600",
//       Unpaid: "bg-red-50 text-red-600",
//       Open: "bg-blue-50 text-blue-600",
//       Draft: "bg-gray-100 text-gray-500",
//       Pending: "bg-amber-50 text-amber-600",
//     };
//     return (
//       <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
//         {status || "—"}
//       </span>
//     );
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        
//         {/* ── Header ── */}
//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Invoices</h1>
//             <p className="text-sm text-gray-400 mt-0.5">Manage and track supplier billing</p>
//           </div>
//           <Link href="/admin/purchaseInvoice-view/new">
//             <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
//               <FaPlus className="text-xs" /> New Invoice
//             </button>
//           </Link>
//         </div>

//         {/* ── Stat Cards ── */}
//         <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
//           {[
//             { label: "Total Invoices", value: stats.total, emoji: "📄", filter: "All" },
//             { label: "Paid", value: stats.paid, emoji: "✅", filter: "Paid" },
//             { label: "Unpaid", value: stats.unpaid, emoji: "⏳", filter: "Unpaid" },
//             { label: "Payable Value", value: `₹${stats.totalAmount.toLocaleString("en-IN")}`, emoji: "💰", filter: "All", noFilter: true },
//           ].map((s) => (
//             <div key={s.label} 
//               onClick={() => !s.noFilter && setFilterStatus(s.filter)}
//               className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all
//                 ${!s.noFilter && filterStatus === s.filter 
//                   ? "border-indigo-400 shadow-md shadow-indigo-100" 
//                   : "border-transparent shadow-sm hover:border-indigo-200 cursor-pointer"}`}>
//               <span className="text-2xl">{s.emoji}</span>
//               <div>
//                 <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
//                 <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">{s.value}</p>
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* ── Main Content Card ── */}
//         <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          
//           {/* Toolbar */}
//           <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
//             <div className="relative flex-1 min-w-[180px] max-w-xs">
//               <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
//               <input
//                 className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
//                 value={search} onChange={(e) => setSearch(e.target.value)}
//                 placeholder="Search invoice or supplier..." />
//             </div>
//             <div className="flex gap-2 flex-wrap ml-auto">
//               {["All", "Open", "Paid", "Unpaid"].map((s) => (
//                 <button key={s} onClick={() => setFilterStatus(s)}
//                   className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
//                     ${filterStatus === s 
//                       ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
//                       : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                   {s}
//                 </button>
//               ))}
//             </div>
//           </div>

//           {/* Desktop Table */}
//           <div className="hidden md:block overflow-x-auto">
//             <table className="w-full text-sm border-collapse">
//               <thead>
//                 <tr className="bg-gray-50 border-b border-gray-100">
//                   {["#", "Invoice No.", "Supplier", "Date", "Status", "Grand Total", "Actions"].map((h) => (
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
//                 ) : filtered.length === 0 ? (
//                   <tr>
//                     <td colSpan={7} className="text-center py-20">
//                       <FaFileInvoice className="mx-auto text-4xl text-gray-100 mb-3" />
//                       <p className="text-sm font-medium text-gray-400">No invoices found</p>
//                     </td>
//                   </tr>
//                 ) : filtered.map((invoice, idx) => (
//                   <tr key={invoice._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
//                     <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
//                     <td className="px-4 py-4">
//                       <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
//                         {invoice.documentNumberPurchaseInvoice || "—"}
//                       </span>
//                     </td>
//                     <td className="px-4 py-4 font-bold text-gray-900">{invoice.supplierName || "—"}</td>
//                     <td className="px-4 py-4 text-xs text-gray-500">
//                       {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString("en-GB") : "—"}
//                     </td>
//                     <td className="px-4 py-4"><StatusBadge status={invoice.status} /></td>
//                     <td className="px-4 py-4 font-mono font-bold text-gray-800">
//                        ₹{Number(invoice.grandTotal || 0).toLocaleString("en-IN")}
//                     </td>
//                     <td className="px-4 py-4">
//                       <InvoiceRowMenu invoice={invoice} onDelete={handleDelete} onCopyTo={handleCopyTo} />
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Mobile View */}
//           <div className="md:hidden divide-y divide-gray-100">
//             {filtered.map((invoice, idx) => (
//               <div key={invoice._id} className="p-4 hover:bg-gray-50 transition-colors">
//                 <div className="flex justify-between items-start mb-2">
//                   <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
//                     {invoice.documentNumberPurchaseInvoice || `#${idx + 1}`}
//                   </span>
//                   <InvoiceRowMenu invoice={invoice} onDelete={handleDelete} onCopyTo={handleCopyTo} />
//                 </div>
//                 <h3 className="font-bold text-gray-900 text-sm">{invoice.supplierName}</h3>
//                 <div className="flex justify-between items-end mt-3">
//                   <div className="space-y-1">
//                     <StatusBadge status={invoice.status} />
//                     <p className="text-[10px] text-gray-400">
//                       {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString("en-GB") : ""}
//                     </p>
//                   </div>
//                   <span className="font-mono font-bold text-gray-800 text-sm">
//                     ₹{Number(invoice.grandTotal || 0).toLocaleString()}
//                   </span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//       <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
//     </div>
//   );
// }

// function InvoiceRowMenu({ invoice, onDelete, onCopyTo }) {
//   const router = useRouter();

//   const actions = [
//     { icon: <FaEye />, label: "View Invoice", onClick: () => router.push(`/admin/purchaseInvoice-view/view/${invoice._id}`) },
//     { icon: <FaEdit />, label: "Edit Invoice", onClick: () => router.push(`/admin/purchaseInvoice-view/new/?editId=${invoice._id}`) },
//     { icon: <FaCopy />, label: "Copy → Debit Note", onClick: () => onCopyTo(invoice, "debitNote") },
//     {
//       icon: <FaEnvelope />,
//       label: "Email PDF",
//       onClick: async () => {
//         try {
//           const res = await axios.post("/api/email", { type: "purchase-invoice", id: invoice._id });
//           if (res.data.success) toast.success("Email sent!");
//           else toast.error(res.data.message || "Failed to send email");
//         } catch {
//           toast.error("Error sending email.");
//         }
//       },
//     },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/purchaseInvoice-view/${invoice._id}/send-whatsapp`) },
//     { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(invoice._id) },
//   ];

//   return <ActionMenu actions={actions} />;
// }