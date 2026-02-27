"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { jwtDecode } from "jwt-decode";
import { 
  FaUser, FaCalendarAlt, FaBoxOpen, FaCalculator, 
  FaPaperclip, FaArrowLeft, FaCheck, FaTimes, FaFileAlt 
} from "react-icons/fa";

/* ── Helpers ── */
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
    const sgst = cgst;
    return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst + sgst, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0 };
  }
  const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
  return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
};

const initialOrderState = {
  customerCode: "", customerName: "", contactPerson: "", refNumber: "",
  salesEmployee: "", status: "Open", orderDate: formatDate(new Date()),
  expectedDeliveryDate: "", billingAddress: null, shippingAddress: null,
  items: [{
    item: "", itemCode: "", itemName: "", itemDescription: "",
    quantity: 0, unitPrice: 0, discount: 0, freight: 0,
    taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0,
    igstAmount: 0, warehouse: "", warehouseName: "", warehouseCode: "",
  }],
  remarks: "", freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0, openBalance: 0,
};

/* ── UI Components ── */
const Lbl = ({ text, req }) => (
  <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
    {text}{req && <span className="text-red-500 ml-0.5">*</span>}
  </label>
);

const fi = (readOnly = false) =>
  `w-full px-3 py-2.5 rounded-lg border text-sm font-medium transition-all outline-none
   ${readOnly ? "border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed" 
              : "border-gray-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"}`;

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

