"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import SupplierSearch from "@/components/SupplierSearch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import BatchAllocationModal from "@/components/MultiBatchModalbtach";
import {
  FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaTimes
} from "react-icons/fa";

// ============================================================
// HELPERS & SUB-COMPONENTS (Defined OUTSIDE to prevent focus loss)
// ============================================================

const round = (num, decimals = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(decimals));
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
}

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

const ReadField = ({ label, value }) => (
  <div>
    <Lbl text={label} />
    <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
      {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
    </div>
  </div>
);

const initialDebitNoteState = {
  supplier: "", supplierCode: "", supplierName: "", supplierContact: "", refNumber: "",
  salesEmployee: "", status: "Pending", postingDate: formatDateForInput(new Date()),
  validUntil: "", documentDate: formatDateForInput(new Date()),
  items: [{
    item: "", itemCode: "", itemName: "", itemDescription: "", quantity: 0,
    unitPrice: 0, discount: 0, freight: 0, taxOption: "GST", priceAfterDiscount: 0,
    totalAmount: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    batches: [], warehouse: "", managedByBatch: false, managedBy: "",
  }],
  remarks: "", freight: 0, rounding: 0, totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
};

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================

export default function DebitNoteFormWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading form data...</div>}>
      <DebitNoteForm />
    </Suspense>
  );
}

function DebitNoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEdit = Boolean(editId);

  const [formData, setFormData] = useState(initialDebitNoteState);
  const [attachments, setAttachments] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalItemIndex, setModalItemIndex] = useState(null);
  const [batchModalOptions, setBatchModalOptions] = useState([]);

  const computeItemValues = useCallback((it) => {
    const q = Number(it.quantity) || 0;
    const up = Number(it.unitPrice) || 0;
    const dis = Number(it.discount) || 0;
    const fr = Number(it.freight) || 0;
    const pad = up - dis;
    const tot = pad * q + fr;
    const rate = Number(it.gstRate) || 0;
    
    let cg = 0, sg = 0, ig = 0;
    if (it.taxOption === "IGST") {
      ig = (tot * rate) / 100;
    } else {
      cg = (tot * (rate / 2)) / 100;
      sg = cg;
    }
    return { priceAfterDiscount: pad, totalAmount: tot, gstAmount: cg + sg + ig, cgstAmount: cg, sgstAmount: sg, igstAmount: ig };
  }, []);

  // Summary Calculation
  useEffect(() => {
    const totalBeforeDiscount = formData.items.reduce((acc, it) => acc + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstTotal = formData.items.reduce((acc, it) => acc + (it.gstAmount || 0), 0);
    const grandTotal = totalBeforeDiscount + gstTotal + Number(formData.freight) + Number(formData.rounding);
    setFormData(prev => ({ ...prev, totalBeforeDiscount, gstTotal, grandTotal }));
  }, [formData.items, formData.freight, formData.rounding]);

  // ✅ CONSOLIDATED DATA LOADING (FIXES TYPEERROR)
  useEffect(() => {
    const token = localStorage.getItem("token");
    
    const loadData = async () => {
      if (isEdit && editId) {
        setLoading(true);
        try {
          const res = await axios.get(`/api/debit-note/${editId}`, { headers: { Authorization: `Bearer ${token}` } });
          const rec = res.data?.data || res.data; // Safety check for nested data
          
          if (rec) {
            setFormData({
              ...initialDebitNoteState,
              ...rec,
              postingDate: formatDateForInput(rec.postingDate),
              documentDate: formatDateForInput(rec.documentDate),
              validUntil: formatDateForInput(rec.validUntil),
              items: Array.isArray(rec.items) ? rec.items.map(it => ({
                ...it,
                item: it.item?._id || it.item // Ensure ID is a string
              })) : []
            });
            setExistingFiles(rec.attachments || []);
          }
        } catch (err) {
          console.error("Fetch error", err);
          toast.error("Failed to load Debit Note.");
        } finally {
          setLoading(false);
        }
      } else {
        // Copy-To Logic
        const stored = sessionStorage.getItem("invoiceData") || sessionStorage.getItem("debitNoteData");
        if (stored) {
          try {
            const source = JSON.parse(stored);
            setFormData(prev => ({
              ...prev,
              ...source,
              supplier: source.supplier?._id || source.supplier || "",
              supplierName: source.supplier?.supplierName || source.supplierName,
              supplierCode: source.supplier?.supplierCode || source.supplierCode,
              postingDate: formatDateForInput(new Date()),
              items: (source.items || []).map(it => {
                const base = { ...it, item: it.item?._id || it.item };
                return { ...base, ...computeItemValues(base) };
              })
            }));
            setExistingFiles(source.attachments || []);
            sessionStorage.removeItem("invoiceData");
            sessionStorage.removeItem("debitNoteData");
            toast.success("Data copied successfully!");
          } catch (e) { console.error("Session parse error", e); }
        }
      }
    };

    loadData();
  }, [isEdit, editId, computeItemValues]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((i, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const items = [...prev.items];
      items[i] = { ...items[i], [name]: ["quantity", "unitPrice", "discount", "freight"].includes(name) ? Number(value) || 0 : value };
      items[i] = { ...items[i], ...computeItemValues(items[i]) };
      return { ...prev, items };
    });
  }, [computeItemValues]);

  const openBatchModal = useCallback(async (index) => {
    const it = formData.items[index];
    if (!it.item || !it.warehouse) return toast.warn("Select Item and Warehouse first.");
    try {
      const res = await axios.get(`/api/inventory-batch/${it.item}/${it.warehouse}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      if (res.data.success) {
        setBatchModalOptions(res.data.data.batches || []);
        setModalItemIndex(index);
      }
    } catch (err) { toast.error("Error loading batches"); }
  }, [formData.items]);

  const handleSubmit = async () => {
    if (!formData.supplierName) return toast.error("Select Supplier");
    setLoading(true);
    try {
      const fd = new FormData();
      const finalItems = formData.items.map(it => ({ ...it, item: typeof it.item === 'object' ? it.item._id : it.item }));
      fd.append("debitNoteData", JSON.stringify({ ...formData, items: finalItems, existingFiles, removedFiles }));
      attachments.forEach(file => fd.append("newAttachments", file));

      await axios({
        method: isEdit ? "put" : "post",
        url: isEdit ? `/api/debit-note/${editId}` : "/api/debit-note",
        data: fd,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "Content-Type": "multipart/form-data" }
      });
      toast.success("Debit Note Saved!");
      router.push("/admin/debit-notes-view");
    } catch (err) { toast.error("Error saving Debit Note"); }
    finally { setLoading(false); }
  };

  if (loading && !formData.supplierName) return <div className="p-10 text-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/debit-notes-view")} className="flex items-center gap-1.5 text-orange-600 font-semibold text-sm mb-4 hover:text-orange-700 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to List
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Edit Debit Note" : "New Debit Note"}</h1>

        <SectionCard icon={FaUser} title="Supplier Details" color="orange">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-1">
              <Lbl text="Supplier" req />
              {formData.supplierName && (isEdit || formData.sourceId) ? (
                 <ReadField label="Supplier Name" value={formData.supplierName} />
              ) : (
                <SupplierSearch onSelectSupplier={s => setFormData(p => ({ ...p, supplier: s._id, supplierCode: s.supplierCode, supplierName: s.supplierName, supplierContact: s.contactPersonName }))} />
              )}
            </div>
            <ReadField label="Supplier Code" value={formData.supplierCode} />
            <div><Lbl text="Debit Note Number" req /><input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} placeholder="e.g. DN-2024" /></div>
          </div>
        </SectionCard>

        <SectionCard icon={FaCalendarAlt} title="Date & Status" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Posting Date" req /><input className={fi()} type="date" name="postingDate" value={formData.postingDate} onChange={handleInputChange} /></div>
            <div><Lbl text="Document Date" /><input className={fi()} type="date" name="documentDate" value={formData.documentDate} onChange={handleInputChange} /></div>
            <div>
              <Lbl text="Status" />
              <select className={fi()} name="status" value={formData.status} onChange={handleInputChange}>
                <option value="Pending">Pending</option><option value="Confirmed">Confirmed</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center gap-2"><FaBoxOpen className="text-emerald-500" /> Items Information</div>
          <div className="p-4 overflow-x-auto">
            <ItemSection 
              items={formData.items} 
              onItemChange={handleItemChange} 
              onAddItem={() => setFormData(p => ({ ...p, items: [{ ...initialDebitNoteState.items[0] }, ...p.items] }))} 
              onRemoveItem={i => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} 
              onItemSelect={(i, sku) => {
                handleItemChange(i, { target: { name: 'item', value: sku._id } });
                handleItemChange(i, { target: { name: 'itemCode', value: sku.itemCode } });
                handleItemChange(i, { name: 'itemName', value: sku.itemName });
                handleItemChange(i, { target: { name: 'gstRate', value: sku.gstRate } });
              }} 
            />
          </div>
        </div>

        <div className="mb-5 space-y-2">
          {formData.items.map((item, idx) => item.managedBy?.toLowerCase() === 'batch' && (
            <div key={idx} className="p-4 bg-white border rounded-xl flex items-center justify-between shadow-sm">
              <p className="text-sm font-bold">{item.itemName || item.itemCode} <span className="text-xs text-gray-400 font-normal ml-2">Qty: {item.quantity}</span></p>
              <button onClick={() => openBatchModal(idx)} className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all">Allocate Batches</button>
            </div>
          ))}
        </div>

        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ReadField label="Taxable Amount" value={`₹ ${formData.totalBeforeDiscount.toFixed(2)}`} />
            <ReadField label="GST Total" value={`₹ ${formData.gstTotal.toFixed(2)}`} />
            <div><Lbl text="Grand Total" /><div className="px-3 py-2.5 rounded-lg border-2 border-orange-200 bg-orange-50 font-extrabold text-orange-700">₹ {formData.grandTotal.toFixed(2)}</div></div>
          </div>
          <div className="mt-4"><Lbl text="Remarks" /><textarea className={`${fi()} resize-none`} name="remarks" rows={2} value={formData.remarks || ""} onChange={handleInputChange} placeholder="Reason for debit note..." /></div>
        </SectionCard>

        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
           <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingFiles.map((file, idx) => (
              <div key={idx} className="relative border rounded-xl p-2 bg-gray-50 group">
                <div className="h-20 flex items-center justify-center overflow-hidden rounded-lg">
                  {file.fileUrl?.toLowerCase().endsWith(".pdf") ? <object data={file.fileUrl} type="application/pdf" className="h-full w-full pointer-events-none" /> : <img src={file.fileUrl} className="h-full object-cover" />}
                </div>
                <button onClick={() => { setExistingFiles(prev => prev.filter((_, i) => i !== idx)); setRemovedFiles(prev => [...prev, file]); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"><FaTimes /></button>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-orange-50 transition-all group">
            <FaPaperclip className="text-gray-300 group-hover:text-orange-400" /><span className="text-sm font-medium text-gray-400">Click to upload files</span>
            <input type="file" multiple accept="image/*,application/pdf" hidden onChange={e => setAttachments([...attachments, ...Array.from(e.target.files)])} />
          </label>
        </SectionCard>

        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/debit-notes-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm hover:bg-gray-50">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${loading ? "bg-gray-300" : "bg-orange-600 hover:bg-orange-700"}`}>
            {loading ? "Processing..." : editId ? "Update Debit Note" : "Submit Debit Note"}
          </button>
        </div>
      </div>

      {modalItemIndex !== null && (
        <BatchAllocationModal
          itemsbatch={{
            itemId: formData.items[modalItemIndex].item,
            sourceWarehouse: formData.items[modalItemIndex].warehouse,
            itemName: formData.items[modalItemIndex].itemName,
            qty: formData.items[modalItemIndex].quantity,
            currentAllocations: formData.items[modalItemIndex].batches,
          }}
          batchOptions={batchModalOptions}
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={(batches) => {
            setFormData(prev => {
              const items = [...prev.items];
              items[modalItemIndex].batches = batches;
              return { ...prev, items };
            });
          }}
        />
      )}
      <ToastContainer position="bottom-right" autoClose={3000} />
    </div>
  );
}

// "use client";

// import React, { useState, useEffect, useCallback, Suspense } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import SupplierSearch from "@/components/SupplierSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// import BatchAllocationModal from "@/components/MultiBatchModalbtach"; // Ensure this path is correct if you renamed it

// // Initial state for Debit Note form
// const initialDebitNoteState = {
//   supplierCode: "",
//   supplierName: "",
//   supplierContact: "",
//   refNumber: "",
//   salesEmployee: "",
//   status: "Pending",
//   postingDate: "",
//   validUntil: "",
//   documentDate: "",
//   items: [
//     {
//       item: "", // Stores item ObjectId from DB
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       allowedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       tdsAmount: 0,
//       batches: [], // Array to store allocated batch details {batchCode, allocatedQuantity, etc.}
//       warehouse: "", // Stores warehouse ObjectId from DB
//       warehouseName: "",
//       warehouseCode: "",
//       errorMessage: "",
//       taxOption: "GST",
//       managedByBatch: false, // Flag indicating if item is batch-managed
//       gstRate: 0,
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

// // Helper to format date for HTML date input
// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// // Wrapper component for Suspense
// function DebitNoteFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <DebitNoteForm />
//     </Suspense>
//   );
// }

// // Main DebitNoteForm component
// function DebitNoteForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [attachments, setAttachments] = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [attachmentsLoading, setAttachmentsLoading] = useState(false);
//   const [isReadOnly, setIsReadOnly] = useState(false);

//   const [formData, setFormData] = useState(initialDebitNoteState);
//   const [modalItemIndex, setModalItemIndex] = useState(null);
//   const [batchModalOptions, setBatchModalOptions] = useState([]);

//   const [isCopied, setIsCopied] = useState(false);

//   // useEffect to handle copying data from session storage
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       let storedData = null;
//       const invoiceData = sessionStorage.getItem("invoiceData");
//       if (invoiceData) {
//         storedData = invoiceData;
//         sessionStorage.removeItem("invoiceData");
//       } else {
//         const debitNoteDataCamel = sessionStorage.getItem("debitNoteData");
//         const debitNoteDataPascal = sessionStorage.getItem("DebitNoteData");
//         if (debitNoteDataCamel) {
//           storedData = debitNoteDataCamel;
//           sessionStorage.removeItem("debitNoteData");
//         } else if (debitNoteDataPascal) {
//           storedData = debitNoteDataPascal;
//           sessionStorage.removeItem("DebitNoteData");
//         }
//       }

//       if (storedData) {
//         try {
//           const parsedData = JSON.parse(storedData);
//           console.log("Parsed Data on Copy/Load (from session storage):", parsedData);

//           const sourceSupplierCode = parsedData.supplier?.supplierCode || parsedData.customerCode || parsedData.supplierCode || "";
//           const sourceSupplierName = parsedData.supplier?.supplierName || parsedData.customerName || parsedData.supplierName || "";
//           const sourceSupplierContact = parsedData.supplier?.contactPersonName || parsedData.contactPerson || parsedData.supplierContact || "";

//           const mappedData = {
//             ...parsedData,
//             supplierCode: sourceSupplierCode,
//             supplierName: sourceSupplierName,
//             supplierContact: sourceSupplierContact,

//             customerCode: "",
//             customerName: "",
//             contactPerson: "",

//             postingDate: formatDateForInput(parsedData.postingDate || parsedData.orderDate),
//             validUntil: formatDateForInput(parsedData.validUntil || parsedData.expectedDeliveryDate || parsedData.dueDate),
//             documentDate: formatDateForInput(parsedData.documentDate || new Date()),

//             refNumber: parsedData.documentNumber ? `DN-${parsedData.documentNumber}` : (parsedData.refNumber ? `DN-${parsedData.refNumber}` : ""),

//             attachments: parsedData.attachments || [],
//           };

//           const updatedItems = (parsedData.items || []).map((item) => {
//             const unitPrice = parseFloat(item.unitPrice) || 0;
//             const discount = parseFloat(item.discount) || 0;
//             const quantity = parseFloat(item.quantity) || 0;
//             const freight = parseFloat(item.freight) || 0;
//             const gstRate = parseFloat(item.gstRate) || 0;
//             const taxOption = item.taxOption || "GST";
//             const managedBy = item.managedBy || "";

//             const priceAfterDiscount = unitPrice - discount;
//             const totalAmountBeforeTax = quantity * priceAfterDiscount + freight;

//             let calculatedCgstAmount = 0;
//             let calculatedSgstAmount = 0;
//             let calculatedIgstAmount = 0;
//             let calculatedGstAmount = 0;

//             if (taxOption === "IGST") {
//               calculatedIgstAmount = totalAmountBeforeTax * (gstRate / 100);
//               calculatedGstAmount = calculatedIgstAmount;
//             } else {
//               const halfGstRate = gstRate / 2;
//               calculatedCgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//               calculatedSgstAmount = totalAmountBeforeTax * (halfGstRate / 100);
//               calculatedGstAmount = calculatedCgstAmount + calculatedSgstAmount;
//             }

//             const copiedBatches = (managedBy.toLowerCase() === "batch" && item.batches)
//               ? item.batches.map(b => ({
//                   batchCode: b.batchCode || b.batchNumber || '',
//                   allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0,
//                   expiryDate: b.expiryDate || null,
//                   manufacturer: b.manufacturer || '',
//                   unitPrice: Number(b.unitPrice) || 0,
//                 }))
//               : [];

//             return {
//               ...item,
//               unitPrice,
//               discount,
//               quantity,
//               freight,
//               gstType: item.gstType || 0,
//               gstRate,
//               taxOption,
//               priceAfterDiscount,
//               totalAmount: totalAmountBeforeTax,
//               extraAmount: item.extraAmount || 0,
//               gstAmount: calculatedGstAmount,
//               cgstAmount: calculatedCgstAmount,
//               sgstAmount: calculatedSgstAmount,
//               igstAmount: calculatedIgstAmount,
//               managedBy: managedBy,
//               managedByBatch: managedBy.toLowerCase() === "batch",
//               batches: copiedBatches,
//               warehouse: item.warehouse || "",
//               warehouseName: item.warehouseName || "",
//               warehouseCode: item.warehouseCode || "",
//               errorMessage: "",
//               tdsAmount: item.tdsAmount || 0,
//             };
//           });

//           if (mappedData.attachments && Array.isArray(mappedData.attachments)) {
//             setExistingFiles(mappedData.attachments);
//           } else {
//             setExistingFiles([]);
//           }

//           setFormData({
//             ...mappedData,
//             items: updatedItems,
//             totalBeforeDiscount: 0,
//             gstTotal: 0,
//             grandTotal: 0,
//             openBalance: 0,
//           });

//           setIsCopied(true);
//           toast.success("Data copied successfully!");
//         } catch (error) {
//           console.error("Error parsing copied data:", error);
//           toast.error("Failed to copy data.");
//         }
//       }
//     }
//   }, []);

//   // useEffect to fetch existing Debit Note data if in edit mode
//   useEffect(() => {
//     if (editId) {
//       setAttachmentsLoading(true);
//       axios
//         .get(`/api/debit-note/${editId}`, {
//           headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
//         })
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             setFormData({
//               ...record,
//               postingDate: formatDateForInput(record.postingDate),
//               validUntil: formatDateForInput(record.validUntil),
//               documentDate: formatDateForInput(record.documentDate),
//               items: record.items.map(item => ({
//                 ...item,
//                 managedByBatch: item.managedBy && item.managedBy.toLowerCase() === 'batch',
//                 batches: item.managedBy && item.managedBy.toLowerCase() === 'batch' && Array.isArray(item.batches)
//                   ? item.batches.map(b => ({
//                       batchCode: b.batchCode || b.batchNumber || '',
//                       allocatedQuantity: Number(b.allocatedQuantity) || Number(b.quantity) || 0,
//                       expiryDate: b.expiryDate || null,
//                       manufacturer: b.manufacturer || '',
//                       unitPrice: Number(b.unitPrice) || 0,
//                     }))
//                   : [],
//               }))
//             });
//             if (record.attachments && Array.isArray(record.attachments)) {
//               setExistingFiles(record.attachments);
//             }
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching debit note for edit", err);
//           toast.error("Error fetching debit note data");
//         })
//         .finally(() => {
//           setAttachmentsLoading(false);
//         });
//     }
//   }, [editId]);

//   // Callback for when a supplier is selected from SupplierSearch
//   const handleSupplierSelect = useCallback((selectedSupplier) => {
//     setFormData((prev) => ({
//       ...prev,
//       supplierCode: selectedSupplier.supplierCode || "",
//       supplierName: selectedSupplier.supplierName || "",
//       supplierContact: selectedSupplier.contactPersonName || "",
//     }));
//   }, []);

//   // Generic handler for input changes in the main form data
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   // Handler for changes within an item row
//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };

//       const item = updatedItems[index];
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

//       updatedItems[index] = {
//         ...updatedItems[index],
//         priceAfterDiscount,
//         totalAmount: totalAmountBeforeTax,
//         gstAmount: calculatedGstAmount,
//         cgstAmount: calculatedCgstAmount,
//         sgstAmount: calculatedSgstAmount,
//         igstAmount: calculatedIgstAmount,
//       };

//       if (item.managedByBatch && parseFloat(value) !== item.quantity && name === 'quantity') {
//           updatedItems[index].batches = [];
//           toast.info("Quantity changed for a batch-managed item. Please re-allocate batches.");
//       }

//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   // Callback to remove an item row
//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   // Callback to add a new empty item row
//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         {
//           item: "",
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           allowedQuantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           cgstAmount: 0,
//           sgstAmount: 0,
//           tdsAmount: 0,
//           batches: [],
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           errorMessage: "",
//           taxOption: "GST",
//           igstAmount: 0,
//           managedByBatch: false,
//           gstRate: 0,
//           managedBy: "",
//         },
//         ...prev.items,
//       ],
//     }));
//   }, []);

//   // Callback for when an item is selected via ItemSearch
//   const handleItemSelect = useCallback(async (index, selectedItem) => {
//     if (!selectedItem._id) {
//       toast.error("Selected item does not have a valid ID.");
//       return;
//     }

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
//         managedByValue = "";
//       }
//     } else {
//       console.log(`Using managedBy from selected item for ${selectedItem.itemCode}:`, managedByValue);
//     }

//     const unitPrice = Number(selectedItem.unitPrice) || 0;
//     const discount = Number(selectedItem.discount) || 0;
//     const freight = Number(selectedItem.freight) || 0;
//     const quantity = 1;
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
//       item: selectedItem._id,
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
//       batches: [],
//       warehouse: selectedItem.warehouse || "",
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

//   // useEffect for calculating summary totals
//   useEffect(() => {
//     const items = formData.items ?? [];

//     const totalBeforeDiscountCalc = items.reduce((acc, item) => {
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 0;
//       return acc + (unitPrice - discount) * quantity;
//     }, 0);

//     const totalItemsCalc = items.reduce(
//       (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//       0,
//     );

//     const gstTotalCalc = items.reduce((acc, item) => {
//       if (item.taxOption === "IGST") {
//         return acc + (parseFloat(item.igstAmount) || 0);
//       }
//       return acc + (parseFloat(item.cgstAmount) || 0) + (parseFloat(item.sgstAmount) || 0);
//     }, 0);

//     const overallFreight = parseFloat(formData.freight) || 0;
//     const roundingCalc = parseFloat(formData.rounding) || 0;
//     const totalDownPaymentCalc = parseFloat(formData.totalDownPayment || 0);
//     const appliedAmountsCalc = parseFloat(formData.appliedAmounts || 0);

//     const grandTotalCalc =
//       totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//     const openBalanceCalc =
//       grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount: totalBeforeDiscountCalc,
//       gstTotal: gstTotalCalc,
//       grandTotal: grandTotalCalc,
//       openBalance: openBalanceCalc,
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);

//   // Handle form submission (Add/Update Debit Note)
//   const handleSubmit = async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) {
//         toast.error("Authentication required. Please log in.");
//         router.push("/login");
//         return;
//       }

//       if (!formData.supplierName || !formData.refNumber || formData.items.length === 0) {
//         toast.error("Please fill in Supplier Name, Debit Note Number, and add at least one item.");
//         return;
//       }
//       for (const item of formData.items) {
//         if (!item.item || !item.warehouse) {
//           toast.error(`Item '${item.itemName || item.itemCode || "Unnamed Item"}' requires a valid Item and Warehouse selection.`);
//           return;
//         }
//         if (!item.itemCode || !item.itemName || item.quantity <= 0 || item.unitPrice <= 0) {
//           toast.error(`Item '${item.itemName || item.itemCode || "Unnamed Item"}' requires a valid Item Code, Item Name, Quantity (>0), and Unit Price (>0).`);
//           return;
//         }
//         if (item.managedByBatch) {
//             const allocatedTotal = item.batches.reduce((sum, batch) => sum + (Number(batch.allocatedQuantity) || 0), 0);
//             if (allocatedTotal !== item.quantity) {
//                 toast.error(`Item '${item.itemName}' requires total allocated batch quantity (${allocatedTotal}) to match item quantity (${item.quantity}). Please re-allocate batches.`);
//                 return;
//             }
//             if (item.batches.length === 0 && item.quantity > 0) {
//                 toast.error(`Item '${item.itemName}' is batch-managed but no batches are allocated.`);
//                 return;
//             }
//         }
//       }

//       const dataToSend = new FormData();

//       const formDataForApi = { ...formData };
//       delete formDataForApi.attachments;
//       dataToSend.append("debitNoteData", JSON.stringify(formDataForApi));

//       attachments.forEach((file) => {
//         dataToSend.append("newAttachments", file);
//       });

//       const retainedExistingFiles = existingFiles.filter(
//         (file) => !removedFiles.some(removed => removed.publicId === file.publicId || removed.fileUrl === file.fileUrl)
//       );
//       if (retainedExistingFiles.length > 0) {
//         dataToSend.append("existingFiles", JSON.stringify(retainedExistingFiles));
//       }

//       if (removedFiles.length > 0) {
//         dataToSend.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
//       }

//       const url = editId ? `/api/debit-note/${editId}` : "/api/debit-note";
//       const method = editId ? "put" : "post";

//       const response = await axios({
//         method,
//         url,
//         data: dataToSend,
//         headers: {
//           Authorization: `Bearer ${token}`,
//           "Content-Type": "multipart/form-data",
//         },
//       });

//       if (response.data.success) {
//           toast.success(editId ? "Debit Note updated successfully" : "Debit Note added successfully");
//           if (!editId) {
//             setFormData(initialDebitNoteState);
//             setAttachments([]);
//             setExistingFiles([]);
//             setRemovedFiles([]);
//           } else {
//             setExistingFiles(response.data.debitNote?.attachments || []);
//             setRemovedFiles([]);
//             setAttachments([]);
//           }
//           router.push("/admin/debit-notes-view");
//       } else {
//           toast.error(response.data.message || "Operation failed.");
//       }

//     } catch (error) {
//       console.error("Error saving debit note:", error);
//       const errorMessage = error.response?.data?.message || "An unexpected error occurred.";
//       if (error.response && error.response.data && error.response.data.error) {
//         toast.error(`Failed to save Debit Note: ${error.response.data.error}`);
//       } else {
//         toast.error(`Failed to save Debit Note: ${errorMessage}`);
//       }
//     }
//   };

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


//   const openBatchModal = useCallback(async (index) => {
//     const currentItem = formData.items[index];
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
//             setModalItemIndex(index);
//         } else {
//             toast.error(res.data.message || "Failed to fetch available batches.");
//         }
//     } catch (error) {
//         console.error("Error fetching available batches:", error);
//         toast.error(`Error loading available batches: ${error.response?.data?.message || error.message}`);
//     }
//   }, [formData.items]);


//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Debit Note" : "Create Debit Note"}
//       </h1>

//       {/* Supplier Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         {/* Left column */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input
//               type="text"
//               name="supplierCode"
//               readOnly
//               value={formData.supplierCode || ""}
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             {(formData.supplierName && (isCopied || editId)) ? (
//               <input
//                 type="text"
//                 name="supplierName"
//                 readOnly
//                 value={formData.supplierName || ""}
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             ) : (
//               <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//             )}
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="supplierContact"
//               readOnly
//               value={formData.supplierContact || ""}
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Debit Note Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>

//         {/* Right column */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || "Pending"}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formData.postingDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formData.documentDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onRemoveItem={removeItemRow}
//           setFormData={setFormData}
//           onItemSelect={handleItemSelect}
//         />
//       </div>

//       {/* Batch Selection Section (for items managed by batch) */}
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
//                 <span className="font-semibold text-lg">{item.itemName || `Item ${index + 1}`}</span>
//                 <button
//                   onClick={() => openBatchModal(index)}
//                   className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
//                   disabled={!item.item || !item.warehouse || item.quantity <= 0}
//                 >
//                   Allocate Batches ({item.quantity})
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

//       {/* Remarks & Sales Employee */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           ></textarea>
//         </div>
//       </div>

//       {/* Summary Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Total Before Discount</label>
//           <input
//             type="number"
//             name="totalBeforeDiscount"
//             value={formData.totalBeforeDiscount.toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST Total</label>
//           <input
//             type="number"
//             name="gstTotal"
//             value={formData.gstTotal.toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Grand Total</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal.toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>

//       {/* Attachments Section */}
//       <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
//         <label className="font-medium block mb-2">Attachments</label>

//         {/* Existing Files Display */}
//         {attachmentsLoading ? (
//           <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//             Loading attachments...
//           </div>
//         ) : existingFiles && existingFiles.length > 0 ? (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-50 p-3 rounded border">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl;
//               const name = file.fileName;
//               const isPDF =
//                 file.fileType === "application/pdf" ||
//                 url.toLowerCase().endsWith(".pdf");

//               return (
//                 <div
//                   key={`existing-${idx}`}
//                   className="relative border rounded p-2 text-center bg-slate-200"
//                 >
//                   {isPDF ? (
//                     <object
//                       data={url}
//                       type="application/pdf"
//                       className="h-24 w-full rounded"
//                     />
//                   ) : (
//                     <img
//                       src={url}
//                       alt={name}
//                       className="h-24 w-full object-cover rounded"
//                     />
//                   )}
//                   <a
//                     href={url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="block text-blue-600 text-xs mt-1 truncate"
//                   >
//                     {name}
//                   </a>
//                   {!isReadOnly && (
//                     <button
//                       onClick={() => {
//                         setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                         setRemovedFiles((prev) => [...(prev || []), file]);
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

//         {/* File Upload Input for New Attachments (only if not read-only) */}
//         {!isReadOnly && (
//           <>
//             <input
//               type="file"
//               multiple
//               accept="image/*,application/pdf"
//               onChange={(e) => {
//                 const files = Array.from(e.target.files);
//                 setAttachments((prev) => {
//                   const uniqueMap = new Map(prev.map((f) => [f.name + f.size, f]));
//                   files.forEach((f) => uniqueMap.set(f.name + f.size, f));
//                   return [...uniqueMap.values()];
//                 });
//                 e.target.value = "";
//               }}
//               className="border px-3 py-2 w-full mt-2 rounded"
//             />
//             {/* Previews of New Files */}
//             {attachments.length > 0 && (
//               <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//                 {attachments.map((file, idx) => {
//                   if (!(file instanceof File)) return null;

//                   const url = URL.createObjectURL(file);
//                   const isPDF = file.type === "application/pdf";

//                   return (
//                     <div
//                       key={`new-${idx}`}
//                       className="relative border rounded p-2 text-center bg-slate-300"
//                     >
//                       {isPDF ? (
//                         <object
//                           data={url}
//                           type="application/pdf"
//                           className="h-24 w-full rounded"
//                         />
//                       ) : (
//                         <img
//                           src={url}
//                           alt={file.name}
//                           className="h-24 w-full object-cover rounded"
//                         />
//                       )}
//                       <button
//                         onClick={() =>
//                           setAttachments((prev) => prev.filter((_, i) => i !== idx))
//                         }
//                         className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//                       >
//                         ×
//                       </button>
//                     </div>
//                   );
//                 })}
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {editId ? "Update Debit Note" : "Add Debit Note"}
//         </button>
//         <button
//           onClick={() => router.push("/admin/debit-note")}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             sessionStorage.setItem("debitNoteData", JSON.stringify(formData));
//             toast.success("Current form data copied to session storage!");
//           }}
//           className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
//         >
//           Copy Current Form
//         </button>
//       </div>

//       {/* Render the Batch Allocation Modal if an item is selected for batch editing */}
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

// export default DebitNoteFormWrapper;

