"use client";

import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import { toast } from "react-toastify";

const stages = ["todo", "in-progress", "done"];

export default function TaskKanban({ tasks, onTaskMove }) {
  const tasksByStatus = stages.reduce((acc, stage) => {
    acc[stage] = tasks.filter((t) => t.status === stage);
    return acc;
  }, {});

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination || source.droppableId === destination.droppableId) return;

    const newStatus = destination.droppableId;
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `/api/tasks/${draggableId}`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Task status updated");
      onTaskMove();
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <div key={stage} className="w-80 flex-shrink-0">
            <div className="bg-gray-100 rounded-lg p-3">
              <h3 className="font-semibold capitalize mb-3">{stage}</h3>
              <Droppable droppableId={stage} isDropDisabled={false}>  {/* ✅ boolean explicitly */}
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-[300px] transition-colors rounded ${
                      snapshot.isDraggingOver ? "bg-indigo-50" : "bg-gray-50"
                    }`}
                  >
                    {tasksByStatus[stage].map((task, idx) => (
                      <Draggable key={task._id} draggableId={task._id} index={idx} isDragDisabled={false}>  {/* ✅ boolean */}
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`bg-white p-3 rounded shadow-sm mb-2 ${
                              snapshot.isDragging ? "shadow-lg" : ""
                            }`}
                          >
                            <p className="font-medium text-sm">{task.title}</p>
                            {task.dueDate && (
                              <p className="text-xs text-gray-400 mt-1">
                                Due: {new Date(task.dueDate).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}