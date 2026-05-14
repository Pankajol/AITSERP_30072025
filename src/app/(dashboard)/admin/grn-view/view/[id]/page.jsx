'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaPrint, FaWarehouse, FaCalculator, FaBoxes, 
  FaUser, FaBoxOpen, FaCalendarAlt, FaPaperclip, FaHistory, 
  FaFilePdf, FaSpinner, FaInfoCircle, FaImage
} from 'react-icons/fa';

// --- UI Helpers ---
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
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

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => {
  const colorClasses = {
    indigo: "bg-indigo-50/30 border-indigo-100",
    emerald: "bg-emerald-50/30 border-emerald-100",
    blue: "bg-blue-50/30 border-blue-100",
    purple: "bg-purple-50/30 border-purple-100",
    orange: "bg-orange-50/30 border-orange-100",
  };
  const iconBgClasses = {
    indigo: "bg-indigo-100 text-indigo-600",
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    orange: "bg-orange-100 text-orange-600",
  };
  return (
    <div className={`flex items-center gap-2 px-6 py-4 border-b border-gray-100 ${colorClasses[color] || colorClasses.indigo}`}>
      <div className={`w-8 h-8 rounded-xl ${iconBgClasses[color] || iconBgClasses.indigo} flex items-center justify-center text-sm`}>
        <Icon />
      </div>
      <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{title}</h3>
    </div>
  );
};

// Item Image Component
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

