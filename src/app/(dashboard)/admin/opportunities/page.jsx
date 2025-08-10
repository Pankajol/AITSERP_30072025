"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const LeadsListPage = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await axios.get("/api/lead");
        setLeads(response.data);
      } catch (err) {
        setError("Failed to load leads.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, []);

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (error) return <p className="text-center py-10 text-red-600">{error}</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-md mt-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-orange-600">All Leads</h1>
        <Link href="/admin/LeadDetailsFormMaster">
          <span className="px-4 py-2 bg-orange-500 text-white rounded-md">Add New Lead</span>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Mobile No</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead._id} className="border-t border-gray-200">
                <td className="px-4 py-2">
                  {lead.firstName} {lead.lastName}
                </td>
                <td className="px-4 py-2">{lead.email || "-"}</td>
                <td className="px-4 py-2">{lead.mobileNo || "-"}</td>
                <td className="px-4 py-2">{lead.status || "-"}</td>
                <td className="px-4 py-2">
                  <Link href={`/leads/${lead._id}`}>
                    <sapn className="text-blue-600 hover:underline mr-2">View</sapn>
                  </Link>
                  <Link href={`/leads/edit/${lead._id}`}>
                    <span className="text-green-600 hover:underline">Edit</span>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeadsListPage;

