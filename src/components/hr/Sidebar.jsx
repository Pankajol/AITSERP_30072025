"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, Calendar, LogOut } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  function isActive(path) {
    return pathname === path
      ? "bg-black text-white"
      : "hover:bg-gray-100";
  }

  function logout() {
    localStorage.removeItem("token");
    window.location.href = "/signin";
  }

  return (
    <aside className="w-64 bg-white border-r min-h-screen p-4">

      <h2 className="text-xl font-bold mb-6">Employee Panel</h2>

      <nav className="space-y-2">

        <Link
          href="/employees-dashboard"
          className={`flex items-center gap-2 p-3 rounded ${isActive("/employees-dashboard")}`}
        >
          <User size={18} /> Dashboard
        </Link>

        <Link
          href="/employees-dashboard/attendance"
          className={`flex items-center gap-2 p-3 rounded ${isActive("/employees-dashboard/attendance")}`}
        >
          <Calendar size={18} /> Attendance
        </Link>
        <Link
          href="/employees-dashboard/leaves"
          className={`flex items-center gap-2 p-3 rounded ${isActive("/employees-dashboard/leaves")}`}
        >

            {/* leave */}
            <Calendar size={18} /> Leaves
        </Link>

      </nav>

      <button
        onClick={logout}
        className="mt-10 flex items-center gap-2 text-red-600 hover:bg-red-50 w-full p-3 rounded"
      >
        <LogOut size={18} /> Logout
      </button>

    </aside>
  );
}
