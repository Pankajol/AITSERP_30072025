"use client";
import React from "react";
import TaskProgressChart from "@/components/TaskProgressChart";
import ProjectProgressChart from "@/components/ProjectProgressChart";
import TaskTimelineChart from "@/components/TaskTimelineChart";
import ProjectTimelineChart from "@/components/ProjectTimelineChart";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">Task Progress</h2>
          <TaskProgressChart />
        </div>

        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">Project Progress</h2>
          <ProjectProgressChart />
        </div>

        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">Task Timeline</h2>
          <TaskTimelineChart />
        </div>

        <div className="p-4 bg-white rounded-2xl shadow">
          <h2 className="text-lg font-semibold mb-2">Project Timeline</h2>
          <ProjectTimelineChart />
        </div>
      </div>
    </div>
  );
}
