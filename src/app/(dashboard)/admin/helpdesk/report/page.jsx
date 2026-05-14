"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell 
} from "recharts";
import { Activity, Users, Target, Trophy, TrendingUp, UserPlus, ShieldCheck } from "lucide-react";

export default function AdminGlobalReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGlobalData = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/helpdesk/report/global", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setReport(res.data.data);
      } catch (err) { console.error("Admin Report Error:", err); } 
      finally { setLoading(false); }
    };
    fetchGlobalData();
  }, []);

  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-6 md:p-10 space-y-10 bg-[#f8fafc] min-h-screen">
      
      {/* 🚀 EXECUTIVE HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end border-b pb-8 border-slate-200">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Macro <span className="text-blue-600">Analytics</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Company-Wide Intelligence Engine</p>
        </div>
        <div className="flex gap-6">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Force</p>
              <p className="text-2xl font-black text-blue-600">{report?.totalAgents} Agents</p>
           </div>
        </div>
      </div>

      {/* 📊 KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: "Global Volume", val: report?.totalTickets, icon: <Activity/>, col: "blue" },
          { label: "Entity Base", val: report?.totalCustomers, icon: <Users/>, col: "amber" },
          { label: "Success Index", val: "94%", icon: <Target/>, col: "green" }
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:-translate-y-2 transition-all">
            <div className={`text-${kpi.col}-600 mb-4`}>{kpi.icon}</div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{kpi.label}</p>
            <p className="text-4xl font-black text-slate-900 tracking-tighter">{kpi.val}</p>
          </div>
        ))}
      </div>

      {/* 🏆 AGENT LEADERBOARD SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 flex items-center gap-2">
              <Trophy className="text-amber-500" size={16} /> Elite Agent Force
            </h3>
            <span className="text-[9px] font-black text-slate-300 uppercase italic">Resolution Leaders</span>
          </div>

          <div className="space-y-4">
  {report?.agentPerformance && report.agentPerformance.length > 0 ? (
    report.agentPerformance.map((item, i) => (
      <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-200 transition-all group shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
            {i + 1}
          </div>
          <div>
            {/* ✅ Accessing agentDetails from backend lookup */}
            <p className="text-sm font-black text-slate-800 uppercase leading-none">
              {item.agentDetails?.name || "System Agent"}
            </p>
            <p className="text-[9px] font-bold text-slate-400 mt-1 italic uppercase tracking-widest">
              {item.agentDetails?.email || "internal@system.com"}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-slate-900 tracking-tighter leading-none">
            {item.closedCount}
          </p>
          <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mt-1 italic">Resolved</p>
        </div>
      </div>
    ))
  ) : (
    <div className="py-20 text-center bg-slate-50/50 rounded-[2.5rem] border-2 border-dashed border-slate-100">
       <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Activity Records Found</p>
    </div>
  )}
