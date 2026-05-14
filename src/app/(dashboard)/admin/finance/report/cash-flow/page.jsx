"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Download, Printer } from "lucide-react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function CashFlowPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`);
  const token = () => localStorage.getItem("token") || "";

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounts/reports/cash-flow?fiscalYear=${fiscalYear}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const result = await res.json();
      if (result.success) setData(result.data);
      else setError(result.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [fiscalYear]);

  useEffect(() => { loadData(); }, [loadData]);

  const exportToExcel = () => {
    if (!data) return;
    const rows = [
      { Activity: "Operating Activities", Amount: fmtINR(data.operating) },
      { Activity: "Investing Activities", Amount: fmtINR(data.investing) },
      { Activity: "Financing Activities", Amount: fmtINR(data.financing) },
      { Activity: "Net Cash Flow", Amount: fmtINR(data.netCashFlow) },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cash Flow");
    XLSX.writeFile(wb, `cash_flow_${fiscalYear}.xlsx`);
  };

  const exportToPDF = () => {
    const element = document.getElementById("cashflow-content");
    html2pdf().set({ margin: 0.5, filename: `cash_flow_${fiscalYear}.pdf` }).from(element).save();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Cash Flow Statement</h1>
          <div className="flex gap-2">
            <button onClick={exportToExcel} className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm">Excel</button>
            <button onClick={exportToPDF} className="bg-red-600 text-white px-3 py-1.5 rounded text-sm">PDF</button>
            <button onClick={loadData} className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm flex items-center gap-1"><RefreshCw size={14} /> Refresh</button>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6" id="cashflow-content">
          {loading ? <div className="animate-pulse h-40 bg-gray-100 rounded"></div> : error ? <p className="text-red-600">{error}</p> : data && (
            <div className="space-y-4">
              <div className="flex justify-between border-b pb-2"><span className="font-semibold">Operating Activities</span><span>{fmtINR(data.operating)}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="font-semibold">Investing Activities</span><span>{fmtINR(data.investing)}</span></div>
              <div className="flex justify-between border-b pb-2"><span className="font-semibold">Financing Activities</span><span>{fmtINR(data.financing)}</span></div>
              <div className="flex justify-between font-bold text-lg pt-2"><span>Net Cash Flow</span><span className={data.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}>{fmtINR(data.netCashFlow)}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}