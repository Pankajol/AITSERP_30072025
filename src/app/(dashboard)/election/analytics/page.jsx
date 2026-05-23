// app/(dashboard)/election/analytics/page.js
"use client";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, ResponsiveContainer,
} from "recharts";
import { FiUsers, FiFlag, FiTrendingUp, FiDollarSign, FiBarChart2, FiFilter, FiX } from "react-icons/fi";

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];
const SUPPORT_COLORS = {
  StrongSupporter: "#10B981",
  WeakSupporter: "#34D399",
  Neutral: "#9CA3AF",
  Opposition: "#EF4444",
  Undecided: "#F59E0B",
};

// Searchable Select Component
function SearchableSelect({ options, value, onChange, placeholder, disabled, className }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (opt) => {
    onChange(opt.value);
    setIsOpen(false);
    setSearchTerm("");
  };

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${className || ""}`}>
      <div
        className={`w-full py-2 px-3 rounded-lg border text-sm flex items-center justify-between cursor-pointer ${
          disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white border-gray-200"
        }`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <span className={selectedOption ? "text-gray-800" : "text-gray-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        {isOpen ? <FiX className="text-gray-400" /> : <FiFilter className="text-gray-400" />}
      </div>
      {isOpen && !disabled && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          <div className="p-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="w-full py-1.5 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          {filtered.length === 0 ? (
            <p className="p-3 text-xs text-gray-400 text-center">No options</p>
          ) : (
            filtered.map(opt => (
              <div
                key={opt.value}
                className={`px-4 py-2 text-sm cursor-pointer hover:bg-indigo-50 ${
                  opt.value === value ? "bg-indigo-50 font-semibold" : ""
                }`}
                onClick={() => handleSelect(opt)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Constituency‑wise components
// ─────────────────────────────────────────────
function ConstituencyVotersChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">📊 Voters per Constituency</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="constituencyName" angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="totalVoters" fill="#10B981" name="Total Voters" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConstituencyExpensesChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">💰 Expenses per Constituency</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="constituencyName" angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis />
          <Tooltip formatter={(value) => `₹ ${value.toLocaleString()}`} />
          <Bar dataKey="totalExpense" fill="#F59E0B" name="Expense (₹)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConstituencySupportTable({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">🗳️ Support Level by Constituency</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left">Constituency</th>
              <th className="px-4 py-2 text-center">Strong Supporter</th>
              <th className="px-4 py-2 text-center">Weak Supporter</th>
              <th className="px-4 py-2 text-center">Neutral</th>
              <th className="px-4 py-2 text-center">Opposition</th>
              <th className="px-4 py-2 text-center">Undecided</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cons, idx) => {
              const levels = {};
              cons.supports.forEach(s => { levels[s.level] = s.count; });
              return (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{cons._id}</td>
                  <td className="px-4 py-2 text-center">{levels.StrongSupporter || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.WeakSupporter || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.Neutral || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.Opposition || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.Undecided || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Booth‑wise components
// ─────────────────────────────────────────────
function BoothVotersChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">🏚️ Voters per Booth</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="boothNumber" angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="totalVoters" fill="#8B5CF6" name="Voters" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoothExpensesChart({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">💵 Expenses per Booth</h2>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="boothNumber" angle={-45} textAnchor="end" height={80} interval={0} />
          <YAxis />
          <Tooltip formatter={(value) => `₹ ${value.toLocaleString()}`} />
          <Bar dataKey="totalExpense" fill="#EC4899" name="Expense (₹)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function BoothSupportTable({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">🗳️ Support Level by Booth</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left">Booth No.</th>
              <th className="px-4 py-2 text-center">Strong Supporter</th>
              <th className="px-4 py-2 text-center">Weak Supporter</th>
              <th className="px-4 py-2 text-center">Neutral</th>
              <th className="px-4 py-2 text-center">Opposition</th>
              <th className="px-4 py-2 text-center">Undecided</th>
            </tr>
          </thead>
          <tbody>
            {data.map((booth, idx) => {
              const levels = {};
              booth.supports.forEach(s => { levels[s.level] = s.count; });
              return (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{booth._id}</td>
                  <td className="px-4 py-2 text-center">{levels.StrongSupporter || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.WeakSupporter || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.Neutral || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.Opposition || 0}</td>
                  <td className="px-4 py-2 text-center">{levels.Undecided || 0}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WorkerActivityByBoothTable({ data }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border">
      <h2 className="text-lg font-bold text-gray-800 mb-4">👥 Worker Activity by Booth</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left">Booth No.</th>
              <th className="px-4 py-2 text-left">Workers (Contacts/Surveys)</th>
              <th className="px-4 py-2 text-center">Total Contacts</th>
              <th className="px-4 py-2 text-center">Total Surveys</th>
            </tr>
          </thead>
          <tbody>
            {data.map((booth, idx) => (
              <tr key={idx} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{booth._id || "Unassigned"}</td>
                <td className="px-4 py-2">
                  {booth.workers?.map(w => `${w.name} (C:${w.contacts} S:${w.surveys})`).join(", ") || "—"}
                </td>
                <td className="px-4 py-2 text-center">{booth.totalContacts || 0}</td>
                <td className="px-4 py-2 text-center">{booth.totalSurveys || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard Component
// ─────────────────────────────────────────────
export default function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  // Filter states
  const [constituencies, setConstituencies] = useState([]);
  const [booths, setBooths] = useState([]);
  const [selectedConstituency, setSelectedConstituency] = useState("");
  const [selectedBooth, setSelectedBooth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedSupport, setSelectedSupport] = useState("");

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch constituencies for dropdown
  const fetchConstituencies = useCallback(async () => {
    if (!token) return;
    try {
      const res = await axios.get("/api/election/constituency", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setConstituencies(res.data.data.map(c => ({ value: c._id, label: c.name })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch booths based on selected constituency
  const fetchBooths = useCallback(async (constituencyId) => {
    if (!token || !constituencyId) {
      setBooths([]);
      return;
    }
    try {
      const res = await axios.get(`/api/election/booth?constituency=${constituencyId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setBooths(res.data.data.map(b => ({ value: b._id, label: `${b.boothNumber} - ${b.name || ""}` })));
      }
    } catch (e) { console.error(e); }
  }, [token]);

  // Fetch analytics with filters
  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedConstituency) params.append("constituencyId", selectedConstituency);
      if (selectedBooth) params.append("boothId", selectedBooth);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedSupport) params.append("supportLevel", selectedSupport);

      const res = await axios.get(`/api/election/dashboard/analytics?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, selectedConstituency, selectedBooth, startDate, endDate, selectedSupport]);

  // Load constituencies on mount
  useEffect(() => {
    fetchConstituencies();
  }, [fetchConstituencies]);

  // Load booths when constituency changes
  useEffect(() => {
    fetchBooths(selectedConstituency);
    setSelectedBooth(""); // reset booth selection
  }, [selectedConstituency, fetchBooths]);

  // Initial analytics load
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const resetFilters = () => {
    setSelectedConstituency("");
    setSelectedBooth("");
    setStartDate("");
    setEndDate("");
    setSelectedSupport("");
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const hasAnyData = data && (data.supportDistribution?.length > 0 ||
    data.boothWiseVoters?.length > 0 ||
    data.voterTrend?.length > 0 ||
    data.expenseByCategory?.length > 0 ||
    data.constituencyWiseVoters?.length > 0);

  // Summary stats
  const totalVoters = data?.voterTrend?.reduce((s, i) => s + i.count, 0) || 0;
  const totalBooths = data?.boothWiseVoters?.length || 0;
  const strongSupporters = data?.supportDistribution?.find(s => s._id === "StrongSupporter")?.count || 0;
  const totalExpenses = data?.expenseByCategory?.reduce((s, i) => s + i.total, 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header + Filter Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-gray-900">📈 Election Analytics Dashboard</h1>
        <button
          onClick={() => setFilterOpen(!filterOpen)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100 transition-all"
        >
          <FiFilter /> {filterOpen ? "Hide Filters" : "Show Filters"}
        </button>
      </div>

      {/* Filter Panel */}
      {filterOpen && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Constituency</label>
              <SearchableSelect
                options={constituencies}
                value={selectedConstituency}
                onChange={setSelectedConstituency}
                placeholder="All Constituencies"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Booth</label>
              <SearchableSelect
                options={booths}
                value={selectedBooth}
                onChange={setSelectedBooth}
                placeholder="All Booths"
                disabled={!selectedConstituency}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-gray-200 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Support Level</label>
              <select
                value={selectedSupport}
                onChange={(e) => setSelectedSupport(e.target.value)}
                className="w-full py-2 px-3 rounded-lg border border-gray-200 text-sm"
              >
                <option value="">All</option>
                <option value="StrongSupporter">Strong Supporter</option>
                <option value="WeakSupporter">Weak Supporter</option>
                <option value="Neutral">Neutral</option>
                <option value="Opposition">Opposition</option>
                <option value="Undecided">Undecided</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200"
            >
              Reset
            </button>
            <button
              onClick={fetchAnalytics}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* If no data after filters */}
      {!hasAnyData && (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
            <FiBarChart2 className="text-4xl text-indigo-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Data with Current Filters</h2>
          <p className="text-gray-500">Try changing filters or add more data.</p>
        </div>
      )}

      {hasAnyData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <FiUsers className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Total Voters</p>
              <p className="text-2xl font-bold text-gray-800">{totalVoters.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <FiFlag className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Booths</p>
              <p className="text-2xl font-bold text-gray-800">{totalBooths}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <FiTrendingUp className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Strong Supporters</p>
              <p className="text-2xl font-bold text-gray-800">{strongSupporters.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm border">
              <FiDollarSign className="h-4 w-4 text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="text-2xl font-bold text-gray-800">₹ {totalExpenses.toLocaleString()}</p>
            </div>
          </div>

          {/* Overall Support Distribution */}
          {data.supportDistribution?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">🎯 Support Distribution (Overall)</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.supportDistribution.map(s => ({ name: s._id, value: s.count }))}
                    cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.supportDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={SUPPORT_COLORS[entry._id] || COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Election Type Distribution */}
          {data.electionTypeDistribution?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">🏛️ Election Level Distribution</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.electionTypeDistribution}
                    dataKey="count" nameKey="_id"
                    cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.electionTypeDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Voter Registration Trend */}
          {data.voterTrend?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">📅 Voter Registration Trend</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.voterTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} name="New Voters" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top 10 Booths by Voter Count */}
          {data.boothWiseVoters?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">🏪 Top 10 Booths by Voter Count</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.boothWiseVoters}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="boothNumber" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="totalVoters" fill="#4F46E5" name="Voters" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Expense by Category */}
          {data.expenseByCategory?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">💸 Expense by Category</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.expenseByCategory.map(e => ({ name: e._id, value: e.total }))}
                    cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {data.expenseByCategory.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `₹ ${value.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Worker Activity Summary Table */}
          {data.workerActivities?.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border">
              <h2 className="text-lg font-bold text-gray-800 mb-4">👥 Worker Activity Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-2 text-left">Worker</th>
                      <th className="px-4 py-2 text-left">Role</th>
                      <th className="px-4 py-2 text-center">Contacts</th>
                      <th className="px-4 py-2 text-center">Surveys</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.workerActivities.map((w, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">{w.name}</td>
                        <td className="px-4 py-2 text-xs text-gray-500">{w.workerRole}</td>
                        <td className="px-4 py-2 text-center">{w.totalContacts || 0}</td>
                        <td className="px-4 py-2 text-center">{w.totalSurveys || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Constituency-wise Sections */}
          <ConstituencyVotersChart data={data.constituencyWiseVoters} />
          <ConstituencyExpensesChart data={data.constituencyWiseExpenses} />
          <ConstituencySupportTable data={data.constituencySupport} />

          {/* Booth-wise Sections */}
          <BoothVotersChart data={data.boothWiseVotersFull} />
          <BoothExpensesChart data={data.boothWiseExpenses} />
          <BoothSupportTable data={data.boothSupport} />
          <WorkerActivityByBoothTable data={data.workerActivityByBooth} />
        </>
      )}
    </div>
  );
}



