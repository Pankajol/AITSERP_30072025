// "use client";

// import { useEffect, useState, Suspense } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import axios from "axios";
// import {
//   ArrowLeft,
//   Search,
//   Eye,
//   Printer,
//   Play,
//   Square,
//   Workflow,
//   Loader2,
//   AlertCircle,
//   CheckCircle2,
//   Clock,
//   Layers,
//   ChevronDown,
//   ChevronUp,
//   Gauge,
//   MoreHorizontal,
// } from "lucide-react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // ── Wrapper for useSearchParams ─────────────────────────────
// export default function JobCardListWrapper() {
//   return (
//     <Suspense
//       fallback={
//         <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
//           <Loader2 className="animate-spin h-10 w-10 text-sky-600" />
//         </div>
//       }
//     >
//       <JobCardListPage />
//     </Suspense>
//   );
// }

// function JobCardListPage() {
//   const searchParams = useSearchParams();
//   const productionOrderId = searchParams.get("productionOrderId");
//   const router = useRouter();

//   const [token, setToken] = useState(null);
//   const [jobCards, setJobCards] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");
//   const [activeJob, setActiveJob] = useState(null);       // End modal
//   const [endQty, setEndQty] = useState(0);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [actionState, setActionState] = useState({});    // { id: "starting"/"ending" }
//   const [expandedIds, setExpandedIds] = useState({});

//   useEffect(() => {
//     const tk = localStorage.getItem("token");
//     if (tk) setToken(tk);
//   }, []);

//   useEffect(() => {
//     if (!productionOrderId || !token) return;
//     const fetchCards = async () => {
//       try {
//         setLoading(true);
//         const res = await axios.get(
//           `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const cards = res.data?.data || [];
//         setJobCards(Array.isArray(cards) ? cards : [cards]);
//         const initExpanded = {};
//         cards.forEach((c) => (initExpanded[c._id] = false));
//         setExpandedIds(initExpanded);
//       } catch (err) {
//         setError("Failed to fetch job cards");
//         toast.error("Failed to fetch job cards");
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchCards();
//   }, [productionOrderId, token]);

//   const handleView = (id) => router.push(`/admin/ppc/jobcards/${id}`);
//   const handlePrint = (id) => window.open(`/admin/ppc/jobcards/${id}`, "_blank")?.focus();
//   const toggleExpand = (id) => setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));

//   const handleStart = async (jc) => {
//     try {
//       setActionState((prev) => ({ ...prev, [jc._id]: "starting" }));
//       await axios.patch(
//         `/api/ppc/jobcards?id=${jc._id}&action=start`,
//         {},
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setJobCards((prev) =>
//         prev.map((j) =>
//           j._id === jc._id ? { ...j, status: "in progress", actualStartDate: new Date() } : j
//         )
//       );
//       toast.success(`${jc.jobCardNo} started`);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to start");
//     } finally {
//       setActionState((prev) => ({ ...prev, [jc._id]: undefined }));
//     }
//   };

//   const handleEnd = (jc) => {
//     setActiveJob(jc);
//     setEndQty(jc.qtyToManufacture - (jc.completedQty || 0));
//   };

//   const confirmEnd = async () => {
//     if (!activeJob) return;
//     if (endQty <= 0 || endQty > activeJob.qtyToManufacture - (activeJob.completedQty || 0)) {
//       toast.error("Invalid quantity");
//       return;
//     }
//     try {
//       setActionState((prev) => ({ ...prev, [activeJob._id]: "ending" }));
//       const res = await axios.patch(
//         `/api/ppc/jobcards?id=${activeJob._id}&action=end`,
//         {
//           completedQty: (activeJob.completedQty || 0) + endQty,
//           status: "completed",
//         },
//         { headers: { Authorization: `Bearer ${token}` } }
//       );
//       setJobCards((prev) =>
//         prev.map((jc) => (jc._id === activeJob._id ? res.data.data : jc))
//       );
//       toast.success(`${activeJob.jobCardNo} completed`);
//       const currentIndex = jobCards.findIndex((jc) => jc._id === activeJob._id);
//       const nextJob = jobCards[currentIndex + 1];
//       if (nextJob && nextJob.status !== "completed") {
//         handleStart(nextJob);
//       }
//       setActiveJob(null);
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to complete");
//     } finally {
//       setActionState((prev) => ({ ...prev, [activeJob._id]: undefined }));
//     }
//   };

//   const filteredCards = jobCards.filter((jc) =>
//     [jc.jobCardNo, jc.operation?.name, jc.machine?.name, jc.operator?.name]
//       .some((s) => (s || "").toLowerCase().includes(searchQuery.toLowerCase()))
//   );

//   const statusConfig = {
//     planned: { bg: "bg-slate-100", text: "text-slate-700", icon: Clock },
//     "in progress": { bg: "bg-sky-100", text: "text-sky-700", icon: Loader2, animate: true },
//     on_hold: { bg: "bg-amber-100", text: "text-amber-700", icon: AlertCircle },
//     completed: { bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
//   };

//   const StatusBadge = ({ status }) => {
//     const config = statusConfig[status] || statusConfig.planned;
//     const Icon = config.icon;
//     return (
//       <span
//         className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
//       >
//         <Icon
//           className={`h-3.5 w-3.5 ${config.animate ? "animate-spin" : ""}`}
//         />
//         {config.label || status}
//       </span>
//     );
//   };

//   // ── Loading skeleton ──────────────────────────────────────
//   if (loading) {
//     return (
//       <div className="min-h-screen bg-[#f0f2f5] py-8 px-4 sm:px-10">
//         <div className="max-w-5xl mx-auto space-y-6">
//           {[...Array(4)].map((_, i) => (
//             <div key={i} className="animate-pulse bg-white rounded-2xl p-6 shadow-sm">
//               <div className="flex gap-4">
//                 <div className="w-12 h-12 bg-gray-200 rounded-full" />
//                 <div className="flex-1 space-y-2">
//                   <div className="h-4 bg-gray-200 rounded w-1/4" />
//                   <div className="h-3 bg-gray-100 rounded w-1/2" />
//                 </div>
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
//         <div className="text-center bg-white rounded-2xl p-10 shadow-sm max-w-md">
//           <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
//           <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load job cards</h2>
//           <p className="text-gray-500 mb-6">{error}</p>
//           <button
//             onClick={() => window.location.reload()}
//             className="px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   if (!productionOrderId) {
//     return (
//       <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center">
//         <div className="text-center bg-white rounded-2xl p-10 shadow-sm max-w-md">
//           <Layers className="mx-auto h-12 w-12 text-gray-400 mb-4" />
//           <h2 className="text-xl font-bold text-gray-900 mb-2">Missing Order ID</h2>
//           <p className="text-gray-500 mb-6">No production order was specified.</p>
//           <button
//             onClick={() => router.back()}
//             className="px-4 py-2 bg-sky-600 text-white rounded-xl text-sm font-bold hover:bg-sky-700 transition-all"
//           >
//             Go Back
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#f0f2f5] py-8 px-4 sm:px-10">
//       <div className="max-w-5xl mx-auto">
//         {/* ── Header ── */}
//         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
//           <div className="flex items-center gap-3">
//             <button
//               onClick={() => router.back()}
//               className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-sky-600 hover:border-sky-200 transition-all shadow-sm"
//             >
//               <ArrowLeft className="h-5 w-5" />
//             </button>
//             <div>
//               <h1 className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
//                 <Layers className="h-6 w-6 text-sky-600" />
//                 Production Job Cards
//               </h1>
//               <p className="text-sm text-gray-500 mt-0.5">Interactive workflow tracker</p>
//             </div>
//           </div>
//           <div className="flex items-center gap-3">
//             <div className="relative">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
//               <input
//                 type="text"
//                 className="pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-50 outline-none w-64 transition-all"
//                 placeholder="Search..."
//                 value={searchQuery}
//                 onChange={(e) => setSearchQuery(e.target.value)}
//               />
//             </div>
//             <button
//               onClick={() => router.push(`/admin/ppc/jobcards?productionOrderId=${productionOrderId}`)}
//               className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all"
//             >
//               <Workflow className="h-4 w-4" />
//               Workflow View
//             </button>
//           </div>
//         </div>

//         {/* ── Card list ── */}
//         <div className="space-y-5">
//           {filteredCards.length === 0 ? (
//             <div className="bg-white rounded-2xl p-12 shadow-sm text-center">
//               <Gauge className="mx-auto h-12 w-12 text-gray-300 mb-4" />
//               <p className="text-sm font-medium text-gray-500">No job cards found</p>
//               <p className="text-xs text-gray-400 mt-1">Adjust your search or create a new one.</p>
//             </div>
//           ) : (
//             filteredCards.map((jc) => {
//               const isExpanded = expandedIds[jc._id] || false;
//               const progress = jc.qtyToManufacture > 0
//                 ? Math.round(((jc.completedQty || 0) / jc.qtyToManufacture) * 100)
//                 : 0;
//               const isStarting = actionState[jc._id] === "starting";
//               const isEnding = actionState[jc._id] === "ending";

//               return (
//                 <div
//                   key={jc._id}
//                   className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden group"
//                 >
//                   {/* Compact header */}
//                   <div
//                     onClick={() => toggleExpand(jc._id)}
//                     className="flex items-center justify-between p-5 cursor-pointer select-none"
//                   >
//                     <div className="flex items-center gap-4 flex-1 min-w-0">
//                       <div className="relative">
//                         <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center text-sky-700 font-extrabold text-sm">
//                           {jc.jobCardNo?.slice(-2) || "?"}
//                         </div>
//                         {jc.status === "in progress" && (
//                           <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-sky-400 rounded-full border-2 border-white animate-pulse" />
//                         )}
//                       </div>
//                       <div className="min-w-0">
//                         <p className="font-bold text-gray-900 truncate">{jc.jobCardNo}</p>
//                         <p className="text-xs text-gray-500 truncate">{jc.operation?.name || "Unnamed operation"}</p>
//                       </div>
//                     </div>
//                     <div className="flex items-center gap-3 flex-shrink-0 ml-4">
//                       <StatusBadge status={jc.status} />
//                       {isExpanded ? (
//                         <ChevronUp className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
//                       ) : (
//                         <ChevronDown className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
//                       )}
//                     </div>
//                   </div>

//                   {/* Expandable details */}
//                   <div
//                     className={`transition-all duration-300 ease-in-out ${
//                       isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0 overflow-hidden"
//                     }`}
//                   >
//                     <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-5">
//                       {/* Progress gauge */}
//                       <div className="flex items-center gap-4">
//                         <div className="relative w-16 h-16">
//                           <svg className="w-full h-full" viewBox="0 0 36 36">
//                             <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
//                             <circle
//                               cx="18"
//                               cy="18"
//                               r="15.9"
//                               fill="none"
//                               stroke={progress >= 100 ? "#10b981" : "#0ea5e9"}
//                               strokeWidth="3"
//                               strokeDasharray={`${progress} ${100 - progress}`}
//                               strokeLinecap="round"
//                               transform="rotate(-90 18 18)"
//                               className="transition-all duration-700"
//                             />
//                           </svg>
//                           <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
//                             {progress}%
//                           </div>
//                         </div>
//                         <div className="flex-1 space-y-1">
//                           <div className="flex justify-between text-xs text-gray-500">
//                             <span>Completed</span>
//                             <span className="font-bold">{jc.completedQty || 0} / {jc.qtyToManufacture}</span>
//                           </div>
//                           <div className="w-full bg-gray-200 rounded-full h-1.5">
//                             <div
//                               className="h-full rounded-full bg-sky-500 transition-all duration-500"
//                               style={{ width: `${progress}%` }}
//                             />
//                           </div>
//                         </div>
//                       </div>

//                       {/* Info grid */}
//                       <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
//                         <div>
//                           <span className="text-gray-400">Machine</span>
//                           <p className="font-medium text-gray-800 mt-0.5">{jc.machine?.name || "—"}</p>
//                         </div>
//                         <div>
//                           <span className="text-gray-400">Operator</span>
//                           <p className="font-medium text-gray-800 mt-0.5">{jc.operator?.name || "—"}</p>
//                         </div>
//                         <div>
//                           <span className="text-gray-400">Started</span>
//                           <p className="font-medium text-gray-800 mt-0.5">
//                             {jc.actualStartDate ? new Date(jc.actualStartDate).toLocaleString() : "—"}
//                           </p>
//                         </div>
//                         <div>
//                           <span className="text-gray-400">Ended</span>
//                           <p className="font-medium text-gray-800 mt-0.5">
//                             {jc.actualEndDate ? new Date(jc.actualEndDate).toLocaleString() : "—"}
//                           </p>
//                         </div>
//                       </div>

//                       {/* Actions */}
//                       <div className="flex justify-end gap-2 pt-2">
//                         <button
//                           onClick={() => handleView(jc._id)}
//                           className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
//                         >
//                           <Eye className="h-4 w-4" /> View
//                         </button>
//                         <button
//                           onClick={() => handlePrint(jc._id)}
//                           className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
//                         >
//                           <Printer className="h-4 w-4" /> Print
//                         </button>
//                         {jc.status !== "completed" && (
//                           <>
//                             <button
//                               onClick={() => handleStart(jc)}
//                               disabled={jc.status === "in progress" || isStarting}
//                               className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 transition-all disabled:opacity-50"
//                             >
//                               {isStarting ? (
//                                 <Loader2 className="h-4 w-4 animate-spin" />
//                               ) : (
//                                 <Play className="h-4 w-4" />
//                               )}
//                               Start
//                             </button>
//                             <button
//                               onClick={() => handleEnd(jc)}
//                               className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 transition-all"
//                             >
//                               <Square className="h-4 w-4" /> End
//                             </button>
//                           </>
//                         )}
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               );
//             })
//           )}
//         </div>

//         {/* ── End Job Modal ── */}
//         {activeJob && (
//           <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
//             <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in">
//               <div className="px-6 py-5 border-b border-gray-100 bg-sky-50/50 flex items-center gap-3">
//                 <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-sky-600 shadow-sm">
//                   <CheckCircle2 className="h-5 w-5" />
//                 </div>
//                 <div>
//                   <h2 className="text-lg font-black text-gray-900">Complete Job Card</h2>
//                   <p className="text-xs text-gray-500">{activeJob.jobCardNo}</p>
//                 </div>
//               </div>
//               <div className="p-6 space-y-4">
//                 <div>
//                   <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
//                     Quantity Completed
//                   </label>
//                   <div className="relative">
//                     <input
//                       type="number"
//                       min={1}
//                       max={activeJob.qtyToManufacture - (activeJob.completedQty || 0)}
//                       value={endQty}
//                       onChange={(e) => setEndQty(Number(e.target.value))}
//                       className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold focus:border-sky-500 focus:ring-2 focus:ring-sky-100 outline-none transition-all"
//                       autoFocus
//                     />
//                     <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
//                       / {activeJob.qtyToManufacture - (activeJob.completedQty || 0)}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//               <div className="px-6 py-4 border-t border-gray-50 flex justify-end gap-3 bg-gray-50/50">
//                 <button
//                   onClick={() => setActiveJob(null)}
//                   className="px-5 py-2.5 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   onClick={confirmEnd}
//                   disabled={isEnding}
//                   className="px-6 py-2.5 rounded-xl bg-sky-600 text-white font-bold text-sm hover:bg-sky-700 shadow-lg shadow-sky-100 transition-all disabled:opacity-50 flex items-center gap-2"
//                 >
//                   {isEnding ? (
//                     <Loader2 className="h-4 w-4 animate-spin" />
//                   ) : (
//                     <CheckCircle2 className="h-4 w-4" />
//                   )}
//                   Confirm
//                 </button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useState } from "react";
// import { useSearchParams, useRouter } from "next/navigation";
// import axios from "axios";
// import { Eye, Printer } from "lucide-react";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function JobCardListPage() {
//   const searchParams = useSearchParams();
//   const productionOrderId = searchParams.get("productionOrderId");
//   const router = useRouter();

