"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FaUser,
  FaShoppingCart,
  FaRupeeSign,
  FaUserPlus,
} from "react-icons/fa";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalOrders: 0,
    totalPurchaseOrders: 0,
    revenue: 0,
    newUsers: 0,
  });
  const [chartData, setChartData] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        };

        const [usersRes, salesRes, purchaseRes] = await Promise.all([
          fetch("/api/suppliers", { headers }),
          fetch("/api/sales-order", { headers }),
          fetch("/api/purchase-order", { headers }),
        ]);

        const usersData = await usersRes.json();
        const salesData = await salesRes.json();
        const purchaseData = await purchaseRes.json();

        const users = usersData?.data || [];
        const sales = salesData?.data || [];
        const purchases = purchaseData?.data || [];

        const recent30Days = (date) =>
          new Date(date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        setStats({
          totalUsers: users.length,
          newUsers: users.filter((u) => recent30Days(u.createdAt)).length,
          totalPurchaseOrders: purchases.length,
          totalOrders: sales.length,
          revenue: [...sales, ...purchases].reduce(
            (sum, item) => sum + (item.totalAmount || 0),
            0
          ),
        });


        const ordersByMonth = {};

        sales.forEach((order) => {
          const date = new Date(order.createdAt);
          const monthKey = `${date.toLocaleString("default", {
            month: "short",
          })} ${date.getFullYear()}`;
          if (!ordersByMonth[monthKey]) {
            ordersByMonth[monthKey] = { sales: 0, purchases: 0 };
          }
          ordersByMonth[monthKey].sales += 1;
        });

        purchases.forEach((order) => {
          const date = new Date(order.createdAt);
          const monthKey = `${date.toLocaleString("default", {
            month: "short",
          })} ${date.getFullYear()}`;
          if (!ordersByMonth[monthKey]) {
            ordersByMonth[monthKey] = { sales: 0, purchases: 0 };
          }
          ordersByMonth[monthKey].purchases += 1;
        });

        const allMonths = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(new Date().getFullYear(), i);
          return `${d.toLocaleString("default", {
            month: "short",
          })} ${d.getFullYear()}`;
        });

        const updatedChartData = allMonths.map((month) => ({
          month,
          sales: ordersByMonth[month]?.sales || 0,
          purchases: ordersByMonth[month]?.purchases || 0,
        }));

        setChartData(updatedChartData);

        setRecentOrders(
          [...sales, ...purchases]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5)
            .map((order) => ({
              id:
                order.documentNumberPurchaseOrder ||
                order.documentNumberOrder ||
                "N/A",
              user: order.customerName || order.supplierName || "N/A",
              amount: order.grandTotal || 0,
              status: order.status || order.orderStatus || "Processing",
              date: new Date(order.createdAt).toLocaleDateString("en-GB"),
            }))
        );
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  const statusClasses = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-800";
      case "Shipped":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}`;

  const StatCard = ({ title, value, Icon, color }) => (
    <div className={`p-4 rounded-lg shadow text-white ${color}`}>
      <div className="flex items-center space-x-4">
        <div className="text-3xl">
          <Icon />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl font-medium text-gray-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
      <h1 className="text-2xl md:text-4xl font-bold text-gray-800">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="Total Users" value={stats.totalUsers} Icon={FaUser} color="bg-indigo-500" />
        <StatCard title="Total Orders" value={stats.totalOrders} Icon={FaShoppingCart} color="bg-pink-500" />
        <StatCard title="Purchase Orders" value={stats.totalPurchaseOrders} Icon={FaShoppingCart} color="bg-red-500" />
        {/* <StatCard title="Revenue" value={formatCurrency(stats.revenue)} Icon={FaRupeeSign} color="bg-green-500" /> */}
        <StatCard title="New Users (30d)" value={stats.newUsers} Icon={FaUserPlus} color="bg-yellow-500" />
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Monthly Orders</h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={2} name="Sales" />
            <Line type="monotone" dataKey="purchases" stroke="#22C55E" strokeWidth={2} name="Purchases" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white p-4 md:p-6 rounded-lg shadow">
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
              {recentOrders.map((order) => (
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

// import React, { useEffect, useState } from "react";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   ResponsiveContainer,
// } from "recharts";
// import {
//   FaUser,
//   FaShoppingCart,
//   FaRupeeSign,
//   FaUserPlus,
// } from "react-icons/fa";

// export default function AdminDashboard() {
//   const [stats, setStats] = useState({
//     totalUsers: 0,
//     totalOrders: 0,
//     totalPurchaseOrders: 0,
//     revenue: 0,
//     newUsers: 0,
//   });
//   const [chartData, setChartData] = useState([]);
//   const [recentOrders, setRecentOrders] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     async function fetchDashboardData() {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         };

//         const [usersRes, salesRes, purchaseRes,] = await Promise.all([
//           fetch("/api/suppliers", { headers }),
//           fetch("/api/sales-order", { headers }),
//           fetch("/api/purchase-order", { headers }),
//         ]);

//         const usersData = await usersRes.json();
//         const salesData = await salesRes.json();
//         const purchaseData = await purchaseRes.json();
        

//         const users = usersData?.data || [];
//         const sales = salesData?.data || [];
//         const purchases = purchaseData?.data || [];
    
         
//         const recent30Days = (date) =>
//           new Date(date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
//         setStats({
//           totalUsers: users.length,
//           newUsers: users.filter((u) => recent30Days(u.createdAt)).length,
//           totalPurchaseOrders:  purchases.length,
//           totalOrders: sales.length,
          
//           revenue: [...sales, ...purchases].reduce(
//             (sum, item) => sum + (item.totalAmount || 0),
//             0
//           ),
//         });

//      const ordersByMonth = {};

// // Collect data separately for sales and purchases
// sales.forEach((order) => {
//   const date = new Date(order.createdAt);
//   const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
//   if (!ordersByMonth[monthYear]) {
//     ordersByMonth[monthYear] = { sales: 0, purchases: 0 };
//   }
//   ordersByMonth[monthYear].sales += 1;
// });

// purchases.forEach((order) => {
//   const date = new Date(order.createdAt);
//   const monthYear = `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
//   if (!ordersByMonth[monthYear]) {
//     ordersByMonth[monthYear] = { sales: 0, purchases: 0 };
//   }
//   ordersByMonth[monthYear].purchases += 1;
// });

// // Sort and prepare chart data
// const sortedMonths = Object.keys(ordersByMonth).sort((a, b) => {
//   const getDateObj = (str) => new Date(`01 ${str}`);
//   return getDateObj(a) - getDateObj(b);
// });

// setChartData(
//   sortedMonths.map((month) => ({
//     month,
//     sales: ordersByMonth[month].sales,
//     purchases: ordersByMonth[month].purchases,
//   }))
// );

// console.log("Orders by Month:", chartData)


//         const months = [
//           "Jan",
//           "Feb",
//           "Mar",
//           "Apr",
//           "May",
//           "Jun",
//           "Jul",
//           "Aug",
//           "Sep",
//           "Oct",
//           "Nov",
//           "Dec",
//         ];

     


//         setRecentOrders(
          
//           [...sales, ...purchases]

//             .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//             .slice(0, 5)
//             .map((order) => ({
//               id: order.documentNumberPurchaseOrder || order.documentNumberOrder,
//               user: order.customerName || order.supplierName || "N/A",
//               amount: order.grandTotal || 0,
//               status: order.status || order.orderStatus || "Processing",
              
//               date: new Date(order.createdAt).toLocaleDateString('en-GB')

           
               
              

//             }))
//         );
//       } catch (error) {
//         console.error("Dashboard fetch error:", error);
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchDashboardData();
//   }, []);

