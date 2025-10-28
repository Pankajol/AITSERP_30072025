"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import {
  Play,
  Square,
  Check,
  Save,
  ArrowLeft,
  Clock,
  Truck,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { motion } from "framer-motion";
// We don't need to import the CSS here if it's handled globally in your project
// import "react-toastify/dist/ReactToastify.css";

// JWT decode helper
const jwtDecode = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

// Format seconds
const formatTime = (seconds = 0) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(
    2,
    "0"
  )}:${String(secs).padStart(2, "0")}`;
};

export default function JobCardPage() {
  const [jobCards, setJobCards] = useState([]);
  const [editableData, setEditableData] = useState({});
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const timersRef = useRef({});
  const intervalsRef = useRef({});

  // Decode JWT token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      toast.error("You are not authenticated.");
      return;
    }
    const user = jwtDecode(token);
    if (!user) {
      setLoading(false);
      toast.error("Invalid session.");
      return;
    }
    setCurrentUser(user);
  }, []);

  // Fetch job cards assigned to current user
  useEffect(() => {
    if (!currentUser) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchJobCards = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/ppc/jobcards", {
          headers: { Authorization: `Bearer ${token}` },
          signal: signal,
        });
        const allCards = res.data?.data || [];
        // Filter cards assigned to the current operator
        const myCards = allCards.filter(
          (c) => c.operator?.employeeId === currentUser.id
        );

        const editable = {};
        myCards.forEach((c) => {
          editable[c._id] = {
            completedQty: c.completedQty ?? 0,
            status: c.status ?? "planned",
            actualStartDate: c.actualStartDate
              ? new Date(c.actualStartDate)
              : null,
            actualEndDate: c.actualEndDate ? new Date(c.actualEndDate) : null,
          };
          timersRef.current[c._id] = c.totalDuration ?? 0;
          // If card is "in progress" from fetch, start its timer
          if (c.status === "in progress") {
            startTimer(c._id);
          }
        });

        setJobCards(myCards);
        setEditableData(editable);
      } catch (err) {
        if (err.name !== "CanceledError") {
          toast.error("Failed to load job cards");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };
    fetchJobCards();

    // Cleanup intervals on unmount
    return () => {
      controller.abort();
      Object.values(intervalsRef.current).forEach(clearInterval);
      intervalsRef.current = {};
    };
  }, [currentUser]);

  // Update Job Card on server
  const updateJobCard = useCallback(async (id, payload) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Update jobCards and editableData with returned data
      const updated = res.data.data;
      setJobCards((prev) =>
        prev.map((jc) => (jc._id === id ? updated : jc))
      );

      setEditableData((prev) => ({
        ...prev,
        [id]: {
          completedQty: updated.completedQty ?? 0,
          status: updated.status ?? "planned",
          actualStartDate: updated.actualStartDate
            ? new Date(updated.actualStartDate)
            : null,
          actualEndDate: updated.actualEndDate
            ? new Date(updated.actualEndDate)
            : null,
        },
      }));

      timersRef.current[id] = updated.totalDuration ?? 0;
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed!");
      return false;
    }
  }, []);

  // Start timer
  const startTimer = (id) => {
    if (intervalsRef.current[id]) return; // Already running
    intervalsRef.current[id] = setInterval(() => {
      timersRef.current[id] = (timersRef.current[id] ?? 0) + 1;
      // Force re-render by updating state
      setEditableData((prev) => ({ ...prev }));
    }, 1000);
  };

  // Stop timer
  const stopTimer = (id) => {
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      intervalsRef.current[id] = null; // Use null to show it's stopped
    }
  };

  // Handlers
  const handleStart = async (id) => {
    const local = editableData[id];
    const startDate = local.actualStartDate || new Date();
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "in progress", actualStartDate: startDate },
    }));
    startTimer(id);
    await updateJobCard(id, {
      status: "in progress",
      actualStartDate: startDate,
    });
    toast.info("Timer started");
  };

  const handleStop = async (id) => {
    const now = new Date();
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "on_hold", actualEndDate: now },
    }));
    stopTimer(id);
    await updateJobCard(id, {
      status: "on_hold",
      actualEndDate: now,
      totalDuration: timersRef.current[id],
    });
    toast.warn("Timer paused");
  };

  const handleSave = async (id, allowedQty) => {
    const local = editableData[id];
    const completedQty = Number(local.completedQty ?? 0);

    // --- VALIDATION ADDED ---
    if (completedQty > allowedQty) {
      toast.error(`Completed Qty (${completedQty}) cannot exceed Allowed Qty (${allowedQty})`);
      return;
    }

    const success = await updateJobCard(id, {
      completedQty: completedQty,
      totalDuration: timersRef.current[id],
      actualStartDate: local.actualStartDate,
      actualEndDate: local.actualEndDate,
      status: local.status,
    });
    
    if (success) {
      toast.success("Save successful!");
    }
  };

  const handleComplete = async (id, allowedQty) => {
    const local = editableData[id];
    const completedQty = Number(local.completedQty ?? 0);

    // --- VALIDATION ADDED ---
    if (completedQty > allowedQty) {
      toast.error(`Completed Qty (${completedQty}) cannot exceed Allowed Qty (${allowedQty})`);
      return;
    }
    if (completedQty < allowedQty) {
      toast.warn(`Warning: Completing with ${completedQty} / ${allowedQty} items.`);
    }

    const now = new Date();
    stopTimer(id);
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "completed", actualEndDate: now },
    }));
    await updateJobCard(id, {
      status: "completed",
      actualEndDate: now,
      totalDuration: timersRef.current[id],
      completedQty: completedQty, // Ensure completedQty is saved on completion
    });
    toast.success("Marked as completed!");
  };

  const handleInputChange = (id, field, value) => {
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  if (loading)
    return <div className="p-6 text-center text-gray-600">Loading...</div>;

  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Truck size={24} /> My Assigned Job Cards
            </h2>
            <button
              onClick={() =>
                (window.location.href = "/admin/ppc/production-orders")
              }
              className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Orders
            </button>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {jobCards.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                No job cards assigned.
              </div>
            )}

            {jobCards.map((jc, idx) => {
              const id = jc._id;
              const local = editableData[id] || {};
              const status = local.status ?? "planned";
              const completedQty = Number(local.completedQty ?? 0);
              const qtyToManufacture = jc.qtyToManufacture ?? 0;

              // --- RE-INTEGRATED FLOW LOGIC ---
              let allowedQty = 0;
              let isCardActive = false;
              let isPrevCardStarted = false; // For dimming logic

              if (idx === 0) {
                // First card is always active (unless completed)
                allowedQty = qtyToManufacture;
                isCardActive = status !== "completed";
                isPrevCardStarted = true; // Always allow first card
              } else {
                // Subsequent cards
                const prevCardData = editableData[jobCards[idx - 1]._id] || {};
                const prevCardCompletedQty = prevCardData.completedQty || 0;

                // This card's allowed qty is the previous card's completed qty
                allowedQty = prevCardCompletedQty;

                // Activate if the previous card has completed ANY quantity (> 0)
                isPrevCardStarted = prevCardCompletedQty > 0;

                // This card is active if the previous one has started AND this one isn't complete
                isCardActive = isPrevCardStarted && status !== "completed";
              }
              // --- END FLOW LOGIC ---

              const progressPercent =
                allowedQty > 0
                  ? Math.min((completedQty / allowedQty) * 100, 100)
                  : 0;

              return (
                <div
                  key={id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden transition-opacity ${
                    !isPrevCardStarted && idx > 0 // Dim if previous card hasn't started
                      ? "opacity-60 bg-gray-50"
                      : ""
                  }`}
                >
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">
                        {idx + 1}. {jc.operation?.name || "N/A"}
                      </h3>
                      <p className="text-sm font-semibold text-purple-700">
                        Order: {jc.productionOrder?.orderNumber || "N/A"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Machine: {jc.machine?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start:{" "}
                        {local.actualStartDate
                          ? new Date(local.actualStartDate).toLocaleString()
                          : "-"}{" "}
                        | End:{" "}
                        {local.actualEndDate
                          ? new Date(local.actualEndDate).toLocaleString()
                          : "-"}
                      </p>

                      <div className="relative w-full bg-gray-200 h-3 rounded-full mt-3 overflow-visible">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${
                            progressPercent >= 100
                              ? "bg-green-500"
                              : progressPercent > 0
                              ? "bg-yellow-400"
                              : "bg-gray-300"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>

                        <motion.div
                          className="absolute -top-4"
                          initial={{ x: 0 }}
                          animate={{ x: `${progressPercent}%` }}
                          transition={{ ease: "linear", duration: 0.5 }}
                          style={{
                            // Ensures the truck doesn't go past the 100% mark
                            x: `calc(${progressPercent}% - ${progressPercent / 100 * 20}px)` 
                          }}
                        >
                          <Truck size={20} className="text-gray-700" />
                        </motion.div>
                      </div>
                    </div>

                    <div>
                      <span
                        className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
                          status === "planned"
                            ? "bg-gray-200 text-gray-800"
                            : status === "in progress"
                            ? "bg-blue-200 text-blue-800 animate-pulse"
                            : status === "on_hold"
                            ? "bg-yellow-200 text-yellow-800"
                            : status === "completed"
                            ? "bg-green-200 text-green-800"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm text-gray-500">To Manufacture</p>
                      <p className="font-semibold">{qtyToManufacture}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Allowed Qty</p>
                      <p className="font-semibold text-blue-700">
                        {allowedQty}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Completed Qty</p>
                      <input
                        type="number"
                        min={0}
                        value={local.completedQty ?? 0}
                        onChange={(e) =>
                          handleInputChange(id, "completedQty", Number(e.target.value))
                        }
                        className={`mt-1 border rounded-md px-2 py-1 w-full ${
                          !isCardActive ? "bg-gray-100 cursor-not-allowed" : ""
                        }`}
                        disabled={!isCardActive}
                      />
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Total Duration</p>
                      <div className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Clock size={16} />{" "}
                        {formatTime(timersRef.current[id] ?? 0)}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleStart(id)}
                        disabled={!isCardActive || status === "in progress"}
                        className="px-3 py-1 rounded flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play size={16} /> Start
                      </button>
                      <button
                        onClick={() => handleStop(id)}
                        disabled={status !== "in progress"}
                        className="px-3 py-1 rounded flex items-center gap-1 bg-yellow-500 text-white hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Square size={16} /> Stop
                      </button>
                      <button
                        onClick={() => handleSave(id, allowedQty)}
                        disabled={!isCardActive}
                        className="px-3 py-1 rounded flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Save size={16} /> Save
                      </button>
                      <button
                        onClick={() => handleComplete(id, allowedQty)}
                        disabled={!isCardActive}
                        className="px-3 py-1 rounded flex items-center gap-1 bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check size={16} /> Complete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}




// "use client";

// import React, { useState, useEffect, useRef } from "react";
// import axios from "axios";
// import {
//   Play,
//   Square,
//   Check,
//   Save,
//   ArrowLeft,
//   Clock,
//   Car,
// } from "lucide-react";
// import { ToastContainer, toast } from "react-toastify";
// // import "react-toastify/dist/ReactToastify.css"; // Removed this line to fix the build error

// const formatTime = (seconds) => {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;
//   return `${hrs.toString().padStart(2, "0")}:${mins
//     .toString()
//     .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// };

// const formatDateTime = (date) =>
//   date ? new Date(date).toLocaleString() : "-";

// export default function JobCardPage() {
//   const [productionOrderId, setProductionOrderId] = useState("");
//   const [jobCards, setJobCards] = useState([]);
//   const [editableData, setEditableData] = useState({});
//   const [timers, setTimers] = useState({});
//   const [loading, setLoading] = useState(true);
//   const intervalRefs = useRef({});

//   // Fetch Production Order ID
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     setProductionOrderId(params.get("productionOrderId") || "");
//   }, []);

//   // Fetch Job Cards (with AbortController for safety)
//   useEffect(() => {
//     if (!productionOrderId) return;

//     const controller = new AbortController();
//     const signal = controller.signal;

//     const fetchData = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         const res = await axios.get(
//           `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
//           {
//             headers: { Authorization: `Bearer ${token}` },
//             signal: signal, // Pass signal to axios
//           }
//         );
//         const cards = res.data?.data || [];
//         setJobCards(cards);

//         const initEditable = {};
//         const initTimers = {};
//         cards.forEach((jc) => {
//           initEditable[jc._id] = {
//             completedQty: jc.completedQty || 0,
//             status: jc.status || "planned",
//             actualStartDate: jc.actualStartDate
//               ? new Date(jc.actualStartDate)
//               : null,
//             actualEndDate: jc.actualEndDate
//               ? new Date(jc.actualEndDate)
//               : null,
//           };
//           // IMPORTANT: Set running state from fetch
//           initTimers[jc._id] = {
//             seconds: Number(jc.totalDuration) || 0,
//             running: jc.status === "in progress",
//           };
//         });
//         setEditableData(initEditable);
//         setTimers(initTimers);
//       } catch (err) {
//         if (err.name === "CanceledError") {
//           // console.log('Fetch canceled');
//         } else {
//           toast.error("Failed to fetch job cards");
//         }
//       } finally {
//         if (!signal.aborted) {
//           setLoading(false);
//         }
//       }
//     };

//     fetchData();

//     // Cleanup function
//     return () => {
//       controller.abort(); // Abort fetch on unmount/re-run
//     };
//   }, [productionOrderId]);

//   // ---- NEW: Central Timer Management Effect ----
//   // This useEffect is now the *only* place timers are created or destroyed.
//   useEffect(() => {
//     Object.keys(timers).forEach((id) => {
//       const timer = timers[id];

//       // Case 1: Timer should be running, but has no interval.
//       if (timer.running && !intervalRefs.current[id]) {
//         intervalRefs.current[id] = setInterval(() => {
//           setTimers((prev) => {
//             // Check 'running' state *inside* the updater to be safe
//             if (prev[id]?.running) {
//               return {
//                 ...prev,
//                 [id]: { ...prev[id], seconds: (prev[id].seconds || 0) + 1 },
//               };
//             }
//             return prev;
//           });
//         }, 1000);
//       }
//       // Case 2: Timer should be stopped, but has an interval.
//       else if (!timer.running && intervalRefs.current[id]) {
//         clearInterval(intervalRefs.current[id]);
//         delete intervalRefs.current[id];
//       }
//     });

//     // Cleanup: Clear all intervals on unmount
//     return () => {
//       Object.values(intervalRefs.current).forEach(clearInterval);
//       intervalRefs.current = {};
//     };
//   }, [timers]); // This effect re-runs whenever the 'timers' state changes

//   const handleDataChange = (id, field, value) => {
//     setEditableData((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], [field]: value },
//     }));
//   };

//   const updateJobCard = async (id, payload) => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setJobCards((prev) =>
//         prev.map((jc) => (jc._id === id ? res.data.data : jc))
//       );
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Update failed!");
//     }
//   };

//   // Start or Resume
//   const handleStart = (id) => {
//     const now = new Date();

//     // Don’t trigger if already running
//     if (timers[id]?.running) {
//       toast.info("Already running!");
//       return;
//     }

//     // 1. Update local data state
//     handleDataChange(id, "status", "in progress");
//     if (!editableData[id]?.actualStartDate) {
//       handleDataChange(id, "actualStartDate", now);
//     }

//     // 2. Set 'running' to true. This triggers the useEffect.
//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: true },
//     }));

//     // 3. Update database
//     updateJobCard(id, {
//       status: "in progress",
//       actualStartDate: editableData[id]?.actualStartDate || now,
//     });
//     toast.info("Started / Resumed!");
//   };

//   // Pause
//   const handleStop = (id) => {
//     const now = new Date();

//     // Check if it's even running
//     if (!timers[id]?.running) {
//       return; // Do nothing if already stopped
//     }

//     // 1. Update local data state
//     handleDataChange(id, "status", "on_hold");
//     handleDataChange(id, "actualEndDate", now);

//     // 2. Set 'running' to false. This triggers the useEffect.
//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));

//     // 3. Update database
//     updateJobCard(id, {
//       status: "on_hold",
//       actualEndDate: now,
//       totalDuration: timers[id]?.seconds || 0,
//     });
//     toast.warn("Paused!");
//   };

//   const handleUpdate = (id, allowedQty) => {
//     const data = editableData[id];

//     if (data.completedQty > allowedQty) {
//       toast.error(`Completed Qty cannot exceed Allowed Qty (${allowedQty})`);
//       return;
//     }

//     updateJobCard(id, {
//       ...data,
//       totalDuration: timers[id]?.seconds || 0,
//     });
//     toast.success("Saved!");
//   };

//   const handleComplete = (id, allowedQty) => {
//     const data = editableData[id];

//     if (data.completedQty > allowedQty) {
//       toast.error(`Completed Qty cannot exceed Allowed Qty (${allowedQty})`);
//       return;
//     }

//     // 1. Set 'running' to false. This triggers the useEffect to stop the timer.
//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));

//     // 2. Update database
//     updateJobCard(id, {
//       ...data,
//       status: "completed",
//       totalDuration: timers[id]?.seconds || 0,
//     });

//     // 3. Update local data state
//     handleDataChange(id, "status", "completed");
//     toast.success("Completed!");
//   };

//   const StatusBadge = ({ status }) => {
//     const styles = {
//       planned: "bg-gray-200 text-gray-800",
//       "in progress": "bg-blue-200 text-blue-800 animate-pulse",
//       on_hold: "bg-yellow-200 text-yellow-800",
//       completed: "bg-green-200 text-green-800",
//     };
//     return (
//       <span
//         className={`px-3 py-1 text-sm font-medium rounded-full ${
//           styles[status] || styles.planned
//         }`}
//       >
//         {status}{" "}
//       </span>
//     );
//   };

//   if (loading)
//     return <div className="p-6 text-center text-gray-600">Loading...</div>;

//   return (
//     <>
//       <ToastContainer />
//       <div className="p-4 md-p-6 bg-gray-50 min-h-screen">
//         <div className="max-w-4xl mx-auto">
//           <div className="flex justify-between items-center mb-6">
//             <h2 className="text-2xl font-bold flex items-center gap-2">
//               <Car size={24} /> Job Card Workflow
//             </h2>
//             <button
//               onClick={() =>
//                 (window.location.href = "/admin/ppc/production-orders")
//               }
//               className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
//             >
//               <ArrowLeft size={16} /> Back
//             </button>
//           </div>

//           <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
//             {jobCards.map((jc, idx) => {
//               const data = editableData[jc._id] || {};
//               const timer = timers[jc._id] || { seconds: 0, running: false };

//               // --- Updated Dependency Logic (Partial Completion) ---
//               let allowedQty = 0;
//               let isCardActive = false;
//               let isPrevCardStarted = false; // For dimming logic

//               if (idx === 0) {
//                 // First card is always active (unless completed)
//                 allowedQty = jc.qtyToManufacture;
//                 isCardActive = data.status !== "completed";
//                 isPrevCardStarted = true; // Always allow first card
//               } else {
//                 // Subsequent cards
//                 const prevCardData = editableData[jobCards[idx - 1]._id] || {};
//                 const prevCardCompletedQty = prevCardData.completedQty || 0;

//                 // This card's allowed qty is the previous card's completed qty
//                 allowedQty = prevCardCompletedQty;

//                 // *** THIS IS THE KEY CHANGE ***
//                 // Activate if the previous card has completed ANY quantity (> 0)
//                 isPrevCardStarted = prevCardCompletedQty > 0;

//                 // This card is active if the previous one has started AND this one isn't complete
//                 isCardActive = isPrevCardStarted && data.status !== "completed";
//               }
//               // --- End Updated Logic ---

//               const progressPercent = Math.min(
//                 ((data.completedQty || 0) / (allowedQty || 1)) * 100,
//                 100
//               );
//               let progressColor = "bg-red-500";
//               if (progressPercent > 0 && progressPercent < 100)
//                 progressColor = "bg-yellow-400";
//               if (progressPercent >= 100) progressColor = "bg-green-500";

//               return (
//                 <div
//                   key={jc._id}
//                   className={`bg-white rounded-xl shadow-md overflow-hidden transition-opacity ${
//                     !isPrevCardStarted && idx > 0 // Dim if previous card hasn't started
//                       ? "opacity-60 bg-gray-50"
//                       : ""
//                   }`}
//                 >
//                   <div className="p-4 flex justify-between items-start">
//                     <div className="flex-1">
//                       <h3 className="text-lg font-bold">
//                         {idx + 1}. {jc.operation?.name || "N/A"}
//                       </h3>
//                       <p className="text-sm text-gray-600">
//                         Machine: {jc.machine?.name || "N/A"} | Operator:{" "}
//                         {jc.operator?.name || "N/A"}
//                       </p>
//                       <p className="text-sm text-gray-400 mt-1">
//                         Start: {formatDateTime(data.actualStartDate)} | End:{" "}
//                         {formatDateTime(data.actualEndDate)}
//                       </p>

//                       <div className="relative w-full bg-gray-300 h-3 rounded-full mt-3 overflow-visible">
//                         <div
//                           className={`${progressColor} h-3 rounded-full transition-all duration-500 relative`}
//                           style={{ width: `${progressPercent}%` }}
//                         >
//                           <div className="absolute -top-[6px] right-[-10px]">
//                             <Car size={18} className="text-gray-700" />
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                     <StatusBadge status={data.status || jc.status} />
//                   </div>

//                   <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
//                     <div>
//                       <p className="text-sm text-gray-500">To Manufacture</p>
//                       <p className="font-semibold">{jc.qtyToManufacture}</p>
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Allowed Qty</p>
//                       <p className="font-semibold text-blue-700">
//                         {allowedQty}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Completed Qty</p>
//                       <input
//                         type="number"
//                         value={data.completedQty}
//                         disabled={!isCardActive}
//                         onChange={(e) =>
//                           handleDataChange(
//                             jc._id,
//                             "completedQty",
//                             Number(e.target.value)
//                           )
//                         }
//                         className={`mt-1 border rounded-md px-2 py-1 w-full ${
//                           !isCardActive
//                             ? "bg-gray-100 cursor-not-allowed"
//                             : ""
//                         }`}
//                       />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Total Duration</p>
//                       <div className="flex items-center gap-1 text-blue-600 font-semibold">
//                         <Clock size={16} /> {formatTime(timer.seconds)}
//                       </div>
//                     </div>
//                     <div className="flex gap-2 flex-wrap">
//                       <button
//                         onClick={() => handleStart(jc._id)}
//                         disabled={
//                           !isCardActive ||
//                           data.status === "completed" ||
//                           timer.running
//                         }
//                         className={`bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1 ${
//                           !isCardActive ||
//                           data.status === "completed" ||
//                           timer.running
//                             ? "opacity-50 cursor-not-allowed"
//                             : ""
//                         }`}
//                       >
//                         <Play size={16} />{" "}
//                         {timer.running ? "Running" : "Start / Resume"}
//                       </button>
//                       <button
//                         onClick={() => handleStop(jc._id)}
//                         disabled={!timer.running}
//                         className={`bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex items-center gap-1 ${
//                           !timer.running
//                             ? "opacity-50 cursor-not-allowed"
//                             : ""
//                         }`}
//                       >
//                         <Square size={16} /> Stop
//                       </button>
//                       <button
//                         onClick={() => handleUpdate(jc._id, allowedQty)}
//                         disabled={!isCardActive || data.status === "completed"}
//                         className={`bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 ${
//                           !isCardActive || data.status === "completed"
//                             ? "opacity-50 cursor-not-allowed"
//                             : ""
//                         }`}
//                       >
//                         <Save size={16} /> Save
//                       </button>
//                       <button
//                         onClick={() => handleComplete(jc._id, allowedQty)}
//                         disabled={!isCardActive || data.status === "completed"}
//                         className={`bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1 ${
//                           !isCardActive || data.status === "completed"
//                             ? "opacity-5B0 cursor-not-allowed"
//                             : ""
//                         }`}
//                       >
//                         <Check size={16} /> Complete
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }



// "use client";

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import axios from "axios";
// import {
//   Play,
//   Square,
//   Check,
//   Save,
//   ArrowLeft,
//   Clock,
//   Car,
// } from "lucide-react";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Time format helper
// const formatTime = (seconds) => {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;
//   return `${hrs.toString().padStart(2, "0")}:${mins
//     .toString()
//     .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// };

// const formatDateTime = (date) =>
//   date ? new Date(date).toLocaleString() : "-";

// export default function JobCardPage() {
//   const [productionOrderId, setProductionOrderId] = useState("");
//   const [jobCards, setJobCards] = useState([]);
//   const [editableData, setEditableData] = useState({});
//   const [timers, setTimers] = useState({});
//   const [loading, setLoading] = useState(true);

//   const intervalRef = useRef({});
//   const secondsRef = useRef({});

//   // ─── Fetch Production Order ID ───
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     setProductionOrderId(params.get("productionOrderId") || "");
//   }, []);

//   // ─── Fetch Job Cards ───
//   useEffect(() => {
//     if (!productionOrderId) return;

//     const fetchJobCards = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         const res = await axios.get(
//           `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         const cards = res.data?.data || [];
//         setJobCards(cards);

//         const initData = {};
//         const timerData = {};

//         cards.forEach((c) => {
//           initData[c._id] = {
//             completedQty: c.completedQty || 0,
//             status: c.status || "planned",
//             actualStartDate: c.actualStartDate
//               ? new Date(c.actualStartDate)
//               : null,
//             actualEndDate: c.actualEndDate ? new Date(c.actualEndDate) : null,
//           };
//           timerData[c._id] = {
//             seconds: c.totalDuration || 0,
//             running: c.status === "in progress",
//           };
//           secondsRef.current[c._id] = c.totalDuration || 0;
//         });

//         setEditableData(initData);
//         setTimers(timerData);
//       } catch (err) {
//         toast.error("Failed to fetch job cards.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobCards();
//   }, [productionOrderId]);

//   // ─── Manage Timers ───
// useEffect(() => {
//   Object.keys(timers).forEach((id) => {
//     if (timers[id].running && !intervalRef.current[id]) {
//       intervalRef.current[id] = setInterval(() => {
//         secondsRef.current[id] = (secondsRef.current[id] || 0) + 1;
//         setTimers((prev) => ({
//           ...prev,
//           [id]: { ...prev[id], seconds: secondsRef.current[id] },
//         }));
//       }, 1000);
//     } else if (!timers[id].running && intervalRef.current[id]) {
//       clearInterval(intervalRef.current[id]);
//       intervalRef.current[id] = null;
//     }
//   });

//   return () => {
//     Object.values(intervalRef.current).forEach(clearInterval);
//   };
//   // 👇 Only run when running state changes, not full timer state
// }, [Object.values(timers).map(t => t.running).join()]);


//   // ─── Helpers ───
//   const handleDataChange = useCallback((id, field, value) => {
//     setEditableData((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], [field]: value },
//     }));
//   }, []);

//   const updateJobCard = useCallback(async (id, payload) => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setJobCards((prev) =>
//         prev.map((jc) => (jc._id === id ? res.data.data : jc))
//       );
//       return true;
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Update failed!");
//       return false;
//     }
//   }, []);

//   // ─── Timer Controls ───
//   const handleStart = async (id) => {
//     const now = new Date();
//     handleDataChange(id, "status", "in progress");
//     handleDataChange(id, "actualStartDate", now);
//     await updateJobCard(id, { status: "in progress", actualStartDate: now });

//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: true },
//     }));
//     toast.info("Started!");
//   };

//   const handleStop = async (id) => {
//     const now = new Date();
//     handleDataChange(id, "status", "on_hold");
//     handleDataChange(id, "actualEndDate", now);
//     await updateJobCard(id, {
//       status: "on_hold",
//       actualEndDate: now,
//       totalDuration: secondsRef.current[id],
//     });

//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));
//     toast.warn("Paused!");
//   };

//   const handleUpdate = async (id) => {
//     const data = editableData[id];
//     if (!data) return;
//     await updateJobCard(id, {
//       ...data,
//       totalDuration: secondsRef.current[id],
//     });
//     toast.success("Updated!");
//   };

//   const handleComplete = async (id) => {
//     const data = editableData[id];
//     if (!data) return;
//     await updateJobCard(id, {
//       ...data,
//       status: "completed",
//       totalDuration: secondsRef.current[id],
//     });
//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));
//     toast.success("Completed!");
//   };

//   // ─── Status Badge ───
//   const StatusBadge = ({ status }) => {
//     const styles = {
//       planned: "bg-gray-200 text-gray-800",
//       "in progress": "bg-blue-200 text-blue-800 animate-pulse",
//       on_hold: "bg-yellow-200 text-yellow-800",
//       completed: "bg-green-200 text-green-800",
//     };
//     return (
//       <span
//         className={`px-3 py-1 text-sm font-medium rounded-full ${
//           styles[status] || styles.planned
//         }`}
//       >
//         {status}
//       </span>
//     );
//   };

//   // ─── Render ───
//   if (loading)
//     return <div className="p-6 text-center text-gray-600">Loading...</div>;

//   return (
//     <>
//       <ToastContainer />
//       <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
//         <div className="max-w-4xl mx-auto">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-6">
//             <h2 className="text-2xl font-bold flex items-center gap-2">
//               <Car size={24} /> Job Card Workflow
//             </h2>
//             <button
//               onClick={() =>
//                 (window.location.href = "/admin/ppc/production-orders")
//               }
//               className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
//             >
//               <ArrowLeft size={16} /> Back
//             </button>
//           </div>

//           {/* Job Cards */}
//           <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
//             {jobCards.map((jc, idx) => {
//               const data = editableData[jc._id] || {};
//               const timer = timers[jc._id] || {};
//               const progressPercent = Math.min(
//                 (data.completedQty / jc.qtyToManufacture) * 100,
//                 100
//               );
//               let progressColor = "bg-red-500";
//               if (progressPercent > 0 && progressPercent < 100)
//                 progressColor = "bg-yellow-400";
//               if (progressPercent >= 100) progressColor = "bg-green-500";

//               return (
//                 <div
//                   key={jc._id}
//                   className="bg-white rounded-xl shadow-md overflow-hidden"
//                 >
//                   {/* Header */}
//                   <div className="p-4 flex justify-between items-start">
//                     <div className="flex-1">
//                       <h3 className="text-lg font-bold">
//                         {idx + 1}. {jc.operation?.name || "N/A"}
//                       </h3>
//                       <p className="text-sm text-gray-600">
//                         Machine: {jc.machine?.name || "N/A"} | Operator:{" "}
//                         {jc.operator?.name || "N/A"}
//                       </p>
//                       <p className="text-sm text-gray-400 mt-1">
//                         Start: {formatDateTime(data.actualStartDate)} | End:{" "}
//                         {formatDateTime(data.actualEndDate)}
//                       </p>

//                       {/* Progress Bar with aligned car */}
//                       <div className="relative w-full bg-gray-300 h-3 rounded-full mt-3 overflow-visible">
//                         <div
//                           className={`${progressColor} h-3 rounded-full transition-all duration-500 relative`}
//                           style={{ width: `${progressPercent}%` }}
//                         >
//                           <div className="absolute -top-[6px] right-[-10px] flex items-center justify-center">
//                             <Car size={18} className="text-gray-700" />
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                     <StatusBadge status={data.status || jc.status} />
//                   </div>

//                   {/* Body */}
//                   <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
//                     <div>
//                       <p className="text-sm text-gray-500">To Manufacture</p>
//                       <p className="font-semibold">{jc.qtyToManufacture}</p>
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Allowed Qty (Prev)</p>
//                       <p className="font-semibold text-blue-700">
//                         {jc.qtyToManufacture}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Completed Qty</p>
//                       <input
//                         type="number"
//                         value={data.completedQty}
//                         onChange={(e) =>
//                           handleDataChange(
//                             jc._id,
//                             "completedQty",
//                             Number(e.target.value)
//                           )
//                         }
//                         className="mt-1 border rounded-md px-2 py-1 w-full"
//                       />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Total Duration</p>
//                       <div className="flex items-center gap-1 text-blue-600 font-semibold">
//                         <Clock size={16} /> {formatTime(timer.seconds)}
//                       </div>
//                     </div>
//                     <div className="flex gap-2 flex-wrap">
//                       <button
//                         onClick={() => handleStart(jc._id)}
//                         className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
//                       >
//                         <Play size={16} /> Start
//                       </button>
//                       <button
//                         onClick={() => handleStop(jc._id)}
//                         className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex items-center gap-1"
//                       >
//                         <Square size={16} /> Stop
//                       </button>
//                       <button
//                         onClick={() => handleUpdate(jc._id)}
//                         className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
//                       >
//                         <Save size={16} /> Save
//                       </button>
//                       <button
//                         onClick={() => handleComplete(jc._id)}
//                         className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
//                       >
//                         <Check size={16} /> Complete
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }

//////////////////////////////////////////////////////////////////////////////////////////////////////




// "use client";

// import React, { useState, useEffect, useRef, useCallback } from "react";
// import axios from "axios";
// import {
//   Play,
//   Square,
//   Check,
//   Save,
//   ArrowLeft,
//   Clock,
//   Car,
// } from "lucide-react";
// import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Time format helper
// const formatTime = (seconds) => {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;
//   return `${hrs.toString().padStart(2, "0")}:${mins
//     .toString()
//     .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// };

// const formatDateTime = (date) =>
//   date ? new Date(date).toLocaleString() : "-";

// export default function JobCardPage() {
//   const [productionOrderId, setProductionOrderId] = useState("");
//   const [jobCards, setJobCards] = useState([]);
//   const [editableData, setEditableData] = useState({});
//   const [timers, setTimers] = useState({});
//   const [loading, setLoading] = useState(true);

//   const intervalRef = useRef({});
//   const secondsRef = useRef({});

//   // ─── Fetch Production Order ID ───
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     setProductionOrderId(params.get("productionOrderId") || "");
//   }, []);

//   // ─── Fetch Job Cards ───
//   useEffect(() => {
//     if (!productionOrderId) return;

//     const fetchJobCards = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         const res = await axios.get(
//           `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         const cards = res.data?.data || [];
//         setJobCards(cards);

//         const initData = {};
//         const timerData = {};

//         cards.forEach((c) => {
//           initData[c._id] = {
//             completedQty: c.completedQty || 0,
//             status: c.status || "planned",
//             actualStartDate: c.actualStartDate
//               ? new Date(c.actualStartDate)
//               : null,
//             actualEndDate: c.actualEndDate ? new Date(c.actualEndDate) : null,
//           };
//           timerData[c._id] = {
//             seconds: c.totalDuration || 0,
//             running: c.status === "in progress",
//           };
//           secondsRef.current[c._id] = c.totalDuration || 0;
//         });

//         setEditableData(initData);
//         setTimers(timerData);
//       } catch (err) {
//         toast.error("Failed to fetch job cards.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobCards();
//   }, [productionOrderId]);

//   // ─── Manage Timers ───
//   useEffect(() => {
//     Object.keys(timers).forEach((id) => {
//       if (timers[id].running && !intervalRef.current[id]) {
//         intervalRef.current[id] = setInterval(() => {
//           secondsRef.current[id] = (secondsRef.current[id] || 0) + 1;
//           setTimers((prev) => ({
//             ...prev,
//             [id]: { ...prev[id], seconds: secondsRef.current[id] },
//           }));
//         }, 1000);
//       } else if (!timers[id].running && intervalRef.current[id]) {
//         clearInterval(intervalRef.current[id]);
//         intervalRef.current[id] = null;
//       }
//     });

