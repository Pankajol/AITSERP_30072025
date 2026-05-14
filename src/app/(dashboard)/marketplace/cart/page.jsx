"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FiTrash2, FiArrowRight, FiShoppingBag } from "react-icons/fi";

export default function CartPage() {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchCart = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError("Please login to view your cart");
      return;
    }
    try {
      const { data } = await axios.get("/api/marketplace/cart", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setCart(data.data);
      else setError(data.message || "Could not load cart");
    } catch (e) {
      setError("Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/api/marketplace/cart?itemId=${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCart(); // refresh
    } catch (e) {
      alert("Failed to remove item");
    }
  };

  const handleCheckout = async () => {
    try {
      const { data } = await axios.post("/api/marketplace/orders/checkout", {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl; // रेज़रपे पर रीडायरेक्ट
      } else {
        alert("Order placed! ID: " + data.orderId);
        router.push("/marketplace/orders");
      }
    } catch (e) {
      alert(e.response?.data?.message || "Checkout failed");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FiShoppingBag className="mx-auto text-4xl text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Please login to see your cart</p>
          <button onClick={() => router.push("/login")} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Login</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading cart...</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Your Cart</h1>

        {!cart || cart.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border">
            <FiShoppingBag className="text-4xl text-gray-300 mb-3" />
            <p className="text-gray-500">Your cart is empty</p>
            <button onClick={() => router.push("/marketplace")} className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold">Browse Products</button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {cart.items.map(item => (
                <div key={item._id} className="bg-white rounded-2xl p-4 border shadow-sm flex flex-col sm:flex-row gap-4">
                  <img src={item.productId?.imageUrl || "/placeholder.jpg"} className="w-full sm:w-24 h-24 object-cover rounded-xl" />
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.productId?.itemName}</h3>
                    <p className="text-xs text-gray-400">{item.productId?.vendorId?.businessName}</p>
                    {item.selectedDate && <p className="text-xs text-gray-500 mt-1">Date: {new Date(item.selectedDate).toLocaleDateString()}</p>}
                    <p className="text-sm font-bold text-indigo-600 mt-2">₹ {item.price} x {item.quantity} = ₹ {item.price * item.quantity}</p>
                  </div>
                  <button onClick={() => removeItem(item._id)} className="text-red-400 hover:text-red-600 self-start">
                    <FiTrash2 size={18} />
                  </button>
                </div>
              ))}
            </div>

            {/* कुल योग और चेकआउट */}
            <div className="mt-6 bg-white rounded-2xl p-5 border shadow-sm">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>₹ {cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0)}</span>
              </div>
              <button
                onClick={handleCheckout}
                className="mt-4 w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-md shadow-indigo-200"
              >
                Proceed to Checkout <FiArrowRight />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}