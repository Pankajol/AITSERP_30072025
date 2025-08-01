'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaPrint,
  FaSearch,
} from 'react-icons/fa';
import ActionMenu from '@/components/ActionMenu';

/* ================================================================= */
/*  Sales Invoice List                                               */
/* ================================================================= */
export default function SalesInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const router = useRouter();

  /* ---------- fetch invoices ---------- */
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // If you protect the route with auth, include the token
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await axios.get('/api/sales-invoice', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
        console.log('Fetched invoices:', res.data.data);
      } else if (Array.isArray(res.data)) {
        // fallback if API directly returns an array
        setInvoices(res.data);
        console.log('Fetched invoices (array response):', res.data);
      } else {
        console.warn('Unexpected response:', res.data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  /* ---------- filtered list ---------- */
  const displayInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((inv) => (inv.customerName || '').toLowerCase().includes(q));
  }, [invoices, search]);

  /* ---------- actions ---------- */
  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await axios.delete(`/api/sales-invoice/${id}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
    } catch {
      alert('Failed to delete');
    }
  };

  const handleCopyTo = (invoice, dest) => {
    if (dest === 'Credit') {
      sessionStorage.setItem('CreditData', JSON.stringify(invoice));
      router.push('/admin/credit-memo');
    }
  };

  /* ================================================================= */
  /*  UI                                                               */
  /* ================================================================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Sales Invoices
      </h1>

      {/* toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <Link href="/admin/sales-invoice-view/new" className="sm:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit /> New Invoice
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
            <Table invoices={displayInvoices} onDelete={handleDelete} onCopy={handleCopyTo} />
          </div>

          {/* mobile cards */}
          <div className="md:hidden space-y-4">
            {displayInvoices.map((inv, i) => (
              <Card
                key={inv._id}
                invoice={inv}
                idx={i}
                onDelete={handleDelete}
                onCopy={handleCopyTo}
              />
            ))}
            {!displayInvoices.length && (
              <p className="text-center text-gray-500 dark:text-gray-400">No matching invoices</p>
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
function Table({ invoices, onDelete, onCopy }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {['#', 'Documents No.', 'Customer', 'Date', 'Status', 'Total', ''].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv, i) => (
          <tr key={inv._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{inv.invoiceNumber }</td>
            <td className="px-4 py-3">{inv.customerName}</td>
            <td className="px-4 py-3">{new Date(inv.orderDate || inv.postingDate).toLocaleDateString('en-GB')}</td>
            <td className="px-4 py-3">{inv.status}</td>
            <td className="px-4 py-3">₹{inv.grandTotal}</td>
            <td className="px-4 py-3">
              <RowMenu invoice={inv} onDelete={onDelete} onCopy={onCopy} />
            </td>
          </tr>
        ))}
        {!invoices.length && (
          <tr>
            <td colSpan={6} className="text-center py-6 text-gray-500 dark:text-gray-400">
              No invoices found.
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
function Card({ invoice, idx, onDelete, onCopy }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">
          #{idx + 1} • {invoice.invoiceNumber}
        </div>
        <RowMenu invoice={invoice} onDelete={onDelete} onCopy={onCopy} isMobile />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Customer: {invoice.customerName}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Date: {new Date(invoice.orderDate || invoice.postingDate).toLocaleDateString('en-GB')}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Status: {invoice.status}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Total: ₹{invoice.grandTotal}</p>
    </div>
  );
}

/* ================================================================= */
/*  Row Action Menu (dropdown)                                       */
/* ================================================================= */
// function RowMenu({ invoice, onDelete, onCopy }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);

//   /* --- find button coords for fixed menu --- */
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   useEffect(() => {
//     if (open && btnRef.current) {
//       const { bottom, right } = btnRef.current.getBoundingClientRect();
//       setCoords({ top: bottom + 8, left: right - 192 }); // menu width
//     }
//   }, [open]);

//   const MenuItem = ({ icon, label, onClick, color = '' }) => (
//     <button
//       onClick={() => {
//         onClick();
//         setOpen(false);
//       }}
//       className="flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
//     >
//       <span className={`${color}`}>{icon}</span> {label}
//     </button>
//   );

//   return (
//     <>
//       <button
//         ref={btnRef}
//         onClick={() => setOpen(!open)}
//         className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full focus:ring-2 focus:ring-blue-500"
//       >
//         <FaEllipsisV size={16} />
//       </button>

//       {open && (
//         <div
//           style={{ top: coords.top, left: coords.left }}
//           className="fixed z-50 w-48 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded shadow-lg"
//         >
//           <MenuItem
//             icon={<FaEye />}
//             label="View"
//             onClick={() => (window.location.href = `/admin/sales-invoice-view/${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaEdit />}
//             label="Edit"
//             onClick={() => (window.location.href = `/admin/sales-invoice-view/new?editId=${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaCopy />}
//             label="Copy → Credit"
//             onClick={() => onCopy(invoice, 'Credit')}
//           />
//           <MenuItem
//             icon={<FaEnvelope />}
//             label="Email"
//             onClick={() => (window.location.href = `/admin/email/${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaWhatsapp />}
//             label="WhatsApp"
//             onClick={() => (window.location.href = `/admin/whatsapp/${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaPrint />}
//             label="Print"
//             onClick={() => (window.location.href = `/admin/sales-invoice-print/${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaTrash />}
//             label="Delete"
//             color="text-red-600"
//             onClick={() => onDelete(invoice._id)}
//           />
//         </div>
//       )}
//     </>
//   );
// }



// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import {
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaPrint,
// } from "react-icons/fa";

// export default function PurchaseOrderList() {
//   const [orders, setOrders] = useState([]);
//   const router = useRouter();

//   const fetchOrders = async () => {
//     try {
//       const res = await axios.get("/api/sales-invoice");
//       // console.log("Fetched orders:", res.data.data);
//       // Expecting an object with a success flag and a data array.
//       //   if (res.data.success) {
//       //     setOrders(res.data);
//       //   }
//       setOrders(res.data.data);
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
//       const res = await axios.delete(`/api/sales-invoice/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchOrders();
//       }
//     } catch (error) {
//       console.error("Error deleting purchase order:", error);
//       alert("Failed to delete order");
//     }
//   };

//   const handleCopyTo = (order, destination) => {
//     if (destination === "Credit") {
//       sessionStorage.setItem("CreditData", JSON.stringify(order));
//       router.push("/admin/credit-memo");
//     } else if (destination === "Invoice") {
//       sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(order));
//       router.push("/admin/sales-invoice");
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
//                 onClick={() => onSelect("Credit")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 Credit
//               </button>
//               {/* <button
//                 onClick={() => onSelect("Invoice")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 Invoice
//               </button> */}
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">Sales Invoice</h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/sales-invoice-view/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Invoice
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Customer Code</th>
//               <th className="py-3 px-4 border-b">Customer Name</th>
//               <th className="py-3 px-4 border-b">Date </th>
//               <th className="py-3 px-4 border-b">Status</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {orders.map((order) => (
//               <tr
//                 key={order._id}
//                 className="hover:bg-gray-50 transition-colors"
//               >
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.customerCode}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.customerName}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.orderDate
//                     ? new Date(order.orderDate).toLocaleDateString()
//                     : ""}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.status}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {order.grandTotal}
//                 </td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     {/* View Button */}
//                     <Link href={`/admin/sales-invoice-view/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button */}
//                     <Link
//                       href={`/admin/sales-invoice-view/new?editId=${order._id}`}
//                     >
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
//                     <Link href={`/admin/email/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500 transition duration-200"
//                         title="Email"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     {/* WhatsApp Button */}
//                     <Link href={`/admin/whatsapp/${order._id}`}>
//                       <button
//                         className="flex items-center px-2 py-1 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200"
//                         title="WhatsApp"
//                       >
//                         <FaWhatsapp />
//                       </button>
//                     </Link>
//                     <Link
//                       href={`/admin/sales-invoice-print/${order._id}`}
                     
