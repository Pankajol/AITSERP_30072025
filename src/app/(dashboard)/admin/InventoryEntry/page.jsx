"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  FaArrowLeft, FaCalendarAlt, FaBoxOpen, FaBarcode, FaPlus, FaMinusCircle,
} from "react-icons/fa";

import ItemSection from "@/components/ItemSection";
import BatchAllocationModal from "@/components/MultiBatchModalbtach";

// --- Helper Functions ---
const generateUniqueId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15);
const ArrayOf = (arr) => (Array.isArray(arr) ? arr : []);
const formatDateForInput = (dateStr) =>
  dateStr ? new Date(dateStr).toISOString().slice(0, 10) : "";

// --- Internal Modal for "Increase Stock" ---
function IncreaseStockBatchModal({
  batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName,
}) {
  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50">
          <h2 className="text-lg font-bold text-gray-900">New Batch Entry</h2>
          <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">
            {itemCode} — {itemName}
          </p>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
                <th className="pb-2 text-left">Batch Number</th>
                <th className="pb-2 text-left">Expiry</th>
                <th className="pb-2 text-right w-24">Qty</th>
                <th className="pb-2 text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ArrayOf(batches).map((batch, idx) => (
                <tr key={batch.id}>
                  <td className="py-2 pr-2">
                    <input
                      type="text"
                      value={batch.batchNumber || ""}
                      onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500"
                      placeholder="Batch#"
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      type="date"
                      value={formatDateForInput(batch.expiryDate)}
                      onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
                    />
                  </td>
                  <td className="py-2">
                    <input
                      type="number"
                      value={batch.batchQuantity || ""}
                      onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))}
                      className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right outline-none"
                      min="0"
                    />
                  </td>
                  <td className="py-2 text-center">
                    <button
                      onClick={() => onBatchEntryChange(idx, "remove", null)}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <FaMinusCircle />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={onAddBatchEntry}
            className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest"
          >
            <FaPlus /> Add Another Batch
          </button>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
          >
            Confirm Batches
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Initial State ---
const initialAdjustmentState = {
  adjustmentDate: formatDateForInput(new Date()),
  adjustmentType: "increase",
  refNumber: "",
  reason: "",
  remarks: "",
  grandTotal: 0,
  items: [
    {
      id: generateUniqueId(),
      item: "", itemCode: "", itemName: "", itemDescription: "",
      imageUrl: "",
      unitPrice: 0, quantity: 0, totalAmount: 0,
      discount: 0, freight: 0,
      warehouse: "", warehouseName: "", warehouseCode: "",
      managedBy: "none", batches: [],
      variant: null, selectedVariantId: null,
    },
  ],
};

