"use client";

import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import { 
  FiStar, FiTrendingUp, FiUsers, FiActivity, FiMessageSquare, 
  FiSmile, FiMeh, FiFrown, FiSearch, FiFilter, FiDownload, FiCpu ,FiArrowUpRight 
} from "react-icons/fi";

export default function FeedbackIntelligenceUI() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchIntelligence();
  }, []);

  async function fetchIntelligence() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/helpdesk/feedback/analytics", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error("Intelligence Link Failure", err);
    } finally {
      setLoading(false);
    }
  }

  // Local Search for the Feedback List
  const filteredList = useMemo(() => {
    if (!data?.feedbackList) return [];
    return data.feedbackList.filter(item => 
      item.customer?.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.agent?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.ticket?.subject?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [data, searchTerm]);

  if (loading) return <LoadingHandshake />;

  const sentimentData = [
    { name: "Positive", value: data.overview.sentiment.positive, color: "#10b981" },
    { name: "Neutral", value: data.overview.sentiment.neutral, color: "#f59e0b" },
    { name: "Negative", value: data.overview.sentiment.negative, color: "#ef4444" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-10 font-sans text-slate-900">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <header className="flex flex-col md:row justify-between items-start md:items-center gap-6">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-2">
              Neural <span className="text-blue-600">Feedback</span>
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px]">Command Center v5.0 // Institutional Analytics</p>
          </motion.div>
          
          <div className="flex gap-3">
             <button className="bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
               <FiDownload /> Data Export
             </button>
             <button className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-slate-200 hover:bg-blue-600 transition-all">
               Initialize Sync
             </button>
          </div>
        </header>

        {/* --- TOP TIER KPI GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard title="Avg CSAT" value={data.overview.avgRating} sub="Rating / 5.0" icon={<FiStar className="text-amber-500" />} />
          <MetricCard title="Satisfaction" value={data.overview.csat} sub="Global Confidence" icon={<FiSmile className="text-blue-600" />} />
          <MetricCard title="Response Vol" value={data.overview.total} sub={`+${data.last7Days} past 7d`} icon={<FiMessageSquare className="text-indigo-500" />} />
          <MetricCard title="Active Flux" value="+18.2%" sub="Trend Index" icon={<FiTrendingUp className="text-emerald-500" />} />
        </div>

        {/* --- ANALYTICS ENGINE --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Monthly Satisfaction Trend (Recharts Area) */}
         {/* Monthly Satisfaction Trend (Optimized for Users) */}
<section className="lg:col-span-2 bg-white p-8 md:p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden transition-all hover:shadow-md">
  {/* Subtle Background Icon */}
  <div className="absolute top-6 right-6 opacity-10 text-blue-600">
    <FiTrendingUp size={40} />
  </div>

  {/* Header Section */}
  <div className="flex flex-col mb-8">
    <h3 className="text-sm font-black uppercase tracking-widest text-blue-600 mb-1">
      Customer Happiness Trend
    </h3>
    <div className="flex items-baseline gap-3">
      <h2 className="text-3xl font-black text-slate-900">Monthly Growth</h2>
      <span className="text-xs font-bold text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg flex items-center gap-1">
        <FiArrowUpRight /> +4.2% from last month
      </span>
    </div>
    <p className="text-slate-400 text-xs font-medium mt-2">
      Tracking average ticket ratings across your entire organization.
    </p>
  </div>

  {/* Chart Container */}
  <div className="h-[320px] w-full">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        {/* Horizontal lines only for a cleaner look */}
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        
        <XAxis 
          dataKey="_id.month" 
          axisLine={false} 
          tickLine={false} 
          tick={{fontSize: 11, fontWeight: 700, fill: '#64748b'}} 
          tickFormatter={(value) => {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            return months[value - 1] || value;
          }}
        />
        
        {/* Show YAxis but keep it subtle so users know the scale (1-5 stars) */}
        <YAxis 
          domain={[0, 5]} 
          axisLine={false} 
          tickLine={false} 
          tick={{fontSize: 11, fontWeight: 600, fill: '#cbd5e1'}}
          ticks={[1, 2, 3, 4, 5]}
        />
        
        <Tooltip 
          cursor={{ stroke: '#3b82f6', strokeWidth: 2, strokeDasharray: '5 5' }}
          contentStyle={{ 
            borderRadius: '16px', 
            border: 'none', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            padding: '12px' 
          }}
          itemStyle={{ color: '#0f172a', fontWeight: 800, fontSize: '14px' }}
          labelStyle={{ color: '#64748b', fontWeight: 600, marginBottom: '4px' }}
          formatter={(value) => [`${Number(value).toFixed(2)} Stars`, "Avg. Rating"]}
          labelFormatter={(value) => {
            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            return months[value - 1];
          }}
        />

        <Area 
          type="monotone" 
          dataKey="avgRating" 
          stroke="#3b82f6" 
          strokeWidth={4} 
          fillOpacity={1} 
          fill="url(#colorAvg)" 
          animationDuration={2000}
        />
      </AreaChart>
    </ResponsiveContainer>
  </div>
</section>

          {/* Sentiment Doughnut (Recharts Pie) */}
          <section className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl shadow-blue-900/20">
            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 mb-10">Neural Sentiment</h3>
            <div className="h-[280px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentData} innerRadius={75} outerRadius={95} paddingAngle={8} dataKey="value">
                    {sentimentData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black">{data.overview.csat}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">CSAT INDEX</span>
              </div>
            </div>
            <div className="mt-8 space-y-3">
               <SentimentRow label="Positive" count={data.overview.sentiment.positive} color="bg-emerald-500" />
               <SentimentRow label="Neutral" count={data.overview.sentiment.neutral} color="bg-amber-500" />
               <SentimentRow label="Negative" count={data.overview.sentiment.negative} color="bg-rose-500" />
            </div>
          </section>

          {/* --- NEURAL FEEDBACK STREAM (The Deep Joined List) --- */}
          <section className="lg:col-span-3 bg-white rounded-[3.5rem] border border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="p-10 border-b border-slate-50 flex flex-col md:row justify-between items-center bg-slate-50/30 gap-6">
               <div>
                  <h3 className="font-black uppercase text-[11px] tracking-widest text-slate-400">Atmospheric Data Stream</h3>
                  <p className="text-xs text-slate-500 font-medium">Real-time interaction mapping between Agent and Client</p>
               </div>
               <div className="relative w-full max-w-md">
                  <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-bold"
                    placeholder="Filter by Agent, Customer or Subject..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50">
                    <th className="px-10 py-6">Interaction Node (Customer)</th>
                    <th className="px-10 py-6">Responsible Agent</th>
                    <th className="px-10 py-6">Metric Analysis</th>
                    <th className="px-10 py-6">Insights / Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  <AnimatePresence>
                    {filteredList.map((f, i) => (
                      <motion.tr 
                        key={f._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-blue-50/30 transition-colors group cursor-pointer"
                      >
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                {f.customer?.customerName?.charAt(0) || "C"}
                              </div>
                              <div>
                                 <p className="font-black text-slate-800 text-sm leading-none mb-1">{f.customer?.customerName || "External User"}</p>
                                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate max-w-[200px]">{f.ticket?.subject}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center font-black text-[10px] text-white">
                                {f.agent?.name?.charAt(0) || "U"}
                              </div>
                              <p className="text-xs font-black text-slate-600">{f.agent?.name || "Unassigned"}</p>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex items-center gap-4">
                              <div className="flex text-amber-400 gap-0.5"><FiStar className="fill-current" size={14} /> <span className="text-slate-900 font-black text-sm">{f.rating}</span></div>
                              <SentimentBadge label={f.sentiment?.label} />
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <p className="text-xs text-slate-500 italic max-w-xs line-clamp-1 group-hover:line-clamp-none transition-all">
                              "{f.comment || "Protocol standard met. No verbal metadata provided."}"
                           </p>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}

/* --- ATOMIC COMPONENTS --- */

function MetricCard({ title, value, sub, icon }) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm group hover:scale-[1.03] transition-all">
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 bg-slate-50 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex gap-1">
          {[1,2,3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-slate-200" />)}
        </div>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
      <div className="flex items-baseline gap-2">
        <h4 className="text-4xl font-black text-slate-900 tracking-tighter">{value}</h4>
        <span className="text-[10px] font-bold text-slate-400">{sub}</span>
      </div>
    </div>
  );
}

function SentimentRow({ label, count, color }) {
  return (
    <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl border border-white/5">
       <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${color}`} />
          <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
       </div>
       <span className="font-black text-sm">{count}</span>
    </div>
  );
}

function SentimentBadge({ label }) {
  const styles = {
    positive: "bg-emerald-100 text-emerald-700",
    neutral: "bg-slate-100 text-slate-600",
    negative: "bg-rose-100 text-rose-700",
  };
  return <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${styles[label || 'neutral']}`}>{label || 'neutral'}</span>;
}

function LoadingHandshake() {
  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
       <FiCpu className="animate-spin text-blue-600 mb-6" size={48} />
       <p className="text-[11px] font-black uppercase tracking-[0.5em] text-slate-400 animate-pulse">Establishing Neural Uplink</p>
    </div>
  );
}