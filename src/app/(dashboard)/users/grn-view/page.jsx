"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  FaEye,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEnvelope,
  FaPrint,
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

export default function GRNList() {
  const [grns, setGRNs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  // ✅ Fetch GRNs
  const fetchGRNs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized! Please log in.");
        return;
      }

      const res = await axios.get("/api/grn", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) {
        setGRNs(res.data.data);
      } else {
        console.warn("Unexpected response:", res.data);
        setGRNs([]);
      }
    } catch (error) {
      console.error("Error fetching GRNs:", error);
      toast.error("Failed to fetch GRNs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGRNs();
  }, []);

  // ✅ Filter for search
  const displayGRNs = useMemo(() => {
    if (!search.trim()) return grns;
    const q = search.toLowerCase();
    return grns.filter(
      (g) =>
        (g.supplierName || "").toLowerCase().includes(q) ||
        (g.documentNumberGrn || "").toLowerCase().includes(q) ||
        (g.status || "").toLowerCase().includes(q)
    );
  }, [grns, search]);

  // ✅ Delete GRN
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this GRN?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/grn?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGRNs((prev) => prev.filter((g) => g._id !== id));
      toast.success("GRN deleted successfully.");
    } catch (err) {
      toast.error("Failed to delete GRN.");
      console.error(err);
    }
  };

  // ✅ Copy → Invoice
  const handleCopyToInvoice = (grn) => {
    if (!grn) return toast.error("Invalid GRN data.");
    sessionStorage.setItem(
      "grnDataForInvoice",
      JSON.stringify({
        ...grn,
        sourceType: "GRN",
        invoiceType: "GRN Copy",
      })
    );
    router.push("/users/purchaseInvoice-view/new");
  };

  // ✅ Print GRN
  const handlePrint = (id) => {
    window.open(`/users/grn-view/print/${id}`, "_blank");
  };

  // ✅ Email GRN
  const handleEmail = async (id) => {
    try {
      const res = await axios.post("/api/email", { type: "grn", id });
      if (res.data.success) toast.success("Email sent successfully!");
      else toast.error(res.data.message || "Failed to send email.");
    } catch (error) {
      toast.error("Error sending email.");
      console.error(error);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-gray-800">
        Goods Receipt Notes (GRN)
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, GRN no, or status…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {user && hasPermission(user, "GRN", "create") && (
          <Link href="/users/grn-view/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaPlus /> New GRN
            </button>
          </Link>
        )}
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
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
              user={user}
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
                user={user}
              />
            ))}
            {!displayGRNs.length && (
              <p className="text-center text-gray-500">No GRNs found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Desktop Table ================= */
function Table({ grns, onDelete, onCopy, onEmail, onPrint, user }) {
  return (
    <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 text-sm">
        <tr>
          {["#", "GRN No.", "Supplier", "Date", "Status", "Total", "Action"].map(
            (h) => (
              <th
                key={h}
                className="px-4 py-3 text-left font-semibold text-gray-700"
              >
                {h}
              </th>
            )
          )}
        </tr>
      </thead>
      <tbody>
        {grns.map((g, i) => (
          <tr
            key={g._id}
            className="border-b hover:bg-gray-50 transition"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{g.documentNumberGrn}</td>
            <td className="px-4 py-3">{g.supplierName}</td>
            <td className="px-4 py-3">
              {g.postingDate
                ? new Date(g.postingDate).toLocaleDateString("en-GB")
                : ""}
            </td>
            <td className="px-4 py-3 capitalize">{g.status || "Pending"}</td>
            <td className="px-4 py-3">₹{g.grandTotal || 0}</td>
            <td className="px-4 py-3">
              <RowMenu
                grn={g}
                onDelete={onDelete}
                onCopy={onCopy}
                onEmail={onEmail}
                onPrint={onPrint}
                user={user}
              />
            </td>
          </tr>
        ))}
        {!grns.length && (
          <tr>
            <td
              colSpan={7}
              className="text-center py-6 text-gray-500"
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
function Card({ grn, idx, onDelete, onCopy, onEmail, onPrint, user }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between items-start">
        <div className="font-semibold text-gray-700">
          #{idx + 1} • {grn.documentNumberGrn}
        </div>
        <RowMenu
          grn={grn}
          onDelete={onDelete}
          onCopy={onCopy}
          onEmail={onEmail}
          onPrint={onPrint}
          user={user}
          isMobile
        />
      </div>
      <p className="text-sm text-gray-600 mt-1">
        Supplier: {grn.supplierName}
      </p>
      <p className="text-sm text-gray-600">
        Date:{" "}
        {grn.postingDate
          ? new Date(grn.postingDate).toLocaleDateString("en-GB")
          : ""}
      </p>
      <p className="text-sm text-gray-600">
        Status: {grn.status}
      </p>
      <p className="text-sm text-gray-600">
        Total: ₹{grn.grandTotal || 0}
      </p>
    </div>
  );
}

/* ================= Action Menu ================= */
function RowMenu({ grn, onDelete, onCopy, onEmail, onPrint, user }) {
  const router = useRouter();

  const actions = [
    hasPermission(user, "GRN", "view") && {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/users/grn-view/view/${grn._id}`),
    },
    hasPermission(user, "GRN", "edit") && {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () => router.push(`/users/grn-view/new?editId=${grn._id}`),
    },
    hasPermission(user, "GRN", "create") && {
      icon: <FaCopy />,
      label: "Copy → Invoice",
      onClick: () => onCopy(grn),
    },
    hasPermission(user, "GRN", "email") && {
      icon: <FaEnvelope />,
      label: "Email",
      onClick: () => onEmail(grn._id),
    },
    hasPermission(user, "GRN", "print") && {
      icon: <FaPrint />,
      label: "Print",
      onClick: () => onPrint(grn._id),
    },
    hasPermission(user, "GRN", "delete") && {
      icon: <FaTrash />,
      label: "Delete",
      className: "text-red-600",
      onClick: () => onDelete(grn._id),
    },
  ].filter(Boolean);

  return <ActionMenu actions={actions} />;
}
