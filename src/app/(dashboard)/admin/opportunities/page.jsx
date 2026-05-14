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
  FaPlus,
  FaHandshake,
  FaChartLine,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

export default function OpportunityListPage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStage, setFilterStage] = useState("All");
  const router = useRouter();

  const fetchOpportunities = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/opportunity?limit=500", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success) {
        setOpportunities(res.data.data);
      }
    } catch (err) {
      toast.error("Failed to load opportunities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const filteredOpportunities = useMemo(() => {
    return opportunities.filter((o) => {
      const q = search.toLowerCase();
      const matchSearch =
        !search.trim() ||
        (o.opportunityName || "").toLowerCase().includes(q) ||
        (o.accountName || "").toLowerCase().includes(q);
      
      const matchStage = filterStage === "All" || o.stage === filterStage;
      
      return matchSearch && matchStage;
    });
  }, [search, opportunities, filterStage]);

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
      }
    } catch {
      toast.error("Deletion failed");
    }
  };

  // ── Stats Calculation ──
  const stats = {
    total: opportunities.length,
    totalValue: opportunities.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0),
    negotiation: opportunities.filter(o => o.stage === "Negotiation").length,
    closedWon: opportunities.filter(o => o.stage === "Closed Won").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-2">
              <FaHandshake className="text-indigo-600" /> Sales Opportunities
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Pipeline value: <span className="text-indigo-600 font-bold">₹{stats.totalValue.toLocaleString("en-IN")}</span>
            </p>
          </div>
          <Link href="/admin/OpportunityDetailsForm">
            <button className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> New Opportunity
            </button>
          </Link>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Active Deals", value: stats.total, emoji: "📁", filter: "All" },
            { label: "In Negotiation", value: stats.negotiation, emoji: "🤝", filter: "Negotiation" },
            { label: "Closed Won", value: stats.closedWon, emoji: "🏆", filter: "Closed Won" },
            { label: "Win Rate", value: `${Math.round((stats.closedWon / stats.total) * 100 || 0)}%`, emoji: "📈", filter: "All" },
          ].map((s) => (
            <div
              key={s.label}
              onClick={() => s.filter && setFilterStage(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterStage === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}
            >
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
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
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search deals or accounts..."
              />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All", "Qualification", "Proposal", "Negotiation", "Closed Won"].map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterStage(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterStage === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300"}`}
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
                  {["#", "Opportunity", "Account", "Expected Value", "Stage", "Prob.", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr className="animate-pulse">
                    <td colSpan={7} className="text-center py-10 text-gray-400 italic">Syncing pipeline...</td>
                  </tr>
                ) : filteredOpportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16 text-gray-300">No opportunities found in this stage.</td>
                  </tr>
                ) : (
                  filteredOpportunities.map((o, i) => (
                    <tr key={o._id} className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-gray-300 font-mono">{i + 1}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{o.opportunityName}</td>
                      <td className="px-4 py-3 text-gray-600 font-medium">{o.accountName}</td>
                      <td className="px-4 py-3 font-mono font-bold text-gray-800">
                        ₹{Number(o.value || 0).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <StageBadge stage={o.stage} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${o.probability}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-400">{o.probability}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <OpportunityActions data={o} onDelete={handleDelete} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden divide-y divide-gray-50">
            {filteredOpportunities.map((opp, index) => (
              <OpportunityCard key={opp._id} data={opp} idx={index} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const StageBadge = ({ stage }) => {
  const map = {
    "Closed Won": "bg-emerald-50 text-emerald-600",
    "Negotiation": "bg-indigo-50 text-indigo-600",
    "Proposal": "bg-blue-50 text-blue-600",
    "Qualification": "bg-amber-50 text-amber-600",
    "Closed Lost": "bg-red-50 text-red-500",
  };
  return (
    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${map[stage] || "bg-gray-100 text-gray-500"}`}>
      {stage || "Draft"}
    </span>
  );
};

