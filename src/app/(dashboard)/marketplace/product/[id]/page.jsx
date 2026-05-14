"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { FiCalendar, FiPlus, FiMinus, FiShoppingCart } from "react-icons/fi";

export default function ProductDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [addingCart, setAddingCart] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null; // या कस्टमर JWT

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`/api/marketplace/products?id=${id}`);
        if (data.success) setProduct(data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!product) return <div className="min-h-screen flex items-center justify-center text-gray-400">Product not found</div>;

  const currentPrice = product.variants?.[selectedVariantIndex]?.price || product.unitPrice;
  const totalPrice = currentPrice * quantity;

  const addToCart = async () => {
    if (product.type === "service" && !selectedDate) {
      alert("Please select a date");
      return;
    }
    if (!token) {
      router.push("/login"); // कस्टमर लॉगिन पेज पर भेजें
      return;
    }
    setAddingCart(true);
    try {
      await axios.post("/api/marketplace/cart", {
        productId: product._id,
        variantId: product.variants?.[selectedVariantIndex]?._id,
        quantity,
        selectedDate: product.type === "service" ? selectedDate : undefined,
        price: currentPrice,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Added to cart!");
      router.push("/marketplace/cart");
    } catch (e) {
      alert(e.response?.data?.message || "Failed to add to cart");
    } finally {
      setAddingCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border overflow-hidden">
        <img src={product.images?.[0] || "/placeholder.jpg"} className="w-full h-64 object-cover" />
        <div className="p-6">
          <h1 className="text-2xl font-extrabold text-gray-900">{product.itemName}</h1>
          <p className="text-sm text-gray-500 mt-1">{product.vendorId?.businessName}</p>
          <p className="text-sm mt-3 text-gray-600">{product.description}</p>

          {/* Variants */}
          {product.variants?.length > 0 && (
            <div className="mt-6">
              <label className="text-sm font-bold text-gray-500">Options:</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {product.variants.map((v, idx) => (
                  <button
                    key={v._id}
                    onClick={() => setSelectedVariantIndex(idx)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
                      selectedVariantIndex === idx
                        ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                        : "bg-gray-100 border-gray-200 text-gray-600"
                    }`}
                  >
                    {v.name} - ₹{v.price}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Service Date */}
          {product.type === "service" && (
            <div className="mt-6">
              <label className="text-sm font-bold text-gray-500 flex items-center gap-1">
                <FiCalendar /> Preferred Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="mt-2 border rounded-xl p-2 text-sm w-full"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6 flex items-center gap-4">
            <span className="text-sm font-bold text-gray-500">Quantity:</span>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><FiMinus /></button>
            <span className="text-lg font-bold w-8 text-center">{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)}
              className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200"><FiPlus /></button>
          </div>

          {/* Price */}
          <div className="mt-6 flex items-end justify-between">
            <span className="text-2xl font-bold text-indigo-600">₹ {totalPrice}</span>
            <span className="text-xs text-gray-400">per unit: ₹ {currentPrice}</span>
          </div>

          <button
            onClick={addToCart}
            disabled={addingCart}
            className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {addingCart ? "Adding..." : <><FiShoppingCart /> Add to Cart</>}
          </button>
        </div>
      </div>
    </div>
  );
}