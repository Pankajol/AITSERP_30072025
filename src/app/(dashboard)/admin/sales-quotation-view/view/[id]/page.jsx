'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaWarehouse, FaHistory, FaSpinner, FaImage
} from 'react-icons/fa';

// --- UI Helpers ---
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2
  }).format(value || 0);
};

const Lbl = ({ text }) => (
  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{text}</p>
);

const DetailField = ({ label, value, color = "text-gray-900" }) => (
  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 break-words">
    <Lbl text={label} />
    <p className={`text-sm font-bold ${color} break-words`}>{value || "—"}</p>
  </div>
);

// Static color mapping for SectionHeader (avoid dynamic Tailwind)
const getSectionClasses = (color) => {
  const bgMap = {
    indigo: "bg-indigo-50/30 border-indigo-100",
    emerald: "bg-emerald-50/30 border-emerald-100",
    blue: "bg-blue-50/30 border-blue-100",
    purple: "bg-purple-50/30 border-purple-100",
    orange: "bg-orange-50/30 border-orange-100",
  };
  const iconBgMap = {
    indigo: "bg-indigo-100 text-indigo-600",
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };
  return {
    container: bgMap[color] || bgMap.indigo,
    icon: iconBgMap[color] || iconBgMap.indigo,
  };
};

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => {
  const classes = getSectionClasses(color);
  return (
    <div className={`flex items-center gap-2 px-6 py-4 border-b border-gray-100 ${classes.container}`}>
      <div className={`w-8 h-8 rounded-xl ${classes.icon} flex items-center justify-center text-sm`}>
        <Icon />
      </div>
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{title}</h3>
    </div>
  );
};

// Item Image Component with fallback
const ItemImage = ({ src, alt, className = "w-10 h-10" }) => {
  const [err, setErr] = useState(false);
  useEffect(() => { setErr(false); }, [src]);
  if (!src || err) {
    return (
      <div className={`${className} rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0`}>
        <FaImage className="text-gray-300 text-sm" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt || "Item"}
      className={`${className} object-cover rounded-xl border border-gray-200 shrink-0`}
      onError={() => setErr(true)}
    />
  );
};

