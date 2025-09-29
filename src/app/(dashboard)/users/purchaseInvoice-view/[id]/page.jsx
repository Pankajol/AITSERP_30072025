'use client';

import Link from 'next/link';
import axios from 'axios';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function InvoiceDetail() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await axios.get(`/api/purchaseInvoice/${id}`);
        setInvoice(res.data.data);
      } catch (error) {
        console.error('Failed to fetch purchaseInvoice:', error);
        setError('Failed to fetch purchase invoice details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
        fetchInvoice();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading invoice details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <Link href="/admin/purchaseInvoice-view">
          <button className="px-4 py-2 bg-gray-300 rounded">Back to Invoice List</button>
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <p>Invoice not found</p>
        <Link href="/admin/purchaseInvoice-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 rounded">Back to Invoice List</button>
        </Link>
      </div>
    );
  }

  // Helper function to format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate item totals
  const calculateItemTotals = () => {
    if (!invoice.items) return {};
    
    return invoice.items.reduce((acc, item) => {
      acc.totalQuantity += item.quantity || 0;
      acc.totalAmount += item.totalAmount || 0;
      acc.totalDiscount += item.discount || 0;
      acc.totalGST += item.gstAmount || 0;
      return acc;
    }, {
      totalQuantity: 0,
      totalAmount: 0,
      totalDiscount: 0,
      totalGST: 0
    });
  };

  const itemTotals = calculateItemTotals();

  return (
    <div className="container mx-auto p-6">
      <Link href="/admin/purchaseInvoice-view">
        <button className="mb-6 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
          Back to Invoice List
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Purchase Invoice Details</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Invoice #{invoice.invoiceNumber || 'N/A'}</h2>
            <div className="flex space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                invoice.status === 'Paid' ? 'bg-green-100 text-green-800' :
                invoice.status === 'Partially Paid' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {invoice.status}
              </span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                invoice.stockStatus === 'Updated' ? 'bg-green-100 text-green-800' :
                invoice.stockStatus === 'Partially Updated' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {invoice.stockStatus}
              </span>
            </div>
          </div>
          <p className="text-gray-600 mt-1">Created: {formatDate(invoice.createdAt)}</p>
        </div>
        
        {/* Supplier and Document Info */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">Supplier Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Supplier Name:</span> {invoice.supplierName}</p>
              <p><span className="font-medium">Supplier Code:</span> {invoice.supplierCode || 'N/A'}</p>
              <p><span className="font-medium">Contact Person:</span> {invoice.contactPerson || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Document Information</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Invoice Type:</span> {invoice.invoiceType}</p>
              <p><span className="font-medium">GRN Reference:</span> {invoice.grn || 'N/A'}</p>
              <p><span className="font-medium">Purchase Order:</span> {invoice.purchaseOrder || 'N/A'}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-3">Dates</h3>
            <div className="space-y-2">
              <p><span className="font-medium">Document Date:</span> {formatDate(invoice.documentDate)}</p>
              <p><span className="font-medium">Posting Date:</span> {formatDate(invoice.postingDate)}</p>
              <p><span className="font-medium">Valid Until:</span> {formatDate(invoice.validUntil)}</p>
            </div>
          </div>
        </div>
        
        {/* Financial Summary */}
        <div className="px-6 py-4 bg-gray-50 border-t border-b">
          <h3 className="text-lg font-semibold mb-3">Financial Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-gray-600">Grand Total</p>
              <p className="font-medium text-xl">₹{invoice.grandTotal?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Paid Amount</p>
              <p className="font-medium text-xl text-green-600">₹{invoice.paidAmount?.toFixed(2) || '0.00'}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Remaining Amount</p>
              <p className={`font-medium text-xl ${
                invoice.remainingAmount > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                ₹{invoice.remainingAmount?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Items Section */}
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Invoice Items</h3>
            <p className="text-gray-600">{invoice.items?.length || 0} items</p>
          </div>
          
          {invoice.items && invoice.items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Warehouse</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.itemName}</div>
                        <div className="text-sm text-gray-500">{item.itemCode}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>{item.quantity}</div>
                        {item.receivedQuantity > 0 && (
                          <div className="text-xs text-gray-500">Received: {item.receivedQuantity}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>₹{item.unitPrice?.toFixed(2)}</div>
                        {item.discount > 0 && (
                          <div className="text-xs text-red-600">-{item.discount}%</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div>{item.gstRate}%</div>
                        <div className="text-xs">₹{item.gstAmount?.toFixed(2)}</div>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">₹{item.totalAmount?.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        {item.warehouseName || 'N/A'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.stockAdded ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.stockAdded ? 'Added' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td className="px-4 py-3 text-right" colSpan="1">Totals:</td>
                    <td className="px-4 py-3 text-center">{itemTotals.totalQuantity}</td>
                    <td></td>
                    <td className="px-4 py-3 text-center">₹{itemTotals.totalGST.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">₹{itemTotals.totalAmount.toFixed(2)}</td>
                    <td colSpan="2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <p className="text-gray-500">No items found in this invoice</p>
            </div>
          )}
        </div>
        
        {/* Quality Check Section */}
        {invoice.qualityCheckDetails && invoice.qualityCheckDetails.length > 0 && (
          <div className="p-6 border-t">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Quality Check Details</h3>
              <p className="text-gray-600">{invoice.qualityCheckDetails.length} parameters</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameter</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Min Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Max Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actual Value</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoice.qualityCheckDetails.map((qc, index) => {
                    const isWithinRange = qc.actualValue >= qc.min && qc.actualValue <= qc.max;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-4 py-3">{qc.parameter}</td>
                        <td className="px-4 py-3 text-center">{qc.min}</td>
                        <td className="px-4 py-3 text-center">{qc.max}</td>
                        <td className="px-4 py-3 text-center">{qc.actualValue}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            isWithinRange ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isWithinRange ? 'Pass' : 'Fail'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Batch Details Section */}
        {invoice.items && invoice.items.some(item => item.batches?.length > 0) && (
          <div className="p-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Batch Details</h3>
            
            {invoice.items.map((item, itemIndex) => (
              item.batches && item.batches.length > 0 && (
                <div key={itemIndex} className="mb-6">
                  <h4 className="font-medium mb-2">
                    {item.itemName} ({item.itemCode})
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left">Batch Number</th>
                          <th className="px-4 py-2 text-center">Expiry Date</th>
                          <th className="px-4 py-2 text-center">Manufacturer</th>
                          <th className="px-4 py-2 text-center">Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {item.batches.map((batch, batchIndex) => (
                          <tr key={batchIndex} className="hover:bg-gray-50">
                            <td className="px-4 py-2 border-b">{batch.batchNumber}</td>
                            <td className="px-4 py-2 border-b text-center">{formatDate(batch.expiryDate)}</td>
                            <td className="px-4 py-2 border-b text-center">{batch.manufacturer}</td>
                            <td className="px-4 py-2 border-b text-center">{batch.batchQuantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        
        {/* Remarks */}
        <div className="px-6 py-4 bg-gray-50 border-t">
          <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
          <div>
            <p className="font-medium">Remarks:</p>
            <p className="text-gray-600 mt-1 bg-white p-3 rounded border">
              {invoice.remarks || 'No remarks provided'}
            </p>
          </div>
        </div>
      </div>
      {/* attechements */}
      {/* {invoice.attachments && invoice.attachments.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Attachments</h3>
          <ul className="list-disc pl-5 space-y-2">
            {invoice.attachments.map((file, index) => (
              <li key={index}>
                <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {file.fileName}
                </a> - {file.fileType} (Uploaded on: {new Date(file.uploadedAt).toLocaleDateString()})
              </li>
            ))}
          </ul>
        </div>
      )} */}
        {/* ✅ Attachments Section */}
      {invoice?.attachments && invoice?.attachments.length > 0 && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Attachments</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {invoice?.attachments.map((file, idx) => {
              const url = file.fileUrl || file.url || file.path || "";
              const isPDF = file.fileType === "application/pdf" || url.endsWith(".pdf");
              return (
                <div key={idx} className="border rounded p-2 text-center">
                  {isPDF ? (
                    <object data={url} type="application/pdf" className="h-24 w-full rounded" />
                  ) : (
                    <img src={url} alt="Attachment" className="h-24 w-full object-cover rounded" />
                  )}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="block text-blue-600 text-xs mt-1 truncate">
                    {file.fileName || `Attachment-${idx}`}
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
        
      <div className="mt-6 flex justify-end space-x-4">
        <Link href={`/admin/purchaseInvoice-view/new?editId=${invoice._id}`}>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Edit Invoice
          </button>
        </Link>
        <Link href="/admin/purchaseInvoice-view">
          <button className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition">
            Back to List
          </button>
        </Link>
      </div>
    </div>
  );
}

// 'use client';

// import Link from 'next/link';
// import axios from 'axios';
// import { useParams } from 'next/navigation';
// import { useEffect, useState } from 'react';

// export default function InvoiceDetail() {
//   const { id } = useParams();
//   const [invoice, setInvoice] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchInvoice = async () => {
//       try {
//         const res = await axios.get(`/api/purchaseInvoice/${id}`);
//         console.log(res.data.data)
//         setInvoice(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch purchaseInvoice:', error);
//         setError('Failed to fetch purchaseInvoice');
//       }
//     };

//     if (id) {
//         fetchInvoice();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!invoice) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/purchaseInvoice-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Invoice List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Invoice Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>invoice Number:</strong> {invoice.invoiceNumber}</p>
//         <p><strong>Supplier Name:</strong> {invoice.supplierName}</p>
//         <p><strong>invoice Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {invoice.status}</p>
//         <p><strong>Grand Total:</strong> {invoice.grandTotal}</p>
//         <p><strong>Remarks:</strong> {invoice.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {invoice.items && invoice.items.length > 0 ? (
//           <table className="min-w-full bg-white border border-gray-300">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2">Item Name</th>
//                 <th className="border p-2">Quantity</th>
//                 <th className="border p-2">Unit Price</th>
//                 <th className="border p-2">Discount</th>
//                 <th className="border p-2">Total Amount</th>
//               </tr>
//             </thead>
//             <tbody>
//               {invoice.items.map((item, index) => (
//                 <tr key={index} className="text-center">
//                   <td className="border p-2">{item.itemName}</td>
//                   <td className="border p-2">{item.quantity}</td>
//                   <td className="border p-2">{item.unitPrice}</td>
//                   <td className="border p-2">{item.discount}</td>
//                   <td className="border p-2">{item.totalAmount}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         ) : (
//           <p>No items available.</p>
//         )}
//       </div>
//       <div className="mt-4">
//         <Link href={`/admin/purchaseInvoice-view/new?editId=${invoice._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit invoice</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
