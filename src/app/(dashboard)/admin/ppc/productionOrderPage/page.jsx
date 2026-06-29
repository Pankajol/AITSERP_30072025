"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaIndustry, FaClipboardList } from "react-icons/fa";
import { useRouter } from "next/navigation";

const ProductionOrderPage = () => {
  const [productionOrders, setProductionOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [resources, setResources] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editOrder, setEditOrder] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formOrderNumber, setFormOrderNumber] = useState("");
  const [formItemCode, setFormItemCode] = useState("");
  const [formItemName, setFormItemName] = useState("");
  const [formQuantity, setFormQuantity] = useState("");
  const [formStatus, setFormStatus] = useState("Pending");
  const [formAssignedMachine, setFormAssignedMachine] = useState("");
  const [formAssignedOperator, setFormAssignedOperator] = useState("");
  const [formAssignedResource, setFormAssignedResource] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [ordersRes, machinesRes, operatorsRes, resourcesRes] = await Promise.all([
        fetch("/api/ppc/production-orders", { headers }),
        fetch("/api/ppc/machines", { headers }),
        fetch("/api/ppc/operators", { headers }),
        fetch("/api/ppc/resources", { headers }),
      ]);

      if (!ordersRes.ok) throw new Error("Failed to fetch production orders");
      if (!machinesRes.ok) throw new Error("Failed to fetch machines");
      if (!operatorsRes.ok) throw new Error("Failed to fetch operators");
      if (!resourcesRes.ok) throw new Error("Failed to fetch resources");

      const ordersData = await ordersRes.json();
      const machinesData = await machinesRes.json();
      const operatorsData = await operatorsRes.json();
      const resourcesData = await resourcesRes.json();

      setProductionOrders(ordersData.data || []);
      setMachines(machinesData.data || []);
      setOperators(operatorsData.data || []);
      setResources(resourcesData.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openModal = (order = null) => {
    setEditOrder(order);
    if (order) {
      setFormOrderNumber(order.orderNumber || "");
      setFormItemCode(order.itemCode || "");
      setFormItemName(order.itemName || "");
      setFormQuantity(order.quantity || "");
      setFormStatus(order.status || "Pending");
      setFormAssignedMachine(order.assignedMachine?._id || order.assignedMachine || "");
      setFormAssignedOperator(order.assignedOperator?._id || order.assignedOperator || "");
      setFormAssignedResource(order.assignedResource?._id || order.assignedResource || "");
    } else {
      setFormOrderNumber("");
      setFormItemCode("");
      setFormItemName("");
      setFormQuantity("");
      setFormStatus("Pending");
      setFormAssignedMachine(machines[0]?._id || "");
      setFormAssignedOperator(operators[0]?._id || "");
      setFormAssignedResource(resources[0]?._id || "");
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditOrder(null);
    setModalError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formOrderNumber.trim() || !formItemCode.trim() || !formQuantity) {
      setModalError("Order Number, Item Code, and Quantity are required.");
      return;
    }

    setSaving(true);
    setModalError(null);

    const payload = {
      orderNumber: formOrderNumber.trim(),
      itemCode: formItemCode.trim(),
      itemName: formItemName.trim(),
      quantity: parseInt(formQuantity),
      status: formStatus,
      assignedMachine: formAssignedMachine || null,
      assignedOperator: formAssignedOperator || null,
      assignedResource: formAssignedResource || null,
    };

    const method = editOrder ? "PUT" : "POST";
    const url = editOrder
      ? `/api/ppc/production-orders/${editOrder._id}`
      : "/api/ppc/production-orders";

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save");
      }
      await fetchData();
      closeModal();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`/api/ppc/production-orders/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to delete");
      }
      await fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredOrders = productionOrders.filter((order) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(q) ||
      order.itemName?.toLowerCase().includes(q) ||
      order.itemCode?.toLowerCase().includes(q)
    );
  });

  // ─── UI Helpers ────────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const statusBadge = (status) => {
    const colors = {
      Pending: "bg-gray-100 text-gray-800",
      "In Progress": "bg-yellow-100 text-yellow-800",
      Completed: "bg-green-100 text-green-800",
    };
    return (
      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${colors[status] || "bg-gray-100 text-gray-800"}`}>
        {status}
      </span>
    );
  };

  const OrderCard = ({ order }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">{order.orderNumber}</p>
          <p className="text-sm font-semibold text-gray-800">{order.itemName}</p>
        </div>
        {statusBadge(order.status)}
      </div>
      <div className="text-xs text-gray-500 space-y-1">
        <p>Qty: {order.quantity}</p>
        <p>Machine: {order.assignedMachine?.name || "N/A"}</p>
        <p>Operator: {order.assignedOperator?.name || "N/A"}</p>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <button onClick={() => openModal(order)} className="p-1.5 text-gray-300 hover:text-indigo-600" aria-label="Edit">
          <FaEdit size={14} />
        </button>
        <button onClick={() => handleDelete(order._id)} className="p-1.5 text-gray-300 hover:text-red-500" aria-label="Delete">
          <FaTrash size={14} />
        </button>
        {/* 🔗 Job Cards button */}
        <button
          onClick={() => router.push(`/admin/ppc/productionOrderPage/${order._id}/jobcards`)}
          className="p-1.5 text-gray-300 hover:text-blue-600"
          title="View Job Cards"
        >
          <FaClipboardList size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaIndustry className="text-indigo-600" /> Production Orders
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage production orders, assign machines, operators and resources
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Order
          </button>
        </div>

        {/* Search Filter */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1">
            <div>
              <Lbl text="Search" />
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  className={`${inputClass} pl-9`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by order number, item name or code..."
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Order #</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Item Name</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Qty</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Machine</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Operator</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">Loading...</td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">No orders found.</td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">{order.orderNumber}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{order.itemName}</td>
                      <td className="px-6 py-4 text-center">{order.quantity}</td>
                      <td className="px-6 py-4 text-center">{statusBadge(order.status)}</td>
                      <td className="px-6 py-4 text-gray-700">{order.assignedMachine?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-gray-700">{order.assignedOperator?.name || "N/A"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openModal(order)} className="p-1.5 text-gray-300 hover:text-indigo-600">
                            <FaEdit size={14} />
                          </button>
                          <button onClick={() => handleDelete(order._id)} className="p-1.5 text-gray-300 hover:text-red-500">
                            <FaTrash size={14} />
                          </button>
                          {/* 🔗 Job Cards button */}
                          <button
                            onClick={() => router.push(`/admin/ppc/productionOrderPage/${order._id}/jobcards`)}
                            className="p-1.5 text-gray-300 hover:text-blue-600"
                            title="View Job Cards"
                          >
                            <FaClipboardList size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading...</p>
          ) : filteredOrders.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No orders found.</p>
          ) : (
            filteredOrders.map((order) => <OrderCard key={order._id} order={order} />)
          )}
        </div>
      </div>

      {/* Modal (same as before) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaIndustry size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editOrder ? "Edit Production Order" : "Add Production Order"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{modalError}</div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Lbl text="Order Number" req />
                  <input type="text" className={inputClass} value={formOrderNumber} onChange={(e) => setFormOrderNumber(e.target.value)} required />
                </div>
                <div>
                  <Lbl text="Item Code" req />
                  <input type="text" className={inputClass} value={formItemCode} onChange={(e) => setFormItemCode(e.target.value)} required />
                </div>
                <div className="sm:col-span-2">
                  <Lbl text="Item Name" req />
                  <input type="text" className={inputClass} value={formItemName} onChange={(e) => setFormItemName(e.target.value)} required />
                </div>
                <div>
                  <Lbl text="Quantity" req />
                  <input type="number" className={inputClass} value={formQuantity} onChange={(e) => setFormQuantity(e.target.value)} required />
                </div>
                <div>
                  <Lbl text="Status" />
                  <select className={inputClass} value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
                <div>
                  <Lbl text="Assigned Machine" />
                  <select className={inputClass} value={formAssignedMachine} onChange={(e) => setFormAssignedMachine(e.target.value)}>
                    <option value="">-- Select --</option>
                    {machines.map((m) => (
                      <option key={m._id} value={m._id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Lbl text="Assigned Operator" />
                  <select className={inputClass} value={formAssignedOperator} onChange={(e) => setFormAssignedOperator(e.target.value)}>
                    <option value="">-- Select --</option>
                    {operators.map((o) => (
                      <option key={o._id} value={o._id}>{o.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Lbl text="Assigned Resource" />
                  <select className={inputClass} value={formAssignedResource} onChange={(e) => setFormAssignedResource(e.target.value)}>
                    <option value="">-- Select --</option>
                    {resources.map((r) => (
                      <option key={r._id} value={r._id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50">
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionOrderPage;