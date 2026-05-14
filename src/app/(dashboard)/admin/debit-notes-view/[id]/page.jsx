'use client';

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";
import { 
  FaArrowLeft, FaEdit, FaUser, FaCalendarAlt, FaBoxOpen, 
  FaCalculator, FaInfoCircle, FaSupplier, FaHistory 
} from "react-icons/fa";

// --- Helpers ---
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

const Lbl = ({ text }) => (
  <p className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1">
    {text}
  </p>
);

const DetailField = ({ label, value, color = "text-gray-900" }) => (
  <div>
    <Lbl text={label} />
    <p className={`text-sm font-semibold ${color}`}>{value || "—"}</p>
  </div>
);

const SectionHeader = ({ icon: Icon, title, color = "indigo" }) => (
  <div className={`flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-${color}-50/30`}>
    <div className={`w-7 h-7 rounded-lg bg-${color}-100 flex items-center justify-center text-${color}-600 text-sm`}>
      <Icon />
    </div>
    <h3 className="text-sm font-bold text-gray-800">{title}</h3>
  </div>
);

export default function DebitNoteDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDebitNote() {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`/api/debit-note/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Adjust based on your API response structure (res.data or res.data.data)
        setNote(res.data.data || res.data);
      } catch (err) {
        setError("Failed to load Debit Note details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDebitNote();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
      <p className="text-gray-500 font-medium">Fetching Debit Note details...</p>
    </div>
  );

  if (error || !note) return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow-sm border border-red-100 text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <FaInfoCircle size={24} />
        </div>
        <h2 className="text-lg font-bold text-gray-900 mb-2">{error || "Note Not Found"}</h2>
        <button onClick={() => router.push("/admin/debit-notes-view")} className="text-indigo-600 font-semibold text-sm flex items-center justify-center gap-2 mx-auto">
          <FaArrowLeft /> Back to List
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        
        {/* --- Header Navigation --- */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <button onClick={() => router.push("/admin/debit-notes-view")} 
            className="flex items-center gap-2 text-indigo-600 font-bold text-sm hover:text-indigo-800 transition-colors">
            <FaArrowLeft /> Back to Debit Notes
          </button>
          
          <div className="flex items-center gap-3">
            <span className={`px-4 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest border ${
              note.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              {note.status}
            </span>
            <Link href={`/admin/debit-note?editId=${id}`}>
              <button className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
                <FaEdit size={12} /> Edit Note
              </button>
            </Link>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mb-8 tracking-tight">
          Debit Note <span className="text-indigo-600">#{note.refNumber || 'Draft'}</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* --- Main Info Column --- */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Supplier Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaUser} title="Supplier Information" color="indigo" />
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
                <DetailField label="Supplier Name" value={note.supplierName} />
                <DetailField label="Supplier Code" value={note.supplierCode} />
                <DetailField label="Contact Person" value={note.supplierContact} />
                <DetailField label="Reference No." value={note.refNumber} />
              </div>
            </div>

            {/* Items Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaBoxOpen} title="Item Details" color="emerald" />
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-100">
                  <thead className="bg-gray-50/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</th>
                      <th className="px-6 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Quantity</th>
                      <th className="px-6 py-3 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {note.items?.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-bold text-gray-900">{item.itemName}</p>
                          <p className="text-[11px] text-gray-400 font-medium">{item.itemCode}</p>
                          <p className="text-[11px] text-gray-400 italic mt-1 truncate max-w-[200px]">{item.itemDescription}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <p className="text-sm font-bold text-gray-800">{item.quantity}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase">{item.warehouseName}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className="text-sm font-bold text-gray-900">₹{item.totalAmount?.toLocaleString()}</p>
                          <p className="text-[10px] text-emerald-600 font-bold">Incl. Tax</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
               <Lbl text="Internal Remarks / Notes" />
               <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100 mt-2">
                 {note.remarks || "No remarks provided for this transaction."}
               </p>
            </div>
          </div>

          {/* --- Sidebar Info Column --- */}
          <div className="space-y-6">
            
            {/* Summary Card */}
            <div className="bg-indigo-600 rounded-3xl shadow-xl shadow-indigo-100 p-6 text-white">
              <div className="flex items-center gap-2 mb-6 opacity-80">
                <FaCalculator />
                <h3 className="text-xs font-bold uppercase tracking-widest">Financial Summary</h3>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-indigo-500 pb-3">
                  <span className="text-xs font-medium opacity-80">Taxable Amount</span>
                  <span className="font-bold">₹{note.totalBeforeDiscount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center border-b border-indigo-500 pb-3">
                  <span className="text-xs font-medium opacity-80">GST Total</span>
                  <span className="font-bold">₹{note.gstTotal?.toLocaleString()}</span>
                </div>
                <div className="pt-2">
                  <span className="text-xs font-medium opacity-80 block mb-1">Grand Total</span>
                  <span className="text-3xl font-extrabold tracking-tight">₹{note.grandTotal?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Dates Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaCalendarAlt} title="Timeline" color="blue" />
              <div className="p-6 space-y-5">
                <DetailField label="Posting Date" value={formatDate(note.postingDate)} />
                <DetailField label="Document Date" value={formatDate(note.documentDate)} />
                <DetailField label="Valid Until" value={formatDate(note.validUntil)} color="text-amber-600" />
                <DetailField label="Created On" value={formatDate(note.createdAt)} />
              </div>
            </div>

             {/* Source History */}
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <SectionHeader icon={FaHistory} title="Traceability" color="purple" />
              <div className="p-6">
                <DetailField label="Source Type" value={note.sourceModel || 'Direct Entry'} />
                <div className="mt-4">
                  <Lbl text="Sales Employee" />
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-[10px] text-purple-600 font-bold uppercase">
                      {(note.salesEmployee || 'U')[0]}
                    </div>
                    <span className="text-sm font-bold text-gray-700">{note.salesEmployee || 'Unassigned'}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}


// "use client";

// import React, { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import axios from "axios";
// import Link from "next/link";

// export default function DebitNoteDetail() {
//   const { id } = useParams();
//   const [note, setNote] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     async function fetchDebitNote() {
//       try {
//         const res = await axios.get(`/api/debit-note/${id}`);
//         setNote(res.data);
//       } catch (err) {
//         setError("Failed to load Debit Note");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchDebitNote();
//   }, [id]);

//   if (loading) return <div className="p-8">Loading...</div>;
//   if (error) return <div className="p-8 text-red-600">{error}</div>;

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold mb-4">Debit Note Details</h1>
//       <p><strong>Supplier Name:</strong> {note.supplierName}</p>
//       <p><strong>Reference Number:</strong> {note.refNumber}</p>
//       <p><strong>Status:</strong> {note.status}</p>
//       <p><strong>Grand Total:</strong> {parseFloat(note.grandTotal).toFixed(2)}</p>
//       <p><strong>Created At:</strong> {new Date(note.createdAt).toLocaleString()}</p>
//       <Link href={`/admin/debit-notes-view/${id}/edit`}>
//         <button className="px-4 py-2 bg-yellow-500 text-white rounded mt-4">Edit</button>
//       </Link>
//     </div>
//   );
// }
