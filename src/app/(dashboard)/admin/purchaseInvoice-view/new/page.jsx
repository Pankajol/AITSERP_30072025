"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection from "@/components/ItemSection"; // import your separate ItemSection component
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Tesseract from "tesseract.js";




/* ---------- helpers ---------- */
const generateUniqueId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};
const ArrayOf = (arr) => (Array.isArray(arr) ? arr : []);
const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  let d;
  if (dateStr instanceof Date) d = dateStr;
  else if (String(dateStr).includes("/")) {
    const parts = String(dateStr).split("/");
    if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  } else if (String(dateStr).includes("-")) {
    const parts = String(dateStr).split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) d = new Date(dateStr);
      else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    }
  } else {
    d = new Date(dateStr);
  }
  if (!d || isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}
const getAuthHeaders = () => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/* ---------- initial state ---------- */
const initialPurchaseInvoiceState = {
  supplier: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  status: "Pending",
  postingDate: "",
  documentDate: "",
  dueDate: "",
  items: [
    {
      id: generateUniqueId(),
      item: "", itemCode: "", itemName: "", itemDescription: "",
      quantity: 0, unitPrice: 0, discount: 0,
      freight: 0,
      gstRate: 0, igstRate: 0, cgstRate: 0, sgstRate: 0,
      taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
      gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
      managedBy: "", batches: [], errorMessage: "",
      warehouse: "", warehouseCode: "", warehouseName: "",
      binLocations: [], selectedBin: null,
    },
  ],
  salesEmployee: "", remarks: "", freight: 0, rounding: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
  purchaseOrderId: "", goodReceiptNoteId: "",
  sourceType: "", sourceId: "", attachments: [],
};

