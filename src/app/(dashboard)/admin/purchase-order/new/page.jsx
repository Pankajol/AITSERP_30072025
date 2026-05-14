// "use client";

// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import SupplierSearch from "@/components/SupplierSearch";
// import { toast } from "react-toastify";

// const initialState = {
//   supplierCode: "",
//   supplierName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Open",
//   postingDate: "",
//   validUntil: "",
//   documentDate: "",
//   items: [],
//   salesEmployee: "",
//   remarks: "",
//   freight: 0,
//   rounding: 0,
//   totalBeforeDiscount: 0,
//   totalDownPayment: 0,
//   appliedAmounts: 0,
//   gstTotal: 0,
//   grandTotal: 0,
//   openBalance: 0,
// };

// export default function PurchaseOrderForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [formData, setFormData] = useState(initialState);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

// useEffect(() => {
//   const fetchOrder = async () => {
//     if (!editId) {
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const response = await axios.get(`/api/purchase-order/${editId}`);
      
//       const order = response.data;
//       setFormData({
//         ...order,
//         postingDate: formatDateForInput(order.postingDate),
//         validUntil: formatDateForInput(order.validUntil),
//         documentDate: formatDateForInput(order.documentDate),
//         items: order.items?.map(item => ({
//           ...item,
//           itemId: item.item?._id,
//           itemCode: item.item?.itemCode || item.itemCode,
//           itemName: item.item?.itemName || item.itemName,
//           unitPrice: item.item?.unitPrice || item.unitPrice,
//         })) || []
//       });
      
//     } catch (err) {
//       if (err.response?.status === 404) {
//         setError("Purchase order not found");
//         toast.error("Purchase order not found");
//         router.push("/admin/purchase-orders");
//       } else {
//         setError(err.response?.data?.error || "Failed to load order");
//         toast.error("Failed to load order data");
//       }
//     } finally {
//       setLoading(false);
//     }
//   };

//   fetchOrder();
// }, [editId, router]);

//   const formatDateForInput = (date) => {
//     if (!date) return "";
//     const d = new Date(date);
//     return d.toISOString().split('T')[0];
//   };

//   const handleSupplierSelect = (selectedSupplier) => {
//     setFormData(prev => ({
//       ...prev,
//       supplierCode: selectedSupplier.supplierCode || "",
//       supplierName: selectedSupplier.supplierName || "",
//       contactPerson: selectedSupplier.contactPerson || "",
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
//       const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "tdsAmount"];
//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      
//       updatedItems[index] = { 
//         ...updatedItems[index], 
//         [name]: newValue 
//       };

//       // Recalculate item totals
//       const { quantity = 1, unitPrice = 0, discount = 0, freight = 0, gstRate = 0 } = updatedItems[index];
//       const priceAfterDiscount = unitPrice - discount;
//       const totalAmount = quantity * priceAfterDiscount + freight;
//       const gstAmount = totalAmount * (gstRate / 100);

//       updatedItems[index].priceAfterDiscount = priceAfterDiscount;
//       updatedItems[index].totalAmount = totalAmount;
//       updatedItems[index].gstAmount = gstAmount;

//       return { ...prev, items: updatedItems };
//     });
//   };

//   const addItemRow = () => {
//     setFormData(prev => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 1,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstRate: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
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

//   // Calculate order totals whenever items change
//   useEffect(() => {
//     const totals = formData.items.reduce((acc, item) => {
//       acc.totalBeforeDiscount += (item.unitPrice - item.discount) * item.quantity;
//       acc.gstTotal += item.gstAmount || 0;
//       return acc;
//     }, { totalBeforeDiscount: 0, gstTotal: 0 });

//     const grandTotal = totals.totalBeforeDiscount + totals.gstTotal + (formData.freight || 0) + (formData.rounding || 0);
//     const openBalance = grandTotal - ((formData.totalDownPayment || 0) + (formData.appliedAmounts || 0));

//     setFormData(prev => ({
//       ...prev,
//       totalBeforeDiscount: totals.totalBeforeDiscount,
//       gstTotal: totals.gstTotal,
//       grandTotal,
//       openBalance
//     }));
//   }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
    
//     try {
//       if (editId) {
//         await axios.put(`/api/purchase-orders/${editId}`, formData);
//         toast.success("Purchase order updated successfully");
//       } else {
//         await axios.post("/api/purchase-orders", formData);
//         toast.success("Purchase order created successfully");
//       }
//       router.push("/admin/purchase-orders");
//     } catch (err) {
//       console.error("Error saving order:", err);
//       toast.error(err.response?.data?.message || "Error saving order");
//     }
//   };

