"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
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
import { toast } from "react-toastify";
import ActionMenu from "@/components/ActionMenu";

export default function SalesQuotationList() {
  const [quotations, setQuotations] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // ✅ Fetch Quotations with Authentication
  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found. Redirect to login.");
        return;
      }

      const res = await axios.get("/api/sales-quotation", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.data.success) {
        setQuotations(res.data.data);
      } else {
        console.error("Failed to fetch quotations:", res.data.message);
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

  // ✅ Filtered list
  const filtered = useMemo(() => {
    if (!search.trim()) return quotations;
    return quotations.filter((q) =>
      (q.customerName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [quotations, search]);

  // ✅ Delete Quotation without Reload
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/sales-quotation/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotations((prev) => prev.filter((q) => q._id !== id)); // ✅ Remove from state
    } catch {
      alert("Failed to delete quotation");
    }
  };

  // ✅ Copy to Order (no reload)
  const handleCopyTo = (quotation, dest) => {
    if (dest === "Order") {
      const {  ...rest } = quotation;
      const data = {
        ...quotation,
        sourceId: quotation._id,
        sourceModel: "Quotation",
       
      };
      sessionStorage.setItem("salesOrderData", JSON.stringify(data));
      router.push("/admin/sales-order-view/new");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Sales Quotations
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="flex-1 relative max-w-sm">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Filter by customer name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <Link href="/admin/sales-quotation-view/new">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit className="mr-2" />
            Create New Quotation
          </button>
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700">
                <tr>
                  {["#", "Document Number", "Customer", "Date", "Status", "Total", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-100">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((q, idx) => (
                  <tr key={q._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{q.documentNumberQuatation}</td>
                    <td className="px-4 py-3">{q.customerName}</td>
                    <td className="px-4 py-3">{q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}</td>
                    <td className="px-4 py-3">{q.status}</td>
                    <td className="px-4 py-3">₹ {q.grandTotal}</td>
                    <td className="px-4 py-3">
                      <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr>
                    <td colSpan={7} className="text-center py-5 text-gray-500 dark:text-gray-400">
                      No matching quotations.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filtered.map((q, idx) => (
              <div key={q._id} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-semibold text-gray-700 dark:text-gray-100">
                    #{idx + 1} • {q.documentNumberQuatation}
                  </div>
                  <RowMenu quotation={q} onDelete={handleDelete} onCopy={handleCopyTo} />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Customer:</strong> {q.customerName}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Date:</strong> {q.postingDate ? new Date(q.postingDate).toLocaleDateString("en-GB") : ""}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Status:</strong> {q.status}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1"><strong>Total:</strong> ₹ {q.grandTotal}</div>
              </div>
            ))}
            {!filtered.length && <div className="text-center text-gray-500 dark:text-gray-400">No matching quotations.</div>}
          </div>
        </>
      )}
    </div>
  );
}

// ✅ RowMenu without Page Reload
function RowMenu({ quotation, onDelete, onCopy }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const router = useRouter();

    const actions = [
    { icon: <FaEye />, label: "View", onClick: () => router.push(`/admin/sales-quotation-view/view/${quotation._id}`) },
    { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/admin/sales-quotation-view/new?editId=${quotation._id}`) },
    { icon: <FaCopy />, label: "Copy → Order", onClick: () => onCopy(quotation, "Order") },
    {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", { type: "quotation", id: quotation._id });
          if (res.data.success) toast.success("Email sent successfully!");
          else toast.error(res.data.message || "Failed to send email.");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/admin/sales-quotation-whatsapp/${quotation._id}`) },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(quotation._id) },
  ];

  return (
    <ActionMenu actions={actions} />
  )
}
