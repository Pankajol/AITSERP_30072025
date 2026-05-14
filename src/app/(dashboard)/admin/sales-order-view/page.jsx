"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import jsPDF from "jspdf";
import {
  FaEdit, FaTrash, FaCopy, FaEye,
  FaEnvelope, FaWhatsapp, FaSearch, FaPlus,
  FaFileAlt, FaCloudUploadAlt, FaDownload,
  FaChevronLeft, FaChevronRight
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized! Please log in.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append("page", currentPage);
      params.append("limit", itemsPerPage);
      if (search.trim()) params.append("search", search);
      if (filterStatus !== "All") params.append("status", filterStatus);

      const res = await axios.get(`/api/sales-order?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setOrders(res.data.data || []);
        if (res.data.meta) {
          setTotalRecords(res.data.meta.total);
          setTotalPages(res.data.meta.pages);
        } else {
          setTotalRecords(res.data.data?.length || 0);
          setTotalPages(1);
        }
      } else {
        setOrders([]);
        setTotalRecords(0);
        setTotalPages(0);
      }
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Error fetching sales orders");
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage, search, filterStatus]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this order?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/sales-order?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Order deleted");
      fetchOrders();
    } catch {
      toast.error("Failed to delete");
    }
  };

const handleCopyTo = (order, dest) => {
  if (!order) return;
  const dataToStore = {
    ...order,
    salesOrderId: order._id,
    sourceModel: "SalesOrder",               // ✅ capital "SalesOrder" – backend lowercases it later
    items: Array.isArray(order.items) ? order.items : [],
  };
  if (dest === "Delivery") {
    sessionStorage.setItem("deliveryData", JSON.stringify(dataToStore));
    router.push("/admin/delivery-view/new");
  } else if (dest === "Invoice") {
    sessionStorage.setItem("SalesInvoiceData", JSON.stringify(dataToStore));
    router.push("/admin/sales-invoice-view/new");
  }
};

  const downloadSalesOrderTemplate = () => {
    const link = document.createElement("a");
    link.href = "/api/sales-order/template";
    link.download = "sales_order_template.csv";
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
      const ordersData = lines.slice(1).map(line => {
        const values = line.split(",");
        const obj = {};
        headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || ""; });
        return obj;
      });
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/sales-order/bulk", { orders: ordersData }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success(`Uploaded ${res.data.successCount} orders`);
        fetchOrders();
      } else {
        toast.error(res.data.message || "Upload failed");
      }
    } catch {
      toast.error("Invalid CSV file");
    } finally {
      setUploading(false);
    }
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Completed: "bg-emerald-50 text-emerald-600",
      Closed: "bg-emerald-50 text-emerald-600",
      Pending: "bg-amber-50 text-amber-600",
      Draft: "bg-gray-100 text-gray-500",
      Cancelled: "bg-red-50 text-red-500",
      Open: "bg-blue-50 text-blue-600",
    };
    return (
      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
        {status || "—"}
      </span>
    );
  };

  const stats = {
    total: totalRecords,
    completed: orders.filter(o => o.status === "Completed" || o.status === "Closed").length,
    pending: orders.filter(o => o.status === "Pending" || o.status === "Draft").length,
    cancelled: orders.filter(o => o.status === "Cancelled").length,
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Sales Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">{totalRecords} total orders</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadSalesOrderTemplate} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
              <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
              <FaCloudUploadAlt className="text-xs" /> Bulk Upload
              <input type="file" hidden accept=".csv" onChange={handleBulkUpload} disabled={uploading} />
            </label>
            <Link href="/admin/sales-order-view/new">
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
                <FaPlus className="text-xs" /> Create Order
              </button>
            </Link>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total, emoji: "📦", filter: "All" },
            { label: "Completed", value: stats.completed, emoji: "✅", filter: "Completed" },
            { label: "Pending", value: stats.pending, emoji: "⏳", filter: "Pending" },
            { label: "Cancelled", value: stats.cancelled, emoji: "❌", filter: "Cancelled" },
          ].map(s => (
            <div key={s.label} onClick={() => { setFilterStatus(s.filter); setCurrentPage(1); }}
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
                placeholder="Search orders..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "Pending", "Completed", "Cancelled"].map(s => (
                <button key={s} onClick={() => { setFilterStatus(s); setCurrentPage(1); }}
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
                  {["#", "Doc Number", "Customer", "Date", "Status", "Total", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(Math.min(itemsPerPage, 10)).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                         </td>
                      ))}
                     </tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300">
                      <FaFileAlt className="mx-auto text-4xl mb-2 opacity-20" />
                      No orders found
                     </td>
                   </tr>
                ) : (
                  orders.map((o, idx) => (
                    <tr key={o._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">
                        {(currentPage - 1) * itemsPerPage + idx + 1}
                       </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {o.documentNumberOrder || "—"}
                        </span>
                       </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{o.customerName || "—"} </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(o.orderDate || o.postingDate).toLocaleDateString("en-GB")}
                       </td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /> </td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">₹{Number(o.grandTotal || 0).toLocaleString("en-IN")} </td>
                      <td className="px-4 py-3">
                        <RowMenu order={o} onDelete={handleDelete} onCopy={handleCopyTo} />
                       </td>
                     </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-5 space-y-3">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <FaFileAlt className="mx-auto text-4xl mb-2 opacity-20" />
                <p className="text-sm text-gray-300 font-medium">No orders found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {orders.map((o, idx) => (
                  <div key={o._id} className="p-4 hover:bg-indigo-50/20 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                          {o.documentNumberOrder || `#${(currentPage - 1) * itemsPerPage + idx + 1}`}
                        </span>
                        <p className="font-bold text-gray-900 text-sm mt-1.5">{o.customerName}</p>
                      </div>
                      <RowMenu order={o} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </div>
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="text-xs text-gray-400">{new Date(o.orderDate || o.postingDate).toLocaleDateString("en-GB")}</span>
                      <StatusBadge status={o.status} />
                      <span className="font-mono font-bold text-gray-800 text-xs ml-auto">₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t border-gray-100 bg-gray-50/30">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Show</span>
                <select
                  value={itemsPerPage}
                  onChange={handleItemsPerPageChange}
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
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} records
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1
                    ${currentPage === 1
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
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all
                          ${currentPage === pageNum
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "bg-white border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300"}`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1
                    ${currentPage === totalPages
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

function RowMenu({ order, onDelete, onCopy }) {
  const router = useRouter();

  const handleWhatsApp = async () => {
    try {
      const phone = "917738961799";
      if (!order || !order.customerName || !order._id) return toast.error("Missing details");
      const message = `Hello ${order.customerName}, your order #${order.documentNumberOrder || order._id} has been received. Total: ₹${order.grandTotal}.`;
      const doc = new jsPDF();
      doc.text("🧾 Sales Order", 10, 10);
      doc.text(`Order: ${order.documentNumberOrder}`, 10, 20);
      doc.text(`Customer: ${order.customerName}`, 10, 30);
      doc.text(`Total: ₹${order.grandTotal}`, 10, 40);
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], `order-${order._id}.pdf`, { type: "application/pdf" });
      const formData = new FormData();
      formData.append("phone", phone);
      formData.append("message", message);
      formData.append("file", pdfFile);
      const res = await axios.post("/api/whatsapp", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (res.data?.success) toast.success("WhatsApp sent!");
    } catch (error) {
      toast.error("Error sending WhatsApp");
    }
  };

  const actions = [
    { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/sales-order-view/view/${order._id}`) },
    { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/sales-order-view/new?editId=${order._id}`) },
    { icon: <FaCopy />, label: "Copy → Delivery", onClick: () => onCopy(order, "Delivery") },
    { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
    { icon: <FaEnvelope />, label: "Email", onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "order", id: order._id });
          if (res.data.success) toast.success("Email sent!");
        } catch {
          toast.error("Email error");
        }
      }
    },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: handleWhatsApp },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
  ];

  return <ActionMenu actions={actions} />;
}