// ── Stable UI primitives — defined OUTSIDE the form so they never remount ──
const Lbl = ({ text, req }) => (
  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
    {text}
    {req && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
    <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
      <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}>
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

// --- Main Form ---
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

  // Recalculate grand total when items change
  useEffect(() => {
    const newGrandTotal = adjustmentData.items.reduce((sum, item) => {
      const itemTotal =
        adjustmentData.adjustmentType === "decrease" && item.batches.length > 0
          ? item.batches.reduce(
              (s, b) => s + (Number(b.unitPrice) || 0) * (Number(b.batchQuantity) || 0),
              0
            )
          : (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
      return sum + itemTotal;
    }, 0);

    if (newGrandTotal !== adjustmentData.grandTotal) {
      setAdjustmentData((prev) => ({ ...prev, grandTotal: newGrandTotal }));
    }
  }, [adjustmentData.items, adjustmentData.adjustmentType]);

  // Header changes
  const handleHeaderChange = useCallback((e) => {
    const { name, value } = e.target;
    if (name === "adjustmentType") {
      toast.info("Type changed. Please re-verify batch details.");
      setAdjustmentData((p) => ({
        ...p,
        [name]: value,
        items: p.items.map((item) => ({ ...item, batches: [] })),
      }));
    } else {
      setAdjustmentData((p) => ({ ...p, [name]: value }));
    }
  }, []);

  // ─── KEY FIX: atomic batch update ───────────────────────────────────────────
  // ItemSection calls this with (index, patchObject) — one call, full merge.
  // No more stale-closure overwrites from sequential single-field calls.
  const handleItemBatchChange = useCallback((index, patch) => {
    setAdjustmentData((prev) => {
      const newItems = [...prev.items];
      const merged = { ...newItems[index], ...patch };

      // If quantity changed, reset batch allocations
      if (
        "quantity" in patch &&
        Number(patch.quantity) !== Number(newItems[index].quantity)
      ) {
        merged.batches = [];
      }

      newItems[index] = merged;
      return { ...prev, items: newItems };
    });
  }, []);

  // Legacy single-field handler — kept for any direct field tweaks outside ItemSection
  const handleItemChange = useCallback((index, update) => {
    if (!update) return;
    if (update.target) {
      // Event-like: { target: { name, value } }
      const { name, value } = update.target;
      handleItemBatchChange(index, { [name]: value });
    } else {
      // Plain object patch
      handleItemBatchChange(index, update);
    }
  }, [handleItemBatchChange]);

  // When an item is selected from the search dropdown
  const handleItemSelect = useCallback((index, sku) => {
    handleItemBatchChange(index, {
      item: sku._id,
      itemCode: sku.itemCode,
      itemName: sku.itemName,
      managedBy: sku.managedBy || "none",
      itemDescription: sku.description || "",
      unitPrice: Number(sku.unitPrice) || 0,
      imageUrl: sku.imageUrl || "",
      variant: null,
      selectedVariantId: null,
      batches: [],
    });
  }, [handleItemBatchChange]);

  const addItemRow = useCallback(
    () =>
      setAdjustmentData((p) => ({
        ...p,
        items: [
          ...p.items,
          { ...initialAdjustmentState.items[0], id: generateUniqueId() },
        ],
      })),
    []
  );

  const removeItemRow = useCallback(
    (index) =>
      setAdjustmentData((p) => ({
        ...p,
        items: p.items.filter((_, i) => i !== index),
      })),
    []
  );

  // Open batch modal
  const openBatchManager = useCallback(
    async (index) => {
      const currentItem = adjustmentData.items[index];
      if (!currentItem.item || !currentItem.warehouse || currentItem.managedBy !== "batch") {
        toast.warn("Select a batch-managed Item and Warehouse first.");
        return;
      }
      setActiveItemIndex(index);
      if (adjustmentData.adjustmentType === "increase") {
        setShowIncreaseModal(true);
      } else {
        try {
          setLoading(true);
          const token = localStorage.getItem("token");
          const variantId =
            currentItem.selectedVariantId || currentItem.variant?.variantId;
          const url = variantId
            ? `/api/inventory-batch/${currentItem.item}/${currentItem.warehouse}?variantId=${variantId}`
            : `/api/inventory-batch/${currentItem.item}/${currentItem.warehouse}`;
          const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
          setAvailableBatches(res.data.success ? res.data.data.batches || [] : []);
          setShowDecreaseModal(true);
        } catch (err) {
          toast.error(err.response?.data?.error || "Error fetching batch stock.");
        } finally {
          setLoading(false);
        }
      }
    },
    [adjustmentData.items, adjustmentData.adjustmentType]
  );

  const handleIncreaseBatchChange = useCallback(
    (batchIndex, field, value) => {
      setAdjustmentData((p) => {
        const newItems = [...p.items];
        const batches = [...(newItems[activeItemIndex].batches || [])];
        if (field === "remove") {
          batches.splice(batchIndex, 1);
        } else {
          batches[batchIndex] = { ...batches[batchIndex], [field]: value };
        }
        newItems[activeItemIndex] = { ...newItems[activeItemIndex], batches };
        return { ...p, items: newItems };
      });
    },
    [activeItemIndex]
  );

  const addIncreaseBatchEntry = useCallback(() => {
    setAdjustmentData((p) => {
      const newItems = [...p.items];
      const batches = [...(newItems[activeItemIndex].batches || [])];
      batches.push({ id: generateUniqueId(), batchNumber: "", expiryDate: "", batchQuantity: 0 });
      newItems[activeItemIndex] = { ...newItems[activeItemIndex], batches };
      return { ...p, items: newItems };
    });
  }, [activeItemIndex]);

  const handleDecreaseBatchUpdate = useCallback(
    (allocations) => {
      const transformedBatches = allocations.map((alloc) => ({
        id: generateUniqueId(),
        batchNumber: alloc.batchCode,
        batchQuantity: alloc.allocatedQuantity,
        expiryDate: alloc.expiryDate,
        manufacturer: alloc.manufacturer,
        unitPrice: alloc.unitPrice,
      }));
      handleItemBatchChange(activeItemIndex, { batches: transformedBatches });
    },
    [activeItemIndex, handleItemBatchChange]
  );

  // Submit
  const handleSubmitAdjustment = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Unauthorized: Please log in");
        setLoading(false);
        return;
      }

      const itemsForSubmission = ArrayOf(adjustmentData.items).map((it) => ({
        item: it.item,
        variantId: it.selectedVariantId || it.variant?.variantId || null,
        warehouse: it.warehouse,
        quantity: Number(it.quantity),
        managedBy: it.managedBy,
        selectedBin: it.selectedBin?._id || null,
        unitPrice: Number(it.unitPrice),
        batches: ArrayOf(it.batches)
          .filter((b) => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0)
          .map(({ id, ...rest }) => rest),
      }));

      const payload = {
        adjustmentDate: adjustmentData.adjustmentDate,
        adjustmentType: adjustmentData.adjustmentType,
        reason: adjustmentData.reason,
        remarks: adjustmentData.remarks,
        refNumber: adjustmentData.refNumber,
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
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        toast.success(isEdit ? "Update Successful" : "Adjustment Saved");
        router.push("/admin/InventoryAdjustmentsView");
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Save Failed");
    } finally {
      setLoading(false);
    }
  }, [adjustmentData, isEdit, editId, router]);

  // fi() is a pure string helper — safe to keep inline
  const fi = () =>
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none placeholder:text-gray-300";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-5xl mx-auto">
        <button
          onClick={() => router.push("/admin/InventoryAdjustmentsView")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors"
        >
          <FaArrowLeft className="text-xs" /> Back to List
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              {isEdit ? "Edit" : "New"} Inventory Adjustment
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Correct stock levels and manage batch allocations (with variants)
            </p>
          </div>
          <div
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${
              adjustmentData.adjustmentType === "increase"
                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                : "bg-red-50 text-red-600 border-red-100"
            }`}
          >
            {adjustmentData.adjustmentType === "increase" ? "Stock In" : "Stock Out"}
          </div>
        </div>

        {/* Header */}
        <SectionCard
          icon={FaCalendarAlt}
          title="Adjustment Header"
          subtitle="Date, Type and Reference info"
          color="indigo"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <Lbl text="Adjustment Date" req />
              <input
                type="date"
                name="adjustmentDate"
                value={adjustmentData.adjustmentDate}
                onChange={handleHeaderChange}
                className={fi()}
              />
            </div>
            <div>
              <Lbl text="Reference Number" />
              <input
                type="text"
                name="refNumber"
                value={adjustmentData.refNumber}
                onChange={handleHeaderChange}
                className={fi()}
                placeholder="e.g. ADJ-998"
              />
            </div>
            <div className="md:col-span-2">
              <Lbl text="Movement Type" req />
              <select
                name="adjustmentType"
                value={adjustmentData.adjustmentType}
                onChange={handleHeaderChange}
                className={fi()}
              >
                <option value="increase">Increase Stock (Stock In)</option>
                <option value="decrease">Decrease Stock (Stock Out)</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <Lbl text="Adjustment Reason" req />
              <textarea
                name="reason"
                value={adjustmentData.reason}
                onChange={handleHeaderChange}
                className={`${fi()} resize-none`}
                rows="2"
                placeholder="e.g., Damaged goods, Stock verification..."
              />
            </div>
            <div className="md:col-span-2">
              <Lbl text="General Remarks" />
              <textarea
                name="remarks"
                value={adjustmentData.remarks}
                onChange={handleHeaderChange}
                className={`${fi()} resize-none`}
                rows="2"
                placeholder="Optional internal notes..."
              />
            </div>
          </div>
        </SectionCard>

        {/* Item Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-emerald-50/40">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-500">
              <FaBoxOpen className="text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Line Items</p>
              <p className="text-xs text-gray-400">
                {adjustmentData.items.length} product(s) being adjusted
              </p>
            </div>
          </div>
          <div className="p-4">
            <ItemSection
              items={adjustmentData.items}
              onItemChange={handleItemChange}          // legacy single-field (fallback)
              onItemBatchChange={handleItemBatchChange} // ← atomic patch (primary)
              onItemSelect={handleItemSelect}
              onAddItem={addItemRow}
              onRemoveItem={removeItemRow}
            />
          </div>
        </div>

        {/* Batch Management */}
        <SectionCard
          icon={FaBarcode}
          title="Batch & Serialization"
          subtitle="Manage specific stock identifiers"
          color="amber"
        >
          <div className="space-y-4">
            {adjustmentData.items.map((item, index) => {
              if (item.managedBy !== "batch" || item.quantity <= 0) return null;
              const totalAllocated = ArrayOf(item.batches).reduce(
                (sum, b) => sum + (Number(b.batchQuantity) || 0),
                0
              );
              const isMatch = totalAllocated === Number(item.quantity);

              return (
                <div key={item.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-gray-800">
                        {item.itemName || `Row ${index + 1}`}
                      </p>
                      {item.variant?.sku && (
                        <p className="text-[10px] text-purple-600">Variant: {item.variant.sku}</p>
                      )}
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        Required Allocation: {item.quantity}
                      </p>
                    </div>
                    <button
                      onClick={() => openBatchManager(index)}
                      disabled={!item.item || !item.warehouse}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
                        isMatch
                          ? "bg-white text-gray-600 border border-gray-200"
                          : "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100"
                      }`}
                    >
                      {adjustmentData.adjustmentType === "increase"
                        ? "Set New Batches"
                        : "Allocate from Stock"}
                    </button>
                  </div>

                  {item.batches.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {item.batches.map((batch) => (
                        <div
                          key={batch.id}
                          className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100 text-xs"
                        >
                          <span className="font-bold text-gray-600">
                            Batch: {batch.batchNumber}
                          </span>
                          <span className="text-indigo-600 font-mono font-bold">
                            {batch.batchQuantity}
                          </span>
                        </div>
                      ))}
                      <div className="col-span-full mt-2 flex items-center gap-2">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            isMatch ? "bg-emerald-500" : "bg-red-500 animate-pulse"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-bold ${
                            isMatch
                              ? "text-emerald-600"
                              : "text-red-500 uppercase tracking-wider"
                          }`}
                        >
                          {isMatch
                            ? `Fully Allocated (${totalAllocated})`
                            : `Mismatch: ${totalAllocated} allocated of ${item.quantity}`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {adjustmentData.items.every((i) => i.managedBy !== "batch") && (
              <p className="text-center py-4 text-xs text-gray-300 font-medium italic">
                No batch-managed items found in this adjustment.
              </p>
            )}
          </div>
        </SectionCard>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6 border-t border-gray-100 mt-8">
          <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm min-w-[240px]">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">
              Total Adjustment Value
            </p>
            <p className="text-2xl font-black text-indigo-700 font-mono">
              ₹{adjustmentData.grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitAdjustment}
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:bg-gray-300"
            >
              {loading ? "Processing..." : "Submit Adjustment"}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showIncreaseModal && activeItemIndex !== null && (
        <IncreaseStockBatchModal
          batches={adjustmentData.items[activeItemIndex]?.batches || []}
          onBatchEntryChange={handleIncreaseBatchChange}
          onAddBatchEntry={addIncreaseBatchEntry}
          onClose={() => setShowIncreaseModal(false)}
          itemCode={adjustmentData.items[activeItemIndex]?.itemCode}
          itemName={adjustmentData.items[activeItemIndex]?.itemName}
        />
      )}

      {showDecreaseModal && activeItemIndex !== null && (
        <BatchAllocationModal
          itemsbatch={{
            itemId: adjustmentData.items[activeItemIndex]?.item,
            sourceWarehouse: adjustmentData.items[activeItemIndex]?.warehouse,
            itemName: adjustmentData.items[activeItemIndex]?.itemName,
            qty: adjustmentData.items[activeItemIndex]?.quantity,
            currentAllocations: adjustmentData.items[activeItemIndex]?.batches || [],
            variantId:
              adjustmentData.items[activeItemIndex]?.selectedVariantId ||
              adjustmentData.items[activeItemIndex]?.variant?.variantId,
          }}
          batchOptions={availableBatches}
          onClose={() => setShowDecreaseModal(false)}
          onUpdateBatch={handleDecreaseBatchUpdate}
        />
      )}

      <ToastContainer position="bottom-right" autoClose={5000} theme="colored" />
    </div>
  );
}

export default function InventoryAdjustmentFormWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm font-medium">
          Loading Form Components...
        </div>
      }
    >
      <InventoryAdjustmentForm />
    </Suspense>
  );
}



// "use client";

// import React, { useState, useEffect, useCallback, Suspense } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { 
//   FaArrowLeft, FaCheck, FaCalendarAlt, FaHistory, 
//   FaBoxOpen, FaTags, FaInfoCircle, FaPlus, FaMinusCircle, FaBarcode 
// } from "react-icons/fa";

// import ItemSection from "@/components/ItemSection"; 
// import BatchAllocationModal from "@/components/MultiBatchModalbtach";

// // --- Helper Functions (Logic remains identical) ---
// const generateUniqueId = () => (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
// const ArrayOf = (arr) => (Array.isArray(arr) ? arr : []);
// const formatDateForInput = (dateStr) => dateStr ? new Date(dateStr).toISOString().slice(0, 10) : "";

// // --- Internal Modal for "Increase Stock" (Updated UI) ---
// function IncreaseStockBatchModal({ batches, onBatchEntryChange, onAddBatchEntry, onClose, itemCode, itemName }) {
//   return (
//     <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//       <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
//         <div className="px-6 py-4 border-b border-gray-100 bg-emerald-50/50">
//           <h2 className="text-lg font-bold text-gray-900">New Batch Entry</h2>
//           <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">{itemCode} — {itemName}</p>
//         </div>
//         <div className="p-6 overflow-y-auto flex-1">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
//                 <th className="pb-2 text-left">Batch Number</th>
//                 <th className="pb-2 text-left">Expiry</th>
//                 <th className="pb-2 text-right w-24">Qty</th>
//                 <th className="pb-2 text-center w-12"></th>
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-50">
//               {ArrayOf(batches).map((batch, idx) => (
//                 <tr key={batch.id}>
//                   <td className="py-2 pr-2">
//                     <input type="text" value={batch.batchNumber || ""} onChange={(e) => onBatchEntryChange(idx, "batchNumber", e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:border-emerald-500" placeholder="Batch#" />
//                   </td>
//                   <td className="py-2 pr-2">
//                     <input type="date" value={formatDateForInput(batch.expiryDate)} onChange={(e) => onBatchEntryChange(idx, "expiryDate", e.target.value)} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none" />
//                   </td>
//                   <td className="py-2">
//                     <input type="number" value={batch.batchQuantity || ""} onChange={(e) => onBatchEntryChange(idx, "batchQuantity", Number(e.target.value))} className="w-full p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-right outline-none" min="0" />
//                   </td>
//                   <td className="py-2 text-center">
//                     <button onClick={() => onBatchEntryChange(idx, 'remove', null)} className="text-red-400 hover:text-red-600 transition-colors"><FaMinusCircle /></button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//           <button onClick={onAddBatchEntry} className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-widest">
//             <FaPlus /> Add Another Batch
//           </button>
//         </div>
//         <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
//           <button onClick={onClose} className="px-6 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">Confirm Batches</button>
//         </div>
//       </div>
//     </div>
//   );
// }

// // --- Main Form Component ---
// const initialAdjustmentState = {
//   adjustmentDate: formatDateForInput(new Date()),
//   adjustmentType: "increase",
//   refNumber: "",
//   reason: "",
//   remarks: "",
//   grandTotal: 0,
//   items: [{
//     id: generateUniqueId(),
//     item: "", itemCode: "", itemName: "", itemDescription: "",
//     unitPrice: 0, quantity: 0, totalAmount: 0,
//     warehouse: "", managedBy: "none", batches: [],
//   }],
// };

// function InventoryAdjustmentForm() {
//   const router = useRouter();
//   const search = useSearchParams();
//   const editId = search.get("editId");
//   const isEdit = Boolean(editId);

//   const [adjustmentData, setAdjustmentData] = useState(initialAdjustmentState);
//   const [loading, setLoading] = useState(false);
//   const [showIncreaseModal, setShowIncreaseModal] = useState(false);
//   const [showDecreaseModal, setShowDecreaseModal] = useState(false);
//   const [activeItemIndex, setActiveItemIndex] = useState(null);
//   const [availableBatches, setAvailableBatches] = useState([]);

//   // ... (Logic for totals and handlers remains exactly as in your provided code)
//   useEffect(() => {
//     let newGrandTotal = 0;
//     const updatedItems = adjustmentData.items.map(item => {
//       let itemTotal;
//       if (adjustmentData.adjustmentType === 'decrease' && item.batches.length > 0) {
//         itemTotal = item.batches.reduce((sum, batch) => sum + ((Number(batch.unitPrice) || 0) * (Number(batch.batchQuantity) || 0)), 0);
//       } else {
//         itemTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
//       }
//       newGrandTotal += itemTotal;
//       return { ...item, totalAmount: itemTotal };
//     });

//     if (newGrandTotal !== adjustmentData.grandTotal || JSON.stringify(updatedItems) !== JSON.stringify(adjustmentData.items)) {
//         setAdjustmentData(prev => ({
//           ...prev,
//           items: updatedItems,
//           grandTotal: newGrandTotal,
//         }));
//     }
//   }, [adjustmentData.items, adjustmentData.adjustmentType]);

//   const handleHeaderChange = useCallback((e) => {
//     const { name, value } = e.target;
//     if (name === 'adjustmentType') {
//       toast.info("Type changed. Please re-verify batch details.");
//       setAdjustmentData(p => ({ ...p, [name]: value, items: p.items.map(item => ({ ...item, batches: [] })) }));
//     } else {
//       setAdjustmentData(p => ({ ...p, [name]: value }));
//     }
//   }, []);

//   const handleItemDataChange = useCallback((index, field, value) => {
//     setAdjustmentData(p => {
//       const newItems = [...p.items];
//       const oldQuantity = newItems[index].quantity;
//       newItems[index] = { ...newItems[index], [field]: value };
//       if (field === 'quantity' && Number(value) !== oldQuantity) {
//         newItems[index].batches = [];
//       }
//       return { ...p, items: newItems };
//     });
//   }, []);

//   const handleItemSelect = useCallback((index, sku) => {
//     setAdjustmentData(p => {
//       const newItems = [...p.items];
//       newItems[index] = {
//         ...newItems[index],
//         item: sku._id, itemCode: sku.itemCode, itemName: sku.itemName,
//         managedBy: sku.managedBy || "none",
//         itemDescription: sku.description || "",
//         unitPrice: Number(sku.unitPrice) || 0,
//         batches: [],
//       };
//       return { ...p, items: newItems };
//     });
//   }, []);

//   const handleWarehouseSelect = useCallback((index, wh) => {
//     setAdjustmentData(p => {
//       const newItems = [...p.items];
//       newItems[index] = { ...newItems[index], warehouse: wh._id, batches: [] };
//       return { ...p, items: newItems };
//     });
//   }, []);

//   const addItemRow = useCallback(() => setAdjustmentData(p => ({ ...p, items: [...p.items, { ...initialAdjustmentState.items[0], id: generateUniqueId() }] })), []);
//   const removeItemRow = useCallback((index) => setAdjustmentData(p => ({ ...p, items: p.items.filter((_, i) => i !== index) })), []);

//   const openBatchManager = useCallback(async (index) => {
//     const currentItem = adjustmentData.items[index];
//     if (!currentItem.item || !currentItem.warehouse || currentItem.managedBy !== 'batch') {
//       toast.warn("Select a batch-managed Item and Warehouse first.");
//       return;
//     }
//     setActiveItemIndex(index);
//     if (adjustmentData.adjustmentType === 'increase') {
//       setShowIncreaseModal(true);
//     } else {
//       try {
//         setLoading(true);
//         const res = await axios.get( `/api/inventory-batch/${currentItem.item}/${currentItem.warehouse}`, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
//         setAvailableBatches(res.data.success ? res.data.data.batches || [] : []);
//         setShowDecreaseModal(true);
//       } catch (err) {
//         toast.error(err.response?.data?.error || "Error fetching batch stock.");
//       } finally {
//         setLoading(false);
//       }
//     }
//   }, [adjustmentData]);

//   const handleIncreaseBatchChange = useCallback((batchIndex, field, value) => {
//     setAdjustmentData(p => {
//       const newItems = [...p.items];
//       const batches = ArrayOf(newItems[activeItemIndex].batches);
//       if (field === 'remove') { batches.splice(batchIndex, 1); } 
//       else { batches[batchIndex] = { ...batches[batchIndex], [field]: value }; }
//       newItems[activeItemIndex].batches = batches;
//       return { ...p, items: newItems };
//     });
//   }, [activeItemIndex]);
  
//   const addIncreaseBatchEntry = useCallback(() => {
//     setAdjustmentData(p => {
//       const newItems = [...p.items];
//       const batches = ArrayOf(newItems[activeItemIndex].batches);
//       batches.push({ id: generateUniqueId(), batchNumber: "", expiryDate: "", batchQuantity: 0 });
//       newItems[activeItemIndex].batches = batches;
//       return { ...p, items: newItems };
//     });
//   }, [activeItemIndex]);

//   const handleDecreaseBatchUpdate = useCallback((allocations) => {
//     const transformedBatches = allocations.map(alloc => ({
//       id: generateUniqueId(), batchNumber: alloc.batchCode, batchQuantity: alloc.allocatedQuantity,
//       expiryDate: alloc.expiryDate, manufacturer: alloc.manufacturer, unitPrice: alloc.unitPrice,
//     }));
//     handleItemDataChange(activeItemIndex, 'batches', transformedBatches);
//   }, [activeItemIndex, handleItemDataChange]);

//   const handleSubmitAdjustment = useCallback(async () => {
//     try {
//       setLoading(true);
//       const token = localStorage.getItem("token");
//       if (!token) { toast.error("Unauthorized: Please log in"); setLoading(false); return; }

//       const itemsForSubmission = ArrayOf(adjustmentData.items).map(it => ({
//         item: it.item,
//         warehouse: it.warehouse,
//         quantity: Number(it.quantity),
//         managedBy: it.managedBy,
//         selectedBin: it.selectedBin?._id || null,
//         batches: ArrayOf(it.batches)
//           .filter(b => b.batchNumber && b.batchNumber.trim() !== "" && Number(b.batchQuantity) > 0)
//           .map(({ id, ...rest }) => rest),
//       }));

//       const payload = {
//         adjustmentDate: adjustmentData.adjustmentDate,
//         adjustmentType: adjustmentData.adjustmentType,
//         reason: adjustmentData.reason,
//         remarks: adjustmentData.remarks,
//         items: itemsForSubmission,
//       };

//       const url = isEdit ? `/api/inventory-adjustments/${editId}` : "/api/inventory-adjustments";
//       const method = isEdit ? "put" : "post";

//       const response = await axios({ method, url, data: payload, headers: { Authorization: `Bearer ${token}` } });

//       if (response.data.success) {
//         toast.success(isEdit ? "Update Successful" : "Adjustment Saved");
//         router.push("/admin/InventoryAdjustmentsView");
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.error || "Save Failed");
//     } finally { setLoading(false); }
//   }, [adjustmentData, isEdit, editId, router]);

//   // --- UI Helper Components ---
//   const Lbl = ({ text, req }) => (
//     <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
//       {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//     </label>
//   );

//   const fi = () => "w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none placeholder:text-gray-300";

//   const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
//     <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
//       <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
//         <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}>
//           <Icon className="text-sm" />
//         </div>
//         <div>
//           <p className="text-sm font-bold text-gray-900">{title}</p>
//           {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
//         </div>
//       </div>
//       <div className="px-6 py-5">{children}</div>
//     </div>
//   );

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
//       <div className="max-w-5xl mx-auto">
        
//         {/* --- Header --- */}
//         <button onClick={() => router.push("/admin/InventoryAdjustmentsView")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
//           <FaArrowLeft className="text-xs" /> Back to List
//         </button>

//         <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">{isEdit ? "Edit" : "New"} Inventory Adjustment</h1>
//             <p className="text-sm text-gray-400 mt-0.5">Correct stock levels and manage batch allocations</p>
//           </div>
//           <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${adjustmentData.adjustmentType === 'increase' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
//             {adjustmentData.adjustmentType === 'increase' ? 'Stock In' : 'Stock Out'}
//           </div>
//         </div>

//         {/* --- Header Data Section --- */}
//         <SectionCard icon={FaCalendarAlt} title="Adjustment Header" subtitle="Date, Type and Reference info" color="indigo">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//             <div>
//               <Lbl text="Adjustment Date" req />
//               <input type="date" name="adjustmentDate" value={adjustmentData.adjustmentDate} onChange={handleHeaderChange} className={fi()} />
//             </div>
//             <div>
//               <Lbl text="Reference Number" />
//               <input type="text" name="refNumber" value={adjustmentData.refNumber} onChange={handleHeaderChange} className={fi()} placeholder="e.g. ADJ-998" />
//             </div>
//             <div className="md:col-span-2">
//               <Lbl text="Movement Type" req />
//               <select name="adjustmentType" value={adjustmentData.adjustmentType} onChange={handleHeaderChange} className={fi()}>
//                 <option value="increase">Increase Stock (Stock In)</option>
//                 <option value="decrease">Decrease Stock (Stock Out)</option>
//               </select>
//             </div>
//             <div className="md:col-span-2">
//               <Lbl text="Adjustment Reason" req />
//               <textarea name="reason" value={adjustmentData.reason} onChange={handleHeaderChange} className={`${fi()} resize-none`} rows="2" placeholder="e.g., Damaged goods, Stock verification..."/>
//             </div>
//             <div className="md:col-span-2">
//               <Lbl text="General Remarks" />
//               <textarea name="remarks" value={adjustmentData.remarks} onChange={handleHeaderChange} className={`${fi()} resize-none`} rows="2" placeholder="Optional internal notes..."/>
//             </div>
//           </div>
//         </SectionCard>

//         {/* --- Item Section --- */}
//         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
//           <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-emerald-50/40">
//             <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-500">
//               <FaBoxOpen className="text-sm" />
//             </div>
//             <div>
//               <p className="text-sm font-bold text-gray-900">Line Items</p>
//               <p className="text-xs text-gray-400">{adjustmentData.items.length} product(s) being adjusted</p>
//             </div>
//           </div>
//           <div className="p-4 overflow-x-auto">
//             <ItemSection
//               items={adjustmentData.items}
//               onItemChange={(i, e) => handleItemDataChange(i, e.target.name, e.target.value)}
//               onItemSelect={handleItemSelect}
//               onWarehouseSelect={handleWarehouseSelect}
//               onAddItem={addItemRow}
//               onRemoveItem={removeItemRow}
//             />
//           </div>
//         </div>

//         {/* --- Batch Management Section --- */}
//         <SectionCard icon={FaBarcode} title="Batch & Serialization" subtitle="Manage specific stock identifiers" color="amber">
//           <div className="space-y-4">
//             {adjustmentData.items.map((item, index) => {
//               if (item.managedBy !== 'batch' || item.quantity <= 0) return null;
//               const totalAllocated = ArrayOf(item.batches).reduce((sum, b) => sum + (Number(b.batchQuantity) || 0), 0);
//               const isMatch = totalAllocated === Number(item.quantity);

//               return (
//                 <div key={item.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50">
//                   <div className="flex flex-wrap items-center justify-between gap-4">
//                     <div>
//                       <p className="text-sm font-bold text-gray-800">{item.itemName || `Row ${index + 1}`}</p>
//                       <p className="text-[10px] text-gray-400 font-bold uppercase">Required Allocation: {item.quantity}</p>
//                     </div>
//                     <button onClick={() => openBatchManager(index)} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${isMatch ? 'bg-white text-gray-600 border border-gray-200' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-100'}`} disabled={!item.item || !item.warehouse}>
//                       {adjustmentData.adjustmentType === 'increase' ? 'Set New Batches' : 'Allocate from Stock'}
//                     </button>
//                   </div>
                  