// // app/(dashboard)/election/analytics/page.js
// "use client";
// import { useEffect, useState } from "react";
// import axios from "axios";
// import {
//   PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
//   Tooltip, Legend, LineChart, Line, ResponsiveContainer,
// } from "recharts";
// import { FiUsers, FiFlag, FiTrendingUp, FiDollarSign, FiBarChart2 } from "react-icons/fi";

// const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// const SUPPORT_COLORS = {
//   StrongSupporter: "#10B981",
//   WeakSupporter: "#34D399",
//   Neutral: "#9CA3AF",
//   Opposition: "#EF4444",
//   Undecided: "#F59E0B",
// };

// export default function AnalyticsDashboard() {
//   const [data, setData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   useEffect(() => {
//     if (!token) return;
//     const fetchData = async () => {
//       try {
//         const res = await axios.get("/api/election/dashboard/analytics", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (res.data.success) setData(res.data.data);
//       } catch (e) { console.error(e); }
//       finally { setLoading(false); }
//     };
//     fetchData();
//   }, [token]);

//   if (loading) return <div className="text-center py-20">Loading analytics...</div>;
//   if (!data) return <div className="text-center py-20">Failed to load data</div>;

//   // क्या सब कुछ खाली है?
//   const isEmpty = data.supportDistribution.length === 0
//     && data.boothWiseVoters.length === 0
//     && data.voterTrend.length === 0
//     && data.expenseByCategory.length === 0
//     && data.workerActivities.length === 0;

//   if (isEmpty) {
//     return (
//       <div className="max-w-2xl mx-auto mt-20 text-center">
//         <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-6">
//           <FiBarChart2 className="text-4xl text-indigo-300" />
//         </div>
//         <h2 className="text-xl font-bold text-gray-800 mb-2">No Analytics Data Yet</h2>
//         <p className="text-gray-500 mb-1">Start by adding voters, expenses, and worker activities.</p>
//         <p className="text-sm text-gray-400">Data will appear here automatically once you have records.</p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8">
//       <h1 className="text-2xl font-extrabold text-gray-900">Election Analytics</h1>

//       {/* ─── Summary Cards ─── */}
//       <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
//         {[
//           { label: "Total Voters", value: data.voterTrend.reduce((s,i)=>s+i.count,0), icon: FiUsers },
//           { label: "Booths", value: data.boothWiseVoters.length, icon: FiFlag },
//           { label: "Strong Supporters", value: data.supportDistribution.find(s=>s._id==="StrongSupporter")?.count||0, icon: FiTrendingUp },
//           { label: "Total Expenses", value: `₹ ${data.expenseByCategory.reduce((s,i)=>s+i.total,0)}`, icon: FiDollarSign },
//         ].map((card, i) => {
//           const Icon = card.icon;
//           return (
//             <div key={i} className="bg-white rounded-xl p-4 shadow-sm border">
//               <Icon className="h-4 w-4 text-gray-400 mb-2" />
//               <p className="text-xs text-gray-500">{card.label}</p>
//               <p className="text-2xl font-bold text-gray-800">{card.value}</p>
//             </div>
//           );
//         })}
//       </div>

//       {/* ─── Support Distribution Pie Chart ─── */}
//       {data.supportDistribution.length > 0 && (
//         <div className="bg-white rounded-2xl p-6 shadow-sm border">
//           <h2 className="text-lg font-bold text-gray-800 mb-4">Support Distribution</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={data.supportDistribution.map(s => ({ name: s._id, value: s.count }))}
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={100}
//                 dataKey="value"
//                 label={({name, percent}) => `${name} (${(percent*100).toFixed(0)}%)`}
//               >
//                 {data.supportDistribution.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={SUPPORT_COLORS[entry._id] || COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       )}
// {/* Election Type Distribution */}
//       {data.electionTypeDistribution && data.electionTypeDistribution.length > 0 && (
//   <div className="bg-white rounded-2xl p-6 shadow-sm border">
//     <h2 className="text-lg font-bold text-gray-800 mb-4">Election Level Distribution</h2>
//     <ResponsiveContainer width="100%" height={300}>
//       <PieChart>
//         <Pie
//           data={data.electionTypeDistribution}
//           dataKey="count"
//           nameKey="_id"
//           cx="50%"
//           cy="50%"
//           outerRadius={100}
//           label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
//         >
//           {data.electionTypeDistribution.map((entry, index) => (
//             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//           ))}
//         </Pie>
//         <Tooltip />
//       </PieChart>
//     </ResponsiveContainer>
//   </div>
// )}

