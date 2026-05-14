"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { FaCheckCircle } from "react-icons/fa";

// Initial state for a Credit Memo.
const initialCreditMemoState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  creditMemoDate: "",
  referenceInvoice: "",
  items: [
    {
      item: "", // ObjectId of the Item.
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      allowedQuantity: 0, // Should be set from copied data if applicable.
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
    },
  ],
  totalBeforeDiscount: 0,
  gstTotal: 0,
  grandTotal: 0,
  rounding: 0,
  remarks: "",
  status: "Pending", // Options: Pending, Approved, etc.
  // Flag to indicate if data was copied (for example, from a Sales Invoice).
  fromInvoice: false,
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

export default function CreditMemoForm() {
  const [creditMemoData, setCreditMemoData] = useState(initialCreditMemoState);
  const [isCopied, setIsCopied] = useState(false);
  const router = useRouter();
  const parentRef = useRef(null);

  // Load copied data from sessionStorage if available.
  // For example, a Sales Invoice copy might be stored under "creditMemoData".
  useEffect(() => {
    if (typeof window !== "undefined") {
      let storedData = sessionStorage.getItem("creditMemoData");
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          // Ensure each item has allowedQuantity set.
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
            fromInvoice: true, // Data was copied from an invoice.
          };
          setCreditMemoData(transformedData);
          setIsCopied(true);
          sessionStorage.removeItem("creditMemoData");
        } catch (error) {
          console.error("Error parsing copied Credit Memo data:", error);
        }
      }
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setCreditMemoData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setCreditMemoData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  // Validate item changes: if data is copied, quantity cannot exceed allowedQuantity.
  const handleItemChange = useCallback((index, e) => {
    const { name } = e.target;
    let newValue = e.target.value;
    const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstType", "tdsAmount"];
    if (numericFields.includes(name)) {
      newValue = parseFloat(newValue) || 0;
    }
    setCreditMemoData((prev) => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[index] };
      if (name === "quantity") {
        if (prev.fromInvoice && currentItem.allowedQuantity > 0 && newValue > currentItem.allowedQuantity) {
          alert(`Error: For item ${currentItem.itemCode || "N/A"}, the quantity (${newValue}) exceeds the allowed quantity (${currentItem.allowedQuantity}).`);
          return prev;
        }
        if (!prev.fromInvoice && (!currentItem.allowedQuantity || currentItem.allowedQuantity <= 0)) {
          currentItem.allowedQuantity = newValue;
        }
        currentItem.quantity = newValue;
      } else {
        currentItem[name] = newValue;
      }
      // Recalculate derived fields.
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
    setCreditMemoData((prev) => ({
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
        },
      ],
    }));
  }, []);

  // Recalculate summary fields whenever items or rounding change.
  useEffect(() => {
    const totalBeforeDiscountCalc = creditMemoData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 0;
      return acc + (unitPrice - discount) * quantity;
    }, 0);
    const gstTotalCalc = creditMemoData.items.reduce(
      (acc, item) => acc + (parseFloat(item.gstAmount) || 0),
      0
    );
    const roundingValue = parseFloat(creditMemoData.rounding) || 0;
    const grandTotalCalc = totalBeforeDiscountCalc + gstTotalCalc + roundingValue;
    setCreditMemoData((prev) => ({
      ...prev,
      totalBeforeDiscount: totalBeforeDiscountCalc,
      gstTotal: gstTotalCalc,
      grandTotal: grandTotalCalc,
    }));
  }, [JSON.stringify(creditMemoData.items), creditMemoData.rounding]);

  // Pre-save validation and submission.
  const handleSaveCreditMemo = useCallback(async () => {
    if (creditMemoData.fromInvoice) {
      for (let item of creditMemoData.items) {
        if (Number(item.quantity) > Number(item.allowedQuantity)) {
          alert(`Error in item ${item.itemCode || "N/A"}: Quantity (${item.quantity}) exceeds allowed quantity (${item.allowedQuantity}).`);
          return;
        }
      }
    }
    const updatedItems = creditMemoData.items.map((item) => {
      if (!creditMemoData.fromInvoice && (!item.allowedQuantity || item.allowedQuantity <= 0)) {
        return { ...item, allowedQuantity: item.quantity };
      }
      return item;
    });
    const payload = { ...creditMemoData, items: updatedItems };
    try {
      const response = await axios.post("/api/credit-note", payload, {
        headers: { "Content-Type": "application/json" },
      });
      alert("Credit Memo saved successfully: " + response.data.message);
      setCreditMemoData(initialCreditMemoState);
    } catch (error) {
      console.error("Error saving Credit Memo:", error);
      alert(error.response?.data?.message || "Error saving Credit Memo");
    }
  }, [creditMemoData]);

  const handleCancel = useCallback(() => {
    setCreditMemoData(initialCreditMemoState);
  }, []);

  // Option to copy this Credit Memo data to Invoice.
  const handleCopyToInvoice = useCallback(() => {
    sessionStorage.setItem("creditMemoCopy", JSON.stringify(creditMemoData));
    router.push("/admin/sales-invoice"); // Adjust the path as needed.
  }, [creditMemoData, router]);

  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">Credit Memo Form</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
          {creditMemoData.fromInvoice ? (
            <div>
              <label className="block mb-2 font-medium">Customer Name</label>
              <input
                type="text"
                name="customerName"
                value={creditMemoData.customerName || ""}
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
              value={creditMemoData.customerCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={creditMemoData.contactPerson || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Credit Memo Date</label>
            <input
              type="date"
              name="creditMemoDate"
              value={formatDateForInput(creditMemoData.creditMemoDate)}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Invoice</label>
            <input
              type="text"
              name="referenceInvoice"
              value={creditMemoData.referenceInvoice || ""}
              onChange={handleInputChange}
              placeholder="Enter reference invoice number"
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection 
          items={creditMemoData.items} 
          onItemChange={handleItemChange} 
          onAddItem={creditMemoData.fromInvoice ? undefined : addItemRow} 
        />
      </div>
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Total Before Discount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={creditMemoData.totalBeforeDiscount || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={creditMemoData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST Total</label>
          <input
            type="number"
            name="gstTotal"
            value={creditMemoData.gstTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Grand Total</label>
          <input
            type="number"
            name="grandTotal"
            value={creditMemoData.grandTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSaveCreditMemo}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Save Credit Memo
        </button>
        <button
          onClick={handleCancel}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        {/* Option to copy this Credit Memo data to Invoice */}
        <button
          onClick={handleCopyToInvoice}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-400"
        >
          Copy to Invoice
        </button>
      </div>
      {creditMemoData.fromInvoice && (
        <div className="flex items-center space-x-2 text-green-600">
          <FaCheckCircle />
          <span>Credit Memo data loaded from copy.</span>
        </div>
      )}
    </div>
  );
}
