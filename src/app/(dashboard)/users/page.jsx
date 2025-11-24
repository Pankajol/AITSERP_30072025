// src/app/users/page.jsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function UsersHome() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    const raw = localStorage.getItem("user");
    if (raw) setUser(JSON.parse(raw));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-3xl font-bold">Helpdesk — Users</h1>
      <p className="text-sm text-gray-500">Employee portal for raising and viewing tickets.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="users/helpdesk/new" className="p-4 bg-blue-600 text-white rounded">Create Ticket</Link>
        <Link href="/users/helpdesk/tickets" className="p-4 bg-gray-800 text-white rounded">My Tickets</Link>
        <div className="p-4 bg-gray-800 text-white rounded">Signed in as: {user?.name || user?.email}</div>
      </div>

      <div className="p-4 bg-white rounded shadow">
        <h3 className="font-semibold">Quick help</h3>
        <p className="text-sm text-gray-600 mt-2">Use this portal to create tickets for the product or internal IT issues.</p>
      </div>

      <div className="max-w-md">
        <img src="/mnt/data/fe9560ec-8220-49b1-b19b-97b3d2c93700.png" alt="sample" className="w-full rounded" />
      </div>
    </div>
  );
}
