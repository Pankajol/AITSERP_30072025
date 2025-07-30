'use client';

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaEllipsisV,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function SalesDeliveryList() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/sales-delivery");
      setOrders(res.data || []);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await axios.delete(`/api/sales-delivery/${id}`);
      if (res.data.success) {
        setOrders((prev) => prev.filter((o) => o._id !== id));
      }
    } catch (error) {
      alert("Failed to delete order");
    }
  };

  const handleCopyTo = (order, type) => {
    const data = { ...order, sourceId: order._id, sourceModel: "delivery" };
    if (type === "GRN") {
      sessionStorage.setItem("grnData", JSON.stringify(order));
      router.push("/admin/GRN");
    } else if (type === "Invoice") {
      sessionStorage.setItem("SalesQuoteData", JSON.stringify(data));
      router.push("/admin/sales-invoice-view/new");
    }
  };

  const filteredOrders = useMemo(() => {
    if (!search.trim()) return orders;
    return orders.filter((o) =>
      (o.customerName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, orders]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Sales Delivery </h1>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="relative max-w-sm w-full">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <Link href="/admin/delivery-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit className="mr-2" />
            Create New Delivery
          </button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  {["#","Document NO." ,"Customer", "Date", "Remarks", "Total", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{idx + 1}.</td>
                    <td className="px-4 py-3">{order.documentNumberDelivery}</td>
                    <td className="px-4 py-3">{order.customerName}</td>
                    <td className="px-4 py-3">{new Date(order.orderDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3">{order.remarks}</td>
                    <td className="px-4 py-3">₹ {order.grandTotal}</td>
                    <td className="px-4 py-3">
                      <RowMenu order={order} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
                {!filteredOrders.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-gray-500">
                      No deliveries found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredOrders.map((order, idx) => (
              <div key={order._id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">#{idx + 1} - {order.documentNumberDelivery}</div>
                  
                  <RowMenu order={order} onDelete={handleDelete} onCopy={handleCopyTo} isMobile />
                </div>
               <div><strong>Customer:</strong> {order.customerName}</div>
                <div><strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</div>
                <div><strong>Remarks:</strong> {order.remarks}</div>
                <div><strong>Total:</strong> ₹ {order.grandTotal}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// function RowMenu({ order, onDelete, onCopy }) {
//   const [open, setOpen] = useState(false);
//   const menuRef = useRef(null);
//   const btnRef = useRef(null);

//   const actions = [
//     { icon: <FaEye />, label: "View", onClick: () => (window.location.href = `/admin/delivery-view/${order._id}`) },
//     { icon: <FaEdit />, label: "Edit", onClick: () => (window.location.href = `/admin/delivery-view/new?editId=${order._id}`) },
//     { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
   
//     { icon: <FaEnvelope />, label: "Email", onClick: () => (window.location.href = `/admin/delivery-view/${order._id}/send-email`) },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => (window.location.href = `/admin/delivery-view/${order._id}/send-whatsapp`) },
//     { icon: <FaTrash />, label: "Delete", onClick: () => onDelete(order._id), color: "text-red-600" },
//   ];

//   // Close on outside click
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (menuRef.current && !menuRef.current.contains(e.target) && !btnRef.current.contains(e.target)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <div className="relative inline-block text-left" ref={menuRef}>
//       <button
//         ref={btnRef}
//         onClick={() => setOpen((p) => !p)}
//         className="p-2 text-gray-500 hover:bg-gray-200 rounded-full focus:ring-2 focus:ring-blue-500"
//       >
//         <FaEllipsisV size={16} />
//       </button>
//       {open && (
//         <div  className="fixed z-50 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg">
//           {actions.map((a, i) => (
//             <button
//               key={i}
//               onClick={() => {
//                 a.onClick();
//                 setOpen(false);
//               }}
//               className={`flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 ${a.color || ""}`}
//             >
//               {a.icon} {a.label}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }




// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash, FaCopy, FaEye , FaEnvelope, FaWhatsapp } from "react-icons/fa";

// export default function SalesDeliveryList() {
//   const [orders, setOrders] = useState([]);
//   const router = useRouter();

//   const fetchOrders = async () => {
//     try {
//       const res = await axios.get("/api/sales-delivery");
//       console.log("Fetched orders:", res.data);
//       // Expecting an object with a success flag and a data array.
//     //   if (res.data.success) {
//     //     setOrders(res.data);
//     //   }
//     setOrders(res.data);
//     } catch (error) {
//       console.error("Error fetching sales delivery:", error);
//     }
//   };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this order?")) return;
//     try {
//       const res = await axios.delete(`/api/sales-delivery/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchOrders();
//       }
//     } catch (error) {
//       console.error("Error deleting sales delivery:", error);
//       alert("Failed to delete order");
//     }
//   };

//   const handleCopyTo = (order, destination) => {
//     if (destination === "GRN") {
//       sessionStorage.setItem("grnData", JSON.stringify(order));
//       router.push("/admin/GRN");
//     } else if (destination === "Invoice") {
//       const invoiceWithId = {...order,sourceId:order._id, sourceModel: "Delivery" }
//       sessionStorage.setItem("InvoiceData", JSON.stringify(invoiceWithId));
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
//       <h1 className="text-4xl font-bold mb-6 text-center">Sales Delivery</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/delivery-view/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Delivery
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Customer Code</th>
//               <th className="py-3 px-4 border-b">Customer Name</th>
//               <th className="py-3 px-4 border-b">Order Date</th>
//               <th className="py-3 px-4 border-b">Remarks</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order) => (
//               <tr key={order._id} className="hover:bg-gray-50 transition-colors">
//                 <td className="py-3 px-4 border-b text-center">{order.customerCode}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.customerName}</td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : ""}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">{order.remarks}</td>
//                 <td className="py-3 px-4 border-b text-center">{order.grandTotal}</td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     {/* View Button */}
//                     <Link href={`/admin/delivery-view/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button */}
//                     <Link href={`/admin/delivery-view/new?editId=${order._id}`}>
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
//                     <Link href={`/admin/delivery-view/${order._id}/send-email`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
//                         title="Send Email"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     {/* WhatsApp Button */}
//                     <Link href={`/admin/delivery-view/${order._id}/send-whatsapp`}>
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


function RowMenu ({ order, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();

  const actions = [
    { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/delivery-view/${order._id}`) },
    { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/delivery-view/new?editId=${order._id}`) },
    { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "delivery", id: order._id });
          if (res.data.success) toast.success("Email sent successfully!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/delivery-whatsapp/${order._id}`) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
  ];

 return (
    <ActionMenu actions={actions} />
  );
}

