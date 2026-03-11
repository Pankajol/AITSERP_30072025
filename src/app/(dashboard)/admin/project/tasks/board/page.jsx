"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { FaTrello, FaCalendarAlt, FaProjectDiagram, FaClock, FaCheckCircle, FaUserCircle } from "react-icons/fa";

// FullCalendar dynamic import to prevent SSR issues
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function TaskBoardWithCalendar() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board");

  // fetch tasks & projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, pRes] = await Promise.all([
          api.get("/project/tasks"),
          api.get("/project/projects"),
        ]);
        setTasks(tRes.data || []);
        setProjects(pRes.data || []);
        if (pRes.data.length > 0) setSelectedProject(pRes.data[0]._id);
      } catch (err) {
        console.error("❌ Error fetching task data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // group tasks by status
  const columns = useMemo(() => {
    const filtered = selectedProject
      ? tasks.filter((t) => (t.project?._id || t.project) === selectedProject)
      : tasks;

    return {
      todo: filtered.filter((t) => t.status === "todo"),
      "in-progress": filtered.filter((t) => t.status === "in-progress"),
      done: filtered.filter((t) => t.status === "done"),
    };
  }, [tasks, selectedProject]);

  // drag & drop handler
  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    try {
      // Local state update for immediate feedback
      setTasks((prev) =>
        prev.map((t) => (t._id === draggableId ? { ...t, status: destination.droppableId } : t))
      );
      
      await api.put(`/project/tasks/${draggableId}`, {
        status: destination.droppableId,
      });
    } catch (err) {
      console.error("❌ Error updating task status:", err);
    }
  };

  // events for calendar
  const calendarEvents = useMemo(() => {
    return tasks
      .filter((t) => !selectedProject || (t.project?._id || t.project) === selectedProject)
      .map((t) => ({
        id: t._id,
        title: t.title,
        start: t.dueDate ? new Date(t.dueDate) : new Date(),
        backgroundColor: t.status === "todo" ? "#EEF2FF" : t.status === "in-progress" ? "#FFFBEB" : "#ECFDF5",
        textColor: t.status === "todo" ? "#4F46E5" : t.status === "in-progress" ? "#D97706" : "#059669",
        borderColor: t.status === "todo" ? "#C7D2FE" : t.status === "in-progress" ? "#FDE68A" : "#A7F3D0",
      }));
  }, [tasks, selectedProject]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-sm uppercase tracking-widest">Loading Task Board...</p>
        </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">Workspace Board</h1>
          <p className="text-sm text-gray-400 mt-0.5">Track team progress and deadlines across projects</p>
        </div>

        <div className="flex gap-4 items-center">
          <div className="relative">
            <FaProjectDiagram className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-indigo-100 outline-none transition-all appearance-none cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            <button onClick={() => setView("board")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === "board" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-400 hover:text-gray-600"}`}>
              <FaTrello /> Board
            </button>
            <button onClick={() => setView("calendar")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === "calendar" ? "bg-indigo-600 text-white shadow-md shadow-indigo-100" : "text-gray-400 hover:text-gray-600"}`}>
              <FaCalendarAlt /> Calendar
            </button>
          </div>
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
                      
                      {/* Column Header */}
                      <div className="flex items-center justify-between mb-5 px-4">
                        <div className="flex items-center gap-2">
                           <div className={`w-2 h-2 rounded-full ${colId === 'todo' ? 'bg-indigo-500' : colId === 'in-progress' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                           <h2 className="font-black uppercase tracking-widest text-[11px] text-gray-500">{colId.replace("-", " ")}</h2>
                        </div>
                        <span className="bg-white border border-gray-100 text-gray-500 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">{items.length}</span>
                      </div>

                      {/* Column Content */}
                      <div className="flex-1 space-y-4">
                        {items.map((task, index) => (
                          <Draggable key={task._id} draggableId={task._id.toString()} index={index}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                                className={`bg-white p-5 rounded-2xl border transition-all ${snapshot.isDragging ? 'shadow-2xl border-indigo-500 scale-105 rotate-1' : 'shadow-sm border-gray-100 hover:border-indigo-200'}`}>
                                
                                <div className="flex justify-between items-start mb-3">
                                   <div className="flex -space-x-2">
                                      {task.assignees?.slice(0, 3).map((u, i) => (
                                         <div key={u._id || i} className="w-6 h-6 rounded-full border-2 border-white bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600" title={u.name}>
                                            {u.name?.charAt(0)}
                                         </div>
                                      ))}
                                      {task.assignees?.length > 3 && <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">+{task.assignees.length - 3}</div>}
                                   </div>
                                   {task.status === 'done' ? <FaCheckCircle className="text-emerald-500" /> : <FaClock className="text-gray-200" />}
                                </div>

                                <p className="font-bold text-gray-800 text-sm mb-4 leading-snug">
                                    {task.title}
                                </p>
                                
                                <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-50">
                                   <div className="flex items-center gap-1.5">
                                      <FaCalendarAlt className="text-gray-300 text-[10px]" />
                                      <span className="text-[10px] font-bold text-gray-400">
                                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '---'}
                                      </span>
                                   </div>
                                   <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${task.priority === 'high' ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-gray-400'}`}>
                                      {task.priority || 'Normal'}
                                   </span>
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
}np


// "use client";

// import { useEffect, useState } from "react";
// import dynamic from "next/dynamic";
// import api from "@/lib/api";
// import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// // FullCalendar needs dynamic import
// const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
// import dayGridPlugin from "@fullcalendar/daygrid";
// import interactionPlugin from "@fullcalendar/interaction";

// export default function TaskBoardWithCalendar() {
//   const [tasks, setTasks] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [selectedProject, setSelectedProject] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("board"); // toggle between board & calendar

//   // fetch tasks & projects
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [tRes, pRes] = await Promise.all([
//           api.get("/project/tasks"),
//           api.get("/project/projects"),
//         ]);
//         setTasks(tRes.data);
//         setProjects(pRes.data);
//         if (pRes.data.length > 0) setSelectedProject(pRes.data[0]._id);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // group tasks by status
//   const getColumns = () => {
//     const filtered = selectedProject
//       ? tasks.filter((t) => t.project?._id === selectedProject)
//       : tasks;

//     return {
//       todo: filtered.filter((t) => t.status === "todo"),
//       "in-progress": filtered.filter((t) => t.status === "in-progress"),
//       done: filtered.filter((t) => t.status === "done"),
//     };
//   };

//   // drag & drop handler
//   const handleDragEnd = async (result) => {
//     if (!result.destination) return;
//     const { source, destination, draggableId } = result;

//     if (source.droppableId === destination.droppableId) return;

//     try {
//       await api.put(`/project/tasks/${draggableId}`, {
//         status: destination.droppableId,
//       });

//       setTasks((prev) =>
//         prev.map((t) =>
//           t._id === draggableId ? { ...t, status: destination.droppableId } : t
//         )
//       );
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // prepare events for FullCalendar
//   const calendarEvents = tasks
//     .filter((t) => !selectedProject || t.project?._id === selectedProject)
//     .map((t) => ({
//       id: t._id,
//       title: `${t.title} (${t.status})`,
//       start: t.dueDate,
//       backgroundColor:
//         t.status === "todo"
//           ? "#fca5a5" // red
//           : t.status === "in-progress"
//           ? "#facc15" // yellow
//           : "#4ade80", // green
//       borderColor: "#000",
//     }));

//   const columns = getColumns();

//   const columnStyles = {
//     todo: "bg-red-100/40 border-red-300",
//     "in-progress": "bg-yellow-100/40 border-yellow-300",
//     done: "bg-green-100/40 border-green-300",
//   };

//   if (loading) return <p className="p-6">Loading...</p>;

//   return (
//     <div className="p-6">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-3xl font-bold tracking-tight">📋 Task Manager</h1>

//         <div className="flex gap-3 items-center">
//           <select
//             value={selectedProject}
//             onChange={(e) => setSelectedProject(e.target.value)}
//             className="border rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             {projects.map((p) => (
//               <option key={p._id} value={p._id}>
//                 {p.name}
//               </option>
//             ))}
//           </select>

//           <div className="flex rounded-lg overflow-hidden border">
//             <button
//               onClick={() => setView("board")}
//               className={`px-4 py-2 transition ${
//                 view === "board"
//                   ? "bg-blue-500 text-white"
//                   : "bg-gray-50 hover:bg-gray-100"
//               }`}
//             >
//               Board
//             </button>
//             <button
//               onClick={() => setView("calendar")}
//               className={`px-4 py-2 transition ${
//                 view === "calendar"
//                   ? "bg-blue-500 text-white"
//                   : "bg-gray-50 hover:bg-gray-100"
//               }`}
//             >
//               Calendar
//             </button>
//           </div>
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
//                       {status.replace("-", " ")} ({items.length})
//                     </h2>

//                     {items.map((task, index) => (
//                       <Draggable
//                         key={task._id.toString()}
//                         draggableId={task._id.toString()}
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
//                               {task.title}
//                             </p>
//                             <div className="flex flex-wrap gap-2 mb-2">
//                               {task.assignees?.map((user) => (
//                                 <span
//                                   key={user._id}
//                                   className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full"
//                                 >
//                                   {user.name}
//                                 </span>
//                               ))}
//                             </div>
//                             <p className="text-xs text-gray-400">
//                               Due:{" "}
//                               {task.dueDate
//                                 ? new Date(task.dueDate).toLocaleDateString()
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
//               alert(`Task: ${info.event.title}`);
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

// // FullCalendar needs dynamic import
// const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
// import dayGridPlugin from "@fullcalendar/daygrid";
// import interactionPlugin from "@fullcalendar/interaction";

// export default function TaskBoardWithCalendar() {
//   const [tasks, setTasks] = useState([]);
//   const [projects, setProjects] = useState([]);
//   const [selectedProject, setSelectedProject] = useState("");
//   const [loading, setLoading] = useState(true);
//   const [view, setView] = useState("board"); // toggle between board & calendar

//   // fetch tasks & projects
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const [tRes, pRes] = await Promise.all([
//           api.get("/project/tasks"),
//           api.get("/project/projects"),
//         ]);
//         setTasks(tRes.data);
//         setProjects(pRes.data);
//         if (pRes.data.length > 0) setSelectedProject(pRes.data[0]._id);
//       } catch (err) {
//         console.error(err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchData();
//   }, []);

//   // group tasks by status
//   const getColumns = () => {
//     const filtered = selectedProject
//       ? tasks.filter((t) => t.project?._id === selectedProject)
//       : tasks;

//     return {
//       todo: filtered.filter((t) => t.status === "todo"),
//       "in-progress": filtered.filter((t) => t.status === "in-progress"),
//       done: filtered.filter((t) => t.status === "done"),
//     };
//   };

//   // drag & drop handler
//   const handleDragEnd = async (result) => {
//     if (!result.destination) return;
//     const { source, destination, draggableId } = result;

//     if (source.droppableId === destination.droppableId) return;

//     try {
//       await api.put(`/project/tasks/${draggableId}`, {
//         status: destination.droppableId,
//       });

//       setTasks((prev) =>
//         prev.map((t) =>
//           t._id === draggableId ? { ...t, status: destination.droppableId } : t
//         )
//       );
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // prepare events for FullCalendar
//   const calendarEvents = tasks
//     .filter((t) => !selectedProject || t.project?._id === selectedProject)
//     .map((t) => ({
//       id: t._id,
//       title: `${t.title} (${t.status})`,
//       start: t.dueDate, // must be ISO string
//       backgroundColor:
//         t.status === "todo"
//           ? "#fca5a5" // red
//           : t.status === "in-progress"
//           ? "#facc15" // yellow
//           : "#4ade80", // green
//       borderColor: "#000",
//     }));

//   const columns = getColumns();

//   const columnStyles = {
//     todo: "bg-red-50 border-red-300",
//     "in-progress": "bg-yellow-50 border-yellow-300",
//     done: "bg-green-50 border-green-300",
//   };

//   if (loading) return <p className="p-6">Loading...</p>;

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Tasks</h1>

//         <div className="flex gap-3">
//           <select
//             value={selectedProject}
//             onChange={(e) => setSelectedProject(e.target.value)}
//             className="border p-2 rounded"
//           >
//             {projects.map((p) => (
//               <option key={p._id} value={p._id}>
//                 {p.name}
//               </option>
//             ))}
//           </select>

//           <button
//             onClick={() => setView("board")}
//             className={`px-4 py-2 rounded ${
//               view === "board" ? "bg-blue-500 text-white" : "bg-gray-200"
//             }`}
//           >
//             Board
//           </button>
//           <button
//             onClick={() => setView("calendar")}
//             className={`px-4 py-2 rounded ${
//               view === "calendar" ? "bg-blue-500 text-white" : "bg-gray-200"
//             }`}
//           >
//             Calendar
//           </button>
//         </div>
//       </div>

//       {view === "board" ? (
//         <DragDropContext onDragEnd={handleDragEnd}>
//           <div className="grid grid-cols-3 gap-6">
//             {Object.entries(columns).map(([status, items]) => (
//               <Droppable key={`col-${status}`} droppableId={status}>
//                 {(provided) => (
//                   <div
//                     {...provided.droppableProps}
//                     ref={provided.innerRef}
//                     className={`rounded-lg p-4 min-h-[500px] border ${columnStyles[status]}`}
//                   >
//                     <h2 className="font-semibold mb-3 capitalize">{status}</h2>
//                     {items.map((task, index) => (
//                       <Draggable
//                         key={task._id.toString()}
//                         draggableId={task._id.toString()}
//                         index={index}
//                       >
//                         {(provided) => (
//                           <div
//                             ref={provided.innerRef}
//                             {...provided.draggableProps}
//                             {...provided.dragHandleProps}
//                             className="bg-white shadow rounded-lg p-3 mb-3 border hover:shadow-md transition"
//                           >
//                             <p className="font-medium">{task.title}</p>
//                             <p className="text-sm text-gray-500">
//                                         {task.assignees?.map(user => (
//     <span key={user._id} className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
//       {user.name}
//     </span>
//   ))}
//                             </p>
//                             <p className="text-xs text-gray-400">
//                               Due:{" "}
//                               {task.dueDate
//                                 ? new Date(task.dueDate).toLocaleDateString()
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
//         <div className="bg-white shadow rounded-xl p-4">
//           <FullCalendar
//             plugins={[dayGridPlugin, interactionPlugin]}
//             initialView="dayGridMonth"
//             events={calendarEvents}
//             height="700px"
//             eventClick={(info) => {
//               alert(`Task: ${info.event.title}`);
//             }}
//           />
//         </div>
//       )}
//     </div>
//   );
// }