//                   {item.batches.length > 0 && (
//                     <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3">
//                       {item.batches.map((batch) => (
//                         <div key={batch.id} className="flex justify-between items-center bg-white px-3 py-2 rounded-lg border border-gray-100 text-xs">
//                           <span className="font-bold text-gray-600">Batch: {batch.batchNumber}</span>
//                           <span className="text-indigo-600 font-mono font-bold">{batch.batchQuantity}</span>
//                         </div>
//                       ))}
//                       <div className="col-span-full mt-2 flex items-center gap-2">
//                         <div className={`w-2 h-2 rounded-full ${isMatch ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
//                         <span className={`text-[11px] font-bold ${isMatch ? 'text-emerald-600' : 'text-red-500 uppercase tracking-wider'}`}>
//                           {isMatch ? `Fully Allocated (${totalAllocated})` : `Mismatch: ${totalAllocated} allocated of ${item.quantity}`}
//                         </span>
//                       </div>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}
//             {adjustmentData.items.every(i => i.managedBy !== 'batch') && (
//               <p className="text-center py-4 text-xs text-gray-300 font-medium italic">No batch-managed items found in this adjustment.</p>
//             )}
//           </div>
//         </SectionCard>

//         {/* --- Footer Summary --- */}
//         <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6 border-t border-gray-100 mt-8">
//           <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm min-w-[240px]">
//             <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Total Adjustment Value</p>
//             <p className="text-2xl font-black text-indigo-700 font-mono">₹{adjustmentData.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
//           </div>
          
//           <div className="flex gap-4">
//             <button onClick={() => router.back()} className="px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all">
//               Cancel
//             </button>
//             <button onClick={handleSubmitAdjustment} disabled={loading} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:bg-gray-300">
//               {loading ? "Processing..." : "Submit Adjustment"}
//             </button>
//           </div>
//         </div>
//       </div>
//       <ToastContainer position="bottom-right" autoClose={5000} theme="colored" />
//     </div>
//   );
// }

// export default function InventoryAdjustmentFormWrapper() {
//   return (
//     <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400 text-sm font-medium">Loading Form Components...</div>}>
//       <InventoryAdjustmentForm />
//     </Suspense>
//   );
// }

