"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaCarSide, FaChevronDown, FaChevronRight } from "react-icons/fa";

const ROW_HEIGHT = 40;
const CELL_WIDTH = 100; // Width of each column

async function fetchProject(id) {
  const token = localStorage.getItem("token");
  const res = await fetch(`/api/project/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

async function fetchSubTask(taskId) {
  const token = localStorage.getItem("token");
  try {
    const res = await fetch(`/api/project/tasks/${taskId}/subtasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Failed to fetch subtasks");
    const data = await res.json();
    console.log(`Fetched Subtasks for Task ${taskId}:`, data);
    return data; // returns an array
  } catch (err) {
    console.error("Subtask fetch error:", err);
    return [];
  }
}



// Helper function to align start date by view mode
const getViewStartDate = (date, viewMode) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  switch (viewMode) {
    case "Day":
      return d;
    case "Week":
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.setDate(diff));
    case "Month":
      return new Date(d.getFullYear(), d.getMonth(), 1);
    case "Quarter":
      const month = d.getMonth();
      const quarterStartMonth = Math.floor(month / 3) * 3;
      return new Date(d.getFullYear(), quarterStartMonth, 1);
    default:
      return d;
  }
};

// Helper to calculate days between
const daysBetween = (d1, d2) => {
  if (!d1 || !d2) return 0;
  const date1 = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const date2 = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  const diffTime = Math.abs(date2 - date1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function ProjectGanttPage() {
  const { id } = useParams();
  const [tasks, setTasks] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [viewMode, setViewMode] = useState("Week");

 useEffect(() => {
  if (!id) return;
  (async () => {
    try {
      const data = await fetchProject(id);
      const projectTasks = Array.isArray(data)
        ? data
        : data.tasks || data.project?.tasks || [];

    const formatted = await Promise.all(
  projectTasks.map(async (t) => {
    let subTasks = [];

    // fetch all subtasks by taskId, not individual subtaskId
    if (t._id) {
      subTasks = await fetchSubTask(t._id);
    }

    const getValidDate = (d) => (d ? new Date(d) : null);

    const taskStart = getValidDate(t.startDate || t.projectedStartDate);
    const taskEnd = getValidDate(t.endDate || t.projectedEndDate || t.dueDate);

    let calculatedTaskStart = taskStart;
    let calculatedTaskEnd = taskEnd;

    if (subTasks.length > 0) {
      const allStarts = subTasks
        .map((st) => getValidDate(st.startDate || st.projectedStartDate))
        .filter(Boolean);
      const allEnds = subTasks
        .map((st) => getValidDate(st.endDate || st.projectedEndDate || st.dueDate))
        .filter(Boolean);

      if (allStarts.length > 0) {
        const earliest = new Date(Math.min(...allStarts.map((d) => d.getTime())));
        calculatedTaskStart =
          !calculatedTaskStart || earliest < calculatedTaskStart
            ? earliest
            : calculatedTaskStart;
      }
      if (allEnds.length > 0) {
        const latest = new Date(Math.max(...allEnds.map((d) => d.getTime())));
        calculatedTaskEnd =
          !calculatedTaskEnd || latest > calculatedTaskEnd
            ? latest
            : calculatedTaskEnd;
      }
    }

    if (!calculatedTaskStart && !calculatedTaskEnd) {
      calculatedTaskStart = new Date();
      calculatedTaskEnd = new Date(calculatedTaskStart);
      calculatedTaskEnd.setDate(calculatedTaskEnd.getDate() + 1);
    } else if (!calculatedTaskStart) {
      calculatedTaskStart = new Date(calculatedTaskEnd);
      calculatedTaskStart.setDate(calculatedTaskStart.getDate() - 1);
    } else if (!calculatedTaskEnd) {
      calculatedTaskEnd = new Date(calculatedTaskStart);
      calculatedTaskEnd.setDate(calculatedTaskEnd.getDate() + 1);
    }

    const mappedSubTasks = subTasks
      .map((st) => {
        const stStart = getValidDate(st.startDate || st.projectedStartDate || calculatedTaskStart);
        const stEnd = getValidDate(st.endDate || st.projectedEndDate || st.dueDate || stStart);
        return {
          id: st._id,
          name: st.title || "Untitled Subtask",
          progress: st.progress ?? 0,
          start: stStart,
          end: stEnd,
        };
      })
      .filter(Boolean);

    const taskObj = {
      id: t._id,
      name: t.title || "Untitled Task",
      progress: t.progress ?? 0,
      start: calculatedTaskStart,
      end: calculatedTaskEnd,
      subTasks: mappedSubTasks,
    };

    console.log("Formatted Task:", taskObj);
    return taskObj;
  })
);


console.log("All Formatted Tasks:", formatted);


      setTasks(formatted);
      console.log("All Tasks:", formatted); // log all tasks after formatting
    } catch (error) {
      console.error("Failed to fetch project or subtasks:", error);
    }
  })();
}, [id]);


  const allDates = tasks
    .flatMap((t) => [
      t.start,
      t.end,
      ...t.subTasks.flatMap((st) => [st.start, st.end]),
    ])
    .filter(Boolean);

  const minDate = allDates.length
    ? new Date(Math.min(...allDates.map((d) => d.getTime())))
    : new Date();
  const maxDate = allDates.length
    ? new Date(Math.max(...allDates.map((d) => d.getTime())))
    : new Date();

  // Define grid info based on viewMode
  const getGridInfo = () => {
    let unitDays = 7;
    let columns = 0;
    let viewStartDate = minDate;

    switch (viewMode) {
      case "Day":
        unitDays = 1;
        viewStartDate = getViewStartDate(minDate, "Day");
        columns = daysBetween(viewStartDate, maxDate) + 1;
        break;
      case "Week":
        unitDays = 7;
        viewStartDate = getViewStartDate(minDate, "Week");
        columns = Math.ceil(daysBetween(viewStartDate, maxDate) / 7) + 1;
        break;
      case "Month":
        unitDays = 30;
        viewStartDate = getViewStartDate(minDate, "Month");
        columns = Math.ceil(daysBetween(viewStartDate, maxDate) / 30) + 1;
        break;
      case "Quarter":
        unitDays = 90;
        viewStartDate = getViewStartDate(minDate, "Quarter");
        columns = Math.ceil(daysBetween(viewStartDate, maxDate) / 90) + 1;
        break;
    }
    return { unitDays, columns, viewStartDate };
  };

  const { unitDays, columns, viewStartDate } = getGridInfo();
  const chartScrollWidth = columns * CELL_WIDTH;

  const getBarDimensions = (start, end) => {
    if (!start || !end) return { left: 0, width: 0 };
    const chartStartDay = viewStartDate.getTime();
    const daysFromChartStart = Math.floor(
      (start.getTime() - chartStartDay) / (1000 * 60 * 60 * 24)
    );
    const durationDays = daysBetween(start, end) + 1;

    const left = (daysFromChartStart / unitDays) * CELL_WIDTH;
    let width = (durationDays / unitDays) * CELL_WIDTH;

    if (width < 10) width = 10;
    return { left, width };
  };

  const getFormattedDate = (date) => {
    if (!date) return "";
    const options = { day: "2-digit", month: "2-digit", year: "numeric" };
    return date.toLocaleDateString("en-GB", options);
  };

  const getDuration = (start, end) => {
    if (!start || !end) return "0d";
    const durationInDays = daysBetween(start, end) + 1;
    return `${durationInDays}d`;
  };

  const rows = [];
  tasks.forEach((t) => {
    rows.push({ ...t, isSub: false, level: 0 });
    if (expanded[t.id] && Array.isArray(t.subTasks)) {
      t.subTasks.forEach((st) => {
        rows.push({ ...st, isSub: true, parent: t.id, level: 1 });
      });
    }
  });

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <div className="flex-1 p-6 overflow-y-auto">
        <h1 className="text-2xl font-bold mb-4 text-gray-800">
          📊 Project Gantt Chart
        </h1>

        {/* Controls */}
        <div className="flex gap-2 mb-6 items-center">
          <label className="font-medium">View Mode:</label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="border rounded px-2 py-1 shadow-sm"
          >
            <option value="Day">Day</option>
            <option value="Week">Week</option>
            <option value="Month">Month</option>
            <option value="Quarter">Quarter</option>
          </select>
        </div>

        <div className="flex border rounded-lg shadow-lg bg-white max-h-[600px] overflow-hidden">
          {/* Left Task Table */}
          <div className="flex-shrink-0 w-80 bg-gray-50 border-r border-gray-200">
            <div className="grid grid-cols-[1fr_80px_80px_80px] h-10 px-2 border-b border-gray-200 bg-gray-100 font-semibold text-gray-700 text-sm sticky top-0 z-20">
              <div className="flex items-center">Task Name</div>
              <div className="flex items-center justify-center border-l border-gray-200">
                Dur.
              </div>
              <div className="flex items-center justify-center border-l border-gray-200">
                Start
              </div>
              <div className="flex items-center justify-center border-l border-gray-200">
                End
              </div>
            </div>

            <div
              className="overflow-y-auto"
              style={{ height: `calc(100% - ${ROW_HEIGHT}px)` }}
            >
              {rows.map((r) => (
                <div
                  key={r.id + (r.isSub ? "-sub" : "-task")}
                  className={`grid grid-cols-[1fr_80px_80px_80px] items-center h-[${ROW_HEIGHT}px] px-2 border-b border-gray-200 cursor-pointer transition ${
                    r.isSub
                      ? "text-sm text-gray-600"
                      : "font-medium text-gray-800"
                  }`}
                  onClick={() =>
                    !r.isSub &&
                    setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))
                  }
                >
                  <div
                    className="flex items-center truncate"
                    style={{ paddingLeft: `${4 + r.level * 20}px` }}
                  >
                    {!r.isSub && (
                      <span className="mr-2 text-xs">
                        {expanded[r.id] ? <FaChevronDown /> : <FaChevronRight />}
                      </span>
                    )}
                    {r.name}
                  </div>
                  <div className="flex items-center justify-center text-xs border-l border-gray-200">
                    {getDuration(r.start, r.end)}
                  </div>
                  <div className="flex items-center justify-center text-xs border-l border-gray-200">
                    {getFormattedDate(r.start)}
                  </div>
                  <div className="flex items-center justify-center text-xs border-l border-gray-200">
                    {getFormattedDate(r.end)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Chart */}
          <div className="flex-1 relative overflow-x-auto overflow-y-auto">
            {/* Header */}
            <div
              className="flex h-10 border-b border-gray-200 bg-gray-100 sticky top-0 z-10"
              style={{ minWidth: chartScrollWidth }}
            >
              {Array.from({ length: columns }).map((_, i) => {
                const current = new Date(viewStartDate);
                current.setDate(viewStartDate.getDate() + i * unitDays);

                let label = "";
                if (viewMode === "Day") {
                  label = current.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  });
                } else if (viewMode === "Week") {
                  const weekEnd = new Date(current);
                  weekEnd.setDate(current.getDate() + 6);
                  label = `${current.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })} - ${weekEnd.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })}`;
                } else if (viewMode === "Month") {
                  label = current.toLocaleString("default", {
                    month: "short",
                    year: "numeric",
                  });
                } else if (viewMode === "Quarter") {
                  const quarter = Math.floor(current.getMonth() / 3) + 1;
                  label = `Q${quarter}-${current.getFullYear()}`;
                }

                return (
                  <div
                    key={`col-${i}`}
                    className="flex items-center justify-center text-xs text-gray-600 border-r border-gray-200 flex-shrink-0"
                    style={{ width: CELL_WIDTH }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Grid + Bars */}
            <div className="relative" style={{ minWidth: chartScrollWidth }}>
              {rows.map((r, rowIdx) => {
                const { left, width } = getBarDimensions(r.start, r.end);
                const progressWidth = Math.max(
                  0,
                  Math.min(width, (width * r.progress) / 100)
                );
                return (
                  <div
                    key={`${r.id}-${rowIdx}`}
                    className="relative border-b border-gray-100"
                    style={{ height: ROW_HEIGHT }}
                  >
                    {/* Grid lines */}
                    {Array.from({ length: columns }).map((_, i) => (
                      <div
                        key={`grid-${rowIdx}-${i}`}
                        className="absolute top-0 h-full border-r border-gray-200"
                        style={{ left: i * CELL_WIDTH, width: CELL_WIDTH }}
                      ></div>
                    ))}
                    {/* Bar */}
                    <div
                      className={`absolute h-5 rounded-xl shadow-md ${
                        r.isSub
                          ? "bg-gradient-to-r from-purple-400 to-purple-600"
                          : "bg-gradient-to-r from-blue-400 to-blue-600"
                      }`}
                      style={{ left, width, top: ROW_HEIGHT / 4 }}
                    >
                      <div
                        className="h-full bg-green-500/70 rounded-l-xl"
                        style={{ width: progressWidth }}
                      ></div>
                    </div>
                    {/* Car */}
                    <div
                      className="absolute text-2xl text-blue-800 transition-all duration-500"
                      style={{
                        top: ROW_HEIGHT / 4 - 6,
                        left: left + progressWidth - 15,
                      }}
                    >
                      <FaCarSide />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



// "use client";
// import { useEffect, useState } from "react";
// import { useParams } from "next/navigation";
// import { FaCarSide, FaChevronDown, FaChevronRight } from "react-icons/fa";

// const ROW_HEIGHT = 40;
// const CELL_WIDTH = 120;

// async function fetchProject(id) {
//   const token = localStorage.getItem("token");
//   const res = await fetch(`/api/project/projects/${id}`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) throw new Error("Failed to fetch project");
//   return res.json();
// }

// async function fetchSubTask(subTaskId) {
//   const token = localStorage.getItem("token");
//   const res = await fetch(`/api/project/tasks/${subTaskId}/subtasks`, {
//     headers: { Authorization: `Bearer ${token}` },
//   });
//   if (!res.ok) return null;
//   return res.json();
// }

// export default function ProjectGanttPage() {
//   const { id } = useParams();
//   const [tasks, setTasks] = useState([]);
//   const [expanded, setExpanded] = useState({});
//   const [viewMode, setViewMode] = useState("Week");

//   // Fetch project + subtasks
//   useEffect(() => {
//     if (!id) return;
//     (async () => {
//       const data = await fetchProject(id);

//       let arr = Array.isArray(data)
//         ? data
//         : data.tasks
//         ? data.tasks
//         : data.project?.tasks || [];

//       // Resolve subtasks
//       const formatted = await Promise.all(
//         arr.map(async (t) => {
//           let subTasks = [];
//           if (Array.isArray(t.subTasks) && t.subTasks.length > 0) {
//             subTasks = (
//               await Promise.all(
//                 t.subTasks.map(async (stId) => {
//                   if (typeof stId === "string" || stId.$oid) {
//                     return await fetchSubTask(stId);
//                   }
//                   return stId; // already object
//                 })
//               )
//             ).filter(Boolean);
//           }
//           return {
//             id: t._id,
//             name: t.title,
//             progress: t.progress ?? 0,
//             start: new Date(t.startDate || t.projectedStartDate),
//             end: new Date(t.endDate || t.projectedEndDate || t.dueDate),
//             subTasks: subTasks.map((st) => ({
//               id: st._id,
//               name: st.title,
//               progress: st.progress ?? 0,
//               start: new Date(st.startDate || st.projectedStartDate),
//               end: new Date(st.endDate || st.projectedEndDate || st.dueDate),
//             })),
//           };
//         })
//       );

//       setTasks(formatted);
//     })();
//   }, [id]);

//   // Date range
//   const minDate = tasks.length
//     ? new Date(Math.min(...tasks.map((t) => t.start.getTime())))
//     : new Date();
//   const maxDate = tasks.length
//     ? new Date(Math.max(...tasks.map((t) => t.end.getTime())))
//     : new Date();

//   // Grid info
//   const getGridInfo = () => {
//     let unitDays = 7;
//     switch (viewMode) {
//       case "Day":
//         unitDays = 1;
//         break;
//       case "Week":
//         unitDays = 7;
//         break;
//       case "Month":
//         unitDays = 30;
//         break;
//       case "Quarter":
//         unitDays = 90;
//         break;
//     }
//     const totalDays = Math.max(
//       1,
//       Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24))
//     );
//     const columns = Math.ceil(totalDays / unitDays);
//     return { unitDays, columns, totalDays };
//   };

//   const { unitDays, columns, totalDays } = getGridInfo();

//   const getX = (date) => {
//     if (totalDays <= 0) return 0;
//     return (
//       ((date.getTime() - minDate.getTime()) / (maxDate - minDate)) *
//       (columns * CELL_WIDTH)
//     );
//   };

//   // Flatten tasks + subtasks
//   const rows = [];
//   tasks.forEach((t) => {
//     rows.push({ ...t, isSub: false });
//     if (expanded[t.id]) {
//       t.subTasks.forEach((st) => {
//         rows.push({ ...st, isSub: true, parent: t.id });
//       });
//     }
//   });

//   return (
//     <div className="p-6 bg-gray-50 min-h-screen">
//       <h1 className="text-2xl font-bold mb-4 text-gray-800">
//         📊 Project Gantt Chart
//       </h1>

//       {/* Controls */}
//       <div className="flex gap-2 mb-6 items-center">
//         <label className="font-medium">View Mode:</label>
//         <select
//           value={viewMode}
//           onChange={(e) => setViewMode(e.target.value)}
//           className="border rounded px-2 py-1 shadow-sm"
//         >
//           <option value="Day">Day</option>
//           <option value="Week">Week</option>
//           <option value="Month">Month</option>
//           <option value="Quarter">Quarter</option>
//         </select>
//       </div>

//       {/* Chart container */}
//       <div className="flex border rounded-lg overflow-hidden shadow-lg h-[600px] bg-white">
//         {/* Left fixed task list */}
//         <div className="w-64 bg-gray-50 border-r overflow-y-auto">
//           <div className="h-10 flex items-center px-3 font-semibold border-b bg-gray-100 text-gray-700">
//             Tasks
//           </div>
//           {rows.map((r) => (
//             <div
//               key={r.id}
//               className={`flex items-center h-[${ROW_HEIGHT}px] px-3 border-b cursor-pointer hover:bg-blue-50 transition ${
//                 r.isSub ? "pl-8 text-sm text-gray-600" : "font-medium text-gray-800"
//               }`}
//               onClick={() =>
//                 !r.isSub && setExpanded((p) => ({ ...p, [r.id]: !p[r.id] }))
//               }
//             >
//               {!r.isSub && (
//                 <span className="mr-2">
//                   {expanded[r.id] ? <FaChevronDown /> : <FaChevronRight />}
//                 </span>
//               )}
//               {r.name}
//             </div>
//           ))}
//         </div>

//         {/* Right chart */}
//         <div className="flex-1 overflow-auto relative">
//           {/* Sticky header */}
//           <div className="flex h-10 border-b bg-gray-100 sticky top-0 z-10 min-w-max">
//             {Array.from({ length: columns }).map((_, i) => {
//               const current = new Date(minDate);
//               current.setDate(minDate.getDate() + i * unitDays);
//               let label = "";
//               if (viewMode === "Day") {
//                 label = current.toLocaleDateString("en-GB");
//               } else if (viewMode === "Week") {
//                 label = `W${i + 1}`;
//               } else if (viewMode === "Month") {
//                 label = current.toLocaleString("default", {
//                   month: "short",
//                   year: "numeric",
//                 });
//               } else if (viewMode === "Quarter") {
//                 label = `Q${Math.floor(current.getMonth() / 3) + 1}-${current.getFullYear()}`;
//               }
//               return (
//                 <div
//                   key={i}
//                   className="flex items-center justify-center text-xs text-gray-600 border-r border-gray-300"
//                   style={{ width: CELL_WIDTH }}
//                 >
//                   {label}
//                 </div>
//               );
//             })}
//           </div>

//           {/* Task rows with grid + bars */}
//           <div className="relative min-w-max">
//             {rows.map((r) => {
//               const left = getX(r.start);
//               const right = getX(r.end);
//               const width = right - left;
//               const progressWidth = (width * r.progress) / 100;

//               return (
//                 <div
//                   key={r.id}
//                   className="relative border-b flex"
//                   style={{ height: ROW_HEIGHT }}
//                 >
//                   {Array.from({ length: columns }).map((_, i) => (
//                     <div
//                       key={i}
//                       className="border-r border-gray-200"
//                       style={{ width: CELL_WIDTH }}
//                     ></div>
//                   ))}

//                   {/* Task bar */}
//                   <div
//                     className={`absolute h-5 ${
//                       r.isSub
//                         ? "bg-gradient-to-r from-purple-400 to-purple-600"
//                         : "bg-gradient-to-r from-blue-400 to-blue-600"
//                     } rounded-xl shadow-md`}
//                     style={{ left, width, top: ROW_HEIGHT / 4 }}
//                   >
//                     <div
//                       className="h-5 bg-green-500/70 rounded-l-xl"
//                       style={{ width: progressWidth }}
//                     ></div>
//                   </div>

//                   {/* Car icon */}
//                   <div
//                     className="absolute text-2xl text-blue-800 transition-all duration-500"
//                     style={{
//                       top: ROW_HEIGHT / 4 - 6,
//                       left: left + progressWidth - 15,
//                     }}
//                   >
//                     <FaCarSide />
//                   </div>
//                 </div>
//               );
//             })}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


//    12-10-2025

// "use client";
// import { useEffect, useRef, useState } from "react";
// import { useParams } from "next/navigation";
// import { FaCarSide } from "react-icons/fa";


// // Fetch tasks
// async function fetchTasks(id) {
//   const token = localStorage.getItem("token");
//   const res = await fetch(`/api/project/projects/${id}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (res.status === 401) throw new Error("Unauthorized (401)");
//   if (!res.ok) throw new Error(`Failed to fetch tasks: ${res.status}`);
//   return res.json();
// }

// export default function ProjectGanttPage() {
//   const { id } = useParams();
//   const [tasks, setTasks] = useState([]);
//   const [error, setError] = useState(null);
//   const [viewMode, setViewMode] = useState("Week");
//   const chartRef = useRef(null);
//   const [chartWidth, setChartWidth] = useState(0);

//   // Load tasks
//   useEffect(() => {
//     if (!id) return;

//     fetchTasks(id)
//       .then((data) => {
//         const taskArray = Array.isArray(data)
//           ? data
//           : data.tasks
//           ? data.tasks
//           : data.project?.tasks
//           ? data.project.tasks
//           : [];

//         const mappedTasks = taskArray.map((t) => ({
//           id: t._id,
//           name: t.title,
//           start: new Date(t.start ?? t.startDate ?? t.projectedStartDate),
//           end: new Date(t.end ?? t.endDate ?? t.projectedEndDate),
//           status: t.status,
//           priority: t.priority,
//           progress: t.progress ?? 0,
//           dependencies: t.subTasks ?? [],
//         }));

//         setTasks(mappedTasks);
//       })
//       .catch((err) => setError(err.message));
//   }, [id]);

//   // Resize observer
//   useEffect(() => {
//     if (!chartRef.current) return;
//     const resizeObserver = new ResizeObserver(() => {
//       setChartWidth(chartRef.current.offsetWidth);
//     });
//     resizeObserver.observe(chartRef.current);
//     setChartWidth(chartRef.current.offsetWidth);
//     return () => resizeObserver.disconnect();
//   }, []);

//   // Date range
//   const minDate = tasks.length
//     ? new Date(Math.min(...tasks.map((t) => t.start.getTime())))
//     : new Date();
//   const maxDate = tasks.length
//     ? new Date(Math.max(...tasks.map((t) => t.end.getTime())))
//     : new Date();
//   const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) || 1;

//   // Auto-scale columns
//   const getGridInfo = () => {
//     let columns = 12;
//     let unitDays = 7;

//     switch (viewMode) {
//       case "Day":
//         columns = totalDays;
//         unitDays = 1;
//         break;
//       case "Week":
//         columns = Math.ceil(totalDays / 7);
//         unitDays = 7;
//         break;
//       case "Month":
//         columns = Math.ceil(totalDays / 30);
//         unitDays = 30;
//         break;
//       case "Quarter":
//         columns = Math.ceil(totalDays / 90);
//         unitDays = 90;
//         break;
//       default:
//         columns = 12;
//         unitDays = 7;
//     }
//     return { columns, unitDays };
//   };

//   const { columns, unitDays } = getGridInfo();

//   const getX = (date) => {
//     if (!chartWidth || totalDays <= 0) return 0;
//     return ((date.getTime() - minDate.getTime()) / (maxDate - minDate)) * chartWidth;
//   };

//   const formatDate = (date) => date.toISOString().split("T")[0];

//   // Generate header labels
//   const generateHeader = () => {
//     const labels = [];
//     for (let i = 0; i < columns; i++) {
//       const current = new Date(minDate);
//       current.setDate(minDate.getDate() + i * unitDays);
//       labels.push(
//         <div
//           key={i}
//           className="flex-1 border-r border-gray-300 text-center text-xs font-medium"
//         >
//           {viewMode === "Day" && current.toLocaleDateString("en-GB")}
//           {viewMode === "Week" &&
//             `W${Math.ceil((current - minDate) / (7 * 24 * 60 * 60 * 1000)) + 1}`}
//           {viewMode === "Month" && current.toLocaleString("default", { month: "short", year: "numeric" })}
//           {viewMode === "Quarter" &&
//             `Q${Math.floor(current.getMonth() / 3) + 1}-${current.getFullYear()}`}
//         </div>
//       );
//     }
//     return labels;
//   };

//   // Render dependency lines
//   const renderDependencies = () => {
//     const lines = [];
//     tasks.forEach((task) => {
//       task.dependencies.forEach((depId) => {
//         const depTask = tasks.find((t) => t.id.toString() === depId.toString());
//         if (depTask) {
//           const x1 = getX(depTask.end);
//           const y1 = 60 + tasks.indexOf(depTask) * 60 + 4;
//           const x2 = getX(task.start);
//           const y2 = 60 + tasks.indexOf(task) * 60 + 4;

//           // Horizontal-then-vertical line
//           lines.push(
//             <path
//               key={`${depTask.id}-${task.id}`}
//               d={`M${x1},${y1} L${x1 + 10},${y1} L${x1 + 10},${y2} L${x2},${y2}`}
//               stroke="orange"
//               strokeWidth={2}
//               fill="none"
//               markerEnd="url(#arrow)"
//             />
//           );
//         }
//       });
//     });
//     return lines;
//   };

//   return (
//     <div className="p-8">
//       <h1 className="text-xl font-bold mb-4">📊 Project Gantt Chart</h1>

//       {/* View Mode Selector */}
//       <div className="flex gap-2 mb-4 items-center">
//         <label className="text-gray-700 font-medium">View Mode:</label>
//         <select
//           value={viewMode}
//           onChange={(e) => setViewMode(e.target.value)}
//           className="border rounded px-2 py-1"
//         >
//           <option value="Day">Day</option>
//           <option value="Week">Week</option>
//           <option value="Month">Month</option>
//           <option value="Quarter">Quarter</option>
//         </select>
//       </div>

//       {error && <p className="text-red-500">⚠️ {error}</p>}

//       <div
//         ref={chartRef}
//         className="relative w-full h-[500px] border rounded bg-gray-50 overflow-x-auto overflow-y-hidden"
//       >
//         <div className="relative h-full min-w-[1200px]">
//           {/* Header */}
//           <div className="flex absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b border-gray-300 z-10">
//             {generateHeader()}
//           </div>

//           {/* Grid under header */}
//           <div className="absolute top-8 inset-x-0 bottom-0 flex">
//             {Array.from({ length: columns }).map((_, i) => (
//               <div key={i} className="flex-1 border-r border-gray-200"></div>
//             ))}
//           </div>

//           {/* Dependencies (SVG) */}
//           <svg className="absolute inset-0 w-full h-full pointer-events-none">
//             <defs>
//               <marker
//                 id="arrow"
//                 markerWidth="10"
//                 markerHeight="10"
//                 refX="5"
//                 refY="5"
//                 orient="auto"
//               >
//                 <path d="M0,0 L0,10 L10,5 z" fill="orange" />
//               </marker>
//             </defs>
//             {renderDependencies()}
//           </svg>

//           {/* Tasks */}
//         {/* Tasks */}
// {/* Tasks */}
// {tasks.map((t, i) => {
//   const left = getX(t.start);
//   const right = getX(t.end);
//   const width = right - left;
//   const progressWidth = (width * t.progress) / 100;

//   return (
//     <div
//       key={t.id}
//       className="absolute group"
//       style={{ top: 60 + i * 56 }} // reduced gap for compact view
//     >
//       {/* Task Bar */}
//       <div
//         className="h-8 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl shadow-md relative cursor-pointer group-hover:ring-2 group-hover:ring-blue-300 transition"
//         style={{ left, width }}
//       >
//         {/* Progress */}
//         <div
//           className="h-8 bg-green-400/70 rounded-l-xl"
//           style={{ width: progressWidth, transition: "width 0.7s ease-in-out" }}
//         ></div>

//         {/* Progress % */}
//         <span className="absolute right-2 top-1 text-xs text-white font-bold drop-shadow">
//           {t.progress}%
//         </span>
//       </div>

//       {/* Car (FaCarSide) */}
//       <div
//         className="absolute w-10 h-10 flex items-center justify-center text-3xl text-blue-700"
//         style={{
//           top: -10,
//           left: left + progressWidth - 20,
//           transition: "left 0.7s ease-in-out",
//         }}
//       >
//         <FaCarSide />
//       </div>

//       {/* Tooltip */}
//       <div className="absolute -top-12 left-0 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition whitespace-nowrap shadow-lg">
//         {t.name} | {formatDate(t.start)} → {formatDate(t.end)} | {t.progress}%
//       </div>
//     </div>
//   );
// })}


//         </div>
//       </div>
//     </div>
//   );
// }



///////////////////////////////////////////////////////////////////////11-09-2025
// "use client";
// import { useEffect, useRef, useState } from "react";
// import { useParams } from "next/navigation";

// async function fetchTasks(id) {
//   const token = localStorage.getItem("token"); 
//   const res = await fetch(`/api/project/projects/${id}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (res.status === 401) {
//     throw new Error("Unauthorized (401) – Missing or invalid token");
//   }

//   if (!res.ok) {
//     throw new Error(`Failed to fetch tasks: ${res.status}`);
//   }

//   return res.json();
// }

// export default function ProjectGanttPage() {
//   const { id } = useParams();
//   const [tasks, setTasks] = useState([]);
//   const [error, setError] = useState(null);
//   const [chartWidth, setChartWidth] = useState(0);
//   const chartRef = useRef(null);

//   // Load tasks
//   useEffect(() => {
//     if (!id) return;

//     fetchTasks(id)
//       .then((data) => {
//         const taskArray = Array.isArray(data)
//           ? data
//           : data.tasks
//           ? data.tasks
//           : data.project?.tasks
//           ? data.project.tasks
//           : [];

//         setTasks(
//           taskArray.map((t) => ({
//             id: t._id,
//             name: t.title,
//             start: new Date(t.start ?? t.startDate ?? t.projectedStartDate),
//             end: new Date(t.end ?? t.endDate ?? t.projectedEndDate),
//             status: t.status,
//             priority: t.priority,
//             progress: t.progress ?? 0,
//           }))
//         );
//       })
//       .catch((err) => {
//         console.error("❌ Fetch error:", err);
//         setError(err.message);
//       });
//   }, [id]);

//   // Chart width observer
//   useEffect(() => {
//     if (!chartRef.current) return;
//     const resizeObserver = new ResizeObserver(() => {
//       setChartWidth(chartRef.current.offsetWidth);
//     });
//     resizeObserver.observe(chartRef.current);
//     setChartWidth(chartRef.current.offsetWidth);
//     return () => resizeObserver.disconnect();
//   }, []);

//   // Date range
//   const minDate = tasks.length
//     ? new Date(Math.min(...tasks.map((t) => t.start.getTime())))
//     : new Date();
//   const maxDate = tasks.length
//     ? new Date(Math.max(...tasks.map((t) => t.end.getTime())))
//     : new Date();
//   const chartDuration = maxDate.getTime() - minDate.getTime();

//   const getX = (date) => {
//     if (!chartWidth || chartDuration <= 0) return 0;
//     return (
//       ((date.getTime() - minDate.getTime()) / chartDuration) * chartWidth
//     );
//   };

//   const formatDate = (date) =>
//     date.toISOString().split("T")[0]; // YYYY-MM-DD

//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold mb-4">📊 Project Gantt Chart</h1>

//       {error && <p className="text-red-500">⚠️ {error}</p>}

//       <div
//         ref={chartRef}
//         className="relative w-full h-[500px] border rounded bg-gray-50 overflow-hidden"
//       >
//         {/* Background grid */}
//         <div className="absolute inset-0 flex">
//           {Array.from({ length: 12 }).map((_, i) => (
//             <div key={i} className="flex-1 border-r border-gray-200"></div>
//           ))}
//         </div>

//         {/* Tasks */}
//         {tasks.map((t, i) => {
//           const left = getX(t.start);
//           const right = getX(t.end);
//           const width = right - left;
//           const progressWidth = (width * t.progress) / 100;

//           return (
//             <div key={t.id} className="absolute" style={{ top: 60 + i * 60 }}>
//               {/* Task bar */}
//               <div
//                 className="h-8 bg-blue-500/70 rounded shadow relative"
//                 style={{ left, width }}
//               >
//                 {/* Progress bar */}
//                 <div
//                   className="h-8 bg-green-500/70 rounded-l"
//                   style={{ width: progressWidth }}
//                 ></div>

//                 {/* Label */}
//                 <span className="absolute left-2 top-1 text-xs text-white font-medium">
//                   {t.name}
//                 </span>

//                 {/* Progress label */}
//                 <span className="absolute right-2 top-1 text-xs text-white">
//                   {t.progress}%
//                 </span>
//               </div>

//               {/* Dates below bar */}
//               <div
//                 className="absolute text-xs text-gray-600 mt-1 flex justify-between w-full"
//                 style={{ left, width }}
//               >
//                 <span>{formatDate(t.start)}</span>
//                 <span>{formatDate(t.end)}</span>
//               </div>

//               {/* Car 🚗 moves along progress */}
//               <div
//                 className="absolute w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow"
//                 style={{
//                   top: 20, // relative to task container
//                   left: left + progressWidth - 10, // move with progress
//                 }}
//                 title={`Car for ${t.name} (${t.progress}%)`}
//               >
//                 🚗
//               </div>
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }




// "use client";
// import { useEffect, useRef, useState } from "react";
// import { useParams } from "next/navigation";

// async function fetchTasks(id) {
//   const token = localStorage.getItem("token"); // ✅ use saved token
//   const res = await fetch(`/api/project/projects/${id}`, {
//     headers: {
//       Authorization: `Bearer ${token}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (res.status === 401) {
//     throw new Error("Unauthorized (401) – Missing or invalid token");
//   }

//   if (!res.ok) {
//     throw new Error(`Failed to fetch tasks: ${res.status}`);
//   }

//   return res.json();
// }

// export default function ProjectGanttPage() {
//   const { id } = useParams();
//   const [tasks, setTasks] = useState([]);
//   const [error, setError] = useState(null);
//   const [chartWidth, setChartWidth] = useState(0);
//   const chartRef = useRef(null);

//   // Load tasks
//   useEffect(() => {
//     if (!id) return;

//     fetchTasks(id)
//       .then((data) => {
//         console.log("📦 Raw API response:", data);

//         const taskArray = Array.isArray(data)
//           ? data
//           : data.tasks
//           ? data.tasks
//           : data.project?.tasks
//           ? data.project.tasks
//           : [];

//         console.log("✅ Parsed tasks array:", taskArray);

//         setTasks(
//           taskArray.map((t) => ({
//             id: t._id,
//             name: t.title,
//             start: new Date(t.start ?? t.startDate ?? t.projectedStartDate),
//             end: new Date(t.end ?? t.endDate ?? t.projectedEndDate),
//             status: t.status,
//             priority: t.priority,
//             progress: t.progress ?? 0,
//           }))
//         );
//       })
//       .catch((err) => {
//         console.error("❌ Fetch error:", err);
//         setError(err.message);
//       });
//   }, [id]);

//   // Chart width observer
//   useEffect(() => {
//     if (!chartRef.current) return;
//     const resizeObserver = new ResizeObserver(() => {
//       setChartWidth(chartRef.current.offsetWidth);
//     });
//     resizeObserver.observe(chartRef.current);
//     setChartWidth(chartRef.current.offsetWidth);
//     return () => resizeObserver.disconnect();
//   }, []);

//   // Date range
//   const minDate = tasks.length
//     ? new Date(Math.min(...tasks.map((t) => t.start.getTime())))
//     : new Date();
//   const maxDate = tasks.length
//     ? new Date(Math.max(...tasks.map((t) => t.end.getTime())))
//     : new Date();
//   const chartDuration = maxDate.getTime() - minDate.getTime();

//   const getX = (date) => {
//     if (!chartWidth || chartDuration <= 0) return 0;
//     return (
//       ((date.getTime() - minDate.getTime()) / chartDuration) * chartWidth
//     );
//   };

//   const formatDate = (date) =>
//     date.toISOString().split("T")[0]; // YYYY-MM-DD

//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold mb-4">📊 Project Gantt Chart</h1>

//       {error && <p className="text-red-500">⚠️ {error}</p>}

//       <div
//         ref={chartRef}
//         className="relative w-full h-[500px] border rounded bg-gray-50 overflow-hidden"
//       >
//         {/* Background grid */}
//         <div className="absolute inset-0 flex">
//           {Array.from({ length: 12 }).map((_, i) => (
//             <div key={i} className="flex-1 border-r border-gray-200"></div>
//           ))}
//         </div>

//         {/* Tasks */}
//         {tasks.map((t, i) => {
//           const left = getX(t.start);
//           const right = getX(t.end);
//           const width = right - left;
//           const progressWidth = (width * t.progress) / 100;

//           return (
//             <div key={t.id} className="absolute" style={{ top: 60 + i * 60 }}>
//               {/* Task bar */}
//               <div
//                 className="h-8 bg-blue-500/70 rounded shadow relative"
//                 style={{ left, width }}
//               >
//                 {/* Progress bar */}
//                 <div
//                   className="h-8 bg-green-500/70 rounded-l"
//                   style={{ width: progressWidth }}
//                 ></div>

//                 {/* Label */}
//                 <span className="absolute left-2 top-1 text-xs text-white font-medium">
//                   {t.name}
//                 </span>

//                 {/* Progress label */}
//                 <span className="absolute right-2 top-1 text-xs text-white">
//                   {t.progress}%
//                 </span>
//               </div>

//               {/* Dates below bar */}
//               <div
//                 className="absolute text-xs text-gray-600 mt-1 flex justify-between w-full"
//                 style={{ left, width }}
//               >
//                 <span>{formatDate(t.start)}</span>
//                 <span>{formatDate(t.end)}</span>
//               </div>
//             </div>
//           );
//         })}

//         {/* Cars 🚗 */}
//         {tasks.map((t, i) => {
//           const left = getX(t.start);
//           return (
//             <div
//               key={t.id + "-car"}
//               className="absolute w-7 h-7 bg-red-500 rounded-full flex items-center justify-center shadow"
//               style={{
//                 top: 35 + i * 60,
//                 left: left - 10,
//               }}
//               title={`Car for ${t.name}`}
//             >
//               🚗
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }


// "use client";

// import { useEffect, useState, useRef, useMemo } from "react";
// import dynamic from "next/dynamic";
// import { useParams } from "next/navigation";
// import "gantt-task-react/dist/index.css";
// import { motion } from "framer-motion";
// import { FaCar } from "react-icons/fa";
// import { createPortal } from "react-dom";
// import React from "react";

// // Dynamically import gantt-task-react
// const Gantt = dynamic(() => import("gantt-task-react").then((m) => m.Gantt), {
//   ssr: false,
//   loading: () => <p>Loading Gantt chart...</p>,
// });   

// // Safe date parser
// const safeDate = (dateString) => {
//   const d = new Date(dateString);
//   return isNaN(d.getTime()) ? new Date() : d;
// };

// export default function ProjectGanttPage() {
//   const { id } = useParams();
//   const ganttRef = useRef(null);

//   const [project, setProject] = useState(null);
//   const [tasks, setTasks] = useState([]);
//   const [viewMode, setViewMode] = useState("Week");
//   const [chartWidth, setChartWidth] = useState(0);
//   const [tasksContainer, setTasksContainer] = useState(null);
//   const [hoveredTaskId, setHoveredTaskId] = useState(null);

//   const rowHeight = 25;
//   const listCellWidth = 200;

//   const colors = useMemo(
//     () => [
//       { bar: "#4CAF50", progress: "#2E7D32" },
//       { bar: "#2196F3", progress: "#1565C0" },
//       { bar: "#FF9800", progress: "#EF6C00" },
//       { bar: "#9C27B0", progress: "#6A1B9A" },
//       { bar: "#F44336", progress: "#C62828" },
//     ],
//     []
//   );

//   // Calculate chart boundaries
//   const { chartStart, chartEnd, chartDuration } = useMemo(() => {
//     if (tasks.length === 0) {
//       const now = new Date();
//       return { chartStart: now, chartEnd: now, chartDuration: 0 };
//     }
//     const start = tasks.reduce(
//       (min, t) => (t.start < min ? t.start : min),
//       tasks[0]?.start
//     );
//     const end = tasks.reduce(
//       (max, t) => (t.end > max ? t.end : max),
//       tasks[0]?.end
//     );
//     return {
//       chartStart: start,
//       chartEnd: end,
//       chartDuration: end.getTime() - start.getTime(),
//     };
//   }, [tasks]);

//   // Apply neutral style but highlight hovered
//   const ganttTasks = useMemo(
//   () => tasks.map((t) => ({
//     ...t,
//     styles: {
//       ...t.styles,
//       progressColor: t.styles.progressColor, // keep default
//       backgroundColor: t.styles.backgroundColor, // keep default
//     },
//   })),
//   [tasks]
// );

//   // Fetch project + tasks
//   useEffect(() => {
//     if (!id) return;
//     const fetchProject = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const headers = { Authorization: `Bearer ${token}` };

//         const res = await fetch(`/api/project/projects/${id}`, { headers });
//         const projectData = await res.json();

//         if (!projectData) {
//           setProject(null);
//           setTasks([]);
//           return;
//         }

//         setProject(projectData);

//         const formattedTasks = [];
//         (projectData.tasks || []).forEach((t, i) => {
//           const color = colors[i % colors.length];
//           formattedTasks.push({
//             id: t._id || t.id,
//             name: t.title || t.name,
//             start: safeDate(t.startDate || t.projectedStartDate),
//             end: safeDate(t.endDate || t.projectedEndDate),
//             type: "task",
//             progress: t.progress ?? 0,
//             status: t.status || "todo",
//             styles: {
//               progressColor: color.progress,
//               backgroundColor: color.bar,
//               bar: color.bar, // keep original for hover
//             },
//           });

//           (t.subTasks || []).forEach((st, j) => {
//             const subColor = colors[(i + j) % colors.length];
//             formattedTasks.push({
//               id: st._id || `${t.id || t._id}-subtask-${j}`,
//               name: st.title || st.name || `Subtask ${j + 1}`,
//               start: safeDate(st.startDate || t.startDate),
//               end: safeDate(st.endDate || t.endDate),
//               type: "task",
//               progress: st.progress ?? 0,
//               status: st.status || "todo",
//               project: t._id || t.id,
//               styles: {
//                 progressColor: subColor.progress,
//                 backgroundColor: subColor.bar,
//                 bar: subColor.bar,
//               },
//             });
//           });
//         });

//         setTasks(formattedTasks);
//       } catch (err) {
//         console.error("Fetch error:", err);
//         setProject(null);
//         setTasks([]);
//       }
//     };
//     fetchProject();
//   }, [id, colors]);

//   // Chart container
//   useEffect(() => {
//     if (!ganttRef.current) return;
//     const updateDimensions = () => {
//       const timeline = ganttRef.current.querySelector(".gantt-timeline");
//       const container = ganttRef.current.querySelector(".gantt-tasks");
//       setChartWidth(timeline ? timeline.offsetWidth : 0);
//       if (container) setTasksContainer(container);
//     };

//     const interval = setInterval(() => {
//       if (ganttRef.current) {
//         const container = ganttRef.current.querySelector(".gantt-tasks");
//         if (container) {
//           setTasksContainer(container);
//           clearInterval(interval);
//         }
//       }
//     }, 100);

//     const observer = new ResizeObserver(updateDimensions);
//     observer.observe(ganttRef.current);

//     return () => {
//       clearInterval(interval);
//       observer.disconnect();
//     };
//   }, [tasks]);

//   if (!project) {
//     return (
//       <div className="flex items-center justify-center h-screen">
//         <p className="text-lg text-gray-600 animate-pulse">
//           Loading project...
//         </p>
//       </div>
//     );
//   }

//   // Render cars
//   // Render cars (overlay on top of normal bars)
//   // const renderCars = () => {
//   //   const visibleTasks = tasks.filter(
//   //     (t) => t.start instanceof Date && t.end instanceof Date
//   //   );  

//   //   if (chartWidth <= 0 || chartDuration <= 0) return null;

//   //   return visibleTasks.map((t, idx) => {
//   //     const status = (t.status || "").toLowerCase();
//   //     const taskDuration = t.end.getTime() - t.start.getTime();
//   //     if (taskDuration <= 0) return null;

//   //     const barStart =
//   //       ((t.start.getTime() - chartStart.getTime()) / chartDuration) *
//   //       chartWidth;
//   //     const barEnd =
//   //       ((t.end.getTime() - chartStart.getTime()) / chartDuration) *
//   //       chartWidth;

//   //     const top = idx * rowHeight + rowHeight / 2 - 10;
//   //     const progressOffset =
//   //       barStart + (t.progress / 100) * (barEnd - barStart);

//   //     const durationInSeconds = Math.max(
//   //       1,
//   //       Math.round(taskDuration / (1000 * 60 * 60 * 24))
//   //     );

//   //     return (
//   //       <React.Fragment key={t.id}>
//   //         {/* 🚗 Car for in-progress tasks */}
//   //         {status === "in-progress" && (
//   //           <motion.div
//   //             className="absolute pointer-events-none"
//   //             style={{ top, zIndex: 30 }}
//   //             animate={{ left: progressOffset }}
//   //             transition={{
//   //               duration: 1, // smooth driving speed
//   //               ease: "easeInOut",
//   //             }}
//   //           >
//   //             <div className="bg-blue-800 rounded-full p-1 shadow-lg ">
//   //               {/* <FaCar size={20} className="text-white" /> */}
//   //               <div className="bg-red-500 text-white text-xs p-1 rounded">
//   //                 🚗
//   //               </div>
//   //             </div>
//   //           </motion.div>
//   //         )}

//   //         {/* 🚗 Car for done tasks (looping) */}
//   //         {status === "done" && (
//   //           <motion.div
//   //             className="absolute pointer-events-none"
//   //             style={{ top, zIndex: 30 }}
//   //             animate={{ left: [barStart, barEnd] }}
//   //             transition={{
//   //               duration: durationInSeconds, // loop time depends on task duration
//   //               ease: "linear",
//   //               repeat: Infinity,
//   //               repeatType: "loop",
//   //             }}
//   //           >
//   //             <div className="bg-green-500 rounded-full p-1 shadow-lg">
//   //               <FaCar size={16} className="text-white" />
//   //             </div>
//   //           </motion.div>
//   //         )}
//   //       </React.Fragment>
//   //     );
//   //   });
//   // };

//   const renderCars = () => {
//   const visibleTasks = tasks.filter(
//     (t) => t.start instanceof Date && t.end instanceof Date
//   );

//   if (chartWidth <= 0 || chartDuration <= 0) return null;

//   return visibleTasks.map((t, idx) => {
//     const status = (t.status || "").toLowerCase();
//     const taskDuration = t.end.getTime() - t.start.getTime();
//     if (taskDuration <= 0) return null;

//     const barStart =
//       ((t.start.getTime() - chartStart.getTime()) / chartDuration) *
//       chartWidth;
//     const barEnd =
//       ((t.end.getTime() - chartStart.getTime()) / chartDuration) *
//       chartWidth;

//     // 📍 Position based on progress %
//     const progressOffset =
//       barStart + (t.progress / 100) * (barEnd - barStart);

//     // Scale car size with row height
//     const carSize = Math.max(12, rowHeight * 0.6);
//     const top = idx * rowHeight + rowHeight / 2 - carSize / 2;

//     // Debug logs
//     console.log("Car:", t.name, "progress:", t.progress, "x:", progressOffset);

//     return (
//       <motion.div
//         key={t.id}
//         className="absolute pointer-events-none"
//         style={{ top, zIndex: 50 }}
//         animate={{ left: progressOffset }}
//         transition={{ duration: 0.8, ease: "easeInOut" }}
//       >
//         <div className="bg-blue-700 rounded-full p-0.5 shadow-md">
//           <FaCar size={carSize} className="text-white" />
//         </div>
//       </motion.div>
//     );
//   });
// };

//   return (
//     <div className="p-6 space-y-8">
//       {/* Header */}
//       <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
//         <h1 className="text-3xl font-bold">{project.name}</h1>
//         <p className="text-purple-100 mt-2">
//           {project.description || "No description available"}
//         </p>
//       </div>

//       {/* View Mode */}
//       <div className="flex gap-2 mb-4 items-center">
//         <label className="text-gray-700 font-medium">View Mode:</label>
//         <select
//           value={viewMode}
//           onChange={(e) => setViewMode(e.target.value)}
//           className="border rounded px-2 py-1"
//         >
//           <option value="Day">Day</option>
//           <option value="Week">Week</option>
//           <option value="Month">Month</option>
//           <option value="Quarter">Quarter</option>
//         </select>
//       </div>

//       {/* Gantt Chart */}
//       <div
//         ref={ganttRef}
//         className="bg-white shadow-md rounded-xl p-6 relative overflow-hidden"
//       >
//         {tasks.length > 0 ? (
//           <>
//             <Gantt
//               tasks={ganttTasks}
//               viewMode={viewMode}
//               locale="en-GB"
//               listCellWidth={listCellWidth}
//               columnWidth={60}
//               rowHeight={25}
              
//               onBarEvent={({ task, type }) => {
//                 if (type === "mouseenter") setHoveredTaskId(task.id);
//                 else if (type === "mouseleave") setHoveredTaskId(null);
//               }}
//             />

//             {chartWidth > 0 && tasksContainer
//               ? createPortal(renderCars(), tasksContainer)
//               : null}
//           </>
//         ) : (
//           <p className="text-gray-500 italic">No tasks to show in Gantt chart.</p>
//         )}
//       </div>
//     </div>
//   );
// }





// // "use client";

// // import { useEffect, useState } from "react";
// // import { useParams } from "next/navigation";
// // import dynamic from "next/dynamic";
// // import api from "@/lib/api"; // axios wrapper
// // import "gantt-task-react/dist/index.css";

// // // Load Gantt dynamically (no SSR)
// // const Gantt = dynamic(() => import("gantt-task-react").then((m) => m.Gantt), {
// //   ssr: false,
// //   loading: () => <p>Loading Gantt chart...</p>,
// // });

// // export default function ProjectDetailsPage() {
// //   const { id } = useParams();
// //   const [project, setProject] = useState(null);
// //   const [tasks, setTasks] = useState([]);
// //   const [viewMode, setViewMode] = useState("Week"); // Default view mode

// //   const colors = [
// //     { bar: "#4CAF50", progress: "#2E7D32" }, // green
// //     { bar: "#2196F3", progress: "#1565C0" }, // blue
// //     { bar: "#FF9800", progress: "#EF6C00" }, // orange
// //     { bar: "#9C27B0", progress: "#6A1B9A" }, // purple
// //     { bar: "#F44336", progress: "#C62828" }, // red
// //   ];

// //   useEffect(() => {
// //     if (!id) return;

// //     const fetchData = async () => {
// //       try {
// //         const token = localStorage.getItem("token");
// //         const headers = { Authorization: `Bearer ${token}` };

// //         const res = await api.get(`/project/projects/${id}`, { headers });
// //         setProject(res.data);

// //         if (res.data.tasks) {
// //           const formatted = res.data.tasks.map((t, i) => {
// //             const color = colors[i % colors.length]; // cycle colors
// //             return {
// //               id: t._id,
// //               name: t.title,
// //               start: t.startDate ? new Date(t.startDate) : new Date(),
// //               end: t.dueDate ? new Date(t.dueDate) : new Date(),
// //               type: "task",
// //               progress: t.progress ?? 0,
// //               isDisabled: false,
// //               dependencies: t.dependencies || [],
// //               styles: {
// //                 progressColor: color.progress,
// //                 progressSelectedColor: "#000",
// //                 backgroundColor: color.bar,
// //                 backgroundSelectedColor: "#333",
// //               },
// //             };
// //           });
// //           setTasks(formatted);
// //         }
// //       } catch (err) {
// //         console.error("Error fetching project:", err);
// //       }
// //     };

// //     fetchData();
// //   }, [id]);

// //   if (!project) {
// //     return (
// //       <div className="flex items-center justify-center h-screen">
// //         <p className="text-lg text-gray-600 animate-pulse">Loading project...</p>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="p-6 space-y-8">
// //       {/* Project Header */}
// //       <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-6 rounded-xl shadow-lg">
// //         <h1 className="text-3xl font-bold">{project.name}</h1>
// //         <p className="text-purple-100 mt-2">
// //           {project.description || "No description available"}
// //         </p>
// //       </div>

// //       {/* Task List */}
// //       <div className="bg-white shadow-md rounded-xl p-6">
// //         <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
// //           📋 Project Tasks
// //         </h2>

// //         {project.tasks?.length > 0 ? (
// //           <table className="w-full border-collapse">
// //             <thead>
// //               <tr className="bg-gray-100 text-left">
// //                 <th className="p-3 border">Title</th>
// //                 <th className="p-3 border">Assignees</th>
// //                 <th className="p-3 border">Due</th>
// //                 <th className="p-3 border">Progress</th>
// //               </tr>
// //             </thead>
// //             <tbody>
// //               {project.tasks.map((t, i) => {
// //                 const color = colors[i % colors.length];
// //                 return (
// //                   <tr
// //                     key={t._id}
// //                     className="hover:bg-purple-50 transition-colors"
// //                   >
// //                     <td className="p-3 border font-medium text-gray-700">
// //                       {t.title}
// //                     </td>
// //                     <td className="p-3 border text-gray-600">
// //                       {t.assignees?.map((u) => u.name).join(", ") || "-"}
// //                     </td>
// //                     <td className="p-3 border text-gray-600">
// //                       {t.dueDate
// //                         ? new Date(t.dueDate).toLocaleDateString("en-GB")
// //                         : "-"}
// //                     </td>
// //                     <td className="p-3 border">
// //                       <div
// //                         className="w-full h-2.5 rounded-full"
// //                         style={{ backgroundColor: "#eee" }}
// //                       >
// //                         <div
// //                           className="h-2.5 rounded-full"
// //                           style={{
// //                             width: `${t.progress ?? 0}%`,
// //                             backgroundColor: color.progress,
// //                           }}
// //                         ></div>
// //                       </div>
// //                       <span className="text-sm text-gray-600 ml-1">
// //                         {t.progress ?? 0}%
// //                       </span>
// //                     </td>
// //                   </tr>
// //                 );
// //               })}
// //             </tbody>
// //           </table>
// //         ) : (
// //           <p className="text-gray-500 italic">No tasks for this project.</p>
// //         )}
// //       </div>

// //       {/* Gantt Chart */}
// //       <div className="bg-white shadow-md rounded-xl p-6">
// //         <div className="flex items-center justify-between mb-4">
// //           <h2 className="text-xl font-semibold text-gray-800 border-b pb-2">
// //             📊 Gantt Chart
// //           </h2>
// //           <div className="flex items-center gap-2">
// //             <label htmlFor="viewMode" className="text-gray-700 font-medium">
// //               View Mode:
// //             </label>
// //             <select
// //               id="viewMode"
// //               value={viewMode}
// //               onChange={(e) => setViewMode(e.target.value)}
// //               className="border rounded px-2 py-1"
// //             >
// //               <option value="Day">Day</option>
// //               <option value="Week">Week</option>
// //               <option value="Month">Month</option>
// //               <option value="Quarter">Quarter</option>
// //             </select>
// //           </div>
// //         </div>

// //         {tasks.length > 0 ? (
// //           <div className="overflow-x-auto">
// //             <Gantt
// //               tasks={tasks}
// //               viewMode={viewMode}
// //               onClick={(task) => console.log("Clicked task:", task)}
// //               onDateChange={(task, start, end) =>
// //                 console.log("Date changed:", task, start, end)
// //               }
// //               onProgressChange={(task, progress) =>
// //                 console.log("Progress changed:", task, progress)
// //               }
// //             />
// //           </div>
// //         ) : (
// //           <p className="text-gray-500 italic">No tasks to show in Gantt chart.</p>
// //         )}
// //       </div>
// //     </div>
// //   );
// // }
