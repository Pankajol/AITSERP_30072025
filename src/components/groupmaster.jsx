"use client";

import React, { useState, useEffect, useRef } from "react";
import useSearch from "@/hooks/useSearch";

const GroupSearch = ({ value, onSelectGroup }) => {
  const [inputValue, setInputValue] = useState(value || "");
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

const groupSearch = useSearch(async (query) => {
  if (!query.trim()) return [];
  try {
    const res = await fetch(`/api/groupscreate?search=${query}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "", // ✅ Add token
      },
    });
    if (!res.ok) {
      if (res.status === 401) throw new Error("Unauthorized - Please log in");
      throw new Error("Failed to fetch groups");
    }
    const data = await res.json();
    return data?.data || [];
  } catch (err) {
    setError(err.message);
    return [];
  }
});


  // Sync when `value` prop changes (like on form edit)
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGroupSelect = (group) => {
    setInputValue(group.name);
    onSelectGroup(group.name); // only pass name
    setShowDropdown(false);
  };

  const handleCustomInput = () => {
    if (inputValue.trim()) {
      onSelectGroup(inputValue.trim());
      setShowDropdown(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    onSelectGroup(null);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <div className="flex items-center">
        <input
          type="text"
          placeholder="Type or select group"
          value={inputValue}
          onChange={(e) => {
            const val = e.target.value;
            setInputValue(val);
            groupSearch.handleSearch(val);
            setShowDropdown(true);
          }}
          onFocus={() => {
            if (inputValue) groupSearch.handleSearch(inputValue);
            setShowDropdown(true);
          }}
          className="border px-4 py-2 w-full rounded-md focus:ring-2 focus:ring-blue-500"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="ml-2 text-gray-500 hover:text-red-600"
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10 rounded-md shadow-md mt-1">
          {groupSearch.loading && <p className="p-2">Loading...</p>}
          {!groupSearch.loading && groupSearch.results.length === 0 && inputValue && (
            <div
              className="p-2 cursor-pointer text-blue-600 hover:bg-blue-50"
              onClick={handleCustomInput}
            >
              ➕ Create "{inputValue}"
            </div>
          )}
          {groupSearch.results.map((group) => (
            <div
              key={group._id}
              onClick={() => handleGroupSelect(group)}
              className={`p-2 cursor-pointer hover:bg-gray-200 ${
                inputValue === group.name ? "bg-blue-100" : ""
              }`}
            >
              {group.name}
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-red-500 mt-1">{error}</p>}
    </div>
  );
};

export default GroupSearch;




// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import useSearch from "@/hooks/useSearch"; // Assuming you have the `useSearch` hook for searching

// const GroupSearch = ({ onSelectGroup }) => {
//   const [groups, setGroups] = useState([]); // Initialize groups state
//   const [showGroupDropdown, setShowGroupDropdown] = useState(false);
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const dropdownRef = useRef(null); // To detect outside clicks

//   useEffect(() => {
//     const fetchGroups = async () => {
//       try {
//         setLoading(true);
//         const response = await axios.get("/api/groupscreate");
//         setGroups(response.data); // Update the groups state with fetched data
//       } catch (err) {
//         setError("Error fetching groups. Please try again.");
//         console.error("Error fetching groups:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchGroups();
//   }, []);

//   // Fetch groups dynamically based on the search query
//   const groupSearch = useSearch(async (query) => {
//     const res = await fetch(`/api/groupscreate?search=${query}`);
//     return res.ok ? await res.json() : [];
//   });

//   // Hide dropdown on outside click
//   useEffect(() => {
//     const handleClickOutside = (event) => {
//       if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
//         setShowGroupDropdown(false);
//       }
//     };

//     document.addEventListener("mousedown", handleClickOutside);
//     return () => {
//       document.removeEventListener("mousedown", handleClickOutside);
//     };
//   }, []);

//   const handleGroupSelect = (group) => {
//     setSelectedGroup(group);
//     onSelectGroup(group); // Pass selected group to parent
//     setShowGroupDropdown(false); // Hide dropdown after selection
//   };

//   return (
//     <div ref={dropdownRef} className="relative">
//       {/* Group Search Input */}
//       <div className="relative mb-4">
//         <input
//           type="text"
//           placeholder="Search Group"
//           value={selectedGroup?.name || groupSearch.query}
//           onChange={(e) => {
//             groupSearch.handleSearch(e.target.value); // Trigger search
//             setShowGroupDropdown(true);
//           }}
//           onFocus={() => setShowGroupDropdown(true)}
//           className="border px-4 py-2 w-full"
//         />
//         {showGroupDropdown && (
//           <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
//             {groupSearch.loading && <p className="p-2">Loading...</p>}
//             {groupSearch.results.length === 0 && !groupSearch.loading && (
//               <p className="p-2 text-gray-500">No groups found</p>
//             )}
//             {groupSearch.results.map((group) => (
//               <div
//                 key={group._id}
//                 onClick={() => handleGroupSelect(group)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedGroup?._id === group._id ? "bg-blue-100" : ""
//                 }`}
//               >
//                 {group.name}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//       {/* Error Message */}
//       {error && <p className="text-red-500">{error}</p>}
//     </div>
//   );
// };

// export default GroupSearch;


//  here the  code is work but show error and dropdown issue occures 


// "use client";

// import React, { useState,useEffect } from "react";
// import axios from "axios";
// import useSearch from "@/hooks/useSearch"; // Assuming you have the `useSearch` hook for searching

// const GroupSearch = ({ onSelectGroup }) => {
//   const [showGroupDropdown, setShowGroupDropdown] = useState(false);
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const [loading, setLoading] = useState(false); 
//   const [errror,setError] = useState();


  
//   useEffect(() => {
//     const fetchGroups = async () => {
//       try {
//         const response = await axios.get("/api/groupscreate");
//         setGroups(response.data);
//       } catch (err) {
//         setError("Error fetching groups. Please try again.");
//         console.error("Error fetching groups:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchGroups();
//   }, []);

//   // Fetch groups dynamically based on the search query
//   const groupSearch = useSearch(async (query) => {
//     const res = await fetch(`/api/groupscreate?search=${query}`);
//     return res.ok ? await res.json() : [];
//   });

//   const handleGroupSelect = (group) => {
//     setSelectedGroup(group);
//     onSelectGroup(group); // Pass selected group to parent
//     setShowGroupDropdown(false); // Hide dropdown after selection
//   };

//   return (
//     <div>
//       {/* Group Search Input */}
//       <div className="relative mb-4">
//         <input
//           type="text"
//           placeholder="Search Group"
//           value={selectedGroup?.name || groupSearch.query}
//           onChange={(e) => {
//             groupSearch.handleSearch(e.target.value); // Trigger search
//             setShowGroupDropdown(true);
//           }}
//           onFocus={() => setShowGroupDropdown(true)}
         
//           className="border px-4 py-2 w-full"
//         />
//         {showGroupDropdown && (
//           <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
//             {groupSearch.loading && <p className="p-2">Loading...</p>}
//             {groupSearch.results.map((group) => (
//               <div
//                 key={group._id}
//                 onClick={() => handleGroupSelect(group)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedGroup?._id === group._id ? "bg-blue-100" : ""
//                 }`}
//               >
//                 {group.name}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default GroupSearch;

//---------------------------------------------------------------------------------------------------------------------


// "use client";

// import { useState, useEffect } from "react";
// import axios from 'axios';

// export default function GroupsPage() {
//   const [groups, setGroups] = useState([]);
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [creating, setCreating] = useState(false);

//   // Fetch groups when the page loads
//   useEffect(() => {
//     const fetchGroups = async () => {
//       try {
//         const response = await axios.get("/api/groupscreate");
//         setGroups(response.data);
//       } catch (err) {
//         setError("Error fetching groups. Please try again.");
//         console.error("Error fetching groups:", err);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchGroups();
//   }, []);

//   // Handle group creation form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setCreating(true);

//     try {
//       const response = await axios.post("/api/groupscreate", {
//         name,
//         description,
//        // masterId: "masterId123", // Replace with actual user ID if needed
//       });

//       if (response.status === 201) {
//         setName(""); // Clear form fields
//         setDescription("");
//         // Add the newly created group to the list without re-fetching
//         setGroups([...groups, response.data]);
//         alert("Group created successfully!");
//       }
//     } catch (error) {
//       console.error("Error creating group:", error);
//       alert("Error creating group");
//     } finally {
//       setCreating(false);
//     }
//   };

//   if (loading) {
//     return (
//       <div className="p-4">
//         <p>Loading groups...</p>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="p-4 text-red-500">
//         <p>{error}</p>
//       </div>
//     );
//   }

//   return (
//     <div className="p-4 max-w-3xl mx-auto">
//       <h1 className="text-3xl font-bold mb-4">Create Group</h1>
      
//       {/* Group Creation Form */}
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label className="block font-medium mb-1">Group Name</label>
//           <input
//             type="text"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             required
//             className="w-full border rounded p-2"
//           />
//         </div>
//         <div>
//           <label className="block font-medium mb-1">Description</label>
//           <textarea
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             required
//             className="w-full border rounded p-2"
//           />
//         </div>
//         <button
//           type="submit"
//           className="bg-blue-500 text-white py-2 px-4 rounded disabled:opacity-50"
//           disabled={creating}
//         >
//           {creating ? "Creating..." : "Create Group"}
//         </button>
//       </form>

//       <hr className="my-8" />

//       {/* Group Listing */}
//       <h2 className="text-2xl font-semibold mb-4">Group List</h2>
//       {groups.length === 0 ? (
//         <p>No groups available.</p>
//       ) : (
//         <ul className="space-y-4">
//           {groups.map((group) => (
//             <li
//               key={group._id}
//               className="border p-4 rounded-lg flex justify-between items-center"
//             >
//               <div>
//                 <h3 className="font-bold">{group.name}</h3>
//                 <p>{group.description}</p>
//               </div>
//               <div>
//                 <p className="text-sm">Master: {group.masterId}</p>
//               </div>
//             </li>
//           ))}
//         </ul>
//       )}
//     </div>
//   );
// }




// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";

// export default function CreateGroup() {
//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");
//   const [masterId, setMasterId] = useState(""); // This could be fetched from auth
//   const router = useRouter();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     const res = await fetch("/api/groups", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ name, description, masterId }),
//     });

//     if (res.ok) {
//       alert("Group created successfully!");
//       router.push("/groups");
//     } else {
//       alert("Error creating group");
//     }
//   };

//   return (
//     <div className="p-4 max-w-lg mx-auto">
//       <h1 className="text-2xl font-bold mb-4">Create Group</h1>
//       <form onSubmit={handleSubmit} className="space-y-4">
//         <div>
//           <label className="block font-medium mb-1">Group Name</label>
//           <input
//             type="text"
//             className="w-full border rounded p-2"
//             value={name}
//             onChange={(e) => setName(e.target.value)}
//             required
//           />
//         </div>
//         <div>
//           <label className="block font-medium mb-1">Description</label>
//           <textarea
//             className="w-full border rounded p-2"
//             value={description}
//             onChange={(e) => setDescription(e.target.value)}
//             required
//           />
//         </div>
//         <button
//           type="submit"
//           className="bg-blue-500 text-white py-2 px-4 rounded"
//         >
//           Create Group
//         </button>
//       </form>
//     </div>
//   );
// }



