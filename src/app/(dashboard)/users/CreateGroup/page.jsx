"use client";

import { useState, useEffect } from "react";
import axios from "axios";

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);

  // ✅ Fetch all groups
  const fetchGroups = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/groupscreate", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        setGroups(res.data.data || []);
      } else {
        setError(res.data.message || "Failed to fetch groups");
      }
    } catch (err) {
      setError("Error fetching groups");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    const token = localStorage.getItem("token");

    try {
      if (editingGroupId) {
        // ✅ Update group
        const response = await axios.put(
          `/api/groupscreate/${editingGroupId}`,
          { name, description },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          setGroups(
            groups.map((g) =>
              g._id === editingGroupId ? response.data.data : g
            )
          );
          alert(response.data.message);
          setEditingGroupId(null);
        }
      } else {
        // ✅ Create new group
        const response = await axios.post(
          "/api/groupscreate",
          { name, description },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          setGroups([...groups, response.data.data]);
          alert(response.data.message);
        }
      }

      setName("");
      setDescription("");
    } catch (error) {
      alert("Error saving group");
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (group) => {
    setName(group.name);
    setDescription(group.description);
    setEditingGroupId(group._id);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this group?")) return;

    try {
      const token = localStorage.getItem("token");
      const response = await axios.delete(`/api/groupscreate/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setGroups(groups.filter((g) => g._id !== id));
        alert(response.data.message);
      }
    } catch (error) {
      alert("Error deleting group");
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">
        {editingGroupId ? "Edit Group" : "Create Group"}
      </h1>

      {/* ✅ Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <div>
          <label className="block font-medium mb-1">Group Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>
        <button
          type="submit"
          className={`py-2 px-4 rounded text-white ${
            editingGroupId ? "bg-green-500" : "bg-blue-500"
          } hover:opacity-80`}
          disabled={creating}
        >
          {creating
            ? "Saving..."
            : editingGroupId
            ? "Update Group"
            : "Create Group"}
        </button>
        {editingGroupId && (
          <button
            type="button"
            onClick={() => {
              setEditingGroupId(null);
              setName("");
              setDescription("");
            }}
            className="ml-4 py-2 px-4 bg-gray-500 text-white rounded hover:opacity-80"
          >
            Cancel
          </button>
        )}
      </form>

      {/* ✅ Group List */}
      <h2 className="text-2xl font-semibold mb-4">Group List</h2>
      {loading ? (
        <p className="text-blue-500">Loading groups...</p>
      ) : groups.length === 0 ? (
        <p>No groups available.</p>
      ) : (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li
              key={group._id}
              className="border p-4 rounded-lg flex justify-between items-center"
            >
              <div>
                <h3 className="font-bold">{group.name}</h3>
                <p>{group.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(group)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}



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
