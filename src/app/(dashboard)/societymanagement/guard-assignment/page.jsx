"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUserCheck } from "react-icons/fi";

const FIELDS = [
  { name: "userId", label: "Staff (CompanyUser) *", type: "select", required: true },
  { name: "societyId", label: "Society *", type: "select", required: true },
  { name: "buildingId", label: "Building", type: "select" },   // ✅ new
  { name: "shiftId", label: "Shift", type: "select" },
  { name: "customShiftStart", label: "Custom Shift Start (HH:MM)", type: "time" },
  { name: "customShiftEnd", label: "Custom Shift End (HH:MM)", type: "time" },
  { name: "startDate", label: "Start Date", type: "date" },
  { name: "isActive", label: "Active", type: "checkbox" },
  { name: "dailyRate", label: "Daily Rate", type: "number" },
];

export default function GuardAssignmentPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ isActive: true });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [staffList, setStaffList] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [buildings, setBuildings] = useState([]);      // ✅ new
  const [shifts, setShifts] = useState([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const API = "/api/societymanagement/guard-assignment";

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setRecords(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  const fetchStaff = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/company/users", { headers: { Authorization: `Bearer ${token}` } });
      if (data) {
        const guards = (Array.isArray(data) ? data : []).filter(
          (u) => u.roles?.includes("Guard") || u.roles?.includes("Housekeeper")
        );
        setStaffList(guards.map((u) => ({ value: u._id, label: u.name })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchSocieties = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/societymanagement/society", { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setSocieties(data.data.map((s) => ({ value: s._id, label: s.name })));
    } catch (e) { console.error(e); }
  }, [token]);

  const fetchShifts = useCallback(async () => {
    try {
      const { data } = await axios.get("/api/hr/shifts", { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setShifts(data.data.map((s) => ({ value: s._id, label: s.name })));
    } catch (e) { console.error(e); }
  }, [token]);

  // ✅ Fetch buildings for a given society
  const fetchBuildings = async (societyId) => {
    if (!societyId) {
      setBuildings([]);
      return;
    }
    try {
      const { data } = await axios.get(`/api/societymanagement/building?societyId=${societyId}&limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setBuildings(data.data.map(b => ({ value: b._id, label: b.name })));
      } else {
        setBuildings([]);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchData(); fetchStaff(); fetchSocieties(); fetchShifts(); }, [fetchData, fetchStaff, fetchSocieties, fetchShifts]);

  const resetForm = () => {
    setForm({ isActive: true });
    setEditingId(null);
    setError("");
    setBuildings([]);
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };
  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      userId: item.userId?._id || item.userId || "",
      societyId: item.societyId?._id || item.societyId || "",
      buildingId: item.buildingId?._id || item.buildingId || "",   // ✅
      shiftId: item.shiftId?._id || item.shiftId || "",
      customShiftStart: item.customShiftStart || "",
      customShiftEnd: item.customShiftEnd || "",
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      isActive: item.isActive,
      dailyRate: item.dailyRate || "",
    });
    if (item.societyId) {
      const sid = item.societyId._id || item.societyId;
      fetchBuildings(sid);
    }
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    if (name === "societyId") {
      fetchBuildings(value);
      setForm((prev) => ({ ...prev, buildingId: "" })); // reset building
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.societyId) {
      setError("Staff and Society are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = { ...form };
      if (!payload.buildingId) delete payload.buildingId;   // optional
      if (editingId) {
        await axios.put(`${API}?id=${editingId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(API, payload, { headers: { Authorization: `Bearer ${token}` } });
      }
      setModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this assignment?")) return;
    await axios.delete(`${API}?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const filtered = useMemo(
    () => records.filter(
      (r) => !search ||
        r.userId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.societyId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.buildingId?.name?.toLowerCase().includes(search.toLowerCase())
    ),
    [records, search]
  );

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Guard Assignments</h1>
          <p className="text-sm text-gray-400 mt-0.5">{records.length} records</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200"
        >
          <FiPlus className="text-base" /> New Assignment
        </button>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search staff, society, building..."
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
            <FiUserCheck className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No assignments yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Assign a guard or housekeeper to a society / building</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item._id}
              className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.userId?.name || "N/A"}</h3>
                  <p className="text-sm text-gray-500">{item.societyId?.name}</p>
                  {item.buildingId && <p className="text-xs text-gray-400">{item.buildingId.name}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {item.shiftId ? item.shiftId.name : item.customShiftStart ? `${item.customShiftStart}-${item.customShiftEnd}` : "Flexible"}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">Start: {item.startDate ? new Date(item.startDate).toLocaleDateString() : "N/A"}</p>

                  <p className="text-xs text-gray-400 mt-0.5">
                    End: {item.endDate ? new Date(item.endDate).toLocaleDateString() : "N/A"}
                  </p>
                  {/* building name */}
                  <p className="text-xs text-gray-400 mt-0.5">Building: {item.buildingId ? item.buildingId.name : ""}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(item)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
                    <FiEdit2 className="text-xs" />
                  </button>
                  <button onClick={() => handleDelete(item._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${item.isActive ? "bg-green-50 text-green-700 border-green-100" : "bg-gray-50 text-gray-500 border-gray-100"}`}>
                  {item.isActive ? "Active" : "Inactive"}
                </span>
                {item.dailyRate && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">₹{item.dailyRate}/day</span>}
              </div>
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
                  <FiUserCheck className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Assignment" : "New Assignment"}</h2>
                  <p className="text-xs text-gray-400">Assign guard/housekeeper to a society / building</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <FiX className="text-red-500" />
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                {FIELDS.map((field) => {
                  let options = field.options;
                  if (field.name === "userId") options = staffList;
                  else if (field.name === "societyId") options = societies;
                  else if (field.name === "buildingId") options = buildings;   // ✅
                  else if (field.name === "shiftId") options = shifts;

                  if (field.type === "checkbox")
                    return (
                      <div key={field.name} className="flex items-center gap-3">
                        <input
                          id={field.name}
                          name={field.name}
                          type="checkbox"
                          checked={form[field.name] || false}
                          onChange={handleFieldChange}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <label htmlFor={field.name} className="text-sm font-medium text-gray-700">{field.label}</label>
                      </div>
                    );

                  return (
                    <div key={field.name}>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{field.label}</label>
                      {field.type === "select" ? (
                        <select
                          name={field.name}
                          value={form[field.name] || ""}
                          onChange={handleFieldChange}
                          required={field.required}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        >
                          <option value="">Select...</option>
                          {(options || []).map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          name={field.name}
                          type={field.type}
                          value={form[field.name] || ""}
                          onChange={handleFieldChange}
                          required={field.required}
                          className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"
                          placeholder={`Enter ${field.label.replace(" *", "")}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">Cancel</button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`inline-flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold ${saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"}`}
                >
                  {saving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <FiPlus className="text-sm" /> {editingId ? "Update" : "Create"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}