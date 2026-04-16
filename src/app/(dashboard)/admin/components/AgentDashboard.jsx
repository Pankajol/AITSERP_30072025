"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  FiShoppingCart, FiPackage, FiActivity, FiClock, FiPlus, FiArrowRight
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import Link from "next/link";

export default function AgentDashboard({ session }) {
  const [stats, setStats] = useState({ mySalesOrders: 0, myPurchaseOrders: 0 });
  const [chartData, setChartData] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };
        const userId = session._id;

        const [salesRes, purchaseRes] = await Promise.all([
          fetch(`/api/sales-order?assignedTo=${userId}`, { headers }),
          fetch(`/api/purchase-order?assignedTo=${userId}`, { headers }),
        ]);

        const sales = (await salesRes.json())?.data || [];
        const purchases = (await purchaseRes.json())?.data || [];

        setStats({
          mySalesOrders: sales.length,
          myPurchaseOrders: purchases.length,
        });

        // Monthly activity
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const monthlyData = months.map((m, i) => ({
          name: m,
          sales: sales.filter(o => new Date(o.createdAt).getMonth() === i).length,
          purchases: purchases.filter(o => new Date(o.createdAt).getMonth() === i).length,
        }));
        setChartData(monthlyData);

        // Recent combined
        const combined = [...sales, ...purchases]
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setRecentActivities(combined);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, [session]);

  if (loading) return <AgentLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 text-gray-700 p-4 md:p-8 font-sans">
      <DashboardHeader title="My Workspace" subtitle={`Welcome, ${session.name}`} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <StatCard title="My Sales Orders" value={stats.mySalesOrders} icon={<FiShoppingCart />} color="from-indigo-500 to-blue-600" />
        <StatCard title="My Purchase Orders" value={stats.myPurchaseOrders} icon={<FiPackage />} color="from-emerald-500 to-teal-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">My Monthly Activity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs><linearGradient id="myAct" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" fill="url(#myAct)" />
                <Area type="monotone" dataKey="purchases" stroke="#10b981" fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4 flex items-center gap-2"><FiClock /> Recent Activities</h2>
          <div className="space-y-3">
            {recentActivities.map(act => {
              const isSales = !!act.documentNumberOrder;
              const docNo = isSales ? act.documentNumberOrder : act.documentNumberPurchaseOrder;
              const name = isSales ? act.customerName : act.supplierName;
              return (
                <div key={act._id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                  <div className={`w-2 h-2 rounded-full ${isSales ? "bg-indigo-500" : "bg-emerald-500"}`} />
                  <span className="text-sm flex-1">{name} - {docNo}</span>
                  <FiArrowRight className="text-gray-400" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <ShortcutBtn href="/admin/sales-order-view/new" icon={<FiPlus />} label="New Sales Order" color="bg-indigo-600" />
            <ShortcutBtn href="/admin/purchase-order-view/new" icon={<FiPackage />} label="New Purchase Order" color="bg-emerald-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Same helpers
const DashboardHeader = ({ title, subtitle }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-1">
      <HiOutlineSparkles className="text-amber-500" />
      <span className="text-[10px] font-semibold uppercase text-indigo-600">Agent Portal</span>
    </div>
    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const AgentLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
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