//       {/* ─── Voter Trend Line Chart ─── */}
//       {data.voterTrend.length > 0 && (
//         <div className="bg-white rounded-2xl p-6 shadow-sm border">
//           <h2 className="text-lg font-bold text-gray-800 mb-4">Voter Registration Trend</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={data.voterTrend}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="_id" />
//               <YAxis allowDecimals={false} />
//               <Tooltip />
//               <Legend />
//               <Line type="monotone" dataKey="count" stroke="#4F46E5" strokeWidth={2} name="New Voters" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>
//       )}

//       {/* ─── Booth-wise Voters Bar Chart ─── */}
//       {data.boothWiseVoters.length > 0 && (
//         <div className="bg-white rounded-2xl p-6 shadow-sm border">
//           <h2 className="text-lg font-bold text-gray-800 mb-4">Top Booths by Voter Count</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={data.boothWiseVoters}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis dataKey="boothNumber" />
//               <YAxis allowDecimals={false} />
//               <Tooltip />
//               <Bar dataKey="totalVoters" fill="#4F46E5" name="Voters" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       )}

//       {/* ─── Expense by Category Pie ─── */}
//       {data.expenseByCategory.length > 0 && (
//         <div className="bg-white rounded-2xl p-6 shadow-sm border">
//           <h2 className="text-lg font-bold text-gray-800 mb-4">Expense by Category</h2>
//           <ResponsiveContainer width="100%" height={300}>
//             <PieChart>
//               <Pie
//                 data={data.expenseByCategory.map(e => ({ name: e._id, value: e.total }))}
//                 cx="50%"
//                 cy="50%"
//                 outerRadius={100}
//                 dataKey="value"
//                 label={({name, percent}) => `${name} (${(percent*100).toFixed(0)}%)`}
//               >
//                 {data.expenseByCategory.map((entry, index) => (
//                   <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
//                 ))}
//               </Pie>
//               <Tooltip />
//             </PieChart>
//           </ResponsiveContainer>
//         </div>
//       )}

//       {/* ─── Worker Activity Table ─── */}
//       {data.workerActivities.length > 0 && (
//         <div className="bg-white rounded-2xl p-6 shadow-sm border">
//           <h2 className="text-lg font-bold text-gray-800 mb-4">Worker Activity Summary</h2>
//           <div className="overflow-x-auto">
//             <table className="w-full text-sm">
//               <thead>
//                 <tr className="bg-gray-50 border-b">
//                   <th className="px-4 py-2 text-left">Worker</th>
//                   <th className="px-4 py-2 text-left">Role</th>
//                   <th className="px-4 py-2 text-center">Contacts</th>
//                   <th className="px-4 py-2 text-center">Surveys</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {data.workerActivities.map((w, i) => (
//                   <tr key={i} className="border-b hover:bg-gray-50">
//                     <td className="px-4 py-2 font-medium">{w.name}</td>
//                     <td className="px-4 py-2 text-xs text-gray-500">{w.workerRole}</td>
//                     <td className="px-4 py-2 text-center">{w.totalContacts || 0}</td>
//                     <td className="px-4 py-2 text-center">{w.totalSurveys || 0}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }