"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import toast, { Toaster } from "react-hot-toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiAlertCircle,
  FiLoader, FiHome, FiUser, FiPhone, FiMapPin
} from "react-icons/fi";

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800",
  Assigned: "bg-blue-100 text-blue-800",
  InProgress: "bg-indigo-100 text-indigo-800",
  Resolved: "bg-green-100 text-green-800",
  Closed: "bg-gray-100 text-gray-800",
};

const PRIORITY_COLORS = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  Emergency: "bg-red-100 text-red-700",
};

const FIELDS = [
  { name: "societyId", label: "Society *", type: "select", required: true, adminOnly: false },
  { name: "flatId", label: "Flat *", type: "select", required: true, adminOnly: false },
  { name: "raisedBy.name", label: "Name", type: "text" },
  { name: "raisedBy.phone", label: "Phone", type: "tel" },
  { name: "category", label: "Category *", type: "select", required: true, options: [
    { value: "Plumbing", label: "Plumbing" },
    { value: "Electrical", label: "Electrical" },
    { value: "Cleaning", label: "Cleaning" },
    { value: "Security", label: "Security" },
    { value: "CommonArea", label: "Common Area" },
    { value: "Other", label: "Other" },
  ]},
  { name: "subCategory", label: "Sub Category", type: "text" },
  { name: "description", label: "Description *", type: "textarea", required: true },
  { name: "priority", label: "Priority", type: "select", options: [
    { value: "Low", label: "Low" },
    { value: "Medium", label: "Medium" },
    { value: "High", label: "High" },
    { value: "Emergency", label: "Emergency" },
  ]},
  { name: "status", label: "Status", type: "select", options: [
    { value: "Pending", label: "Pending" },
    { value: "Assigned", label: "Assigned" },
    { value: "InProgress", label: "In Progress" },
    { value: "Resolved", label: "Resolved" },
    { value: "Closed", label: "Closed" },
  ]},
  { name: "assignedTo", label: "Assign to Employee", type: "select", options: [], adminOnly: true },
];

export default function ComplaintPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [societies, setSocieties] = useState([]);
  const [flats, setFlats] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [residentProfile, setResidentProfile] = useState(null);

  // Load token
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
  }, []);

  // Decode token
  useEffect(() => {
    if (!token) {
      setLoadingUser(false);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch (err) {
      console.error("Token decode error", err);
      toast.error("Session expired");
    } finally {
      setLoadingUser(false);
    }
  }, [token]);

  const isResident = user?.role === "Resident" || user?.roles?.includes?.("Resident");
  const isAdmin = !isResident && user !== null;

  // Fetch resident profile once
  const fetchResidentProfile = useCallback(async () => {
    if (!isResident || !token || !user?.email || residentProfile) return;
    setProfileLoading(true);
    try {
      const { data } = await axios.get(`/api/societymanagement/resident?search=${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && data.data.length > 0) {
        const profile = data.data[0];
        setResidentProfile(profile);
        // Build flat options
        const flatOptions = (profile.flatIds || []).map(flat => {
          if (flat && typeof flat === 'object' && flat._id) {
            return { value: flat._id, label: flat.flatNumber || "Unknown" };
          }
          return { value: flat, label: `Flat ${flat}` };
        });
        setFlats(flatOptions);
        const societyId = profile.societyId?._id || profile.societyId;
        const firstFlatId = flatOptions.length > 0 ? flatOptions[0].value : "";
        setFormData({
          societyId: societyId,
          flatId: firstFlatId,
          "raisedBy.name": profile.name || "",
          "raisedBy.phone": profile.phone || "",
          category: "",
          subCategory: "",
          description: "",
          priority: "Medium",
          status: "Pending",
          assignedTo: "",
        });
        toast.success("Profile loaded");
      } else {
        toast.error("Resident profile not found");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load profile");
    } finally {
      setProfileLoading(false);
    }
  }, [isResident, token, user, residentProfile]);

  // Fetch complaints (only once after resident profile loads)
  const fetchComplaints = useCallback(async () => {
    if (!token) return;
    setLoadingComplaints(true);
    try {
      let url = "/api/societymanagement/complaint";
      if (isResident && residentProfile?.phone) {
        url += `?search=${encodeURIComponent(residentProfile.phone)}`;
      }
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setComplaints(data.data);
    } catch (err) {
      toast.error("Failed to load complaints");
    } finally {
      setLoadingComplaints(false);
    }
  }, [token, isResident, residentProfile]);

  // Admin data fetch (once)
  const fetchSocieties = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get("/api/societymanagement/society", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setSocieties(data.data.map(s => ({ value: s._id, label: s.name })));
    } catch (err) { console.error(err); }
  }, [token, isAdmin]);

  const fetchEmployees = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get("/api/hr/employees", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setEmployees(data.data.map(e => ({ value: e._id, label: e.fullName })));
    } catch (err) { console.error(err); }
  }, [token, isAdmin]);

  // Initial load
  useEffect(() => {
    if (loadingUser) return;
    if (!token) return;
    if (isResident) {
      fetchResidentProfile();
    } else if (isAdmin) {
      fetchSocieties();
      fetchEmployees();
      fetchComplaints();
    }
  }, [loadingUser, token, isResident, isAdmin, fetchResidentProfile, fetchSocieties, fetchEmployees, fetchComplaints]);

  // When resident profile loads, fetch complaints
  useEffect(() => {
    if (residentProfile && isResident) {
      fetchComplaints();
    }
  }, [residentProfile, isResident, fetchComplaints]);

  // Reset form for modal
  const resetForm = () => {
    if (isResident && residentProfile) {
      const flatOptions = (residentProfile.flatIds || []).map(flat => ({
        value: flat._id || flat,
        label: flat.flatNumber || (typeof flat === 'object' ? flat.flatNumber : flat) || "Unknown",
      }));
      setFormData({
        societyId: residentProfile.societyId?._id || residentProfile.societyId,
        flatId: flatOptions.length > 0 ? flatOptions[0].value : "",
        "raisedBy.name": residentProfile.name || "",
        "raisedBy.phone": residentProfile.phone || "",
        category: "",
        subCategory: "",
        description: "",
        priority: "Medium",
        status: "Pending",
        assignedTo: "",
      });
      setFlats(flatOptions);
    } else {
      setFormData({});
      setFlats([]);
    }
    setEditingId(null);
    setError("");
  };

  const openCreateModal = () => {
    if (isResident && !residentProfile) {
      toast.error("Profile not loaded yet. Please wait.");
      return;
    }
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (complaint) => {
    setEditingId(complaint._id);
    setFormData({
      societyId: complaint.societyId?._id || complaint.societyId || "",
      flatId: complaint.flatId?._id || complaint.flatId || "",
      "raisedBy.name": complaint.raisedBy?.name || "",
      "raisedBy.phone": complaint.raisedBy?.phone || "",
      category: complaint.category || "",
      subCategory: complaint.subCategory || "",
      description: complaint.description || "",
      priority: complaint.priority || "Medium",
      status: complaint.status || "Pending",
      assignedTo: complaint.assignedTo?._id || complaint.assignedTo || "",
    });
    if (!isResident && complaint.societyId) {
      const sid = complaint.societyId._id || complaint.societyId;
      await fetchFlatsForAdmin(sid);
    } else if (isResident && residentProfile) {
      const flatOptions = (residentProfile.flatIds || []).map(flat => ({
        value: flat._id || flat,
        label: flat.flatNumber || "Flat",
      }));
      setFlats(flatOptions);
    }
    setModalOpen(true);
  };

  const fetchFlatsForAdmin = async (societyId) => {
    if (!societyId) return;
    try {
      const { data } = await axios.get(`/api/societymanagement/flat?societyId=${societyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
    } catch (err) { console.error(err); }
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (!isResident && name === "societyId") fetchFlatsForAdmin(value);
  };

const handleSubmit = async (e) => {
  e.preventDefault();
  if (!formData.societyId || !formData.flatId || !formData.category || !formData.description) {
    setError("Society, Flat, Category and Description required.");
    return;
  }
  setSaving(true);
  setError("");
  const toastId = toast.loading(editingId ? "Updating..." : "Creating...");
  try {
    const submitData = { ...formData };
    
    // ✅ Fix: For residents, remove assignedTo completely
    if (isResident) {
      delete submitData.assignedTo;
    } else if (submitData.assignedTo === "" || submitData.assignedTo === undefined) {
      submitData.assignedTo = null;
    }

    const url = editingId
      ? `/api/societymanagement/complaint?id=${editingId}`
      : "/api/societymanagement/complaint";
    const method = editingId ? axios.put : axios.post;
    await method(url, submitData, { headers: { Authorization: `Bearer ${token}` } });
    toast.success(editingId ? "Updated" : "Created", { id: toastId });
    resetForm();
    setModalOpen(false);
    fetchComplaints();
  } catch (err) {
    const msg = err.response?.data?.message || "Operation failed";
    toast.error(msg, { id: toastId });
    setError(msg);
  } finally {
    setSaving(false);
  }
};

  const handleDelete = async (id) => {
    if (!confirm("Delete this complaint?")) return;
    const toastId = toast.loading("Deleting...");
    try {
      await axios.delete(`/api/societymanagement/complaint?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted", { id: toastId });
      setComplaints(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      toast.error("Delete failed", { id: toastId });
    }
  };

  const filteredComplaints = useMemo(() => complaints.filter(c =>
    !search ||
    c.description?.toLowerCase().includes(search.toLowerCase()) ||
    c.raisedBy?.name?.toLowerCase().includes(search.toLowerCase()) ||
    c.flatId?.flatNumber?.toLowerCase().includes(search.toLowerCase())
  ), [complaints, search]);

  if (loadingUser) {
    return <div className="flex justify-center items-center h-screen"><FiLoader className="animate-spin text-3xl text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Complaints</h1>
          <p className="text-gray-500 mt-1">Manage resident complaints</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={isResident && profileLoading}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition disabled:opacity-50"
        >
          <FiPlus /> New Complaint
        </button>
      </div>

      <div className="relative max-w-md mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by description, name or flat..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      {loadingComplaints ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-40 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredComplaints.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <FiAlertCircle className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No complaints found</p>
          {!search && <button onClick={openCreateModal} className="mt-2 text-indigo-600 hover:underline">Add your first complaint</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredComplaints.map(complaint => (
            <ComplaintCard key={complaint._id} complaint={complaint} onEdit={openEditModal} onDelete={handleDelete} isAdmin={isAdmin} />
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold">{editingId ? "Edit Complaint" : "New Complaint"}</h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-1 rounded-full hover:bg-gray-100"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2"><FiAlertCircle />{error}</div>}
              {FIELDS.map(field => {
                if (field.adminOnly && !isAdmin) return null;
                const isReadOnly = isResident && (field.name === "societyId" || field.name === "raisedBy.name" || field.name === "raisedBy.phone");
                if (field.type === "textarea") {
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-semibold mb-1">{field.label}</label>
                      <textarea
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleFieldChange}
                        required={field.required}
                        rows={3}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  );
                }
                return (
                  <div key={field.name}>
                    <label className="block text-sm font-semibold mb-1">{field.label}</label>
                    {field.type === "select" ? (
                      <select
                        name={field.name}
                        value={formData[field.name] || ""}
                        onChange={handleFieldChange}
                        required={field.required}
                        disabled={isReadOnly}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 disabled:bg-gray-50"
                      >
                        <option value="">Select...</option>
                        {field.name === "societyId" && !isResident && societies.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        {field.name === "societyId" && isResident && formData.societyId && (
                          <option value={formData.societyId}>{residentProfile?.societyId?.name || "My Society"}</option>
                        )}
                        {field.name === "flatId" && flats.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        {field.name === "assignedTo" && employees.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        {field.name !== "societyId" && field.name !== "flatId" && field.name !== "assignedTo" && field.options?.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    ) : (
                      <input
                        name={field.name}
                        type={field.type}
                        value={formData[field.name] || ""}
                        onChange={handleFieldChange}
                        required={field.required}
                        disabled={isReadOnly}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-indigo-400 disabled:bg-gray-50"
                      />
                    )}
                  </div>
                );
              })}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <FiLoader className="animate-spin" /> : (editingId ? "Update" : "Create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ComplaintCard({ complaint, onEdit, onDelete, isAdmin }) {
  return (
    <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{complaint.category}{complaint.subCategory && ` – ${complaint.subCategory}`}</h3>
          <p className="text-gray-600 text-sm mt-1 line-clamp-2">{complaint.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
            <FiMapPin className="text-indigo-400" /> {complaint.flatId?.flatNumber || "—"} · {complaint.societyId?.name || "—"}
          </div>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => onEdit(complaint)} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><FiEdit2 size={14} /></button>
          {isAdmin && <button onClick={() => onDelete(complaint._id)} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={14} /></button>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mt-4">
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[complaint.status] || "bg-gray-100"}`}>{complaint.status}</span>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_COLORS[complaint.priority] || "bg-gray-100"}`}>{complaint.priority}</span>
        {complaint.raisedBy?.name && <span className="text-xs text-gray-500 flex items-center gap-1"><FiUser size={10} />{complaint.raisedBy.name}</span>}
        {complaint.raisedBy?.phone && <span className="text-xs text-gray-500 flex items-center gap-1"><FiPhone size={10} />{complaint.raisedBy.phone}</span>}
      </div>
    </div>
  );
}