"use client";
import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { FiPlus, FiTrash2, FiEdit2, FiSearch, FiClipboard, FiX, FiExternalLink } from "react-icons/fi";
import Link from "next/link";

export default function SurveysPage() {
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchSurveys = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const { data } = await axios.get("/api/election/survey", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSurveys(data.success ? data.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSurveys(); }, [token]);

  const handleDelete = async (id) => {
    if (!confirm("Delete this survey?")) return;
    await axios.delete(`/api/election/survey?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setSurveys(prev => prev.filter(s => s._id !== id));
  };

  const filtered = useMemo(
    () => surveys.filter(s =>
      !search.trim() ||
      s.title?.toLowerCase().includes(search.toLowerCase())
    ),
    [surveys, search]
  );

  return (
    <div className="max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Surveys</h1>
          <p className="text-sm text-gray-400 mt-0.5">{surveys.length} records</p>
        </div>
        <Link href="/election/surveys/create" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-200">
          <FiPlus className="text-base" /> Create Survey
        </Link>
      </div>

      <div className="relative mb-5 max-w-sm">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-sm" />
        <input className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-300 transition-all"
          value={search} onChange={e => setSearch(e.target.value)} placeholder="Search surveys..." />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-4 w-28 bg-gray-200 rounded mb-2" />
              <div className="h-3 w-36 bg-gray-100 rounded mb-3" />
              <div className="flex gap-1.5">
                {[1,2].map(j => <div key={j} className="h-5 w-16 bg-gray-100 rounded-full" />)}
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <FiClipboard className="text-3xl text-indigo-300" />
          </div>
          <p className="text-gray-400 font-medium">{search ? "No matches" : "No surveys yet"}</p>
          {!search && <p className="text-sm text-gray-300 mt-1">Click "Create Survey" to get started</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(survey => (
            <div key={survey._id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all group">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-base font-bold text-gray-900">{survey.title}</h3>
                  <p className="text-xs text-gray-400">{survey.constituency?.name || "General"}</p>
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Link href={`/election/surveys/${survey._id}`} className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-100">
                    <FiExternalLink className="text-xs" />
                  </Link>
                  <button onClick={() => handleDelete(survey._id)} className="w-7 h-7 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                    <FiTrash2 className="text-xs" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold border ${
                  survey.status === "Active" ? "bg-green-50 text-green-600 border-green-200" :
                  survey.status === "Completed" ? "bg-blue-50 text-blue-600 border-blue-200" :
                  "bg-gray-50 text-gray-500 border-gray-200"}`}>
                  {survey.status}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 text-purple-600 border border-purple-100">
                  {survey.assignedWorkers?.length || 0} workers
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}