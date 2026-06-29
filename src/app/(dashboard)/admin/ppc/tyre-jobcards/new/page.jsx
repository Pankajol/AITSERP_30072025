"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import Select from "react-select";
import { toast } from "react-toastify";
import { FaSave, FaArrowLeft } from "react-icons/fa";

export default function TyreJobCardForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id"); // for edit
  const isEdit = !!id;

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Form state (simplified; in production you'd have all fields)
  const [form, setForm] = useState({
    customer: "",
    vehicleNumber: "",
    tyreSerialNumber: "",
    tyreBrand: "",
    tyreSize: "",
    tyrePattern: "",
    receivedDate: new Date().toISOString().split("T")[0],
    priority: "Normal",
    status: "Received",
  });

  useEffect(() => {
    // Fetch customers from your existing API
    const fetchCustomers = async () => {
      try {
        const res = await axios.get("/api/customers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = res.data.data || res.data || [];
        setCustomers(data.map(c => ({ value: c._id, label: `${c.customerCode} - ${c.customerName}` })));
      } catch (err) { console.error(err); }
    };
    if (token) fetchCustomers();

    if (isEdit) {
      // Load existing job card
      const fetchJobCard = async () => {
        setLoading(true);
        try {
          const res = await axios.get(`/api/ppc/tyre-jobcards?id=${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const jc = res.data.data;
          setForm({
            ...jc,
            customer: jc.customer?._id || jc.customer,
            receivedDate: jc.receivedDate ? new Date(jc.receivedDate).toISOString().split("T")[0] : "",
          });
        } catch (err) { toast.error("Failed to load job card"); } finally { setLoading(false); }
      };
      fetchJobCard();
    }
  }, [id, token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerChange = (selected) => {
    setForm(prev => ({ ...prev, customer: selected?.value || "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.customer || !form.tyreSerialNumber) {
      toast.error("Customer and Tyre Serial are required");
      return;
    }
    setLoading(true);
    try {
      const method = isEdit ? "PUT" : "POST";
      const url = isEdit ? `/api/ppc/tyre-jobcards?id=${id}` : "/api/ppc/tyre-jobcards";
      const res = await axios({
        method,
        url,
        data: form,
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(isEdit ? "Updated" : "Created");
      router.push("/admin/ppc/tyre-jobcards");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-6">
          <FaArrowLeft /> Back
        </button>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-8">
          {isEdit ? "Edit Job Card" : "New Tyre Job Card"}
        </h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Customer *</label>
              <Select
                options={customers}
                value={customers.find(c => c.value === form.customer) || null}
                onChange={handleCustomerChange}
                placeholder="Select customer..."
                isClearable
                className="text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Vehicle Number</label>
              <input name="vehicleNumber" value={form.vehicleNumber} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Tyre Serial Number *</label>
              <input name="tyreSerialNumber" value={form.tyreSerialNumber} onChange={handleChange} required className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Tyre Brand</label>
              <input name="tyreBrand" value={form.tyreBrand} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Tyre Size</label>
              <input name="tyreSize" value={form.tyreSize} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Tyre Pattern</label>
              <input name="tyrePattern" value={form.tyrePattern} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Received Date</label>
              <input type="date" name="receivedDate" value={form.receivedDate} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-400 mb-1">Priority</label>
              <select name="priority" value={form.priority} onChange={handleChange} className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                <option>Normal</option>
                <option>Urgent</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => router.back()} className="px-5 py-2 rounded-lg bg-gray-100 text-sm font-bold text-gray-600 hover:bg-gray-200">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
              <FaSave size={14} /> {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}