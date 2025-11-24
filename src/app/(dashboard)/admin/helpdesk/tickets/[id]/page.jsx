"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const DEFAULT_AVATAR = "/mnt/data/c4bfcf65-19f2-400e-a777-0771674c53c6.png";

export default function TicketDetailPage({ params }) {
  const router = useRouter();
  const ticketId = params.id;

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  function api() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
    return axios.create({
      headers: { Authorization: token ? "Bearer " + token : "" },
      validateStatus: () => true,
    });
  }

  useEffect(() => {
    load();
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
        return;
      }

      setTicket(res.data.ticket);
    } catch (err) {
      console.error(err);
      setMsg({ type: "error", text: "Server error" });
    } finally {
      setLoading(false);
    }
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!reply) return;

    setBusy(true);

    try {
      const res = await api().post(`/api/helpdesk/tickets/${ticketId}/message`, {
        message: reply,
      });

      if (res.data.success) {
        setReply("");
        setTicket(res.data.ticket);
      } else {
        setMsg({ type: "error", text: res.data.msg });
      }
    } catch (e) {
      setMsg({ type: "error", text: "Failed to send reply" });
    } finally {
      setBusy(false);
    }
  }

  async function closeTicket() {
    if (!confirm("Close this ticket?")) return;

    setBusy(true);
    try {
      const res = await api().post("/api/helpdesk/update-status", {
        ticketId,
        status: "closed",
      });

      if (res.data.success) {
        setMsg({ type: "success", text: "Ticket closed" });
        setTicket(res.data.ticket);
      } else {
        setMsg({ type: "error", text: res.data.msg });
      }
    } catch (err) {
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

  const customer =
    ticket.customerId?.name || ticket.customerId?.email || "Customer";

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="text-sm text-gray-500">{customer}</p>
          <p className="text-xs text-gray-400">
            Status: {ticket.status} • Priority: {ticket.priority}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={closeTicket}
            disabled={busy}
            className="px-4 py-2 bg-red-600 text-white rounded"
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
            msg.type === "error"
              ? "bg-red-100 text-red-800"
              : "bg-green-100 text-green-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {ticket.messages.map((m) => {
          const sender = m.sender || {};
          const avatar = sender.avatar || DEFAULT_AVATAR;
          const name = sender.name || sender.email || "User";
          const isCustomer =
            sender._id === ticket.customerId?._id ||
            sender.id === ticket.customerId?._id;

          return (
            <div
              key={m._id}
              className={`p-3 rounded flex gap-3 ${
                isCustomer ? "bg-gray-50" : "bg-blue-50"
              }`}
            >
              <img
                src={avatar}
                className="w-10 h-10 rounded-full border object-cover"
                onError={(e) => (e.currentTarget.src = DEFAULT_AVATAR)}
              />

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{name}</span>
                  <span className="text-xs text-gray-500">
                    {new Date(m.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1">{m.message}</div>
              </div>
            </div>
          );
        })}
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

        <button
          type="submit"
          disabled={busy || !reply}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          {busy ? "Sending…" : "Send Reply"}
        </button>
      </form>
    </div>
  );
}
