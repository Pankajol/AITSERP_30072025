"use client";

import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";
import { FaExternalLinkAlt } from "react-icons/fa";
import Link from "next/link";

const CREATE_NEW_OPTION = { label: "➕ Create new account", value: "__create_new__" };

const AccountSearch = ({ value, onSelect }) => {
  const [options, setOptions] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

const fetchAccounts = async () => {
  setLoading(true);
  try {
    const token = localStorage.getItem("token"); // ✅ Get token
    if (!token) {
      setError("Unauthorized: Please log in");
      setLoading(false);
      return;
    }

    const res = await axios.get("/api/bank-head", {
      headers: {
        Authorization: `Bearer ${token}`, // ✅ Add token in header
      },
    });

    if (res.data.success) {
      const accounts = (res.data.data || []).map((acc) => ({
        label: `${acc.accountCode} - ${acc.accountName}`,
        value: acc._id, // ✅ Store ID for backend
        accountCode: acc.accountCode,
        accountName: acc.accountName,
        accountHead: acc.accountHead,
      }));

      setOptions([...accounts, CREATE_NEW_OPTION]); // ✅ Add "Create New" option
    } else {
      setError(res.data.message || "Failed to load accounts");
    }
  } catch (err) {
    console.error("Error fetching accounts:", err);
    setError(err.response?.data?.message || "Failed to load accounts");
  } finally {
    setLoading(false);
  }
};

  const handleChange = selected => {
    if (selected?.value === CREATE_NEW_OPTION.value) {
      // open admin for creation
      window.open("/admin/bank-head-details", "_blank");
    } else {
      onSelect(
        selected
          ? {
              _id: selected.value,
              accountCode: selected.accountCode,
              accountName: selected.accountName,
              accountHead: selected.accountHead,
            }
          : null
      );
    }
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm font-medium text-gray-700">
          GL Account <span className="text-red-500">*</span>
        </label>
        
      </div>

      <Select
        options={options}
        isLoading={loading}
        value={
          value
            ? {
                value: value._id,
                label: `${value.accountCode} - ${value.accountName}`,
                accountCode: value.accountCode,
                accountName: value.accountName,
                accountHead: value.accountHead,
              }
            : null
        }
        onChange={handleChange}
        onInputChange={setInputValue}
        placeholder="Search or select GL Account"
        isClearable
        isSearchable
        classNamePrefix="react-select"
        noOptionsMessage={() =>
          inputValue ? `No results for "${inputValue}"` : "Type to search..."
        }
        styles={{
          control: base => ({
            ...base,
            borderColor: "#d1d5db",
            padding: "2px",
          }),
        }}
      />
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default AccountSearch;



// "use client";
// import React, { useState, useEffect } from "react";
// import Select from "react-select";
// import axios from "axios";
// import { FaExternalLinkAlt } from "react-icons/fa";
// import Link from "next/link";

// const CREATE_NEW_OPTION = { label: "➕ Create new account", value: "__create_new__" };

// const AccountSearch = ({ value, onSelect }) => {
//   const [options, setOptions] = useState([]);
//   const [inputValue, setInputValue] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     fetchAccounts();
//   }, []);

//   const fetchAccounts = async () => {
//     setLoading(true);
//     try {
//       const res = await axios.get("/api/bank-head");
//       const accounts = res.data.data.map((acc) => ({
//         label: `${acc.accountCode} - ${acc.accountName}`,
//         value: acc.accountCode,
//         accountCode: acc.accountCode,
//         accountName: acc.accountName,
//         accountHead: acc.accountHead,
//       }));
//       setOptions([...accounts, CREATE_NEW_OPTION]);
//     } catch (err) {
//       setError("Failed to load accounts");
//     } finally {
//       setLoading(false);
//     }
//   };

// //   const handleChange = async (selected) => {
// //     if (selected?.value === "__create_new__") {
// //       const input = prompt("Enter new account in format CODE - Name");
// //       if (!input) return;

// //       const [code, ...rest] = input.split("-");
// //       const name = rest.join("-").trim();

// //       if (!code || !name) return alert("Use format: CODE - Name");

// //       try {
// //         const newAccount = {
// //           accountCode: code.trim(),
// //           accountName: name,
// //           accountHead: "Default Head",
// //           isActualBank: false,
// //           status: "Active",
// //         };

// //         const res = await axios.post("/api/bank-head", newAccount);
// //         const created = res.data.data;

// //         const newOption = {
// //           label: `${created.accountCode} - ${created.accountName}`,
// //           value: created.accountCode,
// //           accountCode: created.accountCode,
// //           accountName: created.accountName,
// //         };

// //         const updatedOptions = [
// //           ...options.slice(0, -1), // remove "Create new" temporarily
// //           newOption,
// //           CREATE_NEW_OPTION,
// //         ];

// //         setOptions(updatedOptions);
// //         onSelect(newOption);
// //       } catch {
// //         alert("Failed to create new account");
// //       }
// //     } else {
// //       onSelect(selected);
// //     }
// //   };


// const handleChange = (selected) => {
//   if (selected?.value === "__create_new__") {
//     // Open bank head page in a new tab
//     window.open("/admin/bank-head-details", "_blank");
//   } else {
//     onSelect(selected);
//   }
// };

//   return (
//     <div className="mb-4">
//       <div className="flex justify-between items-center mb-1">
//         <label className="text-sm font-medium text-gray-700">
//           GL Account <span className="text-red-500">*</span>
//         </label>
//         {/* <Link
//           href="/bank-head-details"
//           target="_blank"
//           className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
//         >
//           <FaExternalLinkAlt className="w-3 h-3" /> Manage
//         </Link> */}
//       </div>
//       <Select
//         options={options}
//         isLoading={loading}
//         value={
//           value
//             ? {
//                 value: value.accountCode,
//                 label: `${value.accountCode} - ${value.accountName}`,
//               }
//             : null
//         }
//         onChange={handleChange}
//         onInputChange={setInputValue}
//         placeholder="Search or select GL Account"
//         isClearable
//         isSearchable
//         classNamePrefix="react-select"
//         noOptionsMessage={() =>
//           inputValue ? `No results for "${inputValue}"` : "Type to search..."
//         }
//         styles={{
//           control: (base) => ({
//             ...base,
//             borderColor: "#d1d5db",
//             padding: "2px",
//           }),
//         }}
//       />
//       {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
//     </div>
//   );
// };

// export default AccountSearch;
