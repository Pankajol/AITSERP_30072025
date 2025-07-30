// app/opportunities/page.js
"use client";
import { useEffect, useState } from "react";

const ViewOpportunitiesPage = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOpportunities = async () => {
    try {
      const res = await fetch("/api/opportunity", { method: "GET" });
      const data = await res.json();
      if (data.success) {
        setOpportunities(data.data);
      } else {
        alert("Failed to load opportunities");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">All Opportunities</h1>
      {loading ? (
        <p>Loading...</p>
      ) : opportunities.length === 0 ? (
        <p>No opportunities found.</p>
      ) : (
        <div className="overflow-auto">
          <table className="min-w-full border border-gray-300 rounded">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border">Opportunity From</th>
                <th className="px-4 py-2 border">Type</th>
                <th className="px-4 py-2 border">Sales Stage</th>
                <th className="px-4 py-2 border">Amount</th>
                <th className="px-4 py-2 border">Expected Closing</th>
                <th className="px-4 py-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp) => (
                <tr key={opp._id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 border">{opp.opportunityFrom}</td>
                  <td className="px-4 py-2 border">{opp.opportunityType}</td>
                  <td className="px-4 py-2 border">{opp.salesStage}</td>
                  <td className="px-4 py-2 border">₹{opp.opportunityAmount}</td>
                  <td className="px-4 py-2 border">
                    {new Date(opp.expectedClosingDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 border">{opp.status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewOpportunitiesPage;
