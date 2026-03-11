"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
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
  FaUserFriends,
  FaCopy,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function LeadsListPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const router = useRouter();

  // ✅ Copy Lead to Opportunity (sessionStorage)
  const handleCopyToOpportunity = (lead) => {
    if (!lead || typeof lead !== "object") {
      console.error("Invalid lead:", lead);
      return;
    }
    const dataToStore = { ...lead, leadId: lead._id };
    sessionStorage.setItem("opportunityCopyData", JSON.stringify(dataToStore));
    router.push("/admin/OpportunityDetailsForm");
  };

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
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to fetch leads");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // ✅ Search & Status filter
  const displayLeads = useMemo(() => {
    return leads.filter((l) => {
      const fullName = `${l.firstName} ${l.lastName}`.toLowerCase();
      const matchSearch =
        !search.trim() ||
        fullName.includes(search.toLowerCase()) ||
        (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
        (l.mobileNo || "").toLowerCase().includes(search.toLowerCase());

      const matchStatus = filterStatus === "All" || l.status === filterStatus;

      return matchSearch && matchStatus;
    });
  }, [leads, search, filterStatus]);

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

  // ── Stat counts ──
  const stats = {
    total: leads.length,
    new: leads.filter((l) => l.status === "New" || l.status === "Lead").length,
    contacted: leads.filter((l) => l.status === "Contacted").length,
    qualified: leads.filter((l) => l.status === "Qualified").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              Leads Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {leads.length} total potential customers
            </p>
          </div>
          <Link href="/admin/LeadDetailsFormMaster">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> New Lead
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total Leads", value: stats.total, emoji: "👥", filter: "All" },
            { label: "New", value: stats.new, emoji: "✨", filter: "New" },
            { label: "Contacted", value: stats.contacted, emoji: "📞", filter: "Contacted" },
            { label: "Qualified", value: stats.qualified, emoji: "🎯", filter: "Qualified" },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => setFilterStatus(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${
                  filterStatus === s.filter
                    ? "border-indigo-400 shadow-md shadow-indigo-100"
                    : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"
                }`}
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

        {/* ── Table Card ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, email, phone..."
              />
            </div>

            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "New", "Contacted", "Qualified"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${
                      filterStatus === s
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"
                    }`}
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
                  {["#", "Lead Name", "Contact Info", "Status", "Actions"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        {Array(5)
                          .fill(0)
                          .map((__, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                            </td>
                          ))}
                      </tr>
                    ))
                ) : displayLeads.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="text-4xl mb-2 opacity-20">👥</div>
                      <p className="text-sm font-medium text-gray-300">
                        No leads found
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayLeads.map((l, idx) => (
                    <tr
                      key={l._id}
                      className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-gray-900 text-sm">
                          {l.firstName} {l.lastName}
                        </p>
                        <p className="text-[10px] text-gray-400 font-mono">
                          ID: {l._id.slice(-6).toUpperCase()}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="text-xs text-indigo-600 font-medium hover:underline cursor-pointer">
                            {l.email || "No Email"}
                          </span>
                          <span className="text-[11px] text-gray-500 font-medium">
                            {l.mobileNo || "No Phone"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={l.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RowMenu
                          lead={l}
                          onDelete={handleDelete}
                          onCopy={handleCopyToOpportunity}
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-50">
            {displayLeads.map((l, i) => (
              <Card
                key={l._id}
                lead={l}
                idx={i}
                onDelete={handleDelete}
                onCopy={handleCopyToOpportunity}
              />
            ))}
          </div>
        </div>
      </div>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );
}

const StatusBadge = ({ status }) => {
  const map = {
    Qualified: "bg-emerald-50 text-emerald-600",
    New: "bg-blue-50 text-blue-600",
    Contacted: "bg-amber-50 text-amber-600",
    Junk: "bg-red-50 text-red-500",
  };
  return (
    <span
      className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
        map[status] || "bg-gray-100 text-gray-500"
      }`}
    >
      {status || "—"}
    </span>
  );
};

function Card({ lead, idx, onDelete, onCopy }) {
  return (
    <div className="p-4 hover:bg-indigo-50/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <span className="font-mono text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded">
            LEAD #{idx + 1}
          </span>
          <p className="font-bold text-gray-900 text-sm mt-1.5">
            {lead.firstName} {lead.lastName}
          </p>
        </div>
        <RowMenu lead={lead} onDelete={onDelete} onCopy={onCopy} />
      </div>
      <div className="flex flex-wrap items-center gap-3 mt-2">
        <StatusBadge status={lead.status} />
        <span className="text-[11px] text-gray-500 font-medium">
          {lead.mobileNo || "No Phone"}
        </span>
      </div>
    </div>
  );
}

function RowMenu({ lead, onDelete, onCopy }) {
  const router = useRouter();

  const actions = [
    {
      icon: <FaEye />,
      label: "View Detail",
      onClick: () => router.push(`/admin/leads-view/${lead._id}`),
    },
    {
      icon: <FaEdit />,
      label: "Edit Lead",
      onClick: () => router.push(`/admin/LeadDetailsFormMaster/${lead._id}`),
    },
    {
      icon: <FaCopy />,
      label: "Copy to Opportunity",
      onClick: () => onCopy(lead),
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


// "use client";

// import { useState, useEffect, useMemo, useCallback } from "react";
// import Link from "next/link";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";
// import {
//   FaEdit,
//   FaTrash,
//   FaEye,
//   FaSearch,
// } from "react-icons/fa";
// import ActionMenu from "@/components/ActionMenu";

// export default function LeadsListPage() {
//   const [leads, setLeads] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");

//   const router = useRouter();

//   // ✅ Copy Lead to Opportunity (sessionStorage)
//   const handleCopyToOpportunity = (lead) => {
//     if (!lead || typeof lead !== "object") {
//       console.error("Invalid lead:", lead);
//       return;
//     }

//     const dataToStore = {
//       ...lead,
//       leadId: lead._id,
//     };

//     sessionStorage.setItem(
//       "opportunityCopyData",
//       JSON.stringify(dataToStore)
//     );

//     // redirect to Opportunity NEW form
//     router.push("/admin/OpportunityDetailsForm");
//   };

//   // ✅ Fetch Leads
//   const fetchLeads = useCallback(async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         toast.error("Unauthorized! Please log in.");
//         return;
//       }

//       const res = await axios.get("/api/lead", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (Array.isArray(res.data)) {
//         setLeads(res.data);
//       } else {
//         toast.warning("Unexpected response while fetching leads");
//       }
//     } catch (error) {
//       toast.error(error.response?.data?.message || "Failed to fetch leads");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchLeads();
//   }, [fetchLeads]);

//   // ✅ Search filter
//   const displayLeads = useMemo(() => {
//     if (!search.trim()) return leads;
//     const q = search.toLowerCase();
//     return leads.filter(
//       (l) =>
//         (l.firstName + " " + l.lastName).toLowerCase().includes(q) ||
//         (l.email || "").toLowerCase().includes(q) ||
//         (l.mobileNo || "").toLowerCase().includes(q)
//     );
//   }, [leads, search]);

//   // ✅ Delete Lead
//   const handleDelete = async (id) => {
//     if (!confirm("Delete this lead?")) return;
//     try {
//       const token = localStorage.getItem("token");
//       await axios.delete(`/api/lead/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setLeads((prev) => prev.filter((l) => l._id !== id));
//       toast.success("Lead deleted successfully");
//     } catch {
//       toast.error("Failed to delete lead");
//     }
//   };

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-orange-600">
//         All Leads
//       </h1>

//       {/* Toolbar */}
//       <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
//         <div className="relative flex-1 max-w-md">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search leads…"
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-orange-500 outline-none"
//           />
//         </div>

//         <Link href="/admin/LeadDetailsFormMaster" className="sm:w-auto">
//           <button className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit /> New Lead
//           </button>
//         </Link>
//       </div>

//       {/* Table / Cards */}
//       {loading ? (
//         <p className="text-center text-gray-500">Loading…</p>
//       ) : (
//         <>
//           {/* Desktop Table */}
//           <div className="hidden md:block overflow-x-auto">
//             <Table
//               leads={displayLeads}
//               onDelete={handleDelete}
//               onCopy={handleCopyToOpportunity}
//             />
//           </div>

//           {/* Mobile Cards */}
//           <div className="md:hidden space-y-4">
//             {displayLeads.map((lead, i) => (
//               <Card
//                 key={lead._id}
//                 lead={lead}
//                 idx={i}
//                 onDelete={handleDelete}
//                 onCopy={handleCopyToOpportunity}
//               />
//             ))}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* ================= Desktop Table ================= */
// function Table({ leads, onDelete, onCopy }) {
//   return (
//     <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
//       <thead className="bg-gray-100 text-sm">
//         <tr>
//           {["#", "Name", "Email", "Mobile No", "Status", ""].map((h) => (
//             <th
//               key={h}
//               className="px-4 py-3 text-left font-semibold text-gray-700"
//             >
//               {h}
//             </th>
//           ))}
//         </tr>
//       </thead>
//       <tbody>
//         {leads.map((l, i) => (
//           <tr key={l._id} className="border-b hover:bg-gray-50">
//             <td className="px-4 py-3">{i + 1}</td>
//             <td className="px-4 py-3">{l.firstName} {l.lastName}</td>
//             <td className="px-4 py-3">{l.email || "-"}</td>
//             <td className="px-4 py-3">{l.mobileNo || "-"}</td>
//             <td className="px-4 py-3">{l.status || "-"}</td>
//             <td className="px-4 py-3">
//               <RowMenu lead={l} onDelete={onDelete} onCopy={onCopy} />
//             </td>
//           </tr>
//         ))}
//       </tbody>
//     </table>
//   );
// }

// /* ================= Mobile Card ================= */
// function Card({ lead, idx, onDelete, onCopy }) {
//   return (
//     <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
//       <div className="flex justify-between">
//         <div className="font-semibold text-gray-700">
//           #{idx + 1} • {lead.firstName} {lead.lastName}
//         </div>
//         <RowMenu lead={lead} onDelete={onDelete} onCopy={onCopy} />
//       </div>
//       <p className="text-sm text-gray-500">Email: {lead.email || "-"}</p>
//       <p className="text-sm text-gray-500">Mobile: {lead.mobileNo || "-"}</p>
//       <p className="text-sm text-gray-500">Status: {lead.status || "-"}</p>
//     </div>
//   );
// }

// /* ================= Dropdown Menu ================= */
// function RowMenu({ lead, onDelete, onCopy }) {
//   const router = useRouter();

//   const actions = [
//     {
//       icon: <FaEye />,
//       label: "View",
//       onClick: () => router.push(`/admin/leads-view/${lead._id}`),
//     },
//     {
//       icon: <FaEdit />,
//       label: "Edit",
//       onClick: () => router.push(`/admin/LeadDetailsFormMaster/${lead._id}`),
//     },
//     {
//       icon: <FaEdit />,
//       label: "Copy Lead to Opportunity",
//       onClick: () => onCopy(lead),
//     },
//     {
//       icon: <FaTrash />,
//       color: "text-red-600",
//       label: "Delete",
//       onClick: () => onDelete(lead._id),
//     },
//   ];

//   return <ActionMenu actions={actions} />;
// }
