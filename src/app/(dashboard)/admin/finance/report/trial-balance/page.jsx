"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Download,
  Printer,
  Search,
  EyeOff,
  Calendar,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

// ─────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────
const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(n || 0);

// Color mappings (no dynamic Tailwind classes)
const TYPE_COLOR_MAP = {
  Asset: "emerald",
  Liability: "rose",
  Equity: "indigo",
  Income: "sky",
  Expense: "amber",
};

const TEXT_COLOR_MAP = {
  emerald: "text-emerald-700",
  rose: "text-rose-700",
  indigo: "text-indigo-700",
  sky: "text-sky-700",
  amber: "text-amber-700",
  gray: "text-gray-700",
};

const BG_COLOR_MAP = {
  emerald: "bg-emerald-50/40",
  rose: "bg-rose-50/40",
  indigo: "bg-indigo-50/40",
  sky: "bg-sky-50/40",
  amber: "bg-amber-50/40",
  gray: "bg-gray-50/40",
};

// ─────────────────────────────────────────────────────────────
// Tree Node Component
// ─────────────────────────────────────────────────────────────
const TreeNode = ({ node, level = 0, onToggle, expandedNodes, hideZero, searchTerm }) => {
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes[node._id];
  const paddingLeft = level * 24;
  const matchesSearch =
    searchTerm && (node.name || "").toLowerCase().includes(searchTerm.toLowerCase());

  if (
    hideZero &&
    Math.abs(node.closingBalance || 0) === 0 &&
    !hasChildren &&
    !matchesSearch
  ) {
    return null;
  }

  return (
    <div>
      <div
        className={`flex justify-between items-center py-2.5 px-4 hover:bg-gray-50 border-b border-gray-100 transition-colors ${
          hasChildren ? "cursor-pointer" : ""
        } ${matchesSearch ? "bg-yellow-50/60" : ""}`}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
        onClick={() => hasChildren && onToggle(node._id)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren && (
            <span className="text-gray-400 text-sm shrink-0">
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          <span className="font-medium text-gray-800 truncate">{node.name}</span>
          {node.code && (
            <span className="text-xs text-gray-400 font-mono hidden sm:inline">
              ({node.code})
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <span className="font-mono text-sm text-blue-600 w-28 text-right">
            {fmtINR(node.totalDebit)}
          </span>
          <span className="font-mono text-sm text-purple-600 w-28 text-right">
            {fmtINR(node.totalCredit)}
          </span>
          <span
            className={`font-mono font-semibold text-sm w-32 text-right ${
              node.closingBalance >= 0 ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {fmtINR(Math.abs(node.closingBalance || 0))}
          </span>
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
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Section Component (by Account Type)
// ─────────────────────────────────────────────────────────────
const TrialSection = ({
  title,
  items,
  colorKey,
  hideZero,
  searchTerm,
  onToggleSection,
  expandedSections,
}) => {
  const [expandedNodes, setExpandedNodes] = useState({});
  const color = TYPE_COLOR_MAP[colorKey] || "gray";
  const textColorClass = TEXT_COLOR_MAP[color];
  const bgClass = BG_COLOR_MAP[color];

  const buildTree = useCallback((flat) => {
    if (!flat || flat.length === 0) return [];
    const map = {};
    const roots = [];

    flat.forEach((item) => {
      map[item._id] = { ...item, children: [] };
    });

    flat.forEach((item) => {
      if (item.parentId && map[item.parentId]) {
        map[item.parentId].children.push(map[item._id]);
      } else {
        roots.push(map[item._id]);
      }
    });

    const sortChildren = (nodes) => {
      nodes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      nodes.forEach((n) => n.children && sortChildren(n.children));
    };
    sortChildren(roots);
    return roots;
  }, []);

  const filterTree = useCallback((nodes, term) => {
    if (!term) return nodes;
    const lower = term.toLowerCase();
    const filterNode = (node) => {
      const matches = (node.name || "").toLowerCase().includes(lower);
      const filteredChildren = node.children.map(filterNode).filter(Boolean);
      if (matches || filteredChildren.length) {
        return { ...node, children: filteredChildren };
      }
      return null;
    };
    return nodes.map(filterNode).filter(Boolean);
  }, []);

  const treeData = useMemo(() => buildTree(items), [buildTree, items]);
  const filteredTree = useMemo(
    () => filterTree(treeData, searchTerm),
    [filterTree, treeData, searchTerm]
  );
  const isExpanded = expandedSections[title] !== false;

  useEffect(() => {
    if (searchTerm) {
      const collectIds = (nodes) => {
        let ids = [];
        nodes.forEach((n) => {
          ids.push(n._id);
          if (n.children) ids.push(...collectIds(n.children));
        });
        return ids;
      };
      const ids = collectIds(filteredTree);
      const newExp = {};
      ids.forEach((id) => (newExp[id] = true));
      setExpandedNodes(newExp);
    } else {
      setExpandedNodes({});
    }
  }, [searchTerm, filteredTree]);

  const toggleNode = (id) => setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const collectIds = (nodes) => {
      let ids = [];
      nodes.forEach((n) => {
        ids.push(n._id);
        if (n.children) ids.push(...collectIds(n.children));
      });
      return ids;
    };
    const ids = collectIds(treeData);
    const newExp = {};
    ids.forEach((id) => (newExp[id] = true));
    setExpandedNodes(newExp);
  };

  const collapseAll = () => {
    if (!searchTerm) setExpandedNodes({});
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all">
      <div
        className={`px-5 py-4 border-b flex justify-between items-center cursor-pointer transition-colors ${bgClass} hover:bg-opacity-60`}
        onClick={() => onToggleSection(title)}
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-500">
            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
          <h3 className={`font-bold text-lg ${textColorClass}`}>{title}</h3>
          <span className="text-xs text-gray-500 bg-white/60 px-2 py-0.5 rounded-full border">
            {items?.length || 0} accounts
          </span>
          {searchTerm && (
            <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded-full">
              {filteredTree.length} matches
            </span>
          )}
        </div>
        <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={expandAll}
            className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Expand All
          </button>
          {!searchTerm && (
            <button
              onClick={collapseAll}
              className="text-xs text-gray-500 hover:text-indigo-600 transition-colors"
            >
              Collapse All
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Debit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">
                  Credit
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">
                  Balance
                </th>
              </tr>``
            </thead>
            <tbody>
              {filteredTree.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-400">
                    {searchTerm
                      ? `No accounts matching "${searchTerm}"`
                      : "No accounts found"}
                  </td>
                </tr>
              ) : (
                filteredTree.map((root) => (
                  <TreeNode
                    key={root._id}
                    node={root}
                    level={0}
                    onToggle={toggleNode}
                    expandedNodes={expandedNodes}
                    hideZero={hideZero}
                    searchTerm={searchTerm}
                  />
                ))
              )}
            </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Debounce Hook
// ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─────────────────────────────────────────────────────────────
// Loading Skeleton
// ─────────────────────────────────────────────────────────────
const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3, 4, 5].map((i) => (
      <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-3"></div>
        <div className="space-y-2">
          <div className="h-4 bg-gray-100 rounded w-full"></div>
          <div className="h-4 bg-gray-100 rounded w-5/6"></div>
          <div className="h-4 bg-gray-100 rounded w-4/6"></div>
        </div>
      </div>
    ))}
  </div>
);

// ─────────────────────────────────────────────────────────────
// Main Page Component
// ─────────────────────────────────────────────────────────────
export default function TrialBalancePage() {
  const [rawData, setRawData] = useState([]);
  const [totals, setTotals] = useState({
    totalDebit: 0,
    totalCredit: 0,
    isBalanced: true,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(
    `${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`
  );
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [hideZero, setHideZero] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedSections, setExpandedSections] = useState({
    Asset: true,
    Liability: true,
    Equity: true,
    Income: true,
    Expense: true,
  });
  const reportRef = useRef(null);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      let url = `/api/accounts/reports/trial-balance?fiscalYear=${fiscalYear}`;
      if (fromDate) url += `&fromDate=${fromDate}`;
      if (toDate) url += `&toDate=${toDate}`;

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const result = await res.json();

      if (result.success) {
        const transformed = (result.data || []).map((item) => ({
          _id: item.accountId,
          name: item.accountName,
          code: item.code,
          type: item.type,
          group: item.group,
          parentId: item.parentId,
          balanceType: item.balanceType,
          totalDebit: item.totalDebit || 0,
          totalCredit: item.totalCredit || 0,
          closingBalance: item.closingBalance || 0,
          children: [],
        }));
        setRawData(transformed);
        setTotals(
          result.totals || {
            totalDebit: 0,
            totalCredit: 0,
            isBalanced: true,
          }
        );
      } else {
        setError(result.message || "Failed to load trial balance");
      }
    } catch (err) {
      console.error("Trial balance error:", err);
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [fiscalYear, fromDate, toDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const exportToExcel = () => {
    if (!rawData.length) return;
    const rows = rawData.map((acc) => ({
      Code: acc.code || "",
      "Account Name": acc.name,
      Type: acc.type,
      Group: acc.group || "",
      Debit: acc.totalDebit,
      Credit: acc.totalCredit,
      Balance: acc.closingBalance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
    XLSX.writeFile(wb, `trial_balance_${fiscalYear}.xlsx`);
  };

  const exportToPDF = () => {
    if (!reportRef.current) return;
    html2pdf()
      .set({
        margin: 0.5,
        filename: `trial_balance_${fiscalYear}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true },
        jsPDF: { unit: "in", format: "a4", orientation: "landscape" },
      })
      .from(reportRef.current)
      .save();
  };

  const handlePrint = () => window.print();

  const toggleSection = (title) =>
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));

  const clearFilters = () => {
    setFromDate("");
    setToDate("");
    setHideZero(false);
    setSearchTerm("");
  };

  const groupedData = useMemo(() => {
    const groups = { Asset: [], Liability: [], Equity: [], Income: [], Expense: [] };
    rawData.forEach((acc) => {
      if (groups[acc.type]) groups[acc.type].push(acc);
    });
    return groups;
  }, [rawData]);

  const fiscalYearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options = [];
    for (let y = currentYear - 3; y <= currentYear + 3; y++) {
      options.push({
        value: `${y}-${String(y + 1).slice(2)}`,
        label: `${y}–${String(y + 1).slice(2)}`,
      });
    }
    return options;
  }, []);

  const hasActiveFilters = !!(fromDate || toDate || hideZero || searchTerm);
  const isBalanced = totals.isBalanced && totals.totalDebit === totals.totalCredit;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-7 h-7 text-indigo-500" />
                <h1 className="text-3xl font-bold text-gray-900">Trial Balance</h1>
              </div>
              <p className="text-gray-500 mt-1">
                All accounts — debit & credit closing balances
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={exportToExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Download size={14} /> Excel
              </button>
              <button
                onClick={exportToPDF}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Printer size={14} /> PDF
              </button>
              <button
                onClick={handlePrint}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm"
              >
                <Printer size={14} /> Print
              </button>
              <button
                onClick={loadData}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters Card */}
          <div className="mt-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="w-40">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Fiscal Year
                </label>
                <select
                  value={fiscalYear}
                  onChange={(e) => setFiscalYear(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                >
                  {fiscalYearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Calendar size={12} /> To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div className="flex items-center gap-2 pb-1">
                <input
                  type="checkbox"
                  checked={hideZero}
                  onChange={(e) => setHideZero(e.target.checked)}
                  id="hideZero"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-400"
                />
                <label htmlFor="hideZero" className="text-sm text-gray-600 flex items-center gap-1 cursor-pointer">
                  <EyeOff size={14} /> Hide zero balances
                </label>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                  <Search size={12} /> Search accounts
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                    placeholder="Account name or code..."
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-indigo-600 text-sm font-medium pb-1 hover:text-indigo-700"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Report Content */}
        <div ref={reportRef}>
          {loading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
              <p className="text-red-600 font-medium">{error}</p>
              <button
                onClick={loadData}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Try again
              </button>
            </div>
          ) : rawData.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No data found for the selected period</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedData).map(
                ([type, items]) =>
                  items.length > 0 && (
                    <TrialSection
                      key={type}
                      title={type}
                      items={items}
                      colorKey={type}
                      hideZero={hideZero}
                      searchTerm={debouncedSearch}
                      onToggleSection={toggleSection}
                      expandedSections={expandedSections}
                    />
                  )
              )}
            </>
          )}
        </div>

        {/* Totals Footer */}
        {!loading && !error && rawData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mt-6 flex flex-wrap justify-between items-center gap-4">
            <span className="font-semibold text-gray-700">Grand Totals</span>
            <div className="flex gap-6 flex-wrap">
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Total Debit</div>
                <span className="font-mono font-bold text-lg text-blue-600">
                  {fmtINR(totals.totalDebit)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Total Credit</div>
                <span className="font-mono font-bold text-lg text-purple-600">
                  {fmtINR(totals.totalCredit)}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400 uppercase tracking-wide">Difference</div>
                <span
                  className={`font-mono font-bold text-lg ${
                    isBalanced ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {fmtINR(Math.abs(totals.totalDebit - totals.totalCredit))}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {isBalanced ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600" />
                )}
                <span
                  className={`font-semibold ${
                    isBalanced ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {isBalanced ? "✓ Balanced" : "✗ Unbalanced"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}