/* ---------- DB lookup helpers ---------- */
async function lookupSupplier({ code, name }) {
  const headers = getAuthHeaders();
  const tryCalls = [];
  if (code) tryCalls.push(() => axios.get(`/api/suppliers/by-code/${encodeURIComponent(code)}`, { headers }));
  if (name) tryCalls.push(() => axios.get(`/api/suppliers/search`, { headers, params: { q: name } }));
  if (code || name) tryCalls.push(() => axios.get(`/api/suppliers/lookup`, { headers, params: { code, name } }));
  for (const call of tryCalls) {
    try {
      const res = await call();
      const data = res?.data?.data || res?.data;
      if (!data) continue;
      const list = Array.isArray(data) ? data : [data];
      const found = list.find((s) => {
        const codeMatch = code ? (String(s.supplierCode || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : false;
        const nameMatch = name ? (String(s.supplierName || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : false;
        return (code && codeMatch) || (name && nameMatch);
      }) || (Array.isArray(data) ? null : data);
      if (found) return found;
    } catch (e) {
      // try next
    }
  }
  return null;
}
async function lookupItem({ code, name }) {
  const headers = getAuthHeaders();
  const calls = [];
  if (code) calls.push(() => axios.get(`/api/items/by-code/${encodeURIComponent(code)}`, { headers }));
  if (name) calls.push(() => axios.get(`/api/items/search`, { headers, params: { q: name } }));
  if (code || name) calls.push(() => axios.get(`/api/items/lookup`, { headers, params: { code, name } }));
  for (const call of calls) {
    try {
      const res = await call();
      const data = res?.data?.data || res?.data;
      if (!data) continue;
      const list = Array.isArray(data) ? data : [data];
      const found = list.find((it) => {
        const codeMatch = code ? (String(it.itemCode || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : false;
        const nameMatch = name ? (String(it.itemName || '').trim().toLowerCase() === String(name).trim().toLowerCase() || String(it.description || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : false;
        return (code && codeMatch) || (name && nameMatch);
      }) || (Array.isArray(data) ? null : data);
      if (found) return found;
    } catch (e) {
      // try next
    }
  }
  return null;
}




/* ---------- form-level item calculator ---------- */
const computeItemValuesForm = (it) => {
  const q = Number(it.quantity) || 0;
  const up = Number(it.unitPrice) || 0;
  const dis = Number(it.discount) || 0;
  const fr = Number(it.freight) || 0;
  const net = up - dis;
  const tot = net * q + fr;
  let cg = 0, sg = 0, ig = 0;
  if (it.taxOption === "IGST") {
    const rate = Number(it.igstRate || it.gstRate) || 0;
    ig = (tot * rate) / 100;
  } else {
    const rate = Number(it.gstRate) || 0;
    const half = rate / 2;
    cg = (tot * half) / 100;
    sg = cg;
  }
  return { priceAfterDiscount: net, totalAmount: tot, cgstAmount: cg, sgstAmount: sg, gstAmount: cg + sg, igstAmount: ig };
};

/* ---------- BatchModal component ---------- */
function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
  const currentBatches = ArrayOf(batches);
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-2">
          Batch Details for {itemCode || 'Selected Item'} - {itemName || 'N/A'}
        </h2>
        <p className="mb-4 text-sm text-gray-600">Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : '0.00'}</p>
        {currentBatches.length > 0 ? (
          <table className="w-full table-auto border-collapse mb-4">
            <thead>
              <tr className="bg-gray-200">
                <th className="border p-2 text-left text-sm">Batch Number</th>
                <th className="border p-2 text-left text-sm">Expiry Date</th>
                <th className="border p-2 text-left text-sm">Manufacturer</th>
                <th className="border p-2 text-left text-sm">Quantity</th>
                <th className="border p-2 text-left text-sm">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentBatches.map((batch, idx) => (
                <tr key={batch.id}>
                  <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td>
                  <td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td>
                  <td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td>
                  <td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td>
                  <td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-4 text-gray-500">No batch entries yet. Click "Add Batch Entry" to add one.</p>
        )}
        <button type="button" onClick={onAddBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600">
          Add Batch Entry
        </button>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- PurchaseInvoiceForm wrapper ---------- */
function PurchaseInvoiceFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading purchase invoice form data...</div>}>
      <PurchaseInvoiceForm />
    </Suspense>
  );
}

/* ---------- Main form ---------- */
function PurchaseInvoiceForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);

  const parentRef = useRef(null);
  const [purchaseInvoiceData, setPurchaseInvoiceData] = useState(initialPurchaseInvoiceState);
  const [summary, setSummary] = useState({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
  const [existingFiles, setExistingFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ocrExtracting, setOcrExtracting] = useState(false);
  const [ocrGrandTotal, setOcrGrandTotal] = useState(null);

 const [pdfjsLib, setPdfjsLib] = useState(null);


useEffect(() => {
  const loadPdf = async () => {
    if (typeof window !== "undefined") {

      // ✅ USE LEGACY VERSION (No wasm, no crash)
      const pdfjs = await import("pdfjs-dist/legacy/build/pdf");

      // ✅ Use CDN worker (best for NextJS)
      pdfjs.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

      setPdfjsLib(pdfjs);
      console.log("✅ PDFJS loaded safely (LEGACY)");
    }
  };

  loadPdf();
}, []);


  /* ---------- load session source (GRN / PI copy) ---------- */
  useEffect(() => {
    const grnDataForInvoice = sessionStorage.getItem("grnData");
    const purchaseInvoiceCopyData = sessionStorage.getItem("purchaseInvoiceData");
    if (!grnDataForInvoice && !purchaseInvoiceCopyData) return;
    try {
      const sourceDoc = grnDataForInvoice ? JSON.parse(grnDataForInvoice) : JSON.parse(purchaseInvoiceCopyData);
      const sourceType = grnDataForInvoice ? "GRN" : "PurchaseInvoice";
      const preparedItems = (sourceDoc.items || []).map((item) => {
        const quantityToInvoice = Number(item.quantity) || 0;
        const baseItem = {
          ...initialPurchaseInvoiceState.items[0],
          id: generateUniqueId(),
          item: item.item?._id || item.item || "",
          itemCode: item.itemCode || "", itemName: item.itemName || "",
          itemDescription: item.itemDescription || item.description || "",
          quantity: quantityToInvoice, unitPrice: Number(item.unitPrice || item.price) || 0,
          discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
          gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
          taxOption: item.taxOption || "GST", managedBy: item.managedBy || "",
          batches: Array.isArray(item.batches) ? item.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) })) : [],
          warehouse: item.warehouse || "", warehouseCode: item.warehouseCode || "", warehouseName: item.warehouseName || "",
          binLocations: Array.isArray(item.binLocations) ? item.binLocations : []
        };
        return { ...baseItem, ...computeItemValuesForm(baseItem) };
      });
      setExistingFiles(sourceDoc.attachments || []);
      setPurchaseInvoiceData((prev) => ({
        ...prev,
        supplier: sourceDoc.supplier?._id || sourceDoc.supplier || "",
        supplierCode: sourceDoc.supplier?.supplierCode || sourceDoc.supplierCode || "",
        supplierName: sourceDoc.supplier?.supplierName || sourceDoc.supplierName || "",
        contactPerson: sourceDoc.supplier?.contactPersonName || sourceDoc.contactPerson || "",
        refNumber: sourceDoc.refNumber || "",
        postingDate: formatDateForInput(new Date()),
        documentDate: formatDateForInput(new Date()),
        dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        items: preparedItems,
        salesEmployee: sourceDoc.salesEmployee || "",
        remarks: sourceDoc.remarks || "",
        freight: Number(sourceDoc.freight) || 0,
        rounding: Number(sourceDoc.rounding) || 0,
        purchaseOrderId: sourceDoc.purchaseOrderId || "",
        goodReceiptNoteId: sourceDoc._id || "",
        sourceType,
        sourceId: sourceDoc._id,
        invoiceType: sourceDoc.invoiceType || (sourceType === "GRN" ? "GRNCopy" : "Normal"),
      }));
      toast.success(`✅ ${grnDataForInvoice ? "GRN" : "Purchase Invoice"} loaded successfully`);
    } catch (err) {
      console.error("Error loading session source:", err);
      toast.error("Failed to load source data");
    } finally {
      sessionStorage.removeItem("grnDataForInvoice");
      sessionStorage.removeItem("purchaseInvoiceData");
    }
  }, []);

  /* ---------- load edit invoice ---------- */
  useEffect(() => {
    if (!isEdit || !editId) return;
    (async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) { toast.error("Unauthorized"); setLoading(false); return; }
        const res = await axios.get(`/api/purchaseInvoice/${editId}`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.data.success) {
          const rec = res.data.data;
          setPurchaseInvoiceData((prev) => ({
            ...prev,
            ...rec,
            postingDate: formatDateForInput(rec.postingDate) || formatDateForInput(new Date()),
            documentDate: formatDateForInput(rec.documentDate),
            dueDate: formatDateForInput(rec.dueDate),
            supplier: rec.supplier?._id || rec.supplier || "",
            supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
            supplierName: rec.supplier?.supplierName || rec.supplierName || "",
            contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
            items: ArrayOf(rec.items).map(item => {
              const baseItem = {
                ...initialPurchaseInvoiceState.items[0],
                ...item,
                id: item.id || generateUniqueId(),
                batches: Array.isArray(item.batches) ? item.batches.map(b => ({ id: b.id || b._id || generateUniqueId(), ...b, expiryDate: formatDateForInput(b.expiryDate) })) : [],
                itemDescription: item.itemDescription || "",
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                discount: Number(item.discount) || 0,
                freight: Number(item.freight) || 0,
                gstRate: Number(item.gstRate) || 0,
                igstRate: Number(item.igstRate) || 0,
                binLocations: Array.isArray(item.binLocations) ? item.binLocations : []
              };
              return { ...baseItem, ...computeItemValuesForm(baseItem) };
            })
          }));
          setExistingFiles(rec.attachments || []);
          setAttachments([]);
          setRemovedFiles([]);
        } else {
          toast.error(res.data.error || "Failed to load invoice");
        }
      } catch (err) {
        console.error(err);
        toast.error("Error loading invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [isEdit, editId]);

  /* ---------- handlers ---------- */
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
  }, []);

  const handleSupplierSelect = useCallback((s) => {
    setPurchaseInvoiceData((p) => ({
      ...p, supplier: s._id, supplierCode: s.supplierCode, supplierName: s.supplierName, contactPerson: s.contactPersonName
    }));
  }, []);

  const addItemRow = useCallback(() => {
    setPurchaseInvoiceData(p => ({ ...p, items: [...p.items, { ...initialPurchaseInvoiceState.items[0], id: generateUniqueId() }] }));
  }, []);

  const removeItemRow = useCallback((i) => {
    setPurchaseInvoiceData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }, []);

  const handleItemChange = useCallback((i, e) => {
    // e can be a native event or an object like { target: { name, value } }
    const name = e.target?.name ?? e.name;
    const value = e.target?.value ?? e.value;
    setPurchaseInvoiceData((p) => {
      const items = [...p.items];
      const newVal = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate"].includes(name)
        ? Number(value) || 0
        : value;
      items[i] = { ...items[i], [name]: newVal };
      items[i] = { ...items[i], ...computeItemValuesForm(items[i]) };
      return { ...p, items };
    });
  }, []);

  // When ItemSection identifies and selects an item, this will set it into form state
  const handleItemSelect = useCallback(async (i, sku) => {
    let managedByValue = sku.managedBy || "";
    if (!managedByValue || managedByValue.trim() === "") {
      try {
        const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        managedByValue = res.data.success ? res.data.data.managedBy : "";
      } catch (err) {
        managedByValue = "";
      }
    }
    const base = {
      id: generateUniqueId(),
      item: sku._id, itemCode: sku.itemCode, itemName: sku.itemName,
      itemDescription: sku.description || "", quantity: 1,
      unitPrice: Number(sku.unitPrice) || 0, discount: Number(sku.discount) || 0,
      freight: Number(sku.freight) || 0, gstRate: Number(sku.gstRate) || 0,
      igstRate: Number(sku.igstRate) || 0, taxOption: sku.taxOption || "GST",
      managedBy: managedByValue,
      batches: managedByValue.toLowerCase() === "batch" ? [] : [],
      warehouse: sku.warehouse || "", warehouseCode: sku.warehouse || "",
      warehouseName: sku.warehouseName || "", binLocations: []
    };
    setPurchaseInvoiceData((p) => {
      const items = [...p.items];
      items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValuesForm(base) };
      return { ...p, items };
    });
  }, []);

  // Batch handlers
  const openBatchModal = useCallback((itemIndex) => {
    const currentItem = purchaseInvoiceData.items[itemIndex];
    if (!currentItem.itemCode || !currentItem.itemName) {
      toast.warn("Please select an Item (with Code and Name) before setting batch details."); return;
    }
    if (!currentItem.item || !currentItem.warehouse) {
      toast.warn("Please select an Item and a Warehouse for this line item before setting batch details."); return;
    }
    if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
      toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`); return;
    }
    setSelectedBatchItemIndex(itemIndex);
    setShowBatchModal(true);
  }, [purchaseInvoiceData.items]);
  const closeBatchModal = useCallback(() => { setShowBatchModal(false); setSelectedBatchItemIndex(null); }, []);
  const handleBatchEntryChange = useCallback((batchIdx, field, value) => {
    setPurchaseInvoiceData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      const updatedBatches = ArrayOf(currentItem.batches);
      if (field === 'remove') updatedBatches.splice(batchIdx, 1);
      else {
        if (updatedBatches[batchIdx]) {
          const finalValue = (field === "batchQuantity" && isNaN(value)) ? 0 : value;
          updatedBatches[batchIdx] = { ...updatedBatches[batchIdx], [field]: finalValue };
        } else {
          console.error(`Attempted to update non-existent batch at index ${batchIdx}.`);
        }
      }
      currentItem.batches = updatedBatches;
      updatedItems[selectedBatchItemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, [selectedBatchItemIndex]);
  const addBatchEntry = useCallback(() => {
    setPurchaseInvoiceData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      const currentBatches = ArrayOf(currentItem.batches);
      const lastEntry = currentBatches[currentBatches.length - 1];
      if (lastEntry && (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
          (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)) {
        toast.warn("Please fill the current empty batch entry before adding a new one.");
        return { ...prev, items: updatedItems };
      }
      currentBatches.push({ id: generateUniqueId(), batchNumber: "", expiryDate: "", manufacturer: "", batchQuantity: 0 });
      currentItem.batches = currentBatches;
      updatedItems[selectedBatchItemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, [selectedBatchItemIndex]);

  // summary calculation
  useEffect(() => {
    const totalBeforeDiscountCalc = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstTotalCalc = purchaseInvoiceData.items.reduce(
      (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : ((it.cgstAmount || 0) + (it.sgstAmount || 0))), 0
    );
    const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
    setSummary({
      totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
      gstTotal: gstTotalCalc.toFixed(2),
      grandTotal: grandTotalCalc.toFixed(2),
    });
  }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

  // save handler
  const handleSavePurchaseInvoice = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Unauthorized: Please log in"); setLoading(false); return; }

      if (!purchaseInvoiceData.supplier && !purchaseInvoiceData.supplierName) {
        toast.error("Please select a supplier or auto-fill one with OCR.");
        setLoading(false); return;
      }

      const invalidItems = purchaseInvoiceData.items.some(it => (!it.item && !it.itemDescription) || (Number(it.quantity) || 0) <= 0);
      if (purchaseInvoiceData.items.length === 0 || (purchaseInvoiceData.items.length === 1 && invalidItems)) {
        toast.error("Please add at least one valid item with (Item or Description) and Quantity > 0."); setLoading(false); return;
      }

      // batch validations, PO qty checks etc.
      for (const [idx, item] of purchaseInvoiceData.items.entries()) {
        if (item.managedBy?.toLowerCase() === "batch") {
          const batches = Array.isArray(item.batches) ? item.batches : [];
          const totalBatchQty = batches.reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
          if (totalBatchQty !== Number(item.quantity)) {
            toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch qty (${totalBatchQty}) does not match the item's qty (${item.quantity}).`); setLoading(false); return;
          }
          const invalidBatchEntry = batches.some(b => !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0);
          if (invalidBatchEntry) { toast.error(`Item ${item.itemName} (Row ${idx + 1}): Invalid batch entry.`); setLoading(false); return; }
        }
      }

      if (ocrGrandTotal && ocrGrandTotal !== summary.grandTotal) {
        toast.warn(`Warning: Calculated total (${summary.grandTotal}) does not match invoice total (${ocrGrandTotal}).`);
      }

      const itemsForSubmission = purchaseInvoiceData.items.map(it => ({
        ...it, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0, freight: Number(it.freight) || 0,
        gstRate: Number(it.gstRate) || 0, igstRate: Number(it.igstRate) || 0,
        cgstRate: Number(it.cgstRate) || 0, sgstRate: Number(it.sgstRate) || 0,
        managedByBatch: it.managedBy?.toLowerCase() === 'batch',
        batches: (it.batches || []).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
      }));

      const { attachments: _, ...restData } = purchaseInvoiceData;
      const payload = { ...restData, invoiceType: purchaseInvoiceData.invoiceType, items: itemsForSubmission, freight: Number(restData.freight) || 0, rounding: Number(restData.rounding) || 0, ...summary };
      const formData = new FormData();
      formData.append("invoiceData", JSON.stringify(payload));
      if (removedFiles.length > 0) formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
      if (existingFiles.length > 0) formData.append("existingFiles", JSON.stringify(existingFiles));
      attachments.forEach(file => formData.append("newAttachments", file));
      const url = isEdit ? `/api/purchaseInvoice/${editId}` : "/api/purchaseInvoice";
      const method = isEdit ? "put" : "post";
      const response = await axios({ method, url, data: formData, headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" } });
      const savedInvoice = response?.data?.data || response?.data;
      if (!savedInvoice) throw new Error(`Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
      toast.success(isEdit ? "Purchase Invoice updated successfully" : "Purchase Invoice saved successfully");
      router.push(`/admin/purchaseInvoice-view`);
    } catch (err) {
      console.error("Error saving purchase invoice:", err);
      toast.error(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
    } finally {
      setLoading(false);
    }
  }, [purchaseInvoiceData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router, ocrGrandTotal]);

  /* ---------- OCR helpers ---------- */
const extractPdfText = useCallback(async (pdfData) => {
  try {
    if (!pdfjsLib) {
      toast.error("PDF library not loaded yet");
      return "";
    }

    const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
    let textContent = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map((item) => item.str).join(" ");
      textContent += strings + "\n";
    }

    return textContent;

  } catch (error) {
    console.error("PDF Text Extraction Error:", error);
    toast.error("Failed to extract text from PDF.");
    return "";
  }
}, [pdfjsLib]);



  const extractImageText = useCallback(async (imageFile) => {
    try {
      const result = await Tesseract.recognize(imageFile, "eng");
      return result.data.text;
    } catch (error) {
      console.error("OCR Error:", error);
      toast.error("OCR failed to read image.");
      return "";
    }
  }, []);
   
function findMatch(label, cleanText = "") {
  if (!cleanText || typeof cleanText !== "string") return null;

  const pattern = new RegExp(`${label}[:\\-]?\\s*(.*?)\\s(?=[A-Z]|$)`, "i");
  const match = cleanText.match(pattern);

  return match && match[1] ? match[1].trim() : null;
}


const extractInvoiceFields = async (text) => {
  if (!text) {
    toast.warn("OCR text is empty");
    return;
  }

  const cleanText = text.replace(/[\t\s]+/g, " ");

  /* ✅ -------------------------
       EXTRACT SUPPLIER NAME
     ------------------------- */
  let supplierName = null;
  const nameMatch = cleanText.match(/Supplier Name[:\-]?\s*([A-Za-z ]+)/i);
  if (nameMatch) supplierName = nameMatch[1].trim();


  /* ✅ -------------------------
       EXTRACT SUPPLIER CODE
     ------------------------- */
  let supplierCode = null;

  // ✅ Match: SUPP-0001 or SUPP 0001 or SUPP-0001 etc
  const supplierCodeMatch = cleanText.match(/SUPP[\s\-]*\d+/i);
  if (supplierCodeMatch) {
    supplierCode = supplierCodeMatch[0].replace(/\s+/g, "").toUpperCase(); // SUPP-0001
  }

  console.log("✅ Extracted supplierName:", supplierName);
  console.log("✅ Extracted supplierCode:", supplierCode);


  /* ✅ -------------------------
       STRICT SUPPLIER MATCH
     ------------------------- */
  if (supplierCode || supplierName) {
    const supplier = await lookupSupplier({ code: supplierCode, name: supplierName });

    if (!supplier) {
      toast.error("❌ Supplier not found in DB");
      throw new Error("SUPPLIER_NOT_FOUND");
    }

    setPurchaseInvoiceData((prev) => ({
      ...prev,
      supplier: supplier._id,
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      contactPerson: supplier.contactPersonName || "",
     
    }));

    toast.success(`✅ Supplier matched: ${supplier.supplierName}`);
  }



  /* ✅ -------------------------
       SMART DATE EXTRACTION
   (Supports Inline + Next-Line)
   ------------------------- */

function extractSmartDate(label, text) {
  console.log(`\n===========================`);
  console.log(`📌 Extracting: ${label}`);
  console.log(`===========================`);

  let match;

  // ✅ 1) Inline format
  // Posting Date: Sep 25 2025
  const inlineRegex = new RegExp(`${label}[:\\-]?\\s*([A-Za-z0-9 ,/\\-]+)`, "i");
  match = text.match(inlineRegex);
  console.log("🔍 Inline Match:", match);
  if (match && match[1]) return match[1].trim();

  // ✅ 2) Next line format
  // Posting Date
  // 25/09/2025
  const nextLineRegex = new RegExp(
    `${label}\\s*\n\\s*([0-9]{1,2}[\\/\\-][0-9]{1,2}[\\/\\-][0-9]{2,4})`,
    "i"
  );
  match = text.match(nextLineRegex);
  console.log("🔍 Next-Line Match:", match);
  if (match && match[1]) return match[1].trim();

  // ✅ 3) OCR merged text (space instead of newline)
  // "Posting Date 25/09/2025"
  const mergedRegex = new RegExp(
    `${label}\\s+([0-9]{1,2}[\\/\\-][0-9]{1,2}[\\/\\-][0-9]{2,4})`,
    "i"
  );
  match = text.match(mergedRegex);
  console.log("🔍 Merged Match:", match);
  if (match && match[1]) return match[1].trim();

  console.warn(`⚠️ No ${label} found.`);
  return null;
}

/* ✅ USE SMART DATE EXTRACTOR */
const postingDate = extractSmartDate("Posting Date", cleanText);
const documentDate = extractSmartDate("Document Date", cleanText);
const dueDate = extractSmartDate("Due Date", cleanText);

/* ✅ Apply date values */
setPurchaseInvoiceData((prev) => ({
  ...prev,
  postingDate: postingDate ? formatDateForInput(postingDate) : prev.postingDate,
  documentDate: documentDate ? formatDateForInput(documentDate) : prev.documentDate,
  dueDate: dueDate ? formatDateForInput(dueDate) : prev.dueDate,
}));





  /* ✅ -------------------------
       FETCH ITEMS FROM API
     ------------------------- */
  const res = await axios.post(
    "/api/extract-items",
    { ocrText: text },
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );

  let items = res.data?.items || [];

  if (!items.length) {
    toast.error("❌ No items detected in OCR");
    return;
  }

  const finalItems = [];


  /* ✅ -------------------------
       VALIDATE + BUILD ITEMS
     ------------------------- */
  for (const raw of items) {
    let itemCode = (raw.itemCode || "").trim().toUpperCase();
    const qty = Number(raw.quantity) || 1;

    if (!itemCode) {
      toast.error("❌ OCR detected row WITHOUT itemCode");
      continue; // ✅ skip row instead of throwing error
    }

    /* ✅ Lookup item strictly using itemCode */
    const master = await lookupItem({ code: itemCode });

    if (!master) {
      toast.error(`❌ Item not found in DB: ${itemCode}`);
      continue; // ✅ skip instead of throwing
    }


    /* ✅ Build item strictly using DB values */
    const filled = {
      ...initialPurchaseInvoiceState.items[0],

      id: generateUniqueId(),
      item: master._id,

      itemCode: master.itemCode,
      itemName: master.itemName,
      itemDescription: master.description || master.itemName,

      quantity: qty,
      unitPrice: Number(master.unitPrice),

      gstRate: Number(master.gstRate),
      taxOption: "GST",

      warehouse: master.warehouse || "",
      warehouseCode: master.warehouseCode || "",
      warehouseName: master.warehouseName || "",

      managedBy: master.managedBy || "",
      binLocations: [],
    };

    finalItems.push({
      ...filled,
      ...computeItemValuesForm(filled),
    });
  }


  /* ✅ -------------------------
       UPDATE FORM IF ANY ITEMS VALID
     ------------------------- */
  if (finalItems.length === 0) {
    toast.error("❌ No valid items could be mapped to DB.");
    return;
  }

  setPurchaseInvoiceData((prev) => ({
    ...prev,
    items: finalItems,
  }));

  toast.success(`✅ Auto-filled ${finalItems.length} item(s) using ITEM-CODES`);
};


  const handleOcrFileSelect = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setOcrExtracting(true);
    setOcrGrandTotal(null);
    setPurchaseInvoiceData(initialPurchaseInvoiceState);
    toast.info(`Processing ${file.name}...`);
    const reader = new FileReader();
    reader.onload = async () => {
      let text = "";
      try {
        const data = new Uint8Array(reader.result);
        if (file.type === "application/pdf") text = await extractPdfText(data);
        else if (file.type.startsWith("image/")) text = await extractImageText(file);
        else { toast.error("Unsupported file type"); setOcrExtracting(false); return; }
        if (text) { toast.success("Text extracted, parsing..."); await extractInvoiceFields(text); }
        else toast.warn("No text extracted.");
      } catch (err) {
        console.error("OCR error:", err);
        toast.error("OCR failed.");
        setPurchaseInvoiceData(initialPurchaseInvoiceState);
      } finally {
        setOcrExtracting(false);
        e.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // remove existing file
  const removeExistingFile = (idx) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx));
    setRemovedFiles(prev => [...prev, existingFiles[idx]]);
  };

  /* ---------- UI ---------- */
  return (
    <div ref={parentRef} className="p-6">
      <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

      {/* Supplier & Document */}
      <div className="flex flex-wrap justify-between border rounded-lg shadow-lg p-4 mb-4">
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input name="supplierCode" value={purchaseInvoiceData.supplierCode || ""} onChange={handleInputChange} className="w-full p-2 border rounded bg-gray-50" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            {purchaseInvoiceData.supplier ? (
              <input readOnly value={purchaseInvoiceData.supplierName} className="w-full p-2 border rounded bg-gray-100" />
            ) : (
              <>
                <input name="supplierName" value={purchaseInvoiceData.supplierName} onChange={handleInputChange} className="w-full p-2 border rounded bg-gray-50" placeholder="Supplier Name (OCR or manual)" />
                <div className="mt-2">
                  <span className="text-sm text-gray-600">Or search: </span>
                  <SupplierSearch onSelectSupplier={handleSupplierSelect} />
                </div>
              </>
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input name="contactPerson" value={purchaseInvoiceData.contactPerson || ""} onChange={handleInputChange} className="w-full p-2 border rounded bg-gray-50" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Number</label>
            <input name="refNumber" value={purchaseInvoiceData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          {purchaseInvoiceData.purchaseOrderId && <div><label className="block mb-2 font-medium">Linked Purchase Order ID</label><input readOnly value={purchaseInvoiceData.purchaseOrderId} className="w-full p-2 border rounded bg-gray-100" /></div>}
          {purchaseInvoiceData.goodReceiptNoteId && <div><label className="block mb-2 font-medium">Linked GRN ID</label><input readOnly value={purchaseInvoiceData.goodReceiptNoteId} className="w-full p-2 border rounded bg-gray-100" /></div>}
        </div>

        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select name="status" value={purchaseInvoiceData.status} onChange={handleInputChange} className="w-full p-2 border rounded">
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
              <option value="Partial_Paid">Partial Paid</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input type="date" name="postingDate" value={formatDateForInput(purchaseInvoiceData.postingDate) || formatDateForInput(new Date())} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input type="date" name="documentDate" value={formatDateForInput(purchaseInvoiceData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
          <div>
            <label className="block mb-2 font-medium">Due Date</label>
            <input type="date" name="dueDate" value={formatDateForInput(purchaseInvoiceData.dueDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
          </div>
        </div>
      </div>

      {/* Items (imported component) */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-4 p-4 border rounded-lg shadow-lg">
        <ItemSection
          items={purchaseInvoiceData.items}
          onItemChange={(i, e) => handleItemChange(i, e)}
          onAddItem={addItemRow}
          onRemoveItem={removeItemRow}
          onItemSelect={(i, sku) => handleItemSelect(i, sku)} // pass-in for ItemSection if it supports external selection callback
        />
      </div>

      {/* Batch details */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
        {purchaseInvoiceData.items.map((item, index) =>
          item.item && item.itemCode && item.itemName && item.managedBy &&
          item.managedBy.trim().toLowerCase() === "batch" ? (
            <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
              <div>
                <strong>{item.itemCode} - {item.itemName}</strong>
                <span className="ml-2 text-sm text-gray-600">(Qty: {item.quantity})</span>
                <span className="ml-4 text-sm font-medium">
                  Allocated: {(ArrayOf(item.batches)).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0)} / {item.quantity}
                </span>
              </div>
              <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
                Set Batch Details
              </button>
            </div>
          ) : null
        )}
      </div>

      {showBatchModal && selectedBatchItemIndex !== null && (
        <BatchModal
          batches={purchaseInvoiceData.items[selectedBatchItemIndex].batches}
          onBatchEntryChange={handleBatchEntryChange} onAddBatchEntry={addBatchEntry}
          onClose={closeBatchModal}
          itemCode={purchaseInvoiceData.items[selectedBatchItemIndex].itemCode}
          itemName={purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
          unitPrice={purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
        />
      )}

      {/* Freight & rounding */}
      <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
        <div>
          <label className="block mb-1 font-medium">Freight</label>
          <input name="freight" type="number" value={purchaseInvoiceData.freight || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Rounding</label>
          <input name="rounding" type="number" value={purchaseInvoiceData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div>
          <label className="block mb-1 font-medium">Total Before Discount</label>
          <input readOnly value={summary.totalBeforeDiscount} className="w-full p-2 border bg-gray-100 rounded" />
        </div>
        <div>
          <label className="block mb-1 font-medium">GST Total</label>
          <input readOnly value={summary.gstTotal} className="w-full p-2 border bg-gray-100 rounded" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Grand Total (Calculated)</label>
          <input readOnly value={summary.grandTotal} className="w-full p-2 border bg-gray-100 rounded" />
        </div>
        <div>
          <label className="block mb-1 font-medium text-blue-600">Grand Total (from OCR)</label>
          <input readOnly value={ocrGrandTotal ? `₹${ocrGrandTotal}` : "N/A"} className={`w-full p-2 border-2 bg-gray-100 rounded ${ocrGrandTotal && summary.grandTotal !== "0.00" && ocrGrandTotal !== summary.grandTotal ? "border-red-500" : "border-gray-200"}`} />
        </div>
      </div>

      {/* Sales & remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded mb-4">
        <div>
          <label className="block mb-1 font-medium">Sales Employee</label>
          <input name="salesEmployee" value={purchaseInvoiceData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Remarks</label>
          <textarea name="remarks" value={purchaseInvoiceData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
        </div>
      </div>

      {/* Attachments */}
      <div className="mt-6 p-4 border rounded mb-4">
        <label className="font-medium block mb-2">Attachments</label>
        {existingFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {existingFiles.map((file, idx) => {
              const url = file.fileUrl || file.url || file.path || "";
              if (!url) return null;
              const isPDF = (file.fileType || "").toLowerCase() === "application/pdf" || url.toLowerCase().endsWith(".pdf");
              const name = file.fileName || url.split("/").pop() || `File-${idx}`;
              return (
                <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
                  {isPDF ? <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> : <img src={url} alt={name} className="h-24 w-full object-cover rounded" />}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate hover:underline">{name}</a>
                  <button onClick={() => removeExistingFile(idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs">×</button>
                </div>
              );
            })}
          </div>
        )}
        <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
          const files = Array.from(e.target.files || []);
          setAttachments(prev => {
            const map = new Map(prev.map((f) => [f.name + f.size, f]));
            files.forEach(f => map.set(f.name + f.size, f));
            return [...map.values()];
          });
          e.target.value = "";
        }} className="border px-3 py-2 w-full rounded" />
        {attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {attachments.map((file, idx) => (
              <div key={idx} className="relative border p-2 rounded bg-white">
                <div className="truncate text-xs">{file.name}</div>
                <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 text-red-600">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* OCR upload */}
      <div className="flex flex-col mb-4 border p-3 rounded bg-gray-50">
        <label className="font-semibold mb-1">Upload Invoice (Image or PDF) to Auto-Fill</label>
        <input type="file" accept="image/*,application/pdf" onChange={handleOcrFileSelect} className="p-2 border rounded" disabled={ocrExtracting} />
        {ocrExtracting && <p className="text-blue-500 text-sm mt-1">🔍 Extracting text, please wait...</p>}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-4 p-4 border rounded shadow-sm">
        <button onClick={handleSavePurchaseInvoice} disabled={loading || ocrExtracting} className={`px-4 py-2 rounded text-white ${loading || ocrExtracting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"}`}>
          {loading ? "Saving..." : isEdit ? "Update Invoice" : "Submit Invoice"}
        </button>
        <button onClick={() => {
          setPurchaseInvoiceData(initialPurchaseInvoiceState);
          setAttachments([]); setExistingFiles([]); setRemovedFiles([]);
          setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
          setOcrGrandTotal(null);
          router.push(`/admin/purchaseInvoice-view`);

        }} className="px-4 py-2 bg-green-600 text-white rounded">Cancel</button>
      </div>

      <ToastContainer />
    </div>
  );
}

export default PurchaseInvoiceFormWrapper;





// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import SupplierSearch from "@/components/SupplierSearch";
// import ItemSection from "@/components/ItemSection"; // Assuming this component is correctly implemented
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Tesseract from "tesseract.js";
// import * as pdfjsLib from "pdfjs-dist/build/pdf";

// // ✅ Proper PDF.js worker setup
// if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
//   pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
//   pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = "/pdfjs/standard_fonts/";
// }

// // Helper to generate unique IDs
// const generateUniqueId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
// };

// // Helper to ensure a variable is an array
// const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// // Initial Purchase Invoice state
// const initialPurchaseInvoiceState = {
//   supplier: "",
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Pending",
//   postingDate: "",
//   documentDate: "",
//   dueDate: "",
//   items: [
//     {
//       item: "", itemCode: "", itemName: "", itemDescription: "",
//       quantity: 0, unitPrice: 0, discount: 0,
//       freight: 0,
//       gstRate: 0, igstRate: 0, cgstRate: 0, sgstRate: 0,
//       taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
//       gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
//       managedBy: "", batches: [], errorMessage: "",
//       warehouse: "", warehouseCode: "", warehouseName: "",
//     },
//   ],
//   salesEmployee: "", remarks: "", freight: 0, rounding: 0,
//   totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
//   purchaseOrderId: "", goodReceiptNoteId: "",
//   sourceType: "", sourceId: "", attachments: [],
// };

// // Helper to format date
// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   let d;
//   if (dateStr.includes('/')) {
//     const parts = dateStr.split('/');
//     if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
//   } else if (dateStr.includes('-')) {
//     const parts = dateStr.split('-');
//     if (parts.length === 3) {
//       if (parts[0].length === 4) d = new Date(dateStr); // YYYY-MM-DD
//       else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY
//     }
//   } else {
//     d = new Date(dateStr);
//   }
//   if (!d || isNaN(d.getTime())) {
//     console.warn("Invalid date string passed to formatDateForInput:", dateStr);
//     return "";
//   }
//   return d.toISOString().slice(0, 10);
// }

// // ---------- 🔒 STRICT OCR VALIDATION HELPERS ----------
// const getAuthHeaders = () => {
//   const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };

// /**
//  * Try multiple supplier endpoints to find an exact supplier by code or name (case-insensitive exact match).
//  * Returns supplier object ({ _id, supplierCode, supplierName, contactPersonName, ... }) or null.
//  */
// async function lookupSupplier({ code, name }) {
//   const headers = getAuthHeaders();
//   const tryCalls = [];
//   if (code) tryCalls.push(() => axios.get(`/api/suppliers/by-code/${encodeURIComponent(code)}`, { headers }));
//   if (name) tryCalls.push(() => axios.get(`/api/suppliers/search`, { headers, params: { q: name } }));
//   if (code || name) tryCalls.push(() => axios.get(`/api/suppliers/lookup`, { headers, params: { code, name } }));

//   for (const call of tryCalls) {
//     try {
//       const res = await call();
//       const data = res?.data?.data || res?.data;
//       if (!data) continue;
//       const list = Array.isArray(data) ? data : [data];
//       const found = list.find((s) => {
//         const codeMatch = code ? (String(s.supplierCode || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : false;
//         const nameMatch = name ? (String(s.supplierName || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : false;
//         return (code && codeMatch) || (name && nameMatch);
//       }) || (Array.isArray(data) ? null : data);
//       if (found && (code ? String(found.supplierCode || '').toLowerCase() === String(code).toLowerCase() : true) && (name ? String(found.supplierName || '').toLowerCase() === String(name).toLowerCase() : true)) {
//         return found;
//       }
//     } catch (e) {
//       // keep trying other endpoints
//     }
//   }
//   return null;
// }

// /**
//  * Find an item by exact code or exact name (case-insensitive).
//  * Returns an item object or null.
//  */
// async function lookupItem({ code, name }) {
//   const headers = getAuthHeaders();
//   const calls = [];
//   if (code) calls.push(() => axios.get(`/api/items/by-code/${encodeURIComponent(code)}`, { headers }));
//   if (name) calls.push(() => axios.get(`/api/items/search`, { headers, params: { q: name } }));
//   if (code || name) calls.push(() => axios.get(`/api/items/lookup`, { headers, params: { code, name } }));

//   for (const call of calls) {
//     try {
//       const res = await call();
//       const data = res?.data?.data || res?.data;
//       if (!data) continue;
//       const list = Array.isArray(data) ? data : [data];
//       const found = list.find((it) => {
//         const codeMatch = code ? (String(it.itemCode || '').trim().toLowerCase() === String(code).trim().toLowerCase()) : false;
//         const nameMatch = name ? (String(it.itemName || '').trim().toLowerCase() === String(name).trim().toLowerCase() || String(it.description || '').trim().toLowerCase() === String(name).trim().toLowerCase()) : false;
//         return (code && codeMatch) || (name && nameMatch);
//       }) || (Array.isArray(data) ? null : data);
//       if (found) return found;
//     } catch (e) {
//       // try next
//     }
//   }
//   return null;
// }

// // BatchModal component
// function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
//   const currentBatches = ArrayOf(batches);
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg max-w-lg w-full">
//         <h2 className="text-xl font-semibold mb-2">
//           Batch Details for {itemCode || 'Selected Item'} - {itemName || 'N/A'}
//         </h2>
//         <p className="mb-4 text-sm text-gray-600">Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : '0.00'}</p>
//         {currentBatches.length > 0 ? (
//           <table className="w-full table-auto border-collapse mb-4">
//             <thead>
//               <tr className="bg-gray-200">
//                 <th className="border p-2 text-left text-sm">Batch Number</th>
//                 <th className="border p-2 text-left text-sm">Expiry Date</th>
//                 <th className="border p-2 text-left text-sm">Manufacturer</th>
//                 <th className="border p-2 text-left text-sm">Quantity</th>
//                 <th className="border p-2 text-left text-sm">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentBatches.map((batch, idx) => (
//                 <tr key={batch.id}>
//                   <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td>
//                   <td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td>
//                   <td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td>
//                   <td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td>
//                   <td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="mb-4 text-gray-500">No batch entries yet. Click "Add Batch Entry" to add one.</p>
//         )}
//         <button type="button" onClick={onAddBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600">
//           Add Batch Entry
//         </button>
//         <div className="flex justify-end gap-2">
//           <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//             Done
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function PurchaseInvoiceFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading purchase invoice form data...</div>}>
//       <PurchaseInvoiceForm />
//     </Suspense>
//   );
// }

// function PurchaseInvoiceForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId");
//   const isEdit = Boolean(editId);

//   const parentRef = useRef(null);
//   const [purchaseInvoiceData, setPurchaseInvoiceData] = useState(initialPurchaseInvoiceState);
//   const [strictOcrValidation] = useState(true); // 🔒 keep true to enforce supplier & item existence before applying OCR
  
//   const computeItemValues = useCallback((it) => {
//     const q = Number(it.quantity) || 0;
//     const up = Number(it.unitPrice) || 0;
//     const dis = Number(it.discount) || 0;
//     const fr = Number(it.freight) || 0;
//     const net = up - dis;
//     const tot = net * q + fr;
//     let cg = 0, sg = 0, ig = 0, gstAmt = 0;
//     if (it.taxOption === "IGST") {
//       const rate = Number(it.igstRate || it.gstRate) || 0;
//       ig = (tot * rate) / 100;
//       gstAmt = ig;
//     } else {
//       const rate = Number(it.gstRate) || 0;
//       const half = rate / 2;
//       cg = (tot * half) / 100;
//       sg = cg;
//       gstAmt = cg + sg;
//     }
//     return { priceAfterDiscount: net, totalAmount: tot, cgstAmount: cg, sgstAmount: sg, gstAmount: gstAmt, igstAmount: ig };
//   }, []);

//   const [summary, setSummary] = useState({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [attachments, setAttachments] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [ocrExtracting, setOcrExtracting] = useState(false);
//   const [ocrGrandTotal, setOcrGrandTotal] = useState(null);

//   // Effect to load data from Session Storage
//   useEffect(() => {
//     const grnDataForInvoice = sessionStorage.getItem("grnData");
//     const purchaseInvoiceCopyData = sessionStorage.getItem("purchaseInvoiceData");
//     if (!grnDataForInvoice && !purchaseInvoiceCopyData) return;
//     const loadSourceData = () => {
//       try {
//         const sourceDoc = grnDataForInvoice ? JSON.parse(grnDataForInvoice) : JSON.parse(purchaseInvoiceCopyData);
//         const sourceType = grnDataForInvoice ? "GRN" : "PurchaseInvoice";
//         const supplierId = sourceDoc.supplier?._id || sourceDoc.supplier || "";
//         const supplierCode = sourceDoc.supplier?.supplierCode || sourceDoc.supplierCode || "";
//         const supplierName = sourceDoc.supplier?.supplierName || sourceDoc.supplierName || "";
//         const contactPerson = sourceDoc.supplier?.contactPersonName || sourceDoc.contactPerson || "";
//         const preparedItems = (sourceDoc.items || []).map((item) => {
//           const quantityToInvoice = (sourceType === "GRN" ? Number(item.quantity) : Number(item.quantity)) || 0;
//           const baseItem = {
//             ...initialPurchaseInvoiceState.items[0],
//             item: item.item?._id || item.item || "",
//             itemCode: item.itemCode || "", itemName: item.itemName || "",
//             itemDescription:  item.itemDescription || item.description || item.itemDescription  ||  "",
//             quantity: quantityToInvoice, unitPrice: Number(item.unitPrice || item.price) || 0,
//             discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
//             gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
//             cgstRate: Number(item.cgstRate) || 0, sgstRate: Number(item.sgstRate) || 0,
//             taxOption: item.taxOption || "GST", managedBy: item.managedBy || "none",
//             batches: Array.isArray(item.batches)
//               ? item.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) })) : [],
//             warehouse: item.warehouse || "", warehouseCode: item.warehouseCode || "",
//             warehouseName: item.warehouseName || "",
//           };
//           return { ...baseItem, ...computeItemValues(baseItem) };
//         });
//         setExistingFiles(sourceDoc.attachments || []);
//         setPurchaseInvoiceData((prev) => ({
//           ...prev, supplier: supplierId, supplierCode: supplierCode, supplierName: supplierName,
//           contactPerson: contactPerson, refNumber: sourceDoc.refNumber || "", status: "Pending",
//           postingDate: formatDateForInput(new Date()), documentDate: formatDateForInput(new Date()),
//           dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
//           items: preparedItems, salesEmployee: sourceDoc.salesEmployee || "",
//           remarks: sourceDoc.remarks || "", freight: Number(sourceDoc.freight) || 0,
//           rounding: Number(sourceDoc.rounding) || 0, purchaseOrderId: sourceDoc.purchaseOrderId || "",
//           goodReceiptNoteId: sourceDoc._id || "", sourceType: sourceType, sourceId: sourceDoc._id,
//           invoiceType: sourceDoc.invoiceType || (sourceType === "GRN" ? "GRNCopy" : "Normal"),
//         }));
//         toast.success(`✅ ${sourceType === "GRN" ? "GRN" : "Purchase Invoice"} loaded successfully`);
//       } catch (err) {
//         console.error("Error parsing source data for PI:", err);
//         toast.error("Failed to load data for Purchase Invoice.");
//       } finally {
//         sessionStorage.removeItem("grnDataForInvoice");
//         sessionStorage.removeItem("purchaseInvoiceData");
//       }
//     };
//     loadSourceData();
//   }, [computeItemValues]);

//   // Effect to fetch Purchase Invoice data for edit mode
//   useEffect(() => {
//     if (!isEdit || !editId) return;
//     const fetchPurchaseInvoice = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Unauthorized! Please login again."); setLoading(false); return;
//         }
//         const res = await axios.get(`/api/purchaseInvoice/${editId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           const rec = res.data.data;
//           setPurchaseInvoiceData((prev) => ({
//             ...prev, ...rec,
//             postingDate: formatDateForInput(rec.postingDate),
//             documentDate: formatDateForInput(rec.documentDate),
//             dueDate: formatDateForInput(rec.dueDate),
//             supplier: rec.supplier?._id || rec.supplier || "",
//             supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
//             supplierName: rec.supplier?.supplierName || rec.supplierName || "",
//             contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
//             items: ArrayOf(rec.items).map(item => {
//               const baseItem = {
//                 ...initialPurchaseInvoiceState.items[0], ...item,
//                 batches: Array.isArray(item.batches) ? item.batches.map(b => ({
//                   id: b.id || b._id || generateUniqueId(), ...b,
//                   expiryDate: formatDateForInput(b.expiryDate)
//                 })) : [],
//                 itemDescription: item.itemDescription || "",
//                 quantity: Number(item.quantity) || 0, unitPrice: Number(item.unitPrice) || 0,
//                 discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
//                 gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
//                 cgstRate: Number(item.cgstRate) || 0, sgstRate: Number(item.sgstRate) || 0,
//               };
//               return { ...baseItem, ...computeItemValues(baseItem) };
//             })
//           }));
//           setExistingFiles(rec.attachments || []);
//           setAttachments([]);
//           setRemovedFiles([]);
//         } else {
//           toast.error(res.data.error || "Failed to load Purchase Invoice");
//         }
//       } catch (err) {
//         console.error("Error loading Purchase Invoice:", err);
//         toast.error(err.response?.data?.error || "Error loading Purchase Invoice");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchPurchaseInvoice();
//   }, [isEdit, editId, computeItemValues]);

//   // Form input handlers
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const handleSupplierSelect = useCallback((s) => {
//     setPurchaseInvoiceData((p) => ({
//       ...p, supplier: s._id, supplierCode: s.supplierCode,
//       supplierName: s.supplierName, contactPerson: s.contactPersonName,
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: [...p.items, { ...initialPurchaseInvoiceState.items[0] }] }));
//   }, []);

//   const removeItemRow = useCallback((i) => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   const handleItemChange = useCallback((i, e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => {
//       const items = [...p.items];
//       items[i] = {
//         ...items[i],
//         [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate"].includes(name)
//           ? Number(value) || 0 : value,
//       };
//       items[i] = { ...items[i], ...computeItemValues(items[i]) };
//       return { ...p, items };
//     });
//   }, [computeItemValues]);

//   const handleItemSelect = useCallback(async (i, sku) => {
//     let managedByValue = sku.managedBy || "";
//     if (!managedByValue || managedByValue.trim() === "") {
//       try {
//         const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//         managedByValue = res.data.success ? res.data.data.managedBy : "";
//       } catch (error) {
//         console.error("Error fetching item master details for managedBy:", error); managedByValue = "";
//       }
//     }
//     const base = {
//       item: sku._id, itemCode: sku.itemCode, itemName: sku.itemName,
//       itemDescription: sku.description || "", quantity: 1,
//       unitPrice: Number(sku.unitPrice) || 0, discount: Number(sku.discount) || 0,
//       freight: Number(sku.freight) || 0, gstRate: Number(sku.gstRate) || 0,
//       igstRate: Number(sku.igstRate) || 0, taxOption: sku.taxOption || "GST",
//       managedBy: managedByValue,
//       batches: managedByValue.toLowerCase() === "batch" ? [] : [],
//       warehouse: sku.warehouse || "", warehouseCode: sku.warehouse || "",
//       warehouseName: sku.warehouseName || "",
//     };
//     setPurchaseInvoiceData((p) => {
//       const items = [...p.items];
//       items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValues(base) };
//       return { ...p, items };
//     });
//   }, [computeItemValues]);

//   // Batch modal handlers
//   const openBatchModal = useCallback((itemIndex) => {
//     const currentItem = purchaseInvoiceData.items[itemIndex];
//     if (!currentItem.itemCode || !currentItem.itemName) {
//       toast.warn("Please select an Item (with Code and Name) before setting batch details."); return;
//     }
//     if (!currentItem.item || !currentItem.warehouse) {
//       toast.warn("Please select an Item and a Warehouse for this line item before setting batch details."); return;
//     }
//     if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
//       toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`); return;
//     }
//     setSelectedBatchItemIndex(itemIndex);
//     setShowBatchModal(true);
//   }, [purchaseInvoiceData.items]);
//   const closeBatchModal = useCallback(() => { setShowBatchModal(false); setSelectedBatchItemIndex(null); }, []);
//   const handleBatchEntryChange = useCallback((batchIdx, field, value) => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const updatedBatches = ArrayOf(currentItem.batches);
//       if (field === 'remove') {
//         updatedBatches.splice(batchIdx, 1);
//       } else {
//         if (updatedBatches[batchIdx]) { 
//             const finalValue = (field === "batchQuantity" && isNaN(value)) ? 0 : value;
//             const updatedBatch = { ...updatedBatches[batchIdx], [field]: finalValue };
//             updatedBatches[batchIdx] = updatedBatch;
//         } else { console.error(`Attempted to update non-existent batch at index ${batchIdx}.`); }
//       }
//       currentItem.batches = updatedBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);
//   const addBatchEntry = useCallback(() => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const currentBatches = ArrayOf(currentItem.batches);
//       const lastEntry = currentBatches[currentBatches.length - 1];
//       if (lastEntry && (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
//           (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)) {
//         toast.warn("Please fill the current empty batch entry before adding a new one.");
//         return { ...prev, items: updatedItems };
//       }
//       currentBatches.push({
//         id: generateUniqueId(), batchNumber: "", expiryDate: "",
//         manufacturer: "", batchQuantity: 0,
//       });
//       currentItem.batches = currentBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);

//   // Effect to calculate summary totals
//   useEffect(() => {
//     const totalBeforeDiscountCalc = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
//     const gstTotalCalc = purchaseInvoiceData.items.reduce(
//       (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : ((it.cgstAmount || 0) + (it.sgstAmount || 0))), 0
//     );
//     const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
//     setSummary({
//       totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
//       gstTotal: gstTotalCalc.toFixed(2),
//       grandTotal: grandTotalCalc.toFixed(2),
//     });
//   }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

//   // Handle Save Purchase Invoice
//   const handleSavePurchaseInvoice = useCallback(async () => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       if (!token) { toast.error("Unauthorized: Please log in"); setLoading(false); return; }

//       // Validation: Check for supplier ID *or* supplier name
//       if (!purchaseInvoiceData.supplier && !purchaseInvoiceData.supplierName) {
//         toast.error("Please select a supplier or auto-fill one with OCR.");
//         setLoading(false);
//         return;
//       }

//       const invalidItems = purchaseInvoiceData.items.some(it => 
//           // Allow saving if item name was from OCR but not linked to an ID
//           (!it.item && !it.itemDescription) || (Number(it.quantity) || 0) <= 0
//       );
//       if (purchaseInvoiceData.items.length === 0 || (purchaseInvoiceData.items.length === 1 && invalidItems)) {
//         toast.error("Please add at least one valid item with (Item or Description) and Quantity > 0."); setLoading(false); return;
//       }
      
//       if (purchaseInvoiceData.purchaseOrderId) {
//         for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//           const allowedQty = Number(item.allowedQuantity) || 0;
//           if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
//             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Quantity (${item.quantity}) exceeds allowed (${allowedQty}) as per PO.`); setLoading(false); return;
//           }
//         }
//       }
//       for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//         if (item.managedBy?.toLowerCase() === "batch") {
//           const batches = Array.isArray(item.batches) ? item.batches : [];
//           const totalBatchQty = batches.reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
//           if (totalBatchQty !== Number(item.quantity)) {
//             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch qty (${totalBatchQty}) does not match the item's qty (${item.quantity}).`); setLoading(false); return;
//           }
//           if (totalBatchQty === 0 && Number(item.quantity) > 0) {
//             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches entered.`); setLoading(false); return;
//           }
//           const invalidBatchEntry = batches.some(b => !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0);
//           if (invalidBatchEntry) {
//             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Invalid batch entry. Batch Number and Quantity must be provided.`); setLoading(false); return;
//           }
//         }
//       }
//       if (ocrGrandTotal && ocrGrandTotal !== summary.grandTotal) {
//         toast.warn(`Warning: Calculated total (${summary.grandTotal}) does not match invoice total (${ocrGrandTotal}).`);
//       }
//       const itemsForSubmission = purchaseInvoiceData.items.map(it => ({
//         ...it, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0,
//         discount: Number(it.discount) || 0, freight: Number(it.freight) || 0,
//         gstRate: Number(it.gstRate) || 0, igstRate: Number(it.igstRate) || 0,
//         cgstRate: Number(it.cgstRate) || 0, sgstRate: Number(it.sgstRate) || 0,
//         managedByBatch: it.managedBy?.toLowerCase() === 'batch',
//         batches: (it.batches || []).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
//       }));
//       const { attachments: _, ...restData } = purchaseInvoiceData;
//       const payload = {
//         ...restData, invoiceType: purchaseInvoiceData.invoiceType,
//         items: itemsForSubmission, freight: Number(restData.freight) || 0,
//         rounding: Number(restData.rounding) || 0, ...summary
//       };
//       const formData = new FormData();
//       formData.append("invoiceData", JSON.stringify(payload));
//       if (removedFiles.length > 0) formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
//       if (existingFiles.length > 0) formData.append("existingFiles", JSON.stringify(existingFiles));
//       attachments.forEach(file => formData.append("newAttachments", file));
//       const url = isEdit ? `/api/purchaseInvoice/${editId}` : "/api/purchaseInvoice";
//       const method = isEdit ? "put" : "post";
//       const response = await axios({
//         method, url, data: formData,
//         headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" }
//       });
//       const savedInvoice = response?.data?.data || response?.data;
//       if (!savedInvoice) throw new Error(`Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//       toast.success(isEdit ? "Purchase Invoice updated successfully" : "Purchase Invoice saved successfully");
//       router.push(`/admin/purchaseInvoice-view`);
//     } catch (err) {
//       console.error("Error saving purchase invoice:", err);
//       toast.error(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//     } finally {
//       setLoading(false);
//     }
//   }, [purchaseInvoiceData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router, ocrGrandTotal]);

//   // --- START: INTEGRATED OCR LOGIC ---
//   const extractPdfText = useCallback(async (pdfData) => {
//     try {
//       const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
//       let textContent = "";
//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const content = await page.getTextContent();
//         const strings = content.items.map((item) => item.str).join(" ");
//         textContent += strings + "\n";
//       }
//       return textContent;
//     } catch (error) { console.error("PDF Text Extraction Error:", error); toast.error("Failed to extract text from PDF."); return ""; }
//   }, []);

//   const extractImageText = useCallback(async (imageFile) => {
//     try {
//       const result = await Tesseract.recognize(imageFile, "eng");
//       return result.data.text;
//     } catch (error) { console.error("OCR Error:", error); toast.error("OCR failed to read image."); return ""; }
//   }, []);

//   // --- ✅ STRICT VALIDATED FIELD PARSER ---
// const extractInvoiceFields = async (text) => {
//   if (!text) { 
//     toast.warn("OCR text is empty, cannot parse fields."); 
//     return; 
//   }

//   const cleanText = text.replace(/[\t\s]+/g, ' ');
//   console.log("🧾 Cleaned OCR Text:\n", cleanText);
//   toast.info("Parsing fields from OCR text...");

//   // --- Extract key labels ---
//   const findMatch = (label) => {
//     const pattern = new RegExp(`${label}[:\\-]?\\s*(.*?)\\s(?=[A-Z]|$)`, "i");
//     const match = cleanText.match(pattern);
//     return match && match[1] ? match[1].trim() : null;
//   };

//   const invoiceNum = findMatch("Invoice Number");
//   const supplierName = findMatch("Supplier Name");
//   const supplierCode = findMatch("Supplier Code");
//   const postingDate = findMatch("Posting Date");
//   const docDate = findMatch("Document Date");
//   const dueDate = findMatch("Due Date");

//   const totalPattern = /Total\s*[:\-]?\s*([₹$]?\s*[\d,]+(\.\d{1,2})?)/i;
//   const totalMatch = cleanText.match(totalPattern);
//   const grandTotal = totalMatch ? parseFloat(totalMatch[1].replace(/[₹$,]/g, '')) : null;

//   // ---------- ✅ Match Supplier ----------
//   if (supplierCode || supplierName) {
//     const supplier = await lookupSupplier({ code: supplierCode, name: supplierName });
//     if (supplier) {
//       console.log("✅ Supplier matched in DB:", supplier);
//       toast.success(`Supplier matched: ${supplier.supplierName}`);

//       setPurchaseInvoiceData((prev) => ({
//         ...prev,
//         supplier: supplier._id,
//         supplierCode: supplier.supplierCode || supplierCode || "",
//         supplierName: supplier.supplierName || supplierName || "",
//         contactPerson: supplier.contactPersonName || prev.contactPerson || "",
//       }));
//     } else {
//       console.log("❌ No supplier found in DB for:", supplierCode || supplierName);
//       toast.error("Supplier not found in database. Please verify manually.");
//     }
//   }

//   // ---------- ✅ Fill Header Fields ----------
//   setPurchaseInvoiceData((prev) => ({
//     ...prev,
//     refNumber: invoiceNum || prev.refNumber,
//     postingDate: postingDate ? formatDateForInput(postingDate) : prev.postingDate,
//     documentDate: docDate ? formatDateForInput(docDate) : prev.documentDate,
//     dueDate: dueDate ? formatDateForInput(dueDate) : prev.dueDate,
//   }));

//   if (grandTotal) {
//     setOcrGrandTotal(grandTotal.toFixed(2));
//     console.log(`💰 OCR Grand Total found: ₹${grandTotal}`);
//   }

//   // ---------- ✅ Parse and match items ----------
//   toast.info("🔍 Fetching line items from OCR text...");
//   let aiItems = [];
//   try {
//     const res = await axios.post("/api/extract-items", { ocrText: text });
//     if (res.data.success) {
//       aiItems = res.data.items || [];
//     } else {
//       toast.warn("No items found by AI parser.");
//     }
//   } catch (err) {
//     console.error("AI item parsing error:", err);
//   }

//   if (aiItems.length > 0) {
//     const matchedItems = [];
//     for (const raw of aiItems) {
//       const name = (raw.itemName || raw.itemDescription || "").trim();
//       const code = (raw.itemCode || "").trim();
//       const master = await lookupItem({ code, name });

//       if (master) {
//         console.log("✅ Item matched:", master.itemCode, "-", master.itemName);
//         const filledItem = {
//           ...initialPurchaseInvoiceState.items[0],
//           item: master._id,
//           itemCode: master.itemCode,
//           itemName: master.itemName,
//           itemDescription: master.description || name,
//           quantity: Number(raw.quantity) || 1,
//           unitPrice: Number(raw.unitPrice) || Number(master.unitPrice) || 0,
//           gstRate: Number(master.gstRate) || 0,
//           managedBy: master.managedBy || "",
//           warehouse: master.warehouse || "",
//           ...computeItemValues({
//             ...initialPurchaseInvoiceState.items[0],
//             quantity: Number(raw.quantity) || 1,
//             unitPrice: Number(raw.unitPrice) || Number(master.unitPrice) || 0,
//             gstRate: Number(master.gstRate) || 0,
//           }),
//         };
//         matchedItems.push(filledItem);
//       } else {
//         console.log("❌ No match for OCR item:", name || code);
//       }
//     }

//     if (matchedItems.length > 0) {
//       setPurchaseInvoiceData((prev) => ({ ...prev, items: matchedItems }));
//       toast.success(`Auto-filled ${matchedItems.length} matching items.`);
//     } else {
//       toast.warn("No matching items found in database for OCR text.");
//     }
//   }
// };


//   // Main handler for OCR file selection
//   const handleOcrFileSelect = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setOcrExtracting(true);
//     // Reset all fields on new file upload
//     setOcrGrandTotal(null); 
//     setPurchaseInvoiceData(initialPurchaseInvoiceState); // Reset the entire form
    
//     toast.info(`Processing file: ${file.name}, please wait...`);
//     const fileReader = new FileReader();
//     fileReader.onload = async () => {
//       const data = new Uint8Array(fileReader.result);
//       let text = "";
//       try {
//         if (file.type === "application/pdf") {
//           text = await extractPdfText(data);
//         } else if (file.type.startsWith("image/")) {
//           text = await extractImageText(file);
//         } else {
//           toast.error("Unsupported file type. Please upload PDF or Image.");
//           setOcrExtracting(false); return;
//         }
//         if (text) {
//           toast.success("Text extracted successfully! Parsing & validating...");
//           await extractInvoiceFields(text); // 🔒 will throw if supplier/items don't exist
//         } else {
//           toast.warn("Could not extract any text from the file.");
//         }
//       } catch (err) {
//          console.error("OCR/Extraction Error:", err);
//          toast.error("❌ OCR aborted: " + (err?.message || "Failed to process file."));
//          // Ensure state is clean after a failed OCR
//          setPurchaseInvoiceData(initialPurchaseInvoiceState);
//       } finally {
//          setOcrExtracting(false);
//          e.target.value = ""; 
//       }
//     };
//     fileReader.readAsArrayBuffer(file);
//   };
//   // --- END: INTEGRATED OCR LOGIC ---

//   return (
//     <div ref={parentRef} className="">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

//       {/* Supplier & Document Details Section */}
//       <div className="flex flex-wrap justify-between  border rounded-lg shadow-lg ">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input 
//               name="supplierCode"
//               value={purchaseInvoiceData.supplierCode || ""} 
//               onChange={handleInputChange} 
//               className="w-full p-2 border rounded bg-gray-50" 
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             {purchaseInvoiceData.supplier ? (
//               <input readOnly value={purchaseInvoiceData.supplierName} className="w-full p-2 border rounded bg-gray-100" />
//             ) : (
//               <>
//                 <input 
//                   name="supplierName"
//                   value={purchaseInvoiceData.supplierName} 
//                   onChange={handleInputChange}
//                   className="w-full p-2 border rounded bg-gray-50" 
//                   placeholder="Supplier Name (from OCR or manual)"
//                 />
//                 <div className="mt-2">
//                   <span className="text-sm text-gray-600">Or search: </span>
//                   <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//                 </div>
//               </>
//             )}
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input 
//               name="contactPerson"
//               value={purchaseInvoiceData.contactPerson || ""} 
//               onChange={handleInputChange} 
//               className="w-full p-2 border rounded bg-gray-50" 
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Number</label>
//             <input name="refNumber" value={purchaseInvoiceData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           {purchaseInvoiceData.purchaseOrderId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked Purchase Order ID</label>
//               <input readOnly value={purchaseInvoiceData.purchaseOrderId} className="w-full p-2 border rounded bg-gray-100" />
//             </div>
//           )}
//           {purchaseInvoiceData.goodReceiptNoteId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked GRN ID</label>
//               <input readOnly value={purchaseInvoiceData.goodReceiptNoteId} className="w-full p-2 border rounded bg-gray-100" />
//             </div>
//           )}
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select name="status" value={purchaseInvoiceData.status} onChange={handleInputChange} className="w-full p-2 border rounded">
//               <option value="Pending">Pending</option>
//               <option value="Approved">Approved</option>
//               <option value="Rejected">Rejected</option>
//               <option value="Paid">Paid</option>
//               <option value="Partial_Paid">Partial Paid</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input type="date" name="postingDate" value={formatDateForInput(purchaseInvoiceData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input type="date" name="documentDate" value={formatDateForInput(purchaseInvoiceData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Due Date</label>
//             <input type="date" name="dueDate" value={formatDateForInput(purchaseInvoiceData.dueDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={purchaseInvoiceData.items}
//           onItemChange={handleItemChange} onAddItem={addItemRow}
//           onItemSelect={handleItemSelect} onRemoveItem={removeItemRow}
//         />
//       </div>

//       {/* Batch Details Entry Section */}
//       <div className="mb-8">
//         <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
//         {purchaseInvoiceData.items.map((item, index) =>
//           item.item && item.itemCode && item.itemName && item.managedBy &&
//           item.managedBy.trim().toLowerCase() === "batch" ? (
//             <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
//               <div>
//                 <strong>{item.itemCode} - {item.itemName}</strong>
//                 <span className="ml-2 text-sm text-gray-600">(Qty: {item.quantity})</span>
//                 <span className="ml-4 text-sm font-medium">
//                   Allocated: {(ArrayOf(item.batches)).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0)} / {item.quantity}
//                 </span>
//               </div>
//               <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
//                 Set Batch Details
//               </button>
//             </div>
//           ) : null
//         )}
//       </div>
//       {showBatchModal && selectedBatchItemIndex !== null && (
//         <BatchModal
//           batches={purchaseInvoiceData.items[selectedBatchItemIndex].batches}
//           onBatchEntryChange={handleBatchEntryChange} onAddBatchEntry={addBatchEntry}
//           onClose={closeBatchModal}
//           itemCode={purchaseInvoiceData.items[selectedBatchItemIndex].itemCode}
//           itemName={purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
//           unitPrice={purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
//         />
//       )}

//       {/* Freight & Rounding Inputs */}
//       <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
//         <div>
//           <label className="block mb-1 font-medium">Freight</label>
//           <input name="freight" type="number" value={purchaseInvoiceData.freight || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Rounding</label>
//           <input name="rounding" type="number" value={purchaseInvoiceData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Summary Section (with Verification) */}
//       <div className="grid md:grid-cols-4 gap-6 mb-8">
//         <div>
//           <label className="block mb-1 font-medium">Total Before Discount</label>
//           <input readOnly value={summary.totalBeforeDiscount} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">GST Total</label>
//           <input readOnly value={summary.gstTotal} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Grand Total (Calculated)</label>
//           <input readOnly value={summary.grandTotal} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium text-blue-600">Grand Total (from OCR)</label>
//           <input
//             readOnly
//             value={ocrGrandTotal ? `₹${ocrGrandTotal}` : 'N/A'}
//             className={`w-full p-2 border-2 bg-gray-100 rounded ${
//               ocrGrandTotal && summary.grandTotal !== "0.00" && ocrGrandTotal !== summary.grandTotal
//                 ? 'border-red-500' // Mismatch warning
//                 : 'border-gray-200'
//             }`}
//           />
//         </div>
//       </div>

//       {/* Sales Employee & Remarks Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input name="salesEmployee" value={purchaseInvoiceData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea name="remarks" value={purchaseInvoiceData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Attachments Section */}
//       <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
//         <label className="font-medium block mb-1">Attachments</label>
//         {existingFiles.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl || file.url || file.path || "";
//               const type = file.fileType || "";
//               const name = file.fileName || url.split("/").pop() || `File-${idx}`;
//               if (!url) return null;
//               const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isPDF ? ( <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> ) :
//                             ( <img src={url} alt={name} className="h-24 w-full object-cover rounded" /> )}
//                   <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate hover:underline"> {name} </a>
//                   <button onClick={() => {
//                       setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                       setRemovedFiles((prev) => [...prev, file]);
//                     }} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"> × </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//         <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = "";
//           }} className="border px-3 py-2 w-full rounded" />
//         {attachments.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);
//               const isPDF = file.type === "application/pdf";
//               const isImage = file.type.startsWith("image/");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isImage ? ( <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" /> ) :
//                    isPDF ? ( <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> ) :
//                            ( <p className="truncate text-xs">{file.name}</p> )}
//                   <button onClick={() => {
//                         setAttachments((prev) => prev.filter((_, i) => i !== idx));
//                         URL.revokeObjectURL(url);
//                     }} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"> × </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//        {/* OCR Upload Section */}
//        <div className="flex flex-col mb-4 border p-3 rounded bg-gray-50">
//           <label className="font-semibold mb-1">Upload Invoice (Image or PDF) to Auto-Fill</label>
//           <input type="file" accept="image/*,application/pdf" onChange={handleOcrFileSelect}
//             className="p-2 border rounded" disabled={ocrExtracting} />
//           {ocrExtracting && ( <p className="text-blue-500 text-sm mt-1">🔍 Extracting text, please wait...</p> )}
//       </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSavePurchaseInvoice}
//           disabled={loading || ocrExtracting}
//           className={`mt-4 px-4 py-2 rounded ${
//             (loading || ocrExtracting) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Saving..." : isEdit ? "Update Invoice" : "Submit Invoice"}
//         </button>
//         <button
//           onClick={() => {
//             setPurchaseInvoiceData(initialPurchaseInvoiceState);
//             setAttachments([]); setExistingFiles([]); setRemovedFiles([]);
//             setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//             setOcrGrandTotal(null); // Clear OCR total
//             router.push("/admin/purchase-invoice-view");
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Cancel
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }

// export default PurchaseInvoiceFormWrapper;











// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import SupplierSearch from "@/components/SupplierSearch";
// import ItemSection from "@/components/ItemSection"; // Assuming this component is correctly implemented
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Tesseract from "tesseract.js";
// import * as pdfjsLib from "pdfjs-dist/build/pdf";

// // ✅ Proper PDF.js worker setup
// if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
//   pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
//   pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = "/pdfjs/standard_fonts/";
// }

// // Helper to generate unique IDs
// const generateUniqueId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
// };

// // Helper to ensure a variable is an array
// const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// // Initial Purchase Invoice state
// const initialPurchaseInvoiceState = {
//   supplier: "",
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Pending",
//   postingDate: "",
//   documentDate: "",
//   dueDate: "",
//   items: [
//     {
//       item: "", itemCode: "", itemName: "", itemDescription: "",
//       quantity: 0, unitPrice: 0, discount: 0, freight: 0,
//       gstRate: 0, igstRate: 0, cgstRate: 0, sgstRate: 0,
//       taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
//       gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
//       managedBy: "", batches: [], errorMessage: "",
//       warehouse: "", warehouseCode: "", warehouseName: "",
//     },
//   ],
//   salesEmployee: "", remarks: "", freight: 0, rounding: 0,
//   totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
//   purchaseOrderId: "", goodReceiptNoteId: "",
//   sourceType: "", sourceId: "", attachments: [],
// };

// // Helper to format date
// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   let d;
//   if (dateStr.includes('/')) {
//     const parts = dateStr.split('/');
//     if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
//   } else if (dateStr.includes('-')) {
//     const parts = dateStr.split('-');
//     if (parts.length === 3) {
//       if (parts[0].length === 4) d = new Date(dateStr); // YYYY-MM-DD
//       else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY
//     }
//   } else {
//     d = new Date(dateStr);
//   }
//   if (!d || isNaN(d.getTime())) {
//     console.warn("Invalid date string passed to formatDateForInput:", dateStr);
//     return "";
//   }
//   return d.toISOString().slice(0, 10);
// }

// // BatchModal component
// function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
//   const currentBatches = ArrayOf(batches);
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg max-w-lg w-full">
//         <h2 className="text-xl font-semibold mb-2">
//           Batch Details for {itemCode || 'Selected Item'} - {itemName || 'N/A'}
//         </h2>
//         <p className="mb-4 text-sm text-gray-600">Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : '0.00'}</p>
//         {currentBatches.length > 0 ? (
//           <table className="w-full table-auto border-collapse mb-4">
//             <thead>
//               <tr className="bg-gray-200">
//                 <th className="border p-2 text-left text-sm">Batch Number</th>
//                 <th className="border p-2 text-left text-sm">Expiry Date</th>
//                 <th className="border p-2 text-left text-sm">Manufacturer</th>
//                 <th className="border p-2 text-left text-sm">Quantity</th>
//                 <th className="border p-2 text-left text-sm">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentBatches.map((batch, idx) => (
//                 <tr key={batch.id}>
//                   <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td>
//                   <td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td>
//                   <td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td>
//                   <td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td>
//                   <td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="mb-4 text-gray-500">No batch entries yet. Click "Add Batch Entry" to add one.</p>
//         )}
//         <button type="button" onClick={onAddBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600">
//           Add Batch Entry
//         </button>
//         <div className="flex justify-end gap-2">
//           <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//             Done
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function PurchaseInvoiceFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading purchase invoice form data...</div>}>
//       <PurchaseInvoiceForm />
//     </Suspense>
//   );
// }

// function PurchaseInvoiceForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId");
//   const isEdit = Boolean(editId);

//   const parentRef = useRef(null);
//   const [purchaseInvoiceData, setPurchaseInvoiceData] = useState(initialPurchaseInvoiceState);
  
//   const computeItemValues = useCallback((it) => {
//     const q = Number(it.quantity) || 0;
//     const up = Number(it.unitPrice) || 0;
//     const dis = Number(it.discount) || 0;
//     const fr = Number(it.freight) || 0;
//     const net = up - dis;
//     const tot = net * q + fr;
//     let cg = 0, sg = 0, ig = 0, gstAmt = 0;
//     if (it.taxOption === "IGST") {
//       const rate = Number(it.igstRate || it.gstRate) || 0;
//       ig = (tot * rate) / 100;
//       gstAmt = ig;
//     } else {
//       const rate = Number(it.gstRate) || 0;
//       const half = rate / 2;
//       cg = (tot * half) / 100;
//       sg = cg;
//       gstAmt = cg + sg;
//     }
//     return { priceAfterDiscount: net, totalAmount: tot, cgstAmount: cg, sgstAmount: sg, gstAmount: gstAmt, igstAmount: ig };
//   }, []);

//   const [summary, setSummary] = useState({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [attachments, setAttachments] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [ocrExtracting, setOcrExtracting] = useState(false);
//   const [ocrGrandTotal, setOcrGrandTotal] = useState(null);

//   // Effect to load data from Session Storage
//   useEffect(() => {
//     const grnDataForInvoice = sessionStorage.getItem("grnData");
//     const purchaseInvoiceCopyData = sessionStorage.getItem("purchaseInvoiceData");
//     if (!grnDataForInvoice && !purchaseInvoiceCopyData) return;
//     const loadSourceData = () => {
//       try {
//         const sourceDoc = grnDataForInvoice ? JSON.parse(grnDataForInvoice) : JSON.parse(purchaseInvoiceCopyData);
//         const sourceType = grnDataForInvoice ? "GRN" : "PurchaseInvoice";
//         const supplierId = sourceDoc.supplier?._id || sourceDoc.supplier || "";
//         const supplierCode = sourceDoc.supplier?.supplierCode || sourceDoc.supplierCode || "";
//         const supplierName = sourceDoc.supplier?.supplierName || sourceDoc.supplierName || "";
//         const contactPerson = sourceDoc.supplier?.contactPersonName || sourceDoc.contactPerson || "";
//         const preparedItems = (sourceDoc.items || []).map((item) => {
//           const quantityToInvoice = (sourceType === "GRN" ? Number(item.quantity) : Number(item.quantity)) || 0;
//           const baseItem = {
//             ...initialPurchaseInvoiceState.items[0],
//             item: item.item?._id || item.item || "",
//             itemCode: item.itemCode || "", itemName: item.itemName || "",
//             itemDescription:  item.itemDescription || item.description || item.itemDescription  ||  "",
//             quantity: quantityToInvoice, unitPrice: Number(item.unitPrice || item.price) || 0,
//             discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
//             gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
//             cgstRate: Number(item.cgstRate) || 0, sgstRate: Number(item.sgstRate) || 0,
//             taxOption: item.taxOption || "GST", managedBy: item.managedBy || "none",
//             batches: Array.isArray(item.batches)
//               ? item.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) })) : [],
//             warehouse: item.warehouse || "", warehouseCode: item.warehouseCode || "",
//             warehouseName: item.warehouseName || "",
//           };
//           return { ...baseItem, ...computeItemValues(baseItem) };
//         });
//         setExistingFiles(sourceDoc.attachments || []);
//         setPurchaseInvoiceData((prev) => ({
//           ...prev, supplier: supplierId, supplierCode: supplierCode, supplierName: supplierName,
//           contactPerson: contactPerson, refNumber: sourceDoc.refNumber || "", status: "Pending",
//           postingDate: formatDateForInput(new Date()), documentDate: formatDateForInput(new Date()),
//           dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
//           items: preparedItems, salesEmployee: sourceDoc.salesEmployee || "",
//           remarks: sourceDoc.remarks || "", freight: Number(sourceDoc.freight) || 0,
//           rounding: Number(sourceDoc.rounding) || 0, purchaseOrderId: sourceDoc.purchaseOrderId || "",
//           goodReceiptNoteId: sourceDoc._id || "", sourceType: sourceType, sourceId: sourceDoc._id,
//           invoiceType: sourceDoc.invoiceType || (sourceType === "GRN" ? "GRNCopy" : "Normal"),
//         }));
//         toast.success(`✅ ${sourceType === "GRN" ? "GRN" : "Purchase Invoice"} loaded successfully`);
//       } catch (err) {
//         console.error("Error parsing source data for PI:", err);
//         toast.error("Failed to load data for Purchase Invoice.");
//       } finally {
//         sessionStorage.removeItem("grnDataForInvoice");
//         sessionStorage.removeItem("purchaseInvoiceData");
//       }
//     };
//     loadSourceData();
//   }, [computeItemValues]);

//   // Effect to fetch Purchase Invoice data for edit mode
//   useEffect(() => {
//     if (!isEdit || !editId) return;
//     const fetchPurchaseInvoice = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Unauthorized! Please login again."); setLoading(false); return;
//         }
//         const res = await axios.get(`/api/purchaseInvoice/${editId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           const rec = res.data.data;
//           setPurchaseInvoiceData((prev) => ({
//             ...prev, ...rec,
//             postingDate: formatDateForInput(rec.postingDate),
//             documentDate: formatDateForInput(rec.documentDate),
//             dueDate: formatDateForInput(rec.dueDate),
//             supplier: rec.supplier?._id || rec.supplier || "",
//             supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
//             supplierName: rec.supplier?.supplierName || rec.supplierName || "",
//             contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
//             items: ArrayOf(rec.items).map(item => {
//               const baseItem = {
//                 ...initialPurchaseInvoiceState.items[0], ...item,
//                 batches: Array.isArray(item.batches) ? item.batches.map(b => ({
//                   id: b.id || b._id || generateUniqueId(), ...b,
//                   expiryDate: formatDateForInput(b.expiryDate)
//                 })) : [],
//                 itemDescription: item.itemDescription || "",
//                 quantity: Number(item.quantity) || 0, unitPrice: Number(item.unitPrice) || 0,
//                 discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
//                 gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
//                 cgstRate: Number(item.cgstRate) || 0, sgstRate: Number(item.sgstRate) || 0,
//               };
//               return { ...baseItem, ...computeItemValues(baseItem) };
//             })
//           }));
//           setExistingFiles(rec.attachments || []);
//           setAttachments([]);
//           setRemovedFiles([]);
//         } else {
//           toast.error(res.data.error || "Failed to load Purchase Invoice");
//         }
//       } catch (err) {
//         console.error("Error loading Purchase Invoice:", err);
//         toast.error(err.response?.data?.error || "Error loading Purchase Invoice");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchPurchaseInvoice();
//   }, [isEdit, editId, computeItemValues]);

//   // Form input handlers
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const handleSupplierSelect = useCallback((s) => {
//     setPurchaseInvoiceData((p) => ({
//       ...p, supplier: s._id, supplierCode: s.supplierCode,
//       supplierName: s.supplierName, contactPerson: s.contactPersonName,
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: [...p.items, { ...initialPurchaseInvoiceState.items[0] }] }));
//   }, []);

//   const removeItemRow = useCallback((i) => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   const handleItemChange = useCallback((i, e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => {
//       const items = [...p.items];
//       items[i] = {
//         ...items[i],
//         [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate"].includes(name)
//           ? Number(value) || 0 : value,
//       };
//       items[i] = { ...items[i], ...computeItemValues(items[i]) };
//       return { ...p, items };
//     });
//   }, [computeItemValues]);

//   const handleItemSelect = useCallback(async (i, sku) => {
//     let managedByValue = sku.managedBy || "";
//     if (!managedByValue || managedByValue.trim() === "") {
//       try {
//         const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//         managedByValue = res.data.success ? res.data.data.managedBy : "";
//       } catch (error) {
//         console.error("Error fetching item master details for managedBy:", error); managedByValue = "";
//       }
//     }
//     const base = {
//       item: sku._id, itemCode: sku.itemCode, itemName: sku.itemName,
//       itemDescription: sku.description || "", quantity: 1,
//       unitPrice: Number(sku.unitPrice) || 0, discount: Number(sku.discount) || 0,
//       freight: Number(sku.freight) || 0, gstRate: Number(sku.gstRate) || 0,
//       igstRate: Number(sku.igstRate) || 0, taxOption: sku.taxOption || "GST",
//       managedBy: managedByValue,
//       batches: managedByValue.toLowerCase() === "batch" ? [] : [],
//       warehouse: sku.warehouse || "", warehouseCode: sku.warehouse || "",
//       warehouseName: sku.warehouseName || "",
//     };
//     setPurchaseInvoiceData((p) => {
//       const items = [...p.items];
//       items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValues(base) };
//       return { ...p, items };
//     });
//   }, [computeItemValues]);

//   // Batch modal handlers
//   const openBatchModal = useCallback((itemIndex) => {
//     const currentItem = purchaseInvoiceData.items[itemIndex];
//     if (!currentItem.itemCode || !currentItem.itemName) {
//       toast.warn("Please select an Item (with Code and Name) before setting batch details."); return;
//     }
//     if (!currentItem.item || !currentItem.warehouse) {
//       toast.warn("Please select an Item and a Warehouse for this line item before setting batch details."); return;
//     }
//     if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
//       toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`); return;
//     }
//     setSelectedBatchItemIndex(itemIndex);
//     setShowBatchModal(true);
//   }, [purchaseInvoiceData.items]);
//   const closeBatchModal = useCallback(() => { setShowBatchModal(false); setSelectedBatchItemIndex(null); }, []);
//   const handleBatchEntryChange = useCallback((batchIdx, field, value) => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const updatedBatches = ArrayOf(currentItem.batches);
//       if (field === 'remove') {
//         updatedBatches.splice(batchIdx, 1);
//       } else {
//         if (updatedBatches[batchIdx]) { 
//             const finalValue = (field === "batchQuantity" && isNaN(value)) ? 0 : value;
//             const updatedBatch = { ...updatedBatches[batchIdx], [field]: finalValue };
//             updatedBatches[batchIdx] = updatedBatch;
//         } else { console.error(`Attempted to update non-existent batch at index ${batchIdx}.`); }
//       }
//       currentItem.batches = updatedBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);
//   const addBatchEntry = useCallback(() => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const currentBatches = ArrayOf(currentItem.batches);
//       const lastEntry = currentBatches[currentBatches.length - 1];
//       if (lastEntry && (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
//           (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)) {
//         toast.warn("Please fill the current empty batch entry before adding a new one.");
//         return { ...prev, items: updatedItems };
//       }
//       currentBatches.push({
//         id: generateUniqueId(), batchNumber: "", expiryDate: "",
//         manufacturer: "", batchQuantity: 0,
//       });
//       currentItem.batches = currentBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);

//   // Effect to calculate summary totals
//   useEffect(() => {
//     const totalBeforeDiscountCalc = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
//     const gstTotalCalc = purchaseInvoiceData.items.reduce(
//       (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : ((it.cgstAmount || 0) + (it.sgstAmount || 0))), 0
//     );
//     const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
//     setSummary({
//       totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
//       gstTotal: gstTotalCalc.toFixed(2),
//       grandTotal: grandTotalCalc.toFixed(2),
//     });
//   }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

//   // Handle Save Purchase Invoice
//  const handleSavePurchaseInvoice = useCallback(async () => {
//   try {
//     setLoading(true);
//     const token = localStorage.getItem("token");
//     if (!token) { toast.error("Unauthorized: Please log in"); setLoading(false); return; }

//     // Validation: Check for supplier ID *or* supplier name
//     if (!purchaseInvoiceData.supplier && !purchaseInvoiceData.supplierName) {
//       toast.error("Please select a supplier or auto-fill one with OCR.");
//       setLoading(false);
//       return;
//     }

//     const invalidItems = purchaseInvoiceData.items.some(it => 
//         // Allow saving if item name was from OCR but not linked to an ID
//         (!it.item && !it.itemDescription) || (Number(it.quantity) || 0) <= 0
//     );
//     if (purchaseInvoiceData.items.length === 0 || (purchaseInvoiceData.items.length === 1 && invalidItems)) {
//       toast.error("Please add at least one valid item with (Item or Description) and Quantity > 0."); setLoading(false); return;
//     }
    
//     if (purchaseInvoiceData.purchaseOrderId) {
//       for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//         const allowedQty = Number(item.allowedQuantity) || 0;
//         if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Quantity (${item.quantity}) exceeds allowed (${allowedQty}) as per PO.`); setLoading(false); return;
//         }
//       }
//     }
//     for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//       if (item.managedBy?.toLowerCase() === "batch") {
//         const batches = Array.isArray(item.batches) ? item.batches : [];
//         const totalBatchQty = batches.reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
//         if (totalBatchQty !== Number(item.quantity)) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch qty (${totalBatchQty}) does not match the item's qty (${item.quantity}).`); setLoading(false); return;
//         }
//         if (totalBatchQty === 0 && Number(item.quantity) > 0) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches entered.`); setLoading(false); return;
//         }
//         const invalidBatchEntry = batches.some(b => !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0);
//         if (invalidBatchEntry) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Invalid batch entry. Batch Number and Quantity must be provided.`); setLoading(false); return;
//         }
//       }
//     }
//     if (ocrGrandTotal && ocrGrandTotal !== summary.grandTotal) {
//       toast.warn(`Warning: Calculated total (${summary.grandTotal}) does not match invoice total (${ocrGrandTotal}).`);
//     }
//     const itemsForSubmission = purchaseInvoiceData.items.map(it => ({
//       ...it, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0,
//       discount: Number(it.discount) || 0, freight: Number(it.freight) || 0,
//       gstRate: Number(it.gstRate) || 0, igstRate: Number(it.igstRate) || 0,
//       cgstRate: Number(it.cgstRate) || 0, sgstRate: Number(it.sgstRate) || 0,
//       managedByBatch: it.managedBy?.toLowerCase() === 'batch',
//       batches: (it.batches || []).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
//     }));
//     const { attachments: _, ...restData } = purchaseInvoiceData;
//     const payload = {
//       ...restData, invoiceType: purchaseInvoiceData.invoiceType,
//       items: itemsForSubmission, freight: Number(restData.freight) || 0,
//       rounding: Number(restData.rounding) || 0, ...summary
//     };
//     const formData = new FormData();
//     formData.append("invoiceData", JSON.stringify(payload));
//     if (removedFiles.length > 0) formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
//     if (existingFiles.length > 0) formData.append("existingFiles", JSON.stringify(existingFiles));
//     attachments.forEach(file => formData.append("newAttachments", file));
//     const url = isEdit ? `/api/purchaseInvoice/${editId}` : "/api/purchaseInvoice";
//     const method = isEdit ? "put" : "post";
//     const response = await axios({
//       method, url, data: formData,
//       headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
//     });
//     const savedInvoice = response?.data?.data || response?.data;
//     if (!savedInvoice) throw new Error(`Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//     toast.success(isEdit ? "Purchase Invoice updated successfully" : "Purchase Invoice saved successfully");
//     router.push(`/admin/purchaseInvoice-view`);
//   } catch (err) {
//     console.error("Error saving purchase invoice:", err);
//     toast.error(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//   } finally {
//     setLoading(false);
//   }
//  }, [purchaseInvoiceData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router, ocrGrandTotal]);

//   // --- START: INTEGRATED OCR LOGIC ---
//   const extractPdfText = useCallback(async (pdfData) => {
//     try {
//       const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
//       let textContent = "";
//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const content = await page.getTextContent();
//         const strings = content.items.map((item) => item.str).join(" ");
//         textContent += strings + "\n";
//       }
//       return textContent;
//     } catch (error) { console.error("PDF Text Extraction Error:", error); toast.error("Failed to extract text from PDF."); return ""; }
//   }, []);

//   const extractImageText = useCallback(async (imageFile) => {
//     try {
//       const result = await Tesseract.recognize(imageFile, "eng");
//       return result.data.text;
//     } catch (error) { console.error("OCR Error:", error); toast.error("OCR failed to read image."); return ""; }
//   }, []);

//   //
//   // --- ✅ This function calls the AI backend for items ---
//   //
//   const extractInvoiceFields = async (text) => {
//     if (!text) { toast.warn("OCR text is empty, cannot parse fields."); return; }
    
//     // Replace multiple spaces/tabs with a single space for easier regex
//     const cleanText = text.replace(/[\t\s]+/g, ' ');
//     console.log("🧾 Cleaned Extracted Text:\n", cleanText);
//     toast.info("Attempting to parse fields from text...");

//     let foundInvoiceNum = false, foundSupplier = false, foundTotal = false;
//     let foundPostingDate = false, foundDocumentDate = false, foundDueDate = false;
//     let foundContact = false, foundSupplierCode = false;

//     // This is the "list of next labels" to stop the regex from being too greedy
//     const stopLookahead = `(?=\\s*(Supplier Code|Supplier Name|Contact Person|Invoice Number|Status|Posting Date|Document Date|Due Date|Item|Total|Amount|Freight|Remarks)|$)`;

//     // Helper function to find a match using the new robust regex
//     const findMatch = (label) => {
//         const pattern = new RegExp(`${label}[:\\-]?\\s*(.*?)${stopLookahead}`, "i");
//         const match = cleanText.match(pattern);
//         if (match && match[1]) {
//             return match[1].trim(); // Return the clean, trimmed value
//         }
//         return null;
//     };

//     // --- Find All Header Fields Label by Label ---
//     const invoiceNum = findMatch("Invoice Number");
//     if (invoiceNum) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, refNumber: invoiceNum }));
//         toast.success(`Found Invoice Number: ${invoiceNum}`);
//         foundInvoiceNum = true;
//     }

//     const supplierName = findMatch("Supplier Name");
//     if (supplierName) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, supplierName: supplierName }));
//         toast.success(`Found Supplier Name: ${supplierName}`);
//         foundSupplier = true;
//     }

//     const supplierCode = findMatch("Supplier Code");
//      if (supplierCode) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, supplierCode: supplierCode }));
//         toast.success(`Found Supplier Code: ${supplierCode}`);
//         foundSupplierCode = true;
//     }

//     const contactPerson = findMatch("Contact Person");
//      if (contactPerson) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, contactPerson: contactPerson }));
//         toast.success(`Found Contact Person: ${contactPerson}`);
//         foundContact = true;
//     }

//     const postingDate = findMatch("Posting Date");
//     if (postingDate) {
//         const formattedDate = formatDateForInput(postingDate);
//         if (formattedDate) {
//             setPurchaseInvoiceData((prev) => ({ ...prev, postingDate: formattedDate }));
//             toast.success(`Found Posting Date: ${formattedDate}`);
//             foundPostingDate = true;
//         }
//     }
    
//     const docDate = findMatch("Document Date");
//     if (docDate) {
//         const formattedDate = formatDateForInput(docDate);
//         if (formattedDate) {
//             setPurchaseInvoiceData((prev) => ({ ...prev, documentDate: formattedDate }));
//             toast.success(`Found Document Date: ${formattedDate}`);
//             foundDocumentDate = true;
//         }
//     }

//     const dueDate = findMatch("Due Date");
//     if (dueDate) {
//         const formattedDate = formatDateForInput(dueDate);
//         if (formattedDate) {
//             setPurchaseInvoiceData((prev) => ({ ...prev, dueDate: formattedDate }));
//             toast.success(`Found Due Date: ${formattedDate}`);
//             foundDueDate = true;
//         }
//     }
    
//     // --- Find Grand Total ---
//     const totalPatterns = [
//       /Grand\s*Total[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i, /Amount\s*Due[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i,
//       /Total\s*Due[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i, /Total\s*Amount[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i,
//       /Total[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i
//     ];
//     for(const pattern of totalPatterns) {
//       const match = cleanText.match(pattern);
//       if(match && match[1]) {
//         const totalStr = match[1].replace(/[₹$,]/g, '');
//         const totalVal = parseFloat(totalStr);
//         if(!isNaN(totalVal)) {
//           setOcrGrandTotal(totalVal.toFixed(2));
//           toast.success(`Found Grand Total: ${totalVal.toFixed(2)}`);
//           foundTotal = true; break;
//         }
//       }
//     }

//     // --- NEW: Call AI to Parse Line Items ---
//     toast.info("🤖 Asking AI to parse line items... (this may take a moment)");
//     try {
//       // This calls the API route from Step 2
//       const res = await axios.post("/api/extract-items", { ocrText: text }); 
      
//       if (!res.data.success) {
//         // If the API call worked but the AI failed, show the error
//         throw new Error(res.data.error || "AI processing failed.");
//       }

//       const aiItems = res.data.items;

//       if (aiItems && aiItems.length > 0) {
//         // We have items! Now, map them to our form's item structure
//         const newItems = aiItems.map(item => {
//           const baseItem = {
//             ...initialPurchaseInvoiceState.items[0], // Get the full object structure
//             itemDescription: item.itemDescription || "",
//             itemName: item.itemDescription || "", // Use description as name by default
//             quantity: Number(item.quantity) || 0,
//             unitPrice: Number(item.unitPrice) || 0,
//             discount: 0,
//             gstRate: 0, // You can set a default GST rate here if you want
//             taxOption: "GST",
//           };
//           // IMPORTANT: Recalculate totals for the new line item
//           return { ...baseItem, ...computeItemValues(baseItem) };
//         });

//         // Set the new items to the form state
//         setPurchaseInvoiceData(prev => ({ ...prev, items: newItems }));
//         toast.success(`✅ AI successfully parsed ${newItems.length} line items!`);
//       } else {
//         toast.warn("AI could not find any line items to parse.");
//       }
//     } catch (err) {
//       console.error("AI Item Extraction Error:", err);
//       // This is where "Failed to parse line items" comes from
//       toast.error(err.response?.data?.error || err.message || "Failed to parse line items. Please enter them manually.");
//     }

//     // --- Final Feedback ---
//     if (!foundInvoiceNum) toast.warn("Could not find Invoice Number.");
//     if (!foundSupplier) toast.warn("Could not find Supplier Name.");
//     if (!foundSupplierCode) toast.warn("Could not find Supplier Code.");
//     if (!foundContact) toast.warn("Could not find Contact Person.");
//     if (!foundPostingDate) toast.warn("Could not find Posting Date.");
//     if (!foundDocumentDate) toast.warn("Could not find Document Date.");
//     if (!foundDueDate) toast.warn("Could not find Due Date.");
//     if (!foundTotal) toast.warn("Could not find Grand Total.");
//   };

//   // Main handler for OCR file selection
//   const handleOcrFileSelect = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setOcrExtracting(true);
//     // Reset all fields on new file upload
//     setOcrGrandTotal(null); 
//     setPurchaseInvoiceData(initialPurchaseInvoiceState); // Reset the entire form
    
//     toast.info(`Processing file: ${file.name}, please wait...`);
//     const fileReader = new FileReader();
//     fileReader.onload = async () => {
//       const data = new Uint8Array(fileReader.result);
//       let text = "";
//       try {
//         if (file.type === "application/pdf") {
//           text = await extractPdfText(data);
//         } else if (file.type.startsWith("image/")) {
//           text = await extractImageText(file);
//         } else {
//           toast.error("Unsupported file type. Please upload PDF or Image.");
//           setOcrExtracting(false); return;
//         }
//         if (text) {
//           toast.success("Text extracted successfully! Parsing fields...");
//           await extractInvoiceFields(text); // ADDED AWAIT
//         } else {
//           toast.warn("Could not extract any text from the file.");
//         }
//       } catch (err) {
//          console.error("OCR/Extraction Error:", err);
//          toast.error("❌ Failed to process file.");
//       } finally {
//          setOcrExtracting(false);
//          e.target.value = ""; 
//       }
//     };
//     fileReader.readAsArrayBuffer(file);
//   };
//   // --- END: INTEGRATED OCR LOGIC ---

//   return (
//     <div ref={parentRef} className="">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

//       {/* Supplier & Document Details Section */}
//       <div className="flex flex-wrap justify-between  border rounded-lg shadow-lg ">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input 
//               name="supplierCode"
//               value={purchaseInvoiceData.supplierCode || ""} 
//               onChange={handleInputChange} 
//               className="w-full p-2 border rounded bg-gray-50" 
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             {purchaseInvoiceData.supplier ? (
//               <input readOnly value={purchaseInvoiceData.supplierName} className="w-full p-2 border rounded bg-gray-100" />
//             ) : (
//               <>
//                 <input 
//                   name="supplierName"
//                   value={purchaseInvoiceData.supplierName} 
//                   onChange={handleInputChange}
//                   className="w-full p-2 border rounded bg-gray-50" 
//                   placeholder="Supplier Name (from OCR or manual)"
//                 />
//                 <div className="mt-2">
//                   <span className="text-sm text-gray-600">Or search: </span>
//                   <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//                 </div>
//               </>
//             )}
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input 
//               name="contactPerson"
//               value={purchaseInvoiceData.contactPerson || ""} 
//               onChange={handleInputChange} 
//               className="w-full p-2 border rounded bg-gray-50" 
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Number</label>
//             <input name="refNumber" value={purchaseInvoiceData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           {purchaseInvoiceData.purchaseOrderId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked Purchase Order ID</label>
//               <input readOnly value={purchaseInvoiceData.purchaseOrderId} className="w-full p-2 border rounded bg-gray-100" />
//             </div>
//           )}
//           {purchaseInvoiceData.goodReceiptNoteId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked GRN ID</label>
//               <input readOnly value={purchaseInvoiceData.goodReceiptNoteId} className="w-full p-2 border rounded bg-gray-100" />
//             </div>
//           )}
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select name="status" value={purchaseInvoiceData.status} onChange={handleInputChange} className="w-full p-2 border rounded">
//               <option value="Pending">Pending</option>
//               <option value="Approved">Approved</option>
//               <option value="Rejected">Rejected</option>
//               <option value="Paid">Paid</option>
//               <option value="Partial_Paid">Partial Paid</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input type="date" name="postingDate" value={formatDateForInput(purchaseInvoiceData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input type="date" name="documentDate" value={formatDateForInput(purchaseInvoiceData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Due Date</label>
//             <input type="date" name="dueDate" value={formatDateForInput(purchaseInvoiceData.dueDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={purchaseInvoiceData.items}
//           onItemChange={handleItemChange} onAddItem={addItemRow}
//           onItemSelect={handleItemSelect} onRemoveItem={removeItemRow}
//         />
//       </div>

//       {/* Batch Details Entry Section */}
//       <div className="mb-8">
//         <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
//         {purchaseInvoiceData.items.map((item, index) =>
//           item.item && item.itemCode && item.itemName && item.managedBy &&
//           item.managedBy.trim().toLowerCase() === "batch" ? (
//             <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
//               <div>
//                 <strong>{item.itemCode} - {item.itemName}</strong>
//                 <span className="ml-2 text-sm text-gray-600">(Qty: {item.quantity})</span>
//                 <span className="ml-4 text-sm font-medium">
//                   Allocated: {(ArrayOf(item.batches)).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0)} / {item.quantity}
//                 </span>
//               </div>
//               <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
//                 Set Batch Details
//               </button>
//             </div>
//           ) : null
//         )}
//       </div>
//       {showBatchModal && selectedBatchItemIndex !== null && (
//         <BatchModal
//           batches={purchaseInvoiceData.items[selectedBatchItemIndex].batches}
//           onBatchEntryChange={handleBatchEntryChange} onAddBatchEntry={addBatchEntry}
//           onClose={closeBatchModal}
//           itemCode={purchaseInvoiceData.items[selectedBatchItemIndex].itemCode}
//           itemName={purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
//           unitPrice={purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
//         />
//       )}

//       {/* Freight & Rounding Inputs */}
//       <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
//         <div>
//           <label className="block mb-1 font-medium">Freight</label>
//           <input name="freight" type="number" value={purchaseInvoiceData.freight || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Rounding</label>
//           <input name="rounding" type="number" value={purchaseInvoiceData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Summary Section (with Verification) */}
//       <div className="grid md:grid-cols-4 gap-6 mb-8">
//         <div>
//           <label className="block mb-1 font-medium">Total Before Discount</label>
//           <input readOnly value={summary.totalBeforeDiscount} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">GST Total</label>
//           <input readOnly value={summary.gstTotal} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Grand Total (Calculated)</label>
//           <input readOnly value={summary.grandTotal} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium text-blue-600">Grand Total (from OCR)</label>
//           <input
//             readOnly
//             value={ocrGrandTotal ? `₹${ocrGrandTotal}` : 'N/A'}
//             className={`w-full p-2 border-2 bg-gray-100 rounded ${
//               ocrGrandTotal && summary.grandTotal !== "0.00" && ocrGrandTotal !== summary.grandTotal
//                 ? 'border-red-500' // Mismatch warning
//                 : 'border-gray-200'
//             }`}
//           />
//         </div>
//       </div>

//       {/* Sales Employee & Remarks Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input name="salesEmployee" value={purchaseInvoiceData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea name="remarks" value={purchaseInvoiceData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Attachments Section */}
//       <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
//         <label className="font-medium block mb-1">Attachments</label>
//         {existingFiles.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl || file.url || file.path || "";
//               const type = file.fileType || "";
//               const name = file.fileName || url.split("/").pop() || `File-${idx}`;
//               if (!url) return null;
//               const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isPDF ? ( <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> ) :
//                             ( <img src={url} alt={name} className="h-24 w-full object-cover rounded" /> )}
//                   <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate hover:underline"> {name} </a>
//                   <button onClick={() => {
//                       setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                       setRemovedFiles((prev) => [...prev, file]);
//                     }} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"> × </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//         <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = "";
//           }} className="border px-3 py-2 w-full rounded" />
//         {attachments.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);
//               const isPDF = file.type === "application/pdf";
//               const isImage = file.type.startsWith("image/");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isImage ? ( <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" /> ) :
//                    isPDF ? ( <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> ) :
//                            ( <p className="truncate text-xs">{file.name}</p> )}
//                   <button onClick={() => {
//                         setAttachments((prev) => prev.filter((_, i) => i !== idx));
//                         URL.revokeObjectURL(url);
//                     }} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"> × </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//        {/* OCR Upload Section */}
//        <div className="flex flex-col mb-4 border p-3 rounded bg-gray-50">
//           <label className="font-semibold mb-1">Upload Invoice (Image or PDF) to Auto-Fill</label>
//           <input type="file" accept="image/*,application/pdf" onChange={handleOcrFileSelect}
//             className="p-2 border rounded" disabled={ocrExtracting} />
//           {ocrExtracting && ( <p className="text-blue-500 text-sm mt-1">🔍 Extracting text, please wait...</p> )}
//       </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSavePurchaseInvoice}
//           disabled={loading || ocrExtracting}
//           className={`mt-4 px-4 py-2 rounded ${
//             (loading || ocrExtracting) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Saving..." : isEdit ? "Update Invoice" : "Submit Invoice"}
//         </button>
//         <button
//           onClick={() => {
//             setPurchaseInvoiceData(initialPurchaseInvoiceState);
//             setAttachments([]); setExistingFiles([]); setRemovedFiles([]);
//             setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//             setOcrGrandTotal(null); // Clear OCR total
//             router.push("/admin/purchase-invoice-view");
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Cancel
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }

// export default PurchaseInvoiceFormWrapper;




// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import SupplierSearch from "@/components/SupplierSearch";
// import ItemSection from "@/components/ItemSection"; // Assuming this component is correctly implemented
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Tesseract from "tesseract.js";
// import * as pdfjsLib from "pdfjs-dist/build/pdf";

// // ✅ Proper PDF.js worker setup
// if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
//   pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
//   pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = "/pdfjs/standard_fonts/";
// }

// // Helper to generate unique IDs
// const generateUniqueId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
// };

// // Helper to ensure a variable is an array
// const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// // Initial Purchase Invoice state
// const initialPurchaseInvoiceState = {
//   supplier: "",
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Pending",
//   postingDate: "",
//   documentDate: "",
//   dueDate: "",
//   items: [
//     {
//       item: "", itemCode: "", itemName: "", itemDescription: "",
//       quantity: 0, unitPrice: 0, discount: 0, freight: 0,
//       gstRate: 0, igstRate: 0, cgstRate: 0, sgstRate: 0,
//       taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
//       gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
//       managedBy: "", batches: [], errorMessage: "",
//       warehouse: "", warehouseCode: "", warehouseName: "",
//     },
//   ],
//   salesEmployee: "", remarks: "", freight: 0, rounding: 0,
//   totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
//   purchaseOrderId: "", goodReceiptNoteId: "",
//   sourceType: "", sourceId: "", attachments: [],
// };

// // Helper to format date
// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   let d;
//   // Handle DD/MM/YYYY
//   if (dateStr.includes('/')) {
//     const parts = dateStr.split('/');
//     if (parts.length === 3) d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
//   // Handle YYYY-MM-DD or DD-MM-YYYY
//   } else if (dateStr.includes('-')) {
//     const parts = dateStr.split('-');
//     if (parts.length === 3) {
//       if (parts[0].length === 4) d = new Date(dateStr); // YYYY-MM-DD
//       else d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`); // DD-MM-YYYY
//     }
//   } else {
//     // Try to parse as a standard date string
//     d = new Date(dateStr);
//   }
  
//   if (!d || isNaN(d.getTime())) {
//     console.warn("Invalid date string passed to formatDateForInput:", dateStr);
//     return "";
//   }
//   return d.toISOString().slice(0, 10);
// }

// // BatchModal component
// function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
//   const currentBatches = ArrayOf(batches);
//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg max-w-lg w-full">
//         <h2 className="text-xl font-semibold mb-2">
//           Batch Details for {itemCode || 'Selected Item'} - {itemName || 'N/A'}
//         </h2>
//         <p className="mb-4 text-sm text-gray-600">Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : '0.00'}</p>
//         {currentBatches.length > 0 ? (
//           <table className="w-full table-auto border-collapse mb-4">
//             <thead>
//               <tr className="bg-gray-200">
//                 <th className="border p-2 text-left text-sm">Batch Number</th>
//                 <th className="border p-2 text-left text-sm">Expiry Date</th>
//                 <th className="border p-2 text-left text-sm">Manufacturer</th>
//                 <th className="border p-2 text-left text-sm">Quantity</th>
//                 <th className="border p-2 text-left text-sm">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentBatches.map((batch, idx) => (
//                 <tr key={batch.id}>
//                   <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td>
//                   <td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td>
//                   <td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td>
//                   <td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td>
//                   <td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="mb-4 text-gray-500">No batch entries yet. Click "Add Batch Entry" to add one.</p>
//         )}
//         <button type="button" onClick={onAddBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600">
//           Add Batch Entry
//         </button>
//         <div className="flex justify-end gap-2">
//           <button type="button" onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
//             Done
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// function PurchaseInvoiceFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading purchase invoice form data...</div>}>
//       <PurchaseInvoiceForm />
//     </Suspense>
//   );
// }

// function PurchaseInvoiceForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId");
//   const isEdit = Boolean(editId);

//   const parentRef = useRef(null);
//   const [purchaseInvoiceData, setPurchaseInvoiceData] = useState(initialPurchaseInvoiceState);
  
//   const computeItemValues = useCallback((it) => {
//     const q = Number(it.quantity) || 0;
//     const up = Number(it.unitPrice) || 0;
//     const dis = Number(it.discount) || 0;
//     const fr = Number(it.freight) || 0;
//     const net = up - dis;
//     const tot = net * q + fr;
//     let cg = 0, sg = 0, ig = 0, gstAmt = 0;
//     if (it.taxOption === "IGST") {
//       const rate = Number(it.igstRate || it.gstRate) || 0;
//       ig = (tot * rate) / 100;
//       gstAmt = ig;
//     } else {
//       const rate = Number(it.gstRate) || 0;
//       const half = rate / 2;
//       cg = (tot * half) / 100;
//       sg = cg;
//       gstAmt = cg + sg;
//     }
//     return { priceAfterDiscount: net, totalAmount: tot, cgstAmount: cg, sgstAmount: sg, gstAmount: gstAmt, igstAmount: ig };
//   }, []);

//   const [summary, setSummary] = useState({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [attachments, setAttachments] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [ocrExtracting, setOcrExtracting] = useState(false);
//   const [ocrGrandTotal, setOcrGrandTotal] = useState(null);

//   // Effect to load data from Session Storage
//   useEffect(() => {
//     const grnDataForInvoice = sessionStorage.getItem("grnData");
//     const purchaseInvoiceCopyData = sessionStorage.getItem("purchaseInvoiceData");
//     if (!grnDataForInvoice && !purchaseInvoiceCopyData) return;
//     const loadSourceData = () => {
//       try {
//         const sourceDoc = grnDataForInvoice ? JSON.parse(grnDataForInvoice) : JSON.parse(purchaseInvoiceCopyData);
//         const sourceType = grnDataForInvoice ? "GRN" : "PurchaseInvoice";
//         const supplierId = sourceDoc.supplier?._id || sourceDoc.supplier || "";
//         const supplierCode = sourceDoc.supplier?.supplierCode || sourceDoc.supplierCode || "";
//         const supplierName = sourceDoc.supplier?.supplierName || sourceDoc.supplierName || "";
//         const contactPerson = sourceDoc.supplier?.contactPersonName || sourceDoc.contactPerson || "";
//         const preparedItems = (sourceDoc.items || []).map((item) => {
//           const quantityToInvoice = (sourceType === "GRN" ? Number(item.quantity) : Number(item.quantity)) || 0;
//           const baseItem = {
//             ...initialPurchaseInvoiceState.items[0],
//             item: item.item?._id || item.item || "",
//             itemCode: item.itemCode || "", itemName: item.itemName || "",
//             itemDescription:  item.itemDescription || item.description || item.itemDescription  ||  "",
//             quantity: quantityToInvoice, unitPrice: Number(item.unitPrice || item.price) || 0,
//             discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
//             gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
//             cgstRate: Number(item.cgstRate) || 0, sgstRate: Number(item.sgstRate) || 0,
//             taxOption: item.taxOption || "GST", managedBy: item.managedBy || "none",
//             batches: Array.isArray(item.batches)
//               ? item.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) })) : [],
//             warehouse: item.warehouse || "", warehouseCode: item.warehouseCode || "",
//             warehouseName: item.warehouseName || "",
//           };
//           return { ...baseItem, ...computeItemValues(baseItem) };
//         });
//         setExistingFiles(sourceDoc.attachments || []);
//         setPurchaseInvoiceData((prev) => ({
//           ...prev, supplier: supplierId, supplierCode: supplierCode, supplierName: supplierName,
//           contactPerson: contactPerson, refNumber: sourceDoc.refNumber || "", status: "Pending",
//           postingDate: formatDateForInput(new Date()), documentDate: formatDateForInput(new Date()),
//           dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
//           items: preparedItems, salesEmployee: sourceDoc.salesEmployee || "",
//           remarks: sourceDoc.remarks || "", freight: Number(sourceDoc.freight) || 0,
//           rounding: Number(sourceDoc.rounding) || 0, purchaseOrderId: sourceDoc.purchaseOrderId || "",
//           goodReceiptNoteId: sourceDoc._id || "", sourceType: sourceType, sourceId: sourceDoc._id,
//           invoiceType: sourceDoc.invoiceType || (sourceType === "GRN" ? "GRNCopy" : "Normal"),
//         }));
//         toast.success(`✅ ${sourceType === "GRN" ? "GRN" : "Purchase Invoice"} loaded successfully`);
//       } catch (err) {
//         console.error("Error parsing source data for PI:", err);
//         toast.error("Failed to load data for Purchase Invoice.");
//       } finally {
//         sessionStorage.removeItem("grnDataForInvoice");
//         sessionStorage.removeItem("purchaseInvoiceData");
//       }
//     };
//     loadSourceData();
//   }, [computeItemValues]);

//   // Effect to fetch Purchase Invoice data for edit mode
//   useEffect(() => {
//     if (!isEdit || !editId) return;
//     const fetchPurchaseInvoice = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Unauthorized! Please login again."); setLoading(false); return;
//         }
//         const res = await axios.get(`/api/purchaseInvoice/${editId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) {
//           const rec = res.data.data;
//           setPurchaseInvoiceData((prev) => ({
//             ...prev, ...rec,
//             postingDate: formatDateForInput(rec.postingDate),
//             documentDate: formatDateForInput(rec.documentDate),
//             dueDate: formatDateForInput(rec.dueDate),
//             supplier: rec.supplier?._id || rec.supplier || "",
//             supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
//             supplierName: rec.supplier?.supplierName || rec.supplierName || "",
//             contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
//             items: ArrayOf(rec.items).map(item => {
//               const baseItem = {
//                 ...initialPurchaseInvoiceState.items[0], ...item,
//                 batches: Array.isArray(item.batches) ? item.batches.map(b => ({
//                   id: b.id || b._id || generateUniqueId(), ...b,
//                   expiryDate: formatDateForInput(b.expiryDate)
//                 })) : [],
//                 itemDescription: item.itemDescription || "",
//                 quantity: Number(item.quantity) || 0, unitPrice: Number(item.unitPrice) || 0,
//                 discount: Number(item.discount) || 0, freight: Number(item.freight) || 0,
//                 gstRate: Number(item.gstRate) || 0, igstRate: Number(item.igstRate) || 0,
//                 cgstRate: Number(item.cgstRate) || 0, sgstRate: Number(item.sgstRate) || 0,
//               };
//               return { ...baseItem, ...computeItemValues(baseItem) };
//             })
//           }));
//           setExistingFiles(rec.attachments || []);
//           setAttachments([]);
//           setRemovedFiles([]);
//         } else {
//           toast.error(res.data.error || "Failed to load Purchase Invoice");
//         }
//       } catch (err) {
//         console.error("Error loading Purchase Invoice:", err);
//         toast.error(err.response?.data?.error || "Error loading Purchase Invoice");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchPurchaseInvoice();
//   }, [isEdit, editId, computeItemValues]);

//   // Form input handlers
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const handleSupplierSelect = useCallback((s) => {
//     setPurchaseInvoiceData((p) => ({
//       ...p, supplier: s._id, supplierCode: s.supplierCode,
//       supplierName: s.supplierName, contactPerson: s.contactPersonName,
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: [...p.items, { ...initialPurchaseInvoiceState.items[0] }] }));
//   }, []);

//   const removeItemRow = useCallback((i) => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   const handleItemChange = useCallback((i, e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => {
//       const items = [...p.items];
//       items[i] = {
//         ...items[i],
//         [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate"].includes(name)
//           ? Number(value) || 0 : value,
//       };
//       items[i] = { ...items[i], ...computeItemValues(items[i]) };
//       return { ...p, items };
//     });
//   }, [computeItemValues]);

//   const handleItemSelect = useCallback(async (i, sku) => {
//     let managedByValue = sku.managedBy || "";
//     if (!managedByValue || managedByValue.trim() === "") {
//       try {
//         const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//         managedByValue = res.data.success ? res.data.data.managedBy : "";
//       } catch (error) {
//         console.error("Error fetching item master details for managedBy:", error); managedByValue = "";
//       }
//     }
//     const base = {
//       item: sku._id, itemCode: sku.itemCode, itemName: sku.itemName,
//       itemDescription: sku.description || "", quantity: 1,
//       unitPrice: Number(sku.unitPrice) || 0, discount: Number(sku.discount) || 0,
//       freight: Number(sku.freight) || 0, gstRate: Number(sku.gstRate) || 0,
//       igstRate: Number(sku.igstRate) || 0, taxOption: sku.taxOption || "GST",
//       managedBy: managedByValue,
//       batches: managedByValue.toLowerCase() === "batch" ? [] : [],
//       warehouse: sku.warehouse || "", warehouseCode: sku.warehouse || "",
//       warehouseName: sku.warehouseName || "",
//     };
//     setPurchaseInvoiceData((p) => {
//       const items = [...p.items];
//       items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValues(base) };
//       return { ...p, items };
//     });
//   }, [computeItemValues]);

//   // Batch modal handlers
//   const openBatchModal = useCallback((itemIndex) => {
//     const currentItem = purchaseInvoiceData.items[itemIndex];
//     if (!currentItem.itemCode || !currentItem.itemName) {
//       toast.warn("Please select an Item (with Code and Name) before setting batch details."); return;
//     }
//     if (!currentItem.item || !currentItem.warehouse) {
//       toast.warn("Please select an Item and a Warehouse for this line item before setting batch details."); return;
//     }
//     if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
//       toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`); return;
//     }
//     setSelectedBatchItemIndex(itemIndex);
//     setShowBatchModal(true);
//   }, [purchaseInvoiceData.items]);
//   const closeBatchModal = useCallback(() => { setShowBatchModal(false); setSelectedBatchItemIndex(null); }, []);
//   const handleBatchEntryChange = useCallback((batchIdx, field, value) => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const updatedBatches = ArrayOf(currentItem.batches);
//       if (field === 'remove') {
//         updatedBatches.splice(batchIdx, 1);
//       } else {
//         if (updatedBatches[batchIdx]) { 
//             const finalValue = (field === "batchQuantity" && isNaN(value)) ? 0 : value;
//             const updatedBatch = { ...updatedBatches[batchIdx], [field]: finalValue };
//             updatedBatches[batchIdx] = updatedBatch;
//         } else { console.error(`Attempted to update non-existent batch at index ${batchIdx}.`); }
//       }
//       currentItem.batches = updatedBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);
//   const addBatchEntry = useCallback(() => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const currentBatches = ArrayOf(currentItem.batches);
//       const lastEntry = currentBatches[currentBatches.length - 1];
//       if (lastEntry && (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
//           (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)) {
//         toast.warn("Please fill the current empty batch entry before adding a new one.");
//         return { ...prev, items: updatedItems };
//       }
//       currentBatches.push({
//         id: generateUniqueId(), batchNumber: "", expiryDate: "",
//         manufacturer: "", batchQuantity: 0,
//       });
//       currentItem.batches = currentBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);

//   // Effect to calculate summary totals
//   useEffect(() => {
//     const totalBeforeDiscountCalc = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
//     const gstTotalCalc = purchaseInvoiceData.items.reduce(
//       (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : ((it.cgstAmount || 0) + (it.sgstAmount || 0))), 0
//     );
//     const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
//     setSummary({
//       totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
//       gstTotal: gstTotalCalc.toFixed(2),
//       grandTotal: grandTotalCalc.toFixed(2),
//     });
//   }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

//   // Handle Save Purchase Invoice
//  const handleSavePurchaseInvoice = useCallback(async () => {
//   try {
//     setLoading(true);
//     const token = localStorage.getItem("token");
//     if (!token) { toast.error("Unauthorized: Please log in"); setLoading(false); return; }

//     // --- MODIFIED VALIDATION ---
//     // We now check if EITHER a supplier ID (from search) OR a supplier name (from OCR) is present.
//     if (!purchaseInvoiceData.supplier && !purchaseInvoiceData.supplierName) {
//       toast.error("Please select a supplier or auto-fill one with OCR.");
//       setLoading(false);
//       return;
//     }
//     // --- END MODIFICATION ---

//     const invalidItems = purchaseInvoiceData.items.some(it => !it.item || (Number(it.quantity) || 0) <= 0);
//     if (!purchaseInvoiceData.items.length || invalidItems) {
//       toast.error("Please add at least one valid item with Item and Quantity greater than 0."); setLoading(false); return;
//     }
//     if (purchaseInvoiceData.purchaseOrderId) {
//       for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//         const allowedQty = Number(item.allowedQuantity) || 0;
//         if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Quantity (${item.quantity}) exceeds allowed (${allowedQty}) as per PO.`); setLoading(false); return;
//         }
//       }
//     }
//     for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//       if (item.managedBy?.toLowerCase() === "batch") {
//         const batches = Array.isArray(item.batches) ? item.batches : [];
//         const totalBatchQty = batches.reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
//         if (totalBatchQty !== Number(item.quantity)) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch qty (${totalBatchQty}) does not match the item's qty (${item.quantity}).`); setLoading(false); return;
//         }
//         if (totalBatchQty === 0 && Number(item.quantity) > 0) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches entered.`); setLoading(false); return;
//         }
//         const invalidBatchEntry = batches.some(b => !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0);
//         if (invalidBatchEntry) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Invalid batch entry. Batch Number and Quantity must be provided.`); setLoading(false); return;
//         }
//       }
//     }
//     if (ocrGrandTotal && ocrGrandTotal !== summary.grandTotal) {
//       toast.warn(`Warning: Calculated total (${summary.grandTotal}) does not match invoice total (${ocrGrandTotal}).`);
//     }
//     const itemsForSubmission = purchaseInvoiceData.items.map(it => ({
//       ...it, quantity: Number(it.quantity) || 0, unitPrice: Number(it.unitPrice) || 0,
//       discount: Number(it.discount) || 0, freight: Number(it.freight) || 0,
//       gstRate: Number(it.gstRate) || 0, igstRate: Number(it.igstRate) || 0,
//       cgstRate: Number(it.cgstRate) || 0, sgstRate: Number(it.sgstRate) || 0,
//       managedByBatch: it.managedBy?.toLowerCase() === 'batch',
//       batches: (it.batches || []).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
//     }));
//     const { attachments: _, ...restData } = purchaseInvoiceData;
//     const payload = {
//       ...restData, invoiceType: purchaseInvoiceData.invoiceType,
//       items: itemsForSubmission, freight: Number(restData.freight) || 0,
//       rounding: Number(restData.rounding) || 0, ...summary
//     };
//     const formData = new FormData();
//     formData.append("invoiceData", JSON.stringify(payload));
//     if (removedFiles.length > 0) formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
//     if (existingFiles.length > 0) formData.append("existingFiles", JSON.stringify(existingFiles));
//     attachments.forEach(file => formData.append("newAttachments", file));
//     const url = isEdit ? `/api/purchaseInvoice/${editId}` : "/api/purchaseInvoice";
//     const method = isEdit ? "put" : "post";
//     const response = await axios({
//       method, url, data: formData,
//       headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" }
//     });
//     const savedInvoice = response?.data?.data || response?.data;
//     if (!savedInvoice) throw new Error(`Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//     toast.success(isEdit ? "Purchase Invoice updated successfully" : "Purchase Invoice saved successfully");
//     router.push(`/admin/purchaseInvoice-view`);
//   } catch (err) {
//     console.error("Error saving purchase invoice:", err);
//     toast.error(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//   } finally {
//     setLoading(false);
//   }
//  }, [purchaseInvoiceData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router, ocrGrandTotal]);

//   // --- START: INTEGRATED OCR LOGIC ---
//   const extractPdfText = useCallback(async (pdfData) => {
//     try {
//       const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
//       let textContent = "";
//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const content = await page.getTextContent();
//         // Join items with a space, add newline at end of page
//         const strings = content.items.map((item) => item.str).join(" ");
//         textContent += strings + "\n"; // Add newline after each page
//       }
//       return textContent;
//     } catch (error) { console.error("PDF Text Extraction Error:", error); toast.error("Failed to extract text from PDF."); return ""; }
//   }, []);

//   const extractImageText = useCallback(async (imageFile) => {
//     try {
//       const result = await Tesseract.recognize(imageFile, "eng");
//       return result.data.text;
//     } catch (error) { console.error("OCR Error:", error); toast.error("OCR failed to read image."); return ""; }
//   }, []);

//   //
//   // --- ✅ THIS IS THE FULLY CORRECTED FUNCTION ---
//   //
//   const extractInvoiceFields = (text) => {
//     if (!text) { toast.warn("OCR text is empty, cannot parse fields."); return; }
    
//     // Replace multiple spaces/tabs with a single space for easier regex
//     const cleanText = text.replace(/[\t\s]+/g, ' ');
//     console.log("🧾 Cleaned Extracted Text:\n", cleanText);
//     toast.info("Attempting to parse fields from text...");

//     let foundInvoiceNum = false, foundSupplier = false, foundTotal = false;
//     let foundPostingDate = false, foundDocumentDate = false, foundDueDate = false;
//     let foundContact = false, foundSupplierCode = false;

//     // This is the "list of next labels" to stop the regex from being too greedy
//     const stopLookahead = `(?=\\s*(Supplier Code|Supplier Name|Contact Person|Invoice Number|Status|Posting Date|Document Date|Due Date|Item|Total|Amount)|$)`;

//     // Helper function to find a match using the new robust regex
//     const findMatch = (label) => {
//         // Creates a regex like: /Supplier Name[:\-]?\s*(.*?)(?=\s*(Supplier Code|...)|$)/i
//         const pattern = new RegExp(`${label}[:\\-]?\\s*(.*?)${stopLookahead}`, "i");
//         const match = cleanText.match(pattern);
//         if (match && match[1]) {
//             return match[1].trim(); // Return the clean, trimmed value
//         }
//         return null;
//     };

//     // --- Find All Fields Label by Label ---

//     const invoiceNum = findMatch("Invoice Number");
//     if (invoiceNum) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, refNumber: invoiceNum }));
//         toast.success(`Found Invoice Number: ${invoiceNum}`);
//         foundInvoiceNum = true;
//     }

//     const supplierName = findMatch("Supplier Name");
//     if (supplierName) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, supplierName: supplierName }));
//         toast.success(`Found Supplier Name: ${supplierName}`);
//         foundSupplier = true;
//     }

//     const supplierCode = findMatch("Supplier Code");
//      if (supplierCode) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, supplierCode: supplierCode }));
//         toast.success(`Found Supplier Code: ${supplierCode}`);
//         foundSupplierCode = true;
//     }

//     const contactPerson = findMatch("Contact Person");
//      if (contactPerson) {
//         setPurchaseInvoiceData((prev) => ({ ...prev, contactPerson: contactPerson }));
//         toast.success(`Found Contact Person: ${contactPerson}`);
//         foundContact = true;
//     }

//     const postingDate = findMatch("Posting Date");
//     if (postingDate) {
//         const formattedDate = formatDateForInput(postingDate);
//         if (formattedDate) {
//             setPurchaseInvoiceData((prev) => ({ ...prev, postingDate: formattedDate }));
//             toast.success(`Found Posting Date: ${formattedDate}`);
//             foundPostingDate = true;
//         }
//     }
    
//     const docDate = findMatch("Document Date");
//     if (docDate) {
//         const formattedDate = formatDateForInput(docDate);
//         if (formattedDate) {
//             setPurchaseInvoiceData((prev) => ({ ...prev, documentDate: formattedDate }));
//             toast.success(`Found Document Date: ${formattedDate}`);
//             foundDocumentDate = true;
//         }
//     }

//     const dueDate = findMatch("Due Date");
//     if (dueDate) {
//         const formattedDate = formatDateForInput(dueDate);
//         if (formattedDate) {
//             setPurchaseInvoiceData((prev) => ({ ...prev, dueDate: formattedDate }));
//             toast.success(`Found Due Date: ${formattedDate}`);
//             foundDueDate = true;
//         }
//     }
    
//     // --- Find Grand Total (uses different logic, doesn't need lookahead) ---
//     const totalPatterns = [
//       /Grand\s*Total[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i, /Amount\s*Due[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i,
//       /Total\s*Due[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i, /Total\s*Amount[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i,
//       /Total[:\-]?\s*([₹\$]?[\d,]+\.\d{2})/i
//     ];
//     for(const pattern of totalPatterns) {
//       const match = cleanText.match(pattern);
//       if(match && match[1]) {
//         const totalStr = match[1].replace(/[₹$,]/g, '');
//         const totalVal = parseFloat(totalStr);
//         if(!isNaN(totalVal)) {
//           setOcrGrandTotal(totalVal.toFixed(2));
//           toast.success(`Found Grand Total: ${totalVal.toFixed(2)}`);
//           foundTotal = true; break;
//         }
//       }
//     }

//     // --- Final Feedback ---
//     if (!foundInvoiceNum) toast.warn("Could not find Invoice Number.");
//     if (!foundSupplier) toast.warn("Could not find Supplier Name.");
//     if (!foundSupplierCode) toast.warn("Could not find Supplier Code.");
//     if (!foundContact) toast.warn("Could not find Contact Person.");
//     if (!foundPostingDate) toast.warn("Could not find Posting Date.");
//     if (!foundDocumentDate) toast.warn("Could not find Document Date.");
//     if (!foundDueDate) toast.warn("Could not find Due Date.");
//     if (!foundTotal) toast.warn("Could not find Grand Total.");
//   };

//   // Main handler for OCR file selection
//   const handleOcrFileSelect = async (e) => {
//     const file = e.target.files[0];
//     if (!file) return;
//     setOcrExtracting(true);
//     // Reset all fields on new file upload
//     setOcrGrandTotal(null); 
//     setPurchaseInvoiceData(prev => ({ 
//         ...prev, 
//         refNumber: '', 
//         postingDate: '', 
//         documentDate: '', 
//         dueDate: '',
//         supplierName: '',
//         supplierCode: '',
//         contactPerson: '',
//         supplier: '' // Clear supplier ID
//     })); 
    
//     toast.info(`Processing file: ${file.name}, please wait...`);
//     const fileReader = new FileReader();
//     fileReader.onload = async () => {
//       const data = new Uint8Array(fileReader.result);
//       let text = "";
//       try {
//         if (file.type === "application/pdf") {
//           text = await extractPdfText(data);
//         } else if (file.type.startsWith("image/")) {
//           text = await extractImageText(file);
//         } else {
//           toast.error("Unsupported file type. Please upload PDF or Image.");
//           setOcrExtracting(false); return;
//         }
//         if (text) {
//           toast.success("Text extracted successfully!");
//           extractInvoiceFields(text); // Not async, just call
//         } else {
//           toast.warn("Could not extract any text from the file.");
//         }
//       } catch (err) {
//          console.error("OCR/Extraction Error:", err);
//          toast.error("❌ Failed to process file.");
//       } finally {
//          setOcrExtracting(false);
//          e.target.value = ""; 
//       }
//     };
//     fileReader.readAsArrayBuffer(file);
//   };
//   // --- END: INTEGRATED OCR LOGIC ---

//   return (
//     <div ref={parentRef} className="">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

//       {/* Supplier & Document Details Section */}
//       <div className="flex flex-wrap justify-between  border rounded-lg shadow-lg ">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input 
//               readOnly 
//               value={purchaseInvoiceData.supplierCode || ""} 
//               className="w-full p-2 border rounded bg-gray-100" 
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             {/* If a supplier ID is set (from search), show read-only input.
//               If only a name is set (from OCR), show read-only input.
//               If NEITHER is set, show the search box.
//             */}
//             {purchaseInvoiceData.supplierName ? (
//               <input 
//                 readOnly 
//                 value={purchaseInvoiceData.supplierName} 
//                 className="w-full p-2 border rounded bg-gray-100" 
//               />
//             ) : (
//               <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//             )}
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input 
//               readOnly 
//               value={purchaseInvoiceData.contactPerson || ""} 
//               className="w-full p-2 border rounded bg-gray-100" 
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Number</label>
//             <input name="refNumber" value={purchaseInvoiceData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           {purchaseInvoiceData.purchaseOrderId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked Purchase Order ID</label>
//               <input readOnly value={purchaseInvoiceData.purchaseOrderId} className="w-full p-2 border rounded bg-gray-100" />
//             </div>
//           )}
//           {purchaseInvoiceData.goodReceiptNoteId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked GRN ID</label>
//               <input readOnly value={purchaseInvoiceData.goodReceiptNoteId} className="w-full p-2 border rounded bg-gray-100" />
//             </div>
//           )}
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select name="status" value={purchaseInvoiceData.status} onChange={handleInputChange} className="w-full p-2 border rounded">
//               <option value="Pending">Pending</option>
//               <option value="Approved">Approved</option>
//               <option value="Rejected">Rejected</option>
//               <option value="Paid">Paid</option>
//               <option value="Partial_Paid">Partial Paid</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input type="date" name="postingDate" value={formatDateForInput(purchaseInvoiceData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input type="date" name="documentDate" value={formatDateForInput(purchaseInvoiceData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Due Date</label>
//             <input type="date" name="dueDate" value={formatDateForInput(purchaseInvoiceData.dueDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={purchaseInvoiceData.items}
//           onItemChange={handleItemChange} onAddItem={addItemRow}
//           onItemSelect={handleItemSelect} onRemoveItem={removeItemRow}
//         />
//       </div>

//       {/* Batch Details Entry Section */}
//       <div className="mb-8">
//         <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
//         {purchaseInvoiceData.items.map((item, index) =>
//           item.item && item.itemCode && item.itemName && item.managedBy &&
//           item.managedBy.trim().toLowerCase() === "batch" ? (
//             <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
//               <div>
//                 <strong>{item.itemCode} - {item.itemName}</strong>
//                 <span className="ml-2 text-sm text-gray-600">(Qty: {item.quantity})</span>
//                 <span className="ml-4 text-sm font-medium">
//                   Allocated: {(ArrayOf(item.batches)).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0)} / {item.quantity}
//                 </span>
//               </div>
//               <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
//                 Set Batch Details
//               </button>
//             </div>
//           ) : null
//         )}
//       </div>
//       {showBatchModal && selectedBatchItemIndex !== null && (
//         <BatchModal
//           batches={purchaseInvoiceData.items[selectedBatchItemIndex].batches}
//           onBatchEntryChange={handleBatchEntryChange} onAddBatchEntry={addBatchEntry}
//           onClose={closeBatchModal}
//           itemCode={purchaseInvoiceData.items[selectedBatchItemIndex].itemCode}
//           itemName={purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
//           unitPrice={purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
//         />
//       )}

//       {/* Freight & Rounding Inputs */}
//       <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
//         <div>
//           <label className="block mb-1 font-medium">Freight</label>
//           <input name="freight" type="number" value={purchaseInvoiceData.freight || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Rounding</label>
//           <input name="rounding" type="number" value={purchaseInvoiceData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Summary Section (with Verification) */}
//       <div className="grid md:grid-cols-4 gap-6 mb-8">
//         <div>
//           <label className="block mb-1 font-medium">Total Before Discount</label>
//           <input readOnly value={summary.totalBeforeDiscount} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">GST Total</label>
//           <input readOnly value={summary.gstTotal} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Grand Total (Calculated)</label>
//           <input readOnly value={summary.grandTotal} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium text-blue-600">Grand Total (from OCR)</label>
//           <input
//             readOnly
//             value={ocrGrandTotal ? `₹${ocrGrandTotal}` : 'N/A'}
//             className={`w-full p-2 border-2 bg-gray-100 rounded ${
//               ocrGrandTotal && summary.grandTotal !== "0.00" && ocrGrandTotal !== summary.grandTotal
//                 ? 'border-red-500' // Mismatch warning
//                 : 'border-gray-200'
//             }`}
//           />
//         </div>
//       </div>

//       {/* Sales Employee & Remarks Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input name="salesEmployee" value={purchaseInvoiceData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea name="remarks" value={purchaseInvoiceData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Attachments Section */}
//       <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
//         <label className="font-medium block mb-1">Attachments</label>
//         {existingFiles.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl || file.url || file.path || "";
//               const type = file.fileType || "";
//               const name = file.fileName || url.split("/").pop() || `File-${idx}`;
//               if (!url) return null;
//               const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isPDF ? ( <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> ) :
//                             ( <img src={url} alt={name} className="h-24 w-full object-cover rounded" /> )}
//                   <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate hover:underline"> {name} </a>
//                   <button onClick={() => {
//                       setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                       setRemovedFiles((prev) => [...prev, file]);
//                     }} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"> × </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//         <input type="file" multiple accept="image/*,application/pdf" onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = "";
//           }} className="border px-3 py-2 w-full rounded" />
//         {attachments.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);
//               const isPDF = file.type === "application/pdf";
//               const isImage = file.type.startsWith("image/");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isImage ? ( <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" /> ) :
//                    isPDF ? ( <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" /> ) :
//                            ( <p className="truncate text-xs">{file.name}</p> )}
//                   <button onClick={() => {
//                         setAttachments((prev) => prev.filter((_, i) => i !== idx));
//                         URL.revokeObjectURL(url);
//                     }} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"> × </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>

//        {/* OCR Upload Section */}
//        <div className="flex flex-col mb-4 border p-3 rounded bg-gray-50">
//           <label className="font-semibold mb-1">Upload Invoice (Image or PDF) to Auto-Fill</label>
//           <input type="file" accept="image/*,application/pdf" onChange={handleOcrFileSelect}
//             className="p-2 border rounded" disabled={ocrExtracting} />
//           {ocrExtracting && ( <p className="text-blue-500 text-sm mt-1">🔍 Extracting text, please wait...</p> )}
//       </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSavePurchaseInvoice}
//           disabled={loading || ocrExtracting}
//           className={`mt-4 px-4 py-2 rounded ${
//             (loading || ocrExtracting) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Saving..." : isEdit ? "Update Invoice" : "Submit Invoice"}
//         </button>
//         <button
//           onClick={() => {
//             setPurchaseInvoiceData(initialPurchaseInvoiceState);
//             setAttachments([]); setExistingFiles([]); setRemovedFiles([]);
//             setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//             setOcrGrandTotal(null); // Clear OCR total
//             router.push("/admin/purchase-invoice-view");
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Cancel
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }

