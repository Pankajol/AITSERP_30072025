"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import TicketCard from "@/components/helpdesk/TicketCard";
import AgentSelector from "@/components/helpdesk/AgentSelector";
import { FiRefreshCw, FiSearch, FiCpu, FiCheck, FiX } from "react-icons/fi";
import { useRouter } from "next/navigation";

/**
 * Local uploaded image path (use as sample avatar / preview)
 * (developer note: this local path will be transformed to a usable URL by your environment)
 */
const SAMPLE_IMAGE = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export default function AdminHelpdeskTicketsPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("list"); // list | kanban
  const [msg, setMsg] = useState(null);

  // AI-specific maps: per-ticket loading & suggestion object
  const [aiLoadingMap, setAiLoadingMap] = useState({});
  const [aiSuggestions, setAiSuggestions] = useState({}); // ticketId => { agentId, agentName, confidence, reasons }
  const router = useRouter();
  const api = useMemo(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return axios.create({
      baseURL: "/api/helpdesk",
      headers: { Authorization: token ? "Bearer " + token : "" },
      validateStatus: () => true,
    });
  }, []);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // simple toast
  const toast = useCallback((type, text, timeout = 4000) => {
    setMsg({ type, text });
    if (timeout) setTimeout(() => setMsg((m) => (m && m.text === text ? null : m)), timeout);
  }, []);

  async function loadTickets() {
    setLoading(true);
    setMsg(null);
    try {
      const resp = await api.get("/list");
      if ((resp.headers["content-type"] || "").includes("text/html")) {
        toast("error", `Server returned HTML (status ${resp.status}). Check /api/helpdesk/list.`);
        setTickets([]);
        return;
      }
      if (!resp.data || typeof resp.data !== "object") {
        toast("error", "Unexpected response from server");
        setTickets([]);
        return;
      }
      if (resp.data.success === false) {
        toast("error", resp.data.msg || "API error");
        setTickets([]);
        return;
      }
      setTickets(resp.data.tickets || resp.data || []);
    } catch (err) {
      console.error("loadTickets:", err);
      toast("error", "Failed to load tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  // utility to flip flags in a map
  const setMapFlag = (setter, ticketId, v) => setter((m) => ({ ...m, [ticketId]: v }));

  // ------------------------
  // AI: preview suggestion for a ticket (non-destructive)
  // ------------------------
  async function aiPreview(ticketId) {
    // If already have suggestion, toggle it off
    if (aiSuggestions[ticketId]) {
      setAiSuggestions((s) => {
        const copy = { ...s };
        delete copy[ticketId];
        return copy;
      });
      return;
    }

    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      // Request preview mode to get reasons + confidence instead of immediate assignment
      const resp = await api.post("/ai/auto-assign", { ticketId, preview: true });

      // Defensive checks: some implementations might auto-assign; handle both
      if (resp.data?.success && resp.data?.preview === true) {
        // expected preview shape: { agentId, agentName, confidence, reasons }
        const suggestion = {
          agentId: resp.data.agentId,
          agentName: resp.data.agentName || resp.data.agentEmail || "Suggested agent",
          confidence: typeof resp.data.confidence === "number" ? resp.data.confidence : null,
          reasons: resp.data.reasons || resp.data.explanation || [],
        };
        setAiSuggestions((m) => ({ ...m, [ticketId]: suggestion }));
      } else if (resp.data?.success && resp.data.agentId) {
        // fallback: backend auto-assigned but returned agentId; we show minimal info
        setAiSuggestions((m) => ({
          ...m,
          [ticketId]: {
            agentId: resp.data.agentId,
            agentName: resp.data.agentName || "Assigned",
            confidence: null,
            reasons: ["Assigned by AI."],
          },
        }));
        toast("success", `Ticket auto-assigned to ${resp.data.agentName || resp.data.agentId}`);
        // refresh list to reflect assignment
        await loadTickets();
      } else {
        const txt = resp.data?.msg || `AI preview failed (status ${resp.status})`;
        toast("error", txt);
      }
    } catch (err) {
      console.error("aiPreview error:", err);
      toast("error", "AI preview error");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  // ------------------------
  // Accept AI suggestion (assign agent)
  // ------------------------
  async function acceptAiSuggestion(ticketId) {
    const suggestion = aiSuggestions[ticketId];
    if (!suggestion?.agentId) {
      toast("error", "No AI suggestion available");
      return;
    }

    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/assign", { ticketId, agentId: suggestion.agentId });
      if (resp.data?.success) {
        toast("success", `Assigned to ${suggestion.agentName}`);
        // remove suggestion and refresh tickets
        setAiSuggestions((m) => {
          const copy = { ...m };
          delete copy[ticketId];
          return copy;
        });
        await loadTickets();
      } else {
        toast("error", resp.data?.msg || `Assign failed (${resp.status})`);
      }
    } catch (err) {
      console.error("acceptAiSuggestion:", err);
      toast("error", "AI assign failed");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  // ------------------------
  // Existing assign + update helpers (kept for compatibility)
  // ------------------------
  async function assignAgent(ticketId, agentId) {
    if (!agentId) {
      toast("error", "Select an agent");
      return;
    }
    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/assign", { ticketId, agentId });
      if (resp.data?.success) {
        toast("success", "Assigned");
        await loadTickets();
      } else {
        toast("error", resp.data?.msg || `Assign failed (${resp.status})`);
      }
    } catch (err) {
      console.error(err);
      toast("error", "Error assigning");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  async function updateStatus(ticketId, status) {
    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/update-status", { ticketId, status });
      if (resp.data?.success) {
        toast("success", "Status updated");
        await loadTickets();
      } else {
        toast("error", resp.data?.msg || `Status update failed (${resp.status})`);
      }
    } catch (err) {
      console.error(err);
      toast("error", "Error updating status");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  async function updatePriority(ticketId, priority) {
    setMapFlag(setAiLoadingMap, ticketId, true);
    try {
      const resp = await api.post("/update-priority", { ticketId, priority });
      if (resp.data?.success) {
        toast("success", "Priority updated");
        await loadTickets();
      } else {
        toast("error", resp.data?.msg || `Priority update failed (${resp.status})`);
      }
    } catch (err) {
      console.error(err);
      toast("error", "Error updating priority");
    } finally {
      setMapFlag(setAiLoadingMap, ticketId, false);
    }
  }

  // ------------------------
  // Kanban grouping
  // ------------------------
  const kanban = {
    open: tickets.filter((t) => t.status === "open"),
    "in-progress": tickets.filter((t) => t.status === "in-progress"),
    pending: tickets.filter((t) => t.status === "pending"),
    "on-hold": tickets.filter((t) => t.status === "on-hold"),
    closed: tickets.filter((t) => t.status === "closed"),
  };

  // ------------------------
  // Render
  // ------------------------
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-10 w-48 bg-gray-200 rounded" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }
 

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Helpdesk Admin</h1>
          <p className="text-sm text-gray-500">AI-assisted assignment & modern admin tools</p>
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setView("list")}
            className={`px-4 py-2 rounded ${view === "list" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            List
          </button>
          <button
            onClick={() => setView("kanban")}
            className={`px-4 py-2 rounded ${view === "kanban" ? "bg-blue-600 text-white" : "bg-gray-200"}`}
          >
            Kanban
          </button>
          <button onClick={loadTickets} className="px-4 py-2 bg-gray-800 text-white rounded flex items-center gap-2">
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded ${msg.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
          {msg.text}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="space-y-3">
          {tickets.map((t) => {
            const suggestion = aiSuggestions[t._id];
            const aiLoading = !!aiLoadingMap[t._id];
            return (
              <div key={t._id} className="p-4 bg-white rounded-xl shadow flex flex-col md:flex-row gap-4 hover:shadow-lg transition">
              <div
  className="flex-1 cursor-pointer"
  onClick={() => router.push(`/admin/helpdesk/tickets/${t._id}`)}
>
  <TicketCard ticket={t} />
</div>

                <div className="w-full md:w-96 space-y-3">
                  {/* Assign controls */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">Assign</div>
                      <AgentSelector onSelect={(agentId) => assignAgent(t._id, agentId)} />
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {/* AI preview / accept */}
                      <button
                        onClick={() => aiPreview(t._id)}
                        disabled={aiLoading}
                        className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center gap-2 text-sm"
                        title="Preview AI suggestion"
                      >
                        <FiCpu /> {aiLoading ? "Thinking…" : suggestion ? "Hide AI" : "AI Suggest"}
                      </button>
                    </div>
                  </div>

                  {/* AI suggestion card */}
                  {suggestion && (
                    <div className="p-3 bg-gray-50 rounded border">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">AI suggestion</div>
                        <div className="text-xs text-gray-500">{suggestion.confidence ? `${Math.round(suggestion.confidence * 100)}% confidence` : "no confidence score"}</div>
                      </div>

                      <div className="mt-2 flex items-center gap-3">
                        {/* Agent avatar / name */}
                        <div className="flex items-center gap-2">
                          <img src={SAMPLE_IMAGE} alt="agent" className="w-10 h-10 rounded-full object-cover border" />
                          <div>
                            <div className="font-medium">{suggestion.agentName}</div>
                            <div className="text-xs text-gray-500">{suggestion.agentId}</div>
                          </div>
                        </div>

                        <div className="ml-auto flex gap-2">
                          <button onClick={() => acceptAiSuggestion(t._id)} disabled={aiLoading} className="px-3 py-1 bg-green-600 text-white rounded text-sm flex items-center gap-2">
                            <FiCheck /> Accept
                          </button>
                          <button onClick={() => {
                            // dismiss suggestion
                            setAiSuggestions((s)=>{ const c={...s}; delete c[t._id]; return c; });
                          }} className="px-3 py-1 bg-gray-200 rounded text-sm flex items-center gap-2">
                            <FiX /> Dismiss
                          </button>
                        </div>
                      </div>

                      {/* reasons / explanation */}
                      {suggestion.reasons?.length > 0 && (
                        <ul className="mt-3 text-xs text-gray-600 space-y-1">
                          {suggestion.reasons.map((r, i) => <li key={i}>• {r}</li>)}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Status + Priority */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">Status</div>
                      <select value={t.status} onChange={(e)=>updateStatus(t._id, e.target.value)} className="p-2 rounded bg-gray-100 w-full">
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="pending">Pending</option>
                        <option value="on-hold">On Hold</option>
                        <option value="closed">Closed</option>
                      </select>
                    </div>

                    <div className="flex-1">
                      <div className="text-sm text-gray-600 mb-1">Priority</div>
                      <select value={t.priority || "normal"} onChange={(e)=>updatePriority(t._id, e.target.value)} className="p-2 rounded bg-gray-100 w-full">
                        <option value="low">Low</option>
                        <option value="normal">Normal</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500">
                    <div>Customer: {t.customerId?.name || t.customerId?.email || "—"}</div>
                    <div>Agent: {t.agentId?.name || t.agentId?.email || "Unassigned"}</div>
                    <div>Created: {new Date(t.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Kanban view */}
      {view === "kanban" && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Object.entries(kanban).map(([status, list]) => (
            <div key={status} className="bg-gray-100 rounded-xl p-3">
              <h2 className="text-lg font-semibold capitalize mb-2">{status.replace("-", " ")} ({list.length})</h2>
              <div className="space-y-3">
                {list.map((t) => {
                  const suggestion = aiSuggestions[t._id];
                  const aiLoading = !!aiLoadingMap[t._id];
                  return (
                    <div key={t._id} className="p-3 bg-white rounded-xl shadow hover:shadow-lg transition">
                      <div className="flex justify-between items-start gap-2">
                        <div onClick={() => (window.location.href = `/admin/helpdesk/tickets/${t._id}`)} className="cursor-pointer">
                          <h3 className="font-medium">{t.subject}</h3>
                          <p className="text-xs text-gray-500">{t.customerId?.name || t.customerId?.email}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <div className="text-xs text-gray-500">Pri: {t.priority || "normal"}</div>
                          <button onClick={() => aiPreview(t._id)} disabled={aiLoading} className="px-2 py-1 bg-indigo-600 text-white rounded text-xs">
                            {aiLoading ? "…" : "AI"}
                          </button>
                        </div>
                      </div>

                      {suggestion && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600 border">
                          <div className="flex items-center justify-between">
                            <div>{suggestion.agentName} {suggestion.confidence ? `• ${Math.round(suggestion.confidence*100)}%` : ""}</div>
                            <div className="flex gap-2">
                              <button onClick={() => acceptAiSuggestion(t._id)} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Assign</button>
                              <button onClick={() => setAiSuggestions((s)=>{ const c={...s}; delete c[t._id]; return c; })} className="px-2 py-1 bg-gray-200 rounded text-xs">Dismiss</button>
                            </div>
                          </div>
                          {suggestion.reasons?.length > 0 && <ul className="mt-2 space-y-1"><li className="text-xs">{suggestion.reasons[0]}</li></ul>}
                        </div>
                      )}
                    </div>
                  );
                })}
                {list.length === 0 && <p className="text-xs text-gray-500 italic">No tickets</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}



// // src/app/admin/helpdesk/tickets/page.jsx
// "use client";

// import { useEffect, useState } from "react";
// import TicketCard from "@/components/helpdesk/TicketCard";
// import AgentSelector from "@/components/helpdesk/AgentSelector";

// const SAMPLE_IMAGE = "/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png";

// export default function AdminHelpdeskTicketsPage() {
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedTicket, setSelectedTicket] = useState(null);
//   const [assigning, setAssigning] = useState(false);
//   const [statusUpdating, setStatusUpdating] = useState(false);
//   const [priorityUpdating, setPriorityUpdating] = useState(false);

//   useEffect(() => {
//     loadTickets();
//   }, []);

//   async function loadTickets() {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/helpdesk/list", {
//         headers: { Authorization: "Bearer " + token }
//       });
//       const json = await res.json();
//       if (json.success) setTickets(json.tickets || []);
//       else console.error("list tickets:", json);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }

//   function openTicket(t) {
//     // open admin ticket detail page
//     window.location.href = `/admin/helpdesk/tickets/${t._id}`;
//   }

//   async function assignAgent(ticketId, agentId) {
//     if (!agentId) return alert("Select an agent");
//     setAssigning(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/helpdesk/assign", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
//         body: JSON.stringify({ ticketId, agentId })
//       });
//       const j = await res.json();
//       if (j.success) {
//         alert("Assigned");
//         loadTickets();
//       } else alert(j.msg || "Failed to assign");
//     } catch (e) {
//       console.error(e);
//       alert("Error assigning");
//     } finally {
//       setAssigning(false);
//     }
//   }

//   async function autoAssign(ticketId) {
//     setAssigning(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/helpdesk/ai/auto-assign", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
//         body: JSON.stringify({ ticketId })
//       });
//       const j = await res.json();
//       if (j.success) {
//         alert("Auto-assigned to agent: " + j.agentId);
//         loadTickets();
//       } else alert(j.msg || "Auto-assign failed");
//     } catch (e) {
//       console.error(e);
//       alert("AI error");
//     } finally {
//       setAssigning(false);
//     }
//   }

//   async function updateStatus(ticketId, status) {
//     setStatusUpdating(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/helpdesk/update-status", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
//         body: JSON.stringify({ ticketId, status })
//       });
//       const j = await res.json();
//       if (j.success) {
//         loadTickets();
//       } else alert(j.msg || "Failed to update status");
//     } catch (e) {
//       console.error(e);
//       alert("Error");
//     } finally {
//       setStatusUpdating(false);
//     }
//   }

//   async function updatePriority(ticketId, priority) {
//     setPriorityUpdating(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await fetch("/api/helpdesk/update-priority", {
//         method: "POST",
//         headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
//         body: JSON.stringify({ ticketId, priority })
//       });
//       const j = await res.json();
//       if (j.success) {
//         loadTickets();
//       } else alert(j.msg || "Failed to update priority");
//     } catch (e) {
//       console.error(e);
//       alert("Error");
//     } finally {
//       setPriorityUpdating(false);
//     }
//   }

//   if (loading) return <div className="p-6">Loading tickets…</div>;

//   return (
//     <div className="p-6 space-y-6">
//       <header className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">Admin — Tickets</h1>
//           <p className="text-sm text-gray-400">Manage and operate company tickets</p>
//         </div>

//         <div className="flex items-center gap-3">
//           <button
//             onClick={loadTickets}
//             className="px-3 py-2 bg-gray-800 text-white rounded"
//           >
//             Refresh
//           </button>
//           <button
//             onClick={() => window.location.href = "/admin/helpdesk/analytics"}
//             className="px-3 py-2 bg-blue-600 text-white rounded"
//           >
//             Analytics
//           </button>
//         </div>
//       </header>

//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         <div className="col-span-2 space-y-4">
//           {tickets.length === 0 && <div className="p-4 bg-yellow-50 rounded">No tickets yet.</div>}

//           <div className="space-y-3">
//             {tickets.map((t) => (
//               <div key={t._id} className="p-4 bg-gray-900 rounded flex flex-col md:flex-row md:items-center md:justify-between gap-3">
//                 <div className="flex-1 cursor-pointer" onClick={() => openTicket(t)}>
//                   <TicketCard ticket={t} />
//                 </div>

//                 <div className="w-full md:w-72 flex flex-col gap-2">
//                   <div className="text-sm text-gray-300">Assign / Auto-assign</div>
//                   <div className="flex gap-2">
//                     <AgentSelector onSelect={(agentId) => assignAgent(t._id, agentId)} />
//                     <button
//                       onClick={() => autoAssign(t._id)}
//                       disabled={assigning}
//                       className="px-3 py-1 bg-indigo-600 rounded text-white"
//                     >
//                       {assigning ? "..." : "AI Assign"}
//                     </button>
//                   </div>

//                   <div className="text-sm text-gray-300 mt-2">Status</div>
//                   <div className="flex gap-2">
//                     <select
//                       defaultValue={t.status}
//                       onChange={(e) => updateStatus(t._id, e.target.value)}
//                       className="p-2 rounded bg-gray-800 text-white"
//                     >
//                       <option value="open">Open</option>
//                       <option value="in-progress">In Progress</option>
//                       <option value="pending">Pending</option>
//                       <option value="on-hold">On Hold</option>
//                       <option value="closed">Closed</option>
//                     </select>

//                     <div className="text-sm opacity-60">{statusUpdating ? "Updating…" : ""}</div>
//                   </div>

//                   <div className="text-sm text-gray-300 mt-2">Priority</div>
//                   <div className="flex gap-2 items-center">
//                     <select
//                       defaultValue={t.priority || "normal"}
//                       onChange={(e) => updatePriority(t._id, e.target.value)}
//                       className="p-2 rounded bg-gray-800 text-white"
//                     >
//                       <option value="low">Low</option>
//                       <option value="normal">Normal</option>
//                       <option value="high">High</option>
//                       <option value="critical">Critical</option>
//                     </select>

//                     <div className="text-sm opacity-60">{priorityUpdating ? "Updating…" : ""}</div>
//                   </div>

//                   <div className="mt-2 text-xs text-gray-400">
//                     <div>Customer: {t.customerId?.name || t.customerId?.email || "—"}</div>
//                     <div>Agent: {t.agentId?.name || t.agentId?.email || "Unassigned"}</div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* Right column: selected ticket preview + quick actions */}
//         <aside className="space-y-4">
//           <div className="p-4 bg-white rounded shadow">
//             <h3 className="font-semibold">Quick Preview</h3>
//             <p className="text-sm text-gray-600">Click a ticket to open full admin view.</p>
//             <div className="mt-3">
//               <img src={SAMPLE_IMAGE} alt="sample" className="w-full rounded" />
//             </div>
//           </div>

//           <div className="p-4 bg-white rounded shadow">
//             <h3 className="font-semibold">Bulk actions</h3>
//             <div className="mt-3 space-y-2">
//               <button
//                 onClick={() => {
//                   if (!confirm("Close all open tickets?")) return;
//                   Promise.all(tickets.filter(t => t.status !== "closed").map(t => fetch("/api/helpdesk/update-status", {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
//                     body: JSON.stringify({ ticketId: t._id, status: "closed" })
//                   }))).then(() => loadTickets());
//                 }}
//                 className="px-3 py-2 bg-red-600 text-white rounded"
//               >
//                 Close all open
//               </button>

//               <button
//                 onClick={() => {
//                   if (!confirm("Auto-assign all unassigned tickets?")) return;
//                   const unassigned = tickets.filter(t => !t.agentId);
//                   Promise.all(unassigned.map(t => fetch("/api/helpdesk/ai/auto-assign", {
//                     method: "POST",
//                     headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
//                     body: JSON.stringify({ ticketId: t._id })
//                   }))).then(() => loadTickets());
//                 }}
//                 className="px-3 py-2 bg-indigo-600 text-white rounded"
//               >
//                 Auto-assign unassigned
//               </button>
//             </div>
//           </div>

//           <div className="p-4 bg-gray-50 rounded">
//             <h3 className="font-semibold">Help</h3>
//             <p className="text-sm text-gray-600">Use AI Assign for recommended agent. Use status/priority to manage SLAs.</p>
//           </div>
//         </aside>
//       </div>
//     </div>
//   );
// }
