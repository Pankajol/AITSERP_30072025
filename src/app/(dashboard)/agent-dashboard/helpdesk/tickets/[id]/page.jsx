"use client";
import { useEffect, useState } from "react";
import MessageBubble from "@/components/helpdesk/MessageBubble";
import AIReplyPanel from "@/components/helpdesk/AIReplyPanel";
import FileUploader from "@/components/helpdesk/FileUploader";
import SLAStatus from "@/components/helpdesk/SLAStatus";

export default function AgentTicketView({ params }) {
  const id = params.id;
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState("");

  async function load() {
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch(`/api/helpdesk/details/${id}`, { headers: { Authorization: "Bearer " + token } });
    const data = await res.json();
    if (data.success) setTicket(data.ticket);
  }

  useEffect(() => { load(); }, []);

  async function sendReply() {
    const token = localStorage.getItem("token");
    if (!token) return alert("Not authenticated");
    await fetch("/api/helpdesk/reply", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ticketId: id, message: reply }) });
    setReply(""); load();
  }

  async function addInternal() {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch("/api/helpdesk/internal-note", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token }, body: JSON.stringify({ ticketId: id, note: internal }) });
    setInternal(""); load();
  }

  if (!ticket) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <div><SLAStatus ticket={ticket} /></div>
      </div>

      <div className="space-y-3 bg-gray-900 p-4 rounded">
        {ticket.messages.map(m => <MessageBubble key={m._id} msg={m} meId={JSON.parse(localStorage.getItem("user") || "{}").id} />)}
      </div>

      <FileUploader ticketId={id} onUploaded={() => load()} />

      <textarea className="w-full p-2 border rounded h-24" placeholder="Reply..." value={reply} onChange={e => setReply(e.target.value)} />
      <div className="flex gap-3">
        <button onClick={sendReply} className="px-4 py-2 bg-blue-600 text-white rounded">Send</button>
        <AIReplyPanel ticketId={id} onSelect={(txt) => setReply(txt)} />
      </div>

      <div className="p-4 bg-gray-800 rounded space-y-2">
        <h3 className="font-semibold">Internal Note</h3>
        <textarea className="w-full p-2 bg-gray-700 rounded h-20" value={internal} onChange={e => setInternal(e.target.value)} />
        <button onClick={addInternal} className="px-3 py-2 bg-yellow-600 rounded text-black">Add Internal Note</button>
      </div>
    </div>
  );
}
