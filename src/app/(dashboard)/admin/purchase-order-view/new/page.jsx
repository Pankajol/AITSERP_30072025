"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import ItemSection from "@/components/ItemSection";
import SupplierSearch from "@/components/SupplierSearch";
import PurchaseQuotationSearch from "@/components/PurchaseQuotationSearch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaArrowLeft, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaTimes,
  FaWarehouse, FaCheck, FaSpinner,FaExclamationCircle, FaRegStar, FaStar, FaTrash
} from "react-icons/fa";

// --- Helpers ---
const round = (num, d = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(d));
};

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
  const igst = round(total * ((parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0) / 100));
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

const ReadField = ({ label, value }) => (
  <div>
    <Lbl text={label} />
    <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
      {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
    </div>
  </div>
);

const getToken = () => localStorage.getItem("token");

const initialState = {
  supplier: "", supplierCode: "", supplierName: "", contactPerson: "", refNumber: "",
  orderStatus: "Open", paymentStatus: "Pending", stockStatus: "Not Updated",
  postingDate: new Date(),
  validUntil: null,
  documentDate: new Date(),
  items: [{
    item: "", imageUrl: "", itemCode: "", itemName: "", itemDescription: "", quantity: 1, unitPrice: 0, discount: 0, freight: 0,
    gstRate: 0, taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0,
    igstAmount: 0, warehouse: "", warehouseName: "", warehouseCode: "", managedByBatch: true,
    variant: null, selectedVariantId: null,
  }],
  remarks: "", freight: 0, rounding: 0, totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
};

// Helper function to get variant image from item data
const getVariantImageUrl = (item, variantSku) => {
  if (!item?.variants || !variantSku) return null;
  const variant = item.variants.find(v => v.sku === variantSku);
  return variant?.imageUrl || null;
};

// ─────────────────────────────────────────────────────────────────
export default function OrderFormWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading form...</div>}>
      <OrderForm />
    </Suspense>
  );
}

function OrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const pqId = searchParams.get("pqId");

  const [formData, setFormData] = useState(initialState);
  const [attachments, setAttachments] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [defaultWarehouse, setDefaultWarehouse] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [loadingDefault, setLoadingDefault] = useState(true);

  // ✅ Fetch default warehouse and all warehouses on mount
  useEffect(() => {
    const fetchDefaultWarehouse = async () => {
      try {
        const token = getToken();
        // Get default warehouse
        const defaultRes = await axios.get('/api/warehouse?getDefault=true', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (defaultRes.data.success && defaultRes.data.data) {
          setDefaultWarehouse(defaultRes.data.data);
        }
        
        // Get all warehouses for dropdown
        const warehousesRes = await axios.get('/api/warehouse?limit=100', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (warehousesRes.data.success) {
          setWarehouses(warehousesRes.data.data);
        }
      } catch (error) {
        console.error("Failed to fetch warehouses:", error);
      } finally {
        setLoadingDefault(false);
      }
    };
    
    fetchDefaultWarehouse();
  }, []);

  // ✅ Apply default warehouse to all items
  const applyDefaultWarehouseToAll = () => {
    if (!defaultWarehouse) {
      toast.warning("No default warehouse configured");
      return;
    }
    
    setFormData(prev => {
      const updatedItems = prev.items.map(item => ({
        ...item,
        warehouse: defaultWarehouse._id,
        warehouseName: defaultWarehouse.warehouseName,
        warehouseCode: defaultWarehouse.warehouseCode
      }));
      return { ...prev, items: updatedItems };
    });
    
    toast.success(`Applied "${defaultWarehouse.warehouseName}" to all items`);
  };

  // ✅ Apply specific warehouse to all items
  const applyWarehouseToAll = (warehouseId) => {
    const warehouse = warehouses.find(w => w._id === warehouseId);
    if (!warehouse) return;
    
    setFormData(prev => {
      const updatedItems = prev.items.map(item => ({
        ...item,
        warehouse: warehouse._id,
        warehouseName: warehouse.warehouseName,
        warehouseCode: warehouse.warehouseCode
      }));
      return { ...prev, items: updatedItems };
    });
    
    toast.success(`Applied "${warehouse.warehouseName}" to all items`);
  };

  // ───────── Load from Purchase Quotation ─────────
  const loadFromPQ = useCallback(async (id) => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await axios.get(`/api/purchase-quotation?id=${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        const pq = res.data.data;
        
        // Map items with proper warehouse handling
        const mappedItems = pq.items.map(it => {
          // Get variant image if this is a variant item
          let imageUrl = it.imageUrl || it.item?.imageUrl;
          if (it.item && it.itemCode && it.itemCode !== it.item?.itemCode) {
            const variantImage = getVariantImageUrl(it.item, it.itemCode);
            if (variantImage) imageUrl = variantImage;
          }
          
          // Use default warehouse if no warehouse specified
          const warehouseId = it.warehouse || defaultWarehouse?._id;
          const warehouse = warehouses.find(w => w._id === warehouseId);
          
          return {
            ...initialState.items[0],
            ...it,
            imageUrl: imageUrl,
            item: it.item?._id || it.item,
            itemCode: it.itemCode,
            itemName: it.itemName,
            itemDescription: it.itemDescription || "",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            freight: it.freight,
            gstRate: it.gstRate,
            taxOption: it.taxOption,
            igstRate: it.igstRate,
            variant: it.variant || null,
            selectedVariantId: it.variant?.variantId || null,
            warehouse: warehouseId || "",
            warehouseName: warehouse?.warehouseName || defaultWarehouse?.warehouseName || "",
            warehouseCode: warehouse?.warehouseCode || defaultWarehouse?.warehouseCode || ""
          };
        });
        
        setFormData(prev => ({
          ...prev,
          supplier: pq.supplier?._id || pq.supplier,
          supplierName: pq.supplierName,
          supplierCode: pq.supplierCode,
          contactPerson: pq.contactPerson,
          refNumber: pq.refNumber,
          items: mappedItems
        }));
        
        toast.success("Quotation loaded – adjust as needed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load quotation data");
    } finally {
      setLoading(false);
    }
  }, [defaultWarehouse, warehouses]);

  useEffect(() => {
    if (pqId && !editId && warehouses.length > 0) {
      loadFromPQ(pqId);
    }
  }, [pqId, editId, loadFromPQ, warehouses]);

  // Fetch existing order for editing
  useEffect(() => {
    if (editId) {
      setLoading(true);
      const token = getToken();
      axios.get(`/api/purchase-order/${editId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => {
          const record = res.data.data;
          setFormData({
            ...initialState,
            ...record,
            postingDate: record.postingDate ? new Date(record.postingDate) : new Date(),
            documentDate: record.documentDate ? new Date(record.documentDate) : new Date(),
          });
          setExistingFiles(record.attachments || []);
        })
        .catch(err => toast.error("Error loading order"))
        .finally(() => setLoading(false));
    }
  }, [editId]);

  const handleSupplierSelect = useCallback((supplier) => {
    if (!supplier) {
      setFormData(prev => ({ ...prev, supplier: "", supplierCode: "", supplierName: "", contactPerson: "" }));
      return;
    }
    setFormData(prev => ({
      ...prev,
      supplier: supplier._id,
      supplierCode: supplier.supplierCode || "",
      supplierName: supplier.supplierName || "",
      contactPerson: supplier.contactPersonName || supplier.contactPerson || "",
    }));
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = useCallback((index, update) => {
    setFormData(prev => {
      const updatedItems = [...prev.items];
      let newItem = { ...updatedItems[index] };
      if (typeof update === "object" && update !== null && !update.target) {
        newItem = { ...newItem, ...update };
      } else {
        const { name, value } = update.target;
        const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"];
        const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
        newItem[name] = newValue;
        if (name === "quantity") newItem.orderedQuantity = newValue;
      }
      const computed = computeItemValues(newItem);
      updatedItems[index] = { ...newItem, ...computed };
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addItemRow = () => setFormData(prev => ({ ...prev, items: [...prev.items, { ...initialState.items[0], warehouse: defaultWarehouse?._id, warehouseName: defaultWarehouse?.warehouseName, warehouseCode: defaultWarehouse?.warehouseCode }] }));
  const removeItemRow = (index) => setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  // Auto‑calculate totals
  useEffect(() => {
    const totalBefore = round(formData.items.reduce((s, i) => s + (Number(i.unitPrice) - Number(i.discount)) * Number(i.quantity), 0));
    const gstTotal = round(formData.items.reduce((s, i) => s + (i.taxOption === "IGST" ? Number(i.igstAmount) : Number(i.gstAmount)), 0));
    const freight = round(Number(formData.freight));
    const rounding = round(Number(formData.rounding));
    const grand = round(totalBefore + gstTotal + freight + rounding);
    setFormData(prev => ({ ...prev, totalBeforeDiscount: totalBefore, gstTotal, grandTotal: grand }));
  }, [formData.items, formData.freight, formData.rounding]);

  // File handlers
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const removeAttachment = (index) => setAttachments(prev => prev.filter((_, i) => i !== index));
  const removeExistingFile = (file) => setRemovedFiles(prev => [...prev, file]);

  const handleSubmit = async () => {
    if (!formData.supplier) return toast.error("Please select a Supplier");
    if (formData.items.some(it => !it.item)) return toast.error("One or more items are invalid. Select items properly.");
    if (formData.items.some(it => !it.warehouse)) return toast.error("Please select a warehouse for all items");

    setLoading(true);
    try {
      const token = getToken();
      const fd = new FormData();
      const submissionData = {
        ...formData,
        postingDate: formData.postingDate ? formData.postingDate.toISOString() : new Date().toISOString(),
        documentDate: formData.documentDate ? formData.documentDate.toISOString() : new Date().toISOString(),
        existingFiles,
        removedFiles,
        items: formData.items.map(it => ({
          ...it,
          item: typeof it.item === 'object' ? it.item._id : it.item,
          warehouse: typeof it.warehouse === 'object' ? it.warehouse._id : it.warehouse,
          variant: it.variant || null,
        })),
      };
      fd.append("orderData", JSON.stringify(submissionData));
      attachments.forEach(f => fd.append("attachments", f));

      const url = editId ? `/api/purchase-order/${editId}` : `/api/purchase-order`;
      const method = editId ? "put" : "post";
      const res = await axios({
        method, url, data: fd,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
      });
      if (res.data.success) {
        toast.success(editId ? "Order Updated!" : "Order Created Successfully!");
        setTimeout(() => router.push("/admin/purchase-order-view"), 1500);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save Order.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && (pqId || editId)) return <div className="p-8 text-center">Loading data...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/purchase-order-view")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
          <FaArrowLeft className="text-xs" /> Back to Orders
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{editId ? "Edit Purchase Order" : "New Purchase Order"}</h1>

        {/* Supplier Details + PQ search */}
        <SectionCard icon={FaUser} title="Supplier & Quotation" color="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-1">
              <Lbl text="Search Supplier" req />
              <SupplierSearch
                onSelectSupplier={handleSupplierSelect}
                initialSupplier={formData.supplierName ? { _id: formData.supplier, supplierName: formData.supplierName } : undefined}
              />
            </div>
            <div className="sm:col-span-1">
              <Lbl text="Copy from Purchase Quotation (optional)" />
              <PurchaseQuotationSearch onSelect={(pq) => loadFromPQ(pq._id)} />
              <p className="text-[10px] text-gray-400 mt-1">Select a quotation to auto‑fill supplier and items</p>
            </div>
            <ReadField label="Supplier Code" value={formData.supplierCode} />
            <ReadField label="Supplier Name" value={formData.supplierName} />
            <ReadField label="Contact Person" value={formData.contactPerson} />
          </div>
        </SectionCard>

        {/* Warehouse Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50/40">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500">
              <FaWarehouse className="text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Warehouse Assignment</p>
              <p className="text-xs text-gray-400">Set default warehouse for all items</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <div className="flex flex-wrap items-center gap-3">
              {loadingDefault ? (
                <FaSpinner className="animate-spin text-indigo-500" />
              ) : defaultWarehouse ? (
                <div className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
                  <FaCheck className="text-emerald-500 text-xs" />
                  <span className="text-xs font-medium text-gray-700">Default: {defaultWarehouse.warehouseName}</span>
                  <span className="text-[10px] text-gray-400">({defaultWarehouse.warehouseCode})</span>
                </div>
              ) : (
                <span className="text-xs text-gray-400">No default warehouse configured</span>
              )}
              
              <select 
                onChange={(e) => applyWarehouseToAll(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs"
                defaultValue=""
              >
                <option value="">Apply warehouse to all items...</option>
                {warehouses.map(wh => (
                  <option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>
                ))}
              </select>
              
              {defaultWarehouse && (
                <button
                  onClick={applyDefaultWarehouseToAll}
                  className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-medium hover:bg-indigo-600 transition-all"
                >
                  Apply Default to All
                </button>
              )}
            </div>
            
            {formData.items.some(item => !item.warehouse) && (
              <p className="text-amber-600 text-xs mt-3 flex items-center gap-1">
                <FaExclamationCircle className="text-[10px]" />
                Some items don't have a warehouse assigned. Please select a warehouse for each item.
              </p>
            )}
          </div>
        </div>

        {/* Timeline */}
        <SectionCard icon={FaCalendarAlt} title="Timeline" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Lbl text="Posting Date" />
              <DatePicker
                selected={formData.postingDate}
                onChange={(date) => setFormData(prev => ({ ...prev, postingDate: date }))}
                dateFormat="dd-MM-yyyy"
                className={fi()}
                placeholderText="Select posting date"
              />
            </div>
            <div>
              <Lbl text="Expected Delivery" />
              <DatePicker
                selected={formData.documentDate}
                onChange={(date) => setFormData(prev => ({ ...prev, documentDate: date }))}
                dateFormat="dd-MM-yyyy"
                className={fi()}
                placeholderText="Select delivery date"
              />
            </div>
            <div>
              <Lbl text="Order Status" />
              <select className={fi()} name="orderStatus" value={formData.orderStatus} onChange={handleInputChange}>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* Line Items with Warehouse Integration */}
        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FaBoxOpen className="text-emerald-500" /> 
              <span>Line Items (with variants & warehouse)</span>
            </div>
            {defaultWarehouse && (
              <span className="text-[10px] text-gray-400 bg-white px-2 py-1 rounded">
                Default WH: {defaultWarehouse.warehouseCode}
              </span>
            )}
          </div>
          <div className="p-4 overflow-x-auto">
            <ItemSection
              items={formData.items}
              onItemChange={handleItemChange}
              onAddItem={addItemRow}
              onRemoveItem={removeItemRow}
              computeItemValues={computeItemValues}
              warehouses={warehouses}
              defaultWarehouse={defaultWarehouse}
            />
          </div>
        </div>

        {/* Financial Summary */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadField label="Taxable Amount" value={`₹ ${formData.totalBeforeDiscount}`} />
            <ReadField label="GST Total" value={`₹ ${formData.gstTotal}`} />
            <div>
              <Lbl text="Rounding" />
              <input className={fi()} type="number" name="rounding" value={formData.rounding} onChange={handleInputChange} onFocus={e => e.target.select()} />
            </div>
            <div>
              <Lbl text="Grand Total" />
              <div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-extrabold text-indigo-700 text-lg">
                ₹ {formData.grandTotal}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Attachments */}
        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
          <div className="mb-3">
            <label className="cursor-pointer bg-white border rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-50 inline-flex items-center gap-2">
              <FaPaperclip /> Select Files
              <input type="file" multiple hidden onChange={handleFileSelect} />
            </label>
            <span className="ml-3 text-xs text-gray-400">{attachments.length} new file(s)</span>
          </div>
          {attachments.length > 0 && (
            <div className="space-y-2 mt-2">
              {attachments.map((f, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-gray-50 rounded border">
                  <span className="text-sm truncate">{f.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-red-500"><FaTimes /></button>
                </div>
              ))}
            </div>
          )}
          {existingFiles.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-400 mb-1">Already uploaded:</p>
              {existingFiles.filter(f => !removedFiles.includes(f)).map((f, i) => (
                <div key={i} className="flex justify-between items-center p-2 bg-gray-100 rounded mt-1">
                  <a href={f.fileUrl} target="_blank" className="text-indigo-600 text-sm truncate">{f.fileName}</a>
                  <button onClick={() => removeExistingFile(f)} className="text-red-500"><FaTimes /></button>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/purchase-order-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={loading} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${loading ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {loading ? "Saving..." : editId ? "Update Order" : "Create Order"}
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
// import SupplierSearch from "@/components/SupplierSearch";
// import SalesOrderSearch from "@/components/SalesOrderSearch"; // Ensure this is imported correctly
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import {
//   FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
//   FaBoxOpen, FaCalculator, FaPaperclip, FaTimes
// } from "react-icons/fa";

// // --- Helpers ---
// const round = (num, d = 2) => {
//   const n = Number(num);
//   return isNaN(n) ? 0 : Number(n.toFixed(d));
// };

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
//   const igst = round(total * ((parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0) / 100));
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

// const ReadField = ({ label, value }) => (
//   <div>
//     <Lbl text={label} />
//     <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
//       {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
//     </div>
//   </div>
// );

// const initialState = {
//   supplier: "", supplierCode: "", supplierName: "", contactPerson: "", refNumber: "",
//   orderStatus: "Open", paymentStatus: "Pending", stockStatus: "Not Updated",
//   postingDate: new Date().toISOString().split('T')[0], validUntil: "", documentDate: new Date().toISOString().split('T')[0],
//   items: [{
//     item: "", itemCode: "", itemName: "", itemDescription: "", quantity: 1, unitPrice: 0, discount: 0, freight: 0,
//     gstRate: 0, taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0, gstAmount: 0, cgstAmount: 0, sgstAmount: 0,
//     igstAmount: 0, warehouse: "", managedByBatch: true,
//   }],
//   remarks: "", freight: 0, rounding: 0, totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, salesOrder: [],
// };

// // --- Page Logic ---
// export default function OrderFormWrapper() {
//   return (
//     <Suspense fallback={<div className="p-10 text-center text-gray-400">Loading form data...</div>}>
//       <OrderForm />
//     </Suspense>
//   );
// }

// function OrderForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [formData, setFormData] = useState(initialState);
//   const [attachments, setAttachments] = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [loading, setLoading] = useState(false);

//   // Fetch Master Data
//   useEffect(() => {
//     if (editId) {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       axios.get(`/api/purchase-order/${editId}`, { headers: { Authorization: `Bearer ${token}` } })
//         .then(res => {
//           const record = res.data.data;
//           setFormData({ ...initialState, ...record });
//           setExistingFiles(record.attachments || []);
//         })
//         .finally(() => setLoading(false));
//     }
//   }, [editId]);

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleItemChange = (index, e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
//       updatedItems[index] = { ...updatedItems[index], ...computeItemValues(updatedItems[index]) };
//       return { ...prev, items: updatedItems };
//     });
//   };

//   // Auto-calculate totals
//   useEffect(() => {
//     const totalBefore = round(formData.items.reduce((s, i) => s + (Number(i.unitPrice) - Number(i.discount)) * Number(i.quantity), 0));
//     const gstTotal = round(formData.items.reduce((s, i) => s + (i.taxOption === "IGST" ? Number(i.igstAmount) : Number(i.gstAmount)), 0));
//     const grand = round(totalBefore + gstTotal + Number(formData.freight) + Number(formData.rounding));
//     setFormData(prev => ({ ...prev, totalBeforeDiscount: totalBefore, gstTotal, grandTotal: grand }));
//   }, [formData.items, formData.freight, formData.rounding]);

//   const handleSubmit = async () => {
//     if (!formData.supplier) return toast.error("Please select a Supplier");
//     if (formData.items.some(it => !it.item)) return toast.error("One or more items are invalid. Select items properly.");

//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const fd = new FormData();
      
//       // Sanitizing items before sending
//       const submissionData = {
//         ...formData,
//         existingFiles,
//         removedFiles,
//         items: formData.items.map(it => ({
//             ...it,
//             item: typeof it.item === 'object' ? it.item._id : it.item,
//             warehouse: typeof it.warehouse === 'object' ? it.warehouse._id : it.warehouse
//         }))
//       };

//       fd.append("orderData", JSON.stringify(submissionData));
//       attachments.forEach(f => fd.append("attachments", f));

//       const url = editId ? `/api/purchase-order/${editId}` : `/api/purchase-order`;
//       const method = editId ? "put" : "post";

//       const res = await axios({
//         method,
//         url,
//         data: fd,
//         headers: { 
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "multipart/form-data" 
//         }
//       });

//       if (res.data.success) {
//         toast.success(editId ? "Order Updated!" : "Order Created Successfully!");
//         setTimeout(() => router.push("/admin/purchase-order-view"), 1500);
//       }
//     } catch (err) {
//       console.error("Submission Error:", err.response?.data || err.message);
//       toast.error(err.response?.data?.message || "Failed to save Order. Check required fields.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <ToastContainer />
//       <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
//         <button onClick={() => router.push("/admin/purchase-order-view")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
//           <FaArrowLeft className="text-xs" /> Back to Orders
//         </button>

//         <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{editId ? "Edit Purchase Order" : "New Purchase Order"}</h1>

//         <SectionCard icon={FaUser} title="Supplier Details" color="indigo">
//           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//             <div className="sm:col-span-1">
//               <Lbl text="Search Supplier" req />
//               <SupplierSearch 
//                 onSelectCustomer={s => setFormData(p => ({ ...p, supplier: s._id, supplierName: s.supplierName, supplierCode: s.supplierCode, contactPerson: s.contactPersonName }))} 
//                 initialSupplier={formData.supplier ? { _id: formData.supplier, supplierName: formData.supplierName } : undefined} 
//               />
//             </div>
//             <ReadField label="Supplier Code" value={formData.supplierCode} />
//             <ReadField label="Supplier Name" value={formData.supplierName} />
//             <ReadField label="Contact Person" value={formData.contactPerson} />
//           </div>
//         </SectionCard>

//         <SectionCard icon={FaCalendarAlt} title="Timeline" color="blue">
//           <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
//             <div><Lbl text="Posting Date" /><input className={fi()} type="date" name="postingDate" value={formData.postingDate} onChange={handleInputChange} /></div>
//             <div><Lbl text="Expected Delivery" /><input className={fi()} type="date" name="documentDate" value={formData.documentDate} onChange={handleInputChange} /></div>
//             <div>
//               <Lbl text="Status" />
//               <select className={fi()} name="orderStatus" value={formData.orderStatus} onChange={handleInputChange}>
//                 <option value="Open">Open</option><option value="Closed">Closed</option>
//               </select>
//             </div>
//           </div>
//         </SectionCard>

//         <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
//           <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center gap-2"><FaBoxOpen className="text-emerald-500" /> Line Items</div>
//           <div className="p-4 overflow-x-auto">
//             <ItemSection 
//               items={formData.items} 
//               onItemChange={handleItemChange} 
//               onAddItem={() => setFormData(p => ({ ...p, items: [...p.items, { ...initialState.items[0] }] }))} 
//               onRemoveItem={(i) => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} 
//               computeItemValues={computeItemValues} 
//             />
//           </div>
//         </div>

//         <SectionCard icon={FaCalculator} title="Summary" color="amber">
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
//             <ReadField label="Taxable Amt" value={formData.totalBeforeDiscount} />
//             <ReadField label="GST Total" value={formData.gstTotal} />
//             <div><Lbl text="Rounding" /><input className={fi()} type="number" name="rounding" value={formData.rounding} onChange={handleInputChange}  onFocus={(e) => e.target.select()}/></div>
//             <div><Lbl text="Grand Total" /><div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-extrabold text-indigo-700">₹ {formData.grandTotal}</div></div>
//           </div>
//         </SectionCard>

//         <div className="flex items-center justify-between pt-4 pb-10">
//           <button onClick={() => router.push("/admin/purchase-order-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm">Cancel</button>
//           <button onClick={handleSubmit} disabled={loading} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${loading ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
//             {loading ? "Saving..." : editId ? "Update Order" : "Create Order"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

