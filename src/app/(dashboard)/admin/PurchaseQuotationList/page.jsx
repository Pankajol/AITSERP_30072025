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
  FaFileAlt,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function PurchaseQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const router = useRouter();

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/purchase-quotation", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setQuotations(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching purchase quotations:", error);
      toast.error("Failed to fetch quotations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const filtered = useMemo(() => {
    return quotations.filter((q) => {
      const matchSearch = !search.trim() ||
        (q.supplierName || "").toLowerCase().includes(search.toLowerCase()) ||
        (q.documentNumber || "").toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "All" || q.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [quotations, search, filterStatus]);

  const stats = {
    total: quotations.length,
    approved: quotations.filter(q => q.status === "Approved" || q.status === "Accepted").length,
    pending: quotations.filter(q => q.status === "Pending" || q.status === "Draft").length,
    totalValue: quotations.reduce((acc, curr) => acc + (Number(curr.grandTotal) || 0), 0),
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/purchase-quotation/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotations((prev) => prev.filter((p) => p._id !== id));
      toast.success("Quotation deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCopyTo = (quotation) => {
    sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
    toast.success("Copied to Purchase Order");
    router.push("/admin/purchase-order-view/new");
  };

  const StatusBadge = ({ status }) => {
    const map = {
      Approved: "bg-emerald-50 text-emerald-600",
      Accepted: "bg-emerald-50 text-emerald-600",
      Pending: "bg-amber-50 text-amber-600",
      Draft: "bg-gray-100 text-gray-500",
      Rejected: "bg-red-50 text-red-500",
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
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Purchase Quotations</h1>
            <p className="text-sm text-gray-400 mt-0.5">Compare supplier quotes and pricing</p>
          </div>
          <Link href="/admin/PurchaseQuotationList/new">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm">
              <FaPlus className="text-xs" /> New Quotation
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Quotes", value: stats.total, emoji: "📝", filter: "All" },
            { label: "Approved", value: stats.approved, emoji: "✅", filter: "Approved" },
            { label: "Pending", value: stats.pending, emoji: "⏳", filter: "Pending" },
            { label: "Potential Value", value: `₹${stats.totalValue.toLocaleString("en-IN")}`, emoji: "💰", filter: "All", noFilter: true },
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
          
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search supplier or doc no..." />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Approved", "Pending", "Draft", "Rejected"].map(s => (
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
                      <FaFileAlt className="mx-auto text-4xl text-gray-100 mb-3" />
                      <p className="text-sm font-medium text-gray-400">No purchase quotations found</p>
                    </td>
                  </tr>
                ) : filtered.map((q, idx) => (
                  <tr key={q._id} className="border-b border-gray-50 hover:bg-indigo-50/20 transition-colors">
                    <td className="px-4 py-4 text-xs font-bold text-gray-300 font-mono">{idx + 1}</td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {q.documentNumber || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">{q.supplierName || "—"}</td>
                    <td className="px-4 py-4 text-xs text-gray-500">
                      {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : "—"}
                    </td>
                    <td className="px-4 py-4"><StatusBadge status={q.status} /></td>
                    <td className="px-4 py-4 font-mono font-bold text-gray-800">
                       ₹{Number(q.grandTotal || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-4">
                      <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden divide-y divide-gray-100">
            {filtered.map((q, idx) => (
              <div key={q._id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    {q.documentNumber || `#${idx + 1}`}
                  </span>
                  <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{q.supplierName}</h3>
                <div className="flex justify-between items-end mt-3">
                  <div className="space-y-1">
                    <StatusBadge status={q.status} />
                    <p className="text-[10px] text-gray-400">{q.postingDate ? new Date(q.postingDate).toLocaleDateString() : ""}</p>
                  </div>
                  <span className="font-mono font-bold text-gray-800 text-sm">₹{Number(q.grandTotal || 0).toLocaleString()}</span>
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

function RowMenu({ quotation, onDelete, onCopy }) {
  const router = useRouter();

  const handleEmail = async () => {
    try {
      const res = await axios.post("/api/email", { type: "purchase-quotation", id: quotation._id });
      if (res.data.success) toast.success("Email sent successfully!");
    } catch {
      toast.error("Error sending email.");
    }
  };

  const actions = [
    { icon: <FaEye />, label: "View Quotation", onClick: () => router.push(`/admin/PurchaseQuotationList/view/${quotation._id}`) },
    { icon: <FaEdit />, label: "Edit Quotation", onClick: () => router.push(`/admin/PurchaseQuotationList/new?editId=${quotation._id}`) },
    { icon: <FaCopy />, label: "Copy → PO", onClick: () => onCopy(quotation) },
    { icon: <FaEnvelope />, label: "Email PDF", onClick: handleEmail },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/purchase-quotation/${quotation._id}/send-whatsapp`) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(quotation._id) },
  ];

  return <ActionMenu actions={actions} />;
}

// "use client";

// import { useState, useEffect } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { toast } from "react-toastify"; 
// import { FaEdit, FaTrash, FaCopy, FaEye ,FaEnvelope, FaWhatsapp } from "react-icons/fa";

// export default function PurchaseQuotationList() {
//   const [quotations, setQuotations] = useState([]);
//   const router = useRouter();

// const fetchQuotations = async () => {
//   try {
//     const res = await axios.get("/api/purchase-quotation");
//     if (res.data.success) {
//       // ✅ Filter out quotations where any item has quantity === 0
//       const validQuotations = res.data.data.filter((quotation) =>
//         quotation.items.every((item) => Number(item.quantity) > 0)
//       );

//       setQuotations(validQuotations);
//     }
//   } catch (error) {
//     console.error("Error fetching quotations:", error);
//   }
// };

// useEffect(() => {
//   fetchQuotations();
// }, []);


//   console.log(quotations)

//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this quotation?")) return;
//     try {
//       const res = await axios.delete(`/api/purchase-quotation/${id}`);
//       if (res.data.success) {
//         alert("Deleted successfully");
//         fetchQuotations();
//       }
//     } catch (error) {
//       console.error("Error deleting quotation:", error);
//       alert("Failed to delete quotation");
//     }
//   };

//   const handleCopyTo =  (quotation, destination) => {
//     // if (destination === "GRN") {
//     //   // Save using the key "grnData" so that the GRN page can read it.
//     //   sessionStorage.setItem("grnData", JSON.stringify(quotation));
//     //   router.push("/admin/GRN");
//     // } else if (destination === "Invoice") {
//     //   // sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
//     //   console.log("Copying quotation:", quotation);
//     //   sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));

//     //   router.push("/admin/purchase-invoice");
//     // }else 
// if (destination === "Order") {
//   // ⛔ block a quotation that contains any zero-quantity items


//   // ✅ everything is fine – proceed
//   sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
  
//   router.push("/admin/purchase-order-view/new");
// }
//     // else if (destination === "Debit-Note") {
      
//     //   sessionStorage.setItem("debitNoteData", JSON.stringify(quotation));

//     //   // sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
//     //   router.push("/admin/debit-note");
//     // }
//   };
//   const CopyToDropdown = ({ handleCopyTo, quotation }) => {
//     const [isOpen, setIsOpen] = useState(false);
  
//     const toggleDropdown = () => {
//       setIsOpen(prev => !prev);
//     };
  
//     const onSelect = (option) => {
//       handleCopyTo(quotation, option);
//       setIsOpen(false);
//     };
  
//     return (
//       <div className="relative inline-block text-left">
//         {/* Main button that toggles the dropdown */}
//         <button
//           onClick={toggleDropdown}
//           className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
//           title="Copy To"
//         >
//           <FaCopy className="mr-1" />
//           <span className="hidden sm:inline"></span>
//         </button>
//         {/* Dropdown menu */}
//         {isOpen && (
//           <div className="absolute right-0 mt-2 w-40 origin-top-right bg-white border border-gray-200 rounded-md shadow-lg z-10">
//             <div className="py-1">
            
//               <button
//                 onClick={() => onSelect("Order")}
//                 className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
//               >
//                 Order
//               </button>
             
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   };

//   return (
//     <div className="container mx-auto p-6">
//       <h1 className="text-4xl font-bold mb-6 text-center">
//         Purchase Quotations
//       </h1>
//       <div className="flex justify-end mb-4">
//         <Link href="/admin/PurchaseQuotationList/new">
//           <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition duration-200">
//             <FaEdit className="mr-2" />
//             Create New Quotation
//           </button>
//         </Link>
//       </div>
//       <div className="overflow-x-auto">
//         <table className="min-w-full bg-white shadow-md rounded border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="py-3 px-4 border-b">Document No.</th>
//               <th className="py-3 px-4 border-b">Supplier Name</th>
//               <th className="py-3 px-4 border-b">Posting Date</th>
//               <th className="py-3 px-4 border-b">Status</th>
//               <th className="py-3 px-4 border-b">Grand Total</th>
//               <th className="py-3 px-4 border-b">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {quotations.map((quotation) => (
//               <tr
//                 key={quotation._id}
//                 className="hover:bg-gray-50 transition-colors"
//               >
//                 <td className="py-3 px-4 border-b text-center">
//                   {quotation.refNumber}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {quotation.supplierName}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {quotation.postingDate
//                     ? new Date(quotation.postingDate).toLocaleDateString()
//                     : ""}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {quotation.status}
//                 </td>
//                 <td className="py-3 px-4 border-b text-center">
//                   {quotation.grandTotal}
//                 </td>
//                 <td className="py-3 px-4 border-b">
//                   <div className="flex justify-center space-x-2">
//                     {/* View Button */}
//                     <Link
//                       href={`/admin/PurchaseQuotationList/view/${quotation._id}`}
//                     >
//                       <button
//                         className="flex items-center px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition duration-200"
//                         title="View Details"
//                       >
//                         <FaEye />
//                       </button>
//                     </Link>
//                     {/* Edit Button (opens the form with editId) */}
//                     <Link
//                       href={`/admin/PurchaseQuotationList/new?editId=${quotation._id}`}
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
//                       onClick={() => handleDelete(quotation._id)}
//                       className="flex items-center px-2 py-1 bg-red-600 text-white rounded hover:bg-red-500 transition duration-200"
//                       title="Delete"
//                     >
//                       <FaTrash />
//                     </button>
//                     {/* Copy To Buttons */}
//                     {/* <button
//                       onClick={() => handleCopyTo(quotation, "GRN")}
//                       className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
//                       title="Copy To GRN"
//                     >
//                       <FaCopy className="mr-1" />
//                       <span className="hidden sm:inline">GRN</span>
//                     </button>
//                     <button
//                       onClick={() => handleCopyTo(quotation, "Invoice")}
//                       className="flex items-center px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-500 transition duration-200"
//                       title="Copy To Invoice"
//                     >
//                       <FaCopy className="mr-1" />
//                       <span className="hidden sm:inline">Invoice</span>
//                     </button> */}
//                     <CopyToDropdown handleCopyTo={handleCopyTo} quotation={quotation} />
//                     {/* Email Button */}
//                     <Link
//                       href={`/admin/purchase-quotation/${quotation._id}/send-email`}
//                     >
//                       <button
//                         className="flex items-center px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-500 transition duration-200"
//                         title="Send Email"
//                       >
//                         <FaEnvelope />
//                       </button>
//                     </Link>
//                     {/* WhatsApp Button */} 
//                     <Link
//                       href={`/admin/purchase-quotation/${quotation._id}/send-whatsapp`}
//                     >
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
//             {quotations.length === 0 && (
//               <tr>
//                 <td colSpan="6" className="text-center py-4">
//                   No purchase quotations found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// }
