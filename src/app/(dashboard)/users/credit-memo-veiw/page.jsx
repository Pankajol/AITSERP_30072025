'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaSearch,
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import ActionMenu from '@/components/ActionMenu';

/* ==================== Permission Helper ==================== */
const hasPermission = (user, moduleName, permissionType) => {
  return (
    user?.modules?.[moduleName]?.selected &&
    user.modules[moduleName]?.permissions?.[permissionType] === true
  );
};

/* ============================================================= */
/*  Credit Note List                                             */
/* ============================================================= */
export default function CreditNoteList() {
  const [notes, setNotes] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const router = useRouter();

  /* ---------- Load user ---------- */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  /* ---------- fetch data ---------- */
  const fetchNotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return console.error('Unauthorized: No token found');

      const res = await axios.get('/api/credit-note', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success && Array.isArray(res.data.data)) setNotes(res.data.data);
      else setNotes([]);
    } catch (err) {
      console.error('Error fetching credit notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  /* ---------- filtered list ---------- */
  const displayNotes = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter((n) => (n.customerName || '').toLowerCase().includes(q));
  }, [notes, search]);

  /* ---------- actions ---------- */
  const handleDelete = async (id) => {
    if (!confirm('Delete this credit note?')) return;
    try {
      await axios.delete(`/api/credit-note/${id}`);
      setNotes((prev) => prev.filter((n) => n._id !== id));
      toast.success('Credit note deleted successfully.');
    } catch {
      toast.error('Failed to delete credit note.');
    }
  };

  /* ============================================================= */
  /*  UI                                                           */
  /* ============================================================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Credit Notes
      </h1>

      {/* toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="relative max-w-sm flex-1">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {hasPermission(user, 'Credit Note', 'create') && (
          <Link href="/users/credit-memo-veiw/new">
            <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit className="mr-2" /> New Credit Note
            </button>
          </Link>
        )}
      </div>

      {/* table / cards */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
              <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
                <tr>
                  {['#', 'Documents No.', 'Customer', 'Contact', 'Reference', 'Actions'].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayNotes.map((n, i) => (
                  <tr
                    key={n._id}
                    className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-4 py-3">{i + 1}</td>
                    <td className="px-4 py-3">{n.documentNumberCreditNote}</td>
                    <td className="px-4 py-3">{n.customerName}</td>
                    <td className="px-4 py-3">{n.contactPerson}</td>
                    <td className="px-4 py-3">{n.refNumber}</td>
                    <td className="px-4 py-3">
                      {user && <RowMenu note={n} onDelete={handleDelete} user={user} />}
                    </td>
                  </tr>
                ))}
                {!displayNotes.length && (
                  <tr>
                    <td colSpan={6} className="text-center py-5 text-gray-500 dark:text-gray-400">
                      No credit notes found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* mobile cards */}
          <div className="md:hidden space-y-4">
            {displayNotes.map((n, i) => (
              <div
                key={n._id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700"
              >
                <div className="flex justify-between">
                  <div className="font-semibold text-gray-700 dark:text-gray-100">
                    #{i + 1} • {n.documentNumberCreditNote}
                  </div>
                  {user && <RowMenu note={n} onDelete={handleDelete} user={user} isMobile />}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">
                  Customer: {n.customerName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  Contact: {n.contactPerson}
                </p>
              </div>
            ))}
            {!displayNotes.length && (
              <p className="text-center text-gray-500 dark:text-gray-400">No credit notes found.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================= */
/*  Row Action Menu                                              */
/* ============================================================= */
function RowMenu({ note, onDelete, user }) {
  const actions = [
    { icon: <FaEye />, label: 'View', onClick: () => window.location.href = `/users/credit-memo-veiw/${note._id}` },
    hasPermission(user, 'Credit Note', 'edit') && { icon: <FaEdit />, label: 'Edit', onClick: () => window.location.href = `/users/credit-memo-veiw/new?editId=${note._id}` },
    hasPermission(user, 'Credit Note', 'email') && { icon: <FaEnvelope />, label: 'Email', onClick: () => window.location.href = `/users/credit-note/${note._id}/send-email` },
    hasPermission(user, 'Credit Note', 'whatsapp') && { icon: <FaWhatsapp />, label: 'WhatsApp', onClick: () => window.location.href = `/users/credit-note/${note._id}/send-whatsapp` },
    hasPermission(user, 'Credit Note', 'delete') && { icon: <FaTrash />, label: 'Delete', color: 'text-red-600', onClick: () => onDelete(note._id) },
  ].filter(Boolean);

  if (!actions.length) return null;
  return <ActionMenu actions={actions} />;
}
