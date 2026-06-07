"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { FaTasks, FaCalendarAlt, FaInfoCircle } from "react-icons/fa";
import LeadTasks from "@/components/crm/LeadTasks";
import ActivityTimeline from "@/components/crm/ActivityTimeline";

const ViewLeadPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("details");
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("User not authenticated.");
          setLoading(false);
          return;
        }

        const response = await axios.get(`/api/crm/lead/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLead(response.data);
      } catch (err) {
        console.error("Error fetching lead:", err);
        setError(err.response?.data?.message || "Failed to load lead details.");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLead();
  }, [id]);

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (error) return <p className="text-center py-10 text-red-600">{error}</p>;
  if (!lead) return <p className="text-center py-10">No lead found.</p>;

  const leadFullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();

  return (
    <div className="max-w-5xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header with lead name */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Lead Details: {leadFullName}
        </h1>
        <p className="text-sm text-gray-500">ID: {id}</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-t-xl shadow-sm border-b border-gray-200">
        <div className="flex gap-1 px-4">
          <button
            onClick={() => setActiveTab("details")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
              activeTab === "details"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaInfoCircle size={14} />
            Lead Info
          </button>
          <button
            onClick={() => setActiveTab("tasks")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
              activeTab === "tasks"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaTasks size={14} />
            Tasks {taskCount > 0 && `(${taskCount})`}
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`flex items-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
              activeTab === "timeline"
                ? "text-indigo-600 border-b-2 border-indigo-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FaCalendarAlt size={14} />
            Activity Timeline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-b-xl shadow-sm p-6">
        {activeTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">First Name</p>
              <p className="text-base font-medium">{lead.firstName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Name</p>
              <p className="text-base font-medium">{lead.lastName || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-base font-medium">{lead.email || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mobile No</p>
              <p className="text-base font-medium">{lead.mobileNo || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="text-base font-medium">
                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                  lead.status === "Qualified" ? "bg-green-100 text-green-700" :
                  lead.status === "Contacted" ? "bg-blue-100 text-blue-700" :
                  lead.status === "Converted" ? "bg-purple-100 text-purple-700" :
                  "bg-gray-100 text-gray-600"
                }`}>
                  {lead.status || "New"}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lead Owner</p>
              <p className="text-base font-medium">{lead.leadOwner || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Lead Source</p>
              <p className="text-base font-medium">{lead.source || "-"}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Organization</p>
              <p className="text-base font-medium">{lead.organizationName || "-"}</p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm text-gray-500">Description</p>
              <p className="text-base font-medium">{lead.description || "-"}</p>
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <LeadTasks
            leadId={id}
            leadName={leadFullName}
            onTaskUpdate={(count) => setTaskCount(count)}
          />
        )}

        {activeTab === "timeline" && (
          <ActivityTimeline
            entityType="Lead"
            entityId={id}
            entityName={leadFullName}
          />
        )}
      </div>

      {/* Back Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
        >
          ← Back
        </button>
      </div>
    </div>
  );
};

export default ViewLeadPage;