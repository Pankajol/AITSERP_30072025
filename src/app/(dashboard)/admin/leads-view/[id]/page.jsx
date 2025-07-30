"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";

const ViewLeadPage = () => {
  const { id } = useParams();
  const router = useRouter();
  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await axios.get(`/api/lead/${id}`);
        setLead(response.data);
      } catch (err) {
        setError("Failed to load lead details.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchLead();
  }, [id]);

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (error) return <p className="text-center py-10 text-red-600">{error}</p>;
  if (!lead) return <p className="text-center py-10">No lead found.</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow-md rounded-md mt-6">
      <h1 className="text-2xl font-bold mb-4 text-orange-600">Lead Details</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(lead).map(([key, value]) => (
          <div key={key}>
            <p className="text-sm text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
            <p className="text-base font-medium">{value || "-"}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <button
          onClick={() => router.push(`/leads/edit/${id}`)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Edit
        </button>
        <button
          onClick={() => router.push("/leads")}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md"
        >
          Back
        </button>
      </div>
    </div>
  );
};

export default ViewLeadPage;
