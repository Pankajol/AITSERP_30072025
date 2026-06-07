"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiSearch, FiX, FiTruck, FiUser } from "react-icons/fi";
import { format } from "date-fns";

const FIELDS = [
  { name: "societyId", label: "Society *", type: "select", required: true, options: [] },
  { name: "gateName", label: "Gate Name", type: "text" },
  { name: "entryType", label: "Entry Type *", type: "select", required: true, options: [
    { value: "IN", label: "IN" },
    { value: "OUT", label: "OUT" },
  ]},
  { name: "category", label: "Category *", type: "select", required: true, options: [
    { value: "Person", label: "Person" },
    { value: "Bike", label: "Bike" },
    { value: "Car", label: "Car" },
    { value: "Truck", label: "Truck" },
    { value: "Other", label: "Other" },
  ]},
  { name: "personName", label: "Person Name", type: "text" },
  { name: "vehicleNumber", label: "Vehicle Number", type: "text" },
  { name: "purpose", label: "Purpose", type: "text" },
  { name: "contactNumber", label: "Contact Number", type: "text" },
];

export default function GateEntryPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [societyId, setSocietyId] = useState("");
  const [date, setDate] = useState("");
  const [societies, setSocieties] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (societyId) params.append("societyId", societyId);
      if (date) params.append("date", date);
      const { data } = await axios.get(`/api/societymanagement/gate-entry?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setEntries(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token, societyId, date]);

  const fetchSocieties = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/societymanagement/society", { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setSocieties(data.data);
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { fetchData(); fetchSocieties(); }, [fetchData, fetchSocieties]);

  const openModal = () => {
    setForm({ societyId: societyId || "" }); // prefill if filter selected
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.societyId || !form.entryType || !form.category) {
      setError("Society, Entry Type, Category required.");
      return;
    }
    setSaving(true); setError("");
    try {
      await axios.post("/api/societymanagement/gate-entry", form, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const categoryIcons = { Person: <FiUser className="text-blue-500" />, Bike: <FiTruck className="text-green-500" />, Car: <FiTruck className="text-purple-500" />, Truck: <FiTruck className="text-orange-500" />, Other: <FiTruck className="text-gray-500" /> };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Gate Entries (Visitors/Vehicles)</h1>
          <p className="text-sm text-gray-400 mt-0.5">{entries.length} records</p>
        </div>
        <button onClick={openModal} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm">
          <FiPlus className="text-base" /> New Entry
        </button>
      </div>

      <div className="flex flex-wrap gap-4 mb-6">
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Society</label>
          <select value={societyId} onChange={e => setSocietyId(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100">
            <option value="">All</option>
            {societies.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
        </div>
        <div className="w-full sm:w-48">
          <label className="block text-xs font-semibold text-gray-500 mb-1">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-100" />
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-12 bg-white rounded-xl shadow-sm animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-20 text-gray-400">No entries found</div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Person/Vehicle</th>
                  <th className="px-4 py-3 text-left">In/Out</th>
                  <th className="px-4 py-3 text-left">Purpose</th>
                  <th className="px-4 py-3 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {entries.map(e => (
                  <tr key={e._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      {categoryIcons[e.category]} {e.category}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {e.personName || "—"} {e.vehicleNumber && <span className="text-gray-500 text-xs">({e.vehicleNumber})</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${e.entryType === "IN" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                        {e.entryType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{e.purpose || "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{format(new Date(e.timestamp), "dd MMM, hh:mm a")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal for new entry */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">New Gate Entry</h2>
              <button onClick={() => setModalOpen(false)} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl">{error}</div>}
                {FIELDS.map(field => (
                  <div key={field.name}>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{field.label}</label>
                    {field.type === "select" ? (
                      <select name={field.name} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                        className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm">
                        <option value="">Select...</option>
                        {field.name === "societyId" ? societies.map(s => <option key={s._id} value={s._id}>{s.name}</option>) : field.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : (
                      <input name={field.name} type={field.type} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                        className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm" />
                    )}
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold">
                  {saving ? "Saving..." : "Save Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}