// e.g., src/app/admin/inventory-adjustments/page.js
"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ItemSection from "@/components/ItemSection"; 
import BatchAllocationModal from "@/components/MultiBatchModalbtach";

// --- Helper Functions ---
const generateUniqueId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
const ArrayOf = (arr) => (Array.isArray(arr) ? arr : []);
const formatDateForInput = (dateStr) => dateStr ? new Date(dateStr).toISOString().slice(0, 10) : "";

// --- Internal Modal for "Increase Stock" ---
function IncreaseStockBatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">Enter New Batch Details for {itemCode}</h2>
        <p className="mb-4 text-sm text-gray-600">Item: {itemName}</p>
        <table className="w-full table-auto border-collapse mb-4">
          <thead>
            <tr className="bg-gray-200"><th className="p-2 border text-left">Batch Number</th><th className="p-2 border text-left">Expiry Date</th><th className="p-2 border text-left">Quantity</th><th className="p-2 border text-center">Action</th></tr>
          </thead>
          <tbody>
            {ArrayOf(batches).map((batch, idx) => (
              <tr key={batch.id}>
                <td className="p-1 border"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="p-1 border"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded" /></td>
                <td className="p-1 border"><input type="number" value={batch.batchQuantity || ""} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded" min="0" /></td>
                <td className="p-1 border text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 font-bold text-xl">&times;</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onAddBatchEntry} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Add Batch</button>
        <div className="flex justify-end mt-4"><button type="button" onClick={onClose} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Done</button></div>
      </div>
    </div>
  );
}

// --- Main Form Component ---
const initialAdjustmentState = {
  adjustmentDate: formatDateForInput(new Date()),
  adjustmentType: "increase",
  refNumber: "",
  reason: "",
  remarks: "",
  grandTotal: 0,
  items: [{
    id: generateUniqueId(),
    item: "", itemCode: "", itemName: "", itemDescription: "",
    unitPrice: 0, quantity: 0, totalAmount: 0,
    warehouse: "", managedBy: "none", batches: [],
  }],
};

