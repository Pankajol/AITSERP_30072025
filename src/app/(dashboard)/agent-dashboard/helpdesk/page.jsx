"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AgentHome() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Helpdesk — Agent</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/agent-dashboard/helpdesk/tickets" className="p-4 bg-gray-800 text-white rounded">My Assigned Tickets</Link>
        <Link href="/agent-dashboard/helpdesk/tickets" className="p-4 bg-gray-700 text-white rounded">All Tickets (if allowed)</Link>
        <div className="p-4 bg-gray-800 text-white rounded">Welcome, {user?.name}</div>
      </div>
    </div>
  );
}
