"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiClock } from "react-icons/fi";

const FIELDS = [
  { name: "name", label: "Shift Name *", type: "text", required: true },
  { name: "startTime", label: "Start Time *", type: "time", required: true },
  { name: "endTime", label: "End Time *", type: "time", required: true },
  { name: "gracePeriod", label: "Grace Period (min)", type: "number", default: 10 },
  { name: "weeklyOffs", label: "Weekly Offs (comma separated)", type: "text", placeholder: "Sunday, Saturday" },
];

export default function ShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ gracePeriod: 10 });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchShifts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/hr/shifts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setShifts(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchShifts(); }, [fetchShifts]);

  const resetForm = () => {
    setForm({ gracePeriod: 10 });
    setEditingId(null);
    setError("");
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (shift) => {
    setEditingId(shift._id);
    setForm({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriod: shift.gracePeriod || 10,
      weeklyOffs: (shift.weeklyOffs || []).join(", "),
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.startTime || !form.endTime) {
      setError("Name, Start Time, End Time are required.");
      return;
    }
    setSaving(true); setError("");
    try {
      const payload = { ...form };
      // weeklyOffs string को array में बदलो
      if (typeof payload.weeklyOffs === "string") {
        payload.weeklyOffs = payload.weeklyOffs.split(",").map(s => s.trim()).filter(Boolean);
      }
      if (editingId) {
        await axios.put(`/api/hr/shifts?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/hr/shifts", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm();
      setModalOpen(false);
      fetchShifts();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this shift?")) return;
    await axios.delete(`/api/hr/shifts?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setShifts(prev => prev.filter(s => s._id !== id));
  };

  const filtered = useMemo(() =>
    shifts.filter(s =>
      !search ||
      s.name?.toLowerCase().includes(search.toLowerCase())
    ), [shifts, search]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Shifts</h1>
          <p className="text-sm text-gray-400 mt-0.5">{shifts.length} shifts</p>
        </div>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Shift
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search shift name..."
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiClock className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No shifts yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Shift" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(shift => (
            <div key={shift._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{shift.name}</h3>
                  <p className="text-sm text-gray-500">{shift.startTime} - {shift.endTime}</p>
                  <p className="text-xs text-gray-400">Grace: {shift.gracePeriod || 10} min</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(shift)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"><FiEdit2 className="text-xs" /></button>
                  <button onClick={() => handleDelete(shift._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><FiTrash2 className="text-xs" /></button>
                </div>
              </div>
              {shift.weeklyOffs?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {shift.weeklyOffs.map(day => (
                    <span key={day} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">
                      {day}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><FiClock className="text-white text-base" /></div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Shift" : "New Shift"}</h2>
                  <p className="text-xs text-gray-400">Define working hours & offs</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2 rounded-xl flex items-center gap-2"><FiX /> {error}</div>}
                {FIELDS.map(field => (
                  <div key={field.name}>
                    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{field.label}</label>
                    <input
                      name={field.name}
                      type={field.type}
                      value={form[field.name] || ""}
                      onChange={handleFieldChange}
                      required={field.required}
                      step={field.type === "number" ? "1" : ""}
                      className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
                      placeholder={field.placeholder || `Enter ${field.label.replace(" *","")}`}
                    />
                  </div>
                ))}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">Cancel</button>
                <button type="submit" disabled={saving} className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold ${saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"}`}>
                  {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}