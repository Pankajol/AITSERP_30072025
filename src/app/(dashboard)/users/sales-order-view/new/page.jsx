// // pages/admin/sales-order/new.js
// "use client";
// import { useState, useEffect } from "react";
// import { useRouter,useSearchParams } from "next/navigation";
// import axios from "axios";
// import CustomerSearch from "@/components/CustomerSearch";
// import ItemSection from "@/components/ItemSection";
// import { toast } from "react-toastify";

// const round = (num, decimals = 2) => Number(num.toFixed(decimals));

// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgstRate = parseFloat(item.cgstRate) || gstRate / 2;
//     const sgstRate = parseFloat(item.sgstRate) || gstRate / 2;
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = round(cgstAmount + sgstAmount);
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount,
//       cgstAmount,
//       sgstAmount,
//       igstAmount: 0,
//     };
//   } else {
//     const igstRate = parseFloat(item.igstRate) || parseFloat(item.gstRate) || 0;
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return {
//       priceAfterDiscount,
//       totalAmount,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount,
//     };
//   }
// };

// export default function SalesOrderForm() {
//   const router = useRouter();
   
//   const searchParams = useSearchParams();
//   const orderId = searchParams.get("id");
//   const [isEditing, setIsEditing] = useState(false);
//   const [formData, setFormData] = useState({
//     customer: "",
//     customerCode: "",
//     customerName: "",
//     contactPerson: "",
//     refNumber: "",
//     status: "Open",
//     postingDate: new Date().toISOString().split('T')[0],
//     validUntil: "",
//     documentDate: "",
//     items: [{
//       item: "",
//       itemCode: "",
//       itemName: "",
//       quantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       taxOption: "GST",
//       gstRate: 0,
//       cgstRate: 0,
//       sgstRate: 0,
//       igstRate: 0,
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//     }],
//     salesEmployee: "",
//     remarks: "",
//     freight: 0,
//     rounding: 0,
//     totalBeforeDiscount: 0,
//     gstAmount: 0,
//     grandTotal: 0,
//   });



// useEffect(() => {
//     if (orderId) {
//       setIsEditing(true);
//       fetchSalesOrder(orderId);
//     }
//   }, [orderId]);

//   // Fetch existing sales order for editing
//   const fetchSalesOrder = async (id) => {
//     try {
//       const response = await axios.get(`/api/sales-order/${id}`);
//       if (response.data) {
//         setFormData(response.data);
//       }
//     } catch (error) {
//       toast.error("Failed to load sales order");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Load quotation data from session storage if exists
//   useEffect(() => {
//     const salesOrderData = sessionStorage.getItem("salesOrderData");
//     if (salesOrderData) {
//       const parsedData = JSON.parse(salesOrderData);
//       setFormData({
//         ...parsedData,
//         status: "Open",
//         quotation: parsedData._id,
//       });
//       sessionStorage.removeItem("salesOrderData");
//       toast.success("Quotation data loaded into Sales Order");
//     }
//   }, []);

//   const handleCustomerSelect = (selectedCustomer) => {
//     setFormData(prev => ({
//       ...prev,
//       customer: selectedCustomer._id || "",
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleItemChange = (index, e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const updatedItems = [...prev.items];
//       updatedItems[index] = { ...updatedItems[index], [name]: value };
      
//       // Recalculate item values
//       updatedItems[index] = { 
//         ...updatedItems[index], 
//         ...computeItemValues(updatedItems[index]) 
//       };
      
//       return { ...prev, items: updatedItems };
//     });
//   };

//   const addItemRow = () => {
//     setFormData(prev => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           item: "",
//           itemCode: "",
//           itemName: "",
//           quantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           taxOption: "GST",
//           gstRate: 0,
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//         }
//       ]
//     }));
//   };

//   const removeItemRow = (index) => {
//     setFormData(prev => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index)
//     }));
//   };

//   // Calculate summary
//   useEffect(() => {
//     const totalBeforeDiscount = formData.items.reduce(
//       (sum, item) => sum + (parseFloat(item.totalAmount) || 0), 0
//     );
    
//     const gstAmount = formData.items.reduce(
//       (sum, item) => sum + (parseFloat(item.gstAmount) || 0), 0
//     );
    
//     const grandTotal = totalBeforeDiscount + gstAmount + 
//       (parseFloat(formData.freight) || 0) + 
//       (parseFloat(formData.rounding) || 0);
    
//     setFormData(prev => ({
//       ...prev,
//       totalBeforeDiscount: round(totalBeforeDiscount),
//       gstAmount: round(gstAmount),
//       grandTotal: round(grandTotal)
//     }));
//   }, [formData.items, formData.freight, formData.rounding]);

//   const handleSubmit = async () => {
//     try {
//       const response = await axios.post("/api/sales-order", formData);
//       if (response.data.success) {
//         toast.success("Sales Order created successfully");
//         router.push("/admin/sales-orders");
//       }
//     } catch (error) {
//       toast.error("Error creating sales order");
//     }
//   };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">Create Sales Order</h1>
      
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Name</label>
//             <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
        
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="Open">Open</option>
//               <option value="Processing">Processing</option>
//               <option value="Completed">Completed</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formData.postingDate}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Document Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formData.documentDate}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>
      
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
//           onRemoveItem={removeItemRow}
//           showWarehouse={true}
//         />
//       </div>
      
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//       </div>
      
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             value={formData.totalBeforeDiscount || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             name="rounding"
//             type="number"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST</label>
//           <input
//             value={formData.gstAmount || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Total Amount</label>
//           <input
//             value={formData.grandTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>
      
//     <div className="flex gap-4 p-8 m-8 border rounded-lg shadow-lg">
//   <button
//     onClick={handleSubmit}
//     className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//   >
//     {isEditing ? "Update Sales Order" : "Create Sales Order"}
//   </button>
//   <button
//     onClick={() => router.push("/admin/sales-orders")}
//     className="px-4 py-2 bg-gray-500 text-white rounded"
//   >
//     Cancel
//   </button>
//   {isEditing && (
//     <button
//       onClick={() => router.push(`/admin/sales-order/${orderId}`)}
//       className="px-4 py-2 bg-blue-500 text-white rounded"
//     >
//       View Details
//     </button>
//   )}
// </div>
//     </div>
//   );
// }







"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";
import CustomerAddressSelector from "@/components/CustomerAddressSelector";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Initial state with full set of fields
const initialOrderState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  salesEmployee: "",
  status: "Open",
  statusStages: "ETD Confirmation from plant", // Default status stage
  orderDate: "",
  expectedDeliveryDate: "",
  billingAddress: null,
  shippingAddress: null,
  items: [{
    item: "", itemCode: "", itemId: "", itemName: "", itemDescription: "",
    quantity: 0, allowedQuantity: 0, receivedQuantity: 0,
    unitPrice: 0, discount: 0, freight: 0,
    taxOption: "GST", priceAfterDiscount: 0, totalAmount: 0,
    gstAmount: 0, gstRate: 0, cgstAmount: 0, sgstAmount: 0,
    igstAmount: 0, managedBy: "", batches: [], errorMessage: "",
    warehouse: "", warehouseName: "", warehouseCode: "", warehouseId: "",
    managedByBatch: true,
  }],
  remarks: "",
  freight: 0, rounding: 0, totalDownPayment: 0, appliedAmounts: 0,
  totalBeforeDiscount: 0, gstTotal: 0, grandTotal: 0,
  openBalance: 0, fromQuote: false,
};

// Helper functions
const round = (num, d = 2) => {
  const n = Number(num);
  return isNaN(n) ? 0 : Number(n.toFixed(d));
};

function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const computeItemValues = (item) => {
  const qty = parseFloat(item.quantity) || 0;
  const price = parseFloat(item.unitPrice) || 0;
  const disc = parseFloat(item.discount) || 0;
  const fr = parseFloat(item.freight) || 0;
  const pad = round(price - disc);
  const total = round(qty * pad + fr);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgst = round(total * (gstRate / 200));
    const sgst = cgst;
    return { priceAfterDiscount: pad, totalAmount: total, gstAmount: cgst + sgst, cgstAmount: cgst, sgstAmount: sgst, igstAmount: 0 };
  }
  const igst = round(total * ((parseFloat(item.gstRate) || 0) / 100));
  return { priceAfterDiscount: pad, totalAmount: total, gstAmount: 0, cgstAmount: 0, sgstAmount: 0, igstAmount: igst };
};

export default function SalesOrderPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading...</div>}>
      <SalesOrderForm />
    </Suspense>
  );
}

