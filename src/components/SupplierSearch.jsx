// "use client";
// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import { FaSearch, FaTimes } from "react-icons/fa";

// const SupplierSearch = ({ onSelectSupplier, initialSupplier }) => {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const wrapperRef = useRef(null);

//   // Sync with initialSupplier (for edit mode)
//   useEffect(() => {
//     if (initialSupplier) {
//       setQuery(initialSupplier.supplierName || "");
//     }
//   }, [initialSupplier]);

//   // Search debounce
//   useEffect(() => {
//     const delay = setTimeout(() => {
//       if (query.trim()) {
//         searchSuppliers(query);
//       } else {
//         setResults([]);
//         setShowDropdown(false);
//       }
//     }, 300);
//     return () => clearTimeout(delay);
//   }, [query]);

//   const searchSuppliers = async (searchQuery) => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.get(`/api/suppliers?search=${encodeURIComponent(searchQuery)}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (res.data.success) {
//         setResults(res.data.data);
//         setShowDropdown(true);
//       }
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSelect = (supplier) => {
//     setQuery(supplier.supplierName);
//     setShowDropdown(false);
//     if (onSelectSupplier) {
//       onSelectSupplier(supplier);
//     }
//   };

//   const handleClear = () => {
//     setQuery("");
//     if (onSelectSupplier) {
//       onSelectSupplier(null);
//     }
//   };

//   // Click outside to close dropdown
//   useEffect(() => {
//     const handleClickOutside = (e) => {
//       if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
//         setShowDropdown(false);
//       }
//     };
//     document.addEventListener("mousedown", handleClickOutside);
//     return () => document.removeEventListener("mousedown", handleClickOutside);
//   }, []);

//   return (
//     <div ref={wrapperRef} className="relative w-full">
//       <div className="relative">
//         <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 text-xs" />
//         <input
//           type="text"
//           placeholder="Search supplier by name or code..."
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onFocus={() => query && setShowDropdown(true)}
//           className="w-full pl-8 pr-8 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
//         />
//         {query && (
//           <button
//             onClick={handleClear}
//             className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500"
//           >
//             <FaTimes className="text-xs" />
//           </button>
//         )}
//       </div>

//       {showDropdown && (
//         <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
//           {loading && <div className="p-3 text-center text-gray-400">Loading...</div>}
//           {!loading && results.length === 0 && query && (
//             <div className="p-3 text-center text-gray-400">No suppliers found</div>
//           )}
//           {results.map((sup) => (
//             <div
//               key={sup._id}
//               onClick={() => handleSelect(sup)}
//               className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0"
//             >
//               <div className="flex justify-between items-center">
//                 <span className="font-semibold text-gray-800 text-sm">{sup.supplierName}</span>
//                 <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
//                   {sup.supplierCode}
//                 </span>
//               </div>
//               {sup.contactPersonName && (
//                 <div className="text-[11px] text-gray-500 mt-0.5">👤 {sup.contactPersonName}</div>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// };

// export default SupplierSearch;


"use client";
import React, { useState, useEffect, useRef } from "react";
import useSearch from "../hooks/useSearch";

// Prop name ko 'onSelectSupplier' rakha hai taaki main page se match kare
const SupplierSearch = ({ onSelectSupplier, initialSupplier }) => {
  const wrapperRef = useRef(null);

  const [query, setQuery] = useState(initialSupplier?.supplierName || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(initialSupplier || null);

  /* sync initial supplier (Jab edit mode me data load ho) */
  useEffect(() => {
    if (initialSupplier) {
      setSelected(initialSupplier);
      setQuery(initialSupplier.supplierName || "");
    }
  }, [initialSupplier]);

  /* supplier search logic */
  const supplierSearch = useSearch(async (searchQuery) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return [];

      const res = await fetch(
        `/api/suppliers?search=${encodeURIComponent(searchQuery || "")}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      return data?.data || [];
    } catch (err) {
      console.error("SupplierSearch Error:", err);
      return [];
    }
  });

  /* Click outside dropdown to close */
  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleChange = async (e) => {
    const val = e.target.value;
    setQuery(val);
    setSelected(null); // Type karte waqt previous selection clear karein
    setShowDropdown(true);
    await supplierSearch.handleSearch(val);
  };

  const handleFocus = async () => {
    setShowDropdown(true);
    if (!supplierSearch.results.length) {
      await supplierSearch.handleSearch("");
    }
  };

  // YE FUNCTION AUTO-FILL KE LIYE ZAROORI HAI
  const handleSelect = (sup) => {
    setSelected(sup);
    setQuery(sup.supplierName || "");
    setShowDropdown(false);
    
    // Parent component (Order Form) ko pura supplier object bhejein
    // Taaki Name, Code aur Contact Person fill ho sake
    if (onSelectSupplier) {
      onSelectSupplier(sup); 
    }
  };

  const handleClear = () => {
    setSelected(null);
    setQuery("");
    onSelectCustomer?.(null);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          type="text"
          placeholder="Search Supplier by Name or Code..."
          value={query}
          onChange={handleChange}
          onFocus={handleFocus}
          // ERP UI Style matching
          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none placeholder:text-gray-300"
        />

        {selected && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-red-500"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-1 bg-white shadow-2xl rounded-xl border border-gray-100 max-h-64 overflow-y-auto z-[999]">
          {supplierSearch.loading && (
            <div className="p-4 text-center">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}

          {!supplierSearch.loading && supplierSearch.results.length === 0 && (
            <p className="p-4 text-gray-400 text-sm text-center italic">
              No matching suppliers found
            </p>
          )}

          {supplierSearch.results.map((sup) => (
            <div
              key={sup._id}
              onClick={() => handleSelect(sup)}
              className="p-3 cursor-pointer hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
            >
              <div className="flex justify-between items-center">
                <p className="font-bold text-gray-800 text-sm">
                  {sup.supplierName}
                </p>
                <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {sup.supplierCode}
                </span>
              </div>
              {sup.contactPersonName && (
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                   👤 {sup.contactPersonName}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupplierSearch;

