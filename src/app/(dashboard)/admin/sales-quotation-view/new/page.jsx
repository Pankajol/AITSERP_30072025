"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import { Suspense } from "react";
import { toast } from "react-toastify";
import {
  FaArrowLeft, FaCheck, FaUser, FaCalendarAlt,
  FaFileAlt, FaBoxOpen, FaUserTie, FaPaperclip,
  FaCalculator, FaTimes, FaExclamationCircle
} from "react-icons/fa";

// ── Helpers ──
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
    return { priceAfterDiscount, totalAmount, gstAmount, cgstAmount, sgstAmount, igstAmount: 0 };
  }
  if (item.taxOption === "IGST") {
    const igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
    const igstAmount = round(totalAmount * (igstRate / 100));
    return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount };
  }
  return { priceAfterDiscount, totalAmount, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
}

const initialState = {
  sourceQuotationId: "", customer: "", customerCode: "", customerName: "",
  contactPerson: "", refNumber: "", status: "Draft",
  postingDate: formatDateForInput(new Date()), validUntil: "",
  documentDate: formatDateForInput(new Date()),
  items: [{
    item: "", itemCode: "", itemName: "", itemDescription: "",
    quantity: 0, orderedQuantity: 0, unitPrice: 0, discount: 0, freight: 0,
    gstRate: 0, taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0,
    tdsAmount: 0, warehouse: "", warehouseCode: "", warehouseName: "",
    stockAdded: false, managedBy: "", batches: [], qualityCheckDetails: [], removalReason: "",
  }],
  salesEmployee: "", remarks: "", freight: 0, rounding: 0,
  totalBeforeDiscount: 0, totalDownPayment: 0, appliedAmounts: 0,
  gstTotal: 0, grandTotal: 0, openBalance: 0,
  invoiceType: "Normal", existingFiles: [], removedFiles: [],
};

// ── Wrapper ──
function SalesQuotationFormWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <span className="w-5 h-5 border-2 border-gray-300 border-t-indigo-500 rounded-full animate-spin" />
          Loading form…
        </div>
      </div>
    }>
      <SalesQuotationForm />
    </Suspense>
  );
}

