"use client";
import axios from "axios";
import { useEffect, useState } from "react";

export default function InventoryAdjustmentsView() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdjustments = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          console.error("No token found");
          return;
        }

        const res = await axios.get("/api/inventory-adjustments", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setAdjustments(res.data.data || []);
      } catch (err) {
        console.error("Error fetching adjustments:", err.response?.data || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdjustments();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  const filteredAdjustments = adjustments.filter(
    (adj) => adj.item && adj.warehouse
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Inventory Adjustments</h2>

      {filteredAdjustments.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No adjustments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 border-b text-gray-600">Item</th>
                <th className="text-left px-4 py-3 border-b text-gray-600">Warehouse</th>
                <th className="text-left px-4 py-3 border-b text-gray-600">Type</th>
                <th className="text-left px-4 py-3 border-b text-gray-600">Quantity</th>
                <th className="text-left px-4 py-3 border-b text-gray-600">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdjustments.map((adj) => (
                <tr key={adj._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 border-b text-gray-700">{adj?.item?.itemName || "N/A"}</td>
                  <td className="px-4 py-3 border-b text-gray-700">{adj?.warehouse?.warehouseName || "N/A"}</td>
                  <td
                    className={`px-4 py-3 border-b font-semibold ${
                      adj.movementType === "IN" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {adj.movementType}
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">{adj.quantity}</td>
                  <td className="px-4 py-3 border-b text-gray-500">
                    {new Date(adj.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
