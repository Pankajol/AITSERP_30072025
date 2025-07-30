"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import ActionMenu from "@/components/ActionMenu";
import {
  FaEllipsisV,
  FaEye,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEnvelope,
  FaPrint,
  FaSearch,
} from "react-icons/fa";

export default function GRNList() {
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // ✅ Fetch GRNs
  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Unauthorized! Please log in.");

      const res = await axios.get("/api/grn", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setGRNs(res.data.data);
      } else {
        console.warn("Unexpected response:", res.data);
      }
    } catch (error) {
      console.error("Error fetching GRNs:", error);
      toast.error("Failed to fetch GRNs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, []);

  const handleCopyToInvoice = (grn) => {
  if (!grn?._id) {
    toast.error("Invalid GRN data");
    return;
  }

  const today = new Date().toISOString().split("T")[0];

  const dataToStore = {
    supplier: grn.supplier?._id || grn.supplier,
    supplierName: grn.supplier?.supplierName || "",
    postingDate: today,
    documentDate: today,
    validUntil: today,
    grn: grn._id,
    invoiceType: "GRNCopy", // ✅ Important flag
    refNumber: grn.refNumber || "",
    remarks: grn.remarks || "",
    freight: Number(grn.freight) || 0,

    items: (grn.items || []).map(item => ({
      item: item.item?._id || item.item,
      itemCode: item.itemCode || item.item?.itemCode || "",
      itemName: item.itemName || item.item?.itemName || "",
      itemDescription: item.itemDescription || "",
      quantity: Number(item.receivedQuantity || item.quantity || 0),
      unitPrice: Number(item.unitPrice) || 0,
      discount: Number(item.discount) || 0,
      gstRate: Number(item.gstRate) || 0,
      managedBy: item.managedBy || "",
      batches: Array.isArray(item.batches) ? item.batches : [],
      warehouse: item.warehouse?._id || item.warehouse,
    })),

    attachments: [], // ✅ No attachments copied
  };

  // Clear previous GRN copy data to avoid stale session issues
  sessionStorage.removeItem("grnDataForInvoice");
  sessionStorage.setItem("grnDataForInvoice", JSON.stringify(dataToStore));

  toast.success("GRN data copied to Purchase Invoice");
  router.push(`/admin/purchaseInvoice-view/new?source=${grn._id}`);
};

  

  // ✅ Search filter
  
  
  
  
  const displayGRNs = useMemo(() => {
    if (!search.trim()) return grns;
    const q = search.toLowerCase();
    return grns.filter((g) =>
      (g.supplierName || "").toLowerCase().includes(q)
    );
  }, [grns, search]);

  // ✅ Delete
  const handleDelete = async (id) => {
    if (!confirm("Delete this GRN?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/grn?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGRNs((prev) => prev.filter((g) => g._id !== id));
      toast.success("Deleted successfully");
    } catch {
      toast.error("Failed to delete");
    }
  };

  // ✅ Copy to Invoice








  // ✅ Print PDF
  const handlePrint = (id) => {
    window.open(`/admin/grn-view/print/${id}`, "_blank");
  };

  // ✅ Email Send
  const handleEmail = async (id) => {
    try {
      const res = await axios.post("/api/email", {
        type: "grn",
        id: id,
      });

      if (res.data.success) {
        toast.success("Email sent successfully!");
      } else {
        toast.error(res.data.message || "Failed to send email.");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      toast.error("Error sending email.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Goods Receipt Notes (GRN)
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

        <Link href="/admin/grn-view/new" className="sm:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            + New GRN
          </button>
        </Link>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table
              grns={displayGRNs}
              onDelete={handleDelete}
              onCopy={handleCopyToInvoice}
              onEmail={handleEmail}
              onPrint={handlePrint}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {displayGRNs.map((g, i) => (
              <Card
                key={g._id}
                grn={g}
                idx={i}
                onDelete={handleDelete}
                onCopy={handleCopyToInvoice}
                onEmail={handleEmail}
                onPrint={handlePrint}
              />
            ))}
            {!displayGRNs.length && (
              <p className="text-center text-gray-500 dark:text-gray-400">
                No matching GRNs
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Desktop Table ================= */
function Table({ grns, onDelete, onCopy, onEmail, onPrint }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {["#", "GRN No.", "Supplier", "Date", "Status", "Total", ""].map((h) => (
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
        {grns.map((g, i) => (
          <tr
            key={g._id}
            className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{g.documentNumber}</td>
            <td className="px-4 py-3">{g.supplierName}</td>
            <td className="px-4 py-3">
              {g.postingDate ? new Date(g.postingDate).toLocaleDateString() : ""}
            </td>
            <td className="px-4 py-3">{g.status}</td>
            <td className="px-4 py-3">₹{g.grandTotal || 0}</td>
            <td className="px-4 py-3">
              <RowMenu
                grn={g}
                onDelete={onDelete}
                onCopy={onCopy}
                onEmail={onEmail}
                onPrint={onPrint}
              />
            </td>
          </tr>
        ))}
        {!grns.length && (
          <tr>
            <td
              colSpan={7}
              className="text-center py-6 text-gray-500 dark:text-gray-400"
            >
              No GRNs found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ================= Mobile Card ================= */
function Card({ grn, idx, onDelete, onCopy, onEmail, onPrint }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">
          #{idx + 1} • {grn.documentNumber}
        </div>
        <RowMenu
          grn={grn}
          onDelete={onDelete}
          onCopy={onCopy}
          onEmail={onEmail}
          onPrint={onPrint}
          isMobile
        />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
        Supplier: {grn.supplierName}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Date: {grn.postingDate ? new Date(grn.postingDate).toLocaleDateString() : ""}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Status: {grn.status}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-300">
        Total: ₹{grn.grandTotal || 0}
      </p>
    </div>
  );
}

/* ================= Dropdown Menu ================= */
// function RowMenu({ grn, onDelete, onCopy, onEmail, onPrint }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);
//   const [coords, setCoords] = useState({ top: 0, left: 0 });
//   const router = useRouter();

//   useEffect(() => {
//     if (open && btnRef.current) {
//       const { bottom, right } = btnRef.current.getBoundingClientRect();
//       setCoords({ top: bottom + 8, left: right - 192 });
//     }
//   }, [open]);

//   const MenuItem = ({ icon, label, onClick, color = "" }) => (
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
//             onClick={() => router.push(`/admin/grn-view/view/${grn._id}`)}
//           />
//           <MenuItem
//             icon={<FaEdit />}
//             label="Edit"
//             onClick={() =>
//               router.push(`/admin/grn-view/new?editId=${grn._id}`)
//             }
//           />
//           <MenuItem
//             icon={<FaCopy />}
//             label="Copy → Invoice"
//             onClick={() => onCopy(grn)}
//           />
//           <MenuItem
//             icon={<FaEnvelope />}
//             label="Email"
//             onClick={() => onEmail(grn._id)}
//           />
//           <MenuItem
//             icon={<FaPrint />}
//             label="Print"
//             onClick={() => onPrint(grn._id)}
//           />
//           <MenuItem
//             icon={<FaTrash />}
//             label="Delete"
//             color="text-red-600"
//             onClick={() => onDelete(grn._id)}
//           />
//         </div>
//       )}
//     </>
//   );
// }


function RowMenu({ grn, onDelete, onCopy, onEmail, onPrint }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState({});
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();

  const actions = [
    { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/grn-view/view/${grn._id}`) },
    { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/grn-view/new?editId=${grn._id}`) },
    { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(grn) },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", {
            type: "grn",
            id:grn._id,
           
          });
          if (res.data.success) toast.success("Email sent successfully!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    // { icon: <FaEnvelope />, label: "Email", onClick: () => onEmail(grn._id) },
    { icon: <FaPrint />, label: "Print", onClick: () => onPrint(grn._id) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(grn._id) },
  ];

 return <ActionMenu actions={actions} />;
}