// export default PurchaseInvoiceFormWrapper;




// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import axios from "axios";
// import * as pdfjsLib from "pdfjs-dist/build/pdf";
// import Tesseract from "tesseract.js";
// import "react-toastify/dist/ReactToastify.css";

// // ✅ Proper PDF.js worker setup
// if (typeof window !== "undefined" && pdfjsLib.GlobalWorkerOptions) {
//   pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.js";
//   pdfjsLib.GlobalWorkerOptions.standardFontDataUrl = "/pdfjs/standard_fonts/";
// }

// export default function PurchaseInvoiceForm() {
//   const [file, setFile] = useState(null);
//   const [ocrData, setOcrData] = useState("");
//   const [invoiceDetails, setInvoiceDetails] = useState({
//     supplier: "",
//     invoiceNumber: "",
//     invoiceDate: "",
//     totalAmount: "",
//   });

//   // Handle file upload
//   const handleFileChange = (e) => {
//     const uploadedFile = e.target.files[0];
//     if (uploadedFile) {
//       setFile(uploadedFile);
//       toast.info(`File selected: ${uploadedFile.name}`);
//     }
//   };

//   // ✅ Extract text from PDF using pdfjs-dist
//   const extractPdfText = useCallback(async (pdfData) => {
//     try {
//       const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
//       let textContent = "";

