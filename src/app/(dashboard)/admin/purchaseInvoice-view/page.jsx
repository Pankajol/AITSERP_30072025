"use client";

import { useState, useEffect, useMemo } from "react";
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
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function PurchaseInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/purchaseInvoice", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      } else {
        setInvoices([]);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to fetch invoices.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const filtered = useMemo(() => {
    return invoices.filter((invoice) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        (invoice.supplierName || "").toLowerCase().includes(q) ||
        (invoice.documentNumberPurchaseInvoice || "").toLowerCase().includes(q);
      
      const matchStatus = filterStatus === "All" || invoice.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, filterStatus]);

  const stats = {
    total: invoices.length,
    paid: invoices.filter((i) => i.status === "Paid" || i.status === "Closed").length,
    unpaid: invoices.filter((i) => i.status === "Unpaid" || i.status === "Open").length,
    totalAmount: invoices.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0),
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      const res = await axios.delete(`/api/purchaseInvoice/${id}`);
      if (res.data.success) {
        toast.success("Invoice deleted successfully!");
        setInvoices((prev) => prev.filter((i) => i._id !== id));
      } else {
        toast.error(res.data.message || "Failed to delete invoice.");
      }
    } catch (error) {
      toast.error("Failed to delete invoice.");
    }
  };

  const handleCopyTo = (invoice, destination) => {
    if (destination === "debitNote") {
      sessionStorage.setItem("invoiceData", JSON.stringify(invoice));
      router.push("/admin/debit-notes-view/new");
    }
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Paid: "bg-emerald-50 text-emerald-600",
      Closed: "bg-emerald-50 text-emerald-600",
      Unpaid: "bg-red-50 text-red-600",
      Open: "bg-blue-50 text-blue-600",
      Draft: "bg-gray-100 text-gray-500",
      Pending: "bg-amber-50 text-amber-600",
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
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Invoices</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage and track supplier billing</p>
          </div>
          <Link href="/admin/purchaseInvoice-view/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              <FaPlus className="text-xs" /> New Invoice
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Invoices", value: stats.total, emoji: "📄", filter: "All" },
            { label: "Paid", value: stats.paid, emoji: "✅", filter: "Paid" },
            { label: "Unpaid", value: stats.unpaid, emoji: "⏳", filter: "Unpaid" },
            { label: "Payable Value", value: `₹${stats.totalAmount.toLocaleString("en-IN")}`, emoji: "💰", filter: "All", noFilter: true },
          ].map((s) => (
            <div key={s.label} 
              onClick={() => !s.noFilter && setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 border-2 transition-all
                ${!s.noFilter && filterStatus === s.filter 
                  ? "border-indigo-400 shadow-md shadow-indigo-100" 
                  : "border-transparent shadow-sm hover:border-indigo-200 cursor-pointer"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Content Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or supplier..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "Paid", "Unpaid"].map((s) => (
                <button key={s} onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s 
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" 
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
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
                  {["#", "Invoice No.", "Supplier", "Date", "Status", "Grand Total", "Actions"].map((h) => (
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
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20">
                      <FaFileInvoice className="mx-auto text-4xl text-gray-100 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No invoices found</p>
                    </td>
                  </tr>
                ) : filtered.map((invoice, idx) => (
                  <tr key={invoice._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {invoice.documentNumberPurchaseInvoice || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">{invoice.supplierName || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={invoice.status} /></td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-800">
                       ₹{Number(invoice.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4">
                      <InvoiceRowMenu invoice={invoice} onDelete={handleDelete} onCopyTo={handleCopyTo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((invoice, idx) => (
              <div key={invoice._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {invoice.documentNumberPurchaseInvoice || `#${idx + 1}`}
                  </span>
                  <InvoiceRowMenu invoice={invoice} onDelete={handleDelete} onCopyTo={handleCopyTo} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{invoice.supplierName}</h3>
                <div className="flex justify-between items-end mt-3">
                  <div className="space-y-1">
                    <StatusBadge status={invoice.status} />
                    <p className="text-[10px] text-gray-400">
                      {invoice.documentDate ? new Date(invoice.documentDate).toLocaleDateString("en-GB") : ""}
                    </p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 text-sm">
                    ₹{Number(invoice.grandTotal || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

function InvoiceRowMenu({ invoice, onDelete, onCopyTo }) {
  const router = useRouter();

  const actions = [
    { icon: <FaEye />, label: "View Invoice", onClick: () => router.push(`/admin/purchaseInvoice-view/view/${invoice._id}`) },
    { icon: <FaEdit />, label: "Edit Invoice", onClick: () => router.push(`/admin/purchaseInvoice-view/new/?editId=${invoice._id}`) },
    { icon: <FaCopy />, label: "Copy → Debit Note", onClick: () => onCopyTo(invoice, "debitNote") },
    {
      icon: <FaEnvelope />,
      label: "Email PDF",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "purchase-invoice", id: invoice._id });
          if (res.data.success) toast.success("Email sent!");
          else toast.error(res.data.message || "Failed to send email");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/purchaseInvoice-view/${invoice._id}/send-whatsapp`) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(invoice._id) },
  ];

  return <ActionMenu actions={actions} />;
}