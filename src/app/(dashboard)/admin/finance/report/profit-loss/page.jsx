"use client";
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { RefreshCw, Download, Printer, Search, EyeOff, Calendar, ChevronRight, ChevronDown, X } from "lucide-react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

// ─────────────────────────────────────────────────────────────
// Tree Node Component
// ─────────────────────────────────────────────────────────────
const PLTreeNode = ({ node, level = 0, onToggle, expandedNodes, hideZero, searchTerm }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes[node._id];
  const paddingLeft = level * 24;
  const matchesSearch = searchTerm && (node.name || "").toLowerCase().includes(searchTerm.toLowerCase());
  if (hideZero && Math.abs(node.closingBalance || 0) === 0 && !hasChildren && !matchesSearch) return null;

  return (
    <div>
      <div
        className={`flex justify-between items-center py-2 px-4 hover:bg-gray-50 transition-all duration-150 border-b border-gray-100 ${hasChildren ? "cursor-pointer" : ""} ${matchesSearch ? "bg-yellow-50/50" : ""}`}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
        onClick={() => hasChildren && onToggle(node._id)}
      >
        <div className="flex items-center gap-2 flex-1">
          {hasChildren && <span className="text-gray-400 text-sm">{isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>}
          <span className="font-medium text-gray-800">{node.name}</span>
          {node.code && <span className="text-xs text-gray-400 font-mono">({node.code})</span>}
        </div>
        <span className={`font-mono font-semibold text-sm ${node.closingBalance >= 0 ? "text-emerald-700" : "text-rose-600"} min-w-[100px] text-right`}>
          {fmtINR(Math.abs(node.closingBalance || 0))}
        </span>
      </div>
      {hasChildren && isExpanded && (
        <div className="ml-4">
          {node.children.map(child => (
            <PLTreeNode key={child._id} node={child} level={level + 1} onToggle={onToggle} expandedNodes={expandedNodes} hideZero={hideZero} searchTerm={searchTerm} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Section Component (Income / Expenses)
// ─────────────────────────────────────────────────────────────
const PLSection = ({ title, items, total, color, hideZero, searchTerm, onToggleSection, expandedSections }) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  const buildTree = (flat) => {
    const map = {}; const roots = [];
    flat?.forEach(i => { map[i._id] = { ...i, children: [] }; });
    flat?.forEach(i => { if (i.parentId && map[i.parentId]) map[i.parentId].children.push(map[i._id]); else roots.push(map[i._id]); });
    const sort = (nodes) => { nodes.sort((a,b) => (a.name||"").localeCompare(b.name||"")); nodes.forEach(n => n.children && sort(n.children)); };
    sort(roots); return roots;
  };
  const filterTree = (nodes, term) => {
    if (!term) return nodes;
    const lower = term.toLowerCase();
    const filter = (node) => {
      const matches = (node.name||"").toLowerCase().includes(lower);
      const children = node.children?.map(filter).filter(Boolean) || [];
      if (matches || children.length) return { ...node, children };
      return null;
    };
    return nodes.map(filter).filter(Boolean);
  };
  const treeData = useMemo(() => buildTree(items || []), [items]);
  const filteredTree = useMemo(() => filterTree(treeData, searchTerm), [treeData, searchTerm]);
  const totalBalance = useMemo(() => items?.reduce((s,i) => s + (i.closingBalance||0), 0) || 0, [items]);
  const isExpanded = expandedSections[title] !== false;

  useEffect(() => {
    if (searchTerm) {
      const collect = (nodes) => { let ids=[]; nodes.forEach(n=>{ ids.push(n._id); if(n.children) ids.push(...collect(n.children)); }); return ids; };
      const ids = collect(filteredTree);
      const newExp = {}; ids.forEach(id=>newExp[id]=true);
      setExpandedNodes(newExp);
    } else setExpandedNodes({});
  }, [searchTerm, filteredTree]);

  const toggleNode = (id) => setExpandedNodes(prev => ({ ...prev, [id]: !prev[id] }));
  const expandAll = () => {
    const collect = (nodes) => { let ids=[]; nodes.forEach(n=>{ ids.push(n._id); if(n.children) ids.push(...collect(n.children)); }); return ids; };
    const ids = collect(treeData);
    const newExp = {}; ids.forEach(id=>newExp[id]=true);
    setExpandedNodes(newExp);
  };
  const collapseAll = () => { if (!searchTerm) setExpandedNodes({}); };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className={`px-5 py-4 border-b flex justify-between items-center cursor-pointer bg-${color}-50/30 hover:bg-${color}-50/50`} onClick={() => onToggleSection(title)}>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
          <h3 className={`font-bold text-lg text-${color}-700`}>{title}</h3>
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{items?.length||0} accounts</span>
          {searchTerm && <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full">{filteredTree.length} matches</span>}
        </div>
        <div className="flex gap-2" onClick={e=>e.stopPropagation()}>
          <button onClick={expandAll} className="text-xs text-gray-500 hover:text-indigo-600">Expand All</button>
          {!searchTerm && <button onClick={collapseAll} className="text-xs text-gray-500 hover:text-indigo-600">Collapse All</button>}
        </div>
      </div>
      {isExpanded && (
        <>
          <div className="max-h-[500px] overflow-y-auto">
            {filteredTree.length === 0 ? <div className="text-center py-12 text-gray-400 text-sm">{searchTerm ? `No accounts matching "${searchTerm}"` : "No accounts found"}</div> :
              filteredTree.map(root => <PLTreeNode key={root._id} node={root} level={0} onToggle={toggleNode} expandedNodes={expandedNodes} hideZero={hideZero} searchTerm={searchTerm} />)
            }
          </div>
          <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex justify-between items-center">
            <span className="font-semibold text-gray-700">Total {title}</span>
            <span className={`font-bold text-xl text-${color}-700`}>{fmtINR(totalBalance)}</span>
          </div>
        </>
      )}
    </div>
  );
};

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => { const t = setTimeout(() => setDebounced(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return debounced;
}

export default function ProfitLossPage() {
  const [data, setData] = useState(null);
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear()-1}-${String(new Date().getFullYear()).slice(2)}`);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hideZero, setHideZero] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState({ Income: true, Expenses: true });
  const reportRef = useRef();
  const debouncedSearch = useDebounce(searchTerm, 300);

  const token = () => localStorage.getItem("token") || "";

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      let url = `/api/accounts/reports/profit-loss?fiscalYear=${fiscalYear}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const result = await res.json();
      if (result.success) { setData(result.data); setTotals(result.totals); }
      else setError(result.message);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [fiscalYear, fromDate, toDate]);

  useEffect(() => { loadData(); }, [loadData]);

  const isProfit = (totals.netProfit || 0) >= 0;

  const exportToExcel = () => {
    if (!data) return;
    const incomeRows = data.income?.items?.map(i => ({ Type: "Income", Account: i.name, Code: i.code || "", Amount: fmtINR(i.closingBalance) })) || [];
    const expenseRows = data.expenses?.items?.map(e => ({ Type: "Expense", Account: e.name, Code: e.code || "", Amount: fmtINR(e.closingBalance) })) || [];
    const ws = XLSX.utils.json_to_sheet([...incomeRows, ...expenseRows, { Type: "Summary", Account: "Net Profit", Amount: fmtINR(totals.netProfit) }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Profit & Loss");
    XLSX.writeFile(wb, `profit_loss_${fiscalYear}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    const element = reportRef.current;
    html2pdf().set({ margin: 0.5, filename: `profit_loss_${fiscalYear}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' } }).from(element).save();
  };

  const handlePrint = () => window.print();
  const toggleSection = (title) => setExpandedSections(prev => ({ ...prev, [title]: !prev[title] }));
  const clearFilters = () => { setFromDate(""); setToDate(""); setHideZero(false); setSearchTerm(""); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profit & Loss Statement</h1>
              <p className="text-gray-500 mt-1">Income vs Expenses — Net Profit / Loss</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={exportToExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Download size={14} /> Excel</button>
              <button onClick={exportToPDF} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Printer size={14} /> PDF</button>
              <button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Printer size={14} /> Print</button>
              <button onClick={loadData} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh</button>
            </div>
          </div>

          <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Fiscal Year</label>
                <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {[2022, 2023, 2024, 2025, 2026].map(y => <option key={y} value={`${y}-${String(y + 1).slice(2)}`}>{y}–{String(y + 1).slice(2)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12} /> From Date</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Calendar size={12} /> To Date</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <input type="checkbox" checked={hideZero} onChange={e => setHideZero(e.target.checked)} id="hideZero" />
                <label htmlFor="hideZero" className="text-sm text-gray-600 flex items-center gap-1"><EyeOff size={14} /> Hide zero balances</label>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1"><Search size={12} /> Search accounts</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  {searchTerm && <button onClick={() => setSearchTerm("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400"><X size={14} /></button>}
                </div>
              </div>
              {(fromDate || toDate || hideZero || searchTerm) && <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium pb-1">Clear all</button>}
            </div>
          </div>
        </div>

        <div ref={reportRef}>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse"><div className="h-96 bg-gray-200 rounded-xl"></div><div className="h-96 bg-gray-200 rounded-xl"></div></div>
          ) : error ? (
            <div className="bg-red-50 p-8 text-center rounded-xl"><p className="text-red-600">{error}</p><button onClick={loadData} className="mt-4 text-indigo-600">Try again</button></div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PLSection title="Income" items={data?.income?.items} total={totals.totalIncome} color="emerald" hideZero={hideZero} searchTerm={debouncedSearch} onToggleSection={toggleSection} expandedSections={expandedSections} />
              <PLSection title="Expenses" items={data?.expenses?.items} total={totals.totalExpenses} color="amber" hideZero={hideZero} searchTerm={debouncedSearch} onToggleSection={toggleSection} expandedSections={expandedSections} />
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
              <div>
                <div className="text-sm text-gray-500">Net Profit / Loss</div>
                <div className="text-sm text-gray-400">Income {fmtINR(totals.totalIncome)} − Expenses {fmtINR(totals.totalExpenses)}</div>
              </div>
              <div className={`text-3xl font-bold ${isProfit ? "text-emerald-600" : "text-rose-600"}`}>{fmtINR(Math.abs(totals.netProfit || 0))}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}