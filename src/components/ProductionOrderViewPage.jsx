"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";

export default function ProductionOrderViewPage({ id }) {
  const [order, setOrder] = useState(null);

  useEffect(() => {
    axios
      .get(`/api/production-orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch((err) => console.error(err));
  }, [id]);

  if (!order) return <p className="p-4">Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-lg">

      <div className="flex justify-between items-center mb-6 border-b pb-3">
        <h1 className="text-3xl font-bold">Production Order Details</h1>

        <a
          href={`/admin/ProductionOrder/edit/${id}`}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ✏️ Edit
        </a>
      </div>

      {/* DETAILS */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-8">
        <Detail label="Product No" value={order.bomId?.productNo?.itemCode} />
        <Detail label="Item Name" value={order.bomId?.productNo?.itemName} />

        <Detail label="Type" value={order.type} />
        <Detail label="Status" value={order.status} />
        <Detail label="Warehouse" value={order.warehouse?.warehouseName} />
        <Detail label="Product Description" value={order.productDesc} />
        <Detail label="Priority" value={order.priority} />
        <Detail label="Quantity" value={order.quantity} />

        <Detail
          label="Production Date"
          value={
            order.productionDate
              ? new Date(order.productionDate).toLocaleDateString()
              : "-"
          }
        />
      </div>

      {/* ITEMS TABLE */}
      <h2 className="text-xl font-semibold mb-3">Items</h2>

      <table className="w-full table-auto text-sm border-collapse border">
        <thead className="bg-gray-100 border">
          <tr>
            <Th>Item Code</Th>
            <Th>Item Name</Th>
            <Th>Unit Qty</Th>
            <Th>Qty</Th>
            <Th>Required Qty</Th>
            <Th>Warehouse</Th>
          </tr>
        </thead>

        <tbody>
          {order.items?.map((item, i) => (
            <tr key={i} className="border-b hover:bg-gray-50">
              <Td>{item.item?.itemCode}</Td>
              <Td>{item.item?.itemName}</Td>

              <Td className="text-right">{item.unitQty}</Td>
              <Td className="text-right">{item.quantity}</Td>
              <Td className="text-right">{item.requiredQty}</Td>
              <Td>{item.warehouse?.warehouseName}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded border">
      <strong>{label}: </strong> {value || "-"}
    </div>
  );
}

function Th({ children }) {
  return <th className="border p-2 text-left font-semibold">{children}</th>;
}

function Td({ children, className }) {
  return <td className={`border p-2 ${className}`}>{children}</td>;
}
