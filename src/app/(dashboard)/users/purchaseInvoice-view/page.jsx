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
  FaPlus,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

/* ================= Permission Check ================= */
const hasPermission = (user, moduleName, permissionType) => {
  return (
    user?.modules?.[moduleName]?.selected &&
    user.modules[moduleName]?.permissions?.[permissionType] === true
  );
};

/* ================= Main Component ================= */
export default function InvoiceView() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/purchaseInvoice", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      } else {
        setInvoices([]);
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
      const res = await axios.delete(`/api/purchaseInvoice/${id}`);
      if (res.data.success) {
        toast.success("Invoice deleted successfully!");
        fetchInvoices();
      } else {
        toast.error(res.data.message || "Failed to delete invoice.");
      }
    } catch (error) {
      toast.error("Failed to delete invoice.");
    }
  };

  const handleCopyTo = (invoice, destination) => {
    if (destination === "debitNote") {
      sessionStorage.setItem("invoiceData", JSON.stringify(invoice));
      router.push("/users/debit-notes-view/new");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">
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
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {hasPermission(user, "Purchase Invoice", "create") && (
          <Link href="/users/purchaseInvoice-view/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit /> Create Order
            </button>
          </Link>
        )}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500">Loading invoices…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <InvoiceTable
              invoices={displayInvoices}
              onDelete={handleDelete}
              onCopyTo={handleCopyTo}
              user={user}
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
                user={user}
              />
            ))}
            {!displayInvoices.length && (
              <p className="text-center text-gray-500">
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
function InvoiceTable({ invoices, onDelete, onCopyTo, user }) {
  return (
    <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 text-sm">
        <tr>
          {["#", "Invoice No.", "Supplier", "Date", "Grand Total", "Action"].map(
            (h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">
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
            className="border-b hover:bg-gray-50 transition"
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
              <InvoiceRowMenu
                invoice={invoice}
                onDelete={onDelete}
                onCopyTo={onCopyTo}
                user={user}
              />
            </td>
          </tr>
        ))}
        {!invoices.length && (
          <tr>
            <td colSpan={6} className="text-center py-6 text-gray-500">
              No invoices found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ================= Mobile Card ================= */
function InvoiceCard({ invoice, idx, onDelete, onCopyTo, user }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="font-semibold text-gray-700">
          #{idx + 1} • {invoice.documentNumberPurchaseInvoice}
        </div>
        <InvoiceRowMenu invoice={invoice} onDelete={onDelete} onCopyTo={onCopyTo} user={user} />
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Supplier: {invoice.supplierName}
      </p>
      <p className="text-sm text-gray-600">
        Date:{" "}
        {invoice.documentDate
          ? new Date(invoice.documentDate).toLocaleDateString("en-GB")
          : ""}
      </p>
      <p className="text-sm text-gray-600">
        Grand Total: ₹{invoice.grandTotal}
      </p>
    </div>
  );
}

/* ================= Row Menu ================= */
function InvoiceRowMenu({ invoice, onDelete, onCopyTo, user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);

  const actions = [
    hasPermission(user, "Purchase Invoice", "view") && {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/users/purchaseInvoice-view/${invoice._id}`),
    },
    hasPermission(user, "Purchase Invoice", "edit") && {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () =>
        router.push(`/users/purchaseInvoice-view/new/?editId=${invoice._id}`),
    },
    hasPermission(user, "Purchase Invoice", "create") && {
      icon: <FaCopy />,
      label: "Copy → Debit Note",
      onClick: () => onCopyTo(invoice, "debitNote"),
    },
    hasPermission(user, "Purchase Invoice", "email") && {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: async () => {
        try {
          const res = await axios.post("/api/email", {
            type: "purchase-invoice",
            id: invoice._id,
          });
          if (res.data.success) toast.success("Email sent!");
          else toast.error(res.data.message || "Failed to send email");
        } catch {
          toast.error("Error sending email.");
        }
      },
    },
    hasPermission(user, "Purchase Invoice", "whatsapp") && {
      icon: <FaWhatsapp />,
      label: "WhatsApp",
      onClick: () =>
        router.push(`/users/purchaseInvoice-view/${invoice._id}/send-whatsapp`),
    },
    hasPermission(user, "Purchase Invoice", "delete") && {
      icon: <FaTrash />,
      label: "Delete",
      color: "text-red-600",
      onClick: () => onDelete(invoice._id),
    },
  ].filter(Boolean);

  if (!actions.length) return null; // hide menu if no permission
  
    return <ActionMenu actions={actions} />;
}