//   if (loading) return <div className="p-8 text-center">Loading order data...</div>;
//   if (error) return <div className="p-8 text-red-600">{error}</div>;

//   return (
//     <div className="container mx-auto p-4">
//       <h1 className="text-2xl font-bold mb-6">
//         {editId ? "Edit Purchase Order" : "Create New Purchase Order"}
//       </h1>
      
//       <form onSubmit={handleSubmit}>
//         {/* Supplier Information */}
//         <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//           <h2 className="text-xl font-semibold mb-4">Supplier Information</h2>
//           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//             <div>
//               <label className="block mb-2">Supplier Name</label>
//               <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//             </div>
//             <div>
//               <label className="block mb-2">Supplier Code</label>
//               <input
//                 type="text"
//                 name="supplierCode"
//                 value={formData.supplierCode}
//                 readOnly
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             </div>
//             <div>
//               <label className="block mb-2">Contact Person</label>
//               <input
//                 type="text"
//                 name="contactPerson"
//                 value={formData.contactPerson}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Order Details */}
//         <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//           <h2 className="text-xl font-semibold mb-4">Order Details</h2>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <div>
//               <label className="block mb-2">Reference Number</label>
//               <input
//                 type="text"
//                 name="refNumber"
//                 value={formData.refNumber}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//               />
//             </div>
//             <div>
//               <label className="block mb-2">Status</label>
//               <select
//                 name="status"
//                 value={formData.status}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//               >
//                 <option value="Open">Open</option>
//                 <option value="Closed">Closed</option>
//                 <option value="Pending">Pending</option>
//               </select>
//             </div>
//             <div>
//               <label className="block mb-2">Posting Date</label>
//               <input
//                 type="date"
//                 name="postingDate"
//                 value={formData.postingDate}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//               />
//             </div>
//             <div>
//               <label className="block mb-2">Delivery Date</label>
//               <input
//                 type="date"
//                 name="documentDate"
//                 value={formData.documentDate}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Items Section */}
//         <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//           <div className="flex justify-between items-center mb-4">
//             <h2 className="text-xl font-semibold">Items</h2>
//             <button
//               type="button"
//               onClick={addItemRow}
//               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//             >
//               Add Item
//             </button>
//           </div>
//           <ItemSection
//             items={formData.items}
//             onItemChange={handleItemChange}
//             onRemoveItem={removeItemRow}
//           />
//         </div>

//         {/* Order Summary */}
//         <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//           <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
//           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
//             <div>
//               <label className="block mb-2">Total Before Tax</label>
//               <input
//                 type="number"
//                 value={formData.totalBeforeDiscount}
//                 readOnly
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             </div>
//             <div>
//               <label className="block mb-2">GST Total</label>
//               <input
//                 type="number"
//                 value={formData.gstTotal}
//                 readOnly
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             </div>
//             <div>
//               <label className="block mb-2">Freight</label>
//               <input
//                 type="number"
//                 name="freight"
//                 value={formData.freight}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//               />
//             </div>
//             <div>
//               <label className="block mb-2">Grand Total</label>
//               <input
//                 type="number"
//                 value={formData.grandTotal}
//                 readOnly
//                 className="w-full p-2 border rounded bg-gray-100"
//               />
//             </div>
//           </div>
//         </div>

//         {/* Form Actions */}
//         <div className="flex justify-end gap-4">
//           <button
//             type="button"
//             onClick={() => router.push("/admin/purchase-orders")}
//             className="px-6 py-2 border border-gray-300 rounded hover:bg-gray-100"
//           >
//             Cancel
//           </button>
//           <button
//             type="submit"
//             className="px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600"
//           >
//             {editId ? "Update Order" : "Create Order"}
//           </button>
//         </div>
//       </form>
//     </div>
//   );
// }

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import SupplierSearch from "@/components/SupplierSearch";
import { Suspense } from "react";

const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

const computeItemValues = (item) => {
  const quantity = parseFloat(item.quantity) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  const discount = parseFloat(item.discount) || 0;
  const freight = parseFloat(item.freight) || 0;
  const priceAfterDiscount = round(unitPrice - discount);
  const totalAmount = round(quantity * priceAfterDiscount + freight);

  if (item.taxOption === "GST") {
    const gstRate = parseFloat(item.gstRate) || 0;
    const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : gstRate / 2;
    const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : gstRate / 2;
    const cgstAmount = round(totalAmount * (cgstRate / 100));
    const sgstAmount = round(totalAmount * (sgstRate / 100));
    const gstAmount = round(cgstAmount + sgstAmount);
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount,
      cgstAmount,
      sgstAmount,
      igstAmount: 0,
    };
  }

  if (item.taxOption === "IGST") {
    let igstRate = item.igstRate;
    if (igstRate === undefined || parseFloat(igstRate) === 0) {
      igstRate = item.gstRate !== undefined ? parseFloat(item.gstRate) : 0;
    } else {
      igstRate = parseFloat(igstRate);
    }
    const igstAmount = round(totalAmount * (igstRate / 100));
    return {
      priceAfterDiscount,
      totalAmount,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount,
    };
  }

  return {
    priceAfterDiscount,
    totalAmount,
    gstAmount: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    igstAmount: 0,
  };
};

