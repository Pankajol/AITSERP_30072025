"use client";
import { useState } from "react";

export default function AIReplyPanel({ ticketId, onSelect }) {
  const [loading, setLoading] = useState(false);
  const [aiText, setAiText] = useState("");

  async function call(type) {
    setLoading(true);
    try {
      const res = await fetch(`/api/helpdesk/ai/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + localStorage.getItem("token") },
        body: JSON.stringify({ ticketId }),
      });
      const data = await res.json();
      if (type === "summarize") setAiText(data.summary || data.suggestion || "");
      else if (type === "suggestReply") setAiText(data.suggestion || data.reply || "");
      else if (type === "auto-reply") setAiText(data.reply || "");
      else if (type === "auto-category") setAiText(data.category || "");
      else setAiText(JSON.stringify(data));
    } catch (e) {
      setAiText("AI error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 bg-gray-800 text-white rounded-xl space-y-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => call("auto-reply")} className="p-2 bg-blue-600 rounded">Auto Reply</button>
        <button onClick={() => call("summarize")} className="p-2 bg-green-600 rounded">Summarize</button>
        <button onClick={() => call("suggestReply")} className="p-2 bg-purple-600 rounded">Suggest Reply</button>
        <button onClick={() => call("auto-category")} className="p-2 bg-yellow-600 rounded">Auto Category</button>
        <button onClick={() => call("auto-assign")} className="p-2 bg-indigo-600 rounded">Auto Assign</button>
      </div>

      {loading && <div>Generating…</div>}

      {aiText && (
        <div className="bg-black p-3 rounded">
          <pre className="whitespace-pre-wrap">{aiText}</pre>
          <div className="mt-2">
            <button onClick={() => onSelect && onSelect(aiText)} className="px-3 py-1 bg-blue-700 rounded">Use text</button>
          </div>
        </div>
      )}
    </div>
  );
}
