"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import axios from "axios";

export default function FeedbackPage() {
  const params = useSearchParams();
  const token = params.get("token");
  const initialRating = Number(params.get("rating")) || 0;

  const [rating, setRating] = useState(initialRating);
  const [agentHelp, setAgentHelp] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submitFeedback() {
    if (!rating || !agentHelp || !responseTime) {
      alert("Please answer all required questions");
      return;
    }

    setLoading(true);

    try {
      await axios.post("/api/helpdesk/feedback/submit", {
        token,
        rating,
        agentHelp,
        responseTime,
        comment,
      });

      setSubmitted(true);
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md text-center max-w-md">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-semibold mb-2">
            Thank you for your feedback!
          </h2>
          <p className="text-gray-600 text-sm">
            Your response helps us improve our support experience.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6">

        <h1 className="text-xl font-semibold mb-1">
          Rate Your Support Experience
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          This will take less than a minute
        </p>

        {/* ⭐ STAR RATING */}
        <div className="mb-6">
          <p className="font-medium mb-2">Overall experience *</p>
          <div className="flex gap-2 text-2xl">
            {[1,2,3,4,5].map(n => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className={rating >= n ? "text-yellow-400" : "text-gray-300"}
              >
                ⭐
              </button>
            ))}
          </div>
        </div>

        {/* AGENT HELPFUL */}
        <div className="mb-6">
          <p className="font-medium mb-2">Was the agent helpful? *</p>
          <div className="space-y-2">
            {["Yes", "Neutral", "No"].map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="agentHelp"
                  value={opt}
                  onChange={() => setAgentHelp(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* RESPONSE TIME */}
        <div className="mb-6">
          <p className="font-medium mb-2">Response time was *</p>
          <div className="space-y-2">
            {["Fast", "Okay", "Slow"].map(opt => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="responseTime"
                  value={opt}
                  onChange={() => setResponseTime(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        {/* COMMENT */}
        <div className="mb-6">
          <p className="font-medium mb-2">
            Additional comments <span className="text-gray-400">(optional)</span>
          </p>
          <textarea
            rows="3"
            className="w-full border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Tell us more about your experience..."
            value={comment}
            onChange={e => setComment(e.target.value)}
          />
        </div>

        {/* SUBMIT */}
        <button
          onClick={submitFeedback}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          {loading ? "Submitting..." : "Submit Feedback"}
        </button>

      </div>
    </div>
  );
}




// "use client";

// import { useState } from "react";
// import { useSearchParams } from "next/navigation";

// export default function FeedbackClient() {
//   const searchParams = useSearchParams();
//   const token = searchParams.get("token");
//   const presetRate = searchParams.get("rate");

//   const [rating, setRating] = useState(Number(presetRate) || 0);
//   const [comment, setComment] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [msg, setMsg] = useState("");

//   async function submitFeedback() {
//     if (!rating) {
//       setMsg("Please select rating");
//       return;
//     }

//     setLoading(true);
//     setMsg("");

//     const res = await fetch("/api/helpdesk/feedback/submit", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({ token, rating, comment }),
//     });

//     const data = await res.json();
//     setLoading(false);

//     if (!res.ok) {
//       setMsg(data.error || "Error submitting feedback");
//       return;
//     }

//     setMsg("✅ Thank you for your feedback!");
//   }

//   if (!token) {
//     return (
//       <div className="max-w-md mx-auto mt-20 p-6 border rounded text-center">
//         ❌ Invalid or missing feedback link
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-md mx-auto mt-20 p-6 border rounded">
//       <h2 className="text-xl font-bold mb-4">Support Feedback</h2>

//       <div className="flex gap-2 mb-4 text-2xl">
//         {[1, 2, 3, 4, 5].map((r) => (
//           <button
//             key={r}
//             onClick={() => setRating(r)}
//             className={rating >= r ? "text-yellow-500" : "text-gray-300"}
//           >
//             ⭐
//           </button>
//         ))}
//       </div>

//       <textarea
//         className="w-full border p-2 rounded mb-4"
//         placeholder="Optional comment"
//         value={comment}
//         onChange={(e) => setComment(e.target.value)}
//       />

//       <button
//         onClick={submitFeedback}
//         disabled={loading}
//         className="w-full bg-blue-600 text-white py-2 rounded"
//       >
//         {loading ? "Submitting..." : "Submit Feedback"}
//       </button>

//       {msg && <p className="mt-4 text-sm">{msg}</p>}
//     </div>
//   );
// }
