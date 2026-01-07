"use client";
import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import {
  FileText,
  ChevronRight,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import POSInvoiceModal from "@/components/pos/POSInvoiceModal";

export default function POSReportPage() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("last7");
  const [searchTerm, setSearchTerm] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    try {
      const res = await axios.get(`/api/pos/reports?range=${dateRange}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportData(res.data.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange]);

  const filteredTransactions = useMemo(() => {
    if (!reportData?.transactions) return [];
    const term = searchTerm.toLowerCase();
    return reportData.transactions.filter((tx) =>
      String(tx.invoiceNo || tx._id).toLowerCase().includes(term) ||
      (tx.customerId?.name || "").toLowerCase().includes(term) ||
      (tx.customerId?.mobile || "").includes(searchTerm)
    );
  }, [reportData, searchTerm]);

  const handleViewInvoice = (tx) => {
    const formattedData = {
      ...tx,
      customer: {
        name: tx.customerId?.name || "Walk-in Guest",
        phone: tx.customerId?.mobile || "N/A",
        gstin: tx.customerId?.gstin || ""
      },
      invoiceNo: tx.invoiceNo || tx._id,
      taxable: tx.taxableAmount || 0,
      grand: tx.grandTotal || 0,
      cgst: tx.cgst || 0,
      sgst: tx.sgst || 0,
      paymentReceived: tx.paymentReceived || 0,
      balanceReturned: tx.balanceReturned || 0,
      dueAmount: tx.dueAmount || 0,
      items: tx.items || []
    };
    setSelectedInvoice(formattedData);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#F8FAFC] min-h-screen text-slate-800">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Sales Reports</h1>
          <p className="text-xs font-bold text-slate-400">Financial Audit & Payment Tracking</p>
        </div>

        <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
          {["today", "last7", "last30"].map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-4 py-2 text-[11px] font-black uppercase rounded-xl transition ${
                dateRange === r ? "bg-slate-900 text-white" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {r.replace("last", "Last ")}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <KPICard title="Revenue" value={`₹${(reportData?.summary?.revenue || 0).toLocaleString()}`} subtitle="Gross Total" color="text-slate-900" />
        <KPICard title="Cash in Hand" value={`₹${(reportData?.summary?.totalReceived || 0).toLocaleString()}`} subtitle="Actual Collected" color="text-blue-600" />
        <KPICard title="Pending Due" value={`₹${(reportData?.summary?.totalDue || 0).toLocaleString()}`} subtitle="Market Credit" color="text-rose-600" />
        <KPICard title="GST Total" value={`₹${((reportData?.summary?.cgst || 0) + (reportData?.summary?.sgst || 0)).toLocaleString()}`} subtitle="Tax Liability" color="text-slate-500" />
        <KPICard title="Bills" value={reportData?.summary?.count || 0} subtitle="Total Invoices" color="text-slate-900" />
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-600">
            <Filter size={14} /> Transaction History
          </div>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search invoice / name / mobile"
              className="pl-9 pr-4 py-2 w-full sm:w-80 text-xs font-bold rounded-xl bg-slate-50 focus:ring-2 ring-blue-100 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
              <tr>
                <th className="px-6 py-4 text-left">Invoice & Date</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Paid</th>
                <th className="px-6 py-4 text-right text-rose-500">Due</th>
                <th className="px-6 py-4 text-right">Grand Total</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.map((tx) => (
                <tr key={tx._id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-black text-slate-900 uppercase">
                      {tx.invoiceNo || `#INV-${tx._id.substring(tx._id.length - 6)}`}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 italic">
                      {new Date(tx.createdAt).toLocaleDateString('en-GB')}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-black uppercase text-slate-700">
                      {tx.customerId?.name || "Walk-in"}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      {tx.customerId?.mobile || "N/A"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {tx.dueAmount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 text-rose-600 text-[9px] font-black uppercase border border-rose-100">
                        <AlertCircle size={10} /> Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase border border-emerald-100">
                        <CheckCircle2 size={10} /> Paid
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-xs font-bold text-slate-600">₹{(tx.paymentReceived || 0).toLocaleString()}</p>
                    {tx.balanceReturned > 0 && (
                        <p className="text-[8px] font-bold text-emerald-500 italic">Bal: ₹{tx.balanceReturned}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className={`text-xs font-black ${tx.dueAmount > 0 ? "text-rose-600" : "text-slate-300"}`}>
                      {tx.dueAmount > 0 ? `₹${tx.dueAmount.toLocaleString()}` : "₹0"}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-black text-blue-600">
                      ₹{tx.grandTotal?.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleViewInvoice(tx)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition shadow-sm"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <POSInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={selectedInvoice}
      />
    </div>
  );
}

function KPICard({ title, value, subtitle, color }) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
      <div className="absolute -right-2 -top-2 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
          <FileText size={80} />
      </div>
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
        {title}
      </p>
      <p className={`text-2xl font-black mb-1 ${color}`}>{value}</p>
      <div className="flex items-center gap-1">
          <div className="w-1 h-1 rounded-full bg-slate-300"></div>
          <p className="text-[9px] font-bold text-slate-400 uppercase italic">
            {subtitle}
          </p>
      </div>
    </div>
  );
}


// "use client";
// import { useEffect, useState, useMemo } from "react";
// import axios from "axios";
// import {
//   FileText,
//   ChevronRight,
//   Search,
//   Filter
// } from "lucide-react";
// import POSInvoiceModal from "@/components/pos/POSInvoiceModal";

// export default function POSReportPage() {
//   const [reportData, setReportData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [dateRange, setDateRange] = useState("last7");
//   const [searchTerm, setSearchTerm] = useState("");

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [selectedInvoice, setSelectedInvoice] = useState(null);

//   const fetchReports = async () => {
//     setLoading(true);
//     const token = localStorage.getItem("token");
//     try {
//       const res = await axios.get(`/api/pos/reports?range=${dateRange}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setReportData(res.data.data);
//     } catch (e) {
//       console.error(e);
//     }
//     setLoading(false);
//   };

//   useEffect(() => {
//     fetchReports();
//   }, [dateRange]);

//   const filteredTransactions = useMemo(() => {
//     if (!reportData?.transactions) return [];
//     return reportData.transactions.filter((tx) =>
//       String(tx._id).toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (tx.customerId?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
//       (tx.customerId?.mobile || "").includes(searchTerm)
//     );
//   }, [reportData, searchTerm]);

// const handleViewInvoice = (tx) => {
//   const formattedData = {
//     ...tx,
//     customer: {
//       name: tx.customerId?.name || "Walk-in Guest",
//       phone: tx.customerId?.mobile || "N/A",
//       gstin: tx.customerId?.gstin || ""
//     },
//     // 🟢 Priority to custom invoice number
//     invoiceNo: tx.invoiceNo || tx._id, 
//     taxable: tx.taxableAmount || 0,
//     grand: tx.grandTotal || 0,
//     cgst: tx.cgst || 0,
//     sgst: tx.sgst || 0,
//     items: tx.items || []
//   };
//   setSelectedInvoice(formattedData);
//   setIsModalOpen(true);
// };

//   if (loading) {
//     return (
//       <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
//         <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 bg-[#F8FAFC] min-h-screen text-slate-800">

//       {/* HEADER */}
//       <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 mb-8">
//         <div>
//           <h1 className="text-3xl font-black tracking-tight uppercase">
//             Sales Reports
//           </h1>
//           <p className="text-xs font-bold text-slate-400">
//             Company-wide POS transaction audit
//           </p>
//         </div>

//         <div className="flex bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
//           {["today", "last7", "last30"].map((r) => (
//             <button
//               key={r}
//               onClick={() => setDateRange(r)}
//               className={`px-4 py-2 text-[11px] font-black uppercase rounded-xl transition ${
//                 dateRange === r
//                   ? "bg-slate-900 text-white"
//                   : "text-slate-400 hover:text-slate-600"
//               }`}
//             >
//               {r.replace("last", "Last ")}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* KPI */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
//         <KPICard title="Net Revenue" value={`₹${(reportData?.summary?.revenue || 0).toLocaleString()}`} subtitle="Gross Sales" />
//         <KPICard title="Taxable Amount" value={`₹${(reportData?.summary?.taxable || 0).toLocaleString()}`} subtitle="Before GST" />
//         <KPICard title="GST Collected" value={`₹${((reportData?.summary?.cgst || 0) + (reportData?.summary?.sgst || 0)).toLocaleString()}`} subtitle="CGST + SGST" />
//         <KPICard title="Invoices" value={reportData?.summary?.count || 0} subtitle="Total Bills" />
//       </div>

//       {/* TABLE */}
//       <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
//         <div className="p-5 border-b flex justify-between items-center gap-4">
//           <div className="flex items-center gap-2 font-black text-xs uppercase tracking-widest text-slate-600">
//             <Filter size={14} /> Transactions
//           </div>

//           <div className="relative">
//             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
//             <input
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//               placeholder="Search invoice / name / mobile"
//               className="pl-9 pr-4 py-2 w-64 text-xs font-bold rounded-xl bg-slate-50 focus:ring-2 ring-blue-100 outline-none"
//             />
//           </div>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-black">
//               <tr>
//                 <th className="px-6 py-4 text-left">Invoice</th>
//                 <th className="px-6 py-4 text-left">Customer</th>
//                 <th className="px-6 py-4 text-center">Qty</th>
//                 <th className="px-6 py-4 text-left">Taxable</th>
//                 <th className="px-6 py-4 text-left">GST</th>
//                 <th className="px-6 py-4 text-right">Total</th>
//                 <th className="px-6 py-4 text-right"></th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredTransactions.map((tx) => (
//                 <tr key={tx._id} className="border-t hover:bg-blue-50/30">
//               <td className="px-6 py-4">
//   <p className="text-xs font-black text-slate-900 uppercase">
//     {/* Always show custom invoiceNo if available */}
//     {tx.invoiceNo || `#INV-${tx._id.substring(tx._id.length - 6)}`}
//   </p>
//   <p className="text-[10px] font-bold text-slate-400">
//     {new Date(tx.createdAt).toLocaleDateString()}
//   </p>
// </td>
//                   <td className="px-6 py-4">
//                     <p className="text-xs font-black uppercase">
//                       {tx.customerId?.name || "Walk-in"}
//                     </p>
//                     <p className="text-[10px] text-slate-400">
//                       {tx.customerId?.mobile || "-"}
//                     </p>
//                   </td>
//                   <td className="px-6 py-4 text-center font-black">
//                     {(tx.items || []).reduce((s, i) => s + i.qty, 0)}
//                   </td>
//                   <td className="px-6 py-4 text-xs font-bold">
//                     ₹{tx.taxableAmount?.toLocaleString()}
//                   </td>
//                   <td className="px-6 py-4 text-[10px] text-slate-400 font-bold">
//                     C: ₹{tx.cgst?.toFixed(2)}<br />
//                     S: ₹{tx.sgst?.toFixed(2)}
//                   </td>
//                   <td className="px-6 py-4 text-right font-black text-blue-600">
//                     ₹{tx.grandTotal?.toLocaleString()}
//                   </td>
//                   <td className="px-6 py-4 text-right">
//                     <button
//                       onClick={() => handleViewInvoice(tx)}
//                       className="p-2 rounded-xl bg-blue-600 text-white hover:bg-slate-900 transition"
//                     >
//                       <ChevronRight size={14} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}

//               {filteredTransactions.length === 0 && (
//                 <tr>
//                   <td colSpan={7} className="py-16 text-center text-xs font-black uppercase text-slate-300">
//                     No records found
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>

//       <POSInvoiceModal
//         isOpen={isModalOpen}
//         onClose={() => setIsModalOpen(false)}
//         data={selectedInvoice}
//       />
//     </div>
//   );
// }

// function KPICard({ title, value, subtitle }) {
//   return (
//     <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
//       <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
//         {title}
//       </p>
//       <p className="text-2xl font-black text-slate-900 mb-1">{value}</p>
//       <p className="text-[9px] font-bold text-slate-300 uppercase italic">
//         {subtitle}
//       </p>
//     </div>
//   );
// }
