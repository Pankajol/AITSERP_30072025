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
  FaArrowLeft, FaUser, FaCalendarAlt,
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
  salesEmployee: "", status: "Open",
  orderDate: formatDateForInput(new Date()),
  expectedDeliveryDate: "",
  billingAddress: null,
  shippingAddress: null,
  items: [{
    item: "", imageUrl: "", itemCode: "", itemName: "", itemDescription: "",
    quantity: 0, unitPrice: 0, discount: 0, freight: 0,
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

export default function SalesOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Order Form...</div>}>
      <SalesOrderForm />
    </Suspense>
  );
}

function SalesOrderForm() {
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
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedGlobalWarehouse, setSelectedGlobalWarehouse] = useState("");
  const [defaultWarehouse, setDefaultWarehouse] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

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

  // Auth & Roles
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      const admin = roles.includes("admin") || roles.includes("sales manager") || d?.type === "company";
      setIsAdmin(admin);
    } catch (e) { console.error(e); }
  }, []);

  // Load from sessionStorage when not editing
  useEffect(() => {
    if (!isEdit) {
      const stored = sessionStorage.getItem("salesOrderData");
      if (stored) {
        try {
          const src = JSON.parse(stored);
          // Map items with proper imageUrl from variants
          const mappedItems = (src.items || []).map(it => {
            let imageUrl = it.imageUrl || it.item?.imageUrl || '';
            if (it.item && it.itemCode && it.itemCode !== it.item?.itemCode && it.item.variants) {
              const variantImg = getVariantImageUrl(it.item, it.itemCode);
              if (variantImg) imageUrl = variantImg;
            }
            if (it.variant?.imageUrl) imageUrl = it.variant.imageUrl;
            if (it.variant?.variantImageUrl) imageUrl = it.variant.variantImageUrl;
            return {
              ...initialState.items[0],
              ...it,
              imageUrl,
              item: typeof it.item === 'object' ? it.item._id : it.item,
              warehouse: typeof it.warehouse === 'object' ? it.warehouse._id : it.warehouse,
              warehouseName: it.warehouseName || it.warehouse?.warehouseName || "",
              warehouseCode: it.warehouseCode || it.warehouse?.warehouseCode || "",
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              discount: it.discount,
              gstRate: it.gstRate,
              taxOption: it.taxOption || "GST",
              igstRate: it.igstRate,
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
            items: mappedItems,
          }));
          if (src.customerCode && src.customerName) {
            setSelectedCustomer({ _id: src.customer, customerCode: src.customerCode, customerName: src.customerName });
          }
          setExistingFiles(src.attachments || []);
          sessionStorage.removeItem("salesOrderData");
          toast.success("Quotation data loaded. Adjust as needed.");
        } catch (e) {
          console.error("Failed to parse session data", e);
        }
      }
    }
  }, [isEdit]);

  // Fetch for Edit
  useEffect(() => {
    if (!isEdit || !editId || !/^[0-9a-fA-F]{24}$/.test(editId)) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    axios.get(`/api/sales-order?id=${editId}`, { headers: { Authorization: `Bearer ${token}` } })
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
          orderDate: formatDateForInput(record.orderDate),
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
        setExistingFiles((record.attachments || []).map(f => ({
          fileUrl: f.fileUrl,
          fileName: f.fileName,
          publicId: f.publicId
        })));
        if (!isAdmin && record.status === "Closed") setIsReadOnly(true);
      })
      .catch(err => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [isEdit, editId, isAdmin]);

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
    if (!formData.orderDate) {
      toast.error("Order date is required.");
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
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      const payload = {
        ...formData,
        orderDate: formData.orderDate,
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
      fd.append("orderData", JSON.stringify(payload));
      attachments.forEach(file => fd.append("attachments", file));

      const url = isEdit ? `/api/sales-order?id=${editId}` : "/api/sales-order";
      const method = isEdit ? "put" : "post";
      await axios({ method, url, data: fd, headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      toast.success(isEdit ? "Order updated" : "Order created");
      router.push("/admin/sales-order-view");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error saving order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Loading Order...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/sales-order-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
          <FaArrowLeft className="text-xs" /> Back to List
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Edit Sales Order" : "New Sales Order"}</h1>

        {/* Customer Section */}
        <SectionCard icon={FaUser} title="Customer Details" color="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Customer Name" req />
              <CustomerSearch
                onSelectCustomer={(c) => {
                  setSelectedCustomer(c);
                  setFormData(p => ({
                    ...p,
                    customer: c._id,
                    customerName: c.customerName,
                    customerCode: c.customerCode,
                    contactPerson: c.contactPersonName,
                  }));
                }}
                initialCustomer={selectedCustomer ? { _id: selectedCustomer._id, customerName: selectedCustomer.customerName } : undefined}
              />
            </div>
            <ReadField label="Customer Name" value={formData.customerName} />
            <ReadField label="Customer Code" value={formData.customerCode} />
            <ReadField label="Contact Person" value={formData.contactPerson} />
            <div>
              <Lbl text="Reference No." />
              <input className={fi(isReadOnly)} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} placeholder="REF-001" readOnly={isReadOnly} />
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

        {/* Scheduling Section */}
        <SectionCard icon={FaCalendarAlt} title="Order Scheduling" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Order Date" req />
              <input type="date" className={fi(isReadOnly)} name="orderDate" value={formData.orderDate} onChange={handleInputChange} readOnly={isReadOnly} />
            </div>
            <div>
              <Lbl text="Expected Delivery Date" />
              <input type="date" className={fi(isReadOnly)} name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleInputChange} readOnly={isReadOnly} />
            </div>
            <div>
              <Lbl text="Status" />
              <select className={fi(isReadOnly)} name="status" value={formData.status} onChange={handleInputChange} disabled={isReadOnly}>
                <option value="Open">Open</option>
                <option value="Pending">Pending</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
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

        {/* Line Items Section */}
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

        {/* Financial Summary Section */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadField label="Taxable Amount" value={`₹ ${formData.totalBeforeDiscount.toFixed(2)}`} />
            <ReadField label="GST Total" value={`₹ ${formData.gstTotal.toFixed(2)}`} />
            <div>
              <Lbl text="Freight" />
              <input type="number" name="freight" value={formData.freight} onChange={handleInputChange} className={fi(isReadOnly)} readOnly={isReadOnly} />
            </div>
            <div>
              <Lbl text="Rounding" />
              <input type="number" name="rounding" value={formData.rounding} onChange={handleInputChange} className={fi(isReadOnly)} readOnly={isReadOnly} />
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
            <textarea className={`${fi(isReadOnly)} resize-none`} name="remarks" rows={2} value={formData.remarks || ""} onChange={handleInputChange} readOnly={isReadOnly} />
          </div>
        </SectionCard>

        {/* Attachments Section */}
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
                  <button
                    onClick={() => removeExistingFile(file, idx)}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg"
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            ))}
          </div>
          {!isReadOnly && (
            <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all group">
              <FaPaperclip className="text-gray-300 group-hover:text-indigo-400" />
              <span className="text-sm font-medium text-gray-400">Upload files (PDF, images)</span>
              <input
                type="file"
                multiple
                accept="image/*,application/pdf"
                hidden
                onChange={handleFileSelect}
              />
            </label>
          )}
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {attachments.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={idx} className="relative border rounded-xl p-2 bg-gray-50">
                    <div className="h-20 flex items-center justify-center overflow-hidden">
                      {file.type === "application/pdf" ? (
                        <object data={url} type="application/pdf" className="h-full w-full pointer-events-none" />
                      ) : (
                        <img src={url} className="h-full object-cover" alt={file.name} />
                      )}
                    </div>
                    <button
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg"
                    >
                      <FaTimes />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/sales-order-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting || isReadOnly} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${submitting || isReadOnly ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {submitting ? "Saving..." : isEdit ? "Update Order" : "Create Order"}
          </button>
        </div>
      </div>
    </div>
  );
}




