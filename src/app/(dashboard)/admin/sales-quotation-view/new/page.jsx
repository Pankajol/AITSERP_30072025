"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { toast, ToastContainer } from "react-toastify";
import {
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, FaCalculator,
  FaPaperclip, FaTimes, FaWarehouse, FaCopy
} from "react-icons/fa";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const round = (num, decimals = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(decimals));
};

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
    const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: cgstAmount + sgstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
    };
  }
  if (item.taxOption === "IGST") {
    let igstRate = parseFloat(item.igstRate);
    if (isNaN(igstRate) || igstRate === 0) igstRate = parseFloat(item.gstRate) || 0;
    const igstAmount = round(totalAmount * (igstRate / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
    };
  }
  return {
    priceAfterDiscount,
    totalAmount,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
  };
};

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

const Lbl = ({ text, req }) => (
  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
    {text}{req && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const fi = (readOnly = false) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
   ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => {
  const colorMap = {
    indigo: "bg-indigo-50/40 border-indigo-100",
    blue: "bg-blue-50/40 border-blue-100",
    emerald: "bg-emerald-50/40 border-emerald-100",
    amber: "bg-amber-50/40 border-amber-100",
    gray: "bg-gray-50/40 border-gray-100",
  };
  const iconColorMap = {
    indigo: "bg-indigo-100 text-indigo-500",
    blue: "bg-blue-100 text-blue-500",
    emerald: "bg-emerald-100 text-emerald-500",
    amber: "bg-amber-100 text-amber-500",
    gray: "bg-gray-100 text-gray-500",
  };
  const bgClass = colorMap[color] || colorMap.indigo;
  const iconClass = iconColorMap[color] || iconColorMap.indigo;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${bgClass}`}>
        <div className={`w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center`}>
          <Icon className="text-sm" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
};

const ReadField = ({ label, value }) => (
  <div>
    <Lbl text={label} />
    <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
      {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
    </div>
  </div>
);

const initialState = {
  customer: "", customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  status: "Draft",
  postingDate: formatDateForInput(new Date()),
  validUntil: "",
  documentDate: formatDateForInput(new Date()),
  items: [{
    item: "", imageUrl: "", itemCode: "", itemName: "", itemDescription: "",
    quantity: 0, unitPrice: 0, discount: 0, freight: 0,
    gstRate: 0, igstRate: 0, taxOption: "GST",
    priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    warehouse: "", warehouseName: "", warehouseCode: "",
    variant: null, selectedVariantId: null,
  }],
  salesEmployee: "", remarks: "", freight: 0, rounding: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
  invoiceType: "Normal",
};

export default function SalesQuotationFormWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading...</div>}>
      <SalesQuotationForm />
    </Suspense>
  );
}

function SalesQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const isEdit = Boolean(editId);

  const [formData, setFormData] = useState(initialState);
  const [attachments, setAttachments] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedGlobalWarehouse, setSelectedGlobalWarehouse] = useState("");
  const [defaultWarehouse, setDefaultWarehouse] = useState(null);

  // Fetch warehouses and default warehouse
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    Promise.all([
      axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("/api/warehouse?getDefault=true", { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([whRes, defRes]) => {
        if (whRes.data.success) setWarehouses(whRes.data.data);
        if (defRes.data.success && defRes.data.data) {
          setDefaultWarehouse(defRes.data.data);
          setSelectedGlobalWarehouse(defRes.data.data._id);
        }
      })
      .catch(console.error);
  }, []);

  // Apply warehouse to all items
  const applyWarehouseToAll = (warehouseId) => {
    const wh = warehouses.find(w => w._id === warehouseId);
    if (!wh) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        warehouse: wh._id,
        warehouseName: wh.warehouseName,
        warehouseCode: wh.warehouseCode,
      })),
    }));
    toast.success(`Warehouse "${wh.warehouseName}" applied to all items.`);
  };

  const applyDefaultWarehouseToAll = () => {
    if (!defaultWarehouse) {
      toast.warning("No default warehouse configured.");
      return;
    }
    applyWarehouseToAll(defaultWarehouse._id);
  };

  // Fetch for Edit
  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setFetchLoading(true);
      const token = localStorage.getItem("token");
      axios.get(`/api/sales-quotation?id=${editId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          const record = res.data.data;
          // Enhance items with image from variant if needed
          const enhancedItems = (record.items || []).map(it => {
            let imageUrl = it.imageUrl || it.item?.imageUrl || '';
            if (it.item && it.itemCode && it.itemCode !== it.item?.itemCode && it.item.variants) {
              const variant = it.item.variants.find(v => v.sku === it.itemCode);
              if (variant?.imageUrl) imageUrl = variant.imageUrl;
            }
            if (it.variant?.imageUrl) imageUrl = it.variant.imageUrl;
            return {
              ...initialState.items[0],
              ...it,
              imageUrl,
              priceAfterDiscount: it.priceAfterDiscount || 0,
              totalAmount: it.totalAmount || 0,
              gstAmount: it.gstAmount || 0,
              cgstAmount: it.cgstAmount || 0,
              sgstAmount: it.sgstAmount || 0,
              igstAmount: it.igstAmount || 0,
            };
          });
          setFormData({
            ...initialState,
            ...record,
            postingDate: formatDateForInput(record.postingDate),
            validUntil: formatDateForInput(record.validUntil),
            documentDate: formatDateForInput(record.documentDate),
            items: enhancedItems,
          });
          setExistingFiles(record.attachments || []);
        })
        .catch(err => toast.error("Failed to load quotation"))
        .finally(() => setFetchLoading(false));
    }
  }, [editId]);

  // Recalculate totals
  useEffect(() => {
    const totalBeforeDiscount = formData.items.reduce((sum, it) => sum + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstTotal = formData.items.reduce((sum, it) => sum + (it.gstAmount || 0), 0);
    const freight = Number(formData.freight) || 0;
    const rounding = Number(formData.rounding) || 0;
    const grand = totalBeforeDiscount + gstTotal + freight + rounding;
    setFormData(prev => ({ ...prev, totalBeforeDiscount, gstTotal, grandTotal: grand }));
  }, [formData.items, formData.freight, formData.rounding]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Enhanced item change handler (supports both events and direct object updates)
  const handleItemChange = (index, update) => {
    setFormData(prev => {
      const items = [...prev.items];
      let updatedItem = { ...items[index] };
      if (update && typeof update === "object") {
        if (update.target) {
          // Event-like object
          const { name, value } = update.target;
          const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"];
          const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
          updatedItem[name] = newValue;
        } else {
          // Direct object update (e.g., from variant selection)
          updatedItem = { ...updatedItem, ...update };
        }
      }
      const computed = computeItemValues(updatedItem);
      updatedItem = { ...updatedItem, ...computed };
      items[index] = updatedItem;
      return { ...prev, items };
    });
  };

  const addItemRow = () => {
    const defaultWh = warehouses.find(w => w._id === selectedGlobalWarehouse);
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ...initialState.items[0],
        warehouse: selectedGlobalWarehouse,
        warehouseName: defaultWh?.warehouseName || "",
        warehouseCode: defaultWh?.warehouseCode || "",
      }],
    }));
  };

  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    if (!formData.customerName || !formData.customerCode) {
      toast.error("Please select a valid customer.");
      return false;
    }
    if (!formData.documentDate) {
      toast.error("Document date is required.");
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
      if (!item.warehouse) {
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

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };

  const removeExistingFile = (file, idx) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx));
    setRemovedFiles(prev => [...prev, file]);
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      const payload = {
        ...formData,
        existingFiles,
        removedFiles,
        items: formData.items.map(it => ({
          ...it,
          item: typeof it.item === "object" ? it.item._id : it.item,
          warehouse: typeof it.warehouse === "object" ? it.warehouse._id : it.warehouse,
          variant: it.variant || null,
        })),
      };
      fd.append("quotationData", JSON.stringify(payload));
      attachments.forEach(file => fd.append("attachments", file));

      const url = isEdit ? `/api/sales-quotation?id=${editId}` : "/api/sales-quotation";
      const method = isEdit ? "put" : "post";
      await axios({ method, url, data: fd, headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      toast.success(isEdit ? "Quotation updated" : "Quotation created");
      router.push("/admin/sales-quotation-view");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error saving quotation");
    } finally { setLoading(false); }
  };

  if (fetchLoading) return <div className="p-10 text-center text-gray-400">Loading quotation data...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/sales-quotation-view")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
          <FaArrowLeft className="text-xs" /> Back
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Edit" : "New"} Sales Quotation</h1>

        <SectionCard icon={FaUser} title="Customer Details" color="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <CustomerSearch
                onSelectCustomer={c => setFormData(prev => ({
                  ...prev,
                  customer: c._id,
                  customerCode: c.customerCode,
                  customerName: c.customerName,
                  contactPerson: c.contactPersonName,
                }))}
              />
            </div>
            <ReadField label="Customer Name" value={formData.customerName} />
            <ReadField label="Customer Code" value={formData.customerCode} />
            <ReadField label="Contact Person" value={formData.contactPerson} />
            <div>
              <Lbl text="Reference Number" />
              <input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} placeholder="e.g., SQ-001" />
            </div>
          </div>
        </SectionCard>

        <SectionCard icon={FaCalendarAlt} title="Dates & Status" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Lbl text="Posting Date" req />
              <input className={fi()} type="date" name="postingDate" value={formData.postingDate} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Document Date" req />
              <input className={fi()} type="date" name="documentDate" value={formData.documentDate} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Valid Until" />
              <input className={fi()} type="date" name="validUntil" value={formData.validUntil} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Status" />
              <select className={fi()} name="status" value={formData.status} onChange={handleInputChange}>
                <option value="Draft">Draft</option>
                <option value="Submitted">Submitted</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Warehouse Quick Action */}
        {warehouses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50/40">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500">
                <FaWarehouse className="text-sm" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Warehouse Assignment</p>
                <p className="text-xs text-gray-400">Set a warehouse and apply to all items</p>
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-indigo-400"
                  value={selectedGlobalWarehouse}
                  onChange={e => setSelectedGlobalWarehouse(e.target.value)}
                >
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map(wh => (
                    <option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>
                  ))}
                </select>
                <button
                  onClick={() => applyWarehouseToAll(selectedGlobalWarehouse)}
                  disabled={!selectedGlobalWarehouse}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
                >
                  <FaCopy className="text-xs" /> Apply to All Items
                </button>
                {defaultWarehouse && (
                  <button
                    onClick={applyDefaultWarehouseToAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700"
                  >
                    <FaCopy className="text-xs" /> Apply Default to All
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                This will overwrite the warehouse for <strong>all existing items</strong>. New rows will inherit the selected warehouse.
              </p>
            </div>
          </div>
        )}

        {/* Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center gap-2">
            <FaBoxOpen className="text-emerald-500" /> Quotation Items
          </div>
          <div className="p-4 overflow-x-auto">
            <ItemSection
              items={formData.items}
              onItemChange={handleItemChange}
              onAddItem={addItemRow}
              onRemoveItem={removeItemRow}
              computeItemValues={computeItemValues}
            />
          </div>
        </div>

        {/* Financial Summary */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ReadField label="Taxable Amount" value={`₹ ${formData.totalBeforeDiscount.toFixed(2)}`} />
            <ReadField label="GST Total" value={`₹ ${formData.gstTotal.toFixed(2)}`} />
            <div>
              <Lbl text="Grand Total" />
              <div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-extrabold text-indigo-700">
                ₹ {formData.grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <Lbl text="Remarks / Notes" />
            <textarea className={`${fi()} resize-none`} name="remarks" rows={2} value={formData.remarks || ""} onChange={handleInputChange} placeholder="Any additional notes..." />
          </div>
        </SectionCard>

        {/* Attachments */}
        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingFiles.map((file, idx) => (
              <div key={idx} className="relative border rounded-xl p-2 bg-gray-50 group">
                <div className="h-20 flex items-center justify-center overflow-hidden">
                  {file.fileUrl?.toLowerCase().endsWith(".pdf") ? (
                    <object data={file.fileUrl} type="application/pdf" className="h-full w-full" />
                  ) : (
                    <img src={file.fileUrl} className="h-full object-cover" alt="attachment" />
                  )}
                </div>
                <button
                  onClick={() => removeExistingFile(file, idx)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg hover:bg-red-600"
                >
                  <FaTimes />
                </button>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all group">
            <FaPaperclip className="text-gray-300 group-hover:text-indigo-400" />
            <span className="text-sm font-medium text-gray-400">Upload files (PDF, images)</span>
            <input type="file" multiple accept="image/*,application/pdf" hidden onChange={handleFileSelect} />
          </label>
          {attachments.length > 0 && (
            <div className="mt-3 text-xs text-gray-400">{attachments.length} new file(s) ready</div>
          )}
        </SectionCard>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/sales-quotation-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all ${loading ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {loading ? "Saving..." : isEdit ? "Update Quotation" : "Create Quotation"}
          </button>
        </div>
      </div>
    </div>
  );
}




// "use client";

// import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast , ToastContainer} from "react-toastify";
// import {
//   FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
//   FaFileAlt, FaBoxOpen, FaUserTie, FaPaperclip,
//   FaCalculator, FaTimes
// } from "react-icons/fa";

// // ============================================================
// // ── HELPERS & SUB-COMPONENTS (Defined OUTSIDE to prevent focus loss) ──
// // ============================================================

// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   return isNaN(n) ? 0 : Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const pad = round(unitPrice - discount);
//   const total = round(quantity * pad + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgst = round(total * (gstRate / 200));
//     return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst * 2, cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0 };
//   }
//   const igst = round(total * ((parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0) / 100));
//   return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
// }

// const Lbl = ({ text, req }) => (
//   <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//     {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//   </label>
// );

// const fi = (readOnly = false) =>
//   `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
//    ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

// const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
//   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
//     <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
//       <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}><Icon className="text-sm" /></div>
//       <div><p className="text-sm font-bold text-gray-900">{title}</p>{subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}</div>
//     </div>
//     <div className="px-6 py-5">{children}</div>
//   </div>
// );

// const ReadField = ({ label, value }) => (
//   <div>
//     <Lbl text={label} />
//     <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
//       {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
//     </div>
//   </div>
// );

// const initialState = {
//   customer: "", customerCode: "", customerName: "", contactPerson: "", refNumber: "", 
//   status: "Draft", postingDate: formatDateForInput(new Date()), validUntil: "", documentDate: formatDateForInput(new Date()),
//   items: [{
//     item: "", itemCode: "", itemName: "", itemDescription: "", quantity: 0, unitPrice: 0, discount: 0, freight: 0,
//     gstRate: 0, taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0,
//     igstRate: 0, igstAmount: 0, warehouse: "", managedByBatch: true,
//   }],
//   salesEmployee: "", remarks: "", freight: 0, rounding: 0, totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
//   invoiceType: "Normal", existingFiles: [], removedFiles: [],
// };

// // ============================================================
// // ── MAIN FORM COMPONENT ──
// // ============================================================

// function SalesQuotationForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [attachments, setAttachments] = useState([]);
//   const [formData, setFormData] = useState(initialState);
//   const [loading, setLoading] = useState(false);
//   const [fetchLoading, setFetchLoading] = useState(false);

//   // Fetch for Edit
//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setFetchLoading(true);
//       const token = localStorage.getItem("token");
//       axios.get(`/api/sales-quotation/${editId}`, { headers: { Authorization: `Bearer ${token}` } })
//         .then((res) => {
//           const record = res.data.data;
//           setFormData({
//             ...initialState,
//             ...record,
//             existingFiles: record.attachments || [],
//             postingDate: formatDateForInput(record.postingDate),
//             validUntil: formatDateForInput(record.validUntil),
//             documentDate: formatDateForInput(record.documentDate),
//             items: record.items.map(item => ({ ...item, ...computeItemValues(item) }))
//           });
//         })
//         .finally(() => setFetchLoading(false));
//     }
//   }, [editId]);

//   // Totals Calculation
//   useEffect(() => {
//     const totalBeforeDiscount = round(formData.items.reduce((acc, it) => acc + (it.unitPrice - it.discount) * it.quantity, 0));
//     const gstTotal = round(formData.items.reduce((acc, it) => acc + (it.taxOption === "IGST" ? it.igstAmount : it.gstAmount), 0));
//     const grandTotal = round(formData.items.reduce((acc, it) => acc + it.totalAmount, 0) + gstTotal + Number(formData.freight) + Number(formData.rounding));
//     setFormData(prev => ({ ...prev, totalBeforeDiscount, gstTotal, grandTotal }));
//   }, [formData.items, formData.freight, formData.rounding]);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
//       updatedItems[index] = { ...updatedItems[index], ...computeItemValues(updatedItems[index]) };
//       return { ...prev, items: updatedItems };
//     });
//   }, []);
//   const validateForm = () => {
//       if (!formData.customerName || !formData.customerCode) {
//         toast.error("Please select a valid customer.");
//         return false;
//       }
//       if (!formData.documentDate) {
//         toast.error("Document date is required.");
//         return false;
//       }
//       if (formData.items.length === 0) {
//         toast.error("At least one item is required.");
//         return false;
//       }
  
//       for (let i = 0; i < formData.items.length; i++) {
//         const item = formData.items[i];
//         if (!item.item || item.item === "") {
//           toast.error(`Item selection missing in row ${i + 1}`);
//           return false;
//         }
//         // if (!item.warehouse || item.warehouse === "") {
//         //   toast.error(`Warehouse missing for item in row ${i + 1}`);
//         //   return false;
//         // }
//         if (Number(item.quantity) <= 0) {
//           toast.error(`Quantity must be greater than 0 in row ${i + 1}`);
//           return false;
//         }
//       }
//       return true;
//     };

//   const handleSubmit = async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const fd = new FormData();
//       fd.append("quotationData", JSON.stringify(formData));
//       attachments.forEach(f => fd.append("attachments", f));

//       const url = editId ? `/api/sales-quotation/${editId}` : `/api/sales-quotation`;
//       await axios[editId ? "put" : "post"](url, fd, { headers: { Authorization: `Bearer ${token}` } });
//       toast.success("Saved!");
//       router.push("/admin/sales-quotation-view");
//     } catch (err) {
//       toast.error(err.message);
//     } finally { setLoading(false); }
//   };

//   if (fetchLoading) return <div className="p-10 text-center">Loading...</div>;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
//         <button onClick={() => router.push("/admin/sales-quotation-view")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
//           <FaArrowLeft className="text-xs" /> Back
//         </button>

//         <SectionCard icon={FaUser} title="Customer Details" color="indigo">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="sm:col-span-2">
//               <CustomerSearch onSelectCustomer={(c) => setFormData(p => ({ ...p, customer: c._id, customerCode: c.customerCode, customerName: c.customerName, contactPerson: c.contactPersonName }))} />
//             </div>
//             <ReadField label="Customer Name" value={formData.customerName} />
//             <div>
//               <Lbl text="Reference Number" />
//               <input key="ref-input" className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} />
//             </div>
//           </div>
//         </SectionCard>

//         <SectionCard icon={FaCalendarAlt} title="Dates & Status" color="blue">
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             <div>
//               <Lbl text="Posting Date" req />
//               <input className={fi()} type="date" name="postingDate" value={formData.postingDate || ""} onChange={handleInputChange} />
//             </div>
//             <div>
//               <Lbl text="Valid Until" />
//               <input className={fi()} type="date" name="validUntil" value={formData.validUntil || ""} onChange={handleInputChange} />
//             </div>
//             <div>
//               <Lbl text ="Status" />
//               <select className={fi()} name="status" value={formData.status || ""} onChange={handleInputChange}>
//                 <option value="Draft">Draft</option>
//                 <option value="Submitted">Submitted</option>
//                 <option value="Approved">Approved</option>
//                 <option value="Rejected">Rejected</option>
//               </select>
//             </div>  
//           </div>
//         </SectionCard>

//         <div className="bg-white rounded-2xl shadow-sm border mb-5">
//           <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold">Items</div>
//           <div className="p-4 overflow-x-auto">
//             <ItemSection items={formData.items} onItemChange={handleItemChange} onAddItem={() => setFormData(p => ({ ...p, items: [...p.items, { ...initialState.items[0] }] }))} onRemoveItem={(i) => setFormData(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))} computeItemValues={computeItemValues} />
//           </div>
//         </div>

//         <SectionCard icon={FaCalculator} title="Summary" color="amber">
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
//             <ReadField label="Taxable Amount (₹)" value={formData.totalBeforeDiscount} />
//             <ReadField label="GST Total (₹)" value={formData.gstTotal} />
//             <div><Lbl text="Grand Total (₹)" /><div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-extrabold text-indigo-700">₹ {formData.grandTotal}</div></div>
//           </div>
//           <div className="mt-4"><Lbl text="Remarks" /><textarea className={`${fi()} resize-none`} name="remarks" rows={2} value={formData.remarks || ""} onChange={handleInputChange} /></div>
//         </SectionCard>

//         <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
//           <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all">
//             <FaPaperclip className="text-gray-300" />
//             <span className="text-sm font-medium text-gray-400">Click to upload files</span>
//             <input type="file" multiple hidden onChange={(e) => setAttachments([...attachments, ...Array.from(e.target.files)])} onFocus={(e) => e.target.select()} />
//           </label>
//         </SectionCard>

//         <div className="flex items-center justify-between pt-2 pb-8">
//           <button type="button" onClick={() => router.push("/admin/sales-quotation-view")} className="px-4 py-2.5 rounded-xl bg-gray-100 text-sm font-semibold">Cancel</button>
//           <button type="button" onClick={handleSubmit} disabled={loading} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold shadow-sm">
//             {loading ? "Saving..." : editId ? "Update Quotation" : "Create Quotation"}
//           </button>
//         </div>
//       </div>
//       <ToastContainer />
//     </div>
//   );
// }

// export default function SalesQuotationFormWrapper() {
//   return (
//     <Suspense fallback={<div className="p-10 text-center">Loading form…</div>}>
//       <SalesQuotationForm />
//     </Suspense>
//   );
// }


// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { Suspense } from "react";

// import { toast } from "react-toastify";


// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgstRate = parseFloat(item.cgstRate) || gstRate / 2;
//     const sgstRate = parseFloat(item.sgstRate) || gstRate / 2;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = round(cgstAmount + sgstAmount);
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: 0,
//     };
//   }

//   if (item.taxOption === "IGST") {
//     const igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount,
//     };
//   }

//   return {
//     priceAfterDiscount,
//     totalAmount,
//     gstAmount: 0,
//     cgstAmount: 0,
//     sgstAmount: 0,
//     igstAmount: 0,
//   };
// };

// const initialState = {
//   sourceQuotationId: "",
//   customer: "",
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Draft",
//   postingDate: formatDateForInput(new Date()),
//   validUntil: "",
//   documentDate: formatDateForInput(new Date()),
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       orderedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstRate: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstRate: 0,
//       igstAmount: 0,
//       tdsAmount: 0,
//       warehouse: "",
//       warehouseCode: "",
//       warehouseName: "",
//       stockAdded: false,
//       managedBy: "",
//       batches: [],
//       qualityCheckDetails: [],
//       removalReason: "",
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   invoiceType: "Normal",
//   existingFiles: [],
//   removedFiles: []
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return "";
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// function SalesQuotationFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesQuotationForm />
//     </Suspense>
//   );
// }

// function SalesQuotationForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [attachments, setAttachments] = useState([]);
//   const [formData, setFormData] = useState(initialState);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const base = "w-full p-2 border rounded";

//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);

//       const token = localStorage.getItem("token"); // ✅ Auth token
//       if (!token) {
//         setError("Unauthorized: No token found");
//         setLoading(false);
//         return;
//       }

//       axios
//         .get(`/api/sales-quotation/${editId}`, {
//           headers: { Authorization: `Bearer ${token}` }, // ✅ Include token
//         })
//         .then((res) => {
//           if (!res.data.success) {
//             throw new Error(res.data.error || "Failed to load quotation");
//           }

//           const record = res.data.data;
//           console.log("Fetched quotation:", record);

//           if (!Array.isArray(record.items)) {
//             console.warn("Items is not an array, defaulting to empty array:", record.items);
//             record.items = [];
//           }

//           // ✅ Set attachments for edit mode
//           setFormData(prev => ({ ...prev, existingFiles: record.attachments || [] })); // Corrected here

//           // ✅ Update form state
//           setFormData((prev) => ({
//             ...prev,
//             ...record,
//             sourceQuotationId: record._id || "",
//             customer: record.customer?._id || record.customer || "",
//             customerCode: record.customerCode || "",
//             customerName: record.customerName || "",
//             contactPerson: record.contactPerson || "",
//             status: record.status || "Draft",
//             postingDate: formatDateForInput(record.postingDate),
//             validUntil: formatDateForInput(record.validUntil),
//             documentDate: formatDateForInput(record.documentDate),
//             items:
//               record.items.length > 0
//                 ? record.items.map((item) => {
//                     const computed = computeItemValues({
//                       ...item,
//                       quantity: item.quantity || 0,
//                       unitPrice: item.unitPrice || 0,
//                       discount: item.discount || 0,
//                       freight: item.freight || 0,
//                       gstRate: item.gstRate || 0,
//                       taxOption: item.taxOption || "GST",
//                       igstRate: item.igstRate || 0,
//                       tdsAmount: item.tdsAmount || 0,
//                     });
//                     return {
//                       ...initialState.items[0],
//                       ...item,
//                       ...computed,
//                       item: item.item?._id || item.item || "",
//                       itemCode: item.itemCode || "",
//                       itemName: item.itemName || "",
//                       itemDescription: item.itemDescription || "",
//                       quantity: item.quantity || 0,
//                       orderedQuantity: item.orderedQuantity || 0,
//                       unitPrice: item.unitPrice || 0,
//                       discount: item.discount || 0,
//                       freight: item.freight || 0,
//                       gstRate: item.gstRate || 0,
//                       taxOption: item.taxOption || "GST",
//                       igstRate: item.igstRate || 0,
//                       tdsAmount: item.tdsAmount || 0,
//                       warehouse: item.warehouse?._id || item.warehouse || "",
//                       warehouseCode: item.warehouseCode || "",
//                       warehouseName: item.warehouseName || "",
//                       stockAdded: item.stockAdded || false,
//                       managedBy: item.managedBy || "",
//                       batches: item.batches || [],
//                       qualityCheckDetails: item.qualityCheckDetails || [],
//                       removalReason: item.removalReason || "",
//                     };
//                   })
//                 : [{ ...initialState.items[0] }],
//             invoiceType: record.invoiceType || "Normal",
//             salesEmployee: record.salesEmployee || "",
//             remarks: record.remarks || "",
//             freight: record.freight || 0,
//             rounding: record.rounding || 0,
//             totalBeforeDiscount: record.totalBeforeDiscount || 0,
//             totalDownPayment: record.totalDownPayment || 0,
//             appliedAmounts: record.appliedAmounts || 0,
//             gstTotal: record.gstAmount || 0,
//             grandTotal: record.grandTotal || 0,
//             openBalance: record.openBalance || 0,
//           }));
//         })
//         .catch((err) => {
//           console.error("Error fetching quotation:", err);
//           setError("Error loading quotation: " + (err.message || "Unknown error"));
//         })
//         .finally(() => {
//           setLoading(false);
//         });
//     } else if (editId) {
//       setError("Invalid quotation ID");
//     }
//   }, [editId]);


//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     console.log("Selected customer:", selectedCustomer);
//     setFormData((prev) => ({
//       ...prev,
//       customer: selectedCustomer._id || "",
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const numericFields = [
//         "quantity",

//         "unitPrice",
//         "discount",
//         "freight",
//         "gstRate",
//         "igstRate",
//         "tdsAmount",
//       ];
//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//       updatedItems[index] = { ...updatedItems[index], [name]: newValue };

//       const computed = computeItemValues(updatedItems[index]);
//       updatedItems[index] = { ...updatedItems[index], ...computed };
//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [...prev.items, { ...initialState.items[0] }],
//     }));
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   useEffect(() => {
//     const totalBeforeDiscount = round(
//       formData.items.reduce((acc, item) => {
//         const unitPrice = parseFloat(item.unitPrice) || 0;
//         const discount = parseFloat(item.discount) || 0;
//         const quantity = parseFloat(item.quantity) || 0;
//         return acc + (unitPrice - discount) * quantity;
//       }, 0)
//     );

//     const totalItems = round(
//       formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)
//     );

//     const gstTotal = round(
//       formData.items.reduce((acc, item) => {
//         return acc + (parseFloat(item.taxOption === "IGST" ? item.igstAmount : item.gstAmount) || 0);
//       }, 0)
//     );

//     const overallFreight = round(parseFloat(formData.freight) || 0);
//     const rounding = round(parseFloat(formData.rounding) || 0);
//     const totalDownPayment = round(parseFloat(formData.totalDownPayment) || 0);
//     const appliedAmounts = round(parseFloat(formData.appliedAmounts) || 0);

//     const grandTotal = round(totalItems + gstTotal + overallFreight + rounding);
//     const openBalance = round(grandTotal - (totalDownPayment + appliedAmounts));

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance,
//     }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);



//  const handleSubmit = async () => {
//   try {
//     // ✅ Validate customer
//     if (!formData.customerName || !formData.customerCode) {
//       toast.error("Please select a valid customer");
//       return;
//     }

//     // ✅ Validate items (at least one item with itemName)
//     if (formData.items.length === 0 || formData.items.every((item) => !item.itemName)) {
//       toast.error("Please add at least one valid item");
//       return;
//     }

//     // ✅ Validate zero quantity
//     if (formData.items.some((it) => Number(it.quantity) <= 0)) {
//       toast.error("Quantity must be at least 1 for every item.");
//       return;
//     }

//     // ✅ Validate token
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Unauthorized! Please log in.");
//       return;
//     }

//     setLoading(true);

//     // -------------------------
//     // Sanitization: remove empty or invalid warehouses so server won't try to cast ""
//     // -------------------------
//     const sanitizedItems = (formData.items || []).map((it) => {
//       const item = { ...it };

//       // If warehouse is an empty string or falsy, remove the key so Mongoose won't cast it.
//       // (If you prefer null instead, set item.warehouse = null)
//       if (item.warehouse === "" || item.warehouse == null) {
//         delete item.warehouse;
//         // also clear related display fields if you want:
//         delete item.warehouseCode;
//         delete item.warehouseName;
//       } else {
//         // Optional: if warehouse exists but is not a valid ObjectId, remove it too
//         // if (typeof item.warehouse === "string" && !/^[0-9a-fA-F]{24}$/.test(item.warehouse)) {
//         //   delete item.warehouse;
//         // }
//       }

//       return item;
//     });

//     // Prepare payload: override items with sanitized items and keep attachments arrays
//     const payload = {
//       ...formData,
//       items: sanitizedItems,
//       existingFiles: formData.existingFiles || [],
//       removedFiles: formData.removedFiles || [],
//     };

//     // ✅ Prepare FormData
//     const formDataToSend = new FormData();
//     formDataToSend.append("quotationData", JSON.stringify(payload));

//     if (attachments && attachments.length > 0) {
//       attachments.forEach((file) => formDataToSend.append("attachments", file));
//     }

//     // ✅ API Request (POST or PUT)
//     const url = editId ? `/api/sales-quotation/${editId}` : `/api/sales-quotation`;
//     const method = editId ? "put" : "post";

//     const response = await axios[method](url, formDataToSend, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         // don't set Content-Type; browser will add multipart/form-data boundary
//       },
//     });

//     toast.success(response.data.message || "Quotation saved successfully!");

//     setFormData(initialState);
//     setAttachments([]);
//     sessionStorage.removeItem("salesQuotationData");
//     router.push("/admin/sales-quotation-view");
//   } catch (error) {
//     console.error("Error saving quotation:", error);
//     toast.error(
//       `Failed to ${editId ? "update" : "create"} quotation: ${
//         error.response?.data?.error || error.message
//       }`
//     );
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">{editId ? "Edit Sales Quotation" : "Create Sales Quotation"}</h1>
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Customer Name</label>
//             <CustomerSearch
//               onSelectCustomer={handleCustomerSelect}
//               initialCustomer={
//                 editId && formData.customer
//                   ? { _id: formData.customer, customerName: formData.customerName }
//                   : undefined
//               }
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               placeholder="Auto-generated if blank (e.g., SQ-001)"
//             />
//           </div>
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Draft">Draft</option>
//               <option value="Sent">Sent</option>
//               <option value="Accepted">Accepted</option>
//               <option value="Rejected">Rejected</option>
//               <option value="Open">Open</option>
//               <option value="Closed">Closed</option>
//               <option value="Pending">Pending</option>
//               <option value="Cancelled">Cancelled</option>
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
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil || ""}
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
//         </div>
//       </div>
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onRemoveItem={removeItemRow}
//           computeItemValues={computeItemValues}
//         />
//       </div>
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
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="totalBeforeDiscount"
//             value={formData.totalBeforeDiscount || 0}
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
//             value={formData.gstTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Grand Total</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
//       {/* Attachments Section */}
//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>

//         {/* Existing uploaded files */}
//         {formData.existingFiles && formData.existingFiles.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//             {formData.existingFiles.map((file, idx) => {
//               const url =
//                 typeof file === "string"
//                   ? file
//                   : file?.fileUrl || file?.url || file?.path || file?.location || "";
//               const type = file?.fileType || "";
//               const name = file?.fileName || url?.split("/").pop() || `File-${idx}`;
//               if (!url) return null;

//               const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center">
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
//                   <button
//                     onClick={() => {
//                       setFormData(prev => ({ ...prev, existingFiles: prev.existingFiles.filter((_, i) => i !== idx), removedFiles: [...prev.removedFiles, file] }));
//                     }}
//                     className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//                   >
//                     ×
//                   </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* New Uploads */}
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
//             e.target.value = "";
//           }}
//           className="border px-3 py-2 w-full"
//         />

//         {/* Previews of new uploads */}
//         {attachments.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);
//               const isPDF = file.type === "application/pdf";
//               const isImage = file.type.startsWith("image/");

//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center">
//                   {isImage ? (
//                     <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//                   ) : isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                   ) : (
//                     <p className="truncate text-xs">{file.name}</p>
//                   )}
//                   <button
//                     onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
//                     className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//                   >
//                     ×
//                   </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           className={`mt-4 px-4 py-2 rounded ${
//             loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Loading..." : editId ? "Update" : "Submit"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialState);
//             setAttachments([]);
//             setError(null);
//             router.push("/admin/sales-quote-view");
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Reset
//         </button>
//       </div>
//     </div>
//   );
// }

// export default SalesQuotationFormWrapper;