// ── Main Form ──
function SalesQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");

  const [attachments, setAttachments] = useState([]);
  const [formData, setFormData]       = useState(initialState);
  const [loading, setLoading]         = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);

  // ── Fetch for edit ──
  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setFetchLoading(true);
      const token = localStorage.getItem("token");
      if (!token) { toast.error("Unauthorized"); setFetchLoading(false); return; }

      axios.get(`/api/sales-quotation/${editId}`, { headers: { Authorization: `Bearer ${token}` } })
        .then((res) => {
          if (!res.data.success) throw new Error(res.data.error || "Failed to load");
          const record = res.data.data;
          if (!Array.isArray(record.items)) record.items = [];

          setFormData((prev) => ({
            ...prev,
            ...record,
            existingFiles: record.attachments || [],
            sourceQuotationId: record._id || "",
            customer: record.customer?._id || record.customer || "",
            customerCode: record.customerCode || "",
            customerName: record.customerName || "",
            contactPerson: record.contactPerson || "",
            status: record.status || "Draft",
            postingDate: formatDateForInput(record.postingDate),
            validUntil: formatDateForInput(record.validUntil),
            documentDate: formatDateForInput(record.documentDate),
            items: record.items.length > 0
              ? record.items.map((item) => {
                  const computed = computeItemValues({ ...item, quantity: item.quantity || 0, unitPrice: item.unitPrice || 0, discount: item.discount || 0, freight: item.freight || 0, gstRate: item.gstRate || 0, taxOption: item.taxOption || "GST", igstRate: item.igstRate || 0 });
                  return { ...initialState.items[0], ...item, ...computed, item: item.item?._id || item.item || "", warehouse: item.warehouse?._id || item.warehouse || "" };
                })
              : [{ ...initialState.items[0] }],
            freight: record.freight || 0, rounding: record.rounding || 0,
            gstTotal: record.gstAmount || 0, grandTotal: record.grandTotal || 0,
          }));
        })
        .catch((err) => { toast.error("Error loading quotation: " + (err.message || "Unknown")); })
        .finally(() => setFetchLoading(false));
    }
  }, [editId]);

  // ── Customer select ──
  const handleCustomerSelect = useCallback((c) => {
    setFormData((prev) => ({
      ...prev,
      customer: c._id || "",
      customerCode: c.customerCode || "",
      customerName: c.customerName || "",
      contactPerson: c.contactPersonName || "",
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
      const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "tdsAmount"];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      const computed = computeItemValues(updatedItems[index]);
      updatedItems[index] = { ...updatedItems[index], ...computed };
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addItemRow    = useCallback(() => setFormData((prev) => ({ ...prev, items: [...prev.items, { ...initialState.items[0] }] })), []);
  const removeItemRow = useCallback((i) => setFormData((prev) => ({ ...prev, items: prev.items.filter((_, j) => j !== i) })), []);

  // ── Auto-compute totals ──
  useEffect(() => {
    const totalBeforeDiscount = round(formData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount  = parseFloat(item.discount)  || 0;
      const quantity  = parseFloat(item.quantity)  || 0;
      return acc + (unitPrice - discount) * quantity;
    }, 0));
    const totalItems = round(formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0));
    const gstTotal   = round(formData.items.reduce((acc, item) => acc + (parseFloat(item.taxOption === "IGST" ? item.igstAmount : item.gstAmount) || 0), 0));
    const overallFreight   = round(parseFloat(formData.freight) || 0);
    const rounding         = round(parseFloat(formData.rounding) || 0);
    const totalDownPayment = round(parseFloat(formData.totalDownPayment) || 0);
    const appliedAmounts   = round(parseFloat(formData.appliedAmounts) || 0);
    const grandTotal       = round(totalItems + gstTotal + overallFreight + rounding);
    const openBalance      = round(grandTotal - (totalDownPayment + appliedAmounts));
    setFormData((prev) => ({ ...prev, totalBeforeDiscount, gstTotal, grandTotal, openBalance }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  // ── Submit ──
  const handleSubmit = async () => {
    if (!formData.customerName || !formData.customerCode) { toast.error("Please select a valid customer"); return; }
    if (formData.items.length === 0 || formData.items.every((item) => !item.itemName)) { toast.error("Please add at least one valid item"); return; }
    if (formData.items.some((it) => Number(it.quantity) <= 0)) { toast.error("Quantity must be at least 1 for every item"); return; }
    const token = localStorage.getItem("token");
    if (!token) { toast.error("Unauthorized! Please log in."); return; }

    setLoading(true);
    try {
      const sanitizedItems = (formData.items || []).map((it) => {
        const item = { ...it };
        if (item.warehouse === "" || item.warehouse == null) { delete item.warehouse; delete item.warehouseCode; delete item.warehouseName; }
        return item;
      });

      const payload = { ...formData, items: sanitizedItems, existingFiles: formData.existingFiles || [], removedFiles: formData.removedFiles || [] };
      const formDataToSend = new FormData();
      formDataToSend.append("quotationData", JSON.stringify(payload));
      if (attachments?.length > 0) attachments.forEach((f) => formDataToSend.append("attachments", f));

      const url    = editId ? `/api/sales-quotation/${editId}` : `/api/sales-quotation`;
      const method = editId ? "put" : "post";
      const response = await axios[method](url, formDataToSend, { headers: { Authorization: `Bearer ${token}` } });

      toast.success(response.data.message || "Quotation saved!");
      setFormData(initialState);
      setAttachments([]);
      sessionStorage.removeItem("salesQuotationData");
      router.push("/admin/sales-quotation-view");
    } catch (error) {
      toast.error(`Failed to ${editId ? "update" : "create"} quotation: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData(initialState);
    setAttachments([]);
    router.push("/admin/sales-quotation-view");
  };

  // ── UI helpers ──
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi = (readOnly = false) =>
    `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
     ${readOnly
       ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed"
       : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

  const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}>
          <Icon className="text-sm" />
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{title}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  const ReadField = ({ label, value }) => (
    <div>
      <Lbl text={label} />
      <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
        {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
      </div>
    </div>
  );

  if (fetchLoading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="flex items-center gap-3 text-gray-400 text-sm font-medium">
        <span className="w-5 h-5 border-2 border-gray-200 border-t-indigo-500 rounded-full animate-spin" />
        Loading quotation…
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ── Header ── */}
        <button onClick={() => router.push("/admin/sales-quotation-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Quotations
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">
              {editId ? "Edit Sales Quotation" : "New Sales Quotation"}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {editId ? "Update the quotation details below" : "Fill in the details to create a new quotation"}
            </p>
          </div>
          {/* Status badge */}
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border
            ${formData.status === "Approved" || formData.status === "Accepted" ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : formData.status === "Draft" ? "bg-gray-100 text-gray-500 border-gray-200"
              : formData.status === "Rejected" || formData.status === "Cancelled" ? "bg-red-50 text-red-500 border-red-200"
              : "bg-amber-50 text-amber-600 border-amber-200"}`}>
            {formData.status}
          </span>
        </div>

        {/* ── Section 1: Customer ── */}
        <SectionCard icon={FaUser} title="Customer Details" subtitle="Select customer and basic info" color="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
           
              <CustomerSearch
                onSelectCustomer={handleCustomerSelect}

                initialCustomer={editId && formData.customer ? { _id: formData.customer, customerName: formData.customerName } : undefined}
              />
            </div>
            <ReadField label="Customer Name"   value={formData.customerName} />
            <ReadField label="Customer Code"   value={formData.customerCode} />
            <ReadField label="Contact Person"  value={formData.contactPerson} />
            <div>
              <Lbl text="Reference Number" />
              <input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} placeholder="Auto-generated if blank (e.g. SQ-001)" />
            </div>
            <div>
              <Lbl text="Invoice Type" />
              <select className={fi()} name="invoiceType" value={formData.invoiceType || "Normal"} onChange={handleInputChange}>
                <option value="Normal">Normal</option>
                <option value="Proforma">Proforma</option>
                <option value="Export">Export</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 2: Dates & Status ── */}
        <SectionCard icon={FaCalendarAlt} title="Dates & Status" subtitle="Posting date, validity and document status" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Lbl text="Status" />
              <select className={fi()} name="status" value={formData.status || ""} onChange={handleInputChange}>
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
              <Lbl text="Posting Date" req />
              <input className={fi()} type="date" name="postingDate" value={formData.postingDate || ""} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Valid Until" />
              <input className={fi()} type="date" name="validUntil" value={formData.validUntil || ""} onChange={handleInputChange} />
            </div>
            <div>
              <Lbl text="Document Date" />
              <input className={fi()} type="date" name="documentDate" value={formData.documentDate || ""} onChange={handleInputChange} />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 3: Items ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-emerald-50/40">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-500">
              <FaBoxOpen className="text-sm" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Items</p>
              <p className="text-xs text-gray-400">{formData.items.length} item{formData.items.length !== 1 ? "s" : ""} added</p>
            </div>
          </div>
          <div className="px-4 py-4 overflow-x-auto">
            <ItemSection
              items={formData.items}
              onItemChange={handleItemChange}
              onAddItem={addItemRow}
              onRemoveItem={removeItemRow}
              computeItemValues={computeItemValues}
            />
          </div>
        </div>

        {/* ── Section 4: Employee & Remarks ── */}
        <SectionCard icon={FaUserTie} title="Additional Info" subtitle="Sales employee and remarks" color="purple">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Sales Employee" />
              <input className={fi()} name="salesEmployee" value={formData.salesEmployee || ""} onChange={handleInputChange} placeholder="Employee name" />
            </div>
            <div>
              <Lbl text="Remarks" />
              <textarea className={`${fi()} resize-none`} name="remarks" rows={3} value={formData.remarks || ""} onChange={handleInputChange} placeholder="Any remarks or notes…" />
            </div>
          </div>
        </SectionCard>

        {/* ── Section 5: Totals ── */}
        <SectionCard icon={FaCalculator} title="Summary" subtitle="Tax and grand total calculation" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <ReadField label="Taxable Amount (₹)" value={`₹ ${Number(formData.totalBeforeDiscount || 0).toLocaleString("en-IN")}`} />
            <ReadField label="GST Total (₹)"       value={`₹ ${Number(formData.gstTotal || 0).toLocaleString("en-IN")}`} />
            <div>
              <Lbl text="Overall Freight (₹)" />
              <input className={fi()} type="number" name="freight" value={formData.freight || 0} onChange={handleInputChange} placeholder="0" />
            </div>
            <div>
              <Lbl text="Rounding (₹)" />
              <input className={fi()} type="number" name="rounding" value={formData.rounding || 0} onChange={handleInputChange} placeholder="0" />
            </div>
            <div className="sm:col-span-2 lg:col-span-1">
              <Lbl text="Grand Total (₹)" />
              <div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-sm font-extrabold text-indigo-700 tracking-tight">
                ₹ {Number(formData.grandTotal || 0).toLocaleString("en-IN")}
              </div>
            </div>
          </div>
        </SectionCard>

        {/* ── Section 6: Attachments ── */}
        <SectionCard icon={FaPaperclip} title="Attachments" subtitle="Upload images or PDF documents" color="gray">

          {/* Existing files */}
          {formData.existingFiles?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
              {formData.existingFiles.map((file, idx) => {
                const url = typeof file === "string" ? file : file?.fileUrl || file?.url || file?.path || file?.location || "";
                const type = file?.fileType || "";
                const name = file?.fileName || url?.split("/").pop() || `File-${idx}`;
                if (!url) return null;
                const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");
                return (
                  <div key={idx} className="relative rounded-xl border border-gray-200 overflow-hidden group">
                    {isPDF
                      ? <object data={url} type="application/pdf" className="h-28 w-full" />
                      : <img src={url} alt={name} className="h-28 w-full object-cover" />}
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      className="block bg-white/90 px-2 py-1 text-[10px] text-indigo-600 font-semibold truncate border-t border-gray-100">
                      {name}
                    </a>
                    <button
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        existingFiles: prev.existingFiles.filter((_, i) => i !== idx),
                        removedFiles: [...prev.removedFiles, file],
                      }))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow">
                      <FaTimes className="text-[9px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* New file upload */}
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group">
            <FaPaperclip className="text-gray-300 group-hover:text-indigo-400 transition-colors" />
            <span className="text-sm font-medium text-gray-400 group-hover:text-indigo-500 transition-colors">
              Click to upload images or PDFs
            </span>
            <input type="file" multiple accept="image/*,application/pdf" hidden
              onChange={(e) => {
                const files = Array.from(e.target.files);
                setAttachments((prev) => {
                  const m = new Map(prev.map((f) => [f.name + f.size, f]));
                  files.forEach((f) => m.set(f.name + f.size, f));
                  return [...m.values()];
                });
                e.target.value = "";
              }}
            />
          </label>

          {/* New file previews */}
          {attachments.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-3">
              {attachments.map((file, idx) => {
                const url    = URL.createObjectURL(file);
                const isPDF  = file.type === "application/pdf";
                const isImg  = file.type.startsWith("image/");
                return (
                  <div key={idx} className="relative rounded-xl border border-gray-200 overflow-hidden group">
                    {isImg
                      ? <img src={url} alt={file.name} className="h-28 w-full object-cover" />
                      : isPDF
                      ? <object data={url} type="application/pdf" className="h-28 w-full" />
                      : <div className="h-28 flex items-center justify-center bg-gray-50"><FaFileAlt className="text-gray-300 text-3xl" /></div>}
                    <div className="bg-white/90 px-2 py-1 text-[10px] text-gray-600 font-medium truncate border-t border-gray-100">
                      {file.name}
                    </div>
                    <button onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-all shadow">
                      <FaTimes className="text-[9px]" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ── Footer Buttons ── */}
        <div className="flex items-center justify-between pt-2 pb-8">
          <button type="button" onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all border border-gray-200">
            <FaArrowLeft className="text-xs" /> Cancel
          </button>

          <button type="button" onClick={handleSubmit} disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-all shadow-sm shadow-emerald-200 disabled:opacity-60 disabled:cursor-not-allowed">
            {loading
              ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving…</>
              : <><FaCheck className="text-xs" /> {editId ? "Update Quotation" : "Create Quotation"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SalesQuotationFormWrapper;



// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { Suspense } from "react";

// import { toast } from "react-toastify";


// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgstRate = parseFloat(item.cgstRate) || gstRate / 2;
//     const sgstRate = parseFloat(item.sgstRate) || gstRate / 2;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = round(cgstAmount + sgstAmount);
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: 0,
//     };
//   }

//   if (item.taxOption === "IGST") {
//     const igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount,
//     };
//   }

//   return {
//     priceAfterDiscount,
//     totalAmount,
//     gstAmount: 0,
//     cgstAmount: 0,
//     sgstAmount: 0,
//     igstAmount: 0,
//   };
// };

// const initialState = {
//   sourceQuotationId: "",
//   customer: "",
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Draft",
//   postingDate: formatDateForInput(new Date()),
//   validUntil: "",
//   documentDate: formatDateForInput(new Date()),
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       orderedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstRate: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstRate: 0,
//       igstAmount: 0,
//       tdsAmount: 0,
//       warehouse: "",
//       warehouseCode: "",
//       warehouseName: "",
//       stockAdded: false,
//       managedBy: "",
//       batches: [],
//       qualityCheckDetails: [],
//       removalReason: "",
//     },
//   ],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   invoiceType: "Normal",
//   existingFiles: [],
//   removedFiles: []
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return "";
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// function SalesQuotationFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesQuotationForm />
//     </Suspense>
//   );
// }

// function SalesQuotationForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [attachments, setAttachments] = useState([]);
//   const [formData, setFormData] = useState(initialState);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const base = "w-full p-2 border rounded";

//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);

//       const token = localStorage.getItem("token"); // ✅ Auth token
//       if (!token) {
//         setError("Unauthorized: No token found");
//         setLoading(false);
//         return;
//       }

//       axios
//         .get(`/api/sales-quotation/${editId}`, {
//           headers: { Authorization: `Bearer ${token}` }, // ✅ Include token
//         })
//         .then((res) => {
//           if (!res.data.success) {
//             throw new Error(res.data.error || "Failed to load quotation");
//           }

//           const record = res.data.data;
//           console.log("Fetched quotation:", record);

//           if (!Array.isArray(record.items)) {
//             console.warn("Items is not an array, defaulting to empty array:", record.items);
//             record.items = [];
//           }

//           // ✅ Set attachments for edit mode
//           setFormData(prev => ({ ...prev, existingFiles: record.attachments || [] })); // Corrected here

//           // ✅ Update form state
//           setFormData((prev) => ({
//             ...prev,
//             ...record,
//             sourceQuotationId: record._id || "",
//             customer: record.customer?._id || record.customer || "",
//             customerCode: record.customerCode || "",
//             customerName: record.customerName || "",
//             contactPerson: record.contactPerson || "",
//             status: record.status || "Draft",
//             postingDate: formatDateForInput(record.postingDate),
//             validUntil: formatDateForInput(record.validUntil),
//             documentDate: formatDateForInput(record.documentDate),
//             items:
//               record.items.length > 0
//                 ? record.items.map((item) => {
//                     const computed = computeItemValues({
//                       ...item,
//                       quantity: item.quantity || 0,
//                       unitPrice: item.unitPrice || 0,
//                       discount: item.discount || 0,
//                       freight: item.freight || 0,
//                       gstRate: item.gstRate || 0,
//                       taxOption: item.taxOption || "GST",
//                       igstRate: item.igstRate || 0,
//                       tdsAmount: item.tdsAmount || 0,
//                     });
//                     return {
//                       ...initialState.items[0],
//                       ...item,
//                       ...computed,
//                       item: item.item?._id || item.item || "",
//                       itemCode: item.itemCode || "",
//                       itemName: item.itemName || "",
//                       itemDescription: item.itemDescription || "",
//                       quantity: item.quantity || 0,
//                       orderedQuantity: item.orderedQuantity || 0,
//                       unitPrice: item.unitPrice || 0,
//                       discount: item.discount || 0,
//                       freight: item.freight || 0,
//                       gstRate: item.gstRate || 0,
//                       taxOption: item.taxOption || "GST",
//                       igstRate: item.igstRate || 0,
//                       tdsAmount: item.tdsAmount || 0,
//                       warehouse: item.warehouse?._id || item.warehouse || "",
//                       warehouseCode: item.warehouseCode || "",
//                       warehouseName: item.warehouseName || "",
//                       stockAdded: item.stockAdded || false,
//                       managedBy: item.managedBy || "",
//                       batches: item.batches || [],
//                       qualityCheckDetails: item.qualityCheckDetails || [],
//                       removalReason: item.removalReason || "",
//                     };
//                   })
//                 : [{ ...initialState.items[0] }],
//             invoiceType: record.invoiceType || "Normal",
//             salesEmployee: record.salesEmployee || "",
//             remarks: record.remarks || "",
//             freight: record.freight || 0,
//             rounding: record.rounding || 0,
//             totalBeforeDiscount: record.totalBeforeDiscount || 0,
//             totalDownPayment: record.totalDownPayment || 0,
//             appliedAmounts: record.appliedAmounts || 0,
//             gstTotal: record.gstAmount || 0,
//             grandTotal: record.grandTotal || 0,
//             openBalance: record.openBalance || 0,
//           }));
//         })
//         .catch((err) => {
//           console.error("Error fetching quotation:", err);
//           setError("Error loading quotation: " + (err.message || "Unknown error"));
//         })
//         .finally(() => {
//           setLoading(false);
//         });
//     } else if (editId) {
//       setError("Invalid quotation ID");
//     }
//   }, [editId]);


//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     console.log("Selected customer:", selectedCustomer);
//     setFormData((prev) => ({
//       ...prev,
//       customer: selectedCustomer._id || "",
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       const numericFields = [
//         "quantity",

//         "unitPrice",
//         "discount",
//         "freight",
//         "gstRate",
//         "igstRate",
//         "tdsAmount",
//       ];
//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//       updatedItems[index] = { ...updatedItems[index], [name]: newValue };

//       const computed = computeItemValues(updatedItems[index]);
//       updatedItems[index] = { ...updatedItems[index], ...computed };
//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [...prev.items, { ...initialState.items[0] }],
//     }));
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   useEffect(() => {
//     const totalBeforeDiscount = round(
//       formData.items.reduce((acc, item) => {
//         const unitPrice = parseFloat(item.unitPrice) || 0;
//         const discount = parseFloat(item.discount) || 0;
//         const quantity = parseFloat(item.quantity) || 0;
//         return acc + (unitPrice - discount) * quantity;
//       }, 0)
//     );

//     const totalItems = round(
//       formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)
//     );

//     const gstTotal = round(
//       formData.items.reduce((acc, item) => {
//         return acc + (parseFloat(item.taxOption === "IGST" ? item.igstAmount : item.gstAmount) || 0);
//       }, 0)
//     );

//     const overallFreight = round(parseFloat(formData.freight) || 0);
//     const rounding = round(parseFloat(formData.rounding) || 0);
//     const totalDownPayment = round(parseFloat(formData.totalDownPayment) || 0);
//     const appliedAmounts = round(parseFloat(formData.appliedAmounts) || 0);

//     const grandTotal = round(totalItems + gstTotal + overallFreight + rounding);
//     const openBalance = round(grandTotal - (totalDownPayment + appliedAmounts));

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance,
//     }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);



//  const handleSubmit = async () => {
//   try {
//     // ✅ Validate customer
//     if (!formData.customerName || !formData.customerCode) {
//       toast.error("Please select a valid customer");
//       return;
//     }

//     // ✅ Validate items (at least one item with itemName)
//     if (formData.items.length === 0 || formData.items.every((item) => !item.itemName)) {
//       toast.error("Please add at least one valid item");
//       return;
//     }

//     // ✅ Validate zero quantity
//     if (formData.items.some((it) => Number(it.quantity) <= 0)) {
//       toast.error("Quantity must be at least 1 for every item.");
//       return;
//     }

//     // ✅ Validate token
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Unauthorized! Please log in.");
//       return;
//     }

//     setLoading(true);

//     // -------------------------
//     // Sanitization: remove empty or invalid warehouses so server won't try to cast ""
//     // -------------------------
//     const sanitizedItems = (formData.items || []).map((it) => {
//       const item = { ...it };

//       // If warehouse is an empty string or falsy, remove the key so Mongoose won't cast it.
//       // (If you prefer null instead, set item.warehouse = null)
//       if (item.warehouse === "" || item.warehouse == null) {
//         delete item.warehouse;
//         // also clear related display fields if you want:
//         delete item.warehouseCode;
//         delete item.warehouseName;
//       } else {
//         // Optional: if warehouse exists but is not a valid ObjectId, remove it too
//         // if (typeof item.warehouse === "string" && !/^[0-9a-fA-F]{24}$/.test(item.warehouse)) {
//         //   delete item.warehouse;
//         // }
//       }

//       return item;
//     });

//     // Prepare payload: override items with sanitized items and keep attachments arrays
//     const payload = {
//       ...formData,
//       items: sanitizedItems,
//       existingFiles: formData.existingFiles || [],
//       removedFiles: formData.removedFiles || [],
//     };

//     // ✅ Prepare FormData
//     const formDataToSend = new FormData();
//     formDataToSend.append("quotationData", JSON.stringify(payload));

//     if (attachments && attachments.length > 0) {
//       attachments.forEach((file) => formDataToSend.append("attachments", file));
//     }

//     // ✅ API Request (POST or PUT)
//     const url = editId ? `/api/sales-quotation/${editId}` : `/api/sales-quotation`;
//     const method = editId ? "put" : "post";

//     const response = await axios[method](url, formDataToSend, {
//       headers: {
//         Authorization: `Bearer ${token}`,
//         // don't set Content-Type; browser will add multipart/form-data boundary
//       },
//     });

//     toast.success(response.data.message || "Quotation saved successfully!");

//     setFormData(initialState);
//     setAttachments([]);
//     sessionStorage.removeItem("salesQuotationData");
//     router.push("/admin/sales-quotation-view");
//   } catch (error) {
//     console.error("Error saving quotation:", error);
//     toast.error(
//       `Failed to ${editId ? "update" : "create"} quotation: ${
//         error.response?.data?.error || error.message
//       }`
//     );
//   } finally {
//     setLoading(false);
//   }
// };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">{editId ? "Edit Sales Quotation" : "Create Sales Quotation"}</h1>
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Customer Name</label>
//             <CustomerSearch
//               onSelectCustomer={handleCustomerSelect}
//               initialCustomer={
//                 editId && formData.customer
//                   ? { _id: formData.customer, customerName: formData.customerName }
//                   : undefined
//               }
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
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
//               placeholder="Auto-generated if blank (e.g., SQ-001)"
//             />
//           </div>
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Draft">Draft</option>
//               <option value="Sent">Sent</option>
//               <option value="Accepted">Accepted</option>
//               <option value="Rejected">Rejected</option>
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
//               value={formData.postingDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formData.documentDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onRemoveItem={removeItemRow}
//           computeItemValues={computeItemValues}
//         />
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           ></textarea>
//         </div>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="totalBeforeDiscount"
//             value={formData.totalBeforeDiscount || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST Total</label>
//           <input
//             type="number"
//             name="gstTotal"
//             value={formData.gstTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Grand Total</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
//       {/* Attachments Section */}
//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>

//         {/* Existing uploaded files */}
//         {formData.existingFiles && formData.existingFiles.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4">
//             {formData.existingFiles.map((file, idx) => {
//               const url =
//                 typeof file === "string"
//                   ? file
//                   : file?.fileUrl || file?.url || file?.path || file?.location || "";
//               const type = file?.fileType || "";
//               const name = file?.fileName || url?.split("/").pop() || `File-${idx}`;
//               if (!url) return null;

//               const isPDF = type === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center">
//                   {isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                   ) : (
//                     <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
//                   )}
//                   <a
//                     href={url}
//                     target="_blank"
//                     rel="noopener noreferrer"
//                     className="block text-blue-600 text-xs mt-1 truncate"
//                   >
//                     {name}
//                   </a>
//                   <button
//                     onClick={() => {
//                       setFormData(prev => ({ ...prev, existingFiles: prev.existingFiles.filter((_, i) => i !== idx), removedFiles: [...prev.removedFiles, file] }));
//                     }}
//                     className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//                   >
//                     ×
//                   </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}

//         {/* New Uploads */}
//         <input
//           type="file"
//           multiple
//           accept="image/*,application/pdf"
//           onChange={(e) => {
//             const files = Array.from(e.target.files);
//             setAttachments((prev) => {
//               const m = new Map(prev.map((f) => [f.name + f.size, f]));
//               files.forEach((f) => m.set(f.name + f.size, f));
//               return [...m.values()];
//             });
//             e.target.value = "";
//           }}
//           className="border px-3 py-2 w-full"
//         />

//         {/* Previews of new uploads */}
//         {attachments.length > 0 && (
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//             {attachments.map((file, idx) => {
//               const url = URL.createObjectURL(file);
//               const isPDF = file.type === "application/pdf";
//               const isImage = file.type.startsWith("image/");

//               return (
//                 <div key={idx} className="relative border rounded p-2 text-center">
//                   {isImage ? (
//                     <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//                   ) : isPDF ? (
//                     <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                   ) : (
//                     <p className="truncate text-xs">{file.name}</p>
//                   )}
//                   <button
//                     onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
//                     className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//                   >
//                     ×
//                   </button>
//                 </div>
//               );
//             })}
//           </div>
//         )}
//       </div>
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           disabled={loading}
//           className={`mt-4 px-4 py-2 rounded ${
//             loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
//           } text-white`}
//         >
//           {loading ? "Loading..." : editId ? "Update" : "Submit"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialState);
//             setAttachments([]);
//             setError(null);
//             router.push("/admin/sales-quote-view");
//           }}
//           className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500"
//         >
//           Reset
//         </button>
//       </div>
//     </div>
//   );
// }

// export default SalesQuotationFormWrapper;