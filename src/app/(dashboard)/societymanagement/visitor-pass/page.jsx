"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import toast, { Toaster } from "react-hot-toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiAlertCircle,
  FiLoader, FiUser, FiPhone, FiTruck, FiCalendar, FiCheckCircle, FiXCircle
} from "react-icons/fi";

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-red-100 text-red-800",
  Used: "bg-blue-100 text-blue-800",
  Expired: "bg-gray-100 text-gray-800",
};

export default function VisitorPassPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [societies, setSocieties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [residents, setResidents] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [residentProfile, setResidentProfile] = useState(null);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [buildingName, setBuildingName] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken) setToken(storedToken);
  }, []);

  useEffect(() => {
    if (!token) { setLoadingUser(false); return; }
    try {
      const decoded = jwtDecode(token);
      setUser(decoded);
    } catch (err) {
      toast.error("Session expired");
    } finally {
      setLoadingUser(false);
    }
  }, [token]);

  const isResident = user?.role === "Resident" || user?.roles?.includes?.("Resident");
  const isAdmin = !isResident && user !== null;

  // Fetch resident profile for auto‑fill (society, building, flat)
  const fetchResidentProfile = useCallback(async () => {
    if (!isResident || !token || !user?.email) return;
    try {
      const { data } = await axios.get(`/api/societymanagement/resident?search=${encodeURIComponent(user.email)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success && data.data.length > 0) {
        const profile = data.data[0];
        setResidentProfile(profile);
        const societyId = profile.societyId?._id || profile.societyId;
        const firstFlat = profile.flatIds?.[0];
        const flatId = firstFlat?._id || firstFlat || "";
        let buildingId = firstFlat?.buildingId?._id || firstFlat?.buildingId || "";
        let bldName = firstFlat?.buildingId?.name || "";

        // If buildingId exists but no name, fetch it
        if (buildingId && !bldName) {
          try {
            const { data: buildingData } = await axios.get(`/api/societymanagement/building?id=${buildingId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (buildingData.success) {
              bldName = buildingData.data.name;
              setBuildingName(bldName);
            }
          } catch (err) { console.error(err); }
        } else {
          setBuildingName(bldName);
        }

        setFormData(prev => ({
          ...prev,
          societyId,
          buildingId: buildingId,
          flatId: flatId,
          residentId: profile._id,
        }));
      }
    } catch (err) { console.error(err); }
  }, [isResident, token, user]);

  // Fetch all passes (with status filter)
  const fetchPasses = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/societymanagement/visitor-pass?${statusFilter ? `status=${statusFilter}` : ""}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setPasses(data.data);
    } catch (err) {
      toast.error("Failed to load passes");
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter]);

  // Admin dropdown data
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
    setLoadingBuildings(true);
    try {
      const { data } = await axios.get(`/api/societymanagement/building?societyId=${societyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBuildings(data.data.map(b => ({ value: b._id, label: b.name })));
      else setBuildings([]);
    } catch (err) { console.error(err); setBuildings([]); }
    finally { setLoadingBuildings(false); }
  };

  const fetchFlats = async (societyId, buildingId = null) => {
    if (!societyId) { setFlats([]); return; }
    setLoadingFlats(true);
    let url = `/api/societymanagement/flat?societyId=${societyId}`;
    if (buildingId) url += `&buildingId=${buildingId}`;
    try {
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
      else setFlats([]);
    } catch (err) { console.error(err); setFlats([]); }
    finally { setLoadingFlats(false); }
  };

  const fetchResidentsForFlat = async (flatId) => {
    if (!flatId) return;
    try {
      const { data } = await axios.get(`/api/societymanagement/resident?flatId=${flatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setResidents(data.data.map(r => ({ value: r._id, label: r.name })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    if (loadingUser) return;
    if (!token) return;
    fetchPasses();
    if (isAdmin) fetchSocieties();
    else if (isResident) fetchResidentProfile();
  }, [loadingUser, token, isAdmin, isResident, fetchPasses, fetchSocieties, fetchResidentProfile]);

  const resetForm = () => {
    if (isResident && residentProfile) {
      const societyId = residentProfile.societyId?._id || residentProfile.societyId;
      const firstFlat = residentProfile.flatIds?.[0];
      const flatId = firstFlat?._id || firstFlat || "";
      const buildingId = firstFlat?.buildingId?._id || firstFlat?.buildingId || "";
      setFormData({
        societyId,
        buildingId: buildingId,
        flatId: flatId,
        residentId: residentProfile._id,
        visitorName: "",
        phone: "",
        vehicleNumber: "",
        purpose: "",
        validFrom: "",
        validTill: "",
      });
    } else {
      setFormData({
        societyId: "",
        buildingId: "",
        flatId: "",
        residentId: "",
        visitorName: "",
        phone: "",
        vehicleNumber: "",
        purpose: "",
        validFrom: "",
        validTill: "",
      });
      setBuildings([]);
      setFlats([]);
      setResidents([]);
    }
    setEditingId(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (pass) => {
    setEditingId(pass._id);
    setFormData({
      societyId: pass.societyId?._id || pass.societyId,
      buildingId: pass.blockId?._id || pass.blockId || "",
      flatId: pass.flatId?._id || pass.flatId || "",
      residentId: pass.residentId?._id || pass.residentId || "",
      visitorName: pass.visitorName,
      phone: pass.phone || "",
      vehicleNumber: pass.vehicleNumber || "",
      purpose: pass.purpose || "",
      validFrom: pass.validFrom ? pass.validFrom.slice(0, 16) : "",
      validTill: pass.validTill ? pass.validTill.slice(0, 16) : "",
      status: pass.status,
      rejectionReason: pass.rejectionReason || "",
    });
    if (pass.societyId) await fetchBuildings(pass.societyId);
    if (pass.flatId) await fetchResidentsForFlat(pass.flatId);
    setModalOpen(true);
  };

  const handleFieldChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "societyId") {
      await fetchBuildings(value);
      setFormData(prev => ({ ...prev, buildingId: "", flatId: "", residentId: "" }));
      setFlats([]);
      setResidents([]);
    } else if (name === "buildingId") {
      await fetchFlats(formData.societyId, value);
      setFormData(prev => ({ ...prev, flatId: "", residentId: "" }));
      setResidents([]);
    } else if (name === "flatId") {
      await fetchResidentsForFlat(value);
      setFormData(prev => ({ ...prev, residentId: "" }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.visitorName || !formData.validFrom || !formData.validTill) {
      setError("Visitor name, valid from and till are required.");
      return;
    }
    if (!formData.societyId) {
      setError("Society is required.");
      return;
    }
    setSaving(true);
    setError("");
    const toastId = toast.loading(editingId ? "Updating..." : "Requesting...");
    try {
      const submitData = { ...formData };
      // Map buildingId → blockId for backend
      if (submitData.buildingId !== undefined) {
        submitData.blockId = submitData.buildingId;
        delete submitData.buildingId;
      }
      if (submitData.blockId === "") delete submitData.blockId;
      if (submitData.flatId === "") delete submitData.flatId;
      if (submitData.residentId === "") delete submitData.residentId;

      const url = editingId
        ? `/api/societymanagement/visitor-pass?id=${editingId}`
        : "/api/societymanagement/visitor-pass";
      const method = editingId ? axios.put : axios.post;
      await method(url, submitData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(editingId ? "Updated" : "Request submitted", { id: toastId });
      resetForm();
      setModalOpen(false);
      fetchPasses();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this visitor pass?")) return;
    const toastId = toast.loading("Deleting...");
    try {
      await axios.delete(`/api/societymanagement/visitor-pass?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted", { id: toastId });
      setPasses(prev => prev.filter(p => p._id !== id));
    } catch (err) {
      toast.error("Delete failed", { id: toastId });
    }
  };

  const updateStatus = async (id, newStatus, reason = "") => {
    const toastId = toast.loading(`Updating status to ${newStatus}...`);
    try {
      await axios.put(
        `/api/societymanagement/visitor-pass?id=${id}`,
        { status: newStatus, rejectionReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Status updated to ${newStatus}`, { id: toastId });
      fetchPasses();
    } catch (err) {
      toast.error("Update failed", { id: toastId });
    }
  };

  const filteredPasses = useMemo(
    () =>
      passes.filter(
        (p) =>
          !search ||
          p.visitorName?.toLowerCase().includes(search.toLowerCase()) ||
          p.phone?.includes(search) ||
          p.vehicleNumber?.toLowerCase().includes(search.toLowerCase())
      ),
    [passes, search]
  );

  if (loadingUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <FiLoader className="animate-spin text-3xl text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster position="top-right" />
      <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Visitor Passes
          </h1>
          <p className="text-gray-500 mt-1">Manage guest entry passes</p>
        </div>
        <div className="flex gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm"
          >
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Used">Used</option>
            <option value="Expired">Expired</option>
          </select>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md"
          >
            <FiPlus /> Request Pass
          </button>
        </div>
      </div>

      <div className="relative max-w-md mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by visitor name, phone or vehicle..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredPasses.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <FiUser className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No visitor passes found</p>
          <button onClick={openCreateModal} className="mt-2 text-indigo-600 hover:underline">
            Request a pass
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPasses.map((pass) => (
            <VisitorPassCard
              key={pass._id}
              pass={pass}
              isAdmin={isAdmin}
              onEdit={() => openEditModal(pass)}
              onDelete={() => handleDelete(pass._id)}
              onStatusChange={updateStatus}
            />
          ))}
        </div>
      )}

      {/* Modal Form */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold">
                {editingId ? "Edit Pass" : "Request Visitor Pass"}
              </h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }}>
                <FiX className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
                  <FiAlertCircle /> {error}
                </div>
              )}

              {/* Society Field */}
              {!isResident ? (
                <div>
                  <label className="block text-sm font-semibold mb-1">Society *</label>
                  <select
                    name="societyId"
                    value={formData.societyId || ""}
                    onChange={handleFieldChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  >
                    <option value="">Select society</option>
                    {societies.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-1">Society</label>
                  <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                    {residentProfile?.societyId?.name || "Loading..."}
                  </div>
                </div>
              )}

              {/* Building Field - admin dropdown, resident read-only */}
              {!isResident ? (
                <div>
                  <label className="block text-sm font-semibold mb-1">Building (optional)</label>
                  <select
                    name="buildingId"
                    value={formData.buildingId || ""}
                    onChange={handleFieldChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                    disabled={!formData.societyId || loadingBuildings}
                  >
                    <option value="">Select building</option>
                    {buildings.map((b) => (
                      <option key={b.value} value={b.value}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                  {loadingBuildings && <FiLoader className="animate-spin text-sm mt-1" />}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-1">Building</label>
                  <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                    {buildingName || residentProfile?.flatIds?.[0]?.buildingId?.name || "Not available"}
                  </div>
                </div>
              )}

              {/* Flat Field - admin dropdown, resident read-only */}
              {!isResident ? (
                <div>
                  <label className="block text-sm font-semibold mb-1">Flat</label>
                  <select
                    name="flatId"
                    value={formData.flatId || ""}
                    onChange={handleFieldChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                    disabled={!formData.buildingId || loadingFlats}
                  >
                    <option value="">Select flat</option>
                    {flats.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {loadingFlats && <FiLoader className="animate-spin text-sm mt-1" />}
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-semibold mb-1">Flat</label>
                  <div className="px-4 py-2 bg-gray-50 rounded-xl border border-gray-200 text-gray-700">
                    {residentProfile?.flatIds?.[0]?.flatNumber || "Loading..."}
                  </div>
                </div>
              )}

              {/* Resident Dropdown (admin only) */}
              {!isResident && (
                <div>
                  <label className="block text-sm font-semibold mb-1">Resident (optional)</label>
                  <select
                    name="residentId"
                    value={formData.residentId || ""}
                    onChange={handleFieldChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  >
                    <option value="">Select resident</option>
                    {residents.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold mb-1">Visitor Name *</label>
                <input
                  type="text"
                  name="visitorName"
                  value={formData.visitorName || ""}
                  onChange={handleFieldChange}
                  required
                  className="w-full px-4 py-2 rounded-xl border border-gray-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Phone</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone || ""}
                    onChange={handleFieldChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Vehicle Number</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber || ""}
                    onChange={handleFieldChange}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Purpose</label>
                <input
                  type="text"
                  name="purpose"
                  value={formData.purpose || ""}
                  onChange={handleFieldChange}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1">Valid From *</label>
                  <input
                    type="datetime-local"
                    name="validFrom"
                    value={formData.validFrom || ""}
                    onChange={handleFieldChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Valid Till *</label>
                  <input
                    type="datetime-local"
                    name="validTill"
                    value={formData.validTill || ""}
                    onChange={handleFieldChange}
                    required
                    className="w-full px-4 py-2 rounded-xl border border-gray-200"
                  />
                </div>
              </div>

              {editingId && isAdmin && (
                <>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status || ""}
                      onChange={handleFieldChange}
                      className="w-full px-4 py-2 rounded-xl border border-gray-200"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Used">Used</option>
                    </select>
                  </div>
                  {formData.status === "Rejected" && (
                    <div>
                      <label className="block text-sm font-semibold mb-1">Rejection Reason</label>
                      <textarea
                        name="rejectionReason"
                        value={formData.rejectionReason || ""}
                        onChange={handleFieldChange}
                        rows={2}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200"
                      />
                    </div>
                  )}
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="px-5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving ? <FiLoader className="animate-spin" /> : (editingId ? "Update" : "Request")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function VisitorPassCard({ pass, isAdmin, onEdit, onDelete, onStatusChange }) {
  const status = pass.status;
  const isExpired = new Date(pass.validTill) < new Date() && status !== "Expired" && status !== "Used";
  const displayStatus = isExpired ? "Expired" : status;
  return (
    <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-lg">{pass.visitorName}</h3>
          <p className="text-sm text-gray-500">{pass.purpose || "No purpose"}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={onEdit} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100">
              <FiEdit2 size={14} />
            </button>
            <button onClick={onDelete} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100">
              <FiTrash2 size={14} />
            </button>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1 text-sm">
        {pass.phone && (
          <div className="flex items-center gap-2">
            <FiPhone className="text-gray-400" /> {pass.phone}
          </div>
        )}
        {pass.vehicleNumber && (
          <div className="flex items-center gap-2">
            <FiTruck className="text-gray-400" /> {pass.vehicleNumber}
          </div>
        )}
        <div className="flex items-center gap-2">
          <FiCalendar className="text-gray-400" /> Valid: {new Date(pass.validFrom).toLocaleString()} –{" "}
          {new Date(pass.validTill).toLocaleString()}
        </div>
      </div>
      <div className="flex justify-between items-center mt-4">
        <span
          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            STATUS_COLORS[displayStatus] || "bg-gray-100"
          }`}
        >
          {displayStatus}
        </span>
        {isAdmin && displayStatus === "Pending" && (
          <div className="flex gap-2">
            <button
              onClick={() => onStatusChange(pass._id, "Approved")}
              className="text-green-600 hover:bg-green-50 p-1 rounded"
            >
              <FiCheckCircle />
            </button>
            <button
              onClick={() => onStatusChange(pass._id, "Rejected", "Not approved")}
              className="text-red-600 hover:bg-red-50 p-1 rounded"
            >
              <FiXCircle />
            </button>
          </div>
        )}
        {isAdmin && displayStatus === "Approved" && (
          <button
            onClick={() => onStatusChange(pass._id, "Used")}
            className="text-blue-600 text-xs hover:underline"
          >
            Mark Used
          </button>
        )}
      </div>
    </div>
  );
}