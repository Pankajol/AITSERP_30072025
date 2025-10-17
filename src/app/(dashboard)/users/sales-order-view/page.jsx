'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
} from 'react-icons/fa';
import ActionMenu from '@/components/ActionMenu';

/* ---------- Permission Helper ---------- */
const hasPermission = (user, moduleName, permissionType) =>
  user?.modules?.[moduleName]?.selected &&
  user.modules[moduleName]?.permissions?.[permissionType] === true;

/* ======================================================= */
/* Sales Order List Component                              */
/* ======================================================= */
export default function SalesOrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const router = useRouter();

  /* ---------- Load User ---------- */
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  /* ---------- Fetch Orders ---------- */
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('/api/sales-order', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data?.success && Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Error fetching sales orders:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  /* ---------- Filter Orders ---------- */
  const displayOrders = useMemo(() => {
    if (!search.trim()) return orders;
    const q = search.toLowerCase();
    return orders.filter((o) => (o.customerName || '').toLowerCase().includes(q));
  }, [orders, search]);

  /* ---------- Delete Order ---------- */
  const handleDelete = async (id) => {
    if (!hasPermission(user, 'Sales Order', 'delete')) {
      toast.error("You don't have permission to delete orders.");
      return;
    }
    if (!confirm('Delete this order?')) return;
    try {
      await axios.delete(`/api/sales-order/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
      toast.success('Order deleted successfully.');
    } catch {
      toast.error('Failed to delete order.');
    }
  };

  /* ---------- Copy Order ---------- */
  const handleCopyTo = (order, dest) => {
    if (!hasPermission(user, 'Sales Order', 'create')) {
      toast.error("You don't have permission to create records.");
      return;
    }

    const data = { ...order, sourceId: order._id, sourceModel: dest === 'Delivery' ? 'delivery' : 'salesorder' };
    if (dest === 'Delivery') {
      sessionStorage.setItem('deliveryData', JSON.stringify(data));
      router.push('/users/delivery-view/new');
    } else {
      sessionStorage.setItem('SalesInvoiceData', JSON.stringify(data));
      router.push('/users/sales-invoice-view/new');
    }
  };

  /* ======================================================= */
  /* Render UI                                              */
  /* ======================================================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">Sales Orders</h1>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {user && hasPermission(user, 'Sales Order', 'create') && (
          <Link href="/users/sales-order-view/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit /> New Order
            </button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table orders={displayOrders} onDelete={handleDelete} onCopy={handleCopyTo} user={user} />
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {displayOrders.map((o, i) => (
              <Card key={o._id} order={o} idx={i} onDelete={handleDelete} onCopy={handleCopyTo} user={user} />
            ))}
            {!displayOrders.length && <p className="text-center text-gray-500 dark:text-gray-400">No matching orders</p>}
          </div>
        </>
      )}
    </div>
  );
}

/* ======================================================= */
/* Desktop Table Component                                  */
/* ======================================================= */
function Table({ orders, onDelete, onCopy, user }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {['#', 'Document Number', 'Customer', 'Date', 'Status', 'Total', 'Actions'].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr key={o._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{o.documentNumberOrder}</td>
            <td className="px-4 py-3">{o.customerName}</td>
            <td className="px-4 py-3">{new Date(o.postingDate || o.orderDate).toLocaleDateString('en-GB')}</td>
            <td className="px-4 py-3">{o.status}</td>
            <td className="px-4 py-3">₹{o.grandTotal}</td>
            <td className="px-4 py-3"><RowMenu order={o} onDelete={onDelete} onCopy={onCopy} user={user} /></td>
          </tr>
        ))}
        {!orders.length && (
          <tr>
            <td colSpan={7} className="text-center py-6 text-gray-500 dark:text-gray-400">No orders found.</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ======================================================= */
/* Mobile Card Component                                   */
/* ======================================================= */
function Card({ order, idx, onDelete, onCopy, user }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">#{idx + 1} • {order.documentNumberOrder}</div>
        <RowMenu order={order} onDelete={onDelete} onCopy={onCopy} user={user} />
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Customer: {order.customerName}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Date: {new Date(order.postingDate || order.orderDate).toLocaleDateString('en-GB')}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Status: {order.status}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Total: ₹{order.grandTotal}</p>
    </div>
  );
}

/* ======================================================= */
/* Row Menu Component                                      */
/* ======================================================= */
function RowMenu({ order, onDelete, onCopy, user }) {
  const router = useRouter();

  const actions = [
    { icon: <FaEye />, label: 'View', onClick: () => router.push(`/users/sales-order-view/view/${order._id}`) },
    hasPermission(user, 'Sales Order', 'edit') && { icon: <FaEdit />, label: 'Edit', onClick: () => router.push(`/users/sales-order-view/new?editId=${order._id}`) },
    hasPermission(user, 'Sales Order', 'create') && { icon: <FaCopy />, label: 'Copy → Delivery', onClick: () => onCopy(order, 'Delivery') },
    hasPermission(user, 'Sales Order', 'create') && { icon: <FaCopy />, label: 'Copy → Invoice', onClick: () => onCopy(order, 'Invoice') },
    hasPermission(user, 'Sales Order', 'email') && {
      icon: <FaEnvelope />,
      label: 'Email',
      onClick: async () => {
        try {
          const res = await axios.post('/api/email', { type: 'order', id: order._id });
          if (res.data.success) toast.success('Email sent successfully!');
          else toast.error(res.data.message || 'Failed to send email.');
        } catch {
          toast.error('Error sending email.');
        }
      },
    },
    hasPermission(user, 'Sales Order', 'whatsapp') && {
      icon: <FaWhatsapp />,
      label: 'Whatsapp',
      onclick : async () => {
        try {
          const res = await axios.post('/api/whatsapp', { type: 'order', id: order._id });
          if (res.data.success) toast.success('whatsapp sent');
          else toast.error(res.data.message || 'Failed to send whatsapp.');
        } catch {
          toast.error('Error sending whatsapp.');
        }
      },
    },
    // { icon: <FaEnvelope />, label: 'Email', onClick: async () => {
    //   try {
    //     const res = await axios.post('/api/email', { type: 'order', id: order._id });
    //     if (res.data.success) toast.success('Email sent successfully!');
    //     else toast.error(res.data.message || 'Failed to send email.');
    //   } catch { toast.error('Error sending email.'); }
    // }},
    // { icon: <FaWhatsapp />, label: 'WhatsApp', onClick: () => router.push(`/users/sales-order-whatsapp/${order._id}`) },
    hasPermission(user, 'Sales Order', 'delete') && { icon: <FaTrash />, label: 'Delete', color: 'text-red-600', onClick: () => onDelete(order._id) },
  ].filter(Boolean);

  return <ActionMenu actions={actions} />;
}






// 'use client';

// import { useState, useEffect, useMemo,useRef } from 'react';
// import Link from 'next/link';

// import { useRouter } from "next/navigation";
// import axios from 'axios';

// import {
//   FaEllipsisV,
//   FaEdit,
//   FaTrash,
//   FaCopy,
//   FaEye,
//   FaEnvelope,
//   FaWhatsapp,
//   FaSearch,
// } from 'react-icons/fa';
// import ActionMenu from '@/components/ActionMenu';

// /* ================================================================= */
// /*  Sales Order List                                                 */
// /* ================================================================= */
// export default function SalesOrderList() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState(null);
//   const [search, setSearch] = useState('');
//   const router = useRouter();






//   const fetchOrders = async () => {
//   setLoading(true);
//   try {
//     const token = localStorage.getItem("token");

//     const res = await axios.get("/api/sales-order", {
//       headers: {
//         Authorization: `Bearer ${token}`
//       }
//     });

//     console.log("Fetched orders:", res.data?.data);

//     if (res.data?.success && Array.isArray(res.data.data)) {
//       setOrders(res.data.data);
//     } else {
//       console.warn("Unexpected response:", res.data);
//     }
//   } catch (error) {
//     console.error("Error fetching sales orders:", error.response?.data || error.message);
//   } finally {
//     setLoading(false);
//   }
// };

//   useEffect(() => {
//     fetchOrders();
//   }, []);

//   useEffect(() => {
//   const stored = localStorage.getItem('user');
//   if (stored) {
//     const parsed = JSON.parse(stored);
//     console.log("User object:", parsed);
//     setUser(parsed);
//   }
// }, []);




//   /* ---------- filtered list ---------- */
//   const displayOrders = useMemo(() => {
//     if (!search.trim()) return orders;
//     const q = search.toLowerCase();
//     return orders.filter((o) => (o.customerName || '').toLowerCase().includes(q));
//   }, [orders, search]);

//   /* ---------- row actions ---------- */
//   const handleDelete = async (id) => {
//     if (!confirm('Delete this order?')) return;
//     try {
//       await axios.delete(`/api/sales-order/${id}`);
//       setOrders((prev) => prev.filter((o) => o._id !== id));
//     } catch {
//       alert('Failed to delete');
//     }
//   };

// const handleCopyTo = (order, dest) => {


//   if (dest === 'Delivery') {
//       const data = {
//     ...order,
//     sourceId: order._id, // ✅ Add correct field
//     sourceModel: 'delivery', // ✅ Already good
//   };
//     sessionStorage.setItem('deliveryData', JSON.stringify(data));
//     router.push('/users/delivery-view/new');
//   } else {
//       const data = {
//     ...order,
//     sourceId: order._id, // ✅ Add correct field
//     sourceModel: 'salesorder', // ✅ Already good
//   };
//     sessionStorage.setItem('SalesInvoiceData', JSON.stringify(data));
//     router.push('/users/sales-invoice-view/new');
//   }
// };

//   /* ================================================================= */
//   /*  UI                                                               */
//   /* ================================================================= */
//   return (
//     <div className="max-w-7xl mx-auto px-4 py-6">
//       <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
//         Sales Orders
//       </h1>

//       {/* toolbar */}
//       <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
//         <div className="relative flex-1 max-w-md">
//           <FaSearch className="absolute top-3 left-3 text-gray-400" />
//           <input
//             value={search}
//             onChange={(e) => setSearch(e.target.value)}
//             placeholder="Search customer…"
//             className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
//           />
//         </div>

//         <Link href="/users/sales-order-view/new" className="sm:w-auto">
//           <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
//             <FaEdit /> New Order
//           </button>
//         </Link>
//       </div>

//       {/* table / cards */}
//       {loading ? (
//         <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
//       ) : (
//         <>
//           {/* desktop */}
//           <div className="hidden md:block overflow-x-auto">
//             <Table orders={displayOrders} onDelete={handleDelete} onCopy={handleCopyTo} />
//           </div>

//           {/* mobile cards */}
//           <div className="md:hidden space-y-4">
//             {displayOrders.map((o, i) => (
//               <Card
//                 key={o._id}
//                 order={o}
//                 idx={i}
//                 onDelete={handleDelete}
//                 onCopy={handleCopyTo}
//               />
//             ))}
//             {!displayOrders.length && (
//               <p className="text-center text-gray-500 dark:text-gray-400">
//                 No matching orders
//               </p>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

// /* ================================================================= */
// /*  Desktop Table                                                    */
// /* ================================================================= */
// function Table({ orders, onDelete, onCopy }) {
//   return (
//     <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
//       <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
//         <tr>
//           {['#', 'Document Number.', 'Customer', 'Date', 'Status', 'Total', ''].map((h) => (
//             <th
//               key={h}
//               className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100"
//             >
//               {h}
//             </th>
//           ))}
//         </tr>
//       </thead>
//       <tbody>
//         {orders.map((o, i) => (
//           <tr
//             key={o._id}
//             className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
//           >
//             <td className="px-4 py-3">{i + 1}</td>
//             <td className="px-4 py-3">{o.documentNumberOrder}</td>
//             <td className="px-4 py-3">{o.customerName}</td>
//             <td className="px-4 py-3">
//               {new Date(o.postingDate || o.orderDate).toLocaleDateString('en-GB')}
//             </td>
           
//             <td className="px-4 py-3">{o.status}</td>
//             <td className="px-4 py-3">₹{o.grandTotal}</td>
//             <td className="px-4 py-3">
//               <RowMenu order={o} onDelete={onDelete} onCopy={onCopy} />
//             </td>
//           </tr>
//         ))}
//         {!orders.length && (
//           <tr>
//             <td colSpan={7} className="text-center py-6 text-gray-500 dark:text-gray-400">
//               No orders found.
//             </td>
//           </tr>
//         )}
//       </tbody>
//     </table>
//   );
// }

// /* ================================================================= */
// /*  Mobile Card                                                      */
// /* ================================================================= */
// function Card({ order, idx, onDelete, onCopy }) {
//   return (
//     <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
//       <div className="flex justify-between">
//         <div className="font-semibold text-gray-700 dark:text-gray-100">
//           #{idx + 1} • {order.ducumentNumber}
//         </div>
//         <RowMenu order={order} onDelete={onDelete} onCopy={onCopy} isMobile />
//       </div>
//       <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
//         Customer: {order.customerName}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">
//         Date: {new Date(order.postingDate || order.orderDate).toLocaleDateString('en-GB')}
//       </p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">Status: {order.status}</p>
//       <p className="text-sm text-gray-500 dark:text-gray-300">Total: ₹{order.grandTotal}</p>
//     </div>
//   );
// }

// /* ================================================================= */
// /*  Row Action Menu (dropdown)                                       */
// /* ================================================================= */
// function RowMenu({ order, onDelete, onCopy }) {
//   const [open, setOpen] = useState(false);
//   const btnRef = useRef(null);
//   const menuRef = useRef(null);
//   const router = useRouter();

//   /** ✅ Actions Array */
//   const actions = [
//     { icon: <FaEye />, label: "View", onClick: () => router.push(`/users/sales-order-view/view/${order._id}`) },
//     { icon: <FaEdit />, label: "Edit", onClick: () => router.push(`/users/sales-order-view/new?editId=${order._id}`) },
//     { icon: <FaCopy />, label: "Copy → Delivery", onClick: () => onCopy(order, "Delivery") },
//     { icon: <FaCopy />, label: "Copy → Invoice", onClick: () => onCopy(order, "Invoice") },
//     {
//       icon: <FaEnvelope />,
//       label: "Email",
//       onClick: async () => {
//         try {
//           const res = await axios.post("/api/email", { type: "order", id: order._id });
//           if (res.data.success) toast.success("Email sent successfully!");
//           else toast.error(res.data.message || "Failed to send email.");
//         } catch {
//           toast.error("Error sending email.");
//         }
//       },
//     },
//     // { icon: <FaEnvelope />, label: "Email", onClick: () => router.push(`/users/sales-order-email/${order._id}`) },
//     { icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => router.push(`/users/sales-order-whatsapp/${order._id}`) },
//     { icon: <FaTrash />, label: "Delete", color: "text-red-600", onClick: () => onDelete(order._id) },
//   ];
//   return ( 
//     <ActionMenu actions={actions} />
//   )
// }







