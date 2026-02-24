"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, FiFilter, FiChevronLeft, FiChevronRight, 
  FiStar, FiMessageSquare, FiTrendingUp, FiUser, 
  FiDownload, FiRefreshCw 
} from "react-icons/fi";

/* ================= HELPERS ================= */

function calculateStats(feedbacks) {
  const valid = feedbacks.filter((f) => typeof f.rating === "number" && f.rating > 0);
  const total = valid.length;
  const avgRating = total === 0 ? "0.0" : (valid.reduce((sum, f) => sum + f.rating, 0) / total).toFixed(1);

  const sentiment = {
    positive: valid.filter((f) => f.sentiment?.label === "positive").length,
    neutral: valid.filter((f) => f.sentiment?.label === "neutral").length,
    negative: valid.filter((f) => f.sentiment?.label === "negative").length,
  };

  return { total, avgRating, sentiment };
}

function resolveAgentName(f) {
  return f.agentId?.name || f.agentFromTicket?.name || "Unassigned";
}

/* ================= MAIN COMPONENT ================= */

export default function FeedbackDashboard() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRating, setFilterRating] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => { fetchFeedbacks(); }, []);

  async function fetchFeedbacks() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/helpdesk/feedback/list", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFeedbacks(res.data?.data || []);
    } catch (err) {
      console.error("Dashboard Error:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ================= LOGIC: FILTER & PAGINATION ================= */

  const filteredData = useMemo(() => {
    return feedbacks.filter((f) => {
      const matchesSearch = 
        resolveAgentName(f).toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.ticketId?.subject || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRating = filterRating === "all" || f.rating === parseInt(filterRating);
      return matchesSearch && matchesRating;
    });
  }, [feedbacks, searchTerm, filterRating]);

  const stats = calculateStats(feedbacks);
  
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <div className="flex flex-col items-center gap-4">
        <FiRefreshCw className="animate-spin text-blue-600" size={40} />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Syncing Feedback...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">Feedback Intelligence</h1>
            <p className="text-slate-500 font-medium">Real-time customer sentiment & agent performance</p>
          </div>
          <button className="flex items-center gap-2 bg-white border border-slate-200 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-sm hover:bg-slate-50 transition-all">
            <FiDownload /> Export Reports
          </button>
        </header>

        {/* 1000x KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard title="CSAT Score" value={`${stats.avgRating}/5`} icon={<FiStar className="text-amber-500" />} trend="+2.4%" />
          <StatCard title="Total Responses" value={stats.total} icon={<FiMessageSquare className="text-blue-500" />} />
          <StatCard title="Positive" value={stats.sentiment.positive} color="green" isSentiment />
          <StatCard title="Neutral" value={stats.sentiment.neutral} color="yellow" isSentiment />
          <StatCard title="Negative" value={stats.sentiment.negative} color="red" isSentiment />
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by Agent or Ticket Subject..."
              className="w-full bg-slate-50 border-none pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <FiFilter className="text-slate-400 ml-2" />
            <select 
              className="bg-slate-50 border-none px-4 py-3 rounded-xl text-sm font-bold text-slate-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
              value={filterRating}
              onChange={(e) => {setFilterRating(e.target.value); setCurrentPage(1);}}
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Modern Interactive Table */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Customer & Ticket</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Agent</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Rating</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Sentiment</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="wait">
                {paginatedData.length === 0 ? (
                  <tr><td colSpan="5" className="py-20 text-center font-bold text-slate-400">No matching feedback found</td></tr>
                ) : (
                  paginatedData.map((f, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={f._id} 
                      className="hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-800">{f.ticketId?.customerId?.customerName || "Guest User"}</div>
                        <div className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">{f.ticketId?.subject || "No Subject"}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-[10px] font-black uppercase">
                            {resolveAgentName(f).charAt(0)}
                          </div>
                          <span className="text-sm font-bold text-slate-600">{resolveAgentName(f)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <Stars value={f.rating} />
                      </td>
                      <td className="px-6 py-5">
                        <SentimentBadge value={f.sentiment?.label} />
                      </td>
                      <td className="px-6 py-5 text-sm text-slate-500 italic max-w-xs truncate group-hover:text-clip group-hover:whitespace-normal">
                        "{f.comment || "No comment left"}"
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>

          {/* Pagination Controls */}
          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-xs font-bold text-slate-400">
              Showing <span className="text-slate-900">{paginatedData.length}</span> of <span className="text-slate-900">{filteredData.length}</span> entries
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                className="p-2 rounded-xl border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
              >
                <FiChevronLeft />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${currentPage === i + 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-slate-400 border hover:bg-slate-50'}`}
                >
                  {i + 1}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-xl border bg-white disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
              >
                <FiChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= UI COMPONENTS ================= */

function StatCard({ title, value, icon, trend, color = "white", isSentiment }) {
  const sentimentMap = {
    green: "bg-emerald-50 border-emerald-100 text-emerald-700",
    yellow: "bg-amber-50 border-amber-100 text-amber-700",
    red: "bg-rose-50 border-rose-100 text-rose-700",
  };

  return (
    <div className={`p-6 rounded-[2rem] border ${isSentiment ? sentimentMap[color] : 'bg-white border-slate-200'} shadow-sm flex flex-col justify-between relative overflow-hidden group hover:scale-[1.02] transition-transform`}>
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{title}</span>
        {icon && <div className="p-2 bg-slate-50 rounded-xl group-hover:rotate-12 transition-transform">{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <h4 className="text-2xl font-black tracking-tight">{value}</h4>
        {trend && <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">{trend}</span>}
      </div>
    </div>
  );
}

function Stars({ value = 0 }) {
  return (
    <div className="flex gap-0.5">
      {[...Array(5)].map((_, i) => (
        <FiStar 
          key={i} 
          size={14} 
          className={i < value ? "fill-amber-400 text-amber-400" : "text-slate-200"} 
        />
      ))}
    </div>
  );
}

function SentimentBadge({ value }) {
  if (!value) return <span className="text-slate-300">-</span>;

  const map = {
    positive: "bg-emerald-100 text-emerald-700",
    neutral: "bg-amber-100 text-amber-700",
    negative: "bg-rose-100 text-rose-700",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${map[value]}`}>
      {value}
    </span>
  );
}