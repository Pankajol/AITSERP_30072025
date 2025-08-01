"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";


import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify"; // Assuming you have react-toastify installed for notifications

import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
  FaPlus, // Changed from FaEdit for "Create New" button
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function InvoiceView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // Assuming you might need a token for fetching invoices as well
      const token = localStorage.getItem("token"); 
      const res = await axios.get("/api/purchaseInvoice"
      , { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      } else {
        console.warn("Unexpected response:", res.data);
        setInvoices([]); // Ensure invoices is an array even if API response is not as expected
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

  const displayInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter(
      (invoice) =>
        (invoice.supplierName || "").toLowerCase().includes(q) ||
        (invoice.invoiceNumber || "").toLowerCase().includes(q)
    );
  }, [invoices, search]);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      // const token = localStorage.getItem("token");
      const res = await axios.delete(`/api/purchaseInvoice/${id}`
      // , { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.success) {
        toast.success("Invoice deleted successfully!");
        fetchInvoices(); // Re-fetch to update the list
      } else {
        toast.error(res.data.message || "Failed to delete invoice.");
      }
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice.");
    }
  };

  const handleCopyTo = (invoice, destination) => {
    if (destination === "debitNote") {
      sessionStorage.setItem("invoiceData", JSON.stringify(invoice));
      router.push("/admin/debit-notes-view/new");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Invoice List
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or supplier…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <Link href="/admin/purchaseInvoice-view/new" className="sm:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaPlus /> New Invoice
          </button>
        </Link>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">
          Loading invoices…
        </p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <InvoiceTable
              invoices={displayInvoices}
              onDelete={handleDelete}
              onCopyTo={handleCopyTo}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {displayInvoices.map((invoice, i) => (
              <InvoiceCard
                key={invoice._id}
                invoice={invoice}
                idx={i}
                onDelete={handleDelete}
                onCopyTo={handleCopyTo}
              />
            ))}
            {!displayInvoices.length && (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No matching invoices found.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Desktop Table ================= */
function InvoiceTable({ invoices, onDelete, onCopyTo }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {["#", "Invoice No.", "Supplier", "Date", "Grand Total", ""].map(
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
        {invoices.map((invoice, i) => (
          <tr
            key={invoice._id}
            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{invoice.documentNumberPurchaseInvoice}</td>
            <td className="px-4 py-3">{invoice.supplierName}</td>
            <td className="px-4 py-3">
              {invoice.documentDate
                ? new Date(invoice.documentDate).toLocaleDateString("en-GB")
                : ""}
            </td>
            <td className="px-4 py-3">₹{invoice.grandTotal}</td>
            <td className="px-4 py-3">
              <InvoiceRowMenu invoice={invoice} onDelete={onDelete} onCopyTo={onCopyTo} />
            </td>
          </tr>
        ))}
        {!invoices.length && (
          <tr>
            <td
              colSpan={6} // Adjusted colspan to match number of columns
              className="text-center py-6 text-gray-500 dark:text-gray-400"
            >
              No invoices found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ================= Mobile Card ================= */
function InvoiceCard({ invoice, idx, onDelete, onCopyTo }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">
          #{idx + 1} • {invoice.documentNumberPurchaseInvoice}
        </div>
        <InvoiceRowMenu invoice={invoice} onDelete={onDelete} onCopyTo={onCopyTo} isMobile />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
        Supplier: {invoice.supplierName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Date:{" "}
        {invoice.documentDate
          ? new Date(invoice.documentDate).toLocaleDateString("en-GB")
          : ""}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Grand Total: ₹{invoice.grandTotal}
      </p>
    </div>
  );
}

/* ================= Dropdown Menu for Invoice Actions ================= */
// function InvoiceRowMenu({ invoice, onDelete, onCopyTo }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   const router = useRouter();

//   useEffect(() => {
//     if (open && btnRef.current) {
//       const { bottom, right } = btnRef.current.getBoundingClientRect();
//       setCoords({ top: bottom + 8, left: right - 192 }); // Adjust left for menu width
//     }
//   }, [open]);

//   // Close dropdown if clicked outside
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (btnRef.current && !btnRef.current.contains(event.target) && !event.target.closest('.fixed.z-50')) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, [btnRef]);

//   const MenuItem = ({ icon, label, onClick, color = "" }) => (
//     <button
//       onClick={() => {
//         onClick();
//         setOpen(false);
//       }}
//       className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
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
//         title="More Actions"
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
//             onClick={() => router.push(`/admin/purchaseInvoice-view/${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaEdit />}
            
//             label="Edit"
//             onClick={() => router.push(`/admin/purchaseInvoice-view/new/?editId=${invoice._id}`)}
//           />
//           <MenuItem
//             icon={<FaCopy />}
//             label="Copy → Debit Note"
//             onClick={() => onCopyTo(invoice, "debitNote")}
//           />
//           <MenuItem
//             icon={<FaEnvelope />}
//             label="Email"
//             onClick={async () => {
//               try {
//                 // Assuming an email API similar to purchase quotation
//                 const res = await axios.post("/api/email", {
//                   type: "purchase-invoice", // A new type for purchase invoices
//                   id: invoice._id,
//                 });

//                 if (res.data.success) {
//                   toast.success("Email sent successfully!");
//                 } else {
//                   toast.error(res.data.message || "Failed to send email.");
//                 }
//               } catch (error) {
//                 console.error("Error sending email:", error);
//                 toast.error("Error sending email.");
//               }
//             }}
//           />
//           <MenuItem
//             icon={<FaWhatsapp />}
//             label="WhatsApp"
//             onClick={() => router.push(`/admin/purchaseInvoice-view/${invoice._id}/send-whatsapp`)}
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


function InvoiceRowMenu({ invoice, onDelete, onCopyTo }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();

  const actions = [
    { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/purchaseInvoice-view/${invoice._id}`) },
    { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/purchaseInvoice-view/new/?editId=${invoice._id}`) },
    { icon: <FaCopy />, label: "Copy → Debit Note", onClick: () => onCopyTo(invoice, "debitNote") },
    {
      icon: <FaEnvelope />,
      label: "Email",
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

  return (
    
    <ActionMenu actions={actions} />
  )
}