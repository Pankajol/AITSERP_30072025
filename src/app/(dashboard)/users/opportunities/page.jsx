"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import axios from "axios";

const OpportunityListPage = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchOpportunities = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`/api/opportunity?page=${page}&limit=10`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });

        if (response.data.success) {
          setOpportunities(response.data.data);
          setTotalPages(response.data.pagination.totalPages);
        } else {
          setError("Failed to load opportunities.");
        }
      } catch (err) {
        setError("Failed to load opportunities.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunities();
  }, [page]);

  if (loading) return <p className="text-center py-10">Loading...</p>;
  if (error) return <p className="text-center py-10 text-red-600">{error}</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow-md rounded-md mt-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-orange-600">All Opportunities</h1>
        <Link href="/admin/OpportunityDetailsForm">
          <span className="px-4 py-2 bg-orange-500 text-white rounded-md cursor-pointer">
            Add New Opportunity
          </span>
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <p className="text-center py-6 text-gray-500">No opportunities found.</p>
      ) : (
        <>
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
                {opportunities.map((opp) => (
                  <tr key={opp._id} className="border-t border-gray-200">
                    <td className="px-4 py-2">
                      {opp.firstName} {opp.lastName}
                    </td>
                    <td className="px-4 py-2">{opp.email || "-"}</td>
                    <td className="px-4 py-2">{opp.mobileNo || "-"}</td>
                    <td className="px-4 py-2">{opp.status || "-"}</td>
                    <td className="px-4 py-2">
                      <Link href={`/opportunity/${opp._id}`}>
                        <span className="text-blue-600 hover:underline mr-2 cursor-pointer">
                          View
                        </span>
                      </Link>
                      <Link href={`/opportunity/edit/${opp._id}`}>
                        <span className="text-green-600 hover:underline cursor-pointer">
                          Edit
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex justify-center mt-6 space-x-4">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={`px-4 py-2 rounded-md ${
                page === 1 ? "bg-gray-300 text-gray-600" : "bg-blue-600 text-white"
              }`}
            >
              Previous
            </button>
            <span className="px-4 py-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className={`px-4 py-2 rounded-md ${
                page === totalPages ? "bg-gray-300 text-gray-600" : "bg-blue-600 text-white"
              }`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default OpportunityListPage;

