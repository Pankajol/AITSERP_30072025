"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import * as XLSX from "xlsx";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from "recharts";
import { 
  FiActivity, FiCheckCircle, FiClock, FiZap, FiList, 
  FiDownload, FiAlertTriangle, FiExternalLink, FiTrendingUp, FiTarget
} from "react-icons/fi";

export default function AgentReports() {
  const router = useRouter();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/helpdesk/report", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) setReport(res.data.data);
    } catch (err) { console.error("Report Error:", err); } 
    finally { setLoading(false); }
  };

  const exportToExcel = () => {
    const data = report?.recentTickets?.map(t => ({
      Ticket_ID: t.ticketNo || t._id,
      Customer: t.customerId?.customerName || "N/A",
      Priority: t.priority,
      Status: t.status,
      Created_At: new Date(t.createdAt).toLocaleString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tickets");
    XLSX.writeFile(wb, `Agent_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const COLORS = ["#3b82f6", "#f59e0b", "#10b981", "#ef4444"];

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c10] space-y-6">
      <div className="relative">
        <div className="w-20 h-20 border-4 border-blue-600/10 border-t-blue-600 rounded-full animate-spin"></div>
        <FiZap className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-500 animate-pulse" size={32} />
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-500 animate-pulse">Initializing Neural Analytics</p>
    </div>
  );

  return (
    <div className="p-4 md:p-10 space-y-12 bg-[#f8fafc] min-h-screen font-sans selection:bg-blue-100">
      
      {/* 🚀 DYNAMIC HEADER: Glass-Blur & Action-Focused */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 sticky top-0 z-40 bg-white/70 backdrop-blur-xl p-6 -mx-6 rounded-b-[2.5rem] border-b border-slate-100 shadow-xl shadow-slate-200/20 transition-all animate-in slide-in-from-top duration-700">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic leading-none">
              Agent <span className="text-blue-600">IQ</span>
            </h1>
            <div className="bg-green-100 text-green-600 text-[10px] px-4 py-1.5 rounded-2xl font-black flex items-center gap-2 shadow-sm border border-green-200">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></span> LIVE SYNC
            </div>
          </div>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-3 italic opacity-70">Resolution Engine v2.0 • Real-time Data</p>
        </div>
        
        <button 
          onClick={exportToExcel} 
          className="group relative flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black text-xs uppercase hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.3)] transition-all active:scale-95 overflow-hidden"
        >
          <FiDownload className="relative z-10 group-hover:-translate-y-1 transition-transform duration-300" size={18} />
          <span className="relative z-10 tracking-widest">Generate Data Sheet</span>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </button>
      </div>

      {/* 📊 KPI HUD: Ultra-Modern Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 animate-in fade-in zoom-in duration-1000">
        {[
          { label: "Current Load", val: report?.totalAssigned, icon: <FiActivity />, col: "text-blue-600", bg: "bg-blue-600", desc: "Tickets Assigned" },
          { label: "Closure Rate", val: report?.totalClosed, icon: <FiCheckCircle />, col: "text-green-500", bg: "bg-green-500", desc: "Resolved Units" },
          { label: "Velocity (TAT)", val: report?.avgTat + 'h', icon: <FiClock />, col: "text-amber-500", bg: "bg-amber-500", desc: "Avg. Response Time" },
          { label: "SLA Integrity", val: report?.slaBreaches, icon: <FiAlertTriangle />, col: "text-red-600", bg: "bg-red-600", desc: "Critical Breaches" }
        ].map((kpi, i) => (
          <div 
            key={i} 
            className="group relative bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-500 cursor-default overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 ${kpi.col} opacity-[0.03] -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700`}>
              {kpi.icon}
            </div>
            <div className={`mb-6 w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${kpi.col}/20 ${kpi.bg}`}>
              {kpi.icon}
            </div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{kpi.label}</p>
            <div className="flex items-baseline gap-2">
              <p className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{kpi.val}</p>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{kpi.desc}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 📈 ANALYTICS ENGINE: Depth & Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in slide-in-from-bottom-20 duration-1000">
        
        {/* Status Analysis */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-slate-200/40 border border-white group relative overflow-hidden">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Operational Pulse</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Status Distribution Index</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl group-hover:rotate-12 transition-transform duration-500">
              <FiTrendingUp size={20} />
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={report?.statusStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: '900', fill: '#94a3b8'}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc', radius: 12}} 
                  contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', fontSize: '12px', fontWeight: 'bold'}} 
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 4, 4]} barSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Priority Analysis */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-xl shadow-slate-200/40 border border-white relative group">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-800">Criticality Mapping</h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Priority Load factor</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
              <FiTarget size={20} />
            </div>
          </div>
          <div className="h-80 flex flex-col items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={report?.priorityStats} 
                  innerRadius={85} 
                  outerRadius={115} 
                  paddingAngle={10} 
                  dataKey="count" 
                  nameKey="_id" 
                  stroke="none"
                >
                  {report?.priorityStats?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer outline-none" />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 📜 DATA LEDGER: Premium Table Experience */}
      <div className="bg-white rounded-[4rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] border border-white overflow-hidden animate-in fade-in duration-1000">
        <div className="p-12 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-8 bg-slate-50/30">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-white shadow-2xl shadow-slate-900/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <FiList size={24} />
            </div>
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Intelligence Ledger</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Audit-ready Activity Logs</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="px-8 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Performance Efficiency</p>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{width: `${report?.efficiency}%`}}></div>
                </div>
                <span className="text-sm font-black text-slate-900">{report?.efficiency}%</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/80 text-[10px] font-black text-slate-500 uppercase tracking-[0.25em]">
                <th className="px-12 py-8">Ledger ID</th>
                <th className="px-12 py-8">Entity Identity</th>
                <th className="px-12 py-8 text-center">Priority Status</th>
                <th className="px-12 py-8">Current State</th>
                <th className="px-12 py-8 text-right">Access</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {report?.recentTickets.map((ticket, idx) => (
                <tr key={ticket._id} className="hover:bg-blue-50/40 transition-all group cursor-default">
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-2">
                      <span className="text-blue-600 font-black text-xs opacity-40">#</span>
                      <span className="text-sm font-black text-slate-900 tracking-tighter italic">
                        {ticket.ticketNo || ticket._id.slice(-6)}
                      </span>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <p className="text-sm font-black text-slate-800 tracking-tight uppercase leading-none">{ticket.customerId?.customerName || "External User"}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">Verified Transmission</p>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex justify-center">
                      <span className={`text-[9px] font-black px-5 py-2 rounded-2xl uppercase tracking-[0.2em] shadow-sm border transition-all group-hover:shadow-md ${
                        ticket.priority === 'High' 
                        ? 'bg-red-50 text-red-600 border-red-100 shadow-red-100/50' 
                        : 'bg-blue-50 text-blue-600 border-blue-100 shadow-blue-100/50'
                      }`}>
                        {ticket.priority}
                      </span>
                    </div>
                  </td>
                  <td className="px-12 py-8">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${ticket.status === 'Closed' ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'} animate-pulse`}></div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{ticket.status}</span>
                    </div>
                  </td>
                  <td className="px-12 py-8 text-right">
                    <button 
                      onClick={() => router.push(`/agent-dashboard/helpdesk/tickets/${ticket._id}`)}
                      className="p-4 bg-white rounded-2xl text-slate-300 group-hover:text-blue-600 group-hover:shadow-2xl group-hover:border-blue-100 transition-all border border-slate-100 active:scale-90"
                    >
                      <FiExternalLink size={20} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="py-20 flex flex-col items-center">
        <div className="w-px h-20 bg-gradient-to-b from-slate-200 to-transparent"></div>
        <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.8em] mt-8 opacity-40">End of Encrypted Analytics Stream</p>
      </div>
    </div>
  );
}
// "use client";

// import { useEffect, useState } from "react";
// import axios from "axios";
// import { 
//   BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
// } from "recharts";
// import { FiActivity, FiCheckCircle, FiClock, FiAlertCircle, FiZap } from "react-icons/fi";

// export default function AgentReports() {
//   const [report, setReport] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchStats = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get("/api/helpdesk/report", {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         if (res.data.success) setReport(res.data.data);
//       } catch (err) {
//         console.error("Report Fetch Error:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchStats();
//   }, []);

//   const COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#ef4444", "#8b5cf6"];

//   if (loading) return (
//     <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0c10]">
//       <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
//       <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600 mt-4">Analyzing performance</p>
//     </div>
//   );

//   return (
//     <div className="p-6 md:p-12 space-y-10 bg-[#f8fafc] min-h-screen font-sans">
      
//       {/* HEADER SECTION */}
//       <div className="flex flex-col md:flex-row justify-between items-end md:items-center border-b border-slate-200 pb-8">
//         <div>
//           <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase italic">
//             Agent <span className="text-amber-500">Analytics</span>
//           </h1>
//           <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
//             <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span> Live Intelligence Data
//           </p>
//         </div>
//         <div className="hidden md:block">
//            <div className="text-right">
//               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Index</p>
//               <p className="text-4xl font-black text-slate-900">{report?.efficiency}%</p>
//            </div>
//         </div>
//       </div>

//       {/* KPI GRID */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
//         <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white group hover:-translate-y-2 transition-all">
//           <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
//             <FiActivity size={24} />
//           </div>
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Load</p>
//           <p className="text-4xl font-black text-slate-900 mt-1">{report?.totalAssigned}</p>
//         </div>

//         <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white group hover:-translate-y-2 transition-all">
//           <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 mb-6 group-hover:bg-green-600 group-hover:text-white transition-all">
//             <FiCheckCircle size={24} />
//           </div>
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolved</p>
//           <p className="text-4xl font-black text-slate-900 mt-1">{report?.totalClosed}</p>
//         </div>

//         <div className="bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-white group hover:-translate-y-2 transition-all">
//           <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mb-6 group-hover:bg-amber-600 group-hover:text-white transition-all">
//             <FiClock size={24} />
//           </div>
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avg. TAT</p>
//           <p className="text-4xl font-black text-slate-900 mt-1">{report?.avgTat}<span className="text-sm">h</span></p>
//         </div>

//         <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-400/20 text-white group hover:-translate-y-2 transition-all">
//           <div className="w-12 h-12 bg-amber-500 rounded-2xl flex items-center justify-center text-white mb-6">
//             <FiZap size={24} />
//           </div>
//           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Success Rate</p>
//           <p className="text-4xl font-black text-white mt-1">{report?.efficiency}%</p>
//         </div>
//       </div>

//       {/* CHARTS */}
//       <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
//         <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white">
//           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 mb-10">Status Distribution</h3>
//           <div className="h-72">
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={report?.statusStats}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
//                 <XAxis dataKey="_id" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: '900', fill: '#94a3b8'}} />
//                 <YAxis hide />
//                 <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)'}} />
//                 <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={40} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </div>

//         <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-slate-200/40 border border-white">
//           <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-800 mb-10">Priority Intensity</h3>
//           <div className="h-72 flex justify-center items-center">
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie data={report?.priorityStats} innerRadius={80} outerRadius={110} paddingAngle={8} dataKey="count" nameKey="_id" stroke="none">
//                   {report?.priorityStats?.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//         </div>
//       </div>

//       <p className="text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.6em] pt-10">
//         Authorized ERP Transmission
//       </p>
//     </div>
//   );
// }