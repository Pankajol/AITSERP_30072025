"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// FullCalendar dynamic import
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

// ✅ Normalize statuses for UI
const normalizeStatus = (o) => {
  const transfer = o.transferqty || 0;
  const issue = o.issuforproductionqty || 0;
  const receipt = o.reciptforproductionqty || 0;
  const quantity = o.quantity || 0;

  // Your table’s logic → mapped into UI statuses
  if (transfer > 0 && issue === 0 && receipt === 0) return "In-Progress"; // transferred
  if (issue > 0 && receipt === 0) return "In-Progress"; // issued
  if (receipt > 0 && receipt < quantity) return "In-Progress"; // partially received
  if (transfer === quantity && issue === quantity && receipt === quantity) return "Complete"; // closed

  return "Open"; // planned or partially completed
};

export default function ProductionBoardWithCalendar() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board"); // board / calendar

  // fetch production orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get("/production-orders");
        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
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

  // group orders by normalized status
  const getColumns = () => {
    const grouped = {
      open: orders.filter((o) => normalizeStatus(o) === "Open"),
      "in-progress": orders.filter((o) => normalizeStatus(o) === "In-Progress"),
      complete: orders.filter((o) => normalizeStatus(o) === "Complete"),
    };
    return grouped;
  };

  // drag & drop handler
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    let newStatus;
    switch (destination.droppableId) {
      case "open":
        newStatus = "Open";
        break;
      case "in-progress":
        newStatus = "In-Progress";
        break;
      default:
        newStatus = "Complete";
    }

    try {
      await api.put(`/production-orders/${draggableId}`, { status: newStatus });

      setOrders((prev) =>
        prev.map((o) =>
          o._id === draggableId ? { ...o, status: newStatus } : o
        )
      );
    } catch (err) {
      console.error("❌ Error updating production order status:", err);
    }
  };

  // events for calendar
  const calendarEvents = orders.map((o) => {
    const normStatus = normalizeStatus(o);

    return {
      id: o._id,
      title: `${o.productDesc || o.documentNumberOrder || o._id} (${normStatus})`,
      start: o.productionDate ? new Date(o.productionDate) : new Date(),
      backgroundColor:
        normStatus === "Open"
          ? "#fca5a5"
          : normStatus === "In-Progress"
          ? "#facc15"
          : "#4ade80",
      borderColor: "#000",
    };
  });

  const columns = getColumns();

  const columnStyles = {
    open: "bg-red-100/40 border-red-300",
    "in-progress": "bg-yellow-100/40 border-yellow-300",
    complete: "bg-green-100/40 border-green-300",
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">🏭 Production Orders</h1>

        <div className="flex rounded-lg overflow-hidden border">
          <button
            onClick={() => setView("board")}
            className={`px-4 py-2 transition ${
              view === "board"
                ? "bg-blue-500 text-white"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-4 py-2 transition ${
              view === "calendar"
                ? "bg-blue-500 text-white"
                : "bg-gray-50 hover:bg-gray-100"
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Board View */}
      {view === "board" ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(columns).map(([status, items]) => (
              <Droppable key={`col-${status}`} droppableId={status}>
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className={`rounded-xl p-4 min-h-[500px] border shadow-sm ${columnStyles[status]}`}
                  >
                    <h2 className="font-semibold mb-4 capitalize text-lg">
                      {status.replace(/-/g, " ")} ({items.length})
                    </h2>

                    {items.map((order, index) => (
                      <Draggable
                        key={order._id.toString()}
                        draggableId={order._id.toString()}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white shadow-sm rounded-lg p-4 mb-3 border hover:shadow-md transition"
                          >
                            <p className="font-semibold text-gray-800 mb-1">
                              {order.productDesc ||
                                order.productName ||
                                order._id}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {order.quantity || "N/A"}
                            </p>
                            <p className="text-xs text-gray-400">
                              Production Date:{" "}
                              {order.productionDate
                                ? new Date(
                                    order.productionDate
                                  ).toLocaleDateString()
                                : "N/A"}
                            </p>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      ) : (
        // Calendar View
        <div className="bg-white shadow rounded-xl p-4">
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            events={calendarEvents}
            height="700px"
            eventClick={(info) => {
              alert(`Production Order: ${info.event.title}`);
            }}
          />
        </div>
      )}
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
