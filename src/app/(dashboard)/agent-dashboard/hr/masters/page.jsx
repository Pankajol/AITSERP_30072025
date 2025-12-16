"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/hr/PageHeader";

export default function MastersPage() {
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);

  const [depName, setDepName] = useState("");
  const [desTitle, setDesTitle] = useState("");

  async function load() {
    const token = localStorage.getItem("token");
    if (!token) return;

    const [dRes, gRes] = await Promise.all([
      fetch("/api/hr/departments", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/hr/designations", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);

    const dJson = await dRes.json();
    const gJson = await gRes.json();

    setDepartments(dJson.data || []);
    setDesignations(gJson.data || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addDepartment() {
    const tocken = localStorage.getItem("token");
    if (!tocken) return;

    await fetch("/api/hr/departments", {
      method: "POST",
      headers: { "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
       },
      body: JSON.stringify({ name: depName }),
    });

    setDepName("");
    load();
  }

  async function addDesignation() {
    const token = localStorage.getItem("token");
    if (!token) return;
    await fetch("/api/hr/designations", {
      method: "POST",
      headers: { "Content-Type": "application/json" ,
        Authorization: `Bearer ${localStorage.getItem("token")}`,   
      },
      body: JSON.stringify({ title: desTitle }),
    });

    setDesTitle("");
    load();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Masters"
        subtitle="Departments & Designations"
      />

      <div className="grid gap-6 md:grid-cols-2">

        {/* Departments */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Departments</h2>

          <div className="flex gap-2 mb-3">
            <input
              className="border px-3 py-2 rounded w-full"
              value={depName}
              onChange={(e) => setDepName(e.target.value)}
              placeholder="Department name"
            />
            <button
              onClick={addDepartment}
              className="bg-slate-900 text-white px-3 py-2 rounded"
            >
              Add
            </button>
          </div>

          {departments.map((d) => (
            <div
              key={d._id}
              className="border-b last:border-0 py-2 text-sm"
            >
              {d.name}
            </div>
          ))}
        </div>

        {/* Designations */}
        <div className="border rounded-xl p-4 bg-white">
          <h2 className="font-semibold mb-3">Designations</h2>

          <div className="flex gap-2 mb-3">
            <input
              className="border px-3 py-2 rounded w-full"
              value={desTitle}
              onChange={(e) => setDesTitle(e.target.value)}
              placeholder="Designation title"
            />
            <button
              onClick={addDesignation}
              className="bg-slate-900 text-white px-3 py-2 rounded"
            >
              Add
            </button>
          </div>

          {designations.map((d) => (
            <div
              key={d._id}
              className="border-b last:border-0 py-2 text-sm"
            >
              {d.title}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
