
"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { 
  Search, FileText, Table as TableIcon, Filter, 
  ArrowLeft, ChevronRight, ChevronLeft, Calendar, Clock, 
  History, CheckCircle, Hash, User, ChevronsLeft, ChevronsRight
} from "lucide-react";
import { useRouter } from "next/navigation";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { min } from "date-fns";

export default function TicketAuditPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/helpdesk/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setTickets(res.data.tickets || []);
      } catch (err) {
        console.error("Fetch error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  /* ================= 100x PERFORMANCE METRICS ================= */
  const getFullMetrics = (t) => {
    const created = new Date(t.createdAt);
    const updated = new Date(t.updatedAt);
    const isClosed = t.status?.toLowerCase() === "closed";
    // 1. diffMs ko pehle define karein
  const diffMs = (isClosed ? updated : new Date()) - created;
    
   // Time Calculation Math
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diffMs / (1000 * 60)) % 60);
  const seconds = Math.floor((diffMs / 1000) % 60);

  // Format string: 1d 4h 20m 15s
  const durationStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;
    
    return {
      ticketNo: t.ticketNo || "N/A",
      agentName: t.agentId?.name || t.agentName || "Unassigned",
      createdStr: created.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      updatedStr: updated.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
      closedStr: isClosed ? updated.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : "ACTIVE",
      duration: durationStr,
      isBreached: diffMs > 48 * 60 * 60 * 1000 // 48-hour SLA
    };
  };

  /* ================= ADVANCED FILTER LOGIC ================= */
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const tDate = new Date(t.createdAt).getTime();
      const start = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
      const end = toDate ? new Date(toDate).setHours(23,59,59,999) : null;

      const matchesSearch = 
        t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        (t.agentId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.ticketNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t._id?.includes(searchTerm);

      const matchesStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter;
      const matchesDateRange = (!start || tDate >= start) && (!end || tDate <= end);

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [tickets, searchTerm, statusFilter, fromDate, toDate]);

  /* ================= PAGINATION CALCULATIONS ================= */
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, fromDate, toDate, rowsPerPage]);

  const totalPages = Math.ceil(filteredTickets.length / rowsPerPage);
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;
  const currentRows = filteredTickets.slice(indexOfFirstRow, indexOfLastRow);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  /* ================= EXPORTS ================= */
  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");
    doc.text("Master Ticket Audit Trail", 14, 15);
    const tableData = filteredTickets.map(t => {
      const m = getFullMetrics(t);
      return [m.ticketNo, t.subject, m.agentName, t.status.toUpperCase(), m.createdStr, m.closedStr, m.duration];
    });
    autoTable(doc, {
      head: [["Ticket NO", "Subject", "Agent", "Status", "Opened At", "Resolved At", "TAT"]],
      body: tableData,
      startY: 25,
      theme: 'grid',
      headStyles: { fillStyle: [15, 23, 42] },
      styles: { fontSize: 8 }
    });
    doc.save(`Audit_Report_${Date.now()}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 lg:p-10 font-sans">
      <div className="max-w-[1600px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
          <div>
            <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 font-bold mb-2 hover:translate-x-[-4px] transition-transform">
              <ArrowLeft size={18}/> Back to Home
            </button>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Resolution Audit</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={exportPDF} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black shadow-lg transition-all">
              <FileText size={20} /> Generate PDF Audit
            </button>
          </div>
        </div>

        {/* Filters Dashboard */}
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-6 items-end">
          <div className="flex-1 min-w-[280px] space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Search Keywords</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Subject, Ticket No, Agent..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">From Date</label>
            <input type="date" className="px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold" value={fromDate} onChange={e => setFromDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">To Date</label>
            <input type="date" className="px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold" value={toDate} onChange={e => setToDate(e.target.value)} />
          </div>

          <div className="w-40 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Rows</label>
            <select className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold" value={rowsPerPage} onChange={(e) => setRowsPerPage(Number(e.target.value))}>
              <option value={10}>10 Rows</option>
              <option value={25}>25 Rows</option>
              <option value={50}>50 Rows</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Ticket Information</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Assignee</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Lifecycle Timeline</th>
                <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-right">Processing TAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentRows.map(t => {
                const m = getFullMetrics(t);
                return (
                  <tr key={t._id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 mb-1">
                        <Hash size={14} className="text-blue-500" />
                        <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">{m.ticketNo}</span>
                      </div>
                      <div className="font-black text-slate-800 text-lg group-hover:text-blue-700 transition-colors">{t.subject}</div>
                      <div className="text-xs text-slate-400">{t.customerEmail}</div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={18} />
                        </div>
                        <span className="text-sm font-bold text-slate-700">{m.agentName}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase w-14">Opened</span>
                          <span className="text-[11px] font-bold text-slate-600">{m.createdStr}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-slate-400 uppercase w-14">
                            {t.status?.toLowerCase() === 'closed' ? 'Resolved' : 'Current'}
                          </span>
                          <span className={`text-[11px] font-black uppercase tracking-tight ${
                            t.status?.toLowerCase() === 'closed' ? 'text-emerald-600' : 'text-orange-500 animate-pulse'
                          }`}>
                            {t.status?.toLowerCase() === 'closed' ? m.closedStr : t.status}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className={`text-xl font-black tracking-tighter ${m.isBreached ? 'text-red-500' : 'text-blue-600'}`}>
                        {m.duration}
                      </div>
                      <div className="text-[10px] font-black text-slate-400 uppercase mt-1">Total Clock Time</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination Footer */}
          <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Entry {indexOfFirstRow + 1} - {Math.min(indexOfLastRow, filteredTickets.length)} / {filteredTickets.length}
            </span>

            <div className="flex items-center gap-2">
              <button disabled={currentPage === 1} onClick={() => paginate(1)} className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-30"><ChevronsLeft size={18} /></button>
              <button disabled={currentPage === 1} onClick={() => paginate(currentPage - 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-30"><ChevronLeft size={14} /> Prev</button>

              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, i) => {
                  const p = i + 1;
                  if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                    return (
                      <button key={p} onClick={() => paginate(p)} className={`w-10 h-10 rounded-lg text-xs font-black transition-all ${currentPage === p ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}>{p}</button>
                    );
                  }
                  if (p === currentPage - 2 || p === currentPage + 2) return <span key={p} className="px-1 self-end text-slate-300">...</span>;
                  return null;
                })}
              </div>

              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => paginate(currentPage + 1)} className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-xs font-bold flex items-center gap-1 disabled:opacity-30">Next <ChevronRight size={14} /></button>
              <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => paginate(totalPages)} className="p-2 rounded-lg bg-white border border-slate-200 disabled:opacity-30"><ChevronsRight size={18} /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// "use client";

// import React, { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import { 
//   Search, FileText, Table as TableIcon, Filter, 
//   ArrowLeft, ChevronRight, ChevronLeft, Calendar, Clock, 
//   History, CheckCircle, Hash, User, ChevronsLeft, ChevronsRight
// } from "lucide-react";
// import { useRouter } from "next/navigation";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import * as XLSX from "xlsx";

// export default function TicketAuditPage() {
//   const router = useRouter();
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
  
//   // Filters
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");

//   // ================= PAGINATION STATE =================
//   const [currentPage, setCurrentPage] = useState(1);
//   const [rowsPerPage, setRowsPerPage] = useState(10);

//   useEffect(() => {
//     const fetchAll = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get("/api/helpdesk/list", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setTickets(res.data.tickets || []);
//       } catch (err) {
//         console.error("Fetch error", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchAll();
//   }, []);

//   /* ================= METRIC CALCULATIONS ================= */
//   const getFullMetrics = (t) => {
//     const created = new Date(t.createdAt);
//     const updated = new Date(t.updatedAt);
//     const isClosed = t.status?.toLowerCase() === "closed";
    
//     const lifeMs = (isClosed ? updated : new Date()) - created;
//     const days = Math.floor(lifeMs / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((lifeMs / (1000 * 60 * 60)) % 24);
    
//     return {
//       ticketNo: t.ticketNo || "N/A",
//       agentName: t.agentId?.name || t.agentName || "Unassigned",
//       createdStr: created.toLocaleString(),
//       updatedStr: updated.toLocaleString(),
//       closedStr: isClosed ? updated.toLocaleString() : "ACTIVE",
//       duration: `${days}d ${hours}h`,
//       isBreached: lifeMs > 48 * 60 * 60 * 1000 
//     };
//   };

//   /* ================= FILTER LOGIC ================= */
//   const filteredTickets = useMemo(() => {
//     return tickets.filter((t) => {
//       const tDate = new Date(t.createdAt).getTime();
//       const start = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
//       const end = toDate ? new Date(toDate).setHours(23,59,59,999) : null;

//       const matchesSearch = 
//         t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
//         (t.agentId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
//         t._id?.includes(searchTerm);

//       const matchesStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter;
//       const matchesDateRange = (!start || tDate >= start) && (!end || tDate <= end);

//       return matchesSearch && matchesStatus && matchesDateRange;
//     });
//   }, [tickets, searchTerm, statusFilter, fromDate, toDate]);

//   // ================= PAGINATION LOGIC =================
//   // Reset to first page when filters change
//   useEffect(() => {
//     setCurrentPage(1);
//   }, [searchTerm, statusFilter, fromDate, toDate, rowsPerPage]);

//   const totalPages = Math.ceil(filteredTickets.length / rowsPerPage);
//   const indexOfLastRow = currentPage * rowsPerPage;
//   const indexOfFirstRow = indexOfLastRow - rowsPerPage;
//   const currentRows = filteredTickets.slice(indexOfFirstRow, indexOfLastRow);

//   const paginate = (pageNumber) => setCurrentPage(pageNumber);

//   /* ================= EXPORTS (Export ALL filtered, not just current page) ================= */
//   const exportPDF = () => {
//     const doc = new jsPDF("l", "mm", "a4");
//     doc.setFontSize(18);
//     doc.text("Master Helpdesk Audit Report", 14, 15);
//     const tableData = filteredTickets.map(t => {
//       const m = getFullMetrics(t);
//       return [m.ticketNo, t.subject, m.agentName, t.status.toUpperCase(), m.createdStr, m.closedStr, m.duration];
//     });
//     autoTable(doc, {
//       head: [["Ticket NO", "Subject", "Agent", "Status", "Opened At", "Closed At", "TAT"]],
//       body: tableData,
//       startY: 30,
//       theme: 'grid',
//       styles: { fontSize: 7 },
//       headStyles: { fillStyle: [37, 99, 235] }
//     });
//     doc.save(`Audit_Report_${Date.now()}.pdf`);
//   };

//   return (
//     <div className="min-h-screen bg-[#f1f5f9] p-4 lg:p-10">
//       <div className="max-w-[1500px] mx-auto">
        
//         {/* Top Header */}
//         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
//           <div>
//             <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 font-bold mb-2 hover:translate-x-[-4px] transition-transform">
//               <ArrowLeft size={18}/> Back to Dashboard
//             </button>
//             <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Resolution Audit</h1>
//           </div>
//           <div className="flex flex-wrap gap-3">
//             <button onClick={exportPDF} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black shadow-lg transition-all">
//               <FileText size={20} /> Download PDF Report
//             </button>
//           </div>
//         </div>

//         {/* Filters Panel */}
//         <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-end">
//           <div className="flex-1 min-w-[200px] space-y-2">
//             <label className="text-xs font-black uppercase text-slate-400 ml-1">Search Keywords</label>
//             <div className="relative">
//               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//               <input className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Subject or Agent..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
//             </div>
//           </div>

//           <div className="w-40 space-y-2">
//             <label className="text-xs font-black uppercase text-slate-400 ml-1">Rows per page</label>
//             <select 
//               className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
//               value={rowsPerPage}
//               onChange={(e) => setRowsPerPage(Number(e.target.value))}
//             >
//               <option value={10}>10 Rows</option>
//               <option value={25}>25 Rows</option>
//               <option value={50}>50 Rows</option>
//               <option value={100}>100 Rows</option>
//             </select>
//           </div>
//         </div>

