"use client";

import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";
import {
  FiPlus, FiTrash2, FiEdit2, FiSearch, FiShield,
  FiUser, FiMail, FiLock, FiX, FiCheck, FiChevronDown,
  FiChevronRight, FiUsers, FiEye, FiEyeOff
} from "react-icons/fi";
import { HiOutlineSparkles } from "react-icons/hi2";

const ROLE_OPTIONS = {
  Admin: [],
  // crm: [
  //   "Lead Generation",
  //   "Opportunity",
  //   "Campaign",
  // ],
  "CRM Admin": ["Lead Management", "Opportunity", "Customer Masters", "CRM Reports", "Campaigns"],
  "CRM Agent": ["Lead Generation", "Opportunity", "Follow-ups", "Customer View", "Email Templates"],
  "masters": [
    "Company",
    "Users",
    "Customers",
    "Suppliers",
    "Items",
    "Employees",
    "Accounts",
  ],
  "Sales Manager": [
    "Sales Quotation",
    "Sales Order",
    "Sales Invoice",
    "Delivery",
    "Credit Memo",
    "Sales Report",
  ],
  "Purchase Manager": [
    "Purchase Quotation",
    "Purchase Order",
    "GRN",
    "Purchase Invoice",
    "Debit Notes",
    "Purchase Report",
  ],
  "Inventory Manager": [
    "Inventory",
  ],
  "Accounts Manager": [
    "Payment Entry",
    "Ledger",
    "Journal Entry",
    "Profit & Loss",
    "Balance Sheet",
    "Reports",
    "Ageing",
    "Statement",
    "Bank Statement",
    "Supplier Ageing",
    "Supplier Statement",
  ],
  "HR Manager": [
    "employees",
    "leaves",
    "attendance",
    "payroll",
  ],

  // ✅ FIX 1: Employee key was DUPLICATED — merged both into one correct definition
  // Old code had TWO Employee keys:
  //   Employee: ["employees","attendance","leaves","payroll","salary"]  ← first
  //   Employee: ["Employees"]                                           ← second (overwrote first!)
  // Now only ONE Employee key with all correct lowercase module names
  Employee: [
    "employees",
    "attendance",
    "leaves",
    "payroll",
    "salary",
  ],

  Agent: [
    "Tickets",
    "Responses",
    "Lead Generation",
    "Opportunity",
  ],
  "Production Head": [
    "BoM",
    "Production Order",
    "PPC",
  ],
  "Project Manager": [
    "Project",
    "Task",
  ],
};

const PERMISSIONS = [
  "create", "view", "edit", "delete",
  "approve", "reject", "copy", "print",
  "export", "import", "upload", "download",
  "email", "whatsapp",
];

const PERM_ICONS = {
  create: "✦", view: "👁", edit: "✎", delete: "⌫",
  approve: "✓", reject: "✗", copy: "⎘", print: "⎙",
  export: "↑", import: "↓", upload: "⬆", download: "⬇",
  email: "✉", whatsapp: "💬",
};

