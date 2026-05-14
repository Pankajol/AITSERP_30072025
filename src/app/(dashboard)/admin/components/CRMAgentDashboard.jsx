"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  FiTarget, FiFlag, FiMail, FiUsers, FiActivity, FiClock, FiPlus, FiArrowRight
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import Link from "next/link";

export default function CRMAgentDashboard({ session }) {
  const [stats, setStats] = useState({ totalLeads: 0, openOpportunities: 0, activeCampaigns: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentLeads, setRecentLeads] = useState([]);
  const [topOpportunities, setTopOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [leadsRes, oppsRes, campaignsRes] = await Promise.all([
          fetch("/api/leads", { headers }),
          fetch("/api/opportunities", { headers }),
          fetch("/api/crm/campaigns", { headers }),
        ]);

        const leads = (await leadsRes.json())?.data || [];
        const opportunities = (await oppsRes.json())?.data || [];
        const campaigns = (await campaignsRes.json())?.data || [];

        setStats({
          totalLeads: leads.length,
          openOpportunities: opportunities.filter(o => o.status !== "closed").length,
          activeCampaigns: campaigns.filter(c => c.status === "active").length,
        });

        setRecentLeads(leads.slice(0, 5));
        setTopOpportunities(opportunities.sort((a,b) => (b.value||0) - (a.value||0)).slice(0, 4));

        // Monthly lead generation trend
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyLeads = months.map((_, i) => ({
          name: months[i],
          leads: leads.filter(l => new Date(l.createdAt).getMonth() === i).length,
        }));
        setChartData(monthlyLeads);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) return <DashboardLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-white to-blue-50 text-gray-700 p-4 md:p-8 font-sans">
      <DashboardHeader title="CRM Intelligence" subtitle="Leads • Opportunities • Campaigns" icon={<HiOutlineSparkles />} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Leads" value={stats.totalLeads} icon={<FiTarget />} color="from-cyan-500 to-blue-600" />
        <StatCard title="Open Opportunities" value={stats.openOpportunities} icon={<FiFlag />} color="from-emerald-500 to-teal-600" />
        <StatCard title="Active Campaigns" value={stats.activeCampaigns} icon={<FiMail />} color="from-purple-500 to-pink-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Lead Generation Trend</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <Tooltip />
                <Area type="monotone" dataKey="leads" stroke="#06b6d4" strokeWidth={3} fill="url(#leadGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Opportunities */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Top Opportunities</h2>
          <div className="space-y-3">
            {topOpportunities.map((opp, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="text-sm truncate">{opp.name}</span>
                <span className="text-xs font-bold text-gray-800">${opp.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Leads */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4 flex items-center gap-2"><FiClock /> Recent Leads</h2>
          <div className="space-y-2">
            {recentLeads.map(lead => (
              <div key={lead._id} className="p-2 rounded-lg bg-gray-50 text-sm">{lead.name} - {lead.status}</div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <ShortcutBtn href="/admin/leads-view/new" icon={<FiPlus />} label="New Lead" color="bg-cyan-600" />
            <ShortcutBtn href="/admin/opportunities/new" icon={<FiFlag />} label="New Opportunity" color="bg-emerald-600" />
            <ShortcutBtn href="/admin/crm/campaign/new" icon={<FiMail />} label="New Campaign" color="bg-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable components (same as AdminDashboard – import or duplicate)
const DashboardHeader = ({ title, subtitle, icon }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-1">
      {icon}
      <span className="text-[10px] font-semibold uppercase text-cyan-600">CRM Workspace</span>
    </div>
    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const DashboardLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent" />
  </div>
);

const ShortcutBtn = ({ href, icon, label, color }) => (
  <Link href={href} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${color} text-white text-sm transition-all hover:scale-105 shadow-md`}>
    {icon} {label}
  </Link>
);

const StatCard = ({ title, value, icon, color }) => (
  <div className="relative group bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-[9px] font-semibold text-gray-500 uppercase">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
      </div>
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-lg shadow-md`}>{icon}</div>
    </div>
  </div>
);