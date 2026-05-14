"use client";
import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, DollarSign, Wallet, Users, Building2, RefreshCw } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from "recharts";
import * as XLSX from "xlsx";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const StatCard = ({ title, value, icon: Icon, color }) => (
  <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold mt-1 text-gray-900">{value}</p>
      </div>
      <div className={`p-2 rounded-lg bg-${color}-100 text-${color}-600`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = () => localStorage.getItem("token") || "";

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/stats", { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStats(); }, []);

  // Sample chart data (you would replace with real historical data)
  const monthlySales = [
    { month: "Jan", sales: 850000, purchases: 620000 },
    { month: "Feb", sales: 920000, purchases: 580000 },
    { month: "Mar", sales: 780000, purchases: 610000 },
    { month: "Apr", sales: 890000, purchases: 590000 },
    { month: "May", sales: 950000, purchases: 630000 },
    { month: "Jun", sales: 1020000, purchases: 680000 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Financial Dashboard</h1>
          <button onClick={fetchStats} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-gray-200 rounded-xl"></div>)}
          </div>
        ) : stats && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <StatCard title="Total Sales (MTD)" value={fmtINR(stats.totalSales)} icon={TrendingUp} color="emerald" />
              <StatCard title="Total Purchases (MTD)" value={fmtINR(stats.totalPurchases)} icon={TrendingDown} color="rose" />
              <StatCard title="Cash & Bank Balance" value={fmtINR(stats.cashBalance)} icon={Wallet} color="blue" />
              <StatCard title="Accounts Receivable" value={fmtINR(stats.accountsReceivable)} icon={Users} color="amber" />
              <StatCard title="Accounts Payable" value={fmtINR(stats.accountsPayable)} icon={Building2} color="purple" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-sm p-4 border">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Sales Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => fmtINR(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="sales" stroke="#10b981" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-4 border">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Sales vs Purchases</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={monthlySales}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} />
                    <Tooltip formatter={(v) => fmtINR(v)} />
                    <Legend />
                    <Bar dataKey="sales" fill="#10b981" />
                    <Bar dataKey="purchases" fill="#f43f5e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Placeholder for recent activity */}
            <div className="bg-white rounded-xl shadow-sm p-4 border">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent Invoices</h3>
              <p className="text-gray-400 text-center py-4">Recent transactions will appear here. (Implement with an API call)</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}