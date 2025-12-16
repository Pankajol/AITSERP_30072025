import { Suspense } from "react";
import FeedbackClient from "./FeedbackClient";

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading feedback…</div>}>
      <FeedbackClient />
    </Suspense>
  );
}
