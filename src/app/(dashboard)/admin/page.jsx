"use client";

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FaUser, FaShoppingCart, FaRupeeSign, FaUserPlus, FaChartBar, FaTasks } from 'react-icons/fa';

export default function AdminDashboard() {
  const [stats] = useState({
    totalUsers: 1240,
    totalOrders: 873,
    revenue: 45230,
    newUsers: 45,
  });

  const chartData = [
    { month: 'Jan', orders: 65 },
    { month: 'Feb', orders: 78 },
    { month: 'Mar', orders: 90 },
    { month: 'Apr', orders: 110 },
    { month: 'May', orders: 95 },
    { month: 'Jun', orders: 120 },
    { month: 'Jul', orders: 130 },
      { month: 'Aug', orders: 65 },
    { month: 'Sep', orders: 78 },
    { month: 'Oct', orders: 90 },
    { month: 'Nov', orders: 110 },
    { month: 'Dec', orders: 95 },
  
  ];

  const recentOrders = [
    { id: 'A001', user: 'John Doe', amount: 1200, status: 'Shipped', date: '2025-05-21' },
    { id: 'A002', user: 'Jane Smith', amount: 850, status: 'Processing', date: '2025-05-20' },
    { id: 'A003', user: 'Alice Johnson', amount: 430, status: 'Delivered', date: '2025-05-19' },
  ];

  const statusClasses = status => {
    switch (status) {
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Shipped': return 'bg-blue-100 text-blue-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const formatCurrency = value => `₹${value.toLocaleString('en-IN')}`;

  const StatCard = ({ title, value, Icon, color }) => (
    <div className={`p-4 rounded-lg shadow text-white ${color}`}>
      <div className="flex items-center space-x-4">
        <div className="text-3xl"><Icon /></div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <h1 className="text-4xl font-bold text-gray-800"> Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} Icon={FaUser} color="bg-indigo-500" />
        <StatCard title="Total Orders" value={stats.totalOrders} Icon={FaShoppingCart} color="bg-pink-500" />
        <StatCard title="Revenue" value={formatCurrency(stats.revenue)} Icon={FaRupeeSign} color="bg-green-500" />
        <StatCard title="New Users (30d)" value={stats.newUsers} Icon={FaUserPlus} color="bg-yellow-500" />
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Monthly Orders</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="orders" stroke="#4F46E5" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Order ID</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">User</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Amount</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentOrders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-700">{order.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.user}</td>
                  <td className="px-4 py-2 text-sm font-semibold text-gray-800">{formatCurrency(order.amount)}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}



// "use client";

// import React, { useState } from 'react';
// import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// export default function AdminDashboard() {
//   const [stats] = useState({
//     totalUsers: 1240,
//     totalOrders: 873,
//     revenue: 45230,
//     newUsers: 45,
//   });

//   const chartData = [
//     { month: 'Jan', orders: 65 },
//     { month: 'Feb', orders: 78 },
//     { month: 'Mar', orders: 90 },
//     { month: 'Apr', orders: 110 },
//     { month: 'May', orders: 95 },
//     { month: 'Jun', orders: 120 },
//     { month: 'Jul', orders: 130 },
//   ];

//   const recentOrders = [
//     { id: 'A001', user: 'John Doe', amount: 1200, status: 'Shipped', date: '2025-05-21' },
//     { id: 'A002', user: 'Jane Smith', amount: 850, status: 'Processing', date: '2025-05-20' },
//     { id: 'A003', user: 'Alice Johnson', amount: 430, status: 'Delivered', date: '2025-05-19' },
//   ];

//   const statusClasses = status => {
//     switch (status) {
//       case 'Delivered': return 'bg-green-100 text-green-800';
//       case 'Shipped': return 'bg-blue-100 text-blue-800';
//       default: return 'bg-yellow-100 text-yellow-800';
//     }
//   };

//   const formatCurrency = value => `₹${value.toLocaleString('en-IN')}`;

//   return (
//     <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold"> Dashboard</h1>

//       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
//         <div className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500">
//           <h2 className="text-sm font-semibold text-gray-600">Total Users</h2>
//           <p className="text-2xl font-bold text-gray-800">{stats.totalUsers}</p>
//         </div>
//         <div className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500">
//           <h2 className="text-sm font-semibold text-gray-600">Total Orders</h2>
//           <p className="text-2xl font-bold text-gray-800">{stats.totalOrders}</p>
//         </div>
//         <div className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500">
//           <h2 className="text-sm font-semibold text-gray-600">Revenue</h2>
//           <p className="text-2xl font-bold text-gray-800">{formatCurrency(stats.revenue)}</p>
//         </div>
//         <div className="p-4 bg-white rounded-lg shadow border-l-4 border-blue-500">
//           <h2 className="text-sm font-semibold text-gray-600">New Users (30d)</h2>
//           <p className="text-2xl font-bold text-gray-800">{stats.newUsers}</p>
//         </div>
//       </div>

//       <div className="bg-white p-6 rounded-lg shadow ">
//         <h2 className="text-lg font-semibold mb-4">Monthly Orders</h2>
//         <ResponsiveContainer width="100%" height={300}>
//           <LineChart data={chartData}>
//             <XAxis dataKey="month" />
//             <YAxis />
//             <Tooltip />
//             <Line type="monotone" dataKey="orders" stroke="#4F46E5" strokeWidth={2} />
//           </LineChart>
//         </ResponsiveContainer>
//       </div>

//       <div className="bg-white p-6 rounded-lg shadow">
//         <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Order ID</th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">User</th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Amount</th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Status</th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">Date</th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {recentOrders.map(order => (
//                 <tr key={order.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-2 text-sm text-gray-700">{order.id}</td>
//                   <td className="px-4 py-2 text-sm text-gray-700">{order.user}</td>
//                   <td className="px-4 py-2 text-sm font-semibold text-gray-800">{formatCurrency(order.amount)}</td>
//                   <td className="px-4 py-2 text-sm">
//                     <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses(order.status)}`}>
//                       {order.status}
//                     </span>
//                   </td>
//                   <td className="px-4 py-2 text-sm text-gray-700">{order.date}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// 'use client';

// import CreateAccount from '@/components/Account';
// import { useState, useEffect } from 'react';

// export default function AdminDashboard() {
//   const [adminData, setAdminData] = useState(null);
//   return (
//     <div>
//       {/* <h1 className="text-3xl font-bold">User Dashboard</h1> */}
//       <div className="mt-6">
      
//        <CreateAccount />
       
//       </div>
 
//     </div>
//   );
// }