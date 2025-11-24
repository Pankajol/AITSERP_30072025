"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Play,
  Square,
  Check,
  Save,
  ArrowLeft,
  Clock,
  Car,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css"; // Removed this line to fix the build error

const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString("en-IN") : "-";

export default function JobCardPage() {
  const [productionOrderId, setProductionOrderId] = useState("");
  const [jobCards, setJobCards] = useState([]);
  const [editableData, setEditableData] = useState({});
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);
  const intervalRefs = useRef({});

  // Fetch Production Order ID
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProductionOrderId(params.get("productionOrderId") || "");
  }, []);

  // Fetch Job Cards (with AbortController for safety)
  useEffect(() => {
    if (!productionOrderId) return;

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: signal, // Pass signal to axios
          }
        );
        const cards = res.data?.data || [];
        setJobCards(cards);

        const initEditable = {};
        const initTimers = {};
        cards.forEach((jc) => {
          initEditable[jc._id] = {
            completedQty: jc.completedQty || 0,
            status: jc.status || "planned",
            actualStartDate: jc.actualStartDate
              ? new Date(jc.actualStartDate)
              : null,
            actualEndDate: jc.actualEndDate
              ? new Date(jc.actualEndDate)
              : null,
              expectedStartDate: jc.expectedStartDate
              ? new Date(jc.expectedStartDate)
              : null,
              expectedEndDate: jc.expectedEndDate
              ? new Date(jc.expectedEndDate)
              : null,
          };
          // IMPORTANT: Set running state from fetch
          initTimers[jc._id] = {
            seconds: Number(jc.totalDuration) || 0,
            running: jc.status === "in progress",
          };
        });
        setEditableData(initEditable);
        setTimers(initTimers);
      } catch (err) {
        if (err.name === "CanceledError") {
          // console.log('Fetch canceled');
        } else {
          toast.error("Failed to fetch job cards");
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    // Cleanup function
    return () => {
      controller.abort(); // Abort fetch on unmount/re-run
    };
  }, [productionOrderId]);

  // ---- NEW: Central Timer Management Effect ----
  // This useEffect is now the *only* place timers are created or destroyed.
  useEffect(() => {
    Object.keys(timers).forEach((id) => {
      const timer = timers[id];

      // Case 1: Timer should be running, but has no interval.
      if (timer.running && !intervalRefs.current[id]) {
        intervalRefs.current[id] = setInterval(() => {
          setTimers((prev) => {
            // Check 'running' state *inside* the updater to be safe
            if (prev[id]?.running) {
              return {
                ...prev,
                [id]: { ...prev[id], seconds: (prev[id].seconds || 0) + 1 },
              };
            }
            return prev;
          });
        }, 1000);
      }
      // Case 2: Timer should be stopped, but has an interval.
      else if (!timer.running && intervalRefs.current[id]) {
        clearInterval(intervalRefs.current[id]);
        delete intervalRefs.current[id];
      }
    });

    // Cleanup: Clear all intervals on unmount
    return () => {
      Object.values(intervalRefs.current).forEach(clearInterval);
      intervalRefs.current = {};
    };
  }, [timers]); // This effect re-runs whenever the 'timers' state changes

  const handleDataChange = (id, field, value) => {
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const updateJobCard = async (id, payload) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobCards((prev) =>
        prev.map((jc) => (jc._id === id ? res.data.data : jc))
      );
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed!");
    }
  };

  // Start or Resume
  const handleStart = (id) => {
    const now = new Date();

    // Don’t trigger if already running
    if (timers[id]?.running) {
      toast.info("Already running!");
      return;
    }

    // 1. Update local data state
    handleDataChange(id, "status", "in progress");
    if (!editableData[id]?.actualStartDate) {
      handleDataChange(id, "actualStartDate", now);
    }

    // 2. Set 'running' to true. This triggers the useEffect.
    setTimers((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: true },
    }));

    // 3. Update database
    updateJobCard(id, {
      status: "in progress",
      actualStartDate: editableData[id]?.actualStartDate || now,
    });
    toast.info("Started / Resumed!");
  };

  // Pause
  const handleStop = (id) => {
    const now = new Date();

    // Check if it's even running
    if (!timers[id]?.running) {
      return; // Do nothing if already stopped
    }

    // 1. Update local data state
    handleDataChange(id, "status", "on_hold");
    handleDataChange(id, "actualEndDate", now);

    // 2. Set 'running' to false. This triggers the useEffect.
    setTimers((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: false },
    }));

    // 3. Update database
    updateJobCard(id, {
      status: "on_hold",
      actualEndDate: now,
      totalDuration: timers[id]?.seconds || 0,
    });
    toast.warn("Paused!");
  };

  const handleUpdate = (id, allowedQty) => {
    const data = editableData[id];

    if (data.completedQty > allowedQty) {
      toast.error(`Completed Qty cannot exceed Allowed Qty (${allowedQty})`);
      return;
    }

    updateJobCard(id, {
      ...data,
      totalDuration: timers[id]?.seconds || 0,
    });
    toast.success("Saved!");
  };

  const handleComplete = (id, allowedQty) => {
    const data = editableData[id];

    if (data.completedQty > allowedQty) {
      toast.error(`Completed Qty cannot exceed Allowed Qty (${allowedQty})`);
      return;
    }

    // 1. Set 'running' to false. This triggers the useEffect to stop the timer.
    setTimers((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: false },
    }));

    // 2. Update database
    updateJobCard(id, {
      ...data,
      status: "completed",
      totalDuration: timers[id]?.seconds || 0,
    });

    // 3. Update local data state
    handleDataChange(id, "status", "completed");
    toast.success("Completed!");
  };

  const StatusBadge = ({ status }) => {
    const styles = {
      planned: "bg-gray-200 text-gray-800",
      "in progress": "bg-blue-200 text-blue-800 animate-pulse",
      on_hold: "bg-yellow-200 text-yellow-800",
      completed: "bg-green-200 text-green-800",
    };
    return (
      <span
        className={`px-3 py-1 text-sm font-medium rounded-full ${
          styles[status] || styles.planned
        }`}
      >
        {status}{" "}
      </span>
    );
  };

  if (loading)
    return <div className="p-6 text-center text-gray-600">Loading...</div>;

  return (
    <>
      <ToastContainer />
      <div className="p-4 md-p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Car size={32} /> Job Card Workflow
            </h2>
            <button
              onClick={() =>
                (window.location.href = "/admin/ppc/production-orders")
              }
              className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back
            </button>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {jobCards.map((jc, idx) => {
              const data = editableData[jc._id] || {};
              const timer = timers[jc._id] || { seconds: 0, running: false };

              // --- Updated Dependency Logic (Partial Completion) ---
              let allowedQty = 0;
              let isCardActive = false;
              let isPrevCardStarted = false; // For dimming logic

              if (idx === 0) {
                // First card is always active (unless completed)
                allowedQty = jc.qtyToManufacture;
                isCardActive = data.status !== "completed";
                isPrevCardStarted = true; // Always allow first card
              } else {
                // Subsequent cards
                const prevCardData = editableData[jobCards[idx - 1]._id] || {};
                const prevCardCompletedQty = prevCardData.completedQty || 0;

                // This card's allowed qty is the previous card's completed qty
                allowedQty = prevCardCompletedQty;

                // *** THIS IS THE KEY CHANGE ***
                // Activate if the previous card has completed ANY quantity (> 0)
                isPrevCardStarted = prevCardCompletedQty > 0;

                // This card is active if the previous one has started AND this one isn't complete
                isCardActive = isPrevCardStarted && data.status !== "completed";
              }
              // --- End Updated Logic ---

              const progressPercent = Math.min(
                ((data.completedQty || 0) / (allowedQty || 1)) * 100,
                100
              );
              let progressColor = "bg-red-500";
              if (progressPercent > 0 && progressPercent < 100)
                progressColor = "bg-yellow-400";
              if (progressPercent >= 100) progressColor = "bg-green-500";

              return (
                <div
                  key={jc._id}
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
                      <p className="text-sm text-gray-600">
                        Machine: {jc.machine?.name || "N/A"} | Operator:{" "}
                        {jc.operator?.name || "N/A"}
                      </p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start: {formatDateTime(data.actualStartDate)} | End:{" "}
                        {formatDateTime(data.actualEndDate)}
                      </p>

                          <p className="text-sm text-gray-400 mt-1">
                        Expected Start Date: {formatDateTime(data.expectedStartDate)} | Expected  End Date:{" "}
                        {formatDateTime(data.expectedEndDate)}
                      </p>

                      <div className="relative w-full bg-gray-300 h-3 rounded-full mt-3 overflow-visible">
                        <div
                          className={`${progressColor} h-3 rounded-full transition-all duration-500 relative`}
                          style={{ width: `${progressPercent}%` }}
                        >
                          <div className="absolute -top-[6px] right-[-5px] ">
                            <Car size={22} className="text-gray-700  " />
                          </div>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={data.status || jc.status} />
                  </div>

                  <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm text-gray-500">To Manufacture</p>
                      <p className="font-semibold">{jc.qtyToManufacture}</p>
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
                        value={data.completedQty}
                        disabled={!isCardActive}
                        onChange={(e) =>
                          handleDataChange(
                            jc._id,
                            "completedQty",
                            Number(e.target.value)
                          )
                        }
                        className={`mt-1 border rounded-md px-2 py-1 w-full ${
                          !isCardActive
                            ? "bg-gray-100 cursor-not-allowed"
                            : ""
                        }`}
                      />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Duration</p>
                      <div className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Clock size={16} /> {formatTime(timer.seconds)}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => handleStart(jc._id)}
                        disabled={
                          !isCardActive ||
                          data.status === "completed" ||
                          timer.running
                        }
                        className={`bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1 ${
                          !isCardActive ||
                          data.status === "completed" ||
                          timer.running
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Play size={16} />{" "}
                        {timer.running ? "Running" : "Start / Resume"}
                      </button>
                      <button
                        onClick={() => handleStop(jc._id)}
                        disabled={!timer.running}
                        className={`bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex items-center gap-1 ${
                          !timer.running
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Square size={16} /> Stop
                      </button>
                      <button
                        onClick={() => handleUpdate(jc._id, allowedQty)}
                        disabled={!isCardActive || data.status === "completed"}
                        className={`bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 flex items-center gap-1 ${
                          !isCardActive || data.status === "completed"
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }`}
                      >
                        <Save size={16} /> Save
                      </button>
                      <button
                        onClick={() => handleComplete(jc._id, allowedQty)}
                        disabled={!isCardActive || data.status === "completed"}
                        className={`bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1 ${
                          !isCardActive || data.status === "completed"
                            ? "opacity-5B0 cursor-not-allowed"
                            : ""
                        }`}
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
//       <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
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

//               // --- New Dependency Logic ---
//               const prevCardId = idx > 0 ? jobCards[idx - 1]._id : null;
//               const prevCardCompletedQty = prevCardId
//                 ? editableData[prevCardId]?.completedQty || 0
//                 : 0;

//               // The first card's allowed qty is its own; others depend on the previous card's completed qty.
//               const allowedQty =
//                 idx === 0 ? jc.qtyToManufacture : prevCardCompletedQty;

//               // The first card is active if not complete.
//               // Other cards are active if the previous card has completed > 0 AND this card is not complete.
//               const isPrevCardCompleteOrPartial =
//                 idx === 0 ? true : prevCardCompletedQty > 0;
//               const isCardActive =
//                 isPrevCardCompleteOrPartial && data.status !== "completed";
//               // --- End New Logic ---

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
//                     !isCardActive && idx > 0 ? "opacity-60 bg-gray-50" : ""
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
//                             ? "opacity-50 cursor-not-allowed"
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


//////////////////////////////////////////////////////////////////////


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







// "use client";

// import React, { useState, useEffect, useCallback, useRef } from "react";
// import axios from "axios";
// import { Play, Square, Printer, Check, Save, ArrowLeft, Clock } from "lucide-react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Format seconds into HH:MM:SS
// const formatTime = (seconds) => {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;
//   return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// };

// export default function JobCardPage() {
//   const [productionOrderId, setProductionOrderId] = useState("");
//   const [jobCards, setJobCards] = useState([]);
//   const [editableData, setEditableData] = useState({});
//   const [timers, setTimers] = useState({});
//   const [loading, setLoading] = useState(true);

//   const intervalRef = useRef({});
//   const secondsRef = useRef({}); // Track latest seconds for each job card

//   // Get productionOrderId from URL
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     setProductionOrderId(params.get("productionOrderId") || "");
//   }, []);

//   // Fetch job cards
//   useEffect(() => {
//     if (!productionOrderId) return;

//     const fetchJobCards = async () => {
//       try {
//         setLoading(true);
//         const token = localStorage.getItem("token");
//         const res = await axios.get(`/api/ppc/jobcards?productionOrderId=${productionOrderId}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         const cards = res.data?.data || [];
//         setJobCards(cards);

//         const initData = {};
//         const timerData = {};

//         cards.forEach((c) => {
//           initData[c._id] = {
//             completedQty: c.completedQty || 0,
//             status: c.status || "planned",
//             actualStartDate: c.actualStartDate ? new Date(c.actualStartDate) : null,
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

//   // Handle input changes
//   const handleDataChange = useCallback((id, field, value) => {
//     setEditableData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
//   }, []);

//   // Update job card in backend
//   const updateJobCard = useCallback(async (id, payload) => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setJobCards((prev) => prev.map((jc) => (jc._id === id ? res.data.data : jc)));
//       return true;
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Update failed!");
//       return false;
//     }
//   }, []);

//   // Start timer
//   const startTimer = (id) => {
//     if (intervalRef.current[id]) return;

//     intervalRef.current[id] = setInterval(async () => {
//       secondsRef.current[id] = (secondsRef.current[id] || timers[id]?.seconds || 0) + 1;

//       setTimers((prev) => ({
//         ...prev,
//         [id]: { ...prev[id], seconds: secondsRef.current[id], running: true },
//       }));

//       // Update backend every 5 seconds
//       if (secondsRef.current[id] % 5 === 0) {
//         await updateJobCard(id, { totalDuration: secondsRef.current[id] });
//       }
//     }, 1000);
//   };

//   // Stop timer
//   const stopTimer = async (id) => {
//     clearInterval(intervalRef.current[id]);
//     intervalRef.current[id] = null;
//     const secs = secondsRef.current[id] || timers[id]?.seconds || 0;
//     await updateJobCard(id, { totalDuration: secs });
//     setTimers((prev) => ({ ...prev, [id]: { ...prev[id], seconds: secs, running: false } }));
//   };

//   // Start job card
// const handleStart = async (id) => {
//   try {
//     const jobCard = jobCards.find((jc) => jc._id === id);
//     if (!jobCard) return toast.error("Job card not found!");

//     const prevJobIndex = jobCards.findIndex((jc) => jc._id === id) - 1;

//     // ✅ Check previous job card completion status
//     if (prevJobIndex >= 0) {
//       const prevJob = jobCards[prevJobIndex];

//       // Allow only if previous job is fully completed OR partially pending
//       const canStart =
//         prevJob.completedQty < prevJob.qtyToManufacture ||
//         prevJob.status === "completed";

//       if (!canStart) {
//         toast.warning("You can’t start this operation until previous one has progress or is complete!");
//         return;
//       }
//     }

//     // ✅ Prevent start if already fully completed
//     if (jobCard.completedQty >= jobCard.qtyToManufacture) {
//       toast.warning("Full quantity already manufactured, cannot start again!");
//       return;
//     }

//     // ✅ Proceed to start job
//     const now = new Date();
//     handleDataChange(id, "status", "in progress");
//     handleDataChange(id, "actualStartDate", now);
//     await updateJobCard(id, { status: "in progress", actualStartDate: now });
//     secondsRef.current[id] = timers[id]?.seconds || 0;
//     startTimer(id);
//     toast.info("Operation started!");
//   } catch (error) {
//     console.error("Start error:", error);
//     toast.error("Failed to start operation.");
//   }
// };


//   // Stop job card
//   const handleStop = async (id) => {
//     handleDataChange(id, "status", "on_hold");
//     handleDataChange(id, "actualEndDate", new Date());
//     await stopTimer(id);
//     await updateJobCard(id, { status: "on_hold", actualEndDate: new Date() });
//     toast.warn("Operation paused!");
//   };

//   // Save progress manually
//   const handleUpdate = async (id) => {
//     const data = editableData[id];
//     const secs = secondsRef.current[id] || timers[id]?.seconds || 0;
//     if (!data) return;

//     const completedQty = Number(data.completedQty || 0);
//     const maxQty = Number(jobCards.find((jc) => jc._id === id)?.qtyToManufacture);

//     if (completedQty > maxQty) {
//       toast.error(`Completed quantity cannot exceed ${maxQty}`);
//       return;
//     }

//     await updateJobCard(id, { ...data, completedQty, totalDuration: secs });
//     toast.success("Progress updated!");
//   };

//   // Complete job card
//   const handleCompleteAndStartNext = async (id) => {
//     const data = editableData[id];
//     const card = jobCards.find((jc) => jc._id === id);
//     if (!card || !data) return;

//     const now = new Date();
//     const secs = secondsRef.current[id] || timers[id]?.seconds || 0;
//     const completedQty = Number(data.completedQty);
//     const requiredQty = Number(card.qtyToManufacture);

//     if (completedQty > requiredQty) {
//       toast.error(`Completed quantity cannot exceed ${requiredQty}`);
//       return;
//     }

//     const status = completedQty >= requiredQty ? "completed" : "partially completed";
//     await stopTimer(id);
//     await updateJobCard(id, { ...data, status, actualEndDate: now, totalDuration: secs, completedQty });

//     toast.success(status === "completed" ? "Operation completed!" : "Partial completion recorded.");

//     // Trigger next job card notification
//     const currentIndex = jobCards.findIndex((jc) => jc._id === id);
//     const nextCard = jobCards[currentIndex + 1];
//     if (nextCard) toast.info(`Next operation "${nextCard.operation?.name}" is now ready.`);
//   };

//   const handlePrint = () => window.print();
//   const handleBack = () => (window.location.href = "/admin/ppc/production-orders");

//   const StatusBadge = ({ status }) => {
//     const styles = {
//       planned: "bg-gray-200 text-gray-800",
//       "in progress": "bg-blue-200 text-blue-800 animate-pulse",
//       on_hold: "bg-yellow-200 text-yellow-800",
//       completed: "bg-green-200 text-green-800",
//       "partially completed": "bg-orange-200 text-orange-800",
//     };
//     return <span className={`px-3 py-1 text-sm font-medium rounded-full ${styles[status] || styles.planned}`}>{status}</span>;
//   };

//   if (loading) return <div className="p-6 text-center text-gray-600">Loading...</div>;

//   return (
//     <>
//       <ToastContainer />
//       <div className="p-6 bg-gray-50 min-h-screen">
//         <div className="max-w-5xl mx-auto">
//           <div className="flex justify-between items-center mb-6 print:hidden">
//             <div>
//               <h2 className="text-3xl font-bold text-gray-800">Job Card Workflow</h2>
//               <p className="text-gray-500">Production Order ID: {productionOrderId}</p>
//             </div>
//             <div className="flex gap-2">
//               <button onClick={handleBack} className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100">
//                 <ArrowLeft size={16} /> Back
//               </button>
//               <button onClick={handlePrint} className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100">
//                 <Printer size={16} /> Print
//               </button>
//             </div>
//           </div>

//           <div className="space-y-6">
//             {jobCards.map((jc, idx) => {
//               const data = editableData[jc._id] || {};
//               const timer = timers[jc._id] || {};
//               const isActive = timer.running || data.status === "in progress";

//               return (
//                 <div key={jc._id} className={`bg-white rounded-xl shadow-md ${isActive ? "ring-2 ring-blue-500" : "opacity-80"}`}>
//                   <div className="p-5 border-b flex justify-between items-start">
//                     <div>
//                       <h3 className="text-xl font-bold text-gray-900">{idx + 1}. {jc.operation?.name || "N/A"}</h3>
//                       <p className="text-sm text-gray-900 mt-1">
//                         Machine: {jc.machine?.name || "N/A"} | Operator: {jc.operator?.name || "N/A"}
//                       </p>
//                     </div>
//                     <StatusBadge status={data.status || jc.status} />
//                   </div>

//                   <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">To Manufacture</label>
//                       <p className="text-lg font-semibold mt-1">{jc.qtyToManufacture || 0}</p>
//                     </div>
//                         <div>
//                       <label className="block text-sm font-medium text-gray-500">Reaming Qty</label>
//                       <p className="text-lg font-semibold mt-1">{jc.qtyToManufacture - (data.completedQty || 0) }</p>
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">Completed Qty</label>
//                       <input
//                         type="number"
//                         value={data.completedQty}
//                         onChange={(e) => handleDataChange(jc._id, "completedQty", e.target.value)}
//                         className="mt-1 block w-full border rounded-md px-3 py-2"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">Total Duration (HH:MM:SS)</label>
//                       <div className="flex items-center gap-2 mt-1 text-blue-600 font-semibold">
//                         <Clock size={16} /> {formatTime(timer.seconds)}
//                       </div>
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">Start Date</label>
//                       <p className="mt-1 font-bold text-sm">
//                         {data.actualStartDate ? new Date(data.actualStartDate).toLocaleString("en-IN") : "-"} / 
                       
//                       </p>
//                     </div>
//                        <div>
//                       <label className="block text-sm font-medium text-gray-500">End Date</label>
//                       <p className="mt-1 font-bold text-sm">
                      
//                         {data.actualEndDate ? new Date(data.actualEndDate).toLocaleString("en-IN") : "-"}
//                       </p>
//                     </div>
//                   </div>

//                   <div className="bg-gray-50 px-5 py-3 flex justify-end gap-3 rounded-b-xl">
//                     <button onClick={() => handleStart(jc._id)} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
//                       <Play size={16} /> Start
//                     </button>
//                     <button onClick={() => handleStop(jc._id)} className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-600">
//                       <Square size={16} /> Stop
//                     </button>
//                     <button onClick={() => handleUpdate(jc._id)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700">
//                       <Save size={16} /> Save
//                     </button>
//                     <button onClick={() => handleCompleteAndStartNext(jc._id)} className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700">
//                       <Check size={16} /> Complete
//                     </button>
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

///////////////////////////////////////////////////////////////////////////////////////////////

// "use client";

// import React, { useState, useEffect, useCallback, useRef } from "react";
// import axios from "axios";
// import {
//   Play,
//   Square,
//   Printer,
//   Check,
//   Save,
//   ArrowLeft,
//   Clock,
// } from "lucide-react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const formatDateForInput = (dateStr) => {
//   if (!dateStr) return "";
//   const date = new Date(dateStr);
//   return date.toISOString().split("T")[0];
// };

// const formatTime = (seconds) => {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;
//   return `${hrs.toString().padStart(2, "0")}:${mins
//     .toString()
//     .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
// };

// export default function JobCardPage() {
//   const [productionOrderId, setProductionOrderId] = useState("");
//   const [jobCards, setJobCards] = useState([]);
//   const [activeJobCardId, setActiveJobCardId] = useState(null);
//   const [editableData, setEditableData] = useState({});
//   const [timers, setTimers] = useState({});
//   const [loading, setLoading] = useState(true);

//   const intervalRef = useRef(null);

//   // Fetch production order ID
//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     setProductionOrderId(params.get("productionOrderId") || "");
//   }, []);

//   // Fetch job cards
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

//         const firstIncomplete = cards.find((jc) => jc.status !== "completed");
//         setActiveJobCardId(firstIncomplete?._id || null);

//         const initialData = {};
//         const timerData = {};

//         cards.forEach((c) => {
//           initialData[c._id] = {
//             status: c.status || "planned",
//             completedQty: c.completedQty || 0,
//             actualStartDate: formatDateForInput(c.actualStartDate),
//             actualEndDate: formatDateForInput(c.actualEndDate),
//             totalDuration: c.totalDuration || 0,
//           };
//           timerData[c._id] = {
//             seconds: c.totalDuration || 0,
//             running: c.status === "in progress",
//           };
//         });

//         setEditableData(initialData);
//         setTimers(timerData);
//       } catch (err) {
//         toast.error("Failed to fetch job cards.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobCards();
//   }, [productionOrderId]);

//   // Timer tick logic
//   useEffect(() => {
//     if (intervalRef.current) clearInterval(intervalRef.current);

//     const runningId = Object.keys(timers).find((id) => timers[id]?.running);
//     if (runningId) {
//       intervalRef.current = setInterval(() => {
//         setTimers((prev) => ({
//           ...prev,
//           [runningId]: {
//             ...prev[runningId],
//             seconds: prev[runningId].seconds + 1,
//           },
//         }));
//       }, 1000);
//     }

//     return () => clearInterval(intervalRef.current);
//   }, [timers]);

//   // Data change handler
//   const handleDataChange = useCallback((id, field, value) => {
//     setEditableData((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], [field]: value },
//     }));
//   }, []);

//   // Update job card in backend
//   const updateJobCard = useCallback(async (id, dataToUpdate) => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.put(`/api/ppc/jobcards/${id}`, dataToUpdate, {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       setJobCards((prev) =>
//         prev.map((jc) => (jc._id === id ? res.data.data : jc))
//       );
//       return true;
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to update job card.");
//       return false;
//     }
//   }, []);

//   // START operation
//   const handleStart = async (id) => {
//     const now = new Date();
//     handleDataChange(id, "status", "in progress");
//     handleDataChange(id, "actualStartDate", formatDateForInput(now));

//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: true },
//     }));

//     const success = await updateJobCard(id, {
//       status: "in progress",
//       actualStartDate: now,
//     });
//     if (success) {
//       setActiveJobCardId(id);
//       toast.info("Job card started!");
//     }
//   };

//   // STOP operation
//   const handleStop = async (id) => {
//     const now = new Date();
//     const currentSeconds = timers[id]?.seconds || 0;

//     handleDataChange(id, "status", "on_hold");
//     handleDataChange(id, "actualEndDate", formatDateForInput(now));

//     setTimers((prev) => ({
//       ...prev,
//       [id]: { ...prev[id], running: false },
//     }));

//     const success = await updateJobCard(id, {
//       status: "on_hold",
//       actualEndDate: now,
//       totalDuration: currentSeconds,
//     });

//     if (success) toast.warn("Job card stopped and time saved!");
//   };

//   // SAVE progress manually
//   const handleUpdate = async (id) => {
//     const data = editableData[id];
//     const currentSeconds = timers[id]?.seconds || 0;
//     if (!data) return;

//     const success = await updateJobCard(id, {
//       ...data,
//       completedQty: Number(data.completedQty) || 0,
//       totalDuration: currentSeconds,
//     });
//     if (success) toast.success("Progress saved!");
//   };

//  // COMPLETE operation
// const handleCompleteAndStartNext = async (id) => {
//   const data = editableData[id];
//   const card = jobCards.find((jc) => jc._id === id);
//   if (!data || !card) return;

//   const now = new Date();
//   const totalSeconds = timers[id]?.seconds || 0;

//   let newStatus = "pending";
//   let message = "Job card marked as pending (not fully completed).";

//   if (Number(data.completedQty) === Number(card.qtyToManufacture)) {
//     newStatus = "completed";
//     message = `Operation "${card.operation?.name}" completed successfully!`;
//   }

//   const success = await updateJobCard(id, {
//     ...data,
//     status: newStatus,
//     completedQty: Number(data.completedQty),
//     actualEndDate: now,
//     totalDuration: totalSeconds,
//   });

//   if (!success) return;

//   toast.success(message);

//   setTimers((prev) => ({
//     ...prev,
//     [id]: { ...prev[id], running: false },
//   }));

//   // Start next operation only if completed
//   if (newStatus === "completed") {
//     const nextCard =
//       jobCards[jobCards.findIndex((jc) => jc._id === id) + 1];
//     if (nextCard) {
//       setActiveJobCardId(nextCard._id);
//       handleStart(nextCard._id);
//     } else {
//       setActiveJobCardId(null);
//       toast.success("All job cards completed!");
//     }
//   }
// };

//   const handlePrint = () => window.print();
//   const handleBack = () => (window.location.href = "/admin/ppc/production-orders");

//   // Status badge
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

//   if (loading)
//     return <div className="p-6 text-center text-gray-600">Loading...</div>;

//   return (
//     <>
//       <ToastContainer />
//       <div className="p-6 bg-gray-50 min-h-screen">
//         <div className="max-w-5xl mx-auto">
//           {/* Header */}
//           <div className="flex justify-between items-center mb-6 print:hidden">
//             <div>
//               <h2 className="text-3xl font-bold text-gray-800">
//                 Job Card Workflow
//               </h2>
//               <p className="text-gray-500">
//                 Production Order ID: {productionOrderId}
//               </p>
//             </div>
//             <div className="flex gap-2">
//               <button
//                 onClick={handleBack}
//                 className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100"
//               >
//                 <ArrowLeft size={16} /> Back
//               </button>
//               <button
//                 onClick={handlePrint}
//                 className="bg-white border px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-100"
//               >
//                 <Printer size={16} /> Print
//               </button>
//             </div>
//           </div>

//           {/* Job Cards */}
//           <div className="space-y-6">
//             {jobCards.map((jc, idx) => {
//               const isActive = jc._id === activeJobCardId;
//               const data = editableData[jc._id] || {};
//               const timer = timers[jc._id] || {};

//               return (
//                 <div
//                   key={jc._id}
//                   className={`bg-white rounded-xl shadow-md ${
//                     isActive ? "ring-2 ring-blue-500" : "opacity-80"
//                   }`}
//                 >
//                   <div className="p-5 border-b flex justify-between items-start">
//                     <div>
//                       <h3 className="text-xl font-bold text-gray-900">
//                         {idx + 1}. {jc.operation?.name || "N/A"}
//                       </h3>
//                       <p className="text-sm text-gray-500 mt-1">
//                         Machine: {jc.machine?.name || "N/A"} | Operator:{" "}
//                         {jc.operator?.name || "N/A"}
//                       </p>
//                     </div>
//                     <StatusBadge status={data.status || jc.status} />
//                   </div>

//                   <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">
//                         To Manufacture
//                       </label>
//                       <p className="text-lg font-semibold mt-1">
//                         {jc.qtyToManufacture || 0}
//                       </p>
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">
//                         Completed Qty
//                       </label>
//                       <input
//                         type="number"
//                         value={data.completedQty}
//                         onChange={(e) =>
//                           handleDataChange(jc._id, "completedQty", e.target.value)
//                         }
//                         disabled={!isActive}
//                         className="mt-1 block w-full border rounded-md px-3 py-2"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">
//                         Timer (HH:MM:SS)
//                       </label>
//                       <div className="flex items-center gap-2 mt-1 text-blue-600 font-semibold">
//                         <Clock size={16} />
//                         {formatTime(timer.seconds)}
//                       </div>
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">
//                         Actual Start Date
//                       </label>
//                       <input
//                         type="date"
//                         value={data.actualStartDate}
//                         disabled
//                         className="mt-1 block w-full border rounded-md px-3 py-2 bg-gray-50"
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-gray-500">
//                         Actual End Date
//                       </label>
//                       <input
//                         type="date"
//                         value={data.actualEndDate}
//                         disabled
//                         className="mt-1 block w-full border rounded-md px-3 py-2 bg-gray-50"
//                       />
//                     </div>
//                   </div>

//                   {/* Actions */}
//                   {isActive && (
//                     <div className="bg-gray-50 px-5 py-3 flex justify-end gap-3 rounded-b-xl">
//                       <button
//                         onClick={() => handleStart(jc._id)}
//                         className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
//                       >
//                         <Play size={16} /> Start
//                       </button>
//                       <button
//                         onClick={() => handleStop(jc._id)}
//                         className="bg-yellow-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-600"
//                       >
//                         <Square size={16} /> Stop
//                       </button>
//                       <button
//                         onClick={() => handleUpdate(jc._id)}
//                         className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700"
//                       >
//                         <Save size={16} /> Save
//                       </button>
//                       <button
//                         onClick={() => handleCompleteAndStartNext(jc._id)}
//                         className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700"
//                       >
//                         <Check size={16} /> Complete & Next
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               );
//             })}

//             {/* All Completed */}
//             {activeJobCardId === null && jobCards.length > 0 && (
//               <div className="text-center p-10 bg-white rounded-lg shadow-md border-2 border-dashed border-green-500">
//                 <Check size={48} className="mx-auto text-green-500" />
//                 <h3 className="text-2xl font-bold text-green-700 mt-4">
//                   All Operations Completed!
//                 </h3>
//                 <p className="text-gray-600 mt-2">
//                   This production order has been successfully processed.
//                 </p>
//               </div>
//             )}
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }
