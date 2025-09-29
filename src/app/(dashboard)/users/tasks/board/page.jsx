"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import api from "@/lib/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// FullCalendar needs dynamic import
const FullCalendar = dynamic(() => import("@fullcalendar/react"), { ssr: false });
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function TaskBoardWithCalendar() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("board"); // toggle between board & calendar

  // fetch tasks & projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, pRes] = await Promise.all([
          api.get("project/tasks"),
          // api.get("/project/projects"),
        ]);
        setTasks(tRes.data);
        // setProjects(pRes.data);
        // if (pRes.data.length > 0) setSelectedProject(pRes.data[0]._id);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // group tasks by status
  const getColumns = () => {
    const filtered = selectedProject
      ? tasks.filter((t) => t.project?._id === selectedProject)
      : tasks;

    return {
      todo: filtered.filter((t) => t.status === "todo"),
      "in-progress": filtered.filter((t) => t.status === "in-progress"),
      done: filtered.filter((t) => t.status === "done"),
    };
  };

  // drag & drop handler
  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    try {
      await api.put(`/tasks/${draggableId}`, {
        status: destination.droppableId,
      });

      setTasks((prev) =>
        prev.map((t) =>
          t._id === draggableId ? { ...t, status: destination.droppableId } : t
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  // prepare events for FullCalendar
  const calendarEvents = tasks
    .filter((t) => !selectedProject || t.project?._id === selectedProject)
    .map((t) => ({
      id: t._id,
      title: `${t.title} (${t.status})`,
      start: t.dueDate,
      backgroundColor:
        t.status === "todo"
          ? "#fca5a5" // red
          : t.status === "in-progress"
          ? "#facc15" // yellow
          : "#4ade80", // green
      borderColor: "#000",
    }));

  const columns = getColumns();

  const columnStyles = {
    todo: "bg-red-100/40 border-red-300",
    "in-progress": "bg-yellow-100/40 border-yellow-300",
    done: "bg-green-100/40 border-green-300",
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">📋 Task Manager</h1>

        {/* <div className="flex gap-3 items-center">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="border rounded-lg px-3 py-2 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>

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
        </div> */}
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
                      {status.replace("-", " ")} ({items.length})
                    </h2>

                    {items.map((task, index) => (
                      <Draggable
                        key={task._id.toString()}
                        draggableId={task._id.toString()}
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
                              {task.title}
                            </p>
                            <div className="flex flex-wrap gap-2 mb-2">
                              {task.assignees?.map((user) => (
                                <span
                                  key={user._id}
                                  className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-full"
                                >
                                  {user.name}
                                </span>
                              ))}
                            </div>
                            <p className="text-xs text-gray-400">
                              Start:{" "}
                              {task.startDate
                                ? new Date(task.startDate).toLocaleDateString()
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
              alert(`Task: ${info.event.title}`);
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

