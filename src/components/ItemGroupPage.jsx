'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ItemGroupPage() {
  const [itemGroups, setItemGroups] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);

  // ✅ Fetch all Item Groups
  const fetchItemGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/itemGroups', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setItemGroups(res.data.data || []);
      } else {
        setError(res.data.message || 'Failed to load item groups');
      }
    } catch (err) {
      setError('Error fetching item groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItemGroups();
  }, []);

  // ✅ Add or Update Item Group
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const token = localStorage.getItem('token');

    try {
      if (editingId) {
        // ✅ Update existing item group
        const res = await axios.put(
          `/api/itemGroups/${editingId}`,
          { name, code },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.success) {
          setItemGroups(itemGroups.map((g) => (g._id === editingId ? res.data.data : g)));
          alert('Item Group updated successfully');
          setEditingId(null);
        }
      } else {
        // ✅ Create new item group
        const res = await axios.post(
          '/api/itemGroups',
          { name, code },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (res.data.success) {
          setItemGroups([...itemGroups, res.data.data]);
          alert('Item Group created successfully');
        }
      }

      setName('');
      setCode('');
    } catch (err) {
      alert('Error saving item group');
    } finally {
      setSaving(false);
    }
  };

  // ✅ Edit Item Group
  const handleEdit = (item) => {
    setName(item.name);
    setCode(item.code);
    setEditingId(item._id);
  };

  // ✅ Delete Item Group
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this item group?')) return;
    const token = localStorage.getItem('token');

    try {
      const res = await axios.delete(`/api/itemGroups/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setItemGroups(itemGroups.filter((g) => g._id !== id));
        alert(res.data.message);
      }
    } catch (err) {
      alert('Error deleting item group');
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-3xl font-bold mb-4">
        {editingId ? 'Edit Item Group' : 'Item Group Master'}
      </h1>

      {/* ✅ Form */}
      <form onSubmit={handleSubmit} className="mb-6 flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Item Group Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 rounded w-full md:w-auto"
          required
        />
        <input
          type="text"
          placeholder="Item Group Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 rounded w-full md:w-auto"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className={`text-white px-4 py-2 rounded ${
            editingId ? 'bg-green-500' : 'bg-blue-500'
          } hover:opacity-80`}
        >
          {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName('');
              setCode('');
            }}
            className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:opacity-80"
          >
            Cancel
          </button>
        )}
      </form>

      {/* ✅ Loading/Error */}
      {loading && <p className="text-blue-500">Loading item groups...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* ✅ List */}
      <ul className="space-y-2">
        {itemGroups.length === 0 && !loading ? (
          <p>No item groups available.</p>
        ) : (
          itemGroups.map((item) => (
            <li
              key={item._id}
              className="border p-3 rounded flex justify-between items-center"
            >
              <span>
                <strong>{item.name}</strong> ({item.code})
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}




// 'use client';

// import { useState, useEffect } from 'react';

// export default function ItemGroupPage() {
//   const [itemGroups, setItemGroups] = useState([]);
//   const [name, setName] = useState('');
//   const [code, setCode] = useState('');

//   // Fetch item groups from the API
//   const fetchItemGroups = async () => {
//     const res = await fetch('/api/itemGroups');
//     const data = await res.json();
//     setItemGroups(data);
//   };

//   // Add a new item group
//   const addItemGroup = async (e) => {
//     e.preventDefault();
//     try {
//       await fetch('/api/itemGroups', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ name, code }),
//       });
//       setName(''); // Clear the input fields
//       setCode('');
//       fetchItemGroups(); // Refresh the item group list
//     } catch (error) {
//       console.error('Error adding item group:', error.message);
//     }
//   };

//   // Delete an item group
//   const deleteItemGroup = async (id) => {
//     try {
//       await fetch(`/api/itemGroups?id=${id}`, { method: 'DELETE' });
//       fetchItemGroups(); // Refresh the item group list
//     } catch (error) {
//       console.error('Error deleting item group:', error.message);
//     }
//   };

//   // Fetch item groups when the component mounts
//   useEffect(() => {
//     fetchItemGroups();
//   }, []);

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-4">Item Group Master</h1>

//       {/* Form to add a new item group */}
//       <form onSubmit={addItemGroup} className="mb-6">
//         <input
//           type="text"
//           placeholder="Item Group Name"
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           className="border px-4 py-2 mr-2"
//           required
//         />
//         <input
//           type="text"
//           placeholder="Item Group Code"
//           value={code}
//           onChange={(e) => setCode(e.target.value)}
//           className="border px-4 py-2 mr-2"
//           required
//         />
//         <button
//           type="submit"
//           className="bg-blue-500 text-white px-4 py-2"
//         >
//           Add Item Group
//         </button>
//       </form>

//       {/* List of item groups */}
//       <ul>
//         {itemGroups.map((itemGroup) => (
//           <li key={itemGroup._id} className="flex justify-between items-center border-b py-2">
//             <span>
//               {itemGroup.name} ({itemGroup.code})
//             </span>
//             <button
//               onClick={() => deleteItemGroup(itemGroup._id)}
//               className="bg-red-500 text-white px-2 py-1"
//             >
//               Delete
//             </button>
//           </li>
//         ))}
//       </ul>
//     </div>
//   );
// }