// "use client";

// import { useState, useEffect, Suspense, useMemo } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import CustomerAddressSelector from "@/components/CustomerAddressSelector";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { jwtDecode } from "jwt-decode";
// import {
//   FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
//   FaBoxOpen, FaCalculator, FaPaperclip, FaTimes
// } from "react-icons/fa";

// // ============================================================
// // HELPERS & SUB-COMPONENTS
// // ============================================================
// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   return isNaN(d.getTime()) ? "" : d.toISOString().split('T')[0];
// }

// const initialState = {
//   customerCode: "", customerName: "", contactPerson: "", refNumber: "",
//   salesEmployee: "", status: "Open",
//   orderDate: formatDateForInput(new Date()), expectedDeliveryDate: "",
//   billingAddress: null, shippingAddress: null,
//   items: [{
//     item: "", itemCode: "", itemId: "", itemName: "", itemDescription: "",
//     quantity: 0, unitPrice: 0, discount: 0, freight: 0, uom: "",
//     taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
//     gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
//     warehouse: "", warehouseName: "", warehouseCode: "", warehouseId: "",
//     managedByBatch: true,
//   }],
//   remarks: "", freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
//   totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0,
//   attachments: [],
// };

// const round = (num, d = 2) => { const n = Number(num); return isNaN(n) ? 0 : Number(n.toFixed(d)); };

