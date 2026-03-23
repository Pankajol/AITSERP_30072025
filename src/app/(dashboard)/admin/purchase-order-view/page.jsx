// "use client"; 
// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaCopy, FaEye } from "react-icons/fa";

// export default function PurchaseOrderList() {
//   const [orders, setOrders] = useState([]);
//   const router = useRouter();

//   const fetchOrders = async () => {
//     try {
//       const res = await axios.get("/api/purchase-order");
//       console.log("Fetched orders:", res.data);
//       setOrders(res.data);
//     } catch (error) {
//       console.error("Error fetching purchase orders:", error);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this order?")) return;
//     try {
//       const res = await axios.delete(`/api/purchase-order/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchOrders();
//       }
//     } catch (error) {
//       console.error("Error deleting purchase order:", error);
//       alert("Failed to delete order");
//     }
//   };

//   // This function receives the selected Purchase Order and destination.
//   const handleCopyTo = (selectedPO, destination) => {
//     if (destination === "GRN") {
//       sessionStorage.setItem("purchaseOrderData", JSON.stringify(selectedPO));
//       router.push("/admin/GRN");
//     } else if (destination === "Invoice") {
//       sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(selectedPO));
//       router.push("/admin/purchase-invoice");
//     }
//   };

//   // Updated CopyToDropdown component.
//   const CopyToDropdown = ({ handleCopyTo, selectedPO }) => {
//     const [isOpen, setIsOpen] = useState(false);
//     const toggleDropdown = () => setIsOpen((prev) => !prev);
//     const onSelect = (destination) => {
//       handleCopyTo(selectedPO, destination);
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
//                 onClick={() => onSelect("GRN")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 GRN
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
//       <h1 className="text-4xl font-bold mb-6 text-center">Purchase Orders</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/purchase-order">
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
//               <th className="py-3 px-4 border-b">Supplier Name</th>
//               <th className="py-3 px-4 border-b">Posting Date</th>
//               <th className="py-3 px-4 border-b">Status</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order) => (
//               <tr key={order._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{order.refNumber}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.supplierName}</td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.postingDate ? new Date(order.postingDate).toLocaleDateString() : ""}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">{order.orderStatus}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.grandTotal}</td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     {/* View Button */}
//                     <Link href={`/admin/purchase-order-view/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button */}
//                     <Link href={`/admin/purchase-order-view/new?editId=${order._id}`}>
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
//                     <CopyToDropdown handleCopyTo={handleCopyTo} selectedPO={order} />
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

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaSearch,
  FaEnvelope,
  FaPlus,
  FaShoppingCart,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  // ✅ Fetch Orders
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized! Please log in.");
        return;
      }

      const res = await axios.get("/api/purchase-order", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching purchase orders:", error);
      toast.error(error.response?.data?.message || "Failed to fetch purchase orders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ✅ Search & Status filter
  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = !search.trim() ||
        (o.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
        (o.documentNumberPurchaseOrder || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || o.orderStatus === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  // ✅ Stats Calculation
  const stats = {
    total: orders.length,
    open: orders.filter(o => o.orderStatus === "Open" || o.orderStatus === "Pending").length,
    closed: orders.filter(o => o.orderStatus === "Closed" || o.orderStatus === "Completed").length,
    totalAmount: orders.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0),
  };

  // ✅ Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this purchase order?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/purchase-order/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders((prev) => prev.filter((o) => o._id !== id));
      toast.success("Deleted successfully");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ✅ Copy to GRN or Purchase Invoice
  const handleCopyTo = (order, destination) => {
    if (!order) return;
    const dataToStore = {
      ...order,
      purchaseOrderId: order._id || "",
      attachments: order.attachments || [],
      items: Array.isArray(order.items) ? order.items : [],
    };

    const key = destination === "GRN" ? "grnData" : "purchaseInvoiceData";
    sessionStorage.setItem(key, JSON.stringify(dataToStore));

    router.push(destination === "GRN" ? "/admin/grn-view/new" : "/admin/purchaseInvoice-view/new");
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Open: "bg-blue-50 text-blue-600",
      Pending: "bg-amber-50 text-amber-600",
      Completed: "bg-emerald-50 text-emerald-600",
      Closed: "bg-emerald-50 text-emerald-600",
      Cancelled: "bg-red-50 text-red-500",
      Draft: "bg-gray-100 text-gray-500",
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
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Orders</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage procurement and supplier orders</p>
          </div>
          <Link href="/admin/purchase-order-view/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              <FaPlus className="text-xs" /> New Order
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Orders", value: stats.total, emoji: "🛒", filter: "All" },
            { label: "Open/Pending", value: stats.open, emoji: "⏳", filter: "Open" },
            { label: "Closed", value: stats.closed, emoji: "✅", filter: "Closed" },
            { label: "Total PO Value", value: `₹${stats.totalAmount.toLocaleString("en-IN")}`, emoji: "💰", filter: "All", noFilter: true },
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

        {/* ── Main Table Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100">
          
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search supplier or doc no..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Open", "Pending", "Closed"].map(s => (
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
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-20">
                      <FaShoppingCart className="mx-auto text-4xl text-gray-100 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No purchase orders found</p>
                    </td>
                  </tr>
                ) : filtered.map((o, idx) => (
                  <tr key={o._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {o.documentNumberPurchaseOrder || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">{o.supplierName || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {o.postingDate ? new Date(o.postingDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={o.orderStatus} /></td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-800">
                       ₹{Number(o.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4">
                      <RowMenu order={o} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((o, idx) => (
              <div key={o._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {o.documentNumberPurchaseOrder || `#${idx + 1}`}
                  </span>
                  <RowMenu order={o} onDelete={handleDelete} onCopy={handleCopyTo} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{o.supplierName}</h3>
                <div className="flex justify-between items-end mt-3">
                  <div className="space-y-1">
                    <StatusBadge status={o.orderStatus} />
                    <p className="text-[10px] text-gray-400">{o.postingDate ? new Date(o.postingDate).toLocaleDateString() : ""}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(o.grandTotal || 0).toLocaleString()}</span>
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

  const handleEmail = async () => {
    try {
      const res = await axios.post("/api/email", { type: "purchase-order", id: order._id });
      if (res.data.success) toast.success("Email sent successfully!");
      else toast.error(res.data.message || "Failed to send email.");
    } catch {
      toast.error("Error sending email.");
    }
  };

  const actions = [
    { icon: <FaEye />, label: "View Order", onClick: () => router.push(`/admin/purchase-order-view/view/${order._id}`) },
    { icon: <FaEdit />, label: "Edit Order", onClick: () => router.push(`/admin/purchase-order-view/new?editId=${order._id}`) },
    { icon: <FaCopy />, label: "Copy → GRN", onClick: () => onCopy(order, "GRN") },
    { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
    { icon: <FaEnvelope />, label: "Email PDF", onClick: handleEmail },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
  ];

  return <ActionMenu actions={actions} />;
}