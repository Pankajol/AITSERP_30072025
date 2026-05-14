"use client";
import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

export default function EmailModal({ isOpen, onClose, invoice, type = "invoice" }) {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(`Invoice ${invoice?.invoiceNumber || ""}`);
  const [message, setMessage] = useState(`Dear Customer,\n\nPlease find attached your invoice ${invoice?.invoiceNumber || ""}.\n\nThank you for your business.`);
  const [sending, setSending] = useState(false);

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email) { toast.error("Please enter recipient email"); return; }
    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("/api/email", {
        type: "sales-invoice",
        id: invoice._id,
        to: email,
        subject,
        message,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data.success) {
        toast.success("Email sent successfully!");
        onClose();
      } else {
        toast.error(res.data.message || "Failed to send email");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Error sending email");
    } finally { setSending(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Send Invoice by Email</h2>
        <div className="space-y-4">
          <div><label className="block text-sm font-medium text-gray-700 mb-1">To *</label><input type="email" className="w-full px-3 py-2 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} placeholder="customer@example.com" /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Subject</label><input type="text" className="w-full px-3 py-2 border rounded-lg" value={subject} onChange={e => setSubject(e.target.value)} /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Message</label><textarea rows={4} className="w-full px-3 py-2 border rounded-lg" value={message} onChange={e => setMessage(e.target.value)} /></div>
          <div className="flex gap-3 pt-2"><button onClick={onClose} className="flex-1 py-2 border rounded-lg">Cancel</button><button onClick={handleSend} disabled={sending} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:bg-gray-400">{sending ? "Sending..." : "Send Email"}</button></div>
        </div>
      </div>
    </div>
  );
}