//     return () => {
//       Object.values(intervalRef.current).forEach(clearInterval);
//     };
//   }, [timers]);

//   // ─── Helpers ───
//   const handleDataChange = useCallback((id, field, value) => {
//     setEditableData((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], [field]: value },
//     }));
//   }, []);

//   const updateJobCard = useCallback(async (id, payload) => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setJobCards((prev) =>
//         prev.map((jc) => (jc._id === id ? res.data.data : jc))
//       );
//       return true;
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Update failed!");
//       return false;
//     }
//   }, []);

//   // ─── Timer Controls ───
//   const handleStart = async (id) => {
//     const now = new Date();
//     handleDataChange(id, "status", "in progress");
//     handleDataChange(id, "actualStartDate", now);
//     await updateJobCard(id, { status: "in progress", actualStartDate: now });

//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: true },
//     }));
//     toast.info("Started!");
//   };

//   const handleStop = async (id) => {
//     const now = new Date();
//     handleDataChange(id, "status", "on_hold");
//     handleDataChange(id, "actualEndDate", now);
//     await updateJobCard(id, {
//       status: "on_hold",
//       actualEndDate: now,
//       totalDuration: secondsRef.current[id],
//     });

//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));
//     toast.warn("Paused!");
//   };

//   const handleUpdate = async (id) => {
//     const data = editableData[id];
//     if (!data) return;
//     await updateJobCard(id, {
//       ...data,
//       totalDuration: secondsRef.current[id],
//     });
//     toast.success("Updated!");
//   };

