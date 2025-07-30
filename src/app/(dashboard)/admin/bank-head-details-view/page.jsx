"use client";
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const BankHeadView = () => {
  const [bankHeads, setBankHeads] = useState([]);

  const fetchBankHeads = async () => {
    try {
      const response = await fetch("/api/bank-head");
      const result = await response.json();
      if (result.success) {
        setBankHeads(result.data);
      } else {
        toast.error(result.message || "Error fetching bank head details");
      }
    } catch (error) {
      console.error("Error fetching bank head details:", error);
      toast.error("Error fetching bank head details");
    }
  };

  useEffect(() => {
    fetchBankHeads();
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-4">Bank Head Details</h2>
      {bankHeads.length === 0 ? (
        <p className="text-gray-500">No bank head details available.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-gray-300 px-4 py-2">Account Code</th>
              <th className="border border-gray-300 px-4 py-2">Account Name</th>
              <th className="border border-gray-300 px-4 py-2">Account Head</th>
              <th className="border border-gray-300 px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {bankHeads.map((head) => (
              <tr key={head._id}>
                <td className="border border-gray-300 px-4 py-2">{head.accountCode}</td>
                <td className="border border-gray-300 px-4 py-2">{head.accountName}</td>
                <td className="border border-gray-300 px-4 py-2">{head.accountHead}</td>
                <td className="border border-gray-300 px-4 py-2">{head.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default BankHeadView;
