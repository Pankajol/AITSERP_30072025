"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";

export default function CustomFieldAdminPage() {

  // ⭐ module auto detect from URL
  const { module } = useParams();

  const [fields, setFields] = useState([]);

  const [form, setForm] = useState({
    module: "",
    name: "",
    label: "",
    type: "text"
  });

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("token")
      : null;

  const config = {
    headers: { Authorization: `Bearer ${token}` }
  };

  /* ================= FETCH ================= */
  const fetchFields = async () => {
    if (!module) return;

    const res = await axios.get(
      `/api/custom-fields?module=${module}`,
      config
    );

    setFields(res.data.data);
  };

  useEffect(() => {
    if (module) {
      setForm((prev) => ({ ...prev, module }));
      fetchFields();
    }
  }, [module]);

  /* ================= ADD ================= */
  const handleAdd = async () => {

    if (!form.name || !form.label) {
      alert("Fill all fields");
      return;
    }

    await axios.post("/api/custom-fields", form, config);

    setForm((prev) => ({
      ...prev,
      name: "",
      label: ""
    }));

    fetchFields();
  };

  /* ================= DELETE ================= */
  const handleDelete = async (id) => {
    if (!confirm("Delete this field?")) return;

    await axios.delete(`/api/custom-fields/${id}`, config);

    fetchFields();
  };

  /* ================= EDIT ================= */
  const handleEdit = async (field) => {

    const newLabel = prompt("Edit label", field.label);

    if (!newLabel) return;

    await axios.put(
      `/api/custom-fields/${field._id}`,
      { label: newLabel },
      config
    );

    fetchFields();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* HEADER */}
      <h1 className="text-2xl font-bold mb-6">
        Custom Field Manager
        <span className="ml-3 bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm">
          {module}
        </span>
      </h1>

      {/* ADD FORM */}
      <div className="flex gap-3 mb-8">

        <input
          placeholder="Field Name (gstNumber)"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: e.target.value })
          }
          className="border p-2 rounded w-1/3"
        />

        <input
          placeholder="Label (GST Number)"
          value={form.label}
          onChange={(e) =>
            setForm({ ...form, label: e.target.value })
          }
          className="border p-2 rounded w-1/3"
        />

        <select
          value={form.type}
          onChange={(e) =>
            setForm({ ...form, type: e.target.value })
          }
          className="border p-2 rounded"
        >
          <option value="text">Text</option>
          <option value="number">Number</option>
          <option value="date">Date</option>
          <option value="select">Select</option>
        </select>

        <button
          onClick={handleAdd}
          className="bg-blue-600 text-white px-6 rounded"
        >
          Add
        </button>

      </div>

      {/* FIELD LIST */}
      <div className="space-y-3">

        {fields.map((field) => (
          <div
            key={field._id}
            className="border rounded-lg p-4 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold">{field.label}</h3>
              <p className="text-sm text-gray-500">
                {field.name} ({field.type})
              </p>
            </div>

            <div className="flex gap-3">

              <button
                onClick={() => handleEdit(field)}
                className="bg-yellow-500 text-white px-3 py-1 rounded"
              >
                Edit
              </button>

              <button
                onClick={() => handleDelete(field._id)}
                className="bg-red-600 text-white px-3 py-1 rounded"
              >
                Delete
              </button>

            </div>
          </div>
        ))}

      </div>

    </div>
  );
}