"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import jsPDF from "jspdf";

import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

/* ================================================================= */
/*  Sales Order List                                                 */
/* ================================================================= */
export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  /* ---------- fetch orders ---------- */
  

  //   const fetchOrders = async () => {
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
  //   } finally {
  //       setLoading(false);
  //     }
  // };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/sales-order", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Fetched orders:", res.data?.data);

      if (res.data?.success && Array.isArray(res.data.data)) {
        setOrders(res.data.data);
      } else {
        console.warn("Unexpected response:", res.data);
      }
    } catch (error) {
      console.error(
        "Error fetching sales orders:",
        error.response?.data || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ---------- fetch orders ---------- */
  // useEffect(() => {
  //   (async () => {
  //     try {
  //         const res = await axios.get("/api/sales-order");
  //         if (res.data.success) {
  //       setOrders(res.data);
  //     }
  //     } catch (err) {
  //       console.error('Error fetching orders:', err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   })();
  // }, []);

  /* ---------- filtered list ---------- */
  const displayOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) =>
      (o.customerName || "").toLowerCase().includes(q)
    );
  }, [orders, search]);

  /* ---------- row actions ---------- */
  const handleDelete = async (id) => {
    if (!confirm("Delete this order?")) return;
    try {
      await axios.delete(`/api/sales-order/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch {
      alert("Failed to delete");
    }
  };


  const downloadSalesOrderTemplate = () => {
  try {
    // If your template route is /api/sales-order/template
    const url = "/api/sales-order/template";

    // Create and auto-click a hidden link
    const link = document.createElement("a");
    link.href = url;
    link.download = "sales_order_template.csv"; // fallback filename
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (err) {
    console.error("Template download failed:", err);
    toast.error("Failed to download template");
  }
};

const handleBulkUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  setUploading(true);

  try {
    const text = await file.text();
    const jsonData = parseCSV(text); // make sure parseCSV() exists
    const token = localStorage.getItem("token");

    const res = await axios.post(
      "/api/sales-order/bulk",
      { orders: jsonData },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = res.data;

    if (result.success) {
      toast.success("Bulk Upload Completed");

      toast.info(
        `Success: ${result.successCount || 0} | Failed: ${result.failCount || 0}`
      );

      fetchOrders(); // refresh the table
    } else {
      toast.error("Bulk upload failed");
    }
  } catch (err) {
    toast.error("Invalid CSV file");
  }

  setUploading(false);
};


const parseCSV = (text) => {
  const lines = text.trim().split("\n");
  const headers = lines[0].split(",");

  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const obj = {};
    headers.forEach((h, i) => {
      obj[h.trim()] = values[i]?.trim() || "";
    });
    return obj;
  });
};



  const handleCopyTo = (order, dest) => {
    if (dest === "Delivery") {
      const data = {
        ...order,
        sourceId: order._id, // ✅ Add correct field
        sourceModel: "delivery", // ✅ Already good
      };
      sessionStorage.setItem("deliveryData", JSON.stringify(data));
      router.push("/admin/delivery-view/new");
    } else {
      const data = {
        ...order,
        sourceId: order._id, // ✅ Add correct field
        sourceModel: "salesorder", // ✅ Already good
      };
      sessionStorage.setItem("SalesInvoiceData", JSON.stringify(data));
      router.push("/admin/sales-invoice-view/new");
    }
  };

  /* ================================================================= */
  /*  UI                                                               */
  /* ================================================================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Sales Orders
      </h1>

      {/* toolbar */}
   <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
  
  {/* 🔍 Search Bar */}
  <div className="relative flex-1 max-w-md">
    <FaSearch className="absolute top-3 left-3 text-gray-400" />
    <input
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search customer…"
      className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 
        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 
        focus:ring-2 focus:ring-blue-500 outline-none"
    />
  </div>

  {/* 📥 Download Template */}
<button
  onClick={downloadSalesOrderTemplate}
  className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 shadow sm:w-auto w-full"
>
  📄 Download Template
</button>


  {/* 📤 Bulk Upload */}
  <label className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-500 shadow cursor-pointer sm:w-auto w-full">
    📥 Bulk Upload
    <input
      type="file"
      hidden
      accept=".csv"
      onChange={handleBulkUpload}
    />
  </label>

  {/* ➕ Create New Order */}
  <Link href="/admin/sales-order-view/new" className="sm:w-auto w-full">
    <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
      <FaEdit /> New Order
    </button>
  </Link>
</div>

      {/* table / cards */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table
              orders={displayOrders}
              onDelete={handleDelete}
              onCopy={handleCopyTo}
            />
          </div>

          {/* mobile cards */}
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

/* ================================================================= */
/*  Desktop Table                                                    */
/* ================================================================= */
function Table({ orders, onDelete, onCopy }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {[
            "#",
            "Document Number.",
            "Customer",
            "Date",
            "Status",
            "Total",
            "",
          ].map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr
            key={o._id}
            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{o.documentNumberOrder}</td>
            <td className="px-4 py-3">{o.customerName}</td>
            <td className="px-4 py-3">
              {new Date(o.postingDate || o.orderDate).toLocaleDateString(
                "en-GB"
              )}
            </td>

            <td className="px-4 py-3">{o.status}</td>
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

/* ================================================================= */
/*  Mobile Card                                                      */
/* ================================================================= */
function Card({ order, idx, onDelete, onCopy }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">
          #{idx + 1} • {order.ducumentNumber}
        </div>
        <RowMenu order={order} onDelete={onDelete} onCopy={onCopy} isMobile />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
        Customer: {order.customerName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Date:{" "}
        {new Date(order.postingDate || order.orderDate).toLocaleDateString(
          "en-GB"
        )}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Status: {order.status}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Total: ₹{order.grandTotal}
      </p>
    </div>
  );
}

/* ================================================================= */
/*  Row Action Menu (dropdown)                                       */
/* ================================================================= */
function RowMenu({ order, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();

  /** ✅ Actions Array */
  const actions = [
    {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/admin/sales-order-view/view/${order._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () =>
        router.push(`/admin/sales-order-view/new?editId=${order._id}`),
    },
    {
      icon: <FaCopy />,
      label: "Copy → Delivery",
      onClick: () => onCopy(order, "Delivery"),
    },
    {
      icon: <FaCopy />,
      label: "Copy → Invoice",
      onClick: () => onCopy(order, "Invoice"),
    },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", {
            type: "order",
            id: order._id,
          });
          if (res.data.success) toast.success("Email sent successfully!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },

// {
//   icon: <FaWhatsapp />,
//   label: "WhatsApp",
//   onClick: async () => {
//     try {
//       const phone = "917738961799"; // ✅ include country code (no + or spaces)

//       if (!order || !order.customerName || !order._id || !order.grandTotal) {
//         toast.error("Missing order details!");
//         console.warn("Invalid order object:", order);
//         return;
//       }

//       // ✅ Create message text
//       const message = `Hello ${order.customerName}, your order #${order._id} has been received successfully. The total amount is ₹${order.grandTotal}. Thank you for shopping with us!`;

//       // ✅ Send API request
//       const res = await axios.post("/api/whatsapp", {
//         phone,
//         message, // ✅ sending message now
//       });

//       if (res.data?.success) {
//         toast.success("✅ WhatsApp message sent successfully!");
//       } else {
//         console.error("❌ WhatsApp send failed:", res.data);
//         toast.error(res.data?.message || "Failed to send WhatsApp message.");
//       }
//     } catch (err) {
//       console.error("❌ Error sending WhatsApp:", err.response?.data || err.message);
//       toast.error("Error sending WhatsApp message.");
//     }
//   },
// }


 {
  icon: <FaWhatsapp />,
  label: "WhatsApp",
  onClick: async () => {
    try {
      const phone = "917738961799"; // ✅ include country code (no + or spaces)

      if (!order || !order.customerName || !order._id || !order.grandTotal) {
        toast.error("Missing order details!");
        console.warn("Invalid order object:", order);
        return;
      }

      // ✅ 1. Create message text
      const message = `Hello ${order.customerName}, your order #${order._id} has been received successfully. The total amount is ₹${order.grandTotal}. Thank you for shopping with us!`;

      // ✅ 2. Generate a PDF dynamically
      const doc = new jsPDF();
      doc.text("🧾 Order Invoice", 10, 10);
      doc.text(`Order ID: ${order._id}`, 10, 20);
      doc.text(`Customer: ${order.customerName}`, 10, 30);
      doc.text(`Total: ₹${order.grandTotal}`, 10, 40);
      doc.text("Thank you for shopping with us!", 10, 60);

      // Convert PDF to Blob
      const pdfBlob = doc.output("blob");
      const pdfFile = new File([pdfBlob], `order-${order._id}.pdf`, { type: "application/pdf" });

      // ✅ 3. Create FormData for sending to backend
      const formData = new FormData();
      formData.append("phone", phone);
      formData.append("message", message);
      formData.append("file", pdfFile);

      // ✅ 4. Send request to your backend
      const res = await axios.post("/api/whatsapp", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data?.success) {
        toast.success("✅ WhatsApp message with PDF sent successfully!");
      } else {
        console.error("❌ WhatsApp send failed:", res.data);
        toast.error(res.data?.message || "Failed to send WhatsApp message.");
      }
    } catch (err) {
      console.error("❌ Error sending WhatsApp:", err.response?.data || err.message);
      toast.error("Error sending WhatsApp message.");
    }
  },
}









,

    {
      icon: <FaTrash />,
      label: "Delete",
      color: "text-red-600",
      onClick: () => onDelete(order._id),
    },
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
