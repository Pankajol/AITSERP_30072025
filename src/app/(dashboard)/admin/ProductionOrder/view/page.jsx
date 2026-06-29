"use client";

import React, { useEffect, useState, Suspense } from "react";
import axios from "axios";
import { useSearchParams, useRouter } from "next/navigation";
import { FaArrowLeft, FaEdit, FaIndustry, FaBox, FaCogs, FaCube } from "react-icons/fa";

/* ✅ Wrapper required by Next.js for useSearchParams */
export default function ProductionOrderViewWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 font-medium italic">
          Loading production order...
        </div>
      }
    >
      <ProductionOrderView />
    </Suspense>
  );
}

/* ── Reusable components (outside to avoid re‑creation) ── */
const colorMap = {
  indigo: {
    headerBg: "bg-indigo-50/40",
    iconBg: "bg-indigo-100",
    iconText: "text-indigo-500",
  },
  emerald: {
    headerBg: "bg-emerald-50/40",
    iconBg: "bg-emerald-100",
    iconText: "text-emerald-500",
  },
  amber: {
    headerBg: "bg-amber-50/40",
    iconBg: "bg-amber-100",
    iconText: "text-amber-500",
  },
  blue: {
    headerBg: "bg-blue-50/40",
    iconBg: "bg-blue-100",
    iconText: "text-blue-500",
  },
};

const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => {
  const c = colorMap[color] || colorMap.indigo;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${c.headerBg}`}>
        <div className={`w-8 h-8 rounded-lg ${c.iconBg} flex items-center justify-center ${c.iconText}`}>
          <Icon className="text-sm" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
};

const Lbl = ({ text }) => (
  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
    {text}
  </span>
);

/* ✅ Actual page component */
function ProductionOrderView() {
  const search = useSearchParams();
  const id = search.get("id");
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 1. Get token
  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) setToken(tk);
  }, []);

  // 2. Load order
  useEffect(() => {
    if (!id || !token) return;
    setLoading(true);
    axios
      .get(`/api/production-orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setOrder(res.data);
        setError("");
      })
      .catch((err) => {
        console.error("Error loading order:", err);
        setError("Failed to load production order. It may have been deleted or you lack permission.");
      })
      .finally(() => setLoading(false));
  }, [id, token]);

  if (!id) return <div className="p-6 text-center text-gray-500">No order ID provided.</div>;
  if (loading) return <div className="p-6 text-center text-gray-500">Loading order...</div>;
  if (error) return <div className="p-6 text-center text-red-500">{error}</div>;
  if (!order) return <div className="p-6 text-center text-gray-500">No order data.</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-indigo-600 transition-colors"
            >
              <FaArrowLeft />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-3">
                <FaIndustry className="text-indigo-600" /> Production Order #{order.orderNumber || "—"}
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {order.productDesc || order.bomId?.productDesc || "No description"}
              </p>
            </div>
          </div>
          <button
            onClick={() => router.push(`/admin/ProductionOrder?id=${id}`)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaEdit size={12} /> Edit Order
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Order Details */}
            <SectionCard icon={FaIndustry} title="Order Details" color="indigo">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Detail label="Product Code" value={order.bomId?.productNo?.itemCode || "—"} />
                <Detail label="Product Name" value={order.bomId?.productNo?.itemName || "—"} />
                <Detail label="Type" value={order.type} />
                <Detail label="Status" value={order.status} />
                <Detail label="Priority" value={order.priority} />
                <Detail label="Warehouse" value={order.warehouse?.warehouseName || order.warehouse?.name || "Not assigned"} />
                <Detail label="Planned Quantity" value={order.quantity} />
                <Detail
                  label="Production Date"
                  value={order.productionDate ? new Date(order.productionDate).toLocaleDateString("en-IN") : "—"}
                />
                <Detail label="Created At" value={order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "—"} />
              </div>
            </SectionCard>

            {/* Items Section */}
            <SectionCard icon={FaBox} title="Required Materials" color="emerald">
              {order.items?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Item Code</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Item Name</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Qty</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Total</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Warehouse</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {order.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/20">
                          <td className="px-4 py-3 font-mono text-xs">{item.item?.itemCode || item.itemCode}</td>
                          <td className="px-4 py-3">{item.item?.itemName || item.itemName}</td>
                          <td className="px-4 py-3 text-center">{item.quantity}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            ₹{Number(item.total || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3">{item.warehouse?.warehouseName || item.warehouse?.name || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No materials added.</p>
              )}
            </SectionCard>

            {/* Resources Section */}
            <SectionCard icon={FaCogs} title="Resources" color="blue">
              {order.resources?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Code</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Name</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold uppercase text-gray-400">Qty</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Unit Price</th>
                        <th className="px-4 py-3 text-right text-[10px] font-bold uppercase text-gray-400">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {order.resources.map((res, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/20">
                          <td className="px-4 py-3 font-mono text-xs">{res.code || "—"}</td>
                          <td className="px-4 py-3">{res.name || "—"}</td>
                          <td className="px-4 py-3 text-center">{res.quantity}</td>
                          <td className="px-4 py-3 text-right">₹{Number(res.unitPrice || 0).toLocaleString("en-IN")}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">₹{Number(res.total || 0).toLocaleString("en-IN")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No resources assigned.</p>
              )}
            </SectionCard>

            {/* Operation Flow */}
            <SectionCard icon={FaCube} title="Operation Flow" color="amber">
              {order.operationFlow?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Operation</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Machine</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Operator</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">Start Date</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold uppercase text-gray-400">End Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {order.operationFlow.map((op, idx) => (
                        <tr key={idx} className="hover:bg-indigo-50/20">
                          <td className="px-4 py-3">
                            {op.operation?.name || op.operation?.code || JSON.stringify(op.operation) || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {op.machine?.name || op.machine?.code || JSON.stringify(op.machine) || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {op.operator?.name || op.operator?.fullName || JSON.stringify(op.operator) || "—"}
                          </td>
                          <td className="px-4 py-3">
                            {op.expectedStartDate ? new Date(op.expectedStartDate).toLocaleDateString("en-IN") : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {op.expectedEndDate ? new Date(op.expectedEndDate).toLocaleDateString("en-IN") : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">No operation flow defined.</p>
              )}
            </SectionCard>
          </div>

          {/* Sidebar – Summary (optional) */}
          <div className="space-y-6">
            <div className="bg-indigo-900 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FaIndustry className="text-indigo-300" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-indigo-300">Quick Summary</p>
              </div>
              <div className="space-y-4 font-mono">
                <div className="flex justify-between text-xs text-indigo-200">
                  <span>Total Items</span>
                  <span>{order.items?.length || 0}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-200">
                  <span>Total Resources</span>
                  <span>{order.resources?.length || 0}</span>
                </div>
                <div className="flex justify-between text-xs text-indigo-200">
                  <span>Operations</span>
                  <span>{order.operationFlow?.length || 0}</span>
                </div>
                <hr className="border-white/10" />
                <div className="flex justify-between text-lg font-black tracking-tight">
                  <span>EST. COST</span>
                  <span className="text-emerald-400">
                    ₹{(
                      (order.items?.reduce((sum, i) => sum + (i.total || 0), 0) || 0) +
                      (order.resources?.reduce((sum, r) => sum + (r.total || 0), 0) || 0)
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Reusable Detail component */
function Detail({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-bold uppercase text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-800">{value || "—"}</span>
    </div>
  );
}