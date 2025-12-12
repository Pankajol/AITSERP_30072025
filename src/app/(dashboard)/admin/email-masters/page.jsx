"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api"; // your axios instance
import { toast } from "react-toastify";
import EmailForm from "@/components/email-master/EmailForm";
import EmailList from "@/components/email-master/EmailList";

/**
 * Page wrapper — uses EmailList component below.
 * (Kept simple: EmailList handles fetching; page shows header + Add button)
 */
export default function EmailMasterPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const openAdd = () => {
    setEditItem(null);
    setShowAddModal(true);
  };
  const openEdit = (item) => {
    setEditItem(item);
    setShowAddModal(true);
  };
  const closeModal = () => {
    setEditItem(null);
    setShowAddModal(false);
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Email & App Password Master</h1>
        <div className="flex gap-3 items-center">
          <button onClick={openAdd} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
            <Plus size={16} /> Add Email
          </button>
        </div>
      </div>

      <EmailList onEdit={openEdit} />

      {/* Modal: uses EmailForm for create/update */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{editItem ? "Edit Email" : "Add Email"}</h2>
              <button onClick={closeModal} className="text-gray-600">✕</button>
            </div>

            <EmailForm
              initial={editItem || {}}
              onSaved={() => {
                // notify list to refresh via custom event
                window.dispatchEvent(new Event("emails:refresh"));
                toast.success("Saved");
                closeModal();
              }}
              onCancel={closeModal}
            />
          </div>
        </div>
      )}
    </div>
  );
}