//         {/* Audit Data Table */}
//         <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
//           <table className="w-full text-left border-collapse">
//             <thead>
//               <tr className="bg-slate-900 text-white">
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Ticket Details</th>
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Agent</th>
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Timeline</th>
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-right">TAT</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {currentRows.map(t => {
//                 const m = getFullMetrics(t);
//                 return (
//                   <tr key={t._id} className="hover:bg-blue-50/50 transition-colors group">
//                     <td className="px-8 py-6">
//                       <div className="flex items-center gap-2 mb-1">
//                         <Hash size={14} className="text-blue-500" />
//                         <span className="font-mono text-xs font-bold text-slate-400">{m.ticketNo}</span>
//                       </div>
//                       <div className="font-black text-slate-800 text-lg">{t.subject}</div>
//                     </td>
//                     <td className="px-8 py-6">
//                       <div className="flex items-center gap-2">
//                         <User size={16} className="text-slate-400" />
//                         <span className="text-sm font-bold text-slate-700">{m.agentName}</span>
//                       </div>
//                     </td>
//                  <td className="px-8 py-6">
//   <div className="flex flex-col gap-1.5">
//     {/* Opened Row */}
//     <div className="flex items-center gap-2">
//       <span className="text-[9px] font-black text-slate-500 uppercase w-14">Opened</span>
//       <span className="text-[11px] font-bold text-slate-600">{m.createdStr}</span>
//     </div>

//     {/* Last Update Row (Only shows if not closed yet) */}
//     {t.status?.toLowerCase() !== 'closed' && (
//       <div className="flex items-center gap-2">
//         <span className="text-[9px] font-black text-slate-500 uppercase w-14">Updated</span>
//         <span className="text-[11px] font-bold text-slate-500 italic">{m.updatedStr}</span>
//       </div>
//     )}

//     {/* Resolved Row (Shows the logic we fixed earlier) */}
//     <div className="flex items-center gap-2">
//       <span className="text-[9px] font-black text-slate-500 uppercase w-14">
//         {t.status?.toLowerCase() === 'closed' ? 'Resolved' : 'Status'}
//       </span>
//       <span className={`text-[11px] font-black uppercase tracking-tight ${
//         t.status?.toLowerCase() === 'closed' ? 'text-emerald-600' : 'text-orange-500 animate-pulse'
//       }`}>
//         {t.status?.toLowerCase() === 'closed' ? m.closedStr : t.status}
//       </span>
//     </div>
//   </div>
// </td>
//                     <td className="px-8 py-6 text-right">
//                       <div className={`text-2xl font-black tracking-tighter ${m.isBreached ? 'text-red-500' : 'text-blue-600'}`}>
//                         {m.duration}
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>

//           {/* ================= PAGINATION CONTROLS ================= */}
//           <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
//             <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">
//               Showing {indexOfFirstRow + 1} to {Math.min(indexOfLastRow, filteredTickets.length)} of {filteredTickets.length} Entries
//             </span>

//             <div className="flex items-center gap-2">
//               <button 
//                 onClick={() => paginate(1)} 
//                 disabled={currentPage === 1}
//                 className="p-2 rounded-lg hover:bg-white border border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
//               >
//                 <ChevronsLeft size={18} />
//               </button>
//               <button 
//                 onClick={() => paginate(currentPage - 1)} 
//                 disabled={currentPage === 1}
//                 className="flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-slate-200 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
//               >
//                 <ChevronLeft size={16} /> Prev
//               </button>

//               <div className="flex gap-1">
//                 {/* Logic to show a few page numbers */}
//                 {[...Array(totalPages)].map((_, index) => {
//                     const page = index + 1;
//                     // Only show first, last, and pages around current
//                     if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
//                         return (
//                             <button
//                                 key={page}
//                                 onClick={() => paginate(page)}
//                                 className={`w-10 h-10 rounded-lg font-black text-sm transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}
//                             >
//                                 {page}
//                             </button>
//                         );
//                     } else if (page === currentPage - 2 || page === currentPage + 2) {
//                         return <span key={page} className="px-1 self-end text-slate-400">...</span>;
//                     }
//                     return null;
//                 })}
//               </div>

//               <button 
//                 onClick={() => paginate(currentPage + 1)} 
//                 disabled={currentPage === totalPages || totalPages === 0}
//                 className="flex items-center gap-1 px-4 py-2 rounded-lg font-bold text-sm bg-white border border-slate-200 hover:bg-slate-900 hover:text-white disabled:opacity-30 transition-all"
//               >
//                 Next <ChevronRight size={16} />
//               </button>
//               <button 
//                 onClick={() => paginate(totalPages)} 
//                 disabled={currentPage === totalPages || totalPages === 0}
//                 className="p-2 rounded-lg hover:bg-white border border-slate-200 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
//               >
//                 <ChevronsRight size={18} />
//               </button>
//             </div>
//           </div>
          
