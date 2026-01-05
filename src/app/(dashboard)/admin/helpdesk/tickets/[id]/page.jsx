"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";

const DEFAULT_AVATAR =
  "https://lh3.googleusercontent.com/a/ACg8ocKR3SzcYHvO6YiFnOd7lQ1B2l4VjXwxC-NvP__OhI5GiNoKXXQZ=s360-c-no";

export default function TicketDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params?.id;

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  /* ================= AXIOS INSTANCE ================= */

  const api = useMemo(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    return axios.create({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      validateStatus: () => true,
    });
  }, []);

  /* ================= LOAD TICKET ================= */

  useEffect(() => {
    if (!ticketId) return;
    loadTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function loadTicket() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await api.get(`/api/helpdesk/tickets/${ticketId}`);

      if (!res.data?.success) {
        setMsg({ type: "error", text: res.data?.msg || "Ticket not found" });
        setTicket(null);
        return;
      }

      setTicket(res.data.ticket);
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Server error" });
      setTicket(null);
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
      const res = await api.post(
        `/api/helpdesk/tickets/${ticketId}/message`,
        { message: reply.trim() }
      );

      if (res.data?.success && res.data.ticket) {
        setReply("");
        setTicket(res.data.ticket);
        setMsg({ type: "success", text: "Reply sent successfully" });
      } else {
        setMsg({
          type: "error",
          text: res.data?.msg || "Failed to send reply",
        });
      }
    } catch (err) {
      console.error(err);
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
    setMsg(null);

    try {
      const res = await api.post("/api/helpdesk/close", { ticketId });

      if (res.data?.success) {
        setMsg({ type: "success", text: "Ticket closed successfully" });
        await loadTicket(); // reload fresh state
      } else {
        setMsg({
          type: "error",
          text: res.data?.msg || "Failed to close ticket",
        });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Server error" });
    } finally {
      setBusy(false);
    }
  }

  /* ================= UI STATES ================= */

  if (loading) {
    return <div className="p-6 text-gray-500 text-lg">Loading ticket…</div>;
  }

  if (!ticket) {
    return (
      <div className="p-6 text-red-600 text-lg">
        Ticket not found
        <button
          onClick={() => router.push("/admin/helpdesk/tickets")}
          className="ml-2 px-3 py-1 bg-gray-200 rounded"
        >
          Go back
        </button>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  const customerDisplay =
    ticket.customerId?.name ||
    ticket.customerId?.email ||
    ticket.customerEmail ||
    "Customer";

  /* ================= RENDER ================= */

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-gray-500">{customerDisplay}</p>

          <span
            className={`inline-block mt-1 px-3 py-1 text-xs rounded-full ${
              isClosed
                ? "bg-red-100 text-red-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isClosed ? "Closed" : "Open"}
          </span>
        </div>

        <div className="flex gap-2">
          <button
            onClick={closeTicket}
            disabled={busy || isClosed}
            className={`px-4 py-2 rounded text-white ${
              isClosed
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {isClosed ? "Closed" : "Close Ticket"}
          </button>

          <button
            onClick={loadTicket}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* MESSAGE */}
      {msg && (
        <div
          className={`p-3 rounded ${
            msg.type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* MESSAGES */}
      <div className="space-y-3">
        {ticket.messages?.length ? (
          ticket.messages.map((m) => {
            const senderName =
              m.sender?.name ||
              m.sender?.email ||
              m.externalEmail ||
              "User";

            const avatar =
              m.sender?.avatar ||
              (m.senderType === "agent" && ticket.agentId?.avatar) ||
              DEFAULT_AVATAR;

            const isCustomer =
              m.senderType === "customer" ||
              m.externalEmail === ticket.customerEmail;

            return (
              <div
                key={m._id}
                className={`p-3 rounded flex gap-3 ${
                  isCustomer ? "bg-gray-50" : "bg-blue-50"
                }`}
              >
                <img
                  src={avatar}
                  alt={senderName}
                  className="w-10 h-10 rounded-full border object-cover"
                  onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
                />

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{senderName}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(m.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="mt-1 whitespace-pre-wrap">{m.message}</div>

                  {m.attachments?.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {m.attachments.map((file, idx) => (
                        <a
                          key={idx}
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-blue-600 hover:underline"
                        >
                          📎 {file.filename || "Attachment"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-gray-500">No messages yet</div>
        )}
      </div>

      {/* REPLY */}
      {!isClosed ? (
        <form onSubmit={sendReply} className="space-y-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Type your reply…"
            rows={3}
            className="w-full border p-2 rounded"
          />

          <button
            type="submit"
            disabled={busy || !reply.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Reply"}
          </button>
        </form>
      ) : (
        <div className="p-3 text-sm bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          🔒 This ticket is closed. No further replies are allowed.
        </div>
      )}
    </div>
  );
}



// "use client";

// import { useEffect, useState, useMemo } from "react";
// import { useRouter, useParams } from "next/navigation";
// import axios from "axios";

// const DEFAULT_AVATAR = "https://lh3.googleusercontent.com/a/ACg8ocKR3SzcYHvO6YiFnOd7lQ1B2l4VjXwxC-NvP__OhI5GiNoKXXQZ=s360-c-no"; // ✅ public/avatar.png

// export default function TicketDetailPage() {
//   const router = useRouter();
//   const params = useParams();
//   const ticketId = params?.id;

//   const [ticket, setTicket] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [reply, setReply] = useState("");
//   const [busy, setBusy] = useState(false);
//   const [msg, setMsg] = useState(null);

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

//   async function loadTicket() {
//     setLoading(true);
//     setMsg(null);

//     try {
//       console.log("➡️ Fetch ticket:", ticketId);

//       const res = await api.get(`/api/helpdesk/tickets/${ticketId}`);
//       console.log("⬅️ API response:", res.data);

//       if (!res.data || typeof res.data !== "object") {
//         setMsg({ type: "error", text: "Invalid server response" });
//         setTicket(null);
//         return;
//       }

//       if (!res.data.success) {
//         setMsg({ type: "error", text: res.data.msg || "Ticket not found" });
//         setTicket(null);
//         return;
//       }

//       setTicket(res.data.ticket);
//     } catch (err) {
//       console.error("❌ Load ticket error:", err);
//       setMsg({ type: "error", text: "Server error" });
//       setTicket(null);
//     } finally {
//       setLoading(false);
//     }
//   }

//   /* ================= SEND REPLY ================= */

//   async function sendReply(e) {
//     e.preventDefault();
//     const text = reply.trim();
//     if (!text) return;

//     setBusy(true);
//     setMsg(null);

//     try {
//       const res = await api.post(
//         `/api/helpdesk/tickets/${ticketId}/message`,
//         { message: text }
//       );

//       if (res.data?.success && res.data.ticket) {
//         setReply("");
//         setTicket(res.data.ticket);
//         setMsg({ type: "success", text: "Reply sent" });
//       } else {
//         setMsg({
//           type: "error",
//           text: res.data?.msg || "Failed to send reply",
//         });
//       }
//     } catch (err) {
//       console.error(err);
//       setMsg({ type: "error", text: "Failed to send reply" });
//     } finally {
//       setBusy(false);
//     }
//   }

//   /* ================= CLOSE TICKET ================= */

//   async function closeTicket() {
//     if (!window.confirm("Close this ticket?")) return;

//     setBusy(true);
//     setMsg(null);

//     try {
//       const res = await api.post("/api/helpdesk/close", { ticketId });

//       if (res.data?.success) {
//         setMsg({ type: "success", text: res.data.message || "Ticket closed" });

//         // 🔥 IMPORTANT: reload instead of trusting response
//         await loadTicket();
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

//   const customerDisplay =
//     ticket.customerId?.name ||
//     ticket.customerId?.email ||
//     ticket.customerEmail ||
//     "Customer";

//   /* ================= RENDER ================= */

//   return (
//     <div className="p-6 max-w-3xl mx-auto space-y-6">
//       {/* Header */}
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-bold">{ticket.subject}</h1>
//           <p className="text-sm text-gray-500">{customerDisplay}</p>
//           <p className="text-xs text-gray-400">
//             Status: {ticket.status} • Priority:{" "}
//             {ticket.priority || "normal"}
//           </p>
//         </div>

//         <div className="flex gap-2">
//           <button
//             onClick={closeTicket}
//             disabled={busy}
//             className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
//           >
//             Close
//           </button>

//           <button
//             onClick={loadTicket}
//             className="px-4 py-2 bg-gray-200 rounded"
//           >
//             Refresh
//           </button>
//         </div>
//       </div>

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

//       {/* Messages */}
//       <div className="space-y-3">
//         {ticket.messages?.length ? (
//           ticket.messages.map((m) => {
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
//                   <div className="mt-1 whitespace-pre-wrap">
//                     {m.message}
//                   </div>
//                   {/* ATTACHMENTS */}
// {m.attachments?.length > 0 && (
//   <div className="mt-2 space-y-1">
//     {m.attachments.map((file, idx) => (
//       <a
//         key={idx}
//         href={file.url}
//         target="_blank"
//         rel="noopener noreferrer"
//         className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
//       >
//         📎 {file.filename || "Attachment"}
//       </a>
//     ))}
//   </div>
// )}
//                 </div>
//               </div>
//             );
//           })
//         ) : (
//           <div className="text-gray-500">No messages yet</div>
//         )}
//       </div>

//       {/* Reply */}
//       <form onSubmit={sendReply} className="space-y-2">
//         <textarea
//           value={reply}
//           onChange={(e) => setReply(e.target.value)}
//           placeholder="Type your reply…"
//           rows={3}
//           className="w-full border p-2 rounded"
//         />

//         <button
//           type="submit"
//           disabled={busy || !reply.trim()}
//           className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
//         >
//           {busy ? "Sending…" : "Send Reply"}
//         </button>
//       </form>
//     </div>
//   );
// }
