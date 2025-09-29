"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { Suspense } from "react";
import CustomerSearch from "@/components/CustomerSearch";
import ItemSection from "@/components/ItemSection";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Helper to generate unique IDs for batch entries
const generateUniqueId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (e.g., older browsers/Node versions)
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Date.now().toString(36)
  );
};

// Helper to ensure a variable is treated as an array
const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// Initial Credit Memo state (Adapted from GRN)
const initialCreditMemoState = {
  customer: "", // ObjectId of customer
  customerCode: "",
  customerName: "",
  contactPerson: "",
  docNum: "", // For Credit Memo's own document number, if you generate it
  refNumber: "", // Reference to customer's return doc or original SI
  status: "", // e.g., Draft, Approved, Issued, Cancelled
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      item: "", // ObjectId of item
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0, // Quantity being credited/returned
      allowedQuantity: 0, // e.g., originally sold quantity
      creditedQuantity: 0, // Quantity recorded on this Credit Memo
      unitPrice: 0,
      discount: 0,
      freight: 0, // Freight from original SI, might not apply for CM
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
      managedBy: "none", // 'none', 'batch', 'serial'
      batches: [], // Array to store allocated batch details {id, batchNumber, expiryDate, manufacturer, batchQuantity}
      errorMessage: "",
      qualityCheckDetails: [], // Relevant for returns
      warehouse: "", // ObjectId of warehouse where goods are returned to
      warehouseCode: "",
      warehouseName: "",
      stockImpact: false, // Whether this CM updates stock (e.g., if goods physically returned)
    },
  ],
  salesEmployee: "", // The sales employee associated with the customer/original SI
  remarks: "",
  freight: 0, // Freight for the credit memo itself (e.g., return shipping cost)
  rounding: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  salesInvoiceId: "", // Link to the original Sales Invoice (ObjectId)
  attachments: [],
  reasonForReturn: "", // NEW: Reason for the credit memo/return
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

