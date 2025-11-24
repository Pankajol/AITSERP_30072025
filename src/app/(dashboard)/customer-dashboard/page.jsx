"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  User,
  LogOut,
  Clock,
} from "lucide-react";

export default function CustomerDashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));

   
    
  
  }, []);

  useEffect(() => {
    // Fetch tickets for the customer
    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("/api/helpdesk/tickets", {
          headers: { Authorization: "Bearer " + token },
        });
        setTickets(res.data.tickets);
      } catch (error) {
        console.error("Error fetching tickets:", error);
      }
    };

    fetchTickets();
  }, []);


  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* ================= SIDEBAR ================= */}
     

      {/* ================= MAIN ================= */}
      <main className="flex-1">

        {/* ---------- TOP BAR ---------- */}
     

        {/* ---------- CONTENT ---------- */}
        <div className="p-6 space-y-10">

          {/* ======= STAT CARDS ======= */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

            <StatCard
              title="Total Tickets"
              value={tickets.length}
              icon={<Ticket size={28} />}
              color="bg-blue-600"
            />

            <StatCard
              title="Open Tickets"
              value={tickets.filter(t => t.status === "open").length}
              icon={<PlusCircle size={26} />}
              color="bg-orange-500"
            />

            <StatCard
              title="Closed Tickets"
              value={tickets.filter(t => t.status === "closed").length}
              icon={<Clock size={26} />}
              color="bg-green-600"
            />

            <StatCard
              title="Customer"
              value={user?.name || "N/A"}
              icon={<User size={26} />}
              color="bg-slate-800"
            />

          </div>

          {/* ======= QUICK ACTIONS ======= */}
          <div>
            <h2 className="text-xl font-bold mb-5">
              Quick Actions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              <div
                onClick={() => router.push("/customer-dashboard/helpdesk/new")}
                className="cursor-pointer bg-blue-600 text-white p-6 rounded-2xl shadow-lg hover:scale-105 transition"
              >
                <h3 className="text-lg font-bold mb-2">
                  Create New Ticket
                </h3>
                <p>Raise a new issue ticket</p>
              </div>

              <div
                onClick={() => router.push("/customer-dashboard/helpdesk/tickets")}
                className="cursor-pointer bg-gray-900 text-white p-6 rounded-2xl shadow-lg hover:scale-105 transition"
              >
                <h3 className="text-lg font-bold mb-2">
                  View Tickets
                </h3>
                <p>Check ticket status</p>
              </div>

              <div
                onClick={() => router.push("/customer-dashboard/helpdesk/history")}
                className="cursor-pointer bg-green-600 text-white p-6 rounded-2xl shadow-lg hover:scale-105 transition"
              >
                <h3 className="text-lg font-bold mb-2">
                  Ticket History
                </h3>
                <p>See previous tickets</p>
              </div>

            </div>
          </div>

          {/* ======= RECENT TICKETS ======= */}
          <div>
            <h2 className="text-xl font-bold mb-5">Recent Tickets</h2>

            {tickets.length === 0 ? (
              <p className="text-gray-500">No tickets created yet.</p>
            ) : (
              <div className="space-y-3">
                {tickets.slice(0, 5).map((ticket, index) => (
                  <div
                    key={index}
                    className="bg-white p-5 rounded-xl shadow-md flex justify-between items-center"
                  >
                    <div>
                      <h3 className="font-bold text-lg">
                        {ticket.subject}
                      </h3>
                      <p className="text-gray-500">
                        {new Date(ticket.updatedAt).toLocaleString()} - {ticket.category}
                      </p>
                    </div>

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
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}

/* === STAT COMPONENT === */
function StatCard({ title, value, icon, color }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg flex justify-between items-center">
      <div>
        <p className="text-gray-500 text-sm">{title}</p>
        <h2 className="text-3xl font-bold">{value}</h2>
      </div>
      <div className={`${color} text-white p-3 rounded-full`}>
        {icon}
      </div>
    </div>
  );
}
