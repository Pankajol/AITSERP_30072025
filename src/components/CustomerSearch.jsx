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

// components/CustomerSearch.js
"use client";
import React, { useState } from "react";
import useSearch from "../hooks/useSearch";
import api from "@/utils/api";

export default function CustomerSearch({ onSelectCustomer }) {
  const [query, setQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(null);

  const customerSearch = useSearch(async (q) => {
    if (!q) return [];
    const res = await api.get(`/customers?search=${encodeURIComponent(q)}`);
    return res.data.success ? res.data.data : [];
  });

  const handleChange = (e) => {
    setQuery(e.target.value);
    customerSearch.handleSearch(e.target.value);
    setShowDropdown(true);
    if (selected) setSelected(null);
  };

  const handleSelect = (c) => {
    setSelected(c);
    onSelectCustomer({
      _id: c._id,
      customerCode: c.customerCode,
      customerName: c.customerName,
      contactPersonName: c.contactPersonName,
    });
    setShowDropdown(false);
    setQuery(c.customerName);
  };

  return (
    <div className="relative mb-4">
      <input
        type="text"
        placeholder="Search Customer"
        value={selected ? selected.customerName : query}
        onChange={handleChange}
        onFocus={() => setShowDropdown(true)}
        className="border px-4 py-2 w-full rounded"
      />
      {showDropdown && (
        <div className="absolute w-full bg-white border max-h-40 overflow-y-auto z-50">
          {customerSearch.loading && <p className="p-2">Loading...</p>}
          {customerSearch.results.length > 0 ? (
            customerSearch.results.map((c) => (
              <div
                key={c._id}
                onClick={() => handleSelect(c)}
                className="p-2 hover:bg-gray-100 cursor-pointer"
              >
                {c.customerName} ({c.customerCode})
              </div>
            ))
          ) : (
            !customerSearch.loading && (
              <p className="p-2 text-gray-500">No customers found.</p>
            )
          )}
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