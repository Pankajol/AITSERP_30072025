"use client";
import axios from "axios";
import { useEffect, useState } from "react";

export default function InventoryAdjustmentsView() {
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filters, setFilters] = useState({
    item: "",
    warehouse: "",
    type: "",
    remarks: "",
    quantity: "",
    date: "",
  });

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
        console.error(
          "Error fetching adjustments:",
          err.response?.data || err.message
        );
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

  // Apply filters
  const filteredAdjustments = adjustments
    .filter((adj) => adj.item && adj.warehouse)
    .filter((adj) =>
      filters.item
        ? adj?.item?.itemName
            ?.toLowerCase()
            .includes(filters.item.toLowerCase())
        : true
    )
    .filter((adj) =>
      filters.warehouse
        ? adj?.warehouse?.warehouseName
            ?.toLowerCase()
            .includes(filters.warehouse.toLowerCase())
        : true
    )
    .filter((adj) =>
      filters.type
        ? adj.movementType?.toLowerCase().includes(filters.type.toLowerCase())
        : true
    )
    .filter((adj) =>
      filters.remarks
        ? adj?.remarks?.toLowerCase().includes(filters.remarks.toLowerCase())
        : true
    )
    .filter((adj) =>
      filters.quantity ? adj.quantity == filters.quantity : true
    )
    .filter((adj) =>
      filters.date
        ? new Date(adj.date).toLocaleDateString() ===
          new Date(filters.date).toLocaleDateString()
        : true
    );

  // Reset filters
  const clearFilters = () =>
    setFilters({
      item: "",
      warehouse: "",
      type: "",
      remarks: "",
      quantity: "",
      date: "",
    });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">
        Inventory Adjustments
      </h2>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <input
          type="text"
          placeholder="Filter by Item"
          className="border px-3 py-2 rounded"
          value={filters.item}
          onChange={(e) =>
            setFilters({ ...filters, item: e.target.value })
          }
        />
        <input
          type="text"
          placeholder="Filter by Warehouse"
          className="border px-3 py-2 rounded"
          value={filters.warehouse}
          onChange={(e) =>
            setFilters({ ...filters, warehouse: e.target.value })
          }
        />
        <select
          className="border px-3 py-2 rounded"
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value })}
        >
          <option value="">All Types</option>
          <option value="IN">IN</option>
          <option value="OUT">OUT</option>
        </select>
        <input
          type="text"
          placeholder="Filter by Remarks"
          className="border px-3 py-2 rounded"
          value={filters.remarks}
          onChange={(e) =>
            setFilters({ ...filters, remarks: e.target.value })
          }
        />
        <input
          type="number"
          placeholder="Filter by Quantity"
          className="border px-3 py-2 rounded"
          value={filters.quantity}
          onChange={(e) =>
            setFilters({ ...filters, quantity: e.target.value })
          }
        />
        <input
          type="date"
          className="border px-3 py-2 rounded"
          value={filters.date}
          onChange={(e) => setFilters({ ...filters, date: e.target.value })}
        />
      </div>

      {/* Clear Filters Button */}
      <div className="mb-6">
        <button
          onClick={clearFilters}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium"
        >
          Clear Filters
        </button>
      </div>

      {filteredAdjustments.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No adjustments found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-lg shadow-md">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-3 border-b text-gray-600">
                  Item
                </th>
                <th className="text-left px-4 py-3 border-b text-gray-600">
                  Warehouse
                </th>
                <th className="text-left px-4 py-3 border-b text-gray-600">
                  Type
                </th>
                <th className="text-left px-4 py-3 border-b text-gray-600">
                  Remarks
                </th>
                <th className="text-left px-4 py-3 border-b text-gray-600">
                  Quantity
                </th>
                <th className="text-left px-4 py-3 border-b text-gray-600">
                  Date
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAdjustments.map((adj) => (
                <tr key={adj._id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 border-b text-gray-700">
                    {adj?.item?.itemName || "N/A"}
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">
                    {adj?.warehouse?.warehouseName || "N/A"}
                  </td>
                  <td
                    className={`px-4 py-3 border-b font-semibold ${
                      adj.movementType === "IN"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {adj.movementType}
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">
                    {adj.remarks || "N/A"}
                  </td>
                  <td className="px-4 py-3 border-b text-gray-700">
                    {adj.quantity}
                  </td>
                  <td className="px-4 py-3 border-b text-gray-500">
                    {new Date(adj.date).toLocaleDateString("en-GB")}
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
