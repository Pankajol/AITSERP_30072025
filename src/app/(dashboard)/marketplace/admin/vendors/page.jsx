"use client";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  FiSearch, FiEdit2, FiTrash2, FiCheck, FiX, FiUserCheck, FiUserX,
} from "react-icons/fi";

const STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-600 border-yellow-200",
  active: "bg-green-50 text-green-600 border-green-200",
  suspended: "bg-red-50 text-red-600 border-red-200",
};

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null; // admin token

  const fetchVendors = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const { data } = await axios.get(`/api/marketplace/admin/vendors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setVendors(data.data);
    } catch (e) {
      setError(e.response?.data?.message || "Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, [token, search, statusFilter]);

  const handleStatusChange = async (vendorId, newStatus) => {
    try {
      await axios.put(
        `/api/marketplace/admin/vendors?id=${vendorId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchVendors(); // refresh
    } catch (e) {
      alert(e.response?.data?.message || "Update failed");
    }
  };

  const handleDelete = async (vendorId) => {
    if (!confirm("Delete this vendor?")) return;
    try {
      await axios.delete(`/api/marketplace/admin/vendors?id=${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(prev => prev.filter(v => v._id !== vendorId));
    } catch (e) {
      alert(e.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Vendors</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-300" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-gray-200 bg-white text-sm"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border animate-pulse flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 bg-gray-200 rounded" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No vendors found</div>
      ) : (
        <div className="space-y-3">
          {vendors.map(vendor => (
            <div
              key={vendor._id}
              className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                  vendor.status === "active" ? "bg-green-500" :
                  vendor.status === "pending" ? "bg-amber-500" : "bg-red-500"
                }`}>
                  {vendor.businessName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{vendor.businessName}</h3>
                  <p className="text-sm text-gray-500">{vendor.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {vendor.category?.slice(0, 3).map(cat => (
                      <span key={cat} className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full border border-indigo-100">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS[vendor.status]}`}>
                  {vendor.status}
                </span>
                {/* Status Buttons */}
                <div className="flex gap-1">
                  {vendor.status !== "active" && (
                    <button
                      onClick={() => handleStatusChange(vendor._id, "active")}
                      title="Approve"
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      <FiCheck size={16} />
                    </button>
                  )}
                  {vendor.status !== "suspended" && (
                    <button
                      onClick={() => handleStatusChange(vendor._id, "suspended")}
                      title="Suspend"
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"
                    >
                      <FiUserX size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(vendor._id)}
                    className="p-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200"
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}