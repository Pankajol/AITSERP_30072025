'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaWarehouse, FaHistory, FaSpinner, FaShoppingCart, FaPrint, FaImage
} from 'react-icons/fa';
import { toast } from 'react-toastify';

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

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => (
  <div className={`flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-gray-100 bg-${color}-50/30`}>
    <div className={`w-8 h-8 rounded-xl bg-${color}-100 flex items-center justify-center text-${color}-600 text-sm shrink-0`}>
      <Icon />
    </div>
    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{title}</h3>
  </div>
);

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

export default function PurchaseOrderView() {
  const { id } = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      setError("Invalid or missing Purchase Order ID.");
      setLoading(false);
      return;
    }

    const fetchOrder = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          toast.error("Unauthorized: Please log in");
          setError("Unauthorized: Please log in");
          setLoading(false);
          return;
        }

        // ✅ Fix: Use query parameter instead of path parameter
        const res = await axios.get(`/api/purchase-order?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          setOrder(res.data.data);
          setError(null);
        } else {
          setError(res.data.error || "Failed to fetch purchase order.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.error || err.message);
        toast.error(err.response?.data?.error || "Failed to fetch order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest text-center">Loading Order Details...</p>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Error</h2>
        <p className="text-gray-500 mb-6 font-medium break-words">{error || "Data not available"}</p>
        <button onClick={() => router.back()} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700">
          Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Top Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-8">
          <button onClick={() => router.push("/admin/purchase-order-view")} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-all">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} 
              className="bg-white border border-gray-200 text-gray-600 px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-all">
              <FaPrint /> Print
            </button>
            <span className={`px-3 sm:px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 ${
              order.orderStatus === 'Open' 
                ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                : order.orderStatus === 'Closed' 
                ? 'bg-gray-100 text-gray-600 border-gray-200'
                : order.orderStatus === 'Cancelled'
                ? 'bg-red-50 text-red-600 border-red-100'
                : 'bg-amber-50 text-amber-600 border-amber-100'
            }`}>
              {order.orderStatus || 'Open'}
            </span>
          </div>
        </div>

        {/* --- Header Title --- */}
        <div className="mb-8 sm:mb-10">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
            <FaShoppingCart /> Purchase Order
          </p>
          <h1 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tighter uppercase break-words">
            {order.documentNumberPurchaseOrder || order.documentNumber || "Draft Order"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          
          {/* --- LEFT COLUMN: CORE DETAILS --- */}
          <div className="lg:col-span-8 space-y-6 sm:space-y-8">
            
            {/* Supplier Information */}
            <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Supplier Information" color="indigo" />
              <div className="p-4 sm:p-6 lg:p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Supplier Name" value={order.supplierName} />
                <DetailField label="Supplier Code" value={order.supplierCode} />
                <DetailField label="Contact Person" value={order.contactPerson} />
                <DetailField label="Reference Number" value={order.refNumber} />
              </div>
            </div>

            {/* Order Items Table */}
            <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Ordered Items List" color="emerald" />
              <div className="overflow-x-auto">
                <table className="min-w-[700px] w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left">Item Detail</th>
                      <th className="px-3 sm:px-4 py-3 sm:py-4 text-center">Qty</th>
                      <th className="px-3 sm:px-4 py-3 sm:py-4 text-right">Unit Price</th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {order.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                        <td className="px-4 sm:px-6 py-4 sm:py-6">
                          <div className="flex items-start gap-3">
                            <ItemImage 
                              src={item.imageUrl || item.item?.imageUrl} 
                              alt={item.itemName || item.item?.itemName} 
                              className="w-10 h-10 sm:w-12 sm:h-12" 
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs sm:text-sm font-black text-gray-900 break-words">
                                {item.itemName || item.item?.itemName}
                              </p>
                              <p className="text-[10px] sm:text-[11px] text-indigo-500 font-mono font-bold mt-1 break-all">
                                {item.itemCode || item.item?.itemCode}
                              </p>
                              {item.variant?.sku && (
                                <p className="text-[9px] sm:text-[10px] text-purple-600 font-bold mt-1">
                                  Variant: {item.variant.sku}
                                </p>
                              )}
                              {item.itemDescription && (
                                <p className="text-[9px] sm:text-[10px] text-gray-400 italic mt-1 line-clamp-2">
                                  {item.itemDescription}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-4 sm:py-6 text-center">
                          <p className="text-sm sm:text-base font-black text-gray-800">{item.quantity}</p>
                          <div className="flex items-center justify-center gap-1 mt-1 text-gray-400">
                            <FaWarehouse size={10} />
                            <span className="text-[8px] sm:text-[9px] font-bold uppercase truncate max-w-[80px]">
                              {item.warehouseName || 'Not Assigned'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-4 sm:py-6 text-right">
                          <p className="text-[11px] sm:text-xs font-black text-gray-700">
                            {formatCurrency(item.unitPrice)}
                          </p>
                          <p className="text-[8px] sm:text-[9px] text-indigo-600 font-bold mt-1 tracking-tighter uppercase">
                            {item.taxOption || 'GST'}: {item.gstRate || 0}%
                          </p>
                          {item.discount > 0 && (
                            <p className="text-[8px] sm:text-[9px] text-red-500 font-bold">
                              -{formatCurrency(item.discount)}
                            </p>
                          )}
                        </td>
                        <td className="px-4 sm:px-6 py-4 sm:py-6 text-right">
                          <p className="text-xs sm:text-sm font-black text-gray-900">
                            {formatCurrency(item.totalAmount)}
                          </p>
                          <p className="text-[8px] sm:text-[9px] text-gray-400 mt-1">
                            {item.taxOption === "IGST" 
                              ? `IGST: ${formatCurrency(item.igstAmount)}`
                              : `CGST: ${formatCurrency(item.cgstAmount)} | SGST: ${formatCurrency(item.sgstAmount)}`
                            }
                          </p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr className="border-b border-gray-100">
                      <td colSpan="3" className="px-4 sm:px-6 py-3 text-right font-black text-[10px] sm:text-xs uppercase text-gray-500">
                        Subtotal:
                       </td>
                      <td className="px-4 sm:px-6 py-3 text-right font-black text-sm sm:text-base">
                        {formatCurrency(order.totalBeforeDiscount)}
                       </td>
                    </tr>
                    {order.gstTotal > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-4 sm:px-6 py-2 text-right text-[10px] sm:text-xs text-gray-500">
                          GST Total:
                         </td>
                        <td className="px-4 sm:px-6 py-2 text-right text-xs sm:text-sm font-bold text-emerald-600">
                          {formatCurrency(order.gstTotal)}
                         </td>
                      </tr>
                    )}
                    {order.freight > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-4 sm:px-6 py-2 text-right text-[10px] sm:text-xs text-gray-500">
                          Freight:
                         </td>
                        <td className="px-4 sm:px-6 py-2 text-right text-xs sm:text-sm">
                          {formatCurrency(order.freight)}
                         </td>
                      </tr>
                    )}
                    {order.rounding !== 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-4 sm:px-6 py-2 text-right text-[10px] sm:text-xs text-gray-500">
                          Rounding:
                         </td>
                        <td className="px-4 sm:px-6 py-2 text-right text-xs sm:text-sm">
                          {formatCurrency(order.rounding)}
                         </td>
                      </tr>
                    )}
                    <tr className="bg-indigo-50/30">
                      <td colSpan="3" className="px-4 sm:px-6 py-4 text-right font-black text-sm sm:text-base uppercase text-indigo-700">
                        Grand Total:
                       </td>
                      <td className="px-4 sm:px-6 py-4 text-right text-xl sm:text-2xl font-black text-indigo-600">
                        {formatCurrency(order.grandTotal)}
                       </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {order.remarks && (
              <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-6">
                <Lbl text="Internal Remarks / Notes" />
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 mt-2 font-medium italic break-words">
                  "{order.remarks}"
                </p>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN: SUMMARY & TRACEABILITY --- */}
          <div className="lg:col-span-4 space-y-5 sm:space-y-6">
            
            {/* Financial Summary Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl sm:rounded-[2.5rem] shadow-2xl p-5 sm:p-8 text-white">
              <div className="flex items-center gap-2 mb-6 sm:mb-8 opacity-50">
                <FaCalculator />
                <h3 className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em]">Financial Totals</h3>
              </div>
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Taxable Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(order.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">Total GST</span>
                  <span className="font-mono text-sm text-emerald-400">{formatCurrency(order.gstTotal)}</span>
                </div>
                {order.freight > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50 font-bold uppercase">Freight</span>
                    <span className="font-mono text-sm">{formatCurrency(order.freight)}</span>
                  </div>
                )}
                {order.rounding !== 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50 font-bold uppercase">Rounding</span>
                    <span className="font-mono text-sm">{formatCurrency(order.rounding)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4 sm:pb-5">
                  <span className="opacity-50 font-bold uppercase">Balance Due</span>
                  <span className="font-mono text-sm">{formatCurrency(order.openBalance || order.grandTotal)}</span>
                </div>
                <div className="pt-3 sm:pt-4">
                  <span className="text-[9px] sm:text-[10px] font-black opacity-40 uppercase block mb-1">Grand Total</span>
                  <span className="text-2xl sm:text-4xl font-black tracking-tighter text-indigo-400 break-words">
                    {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Timeline" color="blue" />
              <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                <DetailField label="Document Number" value={order.documentNumberPurchaseOrder || order.documentNumber} />
                <DetailField label="Posting Date" value={formatDate(order.postingDate)} />
                <DetailField label="Document Date" value={formatDate(order.documentDate)} />
                <DetailField label="Valid Until" value={formatDate(order.validUntil)} color="text-rose-600" />
              </div>
            </div>

            {/* Attachments Section */}
            <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Attachments" color="purple" />
              <div className="p-4 sm:p-6">
                {order.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {order.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl sm:rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all group">
                        <FaFilePdf className="text-red-500 text-sm sm:text-base shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-black text-gray-900 truncate">{file.fileName || 'Attachment'}</p>
                          <p className="text-[8px] sm:text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter group-hover:text-indigo-600">View Document</p>
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

            {/* Audit Logs */}
            <div className="bg-white rounded-2xl sm:rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
                <DetailField label="Sales Employee" value={order.salesEmployee || "—"} />
                <DetailField label="Created At" value={formatDate(order.createdAt)} />
                <DetailField label="Last Updated" value={formatDate(order.updatedAt)} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// 'use client';

// import { useEffect, useState } from 'react';
// import { useParams, useRouter } from 'next/navigation';
// import axios from 'axios';
// import { FaSpinner } from 'react-icons/fa';

// export default function PurchaseOrderView() {
//   const { id } = useParams();
//   const router = useRouter();
//   const [order, setOrder] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState('');

//   useEffect(() => {
//     if (!id) {
//       setError('No purchase order ID provided.');
//       setLoading(false);
//       return;
//     }

//     axios
//       .get(`/api/purchase-order/${id}`)
//       .then((res) => {
//         if (res.data.success) {
//           setOrder(res.data.data);
//         } else {
//           setError(res.data.error || 'Purchase order not found.');
//         }
//       })
//       .catch((err) => {
//         console.error('Fetch error:', err);
//         setError(err.response?.data?.error || err.message);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }, [id]);

//   const formatCurrency = (v) =>
//     new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//     }).format(v || 0);

//   const formatDate = (d) => {
//     if (!d) return '-';
//     const dt = new Date(d);
//     return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('en-IN');
//   };

//   if (loading) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <FaSpinner className="animate-spin text-4xl text-orange-400" />
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6 text-center text-red-600">
//         <h2 className="text-2xl font-bold mb-4">Error</h2>
//         <p>{error}</p>
//         <button
//           onClick={() => router.push('/admin/purchase-order')}
//           className="mt-4 px-4 py-2 bg-orange-400 text-white rounded"
//         >
//           Back to Orders
//         </button>
//       </div>
//     );
//   }

//   return (
//     <div className="container mx-auto p-6 space-y-6 print-area">
//       {/* Header */}
//       <div className="flex justify-between items-center">
//         <h1 className="text-3xl font-bold">
//           Purchase Order #{order.refNumber || 'N/A'}
//         </h1>
//         <div className="flex gap-2">
//           <button
//             onClick={() => window.print()}
//             className="px-4 py-2 bg-blue-500 text-white rounded"
//           >
//             Download / Print
//           </button>
//           <button
//             onClick={() => router.push('/admin/purchase-order')}
//             className="px-4 py-2 bg-indigo-600 text-white rounded"
//           >
//             Back to List
//           </button>
//         </div>
//       </div>

//       {/* Supplier & Info */}
//       <div className="bg-white shadow-md rounded-lg p-6 grid md:grid-cols-2 gap-6">
//         <div>
//           <h2 className="text-xl font-semibold mb-2">Supplier Details</h2>
//           <p><strong>Code:</strong> {order.supplierCode || '-'}</p>
//           <p><strong>Name:</strong> {order.supplierName || '-'}</p>
//           <p><strong>Contact:</strong> {order.contactPerson || '-'}</p>
//         </div>
//         <div>
//           <h2 className="text-xl font-semibold mb-2">Order Info</h2>
//           <p><strong>Status:</strong> {order.status}</p>
//           <p><strong>Invoice Type:</strong> {order.invoiceType}</p>
//           <p><strong>Posting Date:</strong> {formatDate(order.postingDate)}</p>
//           <p><strong>Valid Until:</strong> {formatDate(order.validUntil)}</p>
//         </div>
//       </div>

//       {/* Items Table */}
//       <div className="bg-white shadow-md rounded-lg p-6">
//         <h2 className="text-2xl font-semibold mb-4">Items</h2>
//         {order.items?.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full divide-y divide-gray-200">
//               <thead className="bg-gray-50">
//                 <tr>
//                   {['Code', 'Name', 'Qty', 'Unit Price', 'Discount', 'Tax', 'Total'].map((h) => (
//                     <th key={h} className="px-4 py-2 text-left text-sm font-medium text-gray-600">
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody className="bg-white divide-y divide-gray-200">
//                 {order.items.map((it, i) => (
//                   <tr key={i} className="hover:bg-gray-50">
//                     <td className="px-4 py-2">{it.itemCode || '-'}</td>
//                     <td className="px-4 py-2">{it.itemName || '-'}</td>
//                     <td className="px-4 py-2">{it.quantity}</td>
//                     <td className="px-4 py-2">{formatCurrency(it.unitPrice)}</td>
//                     <td className="px-4 py-2">{formatCurrency(it.discount)}</td>
//                     <td className="px-4 py-2">
//                       {it.taxOption} {it.gstRate}% (
//                       {formatCurrency(it.taxOption === 'IGST' ? it.igstAmount : it.gstAmount)})
//                     </td>
//                     <td className="px-4 py-2 font-semibold">{formatCurrency(it.totalAmount)}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-gray-500">No items found.</p>
//         )}
//       </div>

//       {/* Financial Summary */}
//       <div className="bg-white shadow-md rounded-lg p-6 grid md:grid-cols-2 gap-6">
//         <div>
//           <p><strong>Total Before Discount:</strong> {formatCurrency(order.totalBeforeDiscount)}</p>
//           <p><strong>Freight:</strong> {formatCurrency(order.freight)}</p>
//           <p><strong>Rounding:</strong> {formatCurrency(order.rounding)}</p>
//         </div>
//         <div>
//           <p><strong>GST Total:</strong> {formatCurrency(order.gstTotal)}</p>
//           <p><strong>Grand Total:</strong> {formatCurrency(order.grandTotal)}</p>
//           <p><strong>Open Balance:</strong> {formatCurrency(order.openBalance)}</p>
//         </div>
//       </div>
//     </div>
//   );
// }
