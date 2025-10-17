"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

export default function BOMViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchBOM() {
      const token = localStorage.getItem("token");
      if (!token) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }
      try {
        const res = await axios.get(`/api/bom/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setBom(res.data);
      } catch (err) {
        console.error("Error fetching BOM:", err);
        setError("Failed to load BOM details");
      } finally {
        setLoading(false);
      }
    }
    if (id) fetchBOM();
  }, [id]);

  if (loading) return <div>Loading BOM details...</div>;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!bom) return <div>No BOM found.</div>;

  const productName = bom?.productNo?.itemName || bom?.productNo || "—";
  const warehouseName = bom?.warehouse?.warehouseName || bom?.warehouse || "—";

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white shadow-lg rounded">
      <button
        onClick={() => router.back()}
        className="mb-4 text-blue-600 hover:underline"
      >
        ← Back to BOM List
      </button>

      <h2 className="text-2xl font-semibold mb-4">BOM Details</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div><strong>Product:</strong> {productName}</div>
        <div><strong>Description:</strong> {bom?.productDesc || "—"}</div>
        <div><strong>BOM Type:</strong> {bom?.bomType || "—"}</div>
        <div><strong>Warehouse:</strong> {warehouseName}</div>
        <div><strong>Total:</strong> {(bom?.totalSum ?? 0).toFixed(2)}</div>
        <div><strong>Date:</strong> {bom?.createdAt ? new Date(bom.createdAt).toLocaleDateString() : "—"}</div>
      </div>

      {/* Items Table */}
      <h3 className="text-xl font-semibold mb-2">Items</h3>
      <table className="w-full table-auto border-collapse border text-sm mb-6">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">Item</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Rate</th>
            <th className="border p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {bom?.items?.length > 0 ? (
            bom.items.map((it, idx) => (
              <tr key={idx}>
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{it.item?.itemName || it.itemName || "—"}</td>
                <td className="border p-2 text-center">{it.quantity}</td>
                <td className="border p-2 text-right">{(it.unitPrice ?? 0).toFixed(2)}</td>
                <td className="border p-2 text-right">{(it.total ?? 0).toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="border p-4 text-center text-gray-500">
                No items in this BOM.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Resources Table */}
      <h3 className="text-xl font-semibold mb-2">Resources</h3>
      <table className="w-full table-auto border-collapse border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">Resource</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Cost</th>
            <th className="border p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {bom?.resources?.length > 0 ? (
            bom.resources.map((res, idx) => (
              <tr key={idx}>
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{res.name || res.code || "—"}</td>
                <td className="border p-2 text-center">{res.quantity}</td>
                <td className="border p-2 text-right">{(res.unitPrice ?? 0).toFixed(2)}</td>
                <td className="border p-2 text-right">{(res.total ?? 0).toFixed(2)}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="border p-4 text-center text-gray-500">
                No resources in this BOM.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
