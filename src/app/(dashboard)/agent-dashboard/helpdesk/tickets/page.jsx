"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import TicketCard from "@/components/helpdesk/TicketCard";
import AgentSelector from "@/components/helpdesk/AgentSelector";
import { FiRefreshCw, FiCpu, FiCheck, FiX, FiSearch, FiFilter } from "react-icons/fi";
import { useRouter } from "next/navigation";

const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export default function AdminHelpdeskTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [msg, setMsg] = useState(null);

  // --- Filter States ---
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const [aiLoadingMap, setAiLoadingMap] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});

  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

const api = useMemo(() => {
  const instance = axios.create({
    baseURL: "/api/helpdesk",
  });

  instance.interceptors.request.use((config) => {
    if (token) config.headers.Authorization = "Bearer " + token;
    return config;
  });

  return instance;
}, [token]);


  const toast = useCallback((type, text, timeout = 4000) => {
    setMsg({ type, text });
    if (timeout) {
      setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), timeout);
    }
  }, []);

  const setMapFlag = (setter, ticketId, v) =>
    setter((m) => ({ ...m, [ticketId]: v }));

  /* ================= LOAD ================= */
  async function loadTickets() {
    setLoading(true);
    try {
      const resp = await api.get("/list");
      if (!resp.data?.success) {
        toast("error", resp.data?.msg || "Failed to load tickets");
        setTickets([]);
      } else {
        setTickets(resp.data.tickets || []);
      }
    } catch {
      toast("error", "Server error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadTickets();
  }, [token]);

  /* ================= FILTER LOGIC ================= */
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchesSearch = 
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.customerId?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ticketNo?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filterStatus === "all" || t.status === filterStatus;

      
      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, filterStatus]);

  /* ================= ACTIONS (Assign/Status/AI) ================= */

 async function assignAgent(ticketId, agentId) {
  if (!agentId || !ticketId) {
    return toast("error", "Ticket or Agent missing");
  }

  console.log("Assign Payload:", { ticketId, agentId });

  setMapFlag(setAiLoadingMap, ticketId, true);

  try {
    // ✅ baseURL = "/api/helpdesk" hai
    const resp = await api.post("/assign", {
      ticketId,
      agentId,
    });

    if (resp?.data?.success) {
      toast("success", resp.data?.msg || "Assigned Successfully");
      await loadTickets();
    } else {
      toast("error", resp?.data?.msg || "Assign failed");
    }
  } catch (err) {
    console.error("Assign API Error:", err?.response?.data || err.message);

    toast(
      "error",
      err?.response?.data?.msg || "Assign error"
    );
  } finally {
    setMapFlag(setAiLoadingMap, ticketId, false);
  }
}



  // async function assignAgent(ticketId, agentId) {
  //   if (!agentId) return toast("error", "Select an agent");
  //   setMapFlag(setAiLoadingMap, ticketId, true);
  //   try {
  //     const resp = await api.post("/assign", { ticketId, agentId });
  //     if (resp.data?.success) {
  //       toast("success", "Assigned Successfully");
  //       await loadTickets();
  //     }
  //   } catch {
  //     toast("error", "Assign error");
  //   } finally {
  //     setMapFlag(setAiLoadingMap, ticketId, false);
  //   }
  // }

  async function updateStatus(ticketId, status) {
    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/update-status", { ticketId, status });
      if (resp.data?.success) {
        toast("success", "Status Updated");
        await loadTickets();
      }
    } catch {
      toast("error", "Status error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  async function aiPreview(ticketId) {
    if (aiSuggestions[ticketId]) {
      setAiSuggestions((s) => {
        const c = { ...s };
        delete c[ticketId];
        return c;
      });
      return;
    }

    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/ai/auto-assign", { ticketId, preview: true });
      if (resp.data?.success && resp.data.preview) {
        setAiSuggestions((m) => ({
          ...m,
          [ticketId]: {
            agentId: resp.data.agentId,
            agentName: resp.data.agentName || "Suggested Agent",
          },
        }));
      }
    } catch {
      toast("error", "AI Preview error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  async function acceptAiSuggestion(ticketId) {
    const sug = aiSuggestions[ticketId];
    if (!sug?.agentId) return;
    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      await api.post("/assign", { ticketId, agentId: sug.agentId });
      setAiSuggestions((m) => {
        const c = { ...m };
        delete c[ticketId];
        return c;
      });
      await loadTickets();
    } catch {
      toast("error", "AI assignment failed");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  /* ================= KANBAN DATA ================= */
  const kanban = {
    open: filteredTickets.filter((t) => t.status === "open"),
    in_progress: filteredTickets.filter((t) => t.status === "in_progress"),
    waiting: filteredTickets.filter((t) => t.status === "waiting"),
    closed: filteredTickets.filter((t) => t.status === "closed"),
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center text-indigo-600 animate-pulse">
        <FiCpu className="text-5xl mb-4 animate-spin" />
        <span className="font-medium">Loading Intelligent Interface...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#f8fafc] text-slate-900">
      {/* HEADER SECTION */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              Helpdesk <span className="text-indigo-600">Admin</span>
            </h1>
            <p className="text-slate-500 text-sm">Manage and auto-assign customer inquiries</p>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            <div className="flex bg-white p-1 rounded-xl shadow-sm border">
              <button
                onClick={() => setView("list")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === "list" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                List
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  view === "kanban" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Kanban
              </button>
            </div>
            <button
              onClick={loadTickets}
              className="p-2.5 bg-white border shadow-sm rounded-xl hover:bg-slate-50 transition-colors"
            >
              <FiRefreshCw className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
          <div className="relative w-full md:flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by subject or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="flex-1 md:w-40 px-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="waiting">Waiting</option>
              <option value="closed">Closed</option>
            </select>
            
            <button 
              onClick={() => {setSearchTerm(""); setFilterStatus("all");}}
              className="px-4 py-2.5 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
              msg.type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
            }`}
          >
            {msg.type === "error" ? <FiX /> : <FiCheck />}
            <span className="text-sm font-medium">{msg.text}</span>
          </div>
        )}

        {/* LIST VIEW */}
        {view === "list" && (
          <div className="grid gap-4">
            {filteredTickets.length > 0 ? (
              filteredTickets.map((t) => {
                const aiLoading = !!aiLoadingMap[t._id];
                const suggestion = aiSuggestions[t._id];
                const agentLabel = typeof t.agentId === "object" ? t.agentId?.name : "Unassigned";

                return (
                  <div
                    key={t._id}
                    className="group flex flex-col lg:flex-row gap-6 bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
                  >
                    <div className="flex-1 cursor-pointer" onClick={() => router.push(`/agent-dashboard/helpdesk/tickets/${t._id}`)}>
                      <TicketCard ticket={t} />
                      <div className="mt-4 flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                          {t.customerId?.customerName || "Guest"}
                        </div>
                        <span className="text-xs text-slate-400 italic">
                          {t.companyId?.name || "No Company"}
                        </span>
                      </div>
                    </div>

                    <div className="lg:w-80 flex flex-col gap-3 pt-4 lg:pt-0 lg:border-l lg:pl-6 border-slate-100">
                      <AgentSelector
                        value={typeof t.agentId === "object" ? t.agentId?._id : t.agentId}
                        onSelect={(aid) => assignAgent(t._id, aid)}
                      />

                      {/* <button
                        onClick={() => aiPreview(t._id)}
                        disabled={aiLoading}
                        className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-bold transition-all ${
                          suggestion 
                            ? "bg-slate-800 text-white" 
                            : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        }`}
                      >
                        {aiLoading ? <FiRefreshCw className="animate-spin" /> : <FiCpu />}
                        {suggestion ? "Dismiss AI" : "Get AI Suggestion"}
                      </button> */}

                      {suggestion && (
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
                          <img src={SAMPLE_IMAGE} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-indigo-900 truncate">{suggestion.agentName}</p>
                            <p className="text-[10px] text-indigo-500 truncate">Matches Profile</p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => acceptAiSuggestion(t._id)} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                              <FiCheck size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      <select
                        value={t.status}
                        onChange={(e) => updateStatus(t._id, e.target.value)}
                        className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="waiting">Waiting</option>
                        <option value="closed">Closed</option>
                      </select>

                      <div className="flex justify-between items-center text-[12px] text-slate-400 font-bold uppercase tracking-wider px-1">
                        <span className="text-[15px]">Agent: {agentLabel}</span>
                        <span>{new Date(t.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
                <p className="text-slate-400 font-medium">No tickets found matching your filters.</p>
              </div>
            )}
          </div>
        )}

        {/* KANBAN VIEW */}
        {view === "kanban" && (
          <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
            {Object.entries(kanban).map(([status, list]) => (
              <div key={status} className="flex-shrink-0 w-80">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h2 className="font-bold text-slate-700 capitalize flex items-center gap-2">
                    {status.replace("_", " ")}
                    <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">
                      {list.length}
                    </span>
                  </h2>
                </div>

                <div className="space-y-3 min-h-[500px] p-2 bg-slate-100/50 rounded-2xl border border-slate-200">
                  {list.map((t) => (
                    <div
                      key={t._id}
                      className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
                      onClick={() => router.push(`/agent-dashboard/helpdesk/tickets/${t._id}`)}
                    >
                      <div className="text-xs font-bold text-indigo-600 mb-1">#{t._id.slice(-4)}</div>
                      <div className="font-semibold text-slate-800 text-sm mb-3 line-clamp-2 group-hover:text-indigo-600">
                        {t.subject}
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {t.customerId?.customerName?.charAt(0) || "U"}
                         </div>
                         <div className="text-xs text-slate-500 truncate">
                            {t.customerId?.customerName || "Unknown"}
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}



// "use client";

// import { useEffect, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import TicketCard from "@/components/helpdesk/TicketCard";
// import AgentSelector from "@/components/helpdesk/AgentSelector";
// import { FiRefreshCw, FiCpu, FiCheck, FiX, FiSearch, FiFilter } from "react-icons/fi";
// import { useRouter } from "next/navigation";

// const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

// export default function AdminHelpdeskTicketsPage() {
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("list");
//   const [msg, setMsg] = useState(null);

//   // --- Filter States ---
//   const [searchTerm, setSearchTerm] = useState("");
//   const [filterStatus, setFilterStatus] = useState("all");
//   const [showFilters, setShowFilters] = useState(false);

//   const [aiLoadingMap, setAiLoadingMap] = useState({});
//   const [aiSuggestions, setAiSuggestions] = useState({});

//   const router = useRouter();
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

//   useEffect(() => {
//     if (!token) router.push("/login");
//   }, [token, router]);

//   const api = useMemo(() => {
//     return axios.create({
//       baseURL: "/api/helpdesk",
//       headers: token ? { Authorization: "Bearer " + token } : {},
//     });
//   }, [token]);

//   const toast = useCallback((type, text, timeout = 4000) => {
//     setMsg({ type, text });
//     if (timeout) {
//       setTimeout(() => setMsg((m) => (m?.text === text ? null : m)), timeout);
//     }
//   }, []);

//   const setMapFlag = (setter, ticketId, v) =>
//     setter((m) => ({ ...m, [ticketId]: v }));

//   /* ================= LOAD ================= */
//   async function loadTickets() {
//     setLoading(true);
//     try {
//       const resp = await api.get("/list");
//       if (!resp.data?.success) {
//         toast("error", resp.data?.msg || "Failed to load tickets");
//         setTickets([]);
//       } else {
//         setTickets(resp.data.tickets || []);
//       }
//     } catch {
//       toast("error", "Server error");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     if (token) loadTickets();
//   }, [token]);

//   /* ================= FILTER LOGIC ================= */
//   const filteredTickets = useMemo(() => {
//     return tickets.filter((t) => {
//       const matchesSearch = 
//         t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         t.customerId?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//         t.ticketNo?.toLowerCase().includes(searchTerm.toLowerCase());
      
//       const matchesStatus = filterStatus === "all" || t.status === filterStatus;
      
//       return matchesSearch && matchesStatus;
//     });
//   }, [tickets, searchTerm, filterStatus]);

//   /* ================= ACTIONS (Assign/Status/AI) ================= */
//   async function assignAgent(ticketId, agentId) {
//     if (!agentId) return toast("error", "Select an agent");
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/assign", { ticketId, agentId });
//       if (resp.data?.success) {
//         toast("success", "Assigned Successfully");
//         await loadTickets();
//       }
//     } catch {
//       toast("error", "Assign error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   async function updateStatus(ticketId, status) {
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/update-status", { ticketId, status });
//       if (resp.data?.success) {
//         toast("success", "Status Updated");
//         await loadTickets();
//       }
//     } catch {
//       toast("error", "Status error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   async function aiPreview(ticketId) {
//     if (aiSuggestions[ticketId]) {
//       setAiSuggestions((s) => {
//         const c = { ...s };
//         delete c[ticketId];
//         return c;
//       });
//       return;
//     }

//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/ai/auto-assign", { ticketId, preview: true });
//       if (resp.data?.success && resp.data.preview) {
//         setAiSuggestions((m) => ({
//           ...m,
//           [ticketId]: {
//             agentId: resp.data.agentId,
//             agentName: resp.data.agentName || "Suggested Agent",
//           },
//         }));
//       }
//     } catch {
//       toast("error", "AI Preview error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   async function acceptAiSuggestion(ticketId) {
//     const sug = aiSuggestions[ticketId];
//     if (!sug?.agentId) return;
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       await api.post("/assign", { ticketId, agentId: sug.agentId });
//       setAiSuggestions((m) => {
//         const c = { ...m };
//         delete c[ticketId];
//         return c;
//       });
//       await loadTickets();
//     } catch {
//       toast("error", "AI assignment failed");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   /* ================= KANBAN DATA ================= */
//   const kanban = {
//     open: filteredTickets.filter((t) => t.status === "open"),
//     in_progress: filteredTickets.filter((t) => t.status === "in_progress"),
//     waiting: filteredTickets.filter((t) => t.status === "waiting"),
//     closed: filteredTickets.filter((t) => t.status === "closed"),
//   };

//   if (loading) {
//     return (
//       <div className="h-screen flex flex-col items-center justify-center text-indigo-600 animate-pulse">
//         <FiCpu className="text-5xl mb-4 animate-spin" />
//         <span className="font-medium">Loading Intelligent Interface...</span>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen p-4 md:p-8 bg-[#f8fafc] text-slate-900">
//       {/* HEADER SECTION */}
//       <div className="max-w-7xl mx-auto space-y-6">
//         <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
//           <div>
//             <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
//               Helpdesk <span className="text-indigo-600">Agent</span>
//             </h1>
//             <p className="text-slate-500 text-sm">Manage and auto-assign customer inquiries</p>
//           </div>

//           <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
//             <div className="flex bg-white p-1 rounded-xl shadow-sm border">
//               <button
//                 onClick={() => setView("list")}
//                 className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
//                   view === "list" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
//                 }`}
//               >
//                 List
//               </button>
//               <button
//                 onClick={() => setView("kanban")}
//                 className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
//                   view === "kanban" ? "bg-indigo-600 text-white shadow-md" : "text-slate-600 hover:bg-slate-50"
//                 }`}
//               >
//                 Kanban
//               </button>
//             </div>
//             <button
//               onClick={loadTickets}
//               className="p-2.5 bg-white border shadow-sm rounded-xl hover:bg-slate-50 transition-colors"
//             >
//               <FiRefreshCw className={loading ? "animate-spin" : ""} />
//             </button>
//           </div>
//         </div>

//         {/* SEARCH & FILTER BAR */}
//         <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center">
//           <div className="relative w-full md:flex-1">
//             <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
//             <input
//               type="text"
//               placeholder="Search by subject or customer..."
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all"
//             />
//           </div>
          
//           <div className="flex items-center gap-3 w-full md:w-auto">
//             <select
//               value={filterStatus}
//               onChange={(e) => setFilterStatus(e.target.value)}
//               className="flex-1 md:w-40 px-3 py-2.5 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500"
//             >
//               <option value="all">All Statuses</option>
//               <option value="open">Open</option>
//               <option value="in_progress">In Progress</option>
//               <option value="waiting">Waiting</option>
//               <option value="closed">Closed</option>
//             </select>
            
//             <button 
//               onClick={() => {setSearchTerm(""); setFilterStatus("all");}}
//               className="px-4 py-2.5 text-sm text-slate-500 hover:text-indigo-600 font-medium transition-colors"
//             >
//               Clear
//             </button>
//           </div>
//         </div>

//         {msg && (
//           <div className={`p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
//               msg.type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
//             }`}
//           >
//             {msg.type === "error" ? <FiX /> : <FiCheck />}
//             <span className="text-sm font-medium">{msg.text}</span>
//           </div>
//         )}

//         {/* LIST VIEW */}
//         {view === "list" && (
//           <div className="grid gap-4">
//             {filteredTickets.length > 0 ? (
//               filteredTickets.map((t) => {
//                 const aiLoading = !!aiLoadingMap[t._id];
//                 const suggestion = aiSuggestions[t._id];
//                 const agentLabel = typeof t.agentId === "object" ? t.agentId?.name : "Unassigned";

//                 return (
//                   <div
//                     key={t._id}
//                     className="group flex flex-col lg:flex-row gap-6 bg-white border border-slate-200 rounded-3xl p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300"
//                   >
//                     <div className="flex-1 cursor-pointer" onClick={() => router.push(`/agent-dashboard/helpdesk/tickets/${t._id}`)}>
//                       <TicketCard ticket={t} />
//                       <div className="mt-4 flex flex-wrap gap-4 items-center">
//                         <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">
//                           <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
//                           {t.customerId?.customerName || "Guest"}
//                         </div>
//                         <span className="text-xs text-slate-400 italic">
//                           {t.companyId?.name || "No Company"}
//                         </span>
//                       </div>
//                     </div>

//                     <div className="lg:w-80 flex flex-col gap-3 pt-4 lg:pt-0 lg:border-l lg:pl-6 border-slate-100">
//                       <AgentSelector
//                         value={typeof t.agentId === "object" ? t.agentId?._id : t.agentId}
//                         onSelect={(aid) => assignAgent(t._id, aid)}
//                       />

//                       {suggestion && (
//                         <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 animate-in zoom-in-95">
//                           <img src={SAMPLE_IMAGE} className="w-10 h-10 rounded-full border-2 border-white" alt="" />
//                           <div className="flex-1 min-w-0">
//                             <p className="text-xs font-bold text-indigo-900 truncate">{suggestion.agentName}</p>
//                             <p className="text-[10px] text-indigo-500 truncate">Matches Profile</p>
//                           </div>
//                           <div className="flex gap-1">
//                             <button onClick={() => acceptAiSuggestion(t._id)} className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
//                               <FiCheck size={14} />
//                             </button>
//                           </div>
//                         </div>
//                       )}

//                       <select
//                         value={t.status}
//                         onChange={(e) => updateStatus(t._id, e.target.value)}
//                         className="w-full bg-slate-50 border-slate-200 rounded-xl text-sm font-medium focus:ring-indigo-500 focus:border-indigo-500"
//                       >
//                         <option value="open">Open</option>
//                         <option value="in_progress">In Progress</option>
//                         <option value="waiting">Waiting</option>
//                         <option value="closed">Closed</option>
//                       </select>

//                       <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium uppercase tracking-wider px-1">
//                         <span>Agent: {agentLabel}</span>
//                         <span>{new Date(t.createdAt).toLocaleDateString()}</span>
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })
//             ) : (
//               <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
//                 <p className="text-slate-400 font-medium">No tickets found matching your filters.</p>
//               </div>
//             )}
//           </div>
//         )}

//         {/* KANBAN VIEW */}
//         {view === "kanban" && (
//           <div className="flex gap-6 overflow-x-auto pb-6 -mx-4 px-4 md:mx-0 md:px-0">
//             {Object.entries(kanban).map(([status, list]) => (
//               <div key={status} className="flex-shrink-0 w-80">
//                 <div className="flex items-center justify-between mb-4 px-2">
//                   <h2 className="font-bold text-slate-700 capitalize flex items-center gap-2">
//                     {status.replace("_", " ")}
//                     <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">
//                       {list.length}
//                     </span>
//                   </h2>
//                 </div>

//                 <div className="space-y-3 min-h-[500px] p-2 bg-slate-100/50 rounded-2xl border border-slate-200">
//                   {list.map((t) => (
//                     <div
//                       key={t._id}
//                       className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-md hover:border-indigo-300 transition-all group"
//                       onClick={() => router.push(`/agent-dashboard/helpdesk/tickets/${t._id}`)}
//                     >
//                       <div className="text-xs font-bold text-indigo-600 mb-1">#{t._id.slice(-4)}</div>
//                       <div className="font-semibold text-slate-800 text-sm mb-3 line-clamp-2 group-hover:text-indigo-600">
//                         {t.subject}
//                       </div>
//                       <div className="flex items-center gap-2">
//                          <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
//                             {t.customerId?.customerName?.charAt(0) || "U"}
//                          </div>
//                          <div className="text-xs text-slate-500 truncate">
//                             {t.customerId?.customerName || "Unknown"}
//                          </div>
//                       </div>
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