/* ── Main Page ── */
export default function SalesOrderPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen text-gray-400">Loading Order Form...</div>}>
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const isReadOnly = !!editId && !isAdmin;
  const stableInitial = useMemo(() => initialOrderState, []);

  // Auth & Role check
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const d = jwtDecode(token);
      const roles = Array.isArray(d?.roles) ? d.roles : [];
      setIsAdmin(roles.includes("admin") || roles.includes("sales manager") || d?.type === "company");
    } catch (e) { console.error(e); }
  }, []);

  // Fetch Logic (Simplified for brevity, similar to your edit/copy logic)
  useEffect(() => {
    if (editId) {
      setLoading(true);
      axios.get(`/api/sales-order/${editId}`)
        .then(res => {
          const rec = res.data.data;
          setFormData(prev => ({ ...prev, ...rec, orderDate: formatDate(rec.orderDate) }));
          setExistingFiles(rec.attachments || []);
          setSelectedCustomer({ customerCode: rec.customerCode, customerName: rec.customerName });
        })
        .finally(() => setLoading(false));
    }
  }, [editId]);

  // Totals Calculation
  useEffect(() => {
    const totalBefore = formData.items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
    const gstTotal = formData.items.reduce((s, i) => s + i.gstAmount, 0);
    const grand = totalBefore + gstTotal + Number(formData.freight) + Number(formData.rounding);
    setFormData(prev => ({ ...prev, totalBeforeDiscount: round(totalBefore), gstTotal: round(gstTotal), grandTotal: round(grand) }));
  }, [formData.items, formData.freight, formData.rounding]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = new FormData();
      payload.append("orderData", JSON.stringify(formData));
      attachments.forEach(file => payload.append("newFiles", file));
      
      const res = editId 
        ? await axios.put(`/api/sales-order/${editId}`, payload) 
        : await axios.post("/api/sales-order", payload);

      if (res.data.success) {
        toast.success("Order saved successfully");
        router.push("/admin/sales-order-view");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Submit failed");
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="p-10 text-center text-gray-400">Loading Order Details...</div>;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">{editId ? "Edit Sales Order" : "Create Sales Order"}</h1>
            <p className="text-sm text-gray-400">Manage your sales transactions and inventory</p>
          </div>
          <span className={`px-4 py-1.5 rounded-full text-xs font-bold border ${formData.status === 'Open' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-100 text-gray-500'}`}>
            {formData.status}
          </span>
        </div>

        {/* 1. Customer Section */}
        <SectionCard icon={FaUser} title="Customer Information" color="indigo">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="md:col-span-2">
              <Lbl text="Search Customer" req />
              <CustomerSearch onSelectCustomer={(c) => {
                setSelectedCustomer(c);
                setFormData(p => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode }));
              }} />
            </div>
            <div><Lbl text="Customer Code" /><input className={fi(true)} value={formData.customerCode} readOnly /></div>
            <div><Lbl text="Reference No." /><input className={fi()} name="refNumber" value={formData.refNumber} onChange={(e) => setFormData(p => ({ ...p, refNumber: e.target.value }))} /></div>
          </div>
          <div className="mt-6 border-t pt-6">
            <CustomerAddressSelector 
              customer={selectedCustomer}
              selectedBillingAddress={formData.billingAddress}
              selectedShippingAddress={formData.shippingAddress}
              onBillingAddressSelect={(a) => setFormData(p => ({ ...p, billingAddress: a }))}
              onShippingAddressSelect={(a) => setFormData(p => ({ ...p, shippingAddress: a }))}
            />
          </div>
        </SectionCard>

        {/* 2. Dates Section */}
        <SectionCard icon={FaCalendarAlt} title="Order Dates" color="blue">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div><Lbl text="Order Date" req /><input type="date" className={fi()} value={formData.orderDate} onChange={(e) => setFormData(p => ({ ...p, orderDate: e.target.value }))} /></div>
            <div><Lbl text="Expected Delivery" /><input type="date" className={fi()} value={formData.expectedDeliveryDate} onChange={(e) => setFormData(p => ({ ...p, expectedDeliveryDate: e.target.value }))} /></div>
            <div>
              <Lbl text="Status" />
              <select className={fi()} value={formData.status} onChange={(e) => setFormData(p => ({ ...p, status: e.target.value }))}>
                <option>Open</option><option>Pending</option><option>Closed</option>
              </select>
            </div>
          </div>
        </SectionCard>

        {/* 3. Items Section */}
        <div className="mb-6">
          <SectionCard icon={FaBoxOpen} title="Line Items" color="emerald">
            <ItemSection 
              items={formData.items}
              onItemChange={(idx, e) => {
                const { name, value } = e.target;
                const newItems = [...formData.items];
                newItems[idx] = { ...newItems[idx], [name]: value, ...computeItemValues({ ...newItems[idx], [name]: value }) };
                setFormData(p => ({ ...p, items: newItems }));
              }}
              onAddItem={() => setFormData(p => ({ ...p, items: [...p.items, initialOrderState.items[0]] }))}
              onRemoveItem={(idx) => setFormData(p => ({ ...p, items: p.items.filter((_, i) => i !== idx) }))}
            />
          </SectionCard>
        </div>

        {/* 4. Totals & Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <SectionCard icon={FaPaperclip} title="Remarks & Files" color="gray">
              <Lbl text="Internal Remarks" />
              <textarea className={`${fi()} h-24 mb-4`} value={formData.remarks} onChange={(e) => setFormData(p => ({ ...p, remarks: e.target.value }))} />
              
              <Lbl text="Upload Attachments" />
              <input type="file" multiple className="text-xs mb-4" onChange={(e) => setAttachments(prev => [...prev, ...Array.from(e.target.files)])} />
              
              <div className="grid grid-cols-3 gap-2">
                {existingFiles.map((f, i) => (
                  <div key={i} className="p-2 border rounded-lg bg-gray-50 flex items-center justify-between">
                    <span className="text-[10px] truncate">{f.fileName}</span>
                    <FaTimes className="text-red-400 cursor-pointer" onClick={() => {
                       setExistingFiles(prev => prev.filter((_, idx) => idx !== i));
                       setRemovedFiles(prev => [...prev, f]);
                    }} />
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <SectionCard icon={FaCalculator} title="Grand Total" color="amber">
            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Subtotal</span><span>₹{formData.totalBeforeDiscount}</span></div>
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase"><span>Tax</span><span>₹{formData.gstTotal}</span></div>
              <div className="pt-2 border-t">
                <Lbl text="Freight" />
                <input type="number" className={fi()} value={formData.freight} onChange={(e) => setFormData(p => ({ ...p, freight: e.target.value }))} />
              </div>
              <div className="pt-4">
                <div className="bg-indigo-600 rounded-xl p-4 text-white">
                  <p className="text-[10px] uppercase font-bold opacity-80">Final Amount</p>
                  <p className="text-xl font-black">₹ {Number(formData.grandTotal).toLocaleString("en-IN")}</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 flex items-center justify-between border-t pt-6">
          <button onClick={() => router.back()} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm hover:bg-gray-200 transition-all">
            <FaArrowLeft /> Back
          </button>
          <button 
            onClick={handleSubmit} 
            disabled={submitting}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
          >
            {submitting ? "Processing..." : <><FaCheck /> {editId ? "Update Order" : "Confirm Order"}</>}
          </button>
        </div>

      </div>
    </div>
  );
}


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

// // Initial state
// const initialOrderState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   salesEmployee: "",
//   status: "Open",
 
//   orderDate: "",
//   expectedDeliveryDate: "",
//   billingAddress: null,
//   shippingAddress: null,
//   items: [{
//     item: "", itemCode: "", itemId: "", itemName: "", itemDescription: "",
//     quantity: 0, allowedQuantity: 0, receivedQuantity: 0,
//     unitPrice: 0, discount: 0, freight: 0,
//     taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
//     gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0,
//     igstAmount: 0, managedBy: "", batches: [], errorMessage: "",
//     warehouse: "", warehouseName: "", warehouseCode: "", warehouseId: "",
//     managedByBatch: true,
//   }],
//   remarks: "",
//   freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
//   totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
//   openBalance: 0, fromQuote: false,
//   attachments: [],
// };

// // Helper functions
// const round = (num, d = 2) => {
//   const n = Number(num);
//   return isNaN(n) ? 0 : Number(n.toFixed(d));
// };

// function formatDate(d) {
//   if (!d) return "";
//   const date = new Date(d);
//   return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
// }

// const comparePrice = async (index, item) => {
//   if (!item.itemName) {
//     toast.error("Please select an item first");
//     return;
//   }

//   try {
//     const res = await axios.post("/api/check-price", {
//       itemName: item.itemName,
//     });

//     const { market, ai } = res.data;

//     setFormData(prev => {
//       const items = [...prev.items];

//       items[index] = {
//         ...items[index],
//         marketPrices: market,
//         aiSuggestion: ai,
//         unitPrice: ai.recommendedSellingPrice,
//         ...computeItemValues({
//           ...items[index],
//           unitPrice: ai.recommendedSellingPrice,
//         })
//       };

//       return { ...prev, items };
//     });

//     toast.success("Price compared successfully!");

//   } catch (err) {
//     toast.error("Error comparing price");
//   }
// };



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

// export default function SalesOrderPage() {
//   return (
//     <Suspense fallback={<div className="p-4">Loading...</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// function SalesOrderForm() {
//   const router = useRouter();
//   const params = useSearchParams();
//   const editId = params.get("editId");

//   const [attachments, setAttachments] = useState([]);
//   const [formData, setFormData] = useState(initialOrderState);
//   const [loading, setLoading] = useState(false);
//   const [isCopied, setIsCopied] = useState(false);
//   const [submitting, setSubmitting] = useState(false);
//   const [error, setError] = useState(null);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);
//   // const [existingFiles, setExistingFiles] = useState(null);
//   const [removedFiles, setRemovedFiles] = useState(null); // Initialize removedFiles
//   const [isNewCustomer, setIsNewCustomer] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   // const [attachmentsLoading, setAttachmentsLoading] = useState(true); // NEW STATE
//   const [existingFiles, setExistingFiles] = useState([]);
// const [attachmentsLoading, setAttachmentsLoading] = useState(false);


//   const base = "w-full p-2 border rounded";
//   const stableInitialOrderState = useMemo(() => initialOrderState, []);

//   // ✅ Define isReadOnly
//   const isReadOnly = !!editId && !isAdmin;

//   // Decode JWT for roles
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) return;
//     try {
//       const d = jwtDecode(token);
//       const roles = Array.isArray(d?.roles) ? d.roles : [];
//       const roleStr = d?.role ?? d?.userRole ?? null;
//       const isCompany = d?.type === "company" && !!d?.companyName;
//       const isAdminRole = roleStr === "Sales Manager" || roles.includes("admin") || roles.includes("sales manager");
//       setIsAdmin(isAdminRole || isCompany);
//     } catch (e) {
//       console.error("JWT decode error", e);
//     }
//   }, []);

//   // ✅ Load data from sessionStorage if isCopied is true
// useEffect(() => {
//   const key = "salesOrderData";
//   const stored = sessionStorage.getItem(key);
//   setAttachmentsLoading(true); // Start loading

//   if (!stored) {
//     setAttachmentsLoading(false);
//     return;
//   }

//   try {
//     const parsedData = JSON.parse(stored);

//     setFormData({ ...stableInitialOrderState, ...parsedData });
//     console.log("Parsed Data Attachments:", parsedData.attachments);

//     if (Array.isArray(parsedData.attachments) && parsedData.attachments.length > 0) {
//       const normalizedAttachments = parsedData.attachments
//         .map((file) => {
//           if (file?.fileUrl) {
//             return {
//               fileUrl: file.fileUrl,
//               fileName:
//                 file.fileName ||
//                 file.fileUrl.split("/").pop() ||
//                 "Attachment",
//               fileType:
//                 file.fileType ||
//                 (file.fileUrl.toLowerCase().endsWith(".pdf")
//                   ? "application/pdf"
//                   : "image/*"),
//             };
//           }
//           return null;
//         })
//         .filter(Boolean);

//       console.log("Normalized Attachments:", normalizedAttachments);
//       setExistingFiles(normalizedAttachments);
//     }

//     setIsCopied(true);
//   } catch (err) {
//     console.error("Error parsing session data:", err);
//   } finally {
//     sessionStorage.removeItem(key);
//     setAttachmentsLoading(false); // End loading
//   }
// }, [stableInitialOrderState]);

// // ✅ Track when existingFiles updates
// useEffect(() => {
//   console.log("Updated existingFiles:", existingFiles);
// }, [existingFiles]);



//   // ✅ Load existing Sales Order if editing
// // ✅ Load existing Sales Order if editing
// useEffect(() => {
//   if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//     setLoading(true);
//     axios.get(`/api/sales-order/${editId}`)
//       .then(res => {
//         const record = res.data.data;
//         const items = Array.isArray(record.items)
//           ? record.items.map(i => ({
//               ...stableInitialOrderState.items[0], ...i,
//               item: i.item?._id || i.item || "",
//               warehouse: i.warehouse?._id || i.warehouse || "",
//               taxOption: i.taxOption || "GST",
//             }))
//           : [...stableInitialOrderState.items];

//         setFormData({
//           ...stableInitialOrderState,
//           ...record,
//           items,
//           billingAddress: record.billingAddress || null,
//           shippingAddress: record.shippingAddress || null,
//           orderDate: formatDate(record.orderDate),
//           expectedDeliveryDate: formatDate(record.expectedDeliveryDate)
//         });

//         if (record.customerCode || record.customerName) {
//           setSelectedCustomer({
//             _id: record.customer || record.customerCode,
//             customerCode: record.customerCode,
//             customerName: record.customerName,
//             contactPersonName: record.contactPerson
//           });
//         }

//         if (!isCopied) {
//           setExistingFiles(
//             (record.attachments || []).map(f => ({
//               fileUrl: f.fileUrl || f.url,
//               fileName: f.fileName || "Attachment"
//             }))
//           );
//         }
//       })
//       .catch(err => setError(err.message || "Failed to load"))
//       .finally(() => setLoading(false));
//   }
// }, [editId, isCopied, stableInitialOrderState]);


//   // ✅ Totals calculation
//   useEffect(() => {
//     const items = Array.isArray(formData.items) ? formData.items : [];
//     const totalBeforeDiscount = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
//     const gstTotal = items.reduce((s, i) => s + i.gstAmount, 0);
//     const grandTotal = totalBeforeDiscount + gstTotal + formData.freight + formData.rounding;
//     const openBalance = grandTotal - (formData.totalDownPayment + formData.appliedAmounts);

//     setFormData(prev => ({ ...prev, totalBeforeDiscount: round(totalBeforeDiscount), gstTotal: round(gstTotal), grandTotal: round(grandTotal), openBalance: round(openBalance) }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);





//   const renderNewFilesPreview = () => (
//     attachments.length > 0 && (
//       <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-3">
//         {attachments.map((file, idx) => {
//           if (file instanceof File) {
//             const url = URL.createObjectURL(file);
//             const isPDF = file.type === "application/pdf";
//             return (
//               <div key={idx} className="relative border rounded p-2 text-center bg-slate-300">
//                 {isPDF ? (
//                   <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//                 ) : (
//                   <img src={url} alt={file.name} className="h-24 w-full object-cover rounded" />
//                 )}
//                 <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs">×</button>
//               </div>
//             );
//           }
//           return null;
//         })}
//       </div>
//     )
//   );


//   const onInput = (e) => {
//     const { name, value } = e.target;

//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleNewCustomerToggle = () => {
//     setIsNewCustomer((prev) => !prev);
//   };

//   const handleItemChange = (index, e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
//       updatedItems[index] = { ...updatedItems[index], ...computeItemValues(updatedItems[index]) };
//       return { ...prev, items: updatedItems };
//     });
//   };


//   const addItemRow = () => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           ...stableInitialOrderState.items[0],
//           item: "",
//           itemCode: "",
//           itemId: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           allowedQuantity:
//             0,
//           receivedQuantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,

//           taxOption: "GST",
//           gstRate: 0,
//           cgstRate: 0,
//           sgstRate: 0,
//           igstRate: 0,
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           warehouseId: "",
//           managedByBatch: true,
//         },
//       ],
//     }));
//   };


//   const removeItemRow = (index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   };

//   const handleCustomerSelect = (customer) => {
//     setSelectedCustomer(customer);
//     setFormData((prev) => ({
//       ...prev,
//       customer: customer._id || "",
//       customerCode: customer.customerCode || "",
//       customerName: customer.customerName || "",
//       contactPerson: customer.contactPersonName || "",
//     }));
//   };








//   // ✅ Totals calculation (duplicate, keeping the first one)


//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   };

//   const handleFileChange = (e) => {
//     if (isReadOnly) return;
//     const files = Array.from(e.target.files);
//     setAttachments((prev) => [...prev, ...files]);
//     e.target.value = "";
//   };

  

// const handleSubmit = async () => {
//   setSubmitting(true);
//   try {
//     const token = localStorage.getItem("token"); // or from cookies
//     if (!token) {
//       toast.error("User not authenticated");
//       setSubmitting(false);
//       return;
//     }

//     // ✅ Normalize items to ensure IDs are strings
//     const normalizedItems = formData.items.map(i => ({
//       ...i,
//       item: typeof i.item === "object" ? i.item._id : i.item,
//       warehouse: typeof i.warehouse === "object" ? i.warehouse._id : i.warehouse,
//     }));

//     // ✅ Prepare FormData
//     const formDataObj = new FormData();
//     formDataObj.append("orderData", JSON.stringify({
//       ...formData,
//       items: normalizedItems,
//       removedFiles, // Send removed file info if needed
//     }));

//     // ✅ Append new files
//     attachments.forEach(file => {
//       formDataObj.append("newFiles", file); // 'newFiles' matches backend
//     });

//     const res = editId
//       ? await axios.put(`/api/sales-order/${editId}`, formDataObj, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "multipart/form-data",
//           },
//         })
//       : await axios.post("/api/sales-order", formDataObj, {
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "multipart/form-data",
//           },
//         });

//     if (res.data.success) {
//       toast.success(editId ? "Order Updated" : "Order Created");
//       router.push("/admin/sales-order-view");
//     }
//   } catch (err) {
//     console.error("Error saving order:", err.response?.data || err.message);
//     toast.error(err.response?.data?.message || "Error saving order");
//   } finally {
//     setSubmitting(false);
//   }
// };





//   if (loading) return <div>Loading...</div>;
//   if (error) return <div className="text-red-500">{error}</div>;

//   return (
//     <div className="m-8 p-5 border shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Order" : "Create Sales Order"}
//       </h1>

//       {/* Customer & Meta */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">


//         <div>
//           <label className="mb-2 block font-medium">Customer Name</label>


//           {editId || isCopied ? (
//             <input
//               type="text"
//               name="customerName"
//               value={formData.customerName}
//               onChange={onInput}
//               className="w-full rounded border p-2"
//             />
//           ) : (

//             <>
//               {isNewCustomer ? (
//                 <>
//                   <input
//                     type="text"
//                     name="customerName"
//                     value={formData.customerName}
//                     onChange={onInput}
//                     placeholder="Enter new customer"
//                     className="w-full rounded border p-2"
//                   />
//                   <button
//                     type="button"
//                     onClick={handleNewCustomerToggle}
//                     className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
//                   >
//                     ⬅︎ Back to search
//                   </button>
//                 </>
//               ) : (
//                 <>


//                   <CustomerSearch onSelectCustomer={(c) => setFormData((p) => ({ ...p, customer: c._id, customerName: c.customerName, customerCode: c.customerCode, contactPerson: c.contactPersonName }))} />
//                   <button
//                     type="button"
//                     onClick={() => setIsNewCustomer(true)}
//                     className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
//                   >
//                     + Add new customer
//                   </button>
//                 </>
//               )}
//             </>
//           )}
//         </div>
//         <div>
//           <label className="font-medium">Customer Code</label>
//           <input name="customerCode" value={formData.customerCode} onChange={handleChange} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="font-medium">Contact Person</label>
//           <input name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full p-2 border bg-gray-100 rounded" />
//         </div>
//         <div>
//           <label className="font-medium">Reference No.</label>
//           <input name="refNumber" value={formData.refNumber} onChange={handleChange} className="w-full p-2 border rounded" />
//         </div>
//       </div>

//       {/* Customer Address Selection */}
//       <CustomerAddressSelector
//         customer={selectedCustomer}
//         selectedBillingAddress={formData.billingAddress}
//         selectedShippingAddress={formData.shippingAddress}
//         onBillingAddressSelect={(address) => setFormData(prev => ({ ...prev, billingAddress: address }))}
//         onShippingAddressSelect={(address) => setFormData(prev => ({ ...prev, shippingAddress: address }))}
//       />

//       {/* Dates & Status */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
//         <div>
//           <label className="font-medium">Order Date</label>
//           <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="font-medium">Expected Delivery</label>
//           <input type="date" name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="font-medium">Status</label>
//           <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
//             <option>Open</option> <option>Pending</option><option>Closed</option><option>Cancelled</option>
//           </select>
//         </div>

//       </div>

//       {/* Items */}


//       <ItemSection
//         items={formData.items}
//         onItemChange={handleItemChange}
//         onAddItem={addItemRow}
//         onRemoveItem={removeItemRow}
//         onComparePrice={comparePrice}
//         computeItemValues={computeItemValues}
//       />


//       {/* Totals */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
//         <div><label>Total Before Discount</label><input readOnly value={formData.totalBeforeDiscount} className="w-full p-2 border bg-gray-100 rounded" /></div>
//         <div><label>GST Total</label><input readOnly value={formData.gstTotal} className="w-full p-2 border bg-gray-100 rounded" /></div>
//         <div><label>Freight</label><input type="number" name="freight" value={formData.freight} onChange={handleChange} className="w-full p-2 border rounded" /></div>
//         <div><label>Rounding</label><input type="number" name="rounding" value={formData.rounding} onChange={handleChange} className="w-full p-2 border rounded" /></div>
//         <div><label>Grand Total</label><input readOnly value={formData.grandTotal} className="w-full p-2 border bg-gray-100 rounded" /></div>
//         <div><label>Open Balance</label><input readOnly value={formData.openBalance} className="w-full p-2 border bg-gray-100 rounded" /></div>
//       </div>

//       <div className="mt-6">
//         <label className="font-medium">Remarks</label>
//         <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3} className="w-full p-2 border rounded"></textarea>
//       </div>
//       {/* Attachments */}

// <div className="mt-6">
//   <label className="font-medium block mb-1">Attachments</label>

//   {attachmentsLoading ? (
//     <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//       Loading attachments...
//     </div>
//   ) : existingFiles && existingFiles.length > 0 ? (
//     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-4 bg-gray-100 p-3 rounded">
//       {existingFiles.map((file, idx) => {
//         const url = file.fileUrl;
//         const name = file.fileName;
//         const isPDF = file.fileType === "application/pdf" || url.toLowerCase().endsWith(".pdf");

//         return (
//           <div key={idx} className="relative border rounded p-2 text-center bg-slate-200">
//             {isPDF ? (
//               <object data={url} type="application/pdf" className="h-24 w-full rounded" />
//             ) : (
//               <img src={url} alt={name} className="h-24 w-full object-cover rounded" />
//             )}
//             <a
//               href={url}
//               target="_blank"
//               rel="noopener noreferrer"
//               className="block text-blue-600 text-xs mt-1 truncate"
//             >
//               {name}
//             </a>
//             {!isReadOnly && (
//               <button
//                 onClick={() => {
//                   setExistingFiles(prev => prev.filter((_, i) => i !== idx));
//                   setRemovedFiles(prev => [...(removedFiles || []), file]);
//                 }}
//                 className="absolute top-1 right-1 bg-red-600 text-white rounded px-1 text-xs"
//               >
//                 ×
//               </button>
//             )}
//           </div>
//         );
//       })}
//     </div>
//   ) : (
//     <div className="p-3 text-center text-gray-500 bg-gray-100 rounded border">
//       No attachments available
//     </div>
//   )}
// </div>




//       <div className="mt-6">
//         <label className="font-medium block mb-1">Attachments</label>

//         {/* Existing uploaded files */}
//         {/* {renderExistingFiles() || "No attachments available"} */}

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
//         {renderNewFilesPreview()}
//       </div>

//       {/* Buttons */}
//       <div className="mt-6 flex gap-4">
//         <button
//           onClick={handleSubmit}
//           disabled={submitting}
//           className={`px-4 py-2 rounded text-white ${
//             submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-500"
//           }`}
//         >
//           {submitting
//             ? "Saving..."
//             : editId
//               ? "Update Order"
//               : "Create Order"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialOrderState);
//             router.push("/admin/salesOrder");
//           }}
//           className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400"
//         >
//           Cancel
//         </button>
//       </div>
//     </div>
//   );
// }
