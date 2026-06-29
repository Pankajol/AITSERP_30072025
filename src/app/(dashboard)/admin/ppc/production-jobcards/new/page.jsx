"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaSave, FaArrowLeft } from "react-icons/fa";

export default function ProductionJobCardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = !!id;

  const [orders, setOrders] = useState([]);
  const [machines, setMachines] = useState([]);
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [form, setForm] = useState({
    productionOrder: "",
    itemCode: "",
    itemName: "",
    quantity: 1,
    uom: "nos",
    machine: "",
    operator: "",
    expectedStartDate: "",
    expectedEndDate: "",
    status: "Planned",
  });

  useEffect(() => {
    // fetch dropdowns
    const fetchDropdowns = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [ordRes, machRes, operRes] = await Promise.all([
          axios.get("/api/ppc/production-orders", { headers }),
          axios.get("/api/ppc/machines", { headers }),
          axios.get("/api/ppc/operators", { headers }),
        ]);
        setOrders(ordRes.data.data.map(o => ({ value: o._id, label: `${o.orderNumber} - ${o.itemName}` })));
        setMachines(machRes.data.data.map(m => ({ value: m._id, label: m.name })));
        setOperators(operRes.data.data.map(o => ({ value: o._id, label: o.name })));
      } catch (err) {
        toast.error("Failed to load dropdowns");
      }
    };
    if (token) fetchDropdowns();

    if (isEdit && id) {
      const fetchJobCard = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`/api/ppc/production-jobcards?id=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const jc = res.data.data;
          setForm({
            ...jc,
            productionOrder: jc.productionOrder?._id || jc.productionOrder,
            machine: jc.machine?._id || jc.machine,
            operator: jc.operator?._id || jc.operator,
            expectedStartDate: jc.expectedStartDate ? new Date(jc.expectedStartDate).toISOString().split("T")[0] : "",
            expectedEndDate: jc.expectedEndDate ? new Date(jc.expectedEndDate).toISOString().split("T")[0] : "",
          });
        } catch (err) { toast.error("Failed to load"); } finally { setLoading(false); }
      };
      fetchJobCard();
    }
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.productionOrder || !form.itemCode || !form.quantity) {
      toast.error("Order, item code and quantity are required");
      return;
    }
    setLoading(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/ppc/production-jobcards?id=${id}` : "/api/ppc/production-jobcards";
      const res = await axios({
        method,
        url,
        data: form,
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(isEdit ? "Updated" : "Created");
      router.push("/admin/ppc/production-jobcards");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-6">
          <FaArrowLeft /> Back
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-8">
          {isEdit ? "Edit Job Card" : "New Production Job Card"}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Production Order *</label>
              <Select
                options={orders}
                value={orders.find(o => o.value === form.productionOrder) || null}
                onChange={(sel) => setForm(prev => ({ ...prev, productionOrder: sel?.value || "" }))}
                placeholder="Select order..."
                isClearable
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Item Code *</label>
              <input name="itemCode" value={form.itemCode} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Item Name *</label>
              <input name="itemName" value={form.itemName} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border text-sm" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Quantity *</label>
                <input type="number" name="quantity" value={form.quantity} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border text-sm" />
              </div>
              <div className="w-24">
                <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">UOM</label>
                <input name="uom" value={form.uom} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Machine</label>
              <Select
                options={machines}
                value={machines.find(m => m.value === form.machine) || null}
                onChange={(sel) => setForm(prev => ({ ...prev, machine: sel?.value || "" }))}
                placeholder="Assign machine..."
                isClearable
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Operator</label>
              <Select
                options={operators}
                value={operators.find(o => o.value === form.operator) || null}
                onChange={(sel) => setForm(prev => ({ ...prev, operator: sel?.value || "" }))}
                placeholder="Assign operator..."
                isClearable
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Expected Start</label>
              <input type="date" name="expectedStartDate" value={form.expectedStartDate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold uppercase text-gray-400 mb-1 block">Expected End</label>
              <input type="date" name="expectedEndDate" value={form.expectedEndDate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded-lg bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
              <FaSave size={14} /> {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}