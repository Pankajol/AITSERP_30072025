"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import {
  FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaTimes, FaWarehouse, FaCopy
} from "react-icons/fa";

// ──────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────
const round = (num, d = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(d));
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

const initialState = {
  customer: "", customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  salesEmployee: "", status: "Open",
  deliveryDate: formatDateForInput(new Date()),
  expectedDeliveryDate: "",
  billingAddress: null,
  shippingAddress: null,
  items: [{
    item: "", imageUrl: "", itemCode: "", itemName: "", itemDescription: "",
    quantity: 0, allowedQuantity: 0, receivedQuantity: 0,
    unitPrice: 0, discount: 0, freight: 0,
    gstRate: 0, igstRate: 0, taxOption: "GST",
    priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    warehouse: "", warehouseName: "", warehouseCode: "",
    managedByBatch: true,
    variant: null, selectedVariantId: null,
  }],
  remarks: "", freight: 0, rounding: 0,
  totalDownPayment: 0, appliedAmounts: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0,
  attachments: [],
};

// Helper to get variant image from item
function getVariantImageUrl(item, variantSku) {
  if (!item?.variants || !variantSku) return null;
  const variant = item.variants.find(v => v.sku === variantSku);
  return variant?.imageUrl || null;
}

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
  const isEdit = Boolean(editId);

  const [formData, setFormData] = useState(initialState);
  const [attachments, setAttachments] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);
  const [stockError, setStockError] = useState(null);
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

  // Auth
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      setIsAdmin(roles.includes("admin") || roles.includes("sales manager") || d?.type === "company");
    } catch (e) { console.error(e); }
  }, []);

  // Load from sessionStorage (copy from SalesOrder / other)
  useEffect(() => {
    const stored = sessionStorage.getItem("deliveryData");
    setAttachmentsLoading(true);
    if (!stored) { setAttachmentsLoading(false); return; }
    try {
      const src = JSON.parse(stored);
      const mappedItems = (src.items || []).map(it => {
        let imageUrl = it.imageUrl || it.item?.imageUrl || '';
        if (it.item && it.itemCode && it.itemCode !== it.item?.itemCode && it.item.variants) {
          const variantImg = getVariantImageUrl(it.item, it.itemCode);
          if (variantImg) imageUrl = variantImg;
        }
        if (it.variant?.imageUrl) imageUrl = it.variant.imageUrl;
        return {
          ...initialState.items[0],
          ...it,
          imageUrl,
          item: typeof it.item === 'object' ? it.item._id : it.item,
          warehouse: typeof it.warehouse === 'object' ? it.warehouse._id : it.warehouse,
          warehouseName: it.warehouseName || "",
          warehouseCode: it.warehouseCode || "",
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          discount: it.discount,
          freight: it.freight,
          gstRate: it.gstRate,
          igstRate: it.igstRate,
          taxOption: it.taxOption || "GST",
          variant: it.variant || null,
          selectedVariantId: it.variant?.variantId || null,
        };
      });
         setFormData(prev => ({
      ...prev,
      customer: src.customer?._id || src.customer,
      customerCode: src.customerCode,
      customerName: src.customerName,
      contactPerson: src.contactPerson,
      refNumber: src.refNumber,
      remarks: src.remarks,
      freight: Number(src.freight) || 0,
      salesOrderId: src.salesOrderId || src._id,   // ✅ ADD THIS LINE
      items: mappedItems,
      deliveryDate: formatDateForInput(new Date()),
    }));
      if (src.customerCode && src.customerName) {
        setSelectedCustomer({ _id: src.customer, customerCode: src.customerCode, customerName: src.customerName });
      }
      if (src.attachments && src.attachments.length) {
        setExistingFiles(src.attachments.map(f => ({ fileUrl: f.fileUrl, fileName: f.fileName })));
      }
      setIsCopied(true);
    } catch (err) { console.error(err); }
    finally { sessionStorage.removeItem("deliveryData"); setAttachmentsLoading(false); }
  }, []);

  // Load existing for edit
  useEffect(() => {
    if (isEdit && editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      const token = localStorage.getItem("token");
      axios.get(`/api/delivery?id=${editId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const record = res.data.data;
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
              item: it.item?._id || it.item,
              warehouse: it.warehouse?._id || it.warehouse,
            };
          });
          setFormData({
            ...initialState,
            ...record,
            deliveryDate: formatDateForInput(record.deliveryDate),
            expectedDeliveryDate: formatDateForInput(record.expectedDeliveryDate),
            items: enhancedItems,
          });
          if (record.customerCode || record.customerName) {
            setSelectedCustomer({
              _id: record.customer,
              customerCode: record.customerCode,
              customerName: record.customerName,
              contactPersonName: record.contactPerson
            });
          }
          if (!isCopied) {
            setExistingFiles((record.attachments || []).map(f => ({ fileUrl: f.fileUrl, fileName: f.fileName })));
          }
        })
        .catch(err => setError(err.message || "Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [isEdit, editId, isCopied]);

  // Recalculate totals
  useEffect(() => {
    const totalBeforeDiscount = formData.items.reduce(
      (sum, it) => sum + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0
    );
    const gstTotal = formData.items.reduce((sum, it) => sum + (it.gstAmount || 0), 0);
    const freight = Number(formData.freight) || 0;
    const rounding = Number(formData.rounding) || 0;
    const grandTotal = totalBeforeDiscount + gstTotal + freight + rounding;
    const openBalance = grandTotal - (Number(formData.totalDownPayment) + Number(formData.appliedAmounts));
    setFormData(prev => ({ ...prev, totalBeforeDiscount, gstTotal, grandTotal, openBalance }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Handle item changes (supports both events and direct object updates)
  const handleItemChange = (index, update) => {
    setFormData(prev => {
      const items = [...prev.items];
      let updatedItem = { ...items[index] };
      if (update && typeof update === "object") {
        if (update.target) {
          const { name, value } = update.target;
          const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"];
          const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
          updatedItem[name] = newValue;
        } else {
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
      if (!item.item) { toast.error(`Item missing in row ${i + 1}`); return false; }
      if (!item.warehouse) { toast.error(`Warehouse missing in row ${i + 1}`); return false; }
      if (Number(item.quantity) <= 0) { toast.error(`Quantity must be > 0 in row ${i + 1}`); return false; }
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
    setSubmitting(true);
    setStockError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Not authenticated"); setSubmitting(false); return; }
      const fd = new FormData();
      const payload = {
        ...formData,
        deliveryDate: formData.deliveryDate,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        existingFiles,
        removedFiles,
        items: formData.items.map(it => ({
          ...it,
          item: typeof it.item === "object" ? it.item._id : it.item,
          warehouse: typeof it.warehouse === "object" ? it.warehouse._id : it.warehouse,
          variant: it.variant || null,
        })),
      };
      fd.append("deliveryData", JSON.stringify(payload));
      attachments.forEach(file => fd.append("attachments", file));

      const url = isEdit ? `/api/delivery?id=${editId}` : "/api/delivery";
      const method = isEdit ? "put" : "post";
      const res = await axios({ method, url, data: fd, headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      if (res.data.success) {
        toast.success(isEdit ? "Delivery Updated" : "Delivery Created");
        router.push("/admin/delivery-view");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
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
        const url = URL.createObjectURL(file);
        return (
          <div key={idx} className="relative border rounded p-2 text-center bg-slate-100">
            {file.type === "application/pdf"
              ? <object data={url} type="application/pdf" className="h-24 w-full pointer-events-none" />
              : <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />}
            <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">×</button>
          </div>
        );
      })}
    </div>
  );

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Delivery Data...</div>;
  if (error) return <div className="p-10 text-red-500 text-center">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/delivery-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Deliveries
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Edit Delivery" : "New Delivery"}</h1>

        {stockError && (
          <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 shadow-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Customer Name" req />
              {(isEdit || isCopied) ? (
                <input className={fi(true)} name="customerName" value={formData.customerName || ""} onChange={handleInputChange} readOnly />
              ) : isNewCustomer ? (
                <div className="space-y-2">
                  <input className={fi()} name="customerName" value={formData.customerName || ""} onChange={handleInputChange} placeholder="Enter new customer" />
                  <button type="button" onClick={() => setIsNewCustomer(false)} className="text-[10px] font-bold text-gray-400 uppercase">⬅ Back to search</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <CustomerSearch onSelectCustomer={(c) => {
                    setSelectedCustomer(c);
                    setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }));
                  }} />
                  <button type="button" onClick={() => setIsNewCustomer(true)} className="text-[10px] font-bold text-indigo-600 uppercase">+ Add new customer</button>
                </div>
              )}
            </div>
            <ReadField label="Customer Code" value={formData.customerCode} />
            <ReadField label="Contact Person" value={formData.contactPerson} />
            <div>
              <Lbl text="Reference No." />
              <input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} placeholder="e.g. DEL-12345" />
            </div>
          </div>
        </SectionCard>

        {/* Address Selection */}
        <div className="mb-5">
          <CustomerAddressSelector
            customer={selectedCustomer}
            selectedBillingAddress={formData.billingAddress}
            selectedShippingAddress={formData.shippingAddress}
            onBillingAddressSelect={(a) => setFormData(p => ({ ...p, billingAddress: a }))}
            onShippingAddressSelect={(a) => setFormData(p => ({ ...p, shippingAddress: a }))}
          />
        </div>

        {/* Warehouse Quick Action */}
        {warehouses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50/40">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500"><FaWarehouse className="text-sm" /></div>
              <div><p className="text-sm font-bold text-gray-900">Warehouse Assignment</p><p className="text-xs text-gray-400">Set a warehouse and apply to all items</p></div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white" value={selectedGlobalWarehouse} onChange={e => setSelectedGlobalWarehouse(e.target.value)}>
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map(wh => <option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>)}
                </select>
                <button onClick={() => applyWarehouseToAll(selectedGlobalWarehouse)} disabled={!selectedGlobalWarehouse}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  <FaCopy className="text-xs" /> Apply to All Items
                </button>
                {defaultWarehouse && (
                  <button onClick={applyDefaultWarehouseToAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                    <FaCopy className="text-xs" /> Apply Default to All
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">This will overwrite the warehouse for <strong>all existing items</strong>. New rows will inherit the selected warehouse.</p>
            </div>
          </div>
        )}

        {/* Dates & Status */}
        <SectionCard icon={FaCalendarAlt} title="Dates & Status" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Delivery Date" req />
              <input type="date" className={fi()} name="deliveryDate" value={formData.deliveryDate} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Expected Delivery Date" />
              <input type="date" className={fi()} name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Status" />
              <select className={fi()} name="status" value={formData.status} onChange={handleInputChange}>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Items Section */}
        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center gap-2">
            <FaBoxOpen className="text-emerald-500" /> Line Items
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadField label="Taxable Amount" value={`₹ ${formData.totalBeforeDiscount.toFixed(2)}`} />
            <ReadField label="GST Total" value={`₹ ${formData.gstTotal.toFixed(2)}`} />
            <div>
              <Lbl text="Freight" />
              <input type="number" name="freight" value={formData.freight} onChange={handleInputChange} className={fi()} />
            </div>
            <div>
              <Lbl text="Rounding" />
              <input type="number" name="rounding" value={formData.rounding} onChange={handleInputChange} className={fi()} />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
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
                    <object data={file.fileUrl} type="application/pdf" className="h-full w-full pointer-events-none" />
                  ) : (
                    <img src={file.fileUrl} className="h-full object-cover" alt="attachment" />
                  )}
                </div>
                {!isReadOnly && (
                  <button onClick={() => removeExistingFile(file, idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg hover:bg-red-600 transition-all">
                    <FaTimes />
                  </button>
                )}
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all group">
            <FaPaperclip className="text-gray-300 group-hover:text-indigo-400" />
            <span className="text-sm font-medium text-gray-400">Upload files (PDF, images)</span>
            <input type="file" multiple accept="image/*,application/pdf" hidden onChange={handleFileSelect} />
          </label>
          {attachments.length > 0 && renderNewFilesPreview()}
        </SectionCard>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/delivery-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all ${submitting ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {submitting ? "Saving..." : isEdit ? "Update Delivery" : "Create Delivery"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper read‑only field component
function ReadField({ label, value }) {
  return (
    <div>
      <Lbl text={label} />
      <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
        {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
      </div>
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