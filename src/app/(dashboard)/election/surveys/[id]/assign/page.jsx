// app/(dashboard)/election/surveys/[id]/assign/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { FiArrowLeft, FiSave, FiUserCheck, FiX, FiSearch } from "react-icons/fi";

// ─── Async Worker Select कम्पोनेंट (कार्यकर्ता खोजने के लिए) ──────────
function AsyncWorkerSelect({ token, onSelect, placeholder = "Search worker..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchWorkers = async (q) => {
    if (!q || q.length < 2) { setResults([]); return; }
    try {
      const { data } = await axios.get(`/api/election/worker?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setResults(data.data);
    } catch { setResults([]); }
  };

  useEffect(() => {
    const timeout = setTimeout(() => searchWorkers(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <div className="relative">
        <FiSearch className="absolute left-3 top-2.5 text-gray-300" />
        <input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onFocus={() => setShowDropdown(true)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
        />
      </div>
      {showDropdown && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((w) => (
            <div
              key={w._id}
              className="px-4 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer"
              onClick={() => {
                onSelect(w);
                setQuery(w.name);
                setShowDropdown(false);
              }}
            >
              {w.name} ({w.workerRole || "No role"})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AssignWorkersPage() {
  const { id } = useParams();
  const router = useRouter();
  const [survey, setSurvey] = useState(null);
  const [assignedWorkers, setAssignedWorkers] = useState([]);   // जो पहले से असाइन हैं
  const [selectedWorker, setSelectedWorker] = useState(null);   // अभी जोड़ने के लिए
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // सर्वे और पहले से असाइन कार्यकर्ता लोड करें
  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        const { data } = await axios.get(`/api/election/survey?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) {
          setSurvey(data.data);
          setAssignedWorkers(data.data.assignedWorkers || []);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [id, token]);

  // कार्यकर्ता जोड़ें (लोकल स्टेट में)
  const addWorker = (worker) => {
    if (assignedWorkers.find((w) => w._id === worker._id)) {
      setError("Worker already assigned");
      return;
    }
    setAssignedWorkers((prev) => [...prev, { _id: worker._id, name: worker.name, workerRole: worker.workerRole }]);
    setSelectedWorker(null);
    setError("");
  };

  // कार्यकर्ता हटाएँ (लोकल स्टेट से)
  const removeWorker = (workerId) => {
    setAssignedWorkers((prev) => prev.filter((w) => w._id !== workerId));
  };

  // सेव करें – सभी कार्यकर्ता IDs API को भेजें
  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const workerIds = assignedWorkers.map((w) => w._id);
      await axios.put(
        `/api/election/survey/assign`,
        { surveyId: id, workerIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      router.push("/election/surveys");
    } catch (e) {
      setError(e.response?.data?.message || "Failed to assign workers");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!survey) return <div className="text-center py-20 text-gray-400">Survey not found</div>;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-4"
      >
        <FiArrowLeft /> Back
      </button>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Assign Workers</h1>
      <p className="text-sm text-gray-500 mb-6">Survey: {survey.title}</p>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      {/* पहले से असाइन कार्यकर्ताओं की सूची */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">
          Assigned Workers ({assignedWorkers.length})
        </h3>
        {assignedWorkers.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No workers assigned yet.</p>
        ) : (
          <div className="space-y-2">
            {assignedWorkers.map((w) => (
              <div key={w._id} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5 border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                    {w.name?.[0] || "?"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{w.name}</p>
                    <p className="text-xs text-gray-500">{w.workerRole || "No role"}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeWorker(w._id)}
                  className="text-red-400 hover:text-red-600"
                >
                  <FiX size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* नया कार्यकर्ता जोड़ें */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-gray-700 mb-2">Add Worker</h3>
        <AsyncWorkerSelect
          token={token}
          onSelect={(worker) => addWorker(worker)}
          placeholder="Search worker by name..."
        />
      </div>

      {/* सेव बटन */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
      >
        <FiSave className="text-base" />
        {saving ? "Saving..." : "Save Assignments"}
      </button>
    </div>
  );
}