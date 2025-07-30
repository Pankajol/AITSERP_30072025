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
        setLoading(true);
        const res = await axios.get(`/api/sales-invoice/${id}`);
        if (res.data && res.data.data) {
          setInvoice(res.data.data);
        } else {
          setError('Invoice not found');
        }
      } catch (error) {
        console.error('Failed to fetch sales invoice:', error);
        setError('Failed to fetch invoice details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchInvoice();
    }
  }, [id]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toLocaleDateString() : '-';
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid': return 'bg-green-100 text-green-800';
      case 'Partial': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-red-100 text-red-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl">Loading invoice details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600 text-xl">{error}</p>
        <Link href="/admin/sales-invoice-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
            Back to Invoice List
          </button>
        </Link>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <p>Invoice not found</p>
        <Link href="/admin/sales-invoice-view">
          <button className="mt-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded">
            Back to Invoice List
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Link href="/admin/sales-invoice-view">
        <button className="mb-4 px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
          ← Back to Invoice List
        </button>
      </Link>
      
      <h1 className="text-3xl font-bold mb-6">Sales Invoice Details</h1>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
            <div className="space-y-2">
              <p><strong>Customer Code:</strong> {invoice.customerCode}</p>
              <p><strong>Customer Name:</strong> {invoice.customerName}</p>
              <p><strong>Contact Person:</strong> {invoice.contactPerson}</p>
              <p><strong>Sales Employee:</strong> {invoice.salesEmployee || '-'}</p>
            </div>
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-4">Invoice Information</h2>
            <div className="space-y-2">
              <p><strong>Invoice Number:</strong> {invoice.invoiceNumber}</p>
              <p><strong>Reference Number:</strong> {invoice.refNumber || '-'}</p>
              <p><strong>Order Date:</strong> {formatDate(invoice.orderDate)}</p>
              <p><strong>Expected Delivery:</strong> {formatDate(invoice.expectedDeliveryDate)}</p>
              <p>
                <strong>Status:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  invoice.status === "Confirmed" 
                    ? "bg-green-200 text-green-800" 
                    : "bg-yellow-200 text-yellow-800"
                }`}>
                  {invoice.status}
                </span>
              </p>
              <p><strong>From Quote:</strong> {invoice.fromQuote ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t">
          <h2 className="text-xl font-semibold mb-2">Financial Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <p><strong>Total Before Discount:</strong> {formatCurrency(invoice.totalBeforeDiscount)}</p>
              <p><strong>Freight:</strong> {formatCurrency(invoice.freight)}</p>
              <p><strong>Rounding:</strong> {formatCurrency(invoice.rounding)}</p>
              <p><strong>Total Down Payment:</strong> {formatCurrency(invoice.totalDownPayment)}</p>
            </div>
            <div className="space-y-1">
              <p><strong>Applied Amounts:</strong> {formatCurrency(invoice.appliedAmounts)}</p>
              <p><strong>Open Balance:</strong> {formatCurrency(invoice.openBalance)}</p>
              <p><strong>GST Total:</strong> {formatCurrency(invoice.gstTotal)}</p>
              <p>
                <strong>Payment Status:</strong>
                <span className={`ml-2 px-2 py-1 rounded text-sm ${getPaymentStatusColor(invoice.paymentStatus)}`}>
                  {invoice.paymentStatus}
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between items-center">
              <p className="text-xl font-bold">Grand Total: {formatCurrency(invoice.grandTotal)}</p>
              <div className="text-right">
                <p><strong>Paid Amount:</strong> {formatCurrency(invoice.paidAmount)}</p>
                <p><strong>Remaining Amount:</strong> {formatCurrency(invoice.remainingAmount)}</p>
              </div>
            </div>
          </div>
        </div>
        
        {invoice.remarks && (
          <div className="mt-6 pt-4 border-t">
            <h2 className="text-xl font-semibold mb-2">Remarks</h2>
            <p className="text-gray-700">{invoice.remarks}</p>
          </div>
        )}
      </div>

      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <h2 className="text-2xl font-semibold mb-4">Invoice Items</h2>
        {invoice.items && invoice.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border p-2 text-left">Item Code</th>
                  <th className="border p-2 text-left">Item Name</th>
                  <th className="border p-2 text-left">Description</th>
                  <th className="border p-2 text-left">Warehouse</th>
                  <th className="border p-2 text-center">Quantity</th>
                  <th className="border p-2 text-center">Unit Price</th>
                  <th className="border p-2 text-center">Discount</th>
                  <th className="border p-2 text-center">Total</th>
                  <th className="border p-2 text-center">Batch Details</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <>
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="border p-2">{item.itemCode}</td>
                      <td className="border p-2">{item.itemName}</td>
                      <td className="border p-2">{item.itemDescription || '-'}</td>
                      <td className="border p-2">
                        {item.warehouseCode} - {item.warehouseName}
                      </td>
                      <td className="border p-2 text-center">
                        <div className="flex flex-col">
                          <span>Ordered: {item.quantity}</span>
                          {item.allowedQuantity > 0 && (
                            <span className="text-sm text-green-600">
                              Allowed: {item.allowedQuantity}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="border p-2 text-right">{formatCurrency(item.discount)}</td>
                      <td className="border p-2 text-right font-medium">
                        {formatCurrency(item.totalAmount)}
                      </td>
                      <td className="border p-2 text-center">
                        {item.managedByBatch ? "Batch Managed" : "Not Batch Managed"}
                      </td>
                    </tr>
                    
                    {/* Batch details if managed by batch */}
                    {item.managedByBatch && item.batches && item.batches.length > 0 && (
                      <tr>
                        <td colSpan="9" className="border p-2 bg-gray-50">
                          <h3 className="font-semibold mb-2">Batch Details:</h3>
                          <table className="min-w-full bg-gray-100">
                            <thead>
                              <tr>
                                <th className="p-2 text-left">Batch Code</th>
                                <th className="p-2 text-left">Expiry Date</th>
                                <th className="p-2 text-left">Manufacturer</th>
                                <th className="p-2 text-center">Allocated Qty</th>
                                <th className="p-2 text-center">Available Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {item.batches.map((batch, batchIndex) => (
                                <tr key={batchIndex} className="hover:bg-gray-200">
                                  <td className="p-2">{batch.batchCode}</td>
                                  <td className="p-2">{formatDate(batch.expiryDate)}</td>
                                  <td className="p-2">{batch.manufacturer}</td>
                                  <td className="p-2 text-center">{batch.allocatedQuantity}</td>
                                  <td className="p-2 text-center">{batch.availableQuantity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                    
                    {item.errorMessage && (
                      <tr>
                        <td colSpan="9" className="border p-2 bg-red-50 text-red-700">
                          <strong>Error:</strong> {item.errorMessage}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No items available.</p>
        )}
      </div>

      <div className="flex justify-end space-x-4">
        <Link href="/admin/sales-invoice-view">
          <button className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded transition">
            Back to List
          </button>
        </Link>
        <Link href={`/admin/sales-invoice-view/new?editId=${invoice._id}`}>
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition">
            Edit Invoice
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
//   const [order, setOrder] = useState([]);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchOrder = async () => {
//       try {
//         const res = await axios.get(`/api/sales-invoice/${id}`);
//         console.log(res.data.data)
//         setOrder(res.data.data);
//       } catch (error) {
//         console.error('Failed to fetch purchase-order:', error);
//         setError('Failed to fetch purchase-order');
//       }
//     };

//     if (id) {
//         fetchOrder();
//     }
//   }, [id]);

//   if (error) {
//     return <p>{error}</p>;
//   }

//   if (!order) {
//     return <p>Loading...</p>;
//   }

//   return (
//     <div className="container mx-auto p-6">
//       <Link href="/admin/sales-invoice-view">
//         <button className="mb-4 px-4 py-2 bg-gray-300 rounded">Back to Order List</button>
//       </Link>
//       <h1 className="text-3xl font-bold mb-6">Order Detail</h1>
//       <div className="bg-white shadow-md rounded p-6">
//         <p><strong>order Number:</strong> {order.orderNumber}</p>
//         <p><strong>Supplier Name:</strong> {order.supplierName}</p>
//         <p><strong>order Date:</strong> {new Date(order.orderDate).toLocaleDateString()}</p>
//         <p><strong>Status:</strong> {order.status}</p>
//         <p><strong>Grand Total:</strong> {order.grandTotal}</p>
//         <p><strong>Remarks:</strong> {order.remarks}</p>
//         <h2 className="text-2xl font-semibold mt-6 mb-2">Items</h2>
//         {order.items && order.items.length > 0 ? (
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
//               {order.items.map((item, index) => (
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
//         <Link href={`/admin/sales-invoice-view/new?editId=${order._id}`}>
//           <button className="px-4 py-2 bg-blue-600 text-white rounded">Edit order</button>
//         </Link>
//       </div>
//     </div>
//   );
// }
