"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Table from "../../../../components/table"; // Import the Table component

function ViewItem() {
  const [item, setItem] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchItems = async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("No token found. Please log in.");

      const response = await axios.get("/api/item", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setItem(response.data.items || []); // ✅ Ensure safe fallback
      } else {
        setError(response.data.message || "Failed to fetch items.");
      }
    } catch (err) {
      console.error("Error fetching items:", err.response?.data || err.message);
      setError("Unable to fetch items. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  fetchItems();
}, []);

  return (
    <div className="min-h-screen flex  bg-gray-100 ">
      <div className="max-w-screen-xl p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">All Item</h1>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        {loading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : (
          <Table data={item} />
        )}
      </div>
    </div>

    // </div>
  );
}

export default ViewItem;
