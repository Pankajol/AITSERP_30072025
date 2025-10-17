'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import {
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaCopy,
  FaEye,
  FaEnvelope,
  FaWhatsapp,
  FaPrint,
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

/* ================================================================= */
/*  Sales Invoice List                                               */
/* ================================================================= */
export default function SalesInvoiceList() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);
  const router = useRouter();

  /* ---------- Load user ---------- */
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);

  /* ---------- fetch invoices ---------- */
  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('/api/sales-invoice', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setInvoices(res.data.data);
      } else if (Array.isArray(res.data)) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error('Error fetching invoices:', err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  /* ---------- filtered list ---------- */
  const displayInvoices = useMemo(() => {
    if (!search.trim()) return invoices;
    const q = search.toLowerCase();
    return invoices.filter((inv) => (inv.customerName || '').toLowerCase().includes(q));
  }, [invoices, search]);

  /* ---------- actions ---------- */
  const handleDelete = async (id) => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await axios.delete(`/api/sales-invoice/${id}`);
      setInvoices((prev) => prev.filter((inv) => inv._id !== id));
      toast.success('Invoice deleted successfully.');
    } catch {
      toast.error('Failed to delete invoice.');
    }
  };

  const handleCopyTo = (invoice, dest) => {
    if (dest === 'Credit') {
      sessionStorage.setItem('CreditData', JSON.stringify(invoice));
      router.push('/users/credit-memo');
    }
  };

  /* ================================================================= */
  /*  UI                                                               */
  /* ================================================================= */
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center dark:text-white">
        Sales Invoices
      </h1>

      {/* toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-6">
        <div className="relative flex-1 max-w-md">
          <FaSearch className="absolute top-3 left-3 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer…"
            className="w-full pl-10 pr-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {hasPermission(user, 'Sales Invoice', 'create') && (
          <Link href="/users/sales-invoice-view/new" className="sm:w-auto">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 shadow">
              <FaEdit /> New Invoice
            </button>
          </Link>
        )}
      </div>

      {/* table / cards */}
      {loading ? (
        <p className="text-center text-gray-500 dark:text-gray-400">Loading…</p>
      ) : (
        <>
          {/* desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table invoices={displayInvoices} onDelete={handleDelete} onCopy={handleCopyTo} user={user} />
          </div>

          {/* mobile cards */}
          <div className="md:hidden space-y-4">
            {displayInvoices.map((inv, i) => (
              <Card key={inv._id} invoice={inv} idx={i} onDelete={handleDelete} onCopy={handleCopyTo} user={user} />
            ))}
            {!displayInvoices.length && (
              <p className="text-center text-gray-500 dark:text-gray-400">No matching invoices</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================= */
/*  Desktop Table                                                    */
/* ================================================================= */
function Table({ invoices, onDelete, onCopy, user }) {
  return (
    <table className="min-w-full bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      <thead className="bg-gray-100 dark:bg-gray-700 text-sm">
        <tr>
          {['#', 'Documents No.', 'Customer', 'Date', 'Status', 'Total', ''].map((h) => (
            <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-100">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {invoices.map((inv, i) => (
          <tr key={inv._id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
            <td className="px-4 py-3">{i + 1}</td>
            <td className="px-4 py-3">{inv.invoiceNumber}</td>
            <td className="px-4 py-3">{inv.customerName}</td>
            <td className="px-4 py-3">{new Date(inv.orderDate || inv.postingDate).toLocaleDateString('en-GB')}</td>
            <td className="px-4 py-3">{inv.status}</td>
            <td className="px-4 py-3">₹{inv.grandTotal}</td>
            <td className="px-4 py-3">
              {user ? <RowMenu invoice={inv} onDelete={onDelete} onCopy={onCopy} user={user} /> : null}
            </td>
          </tr>
        ))}
        {!invoices.length && (
          <tr>
            <td colSpan={7} className="text-center py-6 text-gray-500 dark:text-gray-400">
              No invoices found.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/* ================================================================= */
/*  Mobile Card                                                      */
/* ================================================================= */
function Card({ invoice, idx, onDelete, onCopy, user }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between">
        <div className="font-semibold text-gray-700 dark:text-gray-100">
          #{idx + 1} • {invoice.invoiceNumber}
        </div>
        {user && <RowMenu invoice={invoice} onDelete={onDelete} onCopy={onCopy} user={user} isMobile />}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-300 mt-1">Customer: {invoice.customerName}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Date: {new Date(invoice.orderDate || invoice.postingDate).toLocaleDateString('en-GB')}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Status: {invoice.status}</p>
      <p className="text-sm text-gray-500 dark:text-gray-300">Total: ₹{invoice.grandTotal}</p>
    </div>
  );
}

/* ================================================================= */
/*  Row Menu with Permission Checks                                   */
/* ================================================================= */
function RowMenu({ invoice, onDelete, onCopy, user }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  const actions = [
    { icon: <FaEye />, label: 'View', onClick: () => router.push(`/users/sales-invoice-view/${invoice._id}`) },
    hasPermission(user, 'Sales Invoice', 'edit') && { icon: <FaEdit />, label: 'Edit', onClick: () => router.push(`/users/sales-invoice-view/new?editId=${invoice._id}`) },
    hasPermission(user, 'Sales Invoice', 'create') && { icon: <FaCopy />, label: 'Copy → Credit', onClick: () => onCopy(invoice, 'Credit') },
    hasPermission(user, 'Sales Invoice', 'email') && { icon: <FaEnvelope />, label: 'Email', onClick: async () => {
      try {
        const res = await axios.post('/api/email', { type: 'invoice', id: invoice._id });
        if (res.data.success) toast.success('Email sent successfully!');
        else toast.error(res.data.message || 'Failed to send email.');
      } catch {
        toast.error('Error sending email.');
      }
    }},
    hasPermission(user, 'Sales Invoice', 'whatsapp') && { icon: <FaWhatsapp />, label: 'WhatsApp', onClick: () => router.push(`/users/whatsapp/${invoice._id}`) },
    hasPermission(user, 'Sales Invoice', 'print') && { icon: <FaPrint />, label: 'Print', onClick: () => router.push(`/users/sales-invoice-print/${invoice._id}`) },
    hasPermission(user, 'Sales Invoice', 'delete') && { icon: <FaTrash />, label: 'Delete', color: 'text-red-600', onClick: () => onDelete(invoice._id) },
  ].filter(Boolean);

  if (!actions.length) return null; // hide menu if no permission

  return <ActionMenu actions={actions} />;
}
