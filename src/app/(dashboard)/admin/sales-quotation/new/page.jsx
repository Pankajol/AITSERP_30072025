// "use client";
// import { useState, useEffect, useCallback } from "react";
// import { useRouter, useSearchParams } from "next/navigation";
// import  { Suspense } from "react";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import CustomerSearch from "@/components/CustomerSearch";

// const initialState = {
//   customerCode: "",
//   customerName: "",
//   contactPerson: "",
//   refNumber: "",
//   status: "Open",
//   postingDate: "",
//   validUntil: "",
//   documentDate: "",
//   items: [
//     {
//       itemCode: "",
//       itemName: "",
//       itemDescription: "",
//       quantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstType: 0,
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       tdsAmount: 0,
//       // New warehouse fields
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//     },
//   ],
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

// function formatDateForInput(date) {
//   if (!date) return "";
//   const d = new Date(date);
//   const year = d.getFullYear();
//   const month = ("0" + (d.getMonth() + 1)).slice(-2);
//   const day = ("0" + d.getDate()).slice(-2);
//   return `${year}-${month}-${day}`;
// }

// function SalesQuotationFormWrapper() {
//   return (
// <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
//       <SalesQuotationForm />
//     </Suspense>
//   );
// }



//  function SalesQuotationForm() {
//   const router = useRouter();
//   const searchParams = useSearchParams();
//   const editId = searchParams.get("editId");

//   const [formData, setFormData] = useState(initialState);
//   const [items, setItems] = useState([{ /* initial item data */ }]);

//   // If editId is present, fetch and prefill the data (with formatted dates)
//   useEffect(() => {
//     if (editId) {
//       axios
//         .get(`/api/salesQuotation/${editId}`)
//         .then((res) => {
//           if (res.data.success) {
//             const record = res.data.data;
//             setFormData({
//               ...record,
//               postingDate: formatDateForInput(record.postingDate),
//               validUntil: formatDateForInput(record.validUntil),
//               documentDate: formatDateForInput(record.documentDate),
//             });
//           }
//         })
//         .catch((err) => {
//           console.error("Error fetching quotation for edit", err);
//         });
//     }
//   }, [editId]);

//   // Handler for customer selection.
//   const handleCustomerSelect = useCallback((selectedCustomer) => {
//     setFormData((prev) => ({
//       ...prev,
//       customerCode: selectedCustomer.customerCode || "",
//       customerName: selectedCustomer.customerName || "",
//       contactPerson: selectedCustomer.contactPersonName || "",
//     }));
//   }, []);

//   // General input change handler.
//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({ ...prev, [name]: value }));
//   }, []);

// // Add this helper function at the top of your file
// const round = (num, decimals = 2) => {
//   const n = Number(num);
//   if (isNaN(n)) return 0;
//   return Number(n.toFixed(decimals));
// };

// // Update your handleItemChange function:
// const handleItemChange = useCallback((index, e) => {
//   const { name, value } = e.target;
//   setFormData((prev) => {
//     const updatedItems = [...prev.items];
//     const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstType", "tdsAmount"];
//     const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//     updatedItems[index] = { ...updatedItems[index], [name]: newValue };

//     // Calculate derived values with proper rounding
//     const { unitPrice = 0, discount = 0, quantity = 1, freight: itemFreight = 0, gstType = 0 } = updatedItems[index];
//     const priceAfterDiscount = round(unitPrice - discount);
//     const totalAmount = round(quantity * priceAfterDiscount + itemFreight);
//     const gstAmount = round(totalAmount * (gstType / 100));

//     updatedItems[index].priceAfterDiscount = priceAfterDiscount;
//     updatedItems[index].totalAmount = totalAmount;
//     updatedItems[index].gstAmount = gstAmount;

//     return { ...prev, items: updatedItems };
//   });
// }, []);

// // Update your summary calculation useEffect:
// useEffect(() => {
//   const totalBeforeDiscountCalc = round(formData.items.reduce((acc, item) => {
//     const unitPrice = parseFloat(item.unitPrice) || 0;
//     const discount = parseFloat(item.discount) || 0;
//     const quantity = parseFloat(item.quantity) || 1;
//     return acc + (unitPrice * quantity - discount);
//   }, 0));

//   const totalItemsCalc = round(formData.items.reduce(
//     (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//     0
//   ));

