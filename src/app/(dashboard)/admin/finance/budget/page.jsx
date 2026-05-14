"use client";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

export default function BudgetPage() {
  const [budgets, setBudgets] = useState([]);
  const [variance, setVariance] = useState(null);
  const [fiscalYear, setFiscalYear] = useState(`${new Date().getFullYear() - 1}-${String(new Date().getFullYear()).slice(2)}`);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [budgetType, setBudgetType] = useState("Expense");
  const [loading, setLoading] = useState(false);
  const token = () => localStorage.getItem("token") || "";

  const fetchAccounts = async () => {
    const res = await fetch("/api/accounts/heads?isActive=true", { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) setAccounts(data.data.filter(a => a.type === "Income" || a.type === "Expense"));
  };

  const fetchBudgets = async () => {
    const res = await fetch(`/api/budget?fiscalYear=${fiscalYear}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) setBudgets(data.data);
  };

  const fetchVariance = async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/budget-variance?fiscalYear=${fiscalYear}`, { headers: { Authorization: `Bearer ${token()}` } });
    const data = await res.json();
    if (data.success) setVariance(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchAccounts(); fetchBudgets(); fetchVariance(); }, [fiscalYear]);

  const addBudget = async () => {
    if (!selectedAccount || !budgetAmount) return;
    await fetch("/api/budget", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
      body: JSON.stringify({ accountId: selectedAccount, fiscalYear, amount: parseFloat(budgetAmount), type: budgetType }),
    });
    setSelectedAccount("");
    setBudgetAmount("");
    fetchBudgets();
    fetchVariance();
  };

  const exportExcel = () => {
    if (!variance) return;
    const ws = XLSX.utils.json_to_sheet(variance);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Budget Variance");
    XLSX.writeFile(wb, `budget_variance_${fiscalYear}.xlsx`);
  };

  const exportPDF = () => {
    const el = document.getElementById("variance-table");
    html2pdf().set({ margin: 0.5, filename: `budget_variance_${fiscalYear}.pdf` }).from(el).save();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Budgeting & Variance Analysis</h1>
          <div className="flex gap-2">
            <select value={fiscalYear} onChange={e => setFiscalYear(e.target.value)} className="border rounded px-3 py-1">
              {[2024,2025,2026].map(y => <option key={y} value={`${y}-${String(y+1).slice(2)}`}>{y}-{String(y+1).slice(2)}</option>)}
            </select>
            <button onClick={exportExcel} className="bg-emerald-600 text-white px-3 py-1 rounded text-sm">Excel</button>
            <button onClick={exportPDF} className="bg-red-600 text-white px-3 py-1 rounded text-sm">PDF</button>
          </div>
        </div>

        {/* Add Budget Form */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <h2 className="font-semibold mb-3">Set/Update Budget</h2>
          <div className="flex gap-4 flex-wrap">
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="border rounded p-2 flex-1">
              <option value="">Select Account</option>
              {accounts.map(a => <option key={a._id} value={a._id}>{a.name} ({a.type})</option>)}
            </select>
            <select value={budgetType} onChange={e => setBudgetType(e.target.value)} className="border rounded p-2">
              <option value="Income">Income</option>
              <option value="Expense">Expense</option>
            </select>
            <input type="number" placeholder="Budget Amount" value={budgetAmount} onChange={e => setBudgetAmount(e.target.value)} className="border rounded p-2 w-40" />
            <button onClick={addBudget} className="bg-indigo-600 text-white px-4 py-2 rounded">Set Budget</button>
          </div>
        </div>

        {/* Variance Table */}
        {loading ? <div className="animate-pulse h-40 bg-gray-200 rounded"></div> : variance && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" id="variance-table">
            <div className="p-4 border-b"><h2 className="font-semibold">Budget vs Actual Variance</h2></div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr><th>Account</th><th>Code</th><th>Type</th><th>Budget</th><th>Actual</th><th>Variance</th><th>%</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {variance.map(v => (
                    <tr key={v.accountId} className="border-b">
                      <td>{v.accountName}</td><td>{v.code}</td><td>{v.type}</td>
                      <td>{fmtINR(v.budgetAmount)}</td><td>{fmtINR(v.actualAmount)}</td>
                      <td className={v.variance >= 0 ? "text-green-600" : "text-red-600"}>{fmtINR(v.variance)}</td>
                      <td>{v.variancePercent}%</td>
                      <td><span className={`px-2 py-1 rounded text-xs ${v.status === "Favorable" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{v.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}