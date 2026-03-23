"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";
import {
  FaEdit, FaTrash, FaCopy, FaEye,
  FaEnvelope, FaWhatsapp, FaSearch, FaPlus,
  FaFileAlt, FaCloudUploadAlt, FaDownload
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/sales-order", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      }
    } catch (error) {
      toast.error("Error fetching sales orders");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search.trim() ||
        (o.customerName || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.documentNumberOrder || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || o.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this order?")) return;
    try {
      await axios.delete(`/api/sales-order/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      toast.success("Order deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCopyTo = (order, dest) => {
    if (dest === "Delivery") {
      const data = { ...order, sourceId: order._id, sourceModel: "delivery" };
      sessionStorage.setItem("deliveryData", JSON.stringify(data));
      router.push("/admin/delivery-view/new");
    } else {
      const data = { ...order, sourceId: order._id, sourceModel: "salesorder" };
      sessionStorage.setItem("SalesInvoiceData", JSON.stringify(data));
      router.push("/admin/sales-invoice-view/new");
    }
  };

  const downloadSalesOrderTemplate = () => {
    const url = "/api/sales-order/template";
    const link = document.createElement("a");
    link.href = url;
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
      const jsonData = parseCSV(text);
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/sales-order/bulk", { orders: jsonData }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        toast.success(`Upload complete: ${res.data.successCount} success`);
        fetchOrders();
      }
    } catch (err) {
      toast.error("Invalid CSV file");
    } finally {
      setUploading(false);
    }
  };

  const parseCSV = (text) => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",");
    return lines.slice(1).map((line) => {
      const values = line.split(",");
      const obj = {};
      headers.forEach((h, i) => { obj[h.trim()] = values[i]?.trim() || ""; });
      return obj;
    });
  };

  // ── Stats ──
  const stats = {
    total: orders.length,
    completed: orders.filter(o => o.status === "Completed" || o.status === "Closed").length,
    pending: orders.filter(o => o.status === "Pending" || o.status === "Draft").length,
    cancelled: orders.filter(o => o.status === "Cancelled").length,
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Completed: "bg-emerald-50 text-emerald-600",
      Closed: "bg-emerald-50 text-emerald-600",
      Pending: "bg-amber-50 text-amber-600",
      Draft: "bg-gray-100 text-gray-500",
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
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Sales Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">{orders.length} active orders</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadSalesOrderTemplate} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm">
               <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-all shadow-sm cursor-pointer">
               <FaCloudUploadAlt className="text-xs" /> Bulk Upload
               <input type="file" hidden accept=".csv" onChange={handleBulkUpload} />
            </label>
            <Link href="/admin/sales-order-view/new">
              <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
                <FaPlus className="text-xs" /> Create Order
              </button>
            </Link>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total", value: stats.total, emoji: "📦", filter: "All" },
            { label: "Completed", value: stats.completed, emoji: "✅", filter: "Completed" },
            { label: "Pending", value: stats.pending, emoji: "⏳", filter: "Pending" },
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

        {/* ── Table Card ── */}
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
              {["All", "Pending", "Completed", "Cancelled"].map(s => (
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
                  <tr><td colSpan={7} className="text-center py-16 text-gray-300">No orders found</td></tr>
                ) : filtered.map((o, idx) => (
                  <tr key={o._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {o.documentNumberOrder || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{o.customerName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(o.postingDate || o.orderDate).toLocaleDateString("en-GB")}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    <td className="px-4 py-3 font-mono font-bold text-gray-800">₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3">
                      <RowMenu order={o} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {filtered.map((o, idx) => (
              <div key={o._id} className="p-4 hover:bg-indigo-50/20 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{o.documentNumberOrder || `#${idx + 1}`}</span>
                    <p className="font-bold text-gray-900 text-sm mt-1.5">{o.customerName}</p>
                  </div>
                  <RowMenu order={o} onDelete={handleDelete} onCopy={handleCopyTo} />
                </div>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="text-xs text-gray-400">{new Date(o.postingDate || o.orderDate).toLocaleDateString("en-GB")}</span>
                  <StatusBadge status={o.status} />
                  <span className="font-mono font-bold text-gray-800 text-xs ml-auto">₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}</span>
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

      const res = await axios.post("/api/whatsapp", formData, { headers: { "Content-Type": "multipart/form-data" } });
      if (res.data?.success) toast.success("WhatsApp sent!");
    } catch (err) {
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
        } catch { toast.error("Email error"); }
      }
    },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: handleWhatsApp },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
  ];

  return <ActionMenu actions={actions} />;
}

// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaCopy, FaEye, FaEnvelope, FaWhatsapp } from "react-icons/fa";

// export default function SalesOrderList() {
//   const [orders, setOrders] = useState([]);
//   const router = useRouter();

// const fetchOrders = async () => {
//   try {
//     const res = await axios.get("/api/sales-order");
//     console.log("Fetched orders:", res.data.data);
//     //Expecting an object with a success flag and a data array.
//     if (res.data.success) {
//       setOrders(res.data);
//     }
//   setOrders(res.data);
//   } catch (error) {
//     console.error("Error fetching sales orders:", error);
//   }
// };

// useEffect(() => {
//   fetchOrders();
// }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this order?")) return;
//     try {
//       const res = await axios.delete(`/api/sales-order/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchOrders();
//       }
//     } catch (error) {
//       console.error("Error deleting sales order:", error);
//       alert("Failed to delete order");
//     }
//   };

//   const handleCopyTo = (order, destination) => {
//     // sessionStorage.setItem("salesOrderData", JSON.stringify(order));
//     //  router.push("/admin/sales-invoice");

//     if (destination === "Delivery") {
//       const orderWithId = { ...order, salesOrderId: order._id,sourceModel: "SalesOrder" };
//       sessionStorage.setItem("deliveryData", JSON.stringify(order));
//       router.push("/admin/delivery-view/new");
//     }else if (destination === "Invoice") {
//       const invoiceWithId = {...order,salesOrderId:order._id, sourceModel: "SalesOrder" }
//       sessionStorage.setItem("SalesInvoiceData", JSON.stringify(invoiceWithId));
//       router.push("/admin/sales-invoice-view/new");
//     }
//     // else if (destination === "Debit-Note") {
//     //   sessionStorage.setItem("debitNoteData", JSON.stringify(order));
//     //   router.push("/admin/debit-note");
//     // }

//   };

//   const CopyToDropdown = ({ handleCopyTo, order }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const toggleDropdown = () => setIsOpen((prev) => !prev);
//     const onSelect = (option) => {
//       handleCopyTo(order, option);
//       setIsOpen(false);
//     };
//     return (
//       <div className="relative inline-block text-left">
//         <button
//           onClick={toggleDropdown}
//           className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
//           title="Copy To"
//         >
//           <FaCopy className="mr-1" />
//           <span className="hidden sm:inline"></span>
//         </button>
//         {isOpen && (
//           <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
//             <div className="py-1">
//               <button
//                 onClick={() => onSelect("Delivery")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 Delivery
//               </button>
//               <button
//                 onClick={() => onSelect("Invoice")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 Invoice
//               </button>

//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">Sales Orders</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/sales-order-view/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Order
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Ref Number</th>
//               <th className="py-3 px-4 border-b">Customer Name</th>
//               <th className="py-3 px-4 border-b">Order Date</th>
//               <th className="py-3 px-4 border-b">Status</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order) => (
//               <tr key={order._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{order.refNumber}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.customerName}</td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.postingDate ?  new Date(order.postingDate).toLocaleDateString("en-GB")
//                     : ""}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">{order.status}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.grandTotal}</td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     {/* View Button */}
//                     <Link href={`/admin/sales-order-view/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button */}
//                   <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
//                         title="Edit"
//                       >
//                         <FaEdit />
//                       </button>
//                     </Link>
//                     {/* Delete Button */}
//                     <button
//                       onClick={() => handleDelete(order._id)}
//                       className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
//                       title="Delete"
//                     >
//                       <FaTrash />
//                     </button>
//                     {/* Copy To Dropdown */}
//                     <CopyToDropdown handleCopyTo={handleCopyTo} order={order} />
//                     {/* Email Button */}
//                     <Link href={`/admin/sales-order-email/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
//                         title="Email Order"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     {/* WhatsApp Button */}
//                     <Link href={`/admin/sales-order-whatsapp/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
//                         title="WhatsApp Order"
//                       >
//                         <FaWhatsapp />
//                       </button>
//                     </Link>
//                   </div>
//                 </td>
//               </tr>
//             ))}
//             {orders.length === 0 && (
//               <tr>
//                 <td colSpan="6" className="text-center py-4">
//                   No purchase orders found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
