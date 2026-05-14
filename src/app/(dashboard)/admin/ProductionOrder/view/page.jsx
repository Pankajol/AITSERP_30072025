"use client";

import React, { useEffect, useState, Suspense } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";

/* ✅ Wrapper required by Next.js for useSearchParams */
export default function ProductionOrderViewWrapper() {
  return (
    <Suspense fallback={<p className="p-4 text-center">Loading production order...</p>}>
      <ProductionOrderView />
    </Suspense>
  );
}

/* ✅ Actual page component */
function ProductionOrderView() {
  const search = useSearchParams();
  const id = search.get("id");

  const [order, setOrder] = useState(null);

  useEffect(() => {
    if (!id) return;

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("Token missing");
      return;
    }

    axios
      .get(`/api/production-orders/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => setOrder(res.data))
      .catch((err) => console.error("Error loading order:", err));
  }, [id]);

  if (!order) return <p className="p-4 text-center">Loading...</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-lg rounded-md">
      <h1 className="text-2xl font-bold mb-4">Production Order Details</h1>

      {/* ORDER DETAILS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Detail label="Product No" value={order.bomId?.productNo?.itemCode} />
        <Detail label="Product Name" value={order.bomId?.productNo?.itemName} />
        <Detail label="Type" value={order.type} />
        <Detail label="Status" value={order.status} />
        <Detail label="Priority" value={order.priority} />
        <Detail label="Warehouse" value={order.warehouse?.warehouseName || "Not Assigned"} />
        <Detail label="Description" value={order.productDesc} />
        <Detail label="Planned Quantity" value={order.quantity} />
        <Detail
          label="Production Date"
          value={
            order.productionDate
              ? new Date(order.productionDate).toLocaleDateString()
              : "-"
          }
        />
      </div>

      {/* ITEMS SECTION */}
      <h2 className="text-xl font-semibold mb-2">Items</h2>

      <table className="w-full table-auto border-collapse border text-sm mb-8">
        <thead className="bg-gray-200">
          <tr>
            <Th>Item Code</Th>
            <Th>Item Name</Th>
            <Th>Unit Qty</Th>
            <Th>Qty</Th>
            <Th>Req Qty</Th>
            <Th>Warehouse</Th>
          </tr>
        </thead>

        <tbody>
          {order.items?.map((item, index) => (
            <tr key={index} className="border hover:bg-gray-50">
              <Td>{item.item?.itemCode || item.itemCode}</Td>
              <Td>{item.item?.itemName || item.itemName}</Td>
              <Td className="text-right">{item.unitQty}</Td>
              <Td className="text-right">{item.quantity}</Td>
              <Td className="text-right">{item.requiredQty}</Td>
              <Td>{item.warehouse?.warehouseName || "N/A"}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* RESOURCES SECTION */}
      <h2 className="text-xl font-semibold mb-2">Resources</h2>

      <table className="w-full table-auto border-collapse border text-sm mb-8">
        <thead className="bg-gray-200">
          <tr>
            <Th>Code</Th>
            <Th>Name</Th>
            <Th>Quantity</Th>
            <Th>Unit Price</Th>
            <Th>Total</Th>
          </tr>
        </thead>

        <tbody>
          {order.resources?.map((res, index) => (
            <tr key={index} className="border hover:bg-gray-50">
              <Td>{res.code}</Td>
              <Td>{res.name}</Td>
              <Td>{res.quantity}</Td>
              <Td>{res.unitPrice}</Td>
              <Td>{res.total}</Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* OPERATION FLOW SECTION */}
      <h2 className="text-xl font-semibold mb-2">Operation Flow</h2>

      <table className="w-full table-auto border-collapse border text-sm mb-8">
        <thead className="bg-gray-200">
          <tr>
            <Th>Operation</Th>
            <Th>Machine</Th>
            <Th>Operator</Th>
            <Th>Start Date</Th>
            <Th>End Date</Th>
          </tr>
        </thead>

        <tbody>
          {order.operationFlow?.map((op, index) => (
            <tr key={index} className="border hover:bg-gray-50">
              <Td>
                {op.operation?.name ||
                  op.operation?.code ||
                  JSON.stringify(op.operation) ||
                  "-"}
              </Td>

              <Td>
                {op.machine?.name ||
                  op.machine?.code ||
                  JSON.stringify(op.machine) ||
                  "-"}
              </Td>

              <Td>
                {op.operator?.name ||
                  op.operator?.fullName ||
                  JSON.stringify(op.operator) ||
                  "-"}
              </Td>

              <Td>
                {op.expectedStartDate
                  ? new Date(op.expectedStartDate).toLocaleDateString()
                  : "-"}
              </Td>

              <Td>
                {op.expectedEndDate
                  ? new Date(op.expectedEndDate).toLocaleDateString()
                  : "-"}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* EDIT BUTTON */}
      <div className="mt-6">
        <a
          href={`/admin/ProductionOrder/edit?id=${id}`}
          className="bg-blue-600 px-4 py-2 text-white rounded hover:bg-blue-700"
        >
          Edit Production Order
        </a>
      </div>
    </div>
  );
}

/* REUSABLE COMPONENTS */
function Detail({ label, value }) {
  return (
    <div className="border p-3 rounded bg-gray-50">
      <strong>{label}:</strong> {value || "-"}
    </div>
  );
}

function Th({ children }) {
  return <th className="border p-2 font-semibold text-left">{children}</th>;
}

function Td({ children, className }) {
  return <td className={`border p-2 ${className}`}>{children}</td>;
}
