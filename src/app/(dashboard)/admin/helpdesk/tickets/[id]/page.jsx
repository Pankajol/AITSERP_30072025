"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const DEFAULT_AVATAR =
  "";

export default function TicketDetailPage({ params }) {
  const router = useRouter();
  const ticketId = params?.id;

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const api = useCallback(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return axios.create({
      headers: { Authorization: token ? "Bearer " + token : "" },
      validateStatus: () => true,
    });
  }, []);

  useEffect(() => {
    if (!ticketId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const res = await api().get(`/api/helpdesk/tickets/${ticketId}`);

      if (typeof res.data !== "object") {
        setMsg({ type: "error", text: "Invalid server response" });
        return;
      }

      if (!res.data.success) {
        setMsg({ type: "error", text: res.data.msg || "Ticket not found" });
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

  async function sendReply(e) {
    e.preventDefault();
    const bodyText = reply?.trim();
    if (!bodyText) return;

    setBusy(true);
    setMsg(null);

    try {
      const res = await api().post(`/api/helpdesk/tickets/${ticketId}/message`, {
        message: bodyText,
      });

      if (res.data && res.data.success) {
        setReply("");
        // server returns populated ticket
        setTicket(res.data.ticket);
        setMsg({ type: "success", text: "Reply sent" });
      } else {
        setMsg({ type: "error", text: res.data?.msg || "Failed to send reply" });
      }
    } catch (e) {
      console.error(e);
      setMsg({ type: "error", text: "Failed to send reply" });
    } finally {
      setBusy(false);
    }
  }

  async function closeTicket() {
    if (!confirm("Close this ticket?")) return;

    setBusy(true);
    setMsg(null);
    try {
      const res = await api().post("/api/helpdesk/update-status", {
        ticketId,
        status: "closed",
      });

      if (res.data?.success) {
        setMsg({ type: "success", text: "Ticket closed" });
        setTicket(res.data.ticket);
      } else {
        setMsg({ type: "error", text: res.data?.msg || "Failed to close ticket" });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Server error" });
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return <div className="p-6 text-gray-500 text-lg">Loading ticket…</div>;

  if (!ticket)
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

  // Customer display: prefer populated name, otherwise fallback to email
  const customerDisplay =
    ticket.customerId?.name || ticket.customerId?.email || ticket.customerEmail || "Customer";

  // Agent display (if any)
  const agentDisplay = ticket.agentId?.name || ticket.agentId?.email || "Agent";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-gray-500">{customerDisplay}</p>
          <p className="text-xs text-gray-400">
            Status: {ticket.status} • Priority: {ticket.priority || "normal"}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={closeTicket}
            disabled={busy}
            className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-50"
          >
            Close
          </button>

          <button onClick={load} className="px-4 py-2 bg-gray-200 rounded">
            Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`p-3 rounded ${
            msg.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {Array.isArray(ticket.messages) && ticket.messages.length > 0 ? (
          ticket.messages.map((m) => {
            // Determine sender object & fallback info
            const senderObj = m.sender && typeof m.sender === "object" ? m.sender : null;
            const externalEmail = m.externalEmail || m.senderEmail || senderObj?.email || null;

            // Determine displayed name (priority: populated sender.name -> externalEmail -> 'User')
            const senderName =
              (senderObj && (senderObj.name || senderObj.email)) ||
              externalEmail ||
              (m.senderType === "agent" ? agentDisplay : "User");

            // Determine avatar: sender avatar -> agent avatar (if agent) -> default
            const avatar =
              (senderObj && senderObj.avatar) ||
              (m.senderType === "agent" && ticket.agentId?.avatar) ||
              DEFAULT_AVATAR;

            // Determine if message is from customer:
            let isCustomer = false;
            try {
              if (senderObj && ticket.customerId) {
                // compare populated ids as strings
                isCustomer =
                  String(senderObj._id || senderObj.id) === String(ticket.customerId._id || ticket.customerId.id);
              } else if (externalEmail && ticket.customerEmail) {
                isCustomer = externalEmail.toLowerCase() === String(ticket.customerEmail).toLowerCase();
              } else {
                // fallback to senderType
                isCustomer = m.senderType === "customer";
              }
            } catch (err) {
              isCustomer = m.senderType === "customer";
            }

            const created = m.createdAt ? new Date(m.createdAt) : new Date();

            return (
              <div
                key={m._id || m.messageId || Math.random()}
                className={`p-3 rounded flex gap-3 ${isCustomer ? "bg-gray-50" : "bg-blue-50"}`}
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
                    <span className="text-xs text-gray-500">{created.toLocaleString()}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{m.message}</div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-gray-500">No messages yet</div>
        )}
      </div>

      {/* Reply box */}
      <form onSubmit={sendReply} className="space-y-2">
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Type your reply…"
          rows={3}
          className="w-full border p-2 rounded"
        />

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={busy || !reply.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send Reply"}
          </button>

          <button
            type="button"
            onClick={() => {
              setReply("");
            }}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
