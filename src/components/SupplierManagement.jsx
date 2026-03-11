"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FaEdit, FaTrash, FaPlus, FaSearch, FaMinus, FaTimes,
  FaChevronLeft, FaChevronRight, FaCheck, FaArrowLeft,
  FaFileUpload, FaDownload, FaShieldAlt, FaExclamationCircle,
  FaBuilding, FaUser, FaMapMarkerAlt, FaUniversity, FaClipboardCheck,
  FaBarcode, FaPhone, FaEnvelope
} from "react-icons/fa";
import { HiOutlineDocumentText } from "react-icons/hi";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";
import { toast } from "react-toastify";

// ── 6 Steps ──
const STEPS = [
  { id: 1, label: "Udyam & Basic",  icon: FaBarcode },
  { id: 2, label: "Contact",        icon: FaPhone },
  { id: 3, label: "Addresses",      icon: FaMapMarkerAlt },
  { id: 4, label: "Tax & Finance",  icon: HiOutlineDocumentText },
  { id: 5, label: "Bank Details",   icon: FaUniversity },
  { id: 6, label: "Review",         icon: FaClipboardCheck },
];

const EMPTY_ADDR = { address1: "", address2: "", city: "", pin: "", country: "", state: "" };

const EMPTY = {
  supplierCode: "", supplierName: "", supplierType: "", supplierGroup: "",
  supplierCategory: "", emailId: "", mobileNumber: "", contactPersonName: "",
  contactNumber: "", alternateContactNumber: "",
  udyamNumber: "", incorporated: "", valid: null,
  billingAddresses:  [{ ...EMPTY_ADDR }],
  shippingAddresses: [{ ...EMPTY_ADDR }],
  paymentTerms: "", gstNumber: "", gstCategory: "", pan: "",
  bankName: "", branch: "", bankAccountNumber: "", ifscCode: "",
  leadTime: "", qualityRating: "B", glAccount: null,
};

const VALIDATORS = {
  1: (d) => {
    const e = {};
    if (!d.supplierName?.trim()) e.supplierName = "Supplier Name is required";
    if (!d.supplierType)         e.supplierType = "Supplier Type is required";
    if (!d.supplierGroup?.trim()) e.supplierGroup = "Supplier Group is required";
    return e;
  },
  2: (d) => {
    const e = {};
    if (d.emailId && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(d.emailId))
      e.emailId = "Invalid email format";
    if (d.mobileNumber && !/^\d{10}$/.test(d.mobileNumber))
      e.mobileNumber = "Mobile must be 10 digits";
    if (d.contactNumber && !/^\d{10}$/.test(d.contactNumber))
      e.contactNumber = "Contact number must be 10 digits";
    if (d.alternateContactNumber && !/^\d{10}$/.test(d.alternateContactNumber))
      e.alternateContactNumber = "Alt contact must be 10 digits";
    return e;
  },
  3: (d) => {
    const e = {};
    (d.billingAddresses  || []).forEach((a, i) => { if (a.pin && !/^\d{6}$/.test(a.pin)) e[`bp_${i}`] = "PIN must be 6 digits"; });
    (d.shippingAddresses || []).forEach((a, i) => { if (a.pin && !/^\d{6}$/.test(a.pin)) e[`sp_${i}`] = "PIN must be 6 digits"; });
    return e;
  },
  4: (d) => {
    const e = {};
    if (!d.gstCategory) e.gstCategory = "GST Category is required";
    if (!d.pan?.trim()) e.pan = "PAN is required";
    else if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(d.pan)) e.pan = "Invalid PAN (e.g. ABCDE1234F)";
    if (d.gstNumber && !/^\d{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(d.gstNumber))
      e.gstNumber = "Invalid GST (e.g. 22ABCDE1234F1Z5)";
    if (!d.glAccount?._id) e.glAccount = "GL Account is required";
    return e;
  },
  5: (d) => {
    const e = {};
    if (d.bankAccountNumber && !/^\d{9,18}$/.test(d.bankAccountNumber))
      e.bankAccountNumber = "Account number must be 9–18 digits";
    if (d.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(d.ifscCode))
      e.ifscCode = "Invalid IFSC (e.g. SBIN0001234)";
    return e;
  },
  6: () => ({}),
};

