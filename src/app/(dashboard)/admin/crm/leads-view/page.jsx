"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaSearch,
  FaPlus,
  FaExchangeAlt,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function LeadsListPage() {
  const [leads, setLeads] = useState([]); // always an array
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLeads, setTotalLeads] = useState(0);
  const [convertingLeadId, setConvertingLeadId] = useState(null);

  const router = useRouter();
  const limit = 10;

  // ✅ Convert Lead to Opportunity (with full mapping)
  const handleConvertToOpportunity = async (lead) => {
    if (!lead || lead.convertedToOpportunity) {
      toast.warn("Lead already converted or invalid");
      return;
    }
    if (convertingLeadId === lead._id) return;

    let value = prompt("Enter estimated deal value (INR):", "50000");
    if (value === null) return;
    value = Number(value);
    if (isNaN(value) || value <= 0) {
      toast.error("Positive value required");
      return;
    }

    let closeDate = prompt(
      "Expected close date (YYYY-MM-DD):",
      new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
    );
    if (closeDate === null) return;
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(closeDate)) {
      toast.error("Invalid date format. Use YYYY-MM-DD");
      return;
    }

    const custom = lead.customFields || {};
    const opportunityData = {
      opportunityName: `${lead.firstName || ""} ${lead.lastName || ""} - ${lead.organizationName || "Deal"}`,
      accountName: lead.organizationName || `${lead.firstName || ""} ${lead.lastName || ""}`,
      value,
      closeDate,
      stage: "Qualification",
      probability: 20,
      leadSource: lead.source || "Lead Conversion",
      description: `Converted from lead. Source: ${lead.source || "unknown"}`,
      email: lead.email || "",
      phone: lead.phone || "",
      mobile: lead.mobileNo || "",
      pan: custom.pan || "",
      gst: custom.gstNumber || custom.gst || "",
      billingAddress: {
        street: custom.street || "",
        city: lead.city || "",
        state: lead.state || "",
        postalCode: custom.postalCode || custom.zipCode || "",
        country: "India",
      },
      shippingAddress: {
        street: custom.street || "",
        city: lead.city || "",
        state: lead.state || "",
        postalCode: custom.postalCode || custom.zipCode || "",
        country: "India",
      },
    };

    setConvertingLeadId(lead._id);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "/api/crm/lead/convert-to-opportunity",
        { leadId: lead._id, opportunityData },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success(`Lead "${lead.firstName} ${lead.lastName}" converted!`);
        fetchLeads(); // refresh list
        if (confirm("View the new opportunity?")) {
          router.push(`/admin/crm/opportunities/${res.data.opportunity._id}`);
        }
      } else {
        toast.error(res.data.error || "Conversion failed");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || "Conversion failed");
    } finally {
      setConvertingLeadId(null);
    }
  };

  // ✅ Fetch Leads with pagination & filters (safe array handling)
  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token");

      const params = {
        page: currentPage,
        limit,
        ...(search.trim() && { search: search.trim() }),
        ...(filterStatus !== "All" && { status: filterStatus }),
      };

      const res = await axios.get("/api/crm/lead", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      // ✅ Safe extraction: ensure leads is always an array
      const leadsData = Array.isArray(res.data.leads) ? res.data.leads : [];
      const pages = res.data.totalPages || 1;
      const total = res.data.total || 0;

      setLeads(leadsData);
      setTotalPages(pages);
      setTotalLeads(total);
    } catch (error) {
      console.error("Fetch leads error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch leads");
      setLeads([]); // ensure array on error
      setTotalPages(1);
      setTotalLeads(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, filterStatus]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus]);

  // ✅ Delete Lead
  const handleDelete = async (id) => {
    if (!confirm("Delete this lead?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/crm/lead/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Lead deleted");
      fetchLeads(); // refresh current page
    } catch (error) {
      toast.error("Delete failed");
    }
  };

  // ✅ Safe stats calculation (leads is guaranteed array)
  const stats = {
    total: totalLeads,
    // new: leads.filter((l) => l.status === "New" || l.status === "Lead").length,
    // contacted: leads.filter((l) => l.status === "Contacted").length,
    // qualified: leads.filter((l) => l.status === "Qualified").length,
    new: leads.reduce((acc, l) => acc + ((l.status === "New" || l.status === "Lead") ? 1 : 0), 0),
    contacted: leads.reduce((acc, l) => acc + (l.status === "Contacted" ? 1 : 0), 0),
    qualified: leads.reduce((acc, l) => acc + (l.status === "Qualified" ? 1 : 0), 0),
    converted: leads.reduce((acc, l) => acc + (l.status === "Converted" ? 1 : 0), 0),
    Open: leads.reduce((acc, l) => acc + (l.status === "Open" ? 1 : 0), 0),
    Opportunity: leads.reduce((acc, l) => acc + (l.status === "Opportunity" ? 1 : 0), 0),
    Interested: leads.reduce((acc, l) => acc + (l.status === "Interested" ? 1 : 0), 0),
    Customer: leads.reduce((acc, l) => acc + (l.status === "Customer" ? 1 : 0), 0),
  };

  // Pagination controls
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Leads Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {totalLeads} total potential customers
            </p>
          </div>
          <Link href="/admin/crm/LeadDetailsFormMaster">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
              <FaPlus className="text-xs" /> New Lead
            </button>
          </Link>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Leads", value: stats.total, emoji: "👥", filter: "All" },
            { label: "New", value: stats.new, emoji: "✨", filter: "New" },
            { label: "Contacted", value: stats.contacted, emoji: "📞", filter: "Contacted" },
            { label: "Qualified", value: stats.qualified, emoji: "🎯", filter: "Qualified" },
            { label: "Converted", value: stats.converted, emoji: "✅", filter: "Converted" },
            { label: "Open", value: stats.Open, emoji: "🟢", filter: "Open" },
            { label: "Opportunity", value: stats.Opportunity, emoji: "💡", filter: "Opportunity" },
            { label: "Interested", value: stats.Interested, emoji: "🤔", filter: "Interested" },
            { label: "Customer", value: stats.Customer, emoji: "📦", filter: "Customer" },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterStatus === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200"}`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">
                  {s.label}
                </p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">
                  {s.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
              />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "New", "Contacted", "Qualified", "Converted", "Open", "Opportunity", "Interested", "Customer"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStatus === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["#", "Lead Name", "Contact Info", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(limit).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(5).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3"><div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 animate-pulse" /></td>
                      ))}
                    </tr>
                  ))
                ) : leads.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-16"><div className="text-4xl mb-2 opacity-20">👥</div><p className="text-sm font-medium text-gray-300">No leads found</p></td></tr>
                ) : (
                  leads.map((l, idx) => (
                    <tr key={l._id} className="border-b border-gray-50 hover:bg-indigo-50/30">
                      <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">{(currentPage-1)*limit + idx + 1}</td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 text-sm">{l.firstName} {l.lastName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">ID: {l._id.slice(-6).toUpperCase()}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-indigo-600 font-medium">{l.email || "No Email"}</span>
                          <span className="text-[11px] text-gray-500 font-medium">{l.mobileNo || "No Phone"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={l.status} /></td>
                      <td className="px-4 py-3">
                        <RowMenu lead={l} onDelete={handleDelete} onConvert={handleConvertToOpportunity} isConverting={convertingLeadId === l._id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {leads.map((l, i) => (
              <Card key={l._id} lead={l} idx={i} onDelete={handleDelete} onConvert={handleConvertToOpportunity} isConverting={convertingLeadId === l._id} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <FaChevronLeft size={12} /> Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${currentPage === p ? "bg-indigo-600 text-white" : "text-gray-500 hover:bg-gray-100"}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                Next <FaChevronRight size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// StatusBadge component
const StatusBadge = ({ status }) => {
  const map = {
    Qualified: "bg-emerald-50 text-emerald-600",
    New: "bg-blue-50 text-blue-600",
    Contacted: "bg-amber-50 text-amber-600",
    Converted: "bg-purple-50 text-purple-600",
    Junk: "bg-red-50 text-red-500",
  };
  return (
    <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-500"}`}>
      {status || "—"}
    </span>
  );
};

// Card component for mobile
function Card({ lead, idx, onDelete, onConvert, isConverting }) {
  return (
    <div className="p-4 hover:bg-indigo-50/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded">
            LEAD #{idx + 1}
          </span>
          <p className="font-bold text-gray-900 text-sm mt-1.5">{lead.firstName} {lead.lastName}</p>
        </div>
        <RowMenu lead={lead} onDelete={onDelete} onConvert={onConvert} isConverting={isConverting} />
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <StatusBadge status={lead.status} />
        <span className="text-[11px] text-gray-500 font-medium">{lead.mobileNo || "No Phone"}</span>
      </div>
    </div>
  );
}

// RowMenu component
function RowMenu({ lead, onDelete, onConvert, isConverting }) {
  const router = useRouter();
  const actions = [
    {
      icon: <FaEye />,
      label: "View Detail",
      onClick: () => router.push(`/admin/crm/leads-view/${lead._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit Lead",
      onClick: () => router.push(`/admin/crm/LeadDetailsFormMaster/${lead._id}`),
    },
    {
      icon: <FaExchangeAlt />,
      label: isConverting ? "Converting..." : "Convert to Opportunity",
      onClick: () => !isConverting && onConvert(lead),
      disabled: isConverting,
    },
    {
      icon: <FaTrash />,
      color: "text-red-600",
      label: "Delete",
      onClick: () => onDelete(lead._id),
    },
  ];
  return <ActionMenu actions={actions} />;
}