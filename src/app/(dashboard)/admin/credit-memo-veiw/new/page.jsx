"use client";

import { useState, useEffect, Suspense, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import {
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, FaCalculator,
  FaPaperclip, FaTimes, FaWarehouse, FaCopy, FaMoneyBillWave
} from "react-icons/fa";

// --------------------------------------------------------------
// Helpers
// --------------------------------------------------------------
const round = (num, d = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(d));
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
    green: "bg-green-50/40 border-green-100",
  };
  const iconColorMap = {
    indigo: "bg-indigo-100 text-indigo-500",
    blue: "bg-blue-100 text-blue-500",
    emerald: "bg-emerald-100 text-emerald-500",
    amber: "bg-amber-100 text-amber-500",
    gray: "bg-gray-100 text-gray-500",
    green: "bg-green-100 text-green-500",
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

// --------------------------------------------------------------
// Batch Modal (unchanged)
// --------------------------------------------------------------
const generateUniqueId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const ArrayOf = (arr) => (Array.isArray(arr) ? arr : []);

function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
  const currentBatches = ArrayOf(batches);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-2">Batch Details for {itemCode || "Selected Item"} - {itemName || "N/A"}</h2>
        <p className="mb-4 text-sm text-gray-600">Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : "0.00"}</p>
        {currentBatches.length > 0 ? (
          <table className="w-full table-auto border-collapse mb-4">
            <thead className="bg-gray-200">
              <tr><th className="border p-2 text-left text-sm">Batch No.</th><th className="border p-2 text-left text-sm">Expiry</th><th className="border p-2 text-left text-sm">Mfg.</th><th className="border p-2 text-left text-sm">Qty</th><th className="border p-2 text-left text-sm">Action</th></tr>
            </thead>
            <tbody>
              {currentBatches.map((batch, idx) => (
                <tr key={batch.id}>
                  <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td>
                  <td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td>
                  <td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td>
                  <td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td>
                  <td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, "remove", null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="mb-4 text-gray-500">No batch entries yet.</p>}
        <button type="button" onClick={onAddBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600">Add Batch Entry</button>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Done</button></div>
      </div>
    </div>
  );
}

// --------------------------------------------------------------
// Initial State – with variant fields
// --------------------------------------------------------------
const initialCreditMemoState = {
  customer: "", customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  status: "Draft", postingDate: formatDateForInput(new Date()), validUntil: "", documentDate: formatDateForInput(new Date()),
  salesInvoiceId: "", reasonForReturn: "", salesEmployee: "", remarks: "", freight: 0, rounding: 0,
  items: [{
    item: "", imageUrl: "", itemCode: "", itemName: "", itemDescription: "", quantity: 0, allowedQuantity: 0, creditedQuantity: 0,
    unitPrice: 0, discount: 0, freight: 0, gstRate: 0, igstRate: 0, taxOption: "GST",
    priceAfterDiscount: 0, totalAmount: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    managedBy: "none", batches: [], warehouse: "", warehouseName: "", warehouseCode: "", stockImpact: true,
    variant: null,          // ✅ store selected variant object
    selectedVariantId: null, // ✅ store variant ID
    variants: [],           // ✅ list of available variants for the selected item
  }],
  attachments: [],
};

// --------------------------------------------------------------
// Main Component
// --------------------------------------------------------------
export default function CreditMemoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Credit Memo Form...</div>}>
      <CreditMemoForm />
    </Suspense>
  );
}

function CreditMemoForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("editId");
  const isEdit = Boolean(editId);

  const [formData, setFormData] = useState(initialCreditMemoState);
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

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);

  // ------------------------------------------------------------
  // Fetch warehouses
  // ------------------------------------------------------------
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

  // Compute item financials
  const computeItemValues = useCallback((item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unitPrice) || 0;
    const disc = Number(item.discount) || 0;
    const fr = Number(item.freight) || 0;
    const priceAfterDiscount = round(price - disc);
    const total = round(qty * priceAfterDiscount + fr);
    if (item.taxOption === "GST") {
      const gstRate = Number(item.gstRate) || 0;
      const cgst = round(total * (gstRate / 200));
      return { priceAfterDiscount, totalAmount: total, gstAmount: cgst * 2, cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0 };
    }
    const igst = round(total * ((Number(item.igstRate) || Number(item.gstRate) || 0) / 100));
    return { priceAfterDiscount, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
  }, []);

  // ──────────────────────────────────────────────────────────────
  // Fetch item details (including variants) when item is selected
  // ──────────────────────────────────────────────────────────────
  const fetchItemDetails = async (itemId, index) => {
    if (!itemId) return;
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`/api/items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const itemData = res.data.data;
        const variants = itemData.variants || [];
        // Set default values from the item (non-variant)
        setFormData(prev => {
          const items = [...prev.items];
          items[index] = {
            ...items[index],
            itemName: itemData.name,
            itemCode: itemData.code,
            itemDescription: itemData.description || "",
            unitPrice: itemData.sellingPrice || itemData.price || 0,
            gstRate: itemData.gstRate || 0,
            igstRate: itemData.igstRate || 0,
            taxOption: itemData.taxOption || "GST",
            managedBy: itemData.managedBy || "none",
            variants: variants,
            variant: null,
            selectedVariantId: null,
            imageUrl: itemData.imageUrl || "",
          };
          const computed = computeItemValues(items[index]);
          items[index] = { ...items[index], ...computed };
          return { ...prev, items };
        });
      }
    } catch (err) {
      console.error("Failed to fetch item details", err);
      toast.error("Could not load item details");
    }
  };

  // ──────────────────────────────────────────────────────────────
  // Handle variant selection
  // ──────────────────────────────────────────────────────────────
  const handleVariantChange = (index, variantId) => {
    setFormData(prev => {
      const items = [...prev.items];
      const item = items[index];
      const variant = item.variants?.find(v => v._id === variantId);
      if (variant) {
        item.selectedVariantId = variantId;
        item.variant = variant;
        item.unitPrice = variant.sellingPrice || variant.price || item.unitPrice;
        item.gstRate = variant.gstRate || item.gstRate;
        item.igstRate = variant.igstRate || item.igstRate;
        item.itemCode = variant.sku || item.itemCode;
        item.imageUrl = variant.imageUrl || variant.variantImageUrl || item.imageUrl;
        // Recompute financials
        const computed = computeItemValues(item);
        Object.assign(item, computed);
      }
      items[index] = item;
      return { ...prev, items };
    });
  };

  // ------------------------------------------------------------
  // Load from sessionStorage (Copy from Sales Invoice) – with variant support
  // ------------------------------------------------------------
  useEffect(() => {
    const stored = sessionStorage.getItem("creditMemoData");
    if (!stored || isEdit) return;
    try {
      const si = JSON.parse(stored);
      const newItems = (si.items || []).map(siItem => {
        const itemId = typeof siItem.item === 'object' ? siItem.item._id : siItem.item;
        const warehouseId = typeof siItem.warehouse === 'object' ? siItem.warehouse._id : siItem.warehouse;
        // Extract image URL from variant or item
        let imageUrl = "";
        if (siItem.variant?.variantImageUrl) imageUrl = siItem.variant.variantImageUrl;
        else if (siItem.variant?.imageUrl) imageUrl = siItem.variant.imageUrl;
        else if (siItem.imageUrl) imageUrl = siItem.imageUrl;
        else if (siItem.item?.imageUrl) imageUrl = siItem.item.imageUrl;
        
        const baseItem = {
          ...initialCreditMemoState.items[0],
          item: itemId,
          imageUrl: imageUrl,
          itemCode: siItem.itemCode,
          itemName: siItem.itemName,
          itemDescription: siItem.itemDescription || siItem.description || "",
          quantity: Number(siItem.quantity) || 0,
          allowedQuantity: Number(siItem.quantity) || 0,
          creditedQuantity: Number(siItem.quantity) || 0,
          unitPrice: Number(siItem.unitPrice) || 0,
          discount: Number(siItem.discount) || 0,
          freight: Number(siItem.freight) || 0,
          gstRate: Number(siItem.gstRate) || 0,
          igstRate: Number(siItem.igstRate) || 0,
          taxOption: siItem.taxOption || "GST",
          managedBy: siItem.managedBy || "none",
          warehouse: warehouseId,
          warehouseName: siItem.warehouseName || siItem.warehouse?.warehouseName || "",
          warehouseCode: siItem.warehouseCode || siItem.warehouse?.warehouseCode || "",
          stockImpact: true,
          variant: siItem.variant || null,
          selectedVariantId: siItem.selectedVariantId || siItem.variant?._id || null,
          variants: [], // will be fetched later if needed
        };
        return { ...baseItem, ...computeItemValues(baseItem) };
      });

      setFormData({
        ...initialCreditMemoState,
        salesInvoiceId: si._id,
        customer: typeof si.customer === 'object' ? si.customer._id : si.customer,
        customerCode: si.customerCode || "",
        customerName: si.customerName || "",
        contactPerson: si.contactPerson || "",
        refNumber: `SI-${si.invoiceNumber || si.docNum || si._id}`,
        postingDate: formatDateForInput(new Date()),
        documentDate: formatDateForInput(new Date()),
        validUntil: "",
        salesEmployee: si.salesEmployee || "",
        remarks: `Credit Memo against Sales Invoice ${si.invoiceNumber || si.docNum || si._id}`,
        reasonForReturn: "",
        freight: Number(si.freight) || 0,
        rounding: Number(si.rounding) || 0,
        items: newItems,
      });

      if (si.customerCode && si.customerName) {
        setSelectedCustomer({
          _id: typeof si.customer === 'object' ? si.customer._id : si.customer,
          customerCode: si.customerCode,
          customerName: si.customerName,
        });
      }
      toast.success("✅ Sales Invoice data loaded for Credit Memo");
    } catch (err) {
      console.error(err);
      toast.error("Failed to load Sales Invoice data");
    } finally {
      sessionStorage.removeItem("creditMemoData");
    }
  }, [isEdit, computeItemValues]);

  // Load for edit (unchanged but ensure variant fields are set)
  useEffect(() => {
    if (!isEdit || !editId) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    axios.get(`/api/credit-note/${editId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const rec = res.data.data;
        const loadedItems = (rec.items || []).map(item => ({
          ...initialCreditMemoState.items[0],
          ...item,
          quantity: Number(item.quantity) || 0,
          allowedQuantity: Number(item.allowedQuantity) || 0,
          creditedQuantity: Number(item.creditedQuantity) || 0,
          unitPrice: Number(item.unitPrice) || 0,
          discount: Number(item.discount) || 0,
          freight: Number(item.freight) || 0,
          gstRate: Number(item.gstRate) || 0,
          igstRate: Number(item.igstRate) || 0,
          managedBy: item.managedBy || "none",
          batches: (item.batches || []).map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) })),
          variant: item.variant || null,
          selectedVariantId: item.selectedVariantId || null,
          variants: [],
        }));
        setFormData({
          ...initialCreditMemoState,
          ...rec,
          postingDate: formatDateForInput(rec.postingDate),
          validUntil: formatDateForInput(rec.validUntil),
          documentDate: formatDateForInput(rec.documentDate),
          items: loadedItems.map(it => ({ ...it, ...computeItemValues(it) })),
          freight: Number(rec.freight) || 0,
          rounding: Number(rec.rounding) || 0,
        });
        if (rec.customerCode || rec.customerName) {
          setSelectedCustomer({ _id: rec.customer, customerCode: rec.customerCode, customerName: rec.customerName });
        }
        setExistingFiles(rec.attachments || []);
      })
      .catch(err => toast.error("Failed to load Credit Memo"))
      .finally(() => setLoading(false));
  }, [isEdit, editId, computeItemValues]);

  // Totals
  const summary = useMemo(() => {
    const totalBeforeDiscount = formData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstTotal = formData.items.reduce((s, it) => s + (it.gstAmount || 0), 0);
    const grandTotal = totalBeforeDiscount + gstTotal + Number(formData.freight) + Number(formData.rounding);
    return { totalBeforeDiscount: round(totalBeforeDiscount), gstTotal: round(gstTotal), grandTotal: round(grandTotal) };
  }, [formData.items, formData.freight, formData.rounding]);

  // Unified handler for item changes (from ItemSection)
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
          // If the item field changed (i.e., user selected a new item), fetch its details
          if (name === "item" && value) {
            fetchItemDetails(value, index);
          }
        } else {
          // For direct object updates (e.g., when variant selected)
          if (update.selectedVariantId !== undefined) {
            handleVariantChange(index, update.selectedVariantId);
            return prev; // already updated via handleVariantChange
          }
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
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ...initialCreditMemoState.items[0] }],
    }));
  };
  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Batch handlers (unchanged)
  const openBatchModal = (itemIndex) => {
    const item = formData.items[itemIndex];
    if (!item.item || !item.itemCode) { toast.warn("Select an item before setting batch details."); return; }
    if (!item.warehouse) { toast.warn("Select a warehouse for this item first."); return; }
    if (item.managedBy?.toLowerCase() !== "batch") { toast.warn("This item is not batch-managed."); return; }
    setSelectedBatchItemIndex(itemIndex);
    setShowBatchModal(true);
  };
  const closeBatchModal = () => { setShowBatchModal(false); setSelectedBatchItemIndex(null); };
  const handleBatchEntryChange = (batchIdx, field, value) => {
    if (selectedBatchItemIndex === null) return;
    setFormData(prev => {
      const items = [...prev.items];
      const item = { ...items[selectedBatchItemIndex] };
      const batches = [...(item.batches || [])];
      if (field === "remove") batches.splice(batchIdx, 1);
      else if (batches[batchIdx]) batches[batchIdx] = { ...batches[batchIdx], [field]: value };
      item.batches = batches;
      items[selectedBatchItemIndex] = item;
      return { ...prev, items };
    });
  };
  const addBatchEntry = () => {
    if (selectedBatchItemIndex === null) return;
    setFormData(prev => {
      const items = [...prev.items];
      const item = { ...items[selectedBatchItemIndex] };
      item.batches = [...(item.batches || []), { id: generateUniqueId(), batchNumber: "", expiryDate: "", manufacturer: "", batchQuantity: 0 }];
      items[selectedBatchItemIndex] = item;
      return { ...prev, items };
    });
  };

  // Attachments
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const removeExistingFile = (file, idx) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx));
    setRemovedFiles(prev => [...prev, file]);
  };
  const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({ ...prev, [name]: value }));
};

  const validateForm = () => {
    if (!formData.customerName || !formData.customerCode) { toast.error("Select a customer"); return false; }
    if (formData.items.length === 0) { toast.error("At least one item required"); return false; }
    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.item) { toast.error(`Item missing row ${i+1}`); return false; }
      if (!item.warehouse) { toast.error(`Warehouse missing row ${i+1}`); return false; }
      if (Number(item.quantity) <= 0) { toast.error(`Quantity >0 row ${i+1}`); return false; }
      if (item.managedBy?.toLowerCase() === "batch") {
        const totalBatchQty = (item.batches || []).reduce((s, b) => s + (Number(b.batchQuantity) || 0), 0);
        if (totalBatchQty !== Number(item.quantity)) { toast.error(`Batch quantity mismatch for ${item.itemName}`); return false; }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      const payload = {
        ...formData,
        items: formData.items.map(it => ({
          ...it,
          item: typeof it.item === "object" ? it.item._id : it.item,
          warehouse: typeof it.warehouse === "object" ? it.warehouse._id : it.warehouse,
          batches: (it.batches || []).map(({ id, ...rest }) => ({ ...rest, batchQuantity: Number(rest.batchQuantity) || 0 })),
          variant: it.variant || null,
          selectedVariantId: it.selectedVariantId || null,
        })),
        existingFiles,
        removedFiles,
        ...summary,
      };
      fd.append("creditNoteData", JSON.stringify(payload));
      attachments.forEach(file => fd.append("newAttachments", file));
      const url = isEdit ? `/api/credit-note/${editId}` : "/api/credit-note";
      const method = isEdit ? "put" : "post";
      await axios({ method, url, data: fd, headers: { Authorization: `Bearer ${token}` } });
      toast.success(isEdit ? "Credit Memo updated" : "Credit Memo created");
      router.push("/admin/credit-memo-view");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error saving Credit Memo");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Loading Credit Memo...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/credit-memo-view")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
          <FaArrowLeft className="text-xs" /> Back to List
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Edit Credit Memo" : "New Credit Memo"}</h1>

        {/* Customer Section (unchanged) */}
        <SectionCard icon={FaUser} title="Customer Details" color="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><Lbl text="Customer Name" req />
              <CustomerSearch onSelectCustomer={(c) => {
                setSelectedCustomer(c);
                setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }));
              }} initialCustomer={selectedCustomer ? { _id: selectedCustomer._id, customerName: selectedCustomer.customerName } : undefined} />
            </div>
            <ReadField label="Customer Name" value={formData.customerName} />
            <ReadField label="Customer Code" value={formData.customerCode} />
            <ReadField label="Contact Person" value={formData.contactPerson} />
            <div><Lbl text="Reference Number" /><input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} /></div>
            {formData.salesInvoiceId && <div className="sm:col-span-2 text-xs text-gray-400">Linked to Sales Invoice: {formData.salesInvoiceId}</div>}
          </div>
        </SectionCard>

        {/* Dates & Status (unchanged) */}
        <SectionCard icon={FaCalendarAlt} title="Memo Details" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Posting Date" req /><input type="date" className={fi()} name="postingDate" value={formData.postingDate || ""} onChange={handleInputChange} /></div>
            <div><Lbl text="Document Date" /><input type="date" className={fi()} name="documentDate" value={formData.documentDate || ""} onChange={handleInputChange} /></div>
            <div><Lbl text="Valid Until" /><input type="date" className={fi()} name="validUntil" value={formData.validUntil || ""} onChange={handleInputChange} /></div>
            <div><Lbl text="Status" /><select className={fi()} name="status" value={formData.status} onChange={handleInputChange}><option>Draft</option><option>Issued</option><option>Cancelled</option></select></div>
            <div className="sm:col-span-2"><Lbl text="Reason for Return" /><input className={fi()} name="reasonForReturn" value={formData.reasonForReturn || ""} onChange={handleInputChange} placeholder="e.g., Damaged goods, customer return" /></div>
          </div>
        </SectionCard>

        {/* Warehouse Quick Action (unchanged) */}
        {warehouses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50/40">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500"><FaWarehouse className="text-sm" /></div>
              <div><p className="text-sm font-bold text-gray-900">Warehouse Assignment</p><p className="text-xs text-gray-400">Set a warehouse and apply to all items</p></div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-indigo-400" value={selectedGlobalWarehouse} onChange={e => setSelectedGlobalWarehouse(e.target.value)}>
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map(wh => (<option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>))}
                </select>
                <button onClick={() => applyWarehouseToAll(selectedGlobalWarehouse)} disabled={!selectedGlobalWarehouse} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
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

        {/* Line Items – now with variant support */}
        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center gap-2"><FaBoxOpen className="text-emerald-500" /> Items to Credit</div>
          <div className="p-4 overflow-x-auto">
            <ItemSection
              items={formData.items}
              onItemChange={handleItemChange}
              onAddItem={addItemRow}
              onRemoveItem={removeItemRow}
              computeItemValues={computeItemValues}
              warehouses={warehouses}
              showVariants={true}
            />
          </div>
        </div>

        {/* Batch Details (unchanged) */}
        {formData.items.some(i => i.managedBy?.toLowerCase() === "batch") && (
          <SectionCard icon={FaBoxOpen} title="Batch Details" color="amber">
            {formData.items.map((item, idx) => item.managedBy?.toLowerCase() === "batch" && (
              <div key={idx} className="flex justify-between items-center border p-3 rounded mb-2">
                <div><strong>{item.itemCode} - {item.itemName}</strong> <span className="ml-2 text-sm text-gray-600">Qty: {item.quantity}</span>
                  <span className="ml-4 text-sm">Allocated: {(item.batches || []).reduce((s, b) => s + (b.batchQuantity || 0), 0)} / {item.quantity}</span>
                </div>
                <button onClick={() => openBatchModal(idx)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Set Batch Details</button>
              </div>
            ))}
          </SectionCard>
        )}
        {showBatchModal && selectedBatchItemIndex !== null && (
          <BatchModal
            batches={formData.items[selectedBatchItemIndex]?.batches || []}
            onBatchEntryChange={handleBatchEntryChange}
            onAddBatchEntry={addBatchEntry}
            onClose={closeBatchModal}
            itemCode={formData.items[selectedBatchItemIndex]?.itemCode}
            itemName={formData.items[selectedBatchItemIndex]?.itemName}
            unitPrice={formData.items[selectedBatchItemIndex]?.unitPrice}
          />
        )}

        {/* Financial Summary (unchanged) */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Subtotal" /><input readOnly value={summary.totalBeforeDiscount} className={fi(true)} /></div>
            <div><Lbl text="GST Total" /><input readOnly value={summary.gstTotal} className={fi(true)} /></div>
            <div><Lbl text="Grand Total" /><div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-extrabold text-indigo-700">₹ {summary.grandTotal}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div><Lbl text="Freight" /><input type="number" name="freight" value={formData.freight} onChange={handleInputChange} className={fi()} /></div>
            <div><Lbl text="Rounding" /><input type="number" name="rounding" value={formData.rounding} onChange={handleInputChange} className={fi()} /></div>
          </div>
          <div className="mt-4"><Lbl text="Remarks" /><textarea name="remarks" value={formData.remarks || ""} onChange={handleInputChange} rows={2} className={`${fi()} resize-none`} /></div>
          <div className="mt-4"><Lbl text="Sales Employee" /><input className={fi()} name="salesEmployee" value={formData.salesEmployee || ""} onChange={handleInputChange} /></div>
        </SectionCard>

        {/* Attachments (unchanged) */}
        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingFiles.map((file, idx) => (
              <div key={idx} className="relative border rounded-xl p-2 bg-gray-50 group">
                <div className="h-20 flex items-center justify-center overflow-hidden">
                  {file.fileUrl?.toLowerCase().endsWith(".pdf") ? <object data={file.fileUrl} type="application/pdf" className="h-full w-full pointer-events-none" /> : <img src={file.fileUrl} className="h-full object-cover" alt="attachment" />}
                </div>
                <button onClick={() => removeExistingFile(file, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg"><FaTimes /></button>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer hover:bg-indigo-50 transition-all group">
            <FaPaperclip className="text-gray-300 group-hover:text-indigo-400" />
            <span className="text-sm font-medium text-gray-400">Upload files (PDF, images)</span>
            <input type="file" multiple accept="image/*,application/pdf" hidden onChange={handleFileSelect} />
          </label>
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {attachments.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={idx} className="relative border rounded-xl p-2 bg-gray-50">
                    <div className="h-20 flex items-center justify-center overflow-hidden">
                      {file.type === "application/pdf" ? <object data={url} type="application/pdf" className="h-full w-full pointer-events-none" /> : <img src={url} className="h-full object-cover" alt={file.name} />}
                    </div>
                    <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg"><FaTimes /></button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/credit-memo-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300">{submitting ? "Saving..." : isEdit ? "Update Credit Memo" : "Create Credit Memo"}</button>
        </div>
      </div>
    </div>
  );
}


// "use client";
// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import axios from "axios";
// import CustomerSearch from "@/components/CustomerSearch";
// import ItemSection from "@/components/ItemSection";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Initial Credit Note state.
// const initialCreditNoteState = {
//   _id: "",
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "", // Credit Note Number.
//   salesEmployee: "",
//   status: "Pending",
//   postingDate: "",
//   validUntil: "",
//   documentDate: "",
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemId: "",
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
//       managedBy: "", // will be set via item master (if "batch", then show batch details)
//       batches: [],
//       errorMessage: "",
//       taxOption: "GST",
//       managedByBatch: true,
//     },
//   ],
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   fromQuote: false,
// };

// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
// }

// /* 
//   New BatchModal component – allows manual entry/editing of batch details.
//   It displays the current batch entries (if any), allows you to add a new entry,
//   and then save & close the modal.
// */
// function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg max-w-lg w-full">
//         <h2 className="text-xl font-semibold mb-2">
//           Batch Details for {itemCode} - {itemName}
//         </h2>
//         <p className="mb-4 text-sm text-gray-600">Unit Price: {unitPrice}</p>
//         {batches && batches.length > 0 ? (
//           <table className="w-full table-auto border-collapse mb-4">
//             <thead>
//               <tr className="bg-gray-200">
//                 <th className="border p-2">Batch Number</th>
//                 <th className="border p-2">Expiry Date</th>
//                 <th className="border p-2">Manufacturer</th>
//                 <th className="border p-2">Batch Quantity</th>
//               </tr>
//             </thead>
//             <tbody>
//               {batches.map((batch, idx) => (
//                 <tr key={idx}>
//                   <td className="border p-2">
//                     <input
//                       type="text"
//                       value={batch.batchNumber || ""}
//                       onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="border p-2">
//                     <input
//                       type="date"
//                       value={batch.expiryDate || ""}
//                       onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="border p-2">
//                     <input
//                       type="text"
//                       value={batch.manufacturer || ""}
//                       onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                   <td className="border p-2">
//                     <input
//                       type="number"
//                       value={batch.batchQuantity || 0}
//                       onChange={(e) => onBatchEntryChange(idx, "batchQuantity", e.target.value)}
//                       className="w-full p-1 border rounded"
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="mb-4">No batch entries yet.</p>
//         )}
//         <button
//           type="button"
//           onClick={onAddBatchEntry}
//           className="px-4 py-2 bg-green-500 text-white rounded mb-4"
//         >
//           Add Batch Entry
//         </button>
//         <div className="flex justify-end gap-2">
//           <button
//             type="button"
//             onClick={onClose}
//             className="px-4 py-2 bg-blue-500 text-white rounded"
//           >
//             Save &amp; Close
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function CreditNoteFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <CreditNoteForm />
//     </Suspense>
//   );
// }



//  function CreditNoteForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const parentRef = useRef(null);
//   const [isCopied, setIsCopied] = useState(false);
//   const editId = searchParams.get("editId");
//   const [formData, setFormData] = useState(initialCreditNoteState);
//   // modalItemIndex holds the index of the item for which the batch modal is open.
//   const [modalItemIndex, setModalItemIndex] = useState(null);
//   const [showBatchModal, setShowBatchModal] = useState(false);

//   // Summary Calculation Effect.
//   useEffect(() => {
//     const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 0;
//       return acc + (unitPrice - discount) * quantity;
//     }, 0);

//     const totalItemsCalc = formData.items.reduce(
//       (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//       0
//     );

//     const gstTotalCalc = formData.items.reduce((acc, item) => {
//       if (item.taxOption === "IGST") {
//         return acc + (parseFloat(item.igstAmount) || 0);
//       }
//       return acc + (parseFloat(item.gstAmount) || 0);
//     }, 0);

//     const overallFreight = parseFloat(formData.freight) || 0;
//     const roundingCalc = parseFloat(formData.rounding) || 0;
//     const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
//     const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

//     const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//     const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

//     if (
//       totalBeforeDiscountCalc !== formData.totalBeforeDiscount ||
//       gstTotalCalc !== formData.gstTotal ||
//       grandTotalCalc !== formData.grandTotal ||
//       openBalanceCalc !== formData.openBalance
//     ) {
//       setFormData((prev) => ({
//         ...prev,
//         totalBeforeDiscount: totalBeforeDiscountCalc,
//         gstTotal: gstTotalCalc,
//         grandTotal: grandTotalCalc,
//         openBalance: openBalanceCalc,
//       }));
//     }
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//     formData.totalBeforeDiscount,
//     formData.gstTotal,
//     formData.grandTotal,
//     formData.openBalance,
//   ]);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     setFormData((prev) => ({
//       ...prev,
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
//       return { ...prev, items: updatedItems };
//     });
//   }, []);

  
//    const removeItemRow = useCallback((index) => {
//      setFormData((prev) => ({
//        ...prev,
//        items: prev.items.filter((_, i) => i !== index),
//      }));
//    }, []);

//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           item: "",
//           itemCode: "",
//           itemId: "",
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
//           igstAmount: 0,
//           managedBy: "",
//           batches: [],
//           errorMessage: "",
//           taxOption: "GST",
//           managedByBatch: true,
//         },
//       ],
//     }));
//   }, []);

//   // When an item is selected, fetch its managedBy if needed and compute derived values.
//   const handleItemSelect = useCallback(async (index, selectedItem) => {
//     if (!selectedItem._id) {
//       toast.error("Selected item does not have a valid ID.");
//       return;
//     }
//     let managedBy = selectedItem.managedBy;
//     if (!managedBy || managedBy.trim() === "") {
//       try {
//         const res = await axios.get(`/api/items/${selectedItem._id}`);
//         if (res.data.success) {
//           managedBy = res.data.data.managedBy;
//           console.log(`Fetched managedBy for ${selectedItem.itemCode}:`, managedBy);
//         }
//       } catch (error) {
//         console.error("Error fetching item master details:", error);
//         managedBy = "";
//       }
//     } else {
//       console.log(`Using managedBy from selected item for ${selectedItem.itemCode}:`, managedBy);
//     }
//     const unitPrice = Number(selectedItem.unitPrice) || 0;
//     const discount = Number(selectedItem.discount) || 0;
//     const freight = Number(selectedItem.freight) || 0;
//     const quantity = 1;
//     const taxOption = selectedItem.taxOption || "GST";
//     const gstRate = selectedItem.gstRate ? Number(selectedItem.gstRate) : 0;
//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmount = quantity * priceAfterDiscount + freight;
//     const cgstRate = selectedItem.cgstRate ? Number(selectedItem.cgstRate) : gstRate / 2;
//     const sgstRate = selectedItem.sgstRate ? Number(selectedItem.sgstRate) : gstRate / 2;
//     const cgstAmount = totalAmount * (cgstRate / 100);
//     const sgstAmount = totalAmount * (sgstRate / 100);
//     const gstAmount = cgstAmount + sgstAmount;
//     const igstAmount = taxOption === "IGST" ? totalAmount * (gstRate / 100) : 0;
//     const updatedItem = {
//       item: selectedItem._id,
//       itemCode: selectedItem.itemCode || "",
//       itemName: selectedItem.itemName,
//       itemDescription: selectedItem.description || "",
//       unitPrice,
//       discount,
//       freight,
//       gstRate,
//       taxOption,
//       quantity,
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount,
//       managedBy,
//       // Only initialize batches if managedBy equals "batch"
//       batches: managedBy && managedBy.trim().toLowerCase() === "batch" ? [] : [],
//     };
//     if (selectedItem.qualityCheckDetails && selectedItem.qualityCheckDetails.length > 0) {
//       setFormData((prev) => ({
//         ...prev,
//         qualityCheckDetails: selectedItem.qualityCheckDetails,
//       }));
//     } else {
//       setFormData((prev) => ({
//         ...prev,
//         qualityCheckDetails: [
//           { parameter: "Weight", min: "", max: "", actualValue: "" },
//           { parameter: "Dimension", min: "", max: "", actualValue: "" },
//         ],
//       }));
//     }
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], ...updatedItem };
//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   // Batch modal handlers.
//   const openBatchModal = useCallback((index) => {
//     setModalItemIndex(index);
//     setShowBatchModal(true);
//   }, []);

//   const closeBatchModal = useCallback(() => {
//     setShowBatchModal(false);
//     setModalItemIndex(null);
//   }, []);

//   // In this modal, batch entries are updated directly via handleBatchEntryChange.
//   const handleBatchEntryChange = useCallback((itemIndex, batchIndex, field, value) => {
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[itemIndex] };
//       if (!currentItem.batches) currentItem.batches = [];
//       const updatedBatches = [...currentItem.batches];
//       updatedBatches[batchIndex] = {
//         ...updatedBatches[batchIndex],
//         [field]: value,
//       };
//       currentItem.batches = updatedBatches;
//       updatedItems[itemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   const addBatchEntry = useCallback(() => {
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[modalItemIndex] };
//       if (!currentItem.batches) currentItem.batches = [];
//       const lastEntry = currentItem.batches[currentItem.batches.length - 1];
//       if (
//         lastEntry &&
//         lastEntry.batchNumber === "" &&
//         lastEntry.expiryDate === "" &&
//         lastEntry.manufacturer === "" &&
//         (lastEntry.batchQuantity === 0 || !lastEntry.batchQuantity)
//       ) {
//         return { ...prev, items: updatedItems };
//       }
//       currentItem.batches.push({
//         batchNumber: "",
//         expiryDate: "",
//         manufacturer: "",
//         batchQuantity: 0,
//       });
//       updatedItems[modalItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [modalItemIndex]);

//   // Check for copied data from Sales Order/Delivery.
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       let copiedData = null;
//       const soData = sessionStorage.getItem("CreditData");
//       const delData = sessionStorage.getItem("CreditNoteData");
//       if (soData) {
//         copiedData = JSON.parse(soData);
//         sessionStorage.removeItem("CreditData");
//       } else if (delData) {
//         copiedData = JSON.parse(delData);
//         sessionStorage.removeItem("CreditNoteData");
//       }
//       if (copiedData) {
//         setFormData(copiedData);
//         setIsCopied(true);
//       }
//     }
//   }, []);

//   useEffect(() => {
//     if (editId) {
//       axios
//         .get(`/api/credit-note/${editId}`)
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             setFormData({
//               ...record,
//               postingDate: formatDateForInput(record.postingDate),
//               validUntil: formatDateForInput(record.validUntil),
//               documentDate: formatDateForInput(record.documentDate),
//             });
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching credit note for edit", err);
//           toast.error("Error fetching credit note data");
//         });
//     }
//   }, [editId]);

//   const handleSubmit = async () => {
//     try {
//       if (formData._id) {
//         await axios.put(`/api/credit-note/${formData._id}`, formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         toast.success("Credit Note updated successfully");
//       } else {
//         await axios.post("/api/credit-note", formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         toast.success("Credit Note added successfully");
//         setFormData(initialCreditNoteState);
//       }
//       router.push("/admin/credit-note");
//     } catch (error) {
//       console.error("Error saving credit note:", error);
//       toast.error(formData._id ? "Failed to update credit note" : "Error adding credit note");
//     }
//   };

//   return (
//     <div ref={parentRef} className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Credit Note" : "Create Credit Note"}
//       </h1>
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
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
//             {isCopied ? (
//               <div>
//                 <label className="block mb-2 font-medium">Customer Name</label>
//                 <input
//                   type="text"
//                   name="customerName"
//                   value={formData.customerName || ""}
//                   onChange={handleInputChange}
//                   placeholder="Enter customer name"
//                   className="w-full p-2 border rounded"
//                 />
//               </div>
//             ) : (
//               <div>
//                 <label className="block mb-2 font-medium">Customer Name</label>
//                 <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//               </div>
//             )}
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
//             <label className="block mb-2 font-medium">Credit Note Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//         {/* Additional Credit Note Info */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="">Select status (optional)</option>
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formatDateForInput(formData.postingDate)}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               placeholder="dd-mm-yyyy"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formatDateForInput(formData.validUntil)}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               placeholder="dd-mm-yyyy"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formatDateForInput(formData.documentDate)}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               placeholder="dd-mm-yyyy"
//             />
//           </div>
//         </div>
//       </div>
//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         {/* <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           setFormData={setFormData}
//           onItemSelect={handleItemSelect}
//           removeItemRow={removeItemRow}
//         /> */}