//           {filteredTickets.length === 0 && (
//             <div className="p-20 text-center bg-slate-50/50 italic text-slate-400">
//               No matching records found.
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// "use client";

// import React, { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import { 
//   Search, FileText, Table as TableIcon, Filter, 
//   ArrowLeft, ChevronRight, Calendar, Clock, 
//   History, CheckCircle, Hash
// } from "lucide-react";
// import { useRouter } from "next/navigation";
// import jsPDF from "jspdf";
// import autoTable from "jspdf-autotable";
// import * as XLSX from "xlsx";

// export default function TicketAuditPage() {
//   const router = useRouter();
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
  
//   // Filters
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [fromDate, setFromDate] = useState("");
//   const [toDate, setToDate] = useState("");

//   useEffect(() => {
//     const fetchAll = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get("/api/helpdesk/list", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setTickets(res.data.tickets || []);
//       } catch (err) {
//         console.error("Fetch error", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchAll();
//   }, []);

//   /* ================= METRIC CALCULATIONS ================= */
//   const getFullMetrics = (t) => {
//     const created = new Date(t.createdAt);
//     const updated = new Date(t.updatedAt);
//     const isClosed = t.status?.toLowerCase() === "closed";
    
//     const lifeMs = (isClosed ? updated : new Date()) - created;
//     const days = Math.floor(lifeMs / (1000 * 60 * 60 * 24));
//     const hours = Math.floor((lifeMs / (1000 * 60 * 60)) % 24);
    
//     return {
//       ticketNo: t.ticketNo || t._id.substring(t._id.length - 8).toUpperCase(),
//       createdStr: created.toLocaleString(),
//       updatedStr: updated.toLocaleString(),
//       closedStr: isClosed ? updated.toLocaleString() : "ACTIVE",
//       duration: `${days}d ${hours}h`,
//       isBreached: lifeMs > 48 * 60 * 60 * 1000 
//     };
//   };

//   /* ================= ADVANCED FILTER LOGIC ================= */
//   const filteredTickets = useMemo(() => {
//     return tickets.filter((t) => {
//       const tDate = new Date(t.createdAt).getTime();
//       const start = fromDate ? new Date(fromDate).setHours(0,0,0,0) : null;
//       const end = toDate ? new Date(toDate).setHours(23,59,59,999) : null;

//       const matchesSearch = t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
//                             t._id?.includes(searchTerm);
//       const matchesStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter;
//       const matchesDateRange = (!start || tDate >= start) && (!end || tDate <= end);

//       return matchesSearch && matchesStatus && matchesDateRange;
//     });
//   }, [tickets, searchTerm, statusFilter, fromDate, toDate]);

//   /* ================= EXPORTS ================= */
//   const exportPDF = () => {
//     const doc = new jsPDF("l", "mm", "a4");
//     doc.setFontSize(18);
//     doc.text("Master Helpdesk Audit Report", 14, 15);
//     doc.setFontSize(10);
//     doc.text(`Period: ${fromDate || 'Start'} to ${toDate || 'Present'} | Generated: ${new Date().toLocaleString()}`, 14, 22);

//     const tableData = filteredTickets.map(t => {
//       const m = getFullMetrics(t);
//       return [m.ticketNo, t.subject, t.status.toUpperCase(), m.createdStr, m.closedStr, m.duration];
//     });

//     autoTable(doc, {
//       head: [["Ticket NO", "Subject", "Status", "Opened At", "Closed At", "TAT"]],
//       body: tableData,
//       startY: 30,
//       theme: 'grid',
//       styles: { fontSize: 7 },
//       headStyles: { fillStyle: [37, 99, 235] }
//     });
//     doc.save(`Audit_Report_${Date.now()}.pdf`);
//   };

//   const exportExcel = () => {
//     const data = filteredTickets.map(t => {
//       const m = getFullMetrics(t);
//       return {
//         "Ticket No": m.ticketNo,
//         "Subject": t.subject,
//         "Status": t.status,
//         "Created At": m.createdStr,
//         "Last Update": m.updatedStr,
//         "Resolved At": m.closedStr,
//         "Total Processing Time": m.duration
//       };
//     });
//     const ws = XLSX.utils.json_to_sheet(data);
//     const wb = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(wb, ws, "Ticket Audit");
//     XLSX.writeFile(wb, `Ticket_Audit_${Date.now()}.xlsx`);
//   };

