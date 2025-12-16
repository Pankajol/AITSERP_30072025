"use client";

import { Clock, Tag, AlertCircle } from "lucide-react";

export default function TicketCard({ ticket }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "Open":
        return "bg-orange-500";
      case "Closed":
        return "bg-green-600";
      default:
        return "bg-gray-600";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High":
        return "text-red-600";
      case "Medium":
        return "text-orange-500";
      case "Low":
        return "text-green-600";
      default:
        return "text-blue-600";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow hover:shadow-xl transition p-5">

      <div className="flex justify-between gap-6">

        {/* LEFT */}
        <div className="space-y-2">
          <h1 className="text-lg font-semibold">{ticket.customerEmail}</h1>
          <h2 className="text-lg font-bold text-gray-800">
            {ticket.subject}
          </h2>

          <p className="text-sm text-gray-500 flex items-center gap-2">
            <Tag size={14} />
            {ticket.category}
          </p>

          <p
            className={`text-sm font-medium flex items-center gap-2 ${getPriorityColor(
              ticket.priority
            )}`}
          >
            <AlertCircle size={14} />
            Priority: {ticket.priority || "Normal"}
          </p>
        </div>

        {/* RIGHT */}
        <div className="text-right space-y-2">

          <p className="text-sm text-gray-500 flex items-center gap-1 justify-end">
            <Clock size={14} />
            {new Date(ticket.updatedAt).toLocaleString()}
          </p>

          <span
            className={`inline-block ${getStatusColor(
              ticket.status
            )} text-white text-xs px-3 py-1 rounded-full`}
          >
            {ticket.status}
          </span>

        </div>

      </div>

    </div>
  );
}
