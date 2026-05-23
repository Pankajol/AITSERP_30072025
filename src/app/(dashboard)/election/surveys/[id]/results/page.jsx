// app/(dashboard)/election/surveys/[id]/results/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { FiArrowLeft } from "react-icons/fi";

export default function SurveyResultsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [responses, setResponses] = useState([]);
  const [survey, setSurvey] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        // सर्वे की डिटेल लोड करें
        const surveyRes = await axios.get(`/api/election/survey?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (surveyRes.data.success) setSurvey(surveyRes.data.data);

        // सारे रिस्पॉन्स लोड करें
        const responseRes = await axios.get(
          `/api/election/survey-response?survey=${id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (responseRes.data.success) setResponses(responseRes.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, token]);

  // सवालों की फ़्लैट लिस्ट (questionGroups से)
  const flattenedQuestions = survey
    ? (survey.questionGroups || []).flatMap((group, gIdx) =>
        (group.questions || []).map((q, qIdx) => ({
          ...q,
          globalIndex: `${gIdx}-${qIdx}`,
        }))
      )
    : [];

  if (loading) return <div className="text-center py-20">Loading results...</div>;
  if (!survey) return <div className="text-center py-20 text-gray-400">Survey not found</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-4"
      >
        <FiArrowLeft /> Back to Surveys
      </button>
      <h1 className="text-2xl font-extrabold text-gray-900 mb-2">{survey.title}</h1>
      <p className="text-sm text-gray-500 mb-6">{survey.description}</p>

      {/* स्टैट्स कार्ड्स */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-xs font-bold uppercase text-gray-400">Total Responses</p>
          <p className="text-2xl font-bold text-indigo-600">{responses.length}</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center text-gray-400 shadow-sm border">
          No responses yet.
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">#</th>
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Voter</th>
                {flattenedQuestions.map((q) => (
                  <th
                    key={q.globalIndex}
                    className="px-4 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400"
                  >
                    {q.questionText.length > 20
                      ? q.questionText.substring(0, 20) + "..."
                      : q.questionText}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-[10.5px] font-bold uppercase text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((resp, idx) => (
                <tr key={resp._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {resp.voter?.firstName?.[0] || "?"}
                      </div>
                      <span className="font-medium text-gray-800 text-xs">
                        {resp.voter
                          ? `${resp.voter.firstName} ${resp.voter.lastName || ""}`
                          : "Unknown"}
                      </span>
                    </div>
                  </td>
                  {flattenedQuestions.map((q) => {
                    // ✅ array से जवाब खोजें
                    const ansObj = (resp.answers || []).find(
                      (a) => a.questionIndex === q.globalIndex
                    );
                    const ans = ansObj ? ansObj.answer : null;
                    return (
                      <td key={q.globalIndex} className="px-4 py-3 text-xs text-gray-600">
                        {Array.isArray(ans) ? ans.join(", ") : ans ?? "—"}
                      </td>
                    );
                  })}
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(resp.submittedAt || resp.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}