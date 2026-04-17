// import React, { useState } from 'react';
// import useSearch from '../hooks/useSearch';

// const CustomerSearch = ({ onSelectCustomer }) => {
//   // Local state for the text input
//   const [query, setQuery] = useState('');
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);

//   // useSearch hook to fetch customer data based on query
//   const customerSearch = useSearch(async (searchQuery) => {
//     if (!searchQuery) return [];
//     const res = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`);
//     return res.ok ? await res.json() : [];
//   });

//   // Update local query and trigger the search
//   const handleQueryChange = (e) => {
//     const newQuery = e.target.value;
//     setQuery(newQuery);
//     customerSearch.handleSearch(newQuery);
//     setShowCustomerDropdown(true);
//     if (selectedCustomer) setSelectedCustomer(null);
//   };

//   const handleCustomerSelect = (customer) => {
//     setSelectedCustomer(customer);
//     onSelectCustomer(customer);
//     setShowCustomerDropdown(false);
//     // Use customer.customerName consistently
//     setQuery(customer.customerName);
//   };

//   return (
//     <div className="relative mb-4">
//       <input
//         type="text"
//         placeholder="Search Customer"
//         value={selectedCustomer ? selectedCustomer.customerName : (query || "")}
//         onChange={handleQueryChange}
//         onFocus={() => setShowCustomerDropdown(true)}
//         className="border px-4 py-2 w-full"
//       />

//       {showCustomerDropdown && (
//         <div
//           className="absolute border bg-white w-full max-h-40 overflow-y-auto z-50"
//           style={{ top: '100%', left: 0 }}
//         >
//           {customerSearch.loading && <p className="p-2">Loading...</p>}
//           {customerSearch.results && customerSearch.results.length > 0 ? (
//             customerSearch.results.map((customer) => (
//               <div
//                 key={customer._id}
//                 onClick={() => handleCustomerSelect(customer)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedCustomer && selectedCustomer._id === customer._id ? 'bg-blue-100' : ''
//                 }`}
//               >
//                 {customer.customerName}
//               </div>
//             ))
//           ) : (
//             !customerSearch.loading && <p className="p-2 text-gray-500">No customers found.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default CustomerSearch;
"use client";

import React, { useState, useRef, useEffect } from "react";
import { debounce } from "lodash";

export default function CustomerSearch({ onSelectCustomer, apiEndpoint = "/api/customers" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Fetch default list (when search term is empty)
  const fetchDefaultList = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setResults(data.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to fetch default customers:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search (only when query has at least 1 character)
  const debouncedSearch = useRef(
    debounce(async (searchTerm) => {
      if (!searchTerm.trim()) {
        // When empty, show default list
        await fetchDefaultList();
        return;
      }
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiEndpoint}?search=${encodeURIComponent(searchTerm)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => debouncedSearch.cancel();
  }, [debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    setShowDropdown(true);
    debouncedSearch(val);
  };

  const handleFocus = () => {
    setShowDropdown(true);
    if (!query.trim()) {
      debouncedSearch("");
    }
  };

  const handleSelect = (customer) => {
    setQuery(customer.customerName);
    setShowDropdown(false);
    if (onSelectCustomer) {
      onSelectCustomer({
        _id: customer._id,
        customerCode: customer.customerCode,
        customerName: customer.customerName,
        contactPersonName: customer.contactPersonName,
        emailId: customer.emailId,
        mobileNumber: customer.mobileNumber,
        gstNumber: customer.gstNumber,
        pan: customer.pan,
      });
    }
  };

  return (
    <div ref={wrapperRef} className="relative mb-4">
      <input
        type="text"
        placeholder="Search Customer by Name, Code, Email or Mobile"
        value={query}
        onChange={handleChange}
        onFocus={handleFocus}
        className="border px-4 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {showDropdown && (
        <div className="absolute w-full bg-white border max-h-60 overflow-y-auto z-50 shadow-lg rounded mt-1">
          {loading && (
            <div className="p-2 text-sm text-gray-500">Loading...</div>
          )}

          {!loading && results.length === 0 && query.trim() !== "" && (
            <div className="p-2 text-sm text-gray-500">No customers found</div>
          )}

          {!loading && results.length === 0 && query.trim() === "" && (
            <div className="p-2 text-sm text-gray-500">No customers available</div>
          )}

          {results.map((customer) => (
            <div
              key={customer._id}
              onClick={() => handleSelect(customer)}
              className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-0"
            >
              <div className="font-medium">{customer.customerName}</div>
              <div className="text-xs text-gray-500">
                {customer.customerCode} • {customer.emailId || "No email"} • {customer.mobileNumber || "No mobile"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// import React, { useState } from "react";
// import useSearch from "../hooks/useSearch";

// const CustomerSearch = ({ onSelectCustomer }) => {
//   const [query, setQuery] = useState("");
//   const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
//   const [selectedCustomer, setSelectedCustomer] = useState(null);

// const customerSearch = useSearch(async (searchQuery) => {
//   if (!searchQuery) return [];

//   try {
//     const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
//     if (!token) {
//       console.error("No token found");
//       return [];
//     }

//     const res = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery)}`, {
//       headers: {
//         "Authorization": `Bearer ${token}`,
//       },
//     });

//     if (!res.ok) {
//       const errorData = await res.json();
//       console.error("Failed to fetch customers:", errorData.message);
//       return [];
//     }

//     const result = await res.json();
//     return result.success ? result.data : [];
//   } catch (error) {
//     console.error("Error searching customers:", error);
//     return [];
//   }
// });



//   const handleQueryChange = (e) => {
//     const newQuery = e.target.value;
//     setQuery(newQuery);
//     customerSearch.handleSearch(newQuery);
//     setShowCustomerDropdown(true);
//     if (selectedCustomer) setSelectedCustomer(null);
//   };

//   const handleCustomerSelect = (customer) => {
//     console.log("Selected customer:", customer);
//     setSelectedCustomer(customer);
//     onSelectCustomer({
//       _id: customer._id,
//       customerCode: customer.customerCode,
//       customerName: customer.customerName,
//       contactPersonName: customer.contactPersonName,
//     });
//     setShowCustomerDropdown(false);
//     setQuery(customer.customerName);
//   };

//   return (
//     <div className="relative mb-4">
//       <input
//         type="text"
//         placeholder="Search Customer"
//         value={selectedCustomer ? selectedCustomer.customerName : query || ""}
//         onChange={handleQueryChange}
//         onFocus={() => setShowCustomerDropdown(true)}
//         className="border px-4 py-2 w-full"
//       />

//       {showCustomerDropdown && (
//         <div
//           className="absolute border bg-white w-full max-h-40 overflow-y-auto z-50"
//           style={{ top: "100%", left: 0 }}
//         >
//           {customerSearch.loading && <p className="p-2">Loading...</p>}
//           {customerSearch.results && customerSearch.results.length > 0 ? (
//             customerSearch.results.map((customer) => (
//               <div
//                 key={customer._id}
//                 onClick={() => handleCustomerSelect(customer)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedCustomer && selectedCustomer._id === customer._id ? "bg-blue-100" : ""
//                 }`}
//               >
//                 {customer.customerName} ({customer.customerCode})
//               </div>
//             ))
//           ) : (
//             !customerSearch.loading && <p className="p-2 text-gray-500">No customers found.</p>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };

// export default CustomerSearch;