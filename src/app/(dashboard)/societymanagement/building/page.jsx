"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiHome } from "react-icons/fi";

const FIELDS = [
  { name: "societyId", label: "Society *", type: "select", required: true, options: [] },
  { name: "name", label: "Building Name *", type: "text", required: true },
  { name: "code", label: "Short Code", type: "text" },
  { name: "floors", label: "Floors", type: "number", default: 1 },
  { name: "address.line1", label: "Address Line 1", type: "text" },
  { name: "address.city", label: "City", type: "text" },
  { name: "address.pincode", label: "Pincode", type: "text" },
  // checkpoints handled separately
];

export default function BuildingPage() {
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [societies, setSocieties] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({});
  const [checkpoints, setCheckpoints] = useState([]);  // [{ name, latitude, longitude, radius }]
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchBuildings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/societymanagement/building", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBuildings(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  const fetchSocieties = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/societymanagement/society", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        const options = data.data.map(s => ({ value: s._id, label: s.name }));
        FIELDS.find(f => f.name === "societyId").options = options;
        setSocieties(options);
      }
    } catch (e) { console.error(e); }
  }, [token]);

  useEffect(() => { fetchBuildings(); fetchSocieties(); }, [fetchBuildings, fetchSocieties]);

  const resetForm = () => {
    setForm({});
    setCheckpoints([]);
    setEditingId(null);
    setError("");
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };
  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      societyId: item.societyId?._id || item.societyId || "",
      name: item.name || "",
      code: item.code || "",
      floors: item.floors || 1,
      "address.line1": item.address?.line1 || "",
      "address.city": item.address?.city || "",
      "address.pincode": item.address?.pincode || "",
    });
    setCheckpoints(item.checkpoints?.length ? item.checkpoints.map(cp => ({...cp})) : []);
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const addCheckpoint = () => setCheckpoints(prev => [...prev, { name: "", latitude: "", longitude: "", radius: 30 }]);
  const removeCheckpoint = (idx) => setCheckpoints(prev => prev.filter((_, i) => i !== idx));
  const handleCheckpointChange = (idx, field, value) => {
    const updated = [...checkpoints];
    updated[idx] = { ...updated[idx], [field]: value };
    setCheckpoints(updated);
  };

  const buildPayload = () => {
    const payload = { ...form };
    payload.address = {
      line1: form["address.line1"] || "",
      city: form["address.city"] || "",
      pincode: form["address.pincode"] || "",
    };
    delete payload["address.line1"];
    delete payload["address.city"];
    delete payload["address.pincode"];

    payload.checkpoints = checkpoints.filter(cp => cp.name.trim()).map(cp => ({
      name: cp.name,
      latitude: cp.latitude ? parseFloat(cp.latitude) : undefined,
      longitude: cp.longitude ? parseFloat(cp.longitude) : undefined,
      radius: cp.radius ? parseInt(cp.radius) : 30,
    }));
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.societyId || !form.name) {
      setError("Society and Building Name are required.");
      return;
    }
    setSaving(true); setError("");
    const payload = buildPayload();
    try {
      if (editingId) {
        await axios.put(`/api/societymanagement/building?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/societymanagement/building", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm(); setModalOpen(false); fetchBuildings();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this building?")) return;
    await axios.delete(`/api/societymanagement/building?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setBuildings(prev => prev.filter(b => b._id !== id));
  };

  const filtered = useMemo(() =>
    buildings.filter(b =>
      !search ||
      b.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.code?.toLowerCase().includes(search.toLowerCase()) ||
      b.societyId?.name?.toLowerCase().includes(search.toLowerCase())
    ), [buildings, search]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Buildings</h1>
          <p className="text-sm text-gray-400 mt-0.5">{buildings.length} records</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Building
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, code, society..."
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
            <FiHome className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No buildings yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Building" to create one</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.name}</h3>
                  <p className="text-sm text-gray-500">{item.code ? `${item.code} | ` : ""}{item.floors} floor{item.floors>1?"s":""}</p>
                  <p className="text-xs text-gray-400">{item.societyId?.name || "—"}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"><FiEdit2 className="text-xs" /></button>
                  <button onClick={() => handleDelete(item._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><FiTrash2 className="text-xs" /></button>
                </div>
              </div>
              {item.checkpoints?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
                    {item.checkpoints.length} checkpoint{item.checkpoints.length>1?"s":""}
                  </span>
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
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiHome className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Building" : "New Building"}</h2>
                  <p className="text-xs text-gray-400">Define a building / block in a society</p>
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
                    {field.type === "select" ? (
                      <select name={field.name} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
                        <option value="">Select...</option>
                        {field.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <input name={field.name} type={field.type} value={form[field.name] || ""} onChange={handleFieldChange} required={field.required}
                        className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
                        placeholder={`Enter ${field.label.replace(" *","")}`} />
                    )}
                  </div>
                ))}

                {/* Checkpoints Section */}
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-800">Checkpoints (Gates / Entrances)</h3>
                    <button type="button" onClick={addCheckpoint} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><FiPlus className="text-sm" /> Add</button>
                  </div>
                  {checkpoints.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No checkpoints added.</p>
                  ) : (
                    <div className="space-y-3">
                      {checkpoints.map((cp, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-gray-500">Checkpoint {idx + 1}</span>
                            <button type="button" onClick={() => removeCheckpoint(idx)} className="text-red-400 hover:text-red-600 text-xs"><FiTrash2 /></button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <input type="text" placeholder="Name *" value={cp.name}
                              onChange={e => handleCheckpointChange(idx, "name", e.target.value)}
                              className="col-span-2 py-2 px-3 rounded-lg border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400" />
                            <input type="number" step="any" placeholder="Latitude" value={cp.latitude}
                              onChange={e => handleCheckpointChange(idx, "latitude", e.target.value)}
                              className="py-2 px-3 rounded-lg border border-gray-200 text-xs" />
                            <input type="number" step="any" placeholder="Longitude" value={cp.longitude}
                              onChange={e => handleCheckpointChange(idx, "longitude", e.target.value)}
                              className="py-2 px-3 rounded-lg border border-gray-200 text-xs" />
                            <input type="number" placeholder="Radius (m)" value={cp.radius}
                              onChange={e => handleCheckpointChange(idx, "radius", e.target.value)}
                              className="py-2 px-3 rounded-lg border border-gray-200 text-xs" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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