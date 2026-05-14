"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import CustomerSearch from "@/components/CustomerSearch";
import SupplierSearch from "@/components/SupplierSearch";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n || 0);

const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "Card", "Other"];

export default function PaymentEntryPage() {
  const token = () => localStorage.getItem("token") || "";
  const [accounts, setAccounts] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [tab, setTab] = useState("list");
  const [filterType, setFilterType] = useState("All");

  // Form state
  const [form, setForm] = useState({
    type: "Payment", // "Payment" or "Receipt"
    date: new Date().toISOString().slice(0, 10),
    amount: "",
    bankAccountId: "",
    partyType: "Supplier", // "Supplier" or "Customer"
    partyId: "",
    partyName: "",
    paymentMode: "Bank Transfer",
    narration: "",
    chequeNumber: "",
    utrNumber: "",
  });

  const [invoices, setInvoices] = useState([]);           // outstanding invoices from backend
  const [selectedInvoices, setSelectedInvoices] = useState([]); // { id, number, due, selectedAmount }

  // --- Toast helper ---
  const addToast = (msg, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // --- Fetch accounts & existing payments ---
  useEffect(() => {
    fetchAccounts();
    fetchPayments();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts/heads", { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) setAccounts(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch("/api/accounts/payment?type=Payment", { headers: { Authorization: `Bearer ${token()}` } }),
        fetch("/api/accounts/payment?type=Receipt", { headers: { Authorization: `Bearer ${token()}` } }),
      ]);
      const [p, r] = await Promise.all([pRes.json(), rRes.json()]);
      setPayments([...(p.data || []), ...(r.data || [])].sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      addToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  };

  // Bank/cash accounts
  const bankAccounts = accounts.filter(
    (a) => a.group === "Current Asset" && (a.name.toLowerCase().includes("bank") || a.name.toLowerCase().includes("cash"))
  );

  // --- Fetch outstanding invoices when party changes ---
  useEffect(() => {
    if (form.partyId && form.partyType) {
      fetchOutstandingInvoices();
    } else {
      setInvoices([]);
      setSelectedInvoices([]);
      setForm((prev) => ({ ...prev, amount: "" }));
    }
  }, [form.partyId, form.partyType]);

  const fetchOutstandingInvoices = async () => {
    try {
      const url = `/api/invoices?partyType=${form.partyType}&partyId=${form.partyId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token()}` } });
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data);
        setSelectedInvoices([]);
      } else {
        setInvoices([]);
      }
    } catch (err) {
      console.error(err);
      setInvoices([]);
    }
  };

  // --- Party selection from search ---
  const handlePartySelect = (party) => {
    const partyId = party._id;
    const partyName = form.partyType === "Supplier" ? party.supplierName : party.customerName;
    setForm((prev) => ({ ...prev, partyId, partyName }));
  };

  // --- Invoice selection toggling ---
  const toggleInvoice = (inv) => {
    const exists = selectedInvoices.find((i) => i.id === inv._id);
    if (exists) {
      setSelectedInvoices((prev) => prev.filter((i) => i.id !== inv._id));
    } else {
      setSelectedInvoices((prev) => [
        ...prev,
        {
          id: inv._id,
          number: inv.invoiceNumber,
          due: inv.dueAmount,
          selectedAmount: inv.dueAmount,
        },
      ]);
    }
  };

  // Update per‑invoice amount
  const updateInvoiceAmount = (id, newAmount) => {
    setSelectedInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id ? { ...inv, selectedAmount: Math.min(inv.due, Math.max(0, newAmount)) } : inv
      )
    );
  };

  // Auto‑calculate total amount from selected invoices
  useEffect(() => {
    const total = selectedInvoices.reduce((sum, inv) => sum + (inv.selectedAmount || 0), 0);
    setForm((prev) => ({ ...prev, amount: total.toString() }));
  }, [selectedInvoices]);

  // --- Submit payment ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      addToast("Amount must be greater than 0", "error");
      return;
    }
    if (!form.bankAccountId) {
      addToast("Select a bank/cash account", "error");
      return;
    }
    if (!form.partyId) {
      addToast(`Select a ${form.partyType}`, "error");
      return;
    }
    if (selectedInvoices.length === 0) {
      addToast("Select at least one invoice to apply payment", "error");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        appliedInvoices: selectedInvoices.map((inv) => ({
          invoiceId: inv.id,
          invoiceNumber: inv.number,
          amount: inv.selectedAmount,
        })),
      };
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`${form.type} recorded successfully`);
        // Reset form
        setForm({
          type: "Payment",
          date: new Date().toISOString().slice(0, 10),
          amount: "",
          bankAccountId: "",
          partyType: "Supplier",
          partyId: "",
          partyName: "",
          paymentMode: "Bank Transfer",
          narration: "",
          chequeNumber: "",
          utrNumber: "",
        });
        setSelectedInvoices([]);
        setInvoices([]);
        setTab("list");
        fetchPayments();
      } else {
        addToast(data.message || "Failed", "error");
      }
    } catch (err) {
      addToast("Error saving payment", "error");
    } finally {
      setSaving(false);
    }
  };

  const typeConfig = {
    Payment: { color: "#dc2626", bg: "#fee2e2", icon: "↓", label: "Payment (Out)" },
    Receipt: { color: "#16a34a", bg: "#dcfce7", icon: "↑", label: "Receipt (In)" },
  };

  const filteredPayments = useMemo(
    () => payments.filter((p) => filterType === "All" || p.type === filterType),
    [payments, filterType]
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg shadow-lg text-sm font-medium ${
              t.type === "success" ? "bg-green-100 text-green-800 border-l-4 border-green-500" : "bg-red-100 text-red-800 border-l-4 border-red-500"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payment Entry</h1>
            <p className="text-sm text-gray-500 mt-1">Record payments & receipts against invoices</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setTab("list")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                tab === "list" ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              All Entries
            </button>
            <button
              onClick={() => setTab("new")}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                tab === "new" ? "bg-indigo-600 text-white shadow" : "bg-white text-gray-700 border hover:bg-gray-50"
              }`}
            >
              + New Entry
            </button>
          </div>
        </div>

        {/* New Entry Form */}
        {tab === "new" && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
                <div className="flex gap-3">
                  {Object.entries(typeConfig).map(([type, cfg]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setForm((p) => ({
                          ...p,
                          type,
                          partyType: type === "Payment" ? "Supplier" : "Customer",
                          partyId: "",
                          partyName: "",
                        }))
                      }
                      className={`flex-1 py-2 px-4 rounded-lg border font-medium transition ${
                        form.type === type
                          ? `border-${cfg.color} bg-${cfg.bg} text-${cfg.color}`
                          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                      }`}
                      style={{
                        borderColor: form.type === type ? cfg.color : undefined,
                        backgroundColor: form.type === type ? cfg.bg : undefined,
                        color: form.type === type ? cfg.color : undefined,
                      }}
                    >
                      {cfg.icon} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bank / Cash Account</label>
                  <select
                    required
                    value={form.bankAccountId}
                    onChange={(e) => setForm((p) => ({ ...p, bankAccountId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select --</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc._id} value={acc._id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {form.type === "Payment" ? "Supplier" : "Customer"}
                  </label>
                  {form.partyType === "Supplier" ? (
                    <SupplierSearch onSelectSupplier={handlePartySelect} />
                  ) : (
                    <CustomerSearch onSelectCustomer={handlePartySelect} />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                  <select
                    value={form.paymentMode}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
                {form.paymentMode === "Cheque" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cheque No.</label>
                    <input
                      value={form.chequeNumber}
                      onChange={(e) => setForm((p) => ({ ...p, chequeNumber: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. 123456"
                    />
                  </div>
                )}
                {form.paymentMode === "Bank Transfer" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">UTR / Ref No.</label>
                    <input
                      value={form.utrNumber}
                      onChange={(e) => setForm((p) => ({ ...p, utrNumber: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      placeholder="e.g. UTR123456789"
                    />
                  </div>
                )}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Narration (Optional)</label>
                  <input
                    value={form.narration}
                    onChange={(e) => setForm((p) => ({ ...p, narration: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder={`e.g. ${form.type === "Payment" ? "Payment to supplier for invoices" : "Receipt from customer"}`}
                  />
                </div>
              </div>

              {/* Outstanding Invoices Section */}
              {form.partyId && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Outstanding Invoices</h3>
                  {invoices.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700 text-sm">
                      No outstanding invoices for this {form.partyType === "Supplier" ? "supplier" : "customer"}.
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No.</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Due Amount</th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Amount to Pay</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                          {invoices.map((inv) => {
                            const isSelected = selectedInvoices.some((s) => s.id === inv._id);
                            const selInv = selectedInvoices.find((s) => s.id === inv._id);
                            return (
                              <tr key={inv._id}>
                                <td className="px-4 py-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleInvoice(inv)}
                                    className="h-4 w-4 text-indigo-600 rounded border-gray-300"
                                  />
                                </td>
                                <td className="px-4 py-2 font-mono text-sm text-indigo-600">{inv.invoiceNumber}</td>
                                <td className="px-4 py-2 text-right font-medium text-gray-800">{fmtINR(inv.dueAmount)}</td>
                                <td className="px-4 py-2 text-center">
                                  {isSelected && (
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={selInv.selectedAmount}
                                      onChange={(e) => updateInvoiceAmount(inv._id, parseFloat(e.target.value))}
                                      className="w-32 px-2 py-1 border border-gray-300 rounded text-right text-sm"
                                    />
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Total Amount Preview */}
              {selectedInvoices.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex justify-between items-center">
                  <span className="text-green-700 font-medium">Total Payment Amount:</span>
                  <span className="text-2xl font-bold text-green-700">{fmtINR(Number(form.amount))}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setTab("list")}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || selectedInvoices.length === 0}
                  className={`px-6 py-2 rounded-lg text-white font-medium ${
                    saving || selectedInvoices.length === 0
                      ? "bg-gray-400 cursor-not-allowed"
                      : form.type === "Payment"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {saving ? "Processing..." : `${form.type === "Payment" ? "↓ Record Payment" : "↑ Record Receipt"}`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List View */}
        {tab === "list" && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Payment & Receipt History</h2>
                <p className="text-sm text-gray-500">{filteredPayments.length} entries</p>
              </div>
              <div className="flex gap-2">
                {["All", "Payment", "Receipt"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilterType(f)}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      filterType === f ? "bg-indigo-100 text-indigo-700" : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 animate-pulse rounded"></div>
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="p-12 text-center text-gray-400">No entries found</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref No</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredPayments.map((p, idx) => {
                      const cfg = typeConfig[p.type] || typeConfig.Payment;
                      return (
                        <tr key={p._id} className="hover:bg-gray-50 transition">
                          <td className="px-6 py-3 font-mono text-sm text-indigo-600">{p.transactionNumber}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                          </td>
                          <td className="px-6 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium`}
                              style={{ backgroundColor: cfg.bg, color: cfg.color }}
                            >
                              {cfg.icon} {p.type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-800">{p.partyName || "—"}</td>
                          <td className="px-6 py-3 text-sm text-gray-500">{p.paymentMode || "—"}</td>
                          <td className="px-6 py-3 text-right font-semibold" style={{ color: cfg.color }}>
                            {fmtINR(p.totalAmount)}
                          </td>
                          <td className="px-6 py-3">
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                              ✓ Posted
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
  

//   "use client";
//   import React, { useState, useEffect } from "react";
//   import { toast, ToastContainer } from "react-toastify";
//   import "react-toastify/dist/ReactToastify.css";

//   import CustomerSearch from "@/components/CustomerSearch";
//   import SupplierSearch from "@/components/SupplierSearch";
//   import BankComponent from "@/components/BankComponent";

//   // Helper to generate a unique key for an invoice.
//   const getInvoiceKey = (invoice, index) => {
//     return invoice._id ? invoice._id : index;
//   };

//   const InvoiceRow = ({
//     invoice,
//     invoiceKey,
//     isSelected,
//     onSelect,
//     currentAmount,
//     onAmountChange,
//   }) => {
//     // Use remainingAmount from backend (fallback to computed value if undefined)
//     const defaultEditableValue =
//       invoice.remainingAmount !== undefined
//         ? invoice.remainingAmount
//         : invoice.grandTotal - (invoice.paidAmount || 0);
//     // Compute new remaining amount based on entered amount.
//     const newRemaining =
//       isSelected && currentAmount !== undefined
//         ? defaultEditableValue - Number(currentAmount)
//         : defaultEditableValue;
//     return (
//       <tr key={invoiceKey}>
//         <td className="px-4 py-2 text-center">
//           <input
//             type="checkbox"
//             onChange={() => onSelect(invoiceKey, defaultEditableValue)}
//             checked={isSelected}
//             className="form-checkbox h-5 w-5 text-blue-600"
//           />
//         </td>
//         <td className="px-4 py-2">{invoice.refNumber}</td>
//         <td className="px-4 py-2">
//           {new Date(invoice.orderDate).toLocaleDateString()}
//         </td>
//         <td className="px-4 py-2">${invoice.grandTotal}</td>
//         <td className="px-4 py-2">${defaultEditableValue}</td>
//         <td className="px-4 py-2">
//           <input
//             type="number"
//             value={currentAmount ?? defaultEditableValue}
//             onChange={(e) =>
//               onAmountChange(invoiceKey, e.target.value, defaultEditableValue)
//             }
//             disabled={!isSelected}
//             className="w-full p-1 border rounded-md text-sm"
//           />
//         </td>
//         <td className="px-4 py-2">${newRemaining}</td>
//       </tr>
//     );
//   };

//   const PaymentForm = () => {
//     const initialFormData = {
//       paymentType: "", // "Incoming" or "Outgoing"
//       code: "",
//       customerVendor: "",
//       name: "",
//       postDate: "",
//       modeOfPayment: "",
//       bankName: "",
//       ledgerAccount: "",
//       paidTo: "",
//       paymentDate: "",
//       remarks: "",
//       selectedInvoices: [],
//     };

//     const [purchaseInvoices, setPurchaseInvoices] = useState([]);
//     const [salesInvoices, setSalesInvoices] = useState([]);
//     const [formData, setFormData] = useState(initialFormData);
//     const [invoiceAmounts, setInvoiceAmounts] = useState({});

//     // Render Customer or Supplier search based on payment type.
//     const renderMasterComponent = () => {
//       if (formData.paymentType === "Incoming") {
//         return (
//           <CustomerSearch
//             onSelectCustomer={(selectedMaster) => {
//               setFormData((prev) => ({
//                 ...prev,
//                 code: selectedMaster.customerCode,
//                 customerVendor: selectedMaster.customerName,
//               }));
//             }}
//           />
//         );
//       } else if (formData.paymentType === "Outgoing") {
//         return (
//           <SupplierSearch
//             onSelectSupplier={(selectedMaster) => {
//               setFormData((prev) => ({
//                 ...prev,
//                 code: selectedMaster.supplierCode,
//                 customerVendor: selectedMaster.supplierName,
//               }));
//             }}
//           />
//         );
//       }
//       return null;
//     };

//     // Fetch invoices when code and payment type change.
//     useEffect(() => {
//       if (!formData.code || !formData.paymentType) return;
//       const token = localStorage.getItem("token");

//       const fetchInvoices = async () => {
//         try {
//           if (formData.paymentType === "Outgoing" ) {
//             const response = await fetch(
//               `/api/purchaseInvoice?supplierCode=${formData.code}` ,
//                 {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   }
//             );
//             if (response.status === 404) {
//               setPurchaseInvoices([]);
//             } else {
//               const json = await response.json();
//               console.log("JSON Response:", json);
//               const invoiceData = json.data;
//               console.log("Invoice Data:", invoiceData);
//               setPurchaseInvoices(Array.isArray(invoiceData) ? invoiceData : []);
//             }
//           } else if (formData.paymentType === "Incoming") {
//          const response = await fetch(
//   `/api/sales-invoice?customerCode=${formData.code}`,
//   {
//     headers: {
//       Authorization: `Bearer ${token}`,
//     },
//   }
// );

//             if (response.status === 404) {
//               setSalesInvoices([]);
//             } else {

//               const json = await response.json();
//               console.log("JSON Response:", json);
//               const invoiceData = json.data;
//               console.log("Invoice Data:", invoiceData);

//              setSalesInvoices(Array.isArray(invoiceData) ? invoiceData : []);
//               console.log("Sales Invoices:", invoiceData);
//             }
//           }
//         } catch (error) {
//           console.error("Error fetching invoices:", error);
//         }
//       };

//       fetchInvoices();
//     }, [formData.code, formData.paymentType]);

//     console.log("Fetching invoices for code:", formData.code, "type:", formData.paymentType);


//     // Filter invoices to show only those that are not fully paid.
//     // Using remainingAmount from backend.
//     const displayedInvoices =
//       formData.paymentType === "Incoming"
//         ? Array.isArray(salesInvoices)
//           ? salesInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
//           : []
//         : formData.paymentType === "Outgoing"
//         ? Array.isArray(purchaseInvoices)
//           ? purchaseInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
//           : []
//         : [];

//     const handleInputChange = (e) => {
//       const { name, value } = e.target;
//       if (name === "paymentType") {
//         setFormData((prev) => ({
//           ...prev,
//           paymentType: value,
//           code: "",
//           customerVendor: "",
//           selectedInvoices: [],
//         }));
//         setPurchaseInvoices([]);
//         setSalesInvoices([]);
//         setInvoiceAmounts({});
//       } else {
//         setFormData((prev) => ({ ...prev, [name]: value }));
//       }
//     };

//     const handleCheckboxChange = (invoiceKey, invoiceDefaultValue) => {
//       const { selectedInvoices } = formData;
//       let newSelected;
//       if (selectedInvoices.includes(invoiceKey)) {
//         newSelected = selectedInvoices.filter((key) => key !== invoiceKey);
//       } else {
//         if (invoiceAmounts[invoiceKey] === undefined) {
//           setInvoiceAmounts((prev) => ({
//             ...prev,
//             [invoiceKey]: invoiceDefaultValue,
//           }));
//         }
//         newSelected = [...selectedInvoices, invoiceKey];
//       }
//       setFormData((prev) => ({
//         ...prev,
//         selectedInvoices: newSelected,
//       }));
//     };

//     const handleInvoiceAmountChange = (invoiceKey, newAmount, invoiceDefaultValue) => {
//       const numericValue = Number(newAmount);
//       if (numericValue > Number(invoiceDefaultValue)) {
//         toast.error(`Amount cannot exceed ${invoiceDefaultValue}`);
//         return;
//       }
//       setInvoiceAmounts((prev) => ({
//         ...prev,
//         [invoiceKey]: newAmount,
//       }));
//     };

//     const totalSelectedAmount = displayedInvoices.reduce((acc, invoice, index) => {
//       const invoiceKey = getInvoiceKey(invoice, index);
//       if (formData.selectedInvoices.includes(invoiceKey)) {
//         const defaultEditableValue = invoice.remainingAmount !== undefined
//           ? invoice.remainingAmount
//           : invoice.grandTotal - (invoice.paidAmount || 0);
//         const amount =
//           invoiceAmounts[invoiceKey] !== undefined
//             ? Number(invoiceAmounts[invoiceKey])
//             : Number(defaultEditableValue);
//         return acc + amount;
//       }
//       return acc;
//     }, 0);

//     const validateForm = () => {
//       if (!formData.paymentType) {
//         toast.error("Please select a payment type");
//         return false;
//       }
//       if (!formData.customerVendor) {
//         toast.error("Please select a customer or supplier");
//         return false;
//       }
//       if (formData.selectedInvoices.length === 0) {
//         toast.error("Please select at least one invoice");
//         return false;
//       }
//       return true;
//     };

//     const handleSubmit = async () => {
//       const token = localStorage.getItem("token");
//       if (!validateForm()) return;
//       const invoiceModel =
//         formData.paymentType === "Incoming" ? "SalesInvoice" : "PurchaseInvoice";
//       const references = formData.selectedInvoices.map((invoiceId) => ({
//         invoiceId,
//         model: invoiceModel,
//         paidAmount: Number(invoiceAmounts[invoiceId] ?? 0),
//       }));

//       const submissionData = {
//         paymentType: formData.paymentType === "Incoming" ? "Customer" : "Supplier",
//         code: formData.code,
//         customerVendor: formData.customerVendor,
//         postDate: formData.postDate,
//         paymentDate: formData.paymentDate,
//         modeOfPayment: formData.modeOfPayment,
//         bankName: formData.bankName,
//         ledgerAccount: formData.ledgerAccount,
//         paidTo: formData.paidTo,
//         remarks: formData.remarks,
//         amount: totalSelectedAmount,
//         references,
//       };

//       try {
//         const res = await fetch("/api/payment", {
//           method: "POST",
//           headers: { "Content-Type": "application/json",
//             Authorization: `Bearer ${token}`,
//            },
//           body: JSON.stringify(submissionData),
//         });
//         const result = await res.json();
//         if (res.ok) {
//           toast.success(result.message || "Payment submitted successfully!");
//           // Clear the form after successful submission.
//           setFormData(initialFormData);
//           setInvoiceAmounts({});
//         } else {
//           toast.error(result.message || "Payment submission failed.");
//         }
//       } catch (err) {
//         toast.error("Network error during payment submission.");
//         console.error(err);
//       }
//     };

//     const handleClose = () => {
//       console.log("Form closed");
//       toast.info("Form closed");
//     };

//     return (
//       <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
//         <ToastContainer />
//         <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Form</h2>
//         <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
//           <h3 className="text-lg font-semibold text-gray-800 mb-2">
//             Purchase & Sales Payment Details
//           </h3>
//         </div>
//         <div className="space-y-4">
//           {/* Payment Type */}
//           <div className="grid grid-cols-1 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700">
//                 Payment Type (Incoming / Outgoing)
//               </label>
//               <select
//                 name="paymentType"
//                 value={formData.paymentType}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               >
//                 <option value="">Select Payment Type</option>
//                 <option value="Incoming">Incoming</option>
//                 <option value="Outgoing">Outgoing</option>
//               </select>
//             </div>
//           </div>
//           {/* Render Customer or Supplier Selection */}
//           {formData.paymentType && renderMasterComponent()}
//           {/* Auto-filled Code and Customer/Supplier Name */}
//           <div className="grid grid-cols-2 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Code</label>
//               <input
//                 type="text"
//                 name="code"
//                 value={formData.code}
//                 readOnly
//                 className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//                 placeholder="Auto-filled code"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">
//                 {formData.paymentType === "Incoming" ? "Customer Name" : "Supplier Name"}
//               </label>
//               <input
//                 type="text"
//                 name="customerVendor"
//                 value={formData.customerVendor}
//                 readOnly
//                 className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//                 placeholder="Auto-filled name"
//               />
//             </div>
//           </div>
//           {/* Additional Dates and Payment Details */}
//           <div className="grid grid-cols-3 gap-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Post Date</label>
//               <input
//                 type="date"
//                 name="postDate"
//                 value={formData.postDate}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Payment Date</label>
//               <input
//                 type="date"
//                 name="paymentDate"
//                 value={formData.paymentDate}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Mode of Payment</label>
//               <select
//                 name="modeOfPayment"
//                 value={formData.modeOfPayment}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               >
//                 <option value="">Select Mode</option>
//                 <option value="Cash">Cash</option>
//                 <option value="Bank">Bank</option>
//                 <option value="NEFT">NEFT</option>
//                 <option value="RTGS">RTGS</option>
//                 <option value="Cheque">Cheque</option>
//               </select>
//             </div>
//           </div>
//           {/* Additional Payment Details using BankComponent */}
//           <div className="grid grid-cols-3 gap-4">
//             <BankComponent bankName={formData.bankName} onChange={handleInputChange} />
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Ledger Account</label>
//               <input
//                 type="text"
//                 name="ledgerAccount"
//                 value={formData.ledgerAccount}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 placeholder="Enter ledger account"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium text-gray-700">Paid To (Cheque/Reference)</label>
//               <input
//                 type="text"
//                 name="paidTo"
//                 value={formData.paidTo}
//                 onChange={handleInputChange}
//                 className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//                 placeholder="Enter cheque/reference"
//               />
//             </div>
//           </div>
//           {/* Invoice Table with Multiple Selection */}
//           {formData.paymentType && (
//             <div>
//               <h3 className="text-md font-medium text-gray-800 mb-2">
//                 {formData.paymentType === "Incoming"
//                   ? "Select Sales Invoices"
//                   : "Select Purchase Invoices"}
//               </h3>
//               {formData.code ? (
//                 displayedInvoices.length > 0 ? (
//                   <table className="w-full text-sm text-left text-gray-700 border-collapse">
//                     <thead className="bg-gray-100 border-b">
//                       <tr>
//                         <th className="px-4 py-2">Select</th>
//                         <th className="px-4 py-2">Invoice Number</th>
//                         <th className="px-4 py-2">Invoice Date</th>
//                         <th className="px-4 py-2">Invoice Amount</th>
//                         <th className="px-4 py-2">Remaining Amount</th>
//                         <th className="px-4 py-2">Editable Amount</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {displayedInvoices.map((invoice, index) => {
//                         const invoiceKey = getInvoiceKey(invoice, index);
//                         // Use remainingAmount from the DB as the default editable value.
//                         const defaultEditableValue =
//                           invoice.remainingAmount !== undefined
//                             ? invoice.remainingAmount
//                             : invoice.grandTotal - (invoice.paidAmount || 0);
//                         const currentAmount =
//                           invoiceAmounts[invoiceKey] !== undefined
//                             ? invoiceAmounts[invoiceKey]
//                             : defaultEditableValue;
//                         return (
//                           <InvoiceRow
//                             key={invoiceKey}
//                             invoice={invoice}
//                             invoiceKey={invoiceKey}
//                             isSelected={formData.selectedInvoices.includes(invoiceKey)}
//                             onSelect={handleCheckboxChange}
//                             currentAmount={currentAmount}
//                             onAmountChange={handleInvoiceAmountChange}
//                           />
//                         );
//                       })}
//                     </tbody>
//                   </table>
//                 ) : (
//                   <p className="text-sm text-gray-500">No invoices available.</p>
//                 )
//               ) : (
//                 <p className="text-sm text-gray-500">
//                   Please select a customer or supplier to view invoices.
//                 </p>
//               )}
//             </div>
//           )}
//           {/* Total Amount to Pay */}
//           <div>
//             <label className="block text-sm font-medium text-gray-700">Amount to Pay</label>
//             <input
//               type="number"
//               name="amountToPay"
//               value={totalSelectedAmount}
//               readOnly
//               className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//               placeholder="Amount to pay"
//             />
//           </div>
//           {/* Form Buttons */}
//           <div className="flex justify-end space-x-4">
//             <button
//               onClick={handleSubmit}
//               className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//             >
//               Add
//             </button>
//             <button
//               onClick={handleClose}
//               className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//             >
//               Close
//             </button>
//           </div>
//         </div>
//         <ToastContainer />
//       </div>
//     );
//   };

//   export default PaymentForm;