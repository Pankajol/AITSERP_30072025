// src/app/users/tickets/page.jsx
"use client";
import { useEffect, useState } from "react";
import TicketCard from "@/components/helpdesk/TicketCard";

export default function UsersTickets() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/helpdesk/list", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json()).then(res => setTickets(res.tickets || []));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">My Tickets</h1>
      <div className="space-y-3">
        {tickets.map(t => (
          <a key={t._id} href={`/users/helpdesk/tickets/${t._id}`}>
            <TicketCard ticket={t} />
          </a>
        ))}
      </div>
    </div>
  );
}