// Status Badge Component
const StatusBadge = ({ status }) => {
  const map = {
    Received: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Partial: "bg-amber-50 text-amber-600 border-amber-100",
    Open: "bg-blue-50 text-blue-600 border-blue-100",
    Closed: "bg-gray-50 text-gray-600 border-gray-200",
    Completed: "bg-emerald-50 text-emerald-600 border-emerald-100",
  };
  const style = map[status] || "bg-gray-50 text-gray-600 border-gray-200";
  return (
    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 ${style}`}>
      {status || 'Received'}
    </span>
  );
};

export default function GRNView() {
  const { id } = useParams();
  const router = useRouter();
  const [grn, setGrn] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchGRN = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Unauthorized: Please log in");
          setLoading(false);
          return;
        }

        const res = await axios.get(`/api/grn?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setGrn(res.data.data);
          setError(null);
        } else {
          setError(res.data.error || "GRN record not found.");
        }
      } catch (err) {
        console.error("Error fetching GRN:", err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchGRN();
  }, [id]);

  const getItemImageUrl = (item) => {
    if (item.imageUrl) return item.imageUrl;
    if (item.item?.imageUrl) return item.item.imageUrl;
    if (item.variant?.variantImageUrl) return item.variant.variantImageUrl;
    if (item.variant?.imageUrl) return item.variant.imageUrl;
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
        <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Loading GRN Data...</p>
      </div>
    );
  }

  if (error || !grn) {
    return (
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
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.back()} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-all">
            <FaArrowLeft /> Back to list
          </button>
          
          <div className="flex gap-3">
            <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2">
              <FaPrint /> Print Receipt
            </button>
            <StatusBadge status={grn.status} />
          </div>
        </div>

        {/* Header Title */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
            <FaBoxes /> Goods Receipt Note
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter uppercase break-words">
            {grn.documentNumberGrn || "GRN-INTERNAL"}
          </h1>
          {grn.purchaseOrderId && (
            <p className="text-sm text-gray-400 mt-1">
              Reference PO: {grn.purchaseOrderId?.documentNumberPurchaseOrder || grn.purchaseOrderId}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: CORE DETAILS */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Supplier Information */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Supplier Details" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Supplier Name" value={grn.supplierName || grn.supplier?.supplierName} />
                <DetailField label="Supplier Code" value={grn.supplierCode || grn.supplier?.supplierCode} />
                <DetailField label="Contact Person" value={grn.contactPerson} />
                <DetailField label="Reference Number" value={grn.refNumber || "—"} />
              </div>
            </div>

            {/* Received Items Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Received Items" color="emerald" />
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
                    {grn.items?.map((item, idx) => {
                      const imageUrl = getItemImageUrl(item);
                      const isVariant = item.variant || (item.itemCode !== item.item?.itemCode);
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
                                {item.warehouseName || item.warehouse?.warehouseName || 'Main Store'}
                              </span>
                            </div>
                           </td>
                          <td className="px-4 py-5 text-center align-top">
                            <p className="text-[11px] font-black text-gray-700">{formatCurrency(item.unitPrice)}</p>
                            <p className="text-[9px] text-indigo-600 font-bold mt-1 uppercase">{item.taxOption || 'GST'} {item.gstRate}%</p>
                            {item.discount > 0 && <p className="text-[9px] text-red-500">-{formatCurrency(item.discount)}</p>}
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
                      <td className="px-6 py-3 text-right font-black text-sm">{formatCurrency(grn.totalBeforeDiscount)}</td>
                    </tr>
                    {grn.gstTotal > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">GST Total:</td>
                        <td className="px-6 py-2 text-right text-sm font-bold text-emerald-600">{formatCurrency(grn.gstTotal)}</td>
                      </tr>
                    )}
                    {grn.freight > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Freight:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(grn.freight)}</td>
                      </tr>
                    )}
                    {grn.rounding !== 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Rounding:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(grn.rounding)}</td>
                      </tr>
                    )}
                    <tr className="bg-indigo-50/30">
                      <td colSpan="3" className="px-6 py-4 text-right font-black text-sm uppercase text-indigo-700">Grand Total:</td>
                      <td className="px-6 py-4 text-right text-2xl font-black text-indigo-600">{formatCurrency(grn.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {grn.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Receipt Notes / Remarks" />
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2 font-medium italic break-words">
                  "{grn.remarks}"
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: SUMMARY */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Financial Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 text-white">
              <div className="flex items-center gap-2 mb-6 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Inventory Valuation</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(grn.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">Tax Total</span>
                  <span className="font-mono text-sm text-emerald-400">{formatCurrency(grn.gstTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase">Freight</span>
                  <span className="font-mono text-sm">{formatCurrency(grn.freight || 0)}</span>
                </div>
                <div className="pt-3">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Total Valuation</span>
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter text-indigo-400 break-words">{formatCurrency(grn.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Logistics Dates */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Critical Timestamps" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Posting Date" value={formatDate(grn.postingDate)} />
                <DetailField label="Document Date" value={formatDate(grn.documentDate)} />
                {grn.validUntil && <DetailField label="Valid Until" value={formatDate(grn.validUntil)} />}
              </div>
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Attached Proofs" color="purple" />
              <div className="p-6">
                {grn.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {grn.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                          <FaFilePdf size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate">{file.fileName || 'Receipt_Doc'}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 group-hover:text-indigo-600">Click to view</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-300 font-black tracking-widest uppercase">No proof files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Traceability Audit */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Created At" value={formatDate(grn.createdAt)} />
                <DetailField label="Last Modification" value={formatDate(grn.updatedAt)} />
                <DetailField label="Created By" value={grn.createdBy?.name || "System"} />
              </div>
            </div>

          </div>
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

// export default function GRNDetail() {
//   const { id } = useParams();
//   const [grn, setGrn] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchGRN = async () => {
//       try {
//         const res = await axios.get(`/api/grn/${id}`);
//         console.log(res.data.data)
//         setGrn(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch GRN:', error);
//         setError('Failed to fetch GRN');
//       }
//     };

//     if (id) {
//       fetchGRN();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!grn) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/grn-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to GRN List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">GRN Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>GRN Number:</strong> {grn.grnNumber}</p>
//         <p><strong>Supplier Name:</strong> {grn.supplierName}</p>
//         <p><strong>GRN Date:</strong> {new Date(grn.grnDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {grn.status}</p>
//         <p><strong>Grand Total:</strong> {grn.grandTotal}</p>
//         <p><strong>Remarks:</strong> {grn.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {grn.items && grn.items.length > 0 ? (
//           <table className="min-w-full bg-white border border-gray-300">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Item Name</th>
//                 <th className="border p-2">Quantity</th>
//                 <th className="border p-2">Unit Price</th>
//                 <th className="border p-2">Discount</th>
//                 <th className="border p-2">Total Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {grn.items.map((item, index) => (
//                 <tr key={index} className="text-center">
//                   <td className="border p-2">{item.itemName}</td>
//                   <td className="border p-2">{item.quantity}</td>
//                   <td className="border p-2">{item.unitPrice}</td>
//                   <td className="border p-2">{item.discount}</td>
//                   <td className="border p-2">{item.totalAmount}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p>No items available.</p>
//         )}
//       </div>
//       <div className="mt-4">
//         <Link href={`/admin/grn-view/new?editId=${grn._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit GRN</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
