"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Suspense } from "react";
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection from "@/components/ItemSection"; // Assuming this component is correctly implemented
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper to generate unique IDs for batch entries (from GRN code)
const generateUniqueId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

// Helper to ensure a variable is treated as an array (from GRN code)
const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// Initial Purchase Invoice state (updated with GRN-like structure and defaults)
const initialPurchaseInvoiceState = {
  supplier: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "", // Can be used for Invoice Number
  status: "Pending", // Default status for a new invoice
  postingDate: "",
  documentDate: "",
  dueDate: "", // Specific to invoices
  items: [
    {
      item: "",
      itemCode: "",
      itemName: "",
      itemDescription: "", // Ensure this is mapped correctly
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0, // Item-level freight
      gstRate: 0,
      igstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      taxOption: "GST",
      priceAfterDiscount: 0, // Unit price after discount
      totalAmount: 0, // Total for the line item (quantity * priceAfterDiscount + freight)
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      managedBy: "", // From item master: "none", "batch", "serial"
      batches: [], // Array to store allocated batch details {id, batchNumber, expiryDate, manufacturer, batchQuantity}
      errorMessage: "", // For client-side validation messages on items
      warehouse: "", // Warehouse ID
      warehouseCode: "",
      warehouseName: "",
    },
  ],
  salesEmployee: "",
  remarks: "",
  freight: 0, // Document-level freight
  rounding: 0,
  totalBeforeDiscount: 0, // Sum of totalAmount from items
  gstTotal: 0, // Sum of GST from items
  grandTotal: 0, // TotalBeforeDiscount + GstTotal + Freight (document) + Rounding
  purchaseOrderId: "", // Link to Purchase Order if copied from PO
  goodReceiptNoteId: "", // Link to GRN if copied from GRN
  // You might want to add sourceType and sourceId here for clarity
  sourceType: "", // e.g., "PurchaseOrder", "GRN"
  sourceId: "", // ID of the source document
  attachments: [], // Array of file metadata for attachments
};

// Helper to format date for HTML date input (YYYY-MM-DD) - using GRN's robust version
function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) {
    console.warn("Invalid date string passed to formatDateForInput:", dateStr);
    return "";
  }
  return d.toISOString().slice(0, 10);
}

// BatchModal component (copied from GRN code)
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


function PurchaseInvoiceFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading purchase invoice form data...</div>}>
      <PurchaseInvoiceForm />
    </Suspense>
  );
}

function PurchaseInvoiceForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);

  const parentRef = useRef(null);

  const [purchaseInvoiceData, setPurchaseInvoiceData] = useState(initialPurchaseInvoiceState);
  
  // Memoized function to compute item-specific financial values (from GRN code)
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
      const rate = Number(it.igstRate || it.gstRate) || 0;
      ig = (tot * rate) / 100;
      gstAmt = ig;
    } else { // Assuming "GST" option implies CGST + SGST
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
  
  const [existingFiles, setExistingFiles] = useState([]); // For files already uploaded (edit mode)
  const [attachments, setAttachments] = useState([]); // For new files to be uploaded
  const [removedFiles, setRemovedFiles] = useState([]); // For files to be removed (edit mode)

  const [loading, setLoading] = useState(false);

  // Effect to load data from Session Storage (from GRN or copied PI)
  useEffect(() => {
    const grnDataForInvoice = sessionStorage.getItem("grnDataForInvoice");
    const purchaseInvoiceCopyData = sessionStorage.getItem("purchaseInvoiceData"); // If copying from another PI

    if (!grnDataForInvoice && !purchaseInvoiceCopyData) return;

    const loadSourceData = () => {
      try {
        const sourceDoc = grnDataForInvoice ? JSON.parse(grnDataForInvoice) : JSON.parse(purchaseInvoiceCopyData);
        const sourceType = grnDataForInvoice ? "GRN" : "PurchaseInvoice";

        // Normalize supplier data (assuming supplier might be an object or just an ID string)
        const supplierId = sourceDoc.supplier?._id || sourceDoc.supplier || "";
        const supplierCode = sourceDoc.supplier?.supplierCode || sourceDoc.supplierCode || "";
        const supplierName = sourceDoc.supplier?.supplierName || sourceDoc.supplierName || "";
        const contactPerson = sourceDoc.supplier?.contactPersonName || sourceDoc.contactPerson || "";

        // Prepare items with computed values and correct fields
        const preparedItems = (sourceDoc.items || []).map((item) => {
          // Use `receivedQuantity` from GRN, or `quantity` from PO/PI copy if available.
          // For a new invoice, quantity represents the amount on the invoice.   itemDescription
          const quantityToInvoice = (sourceType === "GRN" ? Number(item.quantity) : Number(item.quantity)) || 0;
          // ... description

       
 
          const baseItem = {
            ...initialPurchaseInvoiceState.items[0], // Start with base structure
            item: item.item?._id || item.item || "",
            itemCode: item.itemCode || "",
            itemName: item.itemName || "",
            itemDescription:  item.itemDescription || item.description || item.itemDescription  ||  "", // Map description correctly
            quantity: quantityToInvoice, // Set quantity for the invoice line
            unitPrice: Number(item.unitPrice || item.price) || 0, // Handle price if coming from a different field name
            discount: Number(item.discount) || 0,
            freight: Number(item.freight) || 0, // Item-level freight
            gstRate: Number(item.gstRate) || 0,
            igstRate: Number(item.igstRate) || 0,
            cgstRate: Number(item.cgstRate) || 0,
            sgstRate: Number(item.sgstRate) || 0,
            taxOption: item.taxOption || "GST",
            managedBy: item.managedBy || "none",
            batches: Array.isArray(item.batches)
              ? item.batches.map(b => ({ ...b, id: b.id || b._id || generateUniqueId(), expiryDate: formatDateForInput(b.expiryDate) }))
              : [],
            warehouse: item.warehouse || "",
            warehouseCode: item.warehouseCode || "",
            warehouseName: item.warehouseName || "",
          };
          // Recompute values based on the quantity intended for this PI
          return { ...baseItem, ...computeItemValues(baseItem) };
        });

        setExistingFiles(sourceDoc.attachments || []); // Copy existing attachments

        // Fill form data
        setPurchaseInvoiceData((prev) => ({
          ...prev,
          supplier: supplierId,
          supplierCode: supplierCode,
          supplierName: supplierName,
          contactPerson: contactPerson,
          refNumber: sourceDoc.refNumber || "", // Use source doc's refNumber for invoice number
          status: "Pending", // Default new PI status
          postingDate: formatDateForInput(new Date()), // Set current date for new PI
          documentDate: formatDateForInput(new Date()), // Set current date for new PI
          dueDate: formatDateForInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // Example: Due in 30 days
          items: preparedItems,
          salesEmployee: sourceDoc.salesEmployee || "",
          remarks: sourceDoc.remarks || "",
          freight: Number(sourceDoc.freight) || 0, // Document-level freight
          rounding: Number(sourceDoc.rounding) || 0,
          purchaseOrderId: sourceDoc.purchaseOrderId || "", // Link to PO if from PO/GRN
          goodReceiptNoteId: sourceDoc._id || "", // Link to GRN if from GRN (sourceDoc._id would be GRN ID)
          sourceType: sourceType,
          sourceId: sourceDoc._id, // ID of the source document (PO or GRN)
          invoiceType: sourceDoc.invoiceType || (sourceType === "GRN" ? "GRNCopy" : "Normal"),
        }));

        toast.success(`✅ ${sourceType === "GRN" ? "GRN" : "Purchase Invoice"} loaded successfully`);
      } catch (err) {
        console.error("Error parsing source data for PI:", err);
        toast.error("Failed to load data for Purchase Invoice.");
      } finally {
        sessionStorage.removeItem("grnDataForInvoice");
        sessionStorage.removeItem("purchaseInvoiceData");
      }
    };

    loadSourceData();
  }, [computeItemValues]); // Dependency on computeItemValues is correct


  // Effect to fetch Purchase Invoice data for edit mode
  useEffect(() => {
    if (!isEdit || !editId) return;

    const fetchPurchaseInvoice = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Unauthorized! Please login again.");
          setLoading(false);
          return;
        }

        const res = await axios.get(`/api/purchaseInvoice/${editId}`, { // Corrected API endpoint for fetching by ID
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.success) {
          const rec = res.data.data;
          setPurchaseInvoiceData((prev) => ({
            ...prev,
            ...rec,
            postingDate: formatDateForInput(rec.postingDate),
            documentDate: formatDateForInput(rec.documentDate),
            dueDate: formatDateForInput(rec.dueDate), // Format due date as well
            // Normalize supplier data from fetched record
            supplier: rec.supplier?._id || rec.supplier || "",
            supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
            supplierName: rec.supplier?.supplierName || rec.supplierName || "",
            contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
            
            // Map items with computed values
            items: ArrayOf(rec.items).map(item => {
              const baseItem = {
                ...initialPurchaseInvoiceState.items[0], // Ensure all fields are present
                ...item,
                // Ensure batches have unique IDs and formatted expiry dates if batch-managed
                batches: Array.isArray(item.batches) ? item.batches.map(b => ({
                  id: b.id || b._id || generateUniqueId(),
                  ...b,
                  expiryDate: formatDateForInput(b.expiryDate)
                })) : [],
                itemDescription: item.itemDescription || "", // Ensure description is loaded
                // Ensure numeric fields are numbers, and re-compute totals
                quantity: Number(item.quantity) || 0,
                unitPrice: Number(item.unitPrice) || 0,
                discount: Number(item.discount) || 0,
                freight: Number(item.freight) || 0,
                gstRate: Number(item.gstRate) || 0,
                igstRate: Number(item.igstRate) || 0,
                cgstRate: Number(item.cgstRate) || 0,
                sgstRate: Number(item.sgstRate) || 0,
              };
              return { ...baseItem, ...computeItemValues(baseItem) };
            })
          }));

          // Attachments handling for existing files
          setExistingFiles(rec.attachments || []);
          setAttachments([]); // Clear new attachments in edit mode initially
          setRemovedFiles([]); // Clear removed files in edit mode initially
        } else {
          toast.error(res.data.error || "Failed to load Purchase Invoice");
        }
      } catch (err) {
        console.error("Error loading Purchase Invoice:", err);
        toast.error(err.response?.data?.error || "Error loading Purchase Invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchPurchaseInvoice();
  }, [isEdit, editId, computeItemValues]); // Added computeItemValues to dependencies


  // Basic input handler for top-level form fields
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
  }, []);

  // Supplier select handler
  const handleSupplierSelect = useCallback((s) => {
    setPurchaseInvoiceData((p) => ({
      ...p,
      supplier: s._id,
      supplierCode: s.supplierCode,
      supplierName: s.supplierName,
      contactPerson: s.contactPersonName,
    }));
  }, []);

  // Add a new empty item row
  const addItemRow = useCallback(() => {
    setPurchaseInvoiceData((p) => ({ ...p, items: [...p.items, { ...initialPurchaseInvoiceState.items[0] }] }));
  }, []);

  // Remove an item row
  const removeItemRow = useCallback((i) => {
    setPurchaseInvoiceData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
  }, []);

  // Handler for changes within an individual item row (quantity, price, discount, etc.)
  const handleItemChange = useCallback(
    (i, e) => {
      const { name, value } = e.target;
      setPurchaseInvoiceData((p) => {
        const items = [...p.items];
        items[i] = {
          ...items[i],
          [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "cgstRate", "sgstRate"].includes(name)
            ? Number(value) || 0
            : value,
        };
        // Recompute item values after change
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
          managedByValue = "";
        }
      }
      
      const base = {
        item: sku._id,
        itemCode: sku.itemCode,
        itemName: sku.itemName,
        itemDescription: sku.description || "", // Explicitly set item description from SKU
        quantity: 1, // Default quantity for a newly added item
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
      setPurchaseInvoiceData((p) => {
        const items = [...p.items];
        items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValues(base) };
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  // Batch modal handlers (from GRN code)
  const openBatchModal = useCallback((itemIndex) => {
    const currentItem = purchaseInvoiceData.items[itemIndex];
    
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
  }, [purchaseInvoiceData.items]);

  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setSelectedBatchItemIndex(null);
  }, []);

  // Handler for changes within a batch entry inside the modal (from GRN code, adjusted)
  const handleBatchEntryChange = useCallback((batchIdx, field, value) => { // Removed itemIndex as it's selectedBatchItemIndex now
    setPurchaseInvoiceData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      const updatedBatches = ArrayOf(currentItem.batches);

      if (field === 'remove') { // Special field to remove a batch entry
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


  // Handler to add a new empty batch entry inside the modal (from GRN code)
  const addBatchEntry = useCallback(() => {
    setPurchaseInvoiceData((prev) => {
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
        id: generateUniqueId(), // Assign unique ID
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
    const totalBeforeDiscountCalc = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
    const gstTotalCalc = purchaseInvoiceData.items.reduce(
      (s, it) => s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : ((it.cgstAmount || 0) + (it.sgstAmount || 0))),
      0
    );
    const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
    
    setSummary({
      totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
      gstTotal: gstTotalCalc.toFixed(2),
      grandTotal: grandTotalCalc.toFixed(2),
    });
  }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

  // Handler to save the Purchase Invoice (either create new or update existing)
 const handleSavePurchaseInvoice = useCallback(async () => {
  try {
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Unauthorized: Please log in");
      setLoading(false);
      return;
    }

    // ✅ Validation: Supplier selected
    if (!purchaseInvoiceData.supplier) {
      toast.error("Please select a supplier.");
      setLoading(false);
      return;
    }

    // ✅ Validation: Items exist and are valid (item selected, quantity > 0)
    const invalidItems = purchaseInvoiceData.items.some(it =>
      !it.item || (Number(it.quantity) || 0) <= 0
    );
    if (!purchaseInvoiceData.items.length || invalidItems) {
      toast.error("Please add at least one valid item with Item and Quantity greater than 0.");
      setLoading(false);
      return;
    }

    // ✅ If PO → PI, validate that invoice qty does not exceed allowed qty
    if (purchaseInvoiceData.purchaseOrderId) {
      for (const [idx, item] of purchaseInvoiceData.items.entries()) {
        const allowedQty = Number(item.allowedQuantity) || 0;
        if (allowedQty > 0 && Number(item.quantity) > allowedQty) {
          toast.error(`Item ${item.itemName} (Row ${idx + 1}): Quantity (${item.quantity}) exceeds allowed (${allowedQty}) as per PO.`);
          setLoading(false);
          return;
        }
      }
    }

    // ✅ Validation: Batch-managed items
    for (const [idx, item] of purchaseInvoiceData.items.entries()) {
      if (item.managedBy?.toLowerCase() === "batch") {
        const batches = Array.isArray(item.batches) ? item.batches : [];

        const totalBatchQty = batches.reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
        if (totalBatchQty !== Number(item.quantity)) {
          toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch qty (${totalBatchQty}) does not match the item's qty (${item.quantity}).`);
          setLoading(false);
          return;
        }

        if (totalBatchQty === 0 && Number(item.quantity) > 0) {
          toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches entered.`);
          setLoading(false);
          return;
        }

        const invalidBatchEntry = batches.some(b =>
          !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0
        );
        if (invalidBatchEntry) {
          toast.error(`Item ${item.itemName} (Row ${idx + 1}): Invalid batch entry. Batch Number and Quantity must be provided.`);
          setLoading(false);
          return;
        }
      }
    }

    // ✅ Prepare items for backend
    const itemsForSubmission = purchaseInvoiceData.items.map(it => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      freight: Number(it.freight) || 0,
      gstRate: Number(it.gstRate) || 0,
      igstRate: Number(it.igstRate) || 0,
      cgstRate: Number(it.cgstRate) || 0,
      sgstRate: Number(it.sgstRate) || 0,
      managedByBatch: it.managedBy?.toLowerCase() === 'batch',
      batches: (it.batches || [])
        .filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0)
        .map(({ id, ...rest }) => rest)
    }));

    const { attachments: _, ...restData } = purchaseInvoiceData;

    const payload = {
      ...restData,
      items: itemsForSubmission,
      freight: Number(restData.freight) || 0,
      rounding: Number(restData.rounding) || 0,
      ...summary
    };

    const formData = new FormData();
    formData.append("invoiceData", JSON.stringify(payload));

    if (removedFiles.length > 0) {
      formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
    }
    if (existingFiles.length > 0) {
      formData.append("existingFiles", JSON.stringify(existingFiles));
    }
    attachments.forEach(file => formData.append("newAttachments", file));

    const url = isEdit ? `/api/purchaseInvoice/${editId}` : "/api/purchaseInvoice";
    const method = isEdit ? "put" : "post";

    const response = await axios({
      method,
      url,
      data: formData,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "multipart/form-data"
      }
    });

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
}, [purchaseInvoiceData, summary, attachments, removedFiles, existingFiles, isEdit, editId, router]);


  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

      {/* Supplier & Document Details Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        {/* Left column - Supplier details */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input
              readOnly
              value={purchaseInvoiceData.supplierCode || ""}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            {purchaseInvoiceData.supplierName ? (
              <input
                readOnly
                value={purchaseInvoiceData.supplierName}
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
              value={purchaseInvoiceData.contactPerson || ""}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Number</label>
            <input
              name="refNumber"
              value={purchaseInvoiceData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          {purchaseInvoiceData.purchaseOrderId && (
            <div>
              <label className="block mb-2 font-medium">Linked Purchase Order ID</label>
              <input
                readOnly
                value={purchaseInvoiceData.purchaseOrderId}
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>
          )}
          {purchaseInvoiceData.goodReceiptNoteId && (
            <div>
              <label className="block mb-2 font-medium">Linked GRN ID</label>
              <input
                readOnly
                value={purchaseInvoiceData.goodReceiptNoteId}
                className="w-full p-2 border rounded bg-gray-100"
              />
            </div>
          )}
        </div>

        {/* Right column - Document details */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={purchaseInvoiceData.status}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
              <option value="Partial_Paid">Partial Paid</option>
              {/* Add other relevant statuses */}
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(purchaseInvoiceData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDateForInput(purchaseInvoiceData.documentDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Due Date</label>
            <input
              type="date"
              name="dueDate"
              value={formatDateForInput(purchaseInvoiceData.dueDate)}
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
          items={purchaseInvoiceData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onItemSelect={handleItemSelect}
          onRemoveItem={removeItemRow}
        />
      </div>

      {/* Batch Details Entry Section (visible for batch-managed items) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
        {purchaseInvoiceData.items.map((item, index) =>
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
          batches={purchaseInvoiceData.items[selectedBatchItemIndex].batches}
          onBatchEntryChange={handleBatchEntryChange}
          onAddBatchEntry={addBatchEntry}
          onClose={closeBatchModal}
          itemCode={purchaseInvoiceData.items[selectedBatchItemIndex].itemCode}
          itemName={purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
          unitPrice={purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
        />
      )}

      {/* Freight & Rounding Inputs */}
      <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
        <div>
          <label className="block mb-1 font-medium">Freight</label>
          <input
            name="freight"
            type="number"
            value={purchaseInvoiceData.freight || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Rounding</label>
          <input
            name="rounding"
            type="number"
            value={purchaseInvoiceData.rounding || 0}
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
            value={purchaseInvoiceData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={purchaseInvoiceData.remarks || ""}
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
                <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
                  {isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" />
                  ) : (
                    <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
                  )}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate hover:underline">
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
                <div key={idx} className="relative border rounded p-2 text-center bg-gray-50 shadow-sm">
                  {isImage ? (
                    <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
                  ) : isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded bg-gray-200" />
                  ) : (
                    <p className="truncate text-xs">{file.name}</p>
                  )}
                  <button
                    onClick={() => {
                        setAttachments((prev) => prev.filter((_, i) => i !== idx));
                        URL.revokeObjectURL(url); // Clean up object URL to prevent memory leaks
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
          onClick={handleSavePurchaseInvoice}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? "Saving..." : isEdit ? "Update Invoice" : "Submit Invoice"}
        </button>
        <button
          onClick={() => {
            // Reset form to initial state and clear attachments
            setPurchaseInvoiceData(initialPurchaseInvoiceState);
            setAttachments([]);
            setExistingFiles([]);
            setRemovedFiles([]);
            setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
            router.push("/admin/purchase-invoice-view"); // Redirect on cancel
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

export default PurchaseInvoiceFormWrapper;




// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import SupplierSearch from "@/components/SupplierSearch";
// import ItemSection from "@/components/ItemSection";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Initial Purchase Invoice state (similar to initialGRNState but with relevant fields)
// const initialPurchaseInvoiceState = {
//   supplier: "",
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Pending", // Or another appropriate default status
//   postingDate: "",
//   documentDate: "",
//   dueDate: "", // Add due date for invoices
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstRate: 0,
//       igstRate: 0,
//       cgstRate: 0,
//       sgstRate: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       managedBy: "",
//       batches: [],
//       errorMessage: "",
//       // qualityCheckDetails might not be directly applicable here
//       warehouse: "",
//       warehouseCode: "",
//       warehouseName: "",
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   purchaseOrderId: "", // Link to Purchase Order if copied
//   goodReceiptNoteId: "", // Link to GRN if copied
// };

// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const m = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
//   if (m) return `${m[3]}-${m[2]}-${m[1]}`;
//   const d = new Date(dateStr);
//   return isNaN(d) ? "" : d.toISOString().slice(0, 10);
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
//   const [summary, setSummary] = useState({
//     totalBeforeDiscount: 0,
//     gstTotal: 0,
//     grandTotal: 0,
//   });

//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);
 

//   const [existingFiles, setExistingFiles] = useState([]);
//   const [attachments, setAttachments] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [newFiles, setNewFiles] = useState([]);

//   const [loading, setLoading] = useState(false);

// useEffect(() => {
//   const grnData = sessionStorage.getItem("grnDataForInvoice");
//   const poData = sessionStorage.getItem("purchaseInvoiceData");

//   if (!grnData && !poData) return;

//   try {
//     const sourceDoc = grnData ? JSON.parse(grnData) : JSON.parse(poData);

//     // ✅ Normalize supplier data
//     const supplierId = sourceDoc.supplier?._id || sourceDoc.supplier || "";
//     const supplierName = sourceDoc.supplier?.name || sourceDoc.supplierName || "";
//     const supplierCode = sourceDoc.supplier?.code || sourceDoc.supplierCode || "";

//     // ✅ Compute item values
//     const computeItemValues = (item) => {
//       const quantity = Number(item.quantity) || 0;
//       const unitPrice = Number(item.unitPrice || item.price) || 0;
//       const discount = Number(item.discount) || 0;
//       const freight = Number(item.freight) || 0;
//       const basePrice = unitPrice - discount;
//       const total = basePrice * quantity + freight;

//       let gstAmount = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
//       if (item.taxOption === "GST") {
//         const gstRate = Number(item.gstRate) || 0;
//         const half = gstRate / 2;
//         cgstAmount = (total * half) / 100;
//         sgstAmount = (total * half) / 100;
//         gstAmount = cgstAmount + sgstAmount;
//       } else if (item.taxOption === "IGST") {
//         const igstRate = Number(item.igstRate || item.gstRate) || 0;
//         igstAmount = (total * igstRate) / 100;
//       }

//       return { priceAfterDiscount: basePrice, totalAmount: total, gstAmount, cgstAmount, sgstAmount, igstAmount };
//     };

//     // ✅ Prepare items with computed values
//     const preparedItems = (sourceDoc.items || []).map((item) => {
//       const computedValues = computeItemValues(item);
//       return {
//         ...initialPurchaseInvoiceState.items[0],
//         ...item,
//         item: item.item?._id || item.item || "",
//         itemCode: item.itemCode || "",
//         itemName: item.itemName || "",
//         itemDescription: item.description || item.itemDescription || "",
//         quantity: Number(item.quantity) || 0,
//         unitPrice: Number(item.unitPrice || item.price) || 0,
//         discount: Number(item.discount) || 0,
//         freight: Number(item.freight) || 0,
//         gstRate: Number(item.gstRate) || 0,
//         igstRate: Number(item.igstRate) || 0,
//         cgstRate: Number(item.cgstRate) || 0,
//         sgstRate: Number(item.sgstRate) || 0,
//         taxOption: item.taxOption || "GST",
//         batches: item.batches || [],
//         managedBy: item.managedBy || "",
//         warehouse: item.warehouse || "",
//         warehouseCode: item.warehouseCode || "",
//         warehouseName: item.warehouseName || "",
//         ...computedValues,
//       };
//     });

//     // ✅ Attachments
//     setExistingFiles(sourceDoc.attachments || []);

//     // ✅ Fill form data
//     setPurchaseInvoiceData((prev) => ({
//       ...prev,
//       supplier: supplierId,
//       supplierCode: supplierCode,
//       supplierName: supplierName,
//       contactPerson: sourceDoc.contactPerson || "",
//       refNumber: sourceDoc.refNumber || "",
//       status: "Pending",
//       postingDate: formatDateForInput(new Date()),
//       documentDate: formatDateForInput(new Date()),
//       dueDate: formatDateForInput(new Date()),
//       items: preparedItems,
//       salesEmployee: sourceDoc.salesEmployee || "",
//       remarks: sourceDoc.remarks || "",
//       freight: Number(sourceDoc.freight) || 0,
//       rounding: Number(sourceDoc.rounding) || 0,
//       purchaseOrderId: sourceDoc.purchaseOrderId || "",
//       goodReceiptNoteId: sourceDoc.goodReceiptNoteId || "",
//       sourceType: sourceDoc.sourceType || "",
//       sourceId: sourceDoc.sourceId || "",
//     }));

//     // ✅ Clear sessionStorage after use
//     sessionStorage.removeItem("grnDataForInvoice");
//     sessionStorage.removeItem("purchaseInvoiceData");
//   } catch (err) {
//     console.error("Error loading PI copy data:", err);
//   }
// }, []);



  
// // useEffect(() => {
// //   const storedData = sessionStorage.getItem("purchaseInvoiceData");
// //   if (!storedData) return;

// //   try {
// //     const sourceDoc = JSON.parse(storedData);

// //     // ✅ Compute item values function
// //     const computeItemValues = (item) => {
// //       const quantity = Number(item.quantity) || 0;
// //       const unitPrice = Number(item.unitPrice || item.price) || 0;
// //       const discount = Number(item.discount) || 0;
// //       const freight = Number(item.freight) || 0;
// //       const basePrice = unitPrice - discount;
// //       const total = basePrice * quantity + freight;

// //       let gstAmount = 0, cgstAmount = 0, sgstAmount = 0, igstAmount = 0;
// //       if (item.taxOption === "GST") {
// //         const gstRate = Number(item.gstRate) || 0;
// //         const half = gstRate / 2;
// //         cgstAmount = (total * half) / 100;
// //         sgstAmount = (total * half) / 100;
// //         gstAmount = cgstAmount + sgstAmount;
// //       } else if (item.taxOption === "IGST") {
// //         const igstRate = Number(item.igstRate || item.gstRate) || 0;
// //         igstAmount = (total * igstRate) / 100;
// //       }

// //       return {
// //         priceAfterDiscount: basePrice,
// //         totalAmount: total,
// //         gstAmount,
// //         cgstAmount,
// //         sgstAmount,
// //         igstAmount,
// //       };
// //     };

// //     // ✅ Prepare items with computed fields
// //     const preparedItems = (sourceDoc.items || []).map((item) => {
// //       const computedValues = computeItemValues(item);
// //       return {
// //         ...initialPurchaseInvoiceState.items[0],
// //         ...item,
// //         item: item.item?._id || item.item || "",
// //         itemCode: item.itemCode || "",
// //         itemName: item.itemName || "",
// //         itemDescription: item.description || item.itemDescription || "",
// //         quantity: Number(item.quantity) || 0,
// //         unitPrice: Number(item.unitPrice || item.price) || 0,
// //         discount: Number(item.discount) || 0,
// //         freight: Number(item.freight) || 0,
// //         gstRate: Number(item.gstRate) || 0,
// //         igstRate: Number(item.igstRate) || 0,
// //         cgstRate: Number(item.cgstRate) || 0,
// //         sgstRate: Number(item.sgstRate) || 0,
// //         taxOption: item.taxOption || "GST",
// //         batches: item.batches || [],
// //         managedBy: item.managedBy || "",
// //         warehouse: item.warehouse || "",
// //         warehouseCode: item.warehouseCode || "",
// //         warehouseName: item.warehouseName || "",
// //         ...computedValues, // ✅ add calculated totals
// //       };
// //     });

// //     setExistingFiles(sourceDoc.attachments || []);
// //     setPurchaseInvoiceData((prev) => ({
// //       ...prev,
// //       supplier: sourceDoc.supplier?._id || sourceDoc.supplier || "",
// //       supplierCode: sourceDoc.supplierCode || "",
// //       supplierName: sourceDoc.supplierName || "",
// //       contactPerson: sourceDoc.contactPerson || "",
// //       refNumber: sourceDoc.refNumber || "",
// //       status: "Pending",
// //       postingDate: formatDateForInput(new Date()),
// //       documentDate: formatDateForInput(new Date()),
// //       dueDate: formatDateForInput(new Date()),
// //       items: preparedItems,
// //       salesEmployee: sourceDoc.salesEmployee || "",
// //       remarks: sourceDoc.remarks || "",
// //       freight: Number(sourceDoc.freight) || 0,
// //       rounding: Number(sourceDoc.rounding) || 0,
// //       purchaseOrderId: sourceDoc.purchaseOrderId || "",
// //       goodReceiptNoteId: sourceDoc.goodReceiptNoteId || "",
// //       sourceType: sourceDoc.sourceType || "",
// //       sourceId: sourceDoc.sourceId || "",
// //     }));

// //     sessionStorage.removeItem("purchaseInvoiceData");
// //   } catch (err) {
// //     console.error("Error loading PI copy data:", err);
// //   }
// // }, []);


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
//             supplier: rec.supplier?._id || rec.supplier || "", // Handle случаи, когда supplier может быть объектом или ID
//             supplierCode: rec.supplier?.supplierCode || rec.supplierCode || "",
//             supplierName: rec.supplier?.supplierName || rec.supplierName || "",
//             contactPerson: rec.supplier?.contactPersonName || rec.contactPerson || "",
//           }));

//           // ✅ Attachments handling
//           setExistingFiles(rec.attachments || []);
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
//   }, [isEdit, editId]);

//   // Basic input handler (same as in GRNForm)
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setPurchaseInvoiceData((p) => ({ ...p, [name]: value }));
//   }, []);

//   // Supplier select (same as in GRNForm)
//   const handleSupplierSelect = useCallback((s) => {
//     setPurchaseInvoiceData((p) => ({
//       ...p,
//       supplier: s._id,
//       supplierCode: s.supplierCode,
//       supplierName: s.supplierName,
//       contactPerson: s.contactPersonName,
//     }));
//   }, []);

//   function formatDateForInput(dateStr) {
//     if (!dateStr) return "";

//     const str = typeof dateStr === "string" ? dateStr : dateStr.toString();

//     const m = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
//     if (m) return `${m[3]}-${m[2]}-${m[1]}`;

//     const d = new Date(dateStr);
//     return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
//   }


//   // Compute per-item (same as in GRNForm)
//   const computeItemValues = useCallback((it) => {
//     const q = Number(it.quantity) || 0;
//     const up = Number(it.unitPrice) || 0;
//     const dis = Number(it.discount) || 0;
//     const fr = Number(it.freight) || 0;
//     const net = up - dis;
//     const tot = net * q + fr;
//     if (it.taxOption === "GST") {
//       const rate = Number(it.gstRate) || 0;
//       const half = rate / 2;
//       const cg = (tot * half) / 100;
//       const sg = cg;
//       return {
//         priceAfterDiscount: net,
//         totalAmount: tot,
//         cgstAmount: cg,
//         sgstAmount: sg,
//         gstAmount: cg + sg,
//         igstAmount: 0,
//       };
//     }
//     const rate = Number(it.igstRate || it.gstRate) || 0;
//     const ig = (tot * rate) / 100;
//     return {
//       priceAfterDiscount: net,
//       totalAmount: tot,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       gstAmount: 0,
//       igstAmount: ig,
//     };
//   }, []);

//   // Add/remove rows (same as in GRNForm)
//   const addItemRow = useCallback(() => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: [...p.items, initialPurchaseInvoiceState.items[0]] }));
//   }, []);
//   const removeItemRow = useCallback((i) => {
//     setPurchaseInvoiceData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   // Item change (same as in GRNForm)
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
//         items[i] = { ...items[i], ...computeItemValues(items[i]) };
//         return { ...p, items };
//       });
//     },
//     [computeItemValues]
//   );

//   // SKU select (same as in GRNForm)
//   const handleItemSelect = useCallback(
//     async (i, sku) => {
//       let mb = sku.managedBy || "";
//       if (!mb) {
//         try {
//           const res = await axios.get(`/api/items/${sku._id}`);
//           mb = res.data.success ? res.data.data.managedBy : "";
//         } catch {}
//       }
//       const base = {
//         item: sku._id,
//         itemCode: sku.itemCode,
//         itemName: sku.itemName,
//         itemDescription: sku.description || "",
//         quantity: 1,
//         unitPrice: sku.unitPrice,
//         discount: sku.discount || 0,
//         freight: sku.freight || 0,
//         gstRate: sku.gstRate || 0,
//         igstRate: sku.igstRate || 0,
//         cgstRate: sku.cgstRate || 0,
//         sgstRate: sku.sgstRate || 0,
//         taxOption: sku.taxOption || "GST",
//         managedBy: mb,
//       };
//       setPurchaseInvoiceData((p) => {
//         const items = [...p.items];
//         items[i] = { ...initialPurchaseInvoiceState.items[0], ...base, ...computeItemValues(base) };
//         return { ...p, items };
//       });
//     },
//     [computeItemValues]
//   );

//   // Batch modal handlers (same as in GRNForm)
//   const openBatchModal = useCallback((itemIndex) => {
//     setSelectedBatchItemIndex(itemIndex);
//     setShowBatchModal(true);
//   }, []);

//   const closeBatchModal = useCallback(() => {
//     setShowBatchModal(false);
//     setSelectedBatchItemIndex(null);
//   }, []);

//   const handleBatchEntryChange = useCallback((itemIndex, batchIndex, field, value) => {
//     setPurchaseInvoiceData((prev) => {
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
//     setPurchaseInvoiceData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       if (!currentItem.batches) currentItem.batches = [];
//       const lastEntry = currentItem.batches[currentItem.batches.length - 1];
//       if (
//         lastEntry &&
//         lastEntry.batchNumber === "" &&
//         lastEntry.expiryDate === "" &&
//         lastEntry.manufacturer === "" &&
//         lastEntry.batchQuantity === 0
//       ) {
//         return { ...prev, items: updatedItems };
//       }
//       currentItem.batches.push({
//         batchNumber: "",
//         expiryDate: "",
//         manufacturer: "",
//         batchQuantity: 0,
//       });
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);

//   // Recompute summary (same as in GRNForm)
//   useEffect(() => {
//     const tb = purchaseInvoiceData.items.reduce((s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0);
//     const gstT = purchaseInvoiceData.items.reduce(
//       (s, it) => s + (it.taxOption === "IGST" ? it.igstAmount : it.cgstAmount + it.sgstAmount),
//       0
//     );
//     const gr = tb + gstT + Number(purchaseInvoiceData.freight) + Number(purchaseInvoiceData.rounding);
//     setSummary({ totalBeforeDiscount: tb, gstTotal: gstT, grandTotal: gr });
//   }, [purchaseInvoiceData.items, purchaseInvoiceData.freight, purchaseInvoiceData.rounding]);

//   const handleSavePurchaseInvoice = useCallback(async () => {
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return toast.error("Unauthorized: Please log in");

//       // ✅ Validation
//       if (!purchaseInvoiceData.supplier) return toast.error("Please select a supplier");
//       if (!purchaseInvoiceData.items.length || purchaseInvoiceData.items.some(it => !it.item)) {
//         return toast.error("Please add valid items");
//       }

//       // ✅ Merge summary with purchaseInvoiceData
//       const payload = {
//         ...purchaseInvoiceData,
//         ...summary,
//       };

//       const formData = new FormData();
//       formData.append("invoiceData", JSON.stringify(payload)); // ✅ Correct data for backend

//   // ✅ Append removed files safely
// if (Array.isArray(removedFiles)) {
//   removedFiles.forEach(file => formData.append("removedFiles[]", JSON.stringify(file)));
// }

// // ✅ Append existing files safely
// if (Array.isArray(existingFiles)) {
//   existingFiles.forEach(file => formData.append("existingFiles[]", JSON.stringify(file)));
// }


//       // ✅ Append new file attachments (binary)
//       attachments.forEach(file => {
//         if (file instanceof File) {
//           formData.append("attachments", file); // ✅ Backend expects "attachments" (singular) for new files
//         }
//       });

      

//       const headers = {
//         Authorization: `Bearer ${token}`,
//         "Content-Type": "multipart/form-data",
//       };

//       let response;
//       if (isEdit && editId) {
//         response = await axios.put(`/api/purchaseInvoice/${editId}`, formData, { headers });
//       } else {
//         response = await axios.post("/api/purchaseInvoice", formData, { headers });
//       }

//       const savedInvoice = response?.data?.data || response?.data;
//       if (!savedInvoice) throw new Error(`Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);

//       toast.success(isEdit ? "Purchase Invoice updated successfully" : "Purchase Invoice saved successfully");
//       router.push(`/admin/purchaseInvoice-view`);
//     } catch (err) {
//       console.error("Error saving purchase invoice:", err);
//       toast.error(err.response?.data?.error || err.message || `Failed to ${isEdit ? 'update' : 'save'} purchase invoice`);
//     }
//   }, [purchaseInvoiceData, summary, removedFiles, existingFiles, attachments, isEdit, editId, router]);

//   return (
//     <div ref={parentRef} className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Purchase Invoice" : "Purchase Invoice Form"}</h1>

//       {/* Supplier & Doc Details (adjust fields as needed for invoice) */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         {/* Left column */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input
//               readOnly
//               value={purchaseInvoiceData.supplierCode}
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
//               value={purchaseInvoiceData.contactPerson}
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Invoice Number</label>
//             <input
//               name="refNumber" // Or a more specific name like "invoiceNumber"
//               value={purchaseInvoiceData.refNumber}
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
//               value={purchaseInvoiceData.status}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Pending">Pending</option>
//               <option value="Approved">Approved</option>
//               <option value="Rejected">Rejected</option>
//               <option value="Received">Received</option>

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

//       {/* Items */}
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

//       <div className="mb-8">
//         {purchaseInvoiceData.items.map((item, index) =>
//           item.item &&
//           item.managedBy &&
//           item.managedBy.trim().toLowerCase() === "batch" ? (
//             <div key={index} className="flex items-center justify-between border p-3 rounded mb-2">
//               <div>
//                 <strong>{item.itemCode} - {item.itemName}</strong>
//                 <span className="ml-2 text-sm text-gray-600">(Unit Price: {item.unitPrice})</span>
//               </div>
//               <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded">
//                 Set Batch Details
//               </button>
//             </div>
//           ) : null
//         )}
//       </div>
//       {/* Batch Modal (same as in GRNForm) */}
//       {showBatchModal && selectedBatchItemIndex !== null && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
//           <div className="bg-white p-6 rounded-lg max-w-lg w-full">
//             <h2 className="text-xl font-semibold mb-2">
//               Batch Details for {purchaseInvoiceData.items[selectedBatchItemIndex].itemCode} - {purchaseInvoiceData.items[selectedBatchItemIndex].itemName}
//             </h2>
//             <p className="mb-4 text-sm text-gray-600">
//               Unit Price: {purchaseInvoiceData.items[selectedBatchItemIndex].unitPrice}
//             </p>
//             {purchaseInvoiceData.items[selectedBatchItemIndex].batches.length > 0 ? (
//               <table className="w-full table-auto border-collapse mb-4">
//                 <thead>
//                   <tr className="bg-gray-200">
//                     <th className="border p-2">Batch Number</th>
//                     <th className="border p-2">Expiry Date</th>
//                     <th className="border p-2">Manufacturer</th>
//                     <th className="border p-2">Batch Quantity</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {purchaseInvoiceData.items[selectedBatchItemIndex].batches.map((batch, batchIdx) => (
//                     <tr key={batchIdx}>
//                       <td className="border p-2">
//                         <input
//                           type="text"
//                           value={batch.batchNumber || ""}
//                           onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "batchNumber", e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="border p-2">
//                         <input
//                           type="date"
//                           value={batch.expiryDate || ""}
//                           onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "expiryDate", e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="border p-2">
//                         <input
//                           type="text"
//                           value={batch.manufacturer || ""}
//                           onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "manufacturer", e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                       <td className="border p-2">
//                         <input
//                           type="number"
//                           value={batch.batchQuantity || 0}
//                           onChange={(e) => handleBatchEntryChange(selectedBatchItemIndex, batchIdx, "batchQuantity", e.target.value)}
//                           className="w-full p-1 border rounded"
//                         />
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             ) : (
//               <p className="mb-4">No batch entries yet.</p>
//             )}
//             <button type="button" onClick={addBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded mb-4">
//               Add Batch Entry
//             </button>
//             <div className="flex justify-end gap-2">
//               <button type="button" onClick={closeBatchModal} className="px-4 py-2 bg-blue-500 text-white rounded">
//                 Save &amp; Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Freight & Rounding (same as in GRNForm) */}
//       <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
//         <div>
//           <label className="block mb-1 font-medium">Freight</label>
//           <input
//             name="freight"
//             type="number"
//             value={purchaseInvoiceData.freight}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-1 font-medium">Rounding</label>
//           <input
//             name="rounding"
//             type="number"
//             value={purchaseInvoiceData.rounding}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>

//       {/* Summary (same as in GRNForm) */}
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

//       {/* Sales Employee & Remarks (same as in GRNForm) */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             name="salesEmployee"
//             value={purchaseInvoiceData.salesEmployee}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={purchaseInvoiceData.remarks}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>

//       {/* Attachments Section (same as in GRNForm) */}
//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>
//         {/* ... (rest of the attachments section UI and logic) */}
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
//                       setRemovedFiles((prev) => [...prev, file]);
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
//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const map = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => map.set(f.name + f.size, f));
//               return [...map.values()];
//             });
//             e.target.value = "";
//           }}
//           className="border px-3 py-2 w-full rounded"
//         />
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
//           onClick={handleSavePurchaseInvoice}
//           disabled={loading}
//           className={`mt-4 px-4 py-2 rounded ${
//             loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Loading..." : editId ? "Update" : "Submit"}
//         </button>
//         <button
//           onClick={() => {
//             setPurchaseInvoiceData(initialPurchaseInvoiceState);
//             setAttachments([]);
//             setExistingFiles([]);
//             setRemovedFiles([]);
//             // setError(null); // If you have an error state
//             router.push("/admin/purchase-invoice-view");
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Reset
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }

// export default PurchaseInvoiceFormWrapper;



