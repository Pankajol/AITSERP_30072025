// "use client";

// import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import CustomerAddressSelector from "@/components/CustomerAddressSelector";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import { jwtDecode } from "jwt-decode";
// import { 
//   FaUser, FaCalendarAlt, FaBoxOpen, FaCalculator, 
//   FaPaperclip, FaArrowLeft, FaCheck, FaTimes, FaFileAlt 
// } from "react-icons/fa";

// /* ── Helpers ── */
// const round = (num, d = 2) => {
//   const n = Number(num);
//   return isNaN(n) ? 0 : Number(n.toFixed(d));
// };

// function formatDate(d) {
//   if (!d) return "";
//   const date = new Date(d);
//   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// }

// const computeItemValues = (item) => {
//   const qty = parseFloat(item.quantity) || 0;
//   const price = parseFloat(item.unitPrice) || 0;
//   const disc = parseFloat(item.discount) || 0;
//   const fr = parseFloat(item.freight) || 0;
//   const pad = round(price - disc);
//   const total = round(qty * pad + fr);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgst = round(total * (gstRate / 200));
//     const sgst = cgst;
//     return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst + sgst, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0 };
//   }
//   const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
//   return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
// };

// const initialOrderState = {
//   customerCode: "", customerName: "", contactPerson: "", refNumber: "",
//   salesEmployee: "", status: "Open", orderDate: formatDate(new Date()),
//   expectedDeliveryDate: "", billingAddress: null, shippingAddress: null,
//   items: [{
//     item: "", itemCode: "", itemName: "", itemDescription: "",
//     quantity: 0, unitPrice: 0, discount: 0, freight: 0,
//     taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
//     gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0,
//     igstAmount: 0, warehouse: "", warehouseName: "", warehouseCode: "",
//   }],
//   remarks: "", freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
//   totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0,
// };

// /* ── UI Components ── */
// const Lbl = ({ text, req }) => (
//   <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//     {text}{req && <span className="text-red-500 ml-0.5">*</span>}
//   </label>
// );

// const fi = (readOnly = false) =>
//   `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
//    ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" 
//               : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"}`;

// const SectionCard = ({ icon: Icon, title, subtitle, children, color = "indigo" }) => (
//   <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
//     <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
//       <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}>
//         <Icon className="text-sm" />
//       </div>
//       <div>
//         <p className="text-sm font-bold text-gray-900">{title}</p>
//         {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
//       </div>
//     </div>
//     <div className="px-6 py-5">{children}</div>
//   </div>
// );

// /* ── Main Page ── */
// export default function SalesOrderPage() {
//   return (
//     <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Order Form...</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// function SalesOrderForm() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const editId = params.get("editId");

//   const [formData, setFormData] = useState(initialOrderState);
//   const [attachments, setAttachments] = useState([]);
//   const [existingFiles, setExistingFiles] = useState([]);
//   const [removedFiles, setRemovedFiles] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);

//   const isReadOnly = !!editId && !isAdmin;
//   const stableInitial = useMemo(() => initialOrderState, []);

//   // Auth & Role check
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     try {
//       const d = jwtDecode(token);
//       const roles = Array.isArray(d?.roles) ? d.roles : [];
//       setIsAdmin(roles.includes("admin") || roles.includes("sales manager") || d?.type === "company");
//     } catch (e) { console.error(e); }
//   }, []);

//   // Fetch Logic (Simplified for brevity, similar to your edit/copy logic)
//   useEffect(() => {
//     if (editId) {
//       setLoading(true);
//       axios.get(`/api/sales-order/${editId}`)
//         .then(res => {
//           const rec = res.data.data;
//           setFormData(prev => ({ ...prev, ...rec, orderDate: formatDate(rec.orderDate) }));
//           setExistingFiles(rec.attachments || []);
//           setSelectedCustomer({ customerCode: rec.customerCode, customerName: rec.customerName });
//         })
//         .finally(() => setLoading(false));
//     }
//   }, [editId]);

//   // Totals Calculation
//   useEffect(() => {
//     const totalBefore = formData.items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
//     const gstTotal = formData.items.reduce((s, i) => s + i.gstAmount, 0);
//     const grand = totalBefore + gstTotal + Number(formData.freight) + Number(formData.rounding);
//     setFormData(prev => ({ ...prev, totalBeforeDiscount: round(totalBefore), gstTotal: round(gstTotal), grandTotal: round(grand) }));
//   }, [formData.items, formData.freight, formData.rounding]);

//   const handleSubmit = async () => {
//     setSubmitting(true);
//     try {
//       const payload = new FormData();
//       payload.append("orderData", JSON.stringify(formData));
//       attachments.forEach(file => payload.append("newFiles", file));
      
//       const res = editId 
//         ? await axios.put(`/api/sales-order/${editId}`, payload) 
//         : await axios.post("/api/sales-order", payload);

//       if (res.data.success) {
//         toast.success("Order saved successfully");
//         router.push("/admin/sales-order-view");
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Submit failed");
//     } finally { setSubmitting(false); }
//   };

//   if (loading) return <div className="p-10 text-center text-gray-400">Loading Order Details...</div>;

//   return (
//     <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
//       <div className="max-w-5xl mx-auto">
        
//         {/* Header */}
//         <div className="flex items-center justify-between mb-8">
//           <div>
//             <h1 className="text-2xl font-extrabold text-gray-900">{editId ? "Edit Sales Order" : "Create Sales Order"}</h1>
//             <p className="text-sm text-gray-400">Manage your sales transactions and inventory</p>
//           </div>
//           <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${formData.status === 'Open' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
//             {formData.status}
//           </span>
//         </div>

//         {/* 1. Customer Section */}
//         <SectionCard icon={FaUser} title="Customer Information" color="indigo">
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
//             <div className="md:col-span-2">
//               <Lbl text="Search Customer" req />
//               <CustomerSearch onSelectCustomer={(c) => {
//                 setSelectedCustomer(c);
//                 setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode }));
//               }} />
//             </div>
//             <div><Lbl text="Customer Code" /><input className={fi(true)} value={formData.customerCode} readOnly /></div>
//             <div><Lbl text="Reference No." /><input className={fi()} name="refNumber" value={formData.refNumber} onChange={(e) => setFormData(p => ({ ...p, refNumber: e.target.value }))} /></div>
//           </div>
//           <div className="mt-6 border-t pt-6">
//             <CustomerAddressSelector 
//               customer={selectedCustomer}
//               selectedBillingAddress={formData.billingAddress}
//               selectedShippingAddress={formData.shippingAddress}
//               onBillingAddressSelect={(a) => setFormData(p => ({ ...p, billingAddress: a }))}
//               onShippingAddressSelect={(a) => setFormData(p => ({ ...p, shippingAddress: a }))}
//             />
//           </div>
//         </SectionCard>

//         {/* 2. Dates Section */}
//         <SectionCard icon={FaCalendarAlt} title="Order Dates" color="blue">
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
//             <div><Lbl text="Order Date" req /><input type="date" className={fi()} value={formData.orderDate} onChange={(e) => setFormData(p => ({ ...p, orderDate: e.target.value }))} /></div>
//             <div><Lbl text="Expected Delivery" /><input type="date" className={fi()} value={formData.expectedDeliveryDate} onChange={(e) => setFormData(p => ({ ...p, expectedDeliveryDate: e.target.value }))} /></div>
//             <div>
//               <Lbl text="Status" />
//               <select className={fi()} value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}>
//                 <option>Open</option><option>Pending</option><option>Closed</option>
//               </select>
//             </div>
//           </div>
//         </SectionCard>

//         {/* 3. Items Section */}
//         <div className="mb-6">
//           <SectionCard icon={FaBoxOpen} title="Line Items" color="emerald">
//             <ItemSection 
//               items={formData.items}
//               onItemChange={(idx, e) => {
//                 const { name, value } = e.target;
//                 const newItems = [...formData.items];
//                 newItems[idx] = { ...newItems[idx], [name]: value, ...computeItemValues({ ...newItems[idx], [name]: value }) };
//                 setFormData(p => ({ ...p, items: newItems }));
//               }}
//               onAddItem={() => setFormData(p => ({ ...p, items: [...p.items, initialOrderState.items[0]] }))}
//               onRemoveItem={(idx) => setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
//             />
//           </SectionCard>
//         </div>

//         {/* 4. Totals & Summary */}
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//           <div className="md:col-span-2">
//             <SectionCard icon={FaPaperclip} title="Remarks & Files" color="gray">
//               <Lbl text="Internal Remarks" />
//               <textarea className={`${fi()} h-24 mb-4`} value={formData.remarks} onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))} />
              
//               <Lbl text="Upload Attachments" />
//               <input type="file" multiple className="text-xs mb-4" onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
              
//               <div className="grid grid-cols-3 gap-2">
//                 {existingFiles.map((f, i) => (
//                   <div key={i} className="p-2 border rounded-lg bg-gray-50 flex items-center justify-between">
//                     <span className="text-[10px] truncate">{f.fileName}</span>
//                     <FaTimes className="text-red-400 cursor-pointer" onClick={() => {
//                        setExistingFiles(prev => prev.filter((_, idx) => idx !== i));
//                        setRemovedFiles(prev => [...prev, f]);
//                     }} />
//                   </div>
//                 ))}
//               </div>
//             </SectionCard>
//           </div>

//           <SectionCard icon={FaCalculator} title="Grand Total" color="amber">
//             <div className="space-y-3">
//               <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Subtotal</span><span>₹{formData.totalBeforeDiscount}</span></div>
//               <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Tax</span><span>₹{formData.gstTotal}</span></div>
//               <div className="pt-2 border-t">
//                 <Lbl text="Freight" />
//                 <input type="number" className={fi()} value={formData.freight} onChange={(e) => setFormData(p => ({ ...p, freight: e.target.value }))} />
//               </div>
//               <div className="pt-4">
//                 <div className="bg-indigo-600 rounded-xl p-4 text-white">
//                   <p className="text-[10px] uppercase font-bold opacity-80">Final Amount</p>
//                   <p className="text-xl font-black">₹ {Number(formData.grandTotal).toLocaleString("en-IN")}</p>
//                 </div>
//               </div>
//             </div>
//           </SectionCard>
//         </div>

//         {/* Footer Actions */}
//         <div className="mt-8 flex items-center justify-between border-t pt-6">
//           <button onClick={() => router.back()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all">
//             <FaArrowLeft /> Back
//           </button>
//           <button 
//             onClick={handleSubmit} 
//             disabled={submitting}
//             className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
//           >
//             {submitting ? "Processing..." : <><FaCheck /> {editId ? "Update Order" : "Confirm Order"}</>}
//           </button>
//         </div>

//       </div>
//     </div>
//   );
// }


"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { 
  FaArrowLeft, FaCheck, FaUser, FaCalendarAlt, 
  FaBoxOpen, FaCalculator, FaPaperclip, FaTimes 
} from "react-icons/fa";

// ============================================================
// HELPERS & SUB-COMPONENTS (Defined OUTSIDE to prevent focus loss)
// ============================================================

const initialOrderState = {
  customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  salesEmployee: "", status: "Open",
  orderDate: "", expectedDeliveryDate: "",
  billingAddress: null, shippingAddress: null,
  items: [{
    item: "", itemCode: "", itemId: "", itemName: "", itemDescription: "",
    quantity: 0, allowedQuantity: 0, receivedQuantity: 0,
    unitPrice: 0, discount: 0, freight: 0,
    taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0,
    igstAmount: 0, managedBy: "", batches: [], errorMessage: "",
    warehouse: "", warehouseName: "", warehouseCode: "", warehouseId: "",
    managedByBatch: true,
  }],
  remarks: "", freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0, fromQuote: false,
  attachments: [],
};

const round = (num, d = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(d));
};

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const computeItemValues = (item) => {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discount) || 0;
  const fr = parseFloat(item.freight) || 0;
  const pad = round(price - disc);
  const total = round(qty * pad + fr);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgst = round(total * (gstRate / 200));
    return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst * 2, cgstAmount: cgst, sgstAmount: cgst, igstAmount: 0 };
  }
  const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
  return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
};

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

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function SalesOrderPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <SalesOrderForm />
    </Suspense>
  );
}

function SalesOrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("editId");

  const [formData, setFormData] = useState(initialOrderState);
  const [attachments, setAttachments] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [removedFiles, setRemovedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  const stableInitialOrderState = useMemo(() => initialOrderState, []);
  const isReadOnly = !!editId && !isAdmin;

  // Auth & Roles
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      setIsAdmin(roles.includes("admin") || roles.includes("sales manager") || d?.type === "company");
    } catch (e) { console.error(e); }
  }, []);

  // Load from Session (Copy Mode)
  useEffect(() => {
    const stored = sessionStorage.getItem("salesOrderData");
    if (!stored) return;
    setAttachmentsLoading(true);
    try {
      const parsedData = JSON.parse(stored);
      setFormData({ ...stableInitialOrderState, ...parsedData, orderDate: formatDate(new Date()) });
      if (Array.isArray(parsedData.attachments)) {
        setExistingFiles(parsedData.attachments.map(f => ({
          fileUrl: f.fileUrl,
          fileName: f.fileName || "Attachment",
          fileType: f.fileType || "image/*"
        })));
      }
      setIsCopied(true);
    } catch (err) { console.error(err); }
    finally { sessionStorage.removeItem("salesOrderData"); setAttachmentsLoading(false); }
  }, [stableInitialOrderState]);

  // Load for Edit
  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      axios.get(`/api/sales-order/${editId}`)
        .then(res => {
          const record = res.data.data;
          const items = Array.isArray(record.items) ? record.items.map(i => ({
            ...stableInitialOrderState.items[0], ...i,
            item: i.item?._id || i.item || "",
            warehouse: i.warehouse?._id || i.warehouse || "",
          })) : [...stableInitialOrderState.items];

          setFormData({ ...stableInitialOrderState, ...record, items, orderDate: formatDate(record.orderDate), expectedDeliveryDate: formatDate(record.expectedDeliveryDate) });
          if (record.customerCode) {
            setSelectedCustomer({ _id: record.customer, customerCode: record.customerCode, customerName: record.customerName });
          }
          if (!isCopied) {
            setExistingFiles((record.attachments || []).map(f => ({ fileUrl: f.fileUrl || f.url, fileName: f.fileName || "Attachment" })));
          }
        })
        .catch(err => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [editId, isCopied, stableInitialOrderState]);

  // Financial Calculations
  useEffect(() => {
    const items = Array.isArray(formData.items) ? formData.items : [];
    const totalBeforeDiscount = items.reduce((s, i) => s + (Number(i.unitPrice) * Number(i.quantity) - Number(i.discount)), 0);
    const gstTotal = items.reduce((s, i) => s + (Number(i.gstAmount) || 0), 0);
    const grandTotal = totalBeforeDiscount + gstTotal + Number(formData.freight) + Number(formData.rounding);
    const openBalance = grandTotal - (Number(formData.totalDownPayment) + Number(formData.appliedAmounts));

    setFormData(prev => ({
      ...prev,
      totalBeforeDiscount: round(totalBeforeDiscount),
      gstTotal: round(gstTotal),
      grandTotal: round(grandTotal),
      openBalance: round(openBalance)
    }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  const onInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleItemChange = (index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const updatedItem = { ...updatedItems[index], [name]: value };
      updatedItems[index] = { ...updatedItem, ...computeItemValues(updatedItem) };
      return { ...prev, items: updatedItems };
    });
  };

  const comparePrice = async (index, item) => {
    if (!item.itemName) return toast.error("Select item first");
    try {
      const res = await axios.post("/api/check-price", { itemName: item.itemName });
      const { ai } = res.data;
      setFormData(prev => {
        const items = [...prev.items];
        items[index] = { ...items[index], unitPrice: ai.recommendedSellingPrice, ...computeItemValues({ ...items[index], unitPrice: ai.recommendedSellingPrice }) };
        return { ...prev, items };
      });
      toast.success("Price compared!");
    } catch (err) { toast.error("Error comparing price"); }
  };
  const validateForm = () => {
    if (!formData.customerName || !formData.customerCode) {
      toast.error("Please select a valid customer.");
      return false;
    }
    if (!formData.orderDate) {
      toast.error("Order date is required.");
      return false;
    }
    if (formData.items.length === 0) {
      toast.error("At least one item is required.");
      return false;
    }

    for (let i = 0; i < formData.items.length; i++) {
      const item = formData.items[i];
      if (!item.item || item.item === "") {
        toast.error(`Item selection missing in row ${i + 1}`);
        return false;
      }
      if (!item.warehouse || item.warehouse === "") {
        toast.error(`Warehouse missing for item in row ${i + 1}`);
        return false;
      }
      if (Number(item.quantity) <= 0) {
        toast.error(`Quantity must be greater than 0 in row ${i + 1}`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const normalizedItems = formData.items.map(i => ({
        ...i,
        item: typeof i.item === "object" ? i.item._id : i.item,
        warehouse: typeof i.warehouse === "object" ? i.warehouse._id : i.warehouse,
      }));

      const fd = new FormData();
      fd.append("orderData", JSON.stringify({ ...formData, items: normalizedItems, removedFiles }));
      attachments.forEach(file => fd.append("newFiles", file));

      const res = editId
        ? await axios.put(`/api/sales-order/${editId}`, fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } })
        : await axios.post("/api/sales-order", fd, { headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } });

      if (res.data.success) {
        toast.success("Saved successfully");
        router.push("/admin/sales-order-view");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error saving order");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => router.push("/admin/sales-order-view")} className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4">
          <FaArrowLeft className="text-xs" /> Back
        </button>

        <SectionCard icon={FaUser} title="Customer Details" color="indigo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Lbl text="Customer Name" req />
              {editId || isCopied ? (
                <input key="edit-input" className={fi()} name="customerName" value={formData.customerName || ""} onChange={onInput} />
              ) : (
                isNewCustomer ? (
                  <div key="new-div" className="space-y-2">
                    <input className={fi()} name="customerName" value={formData.customerName || ""} onChange={onInput} placeholder="New customer" />
                    <button type="button" onClick={() => setIsNewCustomer(false)} className="text-[10px] text-gray-400">⬅ Back</button>
                  </div>
                ) : (
                  <div key="search-div" className="space-y-2">
                    <CustomerSearch onSelectCustomer={(c) => setFormData((p) => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }))} />
                    <button type="button" onClick={() => setIsNewCustomer(true)} className="text-[10px] text-indigo-600 font-bold">+ Add new</button>
                  </div>
                )
              )}
            </div>
            <div><Lbl text="Customer Code" /><input className={fi(true)} value={formData.customerCode} readOnly /></div>
            <div><Lbl text="Contact Person" /><input className={fi(true)} value={formData.contactPerson} readOnly /></div>
            <div><Lbl text="Reference No." /><input className={fi()} name="refNumber" value={formData.refNumber || ""} onChange={onInput} placeholder="PO-123" /></div>
          </div>
        </SectionCard>

        <div className="mb-5">
          <CustomerAddressSelector
            customer={selectedCustomer}
            selectedBillingAddress={formData.billingAddress}
            selectedShippingAddress={formData.shippingAddress}
            onBillingAddressSelect={(a) => setFormData(prev => ({ ...prev, billingAddress: a }))}
            onShippingAddressSelect={(a) => setFormData(prev => ({ ...prev, shippingAddress: a }))}
          />
        </div>

        <SectionCard icon={FaCalendarAlt} title="Scheduling" color="blue">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Order Date" req /><input type="date" className={fi()} name="orderDate" value={formData.orderDate || ""} onChange={onInput} /></div>
            <div><Lbl text="Expected Delivery" /><input type="date" className={fi()} name="expectedDeliveryDate" value={formData.expectedDeliveryDate || ""} onChange={onInput} /></div>
            <div>
              <Lbl text="Status" />
              <select className={fi()} name="status" value={formData.status} onChange={onInput}>
                <option>Open</option><option>Pending</option><option>Closed</option>
              </select>
            </div>
          </div>
        </SectionCard>

        <div className="bg-white rounded-2xl shadow-sm border mb-5 overflow-hidden">
          <div className="px-6 py-4 border-b bg-emerald-50/40 font-bold">Line Items</div>
          <div className="p-4 overflow-x-auto">
            <ItemSection items={formData.items} onItemChange={handleItemChange} onAddItem={() => setFormData(p => ({ ...p, items: [...p.items, { ...stableInitialOrderState.items[0] }] }))} onRemoveItem={(i) => setFormData(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} onComparePrice={comparePrice} computeItemValues={computeItemValues} />
          </div>
        </div>

        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Lbl text="Subtotal" /><input readOnly value={`₹ ${formData.totalBeforeDiscount}`} className={fi(true)} /></div>
            <div><Lbl text="GST Total" /><input readOnly value={`₹ ${formData.gstTotal}`} className={fi(true)} /></div>
            <div><Lbl text="Grand Total" /><div className="px-3 py-2.5 rounded-lg border-2 border-indigo-200 bg-indigo-50 text-indigo-700 font-extrabold">₹ {formData.grandTotal}</div></div>
          </div>
          <div className="mt-4">
            <Lbl text="Remarks" /><textarea name="remarks" value={formData.remarks || ""} onChange={onInput} rows={2} className={`${fi()} resize-none`} />
          </div>
        </SectionCard>

        <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
          <div className="mb-4">
            {existingFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {existingFiles.map((file, idx) => (
                  <div key={idx} className="relative group border rounded-xl p-2 bg-gray-50 transition-all hover:shadow-md">
                    <div className="h-20 flex items-center justify-center overflow-hidden rounded-lg">
                      {file.fileUrl?.toLowerCase().endsWith(".pdf") ? <object data={file.fileUrl} type="application/pdf" className="h-full w-full pointer-events-none" /> : <img src={file.fileUrl} className="h-full object-cover" />}
                    </div>
                    <button onClick={() => { setExistingFiles(prev => prev.filter((_, i) => i !== idx)); setRemovedFiles(prev => [...prev, file]); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                      <FaTimes />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <label className="flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer hover:bg-indigo-50 transition-all">
            <FaPaperclip className="text-gray-300" /><span className="text-sm font-medium text-gray-400">Click to upload files</span>
            <input type="file" multiple accept="image/*,application/pdf" hidden onChange={(e) => {
              const files = Array.from(e.target.files);
              setAttachments(prev => [...prev, ...files]);
              e.target.value = "";
            }} />
          </label>
        </SectionCard>

        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/sales-order-view")} className="px-6 py-2.5 rounded-xl bg-white border font-bold text-sm">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className={`px-8 py-2.5 rounded-xl text-white font-bold text-sm shadow-lg ${submitting ? "bg-gray-300" : "bg-indigo-600"}`}>
            {submitting ? "Processing..." : editId ? "Update Order" : "Create Order"}
          </button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}
