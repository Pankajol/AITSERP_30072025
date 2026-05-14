"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Link from "next/link";
import { FiSearch, FiMapPin, FiShoppingBag } from "react-icons/fi";

export default function MarketplaceHome() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (type) params.set("type", type);
      if (city) params.set("city", city);
      const { data } = await axios.get(`/api/marketplace/products?${params.toString()}`);
      if (data.success) setProducts(data.data);
      else setError(data.message || "Failed to load");
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [search, category, type, city]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* स्टिकी हेडर */}
      <header className="bg-white border-b sticky top-0 z-30 p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-3">
          <Link href="/marketplace" className="text-xl font-bold text-indigo-600">Marketplace</Link>
          <div className="flex-1 flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-2.5 text-gray-300" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search services, products..."
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 text-sm bg-white">
              <option value="">All Categories</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Photography">Photography</option>
              <option value="Venue">Venue</option>
              <option value="Makeup">Makeup</option>
              <option value="Catering">Catering</option>
            </select>
            <select value={type} onChange={e => setType(e.target.value)}
              className="py-2 px-3 rounded-xl border border-gray-200 text-sm bg-white">
              <option value="">All Type</option>
              <option value="physical">Physical</option>
              <option value="service">Service</option>
            </select>
            <div className="relative">
              <FiMapPin className="absolute left-3 top-2.5 text-gray-300" />
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="City"
                className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm w-28"
              />
            </div>
          </div>
          <Link href="/marketplace/cart" className="p-2 rounded-xl bg-indigo-100 text-indigo-600 relative">
            <FiShoppingBag size={20} />
          </Link>
        </div>
      </header>

      {/* मेन बॉडी */}
      <main className="max-w-7xl mx-auto p-4">
        {error && <div className="text-center py-10 text-red-500">{error}</div>}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-3 animate-pulse">
                <div className="h-32 bg-gray-200 rounded-xl mb-3" />
                <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
                <div className="h-3 w-14 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : products.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <FiShoppingBag className="text-3xl text-indigo-300" />
            </div>
            <p className="text-gray-400 font-medium">No products found</p>
            <p className="text-sm text-gray-300 mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map(product => (
              <Link key={product._id} href={`/marketplace/product/${product._id}`}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border hover:shadow-md hover:-translate-y-1 transition-all group cursor-pointer">
                <img src={product.images?.[0] || "/placeholder.jpg"} alt={product.itemName}
                  className="h-40 w-full object-cover group-hover:scale-105 transition-transform" />
                <div className="p-3">
                  <h3 className="font-bold text-sm text-gray-900 truncate">{product.itemName}</h3>
                  <p className="text-xs text-gray-500 mt-1">{product.vendorId?.businessName || "Unknown Vendor"}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-indigo-600">₹ {product.unitPrice}</span>
                    {product.type === "service" && (
                      <span className="text-[10px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full">Service</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}