// BatchModal component (No changes needed, re-used as is)
function BatchModal({
  batches,
  onBatchEntryChange,
  onAddBatchEntry,
  onClose,
  itemCode,
  itemName,
  unitPrice,
}) {
  const currentBatches = ArrayOf(batches);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-lg w-full">
        <h2 className="text-xl font-semibold mb-2">
          Batch Details for {itemCode || "Selected Item"} -{" "}
          {itemName || "N/A"}
        </h2>
        <p className="mb-4 text-sm text-gray-600">
          Unit Price: ₹{unitPrice ? unitPrice.toFixed(2) : "0.00"}
        </p>

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
                  <td className="border p-1">
                    <input
                      type="text"
                      value={batch.batchNumber || ""}
                      onChange={(e) =>
                        onBatchEntryChange(idx, "batchNumber", e.target.value)
                      }
                      className="w-full p-1 border rounded text-sm"
                      placeholder="Batch No."
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="date"
                      value={formatDateForInput(batch.expiryDate)}
                      onChange={(e) =>
                        onBatchEntryChange(idx, "expiryDate", e.target.value)
                      }
                      className="w-full p-1 border rounded text-sm"
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="text"
                      value={batch.manufacturer || ""}
                      onChange={(e) =>
                        onBatchEntryChange(idx, "manufacturer", e.target.value)
                      }
                      className="w-full p-1 border rounded text-sm"
                      placeholder="Manufacturer"
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="number"
                      value={batch.batchQuantity || 0}
                      onChange={(e) =>
                        onBatchEntryChange(
                          idx,
                          "batchQuantity",
                          Number(e.target.value)
                        )
                      }
                      className="w-full p-1 border rounded text-sm"
                      min="0"
                      placeholder="Qty"
                    />
                  </td>
                  <td className="border p-1 text-center">
                    <button
                      type="button"
                      onClick={() => onBatchEntryChange(idx, "remove", null)}
                      className="text-red-500 hover:text-red-700 font-bold text-lg"
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-4 text-gray-500">
            No batch entries yet. Click "Add Batch Entry" to add one.
          </p>
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

// Wrapper for Suspense
function CreditMemoFormWrapper() {
  return (
    <Suspense
      fallback={<div className="text-center py-10">Loading Credit Memo form...</div>}
    >
      <CreditMemoForm />
    </Suspense>
  );
}

function CreditMemoForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);

  const parentRef = useRef(null);

  const [creditMemoData, setCreditMemoData] = useState(initialCreditMemoState);

  // Re-use computeItemValues as the logic for item financials is similar
  const computeItemValues = useCallback((it) => {
    const q = Number(it.quantity) || 0;
    const up = Number(it.unitPrice) || 0;
    const dis = Number(it.discount) || 0;
    const fr = Number(it.freight) || 0; // Item-level freight
    const net = up - dis;
    const tot = net * q + fr; // Total before GST

    let cg = 0;
    let sg = 0;
    let ig = 0;
    let gstAmt = 0;

    if (it.taxOption === "IGST") {
      const rate = Number(it.igstRate || it.gstRate) || 0; // Use igstRate if present, otherwise gstRate
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

  /**
   * ✅ NEW: Load Sales Invoice from Session Storage for Copy Flow
   */
  useEffect(() => {
    const siJSON = sessionStorage.getItem("CreditData"); // Specific key for CM
    if (!siJSON) return;
    console.log("data from sessionStorage for Credit Memo:", siJSON);

    // Clear it immediately to prevent re-loading on subsequent renders
    sessionStorage.removeItem("CreditData");

    const loadSiData = () => {
      try {
        const si = JSON.parse(siJSON);

        if (!si || typeof si !== "object" || !si._id) {
          console.warn("Invalid Sales Invoice data in sessionStorage for Credit Memo");
          toast.error("Invalid Sales Invoice data loaded for Credit Memo.");
          return;
        }

        const newItems = Array.isArray(si.items)
          ? si.items.map((siItem) => {
              // Construct the base item data first
              const baseItem = {
                ...initialCreditMemoState.items[0], // Ensure all properties are initialized
                item: siItem.item, // Should be the ObjectId of the item
                itemCode: siItem.itemCode,
                itemName: siItem.itemName,
                itemDescription: siItem.description || "",
                quantity: siItem.quantity,
                allowedQuantity: siItem.quantity,
                creditedQuantity: siItem.quantity, // Pre-fill credited quantity
                unitPrice: siItem.unitPrice,
                discount: siItem.discount || 0,
                freight: siItem.freight || 0,
                gstRate: siItem.gstRate || 0,
                igstRate: siItem.igstRate || 0,
                taxOption: siItem.taxOption || "GST",
                managedBy: siItem.managedBy || "none",
                batches:
                  siItem.managedBy?.toLowerCase() === "batch"
                    ? ArrayOf(siItem.batches).map((b) => ({
                        ...b,
                        id: b.id || b._id || generateUniqueId(),
                        expiryDate: formatDateForInput(b.expiryDate) // Ensure date is formatted for input
                      }))
                    : [],
                warehouse: siItem.warehouse, // Should be the ObjectId of the warehouse
                warehouseCode: siItem.warehouseCode || "", // Assuming warehouseCode comes from SI
                warehouseName: siItem.warehouseName || "", // Assuming warehouseName comes from SI
                stockImpact: true, // For a credit memo based on SI, stock is likely impacted
              };
              // Now compute the derived values and merge them
              return {
                ...baseItem,
                ...computeItemValues(baseItem),
              };
            })
          : initialCreditMemoState.items; // Fallback to initial if no items

        setCreditMemoData((prev) => ({
          ...initialCreditMemoState, // Start with a clean state for new copy
          salesInvoiceId: si._id,
          customer: si.customer, // Should be the ObjectId of the customer
          customerCode: si.customerCode || "",
          customerName: si.customerName || "",
          contactPerson: si.contactPerson || "",
          refNumber: `SI-${si.docNum || si._id}`, // Reference the SI document number/ID
          postingDate: formatDateForInput(new Date()), // Use current date
          documentDate: formatDateForInput(new Date()),
          validUntil: "", // Clear validUntil for new CM
          salesEmployee: si.salesEmployee || "", // Copy sales employee from SI
          items: newItems, // Set the computed items
          attachments: [], // No attachments from SI by default, new ones can be added
          remarks: `Credit Memo against Sales Invoice ${si.docNum || si._id}`,
          reasonForReturn: "",
          freight: si.freight || 0, // Copy freight from SI if applicable
          rounding: si.rounding || 0, // Copy rounding from SI if applicable
          // Summary will be recalculated by useEffect
        }));

        setExistingFiles([]);
        setAttachments([]);
        setRemovedFiles([]);

        toast.success("✅ Sales Invoice data loaded for Credit Memo");
      } catch (error) {
        console.error("Error parsing SI data from sessionStorage:", error);
        toast.error("Failed to load Sales Invoice data.");
      }
    };

    if (!isEdit) {
      // Only load SI data if not in edit mode
      loadSiData();
    }
  }, [computeItemValues, isEdit]); // Add computeItemValues to dependency array

  /**
   * ✅ Fetch Credit Memo Data for Edit Mode
   */
  useEffect(() => {
    if (!isEdit || !editId) return;

    const fetchCreditMemo = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Unauthorized! Please login again.");
          setLoading(false);
          router.push("/login"); // Redirect to login if no token
          return;
        }

        const res = await axios.get(`/api/credit-note/${editId}`, {
          // Corrected API endpoint for singular resource
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.data.success) {
          const rec = res.data.data;
          const loadedItems = ArrayOf(rec.items).map((item) => {
            // Ensure numbers are numbers and then compute
            const processedItem = {
              ...item,
              quantity: Number(item.quantity) || 0,
              allowedQuantity: Number(item.allowedQuantity) || Number(item.quantity) || 0, // Ensure allowed and credited are set
              creditedQuantity: Number(item.creditedQuantity) || Number(item.quantity) || 0,
              unitPrice: Number(item.unitPrice) || 0,
              discount: Number(item.discount) || 0,
              freight: Number(item.freight) || 0,
              gstRate: Number(item.gstRate) || 0,
              igstRate: Number(item.igstRate) || 0,
              managedBy: item.managedBy || "none",
              batches: ArrayOf(item.batches).map((b) => ({
                id: b.id || b._id || generateUniqueId(), // Ensure unique ID for UI
                ...b,
                expiryDate: formatDateForInput(b.expiryDate), // Format date for input
              })),
              // Ensure warehouse details are picked up
              warehouseCode: item.warehouseCode || "",
              warehouseName: item.warehouseName || "",
            };
            return {
              ...processedItem,
              ...computeItemValues(processedItem), // Recompute values on load for consistency
            };
          });

          setCreditMemoData((prev) => ({
            ...prev,
            ...rec,
            postingDate: formatDateForInput(rec.postingDate),
            validUntil: formatDateForInput(rec.validUntil),
            documentDate: formatDateForInput(rec.documentDate),
            items: loadedItems,
            freight: Number(rec.freight) || 0, // Ensure these are numbers
            rounding: Number(rec.rounding) || 0,
          }));

          setExistingFiles(ArrayOf(rec.attachments)); // Ensure attachments are arrays
          setAttachments([]);
          setRemovedFiles([]);
        } else {
          toast.error(res.data.error || "Failed to load Credit Memo");
        }
      } catch (err) {
        console.error("Error loading Credit Memo:", err);
        toast.error(err.response?.data?.error || "Error loading Credit Memo");
        // Optionally redirect if loading fails for an edit
        router.push("/admin/credit-memo-view");
      } finally {
        setLoading(false);
      }
    };

    fetchCreditMemo();
  }, [isEdit, editId, computeItemValues, router]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setCreditMemoData((p) => ({ ...p, [name]: value }));
  }, []);

  // Handler for Customer selection
  const handleCustomerSelect = useCallback((c) => {
    setCreditMemoData((p) => ({
      ...p,
      customer: c._id, // Store customer ObjectId
      customerCode: c.customerCode,
      customerName: c.customerName,
      contactPerson: c.contactPersonName,
      salesInvoiceId: "", // Clear SI link if a customer is manually selected
      // Optionally clear items too if starting fresh with a new customer
      // items: [{ ...initialCreditMemoState.items[0] }]
    }));
  }, []);

  const addItemRow = useCallback(() => {
    setCreditMemoData((p) => ({
      ...p,
      items: [...p.items, { ...initialCreditMemoState.items[0] }],
    }));
  }, []);

  const removeItemRow = useCallback((i) => {
    setCreditMemoData((p) => ({
      ...p,
      items: p.items.filter((_, idx) => idx !== i),
    }));
  }, []);

  const handleItemChange = useCallback(
    (i, e) => {
      const { name, value } = e.target;
      setCreditMemoData((p) => {
        const items = [...p.items];
        // Ensure numeric values are parsed as numbers
        const updatedItem = {
          ...items[i],
          [name]: ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"].includes(name)
            ? Number(value) || 0
            : value,
        };
        items[i] = { ...updatedItem, ...computeItemValues(updatedItem) }; // Recompute immediately
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  const handleItemSelect = useCallback(
    async (i, sku) => {
      let managedByValue = sku.managedBy || "none"; // Default to 'none' if not specified
      // If managedBy is not provided in SKU, fetch it from item master
      if (!sku.managedBy || sku.managedBy.trim() === "") {
        try {
          const res = await axios.get(`/api/items/${sku._id}`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          managedByValue = res.data.success ? res.data.data.managedBy : "none";
        } catch (error) {
          console.error("Error fetching item master details for managedBy:", error);
          managedByValue = "none"; // Fallback
        }
      }

      const base = {
        item: sku._id, // Store item ObjectId
        itemCode: sku.itemCode,
        itemName: sku.itemName,
        itemDescription: sku.description || "",
        quantity: 1, // Default to 1 for new item
        allowedQuantity: sku.quantityOnHand || 0, // Assuming quantityOnHand is a reasonable 'allowed'
        creditedQuantity: 1, // Default credited quantity to 1
        unitPrice: sku.unitPrice,
        discount: sku.discount || 0,
        freight: sku.freight || 0,
        gstRate: sku.gstRate || 0,
        igstRate: sku.igstRate || 0,
        taxOption: sku.taxOption || "GST",
        managedBy: managedByValue,
        batches: managedByValue.toLowerCase() === "batch" ? [] : [],
        warehouse: sku.defaultWarehouse || "", // Assuming sku has defaultWarehouse ID
        warehouseCode: sku.defaultWarehouseCode || "", // Assuming sku has defaultWarehouseCode
        warehouseName: sku.defaultWarehouseName || "", // Assuming sku has defaultWarehouseName
        stockImpact: true, // New items added manually are usually meant to impact stock
      };
      setCreditMemoData((p) => {
        const items = [...p.items];
        items[i] = { ...initialCreditMemoState.items[0], ...base, ...computeItemValues(base) }; // Recompute values on select
        return { ...p, items };
      });
    },
    [computeItemValues]
  );

  // Batch modal handlers. (Re-used as is)
  const openBatchModal = useCallback(
    (itemIndex) => {
      const currentItem = creditMemoData.items[itemIndex];

      if (!currentItem) {
        toast.error("Invalid item selected for batch details.");
        return;
      }

      if (!currentItem.item || !currentItem.itemCode || !currentItem.itemName) {
        toast.warn("Please select an Item (with Code and Name) before setting batch details.");
        return;
      }
      if (!currentItem.warehouse) {
        toast.warn("Please select a Warehouse for this line item before setting batch details.");
        return;
      }
      if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
        toast.warn(
          `Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`
        );
        return;
      }

      setSelectedBatchItemIndex(itemIndex);
      setShowBatchModal(true);
    },
    [creditMemoData.items]
  );

  const closeBatchModal = useCallback(() => {
    setShowBatchModal(false);
    setSelectedBatchItemIndex(null);
  }, []);

  const handleBatchEntryChange = useCallback(
    (batchIdx, field, value) => {
      setCreditMemoData((prev) => {
        const updatedItems = [...prev.items];
        if (selectedBatchItemIndex === null || !updatedItems[selectedBatchItemIndex]) {
            console.error("No item selected for batch entry change.");
            return prev;
        }

        const currentItem = { ...updatedItems[selectedBatchItemIndex] };
        const updatedBatches = ArrayOf(currentItem.batches);

        if (field === "remove") {
          updatedBatches.splice(batchIdx, 1);
        } else {
          if (updatedBatches[batchIdx]) {
            const finalValue = field === "batchQuantity" ? Number(value) : value; // Ensure quantity is number
            const updatedBatch = {
              ...updatedBatches[batchIdx],
              [field]: finalValue,
            };
            updatedBatches[batchIdx] = updatedBatch;
          } else {
            console.error(`Attempted to update non-existent batch at index ${batchIdx}.`);
          }
        }
        currentItem.batches = updatedBatches;
        updatedItems[selectedBatchItemIndex] = currentItem;
        return { ...prev, items: updatedItems };
      });
    },
    [selectedBatchItemIndex]
  );

  const addBatchEntry = useCallback(() => {
    setCreditMemoData((prev) => {
      const updatedItems = [...prev.items];
      if (selectedBatchItemIndex === null || !updatedItems[selectedBatchItemIndex]) {
        console.error("No item selected to add batch entry.");
        return prev;
      }

      const currentItem = { ...updatedItems[selectedBatchItemIndex] };
      const currentBatches = ArrayOf(currentItem.batches);

      const lastEntry = currentBatches[currentBatches.length - 1];
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

    const syncSalesInvoiceForCreditMemo = useCallback(async (savedCreditMemo, token) => {
    try {
      const { data: siRes } = await axios.get(`/api/sales-invoices/${savedCreditMemo.salesInvoiceId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const si = siRes?.data?.data; // Assuming your SI API returns { success: true, data: SI_OBJECT }
      if (!si || !Array.isArray(si.items)) throw new Error("Sales Invoice not found or invalid format");

      const cmCreditedMap = new Map();
      ArrayOf(savedCreditMemo.items).forEach(({ item, creditedQuantity = 0 }) => {
        // Ensure item is stringified if it's an ObjectId for map key consistency
        // Make sure `item` is the _id from the backend, not the whole item object
        const itemId = typeof item === 'object' && item._id ? item._id.toString() : item.toString();
        cmCreditedMap.set(itemId, (cmCreditedMap.get(itemId) || 0) + creditedQuantity);
      });

      const updatedItems = si.items.map(siItem => {
        const siItemId = typeof siItem.item === 'object' && siItem.item._id ? siItem.item._id.toString() : siItem.item.toString();
        const creditedInCurrentCM = cmCreditedMap.get(siItemId) || 0;
        return {
          ...siItem,
          // Assuming a 'creditedQuantity' field on SI items to track how much has been credited
          // Accumulate the credited quantity from the current CM
          creditedQuantity: (siItem.creditedQuantity || 0) + creditedInCurrentCM,
          // Ensure other numeric fields are numbers before sending back to SI update API
          quantity: Number(siItem.quantity) || 0,
          unitPrice: Number(siItem.unitPrice) || 0,
          discount: Number(siItem.discount) || 0,
          freight: Number(siItem.freight) || 0,
          gstRate: Number(siItem.gstRate) || 0,
          igstRate: Number(siItem.igstRate) || 0,
          priceAfterDiscount: Number(siItem.priceAfterDiscount) || 0,
          totalAmount: Number(siItem.totalAmount) || 0,
          gstAmount: Number(siItem.gstAmount) || 0,
          cgstAmount: Number(siItem.cgstAmount) || 0,
          sgstAmount: Number(siItem.sgstAmount) || 0,
          igstAmount: Number(siItem.igstAmount) || 0,
        };
      });

      // You might want to update SI status based on credits (e.g., 'PartiallyCredited', 'FullyCredited')
      let newSiStatus = si.status;
      const totalSiQuantity = updatedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
      const totalCreditedQuantity = updatedItems.reduce((sum, item) => sum + (Number(item.creditedQuantity) || 0), 0);

      if (totalCreditedQuantity >= totalSiQuantity && totalSiQuantity > 0) {
          newSiStatus = "FullyCredited";
      } else if (totalCreditedQuantity > 0 && totalCreditedQuantity < totalSiQuantity) {
          newSiStatus = "PartiallyCredited";
      } else {
          newSiStatus = "Issued"; // Or whatever the default successful SI status is
      }


      await axios.put(
        `/api/sales-invoices/${savedCreditMemo.salesInvoiceId}`,
        { items: updatedItems, status: newSiStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log(`Sales Invoice ${savedCreditMemo.salesInvoiceId} synced successfully (for credit memo).`);
    } catch (err) {
      console.error("Failed to update linked Sales Invoice for Credit Memo:", err);
      toast.warn("Credit Memo saved, but updating Sales Invoice failed.");
    }
  }, []);

  useEffect(() => {
    const totalBeforeDiscountCalc = creditMemoData.items.reduce(
      (s, it) => s + (it.priceAfterDiscount || 0) * (it.quantity || 0),
      0
    );
    const gstTotalCalc = creditMemoData.items.reduce(
      (s, it) =>
        s + (it.taxOption === "IGST" ? (it.igstAmount || 0) : (it.gstAmount || 0)),
      0
    );
    const grandTotalCalc =
      totalBeforeDiscountCalc +
      gstTotalCalc +
      Number(creditMemoData.freight || 0) +
      Number(creditMemoData.rounding || 0);

    setSummary({
      totalBeforeDiscount: totalBeforeDiscountCalc.toFixed(2),
      gstTotal: gstTotalCalc.toFixed(2),
      grandTotal: grandTotalCalc.toFixed(2),
    });
  }, [creditMemoData.items, creditMemoData.freight, creditMemoData.rounding]);

const handleSaveCreditMemo = useCallback(async () => { 
  try {
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Unauthorized: Please log in");
      setLoading(false);
      router.push("/login");
      return;
    }

    if (!creditMemoData.customerCode) {
      toast.error("Please select a customer.");
      setLoading(false);
      return;
    }

    // Filter valid items
    const validItems = creditMemoData.items.filter(
      (it) => it.item && it.warehouse && it.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error("Please add at least one valid item with Item, Warehouse, and Quantity greater than 0.");
      setLoading(false);
      return;
    }

    // Validate batch-managed items
    for (const [idx, item] of validItems.entries()) {
      if (item.managedBy?.toLowerCase() === "batch") {
        const totalAllocatedBatchQty = ArrayOf(item.batches).reduce(
          (sum, b) => sum + (Number(b.batchQuantity) || 0),
          0
        );
        if (totalAllocatedBatchQty !== Number(item.quantity)) {
          toast.error(
            `Item ${item.itemName} (Row ${idx + 1}): Total batch quantity (${totalAllocatedBatchQty}) does not match item quantity (${item.quantity}). Please adjust batch details.`
          );
          setLoading(false);
          return;
        }
        if (totalAllocatedBatchQty === 0 && item.quantity > 0) {
          toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches entered. Please set batch details.`);
          setLoading(false);
          return;
        }
        const incompleteBatch = ArrayOf(item.batches).some(
          (b) => !b.batchNumber || !b.batchQuantity || Number(b.batchQuantity) <= 0
        );
        if (incompleteBatch) {
          toast.error(`Item ${item.itemName} (Row ${idx + 1}): One or more batch entries are incomplete (missing batch number or quantity).`);
          setLoading(false);
          return;
        }
      }
    }

    // Prepare items for submission
    const itemsForSubmission = validItems.map((it) => ({
      ...it,
      quantity: Number(it.quantity) || 0,
      allowedQuantity: Number(it.allowedQuantity) || 0,
      creditedQuantity: Number(it.creditedQuantity || it.quantity || 0),
      unitPrice: Number(it.unitPrice) || 0,
      discount: Number(it.discount) || 0,
      freight: Number(it.freight) || 0,
      gstRate: Number(it.gstRate) || 0,
      igstRate: Number(it.igstRate) || 0,
      cgstRate: Number(it.cgstRate) || 0,
      sgstRate: Number(it.sgstRate) || 0,
      priceAfterDiscount: Number(it.priceAfterDiscount) || 0,
      totalAmount: Number(it.totalAmount) || 0,
      gstAmount: Number(it.gstAmount) || 0,
      cgstAmount: Number(it.cgstAmount) || 0,
      sgstAmount: Number(it.sgstAmount) || 0,
      igstAmount: Number(it.igstAmount) || 0,
      managedByBatch: it.managedBy?.toLowerCase() === "batch",
      batches: ArrayOf(it.batches)
        .filter((b) => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0)
        .map(({ id, ...rest }) => ({
          ...rest,
          batchQuantity: Number(rest.batchQuantity) || 0,
          expiryDate: rest.expiryDate ? new Date(rest.expiryDate).toISOString() : null,
        })),
    }));

    // Prepare payload
    const { salesInvoiceId, attachments: _, items: __, ...restData } = creditMemoData;
    const payload = {
      ...restData,
      items: itemsForSubmission,
      totalBeforeDiscount: Number(summary.totalBeforeDiscount),
      gstTotal: Number(summary.gstTotal),
      grandTotal: Number(summary.grandTotal),
      freight: Number(creditMemoData.freight) || 0,
      rounding: Number(creditMemoData.rounding) || 0,
      ...(salesInvoiceId ? { salesInvoiceId } : {}),
      postingDate: creditMemoData.postingDate ? new Date(creditMemoData.postingDate).toISOString() : null,
      validUntil: creditMemoData.validUntil ? new Date(creditMemoData.validUntil).toISOString() : null,
      documentDate: creditMemoData.documentDate ? new Date(creditMemoData.documentDate).toISOString() : null,
    };

    // Build FormData
    const formData = new FormData();
    formData.append("creditNoteData", JSON.stringify(payload)); // ✅ Correct field name

    if (removedFiles.length > 0) {
      formData.append("removedAttachmentIds", JSON.stringify(removedFiles.map(f => f.publicId || f.fileUrl)));
    }
    if (existingFiles.length > 0) {
      formData.append("existingFiles", JSON.stringify(existingFiles));
    }
    attachments.forEach((file) => formData.append("newAttachments", file));

    const url = isEdit ? `/api/credit-note/${editId}` : "/api/credit-note";
    const method = isEdit ? "put" : "post";

    console.log("Sending Payload:", payload);
    const response = await axios({
      method,
      url,
      data: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    const savedCreditMemo = response?.data?.data || response?.data;
    if (!savedCreditMemo) throw new Error("Failed to save Credit Memo: No data returned.");

    if (savedCreditMemo.salesInvoiceId) {
      await syncSalesInvoiceForCreditMemo(savedCreditMemo, token);
    }

    toast.success(isEdit ? "Credit Memo updated successfully" : "Credit Memo saved successfully");
    router.push("/admin/credit-memo-veiw");

  } catch (err) {
    console.error("Error saving Credit Memo:", err);
    toast.error(err.response?.data?.error || err.message || "Failed to save Credit Memo");
  } finally {
    setLoading(false);
  }
}, [
  creditMemoData,
  summary,
  attachments,
  removedFiles,
  existingFiles,
  isEdit,
  editId,
  router,
  syncSalesInvoiceForCreditMemo
]);

  // NEW: Function to sync Sales Invoice (for Credit Memo)



  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {isEdit ? "Edit Credit Memo" : "Credit Memo Form"}
      </h1>

      {/* Customer & Doc Details */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        {/* Left column */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Customer Code</label>
            <input
              readOnly
              value={creditMemoData.customerCode || ""}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            {/* Show CustomerSearch if not linked to SI or in edit mode allowing customer change */}
            {creditMemoData.salesInvoiceId && !isEdit ? (
                // If linked to SI and not editing, show readonly input
                <input
                    readOnly
                    value={creditMemoData.customerName || ""}
                    className="w-full p-2 border rounded bg-gray-100"
                />
            ) : ( // Otherwise, allow direct customer search or manual edit (if not SI linked)
                <CustomerSearch onSelectCustomer={handleCustomerSelect} initialQuery={creditMemoData.customerName || ""} />
            )}
            {creditMemoData.salesInvoiceId && (
              <p className="text-sm text-gray-500 mt-1">
                Linked to Sales Invoice (Customer cannot be changed from here).
              </p>
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              readOnly
              value={creditMemoData.contactPerson || ""}
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input
              name="refNumber"
              value={creditMemoData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="e.g., Customer Return #, Original SI #"
            />
          </div>
        </div>

        {/* Right column */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Credit Memo Status</label>
            <select
              name="status"
              value={creditMemoData.status}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Draft">Confirmed</option>
              Pending
              <option value=" Pending"> Pending</option>
              <option value="Issued">Issued</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(creditMemoData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formatDateForInput(creditMemoData.validUntil)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDateForInput(creditMemoData.documentDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>

      {/* Items */}
      <h2 className="text-xl font-semibold mt-6">Items to Credit</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={creditMemoData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onItemSelect={handleItemSelect}
          onRemoveItem={removeItemRow}
        />
      </div>

      {/* Batch Details Entry - Reused */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Batch Details Entry</h2>
        {creditMemoData.items.map((item, index) =>
          item.item &&
          item.itemCode &&
          item.itemName &&
          item.managedBy &&
          item.managedBy.trim().toLowerCase() === "batch" ? (
            <div
              key={item.item + item.warehouse + index} // More robust key
              className="flex items-center justify-between border p-3 rounded mb-2"
            >
              <div>
                <strong>
                  {item.itemCode} - {item.itemName}
                </strong>
                <span className="ml-2 text-sm text-gray-600">
                  (Qty: {item.quantity})
                </span>
                <span className="ml-4 text-sm font-medium">
                  Allocated:{" "}
                  {ArrayOf(item.batches).reduce(
                    (sum, b) => sum + (Number(b.batchQuantity) || 0),
                    0
                  )}{" "}
                  / {item.quantity}
                </span>
              </div>
              <button
                type="button"
                onClick={() => openBatchModal(index)}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Set Batch Details
              </button>
            </div>
          ) : null
        )}
      </div>
      {/* Batch Modal - Reused */}
      {showBatchModal && selectedBatchItemIndex !== null && (
        <BatchModal
          batches={creditMemoData.items[selectedBatchItemIndex].batches}
          onBatchEntryChange={handleBatchEntryChange}
          onAddBatchEntry={addBatchEntry}
          onClose={closeBatchModal}
          itemCode={creditMemoData.items[selectedBatchItemIndex].itemCode}
          itemName={creditMemoData.items[selectedBatchItemIndex].itemName}
          unitPrice={creditMemoData.items[selectedBatchItemIndex].unitPrice}
        />
      )}

      {/* Freight & Rounding */}
      <div className="grid md:grid-cols-2 gap-6 mt-6 mb-6">
        <div>
          <label className="block mb-1 font-medium">Freight</label>
          <input
            name="freight"
            type="number"
            value={creditMemoData.freight || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Rounding</label>
          <input
            name="rounding"
            type="number"
            value={creditMemoData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* Summary - Reused */}
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

      {/* Sales Employee & Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            name="salesEmployee"
            value={creditMemoData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            placeholder="e.g., John Doe"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Reason For Return</label>
          <textarea
            name="reasonForReturn"
            value={creditMemoData.reasonForReturn || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            rows="3"
            placeholder="e.g., Damaged goods, customer dissatisfaction"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={creditMemoData.remarks || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
            rows="3"
            placeholder="Any additional notes..."
          />
        </div>
      </div>

      {/* Attachments Section - Reused */}
      <div className="mt-6 p-8 m-8 border rounded-lg shadow-lg">
        <label className="font-medium block mb-1">Attachments</label>

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
                  key={file.publicId || file.fileUrl || idx} // Use a more stable key
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
                    title={name}
                  >
                    {name}
                  </a>
                  <button
                    onClick={() => {
                      setExistingFiles((prev) => prev.filter((_, i) => i !== idx));
                      setRemovedFiles((prev) => [...prev, file]);
                      toast.info(`Marked '${name}' for removal on save.`);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                    title="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            const files = Array.from(e.target.files);
            setAttachments((prev) => {
              const map = new Map(prev.map((f) => [f.name + f.size, f]));
              files.forEach((f) => map.set(f.name + f.size, f));
              return [...map.values()];
            });
            e.target.value = ""; // Clear the input field
          }}
          className="border px-3 py-2 w-full rounded"
        />

        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
            {attachments.map((file, idx) => {
              const url = URL.createObjectURL(file);
              const isPDF = file.type === "application/pdf";
              const isImage = file.type.startsWith("image/");

              return (
                <div
                  key={file.name + file.size} // Use name + size for unique key
                  className="relative border rounded p-2 text-center bg-gray-50 shadow-sm"
                >
                  {isImage ? (
                    <img
                      src={url}
                      alt={file.name}
                      className="h-24 w-full object-cover rounded"
                      onLoad={() => URL.revokeObjectURL(url)} // Clean up URL object
                    />
                  ) : isPDF ? (
                    <object
                      data={url}
                      type="application/pdf"
                      className="h-24 w-full rounded bg-gray-200"
                      onLoad={() => URL.revokeObjectURL(url)} // Clean up URL object
                    />
                  ) : (
                    <p className="truncate text-xs">{file.name}</p>
                  )}
                  <button
                    onClick={() => {
                      setAttachments((prev) => prev.filter((_, i) => i !== idx));
                      URL.revokeObjectURL(url); // Ensure cleanup
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                    title="Remove new attachment"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSaveCreditMemo}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? "Saving..." : isEdit ? "Update Credit Memo" : "Submit Credit Memo"}
        </button>
        <button
          onClick={() => {
            if (window.confirm("Are you sure you want to cancel? Any unsaved changes will be lost.")) {
                setCreditMemoData(initialCreditMemoState);
                setAttachments([]);
                setExistingFiles([]);
                setRemovedFiles([]);
                setSummary({ totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0 });
                router.push("/admin/credit-memo-view"); // Redirect
            }
          }}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500" // Changed to gray for cancel
        >
          Cancel
        </button>
      </div>

      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover />
    </div>
  );
}

export default CreditMemoFormWrapper;





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


