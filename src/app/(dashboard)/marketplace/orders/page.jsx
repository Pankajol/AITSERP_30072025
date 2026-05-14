"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FiShoppingBag, FiArrowLeft } from "react-icons/fi";

export default function CustomerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    (async () => {
      try {
        const { data } = await axios.get("/api/marketplace/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) setOrders(data.data);
      } catch (e) { console.error(e); } finally { setLoading(false); }
    })();
  }, [token, router]);

  const getStatusBadge = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-700",
      confirmed: "bg-blue-100 text-blue-700",
      shipped: "bg-purple-100 text-purple-700",
      delivered: "bg-green-100 text-green-700",
      completed: "bg-green-200 text-green-800",
      cancelled: "bg-red-100 text-red-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  if (!token) return null;
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading orders...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-6">
          <FiArrowLeft /> Back
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">My Orders</h1>
        {orders.length === 0 ? (
          <div className="flex flex-col items-center py-20 bg-white rounded-2xl border">
            <FiShoppingBag className="text-4xl text-gray-300 mb-3" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order._id} className="bg-white rounded-2xl p-5 border shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-gray-500">Order #{order.documentNumberOrder}</p>
                    <p className="text-xs text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusBadge(order.status)}`}>
                    {order.status}
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {order.items?.slice(0, 2).map(item => (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span>{item.itemName} x {item.quantity}</span>
                      <span className="font-bold">₹ {item.totalAmount}</span>
                    </div>
                  ))}
                  {order.items?.length > 2 && <p className="text-xs text-gray-400">+ {order.items.length - 2} more items</p>}
                </div>
                <div className="mt-3 pt-3 border-t flex justify-between items-center">
                  <span className="text-sm font-bold">Total: ₹ {order.grandTotal}</span>
                  <button onClick={() => router.push(`/marketplace/orders/${order._id}`)} className="text-indigo-600 text-sm font-bold hover:underline">
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}