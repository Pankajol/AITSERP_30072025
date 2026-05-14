"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";


function StockTransferPageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <StockTransferPage />
    </Suspense>
  );
}


 function StockTransferPage() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("orderId");

  const [docNo, setDocNo] = useState("");
  const [docDate, setDocDate] = useState("");
  const [rows, setRows] = useState([]);
  const [warehouseOptions, setWarehouseOptions] = useState([]);

  // Load warehouses
  useEffect(() => {
    axios
      .get("/api/warehouse")
      .then(res =>
        setWarehouseOptions(
          res.data.map(w => ({ value: w._id, label: w.warehouseName }))
        )
      )
      .catch(console.error);
  }, []);

  // Load production order and initialize form
  useEffect(() => {
    if (!orderId) return;

    axios
      .get(`/api/production-orders/${orderId}`)
      .then(res => {
        const ord = res.data;

        // Auto-generate Document No & Date
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        setDocNo(`ST-${today}-${orderId.slice(-4)}`);
        setDocDate(new Date().toISOString().substr(0, 10));

        // Map items
        setRows(
          ord.items.map(item => ({
            itemCode: item.itemCode,
            itemName: item.itemName,
            uom: item.unitQty > 1 ? `x${item.unitQty}` : 'pcs',
            qty: item.requiredQty,
            source: item.warehouse.$oid || item.warehouse,
            destination: ""
          }))
        );
      })
      .catch(console.error);
  }, [orderId]);

  const onChange = (idx, field, val) => {
    setRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const addRow = () =>
    setRows(prev => [
      ...prev,
      { itemCode: "", itemName: "", uom: "pcs", qty: "", source: "", destination: "" }
    ]);

  const save = () => {
    axios
      .post(`/api/stock-transfer/${orderId}`, {
        orderId,
        documentNo: docNo,
        documentDate: docDate,
        items: rows.map(r => ({
          itemCode: r.itemCode,
          qty: r.qty,
          sourceWarehouse: r.source,
          destinationWarehouse: r.destination
        })),
      })
      .then(() => router.push("/stock-transfer"))
      .catch(console.error);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow rounded">
      <h1 className="text-xl font-bold mb-4">Stock Transfer</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <label>
          Document No<br />
          <input
            type="text"
            className="border p-2 w-full bg-gray-100"
            value={docNo}
            readOnly
          />
        </label>
        <label>
          Document Date<br />
          <input
            type="date"
            className="border p-2 w-full"
            value={docDate}
            onChange={e => setDocDate(e.target.value)}
          />
        </label>
      </div>

      <table className="w-full table-auto border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Item Code</th>
            <th className="border p-2">Item Name</th>
            <th className="border p-2">UOM</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Source Warehouse</th>
            <th className="border p-2">Destination Warehouse</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="border p-1">{r.itemCode}</td>
              <td className="border p-1">{r.itemName}</td>
              <td className="border p-1">{r.uom}</td>
              <td className="border p-1">
                <input
                  type="number"
                  className="w-full"
                  value={r.qty}
                  onChange={e => onChange(i, "qty", e.target.value)}
                />
              </td>
              <td className="border p-1">
                <select
                  className="w-full border p-2 rounded"
                  value={r.source}
                  onChange={e => onChange(i, "source", e.target.value)}
                >
                  <option value="">-- select warehouse --</option>
                  {warehouseOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
              <td className="border p-1">
                <select
                  className="w-full border p-2 rounded"
                  value={r.destination}
                  onChange={e => onChange(i, "destination", e.target.value)}
                >
                  <option value="">-- select warehouse --</option>
                  {warehouseOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex space-x-2">
        <button onClick={addRow} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          + Add Row
        </button>
        <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Save
        </button>
      </div>
    </div>
  );
}

export default StockTransferPageWrapper;