//       for (let i = 1; i <= pdf.numPages; i++) {
//         const page = await pdf.getPage(i);
//         const content = await page.getTextContent();
//         const strings = content.items.map((item) => item.str).join(" ");
//         textContent += strings + "\n";
//       }

//       return textContent;
//     } catch (error) {
//       console.error("PDF Text Extraction Error:", error);
//       toast.error("Failed to extract text from PDF.");
//       return "";
//     }
//   }, []);

//   // ✅ OCR for images
//   const extractImageText = useCallback(async (imageFile) => {
//     try {
//       const result = await Tesseract.recognize(imageFile, "eng");
//       return result.data.text;
//     } catch (error) {
//       console.error("OCR Error:", error);
//       toast.error("OCR failed to read image.");
//       return "";
//     }
//   }, []);

//   // ✅ Main handler for OCR upload
//   const handleOcrUpload = async () => {
//     if (!file) {
//       toast.warn("Please upload a file first.");
//       return;
//     }

//     toast.info("Processing file, please wait...");

//     const fileReader = new FileReader();

//     fileReader.onload = async () => {
//       const data = new Uint8Array(fileReader.result);
//       let text = "";

//       if (file.type === "application/pdf") {
//         text = await extractPdfText(data);
//       } else if (file.type.startsWith("image/")) {
//         text = await extractImageText(file);
//       } else {
//         toast.error("Unsupported file type. Please upload PDF or Image.");
//         return;
//       }

