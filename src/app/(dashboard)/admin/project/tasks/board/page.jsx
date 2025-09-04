"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

export default function TaskBoard() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);

  // fetch tasks & projects
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tRes, pRes] = await Promise.all([
          api.get("/project/tasks"),
          api.get("/project/projects"),
        ]);
        setTasks(tRes.data);
        setProjects(pRes.data);
        if (pRes.data.length > 0) setSelectedProject(pRes.data[0]._id);
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

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId) return;

    try {
      await api.put(`/task/tasks/${draggableId}`, {
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

  const columns = getColumns();

  const columnStyles = {
    todo: "bg-red-50 border-red-300",
    "in-progress": "bg-yellow-50 border-yellow-300",
    done: "bg-green-50 border-green-300",
  };

  if (loading) return <p className="p-6">Loading...</p>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Task Board</h1>

        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="border p-2 rounded"
        >
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-3 gap-6">
          {Object.entries(columns).map(([status, items]) => (
       <Droppable key={`col-${status}`} droppableId={status}>
  {(provided) => (
    <div
      {...provided.droppableProps}
      ref={provided.innerRef}
      className={`rounded-lg p-4 min-h-[500px] border ${columnStyles[status]}`}
    >
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
              className="bg-white shadow rounded-lg p-3 mb-3 border hover:shadow-md transition"
            >
              <p className="font-medium">{task.title}</p>
              <p className="text-sm text-gray-500">
                {task.assignedTo?.name || "Unassigned"}
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
    </div>
  );
}