//   const gstTotalCalc = round(formData.items.reduce((acc, item) => {
//     return acc + (parseFloat(item.gstAmount) || 0);
//   }, 0));

//   const overallFreight = round(parseFloat(formData.freight) || 0);
//   const roundingCalc = round(parseFloat(formData.rounding) || 0);
//   const totalDownPaymentCalc = round(parseFloat(formData.totalDownPayment) || 0);
//   const appliedAmountsCalc = round(parseFloat(formData.appliedAmounts) || 0);

//   const grandTotalCalc = round(totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc);
//   const openBalanceCalc = round(grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc));

//   setFormData((prev) => ({
//     ...prev,
//     totalBeforeDiscount: totalBeforeDiscountCalc,
//     gstTotal: gstTotalCalc,
//     grandTotal: grandTotalCalc,
//     openBalance: openBalanceCalc,
//   }));
// }, [
//   formData.items,
//   formData.freight,
//   formData.rounding,
//   formData.totalDownPayment,
//   formData.appliedAmounts,
// ]);

// // Update your ItemSection component to include proper GST calculations:
// // (Make sure your ItemSection component has this logic)
// const computeItemValues = (item) => {
//   const quantity = parseFloat(item.quantity) || 0;
//   const unitPrice = parseFloat(item.unitPrice) || 0;
//   const discount = parseFloat(item.discount) || 0;
//   const freight = parseFloat(item.freight) || 0;
//   const priceAfterDiscount = round(unitPrice - discount);
//   const totalAmount = round(quantity * priceAfterDiscount + freight);

//   if (item.taxOption === "GST") {
//     const gstRate = parseFloat(item.gstRate) || 0;
//     const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : (gstRate / 2);
//     const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : (gstRate / 2);
    
//     const cgstAmount = round(totalAmount * (cgstRate / 100));
//     const sgstAmount = round(totalAmount * (sgstRate / 100));
//     const gstAmount = round(cgstAmount + sgstAmount);
    
//     return { 
//       priceAfterDiscount, 
//       totalAmount, 
//       gstAmount, 
//       cgstAmount, 
//       sgstAmount, 
//       igstAmount: 0 
//     };
//   }
  
//   if (item.taxOption === "IGST") {
//     const igstRate = parseFloat(item.igstRate) || 0;
//     const igstAmount = round(totalAmount * (igstRate / 100));
//     return { 
//       priceAfterDiscount, 
//       totalAmount, 
//       gstAmount: 0, 
//       cgstAmount: 0, 
//       sgstAmount: 0, 
//       igstAmount 
//     };
//   }
  
//   return { 
//     priceAfterDiscount, 
//     totalAmount, 
//     gstAmount: 0, 
//     cgstAmount: 0, 
//     sgstAmount: 0, 
//     igstAmount: 0 
//   };
// };





//   // Handler for individual item changes.
//   // const handleItemChange = useCallback((index, e) => {
//   //   const { name, value } = e.target;
//   //   setFormData((prev) => {
//   //     const updatedItems = [...prev.items];
//   //     const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstType",  "gstAmount","tdsAmount"];
//   //     const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//   //     updatedItems[index] = { ...updatedItems[index], [name]: newValue };

//   //     // Calculate derived values.
//   //     const { unitPrice = 0, discount = 0, quantity = 1, freight: itemFreight = 0, gstType = 0 } = updatedItems[index];
//   //     const priceAfterDiscount = unitPrice - discount;
//   //     const totalAmount = quantity * priceAfterDiscount + itemFreight;
//   //     const gstAmount = totalAmount * (gstType / 100);

//   //     updatedItems[index].priceAfterDiscount = priceAfterDiscount;
//   //     updatedItems[index].totalAmount = totalAmount;
//   //     updatedItems[index].gstAmount = gstAmount;

//   //     return { ...prev, items: updatedItems };
//   //   });
//   // }, []);

// const removeItemRow = useCallback((index) => {
//   setFormData((prev) => ({
//     ...prev,
//     items: prev.items.filter((_, i) => i !== index),
//   }));
// }, []);

//   // Handler to add a new item row.
//   const addItemRow = useCallback(() => {
//     setFormData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstType: 0,
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           tdsAmount: 0,
//           // New warehouse fields for the new item row
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//         },
//       ],
//     }));
//   }, []);

