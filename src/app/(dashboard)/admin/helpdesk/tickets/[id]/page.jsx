"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import { 
  FiArrowLeft, 
  FiSend, 
  FiPaperclip, 
  FiLock, 
  FiRefreshCw, 
  FiCheckCircle, 
  FiFile, 
  FiX 
} from "react-icons/fi";

const DEFAULT_AVATAR = "https://ui-avatars.com/api/?background=random";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id;

  // Fix: Initializing useRef as null (avoids HTMLDivElement SSR error)
  const scrollRef = useRef(null);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [files, setFiles] = useState([]);

  /* ================= AXIOS INSTANCE ================= */
  const api = useMemo(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    return axios.create({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      validateStatus: () => true,
    });
  }, []);

  /* ================= LOAD TICKET ================= */
  useEffect(() => {
    if (!ticketId) return;
    loadTicket();
  }, [ticketId]);

  // Auto-scroll to bottom whenever messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ticket?.messages]);

  async function loadTicket() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await api.get(`/api/helpdesk/tickets/${ticketId}`);
      if (!res.data?.success) {
        setMsg({ type: "error", text: res.data?.msg || "Ticket not found" });
        setTicket(null);
      } else {
        setTicket(res.data.ticket);
      }
    } catch (err) {
      setMsg({ type: "error", text: "Server error" });
    } finally {
      setLoading(false);
    }
  }

  /* ================= SEND REPLY ================= */
  async function sendReply(e) {
    e.preventDefault();
    if (!reply.trim() || isClosed) return;

    setBusy(true);
    setMsg(null);

    try {
      const formData = new FormData();
      formData.append("message", reply.trim());
      files.forEach((file) => formData.append("attachments", file));

      const res = await api.post(
        `/api/helpdesk/tickets/${ticketId}/message`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.success) {
        setReply("");
        setFiles([]);
        await loadTicket();
        setMsg({ type: "success", text: "Reply sent successfully" });
      } else {
        setMsg({ type: "error", text: res.data?.msg || "Failed to send" });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Failed to send reply" });
    } finally {
      setBusy(false);
    }
  }

  /* ================= CLOSE TICKET ================= */
  async function closeTicket() {
    if (isClosed) return;
    if (!window.confirm("Are you sure you want to close this ticket?")) return;

    setBusy(true);
    try {
      const res = await api.post("/api/helpdesk/close", { ticketId });
      if (res.data?.success) {
        setMsg({ type: "success", text: "Ticket closed successfully" });
        await loadTicket();
      } else {
        setMsg({ type: "error", text: res.data?.msg || "Failed to close" });
      }
    } catch (err) {
      setMsg({ type: "error", text: "Server error" });
    } finally {
      setBusy(false);
    }
  }

  function onFileChange(e) {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  }

  /* ================= UI RENDERING ================= */
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <FiRefreshCw className="animate-spin text-indigo-600 text-3xl" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="p-10 text-center">
        <p className="text-red-500 mb-4">Ticket not found</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-slate-900 text-white rounded-xl">Go Back</button>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";
  const customerDisplay = ticket.customerId?.name || ticket.customerEmail || "Customer";

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc]">
      {/* HEADER SECTION */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <FiArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 truncate max-w-md">{ticket.subject}</h1>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                isClosed ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"
              }`}>
                {ticket.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">{customerDisplay}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isClosed && (
            <button 
              onClick={closeTicket} 
              disabled={busy}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition-all border border-red-100"
            >
              <FiCheckCircle /> <span className="hidden md:inline">Close Ticket</span>
            </button>
          )}
          <button onClick={loadTicket} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100">
            <FiRefreshCw className={busy ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* ERROR/SUCCESS MESSAGES */}
      {msg && (
        <div className={`m-4 p-3 rounded-xl text-center text-sm font-medium animate-pulse ${
          msg.type === "error" ? "bg-red-50 text-red-700 border border-red-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100"
        }`}>
          {msg.text}
        </div>
      )}

      {/* CHAT THREAD */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="max-w-4xl mx-auto">
          {ticket.messages?.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).map((m, idx) => {
            const isAgent = m.senderType === "agent";
            return (
              <div key={m._id || idx} className={`flex ${isAgent ? "justify-end" : "justify-start"} mb-6`}>
                <div className={`flex gap-3 max-w-[85%] md:max-w-[70%] ${isAgent ? "flex-row-reverse" : "flex-row"}`}>
                  <img 
                    src={m.sender?.avatar || DEFAULT_AVATAR} 
                    className="w-9 h-9 rounded-xl border-2 border-white shadow-sm flex-shrink-0 object-cover" 
                    onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                    alt="" 
                  />
                  <div className={`space-y-1 ${isAgent ? "items-end" : "items-start"}`}>
                    <div className={`flex items-center gap-2 mb-1 ${isAgent ? "flex-row-reverse" : ""}`}>
                      <span className="text-[11px] font-bold text-slate-600">{m.sender?.name || "User"}</span>
                      <span className="text-[10px] text-slate-400">{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                    
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      isAgent ? "bg-indigo-600 text-white rounded-tr-none" : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                    }`}>
                      <div className="whitespace-pre-wrap">{m.message}</div>
                      
                      {m.attachments?.length > 0 && (
                        <div className={`mt-3 pt-3 border-t space-y-2 ${isAgent ? "border-indigo-400" : "border-slate-100"}`}>
                          {m.attachments.map((file, i) => (
                            <a key={i} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs hover:underline">
                              <FiPaperclip /> {file.filename || "Attachment"}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* REPLY INPUT AREA */}
      <footer className="bg-white border-t p-4 md:p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.03)]">
        <div className="max-w-4xl mx-auto">
          {!isClosed ? (
            <form onSubmit={sendReply} className="space-y-4">
              {files.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[10px] font-bold border border-indigo-100">
                      <FiFile /> {f.name}
                      <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="hover:text-red-500">
                        <FiX />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="relative group">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Share an update or solution..."
                  rows={3}
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 pr-12 text-sm focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-inner"
                />
                <div className="absolute right-4 bottom-4 flex items-center gap-2">
                  <label className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer transition-colors">
                    <FiPaperclip size={20} />
                    <input type="file" multiple className="hidden" onChange={onFileChange} />
                  </label>
                  <button
                    type="submit"
                    disabled={busy || !reply.trim()}
                    className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    {busy ? <FiRefreshCw className="animate-spin" /> : <FiSend size={18} />}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex items-center justify-center gap-3 p-6 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-slate-500 font-medium">
              <FiLock /> This ticket is closed. No further replies are permitted.
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}




// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { useRouter, useParams } from "next/navigation";
// import axios from "axios";

// const DEFAULT_AVATAR =
//   "https://lh3.googleusercontent.com/a/ACg8ocKR3SzcYHvO6YiFnOd7lQ1B2l4VjXwxC-NvP__OhI5GiNoKXXQZ=s360-c-no";

// export default function TicketDetailPage() {
//   const router = useRouter();
//   const params = useParams();
//   const ticketId = params?.id;

//   const [ticket, setTicket] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [reply, setReply] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [msg, setMsg] = useState(null);
//   const [files, setFiles] = useState([]);

//   /* ================= AXIOS INSTANCE ================= */

//   const api = useMemo(() => {
//     const token =
//       typeof window !== "undefined" ? localStorage.getItem("token") : null;

//     return axios.create({
//       headers: token ? { Authorization: `Bearer ${token}` } : {},
//       validateStatus: () => true,
//     });
//   }, []);

//   /* ================= LOAD TICKET ================= */

//   useEffect(() => {
//     if (!ticketId) return;
//     loadTicket();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [ticketId]);
// function onFileChange(e) {
//   const selectedFiles = Array.from(e.target.files || []);
//   setFiles(selectedFiles);
// }


//   async function loadTicket() {
//     setLoading(true);
//     setMsg(null);

//     try {
//       const res = await api.get(`/api/helpdesk/tickets/${ticketId}`);

//       if (!res.data?.success) {
//         setMsg({ type: "error", text: res.data?.msg || "Ticket not found" });
//         setTicket(null);
//         return;
//       }

//       setTicket(res.data.ticket);
//     } catch (err) {
//       console.error(err);
//       setMsg({ type: "error", text: "Server error" });
//       setTicket(null);
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* ================= SEND REPLY ================= */
// async function sendReply(e) {
//   e.preventDefault();
//   if (!reply.trim() || isClosed) return;

//   setBusy(true);
//   setMsg(null);

//   try {
//     const formData = new FormData();
//     formData.append("message", reply.trim());

//     files.forEach((file) => {
//       formData.append("attachments", file);
//     });

//     const res = await api.post(
//       `/api/helpdesk/tickets/${ticketId}/message`,
//       formData,
//       {
//         headers: {
//           "Content-Type": "multipart/form-data",
//         },
//       }
//     );

//   if (res.data?.success) {
//   setReply("");
//   setFiles([]);
//   await loadTicket(); // ✅ reload full ticket with all messages
//   setMsg({ type: "success", text: "Reply sent successfully" });
// }
//  else {
//       setMsg({
//         type: "error",
//         text: res.data?.msg || "Failed to send reply",
//       });
//     }
//   } catch (err) {
//     console.error(err);
//     setMsg({ type: "error", text: "Failed to send reply" });
//   } finally {
//     setBusy(false);
//   }
// }


//   /* ================= CLOSE TICKET ================= */

//   async function closeTicket() {
//     if (isClosed) return;
//     if (!window.confirm("Are you sure you want to close this ticket?")) return;

//     setBusy(true);
//     setMsg(null);

//     try {
//       const res = await api.post("/api/helpdesk/close", { ticketId });

//       if (res.data?.success) {
//         setMsg({ type: "success", text: "Ticket closed successfully" });
//         await loadTicket(); // reload fresh state
//       } else {
//         setMsg({
//           type: "error",
//           text: res.data?.msg || "Failed to close ticket",
//         });
//       }
//     } catch (err) {
//       console.error(err);
//       setMsg({ type: "error", text: "Server error" });
//     } finally {
//       setBusy(false);
//     }
//   }

//   /* ================= UI STATES ================= */

//   if (loading) {
//     return <div className="p-6 text-gray-500 text-lg">Loading ticket…</div>;
//   }

//   if (!ticket) {
//     return (
//       <div className="p-6 text-red-600 text-lg">
//         Ticket not found
//         <button
//           onClick={() => router.push("/admin/helpdesk/tickets")}
//           className="ml-2 px-3 py-1 bg-gray-200 rounded"
//         >
//           Go back
//         </button>
//       </div>
//     );
//   }

//   const isClosed = ticket.status === "closed";

//   const customerDisplay =
//     ticket.customerId?.name ||
//     ticket.customerId?.email ||
//     ticket.customerEmail ||
//     "Customer";

//   /* ================= RENDER ================= */

//   return (
//     <div className="p-6 max-w-3xl mx-auto space-y-6">

//       {/* HEADER */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">{ticket.subject}</h1>
//           <p className="text-sm text-gray-500">{customerDisplay}</p>

//           <span
//             className={`inline-block mt-1 px-3 py-1 text-xs rounded-full ${
//               isClosed
//                 ? "bg-red-100 text-red-700"
//                 : "bg-green-100 text-green-700"
//             }`}
//           >
//             {isClosed ? "Closed" : "Open"}
//           </span>
//         </div>

//         <div className="flex gap-2">
//           <button
//             onClick={closeTicket}
//             disabled={busy || isClosed}
//             className={`px-4 py-2 rounded text-white ${
//               isClosed
//                 ? "bg-gray-400 cursor-not-allowed"
//                 : "bg-red-600 hover:bg-red-700"
//             }`}
//           >
//             {isClosed ? "Closed" : "Close Ticket"}
//           </button>

//           <button
//             onClick={loadTicket}
//             className="px-4 py-2 bg-gray-200 rounded"
//           >
//             Refresh
//           </button>
//         </div>
//       </div>

//       {/* MESSAGE */}
//       {msg && (
//         <div
//           className={`p-3 rounded ${
//             msg.type === "error"
//               ? "bg-red-100 text-red-800"
//               : "bg-green-100 text-green-800"
//           }`}
//         >
//           {msg.text}
//         </div>
//       )}

//       {/* MESSAGES */}
//       <div className="space-y-3">
//        {ticket.messages?.length ? (
//   [...ticket.messages]
//     .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
//     .map((m) => {

//             const senderName =
//               m.sender?.name ||
//               m.sender?.email ||
//               m.externalEmail ||
//               "User";

//             const avatar =
//               m.sender?.avatar ||
//               (m.senderType === "agent" && ticket.agentId?.avatar) ||
//               DEFAULT_AVATAR;

//             const isCustomer =
//               m.senderType === "customer" ||
//               m.externalEmail === ticket.customerEmail;

//             return (
//               <div
//                 key={m._id}
//                 className={`p-3 rounded flex gap-3 ${
//                   isCustomer ? "bg-gray-50" : "bg-blue-50"
//                 }`}
//               >
//                 <img
//                   src={avatar}
//                   alt={senderName}
//                   className="w-10 h-10 rounded-full border object-cover"
//                   onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
//                 />

//                 <div className="flex-1">
//                   <div className="flex items-center gap-2">
//                     <span className="font-medium">{senderName}</span>
//                     <span className="text-xs text-gray-500">
//                       {new Date(m.createdAt).toLocaleString()}
//                     </span>
//                   </div>

//                   <div className="mt-1 whitespace-pre-wrap">{m.message}</div>

//                   {m.attachments?.length > 0 && (
//                     <div className="mt-2 space-y-1">
//                       {m.attachments.map((file, idx) => (
//                         <a
//                           key={idx}
//                           href={file.url}
//                           target="_blank"
//                           rel="noopener noreferrer"
//                           className="block text-sm text-blue-600 hover:underline"
//                         >
//                           📎 {file.filename || "Attachment"}
//                         </a>
//                       ))}
//                     </div>
//                   )}
//                 </div>
//               </div>
//             );
//           })
//         ) : (
//           <div className="text-gray-500">No messages yet</div>
//         )}
//       </div>

//       {/* REPLY */}
//       {!isClosed ? (
//         <form onSubmit={sendReply} className="space-y-2">
//           <textarea
//             value={reply}
//             onChange={(e) => setReply(e.target.value)}
//             placeholder="Type your reply…"
//             rows={3}
//             className="w-full border p-2 rounded"
//           />
//           <input
//   type="file"
//   multiple
//   onChange={onFileChange}
//   className="text-sm"
// />
// {files.length > 0 && (
//   <div className="text-xs text-gray-500">
//     {files.map((f, i) => (
//       <div key={i}>📎 {f.name}</div>
//     ))}
//   </div>
// )}



//           <button
//             type="submit"
//             disabled={busy || !reply.trim()}
//             className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
//           >
//             {busy ? "Sending…" : "Send Reply"}
//           </button>
//         </form>
//       ) : (
//         <div className="p-3 text-sm bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
//           🔒 This ticket is closed. No further replies are allowed.
//         </div>
//       )}
//     </div>
//   );
// }


