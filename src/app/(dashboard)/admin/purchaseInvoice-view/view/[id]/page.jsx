'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaWarehouse, FaHistory, FaFileInvoice, FaSpinner, FaPrint
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
  <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
    <Lbl text={label} />
    <p className={`text-sm font-bold ${color}`}>{value || "—"}</p>
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => (
  <div className={`flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-${color}-50/30`}>
    <div className={`w-8 h-8 rounded-xl bg-${color}-100 flex items-center justify-center text-${color}-600 text-sm`}>
      <Icon />
    </div>
    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{title}</h3>
  </div>
);

export default function PurchaseInvoiceView() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchInvoice = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/purchaseInvoice/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success || res.data.data) {
          setInvoice(res.data.data || res.data);
          setError(null);
        } else {
          setError("Purchase Invoice not found.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.error || "Failed to load purchase invoice.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <FaSpinner className="animate-spin text-4xl text-indigo-600 mb-4" />
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Generating Invoice View...</p>
    </div>
  );

  if (error || !invoice) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Error</h2>
        <p className="text-gray-500 mb-6 font-medium">{error || "Data not available"}</p>
        <button onClick={() => router.back()} className="w-full py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all">
          Go Back
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* --- Top Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.back()} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-all">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex items-center gap-3">
             <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-all">
                <FaPrint /> Download PDF
             </button>
             <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 border-indigo-100 bg-indigo-50 text-indigo-600`}>
              {invoice.status || 'Pending'}
            </span>
          </div>
        </div>

        {/* --- Header Title --- */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-indigo-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
            <FaFileInvoice /> Purchase Invoice
          </p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
            {invoice.documentNumberInvoice || invoice.refNumber || "PI-INTERNAL"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT COLUMN --- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Vendor/Supplier Info */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Supplier Details" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Supplier Name" value={invoice.supplierName} />
                <DetailField label="Supplier Code" value={invoice.supplierCode} />
                <DetailField label="Contact Person" value={invoice.contactPerson} />
                <DetailField label="Sales Employee" value={invoice.salesEmployee || '-'} color="text-indigo-600" />
              </div>
            </div>

            {/* Items Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Itemized Purchases" color="emerald" />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-8 py-4 text-left">Product Detail</th>
                      <th className="px-6 py-4 text-center">Qty / Whse</th>
                      <th className="px-6 py-4 text-center">Tax Details</th>
                      <th className="px-8 py-4 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {invoice.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/30 transition-colors border-b last:border-0">
                        <td className="px-8 py-6 align-top">
                          <p className="text-sm font-black text-gray-900">{item.itemName}</p>
                          <p className="text-[11px] text-indigo-500 font-mono font-bold mt-1">{item.itemCode}</p>
                        </td>
                        <td className="px-6 py-6 text-center align-top font-black text-gray-800">
                          {item.quantity}
                          <div className="flex items-center justify-center gap-1 mt-2 text-gray-400">
                            <FaWarehouse size={10} />
                            <span className="text-[9px] font-bold uppercase">{item.warehouseName || 'Inbound'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-6 text-center align-top">
                          <p className="text-[10px] font-black text-gray-700 uppercase">{item.taxOption || 'GST'} {item.gstRate}%</p>
                          <p className="text-[9px] text-emerald-600 font-bold mt-1">Tax: {formatCurrency(item.gstAmount)}</p>
                        </td>
                        <td className="px-8 py-6 text-right align-top">
                          <p className="text-sm font-black text-gray-900">{formatCurrency(item.totalAmount)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks */}
            {invoice.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Internal Invoice Remarks" />
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2 font-medium">
                  {invoice.remarks}
                </p>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Dark Financial Card */}
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-white">
              <div className="flex items-center gap-2 mb-8 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Payable Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Subtotal</span>
                  <span className="font-mono">{formatCurrency(invoice.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase text-emerald-400">GST Component</span>
                  <span className="font-mono text-emerald-400">{formatCurrency(invoice.gstTotal)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase">Freight</span>
                  <span className="font-mono">{formatCurrency(invoice.freight || 0)}</span>
                </div>
                <div className="pt-4">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Grand Total</span>
                  <span className="text-4xl font-black tracking-tighter text-indigo-400">{formatCurrency(invoice.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Billing Timeline */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Billing Cycle" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Posting Date" value={formatDate(invoice.postingDate)} />
                <DetailField label="Due Date" value={formatDate(invoice.dueDate)} color="text-rose-600" />
                <DetailField label="Document Date" value={formatDate(invoice.documentDate)} />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Scanned Documents" color="purple" />
              <div className="p-6">
                {invoice.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {invoice.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl || file.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                          <FaFilePdf size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate">{file.fileName || 'Invoice_Doc'}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter">View Source</p>
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

            {/* Audit Logs */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Source Type" value={invoice.sourceType || "Direct Entry"} />
                <DetailField label="Linked ID" value={invoice.sourceId || 'N/A'} />
                <DetailField label="Record Created" value={formatDate(invoice.createdAt)} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}