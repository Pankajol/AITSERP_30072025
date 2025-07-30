"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation"; // Corrected import
import axios from "axios";
import { Suspense } from "react";
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection from "@/components/ItemSection"; // Assuming this component is correctly implemented
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper to generate unique IDs for batch entries
const generateUniqueId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper to ensure a variable is treated as an array
const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// Initial GRN state structure
const initialGRNState = {
  supplier: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  status: "Received",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      item: "", // Item ID
      itemCode: "",
      itemName: "",
      itemDescription: "", // Ensure this is mapped correctly
      quantity: 0, // Quantity for this GRN line (initially from PO remaining)
      allowedQuantity: 0, // Max quantity allowed to be received based on PO
      receivedQuantity: 0, // Quantity actually received in this GRN transaction
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstRate: 0,
      igstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      managedBy: "", // e.g., "none", "batch", "serial"
      batches: [], // Array to store allocated batch details {id, batchNumber, expiryDate, manufacturer, batchQuantity}
      errorMessage: "",
      qualityCheckDetails: [],
      warehouse: "", // Warehouse ID
      warehouseCode: "",
      warehouseName: "",
      stockAdded: false, // Flag to indicate if stock was added for this item (for backend processing)
    },
  ],
  salesEmployee: "",
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  purchaseOrderId: "", // Link to the originating Purchase Order
  attachments: [], // Array of file metadata
};

// Helper to format date for HTML date input (YYYY-MM-DD)
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    console.warn("Invalid date string passed to formatDateForInput:", dateStr);
    return "";
  }
  return d.toISOString().slice(0, 10);
}

// Helper to format date for display (e.g., inside batch modal if needed)
function formatDisplayDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

// BatchModal component (renders within the main form)
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
        <button
          type="button"
          onClick={onAddBatchEntry}
          className="px-4 py-2 bg-green-500 text-white rounded mb-4 hover:bg-green-600"
        >
          Add Batch Entry
        </button>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}


// GRNFormWrapper provides Suspense boundary for GRNForm
function GRNFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <GRNForm />
    </Suspense>
  );
}


