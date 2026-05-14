'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
  FaArrowLeft, FaEdit, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaMapMarkerAlt, FaWarehouse, FaHistory, FaImage
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

// --- Main Component Wrapper (Required for useSearchParams) ---
export default function SalesOrderDetailWrapper() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <SalesOrderDetail />
    </Suspense>
  );
}

function SalesOrderDetail() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const targetId = searchParams.get("editId") || id;
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to get item image URL (prioritize variant)
  const getItemImageUrl = (item) => {
    if (item.imageUrl) return item.imageUrl;
    if (item.item?.imageUrl) return item.item.imageUrl;
    if (item.variant?.variantImageUrl) return item.variant.variantImageUrl;
    if (item.variant?.imageUrl) return item.variant.imageUrl;
    return null;
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!targetId) return;
      
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        if (!token) throw new Error("No token");
        // ✅ Use query parameter
        const res = await axios.get(`/api/sales-order?id=${targetId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.data?.success) {
          setOrder(res.data.data);
        } else {
          setError(res.data?.message || 'Order details not found');
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [targetId]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Loading order details...</p>
    </div>
  );

  if (error || !order) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Error</h2>
        <p className="text-gray-500 mb-6 font-medium">{error || "Sales Order not found"}</p>
        <button onClick={() => router.push("/admin/sales-order-view")} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700">
          Return to List
        </button>
      </div>
    </div>
  );

  const docNumber = order.documentNumberOrder || order.refNumber || "DRAFT-ORDER";
  const statusColor = {
    Open: "bg-blue-50 text-blue-600 border-blue-100",
    Pending: "bg-amber-50 text-amber-600 border-amber-100",
    Closed: "bg-gray-50 text-gray-600 border-gray-200",
    Confirmed: "bg-emerald-50 text-emerald-600 border-emerald-100",
    Cancelled: "bg-red-50 text-red-600 border-red-100",
  }[order.status] || "bg-amber-50 text-amber-600 border-amber-100";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* --- Top Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.push("/admin/sales-order-view")} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-colors">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex items-center gap-3">
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 ${statusColor}`}>
              {order.status}
            </span>
            <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
              <button className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-50 transition-all shadow-sm">
                <FaEdit /> Edit Order
              </button>
            </Link>
          </div>
        </div>

        {/* --- Title --- */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1">Sales Order</p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter uppercase break-words">
            {docNumber}
          </h1>
          {order.quotation && (
            <p className="text-sm text-gray-400 mt-1">Based on Quotation: {order.quotation?.documentNumberQuatation || order.quotation}</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* --- LEFT COLUMN --- */}
          <div className="lg:col-span-8 space-y-8">
            {/* Customer Info */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Customer Information" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Customer Name" value={order.customerName} />
                <DetailField label="Customer Code" value={order.customerCode} />
                <DetailField label="Contact Person" value={order.contactPerson} />
                <DetailField label="Sales Employee" value={order.salesEmployee} />
                <DetailField label="Reference Number" value={order.refNumber} />
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaMapMarkerAlt} title="Addresses" color="blue" />
              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Lbl text="Billing Address" />
                  <div className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                    {order.billingAddress?.address1 ? (
                      <>
                        {order.billingAddress.address1}<br/>
                        {order.billingAddress.address2 && <>{order.billingAddress.address2}<br/></>}
                        {order.billingAddress.city}, {order.billingAddress.state} - {order.billingAddress.zip}<br/>
                        {order.billingAddress.country}
                      </>
                    ) : "No billing address"}
                  </div>
                </div>
                <div>
                  <Lbl text="Shipping Address" />
                  <div className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                    {order.shippingAddress?.address1 ? (
                      <>
                        {order.shippingAddress.address1}<br/>
                        {order.shippingAddress.address2 && <>{order.shippingAddress.address2}<br/></>}
                        {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.zip}<br/>
                        {order.shippingAddress.country}
                      </>
                    ) : "No shipping address"}
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Ordered Items" color="emerald" />
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
                    {order.items?.map((item, idx) => {
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
                      <td className="px-6 py-3 text-right font-black text-sm">{formatCurrency(order.totalBeforeDiscount)}</td>
                    </tr>
                    {order.gstAmount > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">GST Total:</td>
                        <td className="px-6 py-2 text-right text-sm font-bold text-emerald-600">{formatCurrency(order.gstAmount)}</td>
                      </tr>
                    )}
                    {order.freight > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Freight:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(order.freight)}</td>
                      </tr>
                    )}
                    {order.rounding !== 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Rounding:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(order.rounding)}</td>
                      </tr>
                    )}
                    <tr className="bg-indigo-50/30">
                      <td colSpan="3" className="px-6 py-4 text-right font-black text-sm uppercase text-indigo-700">Grand Total:</td>
                      <td className="px-6 py-4 text-right text-2xl font-black text-indigo-600">{formatCurrency(order.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {order.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Internal Remarks" />
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2 font-medium break-words">
                  {order.remarks}
                </p>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN --- */}
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
                  <span className="font-mono text-sm">{formatCurrency(order.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">GST Total</span>
                  <span className="font-mono text-sm text-emerald-400">{formatCurrency(order.gstAmount)}</span>
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
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase">Balance Due</span>
                  <span className="font-mono text-sm">{formatCurrency(order.openBalance || order.grandTotal)}</span>
                </div>
                <div className="pt-3">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Grand Total</span>
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter text-indigo-400 break-words">
                    {formatCurrency(order.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Timeline" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Order Date" value={formatDate(order.orderDate)} />
                <DetailField label="Expected Delivery" value={formatDate(order.expectedDeliveryDate)} color="text-blue-600" />
                <DetailField label="Posting Date" value={formatDate(order.postingDate)} />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Attachments" color="purple" />
              <div className="p-6">
                {order.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {order.attachments.map((file, idx) => (
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

            {/* Traceability */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Created By" value={order.createdBy?.name || "System"} />
                <DetailField label="Source" value={order.fromQuote ? "From Quotation" : "Direct Entry"} />
                <DetailField label="Linked Quotation" value={order.quotation?.documentNumberQuatation || order.quotation || "—"} />
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

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function InvoiceDetail() {
//   const { id } = useParams();
//   const [order, setOrder] = useState(null);
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchOrder = async () => {
//       try {
//         setLoading(true);
//         const res = await axios.get(`/api/sales-order/${id}`);
//         if (res.data && res.data.data) {
//           setOrder(res.data.data);
//         } else {
//           setError('Order not found');
//         }
//       } catch (error) {
//         console.error('Failed to fetch sales-order:', error);
//         setError('Failed to fetch sales-order');
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (id) {
//       fetchOrder();
//     }
//   }, [id]);

//   const formatCurrency = (value) => {
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//       minimumFractionDigits: 2
//     }).format(value || 0);
//   };

//   const formatDate = (dateString) => {
//     return dateString ? new Date(dateString).toLocaleDateString() : '-';
//   };

//   if (loading) {
//     return (
//       <div className="flex justify-center items-center h-screen">
//         <div className="text-xl">Loading...</div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="container mx-auto p-6">
//         <p className="text-red-600 text-xl">{error}</p>
//       </div>
//     );
//   }

//   if (!order) {
//     return <p>Order not found</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/sales-order-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//           ← Back to Order List
//         </button>
//       </Link>
      
//       <h1 className="text-3xl font-bold mb-6">Sales Order Details</h1>
      
//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
//             <div className="space-y-2">
//               <p><strong>Customer Code:</strong> {order.customerCode}</p>
//               <p><strong>Customer Name:</strong> {order.customerName}</p>
//               <p><strong>Contact Person:</strong> {order.contactPerson}</p>
//               <p><strong>Sales Employee:</strong> {order.salesEmployee || '-'}</p>
//             </div>
//           </div>
          
//           <div>
//             <h2 className="text-xl font-semibold mb-4">Order Information</h2>
//             <div className="space-y-2">
//               <p><strong>Order Number:</strong> {order.refNumber}</p>
//               <p><strong>Order Date:</strong> {formatDate(order.orderDate)}</p>
//               <p><strong>Expected Delivery:</strong> {formatDate(order.expectedDeliveryDate)}</p>
//               <p>
//                 <strong>Status:</strong> 
//                 <span className={`ml-2 px-2 py-1 rounded text-sm ${
//                   order.status === "Confirmed" 
//                     ? "bg-green-200 text-green-800" 
//                     : "bg-yellow-200 text-yellow-800"
//                 }`}>
//                   {order.status}
//                 </span>
//               </p>
//               <p><strong>From Quote:</strong> {order.fromQuote ? 'Yes' : 'No'}</p>
//             </div>
//           </div>
//         </div>
        
//         {/* Address Information */}
//         {(order.billingAddress || order.shippingAddress) && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-4">Address Information</h2>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//               {/* Billing Address */}
//               {order.billingAddress && (
//                 <div>
//                   <h3 className="font-medium mb-2 text-blue-600">Billing Address</h3>
//                   <div className="bg-gray-50 p-3 rounded border">
//                     {order.billingAddress.address1 && <p>{order.billingAddress.address1}</p>}
//                     {order.billingAddress.address2 && <p>{order.billingAddress.address2}</p>}
//                     <p>
//                       {[order.billingAddress.city, order.billingAddress.state, order.billingAddress.zip]
//                         .filter(Boolean).join(', ')}
//                     </p>
//                     {order.billingAddress.country && <p>{order.billingAddress.country}</p>}
//                   </div>
//                 </div>
//               )}
              
//               {/* Shipping Address */}
//               {order.shippingAddress && (
//                 <div>
//                   <h3 className="font-medium mb-2 text-green-600">Shipping Address</h3>
//                   <div className="bg-gray-50 p-3 rounded border">
//                     {order.shippingAddress.address1 && <p>{order.shippingAddress.address1}</p>}
//                     {order.shippingAddress.address2 && <p>{order.shippingAddress.address2}</p>}
//                     <p>
//                       {[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip]
//                         .filter(Boolean).join(', ')}
//                     </p>
//                     {order.shippingAddress.country && <p>{order.shippingAddress.country}</p>}
//                   </div>
//                 </div>
//               )}
//             </div>
//           </div>
//         )}
        
//         <div className="mt-4 pt-4 border-t">
//           <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//             <div className="space-y-1">
//               <p><strong>Total Before Discount:</strong> {formatCurrency(order.totalBeforeDiscount)}</p>
//               <p><strong>Freight:</strong> {formatCurrency(order.freight)}</p>
//               <p><strong>Rounding:</strong> {formatCurrency(order.rounding)}</p>
//             </div>
//             <div className="space-y-1">
//               <p><strong>Total Down Payment:</strong> {formatCurrency(order.totalDownPayment)}</p>
//               <p><strong>Applied Amounts:</strong> {formatCurrency(order.appliedAmounts)}</p>
//               <p><strong>Open Balance:</strong> {formatCurrency(order.openBalance)}</p>
//             </div>
//           </div>
//           <div className="mt-4 pt-4 border-t">
//             <p className="text-xl font-bold">
//               <strong>Grand Total:</strong> {formatCurrency(order.grandTotal)}
//             </p>
//           </div>
//         </div>
        
//         {order.remarks && (
//           <div className="mt-6 pt-4 border-t">
//             <h2 className="text-xl font-semibold mb-2">Remarks</h2>
//             <p className="text-gray-700">{order.remarks}</p>
//           </div>
//         )}
//       </div>

//       <div className="bg-white shadow-md rounded-lg p-6 mb-6">
//         <h2 className="text-2xl font-semibold mb-4">Order Items</h2>
//         {order.items && order.items.length > 0 ? (
//           <div className="overflow-x-auto">
//             <table className="min-w-full border-collapse">
//               <thead className="bg-gray-100">
//                 <tr>
//                   <th className="border p-2 text-left">Item Code</th>
//                   <th className="border p-2 text-left">Item Name</th>
//                   <th className="border p-2 text-left">Description</th>
//                   <th className="border p-2 text-left">Warehouse</th>
//                   <th className="border p-2 text-center">Qty</th>
//                   <th className="border p-2 text-center">Unit Price</th>
//                   <th className="border p-2 text-center">Discount</th>
//                   <th className="border p-2 text-center">Tax</th>
//                   <th className="border p-2 text-center">Total</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {order.items.map((item, index) => (
//                   <tr key={index} className="hover:bg-gray-50">
//                     <td className="border p-2">{item.itemCode}</td>
//                     <td className="border p-2">{item.itemName}</td>
//                     <td className="border p-2">{item.itemDescription}</td>
//                     <td className="border p-2">
//                       {item.warehouseCode} - {item.warehouseName}
//                     </td>
//                     <td className="border p-2 text-center">
//                       <div className="flex flex-col">
//                         <span>Ordered: {item.quantity}</span>
//                         {item.allowedQuantity > 0 && (
//                           <span className="text-sm text-green-600">
//                             Allowed: {item.allowedQuantity}
//                           </span>
//                         )}
//                         {item.receivedQuantity > 0 && (
//                           <span className="text-sm text-blue-600">
//                             Received: {item.receivedQuantity}
//                           </span>
//                         )}
//                       </div>
//                     </td>
//                     <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
//                     <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
//                     <td className="border p-2 text-center">
//                       <div className="flex flex-col">
//                         <span>{item.taxOption}: {item.gstRate}%</span>
//                         <span className="text-xs">
//                           {formatCurrency(item.gstAmount)}
//                         </span>
//                       </div>
//                     </td>
//                     <td className="border p-2 text-right font-medium">
//                       {formatCurrency(item.totalAmount)}
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         ) : (
//           <p className="text-center text-gray-500 py-4">No items available.</p>
//         )}
//       </div>
//          <div className="mt-8 pt-4 border-t-2 border-gray-300">
//             <h3 className="text-xl font-semibold mb-2">Attachments</h3>
//             {order.attachments && order.attachments.length > 0 ? (
//               <ul className="list-disc pl-5 space-y-2">
//                 {order.attachments.map((attachment, index) => {
//                   const isImage = attachment.fileType && attachment.fileType.startsWith("image/");
//                   const isPDF = attachment.fileType === "application/pdf" || attachment.fileName.toLowerCase().endsWith(".pdf");
//                   return (
//                     <li key={index}>
//                       <p className="font-semibold mb-2">{attachment.fileName}</p>
//                       {isImage ? (
//                         <img src={attachment.fileUrl} alt={attachment.fileName} className="max-w-full h-auto rounded mb-2" />
//                       ) : isPDF ? (
//                         <iframe src={attachment.fileUrl} className="w-full h-[400px] rounded mb-2" title="PDF Preview"></iframe>
//                       ) : (
//                         <a href={attachment.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
//                           Open {attachment.fileName} in a new tab
//                         </a>
//                       )}
//                       {!isImage && !isPDF && (
//                         <p className="text-sm text-gray-500">Unsupported file type for preview.</p>
//                       )}
//                     </li>
//                   );
//                 })}
//               </ul>
//             ) : (
//               <p className="text-gray-500">No attachments available.</p>
//             )}
//           </div>
//       <div className="flex justify-end space-x-4">
//         <Link href="/admin/sales-order-view">
//           <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
//             Back to List
//           </button>
//         </Link>
//         <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
//             Edit Order
//           </button>
//         </Link>
//       </div>
//     </div>
//   );
// }



// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function InvoiceDetail() {
//   const { id } = useParams();
//   const [order, setOrder] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchOrder = async () => {
//       try {
//         const res = await axios.get(`/api/sales-order/${id}`);
//         console.log(res.data.data)
//         setOrder(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch sales-order:', error);
//         setError('Failed to fetch sales-order');
//       }
//     };

//     if (id) {
//         fetchOrder();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!order) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/sales-order-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Order List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Order Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>order Number:</strong> {order.orderNumber}</p>
//         <p><strong>Supplier Name:</strong> {order.supplierName}</p>
//         <p><strong>order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {order.status}</p>
//         <p><strong>Grand Total:</strong> {order.grandTotal}</p>
//         <p><strong>Remarks:</strong> {order.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {order.items && order.items.length > 0 ? (
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
//               {order.items.map((item, index) => (
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
//         <Link href={`/admin/sales-order-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
