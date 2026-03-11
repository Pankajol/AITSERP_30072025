"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ActionMenu from "@/components/ActionMenu";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEnvelope,
  FaPrint,
  FaSearch,
  FaPlus,
  FaBoxes,
} from "react-icons/fa";

export default function GRNList() {
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  // ✅ Fetch GRNs
  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Unauthorized! Please log in.");

      const res = await axios.get("/api/grn", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setGRNs(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching GRNs:", error);
      toast.error("Failed to fetch GRNs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, []);

  // ✅ Filter Logic
  const filtered = useMemo(() => {
    return grns.filter((g) => {
      const matchSearch = !search.trim() ||
        (g.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
        (g.documentNumberGrn || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || g.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [grns, search, filterStatus]);

  // ✅ Stats Calculation
  const stats = {
    total: grns.length,
    completed: grns.filter(g => g.status === "Completed" || g.status === "Closed").length,
    pending: grns.filter(g => g.status === "Pending" || g.status === "Open").length,
    totalValue: grns.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0),
  };

  // ✅ Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this GRN?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/grn?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGRNs((prev) => prev.filter((g) => g._id !== id));
      toast.success("Deleted successfully");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ✅ Copy to Invoice logic
  const handleCopyToInvoice = (grn) => {
    if (!grn) return;
    const dataToStore = {
      ...grn,
      invoiceType: "GRNCopy",
      items: Array.isArray(grn.items) ? grn.items : [],
    };
    sessionStorage.setItem("grnDataForInvoice", JSON.stringify(dataToStore));
    toast.success("GRN copied to Purchase Invoice");
    router.push("/admin/purchaseInvoice-view/new");
  };

  const handlePrint = (id) => window.open(`/admin/grn-view/print/${id}`, "_blank");

  const StatusBadge = ({ status }) => {
    const map = {
      Completed: "bg-emerald-50 text-emerald-600",
      Closed: "bg-emerald-50 text-emerald-600",
      Pending: "bg-amber-50 text-amber-600",
      Open: "bg-blue-50 text-blue-600",
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
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Goods Receipt Notes</h1>
            <p className="text-sm text-gray-400 mt-0.5">{grns.length} total receipts recorded</p>
          </div>
          <Link href="/admin/grn-view/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              <FaPlus className="text-xs" /> New GRN
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total GRNs", value: stats.total, emoji: "📄", filter: "All" },
            { label: "Completed", value: stats.completed, emoji: "✅", filter: "Completed" },
            { label: "Pending", value: stats.pending, emoji: "⏳", filter: "Pending" },
            { label: "Inventory Value", value: `₹${stats.totalValue.toLocaleString("en-IN")}`, emoji: "📦", filter: "All", noFilter: true },
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
                <p className="text-xl font-extrabold tracking-tight text-gray-900 mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search supplier or GRN no..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "Pending", "Completed"].map(s => (
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
                  {["#", "GRN Number", "Supplier", "Posting Date", "Status", "Total", "Actions"].map(h => (
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
                      <FaBoxes className="mx-auto text-4xl text-gray-100 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No GRN records found</p>
                    </td>
                  </tr>
                ) : filtered.map((g, idx) => (
                  <tr key={g._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {g.documentNumberGrn || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">{g.supplierName || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {g.postingDate ? new Date(g.postingDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={g.status} /></td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-800">
                       ₹{Number(g.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4">
                      <RowMenu grn={g} onDelete={handleDelete} onCopy={handleCopyToInvoice} onPrint={handlePrint} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((g, idx) => (
              <div key={g._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {g.documentNumberGrn || `#${idx + 1}`}
                  </span>
                  <RowMenu grn={g} onDelete={handleDelete} onCopy={handleCopyToInvoice} onPrint={handlePrint} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{g.supplierName}</h3>
                <div className="flex justify-between items-end mt-3">
                  <div className="space-y-1">
                    <StatusBadge status={g.status} />
                    <p className="text-[10px] text-gray-400">{g.postingDate ? new Date(g.postingDate).toLocaleDateString() : ""}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(g.grandTotal || 0).toLocaleString()}</span>
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

function RowMenu({ grn, onDelete, onCopy, onPrint }) {
  const router = useRouter();

  const handleEmail = async () => {
    try {
      const res = await axios.post("/api/email", { type: "grn", id: grn._id });
      if (res.data.success) toast.success("Email sent successfully!");
      else toast.error(res.data.message || "Failed to send email.");
    } catch {
      toast.error("Error sending email.");
    }
  };

  const actions = [
    { icon: <FaEye />, label: "View Receipt", onClick: () => router.push(`/admin/grn-view/view/${grn._id}`) },
    { icon: <FaEdit />, label: "Edit Record", onClick: () => router.push(`/admin/grn-view/new?editId=${grn._id}`) },
    { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(grn) },
    { icon: <FaEnvelope />, label: "Email PDF", onClick: handleEmail },
    { icon: <FaPrint />, label: "Print GRN", onClick: () => onPrint(grn._id) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(grn._id) },
  ];

  return <ActionMenu actions={actions} />;
}