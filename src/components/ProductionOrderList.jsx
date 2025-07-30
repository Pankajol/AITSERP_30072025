"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { Pencil, Trash2, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [transferQty, setTransferQty] = useState(0);
  const [currentOrder, setCurrentOrder] = useState(null);
  const router = useRouter();

  useEffect(() => {
    axios
      .get("/api/production-orders")
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const openModal = (order, type) => {
    setCurrentOrder(order);
    setModalType(type);

    let balanceQty = 0;
    if (type === "transfer") {
      balanceQty = order.quantity - (order.transferqty || 0);
    } else if (type === "issue") {
      balanceQty = order.transferqty - (order.issuforproductionqty || 0);
    } else if (type === "receipt") {
      balanceQty = order.issuforproductionqty - (order.reciptforproductionqty || 0);
    }

    setTransferQty(balanceQty);
    setModalOpen(true);
  };

  const handleModalConfirm = () => {
    if (!currentOrder) return;

    let maxQty = 0;
    if (modalType === "transfer") {
      maxQty = currentOrder.quantity - (currentOrder.transferqty || 0);
    } else if (modalType === "issue") {
      maxQty = currentOrder.transferqty - (currentOrder.issuforproductionqty || 0);
    } else if (modalType === "receipt") {
      maxQty = currentOrder.issuforproductionqty - (currentOrder.reciptforproductionqty || 0);
    }

    if (transferQty < 1 || transferQty > maxQty) {
      alert(`Please enter a quantity between 1 and ${maxQty}`);
      return;
    }

    let url = "";
    if (modalType === "transfer") {
      url = `/admin/stock-transfer/${currentOrder._id}?qty=${transferQty}`;
    } else if (modalType === "issue") {
      url = `/admin/issue-production/${currentOrder._id}?qty=${transferQty}`;
    } else if (modalType === "receipt") {
      url = `/admin/receipt-production/${currentOrder._id}?qty=${transferQty}`;
    }

    if (url) router.push(url);

    setModalOpen(false);
    setSelectedAction((prev) => ({ ...prev, [currentOrder._id]: "" }));
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this order?")) return;
    try {
      await axios.delete(`/api/production-orders/${id}`);
      setOrders((prev) => prev.filter((o) => o._id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  const onActionChange = (id, action) => {
    setSelectedAction((prev) => ({ ...prev, [id]: action }));
    const order = orders.find((o) => o._id === id);

    if (action === "stockTransfer") openModal(order, "transfer");
    else if (action === "issueProduction") openModal(order, "issue");
    else if (action === "receiptProduction") openModal(order, "receipt");
  };

  const renderModal = () => {
    if (!modalOpen || !currentOrder) return null;

    const getMaxQty = () => {
      if (modalType === "transfer") {
        return currentOrder.quantity - (currentOrder.transferqty || 0);
      }
      if (modalType === "issue") {
        return currentOrder.transferqty - (currentOrder.issuforproductionqty || 0);
      }
      if (modalType === "receipt") {
        return currentOrder.issuforproductionqty - (currentOrder.reciptforproductionqty || 0);
      }
      return 0;
    };

    const maxQty = getMaxQty();

    const renderInput = (label) => (
      <>
        <h2 className="text-lg font-semibold mb-4">{label}</h2>
        <p className="mb-2">Enter quantity (Max: {maxQty}):</p>
        <input
          type="number"
          min={1}
          max={maxQty}
          value={transferQty}
          onChange={(e) => setTransferQty(Number(e.target.value))}
          className="w-full border p-2 rounded mb-4"
        />
      </>
    );

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded shadow w-80">
          {modalType === "transfer" && renderInput("Confirm Stock Transfer")}
          {modalType === "issue" && renderInput("Confirm Issue for Production")}
          {modalType === "receipt" && renderInput("Confirm Receipt from Production")}
          <div className="flex justify-end gap-2">
            <button onClick={() => setModalOpen(false)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
            <button onClick={handleModalConfirm} className="px-3 py-1 bg-blue-600 text-white rounded">Confirm</button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <p>Loading production orders…</p>;

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
      <h1 className="text-2xl font-semibold mb-6">Production Orders</h1>
      <table className="w-full table-auto border-collapse text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border p-2">#</th>
            <th className="border p-2">Product</th>
            <th className="border p-2">Quantity</th>
            <th className="border p-2">Transfer Qty</th>
            <th className="border p-2">Issue Qty</th>
            <th className="border p-2">Receipt Qty</th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => {
            const sel = selectedAction[o._id] || "";

            const transfer = o.transferqty || 0;
            const issue = o.issuforproductionqty || 0;
            const receipt = o.reciptforproductionqty || 0;
            const quantity = o.quantity;

            const canIssue = transfer > issue;
            const canReceipt = issue > receipt;

            let status = "planned";
            if (transfer > 0 && issue === 0 && receipt === 0) status = "transferred";
            else if (issue > 0 && receipt === 0) status = "issued";
            else if (receipt > 0 && receipt < quantity) status = "partially received";
            else if (transfer === quantity && issue === quantity && receipt === quantity) status = "closed";
            else status = "partially completed";

            return (
              <tr key={o._id} className="hover:bg-gray-50">
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{o.productDesc || o.bomId}</td>
                <td className="border p-2 text-right">{quantity}</td>
                <td className="border p-2 text-right">{transfer}</td>
                <td className="border p-2 text-right">{issue}</td>
                <td className="border p-2 text-right">{receipt}</td>
                <td className="border p-2">{new Date(o.productionDate).toLocaleDateString()}</td>
                <td className="border p-2 capitalize">{status}</td>
                <td className="border p-2 flex items-center gap-2">
                  {status === "planned" ? (
                    <a href={`/admin/ProductionOrder/${o._id}`} className="text-green-600 flex items-center gap-1">
                      <Pencil size={16} /> Update
                    </a>
                  ) : (
                    <select
                      className="border p-1 rounded bg-gray-50"
                      value={sel}
                      onChange={(e) => onActionChange(o._id, e.target.value)}
                    >
                      <option value="">— Actions —</option>
                      <option value="stockTransfer">Stock Transfer</option>
                      <option value="issueProduction" disabled={!canIssue}>Issue for Production</option>
                      <option value="receiptProduction" disabled={!canReceipt}>Receipt from Production</option>
                    </select>
                  )}

                  <a href={`/admin/productionorderdetail-view/${o._id}`} className="text-blue-600 flex items-center gap-1">
                    <Eye size={16} /> View
                  </a>

                  <button onClick={() => handleDelete(o._id)} className="text-red-600 flex items-center gap-1">
                    <Trash2 size={16} /> Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {renderModal()}
    </div>
  );
}








// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { Pencil, Trash2, Eye } from "lucide-react";
// import { useRouter } from "next/navigation";

// export default function ProductionOrdersPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedAction, setSelectedAction] = useState({});
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalType, setModalType] = useState(null); // 'transfer' | 'issue' | 'receipt'
//   const [transferQty, setTransferQty] = useState(0);
//   const [currentOrder, setCurrentOrder] = useState(null);

//   const router = useRouter();

//   useEffect(() => {
//     axios
//       .get("/api/production-orders")
//       .then((res) => setOrders(res.data))
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, []);

//   const openModal = (order, type) => {
//     setCurrentOrder(order);
//     setModalType(type);
//     if (type === "transfer") {
//       const balanceQty = order.quantity - (order.transferqty || 0);
//       setTransferQty(balanceQty);
//     }
//     setModalOpen(true);
//   };

// const handleModalConfirm = () => {
//   if (!currentOrder) return;

//   let maxQty = 0;
//   if (modalType === "transfer") {
//     maxQty = currentOrder.quantity - (currentOrder.transferqty || 0);
//   } else if (modalType === "issue") {
//     maxQty = currentOrder.transferqty - (currentOrder.issueqty || 0);
//   } else if (modalType === "receipt") {
//     maxQty = currentOrder.issueqty - (currentOrder.receiptqty || 0);
//   }

//   if (transferQty < 1 || transferQty > maxQty) {
//     alert(`Please enter a quantity between 1 and ${maxQty}`);
//     return;
//   }

//   let url = "";
//   if (modalType === "transfer") {
//     url = `/admin/stock-transfer/${currentOrder._id}?qty=${transferQty}`;
//   } else if (modalType === "issue") {
//     url = `/admin/issue-production/${currentOrder._id}?qty=${transferQty}`;
//   } else if (modalType === "receipt") {
//     url = `/admin/receipt-production/${currentOrder._id}?qty=${transferQty}`;
//   }

//   if (url) {
//     router.push(url);
//   }

//   setModalOpen(false);
//   setSelectedAction((prev) => ({ ...prev, [currentOrder._id]: "" }));
// };



//   const handleDelete = async (id) => {
//     if (!confirm("Delete this order?")) return;
//     try {
//       await axios.delete(`/api/production-orders/${id}`);
//       setOrders((prev) => prev.filter((o) => o._id !== id));
//     } catch (err) {
//       console.error(err);
//       alert("Delete failed");
//     }
//   };

//   const onActionChange = (id, action) => {
//     setSelectedAction((prev) => ({ ...prev, [id]: action }));
//     const order = orders.find((o) => o._id === id);

//     if (action === "stockTransfer") openModal(order, "transfer");
//     else if (action === "issueProduction") openModal(order, "issue");
//     else if (action === "receiptProduction") openModal(order, "receipt");
//   };
// const renderModal = () => {
//   if (!modalOpen || !currentOrder) return null;

//   const getMaxQty = () => {
//     if (modalType === "transfer") {
//       return currentOrder.quantity - (currentOrder.transferqty || 0);
//     }
//     if (modalType === "issue") {
//       return currentOrder.transferqty - (currentOrder.issueqty || 0);
//     }
//     if (modalType === "receipt") {
//       return currentOrder.issueqty - (currentOrder.receiptqty || 0);
//     }
//     return 0;
//   };

//   const maxQty = getMaxQty();

//   const renderInput = (label) => (
//     <>
//       <h2 className="text-lg font-semibold mb-4">{label}</h2>
//       <p className="mb-2">Enter quantity (Max: {maxQty}):</p>
//       <input
//         type="number"
//         min={1}
//         max={maxQty}
//         value={transferQty}
//         onChange={(e) => setTransferQty(Number(e.target.value))}
//         className="w-full border p-2 rounded mb-4"
//       />
//     </>
//   );

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//       <div className="bg-white p-6 rounded shadow w-80">
//         {modalType === "transfer" && renderInput("Confirm Stock Transfer")}
//         {modalType === "issue" && renderInput("Confirm Issue for Production")}
//         {modalType === "receipt" && renderInput("Confirm Receipt from Production")}

//         <div className="flex justify-end gap-2">
//           <button onClick={() => setModalOpen(false)} className="px-3 py-1 bg-gray-200 rounded">Cancel</button>
//           <button onClick={handleModalConfirm} className="px-3 py-1 bg-blue-600 text-white rounded">Confirm</button>
//         </div>
//       </div>
//     </div>
//   );
// };


//   if (loading) return <p>Loading production orders…</p>;

//   return (
//     <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded">
//       <h1 className="text-2xl font-semibold mb-6">Production Orders</h1>
//       <table className="w-full table-auto border-collapse text-sm">
//         <thead className="bg-gray-100">
//           <tr>
//             <th className="border p-2">#</th>
//             <th className="border p-2">Product</th>
//             <th className="border p-2">Quantity</th>
//             <th className="border p-2">Transfer Qty</th>
//             <th className="border p-2">TIP Qty</th>
//             <th className="border p-2">Date</th>
//             <th className="border p-2">Status</th>
//             <th className="border p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {orders.map((o, idx) => {
//             const sel = selectedAction[o._id] || "";
//             const canIssue = o.status === "transferred";
//             const canReceipt = o.status === "issued";

//             return (
//               <tr key={o._id} className="hover:bg-gray-50">
//                 <td className="border p-2 text-center">{idx + 1}</td>
//                 <td className="border p-2">{o.productDesc || o.bomId}</td>
//                 <td className="border p-2 text-right">{o.quantity}</td>
//                 <td className="border p-2 text-right">{o.transferqty || 0}</td>
//                      <td className="border p-2 text-right">{o.issuforproductionqty || 0}</td>
//                 <td className="border p-2">{new Date(o.productionDate).toLocaleDateString()}</td>
//                 <td className="border p-2">{o.status}</td>
//                 <td className="border p-2 flex items-center gap-2">
//                   {o.status === "planned" ? (
//                     <a href={`/admin/ProductionOrder/${o._id}`} className="text-green-600 flex items-center gap-1">
//                       <Pencil size={16} /> Update
//                     </a>
//                   ) : (
//                     <select
//                       className="border p-1 rounded bg-gray-50"
//                       value={sel}
//                       onChange={(e) => onActionChange(o._id, e.target.value)}
//                     >
//                       <option value="">— Actions —</option>
//                       <option value="stockTransfer">Stock Transfer</option>
//                       <option value="issueProduction" disabled={!canIssue}>Issue for Production</option>
//                       <option value="receiptProduction" disabled={!canReceipt}>Receipt from Production</option>
//                     </select>
//                   )}

//                   <a href={`/admin/productionorderdetail-view/${o._id}`} className="text-blue-600 flex items-center gap-1">
//                     <Eye size={16} /> View
//                   </a>

//                   <button onClick={() => handleDelete(o._id)} className="text-red-600 flex items-center gap-1">
//                     <Trash2 size={16} /> Delete
//                   </button>
//                 </td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>

//       {renderModal()}
//     </div>
//   );
// }
