"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/hr/PageHeader";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    department: "",
    designation: "",
    employmentType: "Full-Time",
    joiningDate: "",
  });

  useEffect(() => {
    async function load() {
      try {
        const tocken = localStorage.getItem("token");
        if (!tocken) return;
        const [empRes, depRes, desRes] = await Promise.all([
          fetch("/api/hr/employees",
            {
              headers: { Authorization: `Bearer ${tocken}` },
            }
          ),
          fetch("/api/hr/departments",
            {
              headers: { Authorization: `Bearer ${tocken}` },
            }
          ),
          fetch("/api/hr/designations",
            {
              headers: { Authorization: `Bearer ${tocken}` },
            }
          ),
        ]);

        const empJson = await empRes.json();
        const depJson = await depRes.json();
        const desJson = await desRes.json();

        setEmployees(empJson.data || []);
        setDepartments(depJson.data || []);
        setDesignations(desJson.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleOpenCreate() {
    setEditing(null);
    setForm({
      fullName: "",
      email: "",
      phone: "",
      department: "",
      designation: "",
      employmentType: "Full-Time",
      joiningDate: "",
    });
    setOpenForm(true);
  }

  function handleEdit(emp) {
    setEditing(emp);
    setForm({
      fullName: emp.fullName || "",
      email: emp.email || "",
      phone: emp.phone || "",
      department: emp.department?._id || "",
      designation: emp.designation?._id || "",
      employmentType: emp.employmentType || "Full-Time",
      joiningDate: emp.joiningDate?.slice(0, 10) || "",
    });
    setOpenForm(true);
  }

  async function handleSubmit() {
    try {
        const token = localStorage.getItem("token");
        if (!token) return;
      const method = editing ? "PUT" : "POST";
      const url = editing
        ? `/api/hr/employees/${editing._id}`
        : "/api/hr/employees";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
         },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save");

      const updated = await res.json();

      if (editing) {
        setEmployees((prev) =>
          prev.map((e) => (e._id === editing._id ? updated.data : e))
        );
      } else {
        setEmployees((prev) => [updated.data, ...prev]);
      }

      setOpenForm(false);
    } catch (e) {
      console.error(e);
      alert("Error saving employee");
    }
  }

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      e.email?.toLowerCase().includes(search.toLowerCase());
    const matchesDept =
      departmentFilter === "all" ||
      e.department?._id === departmentFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees"
        subtitle="Manage your workforce – add, update and filter employees."
        actions={
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Add Employee
          </button>
        }
      />

      <div className="rounded-2xl border bg-white">
        <div className="border-b px-4 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-sm font-semibold">Employee List</h2>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <input
              placeholder="Search by name or email..."
              className="w-full md:w-64 rounded-lg border px-3 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="w-full md:w-48 rounded-lg border px-3 py-2 text-sm bg-white"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
            >
              <option value="all">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Department</th>
                <th className="px-4 py-3 text-left font-medium">Designation</th>
                <th className="px-4 py-3 text-left font-medium">Employment</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-40 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded bg-slate-100 animate-pulse" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="h-8 w-16 rounded bg-slate-100 animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No employees found.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((e) => (
                  <tr key={e._id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium">{e.fullName}</div>
                      <div className="text-xs text-slate-400">
                        Code: {e.employeeCode}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.email || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.department?.name || "-" || e.department()?.name}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {e.designation?.title ||  e.designation()?.title || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full border px-2 py-0.5 text-xs">
                        {e.employmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleEdit(e)}
                        className="inline-flex items-center rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden p-3 space-y-3">
          {loading
            ? [...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-20 rounded-xl bg-slate-100 animate-pulse"
                />
              ))
            : filteredEmployees.length === 0
            ? (
              <div className="text-center text-slate-400 text-sm py-4">
                No employees found.
              </div>
            )
            : filteredEmployees.map((e) => (
                <div
                  key={e._id}
                  className="border rounded-xl p-3 shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-sm">{e.fullName}</h3>
                    <span className="text-xs text-slate-400">
                      {e.employeeCode}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    {e.designation?.title} • {e.department?.name}
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs border px-2 py-0.5 rounded-full">
                      {e.employmentType}
                    </span>
                    <button
                      onClick={() => handleEdit(e)}
                      className="text-xs text-slate-900 underline"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
        </div>
      </div>

      {/* Simple Modal */}
      {openForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-semibold">
                {editing ? "Edit Employee" : "Add Employee"}
              </h2>
              <button
                onClick={() => setOpenForm(false)}
                className="text-slate-400 hover:text-slate-600 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">Full Name</label>
                <input
                  className="rounded-lg border px-3 py-2 text-sm"
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">Email</label>
                <input
                  type="email"
                  className="rounded-lg border px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">Phone</label>
                <input
                  className="rounded-lg border px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">Joining Date</label>
                <input
                  type="date"
                  className="rounded-lg border px-3 py-2 text-sm"
                  value={form.joiningDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, joiningDate: e.target.value }))
                  }
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">Department</label>
                <select
                  className="rounded-lg border px-3 py-2 text-sm bg-white"
                  value={form.department}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, department: e.target.value }))
                  }
                >
                  <option value="">Select department</option>
                  {departments.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">Designation</label>
                <select
                  className="rounded-lg border px-3 py-2 text-sm bg-white"
                  value={form.designation}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, designation: e.target.value }))
                  }
                >
                  <option value="">Select designation</option>
                  {designations.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-600">
                  Employment Type
                </label>
                <select
                  className="rounded-lg border px-3 py-2 text-sm bg-white"
                  value={form.employmentType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, employmentType: e.target.value }))
                  }
                >
                  <option value="Full-Time">Full Time</option>
                  <option value="Part-Time">Part Time</option>
                  <option value="Intern">Intern</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setOpenForm(false)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                {editing ? "Save Changes" : "Create Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
