"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, RefreshCw, AlertCircle, TrendingUp, TrendingDown } from "lucide-react";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n || 0);

export default function GSTR3B() {
  const [month, setMonth] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = () => localStorage.getItem("token") || "";

  const fetchReport = async () => {
    if (!month) return setError("Please select a month");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/gst/gstr3b?month=${month}`, { headers: { Authorization: `Bearer ${token()}` } });
      const result = await res.json();
      if (result.success) setData(result);
      else setError(result.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data) return;
    const rows = [
      { Description: "Outward Taxable Supply (₹)", Value: data.outputTax.cgst + data.outputTax.sgst + data.outputTax.igst },
      { Description: "ITC Claimed (₹)", Value: data.inputTax.cgst + data.inputTax.sgst + data.inputTax.igst },
      { Description: "Net Tax Payable (₹)", Value: data.netPayable.cgst + data.netPayable.sgst + data.netPayable.igst },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GSTR-3B");
    XLSX.writeFile(wb, `gstr3b_${month}.xlsx`);
  };

  const netPayableTotal = data ? data.netPayable.cgst + data.netPayable.sgst + data.netPayable.igst : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white">
        <h2 className="text-lg font-semibold text-gray-800">GSTR‑3B – Monthly Summary</h2>
        <p className="text-xs text-gray-500 mt-0.5">Summary of outward supplies, ITC claimed, and tax payable</p>
      </div>

      {/* Filter Bar */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tax Period (Month)</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={!month}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Generate
          </button>
          <button
            onClick={exportExcel}
            disabled={!data}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 disabled:opacity-50"
          >
            <Download size={14} /> Excel
          </button>
          {month && (
            <button onClick={() => { setMonth(""); setData(null); setError(null); }} className="text-gray-500 hover:text-gray-700 text-sm underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-24 bg-gray-100 rounded-lg"></div>
            <div className="h-16 bg-gray-100 rounded-lg"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Output Tax Cards */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-indigo-500" /> Output Tax (Liability)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-xl p-4 text-center bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition">
                  <p className="text-xs text-blue-600 uppercase tracking-wide">CGST</p>
                  <p className="text-2xl font-bold text-blue-700">{fmtINR(data.outputTax.cgst)}</p>
                </div>
                <div className="border rounded-xl p-4 text-center bg-gradient-to-br from-green-50 to-white hover:shadow-md transition">
                  <p className="text-xs text-green-600 uppercase tracking-wide">SGST</p>
                  <p className="text-2xl font-bold text-green-700">{fmtINR(data.outputTax.sgst)}</p>
                </div>
                <div className="border rounded-xl p-4 text-center bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition">
                  <p className="text-xs text-purple-600 uppercase tracking-wide">IGST</p>
                  <p className="text-2xl font-bold text-purple-700">{fmtINR(data.outputTax.igst)}</p>
                </div>
              </div>
            </div>

            {/* Input Tax (ITC) Cards */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingDown size={16} className="text-emerald-500" /> Input Tax Credit (ITC)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="border rounded-xl p-4 text-center bg-gradient-to-br from-blue-50 to-white hover:shadow-md transition">
                  <p className="text-xs text-blue-600 uppercase tracking-wide">CGST</p>
                  <p className="text-2xl font-bold text-blue-700">{fmtINR(data.inputTax.cgst)}</p>
                </div>
                <div className="border rounded-xl p-4 text-center bg-gradient-to-br from-green-50 to-white hover:shadow-md transition">
                  <p className="text-xs text-green-600 uppercase tracking-wide">SGST</p>
                  <p className="text-2xl font-bold text-green-700">{fmtINR(data.inputTax.sgst)}</p>
                </div>
                <div className="border rounded-xl p-4 text-center bg-gradient-to-br from-purple-50 to-white hover:shadow-md transition">
                  <p className="text-xs text-purple-600 uppercase tracking-wide">IGST</p>
                  <p className="text-2xl font-bold text-purple-700">{fmtINR(data.inputTax.igst)}</p>
                </div>
              </div>
            </div>

            {/* Net Payable */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <div className="flex justify-between items-center flex-wrap gap-3">
                <div>
                  <p className="text-sm text-gray-600">Net Tax Payable</p>
                  <p className="text-xs text-gray-400">Output Tax – ITC</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-red-600">{fmtINR(netPayableTotal)}</div>
                  {netPayableTotal > 0 ? (
                    <p className="text-xs text-red-500 flex items-center gap-1 justify-end">Payable <TrendingUp size={12} /></p>
                  ) : netPayableTotal < 0 ? (
                    <p className="text-xs text-green-500 flex items-center gap-1 justify-end">Refund <TrendingDown size={12} /></p>
                  ) : (
                    <p className="text-xs text-gray-400">Zero liability</p>
                  )}
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400 border-t border-gray-200 pt-2">
                Liability after ITC adjustment
              </div>
            </div>

            {/* Tax Rate Details Table (optional but helpful) */}
            {data.outwardSupplies && data.outwardSupplies.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Outward Supplies by GST Rate</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left">GST Rate</th>
                        <th className="px-4 py-2 text-right">Taxable Value</th>
                        <th className="px-4 py-2 text-right">CGST</th>
                        <th className="px-4 py-2 text-right">SGST</th>
                        <th className="px-4 py-2 text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.outwardSupplies.map((item, idx) => (
                        <tr key={idx} className="border-t border-gray-100">
                          <td className="px-4 py-2">{item._id}%</td>
                          <td className="px-4 py-2 text-right">{fmtINR(item.totalTaxable)}</td>
                          <td className="px-4 py-2 text-right">{fmtINR(item.totalCgst)}</td>
                          <td className="px-4 py-2 text-right">{fmtINR(item.totalSgst)}</td>
                          <td className="px-4 py-2 text-right">{fmtINR(item.totalIgst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}