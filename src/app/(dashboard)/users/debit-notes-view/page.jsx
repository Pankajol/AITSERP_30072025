"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import axios from "axios";
import { useRouter } from "next/navigation";
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
} from "react-icons/fa";
import ActionMenu from "@/components/ActionMenu";

/* ================= Permission Check ================= */
const hasPermission = (user, moduleName, permissionType) => {
  return (
    user?.modules?.[moduleName]?.selected &&
    user.modules[moduleName]?.permissions?.[permissionType] === true
  );
};

export default function DebitNoteList() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/debit-note", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotes(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching Debit Notes:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this Debit Note?")) return;
    try {
      const res = await axios.delete(`/api/debit-note/${id}`);
      if (res.data.success) {
        setNotes((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (error) {
      alert("Failed to delete Debit Note");
    }
  };

  const filteredNotes = useMemo(() => {
    if (!search.trim()) return notes;
    return notes.filter((n) =>
      (n.supplierName || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [search, notes]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-center">Debit Notes</h1>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div className="relative max-w-sm w-full">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by supplier name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {user && hasPermission(user, "Debit Note", "create") && (
          <Link href="/users/debit-notes-view/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit className="mr-2" /> Create New Debit Note
            </button>
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Loading…</p>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100">
                <tr>
                  {["#", "Doc No.", "Supplier", "Ref No.", "Status", "Total", "Created", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map((note, idx) => (
                  <tr key={note._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3">{note.documentNumberDebitNote}</td>
                    <td className="px-4 py-3">{note.supplierName}</td>
                    <td className="px-4 py-3">{note.refNumber}</td>
                    <td className="px-4 py-3">{note.status}</td>
                    <td className="px-4 py-3">₹ {parseFloat(note.grandTotal).toFixed(2)}</td>
                    <td className="px-4 py-3">{new Date(note.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <RowMenu note={note} onDelete={handleDelete} user={user} />
                    </td>
                  </tr>
                ))}
                {!filteredNotes.length && (
                  <tr>
                    <td colSpan={8} className="text-center py-4 text-gray-500">
                      No Debit Notes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-4">
            {filteredNotes.map((note, idx) => (
              <div key={note._id} className="bg-white p-4 rounded-lg shadow border">
                <div className="flex justify-between mb-2">
                  <div className="font-semibold">#{idx + 1} - {note.documentNumberDebitNote}</div>
                  <RowMenu note={note} onDelete={handleDelete} user={user} isMobile />
                </div>
                <div><strong>Supplier:</strong> {note.supplierName}</div>
                <div><strong>Doc No:</strong> {note.documentNumber}</div>
                <div><strong>Ref:</strong> {note.refNumber}</div>
                <div><strong>Status:</strong> {note.status}</div>
                <div><strong>Total:</strong> ₹ {parseFloat(note.grandTotal).toFixed(2)}</div>
                <div><strong>Date:</strong> {new Date(note.createdAt).toLocaleDateString()}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function RowMenu({ note, onDelete, user }) {
  const actions = [
    hasPermission(user, "Debit Note", "view") && {
      icon: <FaEye />, label: "View", onClick: () => (window.location.href = `/users/debit-notes-view/${note._id}`)
    },
    hasPermission(user, "Debit Note", "edit") && {
      icon: <FaEdit />, label: "Edit", onClick: () => (window.location.href = `/users/debit-notes-view/${note._id}/edit`)
    },
    hasPermission(user, "Debit Note", "email") && {
      icon: <FaEnvelope />, label: "Email", onClick: () => (window.location.href = `/users/debit-note/${note._id}/send-email`)
    },
    hasPermission(user, "Debit Note", "whatsapp") && {
      icon: <FaWhatsapp />, label: "WhatsApp", onClick: () => (window.location.href = `/users/debit-note/${note._id}/send-whatsapp`)
    },
    hasPermission(user, "Debit Note", "delete") && {
      icon: <FaTrash />, label: "Delete", onClick: () => onDelete(note._id), color: "text-red-600"
    }
  ].filter(Boolean);

  return <ActionMenu actions={actions} />;
}