//   const statusClasses = (status) => {
//     switch (status) {
//       case "Delivered":
//         return "bg-green-100 text-green-800";
//       case "Shipped":
//         return "bg-blue-100 text-blue-800";
//       default:
//         return "bg-yellow-100 text-yellow-800";
//     }
//   };

//   const formatCurrency = (value) => `₹${value.toLocaleString("en-IN")}`;

//   const StatCard = ({ title, value, Icon, color }) => (
//     <div className={`p-4 rounded-lg shadow text-white ${color}`}>
//       <div className="flex items-center space-x-4">
//         <div className="text-3xl">
//           <Icon />
//         </div>
//         <div>
//           <h2 className="text-sm font-semibold">{title}</h2>
//           <p className="text-2xl font-bold">{value}</p>
//         </div>
//       </div>
//     </div>
//   );

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center min-h-screen">
//         <p className="text-xl font-medium text-gray-600">Loading dashboard...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="p-4 md:p-6 space-y-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 min-h-screen">
//       <h1 className="text-2xl md:text-4xl font-bold text-gray-800">
//         Dashboard
//       </h1>

//       {/* Stat Cards */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
//         <StatCard
//           title="Total Users"
//           value={stats.totalUsers}
//           Icon={FaUser}
//           color="bg-indigo-500"
//         />
//         <StatCard
//           title="Total Orders"
//           value={stats.totalOrders}
//           Icon={FaShoppingCart}
//           color="bg-pink-500"
//         />
//            <StatCard
//           title="Total Orders"
//           value={stats.totalPurchaseOrders}
//           Icon={FaShoppingCart}
//           color="bg-red-500"
//         />
//         <StatCard
//           title="Revenue"
//           value={formatCurrency(stats.revenue)}
//           Icon={FaRupeeSign}
//           color="bg-green-500"
//         />
//         <StatCard
//           title="New Users (30d)"
//           value={stats.newUsers}
//           Icon={FaUserPlus}
//           color="bg-yellow-500"
//         />
//       </div>

//       {/* Monthly Orders Chart */}
//       <div className="bg-white p-4 md:p-6 rounded-lg shadow">
//         <h2 className="text-lg font-semibold mb-4">Monthly Orders</h2>
//       <ResponsiveContainer width="100%" height={300}>
//   <LineChart data={chartData}>
//     <XAxis dataKey="month" />
//     <YAxis />
//     <Tooltip />
//     <Line
//       type="monotone"
//       dataKey="sales"
//       stroke="#4F46E5"
//       strokeWidth={2}
//       name="Sales"
//     />
//     <Line
//       type="monotone"
//       dataKey="purchases"
//       stroke="#22C55E"
//       strokeWidth={2}
//       name="Purchases"
//     />
//   </LineChart>
// </ResponsiveContainer>

//       </div>

//       {/* Recent Orders Table */}
//       <div className="bg-white p-4 md:p-6 rounded-lg shadow">
//         <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
//         <div className="overflow-x-auto">
//           <table className="min-w-full divide-y divide-gray-200">
//             <thead className="bg-gray-50">
//               <tr>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
//                   Order ID
//                 </th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
//                   User
//                 </th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
//                   Amount
//                 </th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
//                   Status
//                 </th>
//                 <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
//                   Date
//                 </th>
//               </tr>
//             </thead>
//             <tbody className="bg-white divide-y divide-gray-200">
//               {recentOrders.map((order) => (
//                 <tr key={order.id} className="hover:bg-gray-50">
//                   <td className="px-4 py-2 text-sm text-gray-700">{order.id}</td>
//                   <td className="px-4 py-2 text-sm text-gray-700">{order.user}</td>
//                   <td className="px-4 py-2 text-sm font-semibold text-gray-800">
//                     {formatCurrency(order.amount)}
//                   </td>
//                   <td className="px-4 py-2 text-sm">
//                     <span
//                       className={`px-2 py-1 rounded-full text-xs font-medium ${statusClasses(
//                         order.status
//                       )}`}
//                     >
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



