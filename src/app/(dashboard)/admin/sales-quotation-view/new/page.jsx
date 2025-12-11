"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { Suspense } from "react";

import { toast } from "react-toastify";


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
  sourceQuotationId: "",
  customer: "",
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  status: "Draft",
  postingDate: formatDateForInput(new Date()),
  validUntil: "",
  documentDate: formatDateForInput(new Date()),
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
  existingFiles: [],
  removedFiles: []
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

function SalesQuotationFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <SalesQuotationForm />
    </Suspense>
  );
}

function SalesQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const base = "w-full p-2 border rounded";

  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);

      const token = localStorage.getItem("token"); // ✅ Auth token
      if (!token) {
        setError("Unauthorized: No token found");
        setLoading(false);
        return;
      }

      axios
        .get(`/api/sales-quotation/${editId}`, {
          headers: { Authorization: `Bearer ${token}` }, // ✅ Include token
        })
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

          // ✅ Set attachments for edit mode
          setFormData(prev => ({ ...prev, existingFiles: record.attachments || [] })); // Corrected here

          // ✅ Update form state
          setFormData((prev) => ({
            ...prev,
            ...record,
            sourceQuotationId: record._id || "",
            customer: record.customer?._id || record.customer || "",
            customerCode: record.customerCode || "",
            customerName: record.customerName || "",
            contactPerson: record.contactPerson || "",
            status: record.status || "Draft",
            postingDate: formatDateForInput(record.postingDate),
            validUntil: formatDateForInput(record.validUntil),
            documentDate: formatDateForInput(record.documentDate),
            items:
              record.items.length > 0
                ? record.items.map((item) => {
                    const computed = computeItemValues({
                      ...item,
                      quantity: item.quantity || 0,
                      unitPrice: item.unitPrice || 0,
                      discount: item.discount || 0,
                      freight: item.freight || 0,
                      gstRate: item.gstRate || 0,
                      taxOption: item.taxOption || "GST",
                      igstRate: item.igstRate || 0,
                      tdsAmount: item.tdsAmount || 0,
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
            salesEmployee: record.salesEmployee || "",
            remarks: record.remarks || "",
            freight: record.freight || 0,
            rounding: record.rounding || 0,
            totalBeforeDiscount: record.totalBeforeDiscount || 0,
            totalDownPayment: record.totalDownPayment || 0,
            appliedAmounts: record.appliedAmounts || 0,
            gstTotal: record.gstAmount || 0,
            grandTotal: record.grandTotal || 0,
            openBalance: record.openBalance || 0,
          }));
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


  const handleCustomerSelect = useCallback((selectedCustomer) => {
    console.log("Selected customer:", selectedCustomer);
    setFormData((prev) => ({
      ...prev,
      customer: selectedCustomer._id || "",
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || selectedCustomer.contactPersonName || "",
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

        "unitPrice",
        "discount",
        "freight",
        "gstRate",
        "igstRate",
        "tdsAmount",
      ];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };

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
  try {
    // ✅ Validate customer
    if (!formData.customerName || !formData.customerCode) {
      toast.error("Please select a valid customer");
      return;
    }

    // ✅ Validate items (at least one item with itemName)
    if (formData.items.length === 0 || formData.items.every((item) => !item.itemName)) {
      toast.error("Please add at least one valid item");
      return;
    }

    // ✅ Validate zero quantity
    if (formData.items.some((it) => Number(it.quantity) <= 0)) {
      toast.error("Quantity must be at least 1 for every item.");
      return;
    }

    // ✅ Validate token
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("Unauthorized! Please log in.");
      return;
    }

    setLoading(true);

    // -------------------------
    // Sanitization: remove empty or invalid warehouses so server won't try to cast ""
    // -------------------------
    const sanitizedItems = (formData.items || []).map((it) => {
      const item = { ...it };

      // If warehouse is an empty string or falsy, remove the key so Mongoose won't cast it.
      // (If you prefer null instead, set item.warehouse = null)
      if (item.warehouse === "" || item.warehouse == null) {
        delete item.warehouse;
        // also clear related display fields if you want:
        delete item.warehouseCode;
        delete item.warehouseName;
      } else {
        // Optional: if warehouse exists but is not a valid ObjectId, remove it too
        // if (typeof item.warehouse === "string" && !/^[0-9a-fA-F]{24}$/.test(item.warehouse)) {
        //   delete item.warehouse;
        // }
      }

      return item;
    });

    // Prepare payload: override items with sanitized items and keep attachments arrays
    const payload = {
      ...formData,
      items: sanitizedItems,
      existingFiles: formData.existingFiles || [],
      removedFiles: formData.removedFiles || [],
    };

    // ✅ Prepare FormData
    const formDataToSend = new FormData();
    formDataToSend.append("quotationData", JSON.stringify(payload));

    if (attachments && attachments.length > 0) {
      attachments.forEach((file) => formDataToSend.append("attachments", file));
    }

    // ✅ API Request (POST or PUT)
    const url = editId ? `/api/sales-quotation/${editId}` : `/api/sales-quotation`;
    const method = editId ? "put" : "post";

    const response = await axios[method](url, formDataToSend, {
      headers: {
        Authorization: `Bearer ${token}`,
        // don't set Content-Type; browser will add multipart/form-data boundary
      },
    });

    toast.success(response.data.message || "Quotation saved successfully!");

    setFormData(initialState);
    setAttachments([]);
    sessionStorage.removeItem("salesQuotationData");
    router.push("/admin/sales-quotation-view");
  } catch (error) {
    console.error("Error saving quotation:", error);
    toast.error(
      `Failed to ${editId ? "update" : "create"} quotation: ${
        error.response?.data?.error || error.message
      }`
    );
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">{editId ? "Edit Sales Quotation" : "Create Sales Quotation"}</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            <CustomerSearch
              onSelectCustomer={handleCustomerSelect}
              initialCustomer={
                editId && formData.customer
                  ? { _id: formData.customer, customerName: formData.customerName }
                  : undefined
              }
            />
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
              placeholder="Auto-generated if blank (e.g., SQ-001)"
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
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Accepted">Accepted</option>
              <option value="Rejected">Rejected</option>
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
      {/* Attachments Section */}
      <div className="mt-6">
        <label className="font-medium block mb-1">Attachments</label>

        {/* Existing uploaded files */}
        {formData.existingFiles && formData.existingFiles.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
            {formData.existingFiles.map((file, idx) => {
              const url =
                typeof file === "string"
                  ? file
                  : file?.fileUrl || file?.url || file?.path || file?.location || "";
              const type = file?.fileType || "";
              const name = file?.fileName || url?.split("/").pop() || `File-${idx}`;
              if (!url) return null;

              const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

              return (
                <div key={idx} className="relative border rounded p-2 text-center">
                  {isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded" />
                  ) : (
                    <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
                  )}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-blue-600 text-xs mt-1 truncate"
                  >
                    {name}
                  </a>
                  <button
                    onClick={() => {
                      setFormData(prev => ({ ...prev, existingFiles: prev.existingFiles.filter((_, i) => i !== idx), removedFiles: [...prev.removedFiles, file] }));
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* New Uploads */}
        <input
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => {
            const files = Array.from(e.target.files);
            setAttachments((prev) => {
              const m = new Map(prev.map((f) => [f.name + f.size, f]));
              files.forEach((f) => m.set(f.name + f.size, f));
              return [...m.values()];
            });
            e.target.value = "";
          }}
          className="border px-3 py-2 w-full"
        />

        {/* Previews of new uploads */}
        {attachments.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
            {attachments.map((file, idx) => {
              const url = URL.createObjectURL(file);
              const isPDF = file.type === "application/pdf";
              const isImage = file.type.startsWith("image/");

              return (
                <div key={idx} className="relative border rounded p-2 text-center">
                  {isImage ? (
                    <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
                  ) : isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded" />
                  ) : (
                    <p className="truncate text-xs">{file.name}</p>
                  )}
                  <button
                    onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`mt-4 px-4 py-2 rounded ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          } text-white`}
        >
          {loading ? "Loading..." : editId ? "Update" : "Submit"}
        </button>
        <button
          onClick={() => {
            setFormData(initialState);
            setAttachments([]);
            setError(null);
            router.push("/admin/sales-quote-view");
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default SalesQuotationFormWrapper;