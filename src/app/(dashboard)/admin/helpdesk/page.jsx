"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminHelpdeskHome() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/helpdesk/analytics/overview", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json()).then(res => { if (res.success) setStats(res); });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Admin — Helpdesk</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link href="/admin/helpdesk/analytics" className="p-4 bg-gray-900 text-white rounded">Analytics</Link>
        <Link href="/admin/helpdesk/categories" className="p-4 bg-gray-800 text-white rounded">Categories</Link>
        <Link href="/admin/helpdesk/agents" className="p-4 bg-gray-800 text-white rounded">Agents</Link>
        <Link href="/admin/helpdesk/tickets" className="p-4 bg-gray-800 text-white rounded">All Tickets</Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">Total: {stats?.total ?? "—"}</div>
        <div className="p-4 bg-white rounded shadow">Open: {stats?.open ?? "—"}</div>
        <div className="p-4 bg-white rounded shadow">Avg CSAT: {stats?.avgCSAT ?? "—"}</div>
      </div>
    </div>
  );
}
