"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  User,
  LogOut,
} from "lucide-react";

export default function HelpdeskLayout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
  }, []);

  const logout = () => {
    localStorage.clear();
    router.push("/signin");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* ================= SIDEBAR ================= */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col">
        <h2 className="text-2xl font-bold mb-10">Helpdesk</h2>

        <nav className="space-y-3 flex-1">

          <button
            onClick={() => router.push("/customer-dashboard/helpdesk")}
            className="w-full flex items-center gap-3 p-3 rounded-lg bg-blue-600"
          >
            <LayoutDashboard size={18} /> Dashboard
          </button>

          <button
            onClick={() => router.push("/customer-dashboard/helpdesk/new")}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
          >
            <PlusCircle size={18} /> Create Ticket
          </button>

          <button
            onClick={() => router.push("/customer-dashboard/helpdesk/tickets")}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
          >
            <Ticket size={18} /> My Tickets
          </button>

          <button
            onClick={() => router.push("/customer-dashboard/profile")}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-700"
          >
            <User size={18} /> My Profile
          </button>

        </nav>

        <button
          onClick={logout}
          className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-lg mt-6"
        >
          <LogOut size={16} /> Logout
        </button>
      </aside>


      {/* ================= MAIN SECTION ================= */}
      <div className="flex-1 flex flex-col">

        {/* --------- Top Navbar --------- */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">
            Customer Helpdesk Dashboard
          </h1>

          <div className="flex items-center gap-3">
            <div className="bg-blue-600 text-white w-10 h-10 flex items-center justify-center rounded-full font-bold">
              {user?.name?.charAt(0) || "U"}
            </div>

            <p className="text-gray-700 font-medium">
              {user?.name || "Guest"}
            </p>
          </div>
        </header>


        {/* --------- Page Content --------- */}
        <main className="flex-1 p-6">
          {children}
        </main>

      </div>
    </div>
  );
}
