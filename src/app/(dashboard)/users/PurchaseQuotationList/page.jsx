"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

/* ===== Permission Helper ===== */
const hasPermission = (user, moduleName, permissionType) => {
  return (
    user?.modules?.[moduleName]?.selected &&
    user.modules[moduleName]?.permissions?.[permissionType] === true
  );
};

/* ===== Main Component ===== */
export default function PurchaseQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

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
      console.error("Error fetching quotations:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const displayQuotations = useMemo(() => {
    if (!search.trim()) return quotations;
    const q = search.toLowerCase();
    return quotations.filter((p) =>
      (p.supplierName || "").toLowerCase().includes(q)
    );
  }, [quotations, search]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this quotation?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/purchase-quotation/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotations((prev) => prev.filter((p) => p._id !== id));
      toast.success("Quotation deleted successfully!");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleCopyTo = (quotation) => {
    sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
    router.push("/users/purchase-order-view/new");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
        Purchase Quotations
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {hasPermission(user, "Purchase Quotation", "create") && (
          <Link href="/users/PurchaseQuotationList/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit /> Create Quotation
            </button>
          </Link>
        )}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <Table
              quotations={displayQuotations}
              onDelete={handleDelete}
              onCopy={handleCopyTo}
              user={user}
            />
          </div>

          <div className="md:hidden space-y-4">
            {displayQuotations.map((q, i) => (
              <Card
                key={q._id}
                quotation={q}
                idx={i}
                onDelete={handleDelete}
                onCopy={handleCopyTo}
                user={user}
              />
            ))}
            {!displayQuotations.length && (
              <p className="text-center text-gray-500">
                No matching quotations
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ===== Desktop Table ===== */
function Table({ quotations, onDelete, onCopy, user }) {
  return (
    <table className="min-w-full bg-white shadow rounded-lg overflow-hidden border border-gray-200">
      <thead className="bg-gray-100 text-sm">
        <tr>
          {["#", "Document No.", "Supplier", "Date", "Status", "Total", "Action"].map((h) => (
            <th
              key={h}
              className="px-4 py-3 text-left font-semibold text-gray-700"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {quotations.map((q, i) => (
          <tr
            key={q._id}
            className="border-b hover:bg-gray-50 transition-colors"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{q.documentNumber}</td>
            <td className="px-4 py-3">{q.supplierName}</td>
            <td className="px-4 py-3">
              {new Date(q.postingDate).toLocaleDateString("en-GB")}
            </td>
            <td className="px-4 py-3">{q.status}</td>
            <td className="px-4 py-3">₹{q.grandTotal}</td>
            <td className="px-4 py-3 text-center">
              <RowMenu
                quotation={q}
                onDelete={onDelete}
                onCopy={onCopy}
                user={user}
              />
            </td>
          </tr>
        ))}
        {!quotations.length && (
          <tr>
            <td colSpan={7} className="text-center py-6 text-gray-500">
              No quotations found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ===== Mobile Card ===== */
function Card({ quotation, idx, onDelete, onCopy, user }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700">
          #{idx + 1} • {quotation.documentNumber}
        </div>
        <RowMenu quotation={quotation} onDelete={onDelete} onCopy={onCopy} user={user} />
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Supplier: {quotation.supplierName}
      </p>
      <p className="text-sm text-gray-600">
        Date: {new Date(quotation.postingDate).toLocaleDateString("en-GB")}
      </p>
      <p className="text-sm text-gray-600">Status: {quotation.status}</p>
      <p className="text-sm text-gray-600">Total: ₹{quotation.grandTotal}</p>
    </div>
  );
}

/* ===== Dropdown Menu ===== */
function RowMenu({ quotation, onDelete, onCopy, user }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const actions = [
    hasPermission(user, "Purchase Quotation", "view") && { icon: <FaEye />, label: "View", onClick: () => router.push(`/users/PurchaseQuotationList/view/${quotation._id}`) },
    hasPermission(user, "Purchase Quotation", "edit") && { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/users/PurchaseQuotationList/new?editId=${quotation._id}`) },
    hasPermission(user, "Purchase Quotation", "create") && { icon: <FaCopy />, label: "Copy → Order", onClick: () => onCopy(quotation) },
    hasPermission(user, "Purchase Quotation", "email") && { icon: <FaEnvelope />, label: "Email", onClick: async () => {
      try {
        const res = await axios.post("/api/email", { type: "purchase-quotation", id: quotation._id });
        if (res.data.success) toast.success("Email sent successfully!");
        else toast.error(res.data.message || "Failed to send email.");
      } catch {
        toast.error("Error sending email.");
      }
    }},
    hasPermission(user, "Purchase Quotation", "whatsapp") && { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/users/purchase-quotation/${quotation._id}/send-whatsapp`) },
    hasPermission(user, "Purchase Quotation", "delete") && { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(quotation._id) },
  ].filter(Boolean);

 if (!actions.length) return null; // hide menu if no permission
 
   return <ActionMenu actions={actions} />;
}



// "use client";

// import { useState, useEffect, useMemo, useRef } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";
// import Select from "react-select";  


// import {
//   FaEllipsisV,
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
// } from "react-icons/fa";
// import ActionMenu from "@/components/ActionMenu";

// export default function PurchaseQuotationList() {
//   const [quotations, setQuotations] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const router = useRouter();

//   const fetchQuotations = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get("/api/purchase-quotation", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (res.data?.success && Array.isArray(res.data.data)) {
//         setQuotations(res.data.data);
//       } else {
//         console.warn("Unexpected response:", res.data);
//       }
//     } catch (error) {
//       console.error("Error fetching purchase quotations:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchQuotations();
//   }, []);

//   const displayQuotations = useMemo(() => {
//     if (!search.trim()) return quotations;
//     const q = search.toLowerCase();
//     return quotations.filter((p) =>
//       (p.supplierName || "").toLowerCase().includes(q)
//     );
//   }, [quotations, search]);

//   const handleDelete = async (id) => {
//     if (!confirm("Delete this quotation?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/purchase-quotation/${id}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });
//       setQuotations((prev) => prev.filter((p) => p._id !== id));
//     } catch {
//       alert("Failed to delete");
//     }
//   };

//   const handleCopyTo = (quotation) => {
//     sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
//     router.push("/users/purchase-order-view/new");
//   };

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
//         Purchase Quotations
//       </h1>

//       {/* Toolbar */}
//       <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
//         <div className="relative flex-1 max-w-md">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search supplier…"
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
//           />
//         </div>

//         <Link href="/users/PurchaseQuotationList/new" className="sm:w-auto">
//           <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit /> New Quotation
//           </button>
//         </Link>
//       </div>

//       {/* Table / Cards */}
//       {loading ? (
//         <p className="text-center text-gray-500 dark:text-gray-400">
//           Loading…
//         </p>
//       ) : (
//         <>
//           {/* Desktop Table */}
//           <div className="hidden md:block overflow-x-auto">
//             <Table
//               quotations={displayQuotations}
//               onDelete={handleDelete}
//               onCopy={handleCopyTo}
//             />
//           </div>

//           {/* Mobile Cards */}
//           <div className="md:hidden space-y-4">
//             {displayQuotations.map((q, i) => (
//               <Card
//                 key={q._id}
//                 quotation={q}
//                 idx={i}
//                 onDelete={handleDelete}
//                 onCopy={handleCopyTo}
//               />
//             ))}
//             {!displayQuotations.length && (
//               <p className="text-center text-gray-500 dark:text-gray-400">
//                 No matching quotations
//               </p>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* ================= Desktop Table ================= */
// function Table({ quotations, onDelete, onCopy }) {
//   return (
//     <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
//       <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
//         <tr>
//           {["#", "Document No.", "Supplier", "Date", "Status", "Total", ""].map(
//             (h) => (
//               <th
//                 key={h}
//                 className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100"
//               >
//                 {h}
//               </th>
//             )
//           )}
//         </tr>
//       </thead>
//       <tbody>
//         {quotations.map((q, i) => (
//           <tr
//             key={q._id}
//             className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
//           >
//             <td className="px-4 py-3">{i + 1}</td>
//             <td className="px-4 py-3">{q.documentNumber}</td>
//             <td className="px-4 py-3">{q.supplierName}</td>
//             <td className="px-4 py-3">
//               {new Date(q.postingDate).toLocaleDateString("en-GB")}
//             </td>
//             <td className="px-4 py-3">{q.status}</td>
//             <td className="px-4 py-3">₹{q.grandTotal}</td>
//             <td className="px-4 py-3">
//               <RowMenu quotation={q} onDelete={onDelete} onCopy={onCopy} />
//             </td>
//           </tr>
//         ))}
//         {!quotations.length && (
//           <tr>
//             <td
//               colSpan={7}
//               className="text-center py-6 text-gray-500 dark:text-gray-400"
//             >
//               No quotations found.
//             </td>
//           </tr>
//         )}
//       </tbody>
//     </table>
//   );
// }

// /* ================= Mobile Card ================= */
// function Card({ quotation, idx, onDelete, onCopy }) {
//   return (
//     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
//       <div className="flex justify-between">
//         <div className="font-semibold text-gray-700 dark:text-gray-100">
//           #{idx + 1} • {quotation.documentNumber}
//         </div>
//         <RowMenu quotation={quotation} onDelete={onDelete} onCopy={onCopy} isMobile />
//       </div>
//       <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
//         Supplier: {quotation.supplierName}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         Date: {new Date(quotation.postingDate).toLocaleDateString("en-GB")}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         Status: {quotation.status}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         Total: ₹{quotation.grandTotal}
//       </p>
//     </div>
//   );
// }

// /* ================= Dropdown Menu ================= */
//  function RowMenu({ quotation, onDelete, onCopy }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   const router = useRouter();

//   const actions = [
//     {
//       icon: <FaEye />,
//       label: "View",
//       onClick: () => router.push(`/users/PurchaseQuotationList/view/${quotation._id}`),
//     },
//     {
//       icon: <FaEdit />,
//       label: "Edit",
//       onClick: () => router.push(`/users/PurchaseQuotationList/new?editId=${quotation._id}`),
//     },
//     { icon: <FaCopy />, label: "Copy → Order", onClick: () => onCopy(quotation) },
//     {
//       icon: <FaEnvelope />,
//       label: "Email",
//       onClick: async () => {
//         try {
//           const res = await axios.post("/api/email", {
//             type: "purchase-quotation",
//             id: quotation._id,
//           });
//           if (res.data.success) toast.success("Email sent successfully!");
//           else toast.error(res.data.message || "Failed to send email.");
//         } catch {
//           toast.error("Error sending email.");
//         }
//       },
//     },
//     {
//       icon: <FaWhatsapp />,
//       label: "WhatsApp",
//       onClick: () => router.push(`/users/purchase-quotation/${quotation._id}/send-whatsapp`),
//     },
//     {
//       icon: <FaTrash />,
//       label: "Delete",
//       color: "text-red-600",
//       onClick: () => onDelete(quotation._id),
//     },
//   ];

//   return (
//     <ActionMenu actions={actions} />
//   )
// }


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
//     //   router.push("/users/GRN");
//     // } else if (destination === "Invoice") {
//     //   // sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
//     //   console.log("Copying quotation:", quotation);
//     //   sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));

//     //   router.push("/users/purchase-invoice");
//     // }else 
// if (destination === "Order") {
//   // ⛔ block a quotation that contains any zero-quantity items


//   // ✅ everything is fine – proceed
//   sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
  
//   router.push("/users/purchase-order-view/new");
// }
//     // else if (destination === "Debit-Note") {
      
//     //   sessionStorage.setItem("debitNoteData", JSON.stringify(quotation));

//     //   // sessionStorage.setItem("purchaseOrderData", JSON.stringify(quotation));
//     //   router.push("/users/debit-note");
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
//         <Link href="/users/PurchaseQuotationList/new">
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
//                       href={`/users/PurchaseQuotationList/view/${quotation._id}`}
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
//                       href={`/users/PurchaseQuotationList/new?editId=${quotation._id}`}
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
//                       href={`/users/purchase-quotation/${quotation._id}/send-email`}
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
//                       href={`/users/purchase-quotation/${quotation._id}/send-whatsapp`}
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
