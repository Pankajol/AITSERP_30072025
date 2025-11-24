"use client";
import { useEffect, useState } from "react";

export default function CategoriesPage() {
  const [list, setList] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => load(), []);

  function load() {
    fetch("/api/helpdesk/category/list", { headers: { Authorization: "Bearer " + localStorage.getItem("token") } })
      .then(r => r.json()).then(res => setList(res.categories || []));
  }

  async function add() {
    await fetch("/api/helpdesk/category/create", { method: "POST", headers: { "Content-Type":"application/json", Authorization: "Bearer " + localStorage.getItem("token") }, body: JSON.stringify({ name }) });
    setName(""); load();
  }

  async function remove(id) {
    await fetch("/api/helpdesk/category/delete", { method: "DELETE", headers: { "Content-Type":"application/json", Authorization: "Bearer " + localStorage.getItem("token") }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Categories</h1>
      <div className="flex gap-3">
        <input className="p-2 border rounded" value={name} onChange={e => setName(e.target.value)} placeholder="New category" />
        <button onClick={add} className="px-3 py-2 bg-blue-600 text-white rounded">Add</button>
      </div>
      <ul className="space-y-2">
        {list.map(c => (
          <li key={c._id} className="flex justify-between p-3 bg-gray-800 text-white rounded">
            <div>{c.name} <span className="text-xs opacity-60 ml-2">({c.type})</span></div>
            {c.type !== "default" && <button onClick={() => remove(c._id)} className="text-red-400">Delete</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}