//            <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
        
//               onRemoveItem={removeItemRow}
       
//           setFormData={setFormData}
//         />
    
      
//       </div>
//       {/* Batch Modal Trigger – for items with managedByBatch true and managedBy = "batch" */}
//       <div className="mb-8">
//        {formData.items.map((item, index) =>
//   item.item && item.managedByBatch ? (
//     <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
//       <div>
//         <strong>{item.itemCode} - {item.itemName}</strong>
//         <span className="ml-2 text-sm text-gray-600">(Unit Price: {item.unitPrice})</span>
//       </div>
//       <button
//         type="button"
//         onClick={() => openBatchModal(index)}
//         className="px-3 py-1 bg-green-500 text-white rounded"
//       >
//         Set Batch Details
//       </button>
//     </div>
//   ) : null
// )}

//       </div>
//       {/* Batch Modal – allows manual entry of batch details */}
//       {showBatchModal && modalItemIndex !== null && (
//         <BatchModal
//           batches={formData.items[modalItemIndex].batches}
//           onBatchEntryChange={(batchIndex, field, value) =>
//             handleBatchEntryChange(modalItemIndex, batchIndex, field, value)
//           }
//           onAddBatchEntry={addBatchEntry}
//           onClose={closeBatchModal}
//           itemCode={formData.items[modalItemIndex].itemCode}
//           itemName={formData.items[modalItemIndex].itemName}
//           unitPrice={formData.items[modalItemIndex].unitPrice}
//         />
//       )}
//       {/* Sales Employee & Remarks */}
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
//             value={formData.gstTotal.toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Grand Total</label>
//           <input
//             type="number"
//             value={formData.grandTotal.toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {formData._id ? "Update" : "Add"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialCreditNoteState);
//             router.push("/admin/credit-note");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             sessionStorage.setItem("creditNoteData", JSON.stringify(formData));
//             alert("Data copied from Sales Order/Delivery!");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Copy From
//         </button>
//       </div>
//       <ToastContainer />
//     </div>
//   );
// }

// export default CreditNoteFormWrapper;


