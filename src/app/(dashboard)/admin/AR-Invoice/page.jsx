"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { FaCheckCircle } from "react-icons/fa";

// Initial state for a Sales Invoice.
const initialInvoiceState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  status: "Pending",
  postingDate: "",
  invoiceDate: "",
  items: [
    {
      item: "", // ObjectId of the Item.
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      allowedQuantity: 0, // Set from copied data (if any)
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
      errorMessage: "",
    },
  ],
  remarks: "",
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  rounding: 0,
  // Flags to indicate the copy source.
  fromSO: false,
  fromDelivery: false,
};

function formatDateForInput(dateStr) {
  if (!dateStr) return "";
  const ddMmYyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
  if (ddMmYyyyRegex.test(dateStr)) {
    const [dd, mm, yyyy] = dateStr.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) ? d.toISOString().split("T")[0] : "";
}

export default function SalesInvoiceForm() {
  const [invoiceData, setInvoiceData] = useState(initialInvoiceState);
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();
  const parentRef = useRef(null);

  // Load copied data from sessionStorage if available.
  // Data may come from a Sales Order copy ("salesInvoiceData") or from a Delivery copy ("deliveryData").
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedData = sessionStorage.getItem("salesInvoiceData");
      let source = "SO";
      if (!storedData) {
        storedData = sessionStorage.getItem("deliveryData");
        source = "Delivery";
      }
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          // Transform items to ensure allowedQuantity is set.
          const transformedItems = parsedData.items.map((item) => ({
            ...item,
            quantity: item.quantity || 0,
            allowedQuantity:
              item.allowedQuantity && item.allowedQuantity > 0
                ? item.allowedQuantity
                : item.quantity || 0,
          }));
          const transformedData = {
            ...parsedData,
            items: transformedItems,
            fromSO: source === "SO",
            fromDelivery: source === "Delivery",
          };
          setInvoiceData(transformedData);
          setIsCopied(true);
          sessionStorage.removeItem("salesInvoiceData");
          sessionStorage.removeItem("deliveryData");
        } catch (error) {
          console.error("Error parsing copied data:", error);
        }
      }
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setInvoiceData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setInvoiceData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  // Handle changes to item fields, validate quantities, and recalc derived values.
  const handleItemChange = useCallback((index, e) => {
    const { name } = e.target;
    let newValue = e.target.value;
    const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstType", "tdsAmount"];
    if (numericFields.includes(name)) {
      newValue = parseFloat(newValue) || 0;
    }
    setInvoiceData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[index] };

      if (name === "quantity") {
        // For copied data, ensure the quantity does not exceed allowedQuantity.
        if ((prev.fromSO || prev.fromDelivery) && currentItem.allowedQuantity > 0 && newValue > currentItem.allowedQuantity) {
          alert(`Error: For item ${currentItem.itemCode || "N/A"}, the quantity (${newValue}) exceeds the allowed quantity (${currentItem.allowedQuantity}).`);
          return prev;
        }
        // For manual entries, if allowedQuantity is missing, default it.
        if (!(prev.fromSO || prev.fromDelivery) && (!currentItem.allowedQuantity || currentItem.allowedQuantity <= 0)) {
          currentItem.allowedQuantity = newValue;
        }
        currentItem.quantity = newValue;
      } else {
        currentItem[name] = newValue;
      }

      // Recalculate derived values.
      const { unitPrice = 0, discount = 0, quantity = 1, freight = 0, gstType = 0 } = currentItem;
      const priceAfterDiscount = unitPrice - discount;
      const totalAmount = quantity * priceAfterDiscount + freight;
      currentItem.priceAfterDiscount = priceAfterDiscount;
      currentItem.totalAmount = totalAmount;
      currentItem.gstAmount = totalAmount * (gstType / 100);

      updatedItems[index] = currentItem;
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addItemRow = useCallback(() => {
    setInvoiceData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          item: "",
          itemCode: "",
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
          warehouse: "",
          errorMessage: "",
        },
      ],
    }));
  }, []);

  // Recalculate summary fields whenever items or rounding changes.
  useEffect(() => {
    const totalBeforeDiscountCalc = invoiceData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return acc + (unitPrice - discount) * quantity;
    }, 0);
    const gstTotalCalc = invoiceData.items.reduce(
      (acc, item) => acc + (parseFloat(item.gstAmount) || 0),
      0
    );
    const roundingValue = parseFloat(invoiceData.rounding) || 0;
    const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + roundingValue;
    setInvoiceData((prev) => ({
      ...prev,
      totalBeforeDiscount: totalBeforeDiscountCalc,
      gstTotal: gstTotalCalc,
      grandTotal: grandTotalCalc,
    }));
  }, [JSON.stringify(invoiceData.items), invoiceData.rounding]);

  // Validate and submit the invoice.
  const handleSaveInvoice = useCallback(async () => {
    if (invoiceData.fromSO || invoiceData.fromDelivery) {
      for (let item of invoiceData.items) {
        if (Number(item.quantity) > Number(item.allowedQuantity)) {
          alert(`Error in item ${item.itemCode || "N/A"}: Quantity (${item.quantity}) exceeds allowed quantity (${item.allowedQuantity}).`);
          return;
        }
      }
    }
    const updatedItems = invoiceData.items.map((item) => {
      if (!(invoiceData.fromSO || invoiceData.fromDelivery) && (!item.allowedQuantity || item.allowedQuantity <= 0)) {
        return { ...item, allowedQuantity: item.quantity };
      }
      return item;
    });
    const invoicePayload = { ...invoiceData, items: updatedItems };
    try {
      const response = await axios.post("/api/salesInvoice", invoicePayload, {
        headers: { "Content-Type": "application/json" },
      });
      alert("Sales Invoice saved successfully: " + response.data.message);
      setInvoiceData(initialInvoiceState);
    } catch (error) {
      console.error("Error saving Sales Invoice:", error);
      alert(error.response?.data?.message || "Error saving Sales Invoice");
    }
  }, [invoiceData]);

  const handleCancel = useCallback(() => {
    setInvoiceData(initialInvoiceState);
  }, []);

  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">Sales Invoice Form</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
          {isCopied ? (
            <div>
              <label className="block mb-2 font-medium">Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={invoiceData.customerName || ""}
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
          <div>
            <label className="block mb-2 font-medium">Customer Code</label>
            <input
              type="text"
              name="customerCode"
              value={invoiceData.customerCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={invoiceData.contactPerson || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={invoiceData.status || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select status (optional)</option>
              <option value="Pending">Pending</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formatDateForInput(invoiceData.postingDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Date</label>
            <input
              type="date"
              name="invoiceDate"
              value={formatDateForInput(invoiceData.invoiceDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection 
          items={invoiceData.items} 
          onItemChange={handleItemChange} 
          onAddItem={isCopied ? undefined : addItemRow} 
        />
      </div>
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Total Before Discount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={invoiceData.totalBeforeDiscount || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={invoiceData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST Total</label>
          <input
            type="number"
            name="gstTotal"
            value={invoiceData.gstTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Grand Total</label>
          <input
            type="number"
            name="grandTotal"
            value={invoiceData.grandTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button onClick={handleSaveInvoice} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
          Save Invoice
        </button>
        <button onClick={handleCancel} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
          Cancel
        </button>
      </div>
      {isCopied && (
        <div className="flex items-center space-x-2 text-green-600">
          <FaCheckCircle />
          <span>Invoice data loaded from copy.</span>
        </div>
      )}
    </div>
  );
}
