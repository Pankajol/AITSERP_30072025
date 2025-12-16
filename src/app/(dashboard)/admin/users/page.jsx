"use client";

import React, { useEffect, useState, useMemo } from "react";
import { FiPlus, FiTrash2, FiEdit } from "react-icons/fi";
import axios from "axios";
import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";

const ROLE_OPTIONS = {
  Admin: [],
  "Sales Manager": [
    "Sales Order",
    "Sales Invoice",
    "Delivery",
    "Sales Quotation",
    "Credit Memo",
    "Sales Report",
  ],
  "Purchase Manager": [
    "Purchase Order",
    "Purchase Invoice",
    "GRN",
    "Purchase Quotation",
    "Debit Note",
    "Purchase Report",
  ],
  "Inventory Manager": [
    "Inventory View",
    "Inventory Entry",
    "Stock Adjustment",
    "Stock Transfer",
    "Stock Report",
  ],
  "Accounts Manager": ["Payment Entry", "Ledger", "Journal Entry", "Payment Form"],
  "HR Manager": ["Masters", "Masters View", "Employee", "Attendance", "Payroll"],
  "Agent": ["Tickets", "Responses", "Lead Generation", "Opportunity"],
  "Production Head": ["BOM", "Work Order", "Production Report", "Production Order", "Job Card"],
  "Project Manager": ["Project", "Tasks", "Timesheet", "Task Board"],
  Employee: ["Profile"],
};

