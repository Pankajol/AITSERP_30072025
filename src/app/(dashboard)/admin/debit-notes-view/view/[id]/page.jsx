'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { 
  FaArrowLeft, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaPaperclip, FaInfoCircle, FaFilePdf, 
  FaWarehouse, FaHistory, FaSpinner, FaBoxes, FaPrint, FaArrowDown
} from 'react-icons/fa';

// --- UI Helpers ---
const formatDate = (dateString) => {
  if (!dateString) return '—';
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short', day: 'numeric' });
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

const SectionHeader = ({ icon: Icon, title, color = "orange" }) => (
  <div className={`flex items-center gap-2 px-6 py-4 border-b border-gray-100 bg-${color}-50/30`}>
    <div className={`w-8 h-8 rounded-xl bg-${color}-100 flex items-center justify-center text-${color}-600 text-sm`}>
      <Icon />
    </div>
    <h3 className="text-sm font-black text-gray-800 uppercase tracking-tight">{title}</h3>
  </div>
);

export default function DebitNoteView() {
  const { id } = useParams();
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    const fetchDebitNote = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        const res = await axios.get(`/api/debit-note/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        // Robust Data Check
        const result = res.data;
        const actualData = result.data || result.note || (result._id ? result : null);

        if (actualData) {
          setNote(actualData);
          setError(null);
        } else {
          // This handles the case where status is 200 but record is null
          setError("Debit Note record not found in database.");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.message || err.response?.data?.error || "Failed to connect to server.");
      } finally {
        setLoading(false);
      }
    };

    fetchDebitNote();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <FaSpinner className="animate-spin text-4xl text-orange-500 mb-4" />
      <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Verifying Record...</p>
    </div>
  );

  if (error || !note) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-50 text-center">
        <FaInfoCircle className="text-red-500 text-5xl mx-auto mb-4" />
        <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Record Not Found</h2>
        <p className="text-gray-500 mb-6 font-medium">{error || "The requested Debit Note does not exist."}</p>
        <div className="space-y-3">
            <button onClick={() => window.location.reload()} className="w-full py-3 bg-gray-100 text-gray-700 rounded-2xl font-bold hover:bg-gray-200 transition-all">
            Retry
            </button>
            <button onClick={() => router.push("/admin/debit-notes-view")} className="w-full py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all">
            Back to List
            </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* --- Top Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <button onClick={() => router.push("/admin/debit-notes-view")} 
            className="flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-widest hover:text-orange-800 transition-all">
            <FaArrowLeft /> Back to List
          </button>
          
          <div className="flex gap-3">
             <button onClick={() => window.print()} className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm">
                <FaPrint /> Download Note
             </button>
             <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] border-2 border-orange-100 bg-orange-50 text-orange-600`}>
              {note.status || 'Verified'}
            </span>
          </div>
        </div>

        {/* --- Header Title --- */}
        <div className="mb-10 text-center sm:text-left">
          <p className="text-orange-600 font-black text-[10px] tracking-[0.3em] uppercase mb-1 flex items-center gap-2 justify-center sm:justify-start">
            <FaArrowDown /> Debit Note Ledger
          </p>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase">
            {note.refNumber || note.documentNumber || "DN-INTERNAL"}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8 space-y-8">
            
            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Supplier Details" color="orange" />
              <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailField label="Supplier Name" value={note.supplierName} />
                <DetailField label="Supplier Code" value={note.supplierCode} />
                <DetailField label="Contact Person" value={note.supplierContact || note.contactPerson} />
                <DetailField label="Sales Employee" value={note.salesEmployee || '-'} color="text-orange-600" />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxes} title="Reversed Items" color="orange" />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-8 py-4 text-left">Product Detail</th>
                      <th className="px-6 py-4 text-center">Qty</th>
                      <th className="px-6 py-4 text-center">Tax / Whse</th>
                      <th className="px-8 py-4 text-right">Debit Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {note.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-orange-50/20 transition-colors border-b last:border-0">
                        <td className="px-8 py-6">
                          <p className="text-sm font-black text-gray-900">{item.itemName}</p>
                          <p className="text-[11px] text-orange-500 font-mono font-bold mt-1">{item.itemCode}</p>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-gray-800">
                          {item.quantity}
                        </td>
                        <td className="px-6 py-6 text-center">
                          <p className="text-[10px] font-black text-gray-700 uppercase">{item.taxOption || 'GST'} {item.gstRate}%</p>
                          <div className="flex items-center justify-center gap-1 mt-2 text-gray-400">
                            <FaWarehouse size={10} />
                            <span className="text-[9px] font-bold uppercase">{item.warehouseName || 'Returns Store'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right font-black text-gray-900">
                          {formatCurrency(item.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {note.remarks && (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                <Lbl text="Reason for Debit Note" />
                <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2 font-medium italic">
                  "{note.remarks}"
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6">
            
            <div className="bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 text-white">
              <div className="flex items-center gap-2 mb-8 opacity-50">
                <FaCalculator />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em]">Debit Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="opacity-50 font-bold uppercase">Taxable Value</span>
                  <span className="font-mono">{formatCurrency(note.totalBeforeDiscount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs border-b border-white/10 pb-4">
                  <span className="opacity-50 font-bold uppercase text-orange-400">Total Tax Reversal</span>
                  <span className="font-mono text-orange-400">{formatCurrency(note.gstTotal)}</span>
                </div>
                <div className="pt-4">
                  <span className="text-[10px] font-black opacity-40 uppercase block mb-1">Total Credit Received</span>
                  <span className="text-4xl font-black tracking-tighter text-orange-400">{formatCurrency(note.grandTotal)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Critical Dates" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Posting Date" value={formatDate(note.postingDate)} />
                <DetailField label="Document Date" value={formatDate(note.documentDate)} />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaPaperclip} title="Attachments" color="purple" />
              <div className="p-6">
                {note.attachments?.length > 0 ? (
                  <div className="space-y-3">
                    {note.attachments.map((file, idx) => (
                      <a key={idx} href={file.fileUrl || file.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all">
                        <FaFilePdf className="text-red-500" size={18} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black text-gray-900 truncate">{file.fileName || 'Evidence_Doc'}</p>
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

            <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="orange" />
              <div className="p-6 space-y-4">
                <DetailField label="Record ID" value={note._id} />
                <DetailField label="Source Doc ID" value={note.sourceId || 'N/A'} />
                <DetailField label="Created At" value={formatDate(note.createdAt)} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}