//   const [jobCards, setJobCards] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState("");

//   useEffect(() => {
//     if (!productionOrderId) {
//       setError("Production Order ID is missing");
//       setLoading(false);
//       return;
//     }

//     const fetchJobCards = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) throw new Error("Unauthorized");

//         const res = await axios.get(
//           `/api/ppc/jobcards?productionOrderId=${productionOrderId}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );

//         if (res.data?.data) {
//           const cards = Array.isArray(res.data.data)
//             ? res.data.data
//             : [res.data.data];
//           setJobCards(cards);
//         } else {
//           setJobCards([]);
//         }
//       } catch (err) {
//         console.error("Error fetching job cards:", err);
//         setError("Failed to fetch job cards");
//         toast.error("Failed to fetch job cards");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchJobCards();
//   }, [productionOrderId]);

//   const handleView = (id) => {
//     router.push(`/admin/ppc/jobcards/${id}`);
//   };

//   const handlePrint = (id) => {
//     const printWindow = window.open(`/admin/ppc/jobcards/${id}`, "_blank");
//     printWindow?.focus();
//   };

//   if (loading)
//     return <div className="p-6 text-gray-600">Loading job cards...</div>;
//   if (error) return <div className="p-6 text-red-600">{error}</div>;
//   if (!jobCards.length)
//     return <div className="p-6 text-gray-600">No job cards found.</div>;

