import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

function MultiBatchModal({ itemsbatch, onClose, onUpdateBatch }) {
  // Destructure item details from the itemsbatch prop
  const { item , warehouse, itemName, quantity: parentQuantity } = itemsbatch;
  const effectiveItemId = item ;
  const effectiveWarehouseId = warehouse;

  const [inventory, setInventory] = useState(null);
  // Array of selected batches: each item { batch, quantity }
  const [selectedBatches, setSelectedBatches] = useState(
    parentQuantity === 1
      ? [{ batch: null, quantity: 1 }]
      : [{ batch: null, quantity: 0 }]
  );
  const [hasConfirmed, setHasConfirmed] = useState(false);

  // Fetch inventory details when effectiveItemId and effectiveWarehouseId change
  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch(
          `/api/inventory/${effectiveItemId}/${effectiveWarehouseId}`
        );
        if (!response.ok) throw new Error("Failed to fetch inventory");
        const data = await response.json();
        setInventory(data);
      } catch (error) {
        console.error("Error fetching inventory:", error);
        setInventory({ batches: [] });
      }
    }

    if (effectiveItemId && effectiveWarehouseId) {
      fetchInventory();
    } else {
      setInventory({ batches: [] });
    }
  }, [effectiveItemId, effectiveWarehouseId]);

  // Update a specific row's field and notify parent
  const updateSelection = (index, field, value) => {
    const newSelections = [...selectedBatches];
    newSelections[index] = { ...newSelections[index], [field]: value };
    setSelectedBatches(newSelections);
  };

  // Add a new selection row
  const addSelectionRow = () => {
    setSelectedBatches([...selectedBatches, { batch: null, quantity: 0 }]);
  };

  // Remove a selection row
  const removeSelectionRow = (index) => {
    const newSelections = selectedBatches.filter((_, idx) => idx !== index);
    setSelectedBatches(newSelections);
  };

  // Validate selections before confirming
  const handleConfirm = () => {
    if (hasConfirmed) return;
    setHasConfirmed(true);

    // Sum the quantities from all rows
    const totalAllocated = selectedBatches.reduce(
      (sum, sel) => sum + Number(sel.quantity || 0),
      0
    );
    if (totalAllocated !== parentQuantity) {
      toast.error(`Total allocated quantity must equal ${parentQuantity}.`);
      setHasConfirmed(false);
      return;
    }

    // Check each selected batch is valid
    for (let sel of selectedBatches) {
      if (!sel.batch || sel.quantity <= 0) {
        toast.error("Each row must have a selected batch and a valid quantity.");
        setHasConfirmed(false);
        return;
      }
      if (sel.quantity > sel.batch.quantity) {
        toast.error(
          `Entered quantity for batch ${sel.batch.batchNumber} exceeds available batch quantity.`
        );
        setHasConfirmed(false);
        return;
      }
    }

    // If all validations pass, update parent with the selections
    onUpdateBatch(selectedBatches);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="p-6 max-w-2xl mx-auto bg-white shadow-md rounded-xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-2 right-2 text-xl font-bold">
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Select Batches for {itemName}</h2>
        {!inventory ? (
          <p>Loading inventory...</p>
        ) : inventory.batches.length === 0 ? (
          <p>No batches available</p>
        ) : (
          <>
            {selectedBatches.map((selection, idx) => (
              <div key={idx} className="mb-4 p-4 border rounded bg-gray-100 relative">
                {selectedBatches.length > 1 && (
                  <button
                    onClick={() => removeSelectionRow(idx)}
                    className="absolute top-2 right-2 text-red-500"
                    title="Remove this selection"
                  >
                    &times;
                  </button>
                )}
                <label className="block mt-2">Select Batch:</label>
                <select
                  className="border p-2 rounded w-full"
                  value={selection.batch ? JSON.stringify(selection.batch) : ""}
                  onChange={(e) =>
                    updateSelection(
                      idx,
                      "batch",
                      e.target.value ? JSON.parse(e.target.value) : null
                    )
                  }
                >
                  <option value="">-- Select --</option>
                  {inventory.batches.map((batch, index) => (
                    <option key={index} value={JSON.stringify(batch)}>
                      {batch.batchNumber} - {batch.quantity} available
                    </option>
                  ))}
                </select>
                {selection.batch && (
                  <>
                    <p className="mt-2">
                      <strong>Expiry Date:</strong>{" "}
                      {new Date(selection.batch.expiryDate).toDateString()}
                    </p>
                    <p>
                      <strong>Manufacturer:</strong> {selection.batch.manufacturer}
                    </p>
                    <p>
                      <strong>Unit Price:</strong> ₹{selection.batch.unitPrice}
                    </p>
                  </>
                )}
                <label className="block mt-2">Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max={selection.batch ? selection.batch.quantity : undefined}
                  value={selection.quantity}
                  onChange={(e) =>
                    updateSelection(idx, "quantity", Number(e.target.value))
                  }
                  className="border p-2 rounded w-full"
                  disabled={!selection.batch || (parentQuantity === 1)}
                />
                {selection.batch && (
                  <p className="mt-2">
                    <strong>Total Price:</strong> ₹
                    {(Number(selection.quantity) * selection.batch.unitPrice).toFixed(2)}
                  </p>
                )}
              </div>
            ))}
            {parentQuantity > 1 && (
              <button
                onClick={addSelectionRow}
                className="mb-4 bg-green-500 text-white p-2 rounded w-full"
              >
                Add Another Batch
              </button>
            )}
            <div className="mb-4">
              <p>
                <strong>Total Allocated:</strong>{" "}
                {selectedBatches.reduce((sum, sel) => sum + Number(sel.quantity || 0), 0)}{" "}
                / {parentQuantity}
              </p>
            </div>
            <button onClick={handleConfirm} className="mt-4 bg-blue-500 text-white p-2 rounded w-full">
              Confirm Batches
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default MultiBatchModal;



// import React, { useState, useEffect } from 'react';
// import { toast } from 'react-toastify';

// function MultiBatchModal({ itemsbatch, onClose, onUpdateBatch }) {
//   // Destructure item details from the itemsbatch prop
//   const { item, warehouse, itemName, quantity: parentQuantity } = itemsbatch;
//   const effectiveItemId = item;
//   const effectiveWarehouseId = warehouse;

//   const [inventory, setInventory] = useState(null);
//   // Array of selected batches: each item { batch, quantity }
//   const [selectedBatches, setSelectedBatches] = useState(
//     parentQuantity === 1
//       ? [{ batch: null, quantity: 1 }]
//       : [{ batch: null, quantity: 0 }]
//   );
//   const [hasConfirmed, setHasConfirmed] = useState(false);

//   // Fetch inventory details when effectiveItemId and effectiveWarehouseId change
//   useEffect(() => {
//     async function fetchInventory() {
//       try {
//         const response = await fetch(
//           `/api/inventory/${effectiveItemId}/${effectiveWarehouseId}`
//         );
//         if (!response.ok) throw new Error("Failed to fetch inventory");
//         const data = await response.json();
//         setInventory(data);
//       } catch (error) {
//         console.error("Error fetching inventory:", error);
//         setInventory({ batches: [] });
//       }
//     }

//     if (effectiveItemId && effectiveWarehouseId) {
//       fetchInventory();
//     } else {
//       setInventory({ batches: [] });
//     }
//   }, [effectiveItemId, effectiveWarehouseId]);

//   // Handler to update a particular row (index) with batch selection or quantity change
//   const updateSelection = (index, field, value) => {
//     const newSelections = selectedBatches.slice();
//     newSelections[index] = {
//       ...newSelections[index],
//       [field]: value,
//     };
//     setSelectedBatches(newSelections);
//   };

//   // Add a new empty selection row (only if parentQuantity > 1)
//   const addSelectionRow = () => {
//     setSelectedBatches([...selectedBatches, { batch: null, quantity: 0 }]);
//   };

//   // Remove a selection row by index (ensuring at least one row remains)
//   const removeSelectionRow = (index) => {
//     if (selectedBatches.length === 1) return;
//     setSelectedBatches(selectedBatches.filter((_, idx) => idx !== index));
//   };

//   // Validate selections before confirming
//   const handleConfirm = () => {
//     if (hasConfirmed) return;
//     setHasConfirmed(true);

//     // Sum the quantities from all rows
//     const totalAllocated = selectedBatches.reduce(
//       (sum, sel) => sum + Number(sel.quantity || 0),
//       0
//     );
//     if (totalAllocated !== parentQuantity) {
//       toast.error(`Total allocated quantity must equal ${parentQuantity}.`);
//       setHasConfirmed(false);
//       return;
//     }

//     // Check each selected batch is valid
//     for (let sel of selectedBatches) {
//       if (!sel.batch || sel.quantity <= 0) {
//         toast.error("Each row must have a selected batch and a valid quantity.");
//         setHasConfirmed(false);
//         return;
//       }
//       if (sel.quantity > sel.batch.quantity) {
//         toast.error(
//           `Entered quantity for batch ${sel.batch.batchNumber} exceeds available batch quantity.`
//         );
//         setHasConfirmed(false);
//         return;
//       }
//     }

//     // If all validations pass, update parent with the selections
//     onUpdateBatch(selectedBatches);
//     onClose();
//   };

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
//       <div className="p-6 max-w-2xl mx-auto bg-white shadow-md rounded-xl relative">
//         <button onClick={onClose} className="absolute top-2 right-2 text-xl font-bold">
//           &times;
//         </button>
//         <h2 className="text-2xl font-bold mb-4">Select Batches for {itemName}</h2>
//         {!inventory ? (
//           <p>Loading inventory...</p>
//         ) : inventory.batches.length === 0 ? (
//           <p>No batches available</p>
//         ) : (
//           <>
//             {selectedBatches.map((selection, index) => (
//               <div
//                 key={index}
//                 className="mb-4 p-4 border rounded bg-gray-100 relative"
//               >
//                 {parentQuantity > 1 && (
//                   <button
//                     onClick={() => removeSelectionRow(index)}
//                     className="absolute top-2 right-2 text-red-500"
//                     title="Remove this selection"
//                   >
//                     &times;
//                   </button>
//                 )}
//                 <label className="block mt-2">Select Batch:</label>
//                 <select
//                   className="border p-2 rounded w-full"
//                   value={selection.batch ? JSON.stringify(selection.batch) : ""}
//                   onChange={(e) =>
//                     updateSelection(
//                       index,
//                       "batch",
//                       e.target.value ? JSON.parse(e.target.value) : null
//                     )
//                   }
//                 >
//                   <option value="">-- Select --</option>
//                   {inventory.batches.map((batch, idx) => (
//                     <option key={idx} value={JSON.stringify(batch)}>
//                       {batch.batchNumber} - {batch.quantity} available
//                     </option>
//                   ))}
//                 </select>
//                 {selection.batch && (
//                   <>
//                     <p className="mt-2">
//                       <strong>Expiry Date:</strong>{" "}
//                       {new Date(selection.batch.expiryDate).toDateString()}
//                     </p>
//                     <p>
//                       <strong>Manufacturer:</strong> {selection.batch.manufacturer}
//                     </p>
//                     <p>
//                       <strong>Unit Price:</strong> ₹{selection.batch.unitPrice}
//                     </p>
//                   </>
//                 )}
//                 <label className="block mt-2">Quantity:</label>
//                 <input
//                   type="number"
//                   min="1"
//                   max={selection.batch ? selection.batch.quantity : undefined}
//                   value={selection.quantity}
//                   onChange={(e) => updateSelection(index, "quantity", Number(e.target.value))}
//                   className="border p-2 rounded w-full"
//                   disabled={!selection.batch || (parentQuantity === 1)}
//                 />
//                 {selection.batch && (
//                   <p className="mt-2">
//                     <strong>Total Price:</strong> ₹
//                     {(Number(selection.quantity) * selection.batch.unitPrice).toFixed(2)}
//                   </p>
//                 )}
//               </div>
//             ))}
//             {parentQuantity > 1 && (
//               <button
//                 onClick={addSelectionRow}
//                 className="mb-4 bg-green-500 text-white p-2 rounded w-full"
//               >
//                 Add Another Batch
//               </button>
//             )}
//             <div className="mb-4">
//               <p>
//                 <strong>Total Allocated:</strong>{" "}
//                 {selectedBatches.reduce((sum, sel) => sum + Number(sel.quantity || 0), 0)}{" "}
//                 / {parentQuantity}
//               </p>
//             </div>
//             <button onClick={handleConfirm} className="mt-4 bg-blue-500 text-white p-2 rounded w-full">
//               Confirm Batches
//             </button>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default MultiBatchModal;
