"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import toast, { Toaster } from "react-hot-toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiAlertCircle,
  FiLoader, FiFileText, FiLink, FiCalendar, FiUser, FiFlag, FiMapPin, FiEye
} from "react-icons/fi";

export default function NoticeBoardPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ attachments: [], isImportant: false, pinned: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [societies, setSocieties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [attachmentInput, setAttachmentInput] = useState("");

  // Load token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
  }, []);

  // Decode token to get user info
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
      toast.error("Session expired. Please login again.");
    } finally {
      setLoadingUser(false);
    }
  }, [token]);

  const isResident = user?.role === "Resident" || user?.roles?.includes?.("Resident");
  const isAdmin = !isResident && user !== null;

  // Fetch notices
  const fetchNotices = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/societymanagement/notice", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setNotices(data.data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load notices");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Mark a notice as read (only for residents)
  const markAsRead = useCallback(async (noticeId) => {
    if (!isResident) return;
    try {
      await axios.post("/api/societymanagement/notice/mark-read", { noticeId }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotices(prev => prev.map(n =>
        n._id === noticeId && !n.readBy?.includes(user.id)
          ? { ...n, readBy: [...(n.readBy || []), user.id] }
          : n
      ));
    } catch (err) {
      console.error(err);
    }
  }, [token, isResident, user]);

  // Admin data fetching
  const fetchSocieties = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const { data } = await axios.get("/api/societymanagement/society", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setSocieties(data.data.map(s => ({ value: s._id, label: s.name })));
    } catch (err) { console.error(err); }
  }, [token, isAdmin]);

  const fetchBuildings = async (societyId) => {
    if (!societyId) { setBuildings([]); return; }
    try {
      const { data } = await axios.get(`/api/societymanagement/building?societyId=${societyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBuildings(data.data.map(b => ({ value: b._id, label: b.name })));
    } catch (err) { console.error(err); }
  };

  const fetchFlats = async (buildingId) => {
    if (!buildingId) { setFlats([]); return; }
    try {
      const { data } = await axios.get(`/api/societymanagement/flat?buildingId=${buildingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
    } catch (err) { console.error(err); }
  };

  // Initial load
  useEffect(() => {
    if (loadingUser) return;
    if (!token) return;
    fetchNotices();
    if (isAdmin) fetchSocieties();
  }, [loadingUser, token, isAdmin, fetchNotices, fetchSocieties]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      societyId: "",
      buildingId: "",
      flatId: "",
      attachments: [],
      isImportant: false,
      pinned: false,
      expiryDate: "",
      targetAudience: "All",
    });
    setAttachmentInput("");
    setEditingId(null);
    setError("");
    setBuildings([]);
    setFlats([]);
  };

  const addAttachment = () => {
    if (!attachmentInput.trim()) return;
    setFormData(prev => ({ ...prev, attachments: [...prev.attachments, attachmentInput.trim()] }));
    setAttachmentInput("");
  };

  const removeAttachment = (index) => {
    setFormData(prev => ({ ...prev, attachments: prev.attachments.filter((_, i) => i !== index) }));
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (notice) => {
    setEditingId(notice._id);
    setFormData({
      title: notice.title,
      description: notice.description || "",
      societyId: notice.societyId?._id || notice.societyId,
      buildingId: notice.buildingId?._id || notice.buildingId || "",
      flatId: notice.flatId?._id || notice.flatId || "",
      attachments: notice.attachments || [],
      isImportant: notice.isImportant || false,
      pinned: notice.pinned || false,
      expiryDate: notice.expiryDate ? notice.expiryDate.split("T")[0] : "",
      targetAudience: notice.targetAudience || "All",
    });
    if (notice.societyId) await fetchBuildings(notice.societyId);
    if (notice.buildingId) await fetchFlats(notice.buildingId);
    setModalOpen(true);
  };

  const handleFieldChange = async (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === "checkbox" ? checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
    if (name === "societyId") {
      await fetchBuildings(value);
      setFormData(prev => ({ ...prev, buildingId: "", flatId: "" }));
    } else if (name === "buildingId") {
      await fetchFlats(value);
      setFormData(prev => ({ ...prev, flatId: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || (!isResident && !formData.societyId)) {
      setError("Title and Society are required.");
      return;
    }
    setSaving(true);
    setError("");
    const toastId = toast.loading(editingId ? "Updating..." : "Creating...");
    try {
      const submitData = { ...formData };
      if (!submitData.expiryDate) delete submitData.expiryDate;
      const url = editingId
        ? `/api/societymanagement/notice?id=${editingId}`
        : "/api/societymanagement/notice";
      const method = editingId ? axios.put : axios.post;
      await method(url, submitData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(editingId ? "Updated" : "Created", { id: toastId });
      resetForm();
      setModalOpen(false);
      fetchNotices();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this notice permanently?")) return;
    const toastId = toast.loading("Deleting...");
    try {
      await axios.delete(`/api/societymanagement/notice?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted", { id: toastId });
      setNotices(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      toast.error("Delete failed", { id: toastId });
    }
  };

  const filteredNotices = useMemo(() => notices.filter(n =>
    !search ||
    n.title?.toLowerCase().includes(search.toLowerCase()) ||
    n.description?.toLowerCase().includes(search.toLowerCase())
  ), [notices, search]);

  if (loadingUser) {
    return <div className="flex justify-center items-center h-screen"><FiLoader className="animate-spin text-3xl text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Notice Board</h1>
          <p className="text-gray-500 mt-1">Important announcements and updates</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition">
            <FiPlus /> Post Notice
          </button>
        )}
      </div>

      <div className="relative max-w-md mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredNotices.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <FiFileText className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No notices found</p>
          {isAdmin && !search && <button onClick={openCreateModal} className="mt-2 text-indigo-600 hover:underline">Post your first notice</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNotices.map(notice => (
            <NoticeCard
              key={notice._id}
              notice={notice}
              isAdmin={isAdmin}
              currentUserId={user?.id}
              onEdit={() => openEditModal(notice)}
              onDelete={() => handleDelete(notice._id)}
              onRead={() => markAsRead(notice._id)}
            />
          ))}
        </div>
      )}

      {/* Admin Modal Form */}
      {isAdmin && modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold">{editingId ? "Edit Notice" : "Post Notice"}</h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-1 rounded-full hover:bg-gray-100"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2"><FiAlertCircle />{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Society *</label>
                  <select name="societyId" value={formData.societyId || ""} onChange={handleFieldChange} required className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">Select society</option>
                    {societies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Building (optional)</label>
                  <select name="buildingId" value={formData.buildingId || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">All buildings</option>
                    {buildings.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Flat (optional)</label>
                  <select name="flatId" value={formData.flatId || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">All flats</option>
                    {flats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Target Audience</label>
                  <select name="targetAudience" value={formData.targetAudience || "All"} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="All">All</option>
                    <option value="Owners">Owners</option>
                    <option value="Tenants">Tenants</option>
                    <option value="Staff">Staff</option>
                    <option value="Specific Flats">Specific Flats</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Title *</label>
                <input type="text" name="title" value={formData.title || ""} onChange={handleFieldChange} required className="w-full px-4 py-2 rounded-xl border border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Description</label>
                <textarea name="description" value={formData.description || ""} onChange={handleFieldChange} rows={4} className="w-full px-4 py-2 rounded-xl border border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Attachments (URLs)</label>
                <div className="flex gap-2 mb-2">
                  <input type="url" value={attachmentInput} onChange={(e) => setAttachmentInput(e.target.value)} placeholder="https://..." className="flex-1 px-3 py-2 rounded-lg border border-gray-200" />
                  <button type="button" onClick={addAttachment} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">Add</button>
                </div>
                {formData.attachments.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {formData.attachments.map((url, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-sm truncate max-w-[250px]"><FiLink className="inline mr-1" />{url}</a>
                        <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500"><FiX /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="isImportant" checked={formData.isImportant} onChange={handleFieldChange} /> Important
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="pinned" checked={formData.pinned} onChange={handleFieldChange} /> Pin to top
                </label>
                <div>
                  <label className="block text-sm mb-1">Expiry Date</label>
                  <input type="date" name="expiryDate" value={formData.expiryDate || ""} onChange={handleFieldChange} className="w-full px-3 py-1 rounded-lg border border-gray-200" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition">Cancel</button>
                <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                  {saving ? <FiLoader className="animate-spin" /> : (editingId ? "Update" : "Post")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Notice Card Component
function NoticeCard({ notice, isAdmin, currentUserId, onEdit, onDelete, onRead }) {
  const isRead = notice.readBy?.includes(currentUserId);
  const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();

  useEffect(() => {
    if (!isAdmin && !isRead && !isExpired) {
      onRead();
    }
  }, []);

  return (
    <div className={`group bg-white rounded-2xl p-5 shadow-sm border transition-all ${notice.isImportant ? 'border-red-200 shadow-md' : 'border-gray-100 hover:shadow-md'}`}>
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          {notice.pinned && <FiMapPin className="text-indigo-600" />}
          {notice.isImportant && <FiFlag className="text-red-500" />}
          <h3 className="font-bold text-gray-900 text-lg line-clamp-1">{notice.title}</h3>
        </div>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={onEdit} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><FiEdit2 size={14} /></button>
            <button onClick={onDelete} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={14} /></button>
          </div>
        )}
      </div>
      {!isRead && !isAdmin && <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full mt-1">New</span>}
      <p className="text-gray-600 text-sm mt-2 line-clamp-3">{notice.description || "No description"}</p>
      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mt-4">
        <span className="flex items-center gap-1"><FiCalendar /> {new Date(notice.createdAt).toLocaleDateString()}</span>
        <span className="flex items-center gap-1"><FiUser /> {notice.createdBy?.name || "Admin"}</span>
        {notice.targetAudience && notice.targetAudience !== "All" && (
          <span className="bg-gray-100 px-2 py-0.5 rounded-full">{notice.targetAudience}</span>
        )}
        <span className="flex items-center gap-1"><FiEye /> {notice.readBy?.length || 0} reads</span>
      </div>
      {notice.attachments && notice.attachments.length > 0 && (
        <div className="mt-3 pt-2 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-500 mb-1">Attachments:</p>
          <div className="flex flex-wrap gap-2">
            {notice.attachments.map((url, idx) => (
              <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 text-xs flex items-center gap-1 hover:underline"><FiLink /> Link</a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}