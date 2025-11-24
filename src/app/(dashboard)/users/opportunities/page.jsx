"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";

import {
  FaEye,
  FaEdit,
  FaTrash,
  FaSearch,
} from "react-icons/fa";

import ActionMenu from "@/components/ActionMenu";

export default function OpportunityListPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  /* -----------------------------------------------------
     FETCH OPPORTUNITIES
  ----------------------------------------------------- */
  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const res = await axios.get("/api/opportunity?limit=500", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setOpportunities(res.data.data);
      } else {
        toast.warning("Unexpected response while fetching opportunities");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  /* -----------------------------------------------------
     SEARCH FILTER
  ----------------------------------------------------- */
  const filteredOpportunities = useMemo(() => {
    if (!search.trim()) return opportunities;
    const q = search.toLowerCase();

    return opportunities.filter((o) =>
      (o.opportunityName || "").toLowerCase().includes(q) ||
      (o.accountName || "").toLowerCase().includes(q) ||
      String(o.value || "").includes(q)
    );
  }, [search, opportunities]);

  /* -----------------------------------------------------
     DELETE OPPORTUNITY
  ----------------------------------------------------- */
  const handleDelete = async (id) => {
    if (!confirm("Delete this opportunity?")) return;

    try {
      const token = localStorage.getItem("token");

      const res = await axios.delete(`/api/opportunity/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        toast.success("Opportunity deleted");
        setOpportunities((prev) => prev.filter((o) => o._id !== id));
      } else {
        toast.error(res.data.error || "Failed to delete");
      }
    } catch {
      toast.error("Deletion failed");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">

      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-blue-700">
        All Opportunities
      </h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">

        {/* Search Box */}
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opportunities…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Add New Opportunity */}
        <Link href="/admin/OpportunityDetailsForm">
          <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
            <FaEdit /> New Opportunity
          </button>
        </Link>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block overflow-x-auto">
            <OpportunityTable
              data={filteredOpportunities}
              onDelete={handleDelete}
            />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredOpportunities.map((opp, index) => (
              <OpportunityCard
                key={opp._id}
                data={opp}
                idx={index}
                onDelete={handleDelete}
              />
            ))}

            {!filteredOpportunities.length && (
              <p className="text-center text-gray-500">No matching opportunities</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ==========================================================
   DESKTOP TABLE VIEW
========================================================== */
function OpportunityTable({ data, onDelete }) {
  return (
    <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 text-sm">
        <tr>
          {["#", "Opportunity Name", "Account", "Value", "Stage", "Probability", ""].map(
            (h) => (
              <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">
                {h}
              </th>
            )
          )}
        </tr>
      </thead>

      <tbody>
        {data.map((o, i) => (
          <tr key={o._id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3 font-medium">{o.opportunityName}</td>
            <td className="px-4 py-3">{o.accountName}</td>
            <td className="px-4 py-3">${o.value?.toLocaleString()}</td>
            <td className="px-4 py-3 capitalize">{o.stage}</td>
            <td className="px-4 py-3">{o.probability}%</td>
            <td className="px-4 py-3">
              <OpportunityActions data={o} onDelete={onDelete} />
            </td>
          </tr>
        ))}

        {!data.length && (
          <tr>
            <td colSpan={7} className="text-center py-6 text-gray-500">
              No opportunities found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ==========================================================
   MOBILE CARD VIEW
========================================================== */
function OpportunityCard({ data, idx, onDelete }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700">
          #{idx + 1} • {data.opportunityName}
        </div>
        <OpportunityActions data={data} onDelete={onDelete} isMobile />
      </div>

      <p className="text-sm text-gray-500">Account: {data.accountName}</p>
      <p className="text-sm text-gray-500">Value: ${data.value?.toLocaleString()}</p>
      <p className="text-sm text-gray-500">Stage: {data.stage}</p>
      <p className="text-sm text-gray-500">Probability: {data.probability}%</p>
    </div>
  );
}

/* ==========================================================
   ACTION MENU (VIEW / EDIT / DELETE)
========================================================== */
function OpportunityActions({ data, onDelete }) {
  const router = useRouter();

  const actions = [
    {
      icon: <FaEye />,
      label: "View",
      onClick: () => router.push(`/opportunity/${data._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit",
      onClick: () => router.push(`/opportunity/edit/${data._id}`),
    },
    {
      icon: <FaTrash />,
      label: "Delete",
      color: "text-red-600",
      onClick: () => onDelete(data._id),
    },
  ];

  return <ActionMenu actions={actions} />;
}
