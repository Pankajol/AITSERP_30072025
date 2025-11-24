"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import { useRouter } from "next/navigation"; // Added for navigation

// --- Helper Components ---

const ToastifyCSS = () => (
  <style>{`
    .Toastify__toast-container { z-index: 9999; }
    .Toastify__toast { background: #fff; color: #1a1a1a; border-radius: 4px; box-shadow: 0 1px 10px 0 rgba(0,0,0,.1), 0 2px 15px 0 rgba(0,0,0,.05); }
    .Toastify__toast--success { background: #07bc0c; color: #fff; }
    .Toastify__toast--error { background: #e74c3c; color: #fff; }
    .Toastify__toast--warn { background: #f1c40f; color: #fff; }
    .Toastify__toast--info { background: #3498db; color: #fff; }
    .Toastify__close-button { color: inherit; opacity: 0.7; }
  `}</style>
);

const Modal = ({ children, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
    <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
      {children}
    </div>
  </div>
);

// --- Create Job Card Modal ---

const CreateJobCardModal = ({ order, createdOpCounts, onClose, onConfirm }) => {
  const [selectedOperations, setSelectedOperations] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter only operations without job cards
  const availableOperations = (order.operationFlow || []).filter((op, idx) => {
    const opId = typeof op.operation === "object" ? op.operation._id : op.operation;
    const createdCount = createdOpCounts[opId] || 0;
    return createdCount < 1; // show only if no job card exists
  });

  const handleSelection = (uniqueKey) => {
    setSelectedOperations((prev) =>
      prev.includes(uniqueKey) ? prev.filter((id) => id !== uniqueKey) : [...prev, uniqueKey]
    );
  };

  const handleSubmit = async () => {
    if (selectedOperations.length === 0) {
      toast.warn("Please select at least one operation.");
      return;
    }
    setIsSubmitting(true);

    const opsToCreate = selectedOperations.map((uniqueKey) => {
      // Find the correct operation from availableOperations
      const opIndex = parseInt(uniqueKey.split('-').pop(), 10);
      const foundOp = availableOperations[opIndex];
      // Ensure we use the same uniqueKey logic to find it
      const opId = typeof foundOp.operation === "object" ? foundOp.operation._id : foundOp.operation;
      if (`${opId}-${opIndex}` === uniqueKey) {
        return foundOp;
      }
      return null;
    }).filter(Boolean); // Filter out any nulls if logic mismatched
    
    await onConfirm(opsToCreate);
    setIsSubmitting(false);
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">Create Job Cards for Order</h2>

      {availableOperations.length > 0 ? (
        <div className="space-y-2 max-h-80 overflow-y-auto border p-2 rounded">
          {availableOperations.map((op, idx) => {
            // Determine operation ID
            const opId = typeof op.operation === "object" ? op.operation._id : op.operation;
            
            // Determine operation name
            let opName = `Operation ${idx + 1}`;
            if (op.operation && typeof op.operation === "object") opName = op.operation.name;
            else if (op.name) opName = op.name;

            const uniqueKey = `${opId}-${idx}`;
            const isSelected = selectedOperations.includes(uniqueKey);

            return (
              <div key={uniqueKey} className="flex justify-between items-center p-2 rounded hover:bg-gray-100">
                <label htmlFor={uniqueKey} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id={uniqueKey}
                    checked={isSelected}
                    onChange={() => handleSelection(uniqueKey)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-gray-700">{opName}</span>
                </label>
                <span className={`px-2 py-1 text-xs rounded ${isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
                  {isSelected ? "Selected" : "Available"}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-gray-600">All operations for this order already have job cards.</p>
      )}

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting || availableOperations.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          Create Selected
        </button>
      </div>
    </Modal>
  );
};

// --- NEW Quantity Modal (from File 2 logic) ---

const QuantityModal = ({ order, type, onClose, onConfirm }) => {
  const [title, setTitle] = useState("");
  const [maxQty, setMaxQty] = useState(0);
  const [quantity, setQuantity] = useState(0);

  useEffect(() => {
    let newTitle = "";
    let newMaxQty = 0;

    if (type === "stockTransfer") {
      newTitle = "Confirm Stock Transfer";
      newMaxQty = order.quantity - (order.transferqty || 0);
    } else if (type === "issueProduction") {
      newTitle = "Confirm Issue for Production";
      newMaxQty = (order.transferqty || 0) - (order.issuforproductionqty || 0);
    } else if (type === "receiptProduction") {
      newTitle = "Confirm Receipt from Production";
      newMaxQty = (order.issuforproductionqty || 0) - (order.reciptforproductionqty || 0);
    }

    setTitle(newTitle);
    setMaxQty(newMaxQty);
    setQuantity(newMaxQty); // Default to max available quantity
  }, [order, type]);

  const handleSubmit = () => {
    if (quantity < 1 || quantity > maxQty) {
      toast.error(`Please enter a quantity between 1 and ${maxQty}`);
      return;
    }
    onConfirm(quantity);
  };

  return (
    <Modal onClose={onClose}>
      <h2 className="text-xl font-bold mb-4">{title}</h2>
      <div className="space-y-4">
        <label className="block">
          <span className="text-gray-700">Enter quantity (Max: {maxQty})</span>
          <input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full border p-2 rounded mt-1"
          />
        </label>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={maxQty <= 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
};


// --- Main Production Orders Page ---

export default function ProductionOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobCardDetails, setJobCardDetails] = useState({});
  const [modalState, setModalState] = useState({ isOpen: false, type: null, order: null });
  const router = useRouter(); // Initialized router

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return toast.error("Authentication token not found.");
      const res = await axios.get("/api/production-orders", { headers: { Authorization: `Bearer ${token}` } });
      setOrders(res.data);
    } catch (err) {
      toast.error("Failed to fetch production orders.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchJobCardDetailsForOrder = useCallback(async (order) => {
    const orderId = order._id;
    setJobCardDetails(prev => ({ ...prev, [orderId]: { status: 'loading' } }));
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axios.get(`/api/ppc/jobcards?productionOrderId=${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
      const jobCards = res.data.data || [];

      const createdOpCounts = jobCards.reduce((acc, jc) => {
        const opId = jc.operation?._id?.toString() || jc.operation?.toString();
        if (opId) acc[opId] = (acc[opId] || 0) + 1;
        return acc;
      }, {});

      setJobCardDetails(prev => ({
        ...prev,
        [orderId]: {
          status: 'loaded',
          createdCount: jobCards.length,
          totalCount: order?.operationFlow?.length || 0,
          createdOpCounts,
        }
      }));
    } catch (err) {
      console.error(err);
      setJobCardDetails(prev => ({
        ...prev,
        [orderId]: {
          status: 'loaded',
          createdCount: 0,
          totalCount: order?.operationFlow?.length || 0,
          createdOpCounts: {},
        }
      }));
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { 
    if (orders.length > 0) {
      orders.forEach(order => {
        if (!jobCardDetails[order._id]) { // Fetch only if not already fetched
          fetchJobCardDetailsForOrder(order);
        }
      });
    }
  }, [orders, fetchJobCardDetailsForOrder, jobCardDetails]);



const handleCreateJobCards = async (operationsToCreate) => {
  const { order } = modalState;
  if (!order) return;

  try {
    const token = localStorage.getItem("token");
    if (!token) return toast.error("Missing token");

    // ✅ Log to inspect operations before payload creation
    console.log("🔍 Operations to Create:", operationsToCreate);

    const payload = {
      productionOrderId: order._id,
      operations: operationsToCreate.map((opFlow, index) => {
        // Convert to Date if string (for safety)
        const expectedStart = opFlow.expectedStartDate
          ? new Date(opFlow.expectedStartDate)
          : null;
        const expectedEnd = opFlow.expectedEndDate
          ? new Date(opFlow.expectedEndDate)
          : null;

        console.log(`🧩 Operation ${index + 1}:`, {
          operationId: opFlow.operation?._id || opFlow.operation,
          machineId: opFlow.machine?._id || opFlow.machine,
          operatorId: opFlow.operator?._id || opFlow.operator,
          qtyToManufacture: order.quantity,
          expectedStartDate: expectedStart,
          expectedEndDate: expectedEnd,
        });

        return {
          operationId: opFlow.operation?._id || opFlow.operation,
          machineId: opFlow.machine?._id || opFlow.machine,
          operatorId: opFlow.operator?._id || opFlow.operator,
          qtyToManufacture: order.quantity,
          expectedStartDate: expectedStart,
          expectedEndDate: expectedEnd,
        };
      }),
    };

    console.log("📦 Final Payload to POST:", payload);

    const res = await axios.post("/api/ppc/jobcards", payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.data.success) {
      toast.success(`${res.data.data.length} job card(s) created successfully.`);
      fetchJobCardDetailsForOrder(order);
      setModalState({ isOpen: false, type: null, order: null });
    } else {
      toast.error(res.data.error || "Failed to create job cards.");
    }
  } catch (err) {
    console.error("❌ Error creating job cards:", err);
    toast.error(err.response?.data?.error || "Server error while creating job cards.");
  }
};




  // --- NEW Handler for Quantity Modals ---
  const handleQuantityModalSubmit = (quantity) => {
    const { order, type } = modalState;
    if (!order || !type || quantity <= 0) return;

    let url = "";
    if (type === "stockTransfer") {
      url = `/admin/stock-transfer/${order._id}?qty=${quantity}`;
    } else if (type === "issueProduction") {
      url = `/admin/issue-production/${order._id}?qty=${quantity}`;
    } else if (type === "receiptProduction") {
      url = `/admin/receipt-production/${order._id}?qty=${quantity}`;
    }

    if (url) {
      router.push(url);
    }

    setModalState({ isOpen: false, type: null, order: null });
  };
  
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/production-orders/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("Deleted successfully");
      fetchOrders(); // Refetch all orders
    } catch (err) { 
      toast.error(err.response?.data?.error || "Failed to delete"); 
    }
  };


  if (loading) return <p className="text-center mt-8">Loading Production Orders...</p>;

  return (
    <>
      <ToastifyCSS />
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
      <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded-lg">
        <h1 className="text-3xl font-bold mb-6 text-gray-800">Production Orders</h1>
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2 text-left">#</th>
                <th className="border p-2 text-left">Order No.</th>
                <th className="border p-2 text-left">Product</th>
                <th className="border p-2 text-right">Qty</th>
                <th className="border p-2 text-right">Transferred</th>
                <th className="border p-2 text-right">Issued</th>
                <th className="border p-2 text-right">Received</th>
                <th className="border p-2 text-left">Date</th>
                
                <th className="border p-2 text-left">Status</th>
                <th className="border p-2 text-center">Job Cards</th>
                <th className="border p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order, idx) => {
                const details = jobCardDetails[order._id] || {};
                const displayCreatedCount = Math.min(details.createdCount || 0, details.totalCount || 0);
                const allJobCardsCreated = details.totalCount > 0 && displayCreatedCount >= details.totalCount;

                let status = "planned";
                if (order.reciptforproductionqty === order.quantity) status = "closed";
                else if (order.reciptforproductionqty > 0) status = "partially received";
                else if (order.issuforproductionqty > 0) status = "issued";
                else if (order.transferqty > 0) status = "transferred";
                
                const canTransfer = order.quantity > (order.transferqty || 0);
                const canIssue = (order.transferqty || 0) > (order.issuforproductionqty || 0);
                const canReceipt = (order.issuforproductionqty || 0) > (order.reciptforproductionqty || 0);

                return (
                  <tr key={order._id} className="hover:bg-gray-50 text-sm">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{order.productionDocNo || "N/A"}</td>
                    <td className="border p-2">
                  {typeof order.productDesc === "string"
                    ? order.productDesc
                    : order.productDesc?.name ||
                      order.productDesc?.code ||
                      order.bomId?.bomName ||
                      "N/A"}
                </td>
                    <td className="border p-2 text-right">{order.quantity}</td>
                    <td className="border p-2 text-right">{order.transferqty || 0}</td>
                    <td className="border p-2 text-right">{order.issuforproductionqty || 0}</td>
                    <td className="border p-2 text-right">{order.reciptforproductionqty || 0}</td>
                    <td className="border p-2">{new Date(order.productionDate).toLocaleDateString()}</td>
                    <td className="border p-2 capitalize">{status}</td>
                    <td className="border p-2 text-center font-medium">
                      {details.status === 'loading' && <Loader2 className="animate-spin mx-auto" size={16} />}
                      {details.status === 'loaded' && details.totalCount > 0 && (
                        <span className={allJobCardsCreated ? "text-green-600" : "text-blue-600"}>
                          {displayCreatedCount} / {details.totalCount}
                        </span>
                      )}
                      {details.status === 'loaded' && details.totalCount === 0 && <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="border p-2">
                      <div className="flex items-center gap-2">
                        <select
                          className="border p-1 rounded bg-gray-50 text-xs w-full"
                          value="" // Always reset to show placeholder
                          onChange={e => {
                            const action = e.target.value;
                            if (!action) return;
                            if (action === "viewJobCards") window.location.href = `/admin/ppc/jobcards/jobcardlists?productionOrderId=${order._id}`;
                            // For all other actions, set modal state
                            else setModalState({ isOpen: true, type: action, order });
                          }}
                          disabled={status === "closed"}
                        >
                          <option value="">— Actions —</option>
                          <option value="stockTransfer" disabled={!canTransfer}>Stock Transfer</option>
                          <option value="issueProduction" disabled={!canIssue}>Issue for Production</option>
                          <option value="receiptProduction" disabled={!canReceipt}>Receipt from Production</option>
                          {details.createdCount > 0 && <option value="viewJobCards">View Job Cards</option>}
                          {order.operationFlow?.length > 0 && !allJobCardsCreated && <option value="createJobCard">Create Job Card</option>}
                        </select>

                   {status === "planned" && (
  <a
    href={`/admin/ProductionOrder?id=${order._id}`} 
    className="text-green-600 hover:text-green-800"
    title="Edit Order"
  >
    <Pencil size={16} />
  </a>
)}
                        <a href={`/admin/ProductionOrder/view?id=${order._id}`} className="text-blue-600" title="View Details"><Eye size={16} /></a>
                        <button 
                          onClick={() => handleDelete(order._id)} 
                          disabled={status !== 'planned'} 
                          className={status !== 'planned' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'} 
                          title="Delete Order"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* --- Modal Rendering Logic --- */}
        {modalState.isOpen && modalState.type === 'createJobCard' && (
          <CreateJobCardModal
            order={modalState.order}
            createdOpCounts={jobCardDetails[modalState.order._id]?.createdOpCounts || {}}
            onClose={() => setModalState({ isOpen: false, type: null, order: null })}
            onConfirm={handleCreateJobCards}
          />
        )}
        
        {modalState.isOpen && (modalState.type === 'stockTransfer' || modalState.type === 'issueProduction' || modalState.type === 'receiptProduction') && (
          <QuantityModal
            order={modalState.order}
            type={modalState.type}
            onClose={() => setModalState({ isOpen: false, type: null, order: null })}
            onConfirm={handleQuantityModalSubmit}
          />
        )}
      </div>
    </>
  );
}





// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import axios from "axios";
// import { Pencil, Trash2, Eye, Loader2 } from "lucide-react";
// import { ToastContainer, toast } from "react-toastify";

// // --- Helper Components ---

// const ToastifyCSS = () => (
//   <style>{`
//     .Toastify__toast-container { z-index: 9999; }
//     .Toastify__toast { background: #fff; color: #1a1a1a; border-radius: 4px; box-shadow: 0 1px 10px 0 rgba(0,0,0,.1), 0 2px 15px 0 rgba(0,0,0,.05); }
//     .Toastify__toast--success { background: #07bc0c; color: #fff; }
//     .Toastify__toast--error { background: #e74c3c; color: #fff; }
//     .Toastify__toast--warn { background: #f1c40f; color: #fff; }
//     .Toastify__toast--info { background: #3498db; color: #fff; }
//     .Toastify__close-button { color: inherit; opacity: 0.7; }
//   `}</style>
// );

// const Modal = ({ children, onClose }) => (
//   <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
//     <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
//       {children}
//     </div>
//   </div>
// );

// // --- Create Job Card Modal ---

// const CreateJobCardModal = ({ order, createdOpCounts, onClose, onConfirm }) => {
//   const [selectedOperations, setSelectedOperations] = useState([]);
//   const [isSubmitting, setIsSubmitting] = useState(false);

//   // Filter only operations without job cards
//   const availableOperations = (order.operationFlow || []).filter((op, idx) => {
//     const opId = typeof op.operation === "object" ? op.operation._id : op.operation;
//     const createdCount = createdOpCounts[opId] || 0;
//     return createdCount < 1; // show only if no job card exists
//   });

//   const handleSelection = (uniqueKey) => {
//     setSelectedOperations((prev) =>
//       prev.includes(uniqueKey) ? prev.filter((id) => id !== uniqueKey) : [...prev, uniqueKey]
//     );
//   };

//   const handleSubmit = async () => {
//     if (selectedOperations.length === 0) {
//       toast.warn("Please select at least one operation.");
//       return;
//     }
//     setIsSubmitting(true);

//     const opsToCreate = selectedOperations.map((uniqueKey) => {
//       const idx = parseInt(uniqueKey.split("-").pop(), 10);
//       return availableOperations[idx];
//     });

//     await onConfirm(opsToCreate);
//     setIsSubmitting(false);
//   };

//   return (
//     <Modal onClose={onClose}>
//       <h2 className="text-xl font-bold mb-4">Create Job Cards for Order</h2>

//       {availableOperations.length > 0 ? (
//         <div className="space-y-2 max-h-80 overflow-y-auto border p-2 rounded">
//           {availableOperations.map((op, idx) => {
//   console.log("DEBUG op:", op); // <--- Add this line

//   // Determine operation ID
//   const opId = typeof op.operation === "object" ? op.operation._id : op.operation;
  
//   // Determine operation name
//   let opName = `Operation ${idx + 1}`;
//   if (op.operation && typeof op.operation === "object") opName = op.operation.name;
//   else if (op.name) opName = op.name;

//   console.log("DEBUG opId, opName:", opId, opName); // <--- And this

//   const uniqueKey = `${opId}-${idx}`;
//   const isSelected = selectedOperations.includes(uniqueKey);

//   return (
//     <div key={uniqueKey} className="flex justify-between items-center p-2 rounded hover:bg-gray-100">
//       <label htmlFor={uniqueKey} className="flex items-center gap-2 cursor-pointer">
//         <input
//           type="checkbox"
//           id={uniqueKey}
//           checked={isSelected}
//           onChange={() => handleSelection(uniqueKey)}
//           className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
//         />
//         <span className="font-medium text-gray-700">{opName}</span>
//       </label>
//       <span className={`px-2 py-1 text-xs rounded ${isSelected ? "bg-blue-200 text-blue-800" : "bg-gray-100 text-gray-600"}`}>
//         {isSelected ? "Selected" : "Available"}
//       </span>
//     </div>
//   );
// })}

//         </div>
//       ) : (
//         <p className="text-gray-600">All operations for this order already have job cards.</p>
//       )}

//       <div className="flex justify-end gap-3 mt-6">
//         <button
//           onClick={onClose}
//           className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={handleSubmit}
//           disabled={isSubmitting || availableOperations.length === 0}
//           className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-wait flex items-center gap-2"
//         >
//           {isSubmitting && <Loader2 size={16} className="animate-spin" />}
//           Create Selected
//         </button>
//       </div>
//     </Modal>
//   );
// };


// // --- Main Production Orders Page ---

// export default function ProductionOrdersPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [jobCardDetails, setJobCardDetails] = useState({});
//   const [modalState, setModalState] = useState({ isOpen: false, type: null, order: null });

//   const fetchOrders = useCallback(async () => {
//     setLoading(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return toast.error("Authentication token not found.");
//       const res = await axios.get("/api/production-orders", { headers: { Authorization: `Bearer ${token}` } });
//       setOrders(res.data);
//     } catch (err) {
//       toast.error("Failed to fetch production orders.");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   const fetchJobCardDetailsForOrder = useCallback(async (order) => {
//     const orderId = order._id;
//     setJobCardDetails(prev => ({ ...prev, [orderId]: { status: 'loading' } }));
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return;
//       const res = await axios.get(`/api/ppc/jobcards?productionOrderId=${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
//       const jobCards = res.data.data || [];

//       const createdOpCounts = jobCards.reduce((acc, jc) => {
//         const opId = jc.operation?._id?.toString() || jc.operation?.toString();
//         if (opId) acc[opId] = (acc[opId] || 0) + 1;
//         return acc;
//       }, {});

//       setJobCardDetails(prev => ({
//         ...prev,
//         [orderId]: {
//           status: 'loaded',
//           createdCount: jobCards.length,
//           totalCount: order?.operationFlow?.length || 0,
//           createdOpCounts,
//         }
//       }));
//     } catch (err) {
//       console.error(err);
//       setJobCardDetails(prev => ({
//         ...prev,
//         [orderId]: {
//           status: 'loaded',
//           createdCount: 0,
//           totalCount: order?.operationFlow?.length || 0,
//           createdOpCounts: {},
//         }
//       }));
//     }
//   }, []);

//   useEffect(() => { fetchOrders(); }, [fetchOrders]);
//   useEffect(() => { orders.forEach(order => fetchJobCardDetailsForOrder(order)); }, [orders, fetchJobCardDetailsForOrder]);

//   const handleCreateJobCards = async (operationsToCreate) => {
//     const { order } = modalState;
//     if (!order) return;

//     try {
//       const token = localStorage.getItem("token");
//       if (!token) return toast.error("Missing token");

//       const payload = {
//         productionOrderId: order._id,
//         operations: operationsToCreate.map(opFlow => ({
//           operationId: opFlow.operation?._id || opFlow.operation,
//           qtyToManufacture: order.quantity,
//         })),
//       };

//       const res = await axios.post("/api/ppc/jobcards", payload, { headers: { Authorization: `Bearer ${token}` } });

//       if (res.data.success) {
//         toast.success(`${res.data.data.length} job card(s) created successfully.`);
//         fetchJobCardDetailsForOrder(order);
//         setModalState({ isOpen: false, type: null, order: null });
//       } else {
//         toast.error(res.data.error || "Failed to create job cards.");
//       }
//     } catch (err) {
//       console.error(err);
//       toast.error(err.response?.data?.error || "Server error while creating job cards.");
//     }
//   };

//   if (loading) return <p className="text-center mt-8">Loading Production Orders...</p>;

//   return (
//     <>
//       <ToastifyCSS />
//       <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
//       <div className="max-w-7xl mx-auto p-6 bg-white shadow-lg rounded-lg">
//         <h1 className="text-3xl font-bold mb-6 text-gray-800">Production Orders</h1>
//         <div className="overflow-x-auto">
//           <table className="w-full table-auto border-collapse">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="border p-2 text-left">#</th>
//                 <th className="border p-2 text-left">Product</th>
//                 <th className="border p-2 text-right">Qty</th>
//                 <th className="border p-2 text-right">Transferred</th>
//                 <th className="border p-2 text-right">Issued</th>
//                 <th className="border p-2 text-right">Received</th>
//                 <th className="border p-2 text-left">Date</th>
//                 <th className="border p-2 text-left">Status</th>
//                 <th className="border p-2 text-center">Job Cards</th>
//                 <th className="border p-2 text-left">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {orders.map((order, idx) => {
//                 const details = jobCardDetails[order._id] || {};
//                 const displayCreatedCount = Math.min(details.createdCount || 0, details.totalCount || 0);
//                 const allJobCardsCreated = details.totalCount > 0 && displayCreatedCount >= details.totalCount;

//                 let status = "planned";
//                 if (order.reciptforproductionqty === order.quantity) status = "closed";
//                 else if (order.reciptforproductionqty > 0) status = "partially received";
//                 else if (order.issuforproductionqty > 0) status = "issued";
//                 else if (order.transferqty > 0) status = "transferred";

//                 return (
//                   <tr key={order._id} className="hover:bg-gray-50 text-sm">
//                     <td className="border p-2 text-center">{idx + 1}</td>
//                     <td className="border p-2">
//                  {typeof order.productDesc === "string"
//                     ? order.productDesc
//                     : order.productDesc?.name ||
//                       order.productDesc?.code ||
//                       order.bomId?.bomName ||
//                       "N/A"}
//                 </td>
//                     <td className="border p-2 text-right">{order.quantity}</td>
//                     <td className="border p-2 text-right">{order.transferqty || 0}</td>
//                     <td className="border p-2 text-right">{order.issuforproductionqty || 0}</td>
//                     <td className="border p-2 text-right">{order.reciptforproductionqty || 0}</td>
//                     <td className="border p-2">{new Date(order.productionDate).toLocaleDateString()}</td>
//                     <td className="border p-2 capitalize">{status}</td>
//                     <td className="border p-2 text-center font-medium">
//                       {details.status === 'loading' && <Loader2 className="animate-spin mx-auto" size={16} />}
//                       {details.status === 'loaded' && details.totalCount > 0 && (
//                         <span className={allJobCardsCreated ? "text-green-600" : "text-blue-600"}>
//                           {displayCreatedCount} / {details.totalCount}
//                         </span>
//                       )}
//                       {details.status === 'loaded' && details.totalCount === 0 && <span className="text-gray-400">N/A</span>}
//                     </td>
//                     <td className="border p-2">
//                       <div className="flex items-center gap-2">
//                         <select
//                           className="border p-1 rounded bg-gray-50 text-xs w-full"
//                           value=""
//                           onChange={e => {
//                             const action = e.target.value;
//                             if (!action) return;
//                             if (action === "viewJobCards") window.location.href = `/admin/ppc/jobcards/jobcardlists?productionOrderId=${order._id}`;
//                             else setModalState({ isOpen: true, type: action, order });
//                           }}
//                           disabled={status === "closed"}
//                         >
//                           <option value="">— Actions —</option>
//                           <option value="stockTransfer" disabled={order.quantity <= order.transferqty}>Stock Transfer</option>
//                           <option value="issueProduction" disabled={order.transferqty <= order.issuforproductionqty}>Issue for Production</option>
//                           <option value="receiptProduction" disabled={order.issuforproductionqty <= order.reciptforproductionqty}>Receipt from Production</option>
//                           {details.createdCount > 0 && <option value="viewJobCards">View Job Cards</option>}
//                           {order.operationFlow?.length > 0 && !allJobCardsCreated && <option value="createJobCard">Create Job Card</option>}
//                         </select>

//                         {status === "planned" && <a href={`/admin/ProductionOrder/${order._id}`} className="text-green-600" title="Edit Order"><Pencil size={16} /></a>}
//                         <a href={`/admin/productionorderdetail-view/${order._id}`} className="text-blue-600" title="View Details"><Eye size={16} /></a>
//                         <button onClick={async () => {
//                           if (!window.confirm("Are you sure?")) return;
//                           try {
//                             const token = localStorage.getItem("token");
//                             await axios.delete(`/api/production-orders/${order._id}`, { headers: { Authorization: `Bearer ${token}` } });
//                             toast.success("Deleted successfully");
//                             fetchOrders();
//                           } catch (err) { toast.error("Failed to delete"); }
//                         }} disabled={status !== 'planned'} className={status !== 'planned' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600'} title="Delete Order"><Trash2 size={16} /></button>
//                       </div>
//                     </td>
//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         </div>

//         {modalState.isOpen && modalState.type === 'createJobCard' && (
//           <CreateJobCardModal
//             order={modalState.order}
//             createdOpCounts={jobCardDetails[modalState.order._id]?.createdOpCounts || {}}
//             onClose={() => setModalState({ isOpen: false, type: null, order: null })}
//             onConfirm={handleCreateJobCards}
//           />
//         )}
//       </div>
//     </>
//   );
// }









///////////////////////////////////////////////////



// "use client";
// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { Pencil, Trash2, Eye } from "lucide-react";
// import { useRouter } from "next/navigation";
// import { toast } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function ProductionOrdersPage() {
//   const [orders, setOrders] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedAction, setSelectedAction] = useState({});
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalType, setModalType] = useState(null);
//   const [transferQty, setTransferQty] = useState(0);
//   const [currentOrder, setCurrentOrder] = useState(null);
//   const [jobCardCounts, setJobCardCounts] = useState({});
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.push("/login");
//       return;
//     }

//     axios
//       .get("/api/production-orders", {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((res) => setOrders(res.data))
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, [router]);

//   const openModal = (order, type) => {
//     setCurrentOrder(order);
//     setModalType(type);

//     let balanceQty = 0;
//     if (type === "transfer")
//       balanceQty = order.quantity - (order.transferqty || 0);
//     else if (type === "issue")
//       balanceQty = order.transferqty - (order.issuforproductionqty || 0);
//     else if (type === "receipt")
//       balanceQty = order.issuforproductionqty - (order.reciptforproductionqty || 0);
//     else if (type === "jobCard")
//       balanceQty = order.quantity - (order.transferqty || 0);

//     setTransferQty(balanceQty);
//     setModalOpen(true);
//   };
// // const handleModalConfirm = async () => {
// //   if (!currentOrder) return;

// //   let maxQty = 0;
// //   if (modalType === "transfer")
// //     maxQty = currentOrder.quantity - (currentOrder.transferqty || 0);
// //   else if (modalType === "issue")
// //     maxQty = currentOrder.transferqty - (currentOrder.issuforproductionqty || 0);
// //   else if (modalType === "receipt")
// //     maxQty = currentOrder.issuforproductionqty - (currentOrder.reciptforproductionqty || 0);
// //   else if (modalType === "jobCard")
// //     maxQty = currentOrder.quantity - (currentOrder.transferqty || 0);

// //   if (transferQty < 1 || transferQty > maxQty) {
// //     alert(`Please enter a quantity between 1 and ${maxQty}`);
// //     return;
// //   }

// //   // Determine redirect URL based on action
// //   let url = "";
// //   if (modalType === "transfer") {
// //     url = `/admin/stock-transfer/${currentOrder._id}?qty=${transferQty}`;
// //   } else if (modalType === "issue") {
// //     url = `/admin/issue-production/${currentOrder._id}?qty=${transferQty}`;
// //   } else if (modalType === "receipt") {
// //     url = `/admin/receipt-production/${currentOrder._id}?qty=${transferQty}`;
// //   } else if (modalType === "jobCard") {
// //     url = `/admin/ppc/jobcards/?productionOrderId=${currentOrder._id}&productionOrderNo=${currentOrder.orderNo}`;
// //   }

// //   if (url) router.push(url);

// //   setModalOpen(false);
// //   setSelectedAction((prev) => ({ ...prev, [currentOrder._id]: "" }));
// // };


//   const handleDelete = async (id) => {
//     if (!confirm("Delete this order?")) return;
//     try {
//       await axios.delete(`/api/production-orders/${id}`);
//       setOrders((prev) => prev.filter((o) => o._id !== id));
//       toast.success("Production order deleted.");
//     } catch (err) {
//       console.error(err);
//       toast.error("Delete failed");
//     }
//   };

//  const onActionChange = (id, action) => {
//   setSelectedAction((prev) => ({ ...prev, [id]: action }));
//   const order = orders.find((o) => o._id === id);
//   if (!order) return;

//   // Determine modal type for quantity input or job card creation
//   if (action === "stockTransfer") openModal(order, "transfer");
//   else if (action === "issueProduction") openModal(order, "issue");
//   else if (action === "receiptProduction") openModal(order, "receipt");
//   else if (action === "jobCard") openModal(order, "jobCard");
// };




// const handleModalConfirm = async () => {
//   if (!currentOrder) return;

//   try {
//     if (modalType === "transfer") {
//       router.push(`/admin/stock-transfer/${currentOrder._id}?qty=${transferQty}`);
//     } else if (modalType === "issue") {
//       router.push(`/admin/issue-production/${currentOrder._id}?qty=${transferQty}`);
//     } else if (modalType === "receipt") {
//       router.push(`/admin/receipt-production/${currentOrder._id}?qty=${transferQty}`);
//     } else if (modalType === "jobCard") {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Unauthorized");

//       console.log("Current Order object:", currentOrder);

//       if (!currentOrder.operationFlow || currentOrder.operationFlow.length === 0) {
//         toast.error("No operations found in this production order.");
//         return;
//       }

//       // Create job cards for each operation
//       await Promise.all(
//         currentOrder.operationFlow.map((opFlow, idx) =>
//           axios.post(
//             `/api/ppc/jobcards`,
//             {
//               productionOrderId: currentOrder._id,
//               operationId: opFlow.operation,
//               machineId: opFlow.machine,
//               operatorId: opFlow.operator,
//               qtyToManufacture: currentOrder.quantity,
//             },
//             { headers: { Authorization: `Bearer ${token}` } }
//           )
//         )
//       );

//       toast.success("Job cards created successfully for all operations.");

//       // Redirect to Job Card list page
//       router.push(`/admin/ppc/jobcards/jobcardlists?productionOrderId=${currentOrder._id}`);
//     }
//   } catch (err) {
//     console.error("Error creating job cards:", err);
//     toast.error("Failed to create job cards. Please try again.");
//   } finally {
//     // Reset modal state
//     setModalOpen(false);
//     setSelectedAction((prev) => ({ ...prev, [currentOrder._id]: "" }));
//   }
// };




//   const renderModal = () => {
//     if (!modalOpen || !currentOrder) return null;

//     const getMaxQty = () => {
//       if (modalType === "transfer")
//         return currentOrder.quantity - (currentOrder.transferqty || 0);
//       if (modalType === "issue")
//         return currentOrder.transferqty - (currentOrder.issuforproductionqty || 0);
//       if (modalType === "receipt")
//         return currentOrder.issuforproductionqty - (currentOrder.reciptforproductionqty || 0);
//       if (modalType === "jobCard")
//         return currentOrder.quantity - (currentOrder.transferqty || 0);
//       return 0;
//     };

//     const maxQty = getMaxQty();

//     const renderInput = (label) => (
//       <>
//         <h2 className="text-lg font-semibold mb-4">{label}</h2>
//         <p className="mb-2">Enter quantity (Max: {maxQty}):</p>
//         <input
//           type="number"
//           min={1}
//           max={maxQty}
//           value={transferQty}
//           onChange={(e) => setTransferQty(Number(e.target.value))}
//           className="w-full border p-2 rounded mb-4"
//         />
//       </>
//     );

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white p-6 rounded shadow w-80">
//           {modalType === "transfer" && renderInput("Confirm Stock Transfer")}
//           {modalType === "issue" && renderInput("Confirm Issue for Production")}
//           {modalType === "receipt" && renderInput("Confirm Receipt from Production")}
//           {modalType === "jobCard" && renderInput("Create/View Job Card")}
//           <div className="flex justify-end gap-2">
//             <button
//               onClick={() => setModalOpen(false)}
//               className="px-3 py-1 bg-gray-200 rounded"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleModalConfirm}
//               className="px-3 py-1 bg-blue-600 text-white rounded"
//             >
//               Confirm
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

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
//             <th className="border p-2">Issue Qty</th>
//             <th className="border p-2">Receipt Qty</th>
//             <th className="border p-2">Date</th>
//             <th className="border p-2">Status</th>
//             <th className="border p-2">Job Cards</th>
//             <th className="border p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {orders.map((o, idx) => {
//             const sel = selectedAction[o._id] || "";
//             const transfer = o.transferqty || 0;
//             const issue = o.issuforproductionqty || 0;
//             const receipt = o.reciptforproductionqty || 0;
//             const quantity = o.quantity;
//             const hasOperationFlow =
//               Array.isArray(o.operationFlow) && o.operationFlow.length > 0;

//             const canIssue = transfer > issue;
//             const canReceipt = issue > receipt;

//             let status = "planned";
//             if (transfer > 0 && issue === 0 && receipt === 0) status = "transferred";
//             else if (issue > 0 && receipt === 0) status = "issued";
//             else if (receipt > 0 && receipt < quantity) status = "partially received";
//             else if (transfer === quantity && issue === quantity && receipt === quantity)
//               status = "closed";
//             else status = "partially completed";

//             return (
//               <tr key={o._id} className="hover:bg-gray-50">
//                 <td className="border p-2 text-center">{idx + 1}</td>
//                 <td className="border p-2">
//                   {typeof o.productDesc === "string"
//                     ? o.productDesc
//                     : o.productDesc?.name ||
//                       o.productDesc?.code ||
//                       o.bomId?.bomName ||
//                       "N/A"}
//                 </td>
//                 <td className="border p-2 text-right">{quantity}</td>
//                 <td className="border p-2 text-right">{transfer}</td>
//                 <td className="border p-2 text-right">{issue}</td>
//                 <td className="border p-2 text-right">{receipt}</td>
//                 <td className="border p-2">
//                   {new Date(o.productionDate).toLocaleDateString()}
//                 </td>
//                 <td className="border p-2 capitalize">{status}</td>
//                 <td className="border p-2 text-center">
//                   {jobCardCounts[o._id] ? (
//                     <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
//                       {jobCardCounts[o._id]} Job Card
//                       {jobCardCounts[o._id] > 1 ? "s" : ""}
//                     </span>
//                   ) : (
//                     "-"
//                   )}
//                 </td>
//                 <td className="border p-2 flex items-center gap-2">
//                   {status === "planned" ? (
//                     <a
//                       href={`/admin/ProductionOrder/${o._id}`}
//                       className="text-green-600 flex items-center gap-1"
//                     >
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
//                       <option value="issueProduction" disabled={!canIssue}>
//                         Issue for Production
//                       </option>
//                       <option value="receiptProduction" disabled={!canReceipt}>
//                         Receipt from Production
//                       </option>
//                       {hasOperationFlow && (
//                         <option value="jobCard">Create/View Job Card</option>
//                       )}
//                     </select>
//                   )}

//                   <a
//                     href={`/admin/productionorderdetail-view/${o._id}`}
//                     className="text-blue-600 flex items-center gap-1"
//                   >
//                     <Eye size={16} /> View
//                   </a>

//                   <button
//                     onClick={() => handleDelete(o._id)}
//                     className="text-red-600 flex items-center gap-1"
//                   >
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



// befor the ppc make working 

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
//   const [modalType, setModalType] = useState(null);
//   const [transferQty, setTransferQty] = useState(0);
//   const [currentOrder, setCurrentOrder] = useState(null);
//   const router = useRouter();

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       router.push("/login");
//       return;
//     }
//     axios
//       .get("/api/production-orders", {
//         headers: { Authorization: `Bearer ${token}` },
//       })
//       .then((res) => setOrders(res.data))
//       .catch(console.error)
//       .finally(() => setLoading(false));
//   }, []);

//   const openModal = (order, type) => {
//     setCurrentOrder(order);
//     setModalType(type);

//     let balanceQty = 0;
//     if (type === "transfer") {
//       balanceQty = order.quantity - (order.transferqty || 0);
//     } else if (type === "issue") {
//       balanceQty = order.transferqty - (order.issuforproductionqty || 0);
//     } else if (type === "receipt") {
//       balanceQty =
//         order.issuforproductionqty - (order.reciptforproductionqty || 0);
//     }

//     setTransferQty(balanceQty);
//     setModalOpen(true);
//   };

//   const handleModalConfirm = () => {
//     if (!currentOrder) return;

//     let maxQty = 0;
//     if (modalType === "transfer") {
//       maxQty = currentOrder.quantity - (currentOrder.transferqty || 0);
//     } else if (modalType === "issue") {
//       maxQty =
//         currentOrder.transferqty - (currentOrder.issuforproductionqty || 0);
//     } else if (modalType === "receipt") {
//       maxQty =
//         currentOrder.issuforproductionqty -
//         (currentOrder.reciptforproductionqty || 0);
//     }

//     if (transferQty < 1 || transferQty > maxQty) {
//       alert(`Please enter a quantity between 1 and ${maxQty}`);
//       return;
//     }

  //   let url = "";
  //   if (modalType === "transfer") {
  //     url = `/admin/stock-transfer/${currentOrder._id}?qty=${transferQty}`;
  //   } else if (modalType === "issue") {
  //     url = `/admin/issue-production/${currentOrder._id}?qty=${transferQty}`;
  //   } else if (modalType === "receipt") {
  //     url = `/admin/receipt-production/${currentOrder._id}?qty=${transferQty}`;
  //   }

  //   if (url) router.push(url);

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

//   const renderModal = () => {
//     if (!modalOpen || !currentOrder) return null;

//     const getMaxQty = () => {
//       if (modalType === "transfer") {
//         return currentOrder.quantity - (currentOrder.transferqty || 0);
//       }
//       if (modalType === "issue") {
//         return (
//           currentOrder.transferqty - (currentOrder.issuforproductionqty || 0)
//         );
//       }
//       if (modalType === "receipt") {
//         return (
//           currentOrder.issuforproductionqty -
//           (currentOrder.reciptforproductionqty || 0)
//         );
//       }
//       return 0;
//     };

//     const maxQty = getMaxQty();

//     const renderInput = (label) => (
//       <>
//         <h2 className="text-lg font-semibold mb-4">{label}</h2>
//         <p className="mb-2">Enter quantity (Max: {maxQty}):</p>
//         <input
//           type="number"
//           min={1}
//           max={maxQty}
//           value={transferQty}
//           onChange={(e) => setTransferQty(Number(e.target.value))}
//           className="w-full border p-2 rounded mb-4"
//         />
//       </>
//     );

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white p-6 rounded shadow w-80">
//           {modalType === "transfer" && renderInput("Confirm Stock Transfer")}
//           {modalType === "issue" && renderInput("Confirm Issue for Production")}
//           {modalType === "receipt" &&
//             renderInput("Confirm Receipt from Production")}
//           <div className="flex justify-end gap-2">
//             <button
//               onClick={() => setModalOpen(false)}
//               className="px-3 py-1 bg-gray-200 rounded"
//             >
//               Cancel
//             </button>
//             <button
//               onClick={handleModalConfirm}
//               className="px-3 py-1 bg-blue-600 text-white rounded"
//             >
//               Confirm
//             </button>
//           </div>
//         </div>
//       </div>
//     );
//   };

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
//             <th className="border p-2">Issue Qty</th>
//             <th className="border p-2">Receipt Qty</th>
//             <th className="border p-2">Date</th>
//             <th className="border p-2">Status</th>
//             <th className="border p-2">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {orders.map((o, idx) => {
//             const sel = selectedAction[o._id] || "";

//             const transfer = o.transferqty || 0;
//             const issue = o.issuforproductionqty || 0;
//             const receipt = o.reciptforproductionqty || 0;
//             const quantity = o.quantity;

//             const canIssue = transfer > issue;
//             const canReceipt = issue > receipt;

//             let status = "planned";
//             if (transfer > 0 && issue === 0 && receipt === 0)
//               status = "transferred";
//             else if (issue > 0 && receipt === 0) status = "issued";
//             else if (receipt > 0 && receipt < quantity)
//               status = "partially received";
//             else if (
//               transfer === quantity &&
//               issue === quantity &&
//               receipt === quantity
//             )
//               status = "closed";
//             else status = "partially completed";

//             return (
//               <tr key={o._id} className="hover:bg-gray-50">
//                 <td className="border p-2 text-center">{idx + 1}</td>

//                 {/* ✅ Safe rendering */}
//                 <td className="border p-2">
//                   {typeof o.productDesc === "string"
//                     ? o.productDesc
//                     : o.productDesc?.name ||
//                       o.productDesc?.code ||
//                       o.bomId?.bomName ||
//                       o.bomId?._id ||
//                       "N/A"}
//                 </td>

//                 <td className="border p-2 text-right">{quantity}</td>
//                 <td className="border p-2 text-right">{transfer}</td>
//                 <td className="border p-2 text-right">{issue}</td>
//                 <td className="border p-2 text-right">{receipt}</td>
//                 <td className="border p-2">
//                   {new Date(o.productionDate).toLocaleDateString()}
//                 </td>
//                 <td className="border p-2 capitalize">{status}</td>
//                 <td className="border p-2 flex items-center gap-2">
//                   {status === "planned" ? (
//                     <a
//                       href={`/admin/ProductionOrder/${o._id}`}
//                       className="text-green-600 flex items-center gap-1"
//                     >
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
//                       <option value="issueProduction" disabled={!canIssue}>
//                         Issue for Production
//                       </option>
//                       <option value="receiptProduction" disabled={!canReceipt}>
//                         Receipt from Production
//                       </option>
//                     </select>
//                   )}

//                   <a
//                     href={`/admin/productionorderdetail-view/${o._id}`}
//                     className="text-blue-600 flex items-center gap-1"
//                   >
//                     <Eye size={16} /> View
//                   </a>

//                   <button
//                     onClick={() => handleDelete(o._id)}
//                     className="text-red-600 flex items-center gap-1"
//                   >
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