//   return (
//     <div className="min-h-screen bg-[#f1f5f9] p-4 lg:p-10">
//       <div className="max-w-[1500px] mx-auto">
        
//         {/* Top Header */}
//         <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
//           <div>
//             <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 font-bold mb-2 hover:translate-x-[-4px] transition-transform">
//               <ArrowLeft size={18}/> Back to Dashboard
//             </button>
//             <h1 className="text-5xl font-black text-slate-900 tracking-tighter">Resolution Audit</h1>
//           </div>
//           <div className="flex flex-wrap gap-3">
//             <button onClick={exportExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all">
//               <TableIcon size={20} /> Download Excel
//             </button>
//             <button onClick={exportPDF} className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-black shadow-lg shadow-slate-200 transition-all">
//               <FileText size={20} /> Download PDF
//             </button>
//           </div>
//         </div>

//         {/* 100x Filter Dashboard */}
//         <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm mb-10">
//           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
//             <div className="space-y-2">
//               <label className="text-xs font-black uppercase text-slate-400 ml-1">Search Keywords</label>
//               <div className="relative">
//                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//                 <input className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500" placeholder="Subject or ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
//               </div>
//             </div>

//             <div className="space-y-2">
//               <label className="text-xs font-black uppercase text-slate-400 ml-1">From Date</label>
//               <input type="date" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold" value={fromDate} onChange={e => setFromDate(e.target.value)} />
//             </div>

//             <div className="space-y-2">
//               <label className="text-xs font-black uppercase text-slate-400 ml-1">To Date</label>
//               <input type="date" className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold" value={toDate} onChange={e => setToDate(e.target.value)} />
//             </div>

//             <div className="space-y-2">
//               <label className="text-xs font-black uppercase text-slate-400 ml-1">Status Filter</label>
//               <select className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
//                 <option value="all">All Records</option>
//                 <option value="open">Open</option>
//                 <option value="closed">Closed</option>
//               </select>
//             </div>
//           </div>
//         </div>

//         {/* Audit Data Table */}
//         <div className="bg-white rounded-[3rem] border border-slate-200 shadow-2xl overflow-hidden">
//           <table className="w-full text-left">
//             <thead>
//               <tr className="bg-slate-900 text-white">
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Ticket Details</th>
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Lifecycle</th>
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest">Resolution TAT</th>
//                 <th className="px-8 py-6 text-xs font-bold uppercase tracking-widest text-right">Activity</th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-slate-100">
//               {filteredTickets.map(t => {
//                 const m = getFullMetrics(t);
//                 return (
//                   <tr key={t._id} className="hover:bg-blue-50/50 transition-colors group">
//                     <td className="px-8 py-6">
//                       <div className="flex items-center gap-2 mb-1">
//                         <Hash size={14} className="text-blue-500" />
//                         <span className="font-mono text-xs font-bold text-slate-400">{m.ticketNo}</span>
//                       </div>
//                       <div className="font-black text-slate-800 text-lg">{t.subject}</div>
//                       <div className="text-xs text-slate-400 font-medium">{t.customerEmail}</div>
//                     </td>
//                     <td className="px-8 py-6">
//                       <div className="grid grid-cols-2 gap-x-8 gap-y-2">
//                         <div>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase">Opened</p>
//                           <p className="text-xs font-bold text-slate-700">{m.createdStr}</p>
//                         </div>
//                         <div>
//                           <p className="text-[10px] font-bold text-slate-400 uppercase">Resolved</p>
//                           <p className={`text-xs font-bold ${t.status === 'closed' ? 'text-emerald-600' : 'text-slate-300'}`}>{m.closedStr}</p>
//                         </div>
//                       </div>
//                     </td>
//                     <td className="px-8 py-6">
//                       <div className={`text-2xl font-black tracking-tighter ${m.isBreached ? 'text-red-500' : 'text-blue-600'}`}>
//                         {m.duration}
//                       </div>
//                       <div className="flex items-center gap-2 mt-1">
//                         <span className={`w-2 h-2 rounded-full ${t.status === 'closed' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`}></span>
//                         <span className="text-[10px] font-black uppercase text-slate-500">{t.status}</span>
//                       </div>
//                     </td>
//                     <td className="px-8 py-6 text-right">
//                       <button className="bg-slate-50 p-4 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
//                         <ChevronRight size={20} />
//                       </button>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
          