function InventoryAdjustmentForm() {
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get("editId");
  const isEdit = Boolean(editId);

  const [adjustmentData, setAdjustmentData] = useState(initialAdjustmentState);
  const [loading, setLoading] = useState(false);
  const [showIncreaseModal, setShowIncreaseModal] = useState(false);
  const [showDecreaseModal, setShowDecreaseModal] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [availableBatches, setAvailableBatches] = useState([]);

  useEffect(() => {
    let newGrandTotal = 0;
    const updatedItems = adjustmentData.items.map(item => {
      let itemTotal;
      if (adjustmentData.adjustmentType === 'decrease' && item.batches.length > 0) {
        itemTotal = item.batches.reduce((sum, batch) => sum + ((Number(batch.unitPrice) || 0) * (Number(batch.batchQuantity) || 0)), 0);
      } else {
        itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      }
      newGrandTotal += itemTotal;
      return { ...item, totalAmount: itemTotal };
    });

    if (newGrandTotal !== adjustmentData.grandTotal || JSON.stringify(updatedItems) !== JSON.stringify(adjustmentData.items)) {
        setAdjustmentData(prev => ({
          ...prev,
          items: updatedItems,
          grandTotal: newGrandTotal,
        }));
    }
  }, [adjustmentData.items, adjustmentData.adjustmentType]);

  const handleHeaderChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === 'adjustmentType') {
      toast.info("Type changed. Please re-verify batch details.");
      setAdjustmentData(p => ({ ...p, [name]: value, items: p.items.map(item => ({ ...item, batches: [] })) }));
    } else {
      setAdjustmentData(p => ({ ...p, [name]: value }));
    }
  }, []);

  const handleItemDataChange = useCallback((index, field, value) => {
    setAdjustmentData(p => {
      const newItems = [...p.items];
      const oldQuantity = newItems[index].quantity;
      newItems[index] = { ...newItems[index], [field]: value };
      if (field === 'quantity' && Number(value) !== oldQuantity) {
        newItems[index].batches = [];
      }
      return { ...p, items: newItems };
    });
  }, []);

  const handleItemSelect = useCallback((index, sku) => {
    setAdjustmentData(p => {
      const newItems = [...p.items];
      newItems[index] = {
        ...newItems[index],
        item: sku._id, itemCode: sku.itemCode, itemName: sku.itemName,
        managedBy: sku.managedBy || "none",
        itemDescription: sku.description || "",
        unitPrice: Number(sku.unitPrice) || 0,
        batches: [],
      };
      return { ...p, items: newItems };
    });
  }, []);

  const handleWarehouseSelect = useCallback((index, wh) => {
    setAdjustmentData(p => {
      const newItems = [...p.items];
      newItems[index] = { ...newItems[index], warehouse: wh._id, batches: [] };
      return { ...p, items: newItems };
    });
  }, []);

  const addItemRow = useCallback(() => setAdjustmentData(p => ({ ...p, items: [...p.items, { ...initialAdjustmentState.items[0], id: generateUniqueId() }] })), []);
  const removeItemRow = useCallback((index) => setAdjustmentData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) })), []);

  const openBatchManager = useCallback(async (index) => {
    const currentItem = adjustmentData.items[index];
    if (!currentItem.item || !currentItem.warehouse || currentItem.managedBy !== 'batch') {
      toast.warn("Select a batch-managed Item and Warehouse first.");
      return;
    }
    setActiveItemIndex(index);
    if (adjustmentData.adjustmentType === 'increase') {
      setShowIncreaseModal(true);
    } else {
      try {
        setLoading(true);
        const res = await axios.get( `/api/inventory-batch/${currentItem.item}/${currentItem.warehouse}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
        setAvailableBatches(res.data.success ? res.data.data.batches || [] : []);
        setShowDecreaseModal(true);
      } catch (err) {
        toast.error(err.response?.data?.error || "Error fetching batch stock.");
      } finally {
        setLoading(false);
      }
    }
  }, [adjustmentData]);

  const handleIncreaseBatchChange = useCallback((batchIndex, field, value) => {
    setAdjustmentData(p => {
      const newItems = [...p.items];
      const batches = ArrayOf(newItems[activeItemIndex].batches);
      if (field === 'remove') { batches.splice(batchIndex, 1); } 
      else { batches[batchIndex] = { ...batches[batchIndex], [field]: value }; }
      newItems[activeItemIndex].batches = batches;
      return { ...p, items: newItems };
    });
  }, [activeItemIndex]);
  
  const addIncreaseBatchEntry = useCallback(() => {
    setAdjustmentData(p => {
      const newItems = [...p.items];
      const batches = ArrayOf(newItems[activeItemIndex].batches);
      batches.push({ id: generateUniqueId(), batchNumber: "", expiryDate: "", batchQuantity: 0 });
      newItems[activeItemIndex].batches = batches;
      return { ...p, items: newItems };
    });
  }, [activeItemIndex]);

  const handleDecreaseBatchUpdate = useCallback((allocations) => {
    const transformedBatches = allocations.map(alloc => ({
      id: generateUniqueId(), batchNumber: alloc.batchCode, batchQuantity: alloc.allocatedQuantity,
      expiryDate: alloc.expiryDate, manufacturer: alloc.manufacturer, unitPrice: alloc.unitPrice,
    }));
    handleItemDataChange(activeItemIndex, 'batches', transformedBatches);
  }, [activeItemIndex, handleItemDataChange]);

  // const handleSubmit = useCallback(async () => {
  //   console.log("Submitting Payload:", adjustmentData);
  //   toast.success("Form is ready for submission!");
  // }, [adjustmentData]);



const handleSubmitAdjustment = useCallback(async () => {
  try {
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Unauthorized: Please log in");
      setLoading(false);
      return;
    }

    // Basic validation
    if (!adjustmentData.adjustmentDate) {
      toast.error("Please select an adjustment date.");
      setLoading(false);
      return;
    }
    if (!adjustmentData.reason.trim()) {
      toast.error("Please provide a reason for the adjustment.");
      setLoading(false);
      return;
    }
    if (
      !adjustmentData.items.length ||
      adjustmentData.items.some(it => !it.item || !it.warehouse || Number(it.quantity) <= 0)
    ) {
      toast.error("Please add at least one valid item with Item, Warehouse, and Quantity greater than 0.");
      setLoading(false);
      return;
    }

    // Validate batch-managed items
    for (const [idx, item] of adjustmentData.items.entries()) {
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

        const invalidBatchEntry = ArrayOf(item.batches).some(
          b => !b.batchNumber || b.batchNumber.trim() === "" || Number(b.batchQuantity) <= 0
        );
        if (invalidBatchEntry) {
          toast.error(
            `Item ${item.itemName} (Row ${idx + 1}): Contains an invalid batch entry. Batch Number and Quantity must be provided and Quantity must be greater than 0.`
          );
          setLoading(false);
          return;
        }
      }
    }

    // Map items for submission
    const itemsForSubmission = ArrayOf(adjustmentData.items).map(it => ({
      item: it.item,
      warehouse: it.warehouse,
      quantity: Number(it.quantity),
      managedBy: it.managedBy,
      selectedBin: it.selectedBin?._id || null, // <-- send selected bin
      batches: ArrayOf(it.batches)
        .filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0)
        .map(({ id, ...rest }) => rest),
    }));

    const payload = {
      adjustmentDate: adjustmentData.adjustmentDate,
      adjustmentType: adjustmentData.adjustmentType,
      reason: adjustmentData.reason,
      remarks: adjustmentData.remarks,
      items: itemsForSubmission,
    };

    const url = isEdit
      ? `/api/inventory-adjustments/${editId}`
      : "/api/inventory-adjustments";
    const method = isEdit ? "put" : "post";

    const response = await axios({
      method,
      url,
      data: payload,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.data.success) {
      toast.success(
        isEdit
          ? "Inventory Adjustment updated successfully"
          : "Inventory Adjustment saved successfully"
      );
      router.push("/admin/InventoryAdjustmentsView");
    } else {
      toast.error(response.data.error || "Failed to save Inventory Adjustment");
    }
  } catch (err) {
    console.error("Error saving Inventory Adjustment:", err);
    toast.error(err.response?.data?.error || err.message || "Failed to save Inventory Adjustment");
  } finally {
    setLoading(false);
  }
}, [adjustmentData, isEdit, editId, router]);




  //   const handleSubmitAdjustment = useCallback(async () => {
  //   try {
  //     setLoading(true);

  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       toast.error("Unauthorized: Please log in");
  //       setLoading(false);
  //       return;
  //     }

  //     // Basic validation
  //     if (!adjustmentData.adjustmentDate) {
  //       toast.error("Please select an adjustment date.");
  //       setLoading(false);
  //       return;
  //     }
  //     if (!adjustmentData.reason.trim()) {
  //       toast.error("Please provide a reason for the adjustment.");
  //       setLoading(false);
  //       return;
  //     }
  //     if (!adjustmentData.items.length || adjustmentData.items.some(it => !it.item || !it.warehouse || Number(it.quantity) <= 0)) {
  //       toast.error("Please add at least one valid item with Item, Warehouse, and Quantity greater than 0.");
  //       setLoading(false);
  //       return;
  //     }

  //     // Validate batch-managed items: total batch quantity must match item quantity
  //     for (const [idx, item] of adjustmentData.items.entries()) {
  //       if (item.managedBy?.toLowerCase() === "batch") {
  //         const totalAllocatedBatchQty = ArrayOf(item.batches).reduce( // Use ArrayOf for safety
  //           (sum, b) => sum + (Number(b.batchQuantity) || 0),
  //           0
  //         );
  //         if (totalAllocatedBatchQty !== Number(item.quantity)) {
  //           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch quantity (${totalAllocatedBatchQty}) does not match item quantity (${item.quantity}). Please adjust batch details.`);
  //           setLoading(false);
  //           return;
  //         }
  //         if (totalAllocatedBatchQty === 0 && Number(item.quantity) > 0) {
  //             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches have been entered. Please set batch details.`);
  //             setLoading(false);
  //             return;
  //         }
  //         // Also ensure individual batch entries are valid (batch number and quantity > 0)
  //         const invalidBatchEntry = ArrayOf(item.batches).some(b => // Use ArrayOf for safety
  //             !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0
  //         );
  //         if (invalidBatchEntry) {
  //             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Contains an invalid batch entry. Batch Number and Quantity must be provided and Quantity must be greater than 0.`);
  //             setLoading(false);
  //             return;
  //         }
  //       }
  //     }

  //     const itemsForSubmission = ArrayOf(adjustmentData.items).map(it => ({ // Use ArrayOf for safety
  //       // Remove frontend-only 'id' and 'unitPrice' if not needed by backend
  //       item: it.item,
  //       quantity: Number(it.quantity),
  //       warehouse: it.warehouse,
  //       managedBy: it.managedBy,
  //       // Filter out incomplete/empty batch entries and remove client-side 'id'
  //       batches: ArrayOf(it.batches).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
  //     }));

  //     const payload = {
  //       adjustmentDate: adjustmentData.adjustmentDate,
  //       adjustmentType: adjustmentData.adjustmentType,
  //       reason: adjustmentData.reason,
  //       remarks: adjustmentData.remarks,
  //       items: itemsForSubmission,
  //     };

  //     const url = isEdit ? `/api/inventory-adjustments/${editId}` : "/api/inventory-adjustments"; // NEW API endpoint
  //     const method = isEdit ? "put" : "post";

  //     const response = await axios({
  //       method,
  //       url,
  //       data: payload,
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     if (response.data.success) {
  //       toast.success(isEdit ? "Inventory Adjustment updated successfully" : "Inventory Adjustment saved successfully");
  //       router.push("/admin/InventoryAdjustmentsView"); // Redirect to a view page
  //     } else {
  //       toast.error(response.data.error || "Failed to save Inventory Adjustment");
  //     }
  //   } catch (err) {
  //     console.error("Error saving Inventory Adjustment:", err);
  //     toast.error(err.response?.data?.error || err.message || "Failed to save Inventory Adjustment");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [adjustmentData, isEdit, editId, router]);



  return (
    <div className="m-4 md:m-10 p-4 md:p-8 shadow-xl bg-gray-50 rounded-lg">
      <h1 className="text-3xl font-bold mb-6">{isEdit ? "Edit" : "New"} Inventory Adjustment</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 border rounded-lg shadow-md bg-white">
        <div>
          <label className="block mb-2 font-medium">Date</label>
          <input type="date" name="adjustmentDate" value={adjustmentData.adjustmentDate} onChange={handleHeaderChange} className="w-full p-2 border rounded-md" />
        </div>
        <div>
          <label className="block mb-2 font-medium">Reference No.</label>
          <input type="text" name="refNumber" value={adjustmentData.refNumber} onChange={handleHeaderChange} className="w-full p-2 border rounded-md" placeholder="Internal Ref No."/>
        </div>
        <div className="md:col-span-2">
          <label className="block mb-2 font-medium">Type</label>
          <select name="adjustmentType" value={adjustmentData.adjustmentType} onChange={handleHeaderChange} className="w-full p-2 border rounded-md bg-white">
            <option value="increase">Increase Stock (Stock In)</option>
            <option value="decrease">Decrease Stock (Stock Out)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block mb-2 font-medium">Reason</label>
          <textarea name="reason" value={adjustmentData.reason} onChange={handleHeaderChange} className="w-full p-2 border rounded-md" rows="2" placeholder="e.g., Physical count correction, Damaged goods"/>
        </div>
         <div className="md:col-span-2">
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea name="remarks" value={adjustmentData.remarks} onChange={handleHeaderChange} className="w-full p-2 border rounded-md" rows="2" placeholder="Optional notes..."/>
        </div>
      </div>

      <div className="p-6 border rounded-lg shadow-md bg-white mb-8">
        <h2 className="text-2xl font-semibold mb-4">Items</h2>
        <ItemSection
          items={adjustmentData.items}
          onItemChange={(i, e) => handleItemDataChange(i, e.target.name, e.target.value)}
          onItemSelect={handleItemSelect}
          onWarehouseSelect={handleWarehouseSelect}
          onAddItem={addItemRow}
          onRemoveItem={removeItemRow}
        />
      </div>

      <div className="p-6 border rounded-lg shadow-md bg-white mb-8">
        <h2 className="text-2xl font-semibold mb-4">Batch Details</h2>
        {adjustmentData.items.map((item, index) => {
          if (item.managedBy !== 'batch' || item.quantity <= 0) return null;
          const totalAllocated = ArrayOf(item.batches).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
          return (
            <div key={item.id} className="border-t first:border-t-0 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <span className="font-semibold text-lg">{item.itemName || `Item ${index + 1}`} (Qty: {item.quantity})</span>
                <button onClick={() => openBatchManager(index)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50" disabled={!item.item || !item.warehouse}>
                  {adjustmentData.adjustmentType === 'increase' ? 'Set New Batches' : 'Allocate from Stock'}
                </button>
              </div>
              {item.batches.length > 0 && (
                <div className="mt-2 pl-4 text-sm">
                  <p className="font-medium mb-1">Allocations:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {item.batches.map((batch) => (<li key={batch.id}>Batch: <strong>{batch.batchNumber}</strong>, Qty: <strong>{batch.batchQuantity}</strong></li>))}
                  </ul>
                  <p className={`mt-2 font-bold ${totalAllocated !== item.quantity ? "text-red-600" : "text-green-600"}`}>Total Allocated: {totalAllocated} / {item.quantity}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="flex justify-end p-6">
          <div className="w-full md:w-1/3">
              <div className="flex justify-between items-center text-xl font-bold">
                  <span>Adjustment Value:</span>
                  <span>₹{adjustmentData.grandTotal.toFixed(2)}</span>
              </div>
          </div>
      </div>

      {showIncreaseModal && activeItemIndex !== null && (
        <IncreaseStockBatchModal
          batches={adjustmentData.items[activeItemIndex].batches} onBatchEntryChange={handleIncreaseBatchChange}
          onAddBatchEntry={addIncreaseBatchEntry} onClose={() => setShowIncreaseModal(false)}
          itemCode={adjustmentData.items[activeItemIndex].itemCode} itemName={adjustmentData.items[activeItemIndex].itemName}
        />
      )}
      {showDecreaseModal && activeItemIndex !== null && (
        <BatchAllocationModal
          onClose={() => setShowDecreaseModal(false)} onUpdateBatch={handleDecreaseBatchUpdate}
          batchOptions={availableBatches}
          itemsbatch={{
            itemId: adjustmentData.items[activeItemIndex].item, warehouse: adjustmentData.items[activeItemIndex].warehouse,
            itemName: adjustmentData.items[activeItemIndex].itemName, qty: adjustmentData.items[activeItemIndex].quantity,
            currentAllocations: ArrayOf(adjustmentData.items[activeItemIndex].batches).map(b => ({ batchCode: b.batchNumber, allocatedQuantity: b.batchQuantity, ...b }))
          }}
        />
      )}

      <div className="flex flex-wrap gap-4 mt-8">
        <button onClick={handleSubmitAdjustment} disabled={loading} className="px-6 py-3 rounded-lg bg-blue-700 text-white font-semibold text-lg hover:bg-blue-800 disabled:bg-gray-400">
          {loading ? "Saving..." : "Submit Adjustment"}
        </button>
        <button onClick={() => router.back()} className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold text-lg">Cancel</button>
      </div>
      <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
    </div>
  );
}

export default function InventoryAdjustmentFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-20 text-lg">Loading Form...</div>}>
      <InventoryAdjustmentForm />
    </Suspense>
  );
}
// "use client";

// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { Suspense } from "react";
// import ItemSection from "@/components/ItemSection"; // Now this handles item and warehouse
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Helper to generate unique IDs for batch entries (reused)
// const generateUniqueId = () => {
//   if (typeof crypto !== 'undefined' && crypto.randomUUID) {
//     return crypto.randomUUID();
//   }
//   return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
// };

// // Helper to ensure a variable is treated as an array (reused)
// const ArrayOf = (arr) => Array.isArray(arr) ? arr : [];

// // Helper to format date for HTML date input (YYYY-MM-DD) (reused)
// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const d = new Date(dateStr);
//   if (isNaN(d.getTime())) {
//     console.warn("Invalid date string passed to formatDateForInput:", dateStr);
//     return "";
//   }
//   return d.toISOString().slice(0, 10);
// }

// // BatchModal component (reused from your GRN/Credit Memo forms)
// // Ensure this component is available at "@/components/BatchModal" or copy it here if standalone.
// function BatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName, unitPrice }) {
//   const currentBatches = ArrayOf(batches); // Use ArrayOf for safety

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
//                 <th className="border p-2 text-left text-sm">Batch Number</th><th className="border p-2 text-left text-sm">Expiry Date</th><th className="border p-2 text-left text-sm">Manufacturer</th><th className="border p-2 text-left text-sm">Quantity</th><th className="border p-2 text-left text-sm">Action</th>
//               </tr>
//             </thead>
//             <tbody>
//               {currentBatches.map((batch, idx) => (
//                 <tr key={batch.id}>
//                   <td className="border p-1"><input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Batch No."/></td><td className="border p-1"><input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-1 border rounded text-sm"/></td><td className="border p-1"><input type="text" value={batch.manufacturer || ""} onChange={(e) => onBatchEntryChange(idx, "manufacturer", e.target.value)} className="w-full p-1 border rounded text-sm" placeholder="Manufacturer"/></td><td className="border p-1"><input type="number" value={batch.batchQuantity || 0} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-1 border rounded text-sm" min="0" placeholder="Qty"/></td><td className="border p-1 text-center"><button type="button" onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-500 hover:text-red-700 font-bold text-lg">&times;</button></td>
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


// // Initial state for Inventory Adjustment
// const initialAdjustmentState = {
//   adjustmentDate: formatDateForInput(new Date()),
//   adjustmentType: "increase", // 'increase' or 'decrease'
//   reason: "",
//   remarks: "",
//   items: [
//     {
//       id: generateUniqueId(), // Unique ID for frontend tracking
//       item: "",
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0, // Quantity to adjust by
//       warehouse: "",
//       warehouseCode: "",
//       warehouseName: "",
//       managedBy: "none", // Default
//       batches: [], // For batch-managed items
//       unitPrice: 0, // Keep for context, though not directly used in adjustment value
//     },
//   ],
// };

// // Main Inventory Adjustment Form Component
// function InventoryAdjustmentForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId"); // For future edit functionality
//   const isEdit = Boolean(editId);

//   const [adjustmentData, setAdjustmentData] = useState(initialAdjustmentState);
//   const [loading, setLoading] = useState(false);

//   const [showBatchModal, setShowBatchModal] = useState(false);
//   const [selectedBatchItemIndex, setSelectedBatchItemIndex] = useState(null);

//   /**
//    * ✅ Fetch Adjustment Data for Edit Mode (Future Feature)
//    * This is a placeholder. You'd implement fetching existing adjustment records here.
//    */
//   useEffect(() => {
//     if (!isEdit || !editId) return;

//     const fetchAdjustment = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         if (!token) {
//           toast.error("Unauthorized! Please login again.");
//           setLoading(false);
//           return;
//         }

//         // Replace with your actual API endpoint for fetching inventory adjustments
//         const res = await axios.get(`/api/inventory-adjustments/${editId}`, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//           },
//         });

//         if (res.data.success) {
//           const rec = res.data.data;
//           setAdjustmentData({
//             ...rec,
//             adjustmentDate: formatDateForInput(rec.adjustmentDate),
//             items: rec.items.map(item => ({
//               ...item,
//               id: item.id || generateUniqueId(), // Ensure unique ID for existing items
//               batches: Array.isArray(item.batches) ? item.batches.map(b => ({
//                 id: b.id || b._id || generateUniqueId(),
//                 ...b,
//                 expiryDate: formatDateForInput(b.expiryDate)
//               })) : []
//             }))
//           });
//         } else {
//           toast.error(res.data.error || "Failed to load Inventory Adjustment");
//         }
//       } catch (err) {
//         console.error("Error loading Inventory Adjustment:", err);
//         toast.error(err.response?.data?.error || "Error loading Inventory Adjustment");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchAdjustment();
//   }, [isEdit, editId]);


//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setAdjustmentData((p) => ({ ...p, [name]: value }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setAdjustmentData((p) => ({
//       ...p,
//       items: [...p.items, { ...initialAdjustmentState.items[0], id: generateUniqueId() }],
//     }));
//   }, []);

//   const removeItemRow = useCallback((i) => {
//     setAdjustmentData((p) => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }));
//   }, []);

//   // Handle changes to individual item fields (quantity, description from ItemSection)
//   const handleItemChange = useCallback(
//     (i, e) => {
//       const { name, value } = e.target;
//       setAdjustmentData((p) => {
//         const items = [...p.items];
//         items[i] = {
//           ...items[i],
//           [name]: name === "quantity" ? Number(value) || 0 : value,
//         };
//         return { ...p, items };
//       });
//     },
//     []
//   );

//   // Handle item selection from ItemSearch (called via ItemSection)
//   const handleItemSelect = useCallback(
//     async (i, sku) => {
//       let managedByValue = sku.managedBy || "";
//       if (!managedByValue || managedByValue.trim() === "") {
//         try {
//           const res = await axios.get(`/api/items/${sku._id}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//           managedByValue = res.data.success ? res.data.data.managedBy : "none"; // Default to 'none'
//         } catch (error) {
//           console.error("Error fetching item master details:", error);
//           managedByValue = "none";
//         }
//       }

//       setAdjustmentData((p) => {
//         const items = [...p.items];
//         items[i] = {
//           ...items[i],
//           item: sku._id,
//           itemCode: sku.itemCode,
//           itemName: sku.itemName,
//           itemDescription: sku.description || "",
//           managedBy: managedByValue,
//           batches: managedByValue.toLowerCase() === "batch" ? [] : [],
//           unitPrice: sku.unitPrice || 0, // Keep unit price for context if needed
//         };
//         return { ...p, items };
//       });
//     },
//     []
//   );

//   // Handle warehouse selection for an item (called via ItemSection)
//   const handleWarehouseSelect = useCallback((itemIndex, warehouse) => {
//     setAdjustmentData((p) => {
//       const items = [...p.items];
//       items[itemIndex] = {
//         ...items[itemIndex],
//         warehouse: warehouse._id,
//         warehouseCode: warehouse.warehouseCode,
//         warehouseName: warehouse.warehouseName,
//       };
//       return { ...p, items };
//     });
//   }, []);

//   // Batch modal handlers (reused)
//   const openBatchModal = useCallback((itemIndex) => {
//     const currentItem = adjustmentData.items[itemIndex];

//     if (!currentItem.itemCode || !currentItem.itemName) {
//       toast.warn("Please select an Item before setting batch details.");
//       return;
//     }
//     if (!currentItem.warehouse) {
//       toast.warn("Please select a Warehouse for this line item before setting batch details.");
//       return;
//     }
//     if (!currentItem.managedBy || currentItem.managedBy.toLowerCase() !== "batch") {
//       toast.warn(`Item '${currentItem.itemName}' is not managed by batch. Batch details cannot be set.`);
//       return;
//     }

//     setSelectedBatchItemIndex(itemIndex);
//     setShowBatchModal(true);
//   }, [adjustmentData.items]);

//   const closeBatchModal = useCallback(() => {
//     setShowBatchModal(false);
//     setSelectedBatchItemIndex(null);
//   }, []);

//   const handleBatchEntryChange = useCallback((batchIdx, field, value) => {
//     setAdjustmentData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const updatedBatches = ArrayOf(currentItem.batches); // Use ArrayOf for safety

//       if (field === 'remove') {
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
//             console.error(`Attempted to update non-existent batch at index ${batchIdx}.`);
//         }
//       }
//       currentItem.batches = updatedBatches;
//       updatedItems[selectedBatchItemIndex] = currentItem;
//       return { ...prev, items: updatedItems };
//     });
//   }, [selectedBatchItemIndex]);


//   const addBatchEntry = useCallback(() => {
//     setAdjustmentData((prev) => {
//       const updatedItems = [...prev.items];
//       const currentItem = { ...updatedItems[selectedBatchItemIndex] };
//       const currentBatches = ArrayOf(currentItem.batches); // Use ArrayOf for safety

//       const lastEntry = currentBatches[currentBatches.length - 1];
//       if (
//         lastEntry &&
//         (!lastEntry.batchNumber || lastEntry.batchNumber.trim() === "") &&
//         (lastEntry.batchQuantity === 0 || lastEntry.batchQuantity === undefined || lastEntry.batchQuantity === null)
//       ) {
//         toast.warn("Please fill the current empty batch entry before adding a new one.");
//         return { ...prev, items: updatedItems };
//       }

//       currentBatches.push({
//         id: generateUniqueId(),
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


  // const handleSubmitAdjustment = useCallback(async () => {
  //   try {
  //     setLoading(true);

  //     const token = localStorage.getItem("token");
  //     if (!token) {
  //       toast.error("Unauthorized: Please log in");
  //       setLoading(false);
  //       return;
  //     }

  //     // Basic validation
  //     if (!adjustmentData.adjustmentDate) {
  //       toast.error("Please select an adjustment date.");
  //       setLoading(false);
  //       return;
  //     }
  //     if (!adjustmentData.reason.trim()) {
  //       toast.error("Please provide a reason for the adjustment.");
  //       setLoading(false);
  //       return;
  //     }
  //     if (!adjustmentData.items.length || adjustmentData.items.some(it => !it.item || !it.warehouse || Number(it.quantity) <= 0)) {
  //       toast.error("Please add at least one valid item with Item, Warehouse, and Quantity greater than 0.");
  //       setLoading(false);
  //       return;
  //     }

  //     // Validate batch-managed items: total batch quantity must match item quantity
  //     for (const [idx, item] of adjustmentData.items.entries()) {
  //       if (item.managedBy?.toLowerCase() === "batch") {
  //         const totalAllocatedBatchQty = ArrayOf(item.batches).reduce( // Use ArrayOf for safety
  //           (sum, b) => sum + (Number(b.batchQuantity) || 0),
  //           0
  //         );
  //         if (totalAllocatedBatchQty !== Number(item.quantity)) {
  //           toast.error(`Item ${item.itemName} (Row ${idx + 1}): Total batch quantity (${totalAllocatedBatchQty}) does not match item quantity (${item.quantity}). Please adjust batch details.`);
  //           setLoading(false);
  //           return;
  //         }
  //         if (totalAllocatedBatchQty === 0 && Number(item.quantity) > 0) {
  //             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Is batch-managed but no batches have been entered. Please set batch details.`);
  //             setLoading(false);
  //             return;
  //         }
  //         // Also ensure individual batch entries are valid (batch number and quantity > 0)
  //         const invalidBatchEntry = ArrayOf(item.batches).some(b => // Use ArrayOf for safety
  //             !b.batchNumber || b.batchNumber.trim() === "" || (Number(b.batchQuantity) || 0) <= 0
  //         );
  //         if (invalidBatchEntry) {
  //             toast.error(`Item ${item.itemName} (Row ${idx + 1}): Contains an invalid batch entry. Batch Number and Quantity must be provided and Quantity must be greater than 0.`);
  //             setLoading(false);
  //             return;
  //         }
  //       }
  //     }

  //     const itemsForSubmission = ArrayOf(adjustmentData.items).map(it => ({ // Use ArrayOf for safety
  //       // Remove frontend-only 'id' and 'unitPrice' if not needed by backend
  //       item: it.item,
  //       quantity: Number(it.quantity),
  //       warehouse: it.warehouse,
  //       managedBy: it.managedBy,
  //       // Filter out incomplete/empty batch entries and remove client-side 'id'
  //       batches: ArrayOf(it.batches).filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0).map(({ id, ...rest }) => rest)
  //     }));

  //     const payload = {
  //       adjustmentDate: adjustmentData.adjustmentDate,
  //       adjustmentType: adjustmentData.adjustmentType,
  //       reason: adjustmentData.reason,
  //       remarks: adjustmentData.remarks,
  //       items: itemsForSubmission,
  //     };

  //     const url = isEdit ? `/api/inventory-adjustments/${editId}` : "/api/inventory-adjustments"; // NEW API endpoint
  //     const method = isEdit ? "put" : "post";

  //     const response = await axios({
  //       method,
  //       url,
  //       data: payload,
  //       headers: {
  //         Authorization: `Bearer ${token}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     if (response.data.success) {
  //       toast.success(isEdit ? "Inventory Adjustment updated successfully" : "Inventory Adjustment saved successfully");
  //       router.push("/admin/inventory-adjustments-view"); // Redirect to a view page
  //     } else {
  //       toast.error(response.data.error || "Failed to save Inventory Adjustment");
  //     }
  //   } catch (err) {
  //     console.error("Error saving Inventory Adjustment:", err);
  //     toast.error(err.response?.data?.error || err.message || "Failed to save Inventory Adjustment");
  //   } finally {
  //     setLoading(false);
  //   }
  // }, [adjustmentData, isEdit, editId, router]);


//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Inventory Adjustment" : "New Inventory Adjustment"}</h1>

//       {/* Adjustment Details */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Adjustment Date</label>
//             <input
//               type="date"
//               name="adjustmentDate"
//               value={adjustmentData.adjustmentDate}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Adjustment Type</label>
//             <select
//               name="adjustmentType"
//               value={adjustmentData.adjustmentType}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="increase">Increase Stock</option>
//               <option value="decrease">Decrease Stock</option>
//             </select>
//           </div>
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Reason for Adjustment</label>
//             <textarea
//               name="reason"
//               value={adjustmentData.reason}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               rows="3"
//               placeholder="e.g., Physical count adjustment, Damaged goods, Sample consumption"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Remarks (Optional)</label>
//             <textarea
//               name="remarks"
//               value={adjustmentData.remarks}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//               rows="3"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Items for Adjustment - Now using ItemSection */}
//       <h2 className="text-xl font-semibold mt-6">Items to Adjust</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={adjustmentData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onItemSelect={handleItemSelect}
//           onRemoveItem={removeItemRow}
//           onWarehouseSelect={handleWarehouseSelect} // Pass the new handler to ItemSection
//         />
//       </div>

//       {/* Batch Details Entry - Reused */}
//       <div className="mb-8">
//         <h2 className="text-xl font-semibold mb-4">Batch Details Entry (for Batch-Managed Items)</h2>
//         {adjustmentData.items.map((item, index) =>
//           item.item &&
//           item.itemCode && item.itemName &&
//           item.managedBy &&
//           item.managedBy.trim().toLowerCase() === "batch" ? (
//             <div key={item.id} className="flex items-center justify-between border p-3 rounded mb-2">
//               <div>
//                 <strong>{item.itemCode} - {item.itemName}</strong>
//                 <span className="ml-2 text-sm text-gray-600">(Qty to Adjust: {item.quantity})</span>
//                 <span className="ml-4 text-sm font-medium">
//                   Allocated to Batches: {(ArrayOf(item.batches)).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0)} / {item.quantity}
//                 </span>
//               </div>
//               <button type="button" onClick={() => openBatchModal(index)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">
//                 Set Batch Details
//               </button>
//             </div>
//           ) : null
//         )}
//       </div>
//       {/* Batch Modal - Reused */}
//       {showBatchModal && selectedBatchItemIndex !== null && (
//         <BatchModal
//           batches={adjustmentData.items[selectedBatchItemIndex].batches}
//           onBatchEntryChange={handleBatchEntryChange}
//           onAddBatchEntry={addBatchEntry}
//           onClose={closeBatchModal}
//           itemCode={adjustmentData.items[selectedBatchItemIndex].itemCode}
//           itemName={adjustmentData.items[selectedBatchItemIndex].itemName}
//           unitPrice={adjustmentData.items[selectedBatchItemIndex].unitPrice} // Pass unit price for context in modal
//         />
//       )}


//            {modalItemIndex !== null && (
//               <BatchAllocationModal
//                 itemsbatch={{
//                   itemId: formData.items[modalItemIndex].item,
//                   sourceWarehouse: formData.items[modalItemIndex].warehouse,
//                   itemName: formData.items[modalItemIndex].itemName,
//                   qty: formData.items[modalItemIndex].quantity,
//                   currentAllocations: formData.items[modalItemIndex].batches,
//                 }}
//                 batchOptions={batchModalOptions}
//                 onClose={() => setModalItemIndex(null)}
//                 onUpdateBatch={handleUpdateBatch}
//               />
//             )}
      

//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmitAdjustment}
//           disabled={loading}
//           className={`mt-4 px-4 py-2 rounded ${
//             loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Saving..." : isEdit ? "Update Adjustment" : "Submit Adjustment"}
//         </button>
//         <button
//           onClick={() => {
//             setAdjustmentData(initialAdjustmentState);
//             router.push("/admin/inventory-adjustments-view"); // Redirect or clear form
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

// // Wrapper for Suspense (reused)
// function InventoryAdjustmentFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading Inventory Adjustment form...</div>}>
//       <InventoryAdjustmentForm />
//     </Suspense>
//   );
// }

// export default InventoryAdjustmentFormWrapper;


