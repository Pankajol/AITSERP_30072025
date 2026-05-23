// app/(dashboard)/election/survey-response/page.js
"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSearchParams } from "next/navigation";
import { FiSave } from "react-icons/fi";
import { SearchableSelect } from "@/components/SearchableSelect"; // अपना सही पथ डालें

// ─── Async Voter Select कम्पोनेंट (अब पूरी तरह स्थिर) ──────────────────
function AsyncVoterSelect({ token, onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selected, setSelected] = useState(null);

  const searchVoters = async (q) => {
    if (!q || q.length < 2) {
      setResults([]);
      return;
    }
    try {
      const { data } = await axios.get(
        `/api/election/voter?search=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) setResults(data.data);
    } catch {
      setResults([]);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => searchVoters(query), 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={
          selected
            ? `${selected.firstName} ${selected.lastName}`
            : "Search voter..."
        }
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
      />
      {showDropdown && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {results.map((v) => (
            <div
              key={v._id}
              className="px-4 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer transition-colors"
              onClick={() => {
                onSelect(v._id);
                setSelected(v);
                setQuery("");
                setShowDropdown(false);
              }}
            >
              {v.firstName} {v.lastName} ({v.voterId || v.phone})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── मुख्य पेज ─────────────────────────────────────────────────────────
export default function SurveyResponsePage() {
  const searchParams = useSearchParams();
  const preselectedSurveyId = searchParams.get("surveyId");

  const [surveys, setSurveys] = useState([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState(
    preselectedSurveyId || ""
  );
  const [survey, setSurvey] = useState(null);
  const [selectedVoterId, setSelectedVoterId] = useState("");
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // सभी सर्वे लोड करें
  useEffect(() => {
    if (!token) return;
    const loadSurveys = async () => {
      try {
        const { data } = await axios.get("/api/election/survey", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) setSurveys(data.data);
      } catch (e) {
        console.error(e);
      }
    };
    loadSurveys();
  }, [token]);

  // सर्वे चुनने पर पूरी डिटेल लोड करें
  useEffect(() => {
    if (!selectedSurveyId || !token) return;
    const loadSurvey = async () => {
      try {
        const { data } = await axios.get(
          `/api/election/survey?id=${selectedSurveyId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (data.success) {
          setSurvey(data.data);
        } else {
          setSurvey(null);
        }
      } catch (e) {
        setSurvey(null);
      }
    };
    loadSurvey();
    setAnswers({});
    setSelectedVoterId("");
  }, [selectedSurveyId, token]);

  // जवाब बदलने पर
  const handleAnswerChange = (questionGlobalIndex, value) => {
    setAnswers((prev) => ({ ...prev, [questionGlobalIndex]: value }));
  };

  // सेव करें
const handleSave = async (e) => {
  e.preventDefault();
  if (!selectedSurveyId || !selectedVoterId) {
    return setError("Please select a survey and a voter.");
  }
  setSaving(true);
  setError("");
  try {
    // ✅ answers को array of { questionIndex, answer } में बदलें
    const answersArray = Object.entries(answers).map(([key, value]) => ({
      questionIndex: key,   // e.g., "0-0"
      answer: value,
    }));

    await axios.post(
      "/api/election/survey-response",
      {
        survey: selectedSurveyId,
        voter: selectedVoterId,
        answers: answersArray,   // अब array भेजें
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSuccess(true);
    setTimeout(() => {
      setSelectedVoterId("");
      setAnswers({});
      setSuccess(false);
    }, 2000);
  } catch (e) {
    setError(e.response?.data?.message || "Failed to save response");
  } finally { setSaving(false); }
};

  // सर्वे ऑप्शन
  const surveyOptions = surveys.map((s) => ({
    value: s._id,
    label: s.title,
  }));

  // सभी प्रश्न (questionGroups से फ़्लैट करें)
  const flattenedQuestions = survey
    ? (survey.questionGroups || []).flatMap((group, gIdx) =>
        (group.questions || []).map((q, qIdx) => ({
          ...q,
          globalIndex: `${gIdx}-${qIdx}`,
        }))
      )
    : [];

  // प्रश्न का इनपुट रेंडर करें
  const renderQuestionInput = (q) => {
    const { globalIndex, type, options = [] } = q;
    const value = answers[globalIndex] ?? "";

    switch (type) {
      case "SingleSelect":
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="">Select</option>
            {options.map((opt, i) => (
              <option key={i} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case "MultiSelect":
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {options.map((opt, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(opt)}
                  onChange={(e) => {
                    const newVal = e.target.checked
                      ? [...selectedValues, opt]
                      : selectedValues.filter((v) => v !== opt);
                    handleAnswerChange(globalIndex, newVal);
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {opt}
              </label>
            ))}
          </div>
        );

      case "Text":
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        );

      case "Rating":
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                type="button"
                key={star}
                onClick={() => handleAnswerChange(globalIndex, star)}
                className={`text-2xl transition-colors ${
                  value >= star ? "text-yellow-500" : "text-gray-300"
                }`}
              >
                ★
              </button>
            ))}
          </div>
        );

      case "Boolean":
        return (
          <select
            value={value}
            onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          >
            <option value="">Select</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        );

      case "Number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        );

      case "Date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
            className="w-full py-3 px-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-indigo-400"
          />
        );

      default:
        return (
          <p className="text-sm text-gray-400">Unknown question type: {type}</p>
        );
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
        Fill Survey
      </h1>

      <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl mb-4 text-sm">
            ✓ Response saved!
          </div>
        )}

        {/* Survey Selection */}
        <div className="mb-4">
          <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">
            Survey *
          </label>
          <SearchableSelect
            options={surveyOptions}
            value={selectedSurveyId}
            onChange={(val) => setSelectedSurveyId(val)}
            placeholder="Search survey..."
          />
        </div>

        {/* Voter Selection */}
        {survey && (
          <div className="mb-6">
            <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">
              Voter *
            </label>
            <AsyncVoterSelect
              token={token}
              onSelect={(voterId) => setSelectedVoterId(voterId)}
            />
          </div>
        )}

        {/* सभी प्रश्न */}
        {flattenedQuestions.length > 0 && (
          <div className="space-y-5 mb-6">
            {flattenedQuestions.map((q) => (
              <div key={q.globalIndex}>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  {q.questionText}{q.required ? " *" : ""}
                </p>
                <div className="w-full">{renderQuestionInput(q)}</div>
              </div>
            ))}
          </div>
        )}

        {survey && flattenedQuestions.length === 0 && (
          <p className="text-sm text-gray-400 italic mb-4">
            No questions in this survey.
          </p>
        )}

        {/* Submit Button */}
        {survey && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <FiSave className="text-base" />
            {saving ? "Saving..." : "Submit Response"}
          </button>
        )}
      </div>
    </div>
  );
}

