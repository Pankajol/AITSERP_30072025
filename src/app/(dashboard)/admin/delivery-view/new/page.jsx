"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast , ToastContainer} from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import {
  FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaTimes
} from "react-icons/fa";

// ============================================================
// HELPERS & SUB-COMPONENTS (Defined OUTSIDE to prevent focus loss)
// ============================================================

const initialState = {
  customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  salesEmployee: "", status: "Open",
  deliveryDate: "", expectedDeliveryDate: "",
  billingAddress: null, shippingAddress: null,
  items: [{
    item: "", itemCode: "", itemId: "", itemName: "", itemDescription: "",
    quantity: 0, allowedQuantity: 0, receivedQuantity: 0,
    unitPrice: 0, discount: 0, freight: 0,
    taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    warehouse: "", warehouseName: "", warehouseCode: "", warehouseId: "",
    managedByBatch: true,
  }],
  remarks: "", freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0,
  attachments: [],
};

const round = (num, d = 2) => { const n = Number(num); return isNaN(n) ? 0 : Number(n.toFixed(d)); };

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const computeItemValues = (item) => {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discount) || 0;
  const fr = parseFloat(item.freight) || 0;
  const pad = round(price - disc);
  const total = round(qty * pad + fr);
  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgst = round(total * (gstRate / 200));
    return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst * 2, cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0 };
  }
  const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
  return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
};

const Lbl = ({ text, req }) => (
  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
    {text}{req && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const fi = (readOnly = false) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
   ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
    <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
      <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}><Icon className="text-sm" /></div>
      <div><p className="text-sm font-bold text-gray-900">{title}</p>{subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}</div>
    </div>
    <div className="px-6 py-5">{children}</div>
  </div>
);

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function DeliveryPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Delivery Form...</div>}>
      <DeliveryForm />
    </Suspense>
  );
}

function DeliveryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("editId");

  const [formData, setFormData]           = useState(initialState);
  const [attachments, setAttachments]     = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles]   = useState([]);
  const [loading, setLoading]             = useState(false);
  const [submitting, setSubmitting]       = useState(false);
  const [error, setError]                 = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAdmin, setIsAdmin]             = useState(false);
  const [isCopied, setIsCopied]           = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [stockError, setStockError]       = useState(null);

  const stableInitial = useMemo(() => initialState, []);
  const isReadOnly = !!editId && !isAdmin;

  // Initial Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      setIsAdmin(roles.includes("admin") || roles.includes("sales manager") || d?.type === "company");
    } catch (e) { console.error(e); }
  }, []);

  // Load from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("deliveryData");
    setAttachmentsLoading(true);
    if (!stored) { setAttachmentsLoading(false); return; }
    try {
      const parsed = JSON.parse(stored);
      setFormData({ ...stableInitial, ...parsed, deliveryDate: formatDate(new Date()), expectedDeliveryDate: "" });
      if (Array.isArray(parsed.attachments) && parsed.attachments.length > 0) {
        const normalized = parsed.attachments
          .map(f => f?.fileUrl ? { fileUrl: f.fileUrl, fileName: f.fileName || f.fileUrl.split("/").pop() || "Attachment", fileType: f.fileType || "image/*" } : null)
          .filter(Boolean);
        setExistingFiles(normalized);
      }
      setIsCopied(true);
    } catch (err) { console.error(err); }
    finally { sessionStorage.removeItem("deliveryData"); setAttachmentsLoading(false); }
  }, [stableInitial]);

  // Load existing for edit
  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      axios.get(`/api/delivery/${editId}`)
        .then(res => {
          const record = res.data.data;
          const items = Array.isArray(record.items)
            ? record.items.map(i => ({ ...stableInitial.items[0], ...i, item: i.item?._id || i.item || "", warehouse: i.warehouse?._id || i.warehouse || "", taxOption: i.taxOption || "GST" }))
            : [...stableInitial.items];
          setFormData({ ...stableInitial, ...record, items, deliveryDate: formatDate(record.deliveryDate), expectedDeliveryDate: formatDate(record.expectedDeliveryDate) });
          if (record.customerCode || record.customerName) {
            setSelectedCustomer({ _id: record.customer, customerCode: record.customerCode, customerName: record.customerName, contactPersonName: record.contactPerson });
          }
          if (!isCopied) {
            setExistingFiles((record.attachments || []).map(f => ({ fileUrl: f.fileUrl || f.url, fileName: f.fileName || "Attachment" })));
          }
        })
        .catch(err => setError(err.message || "Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [editId, isCopied, stableInitial]);

  // Totals Calculation
  useEffect(() => {
    const items = Array.isArray(formData.items) ? formData.items : [];
    const totalBeforeDiscount = items.reduce((s, i) => s + (Number(i.unitPrice) * Number(i.quantity) - Number(i.discount)), 0);
    const gstTotal = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
    const grandTotal = totalBeforeDiscount + gstTotal + Number(formData.freight) + Number(formData.rounding);
    const openBalance = grandTotal - (Number(formData.totalDownPayment) + Number(formData.appliedAmounts));

    setFormData(prev => {
      if (prev.grandTotal === round(grandTotal) && prev.totalBeforeDiscount === round(totalBeforeDiscount)) return prev;
      return { 
        ...prev, 
        totalBeforeDiscount: round(totalBeforeDiscount), 
        gstTotal: round(gstTotal), 
        grandTotal: round(grandTotal), 
        openBalance: round(openBalance) 
      };
    });
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const items = [...prev.items];
      items[index] = { ...items[index], [name]: value, ...computeItemValues({ ...items[index], [name]: value }) };
      return { ...prev, items };
    });
  };

  const addItemRow = () => setFormData(p => ({ ...p, items: [...p.items, { ...stableInitial.items[0] }] }));
  const removeItemRow = (i) => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
const validateForm = () => {
    if (!formData.customerName || !formData.customerCode) {
      toast.error("Please select a valid customer.");
      return false;
    }
    if (!formData.deliveryDate) {
      toast.error("Delivery date is required.");
      return false;
    }
    if (formData.items.length === 0) {
      toast.error("At least one item is required.");
      return false;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.item || item.item === "") {
        toast.error(`Item selection missing in row ${i + 1}`);
        return false;
      }
      if (!item.warehouse || item.warehouse === "") {
        toast.error(`Warehouse missing for item in row ${i + 1}`);
        return false;
      }
      if (Number(item.quantity) <= 0) {
        toast.error(`Quantity must be greater than 0 in row ${i + 1}`);
        return false;
      }
    }
    return true;
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    setStockError(null);

    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Not authenticated"); setSubmitting(false); return; }

      const normalizedItems = formData.items.map(i => ({
        ...i,
        item:      typeof i.item === "object"      ? i.item._id      : i.item,
        warehouse: typeof i.warehouse === "object" ? i.warehouse._id : i.warehouse,
      }));

      const fd = new FormData();
      fd.append("deliveryData", JSON.stringify({ ...formData, items: normalizedItems, removedFiles }));
      attachments.forEach(file => fd.append("newFiles", file));

      const config = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } };

      const res = editId
        ? await axios.put(`/api/delivery/${editId}`, fd, config)
        : await axios.post("/api/delivery", fd, config);

      if (res.data.success) {
        toast.success(editId ? "Delivery Updated" : "Delivery Created");
        router.push("/admin/delivery-view");
      }
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.message || data?.msg || data?.error || err.message || null;
      const isStockError = msg && ["stock", "insufficient", "pre-check", "available", "required"].some(kw => msg.toLowerCase().includes(kw));

      if (isStockError) {
        setStockError(msg);
        window.scrollTo({ top: 0, behavior: "smooth" });
        toast.error("Stock insufficient! Check the banner.");
        return;
      }
      toast.error(msg || "Error saving delivery");
    } finally {
      setSubmitting(false);
    }
  };

  const renderNewFilesPreview = () => attachments.length > 0 && (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
      {attachments.map((file, idx) => {
        if (!(file instanceof File)) return null;
        const url = URL.createObjectURL(file);
        return (
          <div key={idx} className="relative border rounded p-2 text-center bg-slate-100">
            {file.type === "application/pdf"
              ? <object data={url} type="application/pdf" className="h-24 w-full rounded" />
              : <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />}
            <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs">×</button>
          </div>
        );
      })}
    </div>
  );

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Delivery Data...</div>;
  if (error)   return <div className="p-10 text-red-500 text-center">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        <button onClick={() => router.push("/admin/delivery-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Deliveries
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{editId ? "Edit Delivery" : "New Delivery"}</h1>
            <p className="text-sm text-gray-400 mt-0.5">Fill in the details below</p>
          </div>
        </div>

        {stockError && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 shadow-sm animate-in fade-in">
            <div className="w-9 h-9 flex-shrink-0 rounded-xl bg-red-100 flex items-center justify-center text-lg mt-0.5">⚠️</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-700 mb-0.5">Stock Pre-Check Failed</p>
              <p className="text-sm text-red-600 leading-relaxed font-medium">{stockError}</p>
            </div>
            <button onClick={() => setStockError(null)} className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-red-300 hover:text-red-500 hover:bg-red-100 text-base">×</button>
          </div>
        )}

        {/* Customer Section */}
        <SectionCard icon={FaUser} title="Customer Details" color="indigo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Lbl text="Customer Name" req />
              {(editId || isCopied) ? (
                <input key="edit-input" className={fi()} name="customerName" value={formData.customerName || ""} onChange={handleChange} />
              ) : isNewCustomer ? (
                <div key="new-cust-div" className="space-y-2">
                  <input key="new-input" className={fi()} name="customerName" value={formData.customerName || ""} onChange={handleChange} placeholder="Enter new customer" />
                  <button type="button" onClick={() => setIsNewCustomer(false)} className="text-[10px] font-bold text-gray-400 uppercase">⬅ Back to search</button>
                </div>
              ) : (
                <div key="search-cust-div" className="space-y-2">
                  <CustomerSearch onSelectCustomer={(c) => {
                    setSelectedCustomer(c);
                    setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }));
                  }} />
                  <button type="button" onClick={() => setIsNewCustomer(true)} className="text-[10px] font-bold text-indigo-600 uppercase">+ Add new customer</button>
                </div>
              )}
            </div>
            <div><Lbl text="Customer Code" /><input className={fi(true)} value={formData.customerCode} readOnly /></div>
            <div><Lbl text="Contact Person" /><input className={fi(true)} value={formData.contactPerson} readOnly /></div>
            <div><Lbl text="Reference No." /><input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleChange} placeholder="e.g. DEL-12345" /></div>
          </div>
        </SectionCard>

        {/* Address */}
        <div className="mb-5">
          <CustomerAddressSelector
            customer={selectedCustomer}
            selectedBillingAddress={formData.billingAddress}
            selectedShippingAddress={formData.shippingAddress}
            onBillingAddressSelect={(a) => setFormData(p => ({ ...p, billingAddress: a }))}
            onShippingAddressSelect={(a) => setFormData(p => ({ ...p, shippingAddress: a }))}
          />
        </div>

        {/* Dates */}
        <SectionCard icon={FaCalendarAlt} title="Dates & Status" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Delivery Date" req /><input type="date" className={fi()} name="deliveryDate" value={formData.deliveryDate || ""} onChange={handleChange} /></div>
            <div><Lbl text="Expected Delivery" /><input type="date" className={fi()} name="expectedDeliveryDate" value={formData.expectedDeliveryDate || ""} onChange={handleChange} /></div>
            <div>
              <Lbl text="Status" />
              <select className={fi()} name="status" value={formData.status} onChange={handleChange}>
                <option>Open</option><option>Pending</option><option>Shipped</option><option>Delivered</option><option>Cancelled</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Items */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-emerald-50/40">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-500"><FaBoxOpen className="text-sm" /></div>
            <div><p className="text-sm font-bold text-gray-900">Line Items</p></div>
          </div>
          <div className="p-4 overflow-x-auto">
            <ItemSection items={formData.items} onItemChange={handleItemChange} onAddItem={addItemRow} onRemoveItem={removeItemRow} computeItemValues={computeItemValues} />
          </div>
        </div>

        {/* Totals */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div><Lbl text="Total Before Discount" /><input readOnly value={`₹ ${formData.totalBeforeDiscount}`} className={fi(true)} /></div>
            <div><Lbl text="GST Total" /><input readOnly value={`₹ ${formData.gstTotal}`} className={fi(true)} /></div>
            <div><Lbl text="Freight" /><input type="number" name="freight" value={formData.freight} onChange={handleChange} className={fi()} /></div>
            <div><Lbl text="Rounding" /><input type="number" name="rounding" value={formData.rounding} onChange={handleChange} className={fi()} /></div>
            <div>
              <Lbl text="Grand Total" />
              <div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-extrabold">₹ {formData.grandTotal}</div>
            </div>
            <div><Lbl text="Open Balance" /><input readOnly value={`₹ ${formData.openBalance}`} className={fi(true)} /></div>
          </div>
          <div className="mt-4">
            <Lbl text="Remarks" />
            <textarea name="remarks" value={formData.remarks || ""} onChange={handleChange} rows={2} className={`${fi()} resize-none`} placeholder="Add any internal notes..." />
          </div>
        </SectionCard>

        {/* Attachments */}
        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
          <div className="mb-4">
            {attachmentsLoading ? (
              <div className="p-3 text-center text-xs text-gray-400">Loading...</div>
            ) : existingFiles.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {existingFiles.map((file, idx) => (
                  <div key={idx} className="relative group border rounded-xl p-2 bg-gray-50">
                    <div className="h-20 flex items-center justify-center overflow-hidden rounded-lg">
                      {(file.fileUrl?.toLowerCase().endsWith(".pdf"))
                        ? <object data={file.fileUrl} type="application/pdf" className="h-full w-full pointer-events-none" />
                        : <img src={file.fileUrl} alt={file.fileName} className="h-full object-cover" />}
                    </div>
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-indigo-600 mt-1 truncate font-semibold">{file.fileName}</a>
                    {!isReadOnly && (
                      <button onClick={() => { setExistingFiles(prev => prev.filter((_, i) => i !== idx)); setRemovedFiles(prev => [...prev, file]); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                        <FaTimes />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all">
            <FaPaperclip className="text-gray-300" />
            <span className="text-sm font-medium text-gray-400">Click to upload new files</span>
            <input type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => {
              const files = Array.from(e.target.files);
              setAttachments(prev => [...prev, ...files]);
              e.target.value = "";
            }} />
          </label>
          {renderNewFilesPreview()}
        </SectionCard>

        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/delivery-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${submitting ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {submitting ? "Processing..." : editId ? <><FaCheck className="text-xs" /> Update Delivery</> : <><FaCheck className="text-xs" /> Create Delivery</>}
          </button>
        </div>
      </div>
      <ToastContainer  />
    </div>
  );
}


// "use client";
// import React, {
//   useState,
//   useEffect,
//   useCallback,
//   Suspense,
// } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection"; // Assumed to handle item details
// import CustomerSearch from "@/components/CustomerSearch"; // Assumed to handle customer selection
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Assuming '@/components/MultiBatchModalbtach' is the BatchAllocationModal
// // I'll rename the import locally for clarity, but keep the original path.
// import BatchAllocationModal from "@/components/MultiBatchModalbtach";

// /* ------------------------------------------------------------------ */
// /* NOTE: The inline 'BatchModal' function is REMOVED.                 */
// /* We are only using the imported 'BatchAllocationModal' (which was  */
// /* 'MultiBatchModalbtach'). Having both leads to confusion and bugs. */
// /* ------------------------------------------------------------------ */

// /* ------------------------------------------------------------------ */
// /* Initial form template                                              */
// /* ------------------------------------------------------------------ */
// const initialDeliveryState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   salesEmployee: "", // Often used as Delivery Person for Delivery Note
//   status: "Pending",
//   orderDate: "",
//   expectedDeliveryDate: "",
//   deliveryDate: "", // Important for Delivery Note
//   deliveryType: "Sales", // Default type
//   items: [
//     {
//       item: "", // Stores item ObjectId from DB
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       allowedQuantity: 0, // This might be from the sales order, if applicable
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0, // Need these for calculations
//       sgstAmount: 0,
//       igstAmount: 0,
//       tdsAmount: 0,
//       batches: [], // Array to store allocated batch details {batchCode, allocatedQuantity, etc.}
//       warehouse: "", // Stores warehouse ObjectId from DB
//       warehouseName: "",
//       warehouseCode: "",
//       errorMessage: "",
//       taxOption: "GST",
//       managedByBatch: false, // Default to false, updated on item select
//       gstRate: 0, // Default to 0, updated on item select
//       managedBy: "", // Stores 'batch', 'serial', or 'none' from item master
//     },
//   ],
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   totalBeforeDiscount: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   fromQuote: false,
//   attachments: [], // Array for attachment metadata
// };

// /* helper to format date for HTML date input */
// const formatDate = (d) =>
//   d ? new Date(d).toISOString().slice(0, 10) : "";

// /* ------------------------------------------------------------------ */
// /* Wrapper to make Suspense work                                      */
// /* ------------------------------------------------------------------ */
// function DeliveryFormWrapper() {
//   return (
//     <Suspense
//       fallback={
//         <div className="py-10 text-center">Loading form data…</div>
//       }
//     >
//       <DeliveryForm />
//     </Suspense>
//   );
// }

// /* ------------------------------------------------------------------ */
// /* Main form                                                        */
// /* ------------------------------------------------------------------ */
// function DeliveryForm() {
//   const router = useRouter();
//   const query = useSearchParams();
//   const editId = query.get("editId"); // For editing existing Delivery Notes

//   const [formData, setFormData] = useState(initialDeliveryState);
//   const [modalItemIndex, setModalItemIndex] = useState(null); // Index of the item for which batch modal is open
//   const [batchModalOptions, setBatchModalOptions] = useState([]); // State to hold available batches fetched for the modal

//   const [isCopied, setIsCopied] = useState(false); // Flag if data was copied from session storage
//   const [loading, setLoading] = useState(Boolean(editId)); // Initial loading state for edit mode

//   const [attachments, setAttachments] = useState([]); // Files selected via input for new upload
//   const [existingFiles, setExistingFiles] = useState([]); // Files associated with the document from DB/copy
//   const [removedFiles, setRemovedFiles] = useState([]); // Public IDs of files marked for removal


//   /* -------------------------------------------------- Load for edit mode */
//   useEffect(() => {
//     if (!editId) {
//       setLoading(false); // If not in edit mode, stop loading
//       return;
//     }

//     const fetchDelivery = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Authentication required to fetch delivery.");
//           router.push("/login"); // Redirect to login if no token
//           return;
//         }

//         const { data } = await axios.get(`/api/sales-delivery/${editId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (data.success && data.data) {
//           const rec = data.data;

//           setFormData((prev) => ({
//             ...prev,
//             ...rec,
//             orderDate: rec.orderDate ? formatDate(rec.orderDate) : "",
//             expectedDeliveryDate: rec.expectedDeliveryDate ? formatDate(rec.expectedDeliveryDate) : "",
//             deliveryDate: rec.deliveryDate ? formatDate(rec.deliveryDate) : "",
//             // Ensure items' managedByBatch is correctly set from backend
//             items: rec.items.map(item => ({
//               ...item,
//               managedByBatch: item.managedBy && item.managedBy.toLowerCase() === 'batch',
//               batches: item.managedBy && item.managedBy.toLowerCase() === 'batch' && Array.isArray(item.batches)
//                 ? item.batches.map(b => ({
//                     batchCode: b.batchCode || b.batchNumber || '',
//                     allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0,
//                     expiryDate: b.expiryDate || null,
//                     manufacturer: b.manufacturer || '',
//                     unitPrice: Number(b.unitPrice) || 0,
//                   }))
//                 : [],
//             }))
//           }));

//           if (rec.attachments && Array.isArray(rec.attachments)) {
//             setExistingFiles(rec.attachments);
//           } else {
//             setExistingFiles([]);
//           }
//         } else {
//           toast.error(data.message || "Delivery record not found");
//         }
//       } catch (err) {
//         console.error("Failed to fetch delivery:", err.response?.data?.message || err.message);
//         toast.error(err.response?.data?.message || "Failed to fetch delivery");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchDelivery();
//   }, [editId, router]);


//   /* ---------------------------------------- Copy from sessionStorage */
//   useEffect(() => {
//     const key = "deliveryData"; // Key for Delivery data (e.g., from Sales Order)
//     const salesOrderDataKey = "salesOrderData"; // Key if copying from a Sales Order directly

//     let stored = sessionStorage.getItem(key);
//     let isSalesOrderCopy = false;

//     if (!stored) {
//       stored = sessionStorage.getItem(salesOrderDataKey);
//       if (stored) {
//         isSalesOrderCopy = true;
//         sessionStorage.removeItem(salesOrderDataKey); // Clear after use
//       }
//     } else {
//       sessionStorage.removeItem(key); // Clear after use
//     }

//     if (!stored) {
//         return; // No data to copy
//     }

//     try {
//       const parsed = JSON.parse(stored);
//       console.log("Parsed Data on Copy/Load (from session storage):", parsed);

//       // Map fields from Sales Order or existing Delivery to Delivery form
//       const newFormData = {
//         ...initialDeliveryState, // Start with clean initial state
//         ...parsed, // Apply all parsed data
//         // Overwrite specific fields for a clean copy
//         refNumber: parsed.refNumber ? `${parsed.refNumber}-DN` : "", // Append -DN for Delivery Note
//         status: "Pending", // Always start as pending for new/copied doc
//         orderDate: formatDate(parsed.orderDate || new Date()),
//         expectedDeliveryDate: formatDate(parsed.expectedDeliveryDate || parsed.dueDate || new Date()),
//         deliveryDate: "", // Must be set by user or automatically on submission
//         // Map customer info, handling potential nesting or direct fields
//         customerCode: parsed.customer?.customerCode || parsed.customerCode || "",
//         customerName: parsed.customer?.customerName || parsed.customerName || "",
//         contactPerson: parsed.customer?.contactPersonName || parsed.contactPerson || "",
//         salesEmployee: parsed.salesEmployee || "",
//         remarks: parsed.remarks || "",
//         freight: Number(parsed.freight) || 0,
//         rounding: Number(parsed.rounding) || 0,
//         totalDownPayment: Number(parsed.totalDownPayment) || 0,
//         appliedAmounts: Number(parsed.appliedAmounts) || 0,
//         fromQuote: isSalesOrderCopy, // Flag if it originated from a sales order (quote)
//       };

//       // Transform items for the Delivery Note
//       newFormData.items = (parsed.items || []).map((item) => {
//         const unitPrice = parseFloat(item.unitPrice) || 0;
//         const discount = parseFloat(item.discount) || 0;
//         const quantity = parseFloat(item.quantity) || 0; // Use quantity from source doc
//         const freight = parseFloat(item.freight) || 0;
//         const gstRate = parseFloat(item.gstRate) || 0;
//         const taxOption = item.taxOption || "GST";
//         const managedBy = item.managedBy || "";

//         const priceAfterDiscount = unitPrice - discount;
//         const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

//         let cgstAmount = 0;
//         let sgstAmount = 0;
//         let igstAmount = 0;
//         let gstAmount = 0;

//         if (taxOption === "IGST") {
//           igstAmount = totalAmountBeforeTax * (gstRate / 100);
//           gstAmount = igstAmount;
//         } else {
//           const halfGstRate = gstRate / 2;
//           cgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//           sgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//           gstAmount = cgstAmount + sgstAmount;
//         }

//         // For Delivery Note, when copying from Sales Order, batches should be *re-allocated*
//         // or cleared if not explicitly transferred. For now, clear to force user allocation.
//         const copiedBatches = (managedBy.toLowerCase() === "batch" && Array.isArray(item.batches))
//             ? item.batches.map(b => ({
//                 batchCode: b.batchCode || b.batchNumber || '',
//                 allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0, // This will be the *already allocated* quantity if copying from a delivered SO
//                 expiryDate: b.expiryDate || null,
//                 manufacturer: b.manufacturer || '',
//                 unitPrice: Number(b.unitPrice) || 0,
//             }))
//             : [];


//         return {
//           ...item,
//           item: item.item?._id || item.item || "", // Handle populated item or just ID
//           itemCode: item.item?.itemCode || item.itemCode || "",
//           itemName: item.item?.itemName || item.itemName || "",
//           itemDescription: item.item?.description || item.itemDescription || "",
//           warehouse: item.warehouse?._id || item.warehouse || "", // Handle populated warehouse or just ID
//           warehouseName: item.warehouse?.warehouseName || item.warehouseName || "",
//           warehouseCode: item.warehouse?.warehouseCode || item.warehouseCode || "",
//           quantity: quantity, // Use the quantity from source document
//           unitPrice: unitPrice,
//           discount: discount,
//           freight: freight,
//           gstType: item.gstType || 0,
//           gstRate: gstRate,
//           taxOption: taxOption,
//           priceAfterDiscount: priceAfterDiscount,
//           totalAmount: totalAmountBeforeTax,
//           gstAmount: gstAmount,
//           cgstAmount: cgstAmount,
//           sgstAmount: sgstAmount,
//           igstAmount: igstAmount,
//           tdsAmount: item.tdsAmount || 0,
//           managedBy: managedBy,
//           managedByBatch: managedBy.toLowerCase() === "batch",
//           batches: copiedBatches, // Retain copied batches if they exist (good for partial deliveries, etc.)
//           errorMessage: "",
//         };
//       });

//       // Handle attachments
//       if (Array.isArray(parsed.attachments)) {
//         setExistingFiles(parsed.attachments);
//       } else {
//         setExistingFiles([]);
//       }

//       setFormData(newFormData);
//       setIsCopied(true);
//       toast.success("Data copied successfully!");
//     } catch (err) {
//       console.error("❌ Error parsing copied data:", err);
//       toast.error("Failed to copy data.");
//     }
//   }, []); // Run once on mount


//   /* ------------------------------------------------ Recalculate totals */
//   useEffect(() => {
//     const totalBeforeDiscount = formData.items.reduce(
//       (acc, it) => {
//         const up = Number(it.unitPrice) || 0;
//         const disc = Number(it.discount) || 0;
//         const qty = Number(it.quantity) || 0;
//         return acc + (up - disc) * qty;
//       },
//       0,
//     ) ?? 0; // Nullish coalescing for safety

//     const gstTotal = formData.items.reduce((acc, it) => {
//       if (it.taxOption === "IGST")
//         return acc + (Number(it.igstAmount) || 0);
//       return acc + (Number(it.gstAmount) || 0); // gstAmount should be CGST + SGST for GST option
//     }, 0) ?? 0;

//     const freight = Number(formData.freight) || 0;
//     const rounding = Number(formData.rounding) || 0;
//     const grandTotal =
//       totalBeforeDiscount + gstTotal + freight + rounding;

//     setFormData((p) => ({
//       ...p,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance:
//         grandTotal -
//         ((Number(p.totalDownPayment) || 0) +
//           (Number(p.appliedAmounts) || 0)),
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);


//   /* ------------------------------------------------ Attachment rendering helper */
//   const renderNewFilesPreview = () => (
//     attachments.length > 0 && (
//       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//         {attachments.map((file, idx) => {
//           if (file instanceof File) {
//             const url = URL.createObjectURL(file);
//             const isPDF = file.type === "application/pdf";
//             return (
//               <div key={idx} className="relative border rounded p-2 text-center bg-slate-300">
//                 {isPDF ? (
//                   <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                 ) : (
//                   <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//                 )}
//                 <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs">×</button>
//               </div>
//             );
//           }
//           return null;
//         })}
//       </div>
//     )
//   );

//   /* ------------------------------------------------ Field handlers */
//   const onInput = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const onCustomer = useCallback((c) => {
//     setFormData((p) => ({
//       ...p,
//       customerCode: c.customerCode ?? "",
//       customerName: c.customerName ?? "",
//       contactPerson: c.contactPersonName ?? "",
//     }));
//   }, []);

//   const onItemField = useCallback((idx, e) => {
//     const { name, value } = e.target;
//     setFormData((p) => {
//       const items = [...p.items];
//       items[idx] = { ...items[idx], [name]: value };

//       // Recalculate item-level totals on quantity/price/discount change
//       const item = items[idx];
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 0;
//       const freight = parseFloat(item.freight) || 0;
//       const gstRate = parseFloat(item.gstRate) || 0;
//       const taxOption = item.taxOption || "GST";

//       const priceAfterDiscount = unitPrice - discount;
//       const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

//       let calculatedCgstAmount = 0;
//       let calculatedSgstAmount = 0;
//       let calculatedIgstAmount = 0;
//       let calculatedGstAmount = 0;

//       if (taxOption === "IGST") {
//         calculatedIgstAmount = totalAmountBeforeTax * (gstRate / 100);
//         calculatedGstAmount = calculatedIgstAmount;
//       } else {
//         const halfGstRate = gstRate / 2;
//         calculatedCgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//         calculatedSgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//         calculatedGstAmount = calculatedCgstAmount + calculatedSgstAmount;
//       }

//       items[idx] = {
//         ...items[idx],
//         priceAfterDiscount,
//         totalAmount: totalAmountBeforeTax,
//         gstAmount: calculatedGstAmount,
//         cgstAmount: calculatedCgstAmount,
//         sgstAmount: calculatedSgstAmount,
//         igstAmount: calculatedIgstAmount,
//       };

//       // If quantity changes for a batch-managed item, clear batches or adjust as needed
//       if (item.managedByBatch && name === 'quantity' && parseFloat(value) !== item.quantity) {
//           items[idx].batches = []; // Clear batches to force re-allocation
//           toast.info("Quantity changed for a batch-managed item. Please re-allocate batches.");
//       }

//       return { ...p, items };
//     });
//   }, []);

//   const addItem = useCallback(() => {
//     setFormData((p) => ({
//       ...p,
//       items: [...p.items, { ...initialDeliveryState.items[0] }],
//     }));
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   // Callback for when an item is selected via ItemSearch (from ItemSection)
//   const handleItemSelect = useCallback(async (index, selectedItem) => {
//     if (!selectedItem._id) {
//       toast.error("Selected item does not have a valid ID.");
//       return;
//     }

//     // Fetch managedBy value from item master if not already present in selectedItem
//     let managedByValue = selectedItem.managedBy;
//     if (!managedByValue || managedByValue.trim() === "") {
//       try {
//         const res = await axios.get(`/api/items/${selectedItem._id}`, {
//           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
//         });
//         if (res.data.success) {
//           managedByValue = res.data.data.managedBy;
//           console.log(`Fetched managedBy for ${selectedItem.itemCode}:`, managedByValue);
//         }
//       } catch (error) {
//         console.error("Error fetching item master details:", error);
//         managedByValue = ""; // Fallback if fetch fails
//       }
//     } else {
//       console.log(`Using managedBy from selected item for ${selectedItem.itemCode}:`, managedByValue);
//     }

//     const unitPrice = Number(selectedItem.unitPrice) || 0;
//     const discount = Number(selectedItem.discount) || 0;
//     const freight = Number(selectedItem.freight) || 0;
//     const quantity = 1; // Default quantity when selecting an item
//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate = selectedItem.gstRate ? Number(selectedItem.gstRate) : 0;

//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

//     let cgstAmount = 0;
//     let sgstAmount = 0;
//     let igstAmount = 0;
//     let gstAmount = 0;

//     if (taxOption === "IGST") {
//       igstAmount = totalAmountBeforeTax * (gstRate / 100);
//       gstAmount = igstAmount;
//     } else {
//       const halfGstRate = gstRate / 2;
//       cgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//       sgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//       gstAmount = cgstAmount + sgstAmount;
//     }

//     const updatedItem = {
//       item: selectedItem._id, // This will be the ObjectId string for the backend
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName,
//       itemDescription: selectedItem.description || "",
//       quantity,
//       allowedQuantity: selectedItem.allowedQuantity || 0,
//       unitPrice,
//       discount,
//       freight,
//       gstType: selectedItem.gstType || 0,
//       gstRate,
//       taxOption,
//       priceAfterDiscount,
//       totalAmount: totalAmountBeforeTax,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount,
//       managedBy: managedByValue,
//       managedByBatch: managedByValue.toLowerCase() === "batch",
//       batches: [], // Initialize empty if batch managed, user will allocate via modal
//       warehouse: selectedItem.warehouse || "", // This will be the ObjectId string for the backend
//       warehouseName: selectedItem.warehouseName || "",
//       warehouseCode: selectedItem.warehouseCode || "",
//       errorMessage: "",
//       tdsAmount: 0,
//     };

//     setFormData((prev) => {
//       const currentItems = [...prev.items];
//       currentItems[index] = updatedItem;
//       return { ...prev, items: currentItems };
//     });
//   }, []);

//   /* ------------------------------------------------ Batch updates (from BatchAllocationModal) */
//   const handleUpdateBatch = useCallback((allocatedBatches) => {
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const targetItem = { ...updatedItems[modalItemIndex] };

//       targetItem.batches = allocatedBatches.map(b => ({
//           batchCode: b.batchCode || '',
//           allocatedQuantity: Number(b.allocatedQuantity) || 0,
//           expiryDate: b.expiryDate || null,
//           manufacturer: b.manufacturer || '',
//           unitPrice: Number(b.unitPrice) || 0,
//       }));

//       updatedItems[modalItemIndex] = targetItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [modalItemIndex]);

//   /* Open the Batch Allocation Modal */
//   const openBatchModal = useCallback(async (index) => {
//     const currentItem = formData.items[index];
//     // Crucial validation: Ensure item and warehouse IDs are selected and item is batch-managed
//     if (!currentItem.item || !currentItem.warehouse) {
//       toast.warn("Please select an Item and a Warehouse for this line item before allocating batches.");
//       return;
//     }
//     if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== 'batch') {
//       toast.warn(`Item '${currentItem.itemName || 'selected item'}' is not managed by batch. Cannot allocate batches.`);
//       return;
//     }
//     if (currentItem.quantity <= 0) {
//         toast.warn(`Please enter a quantity greater than 0 for '${currentItem.itemName}' before allocating batches.`);
//         return;
//     }

//     console.log("Opening Batch Allocation Modal for item index:", index, "with item ID:", currentItem.item, "warehouse ID:", currentItem.warehouse);

//     try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//             toast.error("Authentication required to fetch inventory batches.");
//             return;
//         }
//         const res = await axios.get(
//             `/api/inventory-batch/${currentItem.item}/${currentItem.warehouse}`,
//             { headers: { 'Authorization': `Bearer ${token}` } }
//         );

//         if (res.data.success) {
//             setBatchModalOptions(res.data.data.batches || []);
//             setModalItemIndex(index); // Open modal after successful fetch
//         } else {
//             toast.error(res.data.message || "Failed to fetch available batches.");
//         }
//     } catch (error) {
//         console.error("Error fetching available batches:", error);
//         toast.error(`Error loading available batches: ${error.response?.data?.message || error.message}`);
//     }
//   }, [formData.items]);



// //   const handleSubmit = async () => {
// //   try {
// //     const token = localStorage.getItem("token");
// //     if (!token) {
// //       toast.error("Authentication required. Please log in.");
// //       router.push("/login");
// //       return;
// //     }

// //     if (!formData.customerName || !formData.refNumber || formData.items.length === 0) {
// //       toast.error("Please fill in Customer Name, Delivery Number, and add at least one item.");
// //       return;
// //     }

// //     // Validate batches
// //     for (const item of formData.items) {
// //       if (!item.item || !item.warehouse) throw new Error(`Invalid Item/Warehouse for ${item.itemName}`);
// //       if (item.quantity <= 0 || item.unitPrice <= 0) throw new Error(`Invalid Quantity/Price for ${item.itemName}`);
// //       if (item.managedByBatch) {
// //         const allocatedTotal = item.batches.reduce((sum, b) => sum + (Number(b.allocatedQuantity) || 0), 0);
// //         if (allocatedTotal !== item.quantity) throw new Error(`Allocated batches must equal item quantity for ${item.itemName}`);
// //       }
// //     }

// //     formData.deliveryDate ||= new Date().toISOString().slice(0, 10);
// //     formData.deliveryType ||= "Sales";

// //     // Ensure sourceModel is correct
// //     if (formData.sourceId) formData.sourceModel = "salesorder";

// //     const dataToSend = new FormData();
// //     dataToSend.append("deliveryData", JSON.stringify(formData));

// //     attachments.forEach(file => dataToSend.append("newAttachments", file));

// //     const retainedFiles = existingFiles.filter(
// //       f => !removedFiles.some(r => r.publicId === f.publicId)
// //     );
// //     if (retainedFiles.length) dataToSend.append("existingFiles", JSON.stringify(retainedFiles));
// //     if (removedFiles.length) dataToSend.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId)));

// //     const url = editId ? `/api/sales-delivery/${editId}` : "/api/sales-delivery";
// //     const method = editId ? "put" : "post";

// //     const res = await axios({ method, url, data: dataToSend, headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });

// //     if (res.data.success) {
// //       toast.success(editId ? "Delivery updated successfully" : "Delivery created successfully");
// //       if (!editId) {
// //         setFormData(initialDeliveryState);
// //         setAttachments([]);
// //         setExistingFiles([]);
// //         setRemovedFiles([]);
// //       } else {
// //         setExistingFiles(res.data.delivery?.attachments || []);
// //         setRemovedFiles([]);
// //         setAttachments([]);
// //       }
// //       router.push("/admin/delivery-view");
// //     } else throw new Error(res.data.message || "Unknown error");

// //   } catch (err) {
// //     console.error("❌ Error saving delivery:", err.message);
// //     toast.error(err.message || "Save failed");
// //   }
// // };


// const handleSubmit = async () => {
//   try {
//     // 1. ✅ Authentication: Correctly checks for the user's token.
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Authentication required. Please log in.");
//       router.push("/login");
//       return;
//     }

//     // 2. ✅ Basic Validation: Ensures the most important fields are filled.
//     if (!formData.customerName || !formData.refNumber || formData.items.length === 0) {
//       toast.error("Please fill in Customer Name, Delivery Number, and add at least one item.");
//       return;
//     }

//     // 3. ✅ Item & Batch Validation: Loops through each item to ensure its data is valid.
//     for (const item of formData.items) {
//       if (!item.item || !item.warehouse) {
//         throw new Error(`Invalid Item/Warehouse for ${item.itemName}`);
//       }
//       if (item.quantity <= 0) {
//         throw new Error(`Quantity must be greater than 0 for ${item.itemName}`);
//       }
//       if (item.managedByBatch) {
//         const allocatedTotal = item.batches.reduce((sum, b) => sum + (Number(b.allocatedQuantity) || 0), 0);
//         if (allocatedTotal !== item.quantity) {
//           throw new Error(`Allocated batches must equal item quantity for ${item.itemName}`);
//         }
//       }
//     }

//     // 4. ✅ Data Preparation: Sets default values and prepares the data for sending.
//     formData.deliveryDate ||= new Date().toISOString().slice(0, 10);
//     formData.deliveryType ||= "Sales";
//     if (formData.sourceId) {
//       formData.sourceModel = "salesorder";
//     }

//     const dataToSend = new FormData();
//     // This is the most important line: it takes your entire form state, including the
//     // full `selectedBin` object, and prepares it to be sent to the backend.
//     dataToSend.append("deliveryData", JSON.stringify(formData));

//     // 5. ✅ File Handling: Robustly handles new, existing, and removed attachments.
//     attachments.forEach(file => dataToSend.append("newAttachments", file));
//     const retainedFiles = existingFiles.filter(
//       f => !removedFiles.some(r => r.publicId === f.publicId)
//     );
//     if (retainedFiles.length) {
//       dataToSend.append("existingFiles", JSON.stringify(retainedFiles));
//     }
//     if (removedFiles.length) {
//       dataToSend.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId)));
//     }

//     // 6. ✅ API Submission: Correctly determines the URL and method for creating or editing.
//     const url = editId ? `/api/sales-delivery/${editId}` : "/api/sales-delivery";
//     const method = editId ? "put" : "post";

//     const res = await axios({ 
//       method, 
//       url, 
//       data: dataToSend, 
//       headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } 
//     });

//     // 7. ✅ Success Handling: Provides clear feedback and navigates the user.
//     if (res.data.success) {
//       toast.success(editId ? "Delivery updated successfully" : "Delivery created successfully");
//       if (!editId) {
//         // Resets the form after creating a new delivery
//         setFormData(initialDeliveryState);
//         setAttachments([]);
//         setExistingFiles([]);
//         setRemovedFiles([]);
//       } else {
//         // Updates the file list after editing
//         setExistingFiles(res.data.delivery?.attachments || []);
//         setRemovedFiles([]);
//         setAttachments([]);
//       }
//       router.push("/admin/delivery-view");
//     } else {
//       throw new Error(res.data.message || "An unknown error occurred");
//     }

//   } catch (err) {
//     // 8. ✅ Error Handling: Displays specific, meaningful error messages from the backend.
//     console.error("❌ Error saving delivery:", err.message);
//     toast.error(err.message || "Save failed");
//   }
// };

//   /* ------------------------------------------------ Render */
//   if (loading) return <div className="p-8">Loading…</div>;

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="mb-4 text-2xl font-bold">
//         {editId ? "Edit Delivery" : "Create Delivery"}
//       </h1>

//       {/* ---------------- Customer ---------------- */}
//       <div className="m-10 flex flex-wrap justify-between rounded-lg border p-5 shadow-lg">
//         <div className="basis-full md:basis-1/2 space-y-4 px-2">
//           <div>
//             <label className="mb-2 block font-medium">
//               Customer Code
//             </label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""} // Ensure string value
//               readOnly
//               className="w-full rounded border bg-gray-100 p-2"
//             />
//           </div>
//           <div>
//             {(formData.customerName && isCopied) || editId ? ( // Show read-only if customer data is copied OR in edit mode
//               <>
//                 <label className="mb-2 block font-medium">
//                   Customer Name
//                 </label>
//                 <input
//                   type="text"
//                   name="customerName"
//                   value={formData.customerName || ""} // Ensure string value
//                   onChange={onInput}
//                   readOnly={Boolean(isCopied || editId)} // Make read-only if copied or editing
//                   className={`w-full rounded border p-2 ${Boolean(isCopied || editId) ? 'bg-gray-100' : ''}`}
//                 />
//               </>
//             ) : (
//               <>
//                 <label className="mb-2 block font-medium">
//                   Customer Name
//                 </label>
//                 <CustomerSearch onSelectCustomer={onCustomer} />
//               </>
//             )}
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Contact Person
//             </label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""} // Ensure string value
//               readOnly
//               className="w-full rounded border bg-gray-100 p-2"
//             />
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Delivery No
//             </label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""} // Ensure string value
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>
//         {/* status & dates */}
//         <div className="basis-full md:basis-1/2 space-y-4 px-2">
//           <div>
//             <label className="mb-2 block font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || "Pending"} // Ensure string value and default
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             >
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//               <option value="Delivered">Delivered</option> {/* Added Delivered status */}
//             </select>
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Order Date
//             </label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate || ""} // Ensure string value
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//           <div>
//             <label className="mb-2 block font-medium">
//               Expected Delivery Date
//             </label>
//             <input
//               type="date"
//               name="expectedDeliveryDate"
//               value={formData.expectedDeliveryDate || ""} // Ensure string value
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//           <div> {/* Added Delivery Date field */}
//             <label className="mb-2 block font-medium">
//               Actual Delivery Date
//             </label>
//             <input
//               type="date"
//               name="deliveryDate"
//               value={formData.deliveryDate || ""}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>
//       </div>

//       {/* ---------------- Items ---------------- */}
//       <h2 className="mt-6 text-xl font-semibold">Items</h2>
//       <div className="m-10 flex flex-col rounded-lg border p-5 shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={onItemField}
//           onAddItem={addItem}
//           onRemoveItem={removeItemRow}
//           setFormData={setFormData}
//           onItemSelect={handleItemSelect} 
//         />
//       </div>

//       {/* ---------------- Batch selection ---------------- */}
//       <div className="mb-6">
//         <h2 className="text-xl font-semibold">Batch Allocation Summary</h2>

//         {formData.items.map((item, index) => {
//           if (!item.managedBy || item.managedBy.toLowerCase() !== 'batch') {
//             return null;
//           }

//           const totalAllocatedForCurrentItem = (item.batches || []).reduce(
//             (sum, b) => sum + (Number(b.allocatedQuantity) || 0),
//             0
//           );

//           return (
//             <div key={index} className="border p-4 my-2 rounded-lg bg-white shadow-sm">
//               <div className="flex items-center justify-between mb-2">
//                 <span className="font-semibold text-lg">{item.itemName || `Item ${index + 1}`} (Required: {item.quantity})</span>
//                 <button
//                   onClick={() => openBatchModal(index)}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//                   disabled={!item.item || !item.warehouse || item.quantity <= 0}
//                 >
//                   Allocate Batches
//                 </button>
//               </div>

//               {/* Display currently allocated batches for this item */}
//               {item.batches && item.batches.length > 0 ? (
//                 <div className="mt-2 pl-4 text-sm">
//                   <p className="font-medium mb-1">Current Allocations:</p>
//                   <ul className="list-disc list-inside">
//                     {item.batches.map((batch, idx) => (
//                       <li key={idx} className="text-gray-700">
//                         Batch: **{batch.batchCode || 'N/A'}** &mdash; Allocated: **{Number(batch.allocatedQuantity) || 0}**
//                       </li>
//                     ))}
//                   </ul>
//                   <p className={`mt-2 font-bold ${totalAllocatedForCurrentItem !== item.quantity ? "text-red-600" : "text-green-600"}`}>
//                     Total Allocated: {totalAllocatedForCurrentItem} / {item.quantity}
//                   </p>
//                 </div>
//               ) : (
//                 <p className="text-sm text-gray-500 italic pl-4">No batches currently allocated for this item.</p>
//               )}
//             </div>
//           );
//         })}
//       </div>
//       {/* ---------------- Remarks & employee ---------------- */}
//       <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
//         <div>
//           <label className="mb-2 block font-medium">
//             Delivery Person
//           </label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""} // Ensure string value
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""} // Ensure string value
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//       </div>

//       {/* ---------------- Summary ---------------- */}
//       <div className="grid grid-cols-1 gap-4 p-8 m-8 rounded-lg border shadow-lg md:grid-cols-2">
//         <div>
//           <label className="mb-2 block font-medium">
//             Taxable Amount
//           </label>
//           <input
//             type="number"
//             value={formData.totalBeforeDiscount.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0} // Ensure number value
//             onChange={onInput}
//             className="w-full rounded border p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">GST Total</label>
//           <input
//             type="number"
//             value={formData.gstTotal.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//         <div>
//           <label className="mb-2 block font-medium">Grand Total</label>
//           <input
//             type="number"
//             value={formData.grandTotal.toFixed(2)}
//             readOnly
//             className="w-full rounded border bg-gray-100 p-2"
//           />
//         </div>
//       </div>
//       {/* Attachments */}

//       <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg"> {/* Consolidated attachments section */}
//         <label className="font-medium block mb-2">Attachments</label>

//         {/* Existing Files Display */}
//         {loading ? ( // Use the main loading state for attachments too
//           <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//             Loading attachments...
//           </div>
//         ) : existingFiles && existingFiles.length > 0 ? (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl;
//               const name = file.fileName;
//               const isPDF = file.fileType === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-slate-200">
//                   {isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                   ) : (
//                     <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
//                   )}
//                   <a
//                     href={url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="block text-blue-600 text-xs mt-1 truncate"
//                   >
//                     {name}
//                   </a>
//                   {/* Allow removal of existing files only in edit mode, not if it's a new copy */}
//                   {editId && (
//                     <button
//                       onClick={() => {
//                         setExistingFiles(prev => prev.filter((_, i) => i !== idx));
//                         setRemovedFiles(prev => [...(prev || []), file]); // Add to removed list for backend processing
//                         toast.info(`Marked ${name} for removal.`);
//                       }}
//                       className="absolute top-1 right-1 bg-red-600 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
//                     >
//                       ×
//                     </button>
//                   )}
//                 </div>
//               );
//             })}
//           </div>
//         ) : (
//           <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//             No attachments available
//           </div>
//         )}

//         {/* New Uploads Input */}
//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const m = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => m.set(f.name + f.size, f));
//               return [...m.values()];
//             });
//             e.target.value = ""; // Clear input after selection
//           }}
//           className="border px-3 py-2 w-full mt-2 rounded"
//         />

//         {/* Previews of new uploads */}
//         {renderNewFilesPreview()}
//       </div>

//       {/* ---------------- buttons ---------------- */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 rounded-lg border shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           {editId ? "Update Delivery" : "Add Delivery"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialDeliveryState);
//             router.push("/admin/delivery-view");
//           }}
//           className="rounded bg-orange-400 px-4 py-2 text-white hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             // Include both current form data and existing files (which are part of the document)
//             sessionStorage.setItem(
//               "deliveryData",
//               JSON.stringify({ ...formData, attachments: existingFiles }),
//             );
//             toast.success("Delivery data copied!");
//           }}
//           className="rounded bg-gray-500 px-4 py-2 text-white hover:bg-gray-400"
//         >
//           Copy Current Form
//         </button>
//       </div>

//       {/* modal + toast */}
//       {modalItemIndex !== null && (
//         <BatchAllocationModal
//           itemsbatch={{
//             itemId: formData.items[modalItemIndex].item,
//             sourceWarehouse: formData.items[modalItemIndex].warehouse,
//             itemName: formData.items[modalItemIndex].itemName,
//             qty: formData.items[modalItemIndex].quantity,
//             currentAllocations: formData.items[modalItemIndex].batches,
//           }}
//           batchOptions={batchModalOptions}
//           onClose={() => setModalItemIndex(null)}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}

//       <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
//     </div>
//   );
// }

// export default DeliveryFormWrapper;