//                     >
//                       <button
//                         className="flex items-center px-2 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 transition duration-200"
//                         title="Print"
//                       >
//                         <FaPrint />
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


function RowMenu({ invoice, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

 
  const actions = [
    { icon: <FaEye />, label: 'View', onClick: () => router.push(`/admin/sales-invoice-view/${invoice._id}`) },
    { icon: <FaEdit />, label: 'Edit', onClick: () => router.push(`/admin/sales-invoice-view/new?editId=${invoice._id}`) },
    { icon: <FaCopy />, label: 'Copy → Credit', onClick: () => onCopy(invoice, 'Credit') },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "invoice", id: invoice._id });
          if (res.data.success) toast.success("Email sent successfully!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    // { icon: <FaEnvelope />, label: 'Email', onClick: () => router.push(`/admin/email/${invoice._id}`) },
    { icon: <FaWhatsapp />, label: 'WhatsApp', onClick: () => router.push(`/admin/whatsapp/${invoice._id}`) },
    { icon: <FaPrint />, label: 'Print', onClick: () => router.push(`/admin/sales-invoice-print/${invoice._id}`) },
    { icon: <FaTrash />, label: 'Delete', color: 'text-red-600', onClick: () => onDelete(invoice._id) },
  ];  
  return (
    <ActionMenu actions={actions } />
  )

}

