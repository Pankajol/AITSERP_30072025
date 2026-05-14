"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Search, ChevronRight, ChevronDown, X, Download, Printer, RefreshCw } from "lucide-react";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

// ─────────────────────────────────────────────────────────────
// Debounce Hook
// ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─────────────────────────────────────────────────────────────
// Main Statement Page Component
// ─────────────────────────────────────────────────────────────
export default function StatementPage({ type = "bank" }) {
  const token = () => localStorage.getItem("token") || "";

  const TYPE_CONFIG = {
    bank: {
      title: "Bank Statement",
      color: "emerald",
      fetchAccounts: async () => {
        const res = await fetch("/api/accounts/heads?isActive=true&type=Asset", {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const d = await res.json();
        if (d.success) {
          return d.data.filter(a => 
            a.group === "Bank Account" || 
            (a.group === "Current Asset" && a.name.toLowerCase().includes("bank"))
          );
        }
        return [];
      },
      fetchLedger: async (accountId, fiscalYear, fromDate, toDate) => {
        let url = `/api/accounts/ledger/${accountId}`;
        const params = new URLSearchParams();
        if (fiscalYear) params.append("fiscalYear", fiscalYear);
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
        if (params.toString()) url += `?${params.toString()}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
        const d = await res.json();
        return d.success ? d.entries : [];
      },
    },
    customer: {
      title: "Customer Statement",
      color: "blue",
      fetchAccounts: async () => {
        const res = await fetch("/api/customers", {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const d = await res.json();
        if (d.success) {
          return d.data.map(c => ({
            _id: c._id,
            name: c.customerName,
            code: c.customerCode,
            type: "Customer",
          }));
        }
        return [];
      },
      fetchLedger: async (customerId, fiscalYear, fromDate, toDate) => {
        let url = `/api/customers/${customerId}/ledger`;
        const params = new URLSearchParams();
        if (fiscalYear) params.append("fiscalYear", fiscalYear);
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
        if (params.toString()) url += `?${params.toString()}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
        const d = await res.json();
        return d.success ? d.entries : [];
      },
    },
    supplier: {
      title: "Supplier Statement",
      color: "rose",
      fetchAccounts: async () => {
        const res = await fetch("/api/suppliers", {
          headers: { Authorization: `Bearer ${token()}` },
        });
        const d = await res.json();
        if (d.success) {
          return d.data.map(s => ({
            _id: s._id,
            name: s.supplierName,
            code: s.supplierCode,
            type: "Supplier",
          }));
        }
        return [];
      },
      fetchLedger: async (supplierId, fiscalYear, fromDate, toDate) => {
        let url = `/api/suppliers/${supplierId}/ledger`;
        const params = new URLSearchParams();
        if (fiscalYear) params.append("fiscalYear", fiscalYear);
        if (fromDate) params.append("fromDate", fromDate);
        if (toDate) params.append("toDate", toDate);
        if (params.toString()) url += `?${params.toString()}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
        const d = await res.json();
        return d.success ? d.entries : [];
      },
    },
  };

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.bank;

  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedAccountName, setSelectedAccountName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Fetch accounts on mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const list = await config.fetchAccounts();
        setAccounts(list);
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      }
    };
    loadAccounts();
  }, [type]);

  // Fetch ledger entries
  const fetchLedger = useCallback(async () => {
    if (!selectedAccountId) return;
    setLoading(true);
    try {
      const entries = await config.fetchLedger(selectedAccountId, fiscalYear, fromDate, toDate);
      setEntries(entries || []);
    } catch (err) {
      console.error("Ledger fetch error:", err);
      setEntries([]);
    }
    setLoading(false);
  }, [selectedAccountId, fiscalYear, fromDate, toDate]);

  useEffect(() => {
    if (selectedAccountId) fetchLedger();
  }, [selectedAccountId, fiscalYear, fromDate, toDate, fetchLedger]);

  // Filter accounts by search term
  const filteredAccounts = useMemo(() => {
    if (!debouncedSearchTerm) return accounts;
    const term = debouncedSearchTerm.toLowerCase();
    return accounts.filter(acc =>
      (acc.name || "").toLowerCase().includes(term) ||
      (acc.code || "").toLowerCase().includes(term)
    );
  }, [accounts, debouncedSearchTerm]);

  // Filter entries by search term
  const filteredEntries = useMemo(() => {
    if (!debouncedSearchTerm) return entries;
    const term = debouncedSearchTerm.toLowerCase();
    return entries.filter(e =>
      (e.narration || "").toLowerCase().includes(term) ||
      (e.transactionNumber || "").toLowerCase().includes(term) ||
      (e.transactionType || "").toLowerCase().includes(term)
    );
  }, [entries, debouncedSearchTerm]);

  const totalDebit = filteredEntries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = filteredEntries.reduce((s, e) => s + (e.credit || 0), 0);
  const closing = filteredEntries.length ? filteredEntries[filteredEntries.length - 1].balance : 0;

  // Export functions
  const exportToExcel = () => {
    if (!filteredEntries.length) {
      alert("No data to export");
      return;
    }
    const sheetData = filteredEntries.map((e) => ({
      Date: new Date(e.date).toLocaleDateString("en-IN"),
      "Ref No": e.transactionNumber || "",
      Type: e.transactionType || "",
      Narration: e.narration || "",
      Debit: e.debit || 0,
      Credit: e.credit || 0,
      Balance: e.balance || 0,
    }));
    sheetData.push({
      Date: "", "Ref No": "", Type: "", Narration: "TOTAL / CLOSING",
      Debit: totalDebit, Credit: totalCredit, Balance: closing,
    });
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${config.title} - ${selectedAccountName}`);
    XLSX.writeFile(wb, `${config.title}_${selectedAccountName}_${fiscalYear}.xlsx`);
  };

  const exportToPDF = () => {
    if (!filteredEntries.length) {
      alert("No data to export");
      return;
    }
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text(`${config.title} - ${selectedAccountName}`, 14, 15);
    doc.setFontSize(10);
    doc.text(`Financial Year: ${fiscalYear}`, 14, 22);
    if (fromDate || toDate) {
      let range = "";
      if (fromDate && toDate) range = `${fromDate} to ${toDate}`;
      else if (fromDate) range = `From ${fromDate}`;
      else if (toDate) range = `Until ${toDate}`;
      doc.text(`Date Range: ${range}`, 14, 28);
    }

    const formatAmount = (amount) => amount === 0 ? "0" : `Rs. ${amount.toLocaleString("en-IN")}`;
    const tableBody = filteredEntries.map((e) => [
      new Date(e.date).toLocaleDateString("en-IN"),
      e.transactionNumber || "",
      e.transactionType || "",
      e.narration || "",
      formatAmount(e.debit || 0),
      formatAmount(e.credit || 0),
      formatAmount(e.balance || 0),
    ]);
    tableBody.push(["", "", "", "TOTAL / CLOSING", formatAmount(totalDebit), formatAmount(totalCredit), formatAmount(closing)]);

    autoTable(doc, {
      head: [["Date", "Ref No", "Type", "Narration", "Debit", "Credit", "Balance"]],
      body: tableBody,
      startY: 35,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [240, 248, 255] },
      columnStyles: {
        0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 30 },
        3: { cellWidth: 50 }, 4: { cellWidth: 35, halign: "right" },
        5: { cellWidth: 35, halign: "right" }, 6: { cellWidth: 35, halign: "right" },
      },
      margin: { left: 10, right: 10 },
    });
    doc.save(`${config.title}_${selectedAccountName}_${fiscalYear}.pdf`);
  };

  const colorClasses = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  };
  const colors = colorClasses[config.color] || colorClasses.emerald;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{config.title}</h1>
          <p className="text-gray-500 text-sm">View and export account transactions</p>
        </div>

        {/* Filters Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Account Selector */}
            <div className="relative">
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                {type === "customer" ? "Customer" : type === "supplier" ? "Supplier" : "Bank Account"}
              </label>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-left text-sm flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <span className={selectedAccountId ? "text-gray-900" : "text-gray-400"}>
                  {selectedAccountName || `Select ${type === "customer" ? "customer" : type === "supplier" ? "supplier" : "bank account"}...`}
                </span>
                <ChevronRight size={16} className={`transform transition-transform ${showDropdown ? "rotate-90" : ""}`} />
              </button>
              {showDropdown && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  <div className="sticky top-0 p-2 border-b border-gray-200 bg-white">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                      <input
                        type="text"
                        placeholder={`Search ${type === "customer" ? "customers" : type === "supplier" ? "suppliers" : "accounts"}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      />
                    </div>
                  </div>
                  <div>
                    {filteredAccounts.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-sm">No results found</div>
                    ) : (
                      filteredAccounts.map(acc => (
                        <div
                          key={acc._id}
                          className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${selectedAccountId === acc._id ? "bg-indigo-50 text-indigo-700" : ""}`}
                          onClick={() => {
                            setSelectedAccountId(acc._id);
                            setSelectedAccountName(acc.name);
                            setShowDropdown(false);
                            setSearchTerm("");
                          }}
                        >
                          <div className="font-medium">{acc.name}</div>
                          {acc.code && <div className="text-xs text-gray-400">{acc.code}</div>}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Fiscal Year */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fiscal Year</label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {[2023, 2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={`${y}-${String(y + 1).slice(2)}`}>{y}-{String(y + 1).slice(2)}</option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* To Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={fetchLedger}
              disabled={!selectedAccountId}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button
              onClick={exportToExcel}
              disabled={!selectedAccountId || !entries.length}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Download size={14} /> Excel
            </button>
            <button
              onClick={exportToPDF}
              disabled={!selectedAccountId || !entries.length}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Printer size={14} /> PDF
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {selectedAccountId && entries.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
              <p className="text-xs text-gray-500 uppercase">Total Debit</p>
              <p className="text-2xl font-bold text-blue-600">{fmtINR(totalDebit)}</p>
            </div>
            <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
              <p className="text-xs text-gray-500 uppercase">Total Credit</p>
              <p className="text-2xl font-bold text-purple-600">{fmtINR(totalCredit)}</p>
            </div>
            <div className={`${colors.bg} rounded-xl p-4 border ${colors.border}`}>
              <p className="text-xs text-gray-500 uppercase">Closing Balance</p>
              <p className={`text-2xl font-bold ${closing >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {fmtINR(Math.abs(closing))}
              </p>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Transaction Details</h3>
            <span className="text-xs text-gray-500">{filteredEntries.length} transactions</span>
          </div>

          {!selectedAccountId ? (
            <div className="p-12 text-center text-gray-400">
              <p>Select {type === "customer" ? "a customer" : type === "supplier" ? "a supplier" : "a bank account"} to view statement</p>
            </div>
          ) : loading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />)}
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <p>No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {["Date", "Ref No", "Type", "Narration", "Debit", "Credit", "Balance"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <table></table>
                  {filteredEntries.map((e, idx) => (
                    <tr key={e._id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">
                        {new Date(e.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono font-medium text-indigo-600">{e.transactionNumber || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{e.transactionType || "—"}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 max-w-md truncate">{e.narration || "—"}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-blue-600">{e.debit ? fmtINR(e.debit) : "—"}</td>
                      <td className="px-4 py-3 text-sm text-right font-mono text-purple-600">{e.credit ? fmtINR(e.credit) : "—"}</td>
                      <td className={`px-4 py-3 text-sm text-right font-mono font-semibold ${(e.balance || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                        {fmtINR(Math.abs(e.balance || 0))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td colSpan={4} className="px-4 py-3 font-semibold">Closing Balance</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-blue-600">{fmtINR(totalDebit)}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-purple-600">{fmtINR(totalCredit)}</td>
                    <td className={`px-4 py-3 text-right font-mono font-bold text-lg ${closing >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                      {fmtINR(Math.abs(closing))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// "use client";
// // Works for Customer Statement, Supplier Statement, Bank Statement
// // Pass: type="customer" | "supplier" | "bank"
// import { useEffect, useState, useMemo } from "react";

// const fmtINR = (n) =>
//   new Intl.NumberFormat("en-IN", {
//     style: "currency",
//     currency: "INR",
//     maximumFractionDigits: 0,
//   }).format(n || 0);

// const TYPE_CFG = {
//   customer: {
//     label: "Customer Statement",
//     color: "#38bdf8",
//     partyLabel: "Customer",
//     // For customers, we fetch account heads of type Asset with "receivable"
//     fetchList: async (token) => {
//       const res = await fetch("/api/accounts/heads", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const d = await res.json();
//       if (d.success) {
//         return d.data.filter(
//           (a) => a.type === "Asset" && a.name.toLowerCase().includes("receiv")
//         );
//       }
//       return [];
//     },
//   },
//  // ... inside your TYPE_CFG object

// supplier: {
//   label: "Supplier Statement",
//   color: "#f472b6",
//   partyLabel: "Supplier",
//   fetchList: async (token) => {
//     const res = await fetch("/api/suppliers", {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     const d = await res.json();
//     if (d.success) {
//       return d.data
//         .filter((sup) => sup.glAccount)
//         .map((sup) => ({
//           // ✅ CORRECTED: Always use the string ID
//           _id: sup.glAccount?._id || sup.glAccount,
//           name: sup.supplierName,
//           type: "Liability",
//         }));
//     }
//     return [];
//   },
// },
//   bank: {
//     label: "Bank Statement",
//     color: "#22c55e",
//     partyLabel: "Bank Account",
//     // For bank, fetch account heads of group "Current Asset" with "bank" in name
//     fetchList: async (token) => {
//       const res = await fetch("/api/accounts/heads", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       const d = await res.json();
//       if (d.success) {
//         return d.data.filter(
//           (a) =>
//             a.group === "Current Asset" &&
//             a.name.toLowerCase().includes("bank")
//         );
//       }
//       return [];
//     },
//   },
// };

// export default function StatementPage({ type = "customer" }) {
//   const token = () => localStorage.getItem("token") || "";
//   const cfg = TYPE_CFG[type] || TYPE_CFG.customer;

//   const [accounts, setAccounts] = useState([]);
//   const [entries, setEntries] = useState([]);
//   const [selectedParty, setSelectedParty] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [fy, setFy] = useState(
//     `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`
//   );
//   const [from, setFrom] = useState("");
//   const [to, setTo] = useState("");

//   // Fetch list of parties (accounts) based on type
//   useEffect(() => {
//     const loadAccounts = async () => {
//       try {
//         const list = await cfg.fetchList(token());
//         setAccounts(list);
//       } catch (err) {
//         console.error("Failed to fetch accounts:", err);
//       }
//     };
//     loadAccounts();
//   }, [type]);

//   // Fetch ledger entries when selectedParty, fy, from, to change
//   useEffect(() => {
//     if (selectedParty) fetchLedger();
//   }, [selectedParty, fy, from, to]);

//   const fetchLedger = async () => {
//     setLoading(true);
//     let url = `/api/accounts/ledger/${selectedParty}?fiscalYear=${fy}`;
//     if (from) url += `&fromDate=${from}`;
//     if (to) url += `&toDate=${to}`;
//     try {
//       const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
//       const d = await res.json();
//       if (d.success) {
//         setEntries(d.entries || []);
//       } else {
//         setEntries([]);
//       }
//     } catch (err) {
//       console.error("Ledger fetch error:", err);
//       setEntries([]);
//     }
//     setLoading(false);
//   };

//   const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
//   const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
//   const closing = entries.length ? entries[entries.length - 1].balance : 0;

//   const S = {
//     page: {
//       minHeight: "100vh",
//       background: "#060b14",
//       fontFamily: "'Syne', sans-serif",
//       color: "#e2e8f0",
//       padding: "32px 20px 60px",
//     },
//     card: {
//       background: "#0d1829",
//       border: "1px solid rgba(255,255,255,0.07)",
//       borderRadius: 16,
//       overflow: "hidden",
//     },
//     inp: {
//       padding: "9px 12px",
//       borderRadius: 9,
//       background: "rgba(255,255,255,0.04)",
//       border: "1px solid rgba(255,255,255,0.1)",
//       color: "#e2e8f0",
//       fontFamily: "'DM Mono', monospace",
//       fontSize: 13,
//       outline: "none",
//       colorScheme: "dark",
//     },
//     sk: {
//       background:
//         "linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",
//       backgroundSize: "400px 100%",
//       animation: "sk 1.4s infinite",
//       borderRadius: 8,
//     },
//   };

//   return (
//     <>
//       <style>
//         {`
//           @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');
//           @keyframes sk {
//             0% { background-position: -400px 0; }
//             100% { background-position: 400px 0; }
//           }
//           @keyframes fu {
//             from { opacity: 0; transform: translateY(16px); }
//             to { opacity: 1; transform: translateY(0); }
//           }
//           table { border-collapse: collapse; width: 100%; }
//         `}
//       </style>
//       <div style={S.page}>
//         <div style={{ maxWidth: 1100, margin: "0 auto" }}>
//           {/* Header */}
//           <div style={{ marginBottom: 24, animation: "fu 0.4s ease" }}>
//             <div
//               style={{
//                 fontFamily: "'DM Mono', monospace",
//                 fontSize: 11,
//                 color: "#475569",
//                 textTransform: "uppercase",
//                 letterSpacing: 2,
//                 marginBottom: 4,
//               }}
//             >
//               Finance Reports
//             </div>
//             <h1
//               style={{
//                 fontSize: 30,
//                 fontWeight: 800,
//                 color: "#f8fafc",
//                 margin: 0,
//               }}
//             >
//               {cfg.label}
//             </h1>
//           </div>

//           {/* Filters */}
//           <div
//             style={{
//               ...S.card,
//               padding: "16px 18px",
//               marginBottom: 18,
//               display: "flex",
//               gap: 12,
//               alignItems: "flex-end",
//               flexWrap: "wrap",
//               borderRadius: 12,
//             }}
//           >
//             <div style={{ flex: "2 1 220px" }}>
//               <div
//                 style={{
//                   fontFamily: "'DM Mono', monospace",
//                   fontSize: 10,
//                   color: "#475569",
//                   textTransform: "uppercase",
//                   letterSpacing: 1.5,
//                   marginBottom: 6,
//                 }}
//               >
//                 {cfg.partyLabel} *
//               </div>
//               <select
//                 value={selectedParty}
//                 onChange={(e) => setSelectedParty(e.target.value)}
//                 style={{ ...S.inp, width: "100%" }}
//               >
//                 <option value="">-- Select {cfg.partyLabel} --</option>
//                 {accounts.map((a) => (
//                   <option key={a._id} value={a._id}>
//                     {a.name}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <div
//                 style={{
//                   fontFamily: "'DM Mono', monospace",
//                   fontSize: 10,
//                   color: "#475569",
//                   textTransform: "uppercase",
//                   letterSpacing: 1.5,
//                   marginBottom: 6,
//                 }}
//               >
//                 Fiscal Year
//               </div>
//               <select
//                 value={fy}
//                 onChange={(e) => setFy(e.target.value)}
//                 style={S.inp}
//               >
//                 {[2024, 2025, 2026].map((y) => (
//                   <option key={y} value={`${y}-${String(y + 1).slice(2)}`}>
//                     {y}-{String(y + 1).slice(2)}
//                   </option>
//                 ))}
//               </select>
//             </div>
//             <div>
//               <div
//                 style={{
//                   fontFamily: "'DM Mono', monospace",
//                   fontSize: 10,
//                   color: "#475569",
//                   textTransform: "uppercase",
//                   letterSpacing: 1.5,
//                   marginBottom: 6,
//                 }}
//               >
//                 From
//               </div>
//               <input
//                 type="date"
//                 value={from}
//                 onChange={(e) => setFrom(e.target.value)}
//                 style={S.inp}
//               />
//             </div>
//             <div>
//               <div
//                 style={{
//                   fontFamily: "'DM Mono', monospace",
//                   fontSize: 10,
//                   color: "#475569",
//                   textTransform: "uppercase",
//                   letterSpacing: 1.5,
//                   marginBottom: 6,
//                 }}
//               >
//                 To
//               </div>
//               <input
//                 type="date"
//                 value={to}
//                 onChange={(e) => setTo(e.target.value)}
//                 style={S.inp}
//               />
//             </div>
//             <button
//               onClick={fetchLedger}
//               disabled={!selectedParty}
//               style={{
//                 padding: "9px 16px",
//                 borderRadius: 9,
//                 border: "1px solid rgba(99,102,241,0.3)",
//                 background: "rgba(99,102,241,0.1)",
//                 color: "#818cf8",
//                 fontFamily: "'DM Mono', monospace",
//                 fontSize: 12,
//                 cursor: selectedParty ? "pointer" : "not-allowed",
//                 opacity: selectedParty ? 1 : 0.5,
//               }}
//             >
//               ↻ Refresh
//             </button>
//           </div>

//           {/* Summary Cards */}
//           {entries.length > 0 && (
//             <div
//               style={{
//                 display: "grid",
//                 gridTemplateColumns: "repeat(3,1fr)",
//                 gap: 12,
//                 marginBottom: 18,
//               }}
//             >
//               {[
//                 ["Total Debit", totalDebit, "#38bdf8"],
//                 ["Total Credit", totalCredit, "#a78bfa"],
//                 ["Closing Balance", Math.abs(closing), cfg.color],
//               ].map(([l, v, c]) => (
//                 <div
//                   key={l}
//                   style={{
//                     background: `${c}10`,
//                     border: `1px solid ${c}25`,
//                     borderRadius: 12,
//                     padding: "14px 16px",
//                     textAlign: "center",
//                   }}
//                 >
//                   <div
//                     style={{
//                       fontFamily: "'Syne', sans-serif",
//                       fontWeight: 700,
//                       fontSize: 20,
//                       color: c,
//                     }}
//                   >
//                     {fmtINR(v)}
//                   </div>
//                   <div
//                     style={{
//                       fontFamily: "'DM Mono', monospace",
//                       fontSize: 10,
//                       color: "#475569",
//                       marginTop: 3,
//                     }}
//                   >
//                     {l}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* Table */}
//           <div style={S.card}>
//             <div
//               style={{
//                 padding: "16px 20px",
//                 borderBottom: "1px solid rgba(255,255,255,0.06)",
//                 display: "flex",
//                 justifyContent: "space-between",
//                 alignItems: "center",
//               }}
//             >
//               <div
//                 style={{
//                   fontFamily: "'Syne', sans-serif",
//                   fontWeight: 700,
//                   fontSize: 16,
//                   color: "#f1f5f9",
//                 }}
//               >
//                 {cfg.label}
//               </div>
//               <div
//                 style={{
//                   fontFamily: "'DM Mono', monospace",
//                   fontSize: 11,
//                   color: "#475569",
//                 }}
//               >
//                 {entries.length} transactions
//               </div>
//             </div>

//             {!selectedParty ? (
//               <div
//                 style={{
//                   padding: "80px 20px",
//                   textAlign: "center",
//                   fontFamily: "'DM Mono', monospace",
//                   fontSize: 13,
//                   color: "#334155",
//                 }}
//               >
//                 Select a {cfg.partyLabel.toLowerCase()} to view statement
//               </div>
//             ) : loading ? (
//               <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
//                 {[1, 2, 3, 4].map((i) => (
//                   <div key={i} style={{ ...S.sk, height: 44 }} />
//                 ))}
//               </div>
//             ) : entries.length === 0 ? (
//               <div style={{ padding: "60px 20px", textAlign: "center" }}>
//                 <div style={{ fontSize: 36, marginBottom: 12 }}>◎</div>
//                 <div
//                   style={{
//                     fontFamily: "'DM Mono', monospace",
//                     fontSize: 13,
//                     color: "#334155",
//                   }}
//                 >
//                   No transactions found
//                 </div>
//               </div>
//             ) : (
//               <div style={{ overflowX: "auto" }}>
//                 <table>
//                   <thead>
//                     <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
//                       {["Date", "Ref No", "Type", "Narration", "Debit", "Credit", "Balance"].map(
//                         (h) => (
//                           <th
//                             key={h}
//                             style={{
//                               padding: "11px 16px",
//                               textAlign: ["Debit", "Credit", "Balance"].includes(h)
//                                 ? "right"
//                                 : "left",
//                               fontFamily: "'DM Mono', monospace",
//                               fontSize: 10,
//                               color: "#334155",
//                               textTransform: "uppercase",
//                               letterSpacing: 1.5,
//                               fontWeight: 500,
//                             }}
//                           >
//                             {h}
//                           </th>
//                         )
//                       )}
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {entries.map((e, i) => {
//                       const debit = e.debit || 0;
//                       const credit = e.credit || 0;
//                       const bal = e.balance || 0;
//                       return (
//                         <tr
//                           key={e._id || i}
//                           style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
//                           onMouseEnter={(ev) =>
//                             (ev.currentTarget.style.background = "rgba(255,255,255,0.02)")
//                           }
//                           onMouseLeave={(ev) =>
//                             (ev.currentTarget.style.background = "transparent")
//                           }
//                         >
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               fontFamily: "'DM Mono', monospace",
//                               fontSize: 12,
//                               color: "#64748b",
//                               whiteSpace: "nowrap",
//                             }}
//                           >
//                             {new Date(e.date).toLocaleDateString("en-IN", {
//                               day: "2-digit",
//                               month: "short",
//                               year: "numeric",
//                             })}
//                           </td>
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               fontFamily: "'DM Mono', monospace",
//                               fontSize: 12,
//                               color: cfg.color,
//                             }}
//                           >
//                             {e.transactionNumber || "—"}
//                           </td>
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               fontFamily: "'DM Mono', monospace",
//                               fontSize: 11,
//                               color: "#475569",
//                             }}
//                           >
//                             {e.transactionType || "—"}
//                           </td>
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               fontFamily: "'Syne', sans-serif",
//                               fontSize: 13,
//                               color: "#e2e8f0",
//                               maxWidth: 200,
//                               overflow: "hidden",
//                               textOverflow: "ellipsis",
//                               whiteSpace: "nowrap",
//                             }}
//                           >
//                             {e.narration || "—"}
//                           </td>
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               textAlign: "right",
//                               fontFamily: "'DM Mono', monospace",
//                               fontSize: 13,
//                               color: "#38bdf8",
//                             }}
//                           >
//                             {debit > 0 ? fmtINR(debit) : "—"}
//                           </td>
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               textAlign: "right",
//                               fontFamily: "'DM Mono', monospace",
//                               fontSize: 13,
//                               color: "#a78bfa",
//                             }}
//                           >
//                             {credit > 0 ? fmtINR(credit) : "—"}
//                           </td>
//                           <td
//                             style={{
//                               padding: "11px 16px",
//                               textAlign: "right",
//                               fontFamily: "'Syne', sans-serif",
//                               fontWeight: 700,
//                               fontSize: 14,
//                               color: bal >= 0 ? cfg.color : "#ef4444",
//                             }}
//                           >
//                             {fmtINR(Math.abs(bal))}
//                           </td>
//                         </tr>
//                       );
//                     })}
//                   </tbody>
//                   <tfoot>
//                     <tr
//                       style={{
//                         borderTop: "2px solid rgba(255,255,255,0.08)",
//                         background: "rgba(255,255,255,0.03)",
//                       }}
//                     >
//                       <td
//                         colSpan={4}
//                         style={{
//                           padding: "12px 16px",
//                           fontFamily: "'Syne', sans-serif",
//                           fontWeight: 700,
//                           fontSize: 14,
//                           color: "#f1f5f9",
//                         }}
//                       >
//                         Closing Balance
//                       </td>
//                       <td
//                         style={{
//                           padding: "12px 16px",
//                           textAlign: "right",
//                           fontFamily: "'Syne', sans-serif",
//                           fontWeight: 700,
//                           color: "#38bdf8",
//                         }}
//                       >
//                         {fmtINR(totalDebit)}
//                       </td>
//                       <td
//                         style={{
//                           padding: "12px 16px",
//                           textAlign: "right",
//                           fontFamily: "'Syne', sans-serif",
//                           fontWeight: 700,
//                           color: "#a78bfa",
//                         }}
//                       >
//                         {fmtINR(totalCredit)}
//                       </td>
//                       <td
//                         style={{
//                           padding: "12px 16px",
//                           textAlign: "right",
//                           fontFamily: "'Syne', sans-serif",
//                           fontWeight: 800,
//                           fontSize: 16,
//                           color: cfg.color,
//                         }}
//                       >
//                         {fmtINR(Math.abs(closing))}
//                       </td>
//                     </tr>
//                   </tfoot>
//                 </table>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

// "use client";
// // Works for Customer Statement, Supplier Statement, Bank Statement
// // Pass: type="customer" | "supplier" | "bank"
// import { useEffect, useState, useMemo } from "react";
// const fmtINR = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(n||0);

// const TYPE_CFG = {
//   customer: { label:"Customer Statement", color:"#38bdf8", partyLabel:"Customer",  apiPath:"customer", txnTypes:["Sales Invoice","Receipt","Credit Note"] },
//   supplier: { label:"Supplier Statement", color:"#f472b6", partyLabel:"Supplier",  apiPath:"supplier", txnTypes:["Purchase Invoice","Payment","Debit Note"]  },
//   bank:     { label:"Bank Statement",     color:"#22c55e", partyLabel:"Bank Account", apiPath:"bank",  txnTypes:["Payment","Receipt","Contra","Journal Entry"] },
// };

// export default function StatementPage({ type = "customer" }) {
//   const token = ()=>localStorage.getItem("token")||"";
//   const cfg = TYPE_CFG[type]||TYPE_CFG.customer;
//   const [accounts,setAccounts]=useState([]);
//   const [entries,setEntries]=useState([]);
//   const [selectedParty,setSelectedParty]=useState("");
//   const [loading,setLoading]=useState(false);
//   const [fy,setFy]=useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
//   const [from,setFrom]=useState("");const [to,setTo]=useState("");

//   useEffect(()=>{
//     fetch("/api/accounts/heads",{headers:{Authorization:`Bearer ${token()}`}})
//       .then(r=>r.json()).then(d=>{ if(d.success) setAccounts(d.data||[]); });
//   },[]);

//   useEffect(()=>{ if(selectedParty) fetch_(); },[selectedParty,fy,from,to]);

//   const fetch_ = async()=>{
//     setLoading(true);setEntries([]);
//     // For customer/supplier: fetch transactions by partyId
//     // For bank: fetch ledger of the selected bank account
//     let url;
//     if(type==="bank") {
//       url=`/api/accounts/ledger/${selectedParty}?fiscalYear=${fy}`;
//       if(from) url+=`&fromDate=${from}`;if(to) url+=`&toDate=${to}`;
//       const res=await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
//       const d=await res.json();
//       if(d.success) setEntries(d.entries||[]);
//     } else {
//       url=`/api/accounts/transactions?partyId=${selectedParty}&fiscalYear=${fy}`;
//       if(from) url+=`&fromDate=${from}`;if(to) url+=`&toDate=${to}`;
//       const res=await fetch(url,{headers:{Authorization:`Bearer ${token()}`}});
//       const d=await res.json();
//       if(d.success) setEntries(d.data||[]);
//     }
//     setLoading(false);
//   };

//   // Filter accounts for party selector
//   const partyAccounts = useMemo(()=>{
//     if(type==="bank") return accounts.filter(a=>a.group==="Current Asset"&&(a.name.toLowerCase().includes("bank")||a.name.toLowerCase().includes("cash")));
//     if(type==="customer") return accounts.filter(a=>a.type==="Asset"&&a.name.toLowerCase().includes("receiv"));
//     return accounts.filter(a=>a.type==="Liability"&&a.name.toLowerCase().includes("pay"));
//   },[accounts,type]);

//   // Summary
//   const totalDebit  = entries.reduce((s,e)=>s+(e.debit||e.totalAmount||0),0);
//   const totalCredit = entries.reduce((s,e)=>s+(e.credit||0),0);
//   const closing     = entries.at(-1)?.balance??0;

//   const S={page:{minHeight:"100vh",background:"#060b14",fontFamily:"'Syne',sans-serif",color:"#e2e8f0",padding:"32px 20px 60px"},card:{background:"#0d1829",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,overflow:"hidden"},inp:{padding:"9px 12px",borderRadius:9,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.1)",color:"#e2e8f0",fontFamily:"'DM Mono',monospace",fontSize:13,outline:"none",colorScheme:"dark"},sk:{background:"linear-gradient(90deg,#1e293b 25%,#2d3f55 50%,#1e293b 75%)",backgroundSize:"400px 100%",animation:"sk 1.4s infinite",borderRadius:8}};

//   return(<>
//     <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&display=swap');@keyframes sk{0%{background-position:-400px 0}100%{background-position:400px 0}}@keyframes fu{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}table{border-collapse:collapse;width:100%}`}</style>
//     <div style={S.page}><div style={{maxWidth:1100,margin:"0 auto"}}>
//       <div style={{marginBottom:24,animation:"fu 0.4s ease"}}>
//         <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569",textTransform:"uppercase",letterSpacing:2,marginBottom:4}}>Finance Reports</div>
//         <h1 style={{fontSize:30,fontWeight:800,color:"#f8fafc",margin:0}}>{cfg.label}</h1>
//       </div>

//       {/* Filters */}
//       <div style={{...S.card,padding:"16px 18px",marginBottom:18,display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap",borderRadius:12}}>
//         <div style={{flex:"2 1 220px"}}>
//           <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>{cfg.partyLabel} *</div>
//           <select value={selectedParty} onChange={e=>setSelectedParty(e.target.value)} style={{...S.inp,width:"100%"}}>
//             <option value="">-- Select {cfg.partyLabel} --</option>
//             {(partyAccounts.length>0?partyAccounts:accounts).map(a=><option key={a._id} value={a._id}>{a.name}</option>)}
//           </select>
//         </div>
//         <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>Fiscal Year</div>
//           <select value={fy} onChange={e=>setFy(e.target.value)} style={S.inp}>{[2024,2025,2026].map(y=><option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}</select>
//         </div>
//         <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>From</div>
//           <input type="date" value={from} onChange={e=>setFrom(e.target.value)} style={S.inp}/>
//         </div>
//         <div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",textTransform:"uppercase",letterSpacing:1.5,marginBottom:6}}>To</div>
//           <input type="date" value={to} onChange={e=>setTo(e.target.value)} style={S.inp}/>
//         </div>
//         <button onClick={fetch_} disabled={!selectedParty} style={{padding:"9px 16px",borderRadius:9,border:"1px solid rgba(99,102,241,0.3)",background:"rgba(99,102,241,0.1)",color:"#818cf8",fontFamily:"'DM Mono',monospace",fontSize:12,cursor:selectedParty?"pointer":"not-allowed",opacity:selectedParty?1:0.5}}>↻ Refresh</button>
//       </div>

//       {/* Summary cards */}
//       {entries.length>0&&(
//         <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:18}}>
//           {[["Total Debit",totalDebit,"#38bdf8"],["Total Credit",totalCredit,"#a78bfa"],["Closing Balance",Math.abs(closing),cfg.color]].map(([l,v,c])=>(
//             <div key={l} style={{background:`${c}10`,border:`1px solid ${c}25`,borderRadius:12,padding:"14px 16px",textAlign:"center"}}>
//               <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:20,color:c}}>{fmtINR(v)}</div>
//               <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"#475569",marginTop:3}}>{l}</div>
//             </div>
//           ))}
//         </div>
//       )}

//       {/* Table */}
//       <div style={S.card}>
//         <div style={{padding:"16px 20px",borderBottom:"1px solid rgba(255,255,255,0.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
//           <div style={{fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:16,color:"#f1f5f9"}}>{cfg.label}</div>
//           <div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{entries.length} transactions</div>
//         </div>

//         {!selectedParty?(<div style={{padding:"80px 20px",textAlign:"center",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>Select a {cfg.partyLabel.toLowerCase()} to view statement</div>)
//         :loading?(<div style={{padding:20,display:"flex",flexDirection:"column",gap:10}}>{[1,2,3,4].map(i=><div key={i} style={{...S.sk,height:44}}/>)}</div>)
//         :entries.length===0?(<div style={{padding:"60px 20px",textAlign:"center"}}><div style={{fontSize:36,marginBottom:12}}>◎</div><div style={{fontFamily:"'DM Mono',monospace",fontSize:13,color:"#334155"}}>No transactions found</div></div>):(
//           <div style={{overflowX:"auto"}}><table>
//             <thead><tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
//               {["Date","Ref No","Type","Narration","Debit","Credit","Balance"].map(h=>(
//                 <th key={h} style={{padding:"11px 16px",textAlign:["Debit","Credit","Balance"].includes(h)?"right":"left",fontFamily:"'DM Mono',monospace",fontSize:10,color:"#334155",textTransform:"uppercase",letterSpacing:1.5,fontWeight:500}}>{h}</th>
//               ))}
//             </tr></thead>
//             <tbody>
//               {entries.map((e,i)=>{
//                 const debit  = e.debit  ?? (e.type==="Payment"?e.totalAmount:0);
//                 const credit = e.credit ?? (e.type==="Receipt"?e.totalAmount:0);
//                 const bal    = e.balance ?? 0;
//                 return(
//                   <tr key={e._id||i} style={{borderBottom:"1px solid rgba(255,255,255,0.03)"}} onMouseEnter={ev=>ev.currentTarget.style.background="rgba(255,255,255,0.02)"} onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
//                     <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:"#64748b",whiteSpace:"nowrap"}}>{new Date(e.date).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td>
//                     <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:12,color:cfg.color}}>{e.transactionId?.transactionNumber||e.transactionNumber||"—"}</td>
//                     <td style={{padding:"11px 16px",fontFamily:"'DM Mono',monospace",fontSize:11,color:"#475569"}}>{e.transactionType||e.type||"—"}</td>
//                     <td style={{padding:"11px 16px",fontFamily:"'Syne',sans-serif",fontSize:13,color:"#e2e8f0",maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.narration||e.referenceNumber||"—"}</td>
//                     <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#38bdf8"}}>{debit>0?fmtINR(debit):"—"}</td>
//                     <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,color:"#a78bfa"}}>{credit>0?fmtINR(credit):"—"}</td>
//                     <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:bal>=0?cfg.color:"#ef4444"}}>{fmtINR(Math.abs(bal))}</td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//             <tfoot><tr style={{borderTop:"2px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.03)"}}>
//               <td colSpan={4} style={{padding:"12px 16px",fontFamily:"'Syne',sans-serif",fontWeight:700,fontSize:14,color:"#f1f5f9"}}>Closing Balance</td>
//               <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#38bdf8"}}>{fmtINR(totalDebit)}</td>
//               <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:700,color:"#a78bfa"}}>{fmtINR(totalCredit)}</td>
//               <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'Syne',sans-serif",fontWeight:800,fontSize:16,color:cfg.color}}>{fmtINR(Math.abs(closing))}</td>
//             </tr></tfoot>
//           </table></div>
//         )}
//       </div>
//     </div></div>
//   </>);
// }

// export function CustomerStatementPage() { return <StatementPage type="customer"/>; }
// export function SupplierStatementPage() { return <StatementPage type="supplier"/>; }
// export function BankStatementPage()     { return <StatementPage type="bank"/>; }