// function formatDate(d) {
//   if (!d) return "";
//   const date = new Date(d);
//   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// }

// const computeItemValues = (item) => {
//   const qty = parseFloat(item.quantity) || 0;
//   const price = parseFloat(item.unitPrice) || 0;
//   const disc = parseFloat(item.discount) || 0;
//   const fr = parseFloat(item.freight) || 0;
//   const pad = round(price - disc);
//   const total = round(qty * pad + fr);
//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgst = round(total * (gstRate / 200));
//     return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst * 2, cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0 };
//   }
//   const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
//   return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
// };

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

// // ============================================================
// // MAIN PAGE COMPONENT
// // ============================================================

// export default function SalesOrderPage() {
//   return (
//     <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Order Form...</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// function SalesOrderForm() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const editId = params.get("editId");

//   const [formData, setFormData]           = useState(initialState);
//   const [attachments, setAttachments]     = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [removedFiles, setRemovedFiles]   = useState([]);
//   const [loading, setLoading]             = useState(false);
//   const [submitting, setSubmitting]       = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   const [isAdmin, setIsAdmin]             = useState(false);
//   const [isCopied, setIsCopied]           = useState(false);
//   const [isNewCustomer, setIsNewCustomer] = useState(false);

//   const stableInitial = useMemo(() => initialState, []);
//   const isReadOnly = !!editId && !isAdmin && formData.status === "Closed";

