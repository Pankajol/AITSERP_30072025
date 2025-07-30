"use client";

import { useEffect, useState } from "react";
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX } from "react-icons/fi";
import axios from "axios";

const ROLE_OPTIONS = [
  "Admin",
  "Sales Manager",
  "Purchase Manager",
  "Inventory Manager",
  "Accounts Manager",
  "HR Manager",
  "Support Executive",
  "Production Head",
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roles: ["Sales Manager"],
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchUsers = async () => {
    try {
      const { data } = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(data);
    } catch (ex) {
      console.error(ex);
    }
  };

  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const resetForm = () => {
    setForm({ name: "", email: "", password: "", roles: ["Sales Manager"] });
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    try {
      if (editingId) {
        await axios.put(`/api/company/users/${editingId}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/company/users", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      resetForm();
      setOpen(false);
      fetchUsers();
    } catch (ex) {
      setErr(ex.response?.data?.message || "Error");
    }
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete user?")) return;
    try {
      await axios.delete(`/api/company/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (ex) {
      console.error(ex);
    }
  };

  const toggleRole = (role) => {
    setForm((prev) => {
      const hasRole = prev.roles.includes(role);
      return {
        ...prev,
        roles: hasRole ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
      };
    });
  };

  const startEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roles: Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [],
    });
    setEditingId(user._id);
    setErr("");
    setOpen(true);
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Company Users</h1>
        <button
          onClick={() => {
            resetForm();
            setOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
        >
          <FiPlus /> <span>Add User</span>
        </button>
      </div>

      <div className="overflow-x-auto rounded shadow">
        <table className="min-w-full text-sm bg-white border">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3 text-left font-semibold">Name</th>
              <th className="p-3 text-left font-semibold">Email</th>
              <th className="p-3 text-left font-semibold">Roles</th>
              <th className="p-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t hover:bg-gray-50">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{Array.isArray(u.roles) ? u.roles.join(", ") : u.role}</td>
                <td className="p-3 flex gap-3 justify-end text-lg">
                  <button
                    onClick={() => startEdit(u)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <FiEdit />
                  </button>
                  <button
                    onClick={() => deleteUser(u._id)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white rounded-lg p-6 space-y-4 shadow-xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-xl font-semibold text-gray-800">
              {editingId ? "Edit User" : "New User"}
            </h2>

            {err && <p className="text-red-600 text-sm">{err}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter email address"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE_OPTIONS.map((role) => (
                    <button
                      type="button"
                      key={role}
                      onClick={() => toggleRole(role)}
                      className={`flex items-center justify-between w-full border px-3 py-2 rounded text-sm transition ${
                        form.roles.includes(role)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-800 border-gray-300 hover:border-gray-500"
                      }`}
                    >
                      {role}
                      {form.roles.includes(role) ? <FiCheck /> : <FiX className="opacity-25" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
                  {editingId ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
                  onClick={() => {
                    setOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          @apply w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200;
        }
      `}</style>
    </div>
  );
}



//04/07/25
// 'use client';

// import { useEffect, useState } from 'react';
// import { FiPlus, FiTrash2 } from 'react-icons/fi';
// import axios from 'axios';

// const ROLE_OPTIONS = [
//   'Admin',
//   'Sales Manager',
//   'Purchase Manager',
//   'Inventory Manager',
//   'Accounts Manager',
//   'HR Manager',
//   'Support Executive',
//   'Production Head',
// ];

// export default function UsersPage() {
//   const [users, setUsers] = useState([]);
//   const [open, setOpen] = useState(false);
//   const [form, setForm] = useState({
//     name: '',
//     email: '',
//     password: '',
//     role: 'Sales Manager',
//   });
//   const [err, setErr] = useState('');
//   const token =
//     typeof window !== 'undefined' ? localStorage.getItem('token') : null;

//   const fetchUsers = async () => {
//     const { data } = await axios.get('/api/company/users', {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     setUsers(data);
//   };

//   useEffect(() => {
//     if (token) fetchUsers();
//   }, [token]);

//   async function createUser(e) {
//     e.preventDefault();
//     try {
//       await axios.post('/api/company/users', form, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setForm({ name: '', email: '', password: '', role: 'Sales Manager' });
//       setOpen(false);
//       fetchUsers();
//     } catch (ex) {
//       setErr(ex.response?.data?.message || 'Error');
//     }
//   }

//   async function deleteUser(id) {
//     if (!confirm('Delete user?')) return;
//     await axios.delete(`/api/company/users/${id}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     setUsers(users.filter((u) => u._id !== id));
//   }

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-4">
//         <h1 className="text-xl font-semibold">Company Users</h1>
//         <button
//           onClick={() => setOpen(true)}
//           className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded"
//         >
//           <FiPlus /> Add User
//         </button>
//       </div>

//       <table className="w-full text-sm border">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="p-2">Name</th>
//             <th>Email</th>
//             <th>Role</th>
//             <th></th>
//           </tr>
//         </thead>
//         <tbody>
//           {users.map((u) => (
//             <tr key={u._id} className="border-b">
//               <td className="p-2">{u.name}</td>
//               <td>{u.email}</td>
//               <td>{u.role}</td>
//               <td className="text-right pr-4">
//                 <button
//                   onClick={() => deleteUser(u._id)}
//                   className="text-red-600 hover:text-red-800"
//                 >
//                   <FiTrash2 />
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Slide-over */}
//       {open && (
//         <div className="fixed inset-0 bg-black/30 flex justify-end z-50">
//           <div className="w-full max-w-sm bg-white h-full p-6 space-y-4">
//             <h2 className="text-lg font-semibold">New User</h2>

//             {err && <p className="text-red-600 text-sm">{err}</p>}

//             <form onSubmit={createUser} className="space-y-4">
//               <input
//                 className="input"
//                 placeholder="Name"
//                 value={form.name}
//                 onChange={(e) => setForm({ ...form, name: e.target.value })}
//               />
//               <input
//                 className="input"
//                 placeholder="Email"
//                 value={form.email}
//                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//               />
//               <input
//                 className="input"
//                 placeholder="Password"
//                 type="password"
//                 value={form.password}
//                 onChange={(e) =>
//                   setForm({ ...form, password: e.target.value })
//                 }
//               />
//               <select
//                 className="input"
//                 value={form.role}
//                 onChange={(e) => setForm({ ...form, role: e.target.value })}
//               >
//                 {ROLE_OPTIONS.map((r) => (
//                   <option key={r} value={r}>
//                     {r}
//                   </option>
//                 ))}
//               </select>

//               <div className="flex gap-2">
//                 <button className="flex-1 bg-blue-600 text-white py-2 rounded">
//                   Save
//                 </button>
//                 <button
//                   type="button"
//                   className="flex-1 bg-gray-200 py-2 rounded"
//                   onClick={() => setOpen(false)}
//                 >
//                   Cancel
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}

//       <style jsx>{`
//         .input {
//           @apply w-full border rounded px-3 py-2;
//         }
//       `}</style>
//     </div>
//   );
// }


// 'use client';

// import React, { useEffect, useState } from 'react';
// import axios from 'axios';

// function ViewUser() {
//   const [users, setUsers] = useState([]); // Initialize as an empty array
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchUsers = async () => {
//       try {
//         const response = await axios.get('/api/signup');
//         setUsers(response.data.data || []); // Ensure 'accounts' is always an array
//         console.log('res',response.data)
//       } catch (err) {
//         console.error('Error fetching users:', err);
//         setError('Unable to fetch users. Please try again.');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUsers();
//   }, []);

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      
//       <div className="w-full max-w-4xl p-8 bg-white rounded-lg shadow-lg">
//         <h1 className="text-2xl font-bold text-gray-800 mb-4">View All Users</h1>

//         {error && <p className="text-red-500 mb-4">{error}</p>}

//         {loading ? (
//           <p className="text-gray-600">Loading users...</p>
//         ) : users.length > 0 ? (
//           <table className="min-w-full bg-white border border-gray-300">
//             <thead>
//               <tr>
//                 <th className="py-2 px-4 border-b">#</th>
//                 <th className="py-2 px-4 border-b">First Name</th>
//                 <th className="py-2 px-4 border-b">Last Name</th>
//                 <th className="py-2 px-4 border-b">Phone</th>
//                 <th className="py-2 px-4 border-b">Email</th>
//                 <th className="py-2 px-4 border-b">Country</th>
//                 <th className="py-2 px-4 border-b">Address</th>
//                 <th className="py-2 px-4 border-b">Pin Code</th>
//                 <th className="py-2 px-4 border-b">Role</th>
//               </tr>
//             </thead>
//             <tbody>
//               {users.map((user, index) => (
//                 <tr key={user._id}>
//                   <td className="py-2 px-4 border-b">{index + 1}</td>
//                   <td className="py-2 px-4 border-b">{user.firstName}</td>
//                   <td className="py-2 px-4 border-b">{user.lastName}</td>
//                   <td className="py-2 px-4 border-b">{user.phone}</td>
//                   <td className="py-2 px-4 border-b">{user.email}</td>
//                   <td className="py-2 px-4 border-b">{user.country}</td>
//                   <td className="py-2 px-4 border-b">{user.address}</td>
//                   <td className="py-2 px-4 border-b">{user.pinCode}</td>
//                   <td className="py-2 px-4 border-b">{user.role}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p className="text-gray-600">No users found.</p>
//         )}
//       </div>
//     </div>
//   );
// }

// export default ViewUser;