export default function SalesQuotationView() {
  const { id } = useParams();
  const router = useRouter();
  const [quotation, setQuotation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchQuotation = async () => {
      try {
        setLoading(true);
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
          setError("Invalid quotation ID");
          setLoading(false);
          return;
        }

        const token = localStorage.getItem("token");
        if (!token) throw new Error("No token");

        // ✅ Use query parameter instead of path parameter
        const res = await axios.get(`/api/sales-quotation?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setQuotation(res.data.data);
          setError(null);
        } else {
          setError(res.data.error || "Quotation not found.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuotation();
  }, [id]);

  // Helper to get item image URL (prioritize variant)
  const getItemImageUrl = (item) => {
    if (item.imageUrl) return item.imageUrl;
    if (item.item?.imageUrl) return item.item.imageUrl;
    if (item.variant?.variantImageUrl) return item.variant.variantImageUrl;
    if (item.variant?.imageUrl) return item.variant.imageUrl;
    return null;
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Loading Quotation...</p>
    </div>
  );

  if (error || !quotation) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Error</h2>
        <p className="text-gray-500 mb-6 font-medium">{error || "Data not available"}</p>
        <button onClick={() => router.back()} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700">
          Go Back
        </button>
      </div>
    </div>
  );

  const docNumber = quotation.documentNumberQuatation || quotation.refNumber || "DRAFT";

  // Status badge colors
  const statusColor = {
    Draft: "bg-gray-100 text-gray-600 border-gray-200",
    Submitted: "bg-blue-50 text-blue-600 border-blue-100",
    Approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Rejected: "bg-red-50 text-red-600 border-red-100",
  }[quotation.status] || "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.back()} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-all">
            <FaArrowLeft /> Back to List
          </button>
          
          <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 ${statusColor}`}>
            {quotation.status}
          </span>
        </div>

        {/* Header Title */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1">Sales Quotation</p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter uppercase break-words">
            {docNumber}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: CORE DETAILS */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Customer Info */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Customer Information" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Customer Name" value={quotation.customerName} />
                <DetailField label="Customer Code" value={quotation.customerCode} />
                <DetailField label="Contact Person" value={quotation.contactPerson} />
                <DetailField label="Reference Number" value={quotation.refNumber} />
                <DetailField label="Sales Employee" value={quotation.salesEmployee} />
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Quoted Items" color="emerald" />
              <div className="overflow-x-auto">
                <table className="min-w-[800px] w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-6 py-4 text-left">Item</th>
                      <th className="px-4 py-4 text-center">Qty</th>
                      <th className="px-4 py-4 text-center">Unit Price</th>
                      <th className="px-6 py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {quotation.items?.map((item, idx) => {
                      const imageUrl = getItemImageUrl(item);
                      const isVariant = item.variant || (item.itemCode !== item.item?.itemCode);
                      const computedGST = item.taxOption === "IGST" ? item.igstAmount : (item.cgstAmount + item.sgstAmount);
                      return (
                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-start gap-3">
                              <ItemImage src={imageUrl} alt={item.itemName} className="w-12 h-12" />
                              <div>
                                <p className="text-sm font-black text-gray-900">{item.itemName || item.item?.itemName}</p>
                                <p className="text-[11px] text-indigo-500 font-mono font-bold mt-1">{item.itemCode || item.item?.itemCode}</p>
                                {isVariant && item.variant?.sku && (
                                  <p className="text-[10px] text-purple-600 font-bold mt-1">Variant: {item.variant.sku}</p>
                                )}
                                {item.itemDescription && (
                                  <p className="text-[10px] text-gray-400 italic mt-1">{item.itemDescription}</p>
                                )}
                              </div>
                            </div>
                           </td>
                          <td className="px-4 py-5 text-center align-top font-black text-gray-800">
                            {item.quantity}
                            <div className="flex items-center justify-center gap-1 mt-2 text-gray-400">
                              <FaWarehouse size={10} />
                              <span className="text-[9px] font-bold uppercase break-words max-w-[80px]">
                                {item.warehouseName || item.warehouse?.warehouseName || '—'}
                              </span>
                            </div>
                           </td>
                          <td className="px-4 py-5 text-center align-top">
                            <p className="text-[11px] font-black text-gray-700">{formatCurrency(item.unitPrice)}</p>
                            {item.discount > 0 && <p className="text-[9px] text-red-500">-{formatCurrency(item.discount)}</p>}
                            <p className="text-[9px] text-indigo-600 font-bold mt-1 uppercase">{item.taxOption || 'GST'} {item.gstRate}%</p>
                           </td>
                          <td className="px-6 py-5 text-right align-top font-black text-gray-900">
                            {formatCurrency(item.totalAmount)}
                            <p className="text-[9px] text-gray-400 mt-1">
                              {item.taxOption === "IGST"
                                ? `IGST: ${formatCurrency(item.igstAmount)}`
                                : `CGST: ${formatCurrency(item.cgstAmount)} | SGST: ${formatCurrency(item.sgstAmount)}`
                              }
                            </p>
                           </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr className="border-b border-gray-100">
                      <td colSpan="3" className="px-6 py-3 text-right font-black text-[10px] uppercase text-gray-500">Subtotal:</td>
                      <td className="px-6 py-3 text-right font-black text-sm">{formatCurrency(quotation.totalBeforeDiscount)}</td>
                    </tr>
                    {quotation.gstAmount > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">GST Total:</td>
                        <td className="px-6 py-2 text-right text-sm font-bold text-emerald-600">{formatCurrency(quotation.gstAmount)}</td>
                      </tr>
                    )}
                    {quotation.freight > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Freight:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(quotation.freight)}</td>
                      </tr>
                    )}
                    {quotation.rounding !== 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Rounding:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(quotation.rounding)}</td>
                      </tr>
                    )}
                    <tr className="bg-indigo-50/30">
                      <td colSpan="3" className="px-6 py-4 text-right font-black text-sm uppercase text-indigo-700">Grand Total:</td>
                      <td className="px-6 py-4 text-right text-2xl font-black text-indigo-600">{formatCurrency(quotation.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {quotation.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Internal Notes / Remarks" />
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2 font-medium break-words">
                  {quotation.remarks}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SUMMARY & LOGS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Financial Summary */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 text-white">
              <div className="flex items-center gap-2 mb-6 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Financial Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(quotation.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">GST Total</span>
                  <span className="font-mono text-sm text-emerald-400">{formatCurrency(quotation.gstAmount)}</span>
                </div>
                {quotation.freight > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50 font-bold uppercase">Freight</span>
                    <span className="font-mono text-sm">{formatCurrency(quotation.freight)}</span>
                  </div>
                )}
                {quotation.rounding !== 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50 font-bold uppercase">Rounding</span>
                    <span className="font-mono text-sm">{formatCurrency(quotation.rounding)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase">Balance Due</span>
                  <span className="font-mono text-sm">{formatCurrency(quotation.openBalance || quotation.grandTotal)}</span>
                </div>
                <div className="pt-3">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Grand Total</span>
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter text-indigo-400 break-words">
                    {formatCurrency(quotation.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Timeline" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Document Number" value={docNumber} />
                <DetailField label="Posting Date" value={formatDate(quotation.postingDate)} />
                <DetailField label="Document Date" value={formatDate(quotation.documentDate)} />
                <DetailField label="Valid Until" value={formatDate(quotation.validUntil)} color="text-blue-600" />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Attachments" color="purple" />
              <div className="p-6">
                {quotation.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {quotation.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                          <FaFilePdf size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate">{file.fileName || 'Document'}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 group-hover:text-indigo-600">View Document</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-300 font-black tracking-widest uppercase">No attachments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Info */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Created By" value={quotation.createdBy?.name || "System"} />
                <DetailField label="Created At" value={formatDate(quotation.createdAt)} />
                <DetailField label="Last Updated" value={formatDate(quotation.updatedAt)} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
// "use client";

// import { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import axios from "axios";
// import { FaSpinner } from "react-icons/fa";

// export default function PurchaseQuotationView() {
//   const { id } = useParams();
//   const [quotation, setQuotation] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!id) return;
//     setLoading(true);
//     axios
//       .get(`/api/sales-quotation/${id}`)
//       .then((res) => {
//         if (res.data.success) {
//           setQuotation(res.data.data);
//           setError(null);
//         } else {
//           setError(res.data.error || "Quotation not found.");
//         }
//       })
//       .catch((err) => {
//         console.error("Error fetching quotation:", err);
//         setError(err.message);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }, [id]);

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <FaSpinner className="animate-spin text-4xl text-gray-500" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6 text-center text-red-600">
//         <h2 className="text-2xl font-bold mb-4">Error</h2>
//         <p>{error}</p>
//       </div>
//     );
//   }

//   if (!quotation) {
//     return (
//       <div className="container mx-auto p-6 text-center">
//         <p>No quotation data available.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 space-y-6">
//       <h1 className="text-4xl font-bold text-center">Sales Quotation Details</h1>
      
//       {/* Basic Info Section */}
//       <div className="bg-white shadow-md rounded p-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//           <div>
//             <p className="text-lg">
//               <span className="font-bold">Reference Number:</span> {quotation.refNumber}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Supplier Name:</span> {quotation.supplierName}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Status:</span> {quotation.status}
//             </p>
//           </div>
//           <div>
//             <p className="text-lg">
//               <span className="font-bold">Posting Date:</span>{" "}
//               {quotation.postingDate ? new Date(quotation.postingDate).toLocaleDateString() : "-"}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Valid Until:</span>{" "}
//               {quotation.validUntil ? new Date(quotation.validUntil).toLocaleDateString() : "-"}
//             </p>
//             <p className="text-lg">
//               <span className="font-bold">Delivery Date:</span>{" "}
//               {quotation.documentDate ? new Date(quotation.documentDate).toLocaleDateString() : "-"}
//             </p>
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <div className="bg-white shadow-md rounded p-6">
//         <h2 className="text-2xl font-semibold mb-4">Items</h2>
//         {quotation.items && quotation.items.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
//                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {quotation.items.map((item, index) => (
//                   <tr key={index}>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.itemDescription || "N/A"}</td>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.quantity}</td>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.unitPrice}</td>
//                     <td className="px-6 py-4 whitespace-nowrap">{item.totalAmount}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-center text-gray-500">No items found.</p>
//         )}
//       </div>
//     </div>
//   );
// }