function OpportunityCard({ data, idx, onDelete }) {
  return (
    <div className="p-4 hover:bg-indigo-50/20 transition-colors">
      <div className="flex justify-between items-start mb-2">
        <div>
          <span className="font-mono text-[10px] font-bold text-indigo-400">#{idx + 1}</span>
          <p className="font-bold text-gray-900 text-sm">{data.opportunityName}</p>
        </div>
        <OpportunityActions data={data} onDelete={onDelete} />
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        <StageBadge stage={data.stage} />
        <span className="text-xs font-bold text-gray-800">₹{data.value?.toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}

function OpportunityActions({ data, onDelete }) {
  const router = useRouter();
  const actions = [
    { icon: <FaEye />, label: "View Deal", onClick: () => router.push(`/admin/opportunity/${data._id}`) },
    { icon: <FaEdit />, label: "Edit Deal", onClick: () => router.push(`/admin/OpportunityDetailsForm?editId=${data._id}`) },
    { icon: <FaChartLine />, label: "View Analytics", onClick: () => {} },
    { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(data._id) },
  ];
  return <ActionMenu actions={actions} />;
}


// "use client";

// import { useState, useEffect, useMemo, useCallback } from "react";
// import axios from "axios";
// import Link from "next/link";
// import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";

// import {
//   FaEye,
//   FaEdit,
//   FaTrash,
//   FaSearch,
// } from "react-icons/fa";

// import ActionMenu from "@/components/ActionMenu";

// export default function OpportunityListPage() {
//   const [opportunities, setOpportunities] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [search, setSearch] = useState("");
//   const router = useRouter();

//   /* -----------------------------------------------------
//      FETCH OPPORTUNITIES
//   ----------------------------------------------------- */
//   const fetchOpportunities = useCallback(async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");

//       const res = await axios.get("/api/opportunity?limit=500", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data?.success) {
//         setOpportunities(res.data.data);
//       } else {
//         toast.warning("Unexpected response while fetching opportunities");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to load opportunities");
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   useEffect(() => {
//     fetchOpportunities();
//   }, [fetchOpportunities]);

//   /* -----------------------------------------------------
//      SEARCH FILTER
//   ----------------------------------------------------- */
//   const filteredOpportunities = useMemo(() => {
//     if (!search.trim()) return opportunities;
//     const q = search.toLowerCase();

//     return opportunities.filter((o) =>
//       (o.opportunityName || "").toLowerCase().includes(q) ||
//       (o.accountName || "").toLowerCase().includes(q) ||
//       String(o.value || "").includes(q)
//     );
//   }, [search, opportunities]);

//   /* -----------------------------------------------------
//      DELETE OPPORTUNITY
//   ----------------------------------------------------- */
//   const handleDelete = async (id) => {
//     if (!confirm("Delete this opportunity?")) return;

//     try {
//       const token = localStorage.getItem("token");

//       const res = await axios.delete(`/api/opportunity/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data.success) {
//         toast.success("Opportunity deleted");
//         setOpportunities((prev) => prev.filter((o) => o._id !== id));
//       } else {
//         toast.error(res.data.error || "Failed to delete");
//       }
//     } catch {
//       toast.error("Deletion failed");
//     }
//   };

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">

//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center text-blue-700">
//         All Opportunities
//       </h1>

//       {/* Toolbar */}
//       <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">

//         {/* Search Box */}
//         <div className="relative flex-1 max-w-md">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search opportunities…"
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
//           />
//         </div>

//         {/* Add New Opportunity */}
//         <Link href="/admin/OpportunityDetailsForm">
//           <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit /> New Opportunity
//           </button>
//         </Link>
//       </div>

//       {/* Table / Cards */}
//       {loading ? (
//         <p className="text-center text-gray-500">Loading…</p>
//       ) : (
//         <>
//           <div className="hidden md:block overflow-x-auto">
//             <OpportunityTable
//               data={filteredOpportunities}
//               onDelete={handleDelete}
//             />
//           </div>

//           {/* Mobile Cards */}
//           <div className="md:hidden space-y-4">
//             {filteredOpportunities.map((opp, index) => (
//               <OpportunityCard
//                 key={opp._id}
//                 data={opp}
//                 idx={index}
//                 onDelete={handleDelete}
//               />
//             ))}

//             {!filteredOpportunities.length && (
//               <p className="text-center text-gray-500">No matching opportunities</p>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* ==========================================================
//    DESKTOP TABLE VIEW
// ========================================================== */
// function OpportunityTable({ data, onDelete }) {
//   return (
//     <table className="min-w-full bg-white shadow rounded-lg overflow-hidden">
//       <thead className="bg-gray-100 text-sm">
//         <tr>
//           {["#", "Opportunity Name", "Account", "Value", "Stage", "Probability", ""].map(
//             (h) => (
//               <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700">
//                 {h}
//               </th>
//             )
//           )}
//         </tr>
//       </thead>

//       <tbody>
//         {data.map((o, i) => (
//           <tr key={o._id} className="border-b hover:bg-gray-50">
//             <td className="px-4 py-3">{i + 1}</td>
//             <td className="px-4 py-3 font-medium">{o.opportunityName}</td>
//             <td className="px-4 py-3">{o.accountName}</td>
//             <td className="px-4 py-3">${o.value?.toLocaleString()}</td>
//             <td className="px-4 py-3 capitalize">{o.stage}</td>
//             <td className="px-4 py-3">{o.probability}%</td>
//             <td className="px-4 py-3">
//               <OpportunityActions data={o} onDelete={onDelete} />
//             </td>
//           </tr>
//         ))}

//         {!data.length && (
//           <tr>
//             <td colSpan={7} className="text-center py-6 text-gray-500">
//               No opportunities found.
//             </td>
//           </tr>
//         )}
//       </tbody>
//     </table>
//   );
// }

// /* ==========================================================
//    MOBILE CARD VIEW
// ========================================================== */
// function OpportunityCard({ data, idx, onDelete }) {
//   return (
//     <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
//       <div className="flex justify-between">
//         <div className="font-semibold text-gray-700">
//           #{idx + 1} • {data.opportunityName}
//         </div>
//         <OpportunityActions data={data} onDelete={onDelete} isMobile />
//       </div>

//       <p className="text-sm text-gray-500">Account: {data.accountName}</p>
//       <p className="text-sm text-gray-500">Value: ${data.value?.toLocaleString()}</p>
//       <p className="text-sm text-gray-500">Stage: {data.stage}</p>
//       <p className="text-sm text-gray-500">Probability: {data.probability}%</p>
//     </div>
//   );
// }

// /* ==========================================================
//    ACTION MENU (VIEW / EDIT / DELETE)
// ========================================================== */
// function OpportunityActions({ data, onDelete }) {
//   const router = useRouter();

//   const actions = [
//     {
//       icon: <FaEye />,
//       label: "View",
//       onClick: () => router.push(`/opportunity/${data._id}`),
//     },
//     {
//       icon: <FaEdit />,
//       label: "Edit",
//       onClick: () => router.push(`/opportunity/edit/${data._id}`),
//     },
//     {
//       icon: <FaTrash />,
//       label: "Delete",
//       color: "text-red-600",
//       onClick: () => onDelete(data._id),
//     },
//   ];

//   return <ActionMenu actions={actions} />;
// }
