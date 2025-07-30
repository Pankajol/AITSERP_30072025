import React, { useState, useEffect } from "react";
import useSearch from "../hooks/useSearch";

const SupplierSearch = ({ onSelectSupplier, initialSupplier }) => {
  const [query, setQuery] = useState(initialSupplier?.supplierName || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(initialSupplier || null);

  // ✅ Search suppliers with token
  const supplierSearch = useSearch(async (searchQuery) => {
    if (!searchQuery) return [];

    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found. Please log in.");
      return [];
    }

    try {
      const res = await fetch(`/api/suppliers?search=${encodeURIComponent(searchQuery)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Failed to fetch suppliers: ${res.status}`);
      const data = await res.json();
      return data?.data || [];
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      return [];
    }
  });

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    supplierSearch.handleSearch(val);
    setShowDropdown(true);
  };

  const handleSelect = (sup) => {
    setSelected(sup);
    setQuery(sup.supplierName);
    onSelectSupplier(sup);
    setShowDropdown(false);
  };

  useEffect(() => {
    const onClick = (e) => {
      if (!e.target.closest(".supplier-search-container")) setShowDropdown(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div className="relative supplier-search-container w-full">
      {/* Input Field */}
      <div className="relative">
        <input
          type="text"
          className="border border-gray-300 rounded-md px-4 py-2 w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="Search Supplier"
          value={query}
          onChange={handleChange}
          onFocus={() => setShowDropdown(true)}
        />

        {/* Clear Button */}
        {selected && (
          <button
            type="button"
            onClick={() => {
              setSelected(null);
              setQuery("");
              onSelectSupplier(null);
            }}
            className="absolute top-1/2 right-3 transform -translate-y-1/2 text-gray-400 hover:text-gray-700"
            title="Clear"
          >
            &times;
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !selected && (
        <div className="absolute left-0 right-0 mt-1 bg-white shadow-lg rounded-md border border-gray-200 max-h-56 overflow-y-auto z-50">
          {supplierSearch.loading && (
            <p className="p-3 text-gray-500 text-center">Loading...</p>
          )}
          {!supplierSearch.loading && supplierSearch.results.length === 0 && (
            <p className="p-3 text-gray-400 text-center">No suppliers found</p>
          )}
          {supplierSearch.results.map((sup) => (
            <div
              key={sup._id}
              onClick={() => handleSelect(sup)}
              className="p-3 cursor-pointer hover:bg-blue-100 transition"
            >
              <p className="font-medium text-gray-700">{sup.supplierName}</p>
              <p className="text-xs text-gray-500">{sup.supplierCode}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierSearch;



// import React, { useState } from 'react';
// import useSearch from '../hooks/useSearch';

// const SupplierSearch = ({ onSelectSupplier }) => {
//   // Local state for the text input
//   const [query, setQuery] = useState('');
//   const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
//   const [selectedSupplier, setSelectedSupplier] = useState(null);

//   // useSearch hook to fetch supplier data based on query
//   const supplierSearch = useSearch(async (searchQuery) => {
//     if (!searchQuery) return [];
//     const res = await fetch(`/api/suppliers?search=${encodeURIComponent(searchQuery)}`);
//     return res.ok ? await res.json() : [];
//   });

//   // Update local query and trigger the search
//   const handleQueryChange = (e) => {
//     const newQuery = e.target.value;
//     setQuery(newQuery);
//     supplierSearch.handleSearch(newQuery);
//     setShowSupplierDropdown(true);
//     if (selectedSupplier) setSelectedSupplier(null);
//   };

//   const handleSupplierSelect = (supplier) => {
//     setSelectedSupplier(supplier);
//     onSelectSupplier(supplier);
//     setShowSupplierDropdown(false);
//     // Use supplier.supplierName consistently
//     setQuery(supplier.supplierName);
//   };

//   return (
//     <div className="relative mb-4">
//       <input
//         type="text"
//         placeholder="Search Supplier"
//         // Always use a fallback value so that value is never undefined
//         value={selectedSupplier ? selectedSupplier.supplierName : (query || "")}
//         onChange={handleQueryChange}
//         onFocus={() => setShowSupplierDropdown(true)}
//         className="border px-4 py-2 w-full"
//       />

//       {showSupplierDropdown && (
//         <div
//           className="absolute border bg-white w-full max-h-40 overflow-y-auto z-50"
//           style={{ top: '100%', left: 0 }}
//         >
//           {supplierSearch.loading && <p className="p-2">Loading...</p>}
//           {supplierSearch.results && supplierSearch.results.length > 0 ? (
//             supplierSearch.results.map((supplier) => (
//               <div
//                 key={supplier._id} // Ensure each element has a unique key
//                 onClick={() => handleSupplierSelect(supplier)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedSupplier && selectedSupplier._id === supplier._id ? 'bg-blue-100' : ''
//                 }`}
//               >
//                 {supplier.supplierName}
//               </div>
//             ))
//           ) : (
//             !supplierSearch.loading && <p className="p-2 text-gray-500">No suppliers found.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SupplierSearch;
