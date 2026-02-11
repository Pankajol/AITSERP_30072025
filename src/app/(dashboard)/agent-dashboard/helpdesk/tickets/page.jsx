"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import TicketCard from "@/components/helpdesk/TicketCard";
import AgentSelector from "@/components/helpdesk/AgentSelector";
import { FiRefreshCw, FiCpu, FiCheck, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";

const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export default function AdminHelpdeskTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list");
  const [msg, setMsg] = useState(null);

  const [aiLoadingMap, setAiLoadingMap] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({});

  const router = useRouter();

  /* ================ TOKEN CHECK ================= */
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) router.push("/login");
  }, [token, router]);

  /* ================= API ================= */
  const api = useMemo(() => {
    return axios.create({
      baseURL: "/api/helpdesk",
      headers: token ? { Authorization: "Bearer " + token } : {},
    });
  }, [token]);

  /* ================= HELPERS ================= */
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
    } catch (err) {
      toast("error", "Server error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) loadTickets();
  }, [token]);

  /* ================= ASSIGN ================= */
  async function assignAgent(ticketId, agentId) {
    if (!agentId) return toast("error", "Select an agent");

    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/assign", { ticketId, agentId });
      if (resp.data?.success) {
        toast("success", "Assigned");
        await loadTickets();
      } else {
        toast("error", resp.data?.msg || "Assign failed");
      }
    } catch {
      toast("error", "Assign error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  /* ================= STATUS ================= */
  async function updateStatus(ticketId, status) {
    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/update-status", { ticketId, status });
      if (resp.data?.success) {
        toast("success", "Updated");
        await loadTickets();
      } else {
        toast("error", resp.data?.msg || "Update failed");
      }
    } catch {
      toast("error", "Status error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  /* ================= AI ================= */
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
            confidence: resp.data.confidence || null,
            reasons: resp.data.reasons || [],
          },
        }));
      } else {
        toast("error", resp.data?.msg || "AI failed");
      }
    } catch {
      toast("error", "AI error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  async function acceptAiSuggestion(ticketId) {
    const sug = aiSuggestions[ticketId];
    if (!sug?.agentId) return;

    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/assign", { ticketId, agentId: sug.agentId });
      if (resp.data?.success) {
        toast("success", "Assigned by AI");
        setAiSuggestions((m) => {
          const c = { ...m };
          delete c[ticketId];
          return c;
        });
        await loadTickets();
      }
    } catch {
      toast("error", "AI assign error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  /* ================= KANBAN ================= */
  const kanban = {
    open: tickets.filter((t) => t.status === "open"),
    in_progress: tickets.filter((t) => t.status === "in_progress"),
    waiting: tickets.filter((t) => t.status === "waiting"),
    closed: tickets.filter((t) => t.status === "closed"),
  };

  /* ================= RENDER ================= */
  if (loading) {
    return <div className="p-6 text-gray-500">Loading…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Helpdesk Admin</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-2 rounded ${view === "list" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`px-3 py-2 rounded ${view === "kanban" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            Kanban
          </button>
          <button
            onClick={loadTickets}
            className="px-3 py-2 bg-gray-800 text-white rounded flex items-center gap-2"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded ${
            msg.type === "error" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="space-y-4">
          {tickets.map((t) => {
            const aiLoading = !!aiLoadingMap[t._id];
            const suggestion = aiSuggestions[t._id];
            const agentLabel =
              typeof t.agentId === "object" ? t.agentId?.name || t.agentId?.email : "Unassigned";

            return (
              <div key={t._id} className="p-4 bg-white rounded-xl shadow flex gap-4">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => router.push(`/admin/helpdesk/tickets/${t._id}`)}
                >
                  <TicketCard ticket={t} />

                  {/* Company name */}
                  <div className="text-xs text-gray-500 mt-1">
                    Company: {t.companyId?.name || "-"}
                  </div>
                </div>

                <div className="w-96 space-y-3">
                  <AgentSelector
                    value={
                      typeof t.agentId === "object"
                        ? t.agentId?._id
                        : t.agentId
                    }
                    onSelect={(aid) => assignAgent(t._id, aid)}
                  />

                  <button
                    onClick={() => aiPreview(t._id)}
                    disabled={aiLoading}
                    className="w-full px-3 py-2 bg-indigo-600 text-white rounded flex justify-center gap-2"
                  >
                    <FiCpu /> {suggestion ? "Hide AI" : "AI Suggest"}
                  </button>

                  {suggestion && (
                    <div className="p-3 bg-gray-50 border rounded">
                      <div className="flex items-center gap-3">
                        <img
                          src={SAMPLE_IMAGE}
                          className="w-10 h-10 rounded-full"
                          alt=""
                        />
                        <div className="flex-1">
                          <div className="font-medium">{suggestion.agentName}</div>
                          <div className="text-xs text-gray-500">{suggestion.agentId}</div>
                        </div>
                        <button
                          onClick={() => acceptAiSuggestion(t._id)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-sm"
                        >
                          <FiCheck />
                        </button>
                        <button
                          onClick={() =>
                            setAiSuggestions((m) => {
                              const c = { ...m };
                              delete c[t._id];
                              return c;
                            })
                          }
                          className="px-2 py-1 bg-gray-200 rounded text-sm"
                        >
                          <FiX />
                        </button>
                      </div>
                    </div>
                  )}

                  <select
                    value={t.status}
                    onChange={(e) => updateStatus(t._id, e.target.value)}
                    className="w-full p-2 bg-gray-100 rounded"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting">Waiting</option>
                    <option value="closed">Closed</option>
                  </select>

                  <div className="text-xs text-gray-500">
                    <div>Agent: {agentLabel}</div>
                    <div>Created: {new Date(t.createdAt).toLocaleString()}</div>
                    <div>Company: {t.companyId?.name || "-"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* KANBAN */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(kanban).map(([status, list]) => (
            <div key={status} className="bg-gray-100 rounded p-3">
              <h2 className="font-semibold mb-2 capitalize">
                {status.replace("_", " ")} ({list.length})
              </h2>
              <div className="space-y-3">
                {list.map((t) => (
                  <div
                    key={t._id}
                    className="p-3 bg-white rounded shadow cursor-pointer"
                    onClick={() => router.push(`/admin/helpdesk/tickets/${t._id}`)}
                  >
                    <div className="font-medium">{t.subject}</div>
                    <div className="text-xs text-gray-500">
                      {typeof t.agentId === "object" ? t.agentId?.name : "Unassigned"}
                    </div>
                    <div className="text-xs text-gray-400">
                      Company: {t.companyId?.name || "-"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


///////////////////////////////////////////////



// "use client";

// import { useEffect, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import TicketCard from "@/components/helpdesk/TicketCard";
// import AgentSelector from "@/components/helpdesk/AgentSelector";
// import { FiRefreshCw, FiCpu, FiCheck, FiX } from "react-icons/fi";
// import { useRouter } from "next/navigation";

// const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

// export default function AdminHelpdeskTicketsPage() {
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("list");
//   const [msg, setMsg] = useState(null);

//   const [aiLoadingMap, setAiLoadingMap] = useState({});
//   const [aiSuggestions, setAiSuggestions] = useState({});

//   const router = useRouter();

//   /* ================= API ================= */
//   const api = useMemo(() => {
//     const token =
//       typeof window !== "undefined" ? localStorage.getItem("token") : "";
//     return axios.create({
//       baseURL: "/api/helpdesk",
//       headers: { Authorization: token ? "Bearer " + token : "" },
//       validateStatus: () => true,
//     });
//   }, []);

//   /* ================= HELPERS ================= */
//   const toast = useCallback((type, text, timeout = 4000) => {
//     setMsg({ type, text });
//     if (timeout) {
//       setTimeout(
//         () => setMsg((m) => (m?.text === text ? null : m)),
//         timeout
//       );
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
//     } catch (err) {
//       console.error(err);
//       toast("error", "Server error");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadTickets();
//     // eslint-disable-next-line
//   }, []);

//   /* ================= ASSIGN ================= */
//   async function assignAgent(ticketId, agentId) {
//     if (!agentId) {
//       toast("error", "Select an agent");
//       return;
//     }
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/assign", { ticketId, agentId });
//       if (resp.data?.success) {
//         toast("success", "Assigned successfully");
//         await loadTickets();
//       } else {
//         toast("error", resp.data?.msg || "Assign failed");
//       }
//     } catch {
//       toast("error", "Assign error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   /* ================= STATUS ================= */
//   async function updateStatus(ticketId, status) {
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/update-status", { ticketId, status });
//       if (resp.data?.success) {
//         toast("success", "Status updated");
//         await loadTickets();
//       } else {
//         toast("error", resp.data?.msg || "Update failed");
//       }
//     } catch {
//       toast("error", "Status error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   /* ================= AI ================= */
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
//       const resp = await api.post("/ai/auto-assign", {
//         ticketId,
//         preview: true,
//       });

//       if (resp.data?.success && resp.data.preview) {
//         setAiSuggestions((m) => ({
//           ...m,
//           [ticketId]: {
//             agentId: resp.data.agentId,
//             agentName: resp.data.agentName || "Suggested Agent",
//             confidence: resp.data.confidence || null,
//             reasons: resp.data.reasons || [],
//           },
//         }));
//       } else {
//         toast("error", resp.data?.msg || "AI failed");
//       }
//     } catch {
//       toast("error", "AI error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   async function acceptAiSuggestion(ticketId) {
//     const sug = aiSuggestions[ticketId];
//     if (!sug?.agentId) return;

//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/assign", {
//         ticketId,
//         agentId: sug.agentId,
//       });
//       if (resp.data?.success) {
//         toast("success", "Assigned by AI");
//         setAiSuggestions((m) => {
//           const c = { ...m };
//           delete c[ticketId];
//           return c;
//         });
//         await loadTickets();
//       }
//     } catch {
//       toast("error", "AI assign error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   /* ================= KANBAN ================= */
//   const kanban = {
//     open: tickets.filter((t) => t.status === "open"),
//     in_progress: tickets.filter((t) => t.status === "in_progress"),
//     waiting: tickets.filter((t) => t.status === "waiting"),
//     closed: tickets.filter((t) => t.status === "closed"),
//   };

//   /* ================= RENDER ================= */
//   if (loading) {
//     return <div className="p-6 text-gray-500">Loading tickets…</div>;
//   }

//   return (
//     <div className="p-6 space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-3xl font-bold">Helpdesk Admin</h1>
//         <div className="flex gap-2">
//           <button
//             onClick={() => setView("list")}
//             className={`px-3 py-2 rounded ${
//               view === "list" ? "bg-blue-600 text-white" : "bg-gray-200"
//             }`}
//           >
//             List
//           </button>
//           <button
//             onClick={() => setView("kanban")}
//             className={`px-3 py-2 rounded ${
//               view === "kanban" ? "bg-blue-600 text-white" : "bg-gray-200"
//             }`}
//           >
//             Kanban
//           </button>
//           <button
//             onClick={loadTickets}
//             className="px-3 py-2 bg-gray-800 text-white rounded flex items-center gap-2"
//           >
//             <FiRefreshCw /> Refresh
//           </button>
//         </div>
//       </div>

//       {msg && (
//         <div
//           className={`p-3 rounded ${
//             msg.type === "error"
//               ? "bg-red-100 text-red-700"
//               : "bg-green-100 text-green-700"
//           }`}
//         >
//           {msg.text}
//         </div>
//       )}

//       {/* LIST VIEW */}
//       {view === "list" && (
//         <div className="space-y-4">
//           {tickets.map((t) => {
//             const aiLoading = !!aiLoadingMap[t._id];
//             const suggestion = aiSuggestions[t._id];
//             const agentLabel =
//               typeof t.agentId === "object"
//                 ? t.agentId?.name || t.agentId?.email
//                 : "Unassigned";

//             return (
//               <div
//                 key={t._id}
//                 className="p-4 bg-white rounded-xl shadow flex gap-4"
//               >
//                 <div
//                   className="flex-1 cursor-pointer"
//                   onClick={() =>
//                     router.push(`/admin/helpdesk/tickets/${t._id}`)
//                   }
//                 >
//                   <TicketCard ticket={t} />
//                 </div>

//                 <div className="w-96 space-y-3">
//                   {/* Assign */}
//                   <AgentSelector
//                     value={
//                       typeof t.agentId === "object"
//                         ? t.agentId?._id
//                         : t.agentId
//                     }
//                     onSelect={(aid) => assignAgent(t._id, aid)}
//                   />

//                   {/* AI */}
//                   <button
//                     onClick={() => aiPreview(t._id)}
//                     disabled={aiLoading}
//                     className="w-full px-3 py-2 bg-indigo-600 text-white rounded flex justify-center gap-2"
//                   >
//                     <FiCpu /> {suggestion ? "Hide AI" : "AI Suggest"}
//                   </button>

//                   {suggestion && (
//                     <div className="p-3 bg-gray-50 border rounded">
//                       <div className="flex items-center gap-3">
//                         <img
//                           src={SAMPLE_IMAGE}
//                           className="w-10 h-10 rounded-full"
//                           alt=""
//                         />
//                         <div className="flex-1">
//                           <div className="font-medium">
//                             {suggestion.agentName}
//                           </div>
//                           <div className="text-xs text-gray-500">
//                             {suggestion.agentId}
//                           </div>
//                         </div>
//                         <button
//                           onClick={() => acceptAiSuggestion(t._id)}
//                           className="px-2 py-1 bg-green-600 text-white rounded text-sm"
//                         >
//                           <FiCheck />
//                         </button>
//                         <button
//                           onClick={() =>
//                             setAiSuggestions((m) => {
//                               const c = { ...m };
//                               delete c[t._id];
//                               return c;
//                             })
//                           }
//                           className="px-2 py-1 bg-gray-200 rounded text-sm"
//                         >
//                           <FiX />
//                         </button>
//                       </div>
//                     </div>
//                   )}

//                   {/* Status */}
//                   <select
//                     value={t.status}
//                     onChange={(e) =>
//                       updateStatus(t._id, e.target.value)
//                     }
//                     className="w-full p-2 bg-gray-100 rounded"
//                   >
//                     <option value="open">Open</option>
//                     <option value="in_progress">In Progress</option>
//                     <option value="waiting">Waiting</option>
//                     <option value="closed">Closed</option>
//                   </select>

//                   <div className="text-xs text-gray-500">
//                     <div>Agent: {agentLabel}</div>
//                     <div>
//                       Created:{" "}
//                       {new Date(t.createdAt).toLocaleString()}
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* KANBAN */}
//       {view === "kanban" && (
//         <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//           {Object.entries(kanban).map(([status, list]) => (
//             <div key={status} className="bg-gray-100 rounded p-3">
//               <h2 className="font-semibold mb-2 capitalize">
//                 {status.replace("_", " ")} ({list.length})
//               </h2>
//               <div className="space-y-3">
//                 {list.map((t) => (
//                   <div
//                     key={t._id}
//                     className="p-3 bg-white rounded shadow cursor-pointer"
//                     onClick={() =>
//                       router.push(`/admin/helpdesk/tickets/${t._id}`)
//                     }
//                   >
//                     <div className="font-medium">{t.subject}</div>
//                     <div className="text-xs text-gray-500">
//                       {typeof t.agentId === "object"
//                         ? t.agentId?.name
//                         : "Unassigned"}
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


// ///////////////////////////////////////////////////////////////////////////////////////
// "use client";

// import { useEffect, useState, useMemo, useCallback } from "react";
// import axios from "axios";
// import TicketCard from "@/components/helpdesk/TicketCard";
// import AgentSelector from "@/components/helpdesk/AgentSelector";
// import { FiRefreshCw, FiSearch, FiCpu, FiCheck, FiX } from "react-icons/fi";
// import { useRouter } from "next/navigation";

// /**
//  * Local uploaded image path (use as sample avatar / preview)
//  * (developer note: this local path will be transformed to a usable URL by your environment)
//  */
// const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

// export default function AdminHelpdeskTicketsPage() {
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("list"); // list | kanban
//   const [msg, setMsg] = useState(null);

//   // AI-specific maps: per-ticket loading & suggestion object
//   const [aiLoadingMap, setAiLoadingMap] = useState({});
//   const [aiSuggestions, setAiSuggestions] = useState({}); // ticketId => { agentId, agentName, confidence, reasons }
//   const router = useRouter();
//   const api = useMemo(() => {
//     const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
//     return axios.create({
//       baseURL: "/api/helpdesk",
//       headers: { Authorization: token ? "Bearer " + token : "" },
//       validateStatus: () => true,
//     });
//   }, []);

//   useEffect(() => {
//     loadTickets();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // simple toast
//   const toast = useCallback((type, text, timeout = 4000) => {
//     setMsg({ type, text });
//     if (timeout) setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), timeout);
//   }, []);

//   async function loadTickets() {
//     setLoading(true);
//     setMsg(null);
//     try {
//       const resp = await api.get("/list");
//       if ((resp.headers["content-type"] || "").includes("text/html")) {
//         toast("error", `Server returned HTML (status ${resp.status}). Check /api/helpdesk/list.`);
//         setTickets([]);
//         return;
//       }
//       if (!resp.data || typeof resp.data !== "object") {
//         toast("error", "Unexpected response from server");
//         setTickets([]);
//         return;
//       }
//       if (resp.data.success === false) {
//         toast("error", resp.data.msg || "API error");
//         setTickets([]);
//         return;
//       }
//       setTickets(resp.data.tickets || resp.data || []);
//     } catch (err) {
//       console.error("loadTickets:", err);
//       toast("error", "Failed to load tickets");
//       setTickets([]);
//     } finally {
//       setLoading(false);
//     }
//   }

//   // utility to flip flags in a map
//   const setMapFlag = (setter, ticketId, v) => setter((m) => ({ ...m, [ticketId]: v }));

//   // ------------------------
//   // AI: preview suggestion for a ticket (non-destructive)
//   // ------------------------
//   async function aiPreview(ticketId) {
//     // If already have suggestion, toggle it off
//     if (aiSuggestions[ticketId]) {
//       setAiSuggestions((s) => {
//         const copy = { ...s };
//         delete copy[ticketId];
//         return copy;
//       });
//       return;
//     }

//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       // Request preview mode to get reasons + confidence instead of immediate assignment
//       const resp = await api.post("/ai/auto-assign", { ticketId, preview: true });

//       // Defensive checks: some implementations might auto-assign; handle both
//       if (resp.data?.success && resp.data?.preview === true) {
//         // expected preview shape: { agentId, agentName, confidence, reasons }
//         const suggestion = {
//           agentId: resp.data.agentId,
//           agentName: resp.data.agentName || resp.data.agentEmail || "Suggested agent",
//           confidence: typeof resp.data.confidence === "number" ? resp.data.confidence : null,
//           reasons: resp.data.reasons || resp.data.explanation || [],
//         };
//         setAiSuggestions((m) => ({ ...m, [ticketId]: suggestion }));
//       } else if (resp.data?.success && resp.data.agentId) {
//         // fallback: backend auto-assigned but returned agentId; we show minimal info
//         setAiSuggestions((m) => ({
//           ...m,
//           [ticketId]: {
//             agentId: resp.data.agentId,
//             agentName: resp.data.agentName || "Assigned",
//             confidence: null,
//             reasons: ["Assigned by AI."],
//           },
//         }));
//         toast("success", `Ticket auto-assigned to ${resp.data.agentName || resp.data.agentId}`);
//         // refresh list to reflect assignment
//         await loadTickets();
//       } else {
//         const txt = resp.data?.msg || `AI preview failed (status ${resp.status})`;
//         toast("error", txt);
//       }
//     } catch (err) {
//       console.error("aiPreview error:", err);
//       toast("error", "AI preview error");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   // ------------------------
//   // Accept AI suggestion (assign agent)
//   // ------------------------
//   async function acceptAiSuggestion(ticketId) {
//     const suggestion = aiSuggestions[ticketId];
//     if (!suggestion?.agentId) {
//       toast("error", "No AI suggestion available");
//       return;
//     }

//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/assign", { ticketId, agentId: suggestion.agentId });
//       if (resp.data?.success) {
//         toast("success", `Assigned to ${suggestion.agentName}`);
//         // remove suggestion and refresh tickets
//         setAiSuggestions((m) => {
//           const copy = { ...m };
//           delete copy[ticketId];
//           return copy;
//         });
//         await loadTickets();
//       } else {
//         toast("error", resp.data?.msg || `Assign failed (${resp.status})`);
//       }
//     } catch (err) {
//       console.error("acceptAiSuggestion:", err);
//       toast("error", "AI assign failed");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   // ------------------------
//   // Existing assign + update helpers (kept for compatibility)
//   // ------------------------
//   async function assignAgent(ticketId, agentId) {
//     if (!agentId) {
//       toast("error", "Select an agent");
//       return;
//     }
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/assign", { ticketId, agentId });
//       if (resp.data?.success) {
//         toast("success", "Assigned");
//         await loadTickets();
//       } else {
//         toast("error", resp.data?.msg || `Assign failed (${resp.status})`);
//       }
//     } catch (err) {
//       console.error(err);
//       toast("error", "Error assigning");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   async function updateStatus(ticketId, status) {
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/update-status", { ticketId, status });
//       if (resp.data?.success) {
//         toast("success", "Status updated");
//         await loadTickets();
//       } else {
//         toast("error", resp.data?.msg || `Status update failed (${resp.status})`);
//       }
//     } catch (err) {
//       console.error(err);
//       toast("error", "Error updating status");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   async function updatePriority(ticketId, priority) {
//     setMapFlag(setAiLoadingMap, ticketId, true);
//     try {
//       const resp = await api.post("/update-priority", { ticketId, priority });
//       if (resp.data?.success) {
//         toast("success", "Priority updated");
//         await loadTickets();
//       } else {
//         toast("error", resp.data?.msg || `Priority update failed (${resp.status})`);
//       }
//     } catch (err) {
//       console.error(err);
//       toast("error", "Error updating priority");
//     } finally {
//       setMapFlag(setAiLoadingMap, ticketId, false);
//     }
//   }

//   // ------------------------
//   // Kanban grouping
//   // ------------------------
//   const kanban = {
//     open: tickets.filter((t) => t.status === "open"),
//     "in-progress": tickets.filter((t) => t.status === "in-progress"),
//     pending: tickets.filter((t) => t.status === "pending"),
//     "on-hold": tickets.filter((t) => t.status === "on-hold"),
//     closed: tickets.filter((t) => t.status === "closed"),
//   };

//   // ------------------------
//   // Render
//   // ------------------------
//   if (loading) {
//     return (
//       <div className="p-6">
//         <div className="animate-pulse space-y-4">
//           <div className="h-10 w-48 bg-gray-200 rounded" />
//           <div className="h-64 bg-gray-200 rounded" />
//         </div>
//       </div>
//     );
//   }
 

//   return (
//     <div className="p-6 space-y-6">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <div>
//           <h1 className="text-3xl font-bold">Helpdesk Admin</h1>
//           <p className="text-sm text-gray-500">AI-assisted assignment & modern admin tools</p>
//         </div>

//         <div className="flex gap-2 items-center">
//           <button
//             onClick={() => setView("list")}
//             className={`px-4 py-2 rounded ${view === "list" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
//           >
//             List
//           </button>
//           <button
//             onClick={() => setView("kanban")}
//             className={`px-4 py-2 rounded ${view === "kanban" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
//           >
//             Kanban
//           </button>
//           <button onClick={loadTickets} className="px-4 py-2 bg-gray-800 text-white rounded flex items-center gap-2">
//             <FiRefreshCw /> Refresh
//           </button>
//         </div>
//       </div>

//       {msg && (
//         <div className={`p-3 rounded ${msg.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
//           {msg.text}
//         </div>
//       )}

//       {/* List view */}
//       {view === "list" && (
//         <div className="space-y-3">
//           {tickets.map((t) => {
//             const suggestion = aiSuggestions[t._id];
//             const aiLoading = !!aiLoadingMap[t._id];
//             return (
//               <div key={t._id} className="p-4 bg-white rounded-xl shadow flex flex-col md:flex-row gap-4 hover:shadow-lg transition">
//               <div
//   className="flex-1 cursor-pointer"
//   onClick={() => router.push(`/admin/helpdesk/tickets/${t._id}`)}
// >
//   <TicketCard ticket={t} />
// </div>

//                 <div className="w-full md:w-96 space-y-3">
//                   {/* Assign controls */}
//                   <div className="flex items-center gap-2">
//                     <div className="flex-1">
//                       <div className="text-sm text-gray-600 mb-1">Assign</div>
//                       <AgentSelector onSelect={(agentId) => assignAgent(t._id, agentId)} />
//                     </div>

//                     <div className="flex flex-col items-end gap-2">
//                       {/* AI preview / accept */}
//                       <button
//                         onClick={() => aiPreview(t._id)}
//                         disabled={aiLoading}
//                         className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center gap-2 text-sm"
//                         title="Preview AI suggestion"
//                       >
//                         <FiCpu /> {aiLoading ? "Thinking…" : suggestion ? "Hide AI" : "AI Suggest"}
//                       </button>
//                     </div>
//                   </div>

//                   {/* AI suggestion card */}
//                   {suggestion && (
//                     <div className="p-3 bg-gray-50 rounded border">
//                       <div className="flex items-center justify-between">
//                         <div className="text-sm font-medium">AI suggestion</div>
//                         <div className="text-xs text-gray-500">{suggestion.confidence ? `${Math.round(suggestion.confidence * 100)}% confidence` : "no confidence score"}</div>
//                       </div>

//                       <div className="mt-2 flex items-center gap-3">
//                         {/* Agent avatar / name */}
//                         <div className="flex items-center gap-2">
//                           <img src={SAMPLE_IMAGE} alt="agent" className="w-10 h-10 rounded-full object-cover border" />
//                           <div>
//                             <div className="font-medium">{suggestion.agentName}</div>
//                             <div className="text-xs text-gray-500">{suggestion.agentId}</div>
//                           </div>
//                         </div>

//                         <div className="ml-auto flex gap-2">
//                           <button onClick={() => acceptAiSuggestion(t._id)} disabled={aiLoading} className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-2">
//                             <FiCheck /> Accept
//                           </button>
//                           <button onClick={() => {
//                             // dismiss suggestion
//                             setAiSuggestions((s)=>{ const c={...s}; delete c[t._id]; return c; });
//                           }} className="px-3 py-1 bg-gray-200 rounded text-sm flex items-center gap-2">
//                             <FiX /> Dismiss
//                           </button>
//                         </div>
//                       </div>

//                       {/* reasons / explanation */}
//                       {suggestion.reasons?.length > 0 && (
//                         <ul className="mt-3 text-xs text-gray-600 space-y-1">
//                           {suggestion.reasons.map((r, i) => <li key={i}>• {r}</li>)}
//                         </ul>
//                       )}
//                     </div>
//                   )}

//                   {/* Status + Priority */}
//                   <div className="flex items-center gap-3">
//                     <div className="flex-1">
//                       <div className="text-sm text-gray-600 mb-1">Status</div>
//                       <select value={t.status} onChange={(e)=>updateStatus(t._id, e.target.value)} className="p-2 rounded bg-gray-100 w-full">
//                         <option value="open">Open</option>
//                         <option value="in-progress">In Progress</option>
//                         <option value="pending">Pending</option>
//                         <option value="on-hold">On Hold</option>
//                         <option value="closed">Closed</option>
//                       </select>
//                     </div>

//                     <div className="flex-1">
//                       <div className="text-sm text-gray-600 mb-1">Priority</div>
//                       <select value={t.priority || "normal"} onChange={(e)=>updatePriority(t._id, e.target.value)} className="p-2 rounded bg-gray-100 w-full">
//                         <option value="low">Low</option>
//                         <option value="normal">Normal</option>
//                         <option value="high">High</option>
//                         <option value="critical">Critical</option>
//                       </select>
//                     </div>
//                   </div>

//                   <div className="text-xs text-gray-500">
//                     <div>Customer: {t.customerId?.customerName || t.customerId?.customerName || "—"}</div>
//                     <div>Agent: {t.agentId?.name || t.agentId?.email || "Unassigned"}</div>
//                     <div>Created: {new Date(t.createdAt).toLocaleString()}</div>
//                   </div>
//                 </div>
//               </div>
//             );
//           })}
//         </div>
//       )}

//       {/* Kanban view */}
//       {view === "kanban" && (
//         <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
//           {Object.entries(kanban).map(([status, list]) => (
//             <div key={status} className="bg-gray-100 rounded-xl p-3">
//               <h2 className="text-lg font-semibold capitalize mb-2">{status.replace("-", " ")} ({list.length})</h2>
//               <div className="space-y-3">
//                 {list.map((t) => {
//                   const suggestion = aiSuggestions[t._id];
//                   const aiLoading = !!aiLoadingMap[t._id];
//                   return (
//                     <div key={t._id} className="p-3 bg-white rounded-xl shadow hover:shadow-lg transition">
//                       <div className="flex justify-between items-start gap-2">
//                         <div onClick={() => (window.location.href = `/admin/helpdesk/tickets/${t._id}`)} className="cursor-pointer">
//                           <h3 className="font-medium">{t.subject}</h3>
//                           <p className="text-xs text-gray-500">{t.customerId?.name || t.customerId?.email}</p>
//                         </div>

//                         <div className="flex flex-col items-end gap-2">
//                           <div className="text-xs text-gray-500">Pri: {t.priority || "normal"}</div>
//                           <button onClick={() => aiPreview(t._id)} disabled={aiLoading} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
//                             {aiLoading ? "…" : "AI"}
//                           </button>
//                         </div>
//                       </div>

//                       {suggestion && (
//                         <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 border">
//                           <div className="flex items-center justify-between">
//                             <div>{suggestion.agentName} {suggestion.confidence ? `• ${Math.round(suggestion.confidence*100)}%` : ""}</div>
//                             <div className="flex gap-2">
//                               <button onClick={() => acceptAiSuggestion(t._id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Assign</button>
//                               <button onClick={() => setAiSuggestions((s)=>{ const c={...s}; delete c[t._id]; return c; })} className="px-2 py-1 bg-gray-200 rounded text-xs">Dismiss</button>
//                             </div>
//                           </div>
//                           {suggestion.reasons?.length > 0 && <ul className="mt-2 space-y-1"><li className="text-xs">{suggestion.reasons[0]}</li></ul>}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//                 {list.length === 0 && <p className="text-xs text-gray-500 italic">No tickets</p>}
//               </div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }


