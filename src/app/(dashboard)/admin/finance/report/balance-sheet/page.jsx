"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ChevronRight, ChevronDown, RefreshCw, AlertCircle, CheckCircle,
  Download, Printer, Search, EyeOff, Calendar, Filter, TrendingUp, TrendingDown, X
} from "lucide-react";
import html2pdf from "html2pdf.js";
import * as XLSX from "xlsx";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

// ─────────────────────────────────────────────────────────────
// Tree Node Component
// ─────────────────────────────────────────────────────────────
const TreeNode = ({ node, level = 0, onToggle, expandedNodes, hideZero, compareData, searchTerm }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes[node._id];
  const paddingLeft = level * 24;

  let compareValue = null;
  if (compareData?.items) {
    const compareAccount = compareData.items.find(c => c._id === node._id);
    compareValue = compareAccount?.closingBalance || 0;
  }

  const matchesSearch = searchTerm && (
    (node.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (node.code || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (hideZero && Math.abs(node.closingBalance || 0) === 0 && !hasChildren && !matchesSearch) return null;

  const isPositiveChange = compareValue !== null && (node.closingBalance - compareValue) > 0;
  const percentChange = compareValue && compareValue !== 0 ? ((node.closingBalance - compareValue) / compareValue * 100).toFixed(1) : null;

  return (
    <div>
      <div
        className={`flex justify-between items-center py-2 px-4 hover:bg-gray-50 transition-all duration-150 border-b border-gray-100 ${
          hasChildren ? "cursor-pointer" : ""
        } ${matchesSearch ? "bg-yellow-50/50" : ""}`}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
        onClick={() => hasChildren && onToggle(node._id)}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren && (
            <span className="text-gray-400 text-sm">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <span className="font-medium text-gray-800">
            {node.name}
            {matchesSearch && searchTerm && (
              <span className="ml-2 text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded-full">match</span>
            )}
          </span>
          {node.code && <span className="text-xs text-gray-400 font-mono">({node.code})</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className={`font-mono font-semibold text-sm ${node.closingBalance >= 0 ? "text-emerald-700" : "text-rose-600"} min-w-[100px] text-right`}>
            {fmtINR(Math.abs(node.closingBalance || 0))}
          </span>
          {compareValue !== null && (
            <span className={`text-xs font-mono min-w-[80px] text-right ${isPositiveChange ? "text-emerald-600" : "text-rose-600"}`}>
              {isPositiveChange ? <TrendingUp size={12} className="inline mr-1" /> : <TrendingDown size={12} className="inline mr-1" />}
              {fmtINR(Math.abs(node.closingBalance - compareValue))}
              {percentChange && <span className="text-gray-400 ml-1">({isPositiveChange ? "+" : ""}{percentChange}%)</span>}
            </span>
          )}
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {node.children.map((child) => (
            <TreeNode
              key={child._id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
              hideZero={hideZero}
              compareData={compareData}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Section Component (Assets / Liabilities / Equity)
// ─────────────────────────────────────────────────────────────
const BalanceSection = ({ title, items, total, color, hideZero, searchTerm, compareData, onToggleSection, expandedSections }) => {
  const [expandedNodes, setExpandedNodes] = useState({});

  const buildTree = useCallback((flatItems) => {
    const map = {};
    const roots = [];
    flatItems?.forEach((item) => { map[item._id] = { ...item, children: [] }; });
    flatItems?.forEach((item) => {
      if (item.parentId && map[item.parentId]) map[item.parentId].children.push(map[item._id]);
      else roots.push(map[item._id]);
    });
    const sortChildren = (nodes) => {
      nodes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      nodes.forEach(node => node.children && sortChildren(node.children));
    };
    sortChildren(roots);
    return roots;
  }, []);

  const filterTree = useCallback((nodes, term) => {
    if (!term) return { filtered: nodes, hasMatches: true };
    const lowerTerm = term.toLowerCase();
    const filterNode = (node) => {
      const matches = (node.name || "").toLowerCase().includes(lowerTerm) || (node.code || "").toLowerCase().includes(lowerTerm);
      const filteredChildren = node.children?.map(filterNode).filter(Boolean) || [];
      if (matches || filteredChildren.length) return { ...node, children: filteredChildren };
      return null;
    };
    const filtered = nodes.map(filterNode).filter(Boolean);
    return { filtered, hasMatches: filtered.length > 0 };
  }, []);

  const treeData = useMemo(() => buildTree(items || []), [buildTree, items]);
  const { filtered: filteredTree } = useMemo(() => filterTree(treeData, searchTerm), [filterTree, treeData, searchTerm]);
  const totalBalance = useMemo(() => items?.reduce((sum, i) => sum + (i.closingBalance || 0), 0) || 0, [items]);
  const isSectionExpanded = expandedSections[title] !== false;

  useEffect(() => {
    if (searchTerm) {
      const collectAllIds = (nodes) => {
        let ids = [];
        nodes.forEach(node => {
          ids.push(node._id);
          if (node.children) ids.push(...collectAllIds(node.children));
        });
        return ids;
      };
      const allIds = collectAllIds(filteredTree);
      const newExpanded = {};
      allIds.forEach(id => { newExpanded[id] = true; });
      setExpandedNodes(newExpanded);
    } else setExpandedNodes({});
  }, [searchTerm, filteredTree]);

  const toggleNode = (id) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  const expandAll = () => {
    const collectIds = (nodes) => {
      let ids = [];
      nodes.forEach(node => {
        ids.push(node._id);
        if (node.children) ids.push(...collectIds(node.children));
      });
      return ids;
    };
    const ids = collectIds(treeData);
    const newExpanded = {};
    ids.forEach(id => { newExpanded[id] = true; });
    setExpandedNodes(newExpanded);
  };
  const collapseAll = () => { if (!searchTerm) setExpandedNodes({}); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-4 border-b flex justify-between items-center cursor-pointer bg-${color}-50/30 hover:bg-${color}-50/50 transition-colors`} onClick={() => onToggleSection(title)}>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{isSectionExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
          <h3 className={`font-bold text-lg text-${color}-700`}>{title}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items?.length || 0} accounts</span>
          {searchTerm && <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{filteredTree.length} matches</span>}
        </div>
        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-indigo-600 transition-colors">Expand All</button>
          {!searchTerm && <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-indigo-600 transition-colors">Collapse All</button>}
        </div>
      </div>
      {isSectionExpanded && (
        <>
          <div className="max-h-[550px] overflow-y-auto">
            {filteredTree.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">{searchTerm ? `No accounts matching "${searchTerm}"` : "No accounts found"}</div>
            ) : (
              filteredTree.map(root => <TreeNode key={root._id} node={root} level={0} onToggle={toggleNode} expandedNodes={expandedNodes} hideZero={hideZero} compareData={compareData} searchTerm={searchTerm} />)
            )}
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total {title}</span>
            <div className="flex gap-4">
              <span className={`font-bold text-xl text-${color}-700`}>{fmtINR(totalBalance)}</span>
              {compareData && (
                <span className={`text-sm font-mono ${totalBalance - (compareData.total || 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {fmtINR(Math.abs(totalBalance - (compareData.total || 0)))}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Debounce Hook
// ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

export default function BalanceSheetPage() {
  const [data, setData] = useState(null);
  const [previousData, setPreviousData] = useState(null);
  const [totals, setTotals] = useState({});
  const [ratios, setRatios] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`);
  const [asOnDate, setAsOnDate] = useState("");
  const [compareWith, setCompareWith] = useState("");
  const [hideZero, setHideZero] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState({ Assets: true, Liabilities: true, Equity: true });
  const reportRef = useRef();
  const searchInputRef = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const token = () => localStorage.getItem("token") || "";

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ fiscalYear });
      if (asOnDate) params.append("asOnDate", asOnDate);
      if (compareWith) params.append("compareWith", compareWith);
      const res = await fetch(`/api/accounts/reports/balance-sheet?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        setPreviousData(result.previousData);
        setTotals(result.totals);
        setRatios(result.ratios);
      } else setError(result.message || "Failed to load balance sheet");
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [fiscalYear, asOnDate, compareWith]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalLE = (totals.totalLiabilities || 0) + (totals.totalEquity || 0);
  const isBalanced = Math.abs((totals.totalAssets || 0) - totalLE) < 1;

  const exportToExcel = () => {
    if (!data) return;
    const assetsRows = data.assets?.items?.map(a => ({ Type: "Asset", Account: a.name, Code: a.code || "", Balance: fmtINR(a.closingBalance) })) || [];
    const liabilitiesRows = data.liabilities?.items?.map(l => ({ Type: "Liability", Account: l.name, Code: l.code || "", Balance: fmtINR(l.closingBalance) })) || [];
    const equityRows = data.equity?.items?.map(e => ({ Type: "Equity", Account: e.name, Code: e.code || "", Balance: fmtINR(e.closingBalance) })) || [];
    const ws = XLSX.utils.json_to_sheet([...assetsRows, ...liabilitiesRows, ...equityRows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `balance_sheet_${fiscalYear}.xlsx`);
  };

  const exportToPDF = () => {
    const element = reportRef.current;
    html2pdf().set({ margin: 0.5, filename: `balance_sheet_${fiscalYear}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a2', orientation: 'landscape' } }).from(element).save();
  };

  const handlePrint = () => window.print();
  const toggleSection = (title) => setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  const clearFilters = () => { setAsOnDate(""); setCompareWith(""); setHideZero(false); setSearchTerm(""); if (searchInputRef.current) searchInputRef.current.value = ""; };
  const hasActiveFilters = asOnDate || compareWith || hideZero || searchTerm;

  useEffect(() => {
    const handleKeyDown = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); searchInputRef.current?.focus(); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Balance Sheet</h1>
              <p className="text-gray-500 mt-1">Assets = Liabilities + Equity</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download size={14} /> Excel</button>
              <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Printer size={14} /> PDF</button>
              <button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Printer size={14} /> Print</button>
              <button onClick={loadData} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fiscal Year</label>
                <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={`${y}-${String(y + 1).slice(2)}`}>{y}–{String(y + 1).slice(2)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12} /> As of Date</label>
                <input type="date" value={asOnDate} onChange={e => setAsOnDate(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Filter size={12} /> Compare With</label>
                <select value={compareWith} onChange={e => setCompareWith(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  <option value="">None</option>
                  {[2021, 2022, 2023, 2024].map(y => <option key={y} value={`${y}-${String(y + 1).slice(2)}`}>{y}–{String(y + 1).slice(2)}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 pb-1">
                <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} id="hideZero" />
                <label htmlFor="hideZero" className="text-sm text-gray-600 flex items-center gap-1"><EyeOff size={14} /> Hide zero balances</label>
              </div>
              <div className="flex-1 min-w-[250px]">
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Search size={12} /> Search Account <span className="text-gray-400 text-[10px]">(Ctrl+K)</span></label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input ref={searchInputRef} type="text" placeholder="Search by account name or code..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-gray-300 rounded-lg pl-9 pr-8 py-2 text-sm" />
                  {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
                </div>
              </div>
              {hasActiveFilters && <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium pb-1">Clear all</button>}
            </div>
          </div>
        </div>

        {/* Ratio Cards */}
        {!loading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Current Ratio</p>
              <p className="text-2xl font-bold text-indigo-600">{ratios.currentRatio || "N/A"}</p>
              <p className="text-xs text-gray-400 mt-1">Current Assets / Current Liabilities</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Debt to Equity</p>
              <p className="text-2xl font-bold text-amber-600">{ratios.debtToEquity || "N/A"}</p>
              <p className="text-xs text-gray-400 mt-1">Total Liabilities / Total Equity</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Assets</p>
              <p className="text-2xl font-bold text-emerald-600">{fmtINR(totals.totalAssets || 0)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Total Equity</p>
              <p className="text-2xl font-bold text-purple-600">{fmtINR(totals.totalEquity || 0)}</p>
            </div>
          </div>
        )}

        {/* Status Banner */}
        {!loading && (
          <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${isBalanced ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-amber-50 border border-amber-200 text-amber-700"}`}>
            {isBalanced ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
            <span className="text-sm font-medium">{isBalanced ? "✓ Balanced: Assets = Liabilities + Equity" : `✗ Imbalance: ${fmtINR(Math.abs((totals.totalAssets || 0) - totalLE))}`}</span>
            {asOnDate && <span className="text-xs text-gray-500 ml-auto">As on {new Date(asOnDate).toLocaleDateString()}</span>}
            {compareWith && <span className="text-xs text-gray-500">Comparing with {compareWith}</span>}
          </div>
        )}

        {/* Report Content */}
        <div ref={reportRef}>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse"><div className="h-96 bg-gray-200 rounded-xl"></div><div className="h-96 bg-gray-200 rounded-xl"></div></div>
          ) : error ? (
            <div className="bg-red-50 p-8 text-center rounded-xl"><p className="text-red-600">{error}</p><button onClick={loadData} className="mt-4 text-indigo-600">Try again</button></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BalanceSection title="Assets" items={data?.assets?.items} total={totals.totalAssets} color="emerald" hideZero={hideZero} searchTerm={debouncedSearch} compareData={previousData?.assets} onToggleSection={toggleSection} expandedSections={expandedSections} />
              <div className="space-y-6">
                <BalanceSection title="Liabilities" items={data?.liabilities?.items} total={totals.totalLiabilities} color="rose" hideZero={hideZero} searchTerm={debouncedSearch} compareData={previousData?.liabilities} onToggleSection={toggleSection} expandedSections={expandedSections} />
                <BalanceSection title="Equity" items={data?.equity?.items} total={totals.totalEquity} color="indigo" hideZero={hideZero} searchTerm={debouncedSearch} compareData={previousData?.equity} onToggleSection={toggleSection} expandedSections={expandedSections} />
              </div>
            </div>
          )}
        </div>

        {/* Footer Summary */}
        {!loading && !error && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center border border-gray-200">
              <span className="font-semibold text-gray-700">Total Assets</span>
              <span className="text-2xl font-bold text-emerald-600">{fmtINR(totals.totalAssets || 0)}</span>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4 flex justify-between items-center border border-gray-200">
              <span className="font-semibold text-gray-700">Total Liabilities + Equity</span>
              <span className="text-2xl font-bold text-indigo-600">{fmtINR(totalLE)}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}