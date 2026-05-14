'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaWarehouse, FaHistory, FaFileInvoiceDollar, FaCheckCircle, 
  FaExclamationCircle, FaMoneyBillWave, FaImage
} from 'react-icons/fa';

// ──────────────────────────────────────────────────────────────
// UI Helpers
// ──────────────────────────────────────────────────────────────
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

// Static color mapping (avoid dynamic Tailwind classes)
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

// ✅ Item Image Component with fallback (same as Sales Order view)
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

// ✅ Helper to get item image URL (prioritize variant, then item)
const getItemImageUrl = (item) => {
  if (item.variant?.variantImageUrl) return item.variant.variantImageUrl;
  if (item.variant?.imageUrl) return item.variant.imageUrl;
  if (item.imageUrl) return item.imageUrl;
  if (item.item?.imageUrl) return item.item.imageUrl;
  return null;
};

// ──────────────────────────────────────────────────────────────
// Main Component Wrapper
// ──────────────────────────────────────────────────────────────
export default function SalesInvoiceViewWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Invoice...</div>}>
      <SalesInvoiceView />
    </Suspense>
  );
}

function SalesInvoiceView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  
  // Support both /admin/sales-invoice-view/[id] and ?id= from list page
  const id = searchParams.get("id") || params?.id;
  
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) {
      setError("No invoice ID provided");
      setLoading(false);
      return;
    }

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) throw new Error("No authentication token");

        const res = await axios.get(`/api/sales-invoice?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          setInvoice(res.data.data);
        } else {
          setError(res.data.error || "Invoice not found");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.error || err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Loading Invoice Details...</p>
    </div>
  );

  if (error || !invoice) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Error</h2>
        <p className="text-gray-500 mb-6 font-medium">{error || "Invoice not found"}</p>
        <button onClick={() => router.push("/admin/sales-invoice-view")} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold transition-all hover:bg-indigo-700">
          Return to List
        </button>
      </div>
    </div>
  );

  const docNumber = invoice.invoiceNumber || invoice.refNumber || "INV-INTERNAL";
  const isPaid = invoice.paymentStatus === "Paid" || invoice.openBalance === 0;
  const paymentStatusColor = isPaid 
    ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
    : "bg-rose-50 text-rose-600 border-rose-100";
  const paymentStatusIcon = isPaid ? <FaCheckCircle className="inline mr-1" /> : <FaExclamationCircle className="inline mr-1" />;
  const paymentStatusText = isPaid ? "Paid" : invoice.paymentStatus === "Partial" ? "Partial Payment" : "Due";

  const totalPaid = invoice.payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || invoice.paidAmount || 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.push("/admin/sales-invoice-view")} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-colors">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex gap-3">
            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 ${paymentStatusColor}`}>
              {paymentStatusIcon} {paymentStatusText}
            </span>
          </div>
        </div>

        {/* Title */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
            <FaFileInvoiceDollar /> Tax Invoice
          </p>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tighter uppercase break-words">
            {docNumber}
          </h1>
          {invoice.sourceModel && (
            <p className="text-sm text-gray-400 mt-1">
              Created from {invoice.sourceModel === 'salesorder' ? 'Sales Order' : 'Delivery Challan'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Customer Info */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Billing Information" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Customer Name" value={invoice.customerName} />
                <DetailField label="Customer Code" value={invoice.customerCode} />
                <DetailField label="Contact Person" value={invoice.contactPerson} />
                <DetailField label="Sales Employee" value={invoice.salesEmployee || "—"} />
                <DetailField label="Reference Number" value={invoice.refNumber || "—"} />
              </div>
            </div>

            {/* Addresses */}
            {(invoice.billingAddress?.address1 || invoice.shippingAddress?.address1) && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader icon={FaUser} title="Addresses" color="blue" />
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <Lbl text="Billing Address" />
                    <div className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                      {invoice.billingAddress?.address1 ? (
                        <>
                          {invoice.billingAddress.address1}<br/>
                          {invoice.billingAddress.address2 && <>{invoice.billingAddress.address2}<br/></>}
                          {invoice.billingAddress.city}, {invoice.billingAddress.state} - {invoice.billingAddress.zip}<br/>
                          {invoice.billingAddress.country}
                        </>
                      ) : "No billing address"}
                    </div>
                  </div>
                  <div>
                    <Lbl text="Shipping Address" />
                    <div className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-2xl border border-dashed border-gray-200">
                      {invoice.shippingAddress?.address1 ? (
                        <>
                          {invoice.shippingAddress.address1}<br/>
                          {invoice.shippingAddress.address2 && <>{invoice.shippingAddress.address2}<br/></>}
                          {invoice.shippingAddress.city}, {invoice.shippingAddress.state} - {invoice.shippingAddress.zip}<br/>
                          {invoice.shippingAddress.country}
                        </>
                      ) : "No shipping address"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Items Table - WITH IMAGES */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Itemized Statement" color="emerald" />
              <div className="overflow-x-auto">
                <table className="min-w-[900px] w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-6 py-4 text-left">Item</th>
                      <th className="px-4 py-4 text-center">Qty</th>
                      <th className="px-4 py-4 text-center">Unit Price</th>
                      <th className="px-6 py-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items?.map((item, idx) => {
                      const imageUrl = getItemImageUrl(item);
                      const isVariant = item.variant || (item.itemCode !== item.item?.itemCode);
                      const warehouseName = item.warehouseName || item.warehouse?.warehouseName || '—';
                      return (
                        <tr key={idx} className="hover:bg-gray-50/30 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-start gap-3">
                              <ItemImage src={imageUrl} alt={item.itemName} className="w-12 h-12" />
                              <div>
                                <p className="text-sm font-black text-gray-900">{item.itemName || item.item?.itemName}</p>
                                <p className="text-[11px] text-indigo-500 font-mono font-bold mt-1">{item.itemCode || item.item?.itemCode}</p>
                                {isVariant && (item.variant?.sku || (item.itemCode !== item.item?.itemCode)) && (
                                  <p className="text-[10px] text-purple-600 font-bold mt-1">Variant: {item.variant?.sku || item.itemCode}</p>
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
                              <span className="text-[9px] font-bold uppercase break-words max-w-[80px]" title={warehouseName}>
                                {warehouseName}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-5 text-center align-top">
                            <p className="text-[11px] font-black text-gray-700">{formatCurrency(item.unitPrice)}</p>
                            {item.discount > 0 && <p className="text-[9px] text-red-500">-{formatCurrency(item.discount)}</p>}
                            <p className="text-[9px] text-indigo-600 font-bold mt-1 uppercase">
                              {item.taxOption || 'GST'} {item.gstRate || item.igstRate || 0}%
                            </p>
                          </td>
                          <td className="px-6 py-5 text-right align-top font-black text-gray-900">
                            {formatCurrency(item.totalAmount)}
                            <p className="text-[9px] text-gray-400 mt-1">
                              {item.taxOption === "IGST"
                                ? `IGST: ${formatCurrency(item.igstAmount || 0)}`
                                : `CGST: ${formatCurrency(item.cgstAmount || 0)} | SGST: ${formatCurrency(item.sgstAmount || 0)}`
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
                      <td className="px-6 py-3 text-right font-black text-sm">{formatCurrency(invoice.totalBeforeDiscount)}</td>
                    </tr>
                    <tr className="border-b border-gray-100">
                      <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">GST Total:</td>
                      <td className="px-6 py-2 text-right text-sm font-bold text-emerald-600">{formatCurrency(invoice.gstTotal)}</td>
                    </tr>
                    {invoice.freight > 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Freight:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(invoice.freight)}</td>
                      </tr>
                    )}
                    {invoice.rounding !== 0 && (
                      <tr className="border-b border-gray-100">
                        <td colSpan="3" className="px-6 py-2 text-right text-[10px] text-gray-500">Rounding:</td>
                        <td className="px-6 py-2 text-right text-sm">{formatCurrency(invoice.rounding)}</td>
                      </tr>
                    )}
                    <tr className="bg-indigo-50/30">
                      <td colSpan="3" className="px-6 py-4 text-right font-black text-sm uppercase text-indigo-700">Grand Total:</td>
                      <td className="px-6 py-4 text-right text-2xl font-black text-indigo-600">{formatCurrency(invoice.grandTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {invoice.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Notes / Special Instructions" />
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2 font-medium break-words">
                  {invoice.remarks}
                </p>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN (unchanged from previous version) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Financial Summary */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] shadow-2xl p-6 sm:p-8 text-white">
              <div className="flex items-center gap-2 mb-6 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Payment Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(invoice.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">GST Total</span>
                  <span className="font-mono text-sm text-emerald-400">{formatCurrency(invoice.gstTotal)}</span>
                </div>
                {invoice.freight > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50 font-bold uppercase">Freight</span>
                    <span className="font-mono text-sm">{formatCurrency(invoice.freight)}</span>
                  </div>
                )}
                {invoice.rounding !== 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="opacity-50 font-bold uppercase">Rounding</span>
                    <span className="font-mono text-sm">{formatCurrency(invoice.rounding)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase text-blue-400">Down Payment</span>
                  <span className="font-mono text-sm text-blue-400">{formatCurrency(invoice.totalDownPayment || 0)}</span>
                </div>
                <div className="pt-3">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Grand Total</span>
                  <span className="text-3xl sm:text-4xl font-black tracking-tighter text-indigo-400 break-words">
                    {formatCurrency(invoice.grandTotal)}
                  </span>
                </div>
                {invoice.openBalance > 0 && (
                  <div className="mt-6 bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                    <Lbl text="Current Open Balance" />
                    <p className="text-xl font-black text-rose-400">{formatCurrency(invoice.openBalance)}</p>
                  </div>
                )}
                {totalPaid > 0 && (
                  <div className="mt-2 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
                    <Lbl text="Total Paid" />
                    <p className="text-xl font-black text-emerald-400">{formatCurrency(totalPaid)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Payment History */}
            {invoice.payments && invoice.payments.length > 0 && (
              <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
                <SectionHeader icon={FaMoneyBillWave} title="Payment History" color="green" />
                <div className="p-6 space-y-4">
                  {invoice.payments.map((payment, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-gray-700">{payment.method}</span>
                        <span className="text-sm font-bold text-emerald-600">{formatCurrency(payment.amount)}</span>
                      </div>
                      <p className="text-[9px] text-gray-400 mt-1">{formatDate(payment.paymentDate)}</p>
                      {payment.transactionId && <p className="text-[9px] text-gray-400">Ref: {payment.transactionId}</p>}
                      {payment.notes && <p className="text-[9px] text-gray-400 mt-1 italic">{payment.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Billing Cycle" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Invoice Date" value={formatDate(invoice.invoiceDate)} />
                <DetailField label="Due Date" value={formatDate(invoice.dueDate)} color="text-rose-600" />
                <DetailField label="Order Date" value={formatDate(invoice.orderDate)} />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Attachments" color="purple" />
              <div className="p-6">
                {invoice.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {invoice.attachments.map((file, idx) => (
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

            {/* Audit Trail */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Audit Trail" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Created At" value={formatDate(invoice.createdAt)} />
                <DetailField label="Last Updated" value={formatDate(invoice.updatedAt)} />
                <DetailField label="Source" value={invoice.sourceModel ? (invoice.sourceModel === 'salesorder' ? 'Sales Order' : 'Delivery Challan') : 'Direct Entry'} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}