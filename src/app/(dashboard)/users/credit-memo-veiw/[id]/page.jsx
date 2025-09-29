'use client';

import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CreditNoteDetail() {
  const { id } = useParams();
  const [creditNote, setCreditNote] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCreditNote = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Unauthorized: No token found");
          setLoading(false);
          return;
        }

        setLoading(true);
        const res = await axios.get(`/api/credit-note/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data?.success && res.data.data) {
          setCreditNote(res.data.data);
        } else {
          setError('Credit note not found');
        }
      } catch (error) {
        console.error('Failed to fetch credit note:', error);
        setError('Failed to fetch credit note details');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchCreditNote();
  }, [id]);

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value || 0);

  const formatDate = (dateString) =>
    dateString ? new Date(dateString).toLocaleDateString() : '-';

  if (loading) {
    return <div className="flex justify-center items-center h-screen text-xl">Loading credit note details...</div>;
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600 text-xl">{error}</p>
        <Link href="/admin/credit-notes-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
            Back to Credit Notes List
          </button>
        </Link>
      </div>
    );
  }

  if (!creditNote) {
    return (
      <div className="container mx-auto p-6">
        <p>Credit note not found</p>
        <Link href="/admin/credit-notes-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
            Back to Credit Notes List
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Back Button */}
      <Link href="/admin/credit-notes-view">
        <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
          ← Back to Credit Notes List
        </button>
      </Link>

      <h1 className="text-3xl font-bold mb-6">Credit Note Details</h1>

      {/* Customer Info & Credit Note Info */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer Info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <p><strong>Customer Code:</strong> {creditNote.customerCode}</p>
            <p><strong>Customer Name:</strong> {creditNote.customerName}</p>
            <p><strong>Contact Person:</strong> {creditNote.contactPerson}</p>
            <p><strong>Sales Employee:</strong> {creditNote.salesEmployee || '-'}</p>
          </div>

          {/* Credit Note Info */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Credit Note Information</h2>
            <p><strong>Reference Number:</strong> {creditNote.refNumber}</p>
            <p><strong>Posting Date:</strong> {formatDate(creditNote.postingDate)}</p>
            <p><strong>Valid Until:</strong> {formatDate(creditNote.validUntil)}</p>
            <p><strong>Document Date:</strong> {formatDate(creditNote.documentDate)}</p>
            <p>
              <strong>Status:</strong>
              <span className={`ml-2 px-2 py-1 rounded text-sm ${
                creditNote.status === "Confirmed" ? "bg-green-200 text-green-800" : "bg-yellow-200 text-yellow-800"
              }`}>
                {creditNote.status}
              </span>
            </p>
            <p><strong>From Quote:</strong> {creditNote.fromQuote ? 'Yes' : 'No'}</p>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="mt-4 pt-4 border-t">
          <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Total Before Discount:</strong> {formatCurrency(creditNote.totalBeforeDiscount)}</p>
              <p><strong>Freight:</strong> {formatCurrency(creditNote.freight)}</p>
              <p><strong>Rounding:</strong> {formatCurrency(creditNote.rounding)}</p>
            </div>
            <div>
              <p><strong>GST Total:</strong> {formatCurrency(creditNote.gstTotal)}</p>
              <p><strong>Open Balance:</strong> {formatCurrency(creditNote.openBalance)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t text-xl font-bold">
            <strong>Grand Total:</strong> {formatCurrency(creditNote.grandTotal)}
          </div>
        </div>

        {/* Remarks */}
        {creditNote.remarks && (
          <div className="mt-6 pt-4 border-t">
            <h2 className="text-xl font-semibold mb-2">Remarks</h2>
            <p className="text-gray-700">{creditNote.remarks}</p>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Credit Note Items</h2>
        {creditNote.items && creditNote.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2">Item Code</th>
                  <th className="border p-2">Item Name</th>
                  <th className="border p-2">Description</th>
                  <th className="border p-2">Quantity</th>
                  <th className="border p-2">Unit Price</th>
                  <th className="border p-2">Discount</th>
                  <th className="border p-2">Tax</th>
                  <th className="border p-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {creditNote.items.map((item, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border p-2">{item.itemCode}</td>
                    <td className="border p-2">{item.itemName}</td>
                    <td className="border p-2">{item.itemDescription}</td>
                    <td className="border p-2">{item.quantity}</td>
                    <td className="border p-2">{formatCurrency(item.unitPrice)}</td>
                    <td className="border p-2">{formatCurrency(item.discount)}</td>
                    <td className="border p-2">{item.gstType}%</td>
                    <td className="border p-2">{formatCurrency(item.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No items available</p>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <Link href="/admin/credit-memo-veiw">
          <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
            Back to List
          </button>
        </Link>
        <Link href={`/admin/credit-memo/?editId=${creditNote._id}`}>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
            Edit Credit Note
          </button>
        </Link>
      </div>
    </div>
  );
}
