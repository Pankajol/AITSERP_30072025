"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import useSearch from "@/hooks/useSearch"; // Custom search hook

const ItemGroupSearch = ({ onSelectItemGroup }) => {
  const [itemGroups, setItemGroups] = useState([]); // State for item groups
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItemGroup, setSelectedItemGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null); // Ref for dropdown click detection

useEffect(() => {
  const fetchItemGroups = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token"); // ✅ Get token
      if (!token) {
        setError("You are not authenticated. Please log in.");
        return;
      }

      const { data } = await axios.get("/api/itemGroups", {
        headers: {
          Authorization: `Bearer ${token}`, // ✅ Send token
        },
      });

      setItemGroups(data.data); // ✅ Ensure you use data.data because API response is {success, data: [...]}
    } catch (err) {
      setError("Error fetching item groups. Please try again.");
      console.error("Error:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  fetchItemGroups();
}, []);


  // Dynamic search for item groups
const itemGroupSearch = useSearch(async (query) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("User is not authenticated");
      return [];
    }

    const { data } = await axios.get(`/api/itemGroups?search=${query}`, {
      headers: {
        Authorization: `Bearer ${token}`, // ✅ Include token here
      },
    });

    return data.data || [];
  } catch (err) {
    console.error("Search error:", err.response?.data || err.message);
    return [];
  }
});


  // Hide dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (itemGroup) => {
    setSelectedItemGroup(itemGroup);
    onSelectItemGroup(itemGroup); // Pass selected item group to parent
    setShowDropdown(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Search Input */}
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search Item Group"
          value={selectedItemGroup?.name || itemGroupSearch.query}
          onChange={(e) => {
            itemGroupSearch.handleSearch(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          className="border px-4 py-2 w-full"
        />
        {showDropdown && (
          <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
            {itemGroupSearch.loading && <p className="p-2">Loading...</p>}
            {itemGroupSearch.results.length === 0 && !itemGroupSearch.loading && (
              <p className="p-2 text-gray-500">No item groups found</p>
            )}
            {itemGroupSearch.results.map((itemGroup) => (
              <div
                key={itemGroup._id}
                onClick={() => handleSelect(itemGroup)}
                className={`p-2 cursor-pointer hover:bg-gray-200 ${
                  selectedItemGroup?._id === itemGroup._id ? "bg-blue-100" : ""
                }`}
              >
                {itemGroup.name}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Error Message */}
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
};

export default ItemGroupSearch;
