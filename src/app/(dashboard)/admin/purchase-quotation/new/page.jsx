"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import SupplierSearch from "@/components/SupplierSearch";
import { Suspense } from "react";

const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstRate = parseFloat(item.cgstRate) || gstRate / 2;
    const sgstRate = parseFloat(item.sgstRate) || gstRate / 2;
    const cgstAmount = round(totalAmount * (cgstRate / 100));
    const sgstAmount = round(totalAmount * (sgstRate / 100));
    const gstAmount = round(cgstAmount + sgstAmount);
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
    };
  }

  if (item.taxOption === "IGST") {
    const igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
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

const initialState = {
  supplier: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  status: "Open",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      orderedQuantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstRate: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
      warehouseCode: "",
      warehouseName: "",
      stockAdded: false,
      managedBy: "",
      batches: [],
      qualityCheckDetails: [],
      removalReason: "",
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
  invoiceType: "Normal",
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function PurchaseQuotationFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <PurchaseQuotationForm />
    </Suspense>
  );
}

function PurchaseQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
   axios.get(`/api/purchase-quotation/${editId}`)
        .then((res) => {
          if (!res.data.success) {
            throw new Error(res.data.error || "Failed to load quotation");
          }
          const record = res.data.data;
          console.log("Fetched quotation:", record);
          if (!Array.isArray(record.items)) {
            console.warn("Items is not an array, defaulting to empty array:", record.items);
            record.items = [];
          }
          setFormData({
            ...initialState,
            ...record,
            supplier: record.supplier?._id || record.supplier || "",
            supplierCode: record.supplierCode || "",
            supplierName: record.supplierName || "",
            contactPerson: record.contactPerson || "",
            status: record.status || "Open",
            postingDate: formatDateForInput(record.postingDate),
            validUntil: formatDateForInput(record.validUntil),
            documentDate: formatDateForInput(record.documentDate),
            items: record.items.length > 0
              ? record.items.map((item) => {
                  const computed = computeItemValues({
                    ...item,
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    discount: item.discount || 0,
                    freight: item.freight || 0,
                    gstRate: item.gstRate || 0,
                    taxOption: item.taxOption || "GST",
                  });
                  return {
                    ...initialState.items[0],
                    ...item,
                    ...computed,
                    item: item.item?._id || item.item || "",
                    itemCode: item.itemCode || "",
                    itemName: item.itemName || "",
                    itemDescription: item.itemDescription || "",
                    quantity: item.quantity || 0,
                    orderedQuantity: item.orderedQuantity || 0,
                    unitPrice: item.unitPrice || 0,
                    discount: item.discount || 0,
                    freight: item.freight || 0,
                    gstRate: item.gstRate || 0,
                    taxOption: item.taxOption || "GST",
                    igstRate: item.igstRate || 0,
                    tdsAmount: item.tdsAmount || 0,
                    warehouse: item.warehouse?._id || item.warehouse || "",
                    warehouseCode: item.warehouseCode || "",
                    warehouseName: item.warehouseName || "",
                    stockAdded: item.stockAdded || false,
                    managedBy: item.managedBy || "",
                    batches: item.batches || [],
                    qualityCheckDetails: item.qualityCheckDetails || [],
                    removalReason: item.removalReason || "",
                  };
                })
              : [{ ...initialState.items[0] }],
            invoiceType: record.invoiceType || "Normal",
          });
        })
        .catch((err) => {
          console.error("Error fetching quotation:", err);
          setError("Error loading quotation: " + (err.message || "Unknown error"));
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (editId) {
      setError("Invalid quotation ID");
    }
  }, [editId]);

  const handleSupplierSelect = useCallback((selectedSupplier) => {
    console.log("Selected supplier:", selectedSupplier);
    setFormData((prev) => ({
      ...prev,
      supplier: selectedSupplier._id || "",
      supplierCode: selectedSupplier.supplierCode || "",
      supplierName: selectedSupplier.supplierName || "",
      contactPerson: selectedSupplier.contactPersonName || selectedSupplier.contactPerson || "",
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
      const numericFields = [
        "quantity",
        "orderedQuantity",
        "unitPrice",
        "discount",
        "freight",
        "gstRate",
        "igstRate",
        "tdsAmount",
      ];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      if (name === "quantity") {
        updatedItems[index].orderedQuantity = newValue;
      }
      const computed = computeItemValues(updatedItems[index]);
      updatedItems[index] = { ...updatedItems[index], ...computed };
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...initialState.items[0] }],
    }));
  }, []);

  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  useEffect(() => {
    const totalBeforeDiscount = round(
      formData.items.reduce((acc, item) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        return acc + (unitPrice - discount) * quantity;
      }, 0)
    );

    const totalItems = round(
      formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)
    );

    const gstTotal = round(
      formData.items.reduce((acc, item) => {
        return acc + (parseFloat(item.taxOption === "IGST" ? item.igstAmount : item.gstAmount) || 0);
      }, 0)
    );

    const overallFreight = round(parseFloat(formData.freight) || 0);
    const rounding = round(parseFloat(formData.rounding) || 0);
    const totalDownPayment = round(parseFloat(formData.totalDownPayment) || 0);
    const appliedAmounts = round(parseFloat(formData.appliedAmounts) || 0);

    const grandTotal = round(totalItems + gstTotal + overallFreight + rounding);
    const openBalance = round(grandTotal - (totalDownPayment + appliedAmounts));

    setFormData((prev) => ({
      ...prev,
      totalBeforeDiscount,
      gstTotal,
      grandTotal,
      openBalance,
    }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  const handleSubmit = async () => {
    if (!formData.supplier || !formData.supplierName || !formData.supplierCode) {
      setError("Please select a valid supplier");
      return;
    }
    if (formData.items.length === 0 || formData.items.every((item) => !item.itemName || !item.item)) {
      setError("Please add at least one valid item with item code and name");
      return;
    }
    setLoading(true);
    setError(null);
    const payload = {
      ...formData,
      items: formData.items.map((item) => ({
        ...item,
        item: item.item || undefined,
        warehouse: item.warehouse || undefined,
      })),
    };
    console.log("Submitting payload:", JSON.stringify(payload, null, 2));
    try {
      if (editId) {
        const response = await axios.put(`/api/purchase-quotation?id=${editId}`, payload, {
          headers: { "Content-Type": "application/json" },
        });
        alert(response.data.message || "Purchase quotation updated successfully");
      } else {
        const response = await axios.post("/api/purchase-quotation", payload, {
          headers: { "Content-Type": "application/json" },
        });
        alert(response.data.message || "Purchase quotation added successfully");
        setFormData(initialState);
      }
      router.push("/admin/purchase-quotation");
    } catch (error) {
      console.error("Error saving purchase quotation:", error);
      const errorMessage = error.response?.data?.error || error.message;
      setError(`Failed to ${editId ? "update" : "add"} purchase quotation: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">{editId ? "Edit Purchase Quotation" : "Create Purchase Quotation"}</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            <SupplierSearch onSelectSupplier={handleSupplierSelect} />
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
              placeholder="Auto-generated if blank (e.g., PQ-001)"
            />
          </div>
        </div>
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
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
            <label className="block mb-2 font-medium">Document Date</label>
            <input
              type="date"
              name="documentDate"
              value={formData.documentDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Invoice Type</label>
            <select
              name="invoiceType"
              value={formData.invoiceType || "Normal"}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Normal">Normal</option>
              <option value="POCopy">PO Copy</option>
              <option value="GRNCopy">GRN Copy</option>
            </select>
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onRemoveItem={removeItemRow}
          computeItemValues={computeItemValues}
        />
      </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={formData.totalBeforeDiscount || 0}
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
            name="gstTotal"
            value={formData.gstTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Grand Total</label>
          <input
            type="number"
            name="grandTotal"
            value={formData.grandTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-400 hover:bg-orange-300"
          }`}
        >
          {loading ? "Saving..." : editId ? "Update" : "Add"}
        </button>
        <button
          onClick={() => {
            setFormData(initialState);
            router.push("/admin/purchase-quotation");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (!formData.supplier || !formData.supplierName || !formData.supplierCode) {
              setError("Please select a valid supplier before copying");
              return;
            }
            if (formData.items.length === 0 || formData.items.every((item) => !item.itemName || !item.item)) {
              setError("Please add at least one valid item before copying");
              return;
            }
            sessionStorage.setItem("purchaseOrderData", JSON.stringify(formData));
            alert("Data copied to Purchase Order!");
            router.push("/admin/purchase-order-view/new");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Copy to Purchase Order
        </button>
      </div>
    </div>
  );
}

export default PurchaseQuotationFormWrapper;