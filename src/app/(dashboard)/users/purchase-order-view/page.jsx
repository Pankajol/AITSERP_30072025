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
//       router.push("/users/GRN");
//     } else if (destination === "Invoice") {
//       sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(selectedPO));
//       router.push("/users/purchase-invoice");
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
//         <Link href="/users/purchase-order">
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
//                     <Link href={`/users/purchase-order-view/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button */}
//                     <Link href={`/users/purchase-order-view/new?editId=${order._id}`}>
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

import { useState, useEffect, useMemo, useRef,useCallback  } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaSearch,
  FaEnvelope,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
    } else {
      console.warn("Unexpected response:", res.data);
      toast.warning("Unexpected response while fetching orders");
    }
  } catch (error) {
    console.error("Error fetching purchase orders:", error);
    toast.error(
      error.response?.data?.message || "Failed to fetch purchase orders"
    );
  } finally {
    setLoading(false);
  }
}, []);

useEffect(() => {
  fetchOrders();
}, [fetchOrders]);

  // ✅ Search filter
  const displayOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) =>
      (o.supplierName || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

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

  // ✅ Copy to GRN / Invoice
// ✅ Copy to GRN or Purchase Invoice
const handleCopyTo = (order, destination) => {
  if (!order || typeof order !== "object") {
    console.error("Invalid order data:", order);
    return;
  }

  const dataToStore = {
    ...order,
    purchaseOrderId: order._id || "",
    attachments: order.attachments || [], // ✅ Preserve attachments
    items: Array.isArray(order.items) ? order.items : [], // ✅ Ensure items are array
  };

  const key =
    destination === "GRN" ? "grnData" : "purchaseInvoiceData";

  // ✅ Save order details in sessionStorage
  sessionStorage.setItem(key, JSON.stringify(dataToStore));

  // ✅ Redirect user to the target page
  router.push(
    destination === "GRN"
      ? "/users/grn-view/new"
      : "/users/purchaseInvoice-view/new"
  );
};




  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Purchase Orders
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <Link href="/users/purchase-order-view/new" className="sm:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit /> New Order
          </button>
        </Link>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Loading…
        </p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table
              orders={displayOrders}
              onDelete={handleDelete}
              onCopy={handleCopyTo}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {displayOrders.map((o, i) => (
              <Card
                key={o._id}
                order={o}
                idx={i}
                onDelete={handleDelete}
                onCopy={handleCopyTo}
              />
            ))}
            {!displayOrders.length && (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No matching orders
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Desktop Table ================= */
function Table({ orders, onDelete, onCopy }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {["#", "Document No.", "Supplier", "Date", "Status", "Total", ""].map(
            (h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100"
              >
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr
            key={o._id}
            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{o.documentNumberPurchaseOrder}</td>
            <td className="px-4 py-3">{o.supplierName}</td>
            <td className="px-4 py-3">
              {o.postingDate ? new Date(o.postingDate).toLocaleDateString() : ""}
            </td>
            <td className="px-4 py-3">{o.orderStatus}</td>
            <td className="px-4 py-3">₹{o.grandTotal}</td>
            <td className="px-4 py-3">
              <RowMenu order={o} onDelete={onDelete} onCopy={onCopy} />
            </td>
          </tr>
        ))}
        {!orders.length && (
          <tr>
            <td
              colSpan={7}
              className="text-center py-6 text-gray-500 dark:text-gray-400"
            >
              No orders found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ================= Mobile Card ================= */
function Card({ order, idx, onDelete, onCopy }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">
          #{idx + 1} • {order.documentNumberPurchaseOrder}
        </div>
        <RowMenu order={order} onDelete={onDelete} onCopy={onCopy} isMobile />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
        Supplier: {order.supplierName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Date: {order.postingDate ? new Date(order.postingDate).toLocaleDateString() : ""}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Status: {order.orderStatus}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Total: ₹{order.grandTotal}
      </p>
    </div>
  );
}

/* ================= Dropdown Menu ================= */
function RowMenu({ order, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const router = useRouter();

 // ✅ Actions array for Purchase Order
  const actions = [
    {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/users/purchase-order-view/view/${order._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () => router.push(`/users/purchase-order-view/new?editId=${order._id}`),
    },
    { icon: <FaCopy />, label: "Copy → GRN", onClick: () => onCopy(order, "GRN") },
    { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "purchase-order", id: order._id });
          if (res.data.success) toast.success("Email sent successfully!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch (error) {
          toast.error("Error sending email.");
        }
      },
    },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
  ];

  return (
    <ActionMenu actions={actions} />
  )
}
