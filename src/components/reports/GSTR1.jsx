"use client";
import { useState } from "react";
import * as XLSX from "xlsx";
import { Download, RefreshCw, AlertCircle } from "lucide-react";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n || 0);

export default function GSTR1() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = () => localStorage.getItem("token") || "";

  const fetchReport = async () => {
    if (!fromDate || !toDate) return setError("Please select both dates");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/gst/gstr1?fromDate=${fromDate}&toDate=${toDate}`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const result = await res.json();
      if (result.success) setData(result);
      else setError(result.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const exportExcel = () => {
    if (!data) return;
    const ws = XLSX.utils.json_to_sheet([...data.summary.B2B, ...data.summary.B2C]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GSTR-1");
    XLSX.writeFile(wb, `gstr1_${fromDate}_to_${toDate}.xlsx`);
  };

  const clearDates = () => {
    setFromDate("");
    setToDate("");
    setData(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-white">
        <h2 className="text-lg font-semibold text-gray-800">GSTR‑1 – Outward Supplies</h2>
        <p className="text-xs text-gray-500 mt-0.5">Details of taxable outward supplies (B2B/B2C)</p>
      </div>

      {/* Filter Bar */}
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 outline-none transition"
            />
          </div>
          <button
            onClick={fetchReport}
            disabled={!fromDate || !toDate}
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
          {(fromDate || toDate) && (
            <button onClick={clearDates} className="text-gray-500 hover:text-gray-700 text-sm underline">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-32 bg-gray-100 rounded"></div>
            <div className="h-6 bg-gray-200 rounded w-1/4"></div>
            <div className="h-40 bg-gray-100 rounded"></div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded flex items-start gap-3">
            <AlertCircle className="text-red-500 shrink-0" size={18} />
            <div className="text-sm text-red-700">{error}</div>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 uppercase tracking-wide">Taxable Value</p>
                <p className="text-lg font-bold text-blue-700">{fmtINR(data.totals.totalTaxableValue)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 uppercase tracking-wide">CGST</p>
                <p className="text-lg font-bold text-green-700">{fmtINR(data.totals.totalCgst)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 uppercase tracking-wide">SGST</p>
                <p className="text-lg font-bold text-green-700">{fmtINR(data.totals.totalSgst)}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-3 text-center">
                <p className="text-xs text-purple-600 uppercase tracking-wide">IGST</p>
                <p className="text-lg font-bold text-purple-700">{fmtINR(data.totals.totalIgst)}</p>
              </div>
            </div>

            {/* B2B Section */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-6 bg-indigo-500 rounded-full"></span> B2B Supplies
                <span className="text-xs text-gray-400 font-normal ml-2">({data.summary.B2B.length} invoices)</span>
              </h3>
              {data.summary.B2B.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">No B2B transactions</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Invoice#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Customer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">GSTIN</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">HSN</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Taxable</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">GST%</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">CGST</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">SGST</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">IGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.summary.B2B.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo}</td>
                          <td className="px-4 py-3">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">{row.customerName}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.customerGstin || "—"}</td>
                          <td className="px-4 py-3">{row.itemName}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.hsn || "—"}</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.taxableValue)}</td>
                          <td className="px-4 py-3 text-right">{row.gstRate}%</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.cgst)}</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.sgst)}</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* B2C Section */}
            <div>
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="w-2 h-6 bg-gray-400 rounded-full"></span> B2C Supplies
                <span className="text-xs text-gray-400 font-normal ml-2">({data.summary.B2C.length} invoices)</span>
              </h3>
              {data.summary.B2C.length === 0 ? (
                <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-lg">No B2C transactions</div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left">Invoice#</th>
                        <th className="px-4 py-3 text-left">Date</th>
                        <th className="px-4 py-3 text-left">Customer</th>
                        <th className="px-4 py-3 text-left">Item</th>
                        <th className="px-4 py-3 text-left">HSN</th>
                        <th className="px-4 py-3 text-right">Taxable</th>
                        <th className="px-4 py-3 text-right">GST%</th>
                        <th className="px-4 py-3 text-right">CGST</th>
                        <th className="px-4 py-3 text-right">SGST</th>
                        <th className="px-4 py-3 text-right">IGST</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.summary.B2C.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition">
                          <td className="px-4 py-3 font-mono text-xs">{row.invoiceNo}</td>
                          <td className="px-4 py-3">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium">{row.customerName}</td>
                          <td className="px-4 py-3">{row.itemName}</td>
                          <td className="px-4 py-3 font-mono text-xs">{row.hsn || "—"}</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.taxableValue)}</td>
                          <td className="px-4 py-3 text-right">{row.gstRate}%</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.cgst)}</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.sgst)}</td>
                          <td className="px-4 py-3 text-right">{fmtINR(row.igst)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}