//           {filteredTickets.length === 0 && (
//             <div className="p-20 text-center bg-slate-50/50">
//               <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
//               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No records found for selected range</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }


// "use client";

// import React, { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import { 
//   Search, 
//   Download, 
//   FileText, 
//   Table as TableIcon, 
//   Filter, 
//   ArrowLeft,
//   ChevronRight,
//   Calendar
// } from "lucide-react";
// import { useRouter } from "next/navigation";
// import jsPDF from "jspdf";
// import "jspdf-autotable";
// import * as XLSX from "xlsx";

// export default function AllTicketsPage() {
//   const router = useRouter();
//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);
  
//   // Filters State
//   const [searchTerm, setSearchTerm] = useState("");
//   const [statusFilter, setStatusFilter] = useState("all");
//   const [dateFilter, setDateFilter] = useState(""); // Format: YYYY-MM-DD

//   useEffect(() => {
//     const fetchAll = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get("/api/helpdesk/list", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         setTickets(res.data.tickets || []);
//       } catch (err) {
//         console.error("Fetch error", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchAll();
//   }, []);

//   /* ================= FILTER LOGIC ================= */
//   const filteredTickets = useMemo(() => {
//     return tickets.filter((t) => {
//       const matchesSearch = 
//         t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || 
//         t._id?.toLowerCase().includes(searchTerm.toLowerCase());
      
//       const matchesStatus = statusFilter === "all" || t.status?.toLowerCase() === statusFilter;
      
//       const matchesDate = !dateFilter || t.createdAt.startsWith(dateFilter);

//       return matchesSearch && matchesStatus && matchesDate;
//     });
//   }, [tickets, searchTerm, statusFilter, dateFilter]);

//   /* ================= EXPORT TO EXCEL ================= */
//   const exportToExcel = () => {
//     const dataToExport = filteredTickets.map(t => ({
//       "Ticket ID": t._id,
//       "Subject": t.subject,
//       "Status": t.status?.toUpperCase(),
//       "Customer Email": t.customerEmail,
//       "Created Date": new Date(t.createdAt).toLocaleDateString(),
//       "Updated Date": new Date(t.updatedAt).toLocaleDateString()
//     }));

//     const worksheet = XLSX.utils.json_to_sheet(dataToExport);
//     const workbook = XLSX.utils.book_new();
//     XLSX.utils.book_append_sheet(workbook, worksheet, "Tickets Report");
    
//     // Set column widths
//     const wscols = [{ wch: 25 }, { wch: 35 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 20 }];
//     worksheet["!cols"] = wscols;

//     XLSX.writeFile(workbook, `Tickets_Export_${new Date().getTime()}.xlsx`);
//   };

//   /* ================= EXPORT TO PDF ================= */
//   const exportToPDF = () => {
//     const doc = new jsPDF();
    
//     // Title & Header
//     doc.setFontSize(18);
//     doc.text("Helpdesk Ticket Report", 14, 20);
//     doc.setFontSize(10);
//     doc.setTextColor(100);
//     doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
//     doc.text(`Total Records: ${filteredTickets.length}`, 14, 34);

//     const tableColumn = ["ID", "Subject", "Status", "Customer", "Date"];
//     const tableRows = filteredTickets.map(t => [
//       t._id.substring(t._id.length - 6), 
//       t.subject, 
//       t.status?.toUpperCase(), 
//       t.customerEmail,
//       new Date(t.createdAt).toLocaleDateString()
//     ]);

//     doc.autoTable({
//       head: [tableColumn],
//       body: tableRows,
//       startY: 40,
//       headStyles: { fillStyle: [37, 99, 235], fontSize: 10 }, // Blue header
//       alternateRowStyles: { fillColor: [248, 250, 252] },
//       margin: { top: 40 },
//     });

//     doc.save(`Helpdesk_Report_${Date.now()}.pdf`);
//   };

//   if (loading) return <div className="p-10 text-center font-bold">Loading records...</div>;

