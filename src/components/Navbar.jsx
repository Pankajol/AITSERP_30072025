"use client";
import NotificationBell from "@/components/NotificationBell";
import { useState } from "react";
import NotificationsPanel from "@/components/NotificationsPanel";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-white shadow px-6 py-3 flex justify-between items-center">
      <h1 className="text-lg font-bold">My Dashboard</h1>
      <div className="flex items-center gap-4">
        <NotificationBell onClick={() => setOpen(!open)} />
      </div>

      {/* ✅ slide-down panel */}
      {open && (
        <div className="absolute top-14 right-4 w-80 bg-white shadow-lg rounded-lg border p-3 z-50">
          <NotificationsPanel />
        </div>
      )}
    </nav>
  );
}
