"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// FullCalendar dynamic import
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function ProductionBoardWithCalendar() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board"); // toggle board / calendar

  // fetch production orders
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await api.get("/production-orders");
        console.log("🔵 API raw response:", res.data);

        const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
        console.log("🟢 Normalized orders:", data);

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

  // group orders by status dynamically
  const getColumns = () => {
    const grouped = {
      open: orders.filter((o) => o.status === "Open"),
      "in-progress": orders.filter((o) => o.status === "In-Progress"),
      "linked-to-production-order": orders.filter(
        (o) => o.status === "LinkedToProductionOrder"
      ),
      complete: orders.filter((o) => o.status === "Complete"),
    };

    console.log("📊 Column grouping:", {
      open: grouped.open.length,
      "in-progress": grouped["in-progress"].length,
      "linked-to-production-order": grouped["linked-to-production-order"].length,
      complete: grouped.complete.length,
    });

    return grouped;
  };

  // drag & drop handler
  const handleDragEnd = async (result) => {
    console.log("🟡 Drag result:", result);

    if (!result.destination) {
      console.warn("⚠️ No destination detected. Ignoring drop.");
      return;
    }

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) {
      console.log("➡️ Dropped in same column. No status change.");
      return;
    }

    let newStatus;
    switch (destination.droppableId) {
      case "open":
        newStatus = "Open";
        break;
      case "in-progress":
        newStatus = "In-Progress";
        break;
      case "linked-to-production-order":
        newStatus = "LinkedToProductionOrder";
        break;
      default:
        newStatus = "Complete";
    }

    console.log(`🔄 Updating order ${draggableId} → new status: ${newStatus}`);

    try {
      const res = await api.put(`/production-orders/${draggableId}`, {
        status: newStatus,
      });
      console.log("✅ Backend update success:", res.data);

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
  const calendarEvents = orders.map((o) => ({
    id: o._id,
    title: `${o.orderNumber || o.documentNumberOrder || o._id} (${o.status})`,
    start: o.deliveryDate ? new Date(o.deliveryDate) : new Date(),
    backgroundColor:
      o.status === "Open"
        ? "#fca5a5"
        : o.status === "In-Progress"
        ? "#facc15"
        : o.status === "LinkedToProductionOrder"
        ? "#60a5fa"
        : "#4ade80",
    borderColor: "#000",
  }));

  console.log("📅 Calendar events:", calendarEvents);

  const columns = getColumns();

  const columnStyles = {
    open: "bg-red-100/40 border-red-300",
    "in-progress": "bg-yellow-100/40 border-yellow-300",
    "linked-to-production-order": "bg-blue-100/40 border-blue-300",
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                              {order.documentNumberOrder ||
                                order.productName ||
                                order._id}
                            </p>
                            <p className="text-sm text-gray-600">
                              Quantity: {order.quantity || "N/A"}
                            </p>
                            <p className="text-xs text-gray-400">
                              Delivery Date:{" "}
                              {order.deliveryDate
                                ? new Date(
                                    order.deliveryDate
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
              console.log("📌 Calendar event clicked:", info.event);
              alert(`Production Order: ${info.event.title}`);
            }}
          />
        </div>
      )}
    </div>
  );
}

