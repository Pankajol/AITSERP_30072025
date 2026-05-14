"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import axios from "axios";
import SupplierSearch from "@/components/SupplierSearch";
import ItemSection from "@/components/ItemSection";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// BatchModal component for handling batch selection
function BatchModal({ itemsbatch, onClose, onUpdateBatch }) {
  const { item, warehouse, itemName, quantity: parentQuantity } = itemsbatch;
  const effectiveItemId = item;
  const effectiveWarehouseId = warehouse;

  const [inventory, setInventory] = useState(null);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [quantity, setQuantity] = useState(parentQuantity === 1 ? 1 : 1);
  const [hasConfirmed, setHasConfirmed] = useState(false);

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

  const handleConfirm = () => {
    if (hasConfirmed) return;
    setHasConfirmed(true);
    const finalQuantity = parentQuantity === 1 ? 1 : quantity;
    if (!selectedBatch || finalQuantity <= 0) {
      toast.error("Please select a batch and enter a valid quantity");
      return;
    }
    if (finalQuantity > selectedBatch.quantity) {
      toast.error("Entered quantity exceeds available batch quantity");
      return;
    }
    onUpdateBatch(selectedBatch, finalQuantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="p-6 max-w-xl mx-auto bg-white shadow-md rounded-xl relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-xl font-bold">
          &times;
        </button>
        <h2 className="text-2xl font-bold mb-4">Select Batch for {itemName}</h2>
        {!inventory ? (
          <p>Loading inventory...</p>
        ) : inventory.batches.length === 0 ? (
          <p>No batches available</p>
        ) : (
          <>
            <label className="block mt-4">Select Batch:</label>
            <select
              className="border p-2 rounded w-full"
              onChange={(e) =>
                setSelectedBatch(e.target.value ? JSON.parse(e.target.value) : null)
              }
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
                <p>
                  <strong>Batch Number:</strong> {selectedBatch.batchNumber}
                </p>
                <p>
                  <strong>Expiry Date:</strong>{" "}
                  {new Date(selectedBatch.expiryDate).toDateString()}
                </p>
                <p>
                  <strong>Manufacturer:</strong> {selectedBatch.manufacturer}
                </p>
                <label className="block mt-2">Quantity:</label>
                <input
                  type="number"
                  min="1"
                  max={selectedBatch.quantity}
                  value={parentQuantity === 1 ? 1 : quantity}
                  onChange={(e) => {
                    if (parentQuantity !== 1) setQuantity(Number(e.target.value));
                  }}
                  className="border p-2 rounded w-full"
                  disabled={parentQuantity === 1}
                />
                <p className="mt-2">
                  <strong>Total Price:</strong> ₹
                  {((parentQuantity === 1 ? 1 : quantity) * selectedBatch.unitPrice).toFixed(2)}
                </p>
              </div>
            )}
            <button onClick={handleConfirm} className="mt-4 bg-blue-500 text-white p-2 rounded w-full">
              Confirm Batch
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Updated initial state for Debit Note.
const initialDebitNoteState = {
  supplierCode: "",
  supplierName: "",
  supplierContact: "",
  refNumber: "", // Debit Note Number.
  salesEmployee: "",
  status: "Pending",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemId: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      allowedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      batches: [],
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      warehouseId: "",
      errorMessage: "",
      taxOption: "GST",
      igstAmount: 0,
      managedByBatch: true,
    },
  ],
  remarks: "",
  freight: 0,
  rounding: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
  fromQuote: false,
};

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

export default function DebitNoteEditPage() {
  const router = useRouter();
  const { id } = useParams();
  const [formData, setFormData] = useState(initialDebitNoteState);
  const [modalItemIndex, setModalItemIndex] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);

  // Fetch existing Debit Note data if editing.
  useEffect(() => {
    console.log("Debit Note ID:", id);
    if (id) {
      axios.get(`/api/debit-note/${id}`)
        .then((res) => {
          console.log("Fetched data:", res.data);
          // Adjust based on your API response format:
          const record = res.data.success ? res.data.data : res.data;
          setFormData({
            ...record,
            postingDate: formatDate(record.postingDate),
            validUntil: formatDate(record.validUntil),
            documentDate: formatDate(record.documentDate),
          });
        })
        .catch((err) => {
          console.error("Error fetching debit note for edit", err);
          toast.error("Error fetching debit note data");
        })
        .finally(() => setLoading(false));
    }
  }, [id]);
  

  // Check for copied data from Sales Order/Delivery.
  useEffect(() => {
    if (typeof window !== "undefined") {
      let copiedData = null;
      const soData = sessionStorage.getItem("debitNoteData");
      const delData = sessionStorage.getItem("DebitNoteData");
      if (soData) {
        copiedData = JSON.parse(soData);
        sessionStorage.removeItem("debitNoteData");
      } else if (delData) {
        copiedData = JSON.parse(delData);
        sessionStorage.removeItem("DebitNoteData");
      }
      if (copiedData) {
        setFormData(copiedData);
        setIsCopied(true);
      }
    }
  }, []);

  // Calculation effect for summary fields.
  useEffect(() => {
    const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return acc + (unitPrice - discount) * quantity;
    }, 0);

    const totalItemsCalc = formData.items.reduce(
      (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
      0
    );

    const gstTotalCalc = formData.items.reduce((acc, item) => {
      if (item.taxOption === "IGST") {
        return acc + (parseFloat(item.igstAmount) || 0);
      }
      return acc + (parseFloat(item.gstAmount) || 0);
    }, 0);

    const overallFreight = parseFloat(formData.freight) || 0;
    const roundingCalc = parseFloat(formData.rounding) || 0;
    const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
    const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

    const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
    const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

    if (
      totalBeforeDiscountCalc !== formData.totalBeforeDiscount ||
      gstTotalCalc !== formData.gstTotal ||
      grandTotalCalc !== formData.grandTotal ||
      openBalanceCalc !== formData.openBalance
    ) {
      setFormData((prev) => ({
        ...prev,
        totalBeforeDiscount: totalBeforeDiscountCalc,
        gstTotal: gstTotalCalc,
        grandTotal: grandTotalCalc,
        openBalance: openBalanceCalc,
      }));
    }
  }, [
    formData.items,
    formData.freight,
    formData.rounding,
    formData.totalDownPayment,
    formData.appliedAmounts,
    formData.totalBeforeDiscount,
    formData.gstTotal,
    formData.grandTotal,
    formData.openBalance,
  ]);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleSupplierSelect = useCallback((selectedSupplier) => {
    setFormData((prev) => ({
      ...prev,
      supplierCode: selectedSupplier.supplierCode || "",
      supplierName: selectedSupplier.supplierName || "",
      supplierContact: selectedSupplier.contactPersonName || "",
    }));
  }, []);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      updatedItems[index] = { ...updatedItems[index], [name]: value };
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: "",
          itemCode: "",
          itemId: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          allowedQuantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstType: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          tdsAmount: 0,
          batches: [],
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
          warehouseId: "",
          errorMessage: "",
          taxOption: "GST",
          igstAmount: 0,
          managedByBatch: true,
        },
      ],
    }));
  }, []);

  const openBatchModal = (index) => {
    setModalItemIndex(index);
  };

  const handleUpdateBatch = (batch, allocatedQuantity) => {
    const currentAllocatedTotal = formData.items[modalItemIndex].batches.reduce(
      (sum, batchItem) => sum + (batchItem.allocatedQuantity || 0),
      0
    );
    const newTotal = currentAllocatedTotal + allocatedQuantity;
    if (newTotal > formData.items[modalItemIndex].quantity) {
      toast.error("Total allocated quantity exceeds the item quantity");
      return;
    }
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      if (updatedItems[modalItemIndex].quantity === 1) {
        updatedItems[modalItemIndex].batches = [
          {
            batchCode: batch.batchNumber,
            expiryDate: batch.expiryDate,
            manufacturer: batch.manufacturer,
            allocatedQuantity: 1,
            availableQuantity: batch.quantity,
          },
        ];
      } else {
        const existingIndex = updatedItems[modalItemIndex].batches.findIndex(
          (b) => b.batchCode === batch.batchNumber
        );
        if (existingIndex !== -1) {
          updatedItems[modalItemIndex].batches[existingIndex].allocatedQuantity += allocatedQuantity;
        } else {
          updatedItems[modalItemIndex].batches.push({
            batchCode: batch.batchNumber,
            expiryDate: batch.expiryDate,
            manufacturer: batch.manufacturer,
            allocatedQuantity: allocatedQuantity,
            availableQuantity: batch.quantity,
          });
        }
      }
      return { ...prev, items: updatedItems };
    });
  };

  const handleSubmit = async () => {
    try {
      await axios.put(`/api/debit-note/${id}`, formData, {
        headers: { "Content-Type": "application/json" },
      });
      toast.success("Debit Note updated successfully");
      router.push("/admin/debit-note");
    } catch (error) {
      console.error("Error saving debit note:", error);
      toast.error("Failed to update debit note");
    }
  };

  if (!id) return <div className="p-8">No Debit Note ID provided.</div>;

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">Edit Debit Note</h1>
      {/* Supplier Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            {formData.supplierName ? (
              <input
                type="text"
                name="supplierName"
                value={formData.supplierName}
                readOnly
                className="w-full p-2 border rounded bg-gray-100"
              />
            ) : (
              <SupplierSearch onSelectSupplier={handleSupplierSelect} />
            )}
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input
              type="text"
              name="supplierCode"
              value={formData.supplierCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Contact</label>
            <input
              type="text"
              name="supplierContact"
              value={formData.supplierContact || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Debit Note Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        {/* Additional Debit Note Info */}
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select status (optional)</option>
              <option value="Pending">Pending</option>
              <option value="Confirmed">Confirmed</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDate(formData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="dd-mm-yyyy"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formatDate(formData.validUntil)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="dd-mm-yyyy"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formatDate(formData.documentDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
              placeholder="dd-mm-yyyy"
            />
          </div>
        </div>
      </div>

      {/* Items Section */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          setFormData={setFormData}
        />
      </div>

      {/* Batch Selection Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Batch Selection</h2>
        {formData.items.map((item, index) => {
          if (!item.managedByBatch) return null;
          return (
            <div key={index} className="border p-2 my-2">
              <div className="flex items-center justify-between">
                <span>{item.itemName || `Item ${index + 1}`}</span>
                <button
                  onClick={() => openBatchModal(index)}
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  Select Batch
                </button>
              </div>
              {item.batches && item.batches.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Allocated Batches:</p>
                  <ul>
                    {item.batches.map((batch, idx) => (
                      <li key={idx} className="text-xs">
                        {batch.batchCode}: {batch.allocatedQuantity} allocated (Available: {batch.availableQuantity})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Sales Employee & Remarks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            type="text"
            name="salesEmployee"
            value={formData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          ></textarea>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Total Before Discount</label>
          <input
            type="number"
            value={formData.totalBeforeDiscount.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST Total</label>
          <input
            type="number"
            value={formData.gstTotal.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Grand Total</label>
          <input
            type="number"
            value={formData.grandTotal.toFixed(2)}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Update
        </button>
        <button
          onClick={() => {
            setFormData(initialDebitNoteState);
            router.push("/admin/debit-note");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            sessionStorage.setItem("debitNoteData", JSON.stringify(formData));
            alert("Data copied from Sales Order/Delivery!");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Copy From
        </button>
      </div>

      {/* Render Batch Modal if a batch is being edited */}
      {modalItemIndex !== null && (
        <BatchModal
          itemsbatch={formData.items[modalItemIndex]}
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={handleUpdateBatch}
        />
      )}

      <ToastContainer />
    </div>
  );
}


// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { useParams, useRouter } from "next/navigation";
// import axios from "axios";

// // Inline ItemSection component to handle editing of item rows
// function ItemSection({ items, onItemChange, onAddItem, onRemoveItem }) {
//   return (
//     <div className="overflow-x-auto mt-6">
//       <table className="min-w-full border-collapse shadow-sm">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">Item Code</th>
//             <th className="border p-2">Item Name</th>
//             <th className="border p-2">Quantity</th>
//             <th className="border p-2">Unit Price</th>
//             <th className="border p-2">Discount</th>
//             <th className="border p-2">Total</th>
//             <th className="border p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {items.map((item, index) => {
//             // Calculate total: (unitPrice - discount) * quantity
//             const total =
//               ((parseFloat(item.unitPrice) || 0) -
//                 (parseFloat(item.discount) || 0)) *
//               (parseFloat(item.quantity) || 0);
//             return (
//               <tr key={index} className="hover:bg-gray-50">
//                 <td className="border p-2">
//                   <input
//                     type="text"
//                     name="itemCode"
//                     value={item.itemCode}
//                     onChange={(e) => onItemChange(index, e)}
//                     className="w-full p-1 border rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="text"
//                     name="itemName"
//                     value={item.itemName}
//                     onChange={(e) => onItemChange(index, e)}
//                     className="w-full p-1 border rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="number"
//                     name="quantity"
//                     value={item.quantity}
//                     onChange={(e) => onItemChange(index, e)}
//                     className="w-full p-1 border rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="number"
//                     name="unitPrice"
//                     value={item.unitPrice}
//                     onChange={(e) => onItemChange(index, e)}
//                     className="w-full p-1 border rounded"
//                   />
//                 </td>
//                 <td className="border p-2">
//                   <input
//                     type="number"
//                     name="discount"
//                     value={item.discount}
//                     onChange={(e) => onItemChange(index, e)}
//                     className="w-full p-1 border rounded"
//                   />
//                 </td>
//                 <td className="border p-2 text-center">{total.toFixed(2)}</td>
//                 <td className="border p-2 text-center">
//                   <button
//                     type="button"
//                     onClick={() => onRemoveItem(index)}
//                     className="px-2 py-1 bg-red-500 text-white rounded"
//                   >
//                     Remove
//                   </button>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//       <div className="mt-4 text-right">
//         <button
//           type="button"
//           onClick={onAddItem}
//           className="px-4 py-2 bg-green-600 text-white rounded"
//         >
//           Add Item
//         </button>
//       </div>
//     </div>
//   );
// }

// // Main EditDebitNote component
// export default function EditDebitNote() {
//   const { id } = useParams(); // Extract record ID from the URL
//   const router = useRouter();
//   const [formData, setFormData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Fetch existing debit note data for auto-fill
//   useEffect(() => {
//     async function fetchData() {
//       try {
//         const res = await axios.get(`/api/debit-note/${id}`);
//         setFormData(res.data);
//       } catch (err) {
//         console.error("Error fetching data", err);
//         setError("Failed to load data");
//       } finally {
//         setLoading(false);
//       }
//     }
//     if (id) fetchData();
//   }, [id]);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const newItems = [...prev.items];
//       newItems[index] = {
//         ...newItems[index],
//         [name]:
//           name === "quantity" ||
//           name === "unitPrice" ||
//           name === "discount"
//             ? parseFloat(value) || 0
//             : value,
//       };
//       return { ...prev, items: newItems };
//     });
//   }, []);

//   const handleAddItem = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
//         },
//       ],
//     }));
//   }, []);

//   const handleRemoveItem = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);
//   const addItemRow = useCallback(() => {
//       setDebitNoteData((prev) => ({
//         ...prev,
//         items: [
//           ...prev.items,
//           {
//             itemCode: "",
//             itemName: "",
//             itemDescription: "",
//             quantity: 0,
//             unitPrice: 0,
//             discount: 0,
//             freight: 0,
//             gstType: 0,
//             priceAfterDiscount: 0,
//             totalAmount: 0,
//             gstAmount: 0,
//             tdsAmount: 0,
//           },
//         ],
//       }));
//     }, []);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       await axios.put(`/api/debit-note/${id}`, formData, {
//         headers: { "Content-Type": "application/json" },
//       });
//       router.push("/admin/debit-note-view");
//     } catch (err) {
//       console.error("Error updating record", err);
//       setError("Update failed");
//     }
//   };

//   if (loading) return <div className="p-8">Loading...</div>;
//   if (error) return <div className="p-8 text-red-600">{error}</div>;
//   if (!formData) return null;

//   return (
//     <div className="p-8 max-w-4xl mx-auto">
//       <h1 className="text-3xl font-bold mb-6">Edit Debit Note</h1>
//       <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-lg shadow">
//         {/* Supplier & Reference Section */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block mb-2 font-medium">Supplier Name</label>
//             <input
//               type="text"
//               name="supplierName"
//               value={formData.supplierName || ""}
//               onChange={handleInputChange}
//               placeholder="Enter supplier name"
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>

//         {/* Dates & Status Section */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Open">Open</option>
//               <option value="Closed">Closed</option>
//               <option value="Pending">Pending</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={
//                 formData.postingDate
//                   ? new Date(formData.postingDate).toISOString().split("T")[0]
//                   : ""
//               }
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={
//                 formData.validUntil
//                   ? new Date(formData.validUntil).toISOString().split("T")[0]
//                   : ""
//               }
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>

//         {/* Delivery Date */}
//         <div>
//           <label className="block mb-2 font-medium">Delivery Date</label>
//           <input
//             type="date"
//             name="documentDate"
//             value={
//               formData.documentDate
//                 ? new Date(formData.documentDate).toISOString().split("T")[0]
//                 : ""
//             }
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>

//         {/* Item Section */}
//         <div>
//           <h2 className="text-2xl font-semibold mb-4">Items</h2>
//           <ItemSection items={formData.items} onItemChange={handleItemChange} onAddItem={addItemRow} />
//         </div>

//         {/* Sales & Remarks */}
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <label className="block mb-2 font-medium">Sales Employee</label>
//             <input
//               type="text"
//               name="salesEmployee"
//               value={formData.salesEmployee || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Remarks</label>
//             <textarea
//               name="remarks"
//               value={formData.remarks || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>

//         {/* Financial Summary */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="block mb-2 font-medium">Freight</label>
//             <input
//               type="number"
//               name="freight"
//               value={formData.freight || 0}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Rounding</label>
//             <input
//               type="number"
//               name="rounding"
//               value={formData.rounding || 0}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Grand Total</label>
//             <input
//               type="number"
//               name="grandTotal"
//               value={formData.grandTotal || 0}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//         </div>

//         <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded mt-6">
//           Update Debit Note
//         </button>
//       </form>
//     </div>
//   );
// }
