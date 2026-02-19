"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  PlusCircle,
  Ticket,
  Clock,
  Timer,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
  History,
  LayoutDashboard
} from "lucide-react";

export default function CustomerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));

    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await axios.get("/api/helpdesk/list", {
          headers: { Authorization: "Bearer " + token },
        });
        setTickets(res.data.tickets || []);
      } catch (err) {
        console.error("Ticket fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, []);

  /* ================= ENHANCED TAT & SLA REPORTING ================= */
  const report = useMemo(() => {
    const SLA_THRESHOLD_MS = 48 * 60 * 60 * 1000;
    const stats = {
      total: tickets.length,
      open: 0,
      closed: 0,
      breached: 0,
      inSla: 0,
      avgTatMs: 0,
      totalTatMs: 0,
      tatCount: 0,
    };

    tickets.forEach((t) => {
      const isClosed = t.status?.toLowerCase() === "closed";
      if (isClosed) stats.closed++;
      else stats.open++;

      if (t.createdAt && t.updatedAt) {
        const diff = new Date(t.updatedAt).getTime() - new Date(t.createdAt).getTime();
        stats.totalTatMs += diff;
        stats.tatCount++;

        if (diff > SLA_THRESHOLD_MS) stats.breached++;
        else stats.inSla++;
      }
    });

    const avgMs = stats.tatCount ? stats.totalTatMs / stats.tatCount : 0;
    const slaRate = stats.tatCount ? ((stats.inSla / stats.tatCount) * 100).toFixed(1) : 0;

    return {
      ...stats,
      avgTat: (avgMs / (1000 * 60 * 60)).toFixed(1) + "h",
      slaRate: slaRate + "%",
    };
  }, [tickets]);

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-50">Loading Discovery...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Header Section */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Support <span className="text-blue-600">Portal</span>
            </h1>
            <p className="text-sm text-slate-500">Welcome back, {user?.name || "Customer"}</p>
          </div>
          {/* <button 
             onClick={() => router.push("/customer-dashboard/helpdesk/new")}
             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md shadow-blue-100"
          >
            <PlusCircle size={18} />
            <span>New Request</span>
          </button> */}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        
        {/* ================= SECTION 1: THE COMMAND CENTER (STATS) ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            label="Total Requests" 
            value={report.total} 
            icon={<Ticket className="text-blue-600" />} 
            trend="Active Overview"
          />
          <StatCard 
            label="Avg Resolution" 
            value={report.avgTat} 
            icon={<Timer className="text-purple-600" />} 
            trend={`${report.slaRate} SLA Met`}
            trendUp={parseFloat(report.slaRate) > 90}
          />
          <StatCard 
            label="Open Now" 
            value={report.open} 
            icon={<Clock className="text-orange-500" />} 
            trend="Pending Action"
            isUrgent={report.open > 5}
          />
          <StatCard 
            label="SLA Breaches" 
            value={report.breached} 
            icon={<AlertTriangle className="text-red-500" />} 
            trend="Needs Attention"
            isCritical={report.breached > 0}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* ================= SECTION 2: TAT REPORT DETAIL ================= */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp size={20} className="text-blue-600" />
                SLA Performance
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between text-xs font-semibold uppercase">
                  <span className="text-slate-500">SLA Success Rate</span>
                  <span className="text-blue-600">{report.slaRate}</span>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-slate-100">
                  <div style={{ width: report.slaRate }} className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-500 transition-all duration-500"></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">In SLA</p>
                  <p className="text-xl font-black text-slate-800">{report.inSla}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                  <p className="text-xs text-slate-500 uppercase font-bold mb-1">Breached</p>
                  <p className="text-xl font-black text-red-600">{report.breached}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              <h3 className="text-sm font-bold text-slate-400 uppercase">Navigation</h3>
              <NavButton onClick={() => router.push("/customer-dashboard/helpdesk/tickets")} icon={<LayoutDashboard size={18}/>} label="Full Dashboard" />
              <NavButton onClick={() => router.push("/customer-dashboard/helpdesk/history")} icon={<History size={18}/>} label="Resolution History" />
            </div>
          </div>

          {/* ================= SECTION 3: RECENT TICKETS ================= */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800">Recent Activity</h2>
              <button className="text-blue-600 text-sm font-semibold hover:underline">View All</button>
            </div>

            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-center">
                  <p className="text-slate-400">No active support requests found.</p>
                </div>
              ) : (
                tickets.slice(0, 4).map((ticket, idx) => (
                  <TicketRow key={ticket.id || idx} ticket={ticket} />
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ================= SUB-COMPONENTS ================= */

function StatCard({ label, value, icon, trend, isUrgent, isCritical, trendUp }) {
  return (
    <div className={`bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 bg-slate-50 rounded-2xl">
          {icon}
        </div>
        {isUrgent && <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-ping" />}
        {isCritical && <span className="flex h-2 w-2 rounded-full bg-red-600 animate-pulse" />}
      </div>
      <div>
        <h3 className="text-3xl font-black text-slate-900 mb-1 tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
        <div className={`text-[10px] font-bold uppercase tracking-wider ${trendUp ? 'text-green-600' : 'text-slate-400'}`}>
          {trend}
        </div>
      </div>
    </div>
  );
}

function TicketRow({ ticket }) {
  const isClosed = ticket.status?.toLowerCase() === "closed";
  return (
    <div className="group bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between transition-all hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 cursor-pointer">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${isClosed ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
          {isClosed ? <CheckCircle2 size={20} /> : <Clock size={20} />}
        </div>
        <div>
          <h4 className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{ticket.subject}</h4>
          <p className="text-xs text-slate-400 font-medium">Updated {new Date(ticket.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
          isClosed ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 animate-pulse'
        }`}>
          {ticket.status}
        </span>
        <ChevronRight size={18} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
      </div>
    </div>
  );
}

function NavButton({ icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-blue-600 hover:text-white transition-all group border border-slate-100"
    >
      <div className="flex items-center gap-3 font-semibold text-sm">
        {icon}
        {label}
      </div>
      <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
    </button>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import {
//   LayoutDashboard,
//   PlusCircle,
//   Ticket,
//   User,
//   LogOut,
//   Clock,
// } from "lucide-react";

// export default function CustomerDashboard() {
//   const router = useRouter();

//   const [user, setUser] = useState(null);
//   const [tickets, setTickets] = useState([]);

//   useEffect(() => {
//     const u = localStorage.getItem("user");
//     if (u) setUser(JSON.parse(u));

   
    
  
//   }, []);

//   useEffect(() => {
//     // Fetch tickets for the customer
//     const fetchTickets = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) return;
//         const res = await axios.get("/api/helpdesk/tickets", {
//           headers: { Authorization: "Bearer " + token },
//         });
//         setTickets(res.data.tickets);
//       } catch (error) {
//         console.error("Error fetching tickets:", error);
//       }
//     };

//     fetchTickets();
//   }, []);


//   return (
//     <div className="flex min-h-screen bg-gray-100">

//       {/* ================= SIDEBAR ================= */}
     

//       {/* ================= MAIN ================= */}
//       <main className="flex-1">

//         {/* ---------- TOP BAR ---------- */}
     

//         {/* ---------- CONTENT ---------- */}
//         <div className="p-6 space-y-10">

//           {/* ======= STAT CARDS ======= */}
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

//             <StatCard
//               title="Total Tickets"
//               value={tickets.length}
//               icon={<Ticket size={28} />}
//               color="bg-blue-600"
//             />

//             <StatCard
//               title="Open Tickets"
//               value={tickets.filter(t => t.status === "open").length}
//               icon={<PlusCircle size={26} />}
//               color="bg-orange-500"
//             />

//             <StatCard
//               title="Closed Tickets"
//               value={tickets.filter(t => t.status === "closed").length}
//               icon={<Clock size={26} />}
//               color="bg-green-600"
//             />

//             <StatCard
//               title="Customer"
//               value={user?.name || "N/A"}
//               icon={<User size={26} />}
//               color="bg-slate-800"
//             />

//           </div>

//           {/* ======= QUICK ACTIONS ======= */}
//           <div>
//             <h2 className="text-xl font-bold mb-5">
//               Quick Actions
//             </h2>

//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

//               <div
//                 onClick={() => router.push("/customer-dashboard/helpdesk/new")}
//                 className="cursor-pointer bg-blue-600 text-white p-6 rounded-2xl shadow-lg hover:scale-105 transition"
//               >
//                 <h3 className="text-lg font-bold mb-2">
//                   Create New Ticket
//                 </h3>
//                 <p>Raise a new issue ticket</p>
//               </div>

//               <div
//                 onClick={() => router.push("/customer-dashboard/helpdesk/tickets")}
//                 className="cursor-pointer bg-gray-900 text-white p-6 rounded-2xl shadow-lg hover:scale-105 transition"
//               >
//                 <h3 className="text-lg font-bold mb-2">
//                   View Tickets
//                 </h3>
//                 <p>Check ticket status</p>
//               </div>

//               <div
//                 onClick={() => router.push("/customer-dashboard/helpdesk/history")}
//                 className="cursor-pointer bg-green-600 text-white p-6 rounded-2xl shadow-lg hover:scale-105 transition"
//               >
//                 <h3 className="text-lg font-bold mb-2">
//                   Ticket History
//                 </h3>
//                 <p>See previous tickets</p>
//               </div>

//             </div>
//           </div>

//           {/* ======= RECENT TICKETS ======= */}
//           <div>
//             <h2 className="text-xl font-bold mb-5">Recent Tickets</h2>

//             {tickets.length === 0 ? (
//               <p className="text-gray-500">No tickets created yet.</p>
//             ) : (
//               <div className="space-y-3">
//                 {tickets.slice(0, 5).map((ticket, index) => (
//                   <div
//                     key={index}
//                     className="bg-white p-5 rounded-xl shadow-md flex justify-between items-center"
//                   >
//                     <div>
//                       <h3 className="font-bold text-lg">
//                         {ticket.subject}
//                       </h3>
//                       <p className="text-gray-500">
//                         {new Date(ticket.updatedAt).toLocaleString()} - {ticket.category}
//                       </p>
//                     </div>

//                     <span
//                       className={`px-4 py-1 rounded-full text-sm text-white ${
//                         ticket.status === "Closed"
//                           ? "bg-green-600"
//                           : "bg-orange-500"
//                       }`}
//                     >
//                       {ticket.status}
//                     </span>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//         </div>
//       </main>
//     </div>
//   );
// }

// /* === STAT COMPONENT === */
// function StatCard({ title, value, icon, color }) {
//   return (
//     <div className="bg-white rounded-2xl p-6 shadow-lg flex justify-between items-center">
//       <div>
//         <p className="text-gray-500 text-sm">{title}</p>
//         <h2 className="text-3xl font-bold">{value}</h2>
//       </div>
//       <div className={`${color} text-white p-3 rounded-full`}>
//         {icon}
//       </div>
//     </div>
//   );
// }
