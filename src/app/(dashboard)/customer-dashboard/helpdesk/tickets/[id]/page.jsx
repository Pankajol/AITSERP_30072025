"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Send, Loader2, ArrowLeft } from "lucide-react";

import MessageBubble from "@/components/helpdesk/MessageBubble";
import AIReplyPanel from "@/components/helpdesk/AIReplyPanel";
import FileUploader from "@/components/helpdesk/FileUploader";
import CSATWidget from "@/components/helpdesk/CSATWidget";

export default function TicketView() {
  const { id } = useParams();
  const router = useRouter();

  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  const user =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "{}")
      : {};

  // ✅ Load ticket
  const load = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {

      const res = await fetch(`/api/helpdesk/details/${id}`, {
        headers: { Authorization: "Bearer " + token },
      });

      const data = await res.json();

      if (data.success) {
        setTicket(data.ticket);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  // ✅ Send reply
  async function sendReply() {
    if (!reply.trim()) return alert("Write your reply first");

    const token = localStorage.getItem("token");
    if (!token) return alert("Not authenticated");

    try {
      await fetch("/api/helpdesk/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          ticketId: id,
          message: reply,
        }),
      });

      setReply("");
      load();
    } catch (err) {
      alert("Failed to send reply");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!ticket) {
    return <div className="p-6 text-red-500">Ticket not found</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => router.push("/helpdesk/tickets")}
          className="flex gap-1 items-center text-sm text-gray-600 hover:text-blue-600"
        >
          <ArrowLeft size={16} /> Back to tickets
        </button>

        <span
          className={`px-4 py-1 rounded-full text-sm text-white ${
            ticket.status === "Closed"
              ? "bg-green-600"
              : "bg-orange-500"
          }`}
        >
          {ticket.status}
        </span>
      </div>

      <h1 className="text-2xl font-bold">
        {ticket.subject}
      </h1>

      {/* MESSAGES */}
      <div className="space-y-4 bg-gray-100 p-5 rounded-2xl max-h-[60vh] overflow-y-auto">
        {ticket.messages && ticket.messages.length > 0 ? (
          ticket.messages.map((m) => (
            <MessageBubble
              key={m._id}
              msg={m}
              meId={user?.id}
            />
          ))
        ) : (
          <p className="text-gray-500">No messages yet.</p>
        )}
      </div>

      {/* ATTACHMENTS */}
      {ticket.status !== "Closed" && (
        <FileUploader ticketId={id} onUploaded={load} />
      )}

      {/* REPLY */}
      {ticket.status !== "Closed" && (
        <div className="space-y-3">
          <textarea
            className="w-full p-4 border rounded-xl resize-none focus:ring-2 focus:ring-blue-600 outline-none"
            placeholder="Write your reply..."
            value={reply}
            rows={4}
            onChange={(e) => setReply(e.target.value)}
          />

          <div className="flex gap-4">
            <button
              onClick={sendReply}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700"
            >
              <Send size={16} /> Send
            </button>

            {/* <AIReplyPanel
              ticketId={id}
              onSelect={(txt) => setReply(txt)}
            /> */}
          </div>
        </div>
      )}

      {/* CSAT */}
      {ticket.status === "Closed" && (
        <CSATWidget ticketId={id} />
      )}

    </div>
  );
}
