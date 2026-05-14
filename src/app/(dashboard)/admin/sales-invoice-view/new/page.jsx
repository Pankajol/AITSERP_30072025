"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import {
  FaArrowLeft, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaTimes, FaWarehouse, FaCopy,
  FaMoneyBillWave
} from "react-icons/fa";

// ──────────────────────────────────────────────────────────────
// Helpers (identical to Sales Order page)
// ──────────────────────────────────────────────────────────────
const round = (num, d = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(d));
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
    const cgstAmount = round(totalAmount * (gstRate / 2 / 100));
    const sgstAmount = round(totalAmount * (gstRate / 2 / 100));
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
    let igstRate = parseFloat(item.igstRate);
    if (isNaN(igstRate) || igstRate === 0) igstRate = parseFloat(item.gstRate) || 0;
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

const formatDateForInput = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

const Lbl = ({ text, req }) => (
  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
    {text}{req && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const fi = (readOnly = false) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
   ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300"}`;

const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => {
  const colorMap = {
    indigo: "bg-indigo-50/40 border-indigo-100",
    blue: "bg-blue-50/40 border-blue-100",
    emerald: "bg-emerald-50/40 border-emerald-100",
    amber: "bg-amber-50/40 border-amber-100",
    gray: "bg-gray-50/40 border-gray-100",
    green: "bg-green-50/40 border-green-100",
  };
  const iconColorMap = {
    indigo: "bg-indigo-100 text-indigo-500",
    blue: "bg-blue-100 text-blue-500",
    emerald: "bg-emerald-100 text-emerald-500",
    amber: "bg-amber-100 text-amber-500",
    gray: "bg-gray-100 text-gray-500",
    green: "bg-green-100 text-green-500",
  };
  const bgClass = colorMap[color] || colorMap.indigo;
  const iconClass = iconColorMap[color] || iconColorMap.indigo;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 ${bgClass}`}>
        <div className={`w-8 h-8 rounded-lg ${iconClass} flex items-center justify-center`}>
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
};

const ReadField = ({ label, value }) => (
  <div>
    <Lbl text={label} />
    <div className="px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-sm font-semibold text-gray-400">
      {value || <span className="italic font-normal text-gray-300">Auto-filled</span>}
    </div>
  </div>
);

// ──────────────────────────────────────────────────────────────
// Initial State (invoice specific)
// ──────────────────────────────────────────────────────────────
const initialState = {
  customer: "", customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  salesEmployee: "", status: "Open",
  invoiceDate: formatDateForInput(new Date()),
  dueDate: "",
  orderDate: "",
  billingAddress: null,
  shippingAddress: null,
  items: [{
    item: "", imageUrl: "", itemCode: "", itemName: "", itemDescription: "",
    quantity: 1, unitPrice: 0, discount: 0, freight: 0,
    gstRate: 0, igstRate: 0, taxOption: "GST",
    priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: 0,
    warehouse: "", warehouseName: "", warehouseCode: "",
    managedByBatch: true,
    variant: null, selectedVariantId: null,
  }],
  remarks: "", freight: 0, rounding: 0,
  totalDownPayment: 0, appliedAmounts: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0,
  attachments: [],
  payments: [],
};

// ──────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────
export default function SalesInvoicePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Invoice Form...</div>}>
      <SalesInvoiceForm />
    </Suspense>
  );
}

function SalesInvoiceForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("editId");
  const isEdit = Boolean(editId);

  const [formData, setFormData] = useState(initialState);
  const [attachments, setAttachments] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedGlobalWarehouse, setSelectedGlobalWarehouse] = useState("");
  const [defaultWarehouse, setDefaultWarehouse] = useState(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  // ─── Copy from SO / Delivery Challan ───────────────────────
  const [sourceType, setSourceType] = useState("salesOrder"); // "salesOrder" or "deliveryChallan"
  const [sourceNumber, setSourceNumber] = useState("");
  const [sourceSearchResults, setSourceSearchResults] = useState([]);

  // ─── Payment local state ───────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentFields, setPaymentFields] = useState({
    bankAccountId: "", upiId: "", transactionId: "", paymentGateway: "",
    cardLast4Digits: "", cardNetwork: "", chequeNumber: "", chequeDate: "", bankName: "",
    paymentDate: formatDateForInput(new Date()), notes: ""
  });
  const [bankAccounts, setBankAccounts] = useState([]);

  // ─── 1. Fetch warehouses, bank accounts, default warehouse ──
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    Promise.all([
      axios.get("/api/warehouse", { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("/api/warehouse?getDefault=true", { headers: { Authorization: `Bearer ${token}` } }),
      axios.get("/api/accounts/heads?type=Asset&group=Bank Account", { headers: { Authorization: `Bearer ${token}` } })
    ])
      .then(([whRes, defRes, bankRes]) => {
        if (whRes.data.success) setWarehouses(whRes.data.data);
        if (defRes.data.success && defRes.data.data) {
          setDefaultWarehouse(defRes.data.data);
          setSelectedGlobalWarehouse(defRes.data.data._id);
        }
        if (bankRes.data?.success) setBankAccounts(bankRes.data.data);
      })
      .catch(console.error);
  }, []);

  // Apply warehouse to all items (same as SO page)
  const applyWarehouseToAll = (warehouseId) => {
    const wh = warehouses.find(w => w._id === warehouseId);
    if (!wh) return;
    setFormData(prev => ({
      ...prev,
      items: prev.items.map(item => ({
        ...item,
        warehouse: wh._id,
        warehouseName: wh.warehouseName,
        warehouseCode: wh.warehouseCode,
      })),
    }));
    toast.success(`Warehouse "${wh.warehouseName}" applied to all items.`);
  };

  const applyDefaultWarehouseToAll = () => {
    if (!defaultWarehouse) {
      toast.warning("No default warehouse configured.");
      return;
    }
    applyWarehouseToAll(defaultWarehouse._id);
  };

  // Auth & read-only
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      const admin = roles.includes("admin") || roles.includes("sales manager") || d?.type === "company";
      setIsAdmin(admin);
    } catch (e) { console.error(e); }
  }, []);

  // ─── 2. Load from sessionStorage (copy from quotation / draft) ──
  useEffect(() => {
    if (!isEdit) {
      const stored = sessionStorage.getItem("SalesInvoiceData");
      if (stored) {
        try {
          const src = JSON.parse(stored);
          const mappedItems = (src.items || []).map(it => ({
            ...initialState.items[0],
            ...it,
            item: typeof it.item === 'object' ? it.item._id : it.item,
            warehouse: typeof it.warehouse === 'object' ? it.warehouse._id : it.warehouse,
            warehouseName: it.warehouseName || it.warehouse?.warehouseName || "",
            warehouseCode: it.warehouseCode || it.warehouse?.warehouseCode || "",
            quantity: it.quantity,
            unitPrice: it.unitPrice,
            discount: it.discount,
            gstRate: it.gstRate,
            taxOption: it.taxOption || "GST",
            igstRate: it.igstRate,
          }));
          setFormData(prev => ({
            ...prev,
            customer: src.customer?._id || src.customer,
            customerCode: src.customerCode,
            customerName: src.customerName,
            contactPerson: src.contactPerson,
            refNumber: src.refNumber,
            sourceModel: src.sourceModel || "",           // ✅ add this
          salesOrderId: src.salesOrderId || null,
            remarks: src.remarks,
            freight: Number(src.freight) || 0,
            totalDownPayment: src.totalDownPayment || 0,
            appliedAmounts: src.appliedAmounts || 0,
            items: mappedItems,
          }));
          if (src.customerCode && src.customerName) {
            setSelectedCustomer({ _id: src.customer, customerCode: src.customerCode, customerName: src.customerName });
          }
          setExistingFiles(src.attachments || []);
          sessionStorage.removeItem("SalesInvoiceData");
          toast.success("Draft loaded. Adjust as needed.");
        } catch (e) { console.error(e); }
      }
    }
  }, [isEdit]);

  // ─── 3. Edit existing invoice ──────────────────────────────
  useEffect(() => {
    if (!isEdit || !editId || !/^[0-9a-fA-F]{24}$/.test(editId)) return;
    setLoading(true);
    const token = localStorage.getItem("token");
    axios.get(`/api/sales-invoice?id=${editId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => {
        const record = res.data.data;
        const enhancedItems = (record.items || []).map(it => ({
          ...initialState.items[0],
          ...it,
          item: it.item?._id || it.item,
          warehouse: it.warehouse?._id || it.warehouse,
        }));
        setFormData({
          ...initialState,
          ...record,
          invoiceDate: formatDateForInput(record.invoiceDate),
          dueDate: formatDateForInput(record.dueDate),
          orderDate: formatDateForInput(record.orderDate),
          items: enhancedItems,
          payments: record.payments || [],
        });
        if (record.customerCode || record.customerName) {
          setSelectedCustomer({
            _id: record.customer,
            customerCode: record.customerCode,
            customerName: record.customerName,
            contactPersonName: record.contactPerson
          });
        }
        setExistingFiles((record.attachments || []).map(f => ({ fileUrl: f.fileUrl, fileName: f.fileName, publicId: f.publicId })));
        if (!isAdmin && record.status === "Closed") setIsReadOnly(true);
      })
      .catch(err => toast.error("Failed to load invoice"))
      .finally(() => setLoading(false));
  }, [isEdit, editId, isAdmin]);

  // ─── 4. Totals recalculation (invoice version) ─────────────
  useEffect(() => {
    const totalBeforeDiscount = formData.items.reduce(
      (sum, it) => sum + (it.priceAfterDiscount || 0) * (it.quantity || 0), 0
    );
    const gstTotal = formData.items.reduce((sum, it) => sum + (it.gstAmount || 0), 0);
    const freight = Number(formData.freight) || 0;
    const rounding = Number(formData.rounding) || 0;
    const grandTotal = totalBeforeDiscount + gstTotal + freight + rounding;
    const paymentsTotal = formData.payments.reduce((s, p) => s + p.amount, 0);
    const openBalance = grandTotal - (Number(formData.totalDownPayment) + Number(formData.appliedAmounts) + paymentsTotal);
    setFormData(prev => ({ ...prev, totalBeforeDiscount, gstTotal, grandTotal, openBalance: round(openBalance) }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts, formData.payments]);

  // ─── Handlers ──────────────────────────────────────────────
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, update) => {
    setFormData(prev => {
      const items = [...prev.items];
      let updatedItem = { ...items[index] };
      if (update && typeof update === "object") {
        if (update.target) {
          const { name, value } = update.target;
          const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate"];
          const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
          updatedItem[name] = newValue;
        } else {
          updatedItem = { ...updatedItem, ...update };
        }
      }
      const computed = computeItemValues(updatedItem);
      updatedItem = { ...updatedItem, ...computed };
      items[index] = updatedItem;
      return { ...prev, items };
    });
  };

  const addItemRow = () => {
    const defaultWh = warehouses.find(w => w._id === selectedGlobalWarehouse);
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ...initialState.items[0],
        warehouse: selectedGlobalWarehouse,
        warehouseName: defaultWh?.warehouseName || "",
        warehouseCode: defaultWh?.warehouseCode || "",
      }],
    }));
  };

  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // ─── Copy from SO/Delivery Challan logic ────────────────────
  const searchSourceDocuments = async () => {
    if (!sourceNumber.trim()) return;
    const token = localStorage.getItem("token");
    try {
      const endpoint = sourceType === "salesOrder" ? "/api/sales-orders" : "/api/delivery-challans";
      const res = await axios.get(`${endpoint}?search=${sourceNumber}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) setSourceSearchResults(res.data.data);
      else { setSourceSearchResults([]); toast.warn("No matching documents found"); }
    } catch (err) { toast.error("Error searching source document"); }
  };

const applySourceData = async (doc) => {
  const token = localStorage.getItem("token");
  try {
    const endpoint = sourceType === "salesOrder" ? `/api/sales-orders/${doc._id}` : `/api/delivery-challans/${doc._id}`;
    const res = await axios.get(endpoint, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.data.success) throw new Error();
    const source = res.data.data;

    // Prepare sourceModel and salesOrderId if needed
    const sourceModel = sourceType === "salesOrder" ? "salesorder" : "delivery";
    const salesOrderId = sourceType === "salesOrder" ? doc._id : undefined;

    setSelectedCustomer(source.customer);
    setFormData(prev => ({
      ...prev,
      sourceModel: sourceModel,                 // ✅ Add this
      salesOrderId: salesOrderId,               // ✅ For SO status updates
      customer: source.customer._id,
      customerCode: source.customer.customerCode,
      customerName: source.customer.customerName,
      contactPerson: source.customer.contactPersonName || "",
      billingAddress: source.billingAddress || null,
      shippingAddress: source.shippingAddress || null,
      orderDate: source.orderDate ? formatDateForInput(source.orderDate) : "",
      refNumber: source.refNumber || "",
      items: source.items.map(srcItem => ({
        ...initialState.items[0],
        item: srcItem.item?._id || srcItem.item,
        itemCode: srcItem.itemCode,
        itemName: srcItem.itemName,
        itemDescription: srcItem.itemDescription,
        quantity: srcItem.quantity,
        unitPrice: srcItem.unitPrice,
        discount: srcItem.discount || 0,
        freight: srcItem.freight || 0,
        taxOption: srcItem.taxOption || "GST",
        gstRate: srcItem.gstRate || 0,
        igstRate: srcItem.igstRate || 0,
        warehouse: srcItem.warehouse?._id || srcItem.warehouse,
        warehouseName: srcItem.warehouseName,
        variant: srcItem.variant || null,
        ...computeItemValues(srcItem)
      })),
    }));
    toast.success(`Copied from ${sourceType === "salesOrder" ? "Sales Order" : "Delivery Challan"} #${doc.orderNumber || doc.challanNumber}`);
    setSourceNumber("");
    setSourceSearchResults([]);
  } catch (err) { 
    toast.error("Failed to load source details"); 
  }
};

  // ─── Payment handlers ──────────────────────────────────────
  const addPayment = () => {
    if (paymentAmount <= 0) { toast.error("Amount must be >0"); return; }
    const newPayment = { amount: paymentAmount, method: paymentMethod, paymentDate: paymentFields.paymentDate || new Date(), notes: paymentFields.notes };
    if (paymentMethod === "bank") newPayment.bankAccountId = paymentFields.bankAccountId;
    if (paymentMethod === "upi") { newPayment.upiId = paymentFields.upiId; newPayment.transactionId = paymentFields.transactionId; }
    if (paymentMethod === "card") { newPayment.cardLast4Digits = paymentFields.cardLast4Digits; newPayment.cardNetwork = paymentFields.cardNetwork; newPayment.transactionId = paymentFields.transactionId; }
    if (paymentMethod === "cheque") { newPayment.chequeNumber = paymentFields.chequeNumber; newPayment.chequeDate = paymentFields.chequeDate; newPayment.bankName = paymentFields.bankName; }
    setFormData(prev => ({ ...prev, payments: [...prev.payments, newPayment] }));
    setPaymentAmount(0);
    setPaymentFields({ bankAccountId: "", upiId: "", transactionId: "", paymentGateway: "", cardLast4Digits: "", cardNetwork: "", chequeNumber: "", chequeDate: "", bankName: "", paymentDate: formatDateForInput(new Date()), notes: "" });
  };
  const removePayment = (idx) => setFormData(prev => ({ ...prev, payments: prev.payments.filter((_, i) => i !== idx) }));

  // ─── Attachments ───────────────────────────────────────────
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setAttachments(prev => [...prev, ...files]);
    e.target.value = "";
  };
  const removeExistingFile = (file, idx) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx));
    setRemovedFiles(prev => [...prev, file]);
  };

  // ─── Validation & Submit ───────────────────────────────────
  const validateForm = () => {
    if (!formData.customerName || !formData.customerCode) { toast.error("Select a customer"); return false; }
    if (!formData.invoiceDate) { toast.error("Invoice date required"); return false; }
    if (formData.items.length === 0) { toast.error("At least one item"); return false; }
    for (let i = 0; i < formData.items.length; i++) {
      if (!formData.items[i].item) { toast.error(`Item missing in row ${i+1}`); return false; }
      if (!formData.items[i].warehouse) { toast.error(`Warehouse missing in row ${i+1}`); return false; }
      if (Number(formData.items[i].quantity) <= 0) { toast.error(`Quantity >0 in row ${i+1}`); return false; }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const fd = new FormData();
      const payload = {
        ...formData,
        invoiceDate: formData.invoiceDate,
        dueDate: formData.dueDate,
        orderDate: formData.orderDate,
        existingFiles,
        removedFiles,
        items: formData.items.map(it => ({
          ...it,
          item: typeof it.item === "object" ? it.item._id : it.item,
          warehouse: typeof it.warehouse === "object" ? it.warehouse._id : it.warehouse,
          variant: it.variant || null,
        })),
        payments: formData.payments,
      };
      fd.append("invoiceData", JSON.stringify(payload));
      attachments.forEach(file => fd.append("attachments", file));

      const url = isEdit ? `/api/sales-invoice?id=${editId}` : "/api/sales-invoice";
      const method = isEdit ? "put" : "post";
      await axios({ method, url, data: fd, headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });
      toast.success(isEdit ? "Invoice updated" : "Invoice created");
      router.push("/admin/sales-invoice-view");
    } catch (err) {
      toast.error(err.response?.data?.error || "Error saving invoice");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-10 text-center text-gray-400 font-bold">Loading Invoice...</div>;

  // ──────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/sales-invoice-view")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
          <FaArrowLeft className="text-xs" /> Back to List
        </button>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">{isEdit ? "Edit Sales Invoice" : "New Sales Invoice"}</h1>

        {/* ─── Copy from SO / Delivery Challan ─────────────────── */}
        <SectionCard icon={FaCopy} title="Copy from Existing Document" color="purple">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[150px]">
              <Lbl text="Document Type" />
              <select className={fi()} value={sourceType} onChange={e => setSourceType(e.target.value)}>
                <option value="salesOrder">Sales Order</option>
                <option value="deliveryChallan">Delivery Challan</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <Lbl text="Order / Challan Number" />
              <div className="flex gap-2">
                <input className={fi()} value={sourceNumber} onChange={e => setSourceNumber(e.target.value)} placeholder="Enter number" />
                <button onClick={searchSourceDocuments} className="bg-gray-200 px-4 rounded-lg font-semibold text-sm">Search</button>
              </div>
            </div>
          </div>
          {sourceSearchResults.length > 0 && (
            <div className="mt-3 border rounded-xl overflow-hidden">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50"><tr><th className="px-4 py-2 text-left">Number</th><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2">Action</th></tr></thead>
                <tbody>
                  {sourceSearchResults.map(doc => (
                    <tr key={doc._id} className="border-t">
                      <td className="px-4 py-2">{doc.orderNumber || doc.challanNumber}</td>
                      <td className="px-4 py-2">{formatDateForInput(doc.orderDate || doc.date)}</td>
                      <td className="px-4 py-2 text-center"><button onClick={() => applySourceData(doc)} className="text-indigo-600 font-semibold text-xs">Use this</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        {/* ─── Customer Section ────────────────────────────────── */}
        <SectionCard icon={FaUser} title="Customer Details" color="indigo">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Lbl text="Customer Name" req />
              <CustomerSearch
                onSelectCustomer={(c) => {
                  setSelectedCustomer(c);
                  setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }));
                }}
                initialCustomer={selectedCustomer ? { _id: selectedCustomer._id, customerName: selectedCustomer.customerName } : undefined}
              />
            </div>
            <ReadField label="Customer Name" value={formData.customerName} />
            <ReadField label="Customer Code" value={formData.customerCode} />
            <ReadField label="Contact Person" value={formData.contactPerson} />
            <div><Lbl text="Reference No." /><input className={fi(isReadOnly)} name="refNumber" value={formData.refNumber || ""} onChange={handleInputChange} readOnly={isReadOnly} /></div>
          </div>
        </SectionCard>

        {/* ─── Addresses ───────────────────────────────────────── */}
        <div className="mb-5">
          <CustomerAddressSelector
            customer={selectedCustomer}
            selectedBillingAddress={formData.billingAddress}
            selectedShippingAddress={formData.shippingAddress}
            onBillingAddressSelect={(a) => setFormData(p => ({ ...p, billingAddress: a }))}
            onShippingAddressSelect={(a) => setFormData(p => ({ ...p, shippingAddress: a }))}
          />
        </div>

        {/* ─── Dates & Status ──────────────────────────────────── */}
        <SectionCard icon={FaCalendarAlt} title="Invoice Details" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Invoice Date" req /><input type="date" className={fi(isReadOnly)} name="invoiceDate" value={formData.invoiceDate} onChange={handleInputChange} readOnly={isReadOnly} /></div>
            <div><Lbl text="Due Date" /><input type="date" className={fi(isReadOnly)} name="dueDate" value={formData.dueDate} onChange={handleInputChange} readOnly={isReadOnly} /></div>
            <div><Lbl text="Order Date" /><input type="date" className={fi(isReadOnly)} name="orderDate" value={formData.orderDate} onChange={handleInputChange} readOnly={isReadOnly} /></div>
            <div><Lbl text="Status" /><select className={fi(isReadOnly)} name="status" value={formData.status} onChange={handleInputChange} disabled={isReadOnly}><option>Open</option><option>Pending</option><option>Paid</option><option>Cancelled</option></select></div>
          </div>
        </SectionCard>

        {/* ─── Warehouse Quick Action (identical to SO page) ────── */}
        {warehouses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-amber-50/40">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-500"><FaWarehouse className="text-sm" /></div>
              <div><p className="text-sm font-bold text-gray-900">Warehouse Assignment</p><p className="text-xs text-gray-400">Set a warehouse and apply to all items</p></div>
            </div>
            <div className="px-6 py-5">
              <div className="flex flex-wrap items-center gap-3">
                <select className="px-3 py-2 rounded-lg border border-gray-200 text-sm bg-white focus:border-indigo-400" value={selectedGlobalWarehouse} onChange={e => setSelectedGlobalWarehouse(e.target.value)}>
                  <option value="">— Select Warehouse —</option>
                  {warehouses.map(wh => (<option key={wh._id} value={wh._id}>{wh.warehouseName} ({wh.warehouseCode})</option>))}
                </select>
                <button onClick={() => applyWarehouseToAll(selectedGlobalWarehouse)} disabled={!selectedGlobalWarehouse} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                  <FaCopy className="text-xs" /> Apply to All Items
                </button>
                {defaultWarehouse && (
                  <button onClick={applyDefaultWarehouseToAll} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700">
                    <FaCopy className="text-xs" /> Apply Default to All
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">This will overwrite the warehouse for <strong>all existing items</strong>. New rows will inherit the selected warehouse.</p>
            </div>
          </div>
        )}

        {/* ─── Line Items ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold flex items-center gap-2"><FaBoxOpen className="text-emerald-500" /> Line Items</div>
          <div className="p-4 overflow-x-auto">
            <ItemSection
              items={formData.items}
              onItemChange={handleItemChange}
              onAddItem={addItemRow}
              onRemoveItem={removeItemRow}
              computeItemValues={computeItemValues}
            />
          </div>
        </div>

        {/* ─── Financial Summary (with down payment & credits) ──── */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <ReadField label="Taxable Amount" value={`₹ ${formData.totalBeforeDiscount.toFixed(2)}`} />
            <ReadField label="GST Total" value={`₹ ${formData.gstTotal.toFixed(2)}`} />
            <div><Lbl text="Freight" /><input type="number" name="freight" value={formData.freight} onChange={handleInputChange} className={fi(isReadOnly)} readOnly={isReadOnly} /></div>
            <div><Lbl text="Rounding" /><input type="number" name="rounding" value={formData.rounding} onChange={handleInputChange} className={fi(isReadOnly)} readOnly={isReadOnly} /></div>
            <div><Lbl text="Down Payment" /><input type="number" name="totalDownPayment" value={formData.totalDownPayment} onChange={handleInputChange} className={fi(isReadOnly)} readOnly={isReadOnly} /></div>
            <div><Lbl text="Applied Credits" /><input type="number" name="appliedAmounts" value={formData.appliedAmounts} onChange={handleInputChange} className={fi(isReadOnly)} readOnly={isReadOnly} /></div>
            <div className="sm:col-span-2 lg:col-span-4"><Lbl text="Grand Total" /><div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 font-extrabold text-indigo-700">₹ {formData.grandTotal.toFixed(2)}</div></div>
          </div>
          <div className="mt-4"><Lbl text="Remarks / Notes" /><textarea className={`${fi(isReadOnly)} resize-none`} name="remarks" rows={2} value={formData.remarks || ""} onChange={handleInputChange} readOnly={isReadOnly} /></div>
        </SectionCard>

        {/* ─── Payment Details Section ─────────────────────────── */}
        <SectionCard icon={FaMoneyBillWave} title="Payment Details" color="green">
          <div className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm font-bold mb-3">Add a payment</p>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div><Lbl text="Amount" /><input type="number" className={fi()} value={paymentAmount} onChange={e => setPaymentAmount(Number(e.target.value))} placeholder="0" /></div>
                <div><Lbl text="Method" /><select className={fi()} value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}><option value="cash">Cash</option><option value="bank">Bank Transfer</option><option value="upi">UPI</option><option value="card">Card</option><option value="cheque">Cheque</option></select></div>
                {paymentMethod === "bank" && <div className="sm:col-span-2"><Lbl text="Bank Account" /><select className={fi()} value={paymentFields.bankAccountId} onChange={e => setPaymentFields({...paymentFields, bankAccountId: e.target.value})}><option value="">Select</option>{bankAccounts.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}</select></div>}
                {paymentMethod === "upi" && <><div><Lbl text="UPI ID" /><input className={fi()} value={paymentFields.upiId} onChange={e => setPaymentFields({...paymentFields, upiId: e.target.value})} /></div><div><Lbl text="Transaction ID" /><input className={fi()} value={paymentFields.transactionId} onChange={e => setPaymentFields({...paymentFields, transactionId: e.target.value})} /></div></>}
                {paymentMethod === "card" && <><div><Lbl text="Last 4 digits" /><input maxLength="4" className={fi()} value={paymentFields.cardLast4Digits} onChange={e => setPaymentFields({...paymentFields, cardLast4Digits: e.target.value})} /></div><div><Lbl text="Network" /><select className={fi()} value={paymentFields.cardNetwork} onChange={e => setPaymentFields({...paymentFields, cardNetwork: e.target.value})}><option>Visa</option><option>Mastercard</option><option>RuPay</option></select></div></>}
                {paymentMethod === "cheque" && <><div><Lbl text="Cheque No." /><input className={fi()} value={paymentFields.chequeNumber} onChange={e => setPaymentFields({...paymentFields, chequeNumber: e.target.value})} /></div><div><Lbl text="Cheque Date" /><input type="date" className={fi()} value={paymentFields.chequeDate} onChange={e => setPaymentFields({...paymentFields, chequeDate: e.target.value})} /></div></>}
                <div><Lbl text="Payment Date" /><input type="date" className={fi()} value={paymentFields.paymentDate} onChange={e => setPaymentFields({...paymentFields, paymentDate: e.target.value})} /></div>
                <div className="sm:col-span-3"><Lbl text="Notes" /><input className={fi()} value={paymentFields.notes} onChange={e => setPaymentFields({...paymentFields, notes: e.target.value})} /></div>
                <div className="flex items-end"><button onClick={addPayment} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">Add Payment</button></div>
              </div>
            </div>
            {formData.payments.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead><tr><th>Amount</th><th>Method</th><th>Details</th><th>Date</th><th></th></tr></thead>
                  <tbody>
                    {formData.payments.map((p, i) => (
                      <tr key={i}>
                        <td>₹{p.amount}</td><td className="capitalize">{p.method}</td>
                        <td className="text-xs text-gray-500">{p.upiId || p.transactionId || p.chequeNumber || (p.bankAccountId && bankAccounts.find(b=>b._id===p.bankAccountId)?.name)}</td>
                        <td>{p.paymentDate ? new Date(p.paymentDate).toLocaleDateString() : "—"}</td>
                        <td><button onClick={()=>removePayment(i)} className="text-red-500">Remove</button></td>
                      </tr>
                    ))}
                    <tr><td colSpan="4" className="text-right font-bold">Remaining Balance:</td><td className="font-bold">₹{formData.openBalance}</td></tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ─── Attachments (same as SO page) ────────────────────── */}
        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
          <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {existingFiles.map((file, idx) => (
              <div key={idx} className="relative border rounded-xl p-2 bg-gray-50 group">
                <div className="h-20 flex items-center justify-center overflow-hidden">
                  {file.fileUrl?.toLowerCase().endsWith(".pdf") ? (
                    <object data={file.fileUrl} type="application/pdf" className="h-full w-full pointer-events-none" />
                  ) : (
                    <img src={file.fileUrl} className="h-full object-cover" alt="attachment" />
                  )}
                </div>
                {!isReadOnly && (
                  <button onClick={() => removeExistingFile(file, idx)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg"><FaTimes /></button>
                )}
              </div>
            ))}
          </div>
          {!isReadOnly && (
            <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed border-gray-200 cursor-pointer hover:bg-indigo-50 transition-all group">
              <FaPaperclip className="text-gray-300 group-hover:text-indigo-400" />
              <span className="text-sm font-medium text-gray-400">Upload files (PDF, images)</span>
              <input type="file" multiple accept="image/*,application/pdf" hidden onChange={handleFileSelect} />
            </label>
          )}
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {attachments.map((file, idx) => {
                const url = URL.createObjectURL(file);
                return (
                  <div key={idx} className="relative border rounded-xl p-2 bg-gray-50">
                    <div className="h-20 flex items-center justify-center overflow-hidden">
                      {file.type === "application/pdf" ? <object data={url} type="application/pdf" className="h-full w-full pointer-events-none" /> : <img src={url} className="h-full object-cover" alt={file.name} />}
                    </div>
                    <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] shadow-lg"><FaTimes /></button>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* ─── Action Buttons ──────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/sales-invoice-view")} className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 font-bold text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting || isReadOnly} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${submitting || isReadOnly ? "bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}`}>
            {submitting ? "Saving..." : isEdit ? "Update Invoice" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}