function SalesOrderForm() {
  const router = useRouter();
  const params = useSearchParams();
  const editId = params.get("editId");

  const [formData, setFormData] = useState(initialOrderState);
  const [loading, setLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [isNewCustomer, setIsNewCustomer] = useState(false);

  /* ---------- handlers ---------- */

 

  // called when CustomerSearch reports “no match”
  const onSearchNotFound = searchText => {
    // pre‑fill the name so the user doesn’t re‑type it
    setFormData(prev => ({ ...prev, customerName: searchText }));
    setIsNewCustomer(true);
  };

  const handleNewCustomerToggle = () => setIsNewCustomer(prev => !prev);



  useEffect(() => {
     const key = "salesOrderData";
     const stored = sessionStorage.getItem(key);
     if (!stored) return;
     try {
       setFormData(JSON.parse(stored));
       setIsCopied(true);
     } catch (err) {
       console.error("Bad JSON in sessionStorage", err);
     } finally {
       sessionStorage.removeItem(key);
     }
   }, []);

  // Load existing order if editing
  useEffect(() => {
    if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      axios.get(`/api/sales-order/${editId}`)
        .then(res => {
          const record = res.data.data;
          const items = Array.isArray(record.items)
            ? record.items.map(i => ({
                ...initialOrderState.items[0], ...i,
                item: i.item?._id || i.item || "",
                warehouse: i.warehouse?._id || i.warehouse || "",
                taxOption: i.taxOption || "GST",
              }))
            : [...initialOrderState.items];
          
          // Set form data
          setFormData({
            ...initialOrderState,
            ...record,
            items,
            billingAddress: record.billingAddress || null,
            shippingAddress: record.shippingAddress || null,
            orderDate: formatDate(record.orderDate),
            expectedDeliveryDate: formatDate(record.expectedDeliveryDate),
          });
          
          // Set selected customer for address component
          if (record.customerCode || record.customerName) {
            setSelectedCustomer({
              _id: record.customer || record.customerCode,
              customerCode: record.customerCode,
              customerName: record.customerName,
              contactPersonName: record.contactPerson
            });
          }
        })
        .catch(err => setError(err.message || "Failed to load"))
        .finally(() => setLoading(false));
    }
  }, [editId]);

    // const onCustomer = useCallback((c) => {
    //   setFormData((p) => ({
    //     ...p,
    //     customerCode: c.customerCode ?? "",
    //     customerName: c.customerName ?? "",
    //     contactPerson: c.contactPersonName ?? "",
    //   }));
    // }, []);

  // Recalculate totals
  useEffect(() => {
    const items = Array.isArray(formData.items) ? formData.items : [];
    const totalBeforeDiscount = items.reduce((s, i) => s + (i.unitPrice * i.quantity - i.discount), 0);
    const gstTotal = items.reduce((s, i) => s + i.gstAmount, 0);
    const grandTotal = totalBeforeDiscount + gstTotal + formData.freight + formData.rounding;
    const openBalance = grandTotal - (formData.totalDownPayment + formData.appliedAmounts);

    setFormData(prev => ({
      ...prev,
      totalBeforeDiscount: round(totalBeforeDiscount),
      gstTotal: round(gstTotal),
      grandTotal: round(grandTotal),
      openBalance: round(openBalance),
    }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  // Handlers
  const onCustomer = useCallback(c => {
    setSelectedCustomer(c);
    setFormData(prev => ({
      ...prev,
       customer: c._id || "",
      customerName: c.customerName,
      customerCode: c.customerCode,
      contactPerson: c.contactPersonName,
      billingAddress: null,
      shippingAddress: null,
    }));
  }, []);

  const handleChange = useCallback(e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((idx, e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const arr = Array.isArray(prev.items) ? [...prev.items] : [];
      const newVal = ["quantity","allowedQuantity","receivedQuantity","unitPrice","discount","freight","gstRate"].includes(name)
        ? parseFloat(value) || 0
        : value;
      arr[idx] = { ...arr[idx], [name]: newVal, ...computeItemValues({ ...arr[idx], [name]: newVal }) };
      return { ...prev, items: arr };
    });
  }, []);

    const onInput = useCallback((e) => {
      const { name, value } = e.target;
      setFormData((p) => ({ ...p, [name]: value }));
    }, []);

  const addItemRow = () => {
    setFormData(prev => {
      const arr = Array.isArray(prev.items) ? prev.items : [];
      return { ...prev, items: [...arr, { ...initialOrderState.items[0] }] };
    });
  };

  const removeItemRow = idx => {
    setFormData(prev => {
      const arr = Array.isArray(prev.items) ? prev.items : [];
      return { ...prev, items: arr.filter((_, i) => i !== idx) };
    });
  };

// const handleSubmit = async () => {
//   if (!formData.customerCode || !formData.customerName) {
//     return alert("Select a customer");
//   }

//   setSubmitting(true);
//   setError(null); // clear previous error

//   try {
//     if (editId) {
//       await axios.put(`/api/sales-order/${editId}`, formData);
//       toast.success("Sales Order updated successfully");
//     } else {
//       const res = await axios.post("/api/sales-order", formData);
//       toast.success("Sales Order created successfully");

//       // Optional: reset only after successful post
//       setFormData(initialOrderState);
//     }

//     router.push("/admin/sales-order-view");
//   } catch (err) {
//     const message =
//       err?.response?.data?.error || err.message || "Unknown error";

//     setError(message); // set state if you display it on screen
//     toast.error(`❌ ${message}`);
//     console.error("Error saving sales order:", err); // full trace
//   } finally {
//     setSubmitting(false);
//   }
// };

const handleSubmit = async () => {
  if (!formData.customerCode || !formData.customerName) {
    toast.error("❌ Please select a customer");
    return;
  }

  setSubmitting(true);
  setError(null);

  try {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("User is not authenticated");
    }

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };

    if (editId) {
      await axios.put(`/api/sales-order/${editId}`, formData, { headers });
      toast.success("✅ Sales Order updated successfully");
    } else {
      const res = await axios.post("/api/sales-order", formData, { headers });
      toast.success("✅ Sales Order created successfully");
      setFormData(initialOrderState); // reset form
    }

    router.push("/users/sales-order-view");
  } catch (err) {
    const message =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err.message ||
      "Unknown error";

    setError(message);
    toast.error(`❌ ${message}`);
    console.error("Error saving sales order:", err);
  } finally {
    setSubmitting(false);
  }
};


  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="m-8 p-5 border shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Order" : "Create Sales Order"}
      </h1>

      {/* Customer & Meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* <div>
            {editId || isCopied ? (
              <>
                <label className="mb-2 block font-medium">
                  Customer Name
                </label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={onInput}
                  className="w-full rounded border p-2"
                />
              </>
            ) : (
              <>
                <label className="mb-2 block font-medium">
                  Customer Name
                </label>
                <CustomerSearch onSelectCustomer={onCustomer} />
              </>
            )}
          </div> */}

           <div>
      <label className="mb-2 block font-medium">Customer Name</label>

      {/* CASE 1 – editing an existing record or copying -> always free text */}
      {editId || isCopied ? (
        <input
          type="text"
          name="customerName"
          value={formData.customerName}
          onChange={onInput}
          className="w-full rounded border p-2"
        />
      ) : (
        /* CASE 2 – brand‑new record */
        <>
          {isNewCustomer ? (
            <>
              <input
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={onInput}
                placeholder="Enter new customer"
                className="w-full rounded border p-2"
              />
              <button
                type="button"
                onClick={handleNewCustomerToggle}
                className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
              >
                ⬅︎ Back to search
              </button>
            </>
          ) : (
            <>
              <CustomerSearch
                onSelectCustomer={onCustomer}
                onNotFound={onSearchNotFound} // 👈 add this prop inside CustomerSearch
              />
              <button
                type="button"
                onClick={() => setIsNewCustomer(true)}
                className="mt-2 rounded bg-gray-200 px-3 py-1 text-sm"
              >
                + Add new customer
              </button>
            </>
          )}
        </>
      )}
    </div>
        <div>
          <label className="font-medium">Customer Code</label>
          <input  name="customerCode" value={formData.customerCode} onChange={handleChange} className="w-full p-2 border bg-gray-100 rounded" />
        </div>
        <div>
          <label className="font-medium">Contact Person</label>
          <input  name="contactPerson" value={formData.contactPerson} onChange={handleChange} className="w-full p-2 border bg-gray-100 rounded" />
        </div>
        <div>
          <label className="font-medium">Reference No.</label>
          <input name="refNumber" value={formData.refNumber} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
      </div>

      {/* Customer Address Selection */}
      <CustomerAddressSelector
        customer={selectedCustomer}
        selectedBillingAddress={formData.billingAddress}
        selectedShippingAddress={formData.shippingAddress}
        onBillingAddressSelect={(address) => setFormData(prev => ({ ...prev, billingAddress: address }))}
        onShippingAddressSelect={(address) => setFormData(prev => ({ ...prev, shippingAddress: address }))}
      />

      {/* Dates & Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="font-medium">Order Date</label>
          <input type="date" name="orderDate" value={formData.orderDate} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="font-medium">Expected Delivery</label>
          <input type="date" name="expectedDeliveryDate" value={formData.expectedDeliveryDate} onChange={handleChange} className="w-full p-2 border rounded" />
        </div>
        <div>
          <label className="font-medium">Status</label>
          <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
           <option>Open</option> <option>Pending</option><option>Closed</option><option>Cancelled</option>
          </select>
        </div>
          <div>
          <label className="font-medium">Sales Stages</label>
          <select name="statusStages" value={formData.statusStages} onChange={handleChange} className="w-full p-2 border rounded">
           <option>ETD Confirmation from plant</option> <option>ETD notification for SC-cremika</option><option>SC to concerned sales & customer</option><option>Material in QC-OK/NOK</option>
           <option>Dispatch with qty</option> <option>Delivered to customer</option>
          </select>
        </div>
      </div>

      {/* Items */}
      <ItemSection
        items={Array.isArray(formData.items) ? formData.items : []}
        onItemChange={handleItemChange}
        onAddItem={addItemRow}
        onRemoveItem={removeItemRow}
        computeItemValues={computeItemValues}
      />

      {/* Totals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
        <div><label>Total Before Discount</label><input readOnly value={formData.totalBeforeDiscount} className="w-full p-2 border bg-gray-100 rounded" /></div>
        <div><label>GST Total</label><input readOnly value={formData.gstTotal} className="w-full p-2 border bg-gray-100 rounded" /></div>
        <div><label>Freight</label><input type="number" name="freight" value={formData.freight} onChange={handleChange} className="w-full p-2 border rounded" /></div>
        <div><label>Rounding</label><input type="number" name="rounding" value={formData.rounding} onChange={handleChange} className="w-full p-2 border rounded" /></div>
        <div><label>Grand Total</label><input readOnly value={formData.grandTotal} className="w-full p-2 border bg-gray-100 rounded" /></div>
        <div><label>Open Balance</label><input readOnly value={formData.openBalance} className="w-full p-2 border bg-gray-100 rounded" /></div>
      </div>

      <div className="mt-6">
        <label className="font-medium">Remarks</label>
        <textarea name="remarks" value={formData.remarks} onChange={handleChange} rows={3} className="w-full p-2 border rounded"></textarea>
      </div>

      <div className="mt-6 flex gap-4">
        <button onClick={handleSubmit} disabled={submitting} className={`px-4 py-2 rounded text-white ${submitting ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-500"}`}>
          {submitting ? "Saving..." : editId ? "Update Order" : "Create Order"}
        </button>
        <button onClick={() => { setFormData(initialOrderState); router.push("/admin/salesOrder"); }} className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-400">
          Cancel
        </button>
      </div>
    </div>
  );
}













// "use client";

// import React, { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const initialOrderState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   salesEmployee: "",
//   status: "Pending",
//   orderDate: "",
//   expectedDeliveryDate: "",
//   items: [
//     {
//       item: "",
//       itemCode: "",
//       itemId: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       allowedQuantity: 0,
//       receivedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       gstRate: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       managedBy: "",
//       batches: [],
//       errorMessage: "",
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       warehouseId: "",
//       managedByBatch: true,
//     },
//   ],
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   totalBeforeDiscount: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
//   fromQuote: false,
// };

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
// }

// async function fetchManagedBy(itemId) {
//   if (!itemId) {
//     console.warn("fetchManagedBy called with undefined itemId");
//     return "";
//   }

//   try {
//     const res = await axios.get(`/api/items/${itemId}`);
//     return res.data.managedBy;
//   } catch (error) {
//     console.error("Error fetching managedBy for item", itemId, error);
//     return "";
//   }
// }

// function SalesOrderFormWrapper() {
//   return (
//     <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesOrderForm />
//     </Suspense>
//   );
// }

// function SalesOrderForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [isCopied, setIsCopied] = useState(false);
//   const [formData, setFormData] = useState(initialOrderState);

//   useEffect(() => {
//     const calcTotals = () => {
//       const totalBeforeDiscount = formData.items.reduce((acc, item) => acc + (item.unitPrice - item.discount) * item.quantity, 0);
//       const totalItems = formData.items.reduce((acc, item) => acc + item.totalAmount, 0);
//       const gstTotal = formData.items.reduce((acc, item) => acc + (item.taxOption === "IGST" ? item.igstAmount : item.gstAmount), 0);
//       const freight = parseFloat(formData.freight) || 0;
//       const rounding = parseFloat(formData.rounding) || 0;
//       const downPayment = parseFloat(formData.totalDownPayment) || 0;
//       const applied = parseFloat(formData.appliedAmounts) || 0;
//       const grandTotal = totalItems + gstTotal + freight + rounding;
//       const openBalance = grandTotal - (downPayment + applied);

//       setFormData(prev => ({
//         ...prev,
//         totalBeforeDiscount,
//         gstTotal,
//         grandTotal,
//         openBalance,
//       }));
//     };
//     calcTotals();
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

//   useEffect(() => {
//     const storedData = sessionStorage.getItem("salesOrderData");
//     if (storedData) {
//       (async () => {
//         try {
//           const parsed = JSON.parse(storedData);
//           parsed.items = await Promise.all(
//             parsed.items.map(async (item, idx) => {
//               const itemId = item.item || item.item?._id || item.item || "";
//               console.log(`Processing item[${idx}]`, itemId);
//               const managedBy = await fetchManagedBy(itemId);
//               return { ...item, managedBy: managedBy || "batch" };
//             })
//           );
//           setFormData(parsed);
//           setIsCopied(true);
//           sessionStorage.removeItem("salesOrderData");
//         } catch (e) {
//           console.error("Error parsing salesOrderData", e);
//         }
//       })();
//     }
//   }, []);

//   useEffect(() => {
//     if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
//       setLoading(true);
//       axios.get(`/api/sales-order/${editId}`)
//         .then(res => {
//           const record = res.data.data;
//           setFormData({
//             ...record,
//             customer: record.customer?._id || record.customer || "",
//             postingDate: formatDateForInput(record.postingDate),
//             validUntil: formatDateForInput(record.validUntil),
//             documentDate: formatDateForInput(record.documentDate),
//             items: record.items.map((item) => ({
//               ...item,
//               item: item.item?._id || item.item || "",
//               warehouse: item.warehouse?._id || item.warehouse || "",
//             }))
//           });
//         })
//         .catch(err => setError(err.response?.data?.error || err.message))
//         .finally(() => setLoading(false));
//     }
//   }, [editId]);

//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     setFormData(prev => ({
//       ...prev,
//       customer: selectedCustomer._id || "",
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData(prev => ({ ...prev, [name]: value }));
//   }, []);

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setFormData(prev => {
//       const items = [...prev.items];
//       items[index] = { ...items[index], [name]: value };
//       return { ...prev, items };
//     });
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);


//   const addItemRow = useCallback(() => {
//     setFormData(prev => ({
//       ...prev,
//       items: [...prev.items, { ...initialOrderState.items[0] }],
//     }));
//   }, []);

//   const handleSubmit = async () => {
//     try {
//       // const updatedItems = await Promise.all(
//       //   formData.items.map(async (item) => {
//       //     const itemId = item.itemId || item.item?._id || item.item || "";
//       //     const managedByValue = await fetchManagedBy(itemId);
//       //     return { ...item, managedBy: managedByValue || "batch" };
//       //   })
//       // );
//       const updatedFormData = { ...formData};

//       if (editId) {
//         await axios.put(`/api/sales-order/${editId}`, updatedFormData);
//         toast.success("Sales Order updated successfully");
//       } else {
//         await axios.post("/api/sales-order", updatedFormData);
//         toast.success("Sales Order added successfully");
//         setFormData(initialOrderState);
//       }
//       router.push("/admin/sales-order-view");
//     } catch (err) {
//       console.error("Submit error:", err);
//       toast.error(editId ? "Failed to update Sales Order" : "Failed to add Sales Order");
//     }
//   };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Order" : "Create Sales Order"}
//       </h1>
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             {isCopied ? (
//               <div>
//                 <label className="block mb-2 font-medium">Customer Name</label>
//                 <input
//                   type="text"
//                   name="customerName"
//                   value={formData.customerName || ""}
//                   onChange={handleInputChange}
//                   placeholder="Enter customer name"
//                   className="w-full p-2 border rounded"
//                 />
//               </div>
//             ) : (
//               <div>
//                 <label className="block mb-2 font-medium">Customer Name</label>
//                 <CustomerSearch onSelectCustomer={handleCustomerSelect} />
//               </div>
//             )}
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Customer Code</label>
//             <input
//               type="text"
//               name="customerCode"
//               value={formData.customerCode || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input
//               type="text"
//               name="contactPerson"
//               value={formData.contactPerson || ""}
//               readOnly
//               className="w-full p-2 border rounded bg-gray-100"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input
//               type="text"
//               name="refNumber"
//               value={formData.refNumber || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//         {/* Additional Order Info */}
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select
//               name="status"
//               value={formData.status || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             >
//               <option value="">Select status (optional)</option>
//               <option value="Pending">Pending</option>
//               <option value="Confirmed">Confirmed</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Order Date</label>
//             <input
//               type="date"
//               name="orderDate"
//               value={formData.orderDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">
//               Expected Delivery Date
//             </label>
//             <input
//               type="date"
//               name="expectedDeliveryDate"
//               value={formData.expectedDeliveryDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//         </div>
//       </div>

//       {/* Items Section */}
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={formData.items}
//           onItemChange={handleItemChange}
//           onAddItem={addItemRow}
        
//               onRemoveItem={removeItemRow}
       
//           setFormData={setFormData}
//         />
//       </div>

//       {/* Remarks & Sales Employee */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input
//             type="text"
//             name="salesEmployee"
//             value={formData.salesEmployee || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea
//             name="remarks"
//             value={formData.remarks || ""}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           ></textarea>
//         </div>
//       </div>

//       {/* Summary Section */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Total Before Discount</label>
//           <input
//             type="number"
//             value={formData.totalBeforeDiscount.toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input
//             type="number"
//             name="rounding"
//             value={formData.rounding || 0}
//             onChange={handleInputChange}
//             className="w-full p-2 border rounded"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST Total</label>
//           <input
//             type="number"
//             value={(formData.gstTotal ?? 0).toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Grand Total</label>
//           <input
//             type="number"
//             value={(formData.grandTotal ?? 0).toFixed(2)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//       </div>

//       {/* Action Buttons */}
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleSubmit}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {editId ? "Update" : "Add"}
//         </button>
//         <button
//           onClick={() => {
//             setFormData(initialOrderState);
//             router.push("/admin/salesOrder");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
//         <button
//           onClick={() => {
//             sessionStorage.setItem("salesOrderData", JSON.stringify(formData));
//             alert("Data copied from Sales Order!");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Copy From
//         </button>
//       </div>

//       <ToastContainer />
//     </div>
//   );
// }
// export default SalesOrderFormWrapper;