//   return (
//     <div className="min-h-screen bg-[#f1f5f9] p-6">
//       <div className="max-w-7xl mx-auto">
        
//         {/* Header Section */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
//           <div>
//             <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-3 transition-all text-sm font-medium">
//               <ArrowLeft size={16} /> Back
//             </button>
//             <h1 className="text-4xl font-black text-slate-900 tracking-tight">Master Database</h1>
//             <p className="text-slate-500 mt-1 font-medium">Manage, filter, and export all support queries.</p>
//           </div>

//           <div className="flex gap-3 w-full md:w-auto">
//             <button onClick={exportToExcel} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-green-50 hover:border-green-200 transition-all shadow-sm">
//               <TableIcon size={18} className="text-green-600" /> Excel
//             </button>
//             <button onClick={exportToPDF} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-2xl text-sm font-bold text-slate-700 hover:bg-red-50 hover:border-red-200 transition-all shadow-sm">
//               <FileText size={18} className="text-red-600" /> PDF
//             </button>
//           </div>
//         </div>

//         {/* Filters Bar */}
//         <div className="bg-white p-5 rounded-[2rem] border border-slate-200 shadow-sm mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
//           <div className="md:col-span-2 relative">
//             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
//             <input 
//               type="text"
//               placeholder="Search by subject or Ticket ID..."
//               className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />
//           </div>
          
//           <div className="relative">
//             <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <select 
//               className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold appearance-none focus:ring-2 focus:ring-blue-500"
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//             >
//               <option value="all">All Status</option>
//               <option value="open">Open</option>
//               <option value="in_progress">In Progress</option>
//               <option value="closed">Closed</option>
//             </select>
//           </div>

//           <div className="relative">
//             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
//             <input 
//               type="date"
//               className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
//               value={dateFilter}
//               onChange={(e) => setDateFilter(e.target.value)}
//             />
//           </div>
//         </div>

//         {/* Desktop Table View */}
//         <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden">
//           <div className="overflow-x-auto">
//             <table className="w-full text-left">
//               <thead>
//                 <tr className="bg-slate-50 border-b border-slate-100">
//                   <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400">Status</th>
//                   <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400">Subject / Email</th>
//                   <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400">Created At</th>
//                   <th className="px-8 py-5 text-[11px] font-black uppercase text-slate-400">Ref ID</th>
//                   <th className="px-8 py-5 text-right"></th>
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-slate-50">
//                 {filteredTickets.map((ticket) => (
//                   <tr key={ticket._id} className="group hover:bg-slate-50/50 transition-colors">
//                     <td className="px-8 py-5">
//                       <StatusBadge status={ticket.status} />
//                     </td>
//                     <td className="px-8 py-5">
//                       <div className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{ticket.subject}</div>
//                       <div className="text-xs text-slate-400 mt-0.5">{ticket.customerEmail}</div>
//                     </td>
//                     <td className="px-8 py-5 text-sm font-medium text-slate-600">
//                       {new Date(ticket.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
//                     </td>
//                     <td className="px-8 py-5">
//                       <span className="font-mono text-[10px] bg-slate-100 px-2 py-1 rounded-md text-slate-500">
//                         {ticket._id.toUpperCase()}
//                       </span>
//                     </td>
//                     <td className="px-8 py-5 text-right">
//                       <button className="p-2 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all shadow-none hover:shadow-sm">
//                         <ChevronRight size={18} className="text-slate-300" />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
          
//           {filteredTickets.length === 0 && (
//             <div className="py-24 text-center">
//               <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
//                 <Search size={24} className="text-slate-300" />
//               </div>
//               <p className="text-slate-500 font-bold italic">No matching records found.</p>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ================= HELPER COMPONENTS ================= */

// function StatusBadge({ status }) {
//   const config = {
//     open: "bg-orange-500 shadow-orange-100",
//     in_progress: "bg-blue-500 shadow-blue-100",
//     closed: "bg-emerald-500 shadow-emerald-100",
//     waiting: "bg-purple-500 shadow-purple-100"
//   };
  
//   return (
//     <div className="flex items-center gap-2">
//       <div className={`w-2 h-2 rounded-full ${config[status?.toLowerCase()] || "bg-slate-400"}`} />
//       <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
//         {status?.replace('_', ' ')}
//       </span>
//     </div>
//   );
// }