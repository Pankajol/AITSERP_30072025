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
  Car,
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Time format helper
const formatTime = (seconds) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hrs.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

const formatDateTime = (date) =>
  date ? new Date(date).toLocaleString() : "-";

export default function JobCardPage() {
  const [productionOrderId, setProductionOrderId] = useState("");
  const [jobCards, setJobCards] = useState([]);
  const [editableData, setEditableData] = useState({});
  const [timers, setTimers] = useState({});
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef({});
  const secondsRef = useRef({});

  // ─── Fetch Production Order ID ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProductionOrderId(params.get("productionOrderId") || "");
  }, []);

  // ─── Fetch Job Cards ───
  useEffect(() => {
    if (!productionOrderId) return;

    const fetchJobCards = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const cards = res.data?.data || [];
        setJobCards(cards);

        const initData = {};
        const timerData = {};

        cards.forEach((c) => {
          initData[c._id] = {
            completedQty: c.completedQty || 0,
            status: c.status || "planned",
            actualStartDate: c.actualStartDate
              ? new Date(c.actualStartDate)
              : null,
            actualEndDate: c.actualEndDate ? new Date(c.actualEndDate) : null,
          };
          timerData[c._id] = {
            seconds: c.totalDuration || 0,
            running: c.status === "in progress",
          };
          secondsRef.current[c._id] = c.totalDuration || 0;
        });

        setEditableData(initData);
        setTimers(timerData);
      } catch (err) {
        toast.error("Failed to fetch job cards.");
      } finally {
        setLoading(false);
      }
    };

    fetchJobCards();
  }, [productionOrderId]);

  // ─── Manage Timers ───
  useEffect(() => {
    Object.keys(timers).forEach((id) => {
      if (timers[id].running && !intervalRef.current[id]) {
        intervalRef.current[id] = setInterval(() => {
          secondsRef.current[id] = (secondsRef.current[id] || 0) + 1;
          setTimers((prev) => ({
            ...prev,
            [id]: { ...prev[id], seconds: secondsRef.current[id] },
          }));
        }, 1000);
      } else if (!timers[id].running && intervalRef.current[id]) {
        clearInterval(intervalRef.current[id]);
        intervalRef.current[id] = null;
      }
    });

    return () => {
      Object.values(intervalRef.current).forEach(clearInterval);
    };
  }, [timers]);

  // ─── Helpers ───
  const handleDataChange = useCallback((id, field, value) => {
    setEditableData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }, []);

  const updateJobCard = useCallback(async (id, payload) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setJobCards((prev) =>
        prev.map((jc) => (jc._id === id ? res.data.data : jc))
      );
      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed!");
      return false;
    }
  }, []);

  // ─── Timer Controls ───
  const handleStart = async (id) => {
    const now = new Date();
    handleDataChange(id, "status", "in progress");
    handleDataChange(id, "actualStartDate", now);
    await updateJobCard(id, { status: "in progress", actualStartDate: now });

    setTimers((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: true },
    }));
    toast.info("Started!");
  };

  const handleStop = async (id) => {
    const now = new Date();
    handleDataChange(id, "status", "on_hold");
    handleDataChange(id, "actualEndDate", now);
    await updateJobCard(id, {
      status: "on_hold",
      actualEndDate: now,
      totalDuration: secondsRef.current[id],
    });

    setTimers((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: false },
    }));
    toast.warn("Paused!");
  };

  const handleUpdate = async (id) => {
    const data = editableData[id];
    if (!data) return;
    await updateJobCard(id, {
      ...data,
      totalDuration: secondsRef.current[id],
    });
    toast.success("Updated!");
  };

  const handleComplete = async (id) => {
    const data = editableData[id];
    if (!data) return;
    await updateJobCard(id, {
      ...data,
      status: "completed",
      totalDuration: secondsRef.current[id],
    });
    setTimers((prev) => ({
      ...prev,
      [id]: { ...prev[id], running: false },
    }));
    toast.success("Completed!");
  };

  // ─── Status Badge ───
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
        {status}
      </span>
    );
  };

  // ─── Render ───
  if (loading)
    return <div className="p-6 text-center text-gray-600">Loading...</div>;

  return (
    <>
      <ToastContainer />
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Car size={24} /> Job Card Workflow
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

          {/* Job Cards */}
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {jobCards.map((jc, idx) => {
              const data = editableData[jc._id] || {};
              const timer = timers[jc._id] || {};
              const progressPercent = Math.min(
                (data.completedQty / jc.qtyToManufacture) * 100,
                100
              );
              let progressColor = "bg-red-500";
              if (progressPercent > 0 && progressPercent < 100)
                progressColor = "bg-yellow-400";
              if (progressPercent >= 100) progressColor = "bg-green-500";

              return (
                <div
                  key={jc._id}
                  className="bg-white rounded-xl shadow-md overflow-hidden"
                >
                  {/* Header */}
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

                      {/* Progress Bar with aligned car */}
                      <div className="relative w-full bg-gray-300 h-3 rounded-full mt-3 overflow-visible">
                        <div
                          className={`${progressColor} h-3 rounded-full transition-all duration-500 relative`}
                          style={{ width: `${progressPercent}%` }}
                        >
                          <div className="absolute -top-[6px] right-[-10px] flex items-center justify-center">
                            <Car size={18} className="text-gray-700" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={data.status || jc.status} />
                  </div>

                  {/* Body */}
                  <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-sm text-gray-500">To Manufacture</p>
                      <p className="font-semibold">{jc.qtyToManufacture}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Allowed Qty (Prev)</p>
                      <p className="font-semibold text-blue-700">
                        {jc.qtyToManufacture}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Completed Qty</p>
                      <input
                        type="number"
                        value={data.completedQty}
                        onChange={(e) =>
                          handleDataChange(
                            jc._id,
                            "completedQty",
                            Number(e.target.value)
                          )
                        }
                        className="mt-1 border rounded-md px-2 py-1 w-full"
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
                        className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                      >
                        <Play size={16} /> Start
                      </button>
                      <button
                        onClick={() => handleStop(jc._id)}
                        className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 flex items-center gap-1"
                      >
                        <Square size={16} /> Stop
                      </button>
                      <button
                        onClick={() => handleUpdate(jc._id)}
                        className="bg-indigo-600 text-white px-3 py-1 rounded hover:bg-indigo-700 flex items-center gap-1"
                      >
                        <Save size={16} /> Save
                      </button>
                      <button
                        onClick={() => handleComplete(jc._id)}
                        className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 flex items-center gap-1"
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