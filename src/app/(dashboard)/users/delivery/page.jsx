
"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import MultiBatchModal from "@/components/MultiBatchModal";

// Updated initial state for Delivery (or Sales Order copy) with additional item fields.
const initialOrderState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  salesEmployee: "",
  status: "Pending",
  orderDate: "",
  expectedDeliveryDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemId: "",
      itemName: "",
      itemDescription: "",
      quantity: 0, // Total quantity for the item.
      allowedQuantity: 0,
      receivedQuantity: 0, // For Sales Order copy.
      unitPrice: 0,
      discount: 0,
      freight: 0,
      taxOption: "GST", // or "IGST"
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      gstRate: 0,       // New field for Sales Order copy.
      cgstAmount: 0,    // New field.
      sgstAmount: 0,    // New field.
      igstAmount: 0,
      managedBy: "",    // Will be updated from item master ("batch" or "serial")
      batches: [],
      errorMessage: "",
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      warehouseId: "",
      managedByBatch: true, // Default to true (for SO copy, this might be preset)
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

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function DeliveryFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <DeliveryForm />
    </Suspense>
  );
}



 function DeliveryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCopied, setIsCopied] = useState(false);
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState(initialOrderState);
  // modalItemIndex tracks which item (by index) is currently selecting batches.
  const [modalItemIndex, setModalItemIndex] = useState(null);

  // Summary Calculation Effect.
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

    const grandTotalCalc =
      totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
    const openBalanceCalc =
      grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

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

  // Function to fetch item master data when an item is selected.
  const handleItemSelect = async (index, selectedItemId) => {
    try {
      const response = await axios.get(`/api/items/${selectedItemId}`);
      if (response.data.success) {
        const itemDetails = response.data.data; // Expected to include managedBy, itemName, etc.
        console.log("Fetched item details:", itemDetails);
        setFormData((prev) => {
          const updatedItems = [...prev.items];
          updatedItems[index] = {
            ...updatedItems[index],
            ...itemDetails,
          };
          console.log("Updated item at index", index, updatedItems[index]);
          return { ...prev, items: updatedItems };
        });
      }
    } catch (error) {
      console.error("Error fetching item master details:", error);
      toast.error("Failed to load item details.");
    }
  };

  // Copy effect: Load data from sessionStorage (deliveryData or salesOrderData).
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedData = sessionStorage.getItem("deliveryData");
      if (!storedData) {
        storedData = sessionStorage.getItem("salesOrderData");
      }
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          // Update each item: ensure extra fields and set managedByBatch.
          // For SO copy, if managedBy is missing but managedByBatch is true, force managedBy to "batch".
          const updatedItems = parsedData.items.map((item) => ({
            ...item,
            gstRate: item.gstRate !== undefined ? item.gstRate : 0,
            cgstAmount: item.cgstAmount !== undefined ? item.cgstAmount : 0,
            sgstAmount: item.sgstAmount !== undefined ? item.sgstAmount : 0,
            managedBy:
              item.managedBy && item.managedBy.trim() !== ""
                ? item.managedBy
                : item.managedByBatch
                ? "batch"
                : "",
            managedByBatch:
              item.managedByBatch !== undefined
                ? item.managedByBatch
                : item.managedBy &&
                  item.managedBy.toLowerCase() === "batch",
          }));
          parsedData.items = updatedItems;
          setFormData(parsedData);
          setIsCopied(true);
          sessionStorage.removeItem("deliveryData");
          sessionStorage.removeItem("salesOrderData");
        } catch (error) {
          console.error("Error parsing copied data:", error);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (editId) {
      axios
        .get(`/api/delivery/${editId}`)
        .then((res) => {
          if (res.data.success) {
            const record = res.data.data;
            setFormData({
              ...record,
              orderDate: formatDateForInput(record.orderDate),
              expectedDeliveryDate: formatDateForInput(record.expectedDeliveryDate),
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching delivery for edit", err);
          toast.error("Error fetching delivery data");
        });
    }
  }, [editId]);

  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          receivedQuantity: 0, // New field
          unitPrice: 0,
          discount: 0,
          freight: 0,
          taxOption: "GST",
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          gstRate: 0,         // New field
          cgstAmount: 0,      // New field
          sgstAmount: 0,      // New field
          igstAmount: 0,
          managedBy: "",      // Will be updated from item master ("batch" or "serial")
          managedByBatch: true, // Default true in copy flow
          batches: [],
          errorMessage: "",
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
          warehouseId: "",
        },
      ],
    }));
  }, []);

  // Updated handleUpdateBatch accepts an array of selections.
  // Each selection is expected to be an object: { batch: { batchNumber, ... }, quantity: allocatedQuantity }
  const handleUpdateBatch = (selectedBatches) => {
    const totalAllocated = selectedBatches.reduce(
      (sum, selection) => sum + Number(selection.quantity || 0),
      0
    );
    if (totalAllocated > formData.items[modalItemIndex].quantity) {
      toast.error("Total allocated quantity exceeds the item quantity");
      return;
    }
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const transformed = selectedBatches.map((selection) => ({
        batchCode: selection.batch.batchNumber,
        expiryDate: selection.batch.expiryDate,
        manufacturer: selection.batch.manufacturer,
        availableQuantity: selection.batch.quantity,
        allocatedQuantity: selection.quantity,
      }));
      updatedItems[modalItemIndex].batches = transformed;
      return { ...prev, items: updatedItems };
    });
  };

  const handleSubmit = async () => {
    try {
      if (editId) {
        await axios.put(`/api/sales-delivery/${editId}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Delivery updated successfully");
      } else {
        await axios.post("/api/sales-delivery", formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Delivery added successfully");
        setFormData(initialOrderState);
      }
      // router.push("/admin/delivery");
    } catch (error) {
      console.error("Error saving delivery:", error);
      toast.error(editId ? "Failed to update delivery" : "Error adding delivery");
    }
  };

  const openBatchModal = (index) => {
    setModalItemIndex(index);
  };

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Delivery" : "Create Delivery"}
      </h1>
      {/* Customer Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
           <div>
            <label className="block mb-2 font-medium">Customer Code</label>
            <input
              type="text"
              name="customerCode"
              value={formData.customerCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            {isCopied ? (
              <div>
                <label className="block mb-2 font-medium">Customer Name</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName || ""}
                  onChange={handleInputChange}
                  placeholder="Enter customer name"
                  className="w-full p-2 border rounded"
                />
              </div>
            ) : (
              <div>
                <label className="block mb-2 font-medium">Customer Name</label>
                <CustomerSearch onSelectCustomer={handleCustomerSelect} />
              </div>
            )}
          </div>
         
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        {/* Additional Order Info */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
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
            <label className="block mb-2 font-medium">Order Date</label>
            <input
              type="date"
              name="orderDate"
              value={formData.orderDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">
              Expected Delivery Date
            </label>
            <input
              type="date"
              name="expectedDeliveryDate"
              value={formData.expectedDeliveryDate || ""}
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
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          setFormData={setFormData}
          // Pass handleItemSelect so that when an item is selected, it updates from the item master.
          onItemSelect={handleItemSelect}
        />
      </div>

      {/* Batch Selection Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Batch Selection</h2>
        {formData.items.map((item, index) => {
          console.log(`Item at index ${index}:`, item);
          const managedByValue = (item.managedBy || "").trim().toLowerCase();
          // Only render if managedByBatch is true and managedBy equals "batch"
          if (!item.managedByBatch || managedByValue !== "batch") return null;
          return (
            <div key={index} className="border p-2 my-2">
              <div className="flex items-center justify-between">
                <span>{item.itemName || `Item ${index + 1}`}</span>
                <button
                  onClick={() => openBatchModal(index)}
                  className="px-3 py-1 bg-blue-500 text-white rounded"
                >
                  Select Batches
                </button>
              </div>
              {item.batches && item.batches.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium">Allocated Batches:</p>
                  <ul>
                    {item.batches.map((selection, idx) => (
                      <li key={idx} className="text-xs">
                        {selection.batchCode}: {selection.allocatedQuantity} allocated (Available:{" "}
                        {selection.availableQuantity - selection.allocatedQuantity})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Remarks & Sales Employee */}
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
          {editId ? "Update" : "Add"}
        </button>
        <button
          onClick={() => {
            setFormData(initialOrderState);
            router.push("/admin/delivery");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Copying from either Sales Order or Delivery into Delivery.
            sessionStorage.setItem("salesOrderData", JSON.stringify(formData));
            alert("Data copied from Sales Order to Delivery!");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Copy From
        </button>
      </div>

      {/* Render the Batch Modal if an item is selected for batch editing */}
      {modalItemIndex !== null && (
        <MultiBatchModal
          itemsbatch={formData.items[modalItemIndex]}
          onClose={() => setModalItemIndex(null)}
          onUpdateBatch={handleUpdateBatch}
        />
      )}

      <ToastContainer />
    </div>
  );
}


export default DeliveryFormWrapper;

