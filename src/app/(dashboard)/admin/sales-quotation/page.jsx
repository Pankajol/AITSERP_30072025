"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";

// Demo customer suggestions with contact person details.
const demoSuggestions = [
  { _id: "demo1", name: "Demo Customer One", code: "DC1", contactPerson: "Alice" },
  { _id: "demo2", name: "Demo Customer Two", code: "DC2", contactPerson: "Bob" },
  { _id: "demo3", name: "Demo Customer Three", code: "DC3", contactPerson: "Charlie" },
];

const initialState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  status: "Open",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      itemCode: "",
      itemDescription: "",
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      // New warehouse fields
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
    },
  ],
  salesEmployee: "",
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
};

export default function SalesQuotationForm() {
  const [formData, setFormData] = useState(initialState);
  const [customer, setCustomer] = useState(null);
  const router = useRouter();
  
  const parentRef = useRef(null);

  // State for the Copy To functionality.
  const [destinationId, setDestinationId] = useState("");
  const [copyToType, setCopyToType] = useState("GRN");

  // Handler when a customer is selected via the CustomerSearch component.
  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setCustomer(selectedCustomer);
    setFormData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  // General input change handler.
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  // Auto-fill logic: When the customerName changes manually, check for a match in demoSuggestions.
  useEffect(() => {
    if (formData.customerName) {
      const matchingCustomer = demoSuggestions.find(
        (s) => s.name.toLowerCase() === formData.customerName.toLowerCase()
      );
      if (matchingCustomer) {
        setFormData((prev) => ({
          ...prev,
          customerCode: matchingCustomer.code,
          contactPerson: matchingCustomer.contactPerson,
        }));
      }
    }
  }, [formData.customerName]);

  // Handle changes for individual items.
  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      // Fields that should be treated as numeric
      const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstType", "tdsAmount"];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };

      // Recalculate derived values only for pricing fields.
      const { unitPrice = 0, discount = 0, quantity = 1, freight: itemFreight = 0, gstType = 0 } = updatedItems[index];
      const priceAfterDiscount = unitPrice - discount;
      const totalAmount = quantity * priceAfterDiscount + itemFreight;
      const gstAmount = totalAmount * (gstType / 100);

      updatedItems[index].priceAfterDiscount = priceAfterDiscount;
      updatedItems[index].totalAmount = totalAmount;
      updatedItems[index].gstAmount = gstAmount;

      return { ...prev, items: updatedItems };
    });
  }, []);

  // Add a new item row.
  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemCode: "",
          itemDescription: "",
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstType: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          tdsAmount: 0,
          // New warehouse fields
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
        },
      ],
    }));
  }, []);

  // Recalculate summary fields when related inputs change.
  useEffect(() => {
    const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return acc + (unitPrice - discount) * quantity;
    }, 0);

    const totalItemsCalc = formData.items.reduce(
      (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
      0
    );

    const gstTotalCalc = formData.items.reduce(
      (acc, item) => acc + (parseFloat(item.gstAmount) || 0),
      0
    );

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

  // Action: Add sales quotation.
  const handleAdd = useCallback(async () => {
    try {
      const response = await axios.post("/api/sales-quotation", formData, {
        headers: { "Content-Type": "application/json" },
      });
      alert("Sales Quotation Added Successfully: " + response.data.message);
      setFormData(initialState);
    } catch (error) {
      console.error("Error adding sales quotation:", error);
      const errorMsg = error.response?.data?.message || "Error adding sales quotation";
      alert(errorMsg);
    }
  }, [formData]);

  // Action: Cancel and reset form.
  const handleCancel = useCallback(() => {
    setFormData(initialState);
  }, []);

  // Action: Copy data from an existing quotation.
  const handleCopyFrom = () => {
    sessionStorage.setItem("purchaseQuotationData", JSON.stringify(formData));
    alert("Data copied from Sales Quotation!");
  };

  // Action: Copy to either GRN or Invoice based on selection.
  const handleCopyTo = useCallback(
    (destination) => {
      if (destination === "GRN") {
        sessionStorage.setItem("grnData", JSON.stringify(formData));
        router.push("/admin/GRN");
      } else if (destination === "Invoice") {
        sessionStorage.setItem("invoiceData", JSON.stringify(formData));
        router.push("/admin/purchase-invoice");
      }
    },
    [formData, router]
  );

  function CopyToDropdown({ handleCopyTo }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState("Copy To");
  
    const toggleDropdown = () => setOpen((prev) => !prev);
  
    const onSelect = (option) => {
      setSelected(option);
      setOpen(false);
      handleCopyTo(option);
    };
  
    const ref = useRef(null);
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (ref.current && !ref.current.contains(event.target)) {
          setOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);
  
    return (
      <div ref={ref} className="relative inline-block text-left">
        <button
          onClick={toggleDropdown}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300 focus:outline-none shadow"
        >
          {selected}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
            <button
              onClick={() => onSelect("GRN")}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              GRN
            </button>
            <button
              onClick={() => onSelect("Invoice")}
              className="w-full text-left px-4 py-2 hover:bg-gray-100"
            >
              Invoice
            </button>
          </div>
        )}
      </div>
    );
  }
  
  return (
    <div ref={parentRef} className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">Sales Quotation</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        {/* Left Column: Customer details */}
        <div className="grid grid-cols-2 gap-7">
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            <CustomerSearch onSelectSupplier={handleCustomerSelect} />
          </div>
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
        {/* Right Column: Additional Quotation Info */}
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
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formData.postingDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formData.validUntil || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Delivery Date</label>
            <input
              type="date"
              name="documentDate"
              value={formData.documentDate || ""}
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
        />
      </div>
      {/* Other Form Fields */}
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
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="taxableAmount"
            value={formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
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
          <label className="block mb-2 font-medium">GST</label>
          <input
            type="number"
            name="gstTotal"
            value={formData.gstTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Total Amount</label>
          <input
            type="number"
            name="grandTotal"
            value={formData.grandTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button onClick={handleAdd} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
          Add
        </button>
        <button onClick={handleCancel} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
          Cancel
        </button>
        <button onClick={handleCopyFrom} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
          Copy From
        </button>
        {/* Copy To Section */}
        <div className="flex flex-col space-y-2">
          <div className="flex items-center justify-center">
            <CopyToDropdown handleCopyTo={handleCopyTo} />
          </div>
        </div>
      </div>
    </div>
  );
}
