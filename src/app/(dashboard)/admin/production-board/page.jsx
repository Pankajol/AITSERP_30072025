"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
// Fixed the FaLayout error here:
import { FaTrello, FaCalendarAlt, FaBox, FaClock, FaCheckCircle } from "react-icons/fa";

// FullCalendar dynamic import to prevent SSR issues
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// ✅ Safety Status Normalizer
const normalizeStatus = (o) => {
  if (!o) return "Open";
  const transfer = Number(o.transferqty) || 0;
  const issue = Number(o.issuforproductionqty) || 0;
  const receipt = Number(o.reciptforproductionqty) || 0;
  const quantity = Number(o.quantity) || 0;

  if (quantity > 0 && receipt >= quantity) return "Complete";
  if (transfer > 0 || issue > 0 || receipt > 0) return "In-Progress";
  
  return "Open";
};

export default function ProductionBoardWithCalendar() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board");

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get("/production-orders");
        const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setOrders(data);
      } catch (err) {
        console.error("❌ Error fetching production orders:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const columns = useMemo(() => {
    return {
      open: orders.filter((o) => normalizeStatus(o) === "Open"),
      "in-progress": orders.filter((o) => normalizeStatus(o) === "In-Progress"),
      complete: orders.filter((o) => normalizeStatus(o) === "Complete"),
    };
  }, [orders]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const statusMap = {
        open: "planned",
        "in-progress": "in-progress",
        complete: "closed"
    };

    const newStatus = statusMap[destination.droppableId];

    try {
      setOrders((prev) =>
        prev.map((o) => (o._id === draggableId ? { ...o, status: newStatus } : o))
      );
      await api.put(`/production-orders/${draggableId}`, { status: newStatus });
    } catch (err) {
      console.error("❌ Error updating status:", err);
    }
  };

  const calendarEvents = useMemo(() => {
    return orders.map((o) => {
      const normStatus = normalizeStatus(o);
      return {
        id: o._id,
        title: `${o.productionDocNo || "PO"} - ${o.productDesc || "Product"}`,
        start: o.productionDate ? new Date(o.productionDate) : new Date(),
        backgroundColor: normStatus === "Open" ? "#EEF2FF" : normStatus === "In-Progress" ? "#FFFBEB" : "#ECFDF5",
        textColor: normStatus === "Open" ? "#4F46E5" : normStatus === "In-Progress" ? "#D97706" : "#059669",
        borderColor: normStatus === "Open" ? "#C7D2FE" : normStatus === "In-Progress" ? "#FDE68A" : "#A7F3D0",
      };
    });
  }, [orders]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading Floor Board...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Production Scheduling</h1>
          <p className="text-sm text-gray-400">Drag orders to update status or view calendar timeline</p>
        </div>

        <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-gray-100">
          <button onClick={() => setView("board")}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === "board" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:text-gray-600"}`}>
            <FaTrello /> Board
          </button>
          <button onClick={() => setView("calendar")}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl text-sm font-bold transition-all ${view === "calendar" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "text-gray-400 hover:text-gray-600"}`}>
            <FaCalendarAlt /> Calendar
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
        {view === "board" ? (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {Object.entries(columns).map(([colId, items]) => (
                <Droppable key={colId} droppableId={colId}>
                  {(provided, snapshot) => (
                    <div {...provided.droppableProps} ref={provided.innerRef} 
                         className={`flex flex-col min-h-[70vh] rounded-3xl transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}>
                      
                      <div className="flex items-center justify-between mb-5 px-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${colId === 'open' ? 'bg-indigo-500' : colId === 'in-progress' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                           <h2 className="font-black uppercase tracking-widest text-[11px] text-gray-500">{colId.replace(/-/g, " ")}</h2>
                        </div>
                        <span className="bg-white border border-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">{items.length}</span>
                      </div>

                      <div className="flex-1 space-y-4">
                        {items.map((order, index) => (
                          <Draggable key={order._id} draggableId={order._id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                className={`bg-white p-5 rounded-2xl border transition-all ${snapshot.isDragging ? 'shadow-2xl border-indigo-500 scale-105 rotate-2' : 'shadow-sm border-gray-100 hover:border-indigo-200'}`}>
                                
                                <div className="flex justify-between items-start mb-4">
                                   <span className="font-mono text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg uppercase tracking-tighter">
                                     {order.productionDocNo || "ORD-00"}
                                   </span>
                                   {normalizeStatus(order) === 'Complete' ? <FaCheckCircle className="text-emerald-500" /> : <FaClock className="text-gray-200" />}
                                </div>

                                <p className="font-bold text-gray-800 text-sm mb-4 leading-snug line-clamp-2">
                                    {order.productDesc || "Standard Assembly"}
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3">
                                   <div className="bg-gray-50 rounded-xl p-2.5">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Quantity</p>
                                      <p className="text-xs font-black text-gray-700 font-mono">{order.quantity}</p>
                                   </div>
                                   <div className="bg-gray-50 rounded-xl p-2.5">
                                      <p className="text-[9px] font-bold text-gray-400 uppercase mb-0.5">Start Date</p>
                                      <p className="text-xs font-black text-gray-700 whitespace-nowrap">
                                        {order.productionDate ? new Date(order.productionDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}
                                      </p>
                                   </div>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="bg-white shadow-2xl shadow-indigo-100/20 rounded-[32px] p-8 border border-gray-100">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={calendarEvents}
              height="700px"
              headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }}
              eventClassNames="rounded-xl border-l-4 font-bold text-[11px] px-3 py-2 shadow-sm transition-all hover:brightness-95 cursor-pointer"
              dayMaxEvents={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}


// "use client";

// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import api from "@/lib/api";
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// // FullCalendar dynamic import
// const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
// import dayGridPlugin from "@fullcalendar/daygrid";
// import interactionPlugin from "@fullcalendar/interaction";

// // ✅ Normalize statuses for UI
// const normalizeStatus = (o) => {
//   const transfer = o.transferqty || 0;
//   const issue = o.issuforproductionqty || 0;
//   const receipt = o.reciptforproductionqty || 0;
//   const quantity = o.quantity || 0;

//   // Your table’s logic → mapped into UI statuses
//   if (transfer > 0 && issue === 0 && receipt === 0) return "In-Progress"; // transferred
//   if (issue > 0 && receipt === 0) return "In-Progress"; // issued
//   if (receipt > 0 && receipt < quantity) return "In-Progress"; // partially received
//   if (transfer === quantity && issue === quantity && receipt === quantity) return "Complete"; // closed

//   return "Open"; // planned or partially completed
// };

// export default function ProductionBoardWithCalendar() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("board"); // board / calendar

//   // fetch production orders
//   useEffect(() => {
//     const fetchOrders = async () => {
//       try {
//         const res = await api.get("/production-orders");
//         const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
//         setOrders(data);
//       } catch (err) {
//         console.error("❌ Error fetching production orders:", err);
//         setOrders([]);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchOrders();
//   }, []);

//   // group orders by normalized status
//   const getColumns = () => {
//     const grouped = {
//       open: orders.filter((o) => normalizeStatus(o) === "Open"),
//       "in-progress": orders.filter((o) => normalizeStatus(o) === "In-Progress"),
//       complete: orders.filter((o) => normalizeStatus(o) === "Complete"),
//     };
//     return grouped;
//   };

//   // drag & drop handler
//   const handleDragEnd = async (result) => {
//     if (!result.destination) return;

//     const { source, destination, draggableId } = result;

//     if (source.droppableId === destination.droppableId) return;

//     let newStatus;
//     switch (destination.droppableId) {
//       case "open":
//         newStatus = "Open";
//         break;
//       case "in-progress":
//         newStatus = "In-Progress";
//         break;
//       default:
//         newStatus = "Complete";
//     }

//     try {
//       await api.put(`/production-orders/${draggableId}`, { status: newStatus });

//       setOrders((prev) =>
//         prev.map((o) =>
//           o._id === draggableId ? { ...o, status: newStatus } : o
//         )
//       );
//     } catch (err) {
//       console.error("❌ Error updating production order status:", err);
//     }
//   };

//   // events for calendar
//   const calendarEvents = orders.map((o) => {
//     const normStatus = normalizeStatus(o);

//     return {
//       id: o._id,
//       title: `${o.productDesc || o.documentNumberOrder || o._id} (${normStatus})`,
//       start: o.productionDate ? new Date(o.productionDate) : new Date(),
//       backgroundColor:
//         normStatus === "Open"
//           ? "#fca5a5"
//           : normStatus === "In-Progress"
//           ? "#facc15"
//           : "#4ade80",
//       borderColor: "#000",
//     };
//   });

//   const columns = getColumns();

//   const columnStyles = {
//     open: "bg-red-100/40 border-red-300",
//     "in-progress": "bg-yellow-100/40 border-yellow-300",
//     complete: "bg-green-100/40 border-green-300",
//   };

//   if (loading) return <p className="p-6">Loading...</p>;

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold tracking-tight">🏭 Production Orders</h1>

//         <div className="flex rounded-lg overflow-hidden border">
//           <button
//             onClick={() => setView("board")}
//             className={`px-4 py-2 transition ${
//               view === "board"
//                 ? "bg-blue-500 text-white"
//                 : "bg-gray-50 hover:bg-gray-100"
//             }`}
//           >
//             Board
//           </button>
//           <button
//             onClick={() => setView("calendar")}
//             className={`px-4 py-2 transition ${
//               view === "calendar"
//                 ? "bg-blue-500 text-white"
//                 : "bg-gray-50 hover:bg-gray-100"
//             }`}
//           >
//             Calendar
//           </button>
//         </div>
//       </div>

//       {/* Board View */}
//       {view === "board" ? (
//         <DragDropContext onDragEnd={handleDragEnd}>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {Object.entries(columns).map(([status, items]) => (
//               <Droppable key={`col-${status}`} droppableId={status}>
//                 {(provided) => (
//                   <div
//                     {...provided.droppableProps}
//                     ref={provided.innerRef}
//                     className={`rounded-xl p-4 min-h-[500px] border shadow-sm ${columnStyles[status]}`}
//                   >
//                     <h2 className="font-semibold mb-4 capitalize text-lg">
//                       {status.replace(/-/g, " ")} ({items.length})
//                     </h2>

//                     {items.map((order, index) => (
//                       <Draggable
//                         key={order._id.toString()}
//                         draggableId={order._id.toString()}
//                         index={index}
//                       >
//                         {(provided) => (
//                           <div
//                             ref={provided.innerRef}
//                             {...provided.draggableProps}
//                             {...provided.dragHandleProps}
//                             className="bg-white shadow-sm rounded-lg p-4 mb-3 border hover:shadow-md transition"
//                           >
//                             <p className="font-semibold text-gray-800 mb-1">
//                               {order.productDesc ||
//                                 order.productName ||
//                                 order._id}
//                             </p>
//                             <p className="text-sm text-gray-600">
//                               Quantity: {order.quantity || "N/A"}
//                             </p>
//                             <p className="text-xs text-gray-400">
//                               Production Date:{" "}
//                               {order.productionDate
//                                 ? new Date(
//                                     order.productionDate
//                                   ).toLocaleDateString()
//                                 : "N/A"}
//                             </p>
//                           </div>
//                         )}
//                       </Draggable>
//                     ))}
//                     {provided.placeholder}
//                   </div>
//                 )}
//               </Droppable>
//             ))}
//           </div>
//         </DragDropContext>
//       ) : (
//         // Calendar View
//         <div className="bg-white shadow rounded-xl p-4">
//           <FullCalendar
//             plugins={[dayGridPlugin, interactionPlugin]}
//             initialView="dayGridMonth"
//             events={calendarEvents}
//             height="700px"
//             eventClick={(info) => {
//               alert(`Production Order: ${info.event.title}`);
//             }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }




// "use client";

// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import api from "@/lib/api";
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// // FullCalendar dynamic import
// const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
// import dayGridPlugin from "@fullcalendar/daygrid";
// import interactionPlugin from "@fullcalendar/interaction";

// // normalize backend statuses → UI statuses
// const normalizeStatus = (status) => {
//   if (!status) return "Open";

//   const s = status.toLowerCase();

//   if (s === "draft" || s === "open") return "Open";
//   if (s === "in-progress" || s === "issue for production") return "In-Progress";
//   if (
//     s === "complete" ||
//     s === "transferred" ||
//     s === "recepit from production"
//   )
//     return "Complete";

//   // fallback
//   return "Open";
// };

// export default function ProductionBoardWithCalendar() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("board"); // toggle board / calendar

//   // fetch production orders
//   useEffect(() => {
//     const fetchOrders = async () => {
//       try {
//         const res = await api.get("/production-orders");
//         console.log("🔵 API raw response:", res.data);

//         const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
//         console.log("🟢 Normalized orders:", data);

//         setOrders(data);
//       } catch (err) {
//         console.error("❌ Error fetching production orders:", err);
//         setOrders([]);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchOrders();
//   }, []);

//   // group orders by normalized status
//   const getColumns = () => {
//     const grouped = {
//       open: orders.filter((o) => normalizeStatus(o.status) === "Open"),
//       "in-progress": orders.filter(
//         (o) => normalizeStatus(o.status) === "In-Progress"
//       ),
//       complete: orders.filter((o) => normalizeStatus(o.status) === "Complete"),
//     };

//     console.log("📊 Column grouping:", {
//       open: grouped.open.length,
//       "in-progress": grouped["in-progress"].length,
//       complete: grouped.complete.length,
//     });

//     return grouped;
//   };

//   // drag & drop handler
//   const handleDragEnd = async (result) => {
//     console.log("🟡 Drag result:", result);

//     if (!result.destination) {
//       console.warn("⚠️ No destination detected. Ignoring drop.");
//       return;
//     }

//     const { source, destination, draggableId } = result;

//     if (source.droppableId === destination.droppableId) {
//       console.log("➡️ Dropped in same column. No status change.");
//       return;
//     }

//     let newStatus;
//     switch (destination.droppableId) {
//       case "open":
//         newStatus = "Open";
//         break;
//       case "in-progress":
//         newStatus = "In-Progress";
//         break;
//       default:
//         newStatus = "Complete";
//     }

//     console.log(`🔄 Updating order ${draggableId} → new status: ${newStatus}`);

//     try {
//       const res = await api.put(`/production-orders/${draggableId}`, {
//         status: newStatus,
//       });
//       console.log("✅ Backend update success:", res.data);

//       setOrders((prev) =>
//         prev.map((o) =>
//           o._id === draggableId ? { ...o, status: newStatus } : o
//         )
//       );
//     } catch (err) {
//       console.error("❌ Error updating production order status:", err);
//     }
//   };

//   // events for calendar
//   const calendarEvents = orders.map((o) => {
//     const normStatus = normalizeStatus(o.status);

//     return {
//       id: o._id,
//       title: `${o.productDesc || o.documentNumberOrder || o._id} (${normStatus})`,
//       start: o.deliveryDate ? new Date(o.deliveryDate) : new Date(),
//       backgroundColor:
//         normStatus === "Open"
//           ? "#fca5a5"
//           : normStatus === "In-Progress"
//           ? "#facc15"
//           : "#4ade80",
//       borderColor: "#000",
//     };
//   });

//   console.log("📅 Calendar events:", calendarEvents);

//   const columns = getColumns();

//   const columnStyles = {
//     open: "bg-red-100/40 border-red-300",
//     "in-progress": "bg-yellow-100/40 border-yellow-300",
//     complete: "bg-green-100/40 border-green-300",
//   };

//   if (loading) return <p className="p-6">Loading...</p>;

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold tracking-tight">🏭 Production Orders</h1>

//         <div className="flex rounded-lg overflow-hidden border">
//           <button
//             onClick={() => setView("board")}
//             className={`px-4 py-2 transition ${
//               view === "board"
//                 ? "bg-blue-500 text-white"
//                 : "bg-gray-50 hover:bg-gray-100"
//             }`}
//           >
//             Board
//           </button>
//           <button
//             onClick={() => setView("calendar")}
//             className={`px-4 py-2 transition ${
//               view === "calendar"
//                 ? "bg-blue-500 text-white"
//                 : "bg-gray-50 hover:bg-gray-100"
//             }`}
//           >
//             Calendar
//           </button>
//         </div>
//       </div>

//       {/* Board View */}
//       {view === "board" ? (
//         <DragDropContext onDragEnd={handleDragEnd}>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//             {Object.entries(columns).map(([status, items]) => (
//               <Droppable key={`col-${status}`} droppableId={status}>
//                 {(provided) => (
//                   <div
//                     {...provided.droppableProps}
//                     ref={provided.innerRef}
//                     className={`rounded-xl p-4 min-h-[500px] border shadow-sm ${columnStyles[status]}`}
//                   >
//                     <h2 className="font-semibold mb-4 capitalize text-lg">
//                       {status.replace(/-/g, " ")} ({items.length})
//                     </h2>

//                     {items.map((order, index) => (
//                       <Draggable
//                         key={order._id.toString()}
//                         draggableId={order._id.toString()}
//                         index={index}
//                       >
//                         {(provided) => (
//                           <div
//                             ref={provided.innerRef}
//                             {...provided.draggableProps}
//                             {...provided.dragHandleProps}
//                             className="bg-white shadow-sm rounded-lg p-4 mb-3 border hover:shadow-md transition"
//                           >
//                             <p className="font-semibold text-gray-800 mb-1">
//                               {order.productDesc ||
//                                 order.productName ||
//                                 order._id}
//                             </p>
//                             <p className="text-sm text-gray-600">
//                               Quantity: {order.quantity || "N/A"}
//                             </p>
//                             <p className="text-xs text-gray-400">
//                               Delivery Date:{" "}
//                               {order.productionDate
//                                 ? new Date(
//                                     order.productionDate
//                                   ).toLocaleDateString()
//                                 : "N/A"}
//                             </p>
//                           </div>
//                         )}
//                       </Draggable>
//                     ))}
//                     {provided.placeholder}
//                   </div>
//                 )}
//               </Droppable>
//             ))}
//           </div>
//         </DragDropContext>
//       ) : (
//         // Calendar View
//         <div className="bg-white shadow rounded-xl p-4">
//           <FullCalendar
//             plugins={[dayGridPlugin, interactionPlugin]}
//             initialView="dayGridMonth"
//             events={calendarEvents}
//             height="700px"
//             eventClick={(info) => {
//               console.log("📌 Calendar event clicked:", info.event);
//               alert(`Production Order: ${info.event.title}`);
//             }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }
