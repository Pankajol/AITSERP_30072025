"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUserCheck } from "react-icons/fi";

export default function StaffDeploymentPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ isActive: true });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [employees, setEmployees] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [shifts, setShifts] = useState([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const API = "/api/societymanagement/staff-deployment";

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(API, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setRecords(data.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  const fetchEmployees = async () => {
    const { data } = await axios.get("/api/hr/employees", { headers: { Authorization: `Bearer ${token}` } });
    if (data.success) setEmployees(data.data.map(e => ({ value: e._id, label: e.fullName })));
  };
  const fetchSocieties = async () => {
    const { data } = await axios.get("/api/societymanagement/society", { headers: { Authorization: `Bearer ${token}` } });
    if (data.success) setSocieties(data.data.map(s => ({ value: s._id, label: s.name })));
  };
  const fetchShifts = async () => {
    const { data } = await axios.get("/api/hr/shifts", { headers: { Authorization: `Bearer ${token}` } });
    if (data.success) setShifts(data.data.map(s => ({ value: s._id, label: s.name })));
  };

  useEffect(() => { fetchData(); fetchEmployees(); fetchSocieties(); fetchShifts(); }, []);

  const openCreate = () => { setForm({ isActive: true }); setEditingId(null); setModalOpen(true); };
  const openEdit = (item) => {
    setEditingId(item._id);
    setForm({
      employeeId: item.employeeId?._id || item.employeeId,
      societyId: item.societyId?._id || item.societyId,
      shiftId: item.shiftId?._id || item.shiftId,
      customShiftStart: item.customShiftStart || "",
      customShiftEnd: item.customShiftEnd || "",
      startDate: item.startDate?.split("T")[0] || "",
      endDate: item.endDate?.split("T")[0] || "",
      isActive: item.isActive,
      dailyRate: item.dailyRate || "",
      billingCycle: item.billingCycle || "Monthly",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId || !form.societyId || !form.startDate) {
      setError("Employee, Society, Start Date required."); return;
    }
    setSaving(true);
    try {
      if (editingId) await axios.put(`${API}?id=${editingId}`, form, { headers: { Authorization: `Bearer ${token}` } });
      else await axios.post(API, form, { headers: { Authorization: `Bearer ${token}` } });
      setModalOpen(false); fetchData();
    } catch (err) { setError(err.response?.data?.message || "Error"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete?")) return;
    await axios.delete(`${API}?id=${id}`, { headers: { Authorization: `Bearer ${token}` } });
    fetchData();
  };

  const filtered = useMemo(() => records.filter(r =>
    !search || r.employeeId?.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    r.societyId?.name?.toLowerCase().includes(search.toLowerCase())
  ), [records, search]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      <div className="flex justify-between mb-4">
        <h1 className="text-2xl font-bold">Staff Deployments</h1>
        <button onClick={openCreate} className="bg-indigo-600 text-white px-4 py-2 rounded-xl"><FiPlus className="inline mr-1" />New</button>
      </div>
      <input className="border rounded-xl px-3 py-2 mb-4 w-64" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
      {loading ? <p>Loading...</p> : filtered.length === 0 ? <p className="text-gray-400">No deployments</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item._id} className="bg-white p-4 rounded-xl shadow border">
              <div className="flex justify-between">
                <div>
                  <h3 className="font-bold">{item.employeeId?.fullName || "N/A"}</h3>
                  <p className="text-sm text-gray-500">{item.societyId?.name}</p>
                  <p className="text-xs">{item.shiftId?.name || (item.customShiftStart ? `${item.customShiftStart}-${item.customShiftEnd}` : "Flexible")}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(item)}><FiEdit2 /></button>
                  <button onClick={() => handleDelete(item._id)}><FiTrash2 /></button>
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${item.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{item.isActive ? "Active" : "Inactive"}</span>
            </div>
          ))}
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-bold">{editingId ? "Edit" : "New"} Deployment</h2>
              <button onClick={() => setModalOpen(false)}><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <select name="employeeId" value={form.employeeId} onChange={e => setForm({...form, employeeId: e.target.value})} className="w-full border rounded-xl px-3 py-2" required>
                <option value="">Select Employee</option>
                {employees.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select name="societyId" value={form.societyId} onChange={e => setForm({...form, societyId: e.target.value})} className="w-full border rounded-xl px-3 py-2" required>
                <option value="">Select Society</option>
                {societies.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select name="shiftId" value={form.shiftId} onChange={e => setForm({...form, shiftId: e.target.value})} className="w-full border rounded-xl px-3 py-2">
                <option value="">Select Shift</option>
                {shifts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input type="date" name="startDate" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} className="w-full border rounded-xl px-3 py-2" required />
              <input type="number" name="dailyRate" placeholder="Daily Rate" value={form.dailyRate} onChange={e => setForm({...form, dailyRate: e.target.value})} className="w-full border rounded-xl px-3 py-2" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} /> Active</label>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-100 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl">{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}