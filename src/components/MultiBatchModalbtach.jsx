// src/components/BatchAllocationModal.js
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";

/**
 * Props:
 * - itemsbatch: { itemId, sourceWarehouse, itemName, qty (number), currentAllocations (array of allocated batches from parent form) }
 * - batchOptions: array of { batchNumber, expiryDate, manufacturer, quantity, unitPrice } (Available batches from DB)
 * - onClose: fn
 * - onUpdateBatch: fn(Array<{ batchCode, allocatedQuantity, expiryDate, manufacturer, unitPrice }>))
 */
export default function BatchAllocationModal({ itemsbatch, batchOptions, onClose, onUpdateBatch }) {
  const { itemId, sourceWarehouse, itemName, qty: parentQuantity, currentAllocations } = itemsbatch;

  // Filter out batches with 0 or negative quantity and sort by expiry date
  const availableBatches = useMemo(() => {
    return (batchOptions || [])
      .filter(b => (Number(b.quantity) || 0) > 0)
      .sort((a, b) => new Date(b.expiryDate || 0) - new Date(a.expiryDate || 0)); // Sort by expiry date, newest first might be useful for stock out
  }, [batchOptions]);

  // State to hold the batches currently selected and their allocated quantities in the modal
  const [selectedBatches, setSelectedBatches] = useState(() => {
    // Initialize with current allocations if provided
    return (currentAllocations || []).map(alloc => {
      // Find the corresponding batch from available options to get all its properties
      // This is crucial for *outflow* where you need actual batch properties.
      // For *inflow* (Debit Note), the allocated batch might not exist in `availableBatches` yet,
      // so we use the `alloc` object as the source.
      const correspondingAvailableBatch = availableBatches.find(b => b.batchNumber === alloc.batchCode);

      return {
        batch: correspondingAvailableBatch || { // Use existing batch, or use the allocated one if not found in available.
          batchNumber: alloc.batchCode || 'Unknown Batch', // Ensure batchNumber is always defined
          expiryDate: alloc.expiryDate || null,
          manufacturer: alloc.manufacturer || '',
          unitPrice: Number(alloc.unitPrice) || 0,
          quantity: Number(alloc.allocatedQuantity) || 0, // This is the quantity *in this allocation*, not available stock.
        },
        quantity: Number(alloc.allocatedQuantity) || 0, // Ensure allocatedQuantity is a number
      };
    }).filter(s => s.batch.batchNumber); // Filter out any entries that somehow ended up without a batch number
  });

  // Calculate total allocated quantity
  const totalAllocated = useMemo(() => {
    return selectedBatches.reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
  }, [selectedBatches]);

  const toggleBatch = (batch) => {
    setSelectedBatches(prev => {
      const exists = prev.find(s => s.batch.batchNumber === batch.batchNumber);
      if (exists) {
        return prev.filter(s => s.batch.batchNumber !== batch.batchNumber);
      } else {
        const defaultQty = Math.min(
            (parentQuantity || 0) - totalAllocated,
            (Number(batch.quantity) || 0) > 0 ? (Number(batch.quantity) || 0) : 1
        );
        return [...prev, { batch, quantity: defaultQty > 0 ? defaultQty : 1 }];
      }
    });
  };

  const updateQuantity = (batchNumber, qty) => {
    const newQty = Number(qty);
    const safeQty = isNaN(newQty) ? 0 : Math.max(0, newQty);

    setSelectedBatches(prev => {
      return prev.map(s => {
        if (s.batch.batchNumber === batchNumber) {
          const maxAllowedForThisBatch = parentQuantity - (totalAllocated - (Number(s.quantity) || 0));
          const clampedQty = Math.min(safeQty, maxAllowedForThisBatch);

          return { ...s, quantity: clampedQty };
        }
        return s;
      });
    });
  };

  const removeBatch = (batchNumber) => {
    setSelectedBatches(prev => prev.filter(s => s.batch.batchNumber !== batchNumber));
  };

  const handleConfirm = () => {
    if (selectedBatches.length === 0 && parentQuantity > 0) {
      toast.error("Please allocate batches or set item quantity to 0.");
      return;
    }

    if (totalAllocated !== parentQuantity) {
      toast.error(`Total allocated quantity (${totalAllocated}) must equal item quantity (${parentQuantity}).`);
      return;
    }

    if (totalAllocated === 0 && parentQuantity > 0) {
        toast.error("Total allocated quantity must be greater than zero if item quantity is greater than zero.");
        return;
    }

    const finalAllocations = selectedBatches.filter(s => s.quantity > 0 || parentQuantity === 0);

    const transformed = finalAllocations.map(s => ({
      batchCode: s.batch.batchNumber,
      allocatedQuantity: s.quantity,
      expiryDate: s.batch.expiryDate,
      manufacturer: s.batch.manufacturer,
      unitPrice: s.batch.unitPrice,
    }));

    onUpdateBatch(transformed);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="relative bg-white p-6 rounded-xl shadow-xl w-11/12 max-w-lg max-h-[90vh] overflow-auto">
        <button onClick={onClose} aria-label="Close modal" className="absolute top-2 right-2 text-gray-600 hover:text-gray-900 text-2xl font-bold">×</button>
        <h2 className="text-2xl font-bold mb-4">Allocate Batches for {itemName} (Required: {parentQuantity})</h2>

        {availableBatches.length === 0 && selectedBatches.length === 0 && (
          <p className="text-center text-gray-600 py-6">
            No existing batches available for this item in this warehouse. <br/>
            You can add new batches below (e.g., for a new return).
          </p>
        )}

        {availableBatches.length > 0 && (
            <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Available Batches (Current Stock)</h3>
                <div className="grid grid-cols-1 gap-3">
                {availableBatches.map(batch => {
                    const isSelected = selectedBatches.some(s => s.batch.batchNumber === batch.batchNumber);
                    return (
                    <div key={batch.batchNumber} className={`p-3 border rounded-lg ${isSelected ? 'bg-blue-50 border-blue-400' : 'bg-gray-50'}`}>
                        <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBatch(batch)}
                            className="mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div>
                            <span className="font-semibold text-gray-800">{batch.batchNumber}</span>
                            <span className="ml-2 text-gray-600">({batch.quantity} available)</span>
                            <p className="text-sm text-gray-500">Exp: {new Date(batch.expiryDate).toLocaleDateString()}, Mfr: {batch.manufacturer}, Price: ₹{batch.unitPrice}</p>
                        </div>
                        </label>
                    </div>
                    );
                })}
                </div>
            </div>
        )}

        <h3 className="text-lg font-semibold mb-2 mt-6">Allocated Batches</h3>
        {selectedBatches.length === 0 ? (
          <p className="text-center text-gray-600 py-4">No batches allocated yet. Use the "Available Batches" above or "Add New Batch" below.</p>
        ) : (
          <div className="space-y-3">
            {selectedBatches.map(sel => (
              <div key={sel.batch.batchNumber} className="p-4 border rounded-lg bg-yellow-50 border-yellow-400 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-800">{sel.batch.batchNumber || 'N/A'}</p> {/* Fallback for display */}
                  <p className="text-sm text-gray-600">
                    Exp: {sel.batch.expiryDate ? new Date(sel.batch.expiryDate).toLocaleDateString() : 'N/A'}, Mfr: {sel.batch.manufacturer || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600">Unit Price: ₹{Number(sel.batch.unitPrice).toFixed(2) || '0.00'}</p> {/* Ensure number and format */}
                </div>
                <div className="flex items-center space-x-2">
                  <label htmlFor={`qty-${sel.batch.batchNumber}`} className="sr-only">Quantity for batch {sel.batch.batchNumber}</label>
                  <input
                    id={`qty-${sel.batch.batchNumber}`}
                    type="number"
                    min="0"
                    value={String(sel.quantity)}
                    onChange={e => updateQuantity(sel.batch.batchNumber, e.target.value)}
                    className="w-24 p-2 border rounded-md text-center"
                    aria-label={`Quantity for batch ${sel.batch.batchNumber}`}
                  />
                  <button
                    onClick={() => removeBatch(sel.batch.batchNumber)}
                    className="p-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                    aria-label={`Remove batch ${sel.batch.batchNumber}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Option to Add New Batch (for Debit Note inflow scenario) */}
        <div className="mt-6 border p-4 rounded-lg bg-gray-100">
            <h3 className="text-lg font-semibold mb-2">Add New Batch (for Returns)</h3>
            <button
                onClick={() => {
                    const newBatchNumber = `NEW-${Date.now().toString().slice(-6)}`;
                    const newBatch = {
                        batchNumber: newBatchNumber,
                        quantity: 0,
                        expiryDate: null, // Default to null, let user fill
                        manufacturer: "", // Default to empty, let user fill
                        unitPrice: 0
                    };
                    setSelectedBatches(prev => {
                        if (prev.some(s => s.batch.batchNumber === newBatchNumber)) {
                            toast.warn("A new batch with this temporary number already exists. Please use a unique identifier.");
                            return prev;
                        }
                        return [...prev, { batch: newBatch, quantity: 0 }];
                    });
                    toast.info("New batch row added. Please fill details and quantity.");
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
                Add New Batch Row
            </button>
        </div>


        <div className={`mt-4 text-xl font-bold text-right ${totalAllocated !== parentQuantity ? "text-red-600" : "text-green-600"}`}>
          Total Allocated: {totalAllocated} / {parentQuantity}
        </div>

        <button
          onClick={handleConfirm}
          className="w-full mt-6 bg-green-600 text-white py-3 rounded-md text-lg font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          disabled={totalAllocated !== parentQuantity}
        >
          Confirm Allocation
        </button>
      </div>
    </div>
  );
}





// // components/MultiBatchModalbtach.js
// "use client";

// import React, { useState, useEffect, useMemo } from "react";
// import { toast } from "react-toastify";

// /**
//  * props:
//  * - itemsbatch: { itemId, sourceWarehouse, itemName, qty (number) }
//  * - batchOptions: array of { batchNumber, expiryDate, manufacturer, quantity, unitPrice }
//  * - onClose: fn
//  * - onUpdateBatch: fn(Array<{ batchNumber, quantity, expiryDate, manufacturer, unitPrice }>))
//  */
// export default function MultiBatchModal({ itemsbatch, batchOptions, onClose, onUpdateBatch }) {

//   const { itemId, sourceWarehouse, itemName, qty: parentQuantity } = itemsbatch;

//   const available = useMemo(() => {
//     return (batchOptions || [])
//       .filter(b => b.quantity > 0)
//       .sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));
//   }, [batchOptions]);

//   const [selected, setSelected] = useState([]);

//   useEffect(() => {
//     const init = [];
//     let remaining = parentQuantity;
//     for (const batch of available) {
//       if (remaining <= 0) break;
//       const qty = Math.min(batch.quantity, remaining);
//       init.push({ batch, quantity: qty });
//       remaining -= qty;
//     }
//     setSelected(init);
//   }, [available, parentQuantity]);

//   const toggleBatch = (batch) => {
//     setSelected(prev => {
//       const exists = prev.find(s => s.batch.batchNumber === batch.batchNumber);
//       if (exists) {
//         return prev.filter(s => s.batch.batchNumber !== batch.batchNumber);
//       } else {
//         if (prev.some(s => s.batch.batchNumber === batch.batchNumber)) {
//           toast.warn("This batch is already selected.");
//           return prev;
//         }
//         return [...prev, { batch, quantity: Math.min(parentQuantity, batch.quantity) }];
//       }
//     });
//   };

//   const updateQuantity = (batchNumber, qty) => {
//     if (isNaN(qty)) return;
//     const selectedBatch = selected.find(s => s.batch.batchNumber === batchNumber);
//     if (!selectedBatch) return;
//     const clampedQty = Math.min(Math.max(qty, 1), selectedBatch.batch.quantity);
//     setSelected(prev =>
//       prev.map(s =>
//         s.batch.batchNumber === batchNumber ? { ...s, quantity: clampedQty } : s
//       )
//     );
//   };

//   const resetSelection = () => {
//     setSelected([]);
//   };

//   const totalAllocated = selected.reduce((sum, s) => sum + s.quantity, 0);

//   const handleConfirm = () => {
//     if (selected.length === 0) {
//       toast.error("Please select at least one batch.");
//       return;
//     }
//     if (totalAllocated !== parentQuantity) {
//       toast.error(`Total allocated must equal ${parentQuantity}. You have ${totalAllocated}.`);
//       return;
//     }

//     const transformed = selected.map(s => ({
//       itemId,
//       sourceWarehouse,
//       batchNumber: s.batch.batchNumber,
//       quantity: s.quantity,
//       expiryDate: s.batch.expiryDate,
//       manufacturer: s.batch.manufacturer,
//       unitPrice: s.batch.unitPrice,
//     }));

//     onUpdateBatch(transformed);
//     onClose();
//   };

//   return (
//     <div role="dialog" aria-modal="true" className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="relative bg-white p-6 rounded-xl shadow-xl w-11/12 max-w-lg max-h-[90vh] overflow-auto">
//         <button onClick={onClose} aria-label="Close modal" className="absolute top-2 right-2 text-gray-600 hover:text-gray-900">×</button>
//         <h2 className="text-xl font-semibold mb-4">Select Batches for {itemName}</h2>

//         {available.length === 0 ? (
//           <p className="text-center text-gray-600 py-6">No batches available</p>
//         ) : (
//           <>
//             <div className="mb-4 flex justify-end">
//               <button
//                 onClick={resetSelection}
//                 className="text-sm text-red-600 hover:underline"
//                 type="button"
//               >
//                 Deselect All
//               </button>
//             </div>

//             <div className="space-y-4">
//               {available.map(batch => {
//                 const sel = selected.find(s => s.batch.batchNumber === batch.batchNumber);
//                 return (
//                   <div key={batch.batchNumber} className="p-4 border rounded flex flex-col">
//                     <label className="flex items-center">
//                       <input
//                         type="checkbox"
//                         checked={!!sel}
//                         onChange={() => toggleBatch(batch)}
//                         className="mr-2"
//                       />
//                       <span className="font-medium">{batch.batchNumber} ({batch.quantity} available)</span>
//                     </label>
//                     {sel && (
//                       <div className="mt-2 ml-6 space-y-1">
//                         <p><strong>Expiry:</strong> {new Date(batch.expiryDate).toLocaleDateString()}</p>
//                         <p><strong>Manufacturer:</strong> {batch.manufacturer}</p>
//                         <p><strong>Unit Price:</strong> ₹{batch.unitPrice}</p>
//                         <div className="flex items-center space-x-2">
//                           <label>Qty:</label>
//                           <input
//                             type="number"
//                             min={1}
//                             max={batch.quantity}
//                             value={sel.quantity}
//                             onChange={e => updateQuantity(batch.batchNumber, Number(e.target.value))}
//                             className="w-20 border p-1 rounded"
//                           />
//                         </div>
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>

//             <div className={`mt-4 font-semibold ${totalAllocated !== parentQuantity ? "text-red-600" : "text-green-600"}`}>
//               Total Allocated: {totalAllocated} / {parentQuantity}
//             </div>

//             <button
//               onClick={handleConfirm}
//               className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
//               disabled={totalAllocated !== parentQuantity}
//             >
//               Confirm Allocation
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }