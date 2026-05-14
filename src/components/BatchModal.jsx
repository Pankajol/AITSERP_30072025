"use client";
import { useEffect, useState } from "react";

export default function BatchModal({ item, onClose, onUpdateBatch }) {
  const { itemCode, warehouseCode, itemName } = item;
  const [inventory, setInventory] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch(`/api/inventory/${itemCode}/${warehouseCode}`);
        if (!response.ok) throw new Error("Failed to fetch inventory");
        const data = await response.json();
        setInventory(data);
      } catch (error) {
        console.error("Error fetching inventory:", error);
      }
    }
    if (itemCode && warehouseCode) {
      fetchInventory();
    }
  }, [itemCode, warehouseCode]);

  const handleConfirm = () => {
    if (!selectedBatch || quantity <= 0) {
      alert("Please select a batch and enter a valid quantity");
      return;
    }
    // Pass the selected batch and allocated quantity back to the parent
    onUpdateBatch(selectedBatch, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="p-6 max-w-xl mx-auto bg-white shadow-md rounded-xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-xl font-bold"
        >
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Select Batch for {itemName}</h2>
        {inventory ? (
          <>
            <label className="block mt-4">Select Batch:</label>
            <select
              className="border p-2 rounded w-full"
              onChange={(e) => setSelectedBatch(JSON.parse(e.target.value))}
            >
              <option value="">-- Select --</option>
              {inventory.batches.map((batch, index) => (
                <option key={index} value={JSON.stringify(batch)}>
                  {batch.batchNumber} - {batch.quantity} available
                </option>
              ))}
            </select>

            {selectedBatch && (
              <div className="mt-4 p-4 border rounded bg-gray-100">
                <p>Batch Number: {selectedBatch.batchNumber}</p>
                <p>Expiry Date: {new Date(selectedBatch.expiryDate).toDateString()}</p>
                <p>Manufacturer: {selectedBatch.manufacturer}</p>
                <p>Unit Price: ₹{selectedBatch.unitPrice}</p>
                <label className="block mt-2">Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch.quantity}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="border p-2 rounded w-full"
                />
              </div>
            )}

            <button
              onClick={handleConfirm}
              className="mt-4 bg-blue-500 text-white p-2 rounded w-full"
            >
              Confirm Batch
            </button>
          </>
        ) : (
          <p>Loading inventory...</p>
        )}
      </div>
    </div>
  );
}
