"use client";

import axios from "axios";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaArrowLeft, FaEdit, FaUser, FaCalendarAlt,
  FaBoxOpen, FaCalculator, FaPaperclip, FaMapMarkerAlt
} from "react-icons/fa";

export default function CreditMemoDetail() {
  const { id } = useParams();
  const router  = useRouter();
  const [memo, setMemo]       = useState(null);
  const [error, setError]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchMemo = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/credit-note/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data?.data) setMemo(res.data.data);
        else setError("Credit memo not found");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch credit memo");
      } finally {
        setLoading(false);
      }
    };
    fetchMemo();
  }, [id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value || 0);
  const formatDate = (d) => d ? new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const StatusBadge = ({ status }) => {
    const map = {
      Approved:  "bg-emerald-50 text-emerald-700 border-emerald-200",
      Closed:    "bg-emerald-50 text-emerald-700 border-emerald-200",
      Pending:   "bg-amber-50 text-amber-700 border-amber-200",
      Open:      "bg-blue-50 text-blue-700 border-blue-200",
      Cancelled: "bg-red-50 text-red-700 border-red-200",
      Rejected:  "bg-red-50 text-red-700 border-red-200",
    };
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${map[status] || "bg-gray-100 text-gray-600 border-gray-200"}`}>
        {status || "—"}
      </span>
    );
  };

  const SectionCard = ({ icon: Icon, title, children, color = "indigo" }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-5">
      <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-${color}-50/40`}>
        <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-500`}><Icon className="text-sm" /></div>
        <p className="text-sm font-bold text-gray-900">{title}</p>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );

  const InfoRow = ({ label, value }) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      <span className="text-sm font-semibold text-gray-800">{value || "—"}</span>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading credit memo...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center"><p className="text-red-500 font-semibold">{error}</p>
        <button onClick={() => router.push("/admin/credit-memo-veiw")} className="mt-4 text-indigo-600 text-sm hover:underline">← Back to credit memos</button>
      </div>
    </div>
  );

  if (!memo) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        <button onClick={() => router.push("/admin/credit-memo-veiw")}
          className="flex items-center gap-1.5 text-indigo-600 font-semibold text-sm mb-4 hover:text-indigo-800 transition-colors">
          <FaArrowLeft className="text-xs" /> Back to Credit Memos
        </button>

        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Credit Memo</h1>
              <StatusBadge status={memo.status} />
            </div>
            <p className="text-sm text-gray-400">
              <span className="font-mono font-bold text-indigo-600">{memo.documentNumber || "—"}</span>
              {memo.refInvoice && <> · Ref Invoice: <span className="font-mono font-semibold text-gray-600">{memo.refInvoice}</span></>}
              {" · "} {formatDate(memo.memoDate)}
            </p>
          </div>
          <button onClick={() => router.push(`/admin/credit-memo-veiw/new?editId=${memo._id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FaEdit className="text-xs" /> Edit Credit Memo
          </button>
        </div>

        {/* Customer */}
        <SectionCard icon={FaUser} title="Customer Information" color="indigo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Customer Code"  value={memo.customerCode} />
            <InfoRow label="Customer Name"  value={memo.customerName} />
            <InfoRow label="Contact Person" value={memo.contactPerson} />
            <InfoRow label="Sales Employee" value={memo.salesEmployee} />
          </div>
        </SectionCard>

        {/* Dates */}
        <SectionCard icon={FaCalendarAlt} title="Memo Dates & Status" color="blue">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            <InfoRow label="Memo Date"      value={formatDate(memo.memoDate)} />
            <InfoRow label="Ref Invoice"    value={memo.refInvoice} />
            <InfoRow label="Reference No."  value={memo.refNumber} />
            <div className="flex flex-col gap-0.5">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</span>
              <StatusBadge status={memo.status} />
            </div>
          </div>
        </SectionCard>

        {/* Addresses */}
        {(memo.billingAddress || memo.shippingAddress) && (
          <SectionCard icon={FaMapMarkerAlt} title="Address Information" color="violet">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {memo.billingAddress && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-blue-500 mb-2">Billing Address</p>
                  <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 text-sm text-gray-700 space-y-0.5">
                    {memo.billingAddress.address1 && <p>{memo.billingAddress.address1}</p>}
                    {memo.billingAddress.address2 && <p>{memo.billingAddress.address2}</p>}
                    <p>{[memo.billingAddress.city, memo.billingAddress.state, memo.billingAddress.zip].filter(Boolean).join(", ")}</p>
                    {memo.billingAddress.country  && <p>{memo.billingAddress.country}</p>}
                  </div>
                </div>
              )}
              {memo.shippingAddress && (
                <div>
                  <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-500 mb-2">Shipping Address</p>
                  <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100 text-sm text-gray-700 space-y-0.5">
                    {memo.shippingAddress.address1 && <p>{memo.shippingAddress.address1}</p>}
                    {memo.shippingAddress.address2 && <p>{memo.shippingAddress.address2}</p>}
                    <p>{[memo.shippingAddress.city, memo.shippingAddress.state, memo.shippingAddress.zip].filter(Boolean).join(", ")}</p>
                    {memo.shippingAddress.country  && <p>{memo.shippingAddress.country}</p>}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Items */}
        <SectionCard icon={FaBoxOpen} title="Line Items" color="emerald">
          {memo.items && memo.items.length > 0 ? (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["#", "Item Code", "Item Name", "Description", "Warehouse", "Qty", "Unit Price", "Discount", "Tax", "Total"].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {memo.items.map((item, index) => (
                      <tr key={index} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="px-3 py-3 text-xs text-gray-300 font-mono">{index + 1}</td>
                        <td className="px-3 py-3"><span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.itemCode || "—"}</span></td>
                        <td className="px-3 py-3 font-semibold text-gray-800">{item.itemName}</td>
                        <td className="px-3 py-3 text-xs text-gray-500 max-w-[150px] truncate">{item.itemDescription}</td>
                        <td className="px-3 py-3 text-xs text-gray-500">{item.warehouseCode ? `${item.warehouseCode} - ${item.warehouseName}` : "—"}</td>
                        <td className="px-3 py-3 text-xs font-bold text-gray-800">{item.quantity}</td>
                        <td className="px-3 py-3 text-right text-xs font-semibold text-gray-700">{formatCurrency(item.unitPrice)}</td>
                        <td className="px-3 py-3 text-right text-xs text-gray-500">{formatCurrency(item.discount)}</td>
                        <td className="px-3 py-3 text-center text-xs">
                          <span className="font-semibold text-gray-600">{item.taxOption}: {item.gstRate}%</span>
                          <p className="text-gray-400">{formatCurrency(item.gstAmount)}</p>
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900">{formatCurrency(item.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden space-y-3">
                {memo.items.map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-[11px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{item.itemCode}</span>
                        <p className="font-bold text-gray-800 text-sm mt-1">{item.itemName}</p>
                      </div>
                      <span className="font-bold text-gray-900 text-sm">{formatCurrency(item.totalAmount)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-gray-500">
                      <span>Qty: <b className="text-gray-700">{item.quantity}</b></span>
                      <span>Price: <b className="text-gray-700">₹{item.unitPrice}</b></span>
                      <span>Tax: <b className="text-gray-700">{item.gstRate}%</b></span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-300"><div className="text-3xl mb-2">📦</div><p className="text-sm">No items available</p></div>
          )}
        </SectionCard>

        {/* Financial Summary */}
        <SectionCard icon={FaCalculator} title="Financial Summary" color="amber">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {[
              { label: "Total Before Discount", value: formatCurrency(memo.totalBeforeDiscount) },
              { label: "GST Total",             value: formatCurrency(memo.gstTotal) },
              { label: "Freight",               value: formatCurrency(memo.freight) },
              { label: "Rounding",              value: formatCurrency(memo.rounding) },
              { label: "Total Down Payment",    value: formatCurrency(memo.totalDownPayment) },
              { label: "Applied Amounts",       value: formatCurrency(memo.appliedAmounts) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-indigo-600 rounded-2xl p-4 text-white">
              <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Grand Total</p>
              <p className="text-2xl font-black">{formatCurrency(memo.grandTotal)}</p>
            </div>
            <div className="bg-gray-100 rounded-2xl p-4">
              <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Open Balance</p>
              <p className="text-2xl font-black text-gray-800">{formatCurrency(memo.openBalance)}</p>
            </div>
          </div>
          {memo.remarks && (
            <div className="mt-4 bg-yellow-50 border border-yellow-100 rounded-xl p-4">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-yellow-600 mb-1">Remarks</p>
              <p className="text-sm text-gray-700">{memo.remarks}</p>
            </div>
          )}
        </SectionCard>

        {/* Attachments */}
        {memo.attachments && memo.attachments.length > 0 && (
          <SectionCard icon={FaPaperclip} title="Attachments" color="gray">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {memo.attachments.map((att, i) => {
                const isImage = att.fileType?.startsWith("image/");
                const isPDF   = att.fileType === "application/pdf" || att.fileName?.toLowerCase().endsWith(".pdf");
                return (
                  <div key={i} className="border rounded-xl p-2 bg-gray-50 hover:shadow-md transition-all">
                    <div className="h-24 flex items-center justify-center overflow-hidden rounded-lg mb-2">
                      {isImage ? <img src={att.fileUrl} alt={att.fileName} className="h-full object-cover w-full rounded-lg" />
                        : isPDF ? <iframe src={att.fileUrl} className="w-full h-full rounded-lg" title="PDF" />
                        : <div className="text-3xl">📎</div>}
                    </div>
                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="block text-[10px] text-indigo-600 truncate font-semibold hover:underline">{att.fileName}</a>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 pb-10">
          <button onClick={() => router.push("/admin/credit-memo-veiw")}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-all">
            <FaArrowLeft className="text-xs" /> Back to List
          </button>
          <button onClick={() => router.push(`/admin/credit-memo-veiw/new?editId=${memo._id}`)}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <FaEdit className="text-xs" /> Edit Credit Memo
          </button>
        </div>
      </div>
    </div>
  );
}


// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function CreditNoteDetail() {
//   const { id } = useParams();
//   const [creditNote, setCreditNote] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchCreditNote = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) {
//           setError("Unauthorized: No token found");
//           setLoading(false);
//           return;
//         }

//         setLoading(true);
//         const res = await axios.get(`/api/credit-note/${id}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (res.data?.success && res.data.data) {
//           setCreditNote(res.data.data);
//         } else {
//           setError('Credit note not found');
//         }
//       } catch (error) {
//         console.error('Failed to fetch credit note:', error);
//         setError('Failed to fetch credit note details');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) fetchCreditNote();
//   }, [id]);

//   const formatCurrency = (value) =>
//     new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

//   const formatDate = (dateString) =>
//     dateString ? new Date(dateString).toLocaleDateString() : '-';

//   if (loading) {
//     return <div className="flex justify-center items-center h-screen text-xl">Loading credit note details...</div>;
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6">
//         <p className="text-red-600 text-xl">{error}</p>
//         <Link href="/admin/credit-notes-view">
//           <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
//             Back to Credit Notes List
//           </button>
//         </Link>
//       </div>
//     );
//   }

//   if (!creditNote) {
//     return (
//       <div className="container mx-auto p-6">
//         <p>Credit note not found</p>
//         <Link href="/admin/credit-notes-view">
//           <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
//             Back to Credit Notes List
//           </button>
//         </Link>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6">
//       {/* Back Button */}
//       <Link href="/admin/credit-notes-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//           ← Back to Credit Notes List
//         </button>
//       </Link>

//       <h1 className="text-3xl font-bold mb-6">Credit Note Details</h1>

//       {/* Customer Info & Credit Note Info */}
//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//           {/* Customer Info */}
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
//             <p><strong>Customer Code:</strong> {creditNote.customerCode}</p>
//             <p><strong>Customer Name:</strong> {creditNote.customerName}</p>
//             <p><strong>Contact Person:</strong> {creditNote.contactPerson}</p>
//             <p><strong>Sales Employee:</strong> {creditNote.salesEmployee || '-'}</p>
//           </div>

//           {/* Credit Note Info */}
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Credit Note Information</h2>
//             <p><strong>Reference Number:</strong> {creditNote.refNumber}</p>
//             <p><strong>Posting Date:</strong> {formatDate(creditNote.postingDate)}</p>
//             <p><strong>Valid Until:</strong> {formatDate(creditNote.validUntil)}</p>
//             <p><strong>Document Date:</strong> {formatDate(creditNote.documentDate)}</p>
//             <p>
//               <strong>Status:</strong>
//               <span className={`ml-2 px-2 py-1 rounded text-sm ${
//                 creditNote.status === "Confirmed" ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"
//               }`}>
//                 {creditNote.status}
//               </span>
//             </p>
//             <p><strong>From Quote:</strong> {creditNote.fromQuote ? 'Yes' : 'No'}</p>
//           </div>
//         </div>

//         {/* Financial Summary */}
//         <div className="mt-4 pt-4 border-t">
//           <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div>
//               <p><strong>Total Before Discount:</strong> {formatCurrency(creditNote.totalBeforeDiscount)}</p>
//               <p><strong>Freight:</strong> {formatCurrency(creditNote.freight)}</p>
//               <p><strong>Rounding:</strong> {formatCurrency(creditNote.rounding)}</p>
//             </div>
//             <div>
//               <p><strong>GST Total:</strong> {formatCurrency(creditNote.gstTotal)}</p>
//               <p><strong>Open Balance:</strong> {formatCurrency(creditNote.openBalance)}</p>
//             </div>
//           </div>
//           <div className="mt-4 pt-4 border-t text-xl font-bold">
//             <strong>Grand Total:</strong> {formatCurrency(creditNote.grandTotal)}
//           </div>
//         </div>

//         {/* Remarks */}
//         {creditNote.remarks && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-2">Remarks</h2>
//             <p className="text-gray-700">{creditNote.remarks}</p>
//           </div>
//         )}
//       </div>

//       {/* Items Table */}
//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <h2 className="text-2xl font-semibold mb-4">Credit Note Items</h2>
//         {creditNote.items && creditNote.items.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full border-collapse">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="border p-2">Item Code</th>
//                   <th className="border p-2">Item Name</th>
//                   <th className="border p-2">Description</th>
//                   <th className="border p-2">Quantity</th>
//                   <th className="border p-2">Unit Price</th>
//                   <th className="border p-2">Discount</th>
//                   <th className="border p-2">Tax</th>
//                   <th className="border p-2">Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {creditNote.items.map((item, index) => (
//                   <tr key={index} className="hover:bg-gray-50">
//                     <td className="border p-2">{item.itemCode}</td>
//                     <td className="border p-2">{item.itemName}</td>
//                     <td className="border p-2">{item.itemDescription}</td>
//                     <td className="border p-2">{item.quantity}</td>
//                     <td className="border p-2">{formatCurrency(item.unitPrice)}</td>
//                     <td className="border p-2">{formatCurrency(item.discount)}</td>
//                     <td className="border p-2">{item.gstType}%</td>
//                     <td className="border p-2">{formatCurrency(item.totalAmount)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p>No items available</p>
//         )}
//       </div>

//       {/* Actions */}
//       <div className="flex justify-end space-x-4">
//         <Link href="/admin/credit-memo-veiw">
//           <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//             Back to List
//           </button>
//         </Link>
//         <Link href={`/admin/credit-memo/?editId=${creditNote._id}`}>
//           <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
//             Edit Credit Note
//           </button>
//         </Link>
//       </div>
//     </div>
//   );
// }