</div>
        </div>

        {/* DISTRIBUTION CHART */}
        <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-10 text-slate-800">Operational Pulse</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report?.statusStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 📜 CUSTOMER INTENSITY LEDGER */}
      <div className="bg-white rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
           <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
             <UserPlus className="text-blue-600" size={16} /> High-Interaction Entities
           </h3>
           <p className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Top Load per client</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 divide-x divide-slate-100">
          {report?.customerHeatmap?.map((cust, i) => (
            <div key={i} className="p-10 text-center hover:bg-slate-50 transition-all group">
               <div className="w-16 h-16 mx-auto bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black text-xl mb-4 group-hover:scale-110 transition-transform">
                  {cust.cust?.customerName?.charAt(0) || "C"}
               </div>
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{cust.cust?.customerCode || 'N/A'}</p>
               <h4 className="text-xs font-black text-slate-900 uppercase truncate px-2">{cust.cust?.customerName || "Walk-in Entity"}</h4>
               <div className="mt-4 inline-block bg-slate-900 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter">
                  {cust.count} Tickets
               </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { 
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
//   PieChart, Pie, Cell 
// } from "recharts";
// // ✅ Switched to Lucide for Next.js 15 Stability
// import { 
//   Briefcase, Users, TrendingUp, Trophy, Target, Activity, Layout, UserPlus, FileText
// } from "lucide-react";

// export default function AdminGlobalReport() {
//   const [report, setReport] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchGlobalData = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get("/api/helpdesk/report/global", {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         if (res.data.success) setReport(res.data.data);
//       } catch (err) { 
//         console.error("Dashboard Load Error:", err); 
//       } finally { 
//         setLoading(false); 
//       }
//     };
//     fetchGlobalData();
//   }, []);

//   const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

//   if (loading) return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 space-y-4">
//       <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
//       <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading Enterprise Analytics</p>
//     </div>
//   );

//   return (
//     <div className="p-4 md:p-10 space-y-10 bg-[#f8fafc] min-h-screen font-sans">
      
//       {/* HEADER SECTION */}
//       <div className="flex flex-col md:flex-row justify-between items-end border-b border-slate-200 pb-10">
//         <div className="space-y-2">
//           <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
//             Macro <span className="text-blue-600">Insights</span>
//           </h1>
//           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">Enterprise Operations Command Center</p>
//         </div>
//         <div className="flex gap-6">
//            <div className="text-right border-r border-slate-200 pr-6">
//               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Force</p>
//               <p className="text-2xl font-black text-blue-600">{report?.totalAgents} Agents</p>
//            </div>
//            <div className="text-right">
//               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Client Base</p>
//               <p className="text-2xl font-black text-slate-900">{report?.totalCustomers}</p>
//            </div>
//         </div>
//       </div>

//       {/* KPI GRID */}
//       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
//         <div className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-blue-900/5 group hover:-translate-y-2 transition-all border border-white">
//           <Activity className="text-blue-600 mb-6" size={32} />
//           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Ticket Load</h3>
//           <p className="text-5xl font-black text-slate-900 tracking-tighter mt-1">{report?.totalTickets}</p>
//           <div className="mt-6 flex items-center gap-2 text-green-500 font-bold text-xs bg-green-50 w-fit px-3 py-1 rounded-full">
//             <TrendingUp size={14} /> System Healthy
//           </div>
//         </div>

//         <div className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-amber-900/5 group hover:-translate-y-2 transition-all border border-white">
//           <Target className="text-amber-500 mb-6" size={32} />
//           <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Rate</h3>
//           <p className="text-5xl font-black text-slate-900 tracking-tighter mt-1">94.2%</p>
//           <p className="text-slate-400 text-[10px] font-bold mt-4 uppercase italic">Global Benchmark: 90%</p>
//         </div>

//         <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl shadow-slate-900/20 text-white group hover:-translate-y-2 transition-all">
//           <Layout className="text-blue-400 mb-6" size={32} />
//           <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operational Sync</h3>
//           <p className="text-5xl font-black text-white tracking-tighter mt-1 italic italic">Stable</p>
//           <div className="mt-6 h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
//              <div className="h-full bg-blue-500 w-[85%] animate-pulse"></div>
//           </div>
//         </div>
//       </div>

//       {/* MID SECTION: CHARTS & AGENTS */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        
//         {/* Agent Leaderboard */}
//         <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
//            <div className="flex justify-between items-center mb-10">
//               <h3 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 leading-none text-slate-800">
//                 <Trophy className="text-amber-500" size={16} /> Elite Agent Force
//               </h3>
//               <span className="text-[9px] font-black text-slate-300 uppercase">Top 5 Per Month</span>
//            </div>
//            <div className="space-y-4">
//               {report?.agentPerformance?.map((agent, i) => (
//                 <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-[2rem] border border-transparent hover:border-blue-200 transition-all group">
//                    <div className="flex items-center gap-4">
//                       <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-all">
//                         {i+1}
//                       </div>
//                       <div>
//                         <p className="text-sm font-black text-slate-800 uppercase leading-none">{agent.agent.name}</p>
//                         <p className="text-[9px] font-bold text-slate-400 mt-1 italic">{agent.agent.email}</p>
//                       </div>
//                    </div>
//                    <div className="text-right">
//                       <p className="text-xl font-black text-slate-900">{agent.closedCount}</p>
//                       <p className="text-[9px] font-black text-green-500 uppercase tracking-widest">Resolved</p>
//                    </div>
//                 </div>
//               ))}
//            </div>
//         </div>

//         {/* Global Distribution Pulse */}
//         <div className="bg-white p-10 rounded-[3.5rem] shadow-sm border border-slate-100">
//           <h3 className="text-xs font-black uppercase tracking-[0.2em] mb-10 text-slate-800">Global Pulse Distribution</h3>
//           <div className="h-80">
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={report?.statusStats}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                 <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} />
//                 <YAxis hide />
//                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'}} />
//                 <Bar dataKey="count" fill="#6366f1" radius={[12, 12, 0, 0]} barSize={55} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       </div>

//       {/* CUSTOMER VOLUME HEATMAP */}
//       <div className="bg-white rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden">
//         <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
//            <h3 className="text-sm font-black uppercase tracking-widest text-slate-800 flex items-center gap-2">
//              <UserPlus className="text-blue-600" size={18} /> High-Intensity Accounts
//            </h3>
//            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Top Ticket Volume Entities</p>
//         </div>
//         <div className="grid grid-cols-1 md:grid-cols-5 divide-x divide-slate-100">
//           {report?.customerHeatmap?.map((cust, i) => (
//             <div key={i} className="p-10 text-center hover:bg-slate-50 transition-all group">
//                <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-xl mb-6 shadow-inner group-hover:scale-110 transition-transform">
//                   {cust.cust.customerName?.charAt(0)}
//                </div>
//                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{cust.cust.customerCode || 'ID-ERR'}</p>
//                <h4 className="text-xs font-black text-slate-900 uppercase truncate px-2 mb-4">{cust.cust.customerName}</h4>
//                <span className="bg-slate-900 text-white text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
//                   {cust.count} Tickets
//                </span>
//             </div>
//           ))}
//         </div>
//       </div>

//       <div className="py-20 flex flex-col items-center">
//          <div className="w-px h-20 bg-gradient-to-b from-slate-200 to-transparent"></div>
//          <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.8em] mt-8 opacity-40">End of Enterprise Intelligence Stream</p>
//       </div>
//     </div>
//   );
// }