const ROLE_COLORS = {
  Admin:               { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-200",    dot: "bg-rose-500" },
  masters:             { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200",  dot: "bg-violet-500" },
  "Sales Manager":     { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",    dot: "bg-blue-500" },
  "Purchase Manager":  { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",   dot: "bg-amber-500" },
  "Inventory Manager": { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", dot: "bg-emerald-500" },
  "Accounts Manager":  { bg: "bg-cyan-50",    text: "text-cyan-600",    border: "border-cyan-200",    dot: "bg-cyan-500" },
  "HR Manager":        { bg: "bg-pink-50",    text: "text-pink-600",    border: "border-pink-200",    dot: "bg-pink-500" },
  Agent:               { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200",  dot: "bg-indigo-500" },
  "Production Head":   { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200",  dot: "bg-orange-500" },
  "Project Manager":   { bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-200",    dot: "bg-teal-500" },
  Employee:            { bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400" },
};

const defaultColor = { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };

const emptyForm = () => ({
  employeeId: "", name: "", email: "", password: "", roles: [], modules: {},
});

export default function UsersPage() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(false);
  const [openModal, setOpenModal]     = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm]               = useState(emptyForm());
  const [err, setErr]                 = useState("");
  const [saving, setSaving]           = useState(false);
  const [token, setToken]             = useState(null);
  const [search, setSearch]           = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [expandedMods, setExpandedMods] = useState({});
  const [activeTab, setActiveTab]     = useState("info");

  useEffect(() => {
    if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
  }, []);

  useEffect(() => { if (token) fetchUsers(); }, [token]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const resetForm = () => {
    setForm(emptyForm()); setEditingUser(null); setErr(""); setActiveTab("info"); setExpandedMods({});
  };

  const modulesList = useMemo(() => {
    const seen = new Set();
    const list = [];
    (form.roles || []).forEach(role =>
      (ROLE_OPTIONS[role] || []).forEach(m => { if (!seen.has(m)) { seen.add(m); list.push(m); } })
    );
    Object.keys(form.modules || {}).forEach(m => { if (!seen.has(m)) { seen.add(m); list.push(m); } });
    return list;
  }, [form.roles, form.modules]);

  const selectedModulesCount = useMemo(
    () => Object.values(form.modules).filter(m => m?.selected).length,
    [form.modules]
  );

  const toggleRole = (role) => {
    setForm(prev => {
      const has = prev.roles.includes(role);
      const roles = has ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
      const modules = { ...prev.modules };
      if (!has) {
        (ROLE_OPTIONS[role] || []).forEach(mod => {
          if (!modules[mod]) modules[mod] = { selected: false, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
        });
      }
      return { ...prev, roles, modules };
    });
  };

  const toggleModule = (mod) => {
    setForm(prev => {
      const modules = { ...prev.modules };
      modules[mod] = { ...modules[mod], selected: !modules[mod]?.selected };
      return { ...prev, modules };
    });
  };

  const togglePerm = (mod, perm) => {
    setForm(prev => {
      const modules = { ...prev.modules };
      if (!modules[mod]) modules[mod] = { selected: true, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
      modules[mod] = { ...modules[mod], permissions: { ...modules[mod].permissions, [perm]: !modules[mod].permissions?.[perm] } };
      return { ...prev, modules };
    });
  };

  const selectAllPerms = (mod, val) => {
    setForm(prev => {
      const modules = { ...prev.modules };
      if (!modules[mod]) modules[mod] = { selected: true, permissions: {} };
      modules[mod] = { ...modules[mod], permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: val }), {}) };
      return { ...prev, modules };
    });
  };

  const toggleModExpand = (mod) => setExpandedMods(prev => ({ ...prev, [mod]: !prev[mod] }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.roles.length) return setErr("At least one role is required.");
    setSaving(true);
    try {
      if (editingUser) {
        await axios.put(`/api/company/users/${editingUser._id}`, form, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post("/api/company/users", form, { headers: { Authorization: `Bearer ${token}` } });
      }
      resetForm();
      setOpenModal(false);
      fetchUsers();
    } catch (e) {
      setErr(e.response?.data?.message || "Error occurred");
    } finally { setSaving(false); }
  };

  const startEdit = (user) => {
    const roles = user?.roles || [];
    const savedModules = user?.modules || {};
    const restoredModules = {};
    Object.entries(savedModules).forEach(([mod, data]) => {
      restoredModules[mod] = {
        selected: !!data?.selected,
        permissions: { ...PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}), ...(data?.permissions || {}) },
      };
    });
    roles.forEach(role => {
      (ROLE_OPTIONS[role] || []).forEach(mod => {
        if (!restoredModules[mod]) restoredModules[mod] = { selected: false, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
      });
    });
    setEditingUser(user);
    setForm({ employeeId: user?.employeeId?._id || "", name: user?.name || "", email: user?.email || "", password: "", roles, modules: restoredModules });
    setActiveTab("info");
    setOpenModal(true);
  };

  const deleteUser = async (id) => {
    if (!confirm("Delete this user?")) return;
    await axios.delete(`/api/company/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
    setUsers(prev => prev.filter(u => u._id !== id));
  };

  const filtered = useMemo(() =>
    users.filter(u =>
      !search.trim() ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      (u.roles || []).some(r => r.toLowerCase().includes(search.toLowerCase()))
    ), [users, search]);

  const avatar = (name) => name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
  const avatarColor = (name) => {
    const colors = ["bg-indigo-500","bg-violet-500","bg-pink-500","bg-rose-500","bg-amber-500","bg-emerald-500","bg-cyan-500","bg-blue-500"];
    return colors[(name?.charCodeAt(0) || 0) % colors.length];
  };

  const tab1Done = form.name && form.email && (editingUser || form.password);
  const tab2Done = form.roles.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Company Users</h1>
            <p className="text-sm text-gray-400 mt-0.5">{users.length} users · Manage roles & permissions</p>
          </div>
          <button onClick={() => { resetForm(); setOpenModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
            <FiPlus className="text-base" /> Add User
          </button>
        </div>

        <div className="relative mb-5 max-w-sm">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
            value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, role..." />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gray-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-28 bg-gray-200 rounded" />
                    <div className="h-3 w-36 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {[1,2].map(j => <div key={j} className="h-5 w-20 bg-gray-100 rounded-full" />)}
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <FiUsers className="text-3xl text-indigo-300" />
            </div>
            <p className="text-gray-400 font-medium">{search ? "No users match your search" : "No users yet"}</p>
            <p className="text-sm text-gray-300 mt-1">{!search && "Click \"Add User\" to create the first one"}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(u => (
              <div key={u._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${avatarColor(u.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                      {avatar(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
                      <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => startEdit(u)}
                      className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
                      <FiEdit2 className="text-xs" />
                    </button>
                    <button onClick={() => deleteUser(u._id)}
                      className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
                      <FiTrash2 className="text-xs" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(u.roles || []).map(role => {
                    const c = ROLE_COLORS[role] || defaultColor;
                    return (
                      <span key={role} className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                        {role}
                      </span>
                    );
                  })}
                </div>
                {u.modules && Object.values(u.modules).filter(m => m?.selected).length > 0 && (
                  <p className="text-[10.5px] text-gray-400 mt-2 flex items-center gap-1">
                    <FiShield className="text-xs" />
                    {Object.values(u.modules).filter(m => m?.selected).length} modules enabled
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <HiOutlineSparkles className="text-white text-base" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900">{editingUser ? "Edit User" : "New User"}</h2>
                  <p className="text-xs text-gray-400">{editingUser ? `Editing ${editingUser.name}` : "Fill in details and assign access"}</p>
                </div>
              </div>
              <button onClick={() => { setOpenModal(false); resetForm(); }}
                className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all">
                <FiX />
              </button>
            </div>

            <div className="flex border-b border-gray-100 px-6">
              {[
                { id: "info",    label: "Info",        icon: <FiUser />,   done: tab1Done },
                { id: "roles",   label: "Roles",       icon: <FiShield />, done: tab2Done },
                { id: "modules", label: "Permissions", icon: <FiEye />,    done: selectedModulesCount > 0, badge: selectedModulesCount || null },
              ].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all relative
                    ${activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                  {tab.icon} {tab.label}
                  {tab.done && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2.5 right-2" />}
                  {tab.badge > 0 && (
                    <span className="ml-1 bg-indigo-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{tab.badge}</span>
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
              <div className="px-6 py-5">
                {err && (
                  <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                    <FiX className="text-red-500 flex-shrink-0" />
                    <p className="text-sm text-red-600 font-medium">{err}</p>
                  </div>
                )}

                {activeTab === "info" && (
                  <div className="space-y-4">
                    <EmployeeSearchSelect token={token} onSelect={(emp) =>
                      setForm(prev => ({ ...prev, employeeId: emp._id, name: prev.name || emp.fullName, email: prev.email || emp.email }))
                    } />
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name *</label>
                      <div className="relative">
                        <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
                        <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
                          placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email Address *</label>
                      <div className="relative">
                        <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
                        <input type="email" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
                          placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                        Password {editingUser && <span className="normal-case font-normal text-gray-300">(leave blank to keep)</span>}
                        {!editingUser && " *"}
                      </label>
                      <div className="relative">
                        <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
                        <input type={showPw ? "text" : "password"}
                          className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
                          placeholder={editingUser ? "Leave blank to keep unchanged" : "Min. 8 characters"}
                          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                          required={!editingUser} />
                        <button type="button" onClick={() => setShowPw(p => !p)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                          {showPw ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "roles" && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 mb-3">Select one or more roles. Modules will be auto-populated.</p>
                    {Object.keys(ROLE_OPTIONS).map(role => {
                      const c = ROLE_COLORS[role] || defaultColor;
                      const mods = ROLE_OPTIONS[role];
                      const isSelected = form.roles.includes(role);
                      return (
                        <div key={role} onClick={() => toggleRole(role)}
                          className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all
                            ${isSelected ? `${c.border} ${c.bg}` : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? c.dot : "bg-gray-300"} transition-colors`} />
                            <div>
                              <p className={`text-sm font-bold ${isSelected ? c.text : "text-gray-700"}`}>{role}</p>
                              {mods.length > 0 && (
                                <p className="text-[10px] text-gray-400 mt-0.5">{mods.slice(0, 4).join(", ")}{mods.length > 4 ? ` +${mods.length - 4}` : ""}</p>
                              )}
                              {mods.length === 0 && <p className="text-[10px] text-gray-400 mt-0.5">Full access</p>}
                            </div>
                          </div>
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
                            ${isSelected ? `${c.dot} border-transparent` : "border-gray-300 bg-white"}`}>
                            {isSelected && <FiCheck className="text-white text-[10px]" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === "modules" && (
                  <div>
                    {modulesList.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                          <FiShield className="text-2xl text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-400">No modules yet</p>
                        <p className="text-xs text-gray-300 mt-1">Select roles first to see modules</p>
                        <button type="button" onClick={() => setActiveTab("roles")}
                          className="mt-3 text-xs text-indigo-600 font-bold hover:underline">
                          Go to Roles →
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs text-gray-400">{modulesList.length} modules · {selectedModulesCount} enabled</p>
                          <button type="button" onClick={() => {
                            const allSelected = modulesList.every(m => form.modules?.[m]?.selected);
                            setForm(prev => {
                              const modules = { ...prev.modules };
                              modulesList.forEach(mod => {
                                if (!modules[mod]) modules[mod] = { selected: false, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
                                modules[mod] = { ...modules[mod], selected: !allSelected };
                              });
                              return { ...prev, modules };
                            });
                          }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
                            {modulesList.every(m => form.modules?.[m]?.selected) ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        {modulesList.map(mod => {
                          const isSelected = !!form.modules?.[mod]?.selected;
                          const isExpanded = expandedMods[mod];
                          const permsEnabled = Object.values(form.modules?.[mod]?.permissions || {}).filter(Boolean).length;
                          return (
                            <div key={mod} className={`rounded-xl border-2 transition-all overflow-hidden
                              ${isSelected ? "border-indigo-200 bg-indigo-50/30" : "border-gray-100 bg-gray-50/50"}`}>
                              <div className="flex items-center gap-3 px-4 py-3">
                                <div onClick={() => toggleModule(mod)}
                                  className={`w-9 h-5 rounded-full transition-all cursor-pointer flex-shrink-0 relative
                                    ${isSelected ? "bg-indigo-600" : "bg-gray-200"}`}>
                                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all
                                    ${isSelected ? "left-4" : "left-0.5"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className={`text-sm font-bold ${isSelected ? "text-gray-800" : "text-gray-500"}`}>{mod}</span>
                                  {isSelected && permsEnabled > 0 && (
                                    <span className="ml-2 text-[10px] text-indigo-500 font-semibold">{permsEnabled} permissions</span>
                                  )}
                                </div>
                                {isSelected && (
                                  <button type="button" onClick={() => toggleModExpand(mod)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                    {isExpanded ? <FiChevronDown className="text-sm" /> : <FiChevronRight className="text-sm" />}
                                  </button>
                                )}
                              </div>
                              {isSelected && isExpanded && (
                                <div className="px-4 pb-4 border-t border-indigo-100">
                                  <div className="flex items-center justify-between py-2 mb-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Permissions</span>
                                    <div className="flex gap-3">
                                      <button type="button" onClick={() => selectAllPerms(mod, true)} className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">All</button>
                                      <button type="button" onClick={() => selectAllPerms(mod, false)} className="text-[10px] font-bold text-red-500 hover:text-red-600">None</button>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                                    {PERMISSIONS.map(perm => {
                                      const active = !!form.modules?.[mod]?.permissions?.[perm];
                                      return (
                                        <button key={perm} type="button" onClick={() => togglePerm(mod, perm)}
                                          className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all
                                            ${active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500"}`}>
                                          <span className="text-base leading-none">{PERM_ICONS[perm]}</span>
                                          <span className="text-[8px] font-bold capitalize leading-none">{perm}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
                <div className="flex gap-2">
                  {activeTab !== "info" && (
                    <button type="button" onClick={() => setActiveTab(activeTab === "modules" ? "roles" : "info")}
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
                      ← Back
                    </button>
                  )}
                  <button type="button" onClick={() => { setOpenModal(false); resetForm(); }}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
                    Cancel
                  </button>
                </div>
                <div className="flex gap-2">
                  {activeTab !== "modules" && (
                    <button type="button" onClick={() => setActiveTab(activeTab === "info" ? "roles" : "modules")}
                      className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100 transition-all">
                      Next →
                    </button>
                  )}
                  <button type="submit" disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all
                      ${saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"}`}>
                    {saving ? (
                      <span className="flex items-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...
                      </span>
                    ) : (
                      <><FiCheck className="text-sm" /> {editingUser ? "Update User" : "Create User"}</>
                    )}
                  </button>
                </div>
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
// import axios from "axios";
// import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";
// import {
//   FiPlus, FiTrash2, FiEdit2, FiSearch, FiShield,
//   FiUser, FiMail, FiLock, FiX, FiCheck, FiChevronDown,
//   FiChevronRight, FiUsers, FiEye, FiEyeOff
// } from "react-icons/fi";
// import { HiOutlineSparkles } from "react-icons/hi2";



// const ROLE_OPTIONS = {
//   // ── Admin — full access, no module restrictions ────
//   Admin: [],

//   // ── CRM ────────────────────────────────────────────
//   crm: [
//     "Lead Generation",   // → /admin/leads-view
//     "Opportunity",       // → /admin/opportunities
//     "Campaign",          // → /admin/crm/campaign
//   ],

//   // ── Masters ────────────────────────────────────────
//   masters: [
//     "Company",           // → /admin/company
//     "Users",             // → /admin/users
//     "Customers",         // → /admin/customer-view + create
//     "Suppliers",         // → /admin/supplier + create
//     "Items",             // → /admin/item + create
//     "Employees",         // → /admin/hr/Dashboard etc.
//     "Accounts",          // → /admin/account-head-view + general ledger
//   ],

//   // ── Sales Manager ──────────────────────────────────
//   "Sales Manager": [
//     "Sales Quotation",   // → /admin/sales-quotation-view + create
//     "Sales Order",       // → /admin/sales-order-view + create
//     "Sales Invoice",     // → /admin/sales-invoice-view
//     "Delivery",          // → /admin/delivery-view
//     "Credit Memo",       // → /admin/credit-memo-veiw
//     "Sales Report",      // → /admin/sales-report + board + pos
//   ],

//   // ── Purchase Manager ───────────────────────────────
//   "Purchase Manager": [
//     "Purchase Quotation", // → /admin/PurchaseQuotationList
//     "Purchase Order",     // → /admin/purchase-order-view
//     "GRN",                // → /admin/grn-view
//     "Purchase Invoice",   // → /admin/purchaseInvoice-view
//     "Debit Notes",        // → /admin/debit-notes-view
//     "Purchase Report",    // → /admin/purchase-report
//   ],

//   // ── Inventory Manager ──────────────────────────────
//   "Inventory Manager": [
//     "Inventory",          // → view + entry + ledger (all 3 sub-routes)
//   ],

//   // ── Accounts Manager ───────────────────────────────
//   "Accounts Manager": [
//     "Payment Entry",      // → /admin/Payment
//     "Ledger",             // → /admin/bank-head-details-view
//     "Journal Entry",      // → /admin/finance/journal-entry
//     "Profit & Loss",      // → /admin/finance/report/profit-loss
//     "Balance Sheet",      // → /admin/finance/report/balance-sheet
//     "Reports",            // → /admin/finance/report/trial-balance
//     "Ageing",             // → /admin/finance/report/ageing/customer
//     "Statement",          // → /admin/finance/report/statement/customer
//     "Bank Statement",     // → /admin/finance/report/statement/bank
//     "Supplier Ageing",    // → /admin/finance/report/ageing/supplier
//     "Supplier Statement", // → /admin/finance/report/statement/supplier
//   ],

//   // ── HR Manager ─────────────────────────────────────
//   "HR Manager": [
//   "employees",
//   "leaves",
//   "attendance",
//   "payroll",
// ],
// Employee: [
//   "employees",
//   "attendance",
//   "leaves",
//    "payroll",
//    "salary"

// ],

//   // ── Agent ──────────────────────────────────────────
//   Agent: [
//     "Tickets",            // → /admin/helpdesk/tickets
//     "Responses",          // → /admin/helpdesk/feedback + analytics
//     "Lead Generation",    // → /admin/leads-view
//     "Opportunity",        // → /admin/opportunities
//   ],

//   // ── Production Head ────────────────────────────────
//   "Production Head": [
//     "BoM",                // → /admin/bom + bom-view
//     "Production Order",   // → /admin/ProductionOrder + board
//     "PPC",                // → all PPC routes
//   ],

//   // ── Project Manager ────────────────────────────────
//   "Project Manager": [
//     "Project",            // → projects + workspaces + tasks + board
//     "Task",               // → /admin/tasks + board
//   ],

//   // ── Employee ───────────────────────────────────────
//   Employee: [
//     "Employees",          // → limited to own profile via GET filter
//   ],
// };

// const PERMISSIONS = [
//   "create", "view", "edit", "delete",
//   "approve", "reject", "copy", "print",
//   "export", "import", "upload", "download",
//   "email", "whatsapp",
// ];

// const PERM_ICONS = {
//   create: "✦", view: "👁", edit: "✎", delete: "⌫",
//   approve: "✓", reject: "✗", copy: "⎘", print: "⎙",
//   export: "↑", import: "↓", upload: "⬆", download: "⬇",
//   email: "✉", whatsapp: "💬",
// };

// const ROLE_COLORS = {
//   Admin:              { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-200",    dot: "bg-rose-500" },
//   masters:            { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-200",  dot: "bg-violet-500" },
//   "Sales Manager":    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-200",    dot: "bg-blue-500" },
//   "Purchase Manager": { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-200",   dot: "bg-amber-500" },
//   "Inventory Manager":{ bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200", dot: "bg-emerald-500" },
//   "Accounts Manager": { bg: "bg-cyan-50",    text: "text-cyan-600",    border: "border-cyan-200",    dot: "bg-cyan-500" },
//   "HR Manager":       { bg: "bg-pink-50",    text: "text-pink-600",    border: "border-pink-200",    dot: "bg-pink-500" },
//   Agent:              { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-200",  dot: "bg-indigo-500" },
//   "Production Head":  { bg: "bg-orange-50",  text: "text-orange-600",  border: "border-orange-200",  dot: "bg-orange-500" },
//   "Project Manager":  { bg: "bg-teal-50",    text: "text-teal-600",    border: "border-teal-200",    dot: "bg-teal-500" },
//   Employee:           { bg: "bg-gray-50",    text: "text-gray-600",    border: "border-gray-200",    dot: "bg-gray-400" },
// };

// const defaultColor = { bg: "bg-gray-50", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" };

// const emptyForm = () => ({
//   employeeId: "", name: "", email: "", password: "", roles: [], modules: {},
// });

// export default function UsersPage() {
//   const [users, setUsers]         = useState([]);
//   const [loading, setLoading]     = useState(false);
//   const [openModal, setOpenModal] = useState(false);
//   const [editingUser, setEditingUser] = useState(null);
//   const [form, setForm]           = useState(emptyForm());
//   const [err, setErr]             = useState("");
//   const [saving, setSaving]       = useState(false);
//   const [token, setToken]         = useState(null);
//   const [search, setSearch]       = useState("");
//   const [showPw, setShowPw]       = useState(false);
//   const [expandedMods, setExpandedMods] = useState({});
//   const [activeTab, setActiveTab] = useState("info"); // "info" | "roles" | "modules"

//   useEffect(() => {
//     if (typeof window !== "undefined") setToken(localStorage.getItem("token"));
//   }, []);

//   useEffect(() => { if (token) fetchUsers(); }, [token]);

//   const fetchUsers = async () => {
//     setLoading(true);
//     try {
//       const { data } = await axios.get("/api/company/users", {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setUsers(Array.isArray(data) ? data : []);
//     } catch (e) { console.error(e); }
//     finally { setLoading(false); }
//   };

//   const resetForm = () => { setForm(emptyForm()); setEditingUser(null); setErr(""); setActiveTab("info"); setExpandedMods({}); };

//   // ── Modules derived from selected roles ──
//   const modulesList = useMemo(() => {
//     const seen = new Set();
//     const list = [];
//     (form.roles || []).forEach(role =>
//       (ROLE_OPTIONS[role] || []).forEach(m => { if (!seen.has(m)) { seen.add(m); list.push(m); } })
//     );
//     Object.keys(form.modules || {}).forEach(m => { if (!seen.has(m)) { seen.add(m); list.push(m); } });
//     return list;
//   }, [form.roles, form.modules]);

//   const selectedModulesCount = useMemo(
//     () => Object.values(form.modules).filter(m => m?.selected).length,
//     [form.modules]
//   );

//   // ── Toggles ──
//   const toggleRole = (role) => {
//     setForm(prev => {
//       const has = prev.roles.includes(role);
//       const roles = has ? prev.roles.filter(r => r !== role) : [...prev.roles, role];
//       const modules = { ...prev.modules };
//       if (!has) {
//         (ROLE_OPTIONS[role] || []).forEach(mod => {
//           if (!modules[mod]) modules[mod] = { selected: false, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
//         });
//       }
//       return { ...prev, roles, modules };
//     });
//   };

//   const toggleModule = (mod) => {
//     setForm(prev => {
//       const modules = { ...prev.modules };
//       modules[mod] = { ...modules[mod], selected: !modules[mod]?.selected };
//       return { ...prev, modules };
//     });
//   };

//   const togglePerm = (mod, perm) => {
//     setForm(prev => {
//       const modules = { ...prev.modules };
//       if (!modules[mod]) modules[mod] = { selected: true, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
//       modules[mod] = { ...modules[mod], permissions: { ...modules[mod].permissions, [perm]: !modules[mod].permissions?.[perm] } };
//       return { ...prev, modules };
//     });
//   };

//   const selectAllPerms = (mod, val) => {
//     setForm(prev => {
//       const modules = { ...prev.modules };
//       if (!modules[mod]) modules[mod] = { selected: true, permissions: {} };
//       modules[mod] = { ...modules[mod], permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: val }), {}) };
//       return { ...prev, modules };
//     });
//   };

//   const toggleModExpand = (mod) => setExpandedMods(prev => ({ ...prev, [mod]: !prev[mod] }));

//   // ── Submit ──
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setErr("");
//     if (!form.roles.length) return setErr("At least one role is required.");
//     setSaving(true);
//     try {
//       if (editingUser) {
//         await axios.put(`/api/company/users/${editingUser._id}`, form, { headers: { Authorization: `Bearer ${token}` } });
//       } else {
//         await axios.post("/api/company/users", form, { headers: { Authorization: `Bearer ${token}` } });
//       }
//       resetForm();
//       setOpenModal(false);
//       fetchUsers();
//     } catch (e) {
//       setErr(e.response?.data?.message || "Error occurred");
//     } finally { setSaving(false); }
//   };

//   // ── Edit ──
//   const startEdit = (user) => {
//     const roles = user?.roles || [];
//     const savedModules = user?.modules || {};
//     const restoredModules = {};
//     Object.entries(savedModules).forEach(([mod, data]) => {
//       restoredModules[mod] = {
//         selected: !!data?.selected,
//         permissions: { ...PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}), ...(data?.permissions || {}) },
//       };
//     });
//     roles.forEach(role => {
//       (ROLE_OPTIONS[role] || []).forEach(mod => {
//         if (!restoredModules[mod]) restoredModules[mod] = { selected: false, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) };
//       });
//     });
//     setEditingUser(user);
//     setForm({ employeeId: user?.employeeId?._id || "", name: user?.name || "", email: user?.email || "", password: "", roles, modules: restoredModules });
//     setActiveTab("info");
//     setOpenModal(true);
//   };

//   const deleteUser = async (id) => {
//     if (!confirm("Delete this user?")) return;
//     await axios.delete(`/api/company/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
//     setUsers(prev => prev.filter(u => u._id !== id));
//   };

//   // ── Filtered users ──
//   const filtered = useMemo(() =>
//     users.filter(u =>
//       !search.trim() ||
//       u.name?.toLowerCase().includes(search.toLowerCase()) ||
//       u.email?.toLowerCase().includes(search.toLowerCase()) ||
//       (u.roles || []).some(r => r.toLowerCase().includes(search.toLowerCase()))
//     ), [users, search]);

//   // ── Avatar initials ──
//   const avatar = (name) => name ? name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?";
//   const avatarColor = (name) => {
//     const colors = ["bg-indigo-500","bg-violet-500","bg-pink-500","bg-rose-500","bg-amber-500","bg-emerald-500","bg-cyan-500","bg-blue-500"];
//     return colors[(name?.charCodeAt(0) || 0) % colors.length];
//   };

//   // ── Tab completion checks ──
//   const tab1Done = form.name && form.email && (editingUser || form.password);
//   const tab2Done = form.roles.length > 0;

//   return (
//     <div className="min-h-screen bg-gray-50">
//       <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

//         {/* ── Header ── */}
//         <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
//           <div>
//             <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Company Users</h1>
//             <p className="text-sm text-gray-400 mt-0.5">{users.length} users · Manage roles & permissions</p>
//           </div>
//           <button onClick={() => { resetForm(); setOpenModal(true); }}
//             className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
//             <FiPlus className="text-base" /> Add User
//           </button>
//         </div>

//         {/* ── Search ── */}
//         <div className="relative mb-5 max-w-sm">
//           <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm pointer-events-none" />
//           <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//             value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, role..." />
//         </div>

//         {/* ── Users Grid ── */}
//         {loading ? (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {Array(6).fill(0).map((_, i) => (
//               <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
//                 <div className="flex items-center gap-3 mb-4">
//                   <div className="w-11 h-11 rounded-xl bg-gray-200" />
//                   <div className="flex-1 space-y-1.5">
//                     <div className="h-3.5 w-28 bg-gray-200 rounded" />
//                     <div className="h-3 w-36 bg-gray-100 rounded" />
//                   </div>
//                 </div>
//                 <div className="flex gap-1.5 flex-wrap">
//                   {[1,2].map(j => <div key={j} className="h-5 w-20 bg-gray-100 rounded-full" />)}
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="flex flex-col items-center justify-center py-20 text-center">
//             <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
//               <FiUsers className="text-3xl text-indigo-300" />
//             </div>
//             <p className="text-gray-400 font-medium">{search ? "No users match your search" : "No users yet"}</p>
//             <p className="text-sm text-gray-300 mt-1">{!search && "Click \"Add User\" to create the first one"}</p>
//           </div>
//         ) : (
//           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
//             {filtered.map(u => (
//               <div key={u._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
//                 <div className="flex items-start justify-between mb-3">
//                   <div className="flex items-center gap-3">
//                     <div className={`w-11 h-11 rounded-xl ${avatarColor(u.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
//                       {avatar(u.name)}
//                     </div>
//                     <div className="min-w-0">
//                       <p className="text-sm font-bold text-gray-900 truncate">{u.name}</p>
//                       <p className="text-[11px] text-gray-400 truncate">{u.email}</p>
//                     </div>
//                   </div>
//                   <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
//                     <button onClick={() => startEdit(u)}
//                       className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100 transition-colors">
//                       <FiEdit2 className="text-xs" />
//                     </button>
//                     <button onClick={() => deleteUser(u._id)}
//                       className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-colors">
//                       <FiTrash2 className="text-xs" />
//                     </button>
//                   </div>
//                 </div>

//                 {/* Roles */}
//                 <div className="flex flex-wrap gap-1.5 mt-3">
//                   {(u.roles || []).map(role => {
//                     const c = ROLE_COLORS[role] || defaultColor;
//                     return (
//                       <span key={role} className={`inline-flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
//                         <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
//                         {role}
//                       </span>
//                     );
//                   })}
//                 </div>

//                 {/* Modules count */}
//                 {u.modules && Object.values(u.modules).filter(m => m?.selected).length > 0 && (
//                   <p className="text-[10.5px] text-gray-400 mt-2 flex items-center gap-1">
//                     <FiShield className="text-xs" />
//                     {Object.values(u.modules).filter(m => m?.selected).length} modules enabled
//                   </p>
//                 )}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* ══════════ MODAL ══════════ */}
//       {openModal && (
//         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">

//             {/* Modal Header */}
//             <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
//               <div className="flex items-center gap-3">
//                 <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center">
//                   <HiOutlineSparkles className="text-white text-base" />
//                 </div>
//                 <div>
//                   <h2 className="text-base font-bold text-gray-900">{editingUser ? "Edit User" : "New User"}</h2>
//                   <p className="text-xs text-gray-400">{editingUser ? `Editing ${editingUser.name}` : "Fill in details and assign access"}</p>
//                 </div>
//               </div>
//               <button onClick={() => { setOpenModal(false); resetForm(); }}
//                 className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-all">
//                 <FiX />
//               </button>
//             </div>

//             {/* Tabs */}
//             <div className="flex border-b border-gray-100 px-6">
//               {[
//                 { id: "info",    label: "Info",        icon: <FiUser />,   done: tab1Done },
//                 { id: "roles",   label: "Roles",       icon: <FiShield />, done: tab2Done },
//                 { id: "modules", label: "Permissions", icon: <FiEye />,    done: selectedModulesCount > 0, badge: selectedModulesCount || null },
//               ].map(tab => (
//                 <button key={tab.id} onClick={() => setActiveTab(tab.id)}
//                   className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold border-b-2 transition-all relative
//                     ${activeTab === tab.id ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
//                   {tab.icon} {tab.label}
//                   {tab.done && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-2.5 right-2" />}
//                   {tab.badge > 0 && (
//                     <span className="ml-1 bg-indigo-600 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">{tab.badge}</span>
//                   )}
//                 </button>
//               ))}
//             </div>

//             {/* Modal Body */}
//             <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
//               <div className="px-6 py-5">
//                 {err && (
//                   <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
//                     <FiX className="text-red-500 flex-shrink-0" />
//                     <p className="text-sm text-red-600 font-medium">{err}</p>
//                   </div>
//                 )}

//                 {/* ── TAB: INFO ── */}
//                 {activeTab === "info" && (
//                   <div className="space-y-4">
//                     <EmployeeSearchSelect token={token} onSelect={(emp) =>
//                       setForm(prev => ({ ...prev, employeeId: emp._id, name: prev.name || emp.fullName, email: prev.email || emp.email }))
//                     } />

//                     <div>
//                       <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Full Name *</label>
//                       <div className="relative">
//                         <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
//                         <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//                           placeholder="John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
//                       </div>
//                     </div>

//                     <div>
//                       <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">Email Address *</label>
//                       <div className="relative">
//                         <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
//                         <input type="email" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//                           placeholder="john@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
//                       </div>
//                     </div>

//                     <div>
//                       <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">
//                         Password {editingUser && <span className="normal-case font-normal text-gray-300">(leave blank to keep)</span>}
//                         {!editingUser && " *"}
//                       </label>
//                       <div className="relative">
//                         <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
//                         <input type={showPw ? "text" : "password"}
//                           className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
//                           placeholder={editingUser ? "Leave blank to keep unchanged" : "Min. 8 characters"}
//                           value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
//                           required={!editingUser} />
//                         <button type="button" onClick={() => setShowPw(p => !p)}
//                           className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
//                           {showPw ? <FiEyeOff className="text-sm" /> : <FiEye className="text-sm" />}
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 )}

//                 {/* ── TAB: ROLES ── */}
//                 {activeTab === "roles" && (
//                   <div className="space-y-2">
//                     <p className="text-xs text-gray-400 mb-3">Select one or more roles. Modules will be auto-populated.</p>
//                     {Object.keys(ROLE_OPTIONS).map(role => {
//                       const c = ROLE_COLORS[role] || defaultColor;
//                       const mods = ROLE_OPTIONS[role];
//                       const isSelected = form.roles.includes(role);
//                       return (
//                         <div key={role} onClick={() => toggleRole(role)}
//                           className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all
//                             ${isSelected ? `${c.border} ${c.bg}` : "border-gray-100 bg-gray-50 hover:border-gray-200"}`}>
//                           <div className="flex items-center gap-3">
//                             <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? c.dot : "bg-gray-300"} transition-colors`} />
//                             <div>
//                               <p className={`text-sm font-bold ${isSelected ? c.text : "text-gray-700"}`}>{role}</p>
//                               {mods.length > 0 && (
//                                 <p className="text-[10px] text-gray-400 mt-0.5">{mods.slice(0, 4).join(", ")}{mods.length > 4 ? ` +${mods.length - 4}` : ""}</p>
//                               )}
//                               {mods.length === 0 && <p className="text-[10px] text-gray-400 mt-0.5">Full access</p>}
//                             </div>
//                           </div>
//                           <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all
//                             ${isSelected ? `${c.dot} border-transparent` : "border-gray-300 bg-white"}`}>
//                             {isSelected && <FiCheck className="text-white text-[10px]" />}
//                           </div>
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}

//                 {/* ── TAB: MODULES / PERMISSIONS ── */}
//                 {activeTab === "modules" && (
//                   <div>
//                     {modulesList.length === 0 ? (
//                       <div className="flex flex-col items-center justify-center py-10 text-center">
//                         <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
//                           <FiShield className="text-2xl text-gray-300" />
//                         </div>
//                         <p className="text-sm font-medium text-gray-400">No modules yet</p>
//                         <p className="text-xs text-gray-300 mt-1">Select roles first to see modules</p>
//                         <button type="button" onClick={() => setActiveTab("roles")}
//                           className="mt-3 text-xs text-indigo-600 font-bold hover:underline">
//                           Go to Roles →
//                         </button>
//                       </div>
//                     ) : (
//                       <div className="space-y-2">
//                         <div className="flex items-center justify-between mb-3">
//                           <p className="text-xs text-gray-400">{modulesList.length} modules · {selectedModulesCount} enabled</p>
//                           <button type="button" onClick={() => {
//                             const allSelected = modulesList.every(m => form.modules?.[m]?.selected);
//                             setForm(prev => {
//                               const modules = { ...prev.modules };
//                               modulesList.forEach(mod => { if (!modules[mod]) modules[mod] = { selected: false, permissions: PERMISSIONS.reduce((a, p) => ({ ...a, [p]: false }), {}) }; modules[mod] = { ...modules[mod], selected: !allSelected }; });
//                               return { ...prev, modules };
//                             });
//                           }} className="text-xs font-bold text-indigo-600 hover:text-indigo-800">
//                             {modulesList.every(m => form.modules?.[m]?.selected) ? "Deselect All" : "Select All"}
//                           </button>
//                         </div>

//                         {modulesList.map(mod => {
//                           const isSelected = !!form.modules?.[mod]?.selected;
//                           const isExpanded = expandedMods[mod];
//                           const permsEnabled = Object.values(form.modules?.[mod]?.permissions || {}).filter(Boolean).length;
//                           return (
//                             <div key={mod} className={`rounded-xl border-2 transition-all overflow-hidden
//                               ${isSelected ? "border-indigo-200 bg-indigo-50/30" : "border-gray-100 bg-gray-50/50"}`}>
//                               <div className="flex items-center gap-3 px-4 py-3">
//                                 {/* Toggle module */}
//                                 <div onClick={() => toggleModule(mod)}
//                                   className={`w-9 h-5 rounded-full transition-all cursor-pointer flex-shrink-0 relative
//                                     ${isSelected ? "bg-indigo-600" : "bg-gray-200"}`}>
//                                   <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all
//                                     ${isSelected ? "left-4" : "left-0.5"}`} />
//                                 </div>
//                                 <div className="flex-1 min-w-0">
//                                   <span className={`text-sm font-bold ${isSelected ? "text-gray-800" : "text-gray-500"}`}>{mod}</span>
//                                   {isSelected && permsEnabled > 0 && (
//                                     <span className="ml-2 text-[10px] text-indigo-500 font-semibold">{permsEnabled} permissions</span>
//                                   )}
//                                 </div>
//                                 {isSelected && (
//                                   <button type="button" onClick={() => toggleModExpand(mod)}
//                                     className="text-gray-400 hover:text-gray-600 transition-colors p-1">
//                                     {isExpanded ? <FiChevronDown className="text-sm" /> : <FiChevronRight className="text-sm" />}
//                                   </button>
//                                 )}
//                               </div>

//                               {/* Permissions grid */}
//                               {isSelected && isExpanded && (
//                                 <div className="px-4 pb-4 border-t border-indigo-100">
//                                   <div className="flex items-center justify-between py-2 mb-1">
//                                     <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Permissions</span>
//                                     <div className="flex gap-3">
//                                       <button type="button" onClick={() => selectAllPerms(mod, true)}
//                                         className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700">All</button>
//                                       <button type="button" onClick={() => selectAllPerms(mod, false)}
//                                         className="text-[10px] font-bold text-red-500 hover:text-red-600">None</button>
//                                     </div>
//                                   </div>
//                                   <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
//                                     {PERMISSIONS.map(perm => {
//                                       const active = !!form.modules?.[mod]?.permissions?.[perm];
//                                       return (
//                                         <button key={perm} type="button" onClick={() => togglePerm(mod, perm)}
//                                           className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all
//                                             ${active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500"}`}>
//                                           <span className="text-base leading-none">{PERM_ICONS[perm]}</span>
//                                           <span className="text-[8px] font-bold capitalize leading-none">{perm}</span>
//                                         </button>
//                                       );
//                                     })}
//                                   </div>
//                                 </div>
//                               )}
//                             </div>
//                           );
//                         })}
//                       </div>
//                     )}
//                   </div>
//                 )}
//               </div>

//               {/* Modal Footer */}
//               <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-between gap-3">
//                 <div className="flex gap-2">
//                   {activeTab !== "info" && (
//                     <button type="button" onClick={() => setActiveTab(activeTab === "modules" ? "roles" : "info")}
//                       className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
//                       ← Back
//                     </button>
//                   )}
//                   <button type="button" onClick={() => { setOpenModal(false); resetForm(); }}
//                     className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200 transition-all">
//                     Cancel
//                   </button>
//                 </div>

//                 <div className="flex gap-2">
//                   {activeTab !== "modules" && (
//                     <button type="button"
//                       onClick={() => setActiveTab(activeTab === "info" ? "roles" : "modules")}
//                       className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-bold hover:bg-indigo-100 transition-all">
//                       Next →
//                     </button>
//                   )}
//                   <button type="submit" disabled={saving}
//                     className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all
//                       ${saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"}`}>
//                     {saving ? (
//                       <span className="flex items-center gap-2"><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</span>
//                     ) : (
//                       <><FiCheck className="text-sm" /> {editingUser ? "Update User" : "Create User"}</>
//                     )}
//                   </button>
//                 </div>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }



// "use client";

// import React, { useEffect, useState, useMemo } from "react";
// import { FiPlus, FiTrash2, FiEdit } from "react-icons/fi";
// import axios from "axios";
// import EmployeeSearchSelect from "@/components/hr/EmployeeSearchSelect";

// const ROLE_OPTIONS = {
//   Admin: [],
//   "masters": ["Company", "Users", "Customers", "Suppliers", "Items", "Employees", "Accounts"],
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
//   "Agent": ["Tickets", "Responses", "Lead Generation", "Opportunity"],
//   "Production Head": ["BOM", "Work Order", "Production Report", "Production Order", "Job Card"],
//   "Project Manager": ["Project", "Tasks", "Timesheet", "Task Board"],
//   Employee: ["Profile"],
// };

// const PERMISSIONS = [
//   "create","view","edit","delete","approve","reject",
//   "copy","print","export","import","upload","download",
//   "email","whatsapp",
// ];

// export default function UsersPage() {
//   const [users, setUsers] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [openModal, setOpenModal] = useState(false);
//   const [editingUser, setEditingUser] = useState(null);

//   const [form, setForm] = useState({
//     employeeId: "",   // ✅ added
//     name: "",
//     email: "",
//     password: "",
//     roles: [],
//     modules: {},
//   });

//   const [err, setErr] = useState("");
//   const [token, setToken] = useState(null);

//   /* ---------- init token ---------- */
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       setToken(localStorage.getItem("token"));
//     }
//   }, []);

//   /* ---------- fetch users ---------- */
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
//     } catch (e) {
//       console.error("fetchUsers:", e);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const resetForm = () => {
//     setForm({
//       employeeId: "",
//       name: "",
//       email: "",
//       password: "",
//       roles: [],
//       modules: {},
//     });
//     setEditingUser(null);
//     setErr("");
//   };

//   /* ---------- module list ---------- */
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

//   /* ---------- toggles ---------- */
//   const toggleRole = (role) => {
//     setForm((prev) => {
//       const has = prev.roles.includes(role);
//       const roles = has
//         ? prev.roles.filter((r) => r !== role)
//         : [...prev.roles, role];

//       const modules = { ...prev.modules };

//       if (!has) {
//         (ROLE_OPTIONS[role] || []).forEach((mod) => {
//           if (!modules[mod]) {
//             modules[mod] = {
//               selected: false,
//               permissions: PERMISSIONS.reduce(
//                 (a, p) => ({ ...a, [p]: false }),
//                 {}
//               ),
//             };
//           }
//         });
//       }

//       return { ...prev, roles, modules };
//     });
//   };

//   const toggleModule = (module) => {
//     setForm((prev) => {
//       const modules = { ...prev.modules };
//       modules[module] = {
//         ...modules[module],
//         selected: !modules[module]?.selected,
//       };
//       return { ...prev, modules };
//     });
//   };

//   const togglePermission = (module, perm) => {
//     setForm((prev) => {
//       const modules = { ...prev.modules };
//       if (!modules[module]) {
//         modules[module] = {
//           selected: true,
//           permissions: PERMISSIONS.reduce(
//             (a, p) => ({ ...a, [p]: false }),
//             {}
//           ),
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

//   /* ---------- submit ---------- */
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setErr("");

//     if (!form.roles.length) {
//       return setErr("At least one role is required.");
//     }

//     try {
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
//     } catch (e) {
//       setErr(e.response?.data?.message || "Error occurred");
//     }
//   };

//   /* ---------- edit ---------- */
//   const startEdit = (user) => {
//     const roles = user?.roles || [];
//     const savedModules = user?.modules || {};
//     const restoredModules = {};

//     Object.entries(savedModules).forEach(([mod, data]) => {
//       restoredModules[mod] = {
//         selected: !!data?.selected,
//         permissions: {
//           ...PERMISSIONS.reduce(
//             (a, p) => ({ ...a, [p]: false }),
//             {}
//           ),
//           ...(data?.permissions || {}),
//         },
//       };
//     });

//     roles.forEach((role) => {
//       (ROLE_OPTIONS[role] || []).forEach((mod) => {
//         if (!restoredModules[mod]) {
//           restoredModules[mod] = {
//             selected: false,
//             permissions: PERMISSIONS.reduce(
//               (a, p) => ({ ...a, [p]: false }),
//               {}
//             ),
//           };
//         }
//       });
//     });

//     setEditingUser(user);
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
//     await axios.delete(`/api/company/users/${id}`, {
//       headers: { Authorization: `Bearer ${token}` },
//     });
//     setUsers((prev) => prev.filter((u) => u._id !== id));
//   };

//   /* ---------- UI ---------- */
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
//           users.map((u) => (
//             <div
//               key={u._id}
//               className="bg-white rounded shadow p-4 flex flex-col justify-between hover:shadow-lg transition"
//             >
//               <div>
//                 <h2 className="text-lg font-semibold">{u.name}</h2>
//                 <p className="text-sm text-gray-600">{u.email}</p>
//                 <p className="mt-2 text-sm">
//                   <strong>Roles:</strong> {(u.roles || []).join(", ")}
//                 </p>
//               </div>

//               <div className="flex gap-2 mt-4 justify-end text-lg">
//                 <button onClick={() => startEdit(u)} className="text-blue-600">
//                   <FiEdit />
//                 </button>
//                 <button onClick={() => deleteUser(u._id)} className="text-red-600">
//                   <FiTrash2 />
//                 </button>
//               </div>
//             </div>
//           ))
//         ) : (
//           <p className="text-center col-span-3">No users found</p>
//         )}
//       </div>

//       {/* Modal */}
//       {openModal && (
//         <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
//           <div className="bg-white rounded-lg p-6 w-full max-w-xl max-h-[90vh] overflow-y-auto">
//             <h2 className="text-xl font-semibold mb-4">
//               {editingUser ? "Edit User" : "New User"}
//             </h2>
//             {err && <p className="text-red-600 mb-2">{err}</p>}

//             <form className="space-y-4" onSubmit={handleSubmit}>
//               {/* ✅ Employee Search (ONLY ADDITION) */}
//               <EmployeeSearchSelect
//                 token={token}
//                 onSelect={(emp) => {
//                   setForm((prev) => ({
//                     ...prev,
//                     employeeId: emp._id,
//                     name: prev.name || emp.fullName,
//                     email: prev.email || emp.email,
//                   }));
//                 }}
//               />

//               <input
//                 className="w-full border p-2 rounded"
//                 placeholder="Name"
//                 value={form.name}
//                 onChange={(e) => setForm({ ...form, name: e.target.value })}
//               />

//               <input
//                 className="w-full border p-2 rounded"
//                 placeholder="Email"
//                 value={form.email}
//                 onChange={(e) => setForm({ ...form, email: e.target.value })}
//               />

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

//               {/* Modules & permissions */}
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
//                 <button
//                   type="submit"
//                   className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
//                 >
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







