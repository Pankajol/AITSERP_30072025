"use client";

import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaEnvelope, FaWhatsapp, FaSpinner } from "react-icons/fa";

export default function QuotationShareButtons({ quotationId, customerEmail, customerName, customerPhone }) {
  const [loading, setLoading] = useState(false);
  const handleEmailShare = async () => {
    if (!customerEmail) {
      toast.error("Customer email not available");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/quotation/send-email", {
        quotationId,
        email: customerEmail,
        customerName,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Quotation sent via email!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send email");
    } finally {
      setLoading(false);
    }
  };
  const handleWhatsAppShare = () => {
    if (!customerPhone) {
      toast.error("Customer phone number not available");
      return;
    }
    const message = encodeURIComponent(
      `*Quotation ${quotationId}*\n\nTotal: ₹??? (You can customise)\n\nView: ${window.location.origin}/api/quotation/${quotationId}/pdf\n\nThank you.`
    );
    window.open(`https://wa.me/${customerPhone}?text=${message}`, "_blank");
  };
  return (
    <div className="flex gap-3 mt-4">
      <button
        onClick={handleEmailShare}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? <FaSpinner className="animate-spin" /> : <FaEnvelope />}
        Email Quotation
      </button>
      <button
        onClick={handleWhatsAppShare}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
      >
        <FaWhatsapp /> WhatsApp
      </button>
    </div>
  );
}