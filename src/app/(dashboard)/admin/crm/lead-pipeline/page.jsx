"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import axios from "axios";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { FaUser, FaPhone, FaEnvelope, FaCalendarAlt } from "react-icons/fa";

export default function LeadPipelineBoard() {
  const [stages, setStages] = useState([]);
  const [leadsByStage, setLeadsByStage] = useState({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPipeline = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/crm/lead-pipeline", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setStages(res.data.stages);
        setLeadsByStage(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load pipeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const handleDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const sourceStage = source.droppableId;
    const destStage = destination.droppableId;
    const leadId = draggableId;

    // Optimistic UI update
    const sourceLeads = [...leadsByStage[sourceStage]];
    const [movedLead] = sourceLeads.splice(source.index, 1);
    const destLeads = [...leadsByStage[destStage]];
    destLeads.splice(destination.index, 0, movedLead);

    setLeadsByStage({
      ...leadsByStage,
      [sourceStage]: sourceLeads,
      [destStage]: destLeads,
    });

    // API call to update stage
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        "/api/crm/lead-pipeline",
        { leadId, newStage: destStage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Lead moved to ${destStage}`);
    } catch (error) {
      toast.error("Failed to update stage");
      fetchPipeline(); // revert on error
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Lead Pipeline</h1>
        <p className="text-sm text-gray-500">Drag and drop leads between stages</p>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <div key={stage} className="w-80 flex-shrink-0">
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex justify-between items-center mb-3 px-2">
                  <h2 className="font-semibold text-gray-700">{stage}</h2>
                  <span className="bg-white px-2 py-1 rounded-full text-xs font-medium text-gray-600">
                    {leadsByStage[stage]?.length || 0}
                  </span>
                </div>
                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[400px] transition-colors rounded-lg ${
                        snapshot.isDraggingOver ? "bg-indigo-50" : "bg-gray-50"
                      }`}
                    >
                      {leadsByStage[stage]?.map((lead, index) => (
                        <Draggable key={lead._id} draggableId={lead._id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`bg-white rounded-lg shadow-sm mb-2 p-3 cursor-grab active:cursor-grabbing ${
                                snapshot.isDragging ? "shadow-lg rotate-1" : ""
                              }`}
                              onClick={() => router.push(`/admin/leads-view/${lead._id}`)}
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-medium text-gray-900">
                                    {lead.firstName} {lead.lastName}
                                  </h3>
                                  {lead.organizationName && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {lead.organizationName}
                                    </p>
                                  )}
                                </div>
                                <LeadScoreBadge score={lead.leadScore} />
                              </div>

                              <div className="mt-2 space-y-1 text-xs text-gray-500">
                                {lead.email && (
                                  <div className="flex items-center gap-1">
                                    <FaEnvelope className="w-3 h-3" />
                                    <span className="truncate">{lead.email}</span>
                                  </div>
                                )}
                                {lead.mobileNo && (
                                  <div className="flex items-center gap-1">
                                    <FaPhone className="w-3 h-3" />
                                    <span>{lead.mobileNo}</span>
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 flex justify-between items-center">
                                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">
                                  Source: {lead.source || "Unknown"}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                  <FaCalendarAlt className="inline mr-1" />
                                  {new Date(lead.createdAt).toLocaleDateString()}
                                </span>
                              </div>
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
    </div>
  );
}

// Optional: Lead score badge component
function LeadScoreBadge({ score }) {
  if (!score) return null;
  let color = "bg-gray-100 text-gray-600";
  if (score >= 70) color = "bg-green-100 text-green-700";
  else if (score >= 40) color = "bg-yellow-100 text-yellow-700";
  else color = "bg-red-100 text-red-700";
  return (
    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>
      {score}
    </span>
  );
}