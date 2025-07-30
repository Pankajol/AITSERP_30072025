"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";

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
      quantity: 0,
      allowedQuantity: 0,
      receivedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      gstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
      managedBy: "",
      batches: [],
      errorMessage: "",
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      warehouseId: "",
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

const round = (num, decimals = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(decimals));
};

function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstRate = gstRate / 2;
    const sgstRate = gstRate / 2;
    const cgstAmount = round(totalAmount * (cgstRate / 100));
    const sgstAmount = round(totalAmount * (sgstRate / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: cgstAmount + sgstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
    };
  }

  if (item.taxOption === "IGST") {
    const igstRate = parseFloat(item.gstRate) || 0;
    const igstAmount = round(totalAmount * (igstRate / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
    };
  }

  return {
    priceAfterDiscount,
    totalAmount,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
  };
};

export default function SalesOrderWrapper() {
  return (
    <Suspense fallback={<div className="p-10">Loading Sales Order...</div>}>
      <SalesOrderForm />
    </Suspense>
  );
}

function SalesOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [formData, setFormData] = useState(initialOrderState);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      axios.get(`/api/sales-order/${editId}`)
        .then(res => {
          const record = res.data.data;
          const safeItems = Array.isArray(record.items) ? record.items : [];
          setFormData({
            ...initialOrderState,
            ...record,
            items: safeItems.map(i => ({
              ...initialOrderState.items[0],
              ...i,
              item: i.item?._id || i.item || "",
              warehouse: i.warehouse?._id || i.warehouse || "",
              taxOption: i.taxOption || "GST",
            })),
            orderDate: formatDate(record.orderDate),
            expectedDeliveryDate: formatDate(record.expectedDeliveryDate),
          });
        })
        .catch(err => setError(err.message || "Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [editId]);
  // Recalculate totals when items or charges change
  useEffect(() => {
    const totalBeforeDiscount = round(
      formData.items.reduce((sum, i) => sum + (i.unitPrice * i.quantity - i.discount), 0)
    );
    const totalAmount = round(formData.items.reduce((sum, i) => sum + i.totalAmount, 0));
    const gstTotal = round(formData.items.reduce((sum, i) => sum + i.gstAmount, 0));
    const grandTotal = round(totalAmount + gstTotal + (formData.freight || 0) + (formData.rounding || 0));
    const openBalance = round(grandTotal - ((formData.totalDownPayment || 0) + (formData.appliedAmounts || 0)));

    setFormData((prev) => ({
      ...prev,
      totalBeforeDiscount,
      gstTotal,
      grandTotal,
      openBalance,
    }));
  }, [
    formData.items,
    formData.freight,
    formData.rounding,
    formData.totalDownPayment,
    formData.appliedAmounts,
  ]);

  const handleCustomerSelect = useCallback((customer) => {
    setFormData((prev) => ({
      ...prev,
      customerName: customer.customerName,
      customerCode: customer.customerCode,
      contactPerson: customer.contactPersonName,
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    const updatedItems = [...formData.items];
    const isNumeric = [
      "quantity", "allowedQuantity", "receivedQuantity", "unitPrice", "discount", "freight", "gstRate",
    ].includes(name);
    const newValue = isNumeric ? parseFloat(value) || 0 : value;

    updatedItems[index] = {
      ...updatedItems[index],
      [name]: newValue,
      ...computeItemValues({ ...updatedItems[index], [name]: newValue }),
    };

    setFormData((prev) => ({ ...prev, items: updatedItems }));
  }, [formData.items]);

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialOrderState.items[0] }],
    }));
  };

  const removeItemRow = (index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!formData.customerCode || !formData.customerName) {
      alert("Customer details are required.");
      return;
    }

    setSubmitting(true);
    try {
      if (editId) {
        await axios.put(`/api/sales-order/${editId}`, formData);
        alert("Sales Order updated successfully");
      } else {
        await axios.post("/api/sales-order", formData);
        alert("Sales Order created successfully");
        setFormData(initialOrderState);
      }
      router.push("/admin/salesOrder");
    } catch (error) {
      alert("Error saving Sales Order");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Order" : "Create Sales Order"}
      </h1>

      {/* CUSTOMER FIELDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="font-medium">Customer Name</label>
          <CustomerSearch
            onSelectCustomer={handleCustomerSelect}
            selectedCustomerName={formData.customerName}
          />
        </div>
        <div>
          <label className="font-medium">Customer Code</label>
          <input
            type="text"
            name="customerCode"
            value={formData.customerCode}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="font-medium">Contact Person</label>
          <input
            type="text"
            name="contactPerson"
            value={formData.contactPerson}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="font-medium">Reference Number</label>
          <input
            type="text"
            name="refNumber"
            value={formData.refNumber}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
      </div>

      {/* DATES & STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="font-medium">Order Date</label>
          <input
            type="date"
            name="orderDate"
            value={formData.orderDate}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="font-medium">Expected Delivery Date</label>
          <input
            type="date"
            name="expectedDeliveryDate"
            value={formData.expectedDeliveryDate}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="font-medium">Status</label>
          <select
            name="status"
            value={formData.status}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          >
            <option value="Pending">Pending</option>
            <option value="Closed">Closed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ITEM SECTION */}
      <ItemSection
         items={formData.items}
        onItemChange={handleItemChange}
        onAddItem={addItemRow}
        onRemoveItem={removeItemRow}
        computeItemValues={computeItemValues}
      />

      {/* TOTALS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div>
          <label className="font-medium">Total Before Discount</label>
          <input
            type="number"
            value={formData.totalBeforeDiscount}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="font-medium">GST Total</label>
          <input
            type="number"
            value={formData.gstTotal}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="font-medium">Freight</label>
          <input
            type="number"
            name="freight"
            value={formData.freight}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="font-medium">Grand Total</label>
          <input
            type="number"
            value={formData.grandTotal}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="font-medium">Open Balance</label>
          <input
            type="number"
            value={formData.openBalance}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>

      {/* REMARKS + ACTIONS */}
      <div className="mt-8">
        <label className="font-medium block mb-2">Remarks</label>
        <textarea
          name="remarks"
          value={formData.remarks}
          onChange={handleInputChange}
          className="w-full p-2 border rounded"
          rows={3}
        ></textarea>
      </div>

      <div className="mt-6 flex gap-4">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500"
        >
          {submitting ? "Submitting..." : editId ? "Update Order" : "Create Order"}
        </button>
        <button
          onClick={() => {
            setFormData(initialOrderState);
            router.push("/admin/salesOrder");
          }}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
