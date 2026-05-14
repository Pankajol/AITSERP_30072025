"use client";

import React, { useEffect, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  FiUsers, FiShoppingCart, FiPackage, FiZap, FiActivity,
  FiClock, FiPlus, FiFileText, FiTruck, FiAlertTriangle, FiArrowRight
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import Link from "next/link";

export default function AdminDashboard({ session }) {
  const [stats, setStats] = useState({
    totalUsers: 0, totalOrders: 0, totalPurchaseOrders: 0, revenue: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

        const [usersRes, salesRes, purchaseRes, itemsRes] = await Promise.all([
          fetch("/api/suppliers", { headers }),
          fetch("/api/sales-order", { headers }),
          fetch("/api/purchase-order", { headers }),
          fetch("/api/items", { headers }),
        ]);

        const users = (await usersRes.json())?.data || [];
        const sales = (await salesRes.json())?.data || [];
        const purchases = (await purchaseRes.json())?.data || [];
        const items = (await itemsRes.json())?.data || [];

        setStats({
          totalUsers: users.length,
          totalOrders: sales.length,
          totalPurchaseOrders: purchases.length,
          revenue: sales.reduce((sum, item) => sum + (item.grandTotal || 0), 0),
        });

        setStockAlerts(items.filter(i => (i.stock || 0) < 10).slice(0, 4));

        const custMap = {};
        sales.forEach(s => {
          custMap[s.customerName] = (custMap[s.customerName] || 0) + (s.grandTotal || 0);
        });
        setTopCustomers(Object.entries(custMap)
          .map(([name, val]) => ({ name, val }))
          .sort((a,b) => b.val - a.val).slice(0, 4));

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        setChartData(months.map((m, i) => ({
          name: m,
          sales: sales.filter(o => new Date(o.createdAt).getMonth() === i).length,
          purchases: purchases.filter(o => new Date(o.createdAt).getMonth() === i).length,
        })));

        setRecentOrders([...sales, ...purchases]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));

      } catch (error) { console.error(error); } 
      finally { setLoading(false); }
    }
    fetchDashboardData();
  }, []);

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center text-indigo-600 font-semibold text-sm animate-pulse">Loading dashboard...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 text-gray-700 p-4 md:p-8 font-sans selection:bg-indigo-200">
      {/* HEADER & QUICK SHORTCUTS */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HiOutlineSparkles className="text-amber-500" />
            <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Command Center</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Operations <span className="text-indigo-600">Live</span></h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <ShortcutBtn href="/admin/sales-order-view/new" icon={<FiPlus />} label="New Sale" color="bg-indigo-600 hover:bg-indigo-700" />
          <ShortcutBtn href="/admin/purchase-order-view/new" icon={<FiShoppingCart />} label="Purchase" color="bg-emerald-600 hover:bg-emerald-700" />
          <ShortcutBtn href="/admin/sales-invoice-view/new" icon={<FiFileText />} label="Invoice" color="bg-violet-600 hover:bg-violet-700" />
          <ShortcutBtn href="/admin/delivery-view/new" icon={<FiTruck />} label="Dispatch" color="bg-amber-600 hover:bg-amber-700" />
        </div>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Active Users" value={stats.totalUsers} icon={<FiUsers />} color="from-blue-500 to-indigo-600" />
        <StatCard title="Sales Volume" value={stats.totalOrders} icon={<FiShoppingCart />} color="from-purple-500 to-violet-600" />
        <StatCard title="Inventory In" value={stats.totalPurchaseOrders} icon={<FiPackage />} color="from-rose-500 to-pink-600" />
        <StatCard title="Net Revenue" value={`₹${stats.revenue.toLocaleString()}`} icon={<FiZap />} color="from-amber-500 to-orange-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* MAIN CHART */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-6 flex items-center gap-2"><FiActivity className="text-indigo-500" /> Performance Analytics</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5e7eb" strokeDasharray="3 3" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 10}} />
                <Tooltip contentStyle={{backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fill="url(#cS)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TOP CUSTOMERS */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-6">Top Contributors</h2>
          <div className="space-y-4">
            {topCustomers.map((c, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700">{i+1}</div>
                  <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{c.name}</span>
                </div>
                <span className="text-xs font-bold text-gray-800">₹{c.val.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-6 py-2.5 rounded-xl border border-gray-200 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 hover:bg-indigo-50 transition-all">Full Leaderboard</button>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-6 flex items-center gap-2"><FiClock className="text-indigo-500" /> Recent Activity</h2>
          <div className="space-y-3">
            {recentOrders.map((o) => {
              const isSalesOrder = !!o.documentNumberOrder;
              const basePath = isSalesOrder ? '/admin/sales-order-view/view' : '/admin/purchase-order-view/view';
              const docNumber = o.documentNumberOrder || o.documentNumberPurchaseOrder || "N/A";
              const name = o.customerName || o.supplierName || "Unknown";
              return (
                <div key={o._id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-all group">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <div className="flex-1 min-w-0">
                    <Link href={`${basePath}/${o._id}`} className="text-xs font-medium text-gray-700 truncate block hover:text-indigo-600 transition-colors">
                      {name} - {docNumber}
                    </Link>
                    <p className="text-[9px] font-medium text-gray-400 uppercase mt-0.5">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <FiArrowRight className="text-gray-400 shrink-0 group-hover:text-indigo-500 transition-colors" />
                </div>
              );
            })}
          </div>
        </div>

        {/* STOCK ALERTS */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl shadow-lg p-6 transition-all hover:shadow-xl">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-6 flex items-center gap-2"><FiAlertTriangle className="text-amber-500" /> Critical Stock Alerts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stockAlerts.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-amber-50 border border-amber-200">
                <div>
                  <p className="text-xs font-bold text-amber-700 uppercase">{item.itemName}</p>
                  <p className="text-[10px] font-medium text-amber-600">Code: {item.itemCode}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">{item.stock} Units</p>
                  <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Low Stock</span>
                </div>
              </div>
            ))}
            {stockAlerts.length === 0 && <p className="text-xs text-gray-500 italic">Inventory levels are within safe limits.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

// Shared helper components
const ShortcutBtn = ({ href, icon, label, color }) => (
  <Link href={href} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl ${color} text-white transition-all hover:scale-105 active:scale-95 shadow-md`}>
    <span className="text-base">{icon}</span>
    <span className="text-[9px] font-semibold uppercase tracking-wide">{label}</span>
  </Link>
);

const StatCard = ({ title, value, icon, color }) => (
  <div className="relative group bg-white/80 backdrop-blur-sm border border-gray-200 rounded-2xl p-6 transition-all hover:translate-y-[-2px] hover:shadow-xl">
    <div className="relative z-10 flex justify-between items-start mb-4">
      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-lg shadow-md`}>{icon}</div>
    </div>
    <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
    <h3 className="text-2xl font-bold text-gray-800 tracking-tight">{value}</h3>
    <div className={`absolute -bottom-8 -right-8 w-20 h-20 bg-gradient-to-br ${color} blur-2xl opacity-20 group-hover:opacity-30 transition-opacity`} />
  </div>
);