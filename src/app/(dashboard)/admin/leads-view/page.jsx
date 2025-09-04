"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function LeadsListPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  // ✅ Fetch Leads
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized! Please log in.");
        return;
      }

      const res = await axios.get("/api/lead", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (Array.isArray(res.data)) {
        setLeads(res.data);
      } else {
        console.warn("Unexpected response:", res.data);
        toast.warning("Unexpected response while fetching leads");
      }
    } catch (error) {
      console.error("Error fetching leads:", error);
      toast.error(error.response?.data?.message || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ✅ Search filter
  const displayLeads = useMemo(() => {
    if (!search.trim()) return leads;
    const q = search.toLowerCase();
    return leads.filter(
      (l) =>
        (l.firstName + " " + l.lastName).toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.mobileNo || "").toLowerCase().includes(q)
    );
  }, [leads, search]);

  // ✅ Delete Lead
  const handleDelete = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/lead/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLeads((prev) => prev.filter((l) => l._id !== id));
      toast.success("Lead deleted successfully");
    } catch {
      toast.error("Failed to delete lead");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-orange-600">
        All Leads
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search leads…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        <Link href="/admin/LeadDetailsFormMaster" className="sm:w-auto">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit /> New Lead
          </button>
        </Link>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table leads={displayLeads} onDelete={handleDelete} />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {displayLeads.map((lead, i) => (
              <Card key={lead._id} lead={lead} idx={i} onDelete={handleDelete} />
            ))}
            {!displayLeads.length && (
              <p className="text-center text-gray-500">No matching leads</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Desktop Table ================= */
function Table({ leads, onDelete }) {
  return (
    <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 text-sm">
        <tr>
          {["#", "Name", "Email", "Mobile No", "Status", ""].map((h) => (
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
        {leads.map((l, i) => (
          <tr
            key={l._id}
            className="border-b hover:bg-gray-50"
          >
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{l.firstName} {l.lastName}</td>
            <td className="px-4 py-3">{l.email || "-"}</td>
            <td className="px-4 py-3">{l.mobileNo || "-"}</td>
            <td className="px-4 py-3">{l.status || "-"}</td>
            <td className="px-4 py-3">
              <RowMenu lead={l} onDelete={onDelete} />
            </td>
          </tr>
        ))}
        {!leads.length && (
          <tr>
            <td
              colSpan={6}
              className="text-center py-6 text-gray-500"
            >
              No leads found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ================= Mobile Card ================= */
function Card({ lead, idx, onDelete }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700">
          #{idx + 1} • {lead.firstName} {lead.lastName}
        </div>
        <RowMenu lead={lead} onDelete={onDelete} isMobile />
      </div>
      <p className="text-sm text-gray-500">Email: {lead.email || "-"}</p>
      <p className="text-sm text-gray-500">Mobile: {lead.mobileNo || "-"}</p>
      <p className="text-sm text-gray-500">Status: {lead.status || "-"}</p>
    </div>
  );
}

/* ================= Dropdown Menu ================= */
function RowMenu({ lead, onDelete }) {
  const router = useRouter();

  const actions = [
    {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/admin/leads-view/${lead._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () => router.push(`/admin/LeadDetailsFormMaster/${lead._id}`),
    },
    {
      icon: <FaTrash />,
      label: "Delete",
      color: "text-red-600",
      onClick: () => onDelete(lead._id),
    },
  ];

  return <ActionMenu actions={actions} />;
}