//   // Recalculate summary fields when items or related fields change.
//   useEffect(() => {
//     const totalBeforeDiscountCalc = formData.items.reduce((acc, item) => {
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 1;
//       return acc + (unitPrice - discount) * quantity;
//     }, 0);

//     const totalItemsCalc = formData.items.reduce(
//       (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//       0
//     );

//    const gstTotalCalc = formData.items.reduce((acc, item) => {
//       if (item.taxOption === "IGST") {
//         return acc + (parseFloat(item.gstAmount) || 0);
//       }
//       return acc + (parseFloat(item.gstAmount) || 0);
//     }, 0);
//     const overallFreight = parseFloat(formData.freight) || 0;
//     const roundingCalc = parseFloat(formData.rounding) || 0;
//     const totalDownPaymentCalc = parseFloat(formData.totalDownPayment) || 0;
//     const appliedAmountsCalc = parseFloat(formData.appliedAmounts) || 0;

//     const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//     const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);

//     setFormData((prev) => ({
//       ...prev,
//       totalBeforeDiscount: totalBeforeDiscountCalc,
//       gstTotal: gstTotalCalc,
//       grandTotal: grandTotalCalc,
//       openBalance: openBalanceCalc,
//     }));
//   }, [
//     formData.items,
//     formData.freight,
//     formData.rounding,
//     formData.totalDownPayment,
//     formData.appliedAmounts,
//   ]);

//   // Handler for form submission: update if editing, otherwise create new.
//   const handleSubmit = async () => {
//     if (editId) {
//       try {
//         await axios.put(`/api/sales-quotation/${editId}`, formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("Sales Quotation updated successfully");
//         router.push("/admin/salesQuotation");
//       } catch (error) {
//         console.error("Error updating sales quotation:", error);
//         alert("Failed to update sales quotation");
//       }
//     } else {
//       try {
//         await axios.post("/api/sales-quotation", formData, {
//           headers: { "Content-Type": "application/json" },
//         });
//         alert("Sales Quotation added successfully");
//         setFormData(initialState);
//         // router.push("/admin/salesQuotation");
//       } catch (error) {
//         console.error("Error adding sales quotation:", error);
//         alert("Error adding sales quotation");
//       }
//     }
//   };

//   return (
//     <div className="m-11 p-5 shadow-xl">
//       <h1 className="text-2xl font-bold mb-4">
//         {editId ? "Edit Sales Quotation" : "Create Sales Quotation"}
//       </h1>
//       {/* Customer Section */}
//       <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
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
//             <label className="block mb-2 font-medium">Customer Name</label>
//             <CustomerSearch onSelectCustomer={handleCustomerSelect} />
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
//         {/* Additional Quotation Info */}
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
//               <option value="Open">Open</option>
//               <option value="Closed">Closed</option>
//               <option value="Pending">Pending</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input
//               type="date"
//               name="postingDate"
//               value={formData.postingDate || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input
//               type="date"
//               name="validUntil"
//               value={formData.validUntil || ""}
//               onChange={handleInputChange}
//               className="w-full p-2 border rounded"
//             />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Delivery Date</label>
//             <input
//               type="date"
//               name="documentDate"
//               value={formData.documentDate || ""}
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
//           onRemoveItem={removeItemRow}
//         />
//       </div>
//       {/* Other Form Fields & Summary */}
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
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="taxableAmount"
//             value={formData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
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
//           <label className="block mb-2 font-medium">GST</label>
//           <input
//             type="number"
//             name="gstTotal"
//             value={formData.gstTotal || 0}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Total Amount</label>
//           <input
//             type="number"
//             name="grandTotal"
//             value={formData.grandTotal || 0}
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
//             setFormData(initialState);
//             router.push("/admin/salesQuotation");
//           }}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Cancel
//         </button>
     
//       </div>
//     </div>
//   );
// }


// export default SalesQuotationFormWrapper;




"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import axios from "axios";
import ItemSection from "@/components/ItemSection";
import CustomerSearch from "@/components/CustomerSearch";

