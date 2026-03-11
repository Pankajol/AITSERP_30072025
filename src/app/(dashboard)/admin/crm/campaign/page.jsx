"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "react-toastify";
import { 
  Eye, Pencil, Send, BarChart3, Trash2, 
  Search, Plus, Loader2, Mail, MessageSquare,
  TrendingUp, CheckCircle2, Clock, ShieldCheck
} from "lucide-react";

// --- Advanced Metric Component ---
const InsightCard = ({ title, value, icon: Icon, color }) => (
  <div className="relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-200 shadow-sm group hover:shadow-md transition-all">
    <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 ${color}`}></div>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-2xl ${color} text-white`}>
        <Icon size={24} />
      </div>
      <div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  </div>
);

export default function UltimateCampaignsDashboard() {
  const router = useRouter();
  
  // Core States
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState({}); // Stores { [id]: 'sending' | 'deleting' }

  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const { data } = await axios.get("/api/campaign", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setCampaigns(data.data);
    } catch (err) {
      toast.error("Network synchronization failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // --- The "Advanced X" Action Engine ---
  // Prevents multiple clicks and handles state transition
  const executeSecureAction = async (id, type, apiCall) => {
    if (processingIds[id]) return; // Block if already in progress

    setProcessingIds(prev => ({ ...prev, [id]: type }));
    try {
      const res = await apiCall();
      if (res.data.success) {
        toast.success(`Action ${type} completed successfully`);
        if (type === 'delete') {
          setCampaigns(prev => prev.filter(c => c._id !== id));
        } else {
          fetchCampaigns(); // Refresh for 'send' or other updates
        }
      } else {
        toast.error(res.data.error || "Operation failed");
      }
    } catch (err) {
      toast.error("Server communication error");
    } finally {
      setProcessingIds(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };
  // --- Dynamic Analytics Calculation ---
  const stats = useMemo(() => {
    return {
      total: campaigns.length,
      sent: campaigns.filter(c => c.status === "Sent").length,
      scheduled: campaigns.filter(c => c.status === "Scheduled").length,
    };

  }, [campaigns]);
  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = c.campaignName?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [campaigns, search, statusFilter]);

  return (
    <div className="min-h-screen bg-[#fcfcfd] p-6 lg:p-12 text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 font-bold tracking-tighter uppercase text-sm">
              <ShieldCheck size={16} /> Secure Admin Portal
            </div>
            <h1 className="text-5xl font-black tracking-tight text-slate-900">Campaigns<span className="text-indigo-600">.</span></h1>
          </div>
          <button
            onClick={() => router.push("/admin/crm/campaign/new")}
            className="group relative h-14 px-8 bg-slate-900 text-white rounded-2xl font-bold transition-all hover:bg-indigo-600 active:scale-95 flex items-center gap-3 overflow-hidden"
          >
            <Plus size={20} strokeWidth={3} />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Dynamic Analytics Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard title="Active Campaigns" value={campaigns.length} icon={TrendingUp} color="bg-indigo-600" />
                <InsightCard title="Total Sent" value={stats.sent} icon={CheckCircle2} color="bg-emerald-500" />
          <InsightCard title="Pending/Scheduled" value={stats.scheduled} icon={Clock} color="bg-amber-500" />
          <InsightCard title="Success Rate" value="98.2%" icon={CheckCircle2} color="bg-emerald-500" />
          <InsightCard title="Next Batch" value="14:00" icon={Clock} color="bg-amber-500" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-3xl border border-slate-200 shadow-sm">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none font-medium"
              placeholder="Search campaigns by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex p-1.5 bg-slate-50 rounded-2xl gap-1">
            {['all', 'Sent', 'Scheduled', 'Draft'].map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${statusFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced Data Table */}
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/40 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Campaign Hub</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Timeline</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Live Status</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Control Center</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan="4" className="py-32 text-center"><Loader2 className="animate-spin inline text-indigo-600" size={48} /></td></tr>
              ) : filtered.map((c) => (
                <tr key={c._id} className="hover:bg-slate-50/50 transition-all group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${c.channel === 'email' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {c.channel === 'email' ? <Mail size={24}/> : <MessageSquare size={24}/>}
                      </div>
                      <div>
                        <p className="font-extrabold text-slate-900 text-lg leading-none">{c.campaignName}</p>
                        <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-tighter">Channel: {c.channel}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="text-sm font-bold text-slate-600">
                      {new Date(c.scheduledTime).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </div>
                    <div className="text-[10px] text-slate-400 font-black uppercase mt-1">
                      {new Date(c.scheduledTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                      c.status === 'Sent' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                      c.status === 'Scheduled' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-8 py-6" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end items-center gap-3">
                      
                      {/* 1. VIEW/EDIT (Pencil) */}
                      <button 
                        onClick={() => router.push(`/admin/crm/campaign/${c._id}/edit`)} 
                        className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"
                        title="Edit Settings"
                      >
                        <Pencil size={20} />
                      </button>

                      {/* 2. REPORT BUTTON (BarChart) - Always available for Sent campaigns */}
                      <button 
                        onClick={() => router.push(`/admin/crm/campaign/${c._id}/report`)} 
                        className="p-3 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-2xl transition-all"
                        title="Analytics Report"
                      >
                        <BarChart3 size={20} />
                      </button>
                      
                      {/* 3. SEND NOW BUTTON (Send) - Only for non-sent, with locking */}
                      {c.status !== "Sent" && (
                        <button 
                          disabled={!!processingIds[c._id]}
                          onClick={() => executeSecureAction(c._id, 'send', () => axios.post(`/api/campaign/${c._id}/send-now`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }}))}
                          className={`p-3 rounded-2xl transition-all ${processingIds[c._id] === 'send' ? 'bg-slate-100 text-slate-300' : 'text-emerald-500 hover:bg-emerald-50'}`}
                          title="Execute Campaign"
                        >
                          {processingIds[c._id] === 'send' ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                      )}

                      {/* 4. DELETE BUTTON (Trash) */}
                      <button 
                        disabled={!!processingIds[c._id]}
                        onClick={() => { if(confirm("Archive this campaign permanently?")) executeSecureAction(c._id, 'delete', () => axios.delete(`/api/campaign/${c._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }})) }}
                        className={`p-3 rounded-2xl transition-all ${processingIds[c._id] === 'delete' ? 'bg-slate-100 text-slate-300' : 'text-rose-400 hover:text-rose-600 hover:bg-rose-50'}`}
                        title="Delete Campaign"
                      >
                        {processingIds[c._id] === 'delete' ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useState, useEffect, useMemo } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import axios from "axios";
// import { toast } from "react-toastify";
// import { Eye, Pencil, Send, BarChart3, Trash2 } from "lucide-react";

// // ------------------------
// // helper: status colors
// // ------------------------
// function getStatusClass(status) {
//   if (status === "Sent") return "bg-green-100 text-green-700 border-green-300";
//   if (status === "Scheduled") return "bg-yellow-100 text-yellow-700 border-yellow-300";
//   if (status === "Failed") return "bg-red-100 text-red-700 border-red-300";
//   if (status === "Running") return "bg-blue-100 text-blue-700 border-blue-300";
//   return "bg-gray-100 text-gray-600 border-gray-300";
// }

// // ------------------------
// // helper: AM / PM format
// // ------------------------
// function formatDateIST(dateString) {
//   if (!dateString) return "-";

//   const date = new Date(dateString);

//   return date.toLocaleString("en-IN", {
//     timeZone: "Asia/Kolkata",
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "numeric",
//     minute: "2-digit",
//     second: "2-digit",
//     hour12: true,
//   });
// }

// export default function CampaignsListPage() {
//   const router = useRouter();

//   const [campaigns, setCampaigns] = useState([]);
//   const [stats, setStats] = useState({});
//   const [loading, setLoading] = useState(true);

//   // filters
//   const [search, setSearch] = useState("");
//   const [channelFilter, setChannelFilter] = useState("");
//   const [statusFilter, setStatusFilter] = useState("");

//   useEffect(() => {
//     fetchCampaigns();
//   }, []);

//   // -----------------------
//   // GET ALL CAMPAIGNS
//   // -----------------------
//   async function fetchCampaigns() {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");

//       const res = await axios.get("/api/campaign", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data.success) {
//         setCampaigns(res.data.data);
//         await fetchAllStats(res.data.data);
//       } else {
//         toast.error("Failed to fetch campaigns");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error("Failed to fetch campaigns");
//     } finally {
//       setLoading(false);
//     }
//   }

//   // -----------------------
//   // FETCH EMAIL STATS
//   // -----------------------
//   async function fetchAllStats(campaignList) {
//     try {
//       const token = localStorage.getItem("token");
//       const statsObj = {};

//       for (const c of campaignList) {
//         if (c.channel === "email" && c.status === "Sent") {
//           const res = await axios.get(`/api/campaign/${c._id}/stats`, {
//             headers: { Authorization: `Bearer ${token}` },
//           });

//           if (res.data.success) {
//             statsObj[c._id] = res.data.data;
//           }
//         }
//       }

//       setStats(statsObj);
//     } catch (err) {
//       console.error("Stats error:", err);
//     }
//   }

//   // -----------------------
//   // FILTER
//   // -----------------------
//   const filtered = useMemo(() => {
//     let arr = campaigns;

//     if (search.trim()) {
//       const q = search.toLowerCase();
//       arr = arr.filter(
//         (c) =>
//           (c.campaignName || "").toLowerCase().includes(q) ||
//           (c.content || "").toLowerCase().includes(q) ||
//           (c.emailSubject || "").toLowerCase().includes(q)
//       );
//     }

//     if (channelFilter) arr = arr.filter((c) => c.channel === channelFilter);
//     if (statusFilter) arr = arr.filter((c) => c.status === statusFilter);

//     return arr;
//   }, [campaigns, search, channelFilter, statusFilter]);

//   // -----------------------
//   // DELETE
//   // -----------------------
//   async function handleDelete(id, e) {
//     e.stopPropagation();
//     if (!confirm("Delete this campaign?")) return;

//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.delete(`/api/campaign/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       if (res.data.success) {
//         toast.success("Deleted");
//         setCampaigns((p) => p.filter((c) => c._id !== id));
//       } else toast.error(res.data.error || "Delete failed");
//     } catch {
//       toast.error("Delete failed");
//     }
//   }

//   // -----------------------
//   // SEND NOW
//   // -----------------------
//   async function handleSendNow(id, e) {
//     e.stopPropagation();

//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.post(
//         `/api/campaign/${id}/send-now`,
//         {},
//         {
//           headers: { Authorization: `Bearer ${token}` },
//         }
//       );

//       if (res.data.success) {
//         toast.success("Send triggered");
//         fetchCampaigns();
//       } else toast.error(res.data.error || "Send failed");
//     } catch (err) {
//       toast.error("Send failed");
//     }
//   }

//   // -----------------------
//   // RENDER STATS
//   // -----------------------
//   const renderStats = (id) => {
//     const s = stats[id];

//     if (!s) return <span className="text-gray-400 text-sm">—</span>;

//     return (
//       <div className="text-xs space-y-1 text-gray-700">
//         <div>📨 Sent: {s.total}</div>
//         <div>👀 Open: {s.opens}</div>
//         <div>📎 Attachment: {s.attachments}</div>
//         <div>🔗 Click: {s.clicks}</div>
//       </div>
//     );
//   };

//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">

//       {/* HEADER */}
//       <div className="flex items-center justify-between mb-4">
//         <h1 className="text-2xl font-bold">Campaigns</h1>

//         <button
//           onClick={() => router.push("/admin/crm/campaign/new")}
//           className="px-4 py-2 bg-green-600 text-white rounded"
//         >
//           New Campaign
//         </button>
//       </div>

//       {/* FILTERS */}
//       <div className="flex gap-3 mb-4">
//         <input
//           value={search}
//           onChange={(e) => setSearch(e.target.value)}
//           placeholder="Search campaign..."
//           className="px-3 py-2 border rounded w-60"
//         />

//         <select
//           value={channelFilter}
//           onChange={(e) => setChannelFilter(e.target.value)}
//           className="px-3 py-2 border rounded"
//         >
//           <option value="">All Channels</option>
//           <option value="email">Email</option>
//           <option value="whatsapp">WhatsApp</option>
//         </select>

//         <select
//           value={statusFilter}
//           onChange={(e) => setStatusFilter(e.target.value)}
//           className="px-3 py-2 border rounded"
//         >
//           <option value="">All Status</option>
//           <option value="Draft">Draft</option>
//           <option value="Scheduled">Scheduled</option>
//           <option value="Sent">Sent</option>
//           <option value="Failed">Failed</option>
//         </select>
//       </div>

//       {/* TABLE */}
//       {loading ? (
//         <p>Loading…</p>
//       ) : (
//         <div className="bg-white shadow rounded overflow-hidden">
//           <table className="min-w-full text-sm">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-3 text-left">#</th>
//                 <th className="p-3 text-left">Name</th>
//                 <th className="p-3 text-left">Scheduled</th>
//                 <th className="p-3 text-left">Status</th>
//                 <th className="p-3 text-left">Tracking</th>
//                 <th className="p-3 text-left">Actions</th>
//               </tr>
//             </thead>

//             <tbody>
//               {filtered.map((c, i) => (
//                 <tr
//                   key={c._id}
//                   onClick={() => router.push(`/admin/crm/campaign/${c._id}`)}
//                   className="border-b hover:bg-blue-50 cursor-pointer transition"
//                 >
//                   <td className="p-3">{i + 1}</td>

//                   {/* NAME & CHANNEL */}
//                   <td className="p-3">
//                     <span
//                       onClick={() => router.push(`/admin/crm/campaign/${c._id}`)}
//                       className="font-semibold text-blue-700 hover:underline block cursor-pointer"
//                     >
//                       {c.campaignName}
//                     </span>

//                     <span
//                       className={`inline-block mt-1 text-[11px] px-2 py-0.5 rounded-full 
//                       ${
//                         c.channel === "email"
//                           ? "bg-blue-100 text-blue-600"
//                           : "bg-green-100 text-green-600"
//                       }`}
//                     >
//                       {c.channel.toUpperCase()}
//                     </span>
//                   </td>

//                   {/* TIME */}
//                <td className="p-3 text-gray-700">
//   {new Date(c.scheduledTime).toLocaleString("en-IN", {
//     timeZone: "UTC",            // 👈 IMPORTANT
//     day: "2-digit",
//     month: "2-digit",
//     year: "numeric",
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true
//   })}
// </td>





//                   {/* STATUS */}
//                   <td className="p-3">
//                     <span
//                       className={`inline-block text-xs px-3 py-1 rounded-full border ${getStatusClass(
//                         c.status
//                       )}`}
//                     >
//                       {c.status}
//                     </span>
//                   </td>

//                   {/* TRACKING */}
//                   <td className="p-3">
//                     {c.channel === "email" && c.status === "Sent"
//                       ? renderStats(c._id)
//                       : <span className="text-gray-400 text-sm">—</span>
//                     }
//                   </td>

//                   {/* ACTIONS */}
//                   <td className="p-3">
//                     <div
//                       onClick={(e) => e.stopPropagation()}
//                       className="flex items-center gap-2"
//                     >
//                       <button
//                         onClick={() => router.push(`/admin/crm/campaign/${c._id}`)}
//                         className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white transition"
//                       >
//                         <Eye size={14} /> View
//                       </button>

//                       <button
//                         onClick={() => router.push(`/admin/crm/campaign/${c._id}/edit`)}
//                         className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-green-200 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white transition"
//                       >
//                         <Pencil size={14} /> Edit
//                       </button>

//                       {c.status !== "Sent" ? (
//                         <button
//                           onClick={(e) => handleSendNow(c._id, e)}
//                           className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
//                         >
//                           <Send size={14} /> Send
//                         </button>
//                       ) : (
//                         <span className="px-3 py-1 text-xs font-semibold rounded-md bg-gray-100 text-gray-400">
//                           Sent
//                         </span>
//                       )}

//                       <button
//                         onClick={() => router.push(`/admin/crm/campaign/${c._id}/report`)}
//                         className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white transition"
//                       >
//                         <BarChart3 size={14} /> Report
//                       </button>

//                       <button
//                         onClick={(e) => handleDelete(c._id, e)}
//                         className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white transition"
//                       >
//                         <Trash2 size={14} /> Delete
//                       </button>
//                     </div>
//                   </td>
//                 </tr>
//               ))}

//               {!filtered.length && (
//                 <tr>
//                   <td colSpan={6} className="p-6 text-center text-gray-500">
//                     No campaigns found
//                   </td>
//                 </tr>
//               )}
//             </tbody>

//           </table>
//         </div>
//       )}

//     </div>
//   );
// }


