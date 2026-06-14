// app/(dashboard)/election/surveys/create/page.js
"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FiPlus, FiTrash2, FiX, FiCheck } from "react-icons/fi";
import { SearchableSelect } from "@/components/SearchableSelect";

export default function CreateSurveyPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [constituencyId, setConstituencyId] = useState("");
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [assignedConstituency, setAssignedConstituency] = useState(null);
  const [isRestricted, setIsRestricted] = useState(false);

  const [constituencyOptions, setConstituencyOptions] = useState([]);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Decode JWT to get assigned constituency
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const assigned = payload.assignedConstituency;
      if (assigned && assigned._id) {
        setAssignedConstituency({ _id: assigned._id, name: assigned.name });
        setConstituencyId(assigned._id);
        setIsRestricted(true);
      } else {
        setIsRestricted(false);
      }
    } catch (err) {
      console.error("Failed to decode token", err);
    }
  }, [token]);

  // Fetch constituencies for dropdown (only needed for unrestricted users)
  useEffect(() => {
    if (!token || isRestricted) return;
    const load = async () => {
      try {
        const { data } = await axios.get("/api/election/constituency", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setConstituencyOptions(data.data.map((c) => ({ value: c._id, label: c.name })));
        }
      } catch (e) { console.error(e); }
    };
    load();
  }, [token, isRestricted]);

  const addQuestion = () => {
    setQuestions([...questions, { questionText: "", type: "SingleSelect", options: [""], required: false }]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...questions];
    updated[index][field] = value;
    setQuestions(updated);
  };

  const addOption = (qIndex) => {
    const updated = [...questions];
    updated[qIndex].options.push("");
    setQuestions(updated);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const updated = [...questions];
    updated[qIndex].options[oIndex] = value;
    setQuestions(updated);
  };

  const removeOption = (qIndex, oIndex) => {
    const updated = [...questions];
    updated[qIndex].options.splice(oIndex, 1);
    setQuestions(updated);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || questions.length === 0) return setError("Title and at least one question required.");
    setSaving(true);
    setError("");
    try {
      const payload = {
        title,
        description,
        constituency: constituencyId || null,
        questionGroups: [{ sectionName: "Default", questions }],
        status: "Draft",
      };
      await axios.post("/api/election/survey", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      router.push("/election/surveys");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to create survey");
    } finally { setSaving(false); }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Create New Survey</h1>

      {isRestricted && assignedConstituency && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
          🔒 You are restricted to constituency: <strong>{assignedConstituency.name}</strong>. Survey will automatically be linked to this constituency.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
            <FiX className="text-red-500" />
            <p className="text-sm text-red-600 font-medium">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Survey Title *</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Booth Level Opinion"
            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm" required />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
            className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm" />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Constituency</label>
          {isRestricted ? (
            <input
              type="text"
              value={assignedConstituency?.name || "Assigned constituency"}
              disabled
              className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-500"
            />
          ) : (
            <SearchableSelect
              options={constituencyOptions}
              value={constituencyId}
              onChange={(val) => setConstituencyId(val)}
              placeholder="Search constituency..."
            />
          )}
          <p className="text-xs text-gray-400 mt-1">
            {isRestricted
              ? "Your survey will be visible only within your assigned constituency."
              : "Leave empty to make the survey available for all constituencies."}
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-800">Questions</h2>
            <button type="button" onClick={addQuestion}
              className="flex items-center gap-1 text-sm font-bold text-indigo-600 hover:text-indigo-800">
              <FiPlus /> Add Question
            </button>
          </div>

          {questions.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No questions yet. Click "Add Question" to begin.</p>
          )}

          {questions.map((q, qIndex) => (
            <div key={qIndex} className="mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-bold text-gray-500">Q{qIndex + 1}</span>
                <input
                  value={q.questionText}
                  onChange={(e) => updateQuestion(qIndex, "questionText", e.target.value)}
                  placeholder="Enter question"
                  className="flex-1 py-2 px-3 rounded-lg border border-gray-200 text-sm"
                  required
                />
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(qIndex, "type", e.target.value)}
                  className="py-2 px-3 rounded-lg border border-gray-200 text-sm"
                >
                  <option value="SingleSelect">Single Select</option>
                  <option value="MultiSelect">Multi Select</option>
                  <option value="Text">Text</option>
                  <option value="Rating">Rating</option>
                  <option value="Boolean">Boolean</option>
                </select>
                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-400 hover:text-red-600">
                  <FiTrash2 />
                </button>
              </div>

              {(q.type === "SingleSelect" || q.type === "MultiSelect") && (
                <div className="ml-6 space-y-1.5">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input
                        value={opt}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${oIndex + 1}`}
                        className="flex-1 py-1.5 px-3 rounded-lg border border-gray-200 text-sm"
                      />
                      {q.options.length > 1 && (
                        <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-red-400 hover:text-red-600">
                          <FiX />
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(qIndex)} className="text-sm text-indigo-600 font-medium hover:underline">
                    + Add Option
                  </button>
                </div>
              )}

              <div className="mt-2 ml-6">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={q.required}
                    onChange={(e) => updateQuestion(qIndex, "required", e.target.checked)}
                    className="rounded text-indigo-600"
                  />
                  Required
                </label>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold hover:bg-gray-200">Cancel</button>
          <button type="submit" disabled={saving}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-white text-sm font-bold transition-all ${
              saving ? "bg-gray-300 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700 shadow-sm shadow-indigo-200"
            }`}>
            {saving ? "Creating..." : <><FiCheck /> Create Survey</>}
          </button>
        </div>
      </form>
    </div>
  );
}