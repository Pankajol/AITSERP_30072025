"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function EmployeeSearchSelect({
  token,
  onSelect,
  initialValue = "",
  placeholder = "Search employee (name / code / email)",
}) {
  const [query, setQuery] = useState(initialValue);
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (initialValue) setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (!query || query.length < 2) {
      setList([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await axios.get(
          `/api/hr/employees/search?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setList(res.data?.data || []);
        setShow(true);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(t);
  }, [query, token]);

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full border p-2 rounded"
        placeholder={placeholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShow(true);
        }}
        onFocus={() => query && setShow(true)}
      />

   {show && (loading || list.length > 0) && (
  <div className="absolute z-20 mt-1 w-full rounded border bg-white shadow max-h-48 overflow-y-auto">
    {loading && (
      <div className="px-3 py-2 text-sm text-gray-400">
        Searching...
      </div>
    )}

    {!loading &&
      list.map((emp) => (
        <button
          key={emp._id}
          type="button"
          onClick={() => {
            onSelect(emp);
            setQuery(emp.fullName);
            setShow(false);
          }}
          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100"
        >
          <div className="font-medium">{emp.fullName}</div>
          <div className="text-xs text-gray-500">
            {emp.employeeCode}
            {emp.email ? ` • ${emp.email}` : ""}
          </div>
        </button>
      ))}
  </div>
)}

    </div>
  );
}
