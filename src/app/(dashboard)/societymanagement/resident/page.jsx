"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import Select from "react-select";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUser, FiPhone, FiMail, FiHome, FiMapPin } from "react-icons/fi";

export default function ResidentPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ residentType: "Owner", flatIds: [] });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // Dropdown data
  const [societies, setSocieties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [selectedFlats, setSelectedFlats] = useState([]);

  // Fetch residents
  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/societymanagement/resident", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setRecords(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  // Fetch societies
  const fetchSocieties = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/societymanagement/society", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setSocieties(data.data.map(s => ({ value: s._id, label: s.name })));
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch buildings of selected society
  const fetchBuildings = async (societyId) => {
    if (!societyId) { setBuildings([]); return; }
    try {
      const { data } = await axios.get(`/api/societymanagement/building?societyId=${societyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBuildings(data.data.map(b => ({ value: b._id, label: b.name })));
      else setBuildings([]);
    } catch (e) { setBuildings([]); }
  };

  // Fetch flats of selected building + society
  const fetchFlats = async (societyId, buildingId) => {
    if (!societyId || !buildingId) { setFlats([]); return; }
    try {
      const { data } = await axios.get(`/api/societymanagement/flat?societyId=${societyId}&buildingId=${buildingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
      else setFlats([]);
    } catch (e) { setFlats([]); }
  };

  useEffect(() => {
    fetchData();
    fetchSocieties();
  }, [fetchData, fetchSocieties]);

  const resetForm = () => {
    setForm({ residentType: "Owner", flatIds: [] });
    setSelectedFlats([]);
    setBuildings([]);
    setFlats([]);
    setEditingId(null);
    setError("");
    setFieldErrors({});
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = async (item) => {
    setEditingId(item._id);
    const societyId = item.societyId?._id || item.societyId || "";
    const buildingId = item.buildingId?._id || item.buildingId || "";
    const flatIds = (item.flatIds || []).map(f => f._id || f);
    const flatOptions = flats.filter(f => flatIds.includes(f.value));

    setForm({
      societyId,
      buildingId,
      flatIds,
      name: item.name || "",
      phone: item.phone || "",
      email: item.email || "",
      residentType: item.residentType || "Owner",
      moveInDate: item.moveInDate ? item.moveInDate.split("T")[0] : "",
    });
    setSelectedFlats(flatOptions);

    if (societyId) await fetchBuildings(societyId);
    if (societyId && buildingId) {
      await fetchFlats(societyId, buildingId);
      // After flats load, set selected flats again (they might be re-fetched)
      setTimeout(() => {
        const updatedOptions = flats.filter(f => flatIds.includes(f.value));
        setSelectedFlats(updatedOptions);
      }, 100);
    }
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.societyId) errors.societyId = "Society is required";
    if (!form.buildingId) errors.buildingId = "Building is required";
    if (!form.flatIds || form.flatIds.length === 0) errors.flatIds = "At least one flat is required";
    if (!form.name?.trim()) errors.name = "Name is required";
    if (form.phone && !/^[0-9]{10}$/.test(form.phone)) errors.phone = "Phone must be 10 digits";
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) errors.email = "Invalid email";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFieldChange = async (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === "societyId") {
      setForm(prev => ({ ...prev, buildingId: "", flatIds: [] }));
      setSelectedFlats([]);
      await fetchBuildings(value);
      setFlats([]);
    } else if (name === "buildingId") {
      setForm(prev => ({ ...prev, flatIds: [] }));
      setSelectedFlats([]);
      if (form.societyId && value) await fetchFlats(form.societyId, value);
      else setFlats([]);
    }
  };

  const handleFlatsChange = (selectedOptions) => {
    const flatIds = selectedOptions.map(opt => opt.value);
    setForm(prev => ({ ...prev, flatIds }));
    setSelectedFlats(selectedOptions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    setError("");
    try {
      const url = editingId
        ? `/api/societymanagement/resident?id=${editingId}`
        : "/api/societymanagement/resident";
      const method = editingId ? axios.put : axios.post;
      await method(url, form, { headers: { Authorization: `Bearer ${token}` } });
      resetForm();
      setModalOpen(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this resident?")) return;
    try {
      await axios.delete(`/api/societymanagement/resident?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setRecords(prev => prev.filter(r => r._id !== id));
    } catch (err) { console.error(err); }
  };

  const filtered = useMemo(() => records.filter(r =>
    !search ||
    r.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.phone?.includes(search) ||
    (r.flatIds && r.flatIds.some(flat => flat.flatNumber?.toLowerCase().includes(search.toLowerCase())))
  ), [records, search]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Residents</h1>
            <p className="text-sm text-gray-500 mt-0.5">{records.length} records</p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm transition-colors"
          >
            <FiPlus className="text-base" /> Add Resident
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
          <input
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, flat..."
          />
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="h-5 w-32 bg-gray-200 rounded mb-2" />
                <div className="h-4 w-24 bg-gray-100 rounded mb-3" />
                <div className="flex gap-2">
                  <div className="h-6 w-16 bg-gray-100 rounded-full" />
                  <div className="h-6 w-20 bg-gray-100 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <FiUser className="text-4xl text-indigo-300" />
            </div>
            <p className="text-gray-500 font-medium">{search ? "No matches found" : "No residents yet"}</p>
            {!search && <p className="text-sm text-gray-400 mt-1">Click "Add Resident" to get started</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map(item => (
              <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all group">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{item.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <FiMapPin className="text-xs" />
                      <span>{item.buildingId?.name || "—"}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.societyId?.name}</p>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
                      <FiEdit2 className="text-sm" />
                    </button>
                    <button onClick={() => handleDelete(item._id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                      <FiTrash2 className="text-sm" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {item.flatIds?.map(flat => (
                    <span key={flat._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <FiHome className="text-[10px]" /> {flat.flatNumber}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {item.residentType && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                      {item.residentType}
                    </span>
                  )}
                  {item.phone && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-100">
                      <FiPhone className="text-[10px]" /> {item.phone}
                    </span>
                  )}
                  {item.email && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-100">
                      <FiMail className="text-[10px]" /> {item.email}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <FiUser className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Resident" : "New Resident"}</h2>
                  <p className="text-xs text-gray-500">{editingId ? "Update resident details" : "Add a new resident"}</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200">
                <FiX />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                    <FiX className="flex-shrink-0" /> {error}
                  </div>
                )}
                {/* Society */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Society *</label>
                  <select
                    name="societyId"
                    value={form.societyId || ""}
                    onChange={handleFieldChange}
                    className={`w-full py-2.5 px-4 rounded-xl border ${fieldErrors.societyId ? "border-red-300 bg-red-50" : "border-gray-200"} bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                  >
                    <option value="">Select society</option>
                    {societies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  {fieldErrors.societyId && <p className="text-xs text-red-500 mt-1">{fieldErrors.societyId}</p>}
                </div>
                {/* Building */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Building *</label>
                  <select
                    name="buildingId"
                    value={form.buildingId || ""}
                    onChange={handleFieldChange}
                    disabled={!form.societyId}
                    className={`w-full py-2.5 px-4 rounded-xl border ${fieldErrors.buildingId ? "border-red-300 bg-red-50" : "border-gray-200"} bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400`}
                  >
                    <option value="">Select building</option>
                    {buildings.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                  {fieldErrors.buildingId && <p className="text-xs text-red-500 mt-1">{fieldErrors.buildingId}</p>}
                </div>
                {/* Flats (multi-select) */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Flats (multiple) *</label>
                  <Select
                    isMulti
                    options={flats}
                    value={selectedFlats}
                    onChange={handleFlatsChange}
                    placeholder="Select one or more flats"
                    classNamePrefix="react-select"
                    isDisabled={!form.buildingId}
                    styles={{
                      control: (base, state) => ({
                        ...base,
                        borderRadius: '0.75rem',
                        borderColor: fieldErrors.flatIds ? '#fca5a5' : (state.isFocused ? '#6366f1' : '#e5e7eb'),
                        boxShadow: state.isFocused ? '0 0 0 2px #e0e7ff' : 'none',
                        '&:hover': { borderColor: '#6366f1' }
                      })
                    }}
                  />
                  {fieldErrors.flatIds && <p className="text-xs text-red-500 mt-1">{fieldErrors.flatIds}</p>}
                </div>
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Full Name *</label>
                  <input
                    name="name"
                    value={form.name || ""}
                    onChange={handleFieldChange}
                    className={`w-full py-2.5 px-4 rounded-xl border ${fieldErrors.name ? "border-red-300 bg-red-50" : "border-gray-200"} bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                    placeholder="John Doe"
                  />
                  {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
                </div>
                {/* Phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Phone (10 digits)</label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone || ""}
                    onChange={handleFieldChange}
                    className={`w-full py-2.5 px-4 rounded-xl border ${fieldErrors.phone ? "border-red-300 bg-red-50" : "border-gray-200"} bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                    placeholder="9876543210"
                  />
                  {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
                </div>
                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Email</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email || ""}
                    onChange={handleFieldChange}
                    className={`w-full py-2.5 px-4 rounded-xl border ${fieldErrors.email ? "border-red-300 bg-red-50" : "border-gray-200"} bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100`}
                    placeholder="john@example.com"
                  />
                  {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
                </div>
                {/* Resident Type */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Type</label>
                  <select
                    name="residentType"
                    value={form.residentType || "Owner"}
                    onChange={handleFieldChange}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                  </select>
                </div>
                {/* Move-in Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 mb-1.5">Move-in Date</label>
                  <input
                    name="moveInDate"
                    type="date"
                    value={form.moveInDate || ""}
                    onChange={handleFieldChange}
                    className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="inline-flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm">
                  {saving ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <>{editingId ? "Update" : "Create"}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}