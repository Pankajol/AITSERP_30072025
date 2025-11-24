"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function CustomerHelpdeskHome() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Helpdesk — Customer</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="cus/helpdesk/new" className="p-4 bg-blue-600 text-white rounded">Create Ticket</Link>
        <Link href="/helpdesk/tickets" className="p-4 bg-gray-800 text-white rounded">My Tickets</Link>
        <div className="p-4 bg-gray-800 text-white rounded">Account: {user?.name}</div>
      </div>
    </div>
  );
}