const PERMISSIONS = [
  "create","view","edit","delete","approve","reject",
  "copy","print","export","import","upload","download",
  "email","whatsapp",
];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    employeeId: "",   // ✅ added
    name: "",
    email: "",
    password: "",
    roles: [],
    modules: {},
  });

  const [err, setErr] = useState("");
  const [token, setToken] = useState(null);

  /* ---------- init token ---------- */
  useEffect(() => {
    if (typeof window !== "undefined") {
      setToken(localStorage.getItem("token"));
    }
  }, []);

  /* ---------- fetch users ---------- */
  useEffect(() => {
    if (token) fetchUsers();
  }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("fetchUsers:", e);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      employeeId: "",
      name: "",
      email: "",
      password: "",
      roles: [],
      modules: {},
    });
    setEditingUser(null);
    setErr("");
  };

  /* ---------- module list ---------- */
  const modulesList = useMemo(() => {
    const seen = new Set();
    const list = [];

    (form.roles || []).forEach((role) => {
      (ROLE_OPTIONS[role] || []).forEach((m) => {
        if (!seen.has(m)) {
          seen.add(m);
          list.push(m);
        }
      });
    });

    Object.keys(form.modules || {}).forEach((m) => {
      if (!seen.has(m)) {
        seen.add(m);
        list.push(m);
      }
    });

    return list;
  }, [form.roles, form.modules]);

  /* ---------- toggles ---------- */
  const toggleRole = (role) => {
    setForm((prev) => {
      const has = prev.roles.includes(role);
      const roles = has
        ? prev.roles.filter((r) => r !== role)
        : [...prev.roles, role];

      const modules = { ...prev.modules };

      if (!has) {
        (ROLE_OPTIONS[role] || []).forEach((mod) => {
          if (!modules[mod]) {
            modules[mod] = {
              selected: false,
              permissions: PERMISSIONS.reduce(
                (a, p) => ({ ...a, [p]: false }),
                {}
              ),
            };
          }
        });
      }

      return { ...prev, roles, modules };
    });
  };

  const toggleModule = (module) => {
    setForm((prev) => {
      const modules = { ...prev.modules };
      modules[module] = {
        ...modules[module],
        selected: !modules[module]?.selected,
      };
      return { ...prev, modules };
    });
  };

  const togglePermission = (module, perm) => {
    setForm((prev) => {
      const modules = { ...prev.modules };
      if (!modules[module]) {
        modules[module] = {
          selected: true,
          permissions: PERMISSIONS.reduce(
            (a, p) => ({ ...a, [p]: false }),
            {}
          ),
        };
      }
      modules[module] = {
        ...modules[module],
        permissions: {
          ...modules[module].permissions,
          [perm]: !modules[module].permissions?.[perm],
        },
      };
      return { ...prev, modules };
    });
  };

  /* ---------- submit ---------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    if (!form.roles.length) {
      return setErr("At least one role is required.");
    }

    try {
      if (editingUser) {
        await axios.put(`/api/company/users/${editingUser._id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post("/api/company/users", form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      resetForm();
      setOpenModal(false);
      fetchUsers();
    } catch (e) {
      setErr(e.response?.data?.message || "Error occurred");
    }
  };

  /* ---------- edit ---------- */
  const startEdit = (user) => {
    const roles = user?.roles || [];
    const savedModules = user?.modules || {};
    const restoredModules = {};

    Object.entries(savedModules).forEach(([mod, data]) => {
      restoredModules[mod] = {
        selected: !!data?.selected,
        permissions: {
          ...PERMISSIONS.reduce(
            (a, p) => ({ ...a, [p]: false }),
            {}
          ),
          ...(data?.permissions || {}),
        },
      };
    });

    roles.forEach((role) => {
      (ROLE_OPTIONS[role] || []).forEach((mod) => {
        if (!restoredModules[mod]) {
          restoredModules[mod] = {
            selected: false,
            permissions: PERMISSIONS.reduce(
              (a, p) => ({ ...a, [p]: false }),
              {}
            ),
          };
        }
      });
    });

    setEditingUser(user);
    setForm({
      employeeId: user?.employeeId?._id || "",
      name: user?.name || "",
      email: user?.email || "",
      password: "",
      roles,
      modules: restoredModules,
    });

    setOpenModal(true);
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete user?")) return;
    await axios.delete(`/api/company/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers((prev) => prev.filter((u) => u._id !== id));
  };

  /* ---------- UI ---------- */
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Company Users</h1>
        <button
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          onClick={() => {
            resetForm();
            setOpenModal(true);
          }}
        >
          <FiPlus /> Add User
        </button>
      </div>

      {/* Users grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-center col-span-3">Loading...</p>
        ) : users.length ? (
          users.map((u) => (
            <div
              key={u._id}
              className="bg-white rounded shadow p-4 flex flex-col justify-between hover:shadow-lg transition"
            >
              <div>
                <h2 className="text-lg font-semibold">{u.name}</h2>
                <p className="text-sm text-gray-600">{u.email}</p>
                <p className="mt-2 text-sm">
                  <strong>Roles:</strong> {(u.roles || []).join(", ")}
                </p>
              </div>

              <div className="flex gap-2 mt-4 justify-end text-lg">
                <button onClick={() => startEdit(u)} className="text-blue-600">
                  <FiEdit />
                </button>
                <button onClick={() => deleteUser(u._id)} className="text-red-600">
                  <FiTrash2 />
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center col-span-3">No users found</p>
        )}
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? "Edit User" : "New User"}
            </h2>
            {err && <p className="text-red-600 mb-2">{err}</p>}

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* ✅ Employee Search (ONLY ADDITION) */}
              <EmployeeSearchSelect
                token={token}
                onSelect={(emp) => {
                  setForm((prev) => ({
                    ...prev,
                    employeeId: emp._id,
                    name: prev.name || emp.fullName,
                    email: prev.email || emp.email,
                  }));
                }}
              />

              <input
                className="w-full border p-2 rounded"
                placeholder="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />

              <input
                className="w-full border p-2 rounded"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />

              <input
                type="password"
                className="w-full border p-2 rounded"
                placeholder={editingUser ? "Leave blank to keep unchanged" : "Password"}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />

              {/* Roles */}
              <div className="border rounded p-4 space-y-2">
                <h3 className="font-semibold mb-2">Roles</h3>
                {Object.keys(ROLE_OPTIONS).map((role) => (
                  <label
                    key={role}
                    className="flex items-center justify-between cursor-pointer border rounded p-2"
                  >
                    <span>{role}</span>
                    <input
                      type="checkbox"
                      checked={form.roles.includes(role)}
                      onChange={() => toggleRole(role)}
                    />
                  </label>
                ))}
              </div>

              {/* Modules & permissions */}
              {modulesList.length > 0 && (
                <div className="border rounded p-4 space-y-2">
                  <h3 className="font-semibold mb-2">Modules & Permissions</h3>

                  {modulesList.map((mod) => (
                    <div key={mod} className="border rounded p-2">
                      <label className="flex items-center justify-between">
                        <span>{mod}</span>
                        <input
                          type="checkbox"
                          checked={!!form.modules?.[mod]?.selected}
                          onChange={() => toggleModule(mod)}
                        />
                      </label>

                      {form.modules?.[mod]?.selected && (
                        <div className="pl-4 pt-2 flex flex-wrap gap-2">
                          {PERMISSIONS.map((p) => (
                            <label key={p} className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={!!form.modules?.[mod]?.permissions?.[p]}
                                onChange={() => togglePermission(mod, p)}
                              />
                              {p}
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
                >
                  {editingUser ? "Update" : "Save"}
                </button>
                <button
                  type="button"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
                  onClick={() => {
                    setOpenModal(false);
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

// import React, { useEffect, useState, useMemo } from "react";
// import { FiPlus, FiTrash2, FiEdit } from "react-icons/fi";
// import axios from "axios";
// import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";

// const ROLE_OPTIONS = {
//   Admin: [],
//   "Sales Manager": [
//     "Sales Order",
//     "Sales Invoice",
//     "Delivery",
//     "Sales Quotation",
//     "Credit Memo",
//     "Sales Report",
//   ],
//   "Purchase Manager": [
//     "Purchase Order",
//     "Purchase Invoice",
//     "GRN",
//     "Purchase Quotation",
//     "Debit Note",
//     "Purchase Report",
//   ],
//   "Inventory Manager": [
//     "Inventory View",
//     "Inventory Entry",
//     "Stock Adjustment",
//     "Stock Transfer",
//     "Stock Report",
//   ],
//   "Accounts Manager": ["Payment Entry", "Ledger", "Journal Entry", "Payment Form"],
//   "HR Manager": ["Masters", "Masters View", "Employee", "Attendance", "Payroll"],
//   "Support Executive": ["Tickets", "Responses", "Lead Generation", "Opportunity"],
//   "Production Head": ["BOM", "Work Order", "Production Report", "Production Order", "Job Card"],
//   "Project Manager": ["Project", "Tasks", "Timesheet", "Task Board"],
//   Employee: ["Profile"],
// };

// const PERMISSIONS = ["create", "view", "edit", "delete", "approve", "reject","copy", "print", "export", "import", "upload", "download","email","whatsapp"];

// export default function UsersPage() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [openModal, setOpenModal] = useState(false);
//   const [editingUser, setEditingUser] = useState(null);
//   const [form, setForm] = useState({
//     employeeId: "",
//     name: "",
//     email: "",
//     password: "",
//     roles: [],
//     modules: {},
//   });
//   const [err, setErr] = useState("");
  
//   const [token, setToken] = useState(null);

//   // init token client-side
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       setToken(localStorage.getItem("token"));
//     }
//   }, []);

//   // fetch users
//   useEffect(() => {
//     if (token) fetchUsers();
//   }, [token]);

//   const fetchUsers = async () => {
//     setLoading(true);
//     try {
//       const { data } = await axios.get("/api/company/users", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setUsers(Array.isArray(data) ? data : []);
//     } catch (ex) {
//       console.error("fetchUsers:", ex);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetForm = () => {
//     setForm({employeeId: "", name: "", email: "", password: "", roles: [], modules: {} });
//     setEditingUser(null);
//     setErr("");
//   };

//   // build module list from roles + saved modules
//   const modulesList = useMemo(() => {
//     const seen = new Set();
//     const list = [];

//     (form.roles || []).forEach((role) => {
//       (ROLE_OPTIONS[role] || []).forEach((m) => {
//         if (!seen.has(m)) {
//           seen.add(m);
//           list.push(m);
//         }
//       });
//     });

//     Object.keys(form.modules || {}).forEach((m) => {
//       if (!seen.has(m)) {
//         seen.add(m);
//         list.push(m);
//       }
//     });

//     return list;
//   }, [form.roles, form.modules]);

//   // toggle role → add/remove + ensure role modules exist
//   const toggleRole = (role) => {
//     setForm((prev) => {
//       const has = prev.roles.includes(role);
//       const roles = has ? prev.roles.filter((r) => r !== role) : [...prev.roles, role];

//       const newModules = { ...prev.modules };

//       if (!has) {
//         (ROLE_OPTIONS[role] || []).forEach((mod) => {
//           if (!newModules[mod]) {
//             newModules[mod] = {
//               selected: false,
//               permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: false }), {}),
//             };
//           }
//         });
//       }

//       return { ...prev, roles, modules: newModules };
//     });
//   };

//   // toggle module selection
//   const toggleModule = (module) => {
//     setForm((prev) => {
//       const modules = { ...prev.modules };
//       if (modules[module]) {
//         modules[module] = { ...modules[module], selected: !modules[module].selected };
//       } else {
//         modules[module] = {
//           selected: true,
//           permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: false }), {}),
//         };
//       }
//       return { ...prev, modules };
//     });
//   };

//   // toggle permission
//   const togglePermission = (module, perm) => {
//     setForm((prev) => {
//       const modules = { ...prev.modules };
//       if (!modules[module]) {
//         modules[module] = {
//           selected: true,
//           permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: false }), {}),
//         };
//       }
//       modules[module] = {
//         ...modules[module],
//         permissions: {
//           ...modules[module].permissions,
//           [perm]: !modules[module].permissions?.[perm],
//         },
//       };
//       return { ...prev, modules };
//     });
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setErr("");
//     if (!form.roles || form.roles.length === 0) {
//       return setErr("At least one role is required.");
//     }

//     try {
//       if (!token) throw new Error("No auth token");

//       if (editingUser) {
//         await axios.put(`/api/company/users/${editingUser._id}`, form, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       } else {
//         await axios.post("/api/company/users", form, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//       }

//       resetForm();
//       setOpenModal(false);
//       fetchUsers();
//     } catch (ex) {
//       setErr(ex.response?.data?.message || ex.message || "Error occurred");
//     }
//   };

//   // start editing user
//   const startEdit = (user) => {
//     setEditingUser(user || null);

//     const roles = user?.roles || [];
//     const savedModules = user?.modules || {};
//     const restoredModules = {};

//     Object.entries(savedModules).forEach(([mod, data]) => {
//       restoredModules[mod] = {
//         selected: !!data?.selected,
//         permissions: {
//           ...PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: false }), {}),
//           ...(data?.permissions || {}),
//         },
//       };
//     });

//     roles.forEach((role) => {
//       (ROLE_OPTIONS[role] || []).forEach((mod) => {
//         if (!restoredModules[mod]) {
//           restoredModules[mod] = {
//             selected: false,
//             permissions: PERMISSIONS.reduce((acc, p) => ({ ...acc, [p]: false }), {}),
//           };
//         }
//       });
//     });

//     setForm({
//       employeeId: user?.employeeId?._id || "",
//       name: user?.name || "",
//       email: user?.email || "",
//       password: "",
//       roles,
//       modules: restoredModules,
//     });

//     setOpenModal(true);
//   };

//   const deleteUser = async (id) => {
//     if (!confirm("Delete user?")) return;
//     try {
//       if (!token) throw new Error("No auth token");
//       await axios.delete(`/api/company/users/${id}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setUsers((prev) => prev.filter((u) => u._id !== id));
//     } catch (ex) {
//       console.error("deleteUser:", ex);
//     }
//   };

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Company Users</h1>
//         <button
//           className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
//           onClick={() => {
//             resetForm();
//             setOpenModal(true);
//           }}
//         >
//           <FiPlus /> Add User
//         </button>
//       </div>

//       {/* Users grid */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//         {loading ? (
//           <p className="text-center col-span-3">Loading...</p>
//         ) : users.length ? (
//           users.map((u) => {
//             const modulesObj = u?.modules || {};
//             const selectedModuleEntries = Object.entries(modulesObj).filter(
//               ([, data]) => data && data.selected
//             );

//             return (
//               <div
//                 key={u._id}
//                 className="bg-white rounded shadow p-4 flex flex-col justify-between hover:shadow-lg transition"
//               >
//                 <div>
//                   <h2 className="text-lg font-semibold">{u.name}</h2>
//                   <p className="text-sm text-gray-600">{u.email}</p>
//                   <p className="mt-2 text-sm">
//                     <strong>Roles:</strong> {(u.roles || []).join(", ")}
//                   </p>

//                   {selectedModuleEntries.length > 0 && (
//                     <div className="mt-2 text-sm">
//                       <strong>Modules & Permissions:</strong>
//                       <ul className="list-disc ml-5">
//                         {selectedModuleEntries.map(([mod, data]) => {
//                           const perms = Object.entries(data.permissions || {})
//                             .filter(([, val]) => val)
//                             .map(([k]) => k);
//                           return (
//                             <li key={mod}>
//                               {mod} {perms.length > 0 && <>({perms.join(", ")})</>}
//                             </li>
//                           );
//                         })}
//                       </ul>
//                     </div>
//                   )}
//                 </div>

//                 <div className="flex gap-2 mt-4 justify-end text-lg">
//                   <button onClick={() => startEdit(u)} className="text-blue-600 hover:text-blue-800">
//                     <FiEdit />
//                   </button>
//                   <button onClick={() => deleteUser(u._id)} className="text-red-600 hover:text-red-800">
//                     <FiTrash2 />
//                   </button>
//                 </div>
//               </div>
//             );
//           })
//         ) : (
//           <p className="text-center col-span-3">No users found</p>
//         )}
//       </div>

//       {/* Modal */}
//       {openModal && (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
//             <h2 className="text-xl font-semibold mb-4">{editingUser ? "Edit User" : "New User"}</h2>
//             {err && <p className="text-red-600 mb-2">{err}</p>}

//             <form className="space-y-4" onSubmit={handleSubmit}>
//               {/* 👇 ADD HERE */}
//   <EmployeeSearchSelect
//     token={token}
//     onSelect={(emp) => {
//       setForm((prev) => ({
//         ...prev,
//         employeeId: emp._id,
//         name: prev.name || emp.fullName,
//         email: prev.email || emp.email,
//       }));
//     }}
//   />

//   <input
//     className="w-full border p-2 rounded"
//     placeholder="Name"
//     value={form.name}
//     onChange={(e) => setForm({ ...form, name: e.target.value })}
//   />

//   <input
//     className="w-full border p-2 rounded"
//     placeholder="Email"
//     value={form.email}
//     onChange={(e) => setForm({ ...form, email: e.target.value })}
//   />
//               <input
//                 type="password"
//                 className="w-full border p-2 rounded"
//                 placeholder={editingUser ? "Leave blank to keep unchanged" : "Password"}
//                 value={form.password}
//                 onChange={(e) => setForm({ ...form, password: e.target.value })}
//               />

//               {/* Roles */}
//               <div className="border rounded p-4 space-y-2">
//                 <h3 className="font-semibold mb-2">Roles</h3>
//                 {Object.keys(ROLE_OPTIONS).map((role) => (
//                   <label
//                     key={role}
//                     className="flex items-center justify-between cursor-pointer border rounded p-2"
//                   >
//                     <span>{role}</span>
//                     <input
//                       type="checkbox"
//                       checked={form.roles.includes(role)}
//                       onChange={() => toggleRole(role)}
//                     />
//                   </label>
//                 ))}
//               </div>

//               {/* Modules + permissions */}
//               {modulesList.length > 0 && (
//                 <div className="border rounded p-4 space-y-2">
//                   <h3 className="font-semibold mb-2">Modules & Permissions</h3>

//                   {modulesList.map((mod) => (
//                     <div key={mod} className="border rounded p-2">
//                       <label className="flex items-center justify-between">
//                         <span>{mod}</span>
//                         <input
//                           type="checkbox"
//                           checked={!!form.modules?.[mod]?.selected}
//                           onChange={() => toggleModule(mod)}
//                         />
//                       </label>

//                       {form.modules?.[mod]?.selected && (
//                         <div className="pl-4 pt-2 flex flex-wrap gap-2">
//                           {PERMISSIONS.map((p) => (
//                             <label key={p} className="flex items-center gap-1 text-sm">
//                               <input
//                                 type="checkbox"
//                                 checked={!!form.modules?.[mod]?.permissions?.[p]}
//                                 onChange={() => togglePermission(mod, p)}
//                               />
//                               {p}
//                             </label>
//                           ))}
//                         </div>
//                       )}
//                     </div>
//                   ))}
//                 </div>
//               )}

//               <div className="flex gap-2 pt-2">
//                 <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded">
//                   {editingUser ? "Update" : "Save"}
//                 </button>
//                 <button
//                   type="button"
//                   className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded"
//                   onClick={() => {
//                     setOpenModal(false);
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
//     </div>
//   );
// }







