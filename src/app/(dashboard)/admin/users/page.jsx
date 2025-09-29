"use client";

import { useEffect, useState } from "react";
import { FiPlus, FiTrash2, FiEdit, FiCheck, FiChevronDown, FiChevronRight } from "react-icons/fi";
import axios from "axios";

// ✅ Role hierarchy with sub-roles
const ROLE_OPTIONS = {
  Admin: [],
  "Sales Manager": ["Sales Order", "Sales Invoice", "Delivery"],
  "Purchase Manager": ["Purchase Order", "Purchase Invoice", "GRN"],
  "Inventory Manager": ["Stock Adjustment", "Stock Transfer", "Stock Report"],
  "Accounts Manager": ["Payment Entry", "Ledger", "Journal Entry"],
  "HR Manager": ["Employee", "Attendance", "Payroll"],
  "Support Executive": ["Tickets", "Responses"],
  "Production Head": ["BOM", "Work Order", "Production Report"],
  "Project Manager": ["Project", "Tasks", "Timesheet"],
  Employee: ["Profile", "Timesheet"],
};

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [err, setErr] = useState("");
  const [expanded, setExpanded] = useState({});
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    roles: ["Sales Manager"],
    subRoles: [],
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
    setForm({ name: "", email: "", password: "", roles: ["Sales Manager"], subRoles: [] });
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

  // ✅ Toggle main role
  const toggleRole = (role) => {
    setForm((prev) => {
      const hasRole = prev.roles.includes(role);
      return {
        ...prev,
        roles: hasRole ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
        subRoles: hasRole
          ? prev.subRoles.filter((sr) => !ROLE_OPTIONS[role]?.includes(sr))
          : prev.subRoles,
      };
    });
  };

  // ✅ Toggle sub-role
  const toggleSubRole = (subRole) => {
    setForm((prev) => {
      const hasSub = prev.subRoles.includes(subRole);
      return {
        ...prev,
        subRoles: hasSub ? prev.subRoles.filter((s) => s !== subRole) : [...prev.subRoles, subRole],
      };
    });
  };

  const startEdit = (user) => {
    setForm({
      name: user.name,
      email: user.email,
      password: "",
      roles: Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [],
      subRoles: Array.isArray(user.subRoles) ? user.subRoles : [],
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
              <th className="p-3 text-left font-semibold">Sub-Roles</th>
              <th className="p-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t hover:bg-gray-50">
                <td className="p-3">{u.name}</td>
                <td className="p-3">{u.email}</td>
                <td className="p-3">{Array.isArray(u.roles) ? u.roles.join(", ") : u.role}</td>
                <td className="p-3">{Array.isArray(u.subRoles) ? u.subRoles.join(", ") : ""}</td>
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

              {/* Roles + SubRoles */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Roles & Permissions</label>
                <div className="space-y-2">
                  {Object.entries(ROLE_OPTIONS).map(([role, subs]) => (
                    <div key={role} className="border rounded-md">
                      <div
                        className={`flex items-center justify-between p-2 cursor-pointer ${
                          form.roles.includes(role)
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-800"
                        }`}
                        onClick={() => {
                          toggleRole(role);
                          if (subs.length > 0) {
                            setExpanded((prev) => ({
                              ...prev,
                              [role]: !prev[role],
                            }));
                          }
                        }}
                      >
                        <span>{role}</span>
                        {subs.length > 0 &&
                          (expanded[role] ? <FiChevronDown /> : <FiChevronRight />)}
                      </div>

                      {/* SubRoles */}
                      {expanded[role] && subs.length > 0 && (
                        <div className="pl-4 pr-2 py-2 space-y-1 bg-gray-50">
                          {subs.map((sub) => (
                            <label key={sub} className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={form.subRoles.includes(sub)}
                                onChange={() => toggleSubRole(sub)}
                              />
                              <span className="text-sm">{sub}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
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
    </div>
  );
}






// "use client";

// import { useEffect, useState } from "react";
// import { FiPlus, FiTrash2, FiEdit, FiCheck, FiX } from "react-icons/fi";
// import axios from "axios";

// const ROLE_OPTIONS = [
//   "Admin",
//   "Sales Manager",
//   "Purchase Manager",
//   "Inventory Manager",
//   "Accounts Manager",
//   "HR Manager",
//   "Support Executive",
//   "Production Head",
//   "Project Manager",
//   "Employee",
// ];

// export default function UsersPage() {
//   const [users, setUsers] = useState([]);
//   const [open, setOpen] = useState(false);
//   const [editingId, setEditingId] = useState(null);
//   const [err, setErr] = useState("");
//   const [form, setForm] = useState({
//     name: "",
//     email: "",
//     password: "",
//     roles: ["Sales Manager"],
//   });

//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   const fetchUsers = async () => {
//     try {
//       const { data } = await axios.get("/api/company/users", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setUsers(data);
//     } catch (ex) {
//       console.error(ex);
//     }
//   };

//   useEffect(() => {
//     if (token) fetchUsers();
//   }, [token]);

//   const resetForm = () => {
//     setForm({ name: "", email: "", password: "", roles: ["Sales Manager"] });
//     setEditingId(null);
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setErr("");

//     try {
//       if (editingId) {
//         await axios.put(`/api/company/users/${editingId}`, form, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       } else {
//         await axios.post("/api/company/users", form, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       }

//       resetForm();
//       setOpen(false);
//       fetchUsers();
//     } catch (ex) {
//       setErr(ex.response?.data?.message || "Error");
//     }
//   };

//   const deleteUser = async (id) => {
//     if (!confirm("Delete user?")) return;
//     try {
//       await axios.delete(`/api/company/users/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setUsers((prev) => prev.filter((u) => u._id !== id));
//     } catch (ex) {
//       console.error(ex);
//     }
//   };

//   const toggleRole = (role) => {
//     setForm((prev) => {
//       const hasRole = prev.roles.includes(role);
//       return {
//         ...prev,
//         roles: hasRole ? prev.roles.filter((r) => r !== role) : [...prev.roles, role],
//       };
//     });
//   };

//   const startEdit = (user) => {
//     setForm({
//       name: user.name,
//       email: user.email,
//       password: "",
//       roles: Array.isArray(user.roles) ? user.roles : user.role ? [user.role] : [],
//     });
//     setEditingId(user._id);
//     setErr("");
//     setOpen(true);
//   };

//   return (
//     <div className="p-4 sm:p-6">
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
//         <h1 className="text-2xl font-bold text-gray-800">Company Users</h1>
//         <button
//           onClick={() => {
//             resetForm();
//             setOpen(true);
//           }}
//           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow"
//         >
//           <FiPlus /> <span>Add User</span>
//         </button>
//       </div>

//       <div className="overflow-x-auto rounded shadow">
//         <table className="min-w-full text-sm bg-white border">
//           <thead className="bg-gray-100 text-gray-700">
//             <tr>
//               <th className="p-3 text-left font-semibold">Name</th>
//               <th className="p-3 text-left font-semibold">Email</th>
//               <th className="p-3 text-left font-semibold">Roles</th>
//               <th className="p-3 text-right font-semibold">Actions</th>
//             </tr>
//           </thead>
//           <tbody>
//             {users.map((u) => (
//               <tr key={u._id} className="border-t hover:bg-gray-50">
//                 <td className="p-3">{u.name}</td>
//                 <td className="p-3">{u.email}</td>
//                 <td className="p-3">{Array.isArray(u.roles) ? u.roles.join(", ") : u.role}</td>
//                 <td className="p-3 flex gap-3 justify-end text-lg">
//                   <button
//                     onClick={() => startEdit(u)}
//                     className="text-blue-600 hover:text-blue-800"
//                     title="Edit"
//                   >
//                     <FiEdit />
//                   </button>
//                   <button
//                     onClick={() => deleteUser(u._id)}
//                     className="text-red-600 hover:text-red-800"
//                     title="Delete"
//                   >
//                     <FiTrash2 />
//                   </button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>

//       {/* Modal */}
//       {open && (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
//           <div className="w-full max-w-lg bg-white rounded-lg p-6 space-y-4 shadow-xl overflow-y-auto max-h-[90vh]">
//             <h2 className="text-xl font-semibold text-gray-800">
//               {editingId ? "Edit User" : "New User"}
//             </h2>

//             {err && <p className="text-red-600 text-sm">{err}</p>}

//             <form onSubmit={handleSubmit} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
//                 <input
//                   className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter full name"
//                   value={form.name}
//                   onChange={(e) => setForm({ ...form, name: e.target.value })}
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
//                 <input
//                   className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter email address"
//                   value={form.email}
//                   onChange={(e) => setForm({ ...form, email: e.target.value })}
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
//                 <input
//                   className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
//                   placeholder="Enter password"
//                   type="password"
//                   value={form.password}
//                   onChange={(e) => setForm({ ...form, password: e.target.value })}
//                 />
//               </div>

//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
//                 <div className="grid grid-cols-2 gap-2">
//                   {ROLE_OPTIONS.map((role) => (
//                     <button
//                       type="button"
//                       key={role}
//                       onClick={() => toggleRole(role)}
//                       className={`flex items-center justify-between w-full border px-3 py-2 rounded text-sm transition ${
//                         form.roles.includes(role)
//                           ? "bg-blue-600 text-white border-blue-600"
//                           : "bg-white text-gray-800 border-gray-300 hover:border-gray-500"
//                       }`}
//                     >
//                       {role}
//                       {form.roles.includes(role) ? <FiCheck /> : <FiX className="opacity-25" />}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               <div className="flex gap-2 pt-2">
//                 <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
//                   {editingId ? "Update" : "Save"}
//                 </button>
//                 <button
//                   type="button"
//                   className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
//                   onClick={() => {
//                     setOpen(false);
//                     resetForm();
//                   }}
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
//           @apply w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring focus:ring-blue-200;
//         }
//       `}</style>
//     </div>
//   );
// }


