"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import toast, { Toaster } from "react-hot-toast";
import {
  FiPlus, FiEdit2, FiTrash2, FiSearch, FiX, FiAlertCircle,
  FiLoader, FiDollarSign, FiCalendar, FiHome, FiUser
} from "react-icons/fi";

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800",
  PartiallyPaid: "bg-orange-100 text-orange-800",
  Paid: "bg-green-100 text-green-800",
  Overdue: "bg-red-100 text-red-800",
};

export default function MaintenanceBillPage() {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ items: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [societies, setSocieties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [flats, setFlats] = useState([]);
  const [residents, setResidents] = useState([]);
  const [itemInput, setItemInput] = useState({ description: "", amount: "" });

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
      console.error(err);
      toast.error("Session expired");
    } finally {
      setLoadingUser(false);
    }
  }, [token]);

  const isResident = user?.role === "Resident" || user?.roles?.includes?.("Resident");
  const isAdmin = !isResident && user !== null;

  // Fetch bills
  const fetchBills = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      let url = "/api/societymanagement/maintenance-bill";
      if (isResident && user?.email) {
        // Resident filter is applied on backend via email
      }
      const { data } = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBills(data.data);
    } catch (err) {
      toast.error("Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [token, isResident, user]);

  // Admin data: societies, buildings, flats, residents
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
    if (!societyId) return;
    try {
      const { data } = await axios.get(`/api/societymanagement/building?societyId=${societyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setBuildings(data.data.map(b => ({ value: b._id, label: b.name })));
    } catch (err) { console.error(err); }
  };

  const fetchFlats = async (societyId, buildingId = null) => {
    let url = `/api/societymanagement/flat?societyId=${societyId}`;
    if (buildingId) url += `&buildingId=${buildingId}`;
    try {
      const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) setFlats(data.data.map(f => ({ value: f._id, label: f.flatNumber })));
    } catch (err) { console.error(err); }
  };

  const fetchResidentsByFlat = async (flatId) => {
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
    fetchBills();
    if (isAdmin) fetchSocieties();
  }, [loadingUser, token, isAdmin, fetchBills, fetchSocieties]);

  const resetForm = () => {
    setFormData({
      flatId: "",
      billPeriod: "",
      dueDate: "",
      items: [],
      totalAmount: 0,
      lateFee: 0,
      paidAmount: 0,
      paymentStatus: "Pending",
      paymentMode: "",
      transactionId: "",
      remarks: "",
    });
    setItemInput({ description: "", amount: "" });
    setEditingId(null);
    setError("");
  };

  const addItem = () => {
    if (!itemInput.description || !itemInput.amount) return;
    const amount = parseFloat(itemInput.amount);
    if (isNaN(amount)) return;
    const newItems = [...formData.items, { description: itemInput.description, amount }];
    const total = newItems.reduce((sum, i) => sum + i.amount, 0);
    setFormData({ ...formData, items: newItems, totalAmount: total });
    setItemInput({ description: "", amount: "" });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    const total = newItems.reduce((sum, i) => sum + i.amount, 0);
    setFormData({ ...formData, items: newItems, totalAmount: total });
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (bill) => {
    setEditingId(bill._id);
    setFormData({
      flatId: bill.flatId?._id || bill.flatId,
      billPeriod: bill.billPeriod,
      dueDate: bill.dueDate?.split("T")[0] || "",
      items: bill.items || [],
      totalAmount: bill.totalAmount,
      lateFee: bill.lateFee || 0,
      paidAmount: bill.paidAmount || 0,
      paymentStatus: bill.paymentStatus,
      paymentMode: bill.paymentMode || "",
      transactionId: bill.transactionId || "",
      remarks: bill.remarks || "",
    });
    // Preload flats for the society of this bill
    const societyId = bill.societyId?._id || bill.societyId;
    if (societyId) {
      await fetchFlats(societyId);
    }
    setModalOpen(true);
  };

  const handleFieldChange = async (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (name === "societyId") {
      await fetchBuildings(value);
      setFormData(prev => ({ ...prev, buildingId: "", flatId: "" }));
    } else if (name === "buildingId") {
      await fetchFlats(formData.societyId, value);
      setFormData(prev => ({ ...prev, flatId: "" }));
    } else if (name === "flatId") {
      await fetchResidentsByFlat(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.flatId || !formData.billPeriod || !formData.dueDate || formData.items.length === 0) {
      setError("Flat, bill period, due date and at least one item are required.");
      return;
    }
    setSaving(true);
    setError("");
    const toastId = toast.loading(editingId ? "Updating..." : "Creating...");
    try {
      const submitData = { ...formData };
      if (submitData.residentId === "") delete submitData.residentId;
      const url = editingId
        ? `/api/societymanagement/maintenance-bill?id=${editingId}`
        : "/api/societymanagement/maintenance-bill";
      const method = editingId ? axios.put : axios.post;
      await method(url, submitData, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(editingId ? "Updated" : "Created", { id: toastId });
      resetForm();
      setModalOpen(false);
      fetchBills();
    } catch (err) {
      const msg = err.response?.data?.message || "Operation failed";
      toast.error(msg, { id: toastId });
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this bill permanently?")) return;
    const toastId = toast.loading("Deleting...");
    try {
      await axios.delete(`/api/societymanagement/maintenance-bill?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Deleted", { id: toastId });
      setBills(prev => prev.filter(b => b._id !== id));
    } catch (err) {
      toast.error("Delete failed", { id: toastId });
    }
  };

  const handlePaymentUpdate = async (id, newStatus, paidAmount = null) => {
    const updateData = { paymentStatus: newStatus };
    if (paidAmount !== null) updateData.paidAmount = paidAmount;
    if (newStatus === "Paid") updateData.paidAt = new Date();
    const toastId = toast.loading("Updating payment status...");
    try {
      await axios.put(`/api/societymanagement/maintenance-bill?id=${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Status updated", { id: toastId });
      fetchBills();
    } catch (err) {
      toast.error("Update failed", { id: toastId });
    }
  };

  const filteredBills = useMemo(() => bills.filter(b =>
    !search ||
    b.billPeriod?.toLowerCase().includes(search.toLowerCase()) ||
    b.flatId?.flatNumber?.toLowerCase().includes(search.toLowerCase())
  ), [bills, search]);

  if (loadingUser) {
    return <div className="flex justify-center items-center h-screen"><FiLoader className="animate-spin text-3xl text-indigo-600" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Toaster position="top-right" />
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Maintenance Bills</h1>
          <p className="text-gray-500 mt-1">Manage flat maintenance charges</p>
        </div>
        {isAdmin && (
          <button onClick={openCreateModal} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 shadow-md transition">
            <FiPlus /> Generate Bill
          </button>
        )}
      </div>

      <div className="relative max-w-md mb-6">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by period or flat number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition"
        />
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border">
          <FiDollarSign className="text-5xl text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400">No bills found</p>
          {isAdmin && !search && <button onClick={openCreateModal} className="mt-2 text-indigo-600 hover:underline">Generate first bill</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBills.map(bill => (
            <BillCard
              key={bill._id}
              bill={bill}
              isAdmin={isAdmin}
              onEdit={() => openEditModal(bill)}
              onDelete={() => handleDelete(bill._id)}
              onPaymentUpdate={handlePaymentUpdate}
            />
          ))}
        </div>
      )}

      {/* Modal Form (only for admin) */}
      {isAdmin && modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-bold">{editingId ? "Edit Bill" : "Generate Bill"}</h2>
              <button onClick={() => { setModalOpen(false); resetForm(); }} className="p-1 rounded-full hover:bg-gray-100"><FiX /></button>
            </div>
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2"><FiAlertCircle />{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Society</label>
                  <select name="societyId" value={formData.societyId || ""} onChange={handleFieldChange} required className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">Select society</option>
                    {societies.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Building</label>
                  <select name="buildingId" value={formData.buildingId || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">Select building (optional)</option>
                    {buildings.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Flat *</label>
                  <select name="flatId" value={formData.flatId || ""} onChange={handleFieldChange} required className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">Select flat</option>
                    {flats.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Bill Period (YYYY-MM) *</label>
                  <input type="month" name="billPeriod" value={formData.billPeriod || ""} onChange={handleFieldChange} required className="w-full px-4 py-2 rounded-xl border border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Due Date *</label>
                  <input type="date" name="dueDate" value={formData.dueDate || ""} onChange={handleFieldChange} required className="w-full px-4 py-2 rounded-xl border border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Late Fee</label>
                  <input type="number" step="0.01" name="lateFee" value={formData.lateFee || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200" />
                </div>
              </div>

              {/* Items section */}
              <div className="border rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-semibold mb-2">Bill Items</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="Description" value={itemInput.description} onChange={(e) => setItemInput({ ...itemInput, description: e.target.value })} className="flex-1 px-3 py-2 rounded-lg border border-gray-200" />
                  <input type="number" step="0.01" placeholder="Amount" value={itemInput.amount} onChange={(e) => setItemInput({ ...itemInput, amount: e.target.value })} className="w-32 px-3 py-2 rounded-lg border border-gray-200" />
                  <button type="button" onClick={addItem} className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200">Add</button>
                </div>
                {formData.items.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-2">No items added</p>
                ) : (
                  <div className="space-y-2">
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border">
                        <span>{item.description}</span>
                        <span className="font-mono">₹{item.amount.toFixed(2)}</span>
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700"><FiX /></button>
                      </div>
                    ))}
                    <div className="text-right font-bold pt-2">Total: ₹{formData.totalAmount.toFixed(2)}</div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Payment Status</label>
                <select name="paymentStatus" value={formData.paymentStatus || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200">
                  <option value="Pending">Pending</option>
                  <option value="PartiallyPaid">Partially Paid</option>
                  <option value="Paid">Paid</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-1">Paid Amount</label>
                  <input type="number" step="0.01" name="paidAmount" value={formData.paidAmount || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Payment Mode</label>
                  <select name="paymentMode" value={formData.paymentMode || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200">
                    <option value="">Select</option>
                    <option value="Cash">Cash</option>
                    <option value="Online">Online</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Transaction ID</label>
                <input type="text" name="transactionId" value={formData.transactionId || ""} onChange={handleFieldChange} className="w-full px-4 py-2 rounded-xl border border-gray-200" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">Remarks</label>
                <textarea name="remarks" value={formData.remarks || ""} onChange={handleFieldChange} rows={2} className="w-full px-4 py-2 rounded-xl border border-gray-200" />
              </div>
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

// Bill Card Component
function BillCard({ bill, isAdmin, onEdit, onDelete, onPaymentUpdate }) {
  const dueDate = new Date(bill.dueDate);
  const isOverdue = dueDate < new Date() && bill.paymentStatus !== "Paid";
  const status = isOverdue ? "Overdue" : bill.paymentStatus;

  return (
    <div className="group bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-gray-900 text-lg">{bill.flatId?.flatNumber || "Flat"}</h3>
          <p className="text-sm text-gray-500">Period: {bill.billPeriod}</p>
          <p className="text-sm text-gray-500">Due: {new Date(bill.dueDate).toLocaleDateString()}</p>
        </div>
        {isAdmin && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
            <button onClick={onEdit} className="p-2 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100"><FiEdit2 size={14} /></button>
            <button onClick={onDelete} className="p-2 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><FiTrash2 size={14} /></button>
          </div>
        )}
      </div>
      <div className="mt-3 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Total Amount:</span>
          <span className="font-bold text-indigo-600">₹{bill.totalAmount.toFixed(2)}</span>
        </div>
        {bill.paidAmount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Paid:</span>
            <span className="text-green-600">₹{bill.paidAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[status] || "bg-gray-100"}`}>{status}</span>
          {!isAdmin && bill.paymentStatus !== "Paid" && (
            <button
              onClick={() => onPaymentUpdate(bill._id, "Paid", bill.totalAmount)}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
            >
              Mark as Paid
            </button>
          )}
        </div>
      </div>
      {bill.items && bill.items.slice(0, 2).map((item, idx) => (
        <div key={idx} className="text-xs text-gray-500 flex justify-between mt-1">
          <span>{item.description}</span>
          <span>₹{item.amount.toFixed(2)}</span>
        </div>
      ))}
      {bill.items.length > 2 && <p className="text-xs text-gray-400 mt-1">+{bill.items.length - 2} more</p>}
    </div>
  );
}