// // app/(dashboard)/election/survey-response/page.js
// "use client";
// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useSearchParams } from "next/navigation";
// import { FiSave } from "react-icons/fi";
// import { SearchableSelect } from "@/components/SearchableSelect"; // अपना सही पथ डालें

// // ─── बाहर परिभाषित स्थायी Async Voter Select कम्पोनेंट ──────────────
// function AsyncVoterSelect({ token, onSelect }) {
//   const [query, setQuery] = useState("");
//   const [results, setResults] = useState([]);
//   const [showDropdown, setShowDropdown] = useState(false);
//   const [selected, setSelected] = useState(null);

//   const searchVoters = async (q) => {
//     if (!q || q.length < 2) {
//       setResults([]);
//       return;
//     }
//     try {
//       const { data } = await axios.get(
//         `/api/election/voter?search=${encodeURIComponent(q)}`,
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       if (data.success) setResults(data.data);
//     } catch {
//       setResults([]);
//     }
//   };

//   useEffect(() => {
//     const timeout = setTimeout(() => searchVoters(query), 300);
//     return () => clearTimeout(timeout);
//   }, [query]);

//   return (
//     <div className="relative">
//       <input
//         type="text"
//         placeholder={
//           selected
//             ? `${selected.firstName} ${selected.lastName}`
//             : "Search voter..."
//         }
//         value={query}
//         onChange={(e) => {
//           setQuery(e.target.value);
//           setShowDropdown(true);
//         }}
//         onFocus={() => setShowDropdown(true)}
//         className="w-full py-2.5 px-4 rounded-xl border border-gray-200 text-sm"
//       />
//       {showDropdown && results.length > 0 && (
//         <div className="absolute z-20 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-y-auto">
//           {results.map((v) => (
//             <div
//               key={v._id}
//               className="px-4 py-2 text-sm hover:bg-indigo-50 cursor-pointer"
//               onClick={() => {
//                 onSelect(v._id);
//                 setSelected(v);
//                 setQuery("");
//                 setShowDropdown(false);
//               }}
//             >
//               {v.firstName} {v.lastName} ({v.voterId || v.phone})
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── मुख्य पेज ─────────────────────────────────────────────────────────
// export default function SurveyResponsePage() {
//   const searchParams = useSearchParams();
//   const preselectedSurveyId = searchParams.get("surveyId");

