"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { Play, Square, Check, Save, ArrowLeft, Clock, Truck } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { motion } from "framer-motion";
import "react-toastify/dist/ReactToastify.css";

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
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
    if (!token) return setLoading(false);
    const user = jwtDecode(token);
    if (!user) return setLoading(false);
    setCurrentUser(user);
  }, []);

  // Fetch job cards assigned to current user
  useEffect(() => {
    if (!currentUser) return;
    const fetchJobCards = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("/api/ppc/jobcards", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const allCards = res.data?.data || [];
        const myCards = allCards.filter(c => c.operator?.employeeId === currentUser.id);

        const editable = {};
        myCards.forEach(c => {
          editable[c._id] = {
            completedQty: c.completedQty ?? 0,
            status: c.status ?? "planned",
            actualStartDate: c.actualStartDate ? new Date(c.actualStartDate) : null,
            actualEndDate: c.actualEndDate ? new Date(c.actualEndDate) : null,
          };
          timersRef.current[c._id] = c.totalDuration ?? 0;
        });

        setJobCards(myCards);
        setEditableData(editable);
      } catch (err) {
        toast.error("Failed to load job cards");
      } finally {
        setLoading(false);
      }
    };
    fetchJobCards();
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
      setJobCards(prev =>
        prev.map(jc => (jc._id === id ? updated : jc))
      );

      setEditableData(prev => ({
        ...prev,
        [id]: {
          completedQty: updated.completedQty ?? 0,
          status: updated.status ?? "planned",
          actualStartDate: updated.actualStartDate ? new Date(updated.actualStartDate) : null,
          actualEndDate: updated.actualEndDate ? new Date(updated.actualEndDate) : null,
        },
      }));

      timersRef.current[id] = updated.totalDuration ?? 0;

      // Show toast **only if completedQty was updated**
      if (payload.completedQty !== undefined) {
        toast.success(`Completed Qty updated to ${updated.completedQty}`);
      }

      return true;
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed!");
      return false;
    }
  }, []);

  // Start timer
  const startTimer = (id) => {
    if (intervalsRef.current[id]) return;
    intervalsRef.current[id] = setInterval(() => {
      timersRef.current[id] += 1;
      setEditableData(prev => ({ ...prev }));
    }, 1000);
  };

  // Stop timer
  const stopTimer = (id) => {
    if (intervalsRef.current[id]) {
      clearInterval(intervalsRef.current[id]);
      intervalsRef.current[id] = null;
    }
  };

  // Handlers
  const handleStart = async (id) => {
    const local = editableData[id];
    const startDate = local.actualStartDate || new Date();
    setEditableData(prev => ({ ...prev, [id]: { ...prev[id], status: "in progress", actualStartDate: startDate } }));
    startTimer(id);
    await updateJobCard(id, { status: "in progress", actualStartDate: startDate });
    toast.info("Timer started");
  };

  const handleStop = async (id) => {
    const now = new Date();
    setEditableData(prev => ({ ...prev, [id]: { ...prev[id], status: "on_hold", actualEndDate: now } }));
    stopTimer(id);
    await updateJobCard(id, { status: "on_hold", actualEndDate: now, totalDuration: timersRef.current[id] });
    toast.warn("Timer paused");
  };

  const handleSave = async (id) => {
    const local = editableData[id];
    await updateJobCard(id, {
      completedQty: Number(local.completedQty ?? 0),
      totalDuration: timersRef.current[id],
      actualStartDate: local.actualStartDate,
      actualEndDate: local.actualEndDate,
      status: local.status
    });
  };

  const handleComplete = async (id) => {
    const now = new Date();
    stopTimer(id);
    setEditableData(prev => ({ ...prev, [id]: { ...prev[id], status: "completed", actualEndDate: now } }));
    await updateJobCard(id, { status: "completed", actualEndDate: now, totalDuration: timersRef.current[id] });
    toast.success("Marked as completed!");
  };

  const handleInputChange = (id, field, value) => {
    setEditableData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  if (loading) return <div className="p-6 text-center text-gray-600">Loading...</div>;

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
              onClick={() => (window.location.href = "/admin/ppc/production-orders")}
              className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Back to Orders
            </button>
          </div>

          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {jobCards.length === 0 && (
              <div className="text-center py-10 text-gray-500">No job cards assigned.</div>
            )}

            {jobCards.map((jc, idx) => {
              const id = jc._id;
              const local = editableData[id] || {};
              const status = local.status ?? "planned";
              const completedQty = Number(local.completedQty ?? 0);
              const qtyToManufacture = jc.qtyToManufacture ?? 0;
              const progressPercent = qtyToManufacture > 0 ? Math.min((completedQty / qtyToManufacture) * 100, 100) : 0;

              return (
                <div key={id} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold">{idx + 1}. {jc.operation?.name || "N/A"}</h3>
                      <p className="text-sm font-semibold text-purple-700">Order: {jc.productionOrder?.orderNumber || "N/A"}</p>
                      <p className="text-sm text-gray-600">Machine: {jc.machine?.name || "N/A"}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        Start: {local.actualStartDate ? new Date(local.actualStartDate).toLocaleString() : "-"} | 
                        End: {local.actualEndDate ? new Date(local.actualEndDate).toLocaleString() : "-"}
                      </p>

                      <div className="relative w-full bg-gray-200 h-3 rounded-full mt-3 overflow-visible">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${progressPercent >= 100 ? "bg-green-500" : progressPercent > 0 ? "bg-yellow-400" : "bg-gray-300"}`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>

                        <motion.div
                          className="absolute -top-4"
                          initial={{ x: 0 }}
                          animate={{ x: `${progressPercent}%` }}
                          transition={{ ease: "linear", duration: 0.5 }}
                        >
                          <Truck size={20} className="text-gray-700" />
                        </motion.div>
                      </div>
                    </div>

                    <div>
                      <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
                        status === "planned" ? "bg-gray-200 text-gray-800" :
                        status === "in progress" ? "bg-blue-200 text-blue-800 animate-pulse" :
                        status === "on_hold" ? "bg-yellow-200 text-yellow-800" :
                        status === "completed" ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"
                      }`}>
                        {status.replace(/_/g, ' ')}
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
                      <p className="font-semibold text-blue-700">{qtyToManufacture}</p>
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Completed Qty</p>
                      <input
                        type="number"
                        min={0}
                        value={local.completedQty ?? 0}
                        onChange={(e) => handleInputChange(id, "completedQty", Number(e.target.value))}
                        className="mt-1 border rounded-md px-2 py-1 w-full"
                        disabled={status === "completed"}
                      />
                    </div>

                    <div>
                      <p className="text-sm text-gray-500">Total Duration</p>
                      <div className="flex items-center gap-1 text-blue-600 font-semibold">
                        <Clock size={16} /> {formatTime(timersRef.current[id] ?? 0)}
                      </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => handleStart(id)} disabled={status === "completed" || status === "in progress"} className="px-3 py-1 rounded flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700"><Play size={16} /> Start</button>
                      <button onClick={() => handleStop(id)} disabled={status !== "in progress"} className="px-3 py-1 rounded flex items-center gap-1 bg-yellow-500 text-white hover:bg-yellow-600"><Square size={16} /> Stop</button>
                      <button onClick={() => handleSave(id)} disabled={status === "completed"} className="px-3 py-1 rounded flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700"><Save size={16} /> Save</button>
                      <button onClick={() => handleComplete(id)} disabled={status === "completed"} className="px-3 py-1 rounded flex items-center gap-1 bg-green-600 text-white hover:bg-green-700"><Check size={16} /> Complete</button>
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
// import { Play, Square, Check, Save, ArrowLeft, Clock, Truck } from "lucide-react";
// import { ToastContainer, toast } from "react-toastify";
// import { motion } from "framer-motion";
// import "react-toastify/dist/ReactToastify.css";

// // --- JWT Decoder ---
// const jwtDecode = (token) => {
//   try {
//     const base64Url = token.split(".")[1];
//     const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
//     const jsonPayload = decodeURIComponent(
//       atob(base64)
//         .split("")
//         .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
//         .join("")
//     );
//     return JSON.parse(jsonPayload);
//   } catch (e) {
//     return null;
//   }
// };

// // --- Format seconds ---
// const formatTime = (seconds = 0) => {
//   const hrs = Math.floor(seconds / 3600);
//   const mins = Math.floor((seconds % 3600) / 60);
//   const secs = seconds % 60;
//   return `${String(hrs).padStart(2,"0")}:${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;
// };

// export default function JobCardPage() {
//   const [jobCards, setJobCards] = useState([]);
//   const [editableData, setEditableData] = useState({});
//   const [loading, setLoading] = useState(true);
//   const [currentUser, setCurrentUser] = useState(null);

//   // --- Timer refs ---
//   const timersRef = useRef({});
//   const intervalsRef = useRef({});

//   // --- Decode token ---
//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       toast.error("Not logged in");
//       setLoading(false);
//       return;
//     }
//     const user = jwtDecode(token);
//     if (!user) {
//       toast.error("Invalid token");
//       setLoading(false);
//     } else {
//       setCurrentUser(user);
//     }
//   }, []);

//   // --- Fetch job cards ---
//   useEffect(() => {
//     if (!currentUser) return;

//     const fetchJobCards = async () => {
//       setLoading(true);
//       try {
//         const token = localStorage.getItem("token");
//         const res = await axios.get("/api/ppc/jobcards", {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const allCards = res.data?.data || [];
//         const myCards = allCards.filter(c => c.operator?.employeeId === currentUser.id);

//         const editable = {};
//         myCards.forEach(c => {
//           editable[c._id] = {
//             completedQty: c.completedQty ?? 0,
//             status: c.status ?? "planned",
//             actualStartDate: c.actualStartDate ? new Date(c.actualStartDate) : null,
//             actualEndDate: c.actualEndDate ? new Date(c.actualEndDate) : null,
//           };
//           timersRef.current[c._id] = c.totalDuration ?? 0;
//         });

//         setJobCards(myCards);
//         setEditableData(editable);
//       } catch (err) {
//         console.error(err);
//         toast.error("Failed to load job cards");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobCards();
//   }, [currentUser]);

//   // --- Update server ---
//   const updateJobCard = useCallback(async (id, payload) => {
//     try {
//       const token = localStorage.getItem("token");
//       const res = await axios.put(`/api/ppc/jobcards/${id}`, payload, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       setJobCards(prev =>
//         prev.map(jc => (jc._id === id ? res.data.data : jc))
//       );
//       return true;
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Update failed!");
//       return false;
//     }
//   }, []);

//   // --- Timer functions ---
//   const startTimer = (id) => {
//     if (intervalsRef.current[id]) return;
//     intervalsRef.current[id] = setInterval(() => {
//       timersRef.current[id] += 1;
//       setEditableData(prev => ({ ...prev }));
//     }, 1000);
//   };

//   const stopTimer = (id) => {
//     if (intervalsRef.current[id]) {
//       clearInterval(intervalsRef.current[id]);
//       intervalsRef.current[id] = null;
//     }
//   };

//   // --- Handlers ---
//   const handleStart = async (id) => {
//     const local = editableData[id];
//     const startDate = local.actualStartDate || new Date();
//     setEditableData(prev => ({ ...prev, [id]: { ...prev[id], status: "in progress", actualStartDate: startDate } }));
//     startTimer(id);
//     await updateJobCard(id, { status: "in progress", actualStartDate: startDate });
//   };

//   const handleStop = async (id) => {
//     const now = new Date();
//     setEditableData(prev => ({ ...prev, [id]: { ...prev[id], status: "on_hold", actualEndDate: now } }));
//     stopTimer(id);
//     await updateJobCard(id, { status: "on_hold", actualEndDate: now, totalDuration: timersRef.current[id] });
//   };

//   const handleSave = async (id) => {
//     const local = editableData[id];
//     await updateJobCard(id, {
//       completedQty: Number(local.completedQty ?? 0),
//       totalDuration: timersRef.current[id],
//       actualStartDate: local.actualStartDate,
//       actualEndDate: local.actualEndDate,
//     });
//   };

//   const handleComplete = async (id) => {
//     const now = new Date();
//     stopTimer(id);
//     setEditableData(prev => ({ ...prev, [id]: { ...prev[id], status: "completed", actualEndDate: now } }));
//     await updateJobCard(id, { status: "completed", actualEndDate: now, totalDuration: timersRef.current[id] });
//   };

//   const handleInputChange = (id, field, value) => {
//     setEditableData(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
//   };

//   if (loading) return <div className="p-6 text-center text-gray-600">Loading...</div>;

//   return (
//     <>
//       <ToastContainer position="top-right" autoClose={3000} />
//       <div className="p-6 bg-gray-50 min-h-screen">
//         <div className="max-w-4xl mx-auto">
//           <div className="flex justify-between items-center mb-6">
//             <h2 className="text-2xl font-bold flex items-center gap-2">
//               <Truck size={24} /> My Assigned Job Cards
//             </h2>
//             <button
//               onClick={() => (window.location.href = "/admin/ppc/production-orders")}
//               className="bg-white border px-4 py-2 rounded-lg hover:bg-gray-100 flex items-center gap-2"
//             >
//               <ArrowLeft size={16} /> Back to Orders
//             </button>
//           </div>

//           <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
//             {jobCards.length === 0 && (
//               <div className="text-center py-10 text-gray-500">No job cards assigned.</div>
//             )}

//             {jobCards.map((jc, idx) => {
//               const id = jc._id;
//               const local = editableData[id] || {};
//               const status = local.status ?? "planned";
//               const completedQty = Number(local.completedQty ?? 0);
//               const qtyToManufacture = jc.qtyToManufacture ?? 0;
//               const progressPercent = qtyToManufacture > 0 ? Math.min((completedQty / qtyToManufacture) * 100, 100) : 0;

//               return (
//                 <div key={id} className="bg-white rounded-xl shadow-md overflow-hidden">
//                   <div className="p-4 flex justify-between items-start">
//                     <div className="flex-1">
//                       <h3 className="text-lg font-bold">{idx + 1}. {jc.operation?.name || "N/A"}</h3>
//                       <p className="text-sm font-semibold text-purple-700">Order: {jc.productionOrder?.orderNumber || "N/A"}</p>
//                       <p className="text-sm text-gray-600">Machine: {jc.machine?.name || "N/A"}</p>
//                       <p className="text-sm text-gray-400 mt-1">Start: {local.actualStartDate ? new Date(local.actualStartDate).toLocaleString() : "-"} | End: {local.actualEndDate ? new Date(local.actualEndDate).toLocaleString() : "-"}</p>

//                       {/* Progress bar + animated truck */}
//                       <div className="relative w-full bg-gray-200 h-3 rounded-full mt-3 overflow-visible">
//                         <div
//                           className={`h-3 rounded-full transition-all duration-500 ${progressPercent >= 100 ? "bg-green-500" : progressPercent > 0 ? "bg-yellow-400" : "bg-gray-300"}`}
//                           style={{ width: `${progressPercent}%` }}
//                         ></div>

//                         <motion.div
//                           className="absolute -top-4"
//                           initial={{ x: 0 }}
//                           animate={{ x: `${progressPercent}%` }}
//                           transition={{ ease: "linear", duration: 0.5 }}
//                         >
//                           <Truck size={20} className="text-gray-700" />
//                         </motion.div>
//                       </div>
//                     </div>

//                     <div>
//                       <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${
//                         status === "planned" ? "bg-gray-200 text-gray-800" :
//                         status === "in progress" ? "bg-blue-200 text-blue-800 animate-pulse" :
//                         status === "on_hold" ? "bg-yellow-200 text-yellow-800" :
//                         status === "completed" ? "bg-green-200 text-green-800" : "bg-gray-200 text-gray-800"
//                       }`}>{status.replace(/_/g, ' ')}</span>
//                     </div>
//                   </div>

//                   <div className="p-4 border-t grid grid-cols-1 sm:grid-cols-5 gap-4 items-center">
//                     <div>
//                       <p className="text-sm text-gray-500">To Manufacture</p>
//                       <p className="font-semibold">{qtyToManufacture}</p>
//                     </div>

//                     <div>
//                       <p className="text-sm text-gray-500">Allowed Qty</p>
//                       <p className="font-semibold text-blue-700">{qtyToManufacture}</p>
//                     </div>

//                     <div>
//                       <p className="text-sm text-gray-500">Completed Qty</p>
//                       <input
//                         type="number"
//                         min={0}
//                         value={local.completedQty ?? 0}
//                         onChange={(e) => handleInputChange(id, "completedQty", Number(e.target.value))}
//                         className="mt-1 border rounded-md px-2 py-1 w-full"
//                         disabled={status === "completed"}
//                       />
//                     </div>

//                     <div>
//                       <p className="text-sm text-gray-500">Total Duration</p>
//                       <div className="flex items-center gap-1 text-blue-600 font-semibold">
//                         <Clock size={16} /> {formatTime(timersRef.current[id] ?? 0)}
//                       </div>
//                     </div>

//                     <div className="flex gap-2 flex-wrap">
//                       <button onClick={() => handleStart(id)} disabled={status === "completed" || status === "in progress"} className="px-3 py-1 rounded flex items-center gap-1 bg-blue-600 text-white hover:bg-blue-700"><Play size={16} /> Start</button>
//                       <button onClick={() => handleStop(id)} disabled={status !== "in progress"} className="px-3 py-1 rounded flex items-center gap-1 bg-yellow-500 text-white hover:bg-yellow-600"><Square size={16} /> Stop</button>
//                       <button onClick={() => handleSave(id)} disabled={status === "completed"} className="px-3 py-1 rounded flex items-center gap-1 bg-indigo-600 text-white hover:bg-indigo-700"><Save size={16} /> Save</button>
//                       <button onClick={() => handleComplete(id)} disabled={status === "completed"} className="px-3 py-1 rounded flex items-center gap-1 bg-green-600 text-white hover:bg-green-700"><Check size={16} /> Complete</button>
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
