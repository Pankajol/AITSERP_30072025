'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Lazy-load Recharts components (no SSR)
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
export default function PurchaseReportPage() {
  const [data, setData] = useState([]);


 useEffect(() => {
  fetch('/api/purchaseInvoice')
    .then(res => res.json())
    .then(json => {
      console.log('API response:', json);
      if (Array.isArray(json)) {
        setData(json);
      } else if (Array.isArray(json.data)) {
        setData(json.data);
      } else {
        console.error("API did not return an array:", json);
        setData([]);
      }
    })
    .catch(err => {
      console.error("Fetch error:", err);
      setData([]);
    });
}, []);


  const totalPurchase = Array.isArray(data)
    ? data.reduce((acc, item) => acc + (item.grandTotal || 0), 0)
    : 0;

  // Grouping data by date for chart
  const chartData = Array.isArray(data)
    ? Object.values(
        data.reduce((acc, curr) => {
          const date = new Date(curr.postingDate).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = { date, total: 0 };
          }
          acc[date].total += curr.grandTotal || 0;
          return acc;
        }, {})
      )
    : [];

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      data.map(item => ({
        Invoice: item.invoiceNumber,
        Supplier: item.supplierName,
        Date: new Date(item.postingDate).toLocaleDateString(),
        Total: item.grandTotal,
        Status: item.paymentStatus,
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Purchases");
    XLSX.writeFile(workbook, "Purchase_Report.xlsx");
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.text("Purchase Report", 14, 16);
    const tableData = data.map(item => [
      item.invoiceNumber,
      item.supplierName,
      new Date(item.postingDate).toLocaleDateString(),
      `₹${item.grandTotal}`,
      item.paymentStatus,
    ]);
    autoTable(doc, {
      startY: 20,
      head: [['Invoice', 'Supplier', 'Date', 'Amount', 'Status']],
      body: tableData,
    });
    doc.save("Purchase_Report.pdf");
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Purchase Report</h1>

      {/* Chart Section */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Overview Chart</h2>
        <div className="bg-white shadow rounded p-4">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#0070f3" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500">No data to display</p>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mb-4">
        <h2 className="text-xl font-semibold mb-2">Invoice Table</h2>
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-100 text-sm">
            <tr>
              <th className="px-4 py-2 border">Invoice No</th>
              <th className="px-4 py-2 border">Supplier</th>
              <th className="px-4 py-2 border">Posting Date</th>
              <th className="px-4 py-2 border">Amount</th>
              <th className="px-4 py-2 border">Status</th>
            </tr>
          </thead>
          <tbody className="text-center text-sm">
            {data.map(inv => (
              <tr key={inv.invoiceNumber} className="border-t">
                <td className="px-4 py-2 border">{inv.invoiceNumber}</td>
                <td className="px-4 py-2 border">{inv.supplierName}</td>
                <td className="px-4 py-2 border">{new Date(inv.postingDate).toLocaleDateString()}</td>
                <td className="px-4 py-2 border">₹{inv.grandTotal}</td>
                <td className="px-4 py-2 border">{inv.paymentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Export Buttons */}
      <div className="flex gap-4 mt-4">
        <button
          onClick={exportToExcel}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Export Excel
        </button>
        <button
          onClick={exportToPDF}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
        >
          Export PDF
        </button>
      </div>

      {/* Total */}
      <div className="mt-6 text-right font-bold text-lg">
        Total Purchase: ₹{totalPurchase}
      </div>
    </div>
  );
}
