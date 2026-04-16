"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from "recharts";
import {
  FiUsers, FiUserCheck, FiCalendar, FiBriefcase, FiClock, FiPlus, FiTrendingUp
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";
import Link from "next/link";

export default function HRDashboard({ session }) {
  const [stats, setStats] = useState({ totalEmployees: 0, presentToday: 0, pendingLeaves: 0, onLeave: 0 });
  const [attendanceData, setAttendanceData] = useState([]);
  const [recentHires, setRecentHires] = useState([]);
  const [pendingLeaveRequests, setPendingLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [empRes, attendanceRes, leavesRes] = await Promise.all([
          fetch("/api/hr/employees", { headers }),
          fetch("/api/hr/attendance/weekly", { headers }),
          fetch("/api/hr/leaves/pending", { headers }),
        ]);

        const employees = (await empRes.json())?.data || [];
        const attendance = (await attendanceRes.json())?.data || [];
        const pendingLeaves = (await leavesRes.json())?.data || [];

        setStats({
          totalEmployees: employees.length,
          presentToday: attendance.filter(a => a.date === new Date().toISOString().split('T')[0] && a.status === "present").length,
          pendingLeaves: pendingLeaves.length,
          onLeave: attendance.filter(a => a.status === "absent" && a.reason === "leave").length,
        });

        setRecentHires(employees.slice(0, 5));
        setPendingLeaveRequests(pendingLeaves.slice(0, 4));

        // Last 7 days attendance summary
        const last7Days = [...Array(7)].map((_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - i);
          return d.toISOString().split('T')[0];
        }).reverse();
        const chart = last7Days.map(date => ({
          date: date.slice(5),
          present: attendance.filter(a => a.date === date && a.status === "present").length,
          absent: attendance.filter(a => a.date === date && a.status === "absent").length,
        }));
        setAttendanceData(chart);
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    }
    fetchData();
  }, []);

  if (loading) return <HRLoader />;

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-orange-50 text-gray-700 p-4 md:p-8 font-sans">
      <DashboardHeader title="People Operations" subtitle="Employees • Attendance • Leaves" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Employees" value={stats.totalEmployees} icon={<FiUsers />} color="from-rose-500 to-pink-600" />
        <StatCard title="Present Today" value={stats.presentToday} icon={<FiUserCheck />} color="from-emerald-500 to-teal-600" />
        <StatCard title="Pending Leaves" value={stats.pendingLeaves} icon={<FiBriefcase />} color="from-amber-500 to-orange-600" />
        <StatCard title="On Leave" value={stats.onLeave} icon={<FiCalendar />} color="from-slate-500 to-gray-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Chart */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Last 7 Days Attendance</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="present" fill="#10b981" radius={[4,4,0,0]} />
                <Bar dataKey="absent" fill="#f43f5e" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pending Leave Requests */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4 flex items-center gap-2"><FiClock /> Pending Leave Requests</h2>
          <div className="space-y-3">
            {pendingLeaveRequests.map(req => (
              <div key={req._id} className="p-2 rounded-lg bg-amber-50 text-sm flex justify-between">
                <span>{req.employeeName}</span>
                <span className="text-xs text-amber-700">{req.days} days</span>
              </div>
            ))}
            {pendingLeaveRequests.length === 0 && <p className="text-sm text-gray-500">No pending requests</p>}
          </div>
        </div>

        {/* Recent Hires */}
        <div className="bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Recent Hires</h2>
          <div className="space-y-2">
            {recentHires.map(emp => (
              <div key={emp._id} className="p-2 border-b text-sm">{emp.name} - {emp.department}</div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm border rounded-2xl p-6">
          <h2 className="text-xs font-semibold uppercase text-gray-500 mb-4">Quick Actions</h2>
          <div className="flex flex-wrap gap-3">
            <ShortcutBtn href="/admin/hr/employee-onboarding" icon={<FiPlus />} label="Onboard Employee" color="bg-rose-600" />
            <ShortcutBtn href="/admin/hr/attendance" icon={<FiCalendar />} label="Mark Attendance" color="bg-emerald-600" />
            <ShortcutBtn href="/admin/hr/leaves" icon={<FiBriefcase />} label="Manage Leaves" color="bg-amber-600" />
            <ShortcutBtn href="/admin/hr/payroll" icon={<FiTrendingUp />} label="Payroll" color="bg-indigo-600" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Same helper components as before (import or duplicate)
const DashboardHeader = ({ title, subtitle }) => (
  <div className="mb-8">
    <div className="flex items-center gap-2 mb-1">
      <HiOutlineSparkles className="text-amber-500" />
      <span className="text-[10px] font-semibold uppercase text-rose-600">HR Hub</span>
    </div>
    <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
    <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
  </div>
);

const HRLoader = () => (
  <div className="min-h-screen bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-rose-500 border-t-transparent" />
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