//   // Auth & Roles
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     try {
//       const d = jwtDecode(token);
//       const roles = Array.isArray(d?.roles) ? d.roles : [];
//       setIsAdmin(roles.includes("admin") || roles.includes("sales manager") || d?.type === "company");
//     } catch (e) { console.error(e); }
//   }, []);

//   // Fetch for Edit
//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       axios.get(`/api/sales-order/${editId}`, { headers: { Authorization: `Bearer ${token}` } })
//         .then(res => {
//           const record = res.data.data;
//           const items = Array.isArray(record.items)
//             ? record.items.map(i => ({ ...stableInitial.items[0], ...i, item: i.item?._id || i.item || "", warehouse: i.warehouse?._id || i.warehouse || "", taxOption: i.taxOption || "GST" }))
//             : [...stableInitial.items];
          
//           setFormData({ ...stableInitial, ...record, items, orderDate: formatDate(record.orderDate), expectedDeliveryDate: formatDate(record.expectedDeliveryDate) });
          
//           if (record.customerCode || record.customerName) {
//             setSelectedCustomer({ _id: record.customer, customerCode: record.customerCode, customerName: record.customerName, contactPersonName: record.contactPerson });
//           }
//           setExistingFiles((record.attachments || []).map(f => ({ fileUrl: f.fileUrl || f.url, fileName: f.fileName || "Attachment" })));
//         })
//         .catch(err => toast.error("Failed to load data"))
//         .finally(() => setLoading(false));
//     }
//   }, [editId, stableInitial]);

//   // Financial Calculations
//   useEffect(() => {
//     const items = Array.isArray(formData.items) ? formData.items : [];
//     const totalBeforeDiscount = items.reduce((s, i) => s + (Number(i.unitPrice) * Number(i.quantity) - Number(i.discount)), 0);
//     const gstTotal = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
//     const grandTotal = totalBeforeDiscount + gstTotal + Number(formData.freight) + Number(formData.rounding);
//     const openBalance = grandTotal - (Number(formData.totalDownPayment) + Number(formData.appliedAmounts));
    
//     setFormData(prev => {
//         if (prev.grandTotal === round(grandTotal) && prev.totalBeforeDiscount === round(totalBeforeDiscount)) return prev;
//         return { ...prev, totalBeforeDiscount: round(totalBeforeDiscount), gstTotal: round(gstTotal), grandTotal: round(grandTotal), openBalance: round(openBalance) };
//     });
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const validateForm = () => {
//     if (!formData.customerName || !formData.customerCode) {
//       toast.error("Please select a valid customer.");
//       return false;
//     }
//     if (!formData.orderDate) {
//       toast.error("Order date is required.");
//       return false;
//     }
//     if (formData.items.length === 0) {
//       toast.error("At least one item is required.");
//       return false;
//     }
//     for (let i = 0; i < formData.items.length; i++) {
//       const item = formData.items[i];
//       if (!item.item) { toast.error(`Item missing in row ${i + 1}`); return false; }
//       if (!item.warehouse) { toast.error(`Warehouse missing in row ${i + 1}`); return false; }
//       if (Number(item.quantity) <= 0) { toast.error(`Quantity must be > 0 in row ${i + 1}`); return false; }
//     }
//     return true;
//   };

//   const handleItemChange = (index, e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const items = [...prev.items];
//       items[index] = { ...items[index], [name]: value, ...computeItemValues({ ...items[index], [name]: value }) };
//       return { ...prev, items };
//     });
//   };

//   const addItemRow = () => setFormData(p => ({ ...p, items: [...p.items, { ...stableInitial.items[0] }] }));
//   const removeItemRow = (i) => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));

//   const handleSubmit = async () => {
//     if (!validateForm()) return;
//     setSubmitting(true);
//     try {
//       const token = localStorage.getItem("token");
//       const normalizedItems = formData.items.map(i => ({
//         ...i,
//         item: typeof i.item === "object" ? i.item._id : i.item,
//         warehouse: typeof i.warehouse === "object" ? i.warehouse._id : i.warehouse,
//       }));
//       const fd = new FormData();
//       fd.append("orderData", JSON.stringify({ ...formData, items: normalizedItems, removedFiles }));
//       attachments.forEach(file => fd.append("newFiles", file));
      
//       const config = { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } };
//       const res = editId
//         ? await axios.put(`/api/sales-order/${editId}`, fd, config)
//         : await axios.post("/api/sales-order", fd, config);

//       if (res.data.success) {
//         toast.success(editId ? "Updated" : "Created");
//         router.push("/admin/sales-order-view");
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Error saving order");
//     } finally { setSubmitting(false); }
//   };

//   const renderNewFilesPreview = () => attachments.length > 0 && (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//       {attachments.map((file, idx) => {
//         if (!(file instanceof File)) return null;
//         const url = URL.createObjectURL(file);
//         return (
//           <div key={idx} className="relative border rounded p-2 text-center bg-slate-100">
//             {file.type === "application/pdf"
//               ? <div className="h-24 flex items-center justify-center text-[10px] font-bold text-gray-500">PDF File</div>
//               : <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />}
//             <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs">×</button>
//           </div>
//         );
//       })}
//     </div>
//   );

//   if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Loading Order...</div>;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

//         <button onClick={() => router.push("/admin/sales-order-view")}
//           className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
//           <FaArrowLeft className="text-xs" /> Back to List
//         </button>

//         <div className="mb-6">
//           <h1 className="text-2xl font-extrabold text-gray-900">{editId ? "Edit Sales Order" : "New Sales Order"}</h1>
//         </div>

//         {/* Customer Section */}
//         <SectionCard icon={FaUser} title="Customer Details" color="indigo">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <Lbl text="Customer Name" req />
//               {(editId || isCopied) ? (
//                 <input className={fi(isReadOnly)} name="customerName" value={formData.customerName || ""} onChange={handleChange} readOnly={isReadOnly} />
//               ) : isNewCustomer ? (
//                 <div className="space-y-2">
//                   <input className={fi()} name="customerName" value={formData.customerName || ""} onChange={handleChange} placeholder="Enter Name" />
//                   <button type="button" onClick={() => setIsNewCustomer(false)} className="text-[10px] font-bold text-gray-400 uppercase">⬅ Search existing</button>
//                 </div>
//               ) : (
//                 <div className="space-y-2">
//                   <CustomerSearch onSelectCustomer={(c) => {
//                     setSelectedCustomer(c);
//                     setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }));
//                   }} />
//                   <button type="button" onClick={() => setIsNewCustomer(true)} className="text-[10px] font-bold text-indigo-600 uppercase">+ Add new</button>
//                 </div>
//               )}
//             </div>
//             <div><Lbl text="Customer Code" /><input className={fi(true)} value={formData.customerCode} readOnly /></div>
//             <div><Lbl text="Contact Person" /><input className={fi(true)} value={formData.contactPerson} readOnly /></div>
//             <div><Lbl text="Reference No." /><input className={fi(isReadOnly)} name="refNumber" value={formData.refNumber || ""} onChange={handleChange} placeholder="REF-001" readOnly={isReadOnly} /></div>
//           </div>
//         </SectionCard>

//         {/* Address Selection */}
//         <div className="mb-5">
//           <CustomerAddressSelector
//             customer={selectedCustomer}
//             selectedBillingAddress={formData.billingAddress}
//             selectedShippingAddress={formData.shippingAddress}
//             onBillingAddressSelect={(a) => setFormData(p => ({ ...p, billingAddress: a }))}
//             onShippingAddressSelect={(a) => setFormData(p => ({ ...p, shippingAddress: a }))}
//           />
//         </div>

//         {/* Scheduling Section */}
//         <SectionCard icon={FaCalendarAlt} title="Order Scheduling" color="blue">
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div><Lbl text="Order Date" req /><input type="date" className={fi(isReadOnly)} name="orderDate" value={formData.orderDate || ""} onChange={handleChange} readOnly={isReadOnly} /></div>
//             <div><Lbl text="Delivery Date" /><input type="date" className={fi(isReadOnly)} name="expectedDeliveryDate" value={formData.expectedDeliveryDate || ""} onChange={handleChange} readOnly={isReadOnly} /></div>
//             <div>
//               <Lbl text="Status" />
//               <select className={fi(isReadOnly)} name="status" value={formData.status} onChange={handleChange} disabled={isReadOnly}>
//                 <option>Open</option><option>Pending</option><option>Closed</option><option>Cancelled</option>
//               </select>
//             </div>
//           </div>
//         </SectionCard>

//         {/* Line Items Section */}
//         <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
//           <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold">Line Items</div>
//           <div className="p-4 overflow-x-auto">
//             <ItemSection items={formData.items} onItemChange={handleItemChange} onAddItem={addItemRow} onRemoveItem={removeItemRow} computeItemValues={computeItemValues} readOnly={isReadOnly} />
//           </div>
//         </div>

//         {/* Financial Summary Section */}
//         <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             <div><Lbl text="Subtotal" /><input readOnly value={formData.totalBeforeDiscount} className={fi(true)} onFocus={(e) => e.target.select()} /></div>
//             <div><Lbl text="GST Total" /><input readOnly value={formData.gstTotal} className={fi(true)} onFocus={(e) => e.target.select()} /></div>
//             <div><Lbl text="Freight" /><input type="number" name="freight" value={formData.freight} onChange={handleChange} className={fi(isReadOnly)} readOnly={isReadOnly} onFocus={(e) => e.target.select()} /></div>
//             <div><Lbl text="Rounding" /><input type="number" name="rounding" value={formData.rounding} onChange={handleChange} className={fi(isReadOnly)} readOnly={isReadOnly} onFocus={(e) => e.target.select()} /></div>
//             <div>
//               <Lbl text="Grand Total" />
//               <div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-extrabold">₹ {formData.grandTotal}</div>
//             </div>
//             <div><Lbl text="Open Balance" /><input readOnly value={formData.openBalance} className={fi(true)} onFocus={(e) => e.target.select()} /></div>
//           </div>
//           <div className="mt-4">
//             <Lbl text="Remarks" />
//             <textarea name="remarks" value={formData.remarks || ""} onChange={handleChange} rows={2} className={`${fi(isReadOnly)} resize-none`} readOnly={isReadOnly} />
//           </div>
//         </SectionCard>

//         {/* Attachments Section */}
//         <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
//           <div className="mb-4">
//             {existingFiles.length > 0 && (
//               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//                 {existingFiles.map((file, idx) => (
//                   <div key={idx} className="relative group border rounded-xl p-2 bg-gray-50">
//                     <div className="h-20 flex items-center justify-center overflow-hidden rounded-lg">
//                       {file.fileUrl?.toLowerCase().endsWith(".pdf")
//                         ? <div className="text-[10px] font-bold">PDF</div>
//                         : <img src={file.fileUrl} alt={file.fileName} className="h-full object-cover" />}
//                     </div>
//                     {!isReadOnly && (
//                       <button onClick={() => { setExistingFiles(prev => prev.filter((_, i) => i !== idx)); setRemovedFiles(prev => [...prev, file]); }}
//                         className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
//                         <FaTimes />
//                       </button>
//                     )}
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>
//           {!isReadOnly && (
//             <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all">
//               <FaPaperclip className="text-gray-300" />
//               <span className="text-sm font-medium text-gray-400">Click to upload new files</span>
//               <input type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => {
//                 const files = Array.from(e.target.files);
//                 setAttachments(prev => [...prev, ...files]);
//                 e.target.value = "";
//               }} />
//             </label>
//           )}
//           {renderNewFilesPreview()}
//         </SectionCard>

//         {/* Footer Actions */}
//         <div className="flex items-center justify-between pt-4 pb-10">
//           <button onClick={() => router.push("/admin/sales-order-view")} className="px-6 py-2.5 rounded-xl bg-white border font-bold text-sm">Cancel</button>
//           <button onClick={handleSubmit} disabled={submitting || isReadOnly} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm ${submitting || isReadOnly ? "bg-gray-300" : "bg-indigo-600 shadow-lg"}`}>
//             {submitting ? "Processing..." : editId ? "Update Order" : "Create Order"}
//           </button>
//         </div>
//       </div>
//       <ToastContainer />
//     </div>
//   );
// }
