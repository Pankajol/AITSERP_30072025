"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import MultiBatchModal from "@/components/MultiBatchModal";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const initialInvoiceState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "", // This will serve as the Invoice Number.
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
      managedByBatch: true, // Default to true in copy flow.
      managedBy: "", // Will be updated from item master ("batch" or "serial")
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
  remainingAmount:0,
  // openBalance: 0,
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

function SalesInvoiceFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <SalesInvoiceForm />
    </Suspense>
  );
}


 function SalesInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isCopied, setIsCopied] = useState(false);
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState(initialInvoiceState);
  const [modalItemIndex, setModalItemIndex] = useState(null);
  const [errors, setErrors] = useState({});

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
    // const openBalanceCalc =
    //   grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

    if (
      totalBeforeDiscountCalc !== formData.totalBeforeDiscount ||
      gstTotalCalc !== formData.gstTotal ||
      grandTotalCalc !== formData.grandTotal 
    ) {
      setFormData((prev) => ({
        ...prev,
        totalBeforeDiscount: totalBeforeDiscountCalc,
        gstTotal: gstTotalCalc,
        grandTotal: grandTotalCalc,
        remainingAmount:grandTotalCalc,
        openBalance: 0,
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
    formData.remainingAmount,
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

  // Copy effect: Load data from sessionStorage (InvoiceData or SalesInvoiceData).
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedData = sessionStorage.getItem("InvoiceData");
      if (!storedData) {
        storedData = sessionStorage.getItem("SalesInvoiceData");
      }
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
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
          sessionStorage.removeItem("InvoiceData");
          sessionStorage.removeItem("SalesInvoiceData");
        } catch (error) {
          console.error("Error parsing copied data:", error);
        }
      }
    }
  }, []);

  useEffect(() => {
    if (editId) {
      axios
        .get(`/api/sales-invoice/${editId}`)
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
          console.error("Error fetching sales invoice for edit", err);
          toast.error("Error fetching sales invoice data");
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

  
  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
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
          managedByBatch: true, // Default true in copy flow.
          managedBy: "",
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
        allocatedQuantity: selection.quantity,
        availableQuantity: selection.batch.quantity,
      }));
      updatedItems[modalItemIndex].batches = transformed;
      return { ...prev, items: updatedItems };
    });
  };

  // Simple UI validation before submission.
  const validateForm = () => {
    let validationErrors = {};
    if (!formData.customerName) validationErrors.customerName = "Customer name is required";
    if (!formData.refNumber) validationErrors.refNumber = "Invoice number is required";
    // Add further validations as needed.
    return validationErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      // Display errors as toast messages.
      Object.values(validationErrors).forEach((err) => toast.error(err));
      return;
    }
    try {
      if (editId) {
        await axios.put(`/api/sales-invoice/${editId}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Sales Invoice updated successfully");
      } else {
        await axios.post("/api/sales-invoice", formData, {
          headers: { "Content-Type": "application/json" },
        });
        toast.success("Sales Invoice added successfully");
        setFormData(initialInvoiceState);
      }
      router.push("/admin/sales-invoice");
    } catch (error) {
      console.error("Error saving sales invoice:", error);
      toast.error(editId ? "Failed to update sales invoice" : "Error adding sales invoice");
    }
  };

  const openBatchModal = (index) => {
    setModalItemIndex(index);
  };

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Invoice" : "Create Sales Invoice"}
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
        
        </div>
        {/* Additional Invoice Info */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Invoice Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            {errors.refNumber && (
              <p className="text-red-500 text-sm">{errors.refNumber}</p>
            )}
          </div>
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
            <label className="block mb-2 font-medium">Invoice Date</label>
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
              Expected Payment Date
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
          onItemSelect={handleItemSelect}
          removeItemRow={removeItemRow}
        />
      </div>

      {/* Batch Selection Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Batch Selection</h2>
        {formData.items.map((item, index) => {
          // console.log(`Item at index ${index}:`, item);
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
            setFormData(initialInvoiceState);
            router.push("/admin/sales-invoice");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Copying from Sales Order or Delivery into Sales Invoice.
            sessionStorage.setItem("salesOrderData", JSON.stringify(formData));
            alert("Data copied from Sales Order/Delivery!");
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

export default SalesInvoiceFormWrapper;


