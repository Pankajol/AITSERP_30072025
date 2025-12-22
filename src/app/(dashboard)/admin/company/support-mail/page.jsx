"use client";
import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";

export default function SupportMailboxManager() {
  const [supportEmails, setSupportEmails] = useState([]);
  const [newEmail, setNewEmail] = useState("");

  // Load existing emails
  useEffect(() => {
    fetchEmails();
  }, []);

  async function fetchEmails() {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Authentication token not found. Please log in.");
            return;
        }
      const res = await axios.get("/api/company/support-emails",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setSupportEmails(res.data.supportEmails || []);
    } catch (err) {
      console.log(err);
      toast.error("Failed to load support emails");
    }
  }

  async function addEmail() {
    if (!newEmail) return;
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Authentication token not found. Please log in.");
            return;
        }
      const res = await axios.post("/api/company/support-emails", {
        email: newEmail,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        console.log(res.data);
      setSupportEmails(res.data.supportEmails);
      setNewEmail("");
      toast.success("Support email added");
    } catch (err) {
      toast.error(err.response?.data?.error || "Add failed");
    }
  }

  async function removeEmail(email) {
    try {
        const token = localStorage.getItem("token");
        if (!token) {
            toast.error("Authentication token not found. Please log in.");
            return;
        }
      const res = await axios.delete("/api/company/support-emails", {
        data: { email }
        ,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setSupportEmails(res.data.supportEmails);
      toast.warn("Support email removed");
    } catch (err) {
      toast.error("Remove failed");
    }
  }

  return (
    <div className="p-6 max-w-xl bg-white shadow rounded">
      <h2 className="text-xl font-semibold mb-4">📨 Support Mailboxes</h2>

      <div className="flex gap-2 mb-4">
        <input
          type="email"
          className="flex-1 border p-2 rounded"
          placeholder="support@example.com"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
        />
        <button
          onClick={addEmail}
          className="bg-blue-600 text-white px-4 rounded"
        >
          Add
        </button>
      </div>

      {supportEmails.length === 0 ? (
        <p className="text-gray-500">No support emails added yet</p>
      ) : (
        <ul className="space-y-2">
          {supportEmails.map((email, idx) => (
            <li
              key={idx}
              className="flex justify-between items-center border p-2 rounded"
            >
              <span>{email}</span>
              <button
                onClick={() => removeEmail(email)}
                className="text-red-600 font-bold"
              >
                ❌
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
