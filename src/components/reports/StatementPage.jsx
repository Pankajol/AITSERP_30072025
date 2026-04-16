"use client";
// Works for Customer Statement, Supplier Statement, Bank Statement
// Pass: type="customer" | "supplier" | "bank"
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const fmtINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const TYPE_CFG = {
  customer: {
    label: "Customer Statement",
    color: "#1e40af",
    partyLabel: "Customer",
    fetchList: async (token) => {
      const res = await fetch("/api/accounts/heads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        return d.data.filter(
          (a) => a.type === "Asset" && a.name.toLowerCase().includes("receiv")
        );
      }
      return [];
    },
  },
  supplier: {
    label: "Supplier Statement",
    color: "#b91c1c",
    partyLabel: "Supplier",
    fetchList: async (token) => {
      const res = await fetch("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        return d.data
          .filter((sup) => sup.glAccount)
          .map((sup) => ({
            _id: sup.glAccount?._id || sup.glAccount,
            name: sup.supplierName,
            type: "Liability",
          }));
      }
      return [];
    },
  },
  bank: {
    label: "Bank Statement",
    color: "#15803d",
    partyLabel: "Bank Account",
    fetchList: async (token) => {
      const res = await fetch("/api/accounts/heads", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d.success) {
        return d.data.filter(
          (a) =>
            a.group === "Current Asset" &&
            a.name.toLowerCase().includes("bank")
        );
      }
      return [];
    },
  },
};