//       setOcrData(text);
//       toast.success("Text extracted successfully!");

//       // ✅ Auto-extract fields
//       extractInvoiceFields(text);
//     };

//     fileReader.readAsArrayBuffer(file);
//   };

//   // ✅ Extract key fields from OCR text
//   const extractInvoiceFields = (text) => {
//     const supplierMatch = text.match(/Supplier[:\-]?\s*(.*)/i);
//     const invoiceNumberMatch = text.match(/Invoice\s*No[:\-]?\s*(\S+)/i);
//     const dateMatch = text.match(/Date[:\-]?\s*([\d\/\-]+)/i);
//     const totalMatch = text.match(/Total[:\-]?\s*([\d,]+\.\d{2})/i);

//     setInvoiceDetails({
//       supplier: supplierMatch ? supplierMatch[1] : "",
//       invoiceNumber: invoiceNumberMatch ? invoiceNumberMatch[1] : "",
//       invoiceDate: dateMatch ? dateMatch[1] : "",
//       totalAmount: totalMatch ? totalMatch[1] : "",
//     });
//   };

//   // ✅ Handle form submit (Save to DB)
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       const res = await axios.post("/api/invoices", {
//         ...invoiceDetails,
//         ocrData,
//       });
//       toast.success("Invoice saved successfully!");
//     } catch (err) {
//       console.error(err);
//       toast.error("Error saving invoice.");
//     }
//   };

//   return (
//     <div className="max-w-4xl mx-auto mt-10 p-6 bg-white rounded-2xl shadow-lg">
//       <h1 className="text-2xl font-bold mb-6">📄 Purchase Invoice Form</h1>

//       <input
//         type="file"
//         accept=".pdf,image/*"
//         onChange={handleFileChange}
//         className="mb-4 border p-2 w-full rounded"
//       />

//       <button
//         onClick={handleOcrUpload}
//         className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
//       >
//         Extract Text
//       </button>

//       {ocrData && (
//         <div className="mt-6 p-4 border rounded-lg bg-gray-50">
//           <h2 className="font-semibold text-lg mb-2">🧾 Extracted Text:</h2>
//           <pre className="whitespace-pre-wrap text-sm">{ocrData}</pre>
//         </div>
//       )}

//       <form onSubmit={handleSubmit} className="mt-6 space-y-4">
//         <div>
//           <label className="block text-sm font-medium">Supplier</label>
//           <input
//             type="text"
//             value={invoiceDetails.supplier}
//             onChange={(e) =>
//               setInvoiceDetails({ ...invoiceDetails, supplier: e.target.value })
//             }
//             className="border p-2 w-full rounded"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium">Invoice Number</label>
//           <input
//             type="text"
//             value={invoiceDetails.invoiceNumber}
//             onChange={(e) =>
//               setInvoiceDetails({
//                 ...invoiceDetails,
//                 invoiceNumber: e.target.value,
//               })
//             }
//             className="border p-2 w-full rounded"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium">Invoice Date</label>
//           <input
//             type="text"
//             value={invoiceDetails.invoiceDate}
//             onChange={(e) =>
//               setInvoiceDetails({
//                 ...invoiceDetails,
//                 invoiceDate: e.target.value,
//               })
//             }
//             className="border p-2 w-full rounded"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium">Total Amount</label>
//           <input
//             type="text"
//             value={invoiceDetails.totalAmount}
//             onChange={(e) =>
//               setInvoiceDetails({
//                 ...invoiceDetails,
//                 totalAmount: e.target.value,
//               })
//             }
//             className="border p-2 w-full rounded"
//           />
//         </div>

//         <button
//           type="submit"
//           className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
//         >
//           Save Invoice
//         </button>
//       </form>

//       <ToastContainer position="top-right" autoClose={3000} />
//     </div>
//   );
// }



// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import SupplierSearch from "@/components/SupplierSearch";
// import ItemSection from "@/components/ItemSection"; // Assuming this component is correctly implemented
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import Tesseract from "tesseract.js";
// import * as pdfjsLib from "pdfjs-dist/build/pdf";

// pdfjsLib.GlobalWorkerOptions.workerSrc = undefined;


// // Helper to generate unique IDs for batch entries (from GRN code)
// const generateUniqueId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
// };

// // Helper to ensure a variable is treated as an array (from GRN code)
// const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// // Initial Purchase Invoice state (updated with GRN-like structure and defaults)
// const initialPurchaseInvoiceState = {
//   supplier: "",
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   refNumber: "", // Can be used for Invoice Number
//   status: "Pending", // Default status for a new invoice
//   postingDate: "",
//   documentDate: "",
//   dueDate: "", // Specific to invoices
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemName: "",
//       itemDescription: "", // Ensure this is mapped correctly
//       quantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0, // Item-level freight
//       gstRate: 0,
//       igstRate: 0,
//       cgstRate: 0,
//       sgstRate: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0, // Unit price after discount
//       totalAmount: 0, // Total for the line item (quantity * priceAfterDiscount + freight)
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       managedBy: "", // From item master: "none", "batch", "serial"
//       batches: [], // Array to store allocated batch details {id, batchNumber, expiryDate, manufacturer, batchQuantity}
//       errorMessage: "", // For client-side validation messages on items
//       warehouse: "", // Warehouse ID
//       warehouseCode: "",
//       warehouseName: "",
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0, // Document-level freight
//   rounding: 0,
//   totalBeforeDiscount: 0, // Sum of totalAmount from items
//   gstTotal: 0, // Sum of GST from items
//   grandTotal: 0, // TotalBeforeDiscount + GstTotal + Freight (document) + Rounding
//   purchaseOrderId: "", // Link to Purchase Order if copied from PO
//   goodReceiptNoteId: "", // Link to GRN if copied from GRN
//   // You might want to add sourceType and sourceId here for clarity
//   sourceType: "", // e.g., "PurchaseOrder", "GRN"
//   sourceId: "", // ID of the source document
//   attachments: [], // Array of file metadata for attachments
// };

// // Helper to format date for HTML date input (YYYY-MM-DD) - using GRN's robust version
// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   if (isNaN(d.getTime())) {
//     console.warn("Invalid date string passed to formatDateForInput:", dateStr);
//     return "";
//   }
//   return d.toISOString().slice(0, 10);
// }

// // BatchModal component (copied from GRN code)
// function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
//   const currentBatches = ArrayOf(batches);

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded-lg max-w-lg w-full">
//         <h2 className="text-xl font-semibold mb-2">
//           Batch Details for {itemCode || 'Selected Item'} - {itemName || 'N/A'}
//         </h2>
//         <p className="mb-4 text-sm text-gray-600">Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : '0.00'}</p>
        
//         {currentBatches.length > 0 ? (
//           <table className="w-full table-auto border-collapse mb-4">
//             <thead>
//               <tr className="bg-gray-200">
//                 <th className="border p-2 text-left text-sm">Batch Number</th>
//                 <th className="border p-2 text-left text-sm">Expiry Date</th>
//                 <th className="border p-2 text-left text-sm">Manufacturer</th>
//                 <th className="border p-2 text-left text-sm">Quantity</th>
//                 <th className="border p-2 text-left text-sm">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentBatches.map((batch, idx) => (
//                 <tr key={batch.id}>
//                   <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td>
//                   <td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td>
//                   <td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td>
//                   <td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td>
//                   <td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="mb-4 text-gray-500">No batch entries yet. Click "Add Batch Entry" to add one.</p>
//         )}
//         <button
//           type="button"
//           onClick={onAddBatchEntry}
//           className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600"
//         >
//           Add Batch Entry
//         </button>
//         <div className="flex justify-end gap-2">
//           <button
//             type="button"
//             onClick={onClose}
//             className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             Done
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }


// function PurchaseInvoiceFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading purchase invoice form data...</div>}>
//       <PurchaseInvoiceForm />
//     </Suspense>
//   );
// }

// function PurchaseInvoiceForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId");
//   const isEdit = Boolean(editId);

//   const parentRef = useRef(null);

//   const [purchaseInvoiceData, setPurchaseInvoiceData] = useState(initialPurchaseInvoiceState);
  
//   // Memoized function to compute item-specific financial values (from GRN code)
//   const computeItemValues = useCallback((it) => {
//     const q = Number(it.quantity) || 0;
//     const up = Number(it.unitPrice) || 0;
//     const dis = Number(it.discount) || 0;
//     const fr = Number(it.freight) || 0;
//     const net = up - dis;
//     const tot = net * q + fr;
    
//     let cg = 0;
//     let sg = 0;
//     let ig = 0;
//     let gstAmt = 0;

//     if (it.taxOption === "IGST") {
//       const rate = Number(it.igstRate || it.gstRate) || 0;
//       ig = (tot * rate) / 100;
//       gstAmt = ig;
//     } else { // Assuming "GST" option implies CGST + SGST
//       const rate = Number(it.gstRate) || 0;
//       const half = rate / 2;
//       cg = (tot * half) / 100;
//       sg = cg;
//       gstAmt = cg + sg;
//     }

//     return {
//       priceAfterDiscount: net,
//       totalAmount: tot,
//       cgstAmount: cg,
//       sgstAmount: sg,
//       gstAmount: gstAmt,
//       igstAmount: ig,
//     };
//   }, []);

//   const [summary, setSummary] = useState({
//     totalBeforeDiscount: 0,
//     gstTotal: 0,
//     grandTotal: 0,
//   });

//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
  
//   const [existingFiles, setExistingFiles] = useState([]); // For files already uploaded (edit mode)
//   const [attachments, setAttachments] = useState([]); // For new files to be uploaded
//   const [removedFiles, setRemovedFiles] = useState([]); // For files to be removed (edit mode)

//   const [loading, setLoading] = useState(false);
//     const [ocrFile, setOcrFile] = useState(null);
//   const [ocrExtracting, setOcrExtracting] = useState(false);

//   // Effect to load data from Session Storage (from GRN or copied PI)
//   useEffect(() => {
//     const grnDataForInvoice = sessionStorage.getItem("grnData");
//     const purchaseInvoiceCopyData = sessionStorage.getItem("purchaseInvoiceData"); // If copying from another PI

//     if (!grnDataForInvoice && !purchaseInvoiceCopyData) return;

//     const loadSourceData = () => {
//       try {
//         const sourceDoc = grnDataForInvoice ? JSON.parse(grnDataForInvoice) : JSON.parse(purchaseInvoiceCopyData);
//         const sourceType = grnDataForInvoice ? "GRN" : "PurchaseInvoice";

//         // Normalize supplier data (assuming supplier might be an object or just an ID string)
//         const supplierId = sourceDoc.supplier?._id || sourceDoc.supplier || "";
//         const supplierCode = sourceDoc.supplier?.supplierCode || sourceDoc.supplierCode || "";
//         const supplierName = sourceDoc.supplier?.supplierName || sourceDoc.supplierName || "";
//         const contactPerson = sourceDoc.supplier?.contactPersonName || sourceDoc.contactPerson || "";

//         // Prepare items with computed values and correct fields
//         const preparedItems = (sourceDoc.items || []).map((item) => {
//           // Use `receivedQuantity` from GRN, or `quantity` from PO/PI copy if available.
//           // For a new invoice, quantity represents the amount on the invoice.   itemDescription
//           const quantityToInvoice = (sourceType === "GRN" ? Number(item.quantity) : Number(item.quantity)) || 0;
//           // ... description

       
 
//           const baseItem = {
//             ...initialPurchaseInvoiceState.items[0], // Start with base structure
//             item: item.item?._id || item.item || "",
//             itemCode: item.itemCode || "",
//             itemName: item.itemName || "",
//             itemDescription:  item.itemDescription || item.description || item.itemDescription  ||  "", // Map description correctly
//             quantity: quantityToInvoice, // Set quantity for the invoice line
//             unitPrice: Number(item.unitPrice || item.price) || 0, // Handle price if coming from a different field name
//             discount: Number(item.discount) || 0,
//             freight: Number(item.freight) || 0, // Item-level freight
//             gstRate: Number(item.gstRate) || 0,
//             igstRate: Number(item.igstRate) || 0,
//             cgstRate: Number(item.cgstRate) || 0,
//             sgstRate: Number(item.sgstRate) || 0,
//             taxOption: item.taxOption || "GST",
//             managedBy: item.managedBy || "none",
//             batches: Array.isArray(item.batches)
//               ? item.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) }))
//               : [],
//                warehouse: item.warehouse || "",
//             warehouseCode: item.warehouseCode || "",
//             warehouseName: item.warehouseName || "",
//           };
//           // Recompute values based on the quantity intended for this PI
//           return { ...baseItem, ...computeItemValues(baseItem) };
//         });

//         setExistingFiles(sourceDoc.attachments || []); // Copy existing attachments

//         // Fill form data
//         setPurchaseInvoiceData((prev) => ({
//           ...prev,
//           supplier: supplierId,
//           supplierCode: supplierCode,
//           supplierName: supplierName,
//           contactPerson: contactPerson,
//           refNumber: sourceDoc.refNumber || "", // Use source doc's refNumber for invoice number
//           status: "Pending", // Default new PI status
//           postingDate: formatDateForInput(new Date()), // Set current date for new PI
//           documentDate: formatDateForInput(new Date()), // Set current date for new PI
//           dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Example: Due in 30 days
//           items: preparedItems,
//           salesEmployee: sourceDoc.salesEmployee || "",
//           remarks: sourceDoc.remarks || "",
//           freight: Number(sourceDoc.freight) || 0, // Document-level freight
//           rounding: Number(sourceDoc.rounding) || 0,
//           purchaseOrderId: sourceDoc.purchaseOrderId || "", // Link to PO if from PO/GRN
//           goodReceiptNoteId: sourceDoc._id || "", // Link to GRN if from GRN (sourceDoc._id would be GRN ID)
//           sourceType: sourceType,
//           sourceId: sourceDoc._id, // ID of the source document (PO or GRN)
//           invoiceType: sourceDoc.invoiceType || (sourceType === "GRN" ? "GRNCopy" : "Normal"),
//         }));

//         toast.success(`✅ ${sourceType === "GRN" ? "GRN" : "Purchase Invoice"} loaded successfully`);
//       } catch (err) {
//         console.error("Error parsing source data for PI:", err);
//         toast.error("Failed to load data for Purchase Invoice.");
//       } finally {
//         sessionStorage.removeItem("grnDataForInvoice");
//         sessionStorage.removeItem("purchaseInvoiceData");
//       }
//     };

//     loadSourceData();
//   }, [computeItemValues]); // Dependency on computeItemValues is correct


//   // Effect to fetch Purchase Invoice data for edit mode
//   useEffect(() => {
//     if (!isEdit || !editId) return;

//     const fetchPurchaseInvoice = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Unauthorized! Please login again.");
//           setLoading(false);
//           return;
//         }

//         const res = await axios.get(`/api/purchaseInvoice/${editId}`, { // Corrected API endpoint for fetching by ID
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (res.data.success) {
//           const rec = res.data.data;
//           setPurchaseInvoiceData((prev) => ({
//             ...prev,
//             ...rec,
//             postingDate: formatDateForInput(rec.postingDate),
//             documentDate: formatDateForInput(rec.documentDate),
//             dueDate: formatDateForInput(rec.dueDate), // Format due date as well
//             // Normalize supplier data from fetched record
//             supplier: rec.supplier?._id || rec.supplier || "",
//             supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
//             supplierName: rec.supplier?.supplierName || rec.supplierName || "",
//             contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
            
//             // Map items with computed values
//             items: ArrayOf(rec.items).map(item => {
//               const baseItem = {
//                 ...initialPurchaseInvoiceState.items[0], // Ensure all fields are present
//                 ...item,
//                 // Ensure batches have unique IDs and formatted expiry dates if batch-managed
//                 batches: Array.isArray(item.batches) ? item.batches.map(b => ({
//                   id: b.id || b._id || generateUniqueId(),
//                   ...b,
//                   expiryDate: formatDateForInput(b.expiryDate)
//                 })) : [],
//                 itemDescription: item.itemDescription || "", // Ensure description is loaded
//                 // Ensure numeric fields are numbers, and re-compute totals
//                 quantity: Number(item.quantity) || 0,
//                 unitPrice: Number(item.unitPrice) || 0,
//                 discount: Number(item.discount) || 0,
//                 freight: Number(item.freight) || 0,
//                 gstRate: Number(item.gstRate) || 0,
//                 igstRate: Number(item.igstRate) || 0,
//                 cgstRate: Number(item.cgstRate) || 0,
//                 sgstRate: Number(item.sgstRate) || 0,
//               };
//               return { ...baseItem, ...computeItemValues(baseItem) };
//             })
//           }));

//           // Attachments handling for existing files
//           setExistingFiles(rec.attachments || []);
//           setAttachments([]); // Clear new attachments in edit mode initially
//           setRemovedFiles([]); // Clear removed files in edit mode initially
//         } else {
//           toast.error(res.data.error || "Failed to load Purchase Invoice");
//         }
//       } catch (err) {
//         console.error("Error loading Purchase Invoice:", err);
//         toast.error(err.response?.data?.error || "Error loading Purchase Invoice");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchPurchaseInvoice();
//   }, [isEdit, editId, computeItemValues]); // Added computeItemValues to dependencies


//   // Basic input handler for top-level form fields
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
//   }, []);

//   // Supplier select handler
//   const handleSupplierSelect = useCallback((s) => {
//     setPurchaseInvoiceData((p) => ({
//       ...p,
//       supplier: s._id,
//       supplierCode: s.supplierCode,
//       supplierName: s.supplierName,
//       contactPerson: s.contactPersonName,
//     }));
//   }, []);

//   // Add a new empty item row
//   const addItemRow = useCallback(() => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: [...p.items, { ...initialPurchaseInvoiceState.items[0] }] }));
//   }, []);

//   // Remove an item row
//   const removeItemRow = useCallback((i) => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   // Handler for changes within an individual item row (quantity, price, discount, etc.)
//   const handleItemChange = useCallback(
//     (i, e) => {
//       const { name, value } = e.target;
//       setPurchaseInvoiceData((p) => {
//         const items = [...p.items];
//         items[i] = {
//           ...items[i],
//           [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate"].includes(name)
//             ? Number(value) || 0
//             : value,
//         };
//         // Recompute item values after change
//         items[i] = { ...items[i], ...computeItemValues(items[i]) };
//         return { ...p, items };
//       });
//     },
//     [computeItemValues]
//   );

//   // Handler for when an item is selected from the ItemSearch component
//   const handleItemSelect = useCallback(
//     async (i, sku) => {
//       let managedByValue = sku.managedBy || "";
//       // If managedBy is not directly available in SKU, fetch from item master API
//       if (!managedByValue || managedByValue.trim() === "") {
//         try {
//           const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//           managedByValue = res.data.success ? res.data.data.managedBy : "";
//         } catch (error) {
//           console.error("Error fetching item master details for managedBy:", error);
//           managedByValue = "";
//         }
//       }
      
//       const base = {
//         item: sku._id,
//         itemCode: sku.itemCode,
//         itemName: sku.itemName,
//         itemDescription: sku.description || "", // Explicitly set item description from SKU
//         quantity: 1, // Default quantity for a newly added item
//         unitPrice: Number(sku.unitPrice) || 0,
//         discount: Number(sku.discount) || 0,
//         freight: Number(sku.freight) || 0,
//         gstRate: Number(sku.gstRate) || 0,
//         igstRate: Number(sku.igstRate) || 0,
//         taxOption: sku.taxOption || "GST",
//         managedBy: managedByValue,
//         batches: managedByValue.toLowerCase() === "batch" ? [] : [], // Empty batches initially for a new item line
//         warehouse: sku.warehouse || "",
//         warehouseCode: sku.warehouse || "",
//         warehouseName: sku.warehouseName || "",
//       };
//       setPurchaseInvoiceData((p) => {
//         const items = [...p.items];
//         items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValues(base) };
//         return { ...p, items };
//       });
//     },
//     [computeItemValues]
//   );

//   // Batch modal handlers (from GRN code)
//   const openBatchModal = useCallback((itemIndex) => {
//     const currentItem = purchaseInvoiceData.items[itemIndex];
    
//     // Pre-checks before opening batch modal
//     if (!currentItem.itemCode || !currentItem.itemName) {
//       toast.warn("Please select an Item (with Code and Name) before setting batch details.");
//       return;
//     }
//     if (!currentItem.item || !currentItem.warehouse) {
//       toast.warn("Please select an Item and a Warehouse for this line item before setting batch details.");
//       return;
//     }
//     if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
//       toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`);
//       return;
//     }

//     setSelectedBatchItemIndex(itemIndex);
//     setShowBatchModal(true);
//   }, [purchaseInvoiceData.items]);

//   const closeBatchModal = useCallback(() => {
//     setShowBatchModal(false);
//     setSelectedBatchItemIndex(null);
//   }, []);

//   // Handler for changes within a batch entry inside the modal (from GRN code, adjusted)
//   const handleBatchEntryChange = useCallback((batchIdx, field, value) => { // Removed itemIndex as it's selectedBatchItemIndex now
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const updatedBatches = ArrayOf(currentItem.batches);

//       if (field === 'remove') { // Special field to remove a batch entry
//         updatedBatches.splice(batchIdx, 1);
//       } else {
//         if (updatedBatches[batchIdx]) { 
//             const finalValue = (field === "batchQuantity" && isNaN(value)) ? 0 : value;
//             const updatedBatch = { 
//                 ...updatedBatches[batchIdx],
//                 [field]: finalValue,
//             };
//             updatedBatches[batchIdx] = updatedBatch;
//         } else {
//             console.error(`Attempted to update non-existent batch at index ${batchIdx}. This should not happen.`);
//         }
//       }
      
//       currentItem.batches = updatedBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);


//   // Handler to add a new empty batch entry inside the modal (from GRN code)
//   const addBatchEntry = useCallback(() => {
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const currentBatches = ArrayOf(currentItem.batches);

//       const lastEntry = currentBatches[currentBatches.length - 1];
//       // Prevent adding a new batch entry if the last one is empty (no batchNumber and no quantity)
//       if (
//         lastEntry &&
//         (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
//         (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)
//       ) {
//         toast.warn("Please fill the current empty batch entry before adding a new one.");
//         return { ...prev, items: updatedItems };
//       }

//       currentBatches.push({
//         id: generateUniqueId(), // Assign unique ID
//         batchNumber: "",
//         expiryDate: "",
//         manufacturer: "",
//         batchQuantity: 0,
//       });
//       currentItem.batches = currentBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);

//   // Effect to calculate summary totals (Total Before Discount, GST Total, Grand Total)
//   useEffect(() => {
//     const totalBeforeDiscountCalc = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
//     const gstTotalCalc = purchaseInvoiceData.items.reduce(
//       (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : ((it.cgstAmount || 0) + (it.sgstAmount || 0))),
//       0
//     );
//     const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
    
//     setSummary({
//       totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
//       gstTotal: gstTotalCalc.toFixed(2),
//       grandTotal: grandTotalCalc.toFixed(2),
//     });
//   }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

//   // Handler to save the Purchase Invoice (either create new or update existing)
//  const handleSavePurchaseInvoice = useCallback(async () => {
//   try {
//     setLoading(true);

//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Unauthorized: Please log in");
//       setLoading(false);
//       return;
//     }

//     // ✅ Validation: Supplier selected
//     if (!purchaseInvoiceData.supplier) {
//       toast.error("Please select a supplier.");
//       setLoading(false);
//       return;
//     }

//     // ✅ Validation: Items exist and are valid (item selected, quantity > 0)
//     const invalidItems = purchaseInvoiceData.items.some(it =>
//       !it.item || (Number(it.quantity) || 0) <= 0
//     );
//     if (!purchaseInvoiceData.items.length || invalidItems) {
//       toast.error("Please add at least one valid item with Item and Quantity greater than 0.");
//       setLoading(false);
//       return;
//     }

//     // ✅ If PO → PI, validate that invoice qty does not exceed allowed qty
//     if (purchaseInvoiceData.purchaseOrderId) {
//       for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//         const allowedQty = Number(item.allowedQuantity) || 0;
//         if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Quantity (${item.quantity}) exceeds allowed (${allowedQty}) as per PO.`);
//           setLoading(false);
//           return;
//         }
//       }
//     }

//     // ✅ Validation: Batch-managed items
//     for (const [idx, item] of purchaseInvoiceData.items.entries()) {
//       if (item.managedBy?.toLowerCase() === "batch") {
//         const batches = Array.isArray(item.batches) ? item.batches : [];

//         const totalBatchQty = batches.reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
//         if (totalBatchQty !== Number(item.quantity)) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch qty (${totalBatchQty}) does not match the item's qty (${item.quantity}).`);
//           setLoading(false);
//           return;
//         }

//         if (totalBatchQty === 0 && Number(item.quantity) > 0) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches entered.`);
//           setLoading(false);
//           return;
//         }

//         const invalidBatchEntry = batches.some(b =>
//           !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0
//         );
//         if (invalidBatchEntry) {
//           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Invalid batch entry. Batch Number and Quantity must be provided.`);
//           setLoading(false);
//           return;
//         }
//       }
//     }

//     // ✅ Prepare items for backend
//     const itemsForSubmission = purchaseInvoiceData.items.map(it => ({
//       ...it,
//       quantity: Number(it.quantity) || 0,
//       unitPrice: Number(it.unitPrice) || 0,
//       discount: Number(it.discount) || 0,
//       freight: Number(it.freight) || 0,
//       gstRate: Number(it.gstRate) || 0,
//       igstRate: Number(it.igstRate) || 0,
//       cgstRate: Number(it.cgstRate) || 0,
//       sgstRate: Number(it.sgstRate) || 0,
//       managedByBatch: it.managedBy?.toLowerCase() === 'batch',
//       batches: (it.batches || [])
//         .filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0)
//         .map(({ id, ...rest }) => rest)
//     }));

//     const { attachments: _, ...restData } = purchaseInvoiceData;

//     const payload = {
//       ...restData,
//        invoiceType: purchaseInvoiceData.invoiceType,

//       items: itemsForSubmission,
//       freight: Number(restData.freight) || 0,
//       rounding: Number(restData.rounding) || 0,
//       ...summary
//     };


//     console.log("data copy from",payload)


//     const formData = new FormData();
//     formData.append("invoiceData", JSON.stringify(payload));

//     if (removedFiles.length > 0) {
//       formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
//     }
//     if (existingFiles.length > 0) {
//       formData.append("existingFiles", JSON.stringify(existingFiles));
//     }
//     attachments.forEach(file => formData.append("newAttachments", file));

//     const url = isEdit ? `/api/purchaseInvoice/${editId}` : "/api/purchaseInvoice";
//     const method = isEdit ? "put" : "post";

//     const response = await axios({
//       method,
//       url,
//       data: formData,
//       headers: {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "multipart/form-data"
//       }
//     });

//     const savedInvoice = response?.data?.data || response?.data;
//     if (!savedInvoice) throw new Error(`Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);

//     toast.success(isEdit ? "Purchase Invoice updated successfully" : "Purchase Invoice saved successfully");
//     router.push(`/admin/purchaseInvoice-view`);
//   } catch (err) {
//     console.error("Error saving purchase invoice:", err);
//     toast.error(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//   } finally {
//     setLoading(false);
//   }
// }, [purchaseInvoiceData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router]);




// const handleOcrUpload = async (e) => {
//   const file = e.target.files[0];
//   if (!file) return;

//   setOcrExtracting(true);

//   try {
//     let imageDataUrl;

//     if (file.type === "application/pdf") {
//       // ✅ Convert first page of PDF to image
//       const pdfData = new Uint8Array(await file.arrayBuffer());
//       const loadingTask = pdfjsLib.getDocument({ data: pdfData });
//       const pdf = await loadingTask.promise;
//       const page = await pdf.getPage(1);
//       const viewport = page.getViewport({ scale: 2.0 });

//       const canvas = document.createElement("canvas");
//       const context = canvas.getContext("2d");
//       canvas.height = viewport.height;
//       canvas.width = viewport.width;

//       await page.render({ canvasContext: context, viewport }).promise;
//       imageDataUrl = canvas.toDataURL("image/png");
//     } else {
//       imageDataUrl = URL.createObjectURL(file);
//     }

//     toast.info("Extracting text... please wait");

//     const { data: { text } } = await Tesseract.recognize(imageDataUrl, "eng", {
//       logger: (m) => console.log(m),
//     });

//     console.log("🧾 OCR Text:", text);

//     toast.success("✅ OCR extraction completed!");
//   } catch (err) {
//     console.error("OCR Error:", err);
//     toast.error("❌ Failed to extract text from file.");
//   } finally {
//     setOcrExtracting(false);
//   }
// };


//   return (
//     <div ref={parentRef} className="">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

//       {/* Supplier & Document Details Section */}
//       <div className="flex flex-wrap justify-between  border rounded-lg shadow-lg ">
//         {/* Left column - Supplier details */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input
//               readOnly
//               value={purchaseInvoiceData.supplierCode || ""}
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             {purchaseInvoiceData.supplierName ? (
//               <input
//                 readOnly
//                 value={purchaseInvoiceData.supplierName}
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             ) : (
//               <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//             )}
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               readOnly
//               value={purchaseInvoiceData.contactPerson || ""}
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Number</label>
//             <input
//               name="refNumber"
//               value={purchaseInvoiceData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           {purchaseInvoiceData.purchaseOrderId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked Purchase Order ID</label>
//               <input
//                 readOnly
//                 value={purchaseInvoiceData.purchaseOrderId}
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             </div>
//           )}
//           {purchaseInvoiceData.goodReceiptNoteId && (
//             <div>
//               <label className="block mb-2 font-medium">Linked GRN ID</label>
//               <input
//                 readOnly
//                 value={purchaseInvoiceData.goodReceiptNoteId}
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             </div>
//           )}
//         </div>

//         {/* Right column - Document details */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={purchaseInvoiceData.status}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Pending">Pending</option>
//               <option value="Approved">Approved</option>
//               <option value="Rejected">Rejected</option>
//               <option value="Paid">Paid</option>
//               <option value="Partial_Paid">Partial Paid</option>
//               {/* Add other relevant statuses */}
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formatDateForInput(purchaseInvoiceData.postingDate)}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formatDateForInput(purchaseInvoiceData.documentDate)}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Due Date</label>
//             <input
//               type="date"
//               name="dueDate"
//               value={formatDateForInput(purchaseInvoiceData.dueDate)}
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
//           items={purchaseInvoiceData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onItemSelect={handleItemSelect}
//           onRemoveItem={removeItemRow}
//         />
//       </div>

//       {/* Batch Details Entry Section (visible for batch-managed items) */}
//       <div className="mb-8">
//         <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
//         {purchaseInvoiceData.items.map((item, index) =>
//           // Only render if item is selected, has code/name, and is batch-managed
//           item.item &&
//           item.itemCode && item.itemName &&
//           item.managedBy &&
//           item.managedBy.trim().toLowerCase() === "batch" ? (
//             <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
//               <div>
//                 <strong>{item.itemCode} - {item.itemName}</strong>
//                 <span className="ml-2 text-sm text-gray-600">(Qty: {item.quantity})</span>
//                 <span className="ml-4 text-sm font-medium">
//                   Allocated: {(ArrayOf(item.batches)).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0)} / {item.quantity}
//                 </span>
//               </div>
//               <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
//                 Set Batch Details
//               </button>
//             </div>
//           ) : null
//         )}
//       </div>
//       {/* Batch Modal (conditionally rendered) */}
//       {showBatchModal && selectedBatchItemIndex !== null && (
//         <BatchModal
//           batches={purchaseInvoiceData.items[selectedBatchItemIndex].batches}
//           onBatchEntryChange={handleBatchEntryChange}
//           onAddBatchEntry={addBatchEntry}
//           onClose={closeBatchModal}
//           itemCode={purchaseInvoiceData.items[selectedBatchItemIndex].itemCode}
//           itemName={purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
//           unitPrice={purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
//         />
//       )}

//       {/* Freight & Rounding Inputs */}
//       <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
//         <div>
//           <label className="block mb-1 font-medium">Freight</label>
//           <input
//             name="freight"
//             type="number"
//             value={purchaseInvoiceData.freight || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Rounding</label>
//           <input
//             name="rounding"
//             type="number"
//             value={purchaseInvoiceData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>

//       {/* Summary Section */}
//       <div className="grid md:grid-cols-3 gap-6 mb-8">
//         <div>
//           <label className="block mb-1 font-medium">Total Before Discount</label>
//           <input
//             readOnly
//             value={summary.totalBeforeDiscount}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">GST Total</label>
//           <input
//             readOnly
//             value={summary.gstTotal}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Grand Total</label>
//           <input
//             readOnly
//             value={summary.grandTotal}
//             className="w-full p-2 border bg-gray-100 rounded"
//           />
//         </div>
//       </div>

//       {/* Sales Employee & Remarks Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             name="salesEmployee"
//             value={purchaseInvoiceData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={purchaseInvoiceData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>

//       {/* Attachments Section */}
//       <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
//         <label className="font-medium block mb-1">Attachments</label>

//         {/* Display Existing uploaded files */}
//         {existingFiles.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//             {existingFiles.map((file, idx) => {
//               const url = file.fileUrl || file.url || file.path || "";
//               const type = file.fileType || "";
//               const name = file.fileName || url.split("/").pop() || `File-${idx}`;
//               if (!url) return null;
//               const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" />
//                   ) : (
//                     <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
//                   )}
//                   <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate hover:underline">
//                     {name}
//                   </a>
//                   <button
//                     onClick={() => {
//                       setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
//                       setRemovedFiles((prev) => [...prev, file]); // Add to removed list
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

//         {/* Input for New File Uploads */}
//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               // Prevent duplicate files by name+size
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = ""; // Clear input after selection
//           }}
//           className="border px-3 py-2 w-full rounded"
//         />

//         {/* Preview of New Uploads */}
//         {attachments.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);
//               const isPDF = file.type === "application/pdf";
//               const isImage = file.type.startsWith("image/");
//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
//                   {isImage ? (
//                     <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//                   ) : isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" />
//                   ) : (
//                     <p className="truncate text-xs">{file.name}</p>
//                   )}
//                   <button
//                     onClick={() => {
//                         setAttachments((prev) => prev.filter((_, i) => i !== idx));
//                         URL.revokeObjectURL(url); // Clean up object URL to prevent memory leaks
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
//       </div>
//        <div className="flex flex-col mb-4 border p-3 rounded bg-gray-50">
//   <label className="font-semibold mb-1">Upload Invoice (Image or PDF)</label>
//   <input
//     type="file"
//     accept="image/*,application/pdf"
//     onChange={handleOcrUpload}
//     className="p-2 border rounded"
//   />
//   {ocrExtracting && (
//     <p className="text-blue-500 text-sm mt-1">🔍 Extracting text, please wait...</p>
//   )}
// </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSavePurchaseInvoice}
//           disabled={loading}
//           className={`mt-4 px-4 py-2 rounded ${
//             loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Saving..." : isEdit ? "Update Invoice" : "Submit Invoice"}
//         </button>
//         <button
//           onClick={() => {
//             // Reset form to initial state and clear attachments
//             setPurchaseInvoiceData(initialPurchaseInvoiceState);
//             setAttachments([]);
//             setExistingFiles([]);
//             setRemovedFiles([]);
//             setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
//             router.push("/admin/purchase-invoice-view"); // Redirect on cancel
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Cancel
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }

// export default PurchaseInvoiceFormWrapper;

