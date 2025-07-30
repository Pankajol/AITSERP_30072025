'use client';

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import Link from "next/link";

export default function DebitNoteDetail() {
  const { id } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDebitNote() {
      try {
        const res = await axios.get(`/api/debit-note/${id}`);
        setNote(res.data);
      } catch (err) {
        setError("Failed to load Debit Note");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchDebitNote();
  }, [id]);

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <p>Loading debit note details...</p>
    </div>
  );
  
  if (error) return (
    <div className="container mx-auto p-8">
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        {error}
      </div>
      <Link href="/admin/debit-notes-view">
        <button className="px-4 py-2 bg-gray-300 rounded">Back to Debit Notes</button>
      </Link>
    </div>
  );
  
  if (!note) return (
    <div className="container mx-auto p-8">
      <p>Debit note not found</p>
      <Link href="/admin/debit-notes-view">
        <button className="mt-4 px-4 py-2 bg-gray-300 rounded">Back to Debit Notes</button>
      </Link>
    </div>
  );

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate totals
  const calculateItemTotals = () => {
    if (!note.items) return {};
    
    return note.items.reduce((acc, item) => {
      acc.totalQuantity += item.quantity || 0;
      acc.totalAmount += item.totalAmount || 0;
      acc.totalDiscount += item.discount || 0;
      acc.totalGST += item.gstAmount || 0;
      acc.totalTDS += item.tdsAmount || 0;
      return acc;
    }, {
      totalQuantity: 0,
      totalAmount: 0,
      totalDiscount: 0,
      totalGST: 0,
      totalTDS: 0
    });
  };

  const itemTotals = calculateItemTotals();

  return (
    <div className="container mx-auto p-8">
      <Link href="/admin/debit-notes-view">
        <button className="mb-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
          Back to Debit Notes
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Debit Note Details</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Debit Note #{note.refNumber || 'N/A'}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              note.status === 'Confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {note.status}
            </span>
          </div>
          <p className="text-gray-600 mt-1">Created: {formatDate(note.createdAt)}</p>
        </div>
        
        {/* Source Information */}
        {note.sourceId && (
          <div className="p-6 bg-blue-50 border-b">
            <h3 className="text-lg font-semibold mb-2">Source Information</h3>
            <p>
              <span className="font-medium">Source Type:</span> {note.sourceModel}
              {note.fromQuote && <span className="ml-2 bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs">Created from Quote</span>}
            </p>
            <p className="text-sm text-gray-600 mt-1">Source ID: {note.sourceId.toString()}</p>
          </div>
        )}
        
        {/* Supplier Information */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Supplier Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Supplier Code:</span> {note.supplierCode}</p>
              <p><span className="font-medium">Supplier Name:</span> {note.supplierName}</p>
              <p><span className="font-medium">Contact Person:</span> {note.supplierContact}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Dates</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Posting Date:</span> {formatDate(note.postingDate)}</p>
              <p><span className="font-medium">Document Date:</span> {formatDate(note.documentDate)}</p>
              <p><span className="font-medium">Valid Until:</span> {formatDate(note.validUntil)}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Sales Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Sales Employee:</span> {note.salesEmployee || 'N/A'}</p>
              <p><span className="font-medium">Total Down Payment:</span> ₹{note.totalDownPayment?.toFixed(2) || '0.00'}</p>
              <p><span className="font-medium">Applied Amounts:</span> ₹{note.appliedAmounts?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        
        {/* Financial Summary */}
        <div className="px-6 py-4 bg-gray-50 border-t border-b">
          <h3 className="text-lg font-semibold mb-3">Financial Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-gray-600">Total Before Discount</p>
              <p className="font-medium">₹{note.totalBeforeDiscount?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">Freight Charges</p>
              <p className="font-medium">₹{note.freight?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">GST Total</p>
              <p className="font-medium">₹{note.gstTotal?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">Rounding</p>
              <p className="font-medium">₹{note.rounding?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-gray-600">Grand Total</p>
              <p className="font-medium text-lg text-blue-700">₹{note.grandTotal?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
        </div>
        
        {/* Items Section */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Items</h3>
            <p className="text-gray-600">{note.items?.length || 0} items</p>
          </div>
          
          {note.items && note.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Management</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {note.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-gray-500">{item.itemCode}</div>
                        <div className="text-xs text-gray-400">{item.itemDescription}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>{item.quantity}</div>
                        {item.allowedQuantity > 0 && (
                          <div className="text-xs text-gray-500">Allowed: {item.allowedQuantity}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>₹{item.unitPrice?.toFixed(2)}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-red-600">-₹{item.discount?.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>{item.taxOption} @ {item.gstType}%</div>
                        <div className="text-xs">GST: ₹{item.gstAmount?.toFixed(2)}</div>
                        {item.igstAmount > 0 && (
                          <div className="text-xs">IGST: ₹{item.igstAmount?.toFixed(2)}</div>
                        )}
                        <div className="text-xs">TDS: ₹{item.tdsAmount?.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">₹{item.totalAmount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div>{item.warehouseName}</div>
                        <div className="text-xs text-gray-500">{item.warehouseCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">
                          {item.managedByBatch ? 'Batch Managed' : 'Loose'}
                        </div>
                        
                        {/* Batch Information */}
                        {item.managedByBatch && item.batches && item.batches.length > 0 && (
                          <div className="mt-2 text-xs">
                            <div className="font-medium">Batches:</div>
                            {item.batches.map((batch, batchIdx) => (
                              <div key={batchIdx} className="mt-1 p-1 bg-gray-50 rounded">
                                <div>#{batch.batchCode}</div>
                                <div>Qty: {batch.allocatedQuantity}</div>
                                <div>Exp: {formatDate(batch.expiryDate)}</div>
                                <div>Mfr: {batch.manufacturer}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-4 py-3 text-right" colSpan="1">Totals:</td>
                    <td className="px-4 py-3 text-center">{itemTotals.totalQuantity}</td>
                    <td></td>
                    <td className="px-4 py-3 text-center">
                      <div>GST: ₹{itemTotals.totalGST.toFixed(2)}</div>
                      <div>TDS: ₹{itemTotals.totalTDS.toFixed(2)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">₹{itemTotals.totalAmount.toFixed(2)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No items found in this debit note</p>
            </div>
          )}
        </div>
        
        {/* Additional Information */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-medium">Remarks:</p>
              <p className="text-gray-600 mt-1 bg-white p-3 rounded border">
                {note.remarks || 'No remarks provided'}
              </p>
            </div>
            
            <div>
              <div className="mb-4">
                <p className="font-medium">Open Balance:</p>
                <p className={`text-lg font-semibold ${
                  note.openBalance > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  ₹{note.openBalance?.toFixed(2) || '0.00'}
                </p>
              </div>
              
              {note.items?.some(item => item.errorMessage) && (
                <div className="bg-red-50 p-4 rounded border border-red-100">
                  <h4 className="font-medium text-red-800">Item Errors:</h4>
                  <ul className="mt-2 space-y-1">
                    {note.items.map((item, index) => (
                      item.errorMessage && (
                        <li key={index} className="text-sm text-red-700">
                          <span className="font-medium">{item.itemName}:</span> {item.errorMessage}
                        </li>
                      )
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-4">
        <Link href={`/admin/debit-notes-view/${id}/edit`}>
          <button className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition">
            Edit Debit Note
          </button>
        </Link>
        <Link href="/admin/debit-notes-view">
          <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
            Back to List
          </button>
        </Link>
      </div>
    </div>
  );
}




// "use client";

// import React, { useState, useEffect } from "react";
// import { useParams } from "next/navigation";
// import axios from "axios";
// import Link from "next/link";

// export default function DebitNoteDetail() {
//   const { id } = useParams();
//   const [note, setNote] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     async function fetchDebitNote() {
//       try {
//         const res = await axios.get(`/api/debit-note/${id}`);
//         setNote(res.data);
//       } catch (err) {
//         setError("Failed to load Debit Note");
//       } finally {
//         setLoading(false);
//       }
//     }
//     fetchDebitNote();
//   }, [id]);

//   if (loading) return <div className="p-8">Loading...</div>;
//   if (error) return <div className="p-8 text-red-600">{error}</div>;

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold mb-4">Debit Note Details</h1>
//       <p><strong>Supplier Name:</strong> {note.supplierName}</p>
//       <p><strong>Reference Number:</strong> {note.refNumber}</p>
//       <p><strong>Status:</strong> {note.status}</p>
//       <p><strong>Grand Total:</strong> {parseFloat(note.grandTotal).toFixed(2)}</p>
//       <p><strong>Created At:</strong> {new Date(note.createdAt).toLocaleString()}</p>
//       <Link href={`/admin/debit-notes-view/${id}/edit`}>
//         <button className="px-4 py-2 bg-yellow-500 text-white rounded mt-4">Edit</button>
//       </Link>
//     </div>
//   );
// }
