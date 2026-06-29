"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import {
  Play,
  Square,
  Save,
  Check,
  ArrowLeft,
  Clock,
  Car,
  Activity,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const formatTime = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m
    .toString()
    .padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("en-IN") : "-";

export default function JobCardPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Activity className="animate-spin h-10 w-10 text-sky-600" />
        </div>
      }
    >
      <JobCardPage />
    </Suspense>
  );
}

function JobCardPage() {
  const searchParams = useSearchParams();
  const productionOrderId = searchParams.get("productionOrderId");
  const router = useRouter();

  const [token, setToken] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const [editableData, setEditableData] = useState({});
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionState, setActionState] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState({});

  const intervalRefs = useRef({});

  // ── Token ─────────────────────────────────────────────
  useEffect(() => {
    const tk = localStorage.getItem("token");
    if (tk) setToken(tk);
  }, []);

  // ── Fetch Job Cards ──────────────────────────────────
  useEffect(() => {
    // If productionOrderId is missing → show error, stop loading
    if (!productionOrderId) {
      setError("Missing Production Order ID. Please provide a valid ?productionOrderId=… in the URL.");
      setLoading(false);
      return;
    }
    if (!token) {
      setError("Authentication token not found. Please log in again.");
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await axios.get(
          `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
          { headers: { Authorization: `Bearer ${token}` }, signal }
        );
        const cards = res.data?.data || [];
        setJobCards(cards);

        const initEditable = {};
        const initTimers = {};
        const initExpanded = {};
        cards.forEach((jc) => {
          initEditable[jc._id] = {
            completedQty: jc.completedQty || 0,
            status: jc.status || "planned",
            actualStartDate: jc.actualStartDate ? new Date(jc.actualStartDate) : null,
            actualEndDate: jc.actualEndDate ? new Date(jc.actualEndDate) : null,
            expectedStartDate: jc.expectedStartDate ? new Date(jc.expectedStartDate) : null,
            expectedEndDate: jc.expectedEndDate ? new Date(jc.expectedEndDate) : null,
          };
          initTimers[jc._id] = {
            seconds: Number(jc.totalDuration) || 0,
            running: jc.status === "in progress",
          };
          initExpanded[jc._id] = false;
        });
        setEditableData(initEditable);
        setTimers(initTimers);
        setExpandedIds(initExpanded);
      } catch (err) {
        if (err.name !== "CanceledError") {
          toast.error("Failed to fetch job cards");
          setError("Failed to fetch job cards");
        }
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [productionOrderId, token]);

  // ── Timer effect ──────────────────────────────────────
  useEffect(() => {
    Object.keys(timers).forEach((id) => {
      const t = timers[id];
      if (t.running && !intervalRefs.current[id]) {
        intervalRefs.current[id] = setInterval(() => {
          setTimers((prev) => {
            if (prev[id]?.running) {
              return { ...prev, [id]: { ...prev[id], seconds: (prev[id].seconds || 0) + 1 } };
            }
            return prev;
          });
        }, 1000);
      } else if (!t.running && intervalRefs.current[id]) {
        clearInterval(intervalRefs.current[id]);
        delete intervalRefs.current[id];
      }
    });
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
      intervalRefs.current = {};
    };
  }, [timers]);

  // ─── API helpers (query-param based) ───────────────
  const updateJobCard = async (id, payload) => {
    try {
      const res = await axios.put(`/api/ppc/jobcards?id=${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobCards((prev) => prev.map((j) => (j._id === id ? res.data.data : j)));
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    }
  };

  const startJob = async (id) => {
    try {
      setActionState((prev) => ({ ...prev, [id]: "starting" }));
      await axios.patch(`/api/ppc/jobcards?id=${id}&action=start`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const now = new Date();
      handleDataChange(id, "status", "in progress");
      if (!editableData[id]?.actualStartDate) handleDataChange(id, "actualStartDate", now);
      setTimers((prev) => ({ ...prev, [id]: { ...prev[id], running: true } }));
      toast.success("Started");
    } catch (err) {
      toast.error(err.response?.data?.message || "Start failed");
    } finally {
      setActionState((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const pauseJob = async (id) => {
    try {
      setActionState((prev) => ({ ...prev, [id]: "pausing" }));
      const now = new Date();
      handleDataChange(id, "status", "on_hold");
      handleDataChange(id, "actualEndDate", now);
      setTimers((prev) => ({ ...prev, [id]: { ...prev[id], running: false } }));
      await updateJobCard(id, {
        status: "on_hold",
        actualEndDate: now,
        totalDuration: timers[id]?.seconds || 0,
      });
      toast.warn("Paused");
    } catch (err) {
      toast.error(err.response?.data?.message || "Pause failed");
    } finally {
      setActionState((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const saveProgress = async (id, allowedQty) => {
    const data = editableData[id];
    if (data.completedQty > allowedQty) {
      toast.error(`Cannot exceed allowed qty (${allowedQty})`);
      return;
    }
    try {
      setActionState((prev) => ({ ...prev, [id]: "saving" }));
      await updateJobCard(id, {
        completedQty: data.completedQty,
        totalDuration: timers[id]?.seconds || 0,
      });
      toast.success("Saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setActionState((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const completeJob = async (id, allowedQty) => {
    const data = editableData[id];
    if (data.completedQty > allowedQty) {
      toast.error(`Cannot exceed allowed qty (${allowedQty})`);
      return;
    }
    try {
      setActionState((prev) => ({ ...prev, [id]: "completing" }));
      setTimers((prev) => ({ ...prev, [id]: { ...prev[id], running: false } }));
      handleDataChange(id, "status", "completed");
      await updateJobCard(id, {
        completedQty: data.completedQty,
        status: "completed",
        totalDuration: timers[id]?.seconds || 0,
      });
      toast.success("Completed");
    } catch (err) {
      toast.error(err.response?.data?.message || "Complete failed");
    } finally {
      setActionState((prev) => ({ ...prev, [id]: undefined }));
    }
  };

  const handleDataChange = (id, field, value) => {
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ── Filter cards ──────────────────────────────────────
  const filteredCards = jobCards.filter((jc) =>
    [jc.jobCardNo, jc.operation?.name, jc.machine?.name, jc.operator?.name]
      .some((s) => (s || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // ── Loading / Error states ───────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-10 shadow-sm max-w-md">
          <Car className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cannot load workflow</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6f9] flex items-center justify-center">
        <Activity className="animate-spin h-10 w-10 text-sky-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f4f6f9] py-8 px-4 sm:px-10">
      <ToastContainer position="bottom-right" theme="colored" />
      <div className="max-w-5xl mx-auto">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
                <Layers className="h-6 w-6 text-sky-600" />
                Job Card Workflow
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Live production tracking &amp; control
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-50 outline-none w-64 transition-all"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button
              onClick={() =>
                router.push(
                  `/admin/ppc/jobcards/jobcardlists?productionOrderId=${productionOrderId}`
                )
              }
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all"
            >
              <Layers className="h-4 w-4" />
              List View
            </button>
          </div>
        </div>

        {/* ── Workflow Cards ── */}
        <div className="space-y-5">
          {filteredCards.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
              <Car className="mx-auto h-12 w-12 text-gray-300 mb-4" />
              <p className="text-sm font-medium text-gray-500">No job cards found</p>
              <p className="text-xs text-gray-400 mt-1">Adjust your search.</p>
            </div>
          ) : (
            filteredCards.map((jc, idx) => {
              const data = editableData[jc._id] || {};
              const timer = timers[jc._id] || { seconds: 0, running: false };
              const isExpanded = expandedIds[jc._id] || false;
              const isStarting = actionState[jc._id] === "starting";
              const isPausing = actionState[jc._id] === "pausing";
              const isSaving = actionState[jc._id] === "saving";
              const isCompleting = actionState[jc._id] === "completing";

              let allowedQty = 0,
                isCardActive = false,
                isPrevCardStarted = false;
              if (idx === 0) {
                allowedQty = jc.qtyToManufacture;
                isCardActive = data.status !== "completed";
                isPrevCardStarted = true;
              } else {
                const prevData = editableData[jobCards[idx - 1]._id] || {};
                const prevDone = prevData.completedQty || 0;
                allowedQty = prevDone;
                isPrevCardStarted = prevDone > 0;
                isCardActive = isPrevCardStarted && data.status !== "completed";
              }

              const progressPercent = Math.min(
                ((data.completedQty || 0) / (allowedQty || 1)) * 100,
                100
              );
              const progressColor =
                progressPercent >= 100
                  ? "bg-emerald-500"
                  : progressPercent > 0
                  ? "bg-amber-500"
                  : "bg-gray-300";

              return (
                <div
                  key={jc._id}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm transition-all ${
                    !isPrevCardStarted && idx > 0
                      ? "opacity-60 pointer-events-none"
                      : ""
                  }`}
                >
                  {/* Header */}
                  <div
                    onClick={() => toggleExpand(jc._id)}
                    className="flex items-center justify-between p-5 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center text-sky-700 font-extrabold text-sm">
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">
                          {jc.operation?.name || "Unnamed"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {jc.machine?.name || "—"} &middot;{" "}
                          {jc.operator?.name || "—"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      {timer.running && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-full">
                          <Clock className="h-3.5 w-3.5" />
                          {formatTime(timer.seconds)}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Expandable section */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      isExpanded ? "max-h-[700px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
                    }`}
                  >
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
                      {/* Progress bar with car */}
                      <div>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span className="font-bold">{progressPercent}%</span>
                        </div>
                        <div className="relative w-full bg-gray-200 h-4 rounded-full overflow-visible">
                          <div
                            className={`h-full rounded-full transition-all duration-700 relative ${progressColor}`}
                            style={{ width: `${progressPercent}%` }}
                          >
                            {progressPercent > 0 && (
                              <div className="absolute -top-1.5 right-0 transform translate-x-1/2">
                                <Car className="h-5 w-5 text-gray-700 drop-shadow" />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats grid */}
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-gray-400">To Manufacture</span>
                          <p className="font-bold text-gray-900">{jc.qtyToManufacture}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Allowed Qty</span>
                          <p className="font-bold text-sky-600">{allowedQty}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Completed</span>
                          <p className="font-bold text-gray-900">{data.completedQty || 0}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Duration</span>
                          <p className="font-bold text-gray-900 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {formatTime(timer.seconds)}
                          </p>
                        </div>
                      </div>

                      {/* Editable quantity input */}
                      <div>
                        <input
                          type="number"
                          min={0}
                          max={allowedQty}
                          value={data.completedQty}
                          disabled={!isCardActive}
                          onChange={(e) =>
                            handleDataChange(jc._id, "completedQty", Number(e.target.value))
                          }
                          className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm font-bold focus:border-sky-500 focus:ring-2 focus:ring-sky-50 outline-none disabled:bg-gray-100 transition-all"
                          placeholder="Enter completed quantity"
                        />
                      </div>

                      {/* Dates */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400">Started</span>
                          <p className="font-medium">{formatDateTime(data.actualStartDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Ended</span>
                          <p className="font-medium">{formatDateTime(data.actualEndDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Expected Start</span>
                          <p className="font-medium">{formatDateTime(data.expectedStartDate)}</p>
                        </div>
                        <div>
                          <span className="text-gray-400">Expected End</span>
                          <p className="font-medium">{formatDateTime(data.expectedEndDate)}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => startJob(jc._id)}
                          disabled={
                            !isCardActive ||
                            data.status === "completed" ||
                            timer.running ||
                            isStarting
                          }
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 disabled:opacity-50 transition-all"
                        >
                          {isStarting ? (
                            <Activity className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                          {timer.running ? "Running" : "Start"}
                        </button>
                        <button
                          onClick={() => pauseJob(jc._id)}
                          disabled={!timer.running || isPausing}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 transition-all"
                        >
                          {isPausing ? (
                            <Activity className="h-4 w-4 animate-spin" />
                          ) : (
                            <Square className="h-4 w-4" />
                          )}
                          Pause
                        </button>
                        <button
                          onClick={() => saveProgress(jc._id, allowedQty)}
                          disabled={
                            !isCardActive ||
                            data.status === "completed" ||
                            isSaving
                          }
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-all"
                        >
                          {isSaving ? (
                            <Activity className="h-4 w-4 animate-spin" />
                          ) : (
                            <Save className="h-4 w-4" />
                          )}
                          Save
                        </button>
                        <button
                          onClick={() => completeJob(jc._id, allowedQty)}
                          disabled={
                            !isCardActive ||
                            data.status === "completed" ||
                            isCompleting
                          }
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 transition-all"
                        >
                          {isCompleting ? (
                            <Activity className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                          Complete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}