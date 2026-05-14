"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Search, RefreshCw, Mail, ChevronUp, ChevronDown, X, User, Building2, Calendar, Download, Printer, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtINR = n =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

// Ageing buckets
const BUCKETS = ["Current (0–30)", "31–60 Days", "61–90 Days", "91–120 Days", "120+ Days"];
const BUCKET_COLORS = ["#22c55e", "#38bdf8", "#f59e0b", "#f97316", "#ef4444"];

function StatusBadge({ bucket }) {
  const colors = [
    { bg: "bg-emerald-100", text: "text-emerald-700", label: "Current" },
    { bg: "bg-sky-100", text: "text-sky-700", label: "31–60 Days" },
    { bg: "bg-amber-100", text: "text-amber-700", label: "61–90 Days" },
    { bg: "bg-orange-100", text: "text-orange-700", label: "91–120 Days" },
    { bg: "bg-rose-100", text: "text-rose-700", label: "Critical" },
  ];
  const c = colors[bucket] || colors[0];
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>{c.label}</span>;
}

// ─────────────────────────────────────────────────────────────
// Auto-Suggest Component (Debounced Search)
// ─────────────────────────────────────────────────────────────
function AutoSuggestInput({ 
  placeholder, 
  onSelect, 
  fetchItems, 
  label,
  selectedValue,
  selectedName 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  // Update input when selected value changes externally
  useEffect(() => {
    if (selectedName) {
      setSearchTerm(selectedName);
    }
  }, [selectedName]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }
    
    setLoading(true);
    try {
      const results = await fetchItems(query);
      setSuggestions(results);
      setIsOpen(true);
    } catch (err) {
      console.error("Fetch suggestions error:", err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [fetchItems]);

  // Handle input change with debounce
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Clear previous timer
    if (debounceTimer) clearTimeout(debounceTimer);
    
    // Set new timer
    const timer = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
    setDebounceTimer(timer);
  };

  const handleSelect = (item) => {
    setSearchTerm(item.name);
    setSuggestions([]);
    setIsOpen(false);
    onSelect(item);
  };

  const handleClear = () => {
    setSearchTerm("");
    setSuggestions([]);
    onSelect(null);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => searchTerm.length >= 2 && suggestions.length > 0 && setIsOpen(true)}
          className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
        />
        {searchTerm && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loader2 size={14} className="animate-spin text-indigo-500" />
          </div>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
        >
          {suggestions.map((item, idx) => (
            <div
              key={item._id || idx}
              className="px-3 py-2 cursor-pointer hover:bg-indigo-50 transition-colors border-b border-gray-100 last:border-0"
              onClick={() => handleSelect(item)}
            >
              <div className="font-medium text-gray-900 text-sm">{item.name}</div>
              {item.code && <div className="text-xs text-gray-400">{item.code}</div>}
              {item.email && <div className="text-xs text-gray-400">{item.email}</div>}
              {item.outstanding !== undefined && (
                <div className="text-xs font-mono mt-1" style={{ color: item.outstanding > 0 ? "#ef4444" : "#22c55e" }}>
                  Outstanding: {fmtINR(item.outstanding)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Ageing Page Component
// ─────────────────────────────────────────────────────────────
export default function AgeingPage({ partyType = "Customer" }) {
  const token = () => localStorage.getItem("token") || "";

  const [selectedParty, setSelectedParty] = useState(null);
  const [ageingData, setAgeingData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [sortBucket, setSortBucket] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [toast, setToast] = useState(null);
  const [exporting, setExporting] = useState(false);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch customers/suppliers for auto-suggest
  const fetchPartySuggestions = useCallback(async (query) => {
    try {
      const endpoint = partyType === "Customer" ? "customers" : "suppliers";
      const res = await fetch(`/api/${endpoint}?search=${encodeURIComponent(query)}&limit=10`, {
        headers: { Authorization: `Bearer ${token()}` }
      });
      const data = await res.json();
      if (data.success) {
        return data.data.map(item => ({
          _id: item._id,
          name: partyType === "Customer" ? item.customerName : item.supplierName,
          code: partyType === "Customer" ? item.customerCode : item.supplierCode,
          email: item.emailId || item.email,
        }));
      }
      return [];
    } catch (err) {
      console.error("Fetch suggestions error:", err);
      return [];
    }
  }, [partyType]);

  // Fetch ageing data for selected party
  const fetchAgeingData = useCallback(async () => {
    if (!selectedParty) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/accounts/ageing?partyType=${partyType}&partyId=${selectedParty._id}&asOf=${asOfDate}`,
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      const data = await res.json();
      if (data.success) {
        setAgeingData(data.data);
      } else {
        showToast(data.message || "Failed to load ageing data", "error");
      }
    } catch (err) {
      console.error("Ageing fetch error:", err);
      showToast("Failed to load ageing data", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedParty, partyType, asOfDate]);

  useEffect(() => {
    if (selectedParty) fetchAgeingData();
  }, [selectedParty, asOfDate, fetchAgeingData]);

  const handlePartySelect = (party) => {
    setSelectedParty(party);
    setAgeingData(null);
  };

  const totals = useMemo(() => {
    if (!ageingData) return [0, 0, 0, 0, 0];
    const t = [0, 0, 0, 0, 0];
    ageingData.buckets?.forEach((v, i) => { t[i] = v || 0; });
    return t;
  }, [ageingData]);

  const grandTotal = totals.reduce((s, v) => s + v, 0);

  const handleSort = (bucketIndex) => {
    if (sortBucket === bucketIndex) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBucket(bucketIndex);
      setSortOrder("desc");
    }
  };

  const sendReminder = async () => {
    if (!selectedParty) return;
    setLoading(true);
    try {
      const res = await fetch("/api/accounts/ageing/reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ partyId: selectedParty._id, partyType, amount: grandTotal }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Reminder sent to ${selectedParty.name}`);
      } else {
        showToast(data.message || "Failed to send reminder", "error");
      }
    } catch (err) {
      showToast("Failed to send reminder", "error");
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!ageingData) return;
    setExporting(true);
    try {
      const sheetData = [{
        [partyType]: ageingData.partyName,
        "Code": ageingData.partyCode || "",
        "Current (0-30)": ageingData.buckets?.[0] || 0,
        "31-60 Days": ageingData.buckets?.[1] || 0,
        "61-90 Days": ageingData.buckets?.[2] || 0,
        "91-120 Days": ageingData.buckets?.[3] || 0,
        "120+ Days": ageingData.buckets?.[4] || 0,
        "Total Outstanding": grandTotal,
        "As of Date": asOfDate,
      }];
      const ws = XLSX.utils.json_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${partyType} Ageing`);
      XLSX.writeFile(wb, `${partyType}_Ageing_${selectedParty?.name}_${asOfDate}.xlsx`);
      showToast("Excel exported successfully");
    } catch (err) {
      showToast("Failed to export Excel", "error");
    } finally {
      setExporting(false);
    }
  };

  const exportToPDF = async () => {
    if (!ageingData) return;
    setExporting(true);
    try {
      const doc = new jsPDF({ orientation: "landscape" });
      doc.setFontSize(16);
      doc.text(`${partyType} Ageing Report`, 14, 15);
      doc.setFontSize(11);
      doc.text(`${selectedParty?.name} (${selectedParty?.code || ""})`, 14, 25);
      doc.setFontSize(10);
      doc.text(`As of: ${new Date(asOfDate).toLocaleDateString()}`, 14, 32);
      
      const tableBody = [
        ["Age Bucket", "Amount"],
        ["Current (0-30 days)", fmtINR(ageingData.buckets?.[0] || 0)],
        ["31-60 Days", fmtINR(ageingData.buckets?.[1] || 0)],
        ["61-90 Days", fmtINR(ageingData.buckets?.[2] || 0)],
        ["91-120 Days", fmtINR(ageingData.buckets?.[3] || 0)],
        ["120+ Days", fmtINR(ageingData.buckets?.[4] || 0)],
        ["Total Outstanding", fmtINR(grandTotal)]
      ];
      
      autoTable(doc, {
        body: tableBody,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [249, 250, 251] },
      });
      doc.save(`${partyType}_Ageing_${selectedParty?.name}_${asOfDate}.pdf`);
      showToast("PDF exported successfully");
    } catch (err) {
      showToast("Failed to export PDF", "error");
    } finally {
      setExporting(false);
    }
  };

  const isCustomer = partyType === "Customer";

  // Sort buckets for display
  const sortedBuckets = useMemo(() => {
    const bucketsWithIndex = BUCKETS.map((label, i) => ({ label, amount: totals[i], index: i }));
    if (sortBucket !== null) {
      bucketsWithIndex.sort((a, b) => {
        const aVal = a.amount;
        const bVal = b.amount;
        return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
      });
    }
    return bucketsWithIndex;
  }, [totals, sortBucket, sortOrder]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in"
          style={{ background: toast.type === "success" ? "#f0fdf4" : "#fef2f2", border: `1px solid ${toast.type === "success" ? "#22c55e" : "#ef4444"}` }}>
          <span className={toast.type === "success" ? "text-emerald-600" : "text-rose-600"}>{toast.type === "success" ? "✓" : "✕"}</span>
          <span className="text-sm text-gray-700">{toast.message}</span>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-indigo-600 text-sm font-mono mb-2">
            <span className="tracking-wider">REPORTS</span>
            <span className="text-gray-300">›</span>
            <span className="text-gray-500">Ageing Analysis</span>
          </div>
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{partyType} Ageing Report</h1>
              <p className="text-gray-500 mt-1">
                {isCustomer ? "Receivables due by age" : "Payables due by age"}
              </p>
            </div>
          </div>
        </div>

        {/* Search and Filter Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Auto-Suggest Input */}
            <AutoSuggestInput
              label={isCustomer ? "Search Customer *" : "Search Supplier *"}
              placeholder={`Type ${isCustomer ? "customer" : "supplier"} name or code...`}
              onSelect={handlePartySelect}
              fetchItems={fetchPartySuggestions}
              selectedValue={selectedParty?._id}
              selectedName={selectedParty?.name}
            />

            {/* As of Date */}
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">As of Date</label>
              <input
                type="date"
                value={asOfDate}
                onChange={(e) => setAsOfDate(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Selected Party Display */}
          {selectedParty && (
            <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex justify-between items-center">
              <div>
                <span className="text-xs text-indigo-600 font-medium">Selected {isCustomer ? "Customer" : "Supplier"}</span>
                <div className="font-semibold text-gray-900">{selectedParty.name}</div>
                {selectedParty.code && <div className="text-xs text-gray-500">Code: {selectedParty.code}</div>}
                {selectedParty.email && <div className="text-xs text-gray-500">Email: {selectedParty.email}</div>}
              </div>
              <button
                onClick={() => setSelectedParty(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
            <button
              onClick={fetchAgeingData}
              disabled={!selectedParty || loading}
              className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
            <button
              onClick={exportToExcel}
              disabled={!ageingData || exporting}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-md text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              <Download size={14} /> {exporting ? "Exporting..." : "Excel"}
            </button>
            <button
              onClick={exportToPDF}
              disabled={!ageingData || exporting}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <Printer size={14} /> {exporting ? "Exporting..." : "PDF"}
            </button>
            {isCustomer && selectedParty && grandTotal > 0 && (
              <button
                onClick={sendReminder}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600 text-white rounded-md text-sm hover:bg-rose-700 transition-colors"
              >
                <Mail size={14} /> Send Reminder
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex justify-center items-center py-12">
              <Loader2 size={32} className="animate-spin text-indigo-500" />
              <span className="ml-3 text-gray-500">Loading ageing data...</span>
            </div>
          </div>
        )}

        {/* Ageing Data Display */}
        {!loading && ageingData && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              {sortedBuckets.map(({ label, amount, index }) => (
                <div
                  key={index}
                  onClick={() => handleSort(index)}
                  className={`bg-white rounded-xl p-4 cursor-pointer transition-all shadow-sm hover:shadow-md border-2 ${
                    sortBucket === index ? "border-indigo-400 shadow-indigo-100" : "border-transparent hover:border-gray-200"
                  }`}
                >
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold mt-1" style={{ color: BUCKET_COLORS[index] }}>{fmtINR(amount)}</p>
                  {grandTotal > 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      {((amount / grandTotal) * 100).toFixed(1)}% of total
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Grand Total Bar */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-semibold text-gray-600">
                  Total {isCustomer ? "Receivable" : "Payable"} for {selectedParty?.name}
                </span>
                <span className="text-2xl font-bold text-gray-900">{fmtINR(grandTotal)}</span>
              </div>
              <div className="flex rounded-lg overflow-hidden h-3">
                {totals.map((v, i) => grandTotal > 0 && v > 0 && (
                  <div
                    key={i}
                    className="transition-all duration-500"
                    style={{ width: `${(v / grandTotal) * 100}%`, backgroundColor: BUCKET_COLORS[i] }}
                    title={`${BUCKETS[i]}: ${fmtINR(v)}`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {BUCKETS.map((label, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: BUCKET_COLORS[i] }} />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-semibold text-gray-900">Ageing Breakdown</h2>
                <p className="text-xs text-gray-500 mt-0.5">Outstanding amount by age bucket</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {partyType}
                      </th>
                      {BUCKETS.map((label, i) => (
                        <th key={i} className="px-3 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          <button
                            onClick={() => handleSort(i)}
                            className="flex items-center gap-1 ml-auto hover:text-indigo-600 transition-colors"
                          >
                            {label}
                            {sortBucket === i && (sortOrder === "desc" ? <ChevronDown size={12} /> : <ChevronUp size={12} />)}
                          </button>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{ageingData.partyName}</div>
                        {ageingData.partyCode && <div className="text-xs text-gray-400 font-mono mt-0.5">{ageingData.partyCode}</div>}
                      </td>
                      {ageingData.buckets?.map((v, i) => (
                        <td key={i} className="px-3 py-3 text-right font-mono text-sm">
                          {v > 0 ? <span style={{ color: BUCKET_COLORS[i] }}>{fmtINR(v)}</span> : <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{fmtINR(grandTotal)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* No Selection State */}
        {!loading && !selectedParty && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <User size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">Start typing to search for a {isCustomer ? "customer" : "supplier"}</p>
            <p className="text-xs text-gray-400 mt-1">Search by name or code</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && selectedParty && !ageingData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-400">No outstanding transactions found for this {isCustomer ? "customer" : "supplier"}</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease forwards;
        }
      `}</style>
    </div>
  );
}

// Customer ageing page export
export function CustomerAgeingPage() { return <AgeingPage partyType="Customer" />; }

// Supplier ageing page export
export function SupplierAgeingPage() { return <AgeingPage partyType="Supplier" />; }