//   const handleComplete = async (id) => {
//     const data = editableData[id];
//     if (!data) return;
//     await updateJobCard(id, {
//       ...data,
//       status: "completed",
//       totalDuration: secondsRef.current[id],
//     });
//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));
//     toast.success("Completed!");
//   };

//   // ─── Status Badge ───
//   const StatusBadge = ({ status }) => {
//     const styles = {
//       planned: "bg-gray-200 text-gray-800",
//       "in progress": "bg-blue-200 text-blue-800 animate-pulse",
//       on_hold: "bg-yellow-200 text-yellow-800",
//       completed: "bg-green-200 text-green-800",
//     };
//     return (
//       <span
//         className={`px-3 py-1 text-sm font-medium rounded-full ${
//           styles[status] || styles.planned
//         }`}
//       >
//         {status}
//       </span>
//     );
//   };

//   // ─── Render ───
//   if (loading)
//     return <div className="p-6 text-center text-gray-600">Loading...</div>;

//   return (
//     <>
//       <ToastContainer />
//       <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
//         <div className="max-w-4xl mx-auto">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-6">
//             <h2 className="text-2xl font-bold flex items-center gap-2">
//               <Car size={24} /> Job Card Workflow
//             </h2>
//             <button
//               onClick={() =>
//                 (window.location.href = "/admin/ppc/production-orders")
//               }
//               className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
//             >
//               <ArrowLeft size={16} /> Back
//             </button>
//           </div>