const initialState = {
  customerCode: "",
  customerName: "",
  contactPerson: "",
  refNumber: "",
  status: "Open",
  postingDate: "",
  validUntil: "",
  documentDate: "",
  items: [
    {
      itemCode: "",
      itemName: "",
      itemDescription: "",
      quantity: 0,
      unitPrice: 0,
      discount: 0,
      freight: 0,
      gstType: 0,
      priceAfterDiscount: 0,
      totalAmount: 0,
      gstAmount: 0,
      tdsAmount: 0,
      warehouse: "",
      warehouseName: "",
      warehouseCode: "",
      taxOption: "GST",
      gstRate: 0,
      cgstRate: 0,
      sgstRate: 0,
      igstRate: 0,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 0,
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

// Helper function to round numbers
const round = (num, decimals = 2) => {
  const n = Number(num);
  if (isNaN(n)) return 0;
  return Number(n.toFixed(decimals));
};

function formatDateForInput(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

function SalesQuotationFormWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <SalesQuotationForm />
    </Suspense>
  );
}

function SalesQuotationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("editId");
  const [formData, setFormData] = useState(initialState);

  useEffect(() => {
    if (editId) {
      axios
        .get(`/api/salesQuotation/${editId}`)
        .then((res) => {
          if (res.data.success) {
            const record = res.data.data;
            setFormData({
              ...record,
              postingDate: formatDateForInput(record.postingDate),
              validUntil: formatDateForInput(record.validUntil),
              documentDate: formatDateForInput(record.documentDate),
            });
          }
        })
        .catch((err) => {
          console.error("Error fetching quotation for edit", err);
        });
    }
  }, [editId]);

  const handleCustomerSelect = useCallback((selectedCustomer) => {
    setFormData((prev) => ({
      ...prev,
      customerCode: selectedCustomer.customerCode || "",
      customerName: selectedCustomer.customerName || "",
      contactPerson: selectedCustomer.contactPersonName || "",
    }));
  }, []);

  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);


  const computeItemValues = (item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const discount = parseFloat(item.discount) || 0;
    const freight = parseFloat(item.freight) || 0;
    const priceAfterDiscount = round(unitPrice - discount);
    const totalAmount = round(quantity * priceAfterDiscount + freight);

    if (item.taxOption === "GST") {
      const gstRate = parseFloat(item.gstRate) || 0;
      const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : (gstRate / 2);
      const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : (gstRate / 2);
      
      const cgstAmount = round(totalAmount * (cgstRate / 100));
      const sgstAmount = round(totalAmount * (sgstRate / 100));
      const gstAmount = round(cgstAmount + sgstAmount);
      
      return { 
        priceAfterDiscount, 
        totalAmount, 
        gstAmount, 
        cgstAmount, 
        sgstAmount, 
        igstAmount: 0 
      };
    }
    
    if (item.taxOption === "IGST") {
      const igstRate = parseFloat(item.igstRate) || 0;
      const igstAmount = round(totalAmount * (igstRate / 100));
      return { 
        priceAfterDiscount, 
        totalAmount, 
        gstAmount: 0, 
        cgstAmount: 0, 
        sgstAmount: 0, 
        igstAmount 
      };
    }
    
    return { 
      priceAfterDiscount, 
      totalAmount, 
      gstAmount: 0, 
      cgstAmount: 0, 
      sgstAmount: 0, 
      igstAmount: 0 
    };
  };

  const handleItemChange = useCallback((index, e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updatedItems = [...prev.items];
      const numericFields = [
        "quantity", "unitPrice", "discount", "freight", 
        "gstRate", "cgstRate", "sgstRate", "igstRate", "tdsAmount"
      ];
      
      const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
      updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      
      // Recalculate all values whenever tax-related fields change
      if (name.includes("Rate") || name === "taxOption" || name === "quantity" || 
          name === "unitPrice" || name === "discount" || name === "freight") {
        const computed = computeItemValues(updatedItems[index]);
        updatedItems[index] = { 
          ...updatedItems[index],
          priceAfterDiscount: computed.priceAfterDiscount,
          totalAmount: computed.totalAmount,
          gstAmount: computed.gstAmount,
          cgstAmount: computed.cgstAmount,
          sgstAmount: computed.sgstAmount,
          igstAmount: computed.igstAmount
        };
      }

      return { ...prev, items: updatedItems };
    });
  }, []);

  const removeItemRow = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  const addItemRow = useCallback(() => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          itemCode: "",
          itemName: "",
          itemDescription: "",
          quantity: 0,
          unitPrice: 0,
          discount: 0,
          freight: 0,
          gstType: 0,
          priceAfterDiscount: 0,
          totalAmount: 0,
          gstAmount: 0,
          tdsAmount: 0,
          warehouse: "",
          warehouseName: "",
          warehouseCode: "",
          taxOption: "GST",
          gstRate: 0,
          cgstRate: 0,
          sgstRate: 0,
          igstRate: 0,
          cgstAmount: 0,
          sgstAmount: 0,
          igstAmount: 0,
        },
      ],
    }));
  }, []);

  useEffect(() => {
    const totalBeforeDiscountCalc = round(formData.items.reduce((acc, item) => {
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const discount = parseFloat(item.discount) || 0;
      const quantity = parseFloat(item.quantity) || 1;
      return acc + (unitPrice * quantity - discount);
    }, 0));

    const totalItemsCalc = round(formData.items.reduce(
      (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
      0
    ));

    const gstTotalCalc = round(formData.items.reduce((acc, item) => {
      return acc + (parseFloat(item.gstAmount) || 0);
    }, 0));

    const overallFreight = round(parseFloat(formData.freight) || 0);
    const roundingCalc = round(parseFloat(formData.rounding) || 0);
    const totalDownPaymentCalc = round(parseFloat(formData.totalDownPayment) || 0);
    const appliedAmountsCalc = round(parseFloat(formData.appliedAmounts) || 0);

    const grandTotalCalc = round(totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc);
    const openBalanceCalc = round(grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc));

    setFormData((prev) => ({
      ...prev,
      totalBeforeDiscount: totalBeforeDiscountCalc,
      gstTotal: gstTotalCalc,
      grandTotal: grandTotalCalc,
      openBalance: openBalanceCalc,
    }));
  }, [
    formData.items,
    formData.freight,
    formData.rounding,
    formData.totalDownPayment,
    formData.appliedAmounts,
  ]);

  const handleSubmit = async () => {
    if (editId) {
      try {
        await axios.put(`/api/sales-quotation/${editId}`, formData, {
          headers: { "Content-Type": "application/json" },
        });
        alert("Sales Quotation updated successfully");
        router.push("/admin/salesQuotation");
      } catch (error) {
        console.error("Error updating sales quotation:", error);
        alert("Failed to update sales quotation");
      }
    } else {
      try {
        await axios.post("/api/sales-quotation", formData, {
          headers: { "Content-Type": "application/json" },
        });
        alert("Sales Quotation added successfully");
        setFormData(initialState);
      } catch (error) {
        console.error("Error adding sales quotation:", error);
        alert("Error adding sales quotation");
      }
    }
  };

  return (
    <div className="m-11 p-5 shadow-xl">
      <h1 className="text-2xl font-bold mb-4">
        {editId ? "Edit Sales Quotation" : "Create Sales Quotation"}
      </h1>
      {/* Customer Section */}
      <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Customer Code</label>
            <input
              type="text"
              name="customerCode"
              value={formData.customerCode || ""}
              readOnly
              className="w-full p-2 border rounded bg-gray-100"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            <CustomerSearch onSelectCustomer={handleCustomerSelect} />
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
        {/* Additional Quotation Info */}
        <div className="basis-full md:basis-1/2 px-2 space-y-4">
          <div>
            <label className="block mb-2 font-medium">Status</label>
            <select
              name="status"
              value={formData.status || ""}
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="Open">Open</option>
              <option value="Closed">Closed</option>
              <option value="Pending">Pending</option>
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
      {/* Items Section */}
      <h2 className="text-xl font-semibold mt-6">Items</h2>
      <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
        <ItemSection
          items={formData.items}
          onItemChange={handleItemChange}
          onAddItem={addItemRow}
          onRemoveItem={removeItemRow}
        />
      </div>
      {/* Other Form Fields & Summary */}
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
      {/* Summary Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <div>
          <label className="block mb-2 font-medium">Taxable Amount</label>
          <input
            type="number"
            name="taxableAmount"
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
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
        <button
          onClick={handleSubmit}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          {editId ? "Update" : "Add"}
        </button>
        <button
          onClick={() => {
            setFormData(initialState);
            router.push("/admin/salesQuotation");
          }}
          className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default SalesQuotationFormWrapper;