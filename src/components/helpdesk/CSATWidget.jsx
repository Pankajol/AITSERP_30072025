"use client";
import { useState } from "react";

export default function CSATWidget({ ticketId, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    const res = await fetch("/api/helpdesk/csat/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
      body: JSON.stringify({ ticketId, rating, comment }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      onSubmitted && onSubmitted(data.csat);
      alert("Thank you for your feedback");
    } else alert(data.msg || "Failed");
  }

  return (
    <div className="p-3 bg-gray-800 rounded text-white space-y-2">
      <div>Rate support</div>
      <select value={rating} onChange={(e) => setRating(Number(e.target.value))} className="p-2 bg-gray-700 rounded">
        {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} ⭐</option>)}
      </select>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="w-full p-2 bg-gray-700 rounded" />
      <button onClick={submit} disabled={loading} className="px-3 py-2 bg-blue-600 rounded">{loading ? "Submitting…" : "Submit"}</button>
    </div>
  );
}