//           {/* Job Cards */}
//           <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
//             {jobCards.map((jc, idx) => {
//               const data = editableData[jc._id] || {};
//               const timer = timers[jc._id] || {};
//               const progressPercent = Math.min(
//                 (data.completedQty / jc.qtyToManufacture) * 100,
//                 100
//               );
//               let progressColor = "bg-red-500";
//               if (progressPercent > 0 && progressPercent < 100)
//                 progressColor = "bg-yellow-400";
//               if (progressPercent >= 100) progressColor = "bg-green-500";

//               return (
//                 <div
//                   key={jc._id}
//                   className="bg-white rounded-xl shadow-md overflow-hidden"
//                 >
//                   {/* Header */}
//                   <div className="p-4 flex justify-between items-start">
//                     <div className="flex-1">
//                       <h3 className="text-lg font-bold">
//                         {idx + 1}. {jc.operation?.name || "N/A"}
//                       </h3>
//                       <p className="text-sm text-gray-600">
//                         Machine: {jc.machine?.name || "N/A"} | Operator:{" "}
//                         {jc.operator?.name || "N/A"}
//                       </p>
//                       <p className="text-sm text-gray-400 mt-1">
//                         Start: {formatDateTime(data.actualStartDate)} | End:{" "}
//                         {formatDateTime(data.actualEndDate)}
//                       </p>