//   const [surveys, setSurveys] = useState([]);
//   const [selectedSurveyId, setSelectedSurveyId] = useState(
//     preselectedSurveyId || ""
//   );
//   const [survey, setSurvey] = useState(null);
//   const [selectedVoterId, setSelectedVoterId] = useState("");
//   const [answers, setAnswers] = useState({});
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState(false);
//   const token =
//     typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // सभी सर्वे लोड करें
//   useEffect(() => {
//     if (!token) return;
//     const loadSurveys = async () => {
//       try {
//         const { data } = await axios.get("/api/election/survey", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (data.success) setSurveys(data.data);
//       } catch (e) {
//         console.error(e);
//       }
//     };
//     loadSurveys();
//   }, [token]);

//   // सर्वे चुनने पर पूरी डिटेल लोड करें
//   useEffect(() => {
//     if (!selectedSurveyId || !token) return;
//     const loadSurvey = async () => {
//       try {
//         const { data } = await axios.get(
//           `/api/election/survey?id=${selectedSurveyId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         if (data.success) {
//           setSurvey(data.data);
//         } else {
//           setSurvey(null);
//         }
//       } catch (e) {
//         setSurvey(null);
//       }
//     };
//     loadSurvey();
//     setAnswers({});
//     setSelectedVoterId("");
//   }, [selectedSurveyId, token]);

//   // जवाब बदलने पर
//   const handleAnswerChange = (questionGlobalIndex, value) => {
//     setAnswers((prev) => ({ ...prev, [questionGlobalIndex]: value }));
//   };

//   // सेव करें
//   const handleSave = async (e) => {
//     e.preventDefault();
//     if (!selectedSurveyId || !selectedVoterId) {
//       return setError("Please select a survey and a voter.");
//     }
//     setSaving(true);
//     setError("");
//     try {
//       await axios.post(
//         "/api/election/survey-response",
//         {
//           survey: selectedSurveyId,
//           voter: selectedVoterId,
//           answers,
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setSuccess(true);
//       setTimeout(() => {
//         setSelectedVoterId("");
//         setAnswers({});
//         setSuccess(false);
//       }, 2000);
//     } catch (e) {
//       setError(e.response?.data?.message || "Failed to save response");
//     } finally {
//       setSaving(false);
//     }
//   };

//   // सर्वे ऑप्शन
//   const surveyOptions = surveys.map((s) => ({
//     value: s._id,
//     label: s.title,
//   }));

//   // सभी प्रश्न (questionGroups से फ़्लैट करें)
//   const flattenedQuestions = survey
//     ? (survey.questionGroups || []).flatMap((group, gIdx) =>
//         (group.questions || []).map((q, qIdx) => ({
//           ...q,
//           globalIndex: `${gIdx}-${qIdx}`,
//         }))
//       )
//     : [];

//   // प्रश्न का इनपुट रेंडर करें
//   const renderQuestionInput = (q) => {
//     const { globalIndex, type, options = [] } = q;
//     const value = answers[globalIndex] ?? "";

//     switch (type) {
//       case "SingleSelect":
//         return (
//           <select
//             value={value}
//             onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
//             className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm"
//           >
//             <option value="">Select</option>
//             {options.map((opt, i) => (
//               <option key={i} value={opt}>
//                 {opt}
//               </option>
//             ))}
//           </select>
//         );

//       case "MultiSelect":
//         const selectedValues = Array.isArray(value) ? value : [];
//         return (
//           <div className="space-y-1">
//             {options.map((opt, i) => (
//               <label key={i} className="flex items-center gap-2 text-sm">
//                 <input
//                   type="checkbox"
//                   checked={selectedValues.includes(opt)}
//                   onChange={(e) => {
//                     const newVal = e.target.checked
//                       ? [...selectedValues, opt]
//                       : selectedValues.filter((v) => v !== opt);
//                     handleAnswerChange(globalIndex, newVal);
//                   }}
//                   className="rounded border-gray-300 text-indigo-600"
//                 />
//                 {opt}
//               </label>
//             ))}
//           </div>
//         );

//       case "Text":
//         return (
//           <input
//             type="text"
//             value={value}
//             onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
//             className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm"
//           />
//         );

//       case "Rating":
//         return (
//           <div className="flex gap-1">
//             {[1, 2, 3, 4, 5].map((star) => (
//               <button
//                 type="button"
//                 key={star}
//                 onClick={() => handleAnswerChange(globalIndex, star)}
//                 className={`text-xl ${
//                   value >= star ? "text-yellow-500" : "text-gray-300"
//                 }`}
//               >
//                 ★
//               </button>
//             ))}
//           </div>
//         );

//       case "Boolean":
//         return (
//           <select
//             value={value}
//             onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
//             className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm"
//           >
//             <option value="">Select</option>
//             <option value="true">Yes</option>
//             <option value="false">No</option>
//           </select>
//         );

//       case "Number":
//         return (
//           <input
//             type="number"
//             value={value}
//             onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
//             className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm"
//           />
//         );

//       case "Date":
//         return (
//           <input
//             type="date"
//             value={value}
//             onChange={(e) => handleAnswerChange(globalIndex, e.target.value)}
//             className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm"
//           />
//         );

//       default:
//         return (
//           <p className="text-sm text-gray-400">Unknown question type: {type}</p>
//         );
//     }
//   };

//   return (
//     <div className="max-w-2xl mx-auto">
//       <h1 className="text-2xl font-extrabold text-gray-900 mb-6">
//         Fill Survey
//       </h1>

//       <div className="bg-white rounded-2xl p-6 shadow-sm border">
//         {error && (
//           <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
//             {error}
//           </div>
//         )}
//         {success && (
//           <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl mb-4 text-sm">
//             ✓ Response saved!
//           </div>
//         )}

//         {/* Survey Selection */}
//         <div className="mb-4">
//           <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">
//             Survey *
//           </label>
//           <SearchableSelect
//             options={surveyOptions}
//             value={selectedSurveyId}
//             onChange={(val) => setSelectedSurveyId(val)}
//             placeholder="Search survey..."
//           />
//         </div>

//         {/* Voter Selection – अब स्थायी कम्पोनेंट से */}
//         {survey && (
//           <div className="mb-6">
//             <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">
//               Voter *
//             </label>
//             <AsyncVoterSelect
//               token={token}
//               onSelect={(voterId) => setSelectedVoterId(voterId)}
//             />
//           </div>
//         )}

//         {/* सभी प्रश्न */}
//         {flattenedQuestions.length > 0 && (
//           <div className="space-y-4 mb-6">
//             {flattenedQuestions.map((q) => (
//               <div key={q.globalIndex}>
//                 <p className="text-sm font-semibold text-gray-700 mb-1">
//                   {q.questionText}{q.required ? " *" : ""}
//                 </p>
//                 {renderQuestionInput(q)}
//               </div>
//             ))}
//           </div>
//         )}

//         {survey && flattenedQuestions.length === 0 && (
//           <p className="text-sm text-gray-400 italic mb-4">
//             No questions in this survey.
//           </p>
//         )}

//         {/* Submit Button */}
//         {survey && (
//           <button
//             onClick={handleSave}
//             disabled={saving}
//             className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
//           >
//             <FiSave /> {saving ? "Saving..." : "Submit Response"}
//           </button>
//         )}
//       </div>
//     </div>
//   );
// }