const AddrBlock = ({ type, list, accent, onChange, onRemove, onAdd, onFetchPin, fi, Err, errs }) => (
  <div>
    {(list || []).map((addr, i) => {
      const safe = addr || EMPTY_ADDR;
      const pKey = type === "bill" ? `bp_${i}` : `sp_${i}`;
      return (
        <div key={i} className={`border-2 ${accent.border} rounded-xl p-4 mb-3 bg-gray-50`}>
          <div className="flex items-center justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${accent.badge}`}>
              {type === "bill" ? "Billing" : "Shipping"} #{i + 1}
            </span>
            {i > 0 && (
              <button type="button" onClick={() => onRemove(type, i)}
                className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                <FaTimes className="text-xs" />
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input className={fi("")} value={safe.address1 || ""} onChange={e => onChange(type, i, "address1", e.target.value)} placeholder="Line 1 — Street" />
            <input className={fi("")} value={safe.address2 || ""} onChange={e => onChange(type, i, "address2", e.target.value)} placeholder="Line 2 — Apt, floor" />
            <div>
              <input className={fi(pKey)} type="number" value={safe.pin || ""} placeholder="PIN (6 digits)"
                onChange={e => { const p = e.target.value; onChange(type, i, "pin", p); onFetchPin(type, i, p); }} />
              <Err k={pKey} />
              {safe.pin?.length === 6 && !errs[pKey] && <p className="text-[11px] text-emerald-500 font-medium mt-1">✓ Auto-filled from PIN</p>}
            </div>
            <input className={fi("")} value={safe.city || ""} onChange={e => onChange(type, i, "city", e.target.value)} placeholder="City" />
          </div>
          <div className="mt-3">
            <CountryStateSearch
              valueCountry={safe.country ? { name: safe.country } : null}
              valueState={safe.state ? { name: safe.state } : null}
              onSelectCountry={c => onChange(type, i, "country", c?.name || "")}
              onSelectState={s => onChange(type, i, "state", s?.name || "")}
            />
          </div>
        </div>
      );
    })}
    <button type="button" onClick={() => onAdd(type)}
      className={`w-full py-2.5 border-2 border-dashed ${accent.dashed} rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${accent.addBtn}`}>
      <FaPlus className="text-xs" /> Add {type === "bill" ? "Billing" : "Shipping"} Address
    </button>
  </div>
);

export default function SupplierManagement() {
  const [view,        setView]        = useState("list");
  const [suppliers,   setSuppliers]   = useState([]);
  const [searchTerm,  setSearchTerm]  = useState("");
  const [filterType,  setFilterType]  = useState("All");
  const [loading,     setLoading]     = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [submitting,  setSubmitting]  = useState(false);
  const [verifying,   setVerifying]   = useState(false);
  const [step,        setStep]        = useState(1);
  const [sd,          setSd]          = useState({ ...EMPTY }); // sd = supplierDetails
  const [errs,        setErrs]        = useState({});
  const [viewOpen,    setViewOpen]    = useState(false);
  const [viewSupplier,setViewSupplier]= useState(null);

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/suppliers", { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setSuppliers(res.data.data || []);
    } catch { toast.error("Failed to load suppliers"); }
    setLoading(false);
  };

  // ── Udyam Verify ──
  const verifyUdyam = async () => {
    if (!sd.udyamNumber?.trim()) { toast.error("Enter Udyam Number first"); return; }
    setVerifying(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/udyam", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ udyamNumber: sd.udyamNumber }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        const u = data.data;
        setSd(p => ({
          ...p,
          supplierName:     u.entity             || p.supplierName,
          supplierType:     u.type               || p.supplierType,
          supplierCategory: u.majorActivity?.join(", ") || p.supplierCategory,
          mobileNumber:     u.officialAddress?.maskedMobile || p.mobileNumber,
          emailId:          u.officialAddress?.maskedEmail  || p.emailId,
          gstNumber:        u.gstNumber   || p.gstNumber,
          gstCategory:      u.gstCategory || p.gstCategory,
          pan:              u.pan         || p.pan,
          bankName:         u.bankName    || p.bankName,
          branch:           u.branch      || p.branch,
          bankAccountNumber: u.bankAccountNumber || p.bankAccountNumber,
          ifscCode:         u.ifscCode    || p.ifscCode,
          incorporated:     u.incorporated || p.incorporated,
          valid:            u.valid ?? p.valid,
          billingAddresses: [{
            address1: `${u.officialAddress?.unitNumber || ""} ${u.officialAddress?.building || ""}`.trim(),
            address2: `${u.officialAddress?.road || ""} ${u.officialAddress?.villageOrTown || ""}`.trim(),
            city:    u.officialAddress?.city  || "",
            state:   u.officialAddress?.state || "",
            country: "India",
            pin:     u.officialAddress?.zip   || "",
          }],
        }));
        toast.success("Udyam details fetched!");
      } else {
        toast.error(data.message || "Failed to verify Udyam");
      }
    } catch { toast.error("Error verifying Udyam"); }
    setVerifying(false);
  };

  // ── Generate Code ──
  const generateCode = async () => {
    try {
      const token = localStorage.getItem("token");
      const res   = await axios.get("/api/lastSupplierCode", { headers: { Authorization: `Bearer ${token}` } });
      const last  = res.data.lastSupplierCode || "SUPP-0000";
      const num   = parseInt(last.split("-")[1] || "0", 10) + 1;
      setSd(p => ({ ...p, supplierCode: `SUPP-${String(num).padStart(4, "0")}` }));
    } catch { }
  };

  // ── Helpers ──
  const clearErr = (k) => setErrs(p => { const n = { ...p }; delete n[k]; return n; });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSd(p => ({ ...p, [name]: value }));
    clearErr(name);
  };

  const handleAddrChange = (type, idx, field, value) => {
    const key = type === "bill" ? "billingAddresses" : "shippingAddresses";
    setSd(p => {
      const arr = [...p[key]];
      arr[idx] = { ...arr[idx], [field]: value };
      return { ...p, [key]: arr };
    });
    if (field === "pin") clearErr(`${type === "bill" ? "bp" : "sp"}_${idx}`);
  };

  const fetchPin = async (type, idx, pin) => {
    if (pin.length !== 6) return;
    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      if (data?.[0]?.Status === "Success") {
        const post = data[0]?.PostOffice?.[0];
        if (!post) return;
        handleAddrChange(type, idx, "city",    post.District || "");
        handleAddrChange(type, idx, "state",   post.State    || "");
        handleAddrChange(type, idx, "country", "India");
      }
    } catch { }
  };

  const addAddr    = (type) => { const k = type === "bill" ? "billingAddresses" : "shippingAddresses"; setSd(p => ({ ...p, [k]: [...p[k], { ...EMPTY_ADDR }] })); };
  const removeAddr = (type, idx) => {
    const k = type === "bill" ? "billingAddresses" : "shippingAddresses";
    setSd(p => ({ ...p, [k]: p[k].length === 1 ? [{ ...EMPTY_ADDR }] : p[k].filter((_, i) => i !== idx) }));
  };

  // ── Navigation ──
  const goNext = () => {
    const v = VALIDATORS[step];
    if (v) {
      const e = v(sd);
      if (Object.keys(e).length) { setErrs(e); toast.error(Object.values(e)[0]); return; }
    }
    setErrs({});
    setStep(s => s + 1);
  };

  const goPrev = () => { setErrs({}); setStep(s => s - 1); };

  // ── Submit ──
  const handleSubmit = async () => {
    let allE = {};
    for (let s = 1; s <= 5; s++) { const v = VALIDATORS[s]; if (v) allE = { ...allE, ...v(sd) }; }
    if (Object.keys(allE).length) { setErrs(allE); toast.error("Please fix errors before submitting"); return; }
    setSubmitting(true);
    const token   = localStorage.getItem("token");
    const payload = { ...sd, glAccount: sd.glAccount?._id || null };
    try {
      if (sd._id) {
        const res = await axios.put(`/api/suppliers/${sd._id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setSuppliers(p => p.map(s => s._id === res.data.data._id ? res.data.data : s));
        toast.success("Supplier updated!");
      } else {
        const res = await axios.post("/api/suppliers", payload, { headers: { Authorization: `Bearer ${token}` } });
        setSuppliers(p => [...p, res.data.data]);
        toast.success("Supplier created!");
      }
      reset();
    } catch (err) { toast.error(err.response?.data?.message || "Error saving supplier"); }
    setSubmitting(false);
  };

  const reset = () => { setSd({ ...EMPTY }); setStep(1); setErrs({}); setView("list"); };

  const handleEdit = (s) => {
    setSd({ ...s, glAccount: s.glAccount || null });
    setStep(1); setErrs({}); setView("form");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this supplier?")) return;
    const token = localStorage.getItem("token");
    await axios.delete(`/api/suppliers/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setSuppliers(p => p.filter(s => s._id !== id));
    toast.success("Supplier deleted");
  };

  // ── Bulk ──
  const downloadTemplate = () => {
    const h = ["supplierName","supplierGroup","supplierType","emailId","mobileNumber","gstNumber","gstCategory","pan","contactPersonName","paymentTerms","billingAddress1","billingAddress2","billingCity","billingState","billingPin","billingCountry","shippingAddress1","shippingAddress2","shippingCity","shippingState","shippingPin","shippingCountry","glAccount"];
    const r = ["ABC Traders","Wholesale","Manufacturer","abc@traders.com","9876543210","22ABCDE1234F1Z5","Registered Regular","ABCDE1234F","Rahul Mgr","30","Line 1","Line 2","Mumbai","Maharashtra","400001","India","Line 1","Line 2","Mumbai","Maharashtra","400002","India","BANKHEAD_ID"];
    const blob = new Blob([[h, r].map(x => x.join(",")).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "supplier_template.csv"; a.click();
  };

  const handleBulk = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const text  = await file.text();
      const lines = text.split("\n").map(r => r.trim()).filter(Boolean);
      const hdrs  = lines[0].split(",").map(h => h.trim());
      const jsonData = lines.slice(1).map(line => { const v = line.split(","); const o = {}; hdrs.forEach((k, i) => (o[k] = v[i]?.trim() || "")); return o; });
      const res = await axios.post("/api/suppliers/bulk", { suppliers: jsonData }, { headers: { Authorization: `Bearer ${token}` } });
      const { results } = res.data;
      const ok = results?.filter(r => r.success).length || 0;
      const fail = results?.filter(r => !r.success).length || 0;
      if (fail === 0) toast.success(`${ok} records uploaded!`);
      else toast.warning(`${ok} uploaded, ${fail} skipped`);
      fetchSuppliers();
    } catch { toast.error("Bulk upload failed"); }
    finally { setUploading(false); e.target.value = ""; }
  };

  // ── Derived ──
  const filtered = suppliers.filter(s => {
    const q = searchTerm.toLowerCase();
    const mQ = [s.supplierCode, s.supplierName, s.emailId, s.supplierType, s.supplierGroup].some(v => v?.toLowerCase().includes(q));
    const mT = filterType === "All" || s.supplierType === filterType;
    return mQ && mT;
  });

  const stats = {
    total:        suppliers.length,
    manufacturer: suppliers.filter(s => s.supplierType === "Manufacturer").length,
    distributor:  suppliers.filter(s => s.supplierType === "Distributor").length,
    service:      suppliers.filter(s => s.supplierType === "Service Provider").length,
  };

  // ── UI Helpers ──
  const Err = ({ k }) => errs[k]
    ? <p className="flex items-center gap-1 mt-1 text-xs text-red-500 font-medium animate-pulse"><FaExclamationCircle className="shrink-0 text-[10px]" />{errs[k]}</p>
    : null;

  const fi = (k, extra = "") =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none ${extra}
     ${errs[k] ? "border-red-400 ring-2 ring-red-100 bg-red-50 placeholder:text-red-300" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  // ── Review Row ──
  const RRow = ({ l, v }) => (
    <div className="flex justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{l}</span>
      <span className="text-sm font-semibold text-gray-800 text-right max-w-[60%] truncate">{v || <span className="text-gray-300 font-normal italic text-xs">—</span>}</span>
    </div>
  );

  // ── Step Content ──
  const renderStep = () => {
    switch (step) {

      // ── Step 1: Udyam & Basic ──
      case 1: return (
        <div className="space-y-5">
          {/* Udyam Verify */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-sm font-bold text-indigo-800 mb-1 flex items-center gap-2"><FaBarcode /> Udyam Verification</p>
            <p className="text-xs text-indigo-500 mb-3">Enter Udyam number to auto-fill supplier details.</p>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-2.5 rounded-lg border border-indigo-200 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-white placeholder:text-gray-300"
                placeholder="e.g. UDYAM-MH-01-0000001"
                value={sd.udyamNumber || ""}
                onChange={e => setSd(p => ({ ...p, udyamNumber: e.target.value }))}
              />
              <button type="button" onClick={verifyUdyam} disabled={verifying}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed shrink-0">
                {verifying ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" /> : <FaSearch className="text-xs" />}
                {verifying ? "Verifying…" : "Verify"}
              </button>
            </div>
            {/* Validity badge */}
            {sd.valid !== null && (
              <div className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${sd.valid ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                {sd.valid ? <FaCheck className="text-[10px]" /> : <FaTimes className="text-[10px]" />}
                Udyam {sd.valid ? "Valid" : "Invalid"}
              </div>
            )}
          </div>

          {/* Basic fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Supplier Code" />
              <input className={`${fi("")} bg-gray-100 cursor-not-allowed text-gray-400`} value={sd.supplierCode || ""} readOnly />
              <p className="text-[11px] text-gray-400 mt-1">Auto-generated</p>
            </div>
            <div>
              <Lbl text="Supplier Name" req />
              <input className={fi("supplierName")} name="supplierName" value={sd.supplierName || ""} onChange={handleChange} placeholder="e.g. ABC Traders Pvt Ltd" />
              <Err k="supplierName" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Supplier Group" req />
              <GroupSearch value={sd.supplierGroup} onSelectGroup={name => { setSd(p => ({ ...p, supplierGroup: name })); clearErr("supplierGroup"); }} />
              <Err k="supplierGroup" />
            </div>
            <div>
              <Lbl text="Supplier Type" req />
              <select className={fi("supplierType")} name="supplierType" value={sd.supplierType || ""} onChange={handleChange}>
                <option value="">Select type…</option>
                <option>Manufacturer</option>
                <option>Distributor</option>
                <option>Wholesaler</option>
                <option>Service Provider</option>
              </select>
              <Err k="supplierType" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Supplier Category" />
              <input className={fi("")} name="supplierCategory" value={sd.supplierCategory || ""} onChange={handleChange} placeholder="e.g. Electronics, Raw Materials" />
            </div>
            <div>
              <Lbl text="Incorporated Date" />
              <input className={fi("")} name="incorporated" type="date" value={sd.incorporated || ""} onChange={handleChange} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Quality Rating" />
              <select className={fi("")} name="qualityRating" value={sd.qualityRating || "B"} onChange={handleChange}>
                {["A+","A","B","C","D"].map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <Lbl text="Lead Time (Days)" />
              <input className={fi("")} name="leadTime" type="number" placeholder="e.g. 7" value={sd.leadTime || ""} onChange={handleChange} />
            </div>
          </div>
        </div>
      );

      // ── Step 2: Contact ──
      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Email ID" />
              <input className={fi("emailId")} name="emailId" type="email" value={sd.emailId || ""} onChange={handleChange} placeholder="supplier@email.com" />
              <Err k="emailId" />
            </div>
            <div>
              <Lbl text="Mobile Number" />
              <input className={fi("mobileNumber")} name="mobileNumber" type="text" maxLength={10} placeholder="10-digit" value={sd.mobileNumber || ""}
                onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) handleChange(e); }} />
              <Err k="mobileNumber" />
            </div>
            <div>
              <Lbl text="Contact Person" />
              <input className={fi("")} name="contactPersonName" value={sd.contactPersonName || ""} onChange={handleChange} placeholder="Full name" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <Lbl text="Contact Number" />
              <input className={fi("contactNumber")} name="contactNumber" type="text" maxLength={10} placeholder="10-digit" value={sd.contactNumber || ""}
                onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) handleChange(e); }} />
              <Err k="contactNumber" />
            </div>
            <div>
              <Lbl text="Alternate Contact" />
              <input className={fi("alternateContactNumber")} name="alternateContactNumber" type="text" maxLength={10} placeholder="10-digit" value={sd.alternateContactNumber || ""}
                onChange={e => { if (/^\d{0,10}$/.test(e.target.value)) handleChange(e); }} />
              <Err k="alternateContactNumber" />
            </div>
          </div>
        </div>
      );

      // ── Step 3: Addresses ──
      case 3: return (
        <div className="space-y-6">
          <div>
            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FaMapMarkerAlt className="text-indigo-500" /> Billing Addresses</p>
            <AddrBlock type="bill" list={sd.billingAddresses} accent={{ border: "border-indigo-100", badge: "bg-indigo-50 text-indigo-600", dashed: "border-indigo-200", addBtn: "text-indigo-500 hover:border-indigo-400 hover:bg-indigo-50" }} onChange={handleAddrChange} onRemove={removeAddr} onAdd={addAddr} onFetchPin={fetchPin} fi={fi} Err={Err} errs={errs} />
          </div>
          <div className="border-t border-gray-100 pt-5">
            <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><FaMapMarkerAlt className="text-emerald-500" /> Shipping Addresses</p>
            <AddrBlock type="ship" list={sd.shippingAddresses} accent={{ border: "border-emerald-100", badge: "bg-emerald-50 text-emerald-600", dashed: "border-emerald-200", addBtn: "text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50" }} onChange={handleAddrChange} onRemove={removeAddr} onAdd={addAddr} onFetchPin={fetchPin} fi={fi} Err={Err} errs={errs} />
          </div>
        </div>
      );

      // ── Step 4: Tax & Finance ──
      case 4: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="GST Number" />
              <input className={fi("gstNumber")} name="gstNumber" maxLength={15} placeholder="e.g. 22ABCDE1234F1Z5" value={sd.gstNumber || ""}
                onChange={e => { const v = e.target.value.toUpperCase(); if (/^[A-Z0-9]{0,15}$/.test(v)) handleChange({ target: { name: "gstNumber", value: v } }); }} />
              <Err k="gstNumber" />
            </div>
            <div>
              <Lbl text="GST Category" req />
              <select className={fi("gstCategory")} name="gstCategory" value={sd.gstCategory || ""} onChange={handleChange}>
                <option value="">Select GST Category…</option>
                {["Registered Regular","Registered Composition","Unregistered","SEZ","Overseas","Deemed Export","UIN Holders","Tax Deductor","Tax Collector","Input Service Distributor"].map(o => <option key={o}>{o}</option>)}
              </select>
              <Err k="gstCategory" />
            </div>
            <div>
              <Lbl text="PAN Number" req />
              <input className={fi("pan")} name="pan" maxLength={10} placeholder="e.g. ABCDE1234F" value={sd.pan || ""}
                onChange={e => { const v = e.target.value.toUpperCase(); if (/^[A-Z0-9]{0,10}$/.test(v)) handleChange({ target: { name: "pan", value: v } }); }} />
              <Err k="pan" />
              <p className="text-[11px] text-gray-400 mt-1">Format: AAAAA9999A</p>
            </div>
            <div>
              <Lbl text="Payment Terms (Days)" />
              <input className={fi("")} name="paymentTerms" type="number" placeholder="e.g. 30" value={sd.paymentTerms || ""} onChange={handleChange} />
            </div>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <Lbl text="GL Account" req />
            <AccountSearch value={sd.glAccount} onSelect={sel => { setSd(p => ({ ...p, glAccount: sel })); clearErr("glAccount"); }} />
            <Err k="glAccount" />
          </div>
        </div>
      );

      // ── Step 5: Bank Details ──
      case 5: return (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <FaUniversity className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Bank details are optional. If Udyam was verified, some fields may be pre-filled.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Bank Name" />
              <input className={fi("")} name="bankName" value={sd.bankName || ""} onChange={handleChange} placeholder="e.g. State Bank of India" />
            </div>
            <div>
              <Lbl text="Branch" />
              <input className={fi("")} name="branch" value={sd.branch || ""} onChange={handleChange} placeholder="e.g. Fort, Mumbai" />
            </div>
            <div>
              <Lbl text="Account Number" />
              <input className={fi("bankAccountNumber")} name="bankAccountNumber" type="text" maxLength={18} placeholder="9–18 digit number" value={sd.bankAccountNumber || ""}
                onChange={e => { const v = e.target.value.replace(/\D/g, ""); if (/^\d{0,18}$/.test(v)) handleChange({ target: { name: "bankAccountNumber", value: v } }); }} />
              <Err k="bankAccountNumber" />
            </div>
            <div>
              <Lbl text="IFSC Code" />
              <input className={fi("ifscCode")} name="ifscCode" type="text" maxLength={11} placeholder="e.g. SBIN0001234" value={sd.ifscCode || ""}
                onChange={e => { const v = e.target.value.toUpperCase(); if (/^[A-Z0-9]{0,11}$/.test(v)) handleChange({ target: { name: "ifscCode", value: v } }); }} />
              <Err k="ifscCode" />
              <p className="text-[11px] text-gray-400 mt-1">Format: AAAA0XXXXXX</p>
            </div>
          </div>
        </div>
      );

      // ── Step 6: Review ──
      case 6: return (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Review all details. Click <strong>Previous</strong> to edit any section.</p>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaBarcode className="text-indigo-400" /> Basic & Udyam</p>
            <RRow l="Code"       v={sd.supplierCode} />
            <RRow l="Name"       v={sd.supplierName} />
            <RRow l="Type"       v={sd.supplierType} />
            <RRow l="Group"      v={sd.supplierGroup} />
            <RRow l="Category"   v={sd.supplierCategory} />
            <RRow l="Udyam No."  v={sd.udyamNumber} />
            <RRow l="Incorporated" v={sd.incorporated} />
            <RRow l="Udyam Valid"  v={sd.valid === null ? "—" : sd.valid ? "✓ Valid" : "✗ Invalid"} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaPhone className="text-indigo-400" /> Contact</p>
            <RRow l="Email"     v={sd.emailId} />
            <RRow l="Mobile"    v={sd.mobileNumber} />
            <RRow l="Contact Person" v={sd.contactPersonName} />
            <RRow l="Contact No."    v={sd.contactNumber} />
            <RRow l="Alt Contact"    v={sd.alternateContactNumber} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><HiOutlineDocumentText className="text-indigo-400" /> Tax & Finance</p>
            <RRow l="GST"          v={sd.gstNumber} />
            <RRow l="GST Category" v={sd.gstCategory} />
            <RRow l="PAN"          v={sd.pan} />
            <RRow l="Payment Terms" v={sd.paymentTerms ? `${sd.paymentTerms} days` : ""} />
            <RRow l="GL Account"   v={sd.glAccount?.accountName} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaUniversity className="text-indigo-400" /> Bank</p>
            <RRow l="Bank Name" v={sd.bankName} />
            <RRow l="Branch"    v={sd.branch} />
            <RRow l="Account"   v={sd.bankAccountNumber} />
            <RRow l="IFSC"      v={sd.ifscCode} />
          </div>

          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5"><FaMapMarkerAlt className="text-indigo-400" /> Addresses</p>
            <RRow l="Billing Addresses"  v={`${(sd.billingAddresses  || []).filter(a => a.address1).length} added`} />
            <RRow l="Shipping Addresses" v={`${(sd.shippingAddresses || []).filter(a => a.address1).length} added`} />
          </div>
        </div>
      );

      default: return null;
    }
  };

  // ════════════════════════════════════════
  // ── LIST VIEW ──
  // ════════════════════════════════════════
  if (view === "list") return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Supplier Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{suppliers.length} total suppliers</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={downloadTemplate}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-700 transition-all">
              <FaDownload className="text-xs" /> Template
            </button>
            <label className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 cursor-pointer transition-all">
              {uploading ? "Uploading…" : <><FaFileUpload className="text-xs" /> Bulk Upload</>}
              <input type="file" hidden accept=".csv" onChange={handleBulk} />
            </label>
            <button onClick={() => { generateCode(); setView("form"); }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              <FaPlus className="text-xs" /> Add Supplier
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { label: "Total",        value: stats.total,        emoji: "🏭", filter: "All" },
            { label: "Manufacturer", value: stats.manufacturer, emoji: "⚙️",  filter: "Manufacturer" },
            { label: "Distributor",  value: stats.distributor,  emoji: "📦", filter: "Distributor" },
            { label: "Service",      value: stats.service,      emoji: "🔧", filter: "Service Provider" },
          ].map(s => (
            <div key={s.label} onClick={() => setFilterType(s.filter)}
              className={`bg-white rounded-2xl p-4 flex items-center gap-3 cursor-pointer border-2 transition-all
                ${filterType === s.filter ? "border-indigo-400 shadow-md shadow-indigo-100" : "border-transparent shadow-sm hover:border-indigo-200 hover:-translate-y-0.5"}`}>
              <span className="text-2xl">{s.emoji}</span>
              <div>
                <p className="text-[10.5px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="text-2xl font-extrabold tracking-tight text-gray-900 leading-none mt-0.5">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs pointer-events-none" />
              <input
                className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all placeholder:text-gray-300"
                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search suppliers…" />
            </div>
            <div className="flex gap-2 flex-wrap ml-auto">
              {["All","Manufacturer","Distributor","Wholesaler","Service Provider"].map(t => (
                <button key={t} onClick={() => setFilterType(t)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                    ${filterType === t ? "bg-indigo-600 text-white border-indigo-600" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-500"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Code","Supplier","Email","Type","Group","Valid","Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      {Array(7).fill(0).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3.5 rounded bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 bg-[length:400%_100%] animate-[shimmer_1.4s_infinite]" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-16">
                    <div className="text-4xl mb-2 opacity-20">🏭</div>
                    <p className="text-sm font-medium text-gray-300">No suppliers found</p>
                  </td></tr>
                ) : filtered.map(s => (
                  <tr key={s._id} onClick={() => { setViewSupplier(s); setViewOpen(true); }}
                    className="border-b border-gray-50 hover:bg-indigo-50/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3">
                      <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{s.supplierCode}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{s.supplierName}</p>
                      <p className="text-xs text-gray-400">{s.supplierCategory}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{s.emailId || <span className="text-gray-200">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full
                        ${s.supplierType === "Manufacturer"      ? "bg-blue-50 text-blue-600"
                          : s.supplierType === "Distributor"     ? "bg-amber-50 text-amber-600"
                          : s.supplierType === "Service Provider" ? "bg-purple-50 text-purple-600"
                          : "bg-gray-100 text-gray-500"}`}>
                        {s.supplierType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-medium">{s.supplierGroup || <span className="text-gray-200">—</span>}</td>
                    <td className="px-4 py-3">
                      {s.valid === true  ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">✓ Valid</span>
                       : s.valid === false ? <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-500">✗ Invalid</span>
                       : <span className="text-gray-200 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleEdit(s)} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all">
                          <FaEdit className="text-xs" />
                        </button>
                        <button onClick={() => handleDelete(s._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all">
                          <FaTrash className="text-xs" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Modal */}
      <SupplierViewModal open={viewOpen} onClose={() => { setViewOpen(false); setViewSupplier(null); }} supplier={viewSupplier} onEdit={s => { handleEdit(s); setViewOpen(false); }} />

      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
    </div>
  );

  // ════════════════════════════════════════
  // ── FORM VIEW ──
  // ════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

        {/* Back */}
        <button onClick={reset} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Suppliers
        </button>

        <h2 className="text-xl font-extrabold tracking-tight text-gray-900 mb-0.5">
          {sd._id ? "Edit Supplier" : "New Supplier"}
        </h2>
        <p className="text-sm text-gray-400 mb-6">
          Step {step} of {STEPS.length} — <span className="font-semibold text-gray-600">{STEPS[step - 1].label}</span>
        </p>

        {/* Stepper */}
        <div className="flex items-start mb-7">
          {STEPS.map((s, i) => {
            const Icon  = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center shrink-0">
                  <button type="button" onClick={() => done && setStep(s.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all
                      ${done   ? "bg-emerald-500 border-emerald-500 text-white cursor-pointer hover:bg-emerald-600"
                        : active ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                        : "bg-white border-gray-200 text-gray-300 cursor-default"}`}>
                    {done ? <FaCheck style={{ fontSize: 12 }} /> : <Icon style={{ fontSize: 12 }} />}
                  </button>
                  <span className={`text-[9px] font-bold uppercase tracking-wider mt-1.5 whitespace-nowrap hidden sm:block
                    ${done ? "text-emerald-500" : active ? "text-indigo-600" : "text-gray-300"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mt-[18px] mx-1 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8 mb-4">
          {/* Card header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500">
              {React.createElement(STEPS[step - 1].icon, { className: "text-base" })}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{STEPS[step - 1].label}</h3>
              <p className="text-xs text-gray-400">Fill in the details below</p>
            </div>
            <span className="ml-auto text-xs font-bold text-gray-300 font-mono">{step}/{STEPS.length}</span>
          </div>

          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={step > 1 ? goPrev : reset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <FaChevronLeft className="text-xs" /> {step > 1 ? "Previous" : "Cancel"}
          </button>

          <span className="text-xs font-bold text-gray-300 font-mono">{step} / {STEPS.length}</span>

          {step < STEPS.length ? (
            <button type="button" onClick={goNext}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
              Next <FaChevronRight className="text-xs" />
            </button>
          ) : (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
                : <><FaCheck className="text-xs" /> {sd._id ? "Update Supplier" : "Create Supplier"}</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// ── Supplier View Modal ──
// ════════════════════════════════════════
function SupplierViewModal({ open, onClose, supplier: s, onEdit }) {
  if (!open || !s) return null;

  const Row = ({ l, v }) => (
    <div className="bg-white rounded-lg p-3 border border-gray-100">
      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5">{l}</p>
      <p className="text-sm font-semibold text-gray-800">{v || <span className="text-gray-300 italic font-normal">—</span>}</p>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-blue-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-extrabold text-lg">
              {(s.supplierName || "?")[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-extrabold text-gray-900">{s.supplierName}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{s.supplierCode}</span>
                {s.valid === true  && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Udyam Valid</span>}
                {s.valid === false && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">✗ Udyam Invalid</span>}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-all">
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Basic */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Basic Info</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Row l="Type"      v={s.supplierType} />
              <Row l="Group"     v={s.supplierGroup} />
              <Row l="Category"  v={s.supplierCategory} />
              <Row l="Incorporated" v={s.incorporated} />
              <Row l="Lead Time" v={s.leadTime ? `${s.leadTime} days` : ""} />
              <Row l="Quality Rating" v={s.qualityRating} />
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Contact</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Row l="Email"           v={s.emailId} />
              <Row l="Mobile"          v={s.mobileNumber} />
              <Row l="Contact Person"  v={s.contactPersonName} />
              <Row l="Contact No."     v={s.contactNumber} />
              <Row l="Alt Contact"     v={s.alternateContactNumber} />
            </div>
          </div>

          {/* Tax */}
          <div>
            <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Tax & Finance</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <Row l="GST"          v={s.gstNumber} />
              <Row l="GST Category" v={s.gstCategory} />
              <Row l="PAN"          v={s.pan} />
              <Row l="Payment Terms" v={s.paymentTerms ? `${s.paymentTerms} days` : ""} />
              <Row l="GL Account"   v={s.glAccount?.accountName} />
            </div>
          </div>

          {/* Bank */}
          {(s.bankName || s.ifscCode) && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Bank Details</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Row l="Bank"    v={s.bankName} />
                <Row l="Branch"  v={s.branch} />
                <Row l="Account" v={s.bankAccountNumber} />
                <Row l="IFSC"    v={s.ifscCode} />
              </div>
            </div>
          )}

          {/* Addresses */}
          {s.billingAddresses?.[0]?.address1 && (
            <div>
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2">Billing Address</p>
              {s.billingAddresses.filter(a => a.address1).map((a, i) => (
                <div key={i} className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mb-2 text-sm text-gray-700">
                  <p className="font-semibold">{a.address1}</p>
                  {a.address2 && <p>{a.address2}</p>}
                  <p>{[a.city, a.state, a.pin, a.country].filter(Boolean).join(", ")}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-semibold transition-all">
            Close
          </button>
          <button onClick={() => onEdit(s)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all">
            <FaEdit className="text-xs" /> Edit Supplier
          </button>
        </div>
      </div>
    </div>
  );
}




// "use client";

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import GroupSearch from "@/components/groupmaster";
// import AccountSearch from "@/components/AccountSearch";
// import { toast } from "react-toastify";

// export default function SupplierManagement() {

//   const emptyAddress = {
//     address1: "",
//     address2: "",
//     city: "",
//     pin: "",
//     country: "",
//     state: "",
//   };
  
//   const [view, setView] = useState("list");
//   const [suppliers, setSuppliers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [errors, setErrors] = useState({});
//   const [error, setError] = useState({});
//   const [loading, setLoading] = useState(false);
//   const [uploading, setUploading] = useState(false);

//   const [supplierDetails, setSupplierDetails] = useState({
//     supplierCode: "",
//     supplierName: "",
//     supplierType: "",
//     supplierGroup: "",
//     supplierCategory: "",
//     emailId: "",
//     mobileNumber: "",
//     contactPersonName: "",
   
//     contactNumber: "",
//     alternateContactNumber: "",
//      udyamNumber: "",
//     incorporated: "",
//     valid: false,

//     billingAddresses: [{ ...emptyAddress }],
//   shippingAddresses: [{ ...emptyAddress }],
//     paymentTerms: "",
//     gstNumber: "",
//     gstCategory: "",
//     pan: "",
//     bankName: "",
//     branch: "",
//     bankAccountNumber: "",
//     ifscCode: "",
//     leadTime: "",
//     qualityRating: "B",
//     glAccount: null,
//   });
//   const [isViewOpen, setIsViewOpen] = useState(false);
//   const [viewSupplier, setViewSupplier] = useState(null);
  
//   const openSupplierView = (supplier) => {
//     setViewSupplier(supplier);
//     setIsViewOpen(true);
//   };
  
//   const closeSupplierView = () => {
//     setIsViewOpen(false);
//     setViewSupplier(null);
//   };
  
//   const fetchSuppliers = async () => {
//     setLoading(true);

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("No token found");

//       const res = await axios.get("/api/suppliers", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (res.data.success) {
//         setSuppliers(res.data.data || []);
//       } else {
//         setError(res.data.message || "Failed to load suppliers.");
//       }
//     } catch (err) {
//       console.error("Fetch error:", err);
//       setError("Failed to load suppliers.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchSuppliers();
//   }, []);


//   const fetchFromPincode = async (type, index, pin) => {
//     if (!pin || pin.length !== 6) return;
  
//     try {
//       const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
//       const data = await res.json();
  
//       if (data?.[0]?.Status === "Success") {
//         const post = data[0]?.PostOffice?.[0];
//         if (!post) return;
  
//         handleAddressChange(type, index, "city", post.District || "");
//         handleAddressChange(type, index, "state", post.State || "");
//         handleAddressChange(type, index, "country", "India");
//       }
//     } catch (err) {
//       console.error("PIN lookup failed", err);
//     }
//   };
  

  
//   const verifyUdyam = async (e) => {
//     e.preventDefault(); // prevent form reload on button click
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         toast.error("Unauthorized: Please log in again");
//         return;
//       }

//       const res = await fetch("/api/udyam", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify({ udyamNumber: supplierDetails.udyamNumber }),
//       });

//       const data = await res.json();
//       console.log("Udyam API Response:", data);

//       if (data.success && data.data) {
//         const udyam = data.data;

//         setSupplierDetails((prev) => ({
//           ...prev,
//           supplierName: udyam.entity || prev.supplierName,
//           supplierType: udyam.type || prev.supplierType,
//           mobileNumber:
//             udyam.officialAddress?.maskedMobile || prev.mobileNumber,

//           emailId: udyam.officialAddress?.maskedEmail || prev.emailId,
//           gstNumber: udyam.gstNumber || prev.gstNumber,
//           gstCategory: udyam.gstCategory || prev.gstCategory,
//           pan: udyam.pan || prev.pan,
//           bankName: udyam.bankName || prev.bankName,
//           branch: udyam.branch || prev.branch,
//           bankAccountNumber: udyam.bankAccountNumber || prev.bankAccountNumber,
//           ifscCode: udyam.ifscCode || prev.ifscCode,
//           supplierType: udyam.type || prev.supplierType,
//           supplierCategory: udyam.majorActivity?.join(", ") || prev.supplierCategory,
//           incorporated: udyam.incorporated || prev.incorporated,
//           valid: udyam.valid ?? prev.valid,
//           billingAddresses: [
//             {
//               address1: `${udyam.officialAddress?.unitNumber || ""}, ${
//                 udyam.officialAddress?.building || ""
//               }`,
//               address2: `${udyam.officialAddress?.road || ""}, ${
//                 udyam.officialAddress?.villageOrTown || ""
//               }`,
//               city: udyam.officialAddress?.city || "",
//               state: udyam.officialAddress?.state || "",
//               country: "India",
//               pin: udyam.officialAddress?.zip || "",
//             },
//           ],
//         }));

//         toast.success("Udyam details fetched successfully!");
//       } else {
//         toast.error(data.message || "Failed to verify Udyam number");
//       }
//     } catch (err) {
//       console.error("verifyUdyam error:", err);
//       toast.error("Error verifying Udyam");
//     }
//   };

//   const generateSupplierCode = async () => {
//     try {
//       const token = localStorage.getItem("token"); // Make sure this is how you store your token

//       const response = await axios.get("/api/lastSupplierCode", {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       const lastCode = response.data.lastSupplierCode || "SUPP-0000";
//       const num = parseInt(lastCode.split("-")[1] || "0", 10) + 1;

//       setSupplierDetails((prev) => ({
//         ...prev,
//         supplierCode: `SUPP-${num.toString().padStart(4, "0")}`,
//       }));
//     } catch (err) {
//       console.error("Error generating supplier code:", err);
//     }
//   };

  

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setSupplierDetails((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleAddressChange = (type, idx, field, value) => {
//     const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
//     const arr = [...supplierDetails[key]];
//     arr[idx][field] = value;
//     setSupplierDetails((prev) => ({ ...prev, [key]: arr }));
//   };

//   const addAddress = (type) => {
//     setSupplierDetails((prev) => {
//       const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
//       return {
//         ...prev,
//         [key]: [...(prev[key] || []), { ...emptyAddress }],
//       };
//     });
//   };
  

//   const removeAddress = (type, index) => {
//     setSupplierDetails((prev) => {
//       const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
//       const updated = (prev[key] || []).filter((_, i) => i !== index);
  
//       return {
//         ...prev,
//         [key]: updated.length ? updated : [{ ...emptyAddress }],
//       };
//     });
//   };
  

//   const validate = () => {
//     const errs = {};
//     const {
//       supplierName,
//       supplierType,
    
     
//       emailId,
     
//       mobileNumber,
 
//     } = supplierDetails;

//     if (!supplierName) {
//       errs.supplierName = "Supplier Name is required";
//       toast.error(errs.supplierName);
//     }

//     if (!supplierType) {
//       errs.supplierType = "Supplier Type is required";
//       toast.error(errs.supplierType);
//     }

//     if (!supplierGroup) {
//       errs.supplierGroup = "Supplier Group is required";
//       toast.error(errs.supplierGroup);
//     }

//     if (!gstCategory) {
//       errs.gstCategory = "GST Category is required";
//       toast.error(errs.gstCategory);
//     }

//     if (!pan) {
//       errs.pan = "PAN is required";
//       toast.error(errs.pan);
//     } else if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
//       errs.pan = "Invalid PAN format. Example: ABCDE1234F";
//       toast.error(errs.pan);
//     }

//     if (emailId && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(emailId)) {
//       errs.emailId = "Invalid email format";
//       toast.error(errs.emailId);
//     }

//     if (
//       gstNumber &&
//       !/^\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
//         gstNumber
//       )
//     ) {
//       errs.gstNumber = "Invalid GST Number. Example: 22ABCDE1234F1Z5";
//       toast.error(errs.gstNumber);
//     }

//     if (mobileNumber && !/^\d{10}$/.test(mobileNumber)) {
//       errs.mobileNumber = "Mobile Number must be exactly 10 digits";
//       toast.error(errs.mobileNumber);
//     }

//     if (!glAccount || !glAccount._id) {
//       errs.glAccount = "GL Account is required";
//       toast.error(errs.glAccount);
//     }

//     setErrors(errs);
//     return Object.keys(errs).length === 0;
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;

//     const token = localStorage.getItem("token");
//     if (!token) {
//       alert("Unauthorized! Please log in again.");
//       return;
//     }

//     const payload = {
//       ...supplierDetails,
//       glAccount: supplierDetails.glAccount?._id || null,
//     };

//     try {
//       let res;

//       if (supplierDetails._id) {
//         // ✅ Update supplier
//         res = await axios.put(
//           `/api/suppliers/${supplierDetails._id}`,
//           payload,
//           {
//             headers: {
//               Authorization: `Bearer ${token}`,
//               "Content-Type": "application/json",
//             },
//           }
//         );

//         // ✅ Update state with updated supplier
//         setSuppliers((prev) =>
//           prev.map((s) => (s._id === res.data.data._id ? res.data.data : s))
//         );
//       } else {
//         // ✅ Create supplier
//         res = await axios.post("/api/suppliers", payload, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         });

//         // ✅ Add new supplier to state
//         setSuppliers((prev) => [...prev, res.data.data]);
//       }

//       setView("list"); // ✅ Go back to list view after save
//     } catch (err) {
//       console.error(
//         "Error saving supplier:",
//         err.response?.data || err.message
//       );
//       alert(err.response?.data?.message || "Failed to save supplier");
//     }
//   };

//   const getFieldError = (field) =>
//     errors[field] && (
//       <p className="text-red-500 text-sm mt-1">{errors[field]}</p>
//     );
//   const handleEdit = (s) => {
//     setSupplierDetails(s);
//     setView("form");
//   };
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure?")) return;
//     await axios.delete(`/api/suppliers/${id}`);
//     setSuppliers((prev) => prev.filter((s) => s._id !== id));
//   };

//   const filtered = suppliers.filter((s) =>
//     [
//       s.supplierCode,
//       s.supplierName,
//       s.emailId,
//       s.supplierType,
//       s.supplierGroup,
//     ].some((v) => v?.toLowerCase().includes(searchTerm.toLowerCase()))
//   );



// const handleBulkUpload = async (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   setUploading(true);
//   const token = localStorage.getItem("token");

//   try {
//     const text = await file.text();
//     const rows = text.split("\n").map((r) => r.trim()).filter((r) => r);
//     const headers = rows[0].split(",").map((h) => h.trim());
//     const jsonData = rows.slice(1).map((line) => {
//       const values = line.split(",");
//       const obj = {};
//       headers.forEach((key, i) => {
//         obj[key] = values[i]?.trim() || "";
//       });
//       return obj;
//     });

//     const res = await axios.post(
//       "/api/suppliers/bulk",
//       { suppliers: jsonData },
//       { headers: { Authorization: `Bearer ${token}` } }
//     );

//     const data = res.data;
//     if (!data.success) {
//       toast.error(data.message || "Bulk upload failed");
//       return;
//     }

//     // ✅ Success / Warning / Error handling
//     const total = data.results.length;
//     const successCount = data.results.filter((r) => r.success).length;
//     const failCount = data.results.filter((r) => !r.success).length;

//     if (successCount === total) {
//       toast.success(`✅ All ${total} records uploaded successfully!`);
//     } else if (successCount > 0 && failCount > 0) {
//       toast.warning(
//         `⚠️ ${successCount} uploaded successfully, ${failCount} skipped.`
//       );
//       console.group("Skipped Records");
//       data.results
//         .filter((r) => !r.success)
//         .forEach((r) => console.warn(`Row ${r.row}: ${r.errors.join(", ")}`));
//       console.groupEnd();
//     } else {
//       toast.error("❌ All records failed to upload. Check your CSV file.");
//     }

//     // Optionally reload your table data
//     fetchSuppliers();

//   } catch (err) {
//     console.error("Bulk Upload Error:", err);
//     toast.error("Something went wrong during upload.");
//   } finally {
//     setUploading(false);
//     e.target.value = ""; // reset file input
//   }
// };


// const parseCSV = (csv) => {
//   const lines = csv.split("\n").filter((line) => line.trim() !== "");
//   const headers = lines[0].split(",");

//   return lines.slice(1).map((line) => {
//     const values = line.split(",");
//     let obj = {};
//     headers.forEach((h, i) => (obj[h.trim()] = values[i]?.trim() || ""));
//     return obj;
//   });
// };

// const downloadSupplierTemplate = () => {
//   const header = [
//     "supplierName",
//     "supplierGroup",
//     "supplierType",
//     "emailId",
//     "mobileNumber",
//     "gstNumber",
//     "gstCategory",
//     "pan",
//     "contactPersonName",
//     "commissionRate",
//     "paymentTerms",
//     "billingAddress1",
//     "billingAddress2",
//     "billingCity",
//     "billingState",
//     "billingPin",
//     "billingCountry",
//     "shippingAddress1",
//     "shippingAddress2",
//     "shippingCity",
//     "shippingState",
//     "shippingPin",
//     "shippingCountry",
//     "glAccount"
//   ];

//   const sample = [
//     "ABC Traders",
//     "Wholesale",
//     "Business",
//     "abc@traders.com",
//     "9876543210",
//     "22ABCDE1234F1Z5",
//     "Registered Regular",
//     "ABCDE1234F",
//     "Rahul Manager",
//     "5",
//     "30",
//     "Line 1",
//     "Line 2",
//     "Mumbai",
//     "Maharashtra",
//     "400001",
//     "India",
//     "Line 1",
//     "Line 2",
//     "Mumbai",
//     "Maharashtra",
//     "400002",
//     "India",
//     "BANKHEAD_OBJECT_ID"
//   ];

//   const csv = [header.join(","), sample.join(",")].join("\n");
//   const blob = new Blob([csv], { type: "text/csv" });
//   const link = document.createElement("a");
//   link.href = URL.createObjectURL(blob);
//   link.download = "supplier_bulk_upload_template.csv";
//   link.click();
// };

 
//   const renderListView = () => (
//   <div className="p-6">
//     {/* ✅ Header Section */}
//     <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
//       <h1 className="text-2xl font-bold">Supplier Management</h1>

//       <div className="flex flex-wrap gap-3">
//         {/* ✅ Download Template */}
//         <button
//           onClick={downloadSupplierTemplate}
//           className="inline-flex items-center bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded-md"
//         >
//           Download Template
//         </button>

//         {/* ✅ Bulk Upload */}
//         <label className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md cursor-pointer">
//           {uploading ? "Uploading..." : "Bulk Upload"}
//           <input type="file" accept=".csv" hidden onChange={handleBulkUpload} />
//         </label>

//         {/* ✅ Add Supplier */}
//         <button
//           onClick={() => {
//             generateSupplierCode();
//             setView("form");
//           }}
//           className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
//         >
//           <FaPlus className="mr-2" /> Add Supplier
//         </button>
//       </div>
//     </div>

//     {/* ✅ Search Bar */}
//     <div className="mb-4 relative max-w-md">
//       <input
//         value={searchTerm}
//         onChange={(e) => setSearchTerm(e.target.value)}
//         placeholder="Search suppliers..."
//         className="w-full border rounded-md py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
//       />
//       <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
//     </div>

//     {/* ✅ Table */}
//     <div className="overflow-x-auto">
//     {/* ✅ Table */}
// <div className="overflow-x-auto">
//   <table className="min-w-full bg-white divide-y divide-gray-200">
//     <thead className="bg-gray-50">
//       <tr>
//         {["Code", "Name", "Email", "Type", "Group", "Actions"].map((h) => (
//           <th
//             key={h}
//             className="px-4 py-2 text-left text-sm font-medium text-gray-700"
//           >
//             {h}
//           </th>
//         ))}
//       </tr>
//     </thead>
//     <tbody className="divide-y divide-gray-200">
//       {filtered.map((s) => (
//         <tr
//           key={s._id}
//           className="hover:bg-gray-50 cursor-pointer"
//           onClick={() => openSupplierView(s)}
//         >
//           <td className="px-4 py-2">{s.supplierCode}</td>
//           <td className="px-4 py-2">{s.supplierName}</td>
//           <td className="px-4 py-2">{s.emailId}</td>
//           <td className="px-4 py-2">{s.supplierType}</td>
//           <td className="px-4 py-2">{s.supplierGroup}</td>

//           <td className="px-4 py-2 flex space-x-3">
//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleEdit(s);
//               }}
//               className="text-blue-600"
//             >
//               <FaEdit />
//             </button>

//             <button
//               onClick={(e) => {
//                 e.stopPropagation();
//                 handleDelete(s._id);
//               }}
//               className="text-red-600"
//             >
//               <FaTrash />
//             </button>
//           </td>
//         </tr>
//       ))}
//     </tbody>
//   </table>
// </div>

// {/* ✅ Modal */}
// <SupplierViewModal
//   open={isViewOpen}
//   onClose={closeSupplierView}
//   supplier={viewSupplier}
// />

//     </div>
//   </div>
// );


//   const renderFormView = () => (
//     <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
//       <h2 className="text-2xl font-semibold mb-6 text-center">
//         {supplierDetails._id ? "Edit Supplier" : "New Supplier"}
//       </h2>
//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div className="grid sm:grid-cols-2 gap-4">
//           <div>
//             {/* uddyam */}
//             <input
//               name="udyamNumber"
//               value={supplierDetails.udyamNumber || ""}
//               onChange={(e) =>
//                 setSupplierDetails((prev) => ({
//                   ...prev,
//                   udyamNumber: e.target.value,
//                 }))
//               }
//               placeholder="Udyam Number"
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 mb-2"
//             />
//             {getFieldError("udyamNumber")}
//           </div>
//             <div>
//               <button
//                 onClick={verifyUdyam}
//                 className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
//               >
//                 <FaSearch className="mr-2" /> Verify Udyam
//               </button>
//             </div>
        
//         </div>
//         {/* Incorporated Date */}
//         <div className="grid sm:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Incorporated Date
//             </label>
//             <input
//               name="incorporated"
//               value={supplierDetails.incorporated}
//               onChange={handleChange}
//               placeholder="Incorporated Date"
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//            {/* Udyam Validity this vaild ture false like  this i want fetch if the the from the udyam  */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Valid
//             </label>
//             <select
//               name="valid"
//               value={supplierDetails.valid}
//               onChange={handleChange}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             >
//               <option value={null}>Select</option>
//               <option value={true}>True</option>
//               <option value={false}>False</option>
//             </select>
//           </div>
//         </div>
//         <div className="grid sm:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Code
//             </label>
//             <input
//               name="supplierCode"
//               value={supplierDetails.supplierCode}
//               readOnly
//               className="w-full border rounded-md p-2 bg-gray-100"
//             />
//             {getFieldError("supplierCode")}
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Supplier Name <span className="text-red-500">*</span>
//             </label>
//             <input
//               name="supplierName"
//               value={supplierDetails.supplierName}
//               onChange={handleChange}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//             {getFieldError("supplierName")}
//           </div>
//         </div>
      

//         <div className="grid sm:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Supplier Group <span className="text-red-500">*</span>
//             </label>
//             <GroupSearch
//               value={supplierDetails.supplierGroup}
//               onSelectGroup={(name) =>
//                 setSupplierDetails((prev) => ({ ...prev, supplierGroup: name }))
//               }
//             />
//             {!supplierDetails.supplierGroup && (
//               <p className="text-red-500 text-sm mt-1">
//                 Supplier Group is required
//               </p>
//             )}
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Supplier Type <span className="text-red-500">*</span>
//             </label>
//             <select
//               name="supplierType"
//               value={supplierDetails.supplierType}
//               onChange={handleChange}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             >
//               <option value="">Select</option>
//               <option>Manufacturer</option>
//               <option>Distributor</option>
//               <option>Wholesaler</option>
//               <option>Service Provider</option>
//             </select>
//             {getFieldError("supplierType")}
//           </div>
//         </div>

//         <div className="grid sm:grid-cols-3 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Email ID <span className="text-red-500">*</span>
//             </label>
//             <input
//               name="emailId"
//               type="email"
//               value={supplierDetails.emailId}
//               onChange={handleChange}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Mobile Number
//             </label>
//             <input
//               name="mobileNumber"
//               type="text"
//               placeholder="Mobile Number"
//               maxLength={10}
//               value={supplierDetails.mobileNumber || ""}
//               onChange={(e) => {
//                 const input = e.target.value;
//                 if (/^\d{0,10}$/.test(input)) {
//                   handleChange(e); // only allow up to 10 digits
//                 }
//               }}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Contact Person
//             </label>
//             <input
//               name="contactPersonName"
//               value={supplierDetails.contactPersonName}
//               onChange={handleChange}
//               placeholder="Contact Person"
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//         </div>

//         <div className="grid sm:grid-cols-3 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Contact Number
//             </label>
//             <input
//               name="contactNumber"
//               type="text"
//               placeholder="Contact Number"
//               maxLength={10}
//               value={supplierDetails.contactNumber || ""}
//               onChange={(e) => {
//                 const input = e.target.value;
//                 if (/^\d{0,10}$/.test(input)) {
//                   handleChange(e); // only allow up to 10 digits
//                 }
//               }}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Alternate Contact Number
//             </label>
//             <input
//               name="alternateContactNumber"
//               type="text"
//               placeholder="Alternate Contact Number"
//               maxLength={10}
//               value={supplierDetails.alternateContactNumber || ""}      
//               onChange={(e) => {
//                 const input = e.target.value;
//                 if (/^\d{0,10}$/.test(input)) {
//                   handleChange(e); // only allow up to 10 digits
//                 }
//               }}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           </div>

//         <h3 className="text-lg font-semibold">Billing Addresses</h3>
//         {(supplierDetails.billingAddresses || []).map((addr, i) => {
//   const safeAddr = addr || emptyAddress;

//   return (
//     <div key={i} className="border p-4 rounded mb-4">
//       <div className="flex justify-between items-center mb-2">
//         <span className="font-medium">Billing Address {i + 1}</span>
//         {i > 0 && (
//           <button
//             type="button"
//             onClick={() => removeAddress("billing", i)}
//             className="text-red-600"
//           >
//             <FaMinus />
//           </button>
//         )}
//       </div>

//       <div className="grid sm:grid-cols-2 gap-4">
//         <input
//           value={safeAddr.address1 || ""}
//           onChange={(e) =>
//             handleAddressChange("billing", i, "address1", e.target.value)
//           }
//           placeholder="Line 1"
//           className="border p-2 rounded"
//         />

//         <input
//           value={safeAddr.address2 || ""}
//           onChange={(e) =>
//             handleAddressChange("billing", i, "address2", e.target.value)
//           }
//           placeholder="Line 2"
//           className="border p-2 rounded"
//         />

//         <input
//           value={safeAddr.city || ""}
//           onChange={(e) =>
//             handleAddressChange("billing", i, "city", e.target.value)
//           }
//           placeholder="City"
//           className="border p-2 rounded"
//         />

// <input
//   value={safeAddr.pin || ""}
//   onChange={(e) => {
//     const pin = e.target.value;
//     handleAddressChange("billing", i, "pin", pin);
//     fetchFromPincode("billing", i, pin);
//   }}
//   placeholder="PIN"
//   className="border p-2 rounded"
// />


//         <CountryStateSearch
//           valueCountry={safeAddr.country ? { name: safeAddr.country } : null}
//           valueState={safeAddr.state ? { name: safeAddr.state } : null}
//           onSelectCountry={(c) =>
//             handleAddressChange("billing", i, "country", c?.name || "")
//           }
//           onSelectState={(s) =>
//             handleAddressChange("billing", i, "state", s?.name || "")
//           }
//         />
//       </div>
//     </div>
//   );
// })}

//         <button
//           type="button"
//           onClick={() => addAddress("billing")}
//           className="inline-flex items-center text-blue-600 mb-6"
//         >
//           <FaPlus className="mr-1" /> Add Billing Address
//         </button>

//         <h3 className="text-lg font-semibold">Shipping Addresses</h3>
//         {(supplierDetails.shippingAddresses || []).map((addr, i) => {
//   const safeAddr = addr || emptyAddress;

//   return (
//     <div key={i} className="border p-4 rounded mb-4">
//       <div className="flex justify-between items-center mb-2">
//         <span className="font-medium">Shipping Address {i + 1}</span>
//         {i > 0 && (
//           <button
//             type="button"
//             onClick={() => removeAddress("shipping", i)}
//             className="text-red-600"
//           >
//             <FaMinus />
//           </button>
//         )}
//       </div>

//       <div className="grid sm:grid-cols-2 gap-4">
//         <input
//           value={safeAddr.address1 || ""}
//           onChange={(e) =>
//             handleAddressChange("shipping", i, "address1", e.target.value)
//           }
//           placeholder="Line 1"
//           className="border p-2 rounded"
//         />

//         <input
//           value={safeAddr.address2 || ""}
//           onChange={(e) =>
//             handleAddressChange("shipping", i, "address2", e.target.value)
//           }
//           placeholder="Line 2"
//           className="border p-2 rounded"
//         />

//         <input
//           value={safeAddr.city || ""}
//           onChange={(e) =>
//             handleAddressChange("shipping", i, "city", e.target.value)
//           }
//           placeholder="City"
//           className="border p-2 rounded"
//         />

// <input
//   value={safeAddr.pin || ""}
//   onChange={(e) => {
//     const pin = e.target.value;
//     handleAddressChange("shipping", i, "pin", pin);
//     fetchFromPincode("shipping", i, pin);
//   }}
//   placeholder="PIN"
//   className="border p-2 rounded"
// />


//         <CountryStateSearch
//           valueCountry={safeAddr.country ? { name: safeAddr.country } : null}
//           valueState={safeAddr.state ? { name: safeAddr.state } : null}
//           onSelectCountry={(c) =>
//             handleAddressChange("shipping", i, "country", c?.name || "")
//           }
//           onSelectState={(s) =>
//             handleAddressChange("shipping", i, "state", s?.name || "")
//           }
//         />
//       </div>
//     </div>
//   );
// })}

//         <button
//           type="button"
//           onClick={() => addAddress("shipping")}
//           className="inline-flex items-center text-blue-600 mb-6"
//         >
//           <FaPlus className="mr-1" /> Add Shipping Address
//         </button>

//         <div className="grid sm:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Payment Terms (In Days)
//             </label>
//             <input
//               name="paymentTerms"
//               value={supplierDetails.paymentTerms}
//               onChange={handleChange}
//               placeholder="Payment Terms"
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               GST Number
//             </label>
//             <input
//               name="gstNumber"
//               type="text"
//               placeholder="Enter GST Number"
//               value={supplierDetails.gstNumber || ""}
//               onChange={(e) => {
//                 const input = e.target.value.toUpperCase();
//                 if (/^[A-Z0-9]{0,15}$/.test(input)) {
//                   handleChange({ target: { name: "gstNumber", value: input } });
//                 }
//               }}
//               maxLength={15}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               GST Category <span className="text-red-500">*</span>
//             </label>
//             <select
//               name="gstCategory"
//               value={supplierDetails.gstCategory}
//               onChange={handleChange}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//               required
//             >
//               <option value="">Select GST Category</option>
//               <option value="Registered Regular">Registered Regular</option>
//               <option value="Registered Composition">
//                 Registered Composition
//               </option>
//               <option value="Unregistered">Unregistered</option>
//               <option value="SEZ">SEZ</option>
//               <option value="Overseas">Overseas</option>
//               <option value="Deemed Export">Deemed Export</option>
//               <option value="UIN Holders">UIN Holders</option>
//               <option value="Tax Deductor">Tax Deductor</option>
//               <option value="Tax Collector">Tax Collector</option>
//               <option value="Input Service Distributor">
//                 Input Service Distributor
//               </option>
//             </select>
//             {getFieldError("gstCategory")}
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               PAN Number
//             </label>
//             <input
//               name="pan"
//               type="text"
//               placeholder="Enter PAN Number"
//               value={supplierDetails.pan || ""}
//               onChange={(e) => {
//                 const input = e.target.value.toUpperCase();
//                 if (/^[A-Z0-9]{0,10}$/.test(input)) {
//                   handleChange({ target: { name: "pan", value: input } });
//                 }
//               }}
//               maxLength={10}
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <AccountSearch
//               value={supplierDetails.glAccount}
//               onSelect={(selected) => {
//                 setSupplierDetails((prev) => ({
//                   ...prev,
//                   glAccount: selected,
//                 }));
//               }}
//             />
//             {getFieldError("glAccount")}
//           </div>
//         </div>

//         <div className="grid sm:grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Bank Name
//             </label>
//             <input
//               name="bankName"
//               value={supplierDetails.bankName}
//               onChange={handleChange}
//               placeholder="Bank Name"
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Branch
//             </label>
//             <input
//               name="branch"
//               value={supplierDetails.branch}
//               onChange={handleChange}
//               placeholder="Branch"
//               className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Account Number
//           </label>
//           <input
//             name="accountNumber"
//             type="text"
//             placeholder="Enter Account Number"
//             maxLength={18}
//             required
//             className="border rounded px-3 py-2 w-full"
//             pattern="\d{9,18}"
//             title="Account Number must be 9 to 18 digits"
//             onChange={(e) => {
//               const input = e.target.value.replace(/\D/g, ""); // Only digits
//               if (/^\d{0,18}$/.test(input)) {
//                 handleChange({
//                   target: { name: "accountNumber", value: input },
//                 });
//               }
//             }}
//           />

//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             IFSC Code
//           </label>
//           <input
//             name="ifscCode"
//             type="text"
//             placeholder="Enter IFSC Code"
//             maxLength={11}
//             required
//             className="uppercase border rounded px-3 py-2 w-full"
//             pattern="^[A-Z]{4}0[A-Z0-9]{6}$"
//             title="Enter valid IFSC like SBIN0001234"
//             onChange={(e) => {
//               const input = e.target.value.toUpperCase();
//               if (/^[A-Z0-9]{0,11}$/.test(input)) {
//                 handleChange({ target: { name: "ifscCode", value: input } });
//               }
//             }}
//           />
//         </div>

//         <div className="flex justify-end space-x-3 mt-6">
//           <button
//             type="button"
//             onClick={() => setView("list")}
//             className="px-4 py-2 bg-gray-500 text-white rounded-md"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             className="px-4 py-2 bg-green-600 text-white rounded-md"
//           >
//             {supplierDetails._id ? "Update" : "Create"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
//   return view === "list" ? renderListView() : renderFormView();
// }



// const SupplierViewModal = ({ open, onClose, supplier }) => {
//   if (!open || !supplier) return null;

//   return (
//     <div className="fixed inset-0 z-50 flex items-center justify-center">
//       {/* overlay */}
//       <div
//         className="absolute inset-0 bg-black/40"
//         onClick={onClose}
//       />

//       {/* modal */}
//       <div className="relative z-50 w-[95%] max-w-2xl bg-white rounded-xl shadow-xl">
//         {/* header */}
//         <div className="flex items-center justify-between px-5 py-4 border-b">
//           <div>
//             <h2 className="text-lg font-bold">Supplier Details</h2>
//             <p className="text-sm text-gray-500">
//               {supplier?.supplierName} ({supplier?.supplierCode})
//             </p>
//           </div>

//           <button
//             onClick={onClose}
//             className="text-gray-600 hover:text-black text-2xl leading-none"
//           >
//             ×
//           </button>
//         </div>

//         {/* body */}
//         <div className="p-5">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="bg-gray-50 p-3 rounded-lg">
//               <p className="text-xs text-gray-500">Supplier Code</p>
//               <p className="font-semibold">{supplier?.supplierCode || "-"}</p>
//             </div>

//             <div className="bg-gray-50 p-3 rounded-lg">
//               <p className="text-xs text-gray-500">Supplier Name</p>
//               <p className="font-semibold">{supplier?.supplierName || "-"}</p>
//             </div>

//             <div className="bg-gray-50 p-3 rounded-lg">
//               <p className="text-xs text-gray-500">Email</p>
//               <p className="font-semibold">{supplier?.emailId || "-"}</p>
//             </div>

//             <div className="bg-gray-50 p-3 rounded-lg">
//               <p className="text-xs text-gray-500">Mobile</p>
//               <p className="font-semibold">{supplier?.mobileNo || "-"}</p>
//             </div>

//             <div className="bg-gray-50 p-3 rounded-lg">
//               <p className="text-xs text-gray-500">Supplier Type</p>
//               <p className="font-semibold">{supplier?.supplierType || "-"}</p>
//             </div>

//             <div className="bg-gray-50 p-3 rounded-lg">
//               <p className="text-xs text-gray-500">Supplier Group</p>
//               <p className="font-semibold">{supplier?.supplierGroup || "-"}</p>
//             </div>

//             <div className="bg-gray-50 p-3 rounded-lg sm:col-span-2">
//               <p className="text-xs text-gray-500">Address</p>
//               <p className="font-semibold">{supplier?.address || "-"}</p>
//             </div>
//           </div>
//         </div>

//         {/* footer */}
//         <div className="flex justify-end gap-3 px-5 py-4 border-t">
//           <button
//             onClick={onClose}
//             className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
//           >
//             Close
//           </button>

//           <button
//             onClick={() => {
//               // optional: edit open bhi kar sakte ho yaha se
//               // handleEdit(supplier)
//               onClose();
//             }}
//             className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white"
//           >
//             Edit Supplier
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
