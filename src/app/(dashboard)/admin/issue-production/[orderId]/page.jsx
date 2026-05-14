'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';
import MultiBatchModal from '@/components/MultiBatchModalbtach';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function IssueForProductionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderId = params?.orderId;
  const qtyParam = Number(searchParams.get('qty')) || 1;

  const [token, setToken] = useState('');
  const [order, setOrder] = useState(null);
  const [rows, setRows] = useState([]);
  const [docNo, setDocNo] = useState('');
  const [docDate, setDocDate] = useState('');
  const [warehouseOptions, setWarehouseOptions] = useState([]);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [batchModalIndex, setBatchModalIndex] = useState(null);
  const [batchOptions, setBatchOptions] = useState([]);
  const [loading, setLoading] = useState(true);

  // AUTH CHECK
  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) {
      toast.error('You must be logged in to access this page.');
      router.push('/login');
    } else {
      setToken(t);
    }
  }, [router]);

  // Fetch warehouse options
  useEffect(() => {
    if (!token) return;
    axios
      .get('/api/warehouse', {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setWarehouseOptions(res.data.data))
      .catch(console.error);
  }, [token]);

  // Fetch production order
  useEffect(() => {
    if (!orderId || !token) return;

    (async () => {
      try {
        const { data: ord } = await axios.get(`/api/production-orders/${orderId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrder(ord);

        const todayStr = new Date().toISOString().slice(0, 10);
        const docNoFormatted = `IP-${todayStr.replace(/-/g, '')}-${orderId.slice(-4)}`;
        setDocNo(docNoFormatted);
        setDocDate(todayStr);

        const sw = ord.warehouse?._id || ord.warehouse || '';
        setSourceWarehouse(sw);

        const itemsWithBatchFlag = await Promise.all(
          ord.items.map(async (item) => {
            const itemId = item.item?._id || item.item || '';
            let managedBy = item.managedBy;

            if (!managedBy && itemId) {
              try {
                const res = await axios.get(`/api/items/${itemId}`, {
                  headers: { Authorization: `Bearer ${token}` },
                });
                managedBy = res.data?.data?.managedBy || '';
              } catch (err) {
                console.warn(`Failed to fetch item ${itemId}:`, err);
              }
            }

            return {
              itemId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              unitPrice: item.item?.unitPrice || 0,
              uom: item.unitQty > 1 ? `x${item.unitQty}` : 'pcs',
              qty: qtyParam * item.quantity,
              batches: [],
              batchNumber: '',
              sourceWarehouse: sw,
              managedByBatch: managedBy === 'batch',
            };
          })
        );

        setRows(itemsWithBatchFlag);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, qtyParam, token]);

  // Load batch options
  useEffect(() => {
    if (batchModalIndex == null || !rows[batchModalIndex]) return;
    const { itemId, sourceWarehouse: wh } = rows[batchModalIndex];
    if (!itemId || !wh) return;

    axios
      .get(`/api/inventory-batch/${itemId}/${wh}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setBatchOptions(res.data.batches || []))
      .catch((err) => {
        if (err.response?.status === 404) setBatchOptions([]);
        else console.error(err);
      });
  }, [batchModalIndex, rows, token]);

  const openBatchModal = useCallback((idx) => setBatchModalIndex(idx), []);
  const closeBatchModal = useCallback(() => setBatchModalIndex(null), []);

  const handleUpdateBatch = (updatedBatch = []) => {
    if (batchModalIndex == null || !rows[batchModalIndex]) return;
    setRows((prevRows) => {
      const updated = [...prevRows];
      updated[batchModalIndex] = {
        ...updated[batchModalIndex],
        batches: updatedBatch,
        batchNumber: updatedBatch.map((b) => b.batchNumber).join(', '),
      };
      return updated;
    });
    closeBatchModal();
  };

  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  const totalAmount = rows.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);
  const avgCostPrice = totalQty ? (totalAmount / totalQty).toFixed(2) : 0;

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!order) {
        toast.error('Order not loaded');
        return;
      }

      const dataToSend = [];

      for (const row of rows) {
        if (row.managedByBatch) {
          if (!row.batches?.length) {
            toast.error(`Please select batches for item ${row.itemCode}`);
            return;
          }

          for (const batch of row.batches) {
            if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
              toast.error(`Invalid batch quantity for item ${row.itemCode}`);
              return;
            }

            dataToSend.push({
              productionOrderId: order._id,
              itemId: row.itemId,
              sourceWarehouse: row.sourceWarehouse,
              destinationWarehouse: order?.warehouse?._id || '',
              batchNumber: batch.batchNumber,
              quantity: batch.quantity,
              expiryDate: batch.expiryDate || null,
              manufacturer: batch.manufacturer || null,
              unitPrice: batch.unitPrice || null,
              managedByBatch: true,
            });
          }
        } else {
          dataToSend.push({
            productionOrderId: order._id,
            itemId: row.itemId,
            sourceWarehouse: row.sourceWarehouse,
            destinationWarehouse: order?.warehouse?._id || '',
            quantity: row.qty,
            unitPrice: row.unitPrice,
            batchNumber: '',
            managedByBatch: false,
          });
        }
      }

      const payload = {
        avgCostPrice: Number(avgCostPrice),
        data: dataToSend,
      };

      try {
        await axios.post(
          `/api/issue-production/${order._id}?qty=${qtyParam}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        toast.success('Stock issued successfully');
        router.push("/admin/productionorders-list-view");
      } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        toast.error(error.response?.data?.message || 'Failed to issue for production');
      }
    },
    [rows, order, qtyParam, avgCostPrice, router, token]
  );

  if (loading) return <p>Loading...</p>;
  if (!order) return <p>Production order not found</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
      <ToastContainer />
      <h1 className="text-2xl font-semibold mb-6">Issue for Production</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label>Document No</label>
            <input readOnly value={docNo} className="w-full border p-2 bg-gray-100 rounded" />
          </div>
          <div>
            <label>Date</label>
            <input
              type="date"
              value={docDate}
              onChange={(e) => setDocDate(e.target.value)}
              className="w-full border p-2 rounded"
            />
          </div>
          <div>
            <label>Source Warehouse</label>
            <select
              value={sourceWarehouse}
              onChange={(e) => setSourceWarehouse(e.target.value)}
              required
              className="w-full border p-2 rounded"
            >
              <option value="">-- select --</option>
              {warehouseOptions.map((w) => (
                <option key={w._id} value={w._id}>
                  {w.warehouseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-sm border border-gray-300">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">Item Code</th>
              <th className="border p-2">Item Name</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Price</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Batch</th>
              <th className="border p-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="border p-2">{r.itemCode}</td>
                <td className="border p-2">{r.itemName}</td>
                <td className="border p-2">{r.qty}</td>
                <td className="border p-2">{r.item?.unitPrice}</td>
                <td className="border p-2">{(r.qty * r.unitPrice).toFixed(2)}</td>
                <td className="border p-1">
                  {r.managedByBatch ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openBatchModal(i)}
                        className="px-2 py-1 bg-blue-600 text-white rounded"
                      >
                        {r.batchNumber || 'Select Batches'}
                      </button>
                      {r.batches?.length > 0 && (
                        <ul className="mt-1 text-xs">
                          {r.batches.map((b, idx) => (
                            <li key={idx}>
                              Batch: <strong>{b.batchNumber}</strong>, Qty: <strong>{b.quantity}</strong>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-500 italic">Not batch-managed</span>
                  )}
                </td>
                <td className="border p-1">
                  <select
                    className="w-full border p-1 rounded"
                    value={r.sourceWarehouse}
                    onChange={(e) => {
                      const newSrc = e.target.value;
                      setRows((prev) => {
                        const copy = [...prev];
                        copy[i] = { ...copy[i], sourceWarehouse: newSrc };
                        return copy;
                      });
                    }}
                  >
                    <option value="">-- select --</option>
                    {warehouseOptions.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.warehouseName}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end mt-4">
          <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 p-4 rounded">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Total Quantity:</span>
                <span>{totalQty}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Amount:</span>
                <span>₹ {totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Avg Cost Price:</span>
                <span>₹ {avgCostPrice}</span>
              </div>
            </div>
          </div>
        </div>

        <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
          Issue for Production
        </button>
      </form>

      {batchModalIndex != null && rows[batchModalIndex] && (
        <MultiBatchModal
          itemsbatch={rows[batchModalIndex]}
          batchOptions={batchOptions}
          onClose={closeBatchModal}
          onUpdateBatch={handleUpdateBatch}
        />
      )}
    </div>
  );
}






















// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useParams, useSearchParams, useRouter } from 'next/navigation';
// import axios from 'axios';
// import MultiBatchModal from '@/components/MultiBatchModalbtach';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function IssueForProductionPage() {
//   const params = useParams();
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   const orderId = params?.orderId;
//   const qtyParam = Number(searchParams.get('qty')) || 1;

//   const [order, setOrder] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [docNo, setDocNo] = useState('');
//   const [docDate, setDocDate] = useState('');
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [sourceWarehouse, setSourceWarehouse] = useState('');
//   const [batchModalIndex, setBatchModalIndex] = useState(null);
//   const [batchOptions, setBatchOptions] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Fetch warehouse options once
//   useEffect(() => {
//     axios
//       .get('/api/warehouse')
//       .then((res) => setWarehouseOptions(res.data))
//       .catch(console.error);
//   }, []);

//   // Fetch production order and setup initial rows
//   useEffect(() => {
//     if (!orderId) return;

//     (async () => {
//       try {
//         const { data: ord } = await axios.get(`/api/production-orders/${orderId}`);
//         setOrder(ord);

//         const todayStr = new Date().toISOString().slice(0, 10);
//         const docNoFormatted = `IP-${todayStr.replace(/-/g, '')}-${orderId.slice(-4)}`;
//         setDocNo(docNoFormatted);
//         setDocDate(todayStr);

//         // Determine source warehouse
//         const sw = ord.warehouse?._id || ord.warehouse || '';
//         setSourceWarehouse(sw);

//         // Prepare rows with batch management info
//         const itemsWithBatchFlag = await Promise.all(
//           ord.items.map(async (item) => {
//             const itemId = item.item?._id || item.item || '';
//             let managedBy = item.managedBy;

//             // If managedBy missing, fetch item detail for batch info
//             if (!managedBy && itemId) {
//               try {
//                 const res = await axios.get(`/api/items/${itemId}`);
//                 managedBy = res.data?.data?.managedBy || '';
//               } catch (err) {
//                 console.warn(`Failed to fetch item ${itemId}:`, err);
//               }
//             }

//             return {
//               itemId,
//               itemCode: item.itemCode,
//               itemName: item.itemName,
//               unitPrice: item.item?.unitPrice || 0,
//               uom: item.unitQty > 1 ? `x${item.unitQty}` : 'pcs',
//               qty: qtyParam * item.quantity,
//               batches: [],
//               batchNumber: '',
//               sourceWarehouse: sw,
//               managedByBatch: managedBy === 'batch',
//             };
//           })
//         );

//         setRows(itemsWithBatchFlag);
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [orderId, qtyParam]);

//   // Open/close batch modal handlers
//   const openBatchModal = useCallback((idx) => setBatchModalIndex(idx), []);
//   const closeBatchModal = useCallback(() => setBatchModalIndex(null), []);

//   // Load batch options when batch modal is opened
//   useEffect(() => {
//     if (batchModalIndex == null) return;
//     const row = rows[batchModalIndex];
//     if (!row) return;

//     const { itemId, sourceWarehouse: wh } = row;
//     if (!itemId || !wh) return;

//     axios
//       .get(`/api/inventory-batch/${itemId}/${wh}`)
//       .then((res) => setBatchOptions(res.data.batches || []))
//       .catch((err) => {
//         if (err.response?.status === 404) {
//           setBatchOptions([]);
//         } else {
//           console.error(err);
//         }
//       });
//   }, [batchModalIndex, rows]);

//   // Update batch selections in rows state
//   const handleUpdateBatch = (updatedBatch = []) => {
//     if (batchModalIndex == null || !rows[batchModalIndex]) return;
//     setRows((prevRows) => {
//       const updated = [...prevRows];
//       updated[batchModalIndex] = {
//         ...updated[batchModalIndex],
//         batches: updatedBatch,
//         batchNumber: updatedBatch.map((b) => b.batchNumber).join(', '),
//       };
//       return updated;
//     });
//     closeBatchModal();
//   };

//   // Calculate totals
//   const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
//   const totalAmount = rows.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);
//   const avgCostPrice = totalQty ? (totalAmount / totalQty).toFixed(2) : 0;

//   // Handle form submission
//   const handleSubmit = useCallback(
//     async (e) => {
//       e.preventDefault();
//       if (!order) {
//         toast.error('Order not loaded');
//         return;
//       }

//       const dataToSend = [];

//       for (const row of rows) {
//         if (row.managedByBatch) {
//           if (!row.batches || row.batches.length === 0) {
//             toast.error(`Please select batches for item ${row.itemCode}`);
//             return;
//           }
//           for (const batch of row.batches) {
//             if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//               toast.error(`Invalid batch quantity or batch number for item ${row.itemCode}`);
//               return;
//             }
//             dataToSend.push({
//               productionOrderId: order._id,
//               itemId: row.itemId,
//               sourceWarehouse: row.sourceWarehouse,
//               destinationWarehouse: order?.warehouse?._id || '',
//               batchNumber: batch.batchNumber,
//               quantity: batch.quantity,
//               expiryDate: batch.expiryDate || null,
//               manufacturer: batch.manufacturer || null,
//               unitPrice: batch.unitPrice || null,
//               managedByBatch: true, // important to include for backend validation
//             });
//           }
//         } else {
//           dataToSend.push({
//             productionOrderId: order._id,
//             itemId: row.itemId,
//             sourceWarehouse: row.sourceWarehouse,
//             destinationWarehouse: order?.warehouse?._id || '',
//             quantity: row.qty,
//             unitPrice: row.unitPrice,
//             batchNumber: '',
//             managedByBatch: false, // important
//           });
//         }
//       }

//       const payload = {
//         avgCostPrice: Number(avgCostPrice),
//         data: dataToSend,
//       };

//       try {
//         await axios.post(`/api/issue-production/${order._id}?qty=${qtyParam}`, payload);
//         toast.success('Stock issued successfully');
//         router.push("/admin/productionorders-list-view");
//       } catch (error) {
//         console.error('API Error:', error.response?.data || error.message);
//         toast.error(error.response?.data?.message || 'Failed to issue for production');
//       }
//     },
//     [rows, order, qtyParam, avgCostPrice, router]
//   );

//   if (loading) return <p>Loading...</p>;
//   if (!order) return <p>Production order not found</p>;

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
//       <ToastContainer />
//       <h1 className="text-2xl font-semibold mb-6">Issue for Production</h1>

//       <form onSubmit={handleSubmit} className="space-y-6">
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label>Document No</label>
//             <input readOnly value={docNo} className="w-full border p-2 bg-gray-100 rounded" />
//           </div>
//           <div>
//             <label>Date</label>
//             <input
//               type="date"
//               value={docDate}
//               onChange={(e) => setDocDate(e.target.value)}
//               className="w-full border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label>Source Warehouse</label>
//             <select
//               value={sourceWarehouse}
//               onChange={(e) => setSourceWarehouse(e.target.value)}
//               required
//               className="w-full border p-2 rounded"
//             >
//               <option value="">-- select --</option>
//               {warehouseOptions.map((w) => (
//                 <option key={w._id} value={w._id}>
//                   {w.warehouseName}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         <table className="w-full text-sm border border-gray-300">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">Item Code</th>
//               <th className="border p-2">Item Name</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Price</th>
//               <th className="border p-2">Total</th>
//               <th className="border p-2">Batch</th>
//               <th className="border p-2">Source</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((r, i) => (
//               <tr key={i} className="hover:bg-gray-50">
//                 <td className="border p-2">{r.itemCode}</td>
//                 <td className="border p-2">{r.itemName}</td>
//                 <td className="border p-2">{r.qty}</td>
//                 <td className="border p-2">{r.unitPrice}</td>
//                 <td className="border p-2">{(r.qty * r.unitPrice).toFixed(2)}</td>
//                 <td className="border p-1">
//                   {r.managedByBatch ? (
//                     <>
//                       <button
//                         type="button"
//                         onClick={() => openBatchModal(i)}
//                         className="px-2 py-1 bg-blue-600 text-white rounded"
//                       >
//                         {r.batchNumber || 'Select Batches'}
//                       </button>
//                       {r.batches?.length > 0 && (
//                         <ul className="mt-1 text-xs">
//                           {r.batches.map((b, idx) => (
//                             <li key={idx}>
//                               Batch: <strong>{b.batchNumber}</strong>, Qty: <strong>{b.quantity}</strong>
//                             </li>
//                           ))}
//                         </ul>
//                       )}
//                     </>
//                   ) : (
//                     <span className="text-gray-500 italic">Not batch-managed</span>
//                   )}
//                 </td>
//                 <td className="border p-1">
//                   <select
//                     className="w-full border p-1 rounded"
//                     value={r.sourceWarehouse}
//                     onChange={(e) => {
//                       const newSrc = e.target.value;
//                       setRows((prev) => {
//                         const copy = [...prev];
//                         copy[i] = { ...copy[i], sourceWarehouse: newSrc };
//                         return copy;
//                       });
//                     }}
//                   >
//                     <option value="">-- select --</option>
//                     {warehouseOptions.map((w) => (
//                       <option key={w._id} value={w._id}>
//                         {w.warehouseName}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         <div className="flex justify-end mt-4">
//           <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 p-4 rounded">
//             <div className="space-y-2 text-sm">
//               <div className="flex justify-between">
//                 <span className="font-medium">Total Quantity:</span>
//                 <span>{totalQty}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="font-medium">Total Amount:</span>
//                 <span>₹ {totalAmount.toFixed(2)}</span>
//               </div>
//               <div className="flex justify-between">
//                 <span className="font-medium">Avg Cost Price:</span>
//                 <span>₹ {avgCostPrice}</span>
//               </div>
//             </div>
//           </div>
//         </div>

//         <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700">
//           Issue for Production
//         </button>
//       </form>

//       {batchModalIndex != null && rows[batchModalIndex] && (
//         <MultiBatchModal
//           itemsbatch={rows[batchModalIndex]}
//           batchOptions={batchOptions}
//           onClose={closeBatchModal}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}
//     </div>
//   );
// }





































// with batch management and UI components

// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useParams, useSearchParams, useRouter } from 'next/navigation';
// import axios from 'axios';
// import MultiBatchModal from '@/components/MultiBatchModalbtach';
// import { toast, ToastContainer } from 'react-toastify';
// import 'react-toastify/dist/ReactToastify.css';

// export default function IssueForProductionPage() {
//   const params = useParams();
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   const orderId = params?.orderId;
//   const qtyParam = Number(searchParams.get('qty')) || 1;

//   const [order, setOrder] = useState(null);
//   const [rows, setRows] = useState([]);
//   const [docNo, setDocNo] = useState('');
//   const [docDate, setDocDate] = useState('');
//   const [warehouseOptions, setWarehouseOptions] = useState([]);
//   const [sourceWarehouse, setSourceWarehouse] = useState('');
//   const [batchModalIndex, setBatchModalIndex] = useState(null);
//   const [batchOptions, setBatchOptions] = useState([]);
//   const [loading, setLoading] = useState(true);

//   // Fetch warehouse options once
//   useEffect(() => {
//     axios
//       .get('/api/warehouse')
//       .then((r) => setWarehouseOptions(r.data))
//       .catch(console.error);
//   }, []);

//   // Fetch the production order and initialize rows
//   useEffect(() => {
//     if (!orderId) return;

//     (async () => {
//       try {
//         const { data: ord } = await axios.get(`/api/production-orders/${orderId}`);
//         setOrder(ord);

//         // Generate document number and date
//         const todayStr = new Date().toISOString().slice(0, 10);
//         const docNoFormatted = `IP-${todayStr.replace(/-/g, '')}-${orderId.slice(-4)}`;
//         setDocNo(docNoFormatted);
//         setDocDate(todayStr);

//         // Determine source warehouse from the order
//         const sw = ord.warehouse?._id || ord.warehouse || '';
//         setSourceWarehouse(sw);

//         // Build initial rows array
//         setRows(
//           ord.items.map((item) => ({
//             itemId: item.item?._id || item.item || '',
//             itemCode: item.itemCode,
//             itemName: item.itemName,
//             unitPrice: item.item?.unitPrice || 0,
//             uom: item.unitQty > 1 ? `x${item.unitQty}` : 'pcs',
//             qty: qtyParam * item.quantity,
//             batches: [],
//             batchNumber: '',
//             sourceWarehouse: sw,
//             managedByBatch: item.managedBy === 'batch',
//           }))
//         );
//       } catch (e) {
//         console.error(e);
//       } finally {
//         setLoading(false);
//       }
//     })();
//   }, [orderId, qtyParam]);

//   // Open and close batch modal
//   const openBatchModal = useCallback((idx) => {
//     setBatchModalIndex(idx);
//   }, []);
//   const closeBatchModal = useCallback(() => {
//     setBatchModalIndex(null);
//   }, []);

//   // When batchModalIndex changes, fetch batches for that row
//   useEffect(() => {
//     if (batchModalIndex == null) return;
//     const row = rows[batchModalIndex];
//     if (!row) return;

//     const { itemId, sourceWarehouse: wh } = row;
//     if (!itemId || !wh) return;

//     axios
//       .get(`/api/inventory-batch/${itemId}/${wh}`)
//       .then((r) => setBatchOptions(r.data.batches || []))
//       .catch((err) => {
//         if (err.response?.status === 404) {
//           setBatchOptions([]);
//         } else {
//           console.error(err);
//         }
//       });
//   }, [batchModalIndex, rows]);

//   // Update the row when the modal returns selected batches
//   const handleUpdateBatch = (updatedBatch = []) => {
//     if (batchModalIndex == null || !rows[batchModalIndex]) return;
//     setRows((prevRows) => {
//       const updated = [...prevRows];
//       updated[batchModalIndex] = {
//         ...updated[batchModalIndex],
//         batches: updatedBatch,
//         batchNumber: updatedBatch.map((b) => b.batchNumber).join(', '),
//       };
//       return updated;
//     });
//     closeBatchModal();
//   };
//       const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
//     const totalAmount = rows.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);
//     const avgCostPrice = totalQty ? (totalAmount / totalQty).toFixed(2) : 0;

//   // Submit handler
//   // const handleSubmit = useCallback(
//   //   async (e) => {
//   //     e.preventDefault();
//   //     if (!order) {
//   //       toast.error('Order not loaded');
//   //       return;
//   //     }

//   //     const dataToSend = [];
//   //     for (const row of rows) {
//   //       if (!row.batches || row.batches.length === 0) {
//   //         toast.error(`Please select batches for item ${row.itemCode}`);
//   //         return;
//   //       }
//   //       for (const batch of row.batches) {
//   //         if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//   //           toast.error(`Invalid batch quantity or batch number for item ${row.itemCode}`);
//   //           return;
//   //         }
//   //         dataToSend.push({
//   //           productionOrderId: order._id,
       
//   //           itemId: row.itemId,
//   //           sourceWarehouse: row.sourceWarehouse,
//   //           destinationWarehouse: row.destination,
//   //           batchNumber: batch.batchNumber,
//   //           quantity: batch.quantity,
//   //           expiryDate: batch.expiryDate || null,
//   //           manufacturer: batch.manufacturer || null,
//   //           unitPrice: batch.unitPrice || null,
//   //         });
//   //       }
//   //     }

//   //     try {
//   //       await axios.post(`/api/issue-production/${order._id}?qty=${qtyParam}`, dataToSend);
//   //       toast.success('Stock issued successfully');
//   //       // Optionally navigate back after success:
//   //       // router.push('/admin/productionorders-list-view');
//   //     } catch (error) {
//   //       console.error(error);
//   //       const message = error.response?.data?.message || 'Failed to transfer stock';
//   //       toast.error(message);
//   //     }
//   //   },
//   //   [rows, order, qtyParam, router]
//   // );
// const handleSubmit = useCallback(
//   async (e) => {
//     e.preventDefault();
//     if (!order) {
//       toast.error('Order not loaded');
//       return;
//     }

//     const dataToSend = [];

//     for (const row of rows) {
//       if (!row.batches || row.batches.length === 0) {
//         toast.error(`Please select batches for item ${row.itemCode}`);
//         return;
//       }
//       for (const batch of row.batches) {
//         if (!batch.batchNumber || !batch.quantity || batch.quantity <= 0) {
//           toast.error(`Invalid batch quantity or batch number for item ${row.itemCode}`);
//           return;
//         }
//         dataToSend.push({
//           productionOrderId: order._id,
//           itemId: row.itemId,
//           sourceWarehouse: row.sourceWarehouse,
//           destinationWarehouse: row.destination,
//           batchNumber: batch.batchNumber,
//           quantity: batch.quantity,
//           expiryDate: batch.expiryDate || null,
//           manufacturer: batch.manufacturer || null,
//           unitPrice: batch.unitPrice || null,
//         });
//       }
//     }

//     // Add avgCostPrice separately
//     const payload = {
//       avgCostPrice: Number(avgCostPrice), // convert from string to number
//       data: dataToSend,
//     };

//     try {
//       await axios.post(`/api/issue-production/${order._id}?qty=${qtyParam}`, payload);
//       toast.success('Stock issued successfully');
//     } catch (error) {
//       console.error(error);
//       const message = error.response?.data?.message || 'Failed to transfer stock';
//       toast.error(message);
//     }
//   },
//   [rows, order, qtyParam, avgCostPrice, router]
// );



//   if (loading) return <p>Loading...</p>;
//   if (!order) return <p>Production order not found</p>;

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
//       <ToastContainer />
//       <h1 className="text-2xl font-semibold mb-6">Issue for Production</h1>

//       <form onSubmit={handleSubmit} className="space-y-6">
//         {/* Header Section */}
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label>Document No</label>
//             <input
//               readOnly
//               value={docNo}
//               className="w-full border p-2 bg-gray-100 rounded"
//             />
//           </div>
//           <div>
//             <label>Date</label>
//             <input
//               type="date"
//               value={docDate}
//               onChange={(e) => setDocDate(e.target.value)}
//               className="w-full border p-2 rounded"
//             />
//           </div>
//           <div>
//             <label>Source Warehouse</label>
//             <select
//               value={sourceWarehouse}
//               onChange={(e) => setSourceWarehouse(e.target.value)}
//               required
//               className="w-full border p-2 rounded"
//             >
//               <option value="">-- select --</option>
//               {warehouseOptions.map((w) => (
//                 <option key={w._id} value={w._id}>
//                   {w.warehouseName}
//                 </option>
//               ))}
//             </select>
//           </div>
//         </div>

//         {/* Items Table */}
//         <table className="w-full text-sm border border-gray-300">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="border p-2">Item Code</th>
//               <th className="border p-2">Item Name</th>
//               <th className="border p-2">Qty</th>
//               <th className="border p-2">Price</th>
//               <th className="border p-2">Total</th>
//               <th className="border p-2">Batch</th>
//               <th className="border p-2">Source</th>
//             </tr>
//           </thead>
//           <tbody>
//             {rows.map((r, i) => (
//               <tr key={i} className="hover:bg-gray-50">
//                 <td className="border p-2">{r.itemCode}</td>
//                 <td className="border p-2">{r.itemName}</td>
//                 <td className="border p-2">{r.qty}</td>
//                 <td className="border p-2">{r.unitPrice}</td>
//                 <td className="border p-2">{(r.qty * r.unitPrice).toFixed(2)}</td>
//                 <td className="border p-1">
//                   <button
//                     type="button"
//                     onClick={() => openBatchModal(i)}
//                     className="px-2 py-1 bg-blue-600 text-white rounded"
//                   >
//                     {r.batchNumber || 'Select Batches'}
//                   </button>
//                   {r.batches?.length > 0 && (
//                     <ul className="mt-1 text-xs">
//                       {r.batches.map((b, idx) => (
//                         <li key={idx}>
//                           Batch: <strong>{b.batchNumber}</strong>, Qty: <strong>{b.quantity}</strong>
//                         </li>
//                       ))}
//                     </ul>
//                   )}
//                 </td>
//                 <td className="border p-1">
//                   <select
//                     className="w-full border p-1 rounded"
//                     value={r.sourceWarehouse}
//                     onChange={(e) => {
//                       const newSrc = e.target.value;
//                       setRows((prev) => {
//                         const copy = [...prev];
//                         copy[i] = { ...copy[i], sourceWarehouse: newSrc };
//                         return copy;
//                       });
//                     }}
//                   >
//                     <option value="">-- select --</option>
//                     {warehouseOptions.map((w) => (
//                       <option key={w._id} value={w._id}>
//                         {w.warehouseName}
//                       </option>
//                     ))}
//                   </select>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>

//         {/* Items Summary */}
//         <div className="flex justify-end mt-4">
//           <div className="w-full md:w-1/3 bg-gray-50 border border-gray-200 p-4 rounded">
//             {(() => {
//               // const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
//               // const totalAmount = rows.reduce((sum, row) => sum + row.qty * row.unitPrice, 0);
//               // const avgCostPrice = totalQty ? (totalAmount / totalQty).toFixed(2) : 0;

//               return (
//                 <div className="space-y-2 text-sm">
//                   <div className="flex justify-between">
//                     <span className="font-medium">Total Quantity:</span>
//                     <span>{totalQty}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span className="font-medium">Total Amount:</span>
//                     <span>₹ {totalAmount.toFixed(2)}</span>
//                   </div>
//                   <div className="flex justify-between">
//                     <span className="font-medium">Avg Cost Price (Total/Qty):</span>
//                     <span>₹ {avgCostPrice}</span>
//                   </div>
//                 </div>
//               );
//             })()}
//           </div>
//         </div>

//         <button
//           type="submit"
//           className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
//         >
//           Issue for Production
//         </button>
//       </form>

//       {batchModalIndex != null && rows[batchModalIndex] && (
//         <MultiBatchModal
//           itemsbatch={rows[batchModalIndex]}
//           batchOptions={batchOptions}
//           onClose={closeBatchModal}
//           onUpdateBatch={handleUpdateBatch}
//         />
//       )}
//     </div>
//   );
// }


