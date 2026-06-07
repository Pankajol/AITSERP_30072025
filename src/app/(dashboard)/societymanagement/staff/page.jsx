"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiUser } from "react-icons/fi";

const FIELDS = [
  { name: "fullName", label: "Full Name *", type: "text", required: true },
  { name: "employeeCode", label: "Employee Code", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "phone", label: "Phone", type: "text" },
  { name: "gender", label: "Gender", type: "select", options: [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
  ]},
  { name: "joiningDate", label: "Joining Date", type: "date" },
  { name: "employmentType", label: "Employment Type", type: "select", options: [
    { value: "Full-Time", label: "Full-Time" },
    { value: "Part-Time", label: "Part-Time" },
    { value: "Contract", label: "Contract" },
    { value: "Intern", label: "Intern" },
  ]},
  { name: "staffRole", label: "Staff Role", type: "select", options: [
    { value: "Guard", label: "Guard" },
    { value: "Housekeeper", label: "Housekeeper" },
    { value: "Supervisor", label: "Supervisor" },
    { value: "Other", label: "Other" },
  ]},
  { name: "address", label: "Address", type: "text" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ employmentType: "Contract", staffRole: "Guard" });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch all employees (filtered by staff roles)
  const fetchStaff = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      // HR API से सारे एम्प्लॉई लाओ और फिर क्लाइंट-साइड फिल्टर करो
      const { data } = await axios.get("/api/hr/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        // केवल वे एम्प्लॉई दिखाओ जो guard, housekeeper, supervisor आदि हैं (designation से पहचान)
        const filtered = (data.data || []).filter(emp =>
          emp.designation?.title &&
          ["Guard", "Housekeeper", "Supervisor", "Security Guard"].includes(emp.designation.title)
        );
        setStaff(filtered);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  // भेजते समय designation स्ट्रिंग को ऑब्जेक्ट में बदलना पड़ेगा (if API expects ref)
  // मान लिया कि Employee API सीधे designation: "Guard" ले सकती है; otherwise, backend में संभाल लो
  const buildPayload = () => {
    const payload = { ...form };
    // staffRole को designation में बदलो (स्ट्रिंग ही रखो, बैकएंड ऑब्जेक्ट बना देगा)
    payload.designation = form.staffRole; 
    delete payload.staffRole;
    return payload;
  };

  const resetForm = () => {
    setForm({ employmentType: "Contract", staffRole: "Guard" });
    setEditingId(null);
    setError("");
  };

  const openCreate = () => { resetForm(); setModalOpen(true); };

  const openEdit = (emp) => {
    setEditingId(emp._id);
    setForm({
      fullName: emp.fullName,
      employeeCode: emp.employeeCode || "",
      email: emp.email || "",
      phone: emp.phone || "",
      gender: emp.gender || "",
      joiningDate: emp.joiningDate ? emp.joiningDate.split("T")[0] : "",
      employmentType: emp.employmentType || "Contract",
      staffRole: emp.designation?.title || emp.designation || "Guard",
      address: emp.address || "",
    });
    setModalOpen(true);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName) {
      setError("Full Name is required.");
      return;
    }
    setSaving(true); setError("");
    const payload = buildPayload();
    try {
      if (editingId) {
        await axios.put(`/api/hr/employees?id=${editingId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/hr/employees", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      resetForm(); setModalOpen(false); fetchStaff();
    } catch (err) {
      setError(err.response?.data?.message || "Error saving");
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this staff member?")) return;
    await axios.delete(`/api/hr/employees?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setStaff(prev => prev.filter(s => s._id !== id));
  };

  const filtered = useMemo(() =>
    staff.filter(s =>
      !search ||
      s.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      s.employeeCode?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search)
    ), [staff, search]);

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-400 mt-0.5">{staff.length} guards / housekeepers</p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Add Staff
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search name, code, phone..." />
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
            <FiUser className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No staff added yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Add Staff" to onboard a guard or housekeeper</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{item.fullName}</h3>
                  <p className="text-sm text-gray-500">{item.employeeCode || "—"}</p>
                  <p className="text-xs text-gray-400">{item.designation?.title || item.designation || ""}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100">
                  <button onClick={() => openEdit(item)}
                    className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100"><FiEdit2 className="text-xs" /></button>
                  <button onClick={() => handleDelete(item._id)}
                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><FiTrash2 className="text-xs" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {item.employmentType && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-600 border border-blue-100">{item.employmentType}</span>}
                {item.phone && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-green-50 text-green-600 border border-green-100">{item.phone}</span>}
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
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center"><FiUser className="text-white text-base" /></div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingId ? "Edit Staff" : "New Staff"}</h2>
                  <p className="text-xs text-gray-400">Guard / Housekeeper onboarding</p>
                </div>
              </div>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5 space-y-4">
                {error && <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2"><FiX /> {error}</div>}
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