export default function StatementPage({ type = "customer" }) {
  const token = () => localStorage.getItem("token") || "";
  const cfg = TYPE_CFG[type] || TYPE_CFG.customer;

  const [accounts, setAccounts] = useState([]);
  const [entries, setEntries] = useState([]);
  const [selectedParty, setSelectedParty] = useState("");
  const [selectedPartyName, setSelectedPartyName] = useState("");
  const [loading, setLoading] = useState(false);
  const [fy, setFy] = useState("2026-27"); // default to 2026-27
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Fetch list of parties (accounts) based on type
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const list = await cfg.fetchList(token());
        setAccounts(list);
      } catch (err) {
        console.error("Failed to fetch accounts:", err);
      }
    };
    loadAccounts();
  }, [type]);

  // Fetch ledger entries when selectedParty, fy, from, to change
  useEffect(() => {
    if (selectedParty) fetchLedger();
  }, [selectedParty, fy, from, to]);

  const fetchLedger = async () => {
    setLoading(true);
    let url = `/api/accounts/ledger/${selectedParty}?fiscalYear=${fy}`;
    if (from) url += `&fromDate=${from}`;
    if (to) url += `&toDate=${to}`;
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await res.json();
      if (d.success) {
        setEntries(d.entries || []);
        // Find party name from accounts list
        const party = accounts.find((a) => a._id === selectedParty);
        setSelectedPartyName(party?.name || "");
      } else {
        setEntries([]);
      }
    } catch (err) {
      console.error("Ledger fetch error:", err);
      setEntries([]);
    }
    setLoading(false);
  };

  const totalDebit = entries.reduce((s, e) => s + (e.debit || 0), 0);
  const totalCredit = entries.reduce((s, e) => s + (e.credit || 0), 0);
  const closing = entries.length ? entries[entries.length - 1].balance : 0;

  // ──────────────────────────────────────────────────────────
  // EXPORT TO EXCEL
  // ──────────────────────────────────────────────────────────
  const exportToExcel = () => {
    if (!entries.length) {
      alert("No data to export");
      return;
    }

    const sheetData = entries.map((e) => ({
      Date: new Date(e.date).toLocaleDateString("en-IN"),
      "Ref No": e.transactionNumber || "",
      Type: e.transactionType || "",
      Narration: e.narration || "",
      Debit: e.debit || 0,
      Credit: e.credit || 0,
      Balance: e.balance || 0,
    }));

    // Add summary row
    sheetData.push({
      Date: "",
      "Ref No": "",
      Type: "",
      Narration: "TOTAL / CLOSING",
      Debit: totalDebit,
      Credit: totalCredit,
      Balance: closing,
    });

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${cfg.label} - ${selectedPartyName}`);
    XLSX.writeFile(wb, `${cfg.label}_${selectedPartyName}_${fy}.xlsx`);
  };

  // ──────────────────────────────────────────────────────────
  // EXPORT TO PDF
  // ──────────────────────────────────────────────────────────
const exportToPDF = () => {
  if (!entries.length) {
    alert("No data to export");
    return;
  }

  const doc = new jsPDF({ orientation: "landscape" });

  // Title
  doc.setFontSize(16);
  doc.text(`${cfg.label} - ${selectedPartyName}`, 14, 15);
  doc.setFontSize(10);
  doc.text(`Financial Year: ${fy}`, 14, 22);
  if (from || to) {
    let dateRange = "";
    if (from && to) dateRange = `${from} to ${to}`;
    else if (from) dateRange = `From ${from}`;
    else if (to) dateRange = `Until ${to}`;
    doc.text(`Date Range: ${dateRange}`, 14, 28);
  }

  // Prepare table body with proper number formatting
  const formatAmount = (amount) => {
    if (amount === 0) return "0";
    return `Rs. ${amount.toLocaleString("en-IN")}`;
  };

  const tableBody = entries.map((e) => [
    new Date(e.date).toLocaleDateString("en-IN"),
    e.transactionNumber || "",
    e.transactionType || "",
    e.narration || "",
    formatAmount(e.debit || 0),
    formatAmount(e.credit || 0),
    formatAmount(e.balance || 0),
  ]);

  // Summary row
  tableBody.push([
    "",
    "",
    "",
    "TOTAL / CLOSING",
    formatAmount(totalDebit),
    formatAmount(totalCredit),
    formatAmount(closing),
  ]);

  autoTable(doc, {
    head: [["Date", "Ref No", "Type", "Narration", "Debit", "Credit", "Balance"]],
    body: tableBody,
    startY: 35,
    styles: { fontSize: 8, cellPadding: 2, fontStyle: "normal" },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    columnStyles: {
      0: { cellWidth: 25 }, // Date
      1: { cellWidth: 35 }, // Ref No
      2: { cellWidth: 30 }, // Type
      3: { cellWidth: 50 }, // Narration
      4: { cellWidth: 35, halign: "right" }, // Debit
      5: { cellWidth: 35, halign: "right" }, // Credit
      6: { cellWidth: 35, halign: "right" }, // Balance
    },
    margin: { left: 10, right: 10 },
  });

  doc.save(`${cfg.label}_${selectedPartyName}_${fy}.pdf`);
};

  // Light theme styles
  const S = {
    page: {
      minHeight: "100vh",
      background: "#ffffff",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      color: "#1e293b",
      padding: "32px 20px 60px",
    },
    card: {
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: 16,
      overflow: "hidden",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    },
    inp: {
      padding: "9px 12px",
      borderRadius: 9,
      background: "#ffffff",
      border: "1px solid #cbd5e1",
      color: "#0f172a",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      outline: "none",
      transition: "all 0.2s",
    },
    sk: {
      background: "linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%)",
      backgroundSize: "400px 100%",
      animation: "sk 1.4s infinite",
      borderRadius: 8,
    },
    btn: {
      padding: "9px 16px",
      borderRadius: 9,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer",
      transition: "all 0.2s",
    },
  };

  return (
    <>
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&family=JetBrains+Mono:wght@400;500&display=swap');
          @keyframes sk {
            0% { background-position: -400px 0; }
            100% { background-position: 400px 0; }
          }
          @keyframes fu {
            from { opacity: 0; transform: translateY(12px); }
            to { opacity: 1; transform: translateY(0); }
          }
          table { border-collapse: collapse; width: 100%; }
          select, input, button { transition: all 0.2s ease; }
          select:focus, input:focus { border-color: #3b82f6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
        `}
      </style>
      <div style={S.page}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          {/* Header */}
          <div style={{ marginBottom: 24, animation: "fu 0.4s ease" }}>
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              Finance Reports
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <h1
                style={{
                  fontSize: 30,
                  fontWeight: 800,
                  color: "#0f172a",
                  margin: 0,
                  letterSpacing: "-0.02em",
                }}
              >
                {cfg.label}
              </h1>
              {selectedParty && entries.length > 0 && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={exportToExcel}
                    style={{
                      ...S.btn,
                      background: "#059669",
                      color: "white",
                      border: "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#047857")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#059669")
                    }
                  >
                    📊 Export Excel
                  </button>
                  <button
                    onClick={exportToPDF}
                    style={{
                      ...S.btn,
                      background: "#dc2626",
                      color: "white",
                      border: "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#b91c1c")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "#dc2626")
                    }
                  >
                    📄 Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              ...S.card,
              padding: "16px 18px",
              marginBottom: 18,
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              flexWrap: "wrap",
              borderRadius: 12,
            }}
          >
            <div style={{ flex: "2 1 220px" }}>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 6,
                }}
              >
                {cfg.partyLabel} *
              </div>
              <select
                value={selectedParty}
                onChange={(e) => {
                  setSelectedParty(e.target.value);
                  setSelectedPartyName(
                    accounts.find((a) => a._id === e.target.value)?.name || ""
                  );
                }}
                style={{ ...S.inp, width: "100%" }}
              >
                <option value="">-- Select {cfg.partyLabel} --</option>
                {accounts.map((a) => (
                  <option key={a._id} value={a._id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 6,
                }}
              >
                Fiscal Year
              </div>
              <select
                value={fy}
                onChange={(e) => setFy(e.target.value)}
                style={S.inp}
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={`${y}-${String(y + 1).slice(2)}`}>
                    {y}-{String(y + 1).slice(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 6,
                }}
              >
                From
              </div>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                style={S.inp}
              />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: "#475569",
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                  marginBottom: 6,
                }}
              >
                To
              </div>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                style={S.inp}
              />
            </div>
            <button
              onClick={fetchLedger}
              disabled={!selectedParty}
              style={{
                padding: "9px 16px",
                borderRadius: 9,
                border: "1px solid #3b82f6",
                background: "#3b82f6",
                color: "white",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 500,
                cursor: selectedParty ? "pointer" : "not-allowed",
                opacity: selectedParty ? 1 : 0.6,
              }}
            >
              ↻ Refresh
            </button>
          </div>

          {/* Summary Cards */}
          {entries.length > 0 && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 12,
                marginBottom: 18,
              }}
            >
              {[
                ["Total Debit", totalDebit, "#2563eb"],
                ["Total Credit", totalCredit, "#7c3aed"],
                ["Closing Balance", Math.abs(closing), cfg.color],
              ].map(([l, v, c]) => (
                <div
                  key={l}
                  style={{
                    background: `${c}08`,
                    border: `1px solid ${c}20`,
                    borderRadius: 12,
                    padding: "14px 16px",
                    textAlign: "center",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontWeight: 700,
                      fontSize: 20,
                      color: c,
                    }}
                  >
                    {fmtINR(v)}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 10,
                      color: "#475569",
                      marginTop: 3,
                    }}
                  >
                    {l}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div style={S.card}>
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#f8fafc",
              }}
            >
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 700,
                  fontSize: 16,
                  color: "#0f172a",
                }}
              >
                {cfg.label}
              </div>
              <div
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: "#64748b",
                }}
              >
                {entries.length} transactions
              </div>
            </div>

            {!selectedParty ? (
              <div
                style={{
                  padding: "80px 20px",
                  textAlign: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: "#94a3b8",
                }}
              >
                Select a {cfg.partyLabel.toLowerCase()} to view statement
              </div>
            ) : loading ? (
              <div
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ ...S.sk, height: 44 }} />
                ))}
              </div>
            ) : entries.length === 0 ? (
              <div style={{ padding: "60px 20px", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>
                  ◎
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: "#94a3b8",
                  }}
                >
                  No transactions found
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ minWidth: 700 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      {[
                        "Date",
                        "Ref No",
                        "Type",
                        "Narration",
                        "Debit",
                        "Credit",
                        "Balance",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "11px 16px",
                            textAlign: ["Debit", "Credit", "Balance"].includes(
                              h
                            )
                              ? "right"
                              : "left",
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: 10,
                            color: "#475569",
                            textTransform: "uppercase",
                            letterSpacing: 1.5,
                            fontWeight: 500,
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((e, i) => {
                      const debit = e.debit || 0;
                      const credit = e.credit || 0;
                      const bal = e.balance || 0;
                      return (
                        <tr
                          key={e._id || i}
                          style={{ borderBottom: "1px solid #f1f5f9" }}
                          onMouseEnter={(ev) =>
                            (ev.currentTarget.style.background = "#f8fafc")
                          }
                          onMouseLeave={(ev) =>
                            (ev.currentTarget.style.background = "transparent")
                          }
                        >
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12,
                              color: "#475569",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {new Date(e.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 12,
                              color: cfg.color,
                              fontWeight: 500,
                            }}
                          >
                            {e.transactionNumber || "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 11,
                              color: "#64748b",
                            }}
                          >
                            {e.transactionType || "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              fontFamily: "'Inter', sans-serif",
                              fontSize: 13,
                              color: "#1e293b",
                              maxWidth: 200,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {e.narration || "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 13,
                              color: "#2563eb",
                              fontWeight: 500,
                            }}
                          >
                            {debit > 0 ? fmtINR(debit) : "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              fontFamily: "'JetBrains Mono', monospace",
                              fontSize: 13,
                              color: "#7c3aed",
                              fontWeight: 500,
                            }}
                          >
                            {credit > 0 ? fmtINR(credit) : "—"}
                          </td>
                          <td
                            style={{
                              padding: "11px 16px",
                              textAlign: "right",
                              fontFamily: "'Inter', sans-serif",
                              fontWeight: 700,
                              fontSize: 14,
                              color: bal >= 0 ? cfg.color : "#dc2626",
                            }}
                          >
                            {fmtINR(Math.abs(bal))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        borderTop: "2px solid #e2e8f0",
                        background: "#f8fafc",
                      }}
                    >
                      <td
                        colSpan={4}
                        style={{
                          padding: "12px 16px",
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          fontSize: 14,
                          color: "#0f172a",
                        }}
                      >
                        Closing Balance
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          color: "#2563eb",
                        }}
                      >
                        {fmtINR(totalDebit)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 700,
                          color: "#7c3aed",
                        }}
                      >
                        {fmtINR(totalCredit)}
                      </td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontFamily: "'Inter', sans-serif",
                          fontWeight: 800,
                          fontSize: 16,
                          color: cfg.color,
                        }}
                      >
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
    </>
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