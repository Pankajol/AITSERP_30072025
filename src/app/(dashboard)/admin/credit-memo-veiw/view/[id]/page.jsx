'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaWarehouse, FaHistory, FaUndo, FaCheckCircle
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

export default function CreditMemoView() {
  const { id } = useParams();
  const router = useRouter();
  const [memo, setMemo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchCreditMemo = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/credit-note/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setMemo(res.data.data);
          setError(null);
        } else {
          setError(res.data.error || "Credit Memo not found.");
        }
      } catch (err) {
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCreditMemo();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Fetching Credit Details...</p>
    </div>
  );

  if (error || !memo) return (
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

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* --- Top Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.back()} 
            className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:text-indigo-800 transition-all">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex gap-3">
             <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 border-emerald-100 bg-emerald-50 text-emerald-600`}>
              {memo.status || 'Applied'}
            </span>
          </div>
        </div>

        {/* --- Header Title --- */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-rose-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
            <FaUndo /> Sales Return / Credit Note
          </p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
            {memo.documentNumberCreditMemo || memo.refNumber || "CM-RECORD"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* --- LEFT COLUMN --- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Customer Info */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Customer Account Details" color="indigo" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Customer Name" value={memo.customerName} />
                <DetailField label="Customer Code" value={memo.customerCode} />
                <DetailField label="Contact Person" value={memo.contactPerson} />
                <DetailField label="Sales Employee" value={memo.salesEmployee} color="text-indigo-600" />
              </div>
            </div>

            {/* Credit Items Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Returned Items" color="rose" />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-8 py-4 text-left">Product Detail</th>
                      <th className="px-6 py-4 text-center">Returned Qty</th>
                      <th className="px-6 py-4 text-center">Tax / Warehouse</th>
                      <th className="px-8 py-4 text-right">Credit Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {memo.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-rose-50/20 transition-colors border-b last:border-0">
                        <td className="px-8 py-6 align-top">
                          <p className="text-sm font-black text-gray-900">{item.itemName}</p>
                          <p className="text-[11px] text-rose-500 font-mono font-bold mt-1">{item.itemCode}</p>
                        </td>
                        <td className="px-6 py-6 text-center align-top">
                          <p className="text-lg font-black text-gray-800">{item.quantity}</p>
                        </td>
                        <td className="px-6 py-6 text-center align-top">
                          <p className="text-[10px] font-black text-gray-600 uppercase">{item.taxOption} {item.gstRate}%</p>
                          <div className="flex items-center justify-center gap-1 mt-2 text-gray-400">
                            <FaWarehouse size={10} />
                            <span className="text-[9px] font-bold uppercase">{item.warehouseName || 'Returns Store'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right align-top">
                          <p className="text-sm font-black text-gray-900">{formatCurrency(item.totalAmount)}</p>
                          <p className="text-[9px] text-rose-600 font-bold uppercase mt-1">Tax Adjust: {formatCurrency(item.gstAmount)}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reason for Credit */}
            {memo.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Reason for Credit / Remarks" />
                <p className="text-sm text-gray-600 bg-rose-50/30 p-4 rounded-2xl border border-rose-100 mt-2 font-medium italic">
                  "{memo.remarks}"
                </p>
              </div>
            )}
          </div>

          {/* --- RIGHT COLUMN --- */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Credit Summary Card */}
            <div className="bg-rose-900 rounded-[2.5rem] shadow-2xl p-8 text-white">
              <div className="flex items-center gap-2 mb-8 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Credit Value</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Base Credit</span>
                  <span className="font-mono">{formatCurrency(memo.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase text-rose-300">Tax Reversal</span>
                  <span className="font-mono text-rose-300">{formatCurrency(memo.gstTotal)}</span>
                </div>
                <div className="pt-4">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Total Credit Issued</span>
                  <span className="text-4xl font-black tracking-tighter text-rose-200">{formatCurrency(memo.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Key Dates */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Timeline" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Credit Date" value={formatDate(memo.postingDate)} />
                <DetailField label="Document Date" value={formatDate(memo.documentDate)} />
              </div>
            </div>

            {/* Attachments */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Verification Docs" color="purple" />
              <div className="p-6">
                {memo.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {memo.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-red-500">
                          <FaFilePdf size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate">{file.fileName}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5 tracking-tighter">View Source</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-[10px] text-gray-300 font-black tracking-widest uppercase">No Proof Uploaded</p>
                  </div>
                )}
              </div>
            </div>

            {/* Traceability Audit */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Original Invoice ID" value={memo.salesInvoiceId || memo.sourceId} />
                <DetailField label="Created At" value={formatDate(memo.createdAt)} />
                <DetailField label="Last Updated" value={formatDate(memo.updatedAt)} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}