"use client";
import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const AccountHeadView = () => {
  const [accountHeads, setAccountHeads] = useState([]);

  useEffect(() => {
    const fetchAccountHeads = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/account-head",
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          throw new Error("Failed to fetch account heads");
        }
        const result = await response.json();
        if (result.success) {
          setAccountHeads(result.data);
        } else {
          toast.error(result.message || "Error fetching account heads");
        }
      } catch (error) {
        console.error("Error fetching account heads:", error);
        toast.error("Error fetching account heads");
      }
    };

    fetchAccountHeads();
  }, []);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
      <ToastContainer />
      <h2 className="text-2xl font-semibold mb-4">Account Head Details</h2>
      {accountHeads.length === 0 ? (
        <p className="text-gray-500">No account head details available.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 px-4 py-2">Account Head Code</th>
              <th className="border border-gray-300 px-4 py-2">Description</th>
              <th className="border border-gray-300 px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {accountHeads.map((head) => (
              <tr key={head._id}>
                <td className="border border-gray-300 px-4 py-2">{head.accountHeadCode}</td>
                <td className="border border-gray-300 px-4 py-2">{head.accountHeadDescription}</td>
                <td className="border border-gray-300 px-4 py-2">{head.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AccountHeadView;