//   return (
//     <div className="p-6 bg-white rounded-xl shadow-md max-w-6xl mx-auto mt-8">
//       <h2 className="text-2xl font-semibold mb-6">Job Cards</h2>
//       <table className="w-full text-sm border-collapse">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="p-2 border">#</th>
//             <th className="p-2 border">Job Card No</th>
//             <th className="p-2 border">Operation</th>
//             <th className="p-2 border">Machine</th>
//             <th className="p-2 border">Operator</th>
//             <th className="p-2 border">Qty</th>
//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {jobCards.map((jc, idx) => (
//             <tr key={jc._id} className="border-t">
//               <td className="p-2 border">{idx + 1}</td>
//               <td className="p-2 border">{jc.jobCardNo}</td>
//               <td className="p-2 border">{jc.operation?.name || "-"}</td>
//               <td className="p-2 border">{jc.machine?.name || "-"}</td>
//               <td className="p-2 border">{jc.operator?.name || "-"}</td>
//               <td className="p-2 border">{jc.qtyToManufacture || 0}</td>
//               <td className="p-2 border">
//                 <span
//                   className={`px-2 py-1 rounded-md text-xs ${
//                     jc.status === "Completed"
//                       ? "bg-green-100 text-green-700"
//                       : "bg-yellow-100 text-yellow-700"
//                   }`}
//                 >
//                   {jc.status || "In Progress"}
//                 </span>
//               </td>
//               <td className="p-2 border flex gap-2">
//                 <button
//                   onClick={() => handleView(jc._id)}
//                   className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
//                 >
//                   <Eye size={16} /> View
//                 </button>
//                 <button
//                   onClick={() => handlePrint(jc._id)}
//                   className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 flex items-center gap-1"
//                 >
//                   <Printer size={16} /> Print
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }
