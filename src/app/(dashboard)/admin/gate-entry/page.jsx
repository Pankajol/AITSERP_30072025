"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import SupplierSearch from "@/components/SupplierSearch";
import Select from "react-select"; 
import { 
  FaTruck, FaSearch, FaPlus, FaClock, 
  FaFileAlt, FaSignOutAlt, FaEye, FaTimes, FaCheck, FaPhone, FaUserShield 
} from "react-icons/fa";

// --- UI CONSTANTS ---
const fi = "w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

const customSelectStyles = {
  control: (base) => ({
    ...base,
    borderRadius: '0.75rem',
    border: '1px solid #e2e8f0',
    padding: '2px',
    backgroundColor: '#f8fafc',
    boxShadow: 'none',
    '&:hover': { border: '1px solid #6366f1' }
  })
};

export default function GateEntryListPage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  
  // Modals State
  const [showModal, setShowModal] = useState(false);
  const [viewingEntry, setViewingEntry] = useState(null); 
  const [submitting, setSubmitting] = useState(false);
  const [poOptions, setPoOptions] = useState([]); 
  
  const [formData, setFormData] = useState({
    supplier: "", supplierName: "", supplierCode: "", 
    purchaseOrders: [], 
    vehicleNo: "", driverName: "", driverPhone: "", transporterName: "",
    challanNo: "", invoiceNo: "", purpose: "Material Inward", remarks: ""
  });

  // 1. Fetch Gate Entries
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/gate-entry", {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(res.data.data || []);
    } catch (err) {
      toast.error("Failed to load list");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // 2. Fetch Supplier Specific POs (Using Correct documentNumberPurchaseOrder)
  useEffect(() => {
    const fetchPOs = async () => {
      if (formData.supplier) {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`/api/purchase-order?supplier=${formData.supplier}&status=Open`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = res.data.data || [];
          setPoOptions(data.map(po => ({
            value: po._id,
            label: `${po.documentNumberPurchaseOrder || po.docNo} (₹${po.grandTotal})`
          })));
        } catch (err) { 
            setPoOptions([]); 
            console.error("PO Fetch Error:", err);
        }
      } else { setPoOptions([]); }
    };
    fetchPOs();
  }, [formData.supplier]);

  // --- Handlers ---
  const handleSupplierSelect = (sup) => {
    if (!sup) {
      setFormData(prev => ({ ...prev, supplier: "", supplierName: "", purchaseOrders: [] }));
      return;
    }
    setFormData(prev => ({ 
      ...prev, supplier: sup._id, supplierName: sup.supplierName, 
      supplierCode: sup.supplierCode, purchaseOrders: [] 
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.supplier || !formData.vehicleNo) return toast.error("Supplier and Vehicle are required");

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const payload = { 
          ...formData, 
          purchaseOrders: formData.purchaseOrders.map(po => po.value) 
      };
      await axios.post("/api/gate-entry", payload, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Entry Registered Successfully");
      setShowModal(false);
      resetForm();
      fetchEntries();
    } catch (err) { 
        toast.error(err.response?.data?.error || "Failed to register entry"); 
    } finally { setSubmitting(false); }
  };

  const resetForm = () => {
    setFormData({ 
        supplier: "", supplierName: "", supplierCode: "", purchaseOrders: [], 
        vehicleNo: "", driverName: "", driverPhone: "", transporterName: "", 
        challanNo: "", invoiceNo: "", purpose: "Material Inward", remarks: "" 
    });
  };

  const handleOutGate = async (id) => {
    if (!confirm("Confirm Exit?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.put(`/api/gate-entry/${id}`, { status: "Out-Gate", exitTime: new Date() }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchEntries();
      toast.success("Exit Recorded Successfully");
    } catch (err) { toast.error("Error updating exit"); }
  };

  const filtered = entries.filter(e => {
    const matchesSearch = e.vehicleNo?.toLowerCase().includes(search.toLowerCase()) || 
                         e.supplier?.supplierName?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <ToastContainer theme="colored" />
      
      {/* Header */}
      <div className="max-w-7xl mx-auto flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
           <h1 className="text-2xl font-black text-gray-900 flex items-center gap-3">
              <FaTruck className="text-indigo-600" /> Gate Control Center
           </h1>
           <p className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-bold">Secure Inward Registry</p>
        </div>
        <button 
           onClick={() => setShowModal(true)} 
           className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
        >
           <FaPlus className="inline mr-2" /> New Gate Entry
        </button>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[300px]">
          <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
          <input 
            type="text" 
            placeholder="Search by vehicle, supplier or entry ID..." 
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm outline-none focus:bg-white transition-all" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
          />
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {["All", "In-Gate", "Out-Gate"].map(s => (
            <button 
                key={s} 
                onClick={() => setStatusFilter(s)} 
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-tighter transition-all ${statusFilter === s ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}
            >
                {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-[10px] font-black uppercase text-gray-400">
                <th className="px-6 py-5 text-left">Vehicle & ID</th>
                <th className="px-6 py-5 text-left">Supplier & POs</th>
                <th className="px-6 py-5 text-left">Logistics Log</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
                {filtered.map((entry) => (
                <tr key={entry._id} className={`hover:bg-indigo-50/20 transition-colors group ${entry.status === 'Out-Gate' ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-5">
                    <div className="font-black text-gray-900 uppercase text-sm">{entry.vehicleNo}</div>
                    <div className="text-[10px] font-mono text-indigo-500 font-bold uppercase">{entry.entryNo}</div>
                    </td>
                    <td className="px-6 py-5">
                    <div className="font-bold text-gray-700 truncate max-w-[180px]">{entry.supplier?.supplierName}</div>
                    <div className="flex flex-wrap gap-1 mt-1">
                        {entry.purchaseOrders?.map((po, i) => (
                            <span key={i} className="text-[9px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-black border border-indigo-100">
                                #{po.documentNumberPurchaseOrder || 'PO'}
                            </span>
                        ))}
                    </div>
                    </td>
                    <td className="px-6 py-5">
                    <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                        <FaClock className="text-emerald-500" /> {new Date(entry.entryTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">{entry.driverName || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-5 text-center">
                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border ${entry.status === 'In-Gate' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-100 text-gray-400'}`}>{entry.status}</span>
                    </td>
                    <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setViewingEntry(entry)} className="p-2 text-gray-300 hover:text-indigo-600 transition-all"><FaEye size={18} /></button>
                            {entry.status === 'In-Gate' && (
                                <button onClick={() => handleOutGate(entry._id)} className="bg-rose-50 text-rose-600 px-4 py-1.5 rounded-xl text-[10px] font-black hover:bg-rose-600 hover:text-white transition-all shadow-sm">EXIT</button>
                            )}
                        </div>
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>

      {/* --- DETAILS MODAL (FaEye Click) --- */}
      {viewingEntry && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
               <h2 className="text-xl font-black uppercase tracking-tight">Gate Pass Details</h2>
               <button onClick={() => setViewingEntry(null)} className="text-white/60 hover:text-white transition-colors"><FaTimes /></button>
            </div>
            <div className="p-8 space-y-6">
               <div className="flex justify-between border-b pb-4 border-slate-100">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry ID</p>
                      <p className="text-lg font-black text-indigo-600 font-mono">{viewingEntry.entryNo}</p>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</p>
                      <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full border border-emerald-100">{viewingEntry.status}</span>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <InfoItem label="Vehicle Number" value={viewingEntry.vehicleNo} mono />
                  <InfoItem label="Supplier" value={viewingEntry.supplier?.supplierName} />
                  <InfoItem label="Driver Name" value={viewingEntry.driverName || 'N/A'} />
                  <InfoItem label="Driver Contact" value={viewingEntry.driverPhone || 'N/A'} />
                  <InfoItem label="Check-In" value={new Date(viewingEntry.entryTime).toLocaleString()} />
                  {viewingEntry.exitTime && <InfoItem label="Check-Out" value={new Date(viewingEntry.exitTime).toLocaleString()} />}
               </div>
               <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-3 flex items-center gap-2"><FaFileAlt /> Linked Purchase Orders</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingEntry.purchaseOrders && viewingEntry.purchaseOrders.length > 0 ? viewingEntry.purchaseOrders.map((po, i) => (
                      <span key={i} className="bg-white text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm">
                        {po.documentNumberPurchaseOrder }
                      </span>
                    )) : <span className="text-xs text-gray-400 italic">No POs Linked</span>}
                  </div>
               </div>
               {viewingEntry.remarks && (
                 <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                    <p className="text-[10px] font-black text-amber-600 uppercase mb-1 flex items-center gap-2"><FaUserShield /> Guard Remarks</p>
                    <p className="text-sm text-slate-600 italic">"{viewingEntry.remarks}"</p>
                 </div>
               )}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
               <button onClick={() => setViewingEntry(null)} className="bg-slate-900 text-white px-10 py-3 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-indigo-600 transition-all">Close Pass</button>
            </div>
          </div>
        </div>
      )}

      {/* --- REGISTRATION MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
            <div className="bg-slate-900 p-6 text-white flex justify-between items-center shrink-0">
               <div>
                  <h2 className="text-xl font-black uppercase tracking-tight">New Gate Registration</h2>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Secure Logistics Protocol</p>
               </div>
               <button onClick={() => setShowModal(false)} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-rose-500 transition-all"><FaTimes /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                    <label className="block text-[10px] font-black uppercase text-indigo-400 mb-2">1. Identify Supplier</label>
                    <SupplierSearch onSelectCustomer={handleSupplierSelect} />
                    {formData.supplierName && (
                        <div className="mt-2 text-[10px] font-bold text-indigo-600 bg-white px-2 py-1 rounded inline-block border border-indigo-100">
                            SELECTED: {formData.supplierName}
                        </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">2. Link Multiple POs</label>
                    <Select 
                        isMulti 
                        options={poOptions} 
                        value={formData.purchaseOrders} 
                        onChange={(sel) => setFormData(p => ({ ...p, purchaseOrders: sel }))} 
                        styles={customSelectStyles} 
                        placeholder={formData.supplier ? "Search POs..." : "Select Supplier First"} 
                        isDisabled={!formData.supplier} 
                    />
                  </div>
                  <div>
                      <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5 ml-1">3. Vehicle Number</label>
                      <input 
                        name="vehicleNo" 
                        value={formData.vehicleNo} 
                        onChange={(e) => setFormData(p => ({...p, vehicleNo: e.target.value.toUpperCase()}))} 
                        className={`${fi} font-mono font-black text-indigo-600 uppercase text-lg`} 
                        placeholder="MH-01-AA-0000" 
                        required 
                      />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Driver Name</label>
                        <input name="driverName" value={formData.driverName} onChange={(e) => setFormData(p => ({...p, driverName: e.target.value}))} className={fi} placeholder="Full Name" />
                    </div>
                    <div className="col-span-2 relative">
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Driver Contact</label>
                        <div className="relative">
                            <FaPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs" />
                            <input name="driverPhone" value={formData.driverPhone} onChange={(e) => setFormData(p => ({...p, driverPhone: e.target.value}))} className={`${fi} pl-9`} placeholder="9876XXXXXX" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Challan No</label>
                        <input name="challanNo" value={formData.challanNo} onChange={(e) => setFormData(p => ({...p, challanNo: e.target.value}))} className={fi} />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Entry Purpose</label>
                        <select name="purpose" value={formData.purpose} onChange={(e) => setFormData(p => ({...p, purpose: e.target.value}))} className={fi}>
                            <option>Material Inward</option>
                            <option>Material Outward</option>
                         
                        </select>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2">
                   <label className="block text-[10px] font-black uppercase text-gray-400 mb-1.5">Security Remarks</label>
                   <textarea name="remarks" rows={2} value={formData.remarks} onChange={(e) => setFormData(p => ({...p, remarks: e.target.value}))} className={`${fi} resize-none`} placeholder="Visible damage, seal info, etc..."></textarea>
                </div>
              </div>
            </form>
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
               <button onClick={() => setShowModal(false)} className="px-8 text-[11px] font-black uppercase text-gray-400 hover:text-gray-600 tracking-widest transition-colors">Discard</button>
               <button 
                  onClick={handleSubmit} 
                  disabled={submitting} 
                  className="bg-indigo-600 text-white px-12 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
               >
                  {submitting ? "Processing..." : "Confirm Registry"}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Fixed InfoItem helper component
const InfoItem = ({ label, value, mono }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{label}</p>
    <p className={`text-sm font-bold ${mono ? 'text-indigo-600 font-mono uppercase' : 'text-slate-700'}`}>{value}</p>
  </div>
);