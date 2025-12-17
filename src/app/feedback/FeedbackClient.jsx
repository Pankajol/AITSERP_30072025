"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export default function FeedbackClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const presetRate = searchParams.get("rate");

  const [rating, setRating] = useState(Number(presetRate) || 0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function submitFeedback() {
    if (!rating) {
      setMsg("Please select rating");
      return;
    }

    setLoading(true);
    setMsg("");

    const res = await fetch("/api/helpdesk/feedback/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, rating, comment }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setMsg(data.error || "Error submitting feedback");
      return;
    }

    setMsg("✅ Thank you for your feedback!");
  }

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20 p-6 border rounded text-center">
        ❌ Invalid or missing feedback link
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded">
      <h2 className="text-xl font-bold mb-4">Support Feedback</h2>

      <div className="flex gap-2 mb-4 text-2xl">
        {[1, 2, 3, 4, 5].map((r) => (
          <button
            key={r}
            onClick={() => setRating(r)}
            className={rating >= r ? "text-yellow-500" : "text-gray-300"}
          >
            ⭐
          </button>
        ))}
      </div>

      <textarea
        className="w-full border p-2 rounded mb-4"
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      <button
        onClick={submitFeedback}
        disabled={loading}
        className="w-full bg-blue-600 text-white py-2 rounded"
      >
        {loading ? "Submitting..." : "Submit Feedback"}
      </button>

      {msg && <p className="mt-4 text-sm">{msg}</p>}
    </div>
  );
}
