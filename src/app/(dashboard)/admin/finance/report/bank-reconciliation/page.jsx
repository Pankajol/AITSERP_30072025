"use client";
import { useEffect, useState, useCallback } from "react";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

const fmtINR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n || 0);

export default function BankReconciliationPage() {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().slice(0, 10));
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = () => localStorage.getItem("token") || "";

  useEffect(() => {
    fetch("/api/accounts/heads?type=Asset&group=Bank Account", {
      headers: { Authorization: `Bearer ${token()}` },
    })
      .then(res => res.json())
      .then(data => { if (data.success) setBankAccounts(data.data); });
  }, []);

  const reconcile = useCallback(async () => {
    if (!selectedAccount) return;
    setLoading(true);
    try {
      const url = `/api/accounts/reports/bank-reconciliation?bankAccountId=${selectedAccount}&asOfDate=${asOfDate}&statementBalance=${statementBalance || 0}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setResult(data);
      else alert(data.message);
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  }, [selectedAccount, asOfDate, statementBalance]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Bank Reconciliation</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Bank Account</label>
            <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)} className="mt-1 w-full border rounded-lg p-2">
              <option value="">Select account</option>
              {bankAccounts.map(acc => <option key={acc._id} value={acc._id}>{acc.name} {acc.code ? `(${acc.code})` : ""}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">As of Date</label>
            <input type="date" value={asOfDate} onChange={e => setAsOfDate(e.target.value)} className="mt-1 w-full border rounded-lg p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Statement Balance (as per Bank)</label>
            <input type="number" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} className="mt-1 w-full border rounded-lg p-2" placeholder="0.00" />
          </div>
          <button onClick={reconcile} disabled={!selectedAccount || loading} className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
            {loading ? "Reconciling..." : "Reconcile"}
          </button>
        </div>
        {result && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between"><span>Book Balance (as per ledger):</span><span className="font-mono">{fmtINR(result.bookBalance)}</span></div>
            <div className="flex justify-between mt-2"><span>Statement Balance:</span><span className="font-mono">{fmtINR(result.statementBalance)}</span></div>
            <div className={`flex justify-between mt-2 font-bold ${result.reconciled ? "text-green-600" : "text-red-600"}`}>
              <span>Difference:</span><span>{fmtINR(result.difference)}</span>
            </div>
            <div className="flex items-center justify-center mt-4">
              {result.reconciled ? <CheckCircle className="text-green-500" /> : <XCircle className="text-red-500" />}
              <span className="ml-2">{result.reconciled ? "Reconciled ✓" : "Not Reconciled ✗"}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}