const initialState = {
  supplier: "",
  supplierCode: "",
  supplierName: "",
  contactPerson: "",
  refNumber: "",
  orderStatus: "Open",
  paymentStatus: "Pending",
  stockStatus: "Not Updated",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      item: "",
      itemCode: "",
      itemName: "",
      itemDescription: "",
      orderedQuantity: 0,
      receivedQuantity: 0,
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstRate: 0,
      taxOption: "GST",
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstRate: 0,
      igstAmount: 0,
      tdsAmount: 0,
      managedBy: "",
      batches: [],
      qualityCheckDetails: [],
      warehouse: "",
      warehouseCode: "",
      warehouseName: "",
      stockAdded: false,
    },
  ],
  salesEmployee: "",
  remarks: "",
  freight: 0,
  rounding: 0,
  totalBeforeDiscount: 0,
  totalDownPayment: 0,
  appliedAmounts: 0,
  gstTotal: 0,
  grandTotal: 0,
  openBalance: 0,
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function OrderFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <OrderForm />
    </Suspense>
  );
}

function OrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [formData, setFormData] = useState(initialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Initialize from sessionStorage if no editId
    if (!editId) {
      const storedData = sessionStorage.getItem("purchaseOrderData");
      if (storedData) {
        try {
          const quotation = JSON.parse(storedData);
          console.log("Loaded from sessionStorage:", quotation);
          // Validate quotation structure
          if (!quotation || typeof quotation !== "object") {
            throw new Error("Invalid quotation data");
          }
          // Ensure items is an array
          if (!Array.isArray(quotation.items)) {
            console.warn("Quotation items is not an array, defaulting to empty array:", quotation.items);
            quotation.items = [];
          }
          setFormData({
            ...initialState,
            ...quotation,
            supplier: quotation.supplier?._id || quotation.supplier || "",
            supplierCode: quotation.supplierCode || "",
            supplierName: quotation.supplierName || "",
            contactPerson: quotation.contactPerson || "",
            orderStatus: quotation.orderStatus || quotation.status || "Open",
            paymentStatus: quotation.paymentStatus || "Pending",
            stockStatus: quotation.stockStatus || "Not Updated",
            postingDate: formatDateForInput(quotation.postingDate),
            validUntil: formatDateForInput(quotation.validUntil),
            documentDate: formatDateForInput(quotation.documentDate),
            items: quotation.items.length > 0
              ? quotation.items.map((item) => {
                  const computed = computeItemValues({
                    ...item,
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    discount: item.discount || 0,
                    freight: item.freight || 0,
                    gstRate: item.gstRate || 0,
                    taxOption: item.taxOption || "GST",
                  });
                  return {
                    ...initialState.items[0],
                    ...item,
                    ...computed,
                    item: item.item?._id || item.item || "",
                    itemCode: item.itemCode || "",
                    itemName: item.itemName || "",
                    itemDescription: item.itemDescription || "",
                    orderedQuantity: item.quantity || item.orderedQuantity || 0,
                    receivedQuantity: item.receivedQuantity || 0,
                    quantity: item.quantity || 0,
                    unitPrice: item.unitPrice || 0,
                    discount: item.discount || 0,
                    freight: item.freight || 0,
                    gstRate: item.gstRate || 0,
                    taxOption: item.taxOption || "GST",
                    igstRate: item.igstRate || 0,
                    tdsAmount: item.tdsAmount || 0,
                    managedBy: item.managedBy || "",
                    batches: item.batches || [],
                    qualityCheckDetails: item.qualityCheckDetails || [],
                    warehouse: item.warehouse?._id || item.warehouse || "",
                    warehouseCode: item.warehouseCode || "",
                    warehouseName: item.warehouseName || "",
                    stockAdded: item.stockAdded || false,
                  };
                })
              : [{ ...initialState.items[0] }],
            gstTotal: quotation.gstTotal || quotation.gstAmount || 0,
            grandTotal: quotation.grandTotal || 0,
          });
          // Clear sessionStorage after loading
          sessionStorage.removeItem("purchaseOrderData");
        } catch (err) {
          console.error("Error parsing sessionStorage data:", err);
          setError("Failed to load quotation data: " + err.message);
        }
      }
    }
    // Fetch from API if editId exists
    else if (editId && /^[0-9a-fA-F]{24}$/.test(editId)) {
      setLoading(true);
      axios
        .get(`/api/purchase-order/${editId}`)
        .then((res) => {
          if (!res.data.success) {
            throw new Error(res.data.error || "Failed to load purchase order");
          }
          const record = res.data.data;
          console.log("Fetched purchase order:", record);
          if (!Array.isArray(record.items)) {
            console.warn("Items is not an array, defaulting to empty array:", record.items);
            record.items = [];
          }
          setFormData({
            ...initialState,
            ...record,
            supplier: record.supplier?._id || record.supplier || "",
            supplierCode: record.supplierCode || "",
            supplierName: record.supplier?.supplierName || record.supplierName || "",
            contactPerson: record.supplier?.contactPerson || record.contactPerson || "",
            orderStatus: record.orderStatus || "Open",
            paymentStatus: record.paymentStatus || "Pending",
            stockStatus: record.stockStatus || "Not Updated",
            postingDate: formatDateForInput(record.postingDate),
            validUntil: formatDateForInput(record.validUntil),
            documentDate: formatDateForInput(record.documentDate),
            items: record.items.length > 0
              ? record.items.map((item) => ({
                  ...initialState.items[0],
                  ...item,
                  item: item.item?._id || item.item || "",
                  itemCode: item.item?.itemCode || item.itemCode || "",
                  itemName: item.item?.itemName || item.itemName || "",
                  itemDescription: item.itemDescription || "",
                  orderedQuantity: item.orderedQuantity || 0,
                  receivedQuantity: item.receivedQuantity || 0,
                  quantity: item.quantity || 0,
                  unitPrice: item.unitPrice || 0,
                  discount: item.discount || 0,
                  freight: item.freight || 0,
                  gstRate: item.gstRate || 0,
                  taxOption: item.taxOption || "GST",
                  priceAfterDiscount: item.priceAfterDiscount || 0,
                  totalAmount: item.totalAmount || 0,
                  gstAmount: item.gstAmount || 0,
                  cgstAmount: item.cgstAmount || 0,
                  sgstAmount: item.sgstAmount || 0,
                  igstRate: item.igstRate || 0,
                  igstAmount: item.igstAmount || 0,
                  tdsAmount: item.tdsAmount || 0,
                  managedBy: item.managedBy || "",
                  batches: item.batches || [],
                  qualityCheckDetails: item.qualityCheckDetails || [],
                  warehouse: item.warehouse?._id || item.warehouse || "",
                  warehouseCode: item.warehouse?.warehouseCode || item.warehouseCode || "",
                  warehouseName: item.warehouse?.warehouseName || item.warehouseName || "",
                  stockAdded: item.stockAdded || false,
                }))
              : [{ ...initialState.items[0] }],
            gstTotal: record.gstTotal || 0,
          });
        })
        .catch((err) => {
          console.error("Error fetching purchase order:", err);
          setError("Error loading purchase order: " + (err.message || "Unknown error"));
        })
        .finally(() => {
          setLoading(false);
        });
    } else if (editId) {
      setError("Invalid purchase order ID");
    }
  }, [editId]);

  const handleSupplierSelect = useCallback((selectedSupplier) => {
    setFormData((prev) => ({
      ...prev,
      supplier: selectedSupplier._id || "",
      supplierCode: selectedSupplier.supplierCode || "",
      supplierName: selectedSupplier.supplierName || "",
      contactPerson: selectedSupplier.contactPersonName || "",
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const numericFields = [
        "orderedQuantity",
        "receivedQuantity",
        "quantity",
        "unitPrice",
        "discount",
        "freight",
        "gstRate",
        "cgstRate",
        "sgstRate",
        "igstRate",
        "tdsAmount",
        "priceAfterDiscount",
        "totalAmount",
        "gstAmount",
        "cgstAmount",
        "sgstAmount",
        "igstAmount",
      ];
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      if (name === "quantity") {
        updatedItems[index].orderedQuantity = newValue; // Sync orderedQuantity
      }
      // Recompute values if relevant fields change
      if (["quantity", "unitPrice", "discount", "freight", "gstRate", "igstRate", "taxOption"].includes(name)) {
        const computed = computeItemValues(updatedItems[index]);
        updatedItems[index] = { ...updatedItems[index], ...computed };
      }
      return { ...prev, items: updatedItems };
    });
  }, []);

  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { ...initialState.items[0] },
      ],
    }));
  }, []);

  const handleRemoveItem = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  useEffect(() => {
    const totalBeforeDiscount = round(
      formData.items.reduce((acc, item) => {
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const quantity = parseFloat(item.quantity) || 0;
        return acc + (unitPrice - discount) * quantity;
      }, 0)
    );

    const totalItems = round(
      formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)
    );

    const gstTotal = round(
      formData.items.reduce((acc, item) => {
        return acc + (parseFloat(item.taxOption === "IGST" ? item.igstAmount : item.gstAmount) || 0);
      }, 0)
    );

    const overallFreight = round(parseFloat(formData.freight) || 0);
    const rounding = round(parseFloat(formData.rounding) || 0);
    const totalDownPayment = round(parseFloat(formData.totalDownPayment) || 0);
    const appliedAmounts = round(parseFloat(formData.appliedAmounts) || 0);

    const grandTotal = round(totalItems + gstTotal + overallFreight + rounding);
    const openBalance = round(grandTotal - (totalDownPayment + appliedAmounts));

    setFormData((prev) => ({
      ...prev,
      totalBeforeDiscount,
      gstTotal,
      grandTotal,
      openBalance,
    }));
  }, [formData.items, formData.freight, formData.rounding, formData.totalDownPayment, formData.appliedAmounts]);

  const handleSubmit = async () => {
    if (!formData.supplierName || !formData.supplierCode) {
      alert("Please select a valid supplier");
      return;
    }
    if (formData.items.length === 0 || formData.items.every((item) => !item.itemName)) {
      alert("Please add at least one valid item");
      return;
    }
    setLoading(true);
    const payload = {
      ...formData,
      status: undefined, // Remove status to avoid schema validation error
    };
    try {
      if (editId) {
        const response = await axios.put(`/api/purchase-order/${editId}`, payload, {
          headers: { "Content-Type": "application/json" },
        });
        alert(response.data.message);
      } else {
        const response = await axios.post("/api/purchase-order", payload, {
          headers: { "Content-Type": "application/json" },
        });
        alert(response.data.message);
        setFormData(initialState);
      }
      router.push("/admin/purchase-order-view");
    } catch (error) {
      console.error("Error saving purchase order:", error);
      alert(`Failed to ${editId ? "update" : "add"} purchase order: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">{editId ? "Edit Purchase Order" : "Create Purchase Order"}</h1>
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="grid grid-cols-2 gap-7">
          <div>
            <label className="block mb-2 font-medium">Supplier Name</label>
            <SupplierSearch onSelectSupplier={handleSupplierSelect} />
          </div>
          <div>
            <label className="block mb-2 font-medium">Supplier Code</label>
            <input
              type="text"
              name="supplierCode"
              value={formData.supplierCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Contact Person</label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Reference Number</label>
            <input
              type="text"
              name="refNumber"
              value={formData.refNumber || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
        <div className="w-full md:w-1/2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Order Status</label>
            <select
              name="orderStatus"
              value={formData.orderStatus || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Open">Open</option>
              <option value="Close">Close</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block mb-2 font-medium">Posting Date</label>
            <input
              type="date"
              name="postingDate"
              value={formData.postingDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Valid Until</label>
            <input
              type="date"
              name="validUntil"
              value={formData.validUntil || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Delivery Date</label>
            <input
              type="date"
              name="documentDate"
              value={formData.documentDate || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
          </div>
        </div>
      </div>
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onRemoveItem={handleRemoveItem}
          computeItemValues={computeItemValues}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Sales Employee</label>
          <input
            type="text"
            name="salesEmployee"
            value={formData.salesEmployee || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Remarks</label>
          <textarea
            name="remarks"
            value={formData.remarks || ""}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          ></textarea>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="totalBeforeDiscount"
            value={formData.totalBeforeDiscount || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Rounding</label>
          <input
            type="number"
            name="rounding"
            value={formData.rounding || 0}
            onChange={handleInputChange}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">GST</label>
          <input
            type="number"
            name="gstTotal"
            value={formData.gstTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
        <div>
          <label className="block mb-2 font-medium">Total Amount</label>
          <input
            type="number"
            name="grandTotal"
            value={formData.grandTotal || 0}
            readOnly
            className="w-full p-2 border rounded bg-gray-100"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          disabled={loading}
          className={`px-4 py-2 rounded text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-orange-400 hover:bg-orange-300"
          }`}
        >
          {loading ? "Saving..." : editId ? "Update" : "Add"}
        </button>
        <button
          onClick={() => router.push("/admin/purchase-order-view")}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default OrderFormWrapper;