//                       {/* Progress Bar with aligned car */}
//                       <div className="relative w-full bg-gray-300 h-3 rounded-full mt-3 overflow-visible">
//                         <div
//                           className={`${progressColor} h-3 rounded-full transition-all duration-500 relative`}
//                           style={{ width: `${progressPercent}%` }}
//                         >
//                           <div className="absolute -top-[6px] right-[-10px] flex items-center justify-center">
//                             <Car size={18} className="text-gray-700" />
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                     <StatusBadge status={data.status || jc.status} />
//                   </div>

//                   {/* Body */}
//                   <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
//                     <div>
//                       <p className="text-sm text-gray-500">To Manufacture</p>
//                       <p className="font-semibold">{jc.qtyToManufacture}</p>
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Allowed Qty (Prev)</p>
//                       <p className="font-semibold text-blue-700">
//                         {jc.qtyToManufacture}
//                       </p>
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Completed Qty</p>
//                       <input
//                         type="number"
//                         value={data.completedQty}
//                         onChange={(e) =>
//                           handleDataChange(
//                             jc._id,
//                             "completedQty",
//                             Number(e.target.value)
//                           )
//                         }
//                         className="mt-1 border rounded-md px-2 py-1 w-full"
//                       />
//                     </div>
//                     <div>
//                       <p className="text-sm text-gray-500">Total Duration</p>
//                       <div className="flex items-center gap-1 text-blue-600 font-semibold">
//                         <Clock size={16} /> {formatTime(timer.seconds)}
//                       </div>
//                     </div>
//                     <div className="flex gap-2 flex-wrap">
//                       <button
//                         onClick={() => handleStart(jc._id)}
//                         className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
//                       >
//                         <Play size={16} /> Start
//                       </button>
//                       <button
//                         onClick={() => handleStop(jc._id)}
//                         className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex items-center gap-1"
//                       >
//                         <Square size={16} /> Stop
//                       </button>
//                       <button
//                         onClick={() => handleUpdate(jc._id)}
//                         className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
//                       >
//                         <Save size={16} /> Save
//                       </button>
//                       <button
//                         onClick={() => handleComplete(jc._id)}
//                         className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
//                       >
//                         <Check size={16} /> Complete
//                       </button>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }