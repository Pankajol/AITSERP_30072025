// "use client";

// import { useSearchParams } from "next/navigation";
// import { useState } from "react";
// import axios from "axios";

// export default function FeedbackPage() {
//   const sp = useSearchParams();
//   const token = sp.get("token");
//   const rating = sp.get("rating");

//   const [comment, setComment] = useState("");
//   const [submitted, setSubmitted] = useState(false);
//   const [error, setError] = useState("");

//   async function submit() {
//     try {
//       await axios.post("/api/helpdesk/feedback/submit", {
//         token,
//         rating,
//         comment,
//       });
//       setSubmitted(true);
//     } catch (e) {
//       setError(e.response?.data?.error || "Something went wrong");
//     }
//   }

//   if (submitted) return <h2>🙏 Thank you for your feedback!</h2>;

//   return (
//     <div style={{ padding: 30, maxWidth: 500 }}>
//       <h2>You rated us ⭐ {rating}</h2>

//       <textarea
//         placeholder="Optional comment"
//         value={comment}
//         onChange={(e) => setComment(e.target.value)}
//         style={{ width: "100%", height: 100 }}
//       />

//       <br />
//       <button onClick={submit}>Submit Feedback</button>

//       {error && <p style={{ color: "red" }}>{error}</p>}
//     </div>
//   );
// }



import { Suspense } from "react";
import FeedbackClient from "./FeedbackClient";

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading feedback…</div>}>
      <FeedbackClient />
    </Suspense>
  );
}