// Main GRNForm component
function GRNForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);

  const parentRef = useRef(null);

  const [grnData, setGrnData] = useState(initialGRNState);
  
  // Memoized function to compute item-specific financial values
  const computeItemValues = useCallback((it) => {
    const q = Number(it.quantity) || 0;
    const up = Number(it.unitPrice) || 0;
    const dis = Number(it.discount) || 0;
    const fr = Number(it.freight) || 0;
    const net = up - dis;
    const tot = net * q + fr;
    
    let cg = 0;
    let sg = 0;
    let ig = 0;
    let gstAmt = 0;

    if (it.taxOption === "IGST") {
      const rate = Number(it.igstRate || it.gstRate) || 0; // Use igstRate if present, fallback to gstRate
      ig = (tot * rate) / 100;
      gstAmt = ig;
    } else {
      const rate = Number(it.gstRate) || 0;
      const half = rate / 2;
      cg = (tot * half) / 100;
      sg = cg;
      gstAmt = cg + sg;
    }

    return {
      priceAfterDiscount: net,
      totalAmount: tot,
      cgstAmount: cg,
      sgstAmount: sg,
      gstAmount: gstAmt,
      igstAmount: ig,
    };
  }, []);

  const [summary, setSummary] = useState({
    totalBeforeDiscount: 0,
    gstTotal: 0,
    grandTotal: 0,
  });

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);

  const [existingFiles, setExistingFiles] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);

  const [loading, setLoading] = useState(false);

  // Effect to load Purchase Order data from session storage (when copying a PO)
  useEffect(() => {
    const poJSON = sessionStorage.getItem("grnData");
    if (!poJSON) return;

    const loadPoData = () => {
      try {
        const po = JSON.parse(poJSON);

        if (!po || typeof po !== "object" || !po._id) {
          console.warn("Invalid Purchase Order data in sessionStorage");
          sessionStorage.removeItem("grnData");
          return;
        }

        const itemsFromPO = Array.isArray(po.items) && po.items.length > 0
          ? po.items.map(poItem => {
              const orderedQty = Number(poItem.quantity) || 0;
              const receivedQtyInPO = Number(poItem.receivedQuantity) || 0;
              const remainingQty = orderedQty - receivedQtyInPO;

              const baseItem = {
                ...initialGRNState.items[0], // Start with a clean item state structure
                item: poItem.item,
                itemCode: poItem.itemCode,
                itemName: poItem.itemName,
                itemDescription: poItem.itemDescription || "", // Explicitly map item description
                quantity: remainingQty, // Set GRN quantity to the remaining quantity from PO
                allowedQuantity: remainingQty, // This is the max quantity allowed to be received for this GRN
                receivedQuantity: 0, // This GRN line has not received anything yet
                unitPrice: Number(poItem.unitPrice) || 0,
                discount: Number(poItem.discount) || 0,
                freight: Number(poItem.freight) || 0,
                gstRate: Number(poItem.gstRate) || 0,
                igstRate: Number(poItem.igstRate) || 0,
                taxOption: poItem.taxOption || "GST",
                managedBy: poItem.managedBy || "none",
                batches: poItem.managedBy?.toLowerCase() === 'batch' && Array.isArray(poItem.batches)
                  ? poItem.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) })) // Ensure batch expiryDate is formatted
                  : [],
                warehouse: poItem.warehouse || "",
                warehouseCode: poItem.warehouse || "", // Assuming warehouseCode is same as warehouse ID
                warehouseName: poItem.warehouseName || "",
              };
              return { ...baseItem, ...computeItemValues(baseItem) };
            })
          : initialGRNState.items; // Fallback to initial state if no items in PO

        setGrnData((prev) => ({
          ...prev,
          purchaseOrderId: po._id,
          supplier: po.supplier || prev.supplier || "",
          supplierCode: po.supplierCode || prev.supplierCode || "",
          supplierName: po.supplierName || prev.supplierName || "",
          contactPerson: po.contactPerson || prev.contactPerson || "",
          postingDate: formatDateForInput(po.postingDate || new Date()),
          documentDate: formatDateForInput(po.documentDate || new Date()),
          validUntil: formatDateForInput(po.validUntil || ''),
          items: itemsFromPO,
          freight: Number(po.freight) || 0,
          rounding: Number(po.rounding) || 0,
          remarks: po.remarks || "",
          salesEmployee: po.salesEmployee || "",
          attachments: po.attachments || [],
        }));

        setExistingFiles(po.attachments || []);
        setAttachments([]);
        setRemovedFiles([]);

        toast.success("✅ Purchase Order loaded into GRN");
      } catch (error) {
        console.error("Error parsing PO data from sessionStorage:", error);
        toast.error("Failed to load Purchase Order data.");
      } finally {
        sessionStorage.removeItem("grnData"); // Clear session storage after loading
      }
    };

    loadPoData();
  }, [computeItemValues]);

  // Effect to fetch GRN data for edit mode
  useEffect(() => {
    if (!isEdit || !editId) return;

    const fetchGRN = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Unauthorized! Please login again.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`/api/grn/${editId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.success) {
          const rec = res.data.data;
          setGrnData((prev) => ({
            ...prev,
            ...rec,
            postingDate: formatDateForInput(rec.postingDate),
            validUntil: formatDateForInput(rec.validUntil),
            documentDate: formatDateForInput(rec.documentDate),
            items: rec.items.map(item => ({
              ...item,
              managedBy: item.managedBy || "none",
              batches: Array.isArray(item.batches) ? item.batches.map(b => ({
                id: b.id || b._id || generateUniqueId(), // Use existing _id or generate new
                ...b,
                expiryDate: formatDateForInput(b.expiryDate)
              })) : [],
              // When editing an existing GRN, 'allowedQuantity' can be set to the GRN line's quantity.
              allowedQuantity: item.quantity, 
              receivedQuantity: item.receivedQuantity || item.quantity, // Default to item.quantity if not specified
              itemDescription: item.itemDescription || "", // Ensure description is loaded
            }))
          }));

          setExistingFiles(rec.attachments || []);
          setAttachments([]);
          setRemovedFiles([]);
        } else {
          toast.error(res.data.error || "Failed to load GRN");
        }
      } catch (err) {
        console.error("Error loading GRN:", err);
        toast.error(err.response?.data?.error || "Error loading GRN");
      } finally {
        setLoading(false);
      }
    };

    fetchGRN();
  }, [isEdit, editId]);

  // General input change handler for top-level GRN fields
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setGrnData((p) => ({ ...p, [name]: value }));
  }, []);

  // Handler for selecting a supplier from SupplierSearch component
  const handleSupplierSelect = useCallback((s) => {
    setGrnData((p) => ({
      ...p,
      supplier: s._id, 
      supplierCode: s.supplierCode,
      supplierName: s.supplierName,
      contactPerson: s.contactPersonName,
    }));
  }, []);

  // Handler to add a new empty item row
  const addItemRow = useCallback(() => {
    setGrnData((p) => ({ ...p, items: [...p.items, { ...initialGRNState.items[0] }] }));
  }, []);

  // Handler to remove an item row
  const removeItemRow = useCallback((i) => {
    setGrnData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }, []);

  // Handler for changes within an individual item row
  const handleItemChange = useCallback(
    (i, e) => {
      const { name, value } = e.target;
      setGrnData((p) => {
        const items = [...p.items];
        items[i] = {
          ...items[i],
          // Convert to Number for numeric fields, otherwise keep value
          [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "receivedQuantity"].includes(name)
            ? Number(value) || 0
            : value,
        };
        
        // Ensure consistency between quantity and receivedQuantity
        if (name === "quantity") {
            // If quantity is reduced, ensure receivedQuantity doesn't exceed new quantity
            items[i].receivedQuantity = Math.min(items[i].receivedQuantity, Number(value) || 0);
        } else if (name === "receivedQuantity") {
            // Ensure receivedQuantity doesn't exceed the allowedQuantity (from PO or initial set)
            // AND does not exceed the current item quantity (the amount we *intend* to receive in this GRN)
            items[i].receivedQuantity = Math.min(Number(value) || 0, items[i].allowedQuantity, items[i].quantity);
        }

        items[i] = { ...items[i], ...computeItemValues(items[i]) };
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  // Handler for when an item is selected from the ItemSearch component
  const handleItemSelect = useCallback(
    async (i, sku) => {
      let managedByValue = sku.managedBy || "";
      // If managedBy is not directly available in SKU, fetch from item master API
      if (!managedByValue || managedByValue.trim() === "") {
        try {
          const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
          managedByValue = res.data.success ? res.data.data.managedBy : "";
        } catch (error) {
          console.error("Error fetching item master details for managedBy:", error);
          managedByValue = ""; // Fallback if API call fails
        }
      }
      
      const base = {
        item: sku._id,
        itemCode: sku.itemCode,
        itemName: sku.itemName,
        itemDescription: sku.description || "", // Explicitly set item description from SKU
        quantity: 1, // Default quantity for a newly added item
        allowedQuantity: 1, // For a newly added item, assume 1 is allowed
        receivedQuantity: 0, // For a newly added item, nothing is received yet
        unitPrice: Number(sku.unitPrice) || 0,
        discount: Number(sku.discount) || 0,
        freight: Number(sku.freight) || 0,
        gstRate: Number(sku.gstRate) || 0,
        igstRate: Number(sku.igstRate) || 0,
        taxOption: sku.taxOption || "GST",
        managedBy: managedByValue,
        batches: managedByValue.toLowerCase() === "batch" ? [] : [], // Empty batches initially for a new item line
        warehouse: sku.warehouse || "",
        warehouseCode: sku.warehouse || "",
        warehouseName: sku.warehouseName || "",
      };
      setGrnData((p) => {
        const items = [...p.items];
        items[i] = { ...initialGRNState.items[0], ...base, ...computeItemValues(base) };
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  // Batch modal handlers.
  const openBatchModal = useCallback((itemIndex) => {
    const currentItem = grnData.items[itemIndex];
    
    // Pre-checks before opening batch modal
    if (!currentItem.itemCode || !currentItem.itemName) {
      toast.warn("Please select an Item (with Code and Name) before setting batch details.");
      return;
    }
    if (!currentItem.item || !currentItem.warehouse) {
      toast.warn("Please select an Item and a Warehouse for this line item before setting batch details.");
      return;
    }
    if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
      toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`);
      return;
    }

    setSelectedBatchItemIndex(itemIndex);
    setShowBatchModal(true);
  }, [grnData.items]);

  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setSelectedBatchItemIndex(null);
  }, []);

  // Handler for changes within a batch entry inside the modal
  const handleBatchEntryChange = useCallback((batchIdx, field, value) => {
    setGrnData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      const updatedBatches = ArrayOf(currentItem.batches);

      if (field === 'remove') {
        updatedBatches.splice(batchIdx, 1);
      } else {
        if (updatedBatches[batchIdx]) { 
            const finalValue = (field === "batchQuantity" && isNaN(value)) ? 0 : value;
            const updatedBatch = { 
                ...updatedBatches[batchIdx],
                [field]: finalValue,
            };
            updatedBatches[batchIdx] = updatedBatch;
        } else {
            console.error(`Attempted to update non-existent batch at index ${batchIdx}. This should not happen.`);
        }
      }
      
      currentItem.batches = updatedBatches;
      updatedItems[selectedBatchItemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, [selectedBatchItemIndex]);


  // Handler to add a new empty batch entry inside the modal
  const addBatchEntry = useCallback(() => {
    setGrnData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      const currentBatches = ArrayOf(currentItem.batches);

      const lastEntry = currentBatches[currentBatches.length - 1];
      // Prevent adding a new batch entry if the last one is empty (no batchNumber and no quantity)
      if (
        lastEntry &&
        (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
        (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)
      ) {
        toast.warn("Please fill the current empty batch entry before adding a new one.");
        return { ...prev, items: updatedItems };
      }

      currentBatches.push({
        id: generateUniqueId(),
        batchNumber: "",
        expiryDate: "",
        manufacturer: "",
        batchQuantity: 0,
      });
      currentItem.batches = currentBatches;
      updatedItems[selectedBatchItemIndex] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, [selectedBatchItemIndex]);

  // Effect to calculate summary totals (Total Before Discount, GST Total, Grand Total)
  useEffect(() => {
    const totalBeforeDiscountCalc = grnData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstTotalCalc = grnData.items.reduce(
      (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : (it.gstAmount || 0)),
      0
    );
    const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(grnData.freight || 0) + Number(grnData.rounding || 0);
    
    setSummary({
      totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
      gstTotal: gstTotalCalc.toFixed(2),
      grandTotal: grandTotalCalc.toFixed(2),
    });
  }, [grnData.items, grnData.freight, grnData.rounding]);

  // Handler to save the GRN (either create new or update existing)
  const handleSaveGRN = useCallback(async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized: Please log in");
        setLoading(false);
        return;
      }

      // Validate top-level supplier selection
      if (!grnData.supplier) {
        toast.error("Please select a supplier.");
        setLoading(false);
        return;
      }

      // Validate items: ensure item, warehouse, quantity > 0, and receivedQuantity <= quantity
      const invalidItems = grnData.items.some(it => 
          !it.item || // Check if item is selected
          !it.warehouse || // Check if warehouse is selected
          (Number(it.quantity) || 0) <= 0 || // Quantity must be positive
          (Number(it.receivedQuantity) || 0) > (Number(it.quantity) || 0) // Received quantity cannot exceed GRN line quantity
      );
      if (!grnData.items.length || invalidItems) {
        toast.error("Please add at least one valid item with Item, Warehouse, Quantity greater than 0, and ensure Received Quantity does not exceed the GRN Line Quantity.");
        setLoading(false);
        return;
      }

      // Validate batch-managed items: total batch quantity must match item quantity for this GRN line
      for (const [idx, item] of grnData.items.entries()) {
        if (item.managedBy?.toLowerCase() === "batch") {
          const totalAllocatedBatchQty = ArrayOf(item.batches).reduce(
            (sum, b) => sum + (Number(b.batchQuantity) || 0),
            0
          );
          if (totalAllocatedBatchQty !== Number(item.quantity)) {
            toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch quantity (${totalAllocatedBatchQty}) does not match the GRN item's quantity (${item.quantity}). Please adjust batch details.`);
            setLoading(false);
            return;
          }
          if (totalAllocatedBatchQty === 0 && Number(item.quantity) > 0) {
              toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches have been entered. Please set batch details.`);
              setLoading(false);
              return;
          }
          // Also ensure individual batch entries are valid (batch number and quantity > 0)
          const invalidBatchEntry = ArrayOf(item.batches).some(b => 
              !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0
          );
          if (invalidBatchEntry) {
              toast.error(`Item ${item.itemName} (Row ${idx + 1}): Contains an invalid batch entry. Batch Number and Quantity must be provided and Quantity must be greater than 0.`);
              setLoading(false);
              return;
          }
        }
      }

      // Prepare items for submission, ensuring numeric values are numbers and filtering out 'id' from batches
      const itemsForSubmission = ArrayOf(grnData.items).map(it => ({
        ...it,
        quantity: Number(it.quantity) || 0,
        receivedQuantity: Number(it.receivedQuantity || it.quantity) || 0, // Ensure receivedQuantity is set
        unitPrice: Number(it.unitPrice) || 0,
        discount: Number(it.discount) || 0,
        freight: Number(it.freight) || 0,
        gstRate: Number(it.gstRate) || 0,
        igstRate: Number(it.igstRate) || 0,
        managedByBatch: it.managedBy?.toLowerCase() === 'batch', // Boolean flag for backend
        // Filter out incomplete/empty batch entries and remove client-side 'id'
        batches: ArrayOf(it.batches).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
      }));

      // Destructure attachments as they are handled separately by FormData
      const { purchaseOrderId, attachments: _, ...restData } = grnData;
      const payload = {
        ...restData,
        items: itemsForSubmission,
        freight: Number(restData.freight) || 0, // Ensure top-level freight is a number
        rounding: Number(restData.rounding) || 0, // Ensure top-level rounding is a number
        ...summary, // Summary is already calculated and formatted
        ...(purchaseOrderId ? { purchaseOrderId } : {}), // Conditionally add purchaseOrderId if present
      };

      const formData = new FormData();
      formData.append("grnData", JSON.stringify(payload));
      
      // Append IDs of files marked for removal
      if (removedFiles.length > 0) {
        formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
      }
      // Append metadata of existing files (if needed by backend to differentiate from new/removed)
      if (existingFiles.length > 0) {
        formData.append("existingFiles", JSON.stringify(existingFiles));
      }
      // Append new attachment files
      attachments.forEach(file => formData.append("newAttachments", file));

      const url = isEdit ? `/api/grn/${editId}` : "/api/grn";
      const method = isEdit ? "put" : "post";

      const response = await axios({
        method,
        url,
        data: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data', // Important for sending files
        },
      });

      const savedGRN = response?.data?.data || response?.data;
      if (!savedGRN) throw new Error("Failed to save GRN");

      // Sync Purchase Order status and received quantities if linked
      if (savedGRN.purchaseOrderId) { // Removed typeof check as syncPurchaseOrder is an internal function
        await syncPurchaseOrder(savedGRN, token);
      }

      toast.success(isEdit ? "GRN updated successfully" : "GRN saved successfully");
      router.push("/admin/grn-view"); // Redirect to GRN view page
    } catch (err) {
      console.error("Error saving GRN:", err);
      toast.error(err.response?.data?.error || err.message || "Failed to save GRN");
    } finally {
      setLoading(false);
    }
  }, [grnData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router]);


  // Helper function to update the linked Purchase Order's received quantities and status
  async function syncPurchaseOrder(savedGRN, token) {
    try {
      // Fetch the latest state of the PO
      const { data: poRes } = await axios.get(`/api/purchase-order/${savedGRN.purchaseOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const po = poRes?.data;
      if (!po || !po.items) throw new Error("PO not found or invalid format");

      // Create a map of item ID to the quantity received in *this specific GRN transaction*
      const grnReceivedMap = new Map();
      savedGRN.items.forEach(({ item, receivedQuantity = 0 }) => {
        grnReceivedMap.set(item, receivedQuantity);
      });

      // Update PO items with newly received quantities
      const updatedItems = po.items.map(poItem => {
        const currentReceivedInPO = Number(poItem.receivedQuantity) || 0;
        const receivedFromCurrentGRN = grnReceivedMap.get(poItem.item.toString()) || 0; // Get quantity received in this GRN for this PO item

        return {
          ...poItem,
          receivedQuantity: currentReceivedInPO + receivedFromCurrentGRN, // Add to previously received
        };
      });

      // Determine new PO status
      const allReceived = updatedItems.every(({ receivedQuantity, orderedQuantity }) =>
        (receivedQuantity || 0) >= (orderedQuantity || 0)
      );
      const anyReceived = updatedItems.some(({ receivedQuantity }) => (receivedQuantity || 0) > 0);
      const newStatus = allReceived ? "Completed" : anyReceived ? "PartiallyReceived" : "Open";

      // Update the Purchase Order in the backend
      await axios.put(
        `/api/purchase-order/${savedGRN.purchaseOrderId}`,
        { items: updatedItems, orderStatus: newStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json", // This should be json for PO update
          },
        }
      );
      console.log(`Purchase Order ${savedGRN.purchaseOrderId} synced successfully.`);
    } catch (err) {
      console.error("Failed to update linked PO:", err);
      toast.warn("GRN saved, but updating Purchase Order failed");
    }
  }

  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit GRN" : "GRN Form"}</h1>

      {/* Supplier & Document Details Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        {/* Left column - Supplier details */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input
              readOnly
              value={grnData.supplierCode || ""}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            {grnData.supplierName ? (
              <input
                readOnly
                value={grnData.supplierName}
                className="w-full p-2 border rounded bg-gray-100"
              />
            ) : (
              <SupplierSearch onSelectSupplier={handleSupplierSelect} />
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              readOnly
              value={grnData.contactPerson || ""}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input
              name="refNumber"
              value={grnData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>

        {/* Right column - Document details */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={grnData.status}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Received">Received</option>
              <option value="Partial">Partial</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(grnData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formatDateForInput(grnData.validUntil)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDateForInput(grnData.documentDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={grnData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onItemSelect={handleItemSelect}
          onRemoveItem={removeItemRow}
        />
      </div>

      {/* Batch Details Entry Section (visible for batch-managed items) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
        {grnData.items.map((item, index) =>
          // Only render if item is selected, has code/name, and is batch-managed
          item.item &&
          item.itemCode && item.itemName &&
          item.managedBy &&
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
      {/* Batch Modal (conditionally rendered) */}
      {showBatchModal && selectedBatchItemIndex !== null && (
        <BatchModal
          batches={grnData.items[selectedBatchItemIndex].batches}
          onBatchEntryChange={handleBatchEntryChange}
          onAddBatchEntry={addBatchEntry}
          onClose={closeBatchModal}
          itemCode={grnData.items[selectedBatchItemIndex].itemCode}
          itemName={grnData.items[selectedBatchItemIndex].itemName}
          unitPrice={grnData.items[selectedBatchItemIndex].unitPrice}
        />
      )}

      {/* Freight & Rounding Inputs */}
      <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
        <div>
          <label className="block mb-1 font-medium">Freight</label>
          <input
            name="freight"
            type="number"
            value={grnData.freight || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Rounding</label>
          <input
            name="rounding"
            type="number"
            value={grnData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div>
          <label className="block mb-1 font-medium">Total Before Discount</label>
          <input
            readOnly
            value={summary.totalBeforeDiscount}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">GST Total</label>
          <input
            readOnly
            value={summary.gstTotal}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Grand Total</label>
          <input
            readOnly
            value={summary.grandTotal}
            className="w-full p-2 border bg-gray-100 rounded"
          />
        </div>
      </div>

      {/* Sales Employee & Remarks Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            name="salesEmployee"
            value={grnData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={grnData.remarks || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Attachments Section */}
      <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
        <label className="font-medium block mb-1">Attachments</label>

        {/* Display Existing uploaded files */}
        {existingFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {existingFiles.map((file, idx) => {
              const url = file.fileUrl || file.url || file.path || "";
              const type = file.fileType || "";
              const name = file.fileName || url.split("/").pop() || `File-${idx}`;

              if (!url) return null;

              const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

              return (
                <div
                  key={idx}
                  className="relative border rounded p-2 text-center bg-gray-50 shadow-sm"
                >
                  {isPDF ? (
                    <object
                      data={url}
                      type="application/pdf"
                      className="h-24 w-full rounded bg-gray-200"
                    />
                  ) : (
                    <img
                      src={url}
                      alt={name}
                      className="h-24 w-full object-cover rounded"
                    />
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 text-xs mt-1 truncate hover:underline"
                  >
                    {name}
                  </a>
                  <button
                    onClick={() => {
                      setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
                      setRemovedFiles((prev) => [...prev, file]); // Add to removed list
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Input for New File Uploads */}
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            const files = Array.from(e.target.files);
            setAttachments((prev) => {
              // Prevent duplicate files by name+size
              const map = new Map(prev.map((f) => [f.name + f.size, f]));
              files.forEach((f) => map.set(f.name + f.size, f));
              return [...map.values()];
            });
            e.target.value = ""; // Clear input after selection
          }}
          className="border px-3 py-2 w-full rounded"
        />

        {/* Preview of New Uploads */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
            {attachments.map((file, idx) => {
              const url = URL.createObjectURL(file);
              const isPDF = file.type === "application/pdf";
              const isImage = file.type.startsWith("image/");

              return (
                <div
                  key={idx}
                  className="relative border rounded p-2 text-center bg-gray-50 shadow-sm"
                >
                  {isImage ? (
                    <img
                      src={url}
                      alt={file.name}
                      className="h-24 w-full object-cover rounded"
                    />
                  ) : isPDF ? (
                    <object
                      data={url}
                      type="application/pdf"
                      className="h-24 w-full rounded bg-gray-200"
                    />
                  ) : (
                    <p className="truncate text-xs">{file.name}</p>
                  )}
                  <button
                    onClick={() => {
                        setAttachments((prev) => prev.filter((_, i) => i !== idx));
                        URL.revokeObjectURL(url); // Clean up object URL
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSaveGRN}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? "Saving..." : isEdit ? "Update GRN" : "Submit GRN"}
        </button>
        <button
          onClick={() => {
            // Reset form to initial state and clear attachments
            setGrnData(initialGRNState);
            setAttachments([]);
            setExistingFiles([]);
            setRemovedFiles([]);
            setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
            router.push("/admin/grn-view"); // Redirect on cancel
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
        >
          Cancel
        </button>
      </div>

      <ToastContainer />
    </div>
  );
}

export default GRNFormWrapper;