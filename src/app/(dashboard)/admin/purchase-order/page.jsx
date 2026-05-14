// "use client";
// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import SupplierSearch from "@/components/SupplierSearch";
// import { FaCheckCircle } from "react-icons/fa";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Demo supplier suggestions.
// const demoSuggestions = [
//   { _id: "demo1", name: "Demo Supplier One", code: "DS1", contactPerson: "Alice" },
//   { _id: "demo2", name: "Demo Supplier Two", code: "DS2", contactPerson: "Bob" },
//   { _id: "demo3", name: "Demo Supplier Three", code: "DS3", contactPerson: "Charlie" },
// ];

// // Updated initial state using new fields.
// const initialPurchaseOrderState = {
//   supplierCode: "",
//   supplierName: "",
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
//       orderedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstRate: 0,            // new field (instead of gstType)
//       taxOption: "GST",      // "GST" or "IGST"
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       stockAdded: false,
//       // IMPORTANT: The managedBy field is now preserved from the item master.
//       managedBy: "",
//       batches: [],
//       qualityCheckDetails: [],
//       removalReason: "",
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

// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const ddMmYyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
//   if (ddMmYyyyRegex.test(dateStr)) {
//     const [dd, mm, yyyy] = dateStr.split("-");
//     return `${yyyy}-${mm}-${dd}`;
//   }
//   const d = new Date(dateStr);
//   if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
//   return "";
// }

// export default function PurchaseOrderForm() {
//   const [orderData, setOrderData] = useState(initialPurchaseOrderState);
//   const [isCopied, setIsCopied] = useState(false);
//   const [supplier, setSupplier] = useState(null);
//   const router = useRouter();
//   const parentRef = useRef(null);
//   const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
//   const [selectedItemIndex, setSelectedItemIndex] = useState(null);

//   // Handler to update a specific item's warehouse fields.
//   const handleWarehouseSelect = (warehouse) => {
//     if (selectedItemIndex !== null) {
//       setOrderData((prev) => {
//         const updatedItems = [...prev.items];
//         updatedItems[selectedItemIndex].warehouse = warehouse._id;
//         updatedItems[selectedItemIndex].warehouseName = warehouse.warehouseName;
//         updatedItems[selectedItemIndex].warehouseCode = warehouse.warehouseCode;
//         return { ...prev, items: updatedItems };
//       });
//     }
//     setWarehouseModalOpen(false);
//     setSelectedItemIndex(null);
//   };

//   // Auto-fill PO data from sessionStorage if available.
//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const storedData = sessionStorage.getItem("purchaseOrderData");
//       if (storedData) {
//         try {
//           const parsedData = JSON.parse(storedData);
//           setOrderData(parsedData);
//           setIsCopied(true);
//           sessionStorage.removeItem("purchaseOrderData");
//         } catch (error) {
//           console.error("Error parsing purchaseOrderData:", error);
//           toast.error("Error loading saved Purchase Order data.");
//         }
//       }
//     }
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setOrderData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleSupplierSelect = useCallback((selectedSupplier) => {
//     setSupplier(selectedSupplier);
//     setOrderData((prev) => ({
//       ...prev,
//       supplierCode: selectedSupplier.supplierCode || "",
//       supplierName: selectedSupplier.supplierName || "",
//       contactPerson: selectedSupplier.contactPersonName || "",
//     }));
//   }, []);

//   useEffect(() => {
//     if (orderData.supplierName) {
//       const matchingSupplier = demoSuggestions.find(
//         (s) => s.name.toLowerCase() === orderData.supplierName.toLowerCase()
//       );
//       if (matchingSupplier) {
//         setOrderData((prev) => ({
//           ...prev,
//           supplierCode: matchingSupplier.code,
//           contactPerson: matchingSupplier.contactPerson,
//         }));
//       }
//     }
//   }, [orderData.supplierName]);

//   // Update item fields using gstRate and taxOption.
//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setOrderData((prev) => {
//       const updatedItems = [...prev.items];
//       const numericFields = ["quantity", "unitPrice", "discount", "freight", "gstRate", "tdsAmount"];
//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//       updatedItems[index] = { ...updatedItems[index], [name]: newValue };

//       // Recalculate derived values.
//       const { unitPrice = 0, discount = 0, quantity = 1, freight: itemFreight = 0, gstRate = 0, taxOption = "GST" } = updatedItems[index];
//       const priceAfterDiscount = unitPrice - discount;
//       const totalAmount = quantity * priceAfterDiscount + itemFreight;
//       updatedItems[index].priceAfterDiscount = priceAfterDiscount;
//       updatedItems[index].totalAmount = totalAmount;
//       if (taxOption === "IGST") {
//         updatedItems[index].igstAmount = totalAmount * (gstRate / 100);
//         updatedItems[index].gstAmount = 0;
//         updatedItems[index].cgstAmount = 0;
//         updatedItems[index].sgstAmount = 0;
//       } else {
//         updatedItems[index].cgstAmount = totalAmount * ((gstRate / 2) / 100);
//         updatedItems[index].sgstAmount = totalAmount * ((gstRate / 2) / 100);
//         updatedItems[index].gstAmount = updatedItems[index].cgstAmount + updatedItems[index].sgstAmount;
//         updatedItems[index].igstAmount = 0;
//       }
//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   // When an item is selected (via search or barcode scan).
//   const handleItemSelect = useCallback((index, selectedItem) => {
//     console.log("Parent received selected item:", selectedItem);
//     setOrderData((prev) => {
//       const newItems = [...prev.items];
//       newItems[index] = {
//         ...newItems[index],
//         item: selectedItem._id,
//         itemCode: selectedItem.itemCode || "",
//         itemName: selectedItem.itemName,
//         itemDescription: selectedItem.description || "",
//         unitPrice: selectedItem.unitPrice || 0,
//         discount: selectedItem.discount || 0,
//         freight: selectedItem.freight || 0,
//         // Map gstType from PO to gstRate for GRN.
//         gstRate: selectedItem.gstType || 0,
//         taxOption: "GST", // Default to GST; adjust if your item specifies IGST.
//         quantity: 1,
//         priceAfterDiscount: (selectedItem.unitPrice || 0) - (selectedItem.discount || 0),
//         totalAmount:
//           1 * ((selectedItem.unitPrice || 0) - (selectedItem.discount || 0)) +
//           (selectedItem.freight || 0),
//         // Calculate tax amounts.
//         ...(selectedItem.gstType || 0) && {
//           cgstAmount: ((selectedItem.unitPrice || 0) - (selectedItem.discount || 0) + (selectedItem.freight || 0)) * ((selectedItem.gstType || 0) / 2 / 100),
//           sgstAmount: ((selectedItem.unitPrice || 0) - (selectedItem.discount || 0) + (selectedItem.freight || 0)) * ((selectedItem.gstType || 0) / 2 / 100),
//           gstAmount: (((selectedItem.unitPrice || 0) - (selectedItem.discount || 0) + (selectedItem.freight || 0)) * ((selectedItem.gstType || 0) / 2 / 100)) * 2,
//         },
//         igstAmount: 0,
//         // Preserve the managedBy value from the item master.
//         managedBy: selectedItem.managedBy,
//         // Only set up batches if the item is batch-managed.
//         batches:
//           selectedItem.managedBy && selectedItem.managedBy.toLowerCase() === "batch"
//             ? []
//             : [],
//         qualityCheckDetails:
//           selectedItem.qualityCheckDetails && selectedItem.qualityCheckDetails.length > 0
//             ? selectedItem.qualityCheckDetails
//             : [
//                 { parameter: "Weight", min: "", max: "", actualValue: "" },
//                 { parameter: "Dimension", min: "", max: "", actualValue: "" },
//               ],
//         removalReason: "",
//       };
//       return { ...prev, items: newItems };
//     });
//   }, []);

//     const removeItemRow = useCallback((index) => {
//     setFormData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);
//   // Reuse addItemRow (defined earlier) for both PO and GRN copy.
//   const addItemRowHandler = useCallback(() => {
//     setOrderData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           orderedQuantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstRate: 0,
//           taxOption: "GST",
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           cgstAmount: 0,
//           sgstAmount: 0,
//           igstAmount: 0,
//           tdsAmount: 0,
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           stockAdded: false,
//           // Do not force a default here—preserve from item master.
//           managedBy: "",
//           batches: [],
//           qualityCheckDetails: [
//             { parameter: "Weight", min: "", max: "", actualValue: "" },
//             { parameter: "Dimension", min: "", max: "", actualValue: "" },
//           ],
//           removalReason: "",
//         },
//       ],
//     }));
//   }, []);

//   // Summary Calculation.
//   useEffect(() => {
//     const totalBeforeDiscountCalc = orderData.items.reduce((acc, item) => {
//       const unitPrice = parseFloat(item.unitPrice) || 0;
//       const discount = parseFloat(item.discount) || 0;
//       const quantity = parseFloat(item.quantity) || 1;
//       return acc + (unitPrice - discount) * quantity;
//     }, 0);
//     const totalItemsCalc = orderData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0);
//     const gstTotalCalc = orderData.items.reduce((acc, item) => {
//       if (item.taxOption === "IGST") {
//         return acc + (parseFloat(item.igstAmount) || 0);
//       }
//       return acc + (parseFloat(item.gstAmount) || 0);
//     }, 0);
//     const overallFreight = parseFloat(orderData.freight) || 0;
//     const roundingCalc = parseFloat(orderData.rounding) || 0;
//     const totalDownPaymentCalc = parseFloat(orderData.totalDownPayment) || 0;
//     const appliedAmountsCalc = parseFloat(orderData.appliedAmounts) || 0;
//     const grandTotalCalc = totalItemsCalc + gstTotalCalc + overallFreight + roundingCalc;
//     const openBalanceCalc = grandTotalCalc - (totalDownPaymentCalc + appliedAmountsCalc);
//     if (
//       totalBeforeDiscountCalc !== orderData.totalBeforeDiscount ||
//       gstTotalCalc !== orderData.gstTotal ||
//       grandTotalCalc !== orderData.grandTotal ||
//       openBalanceCalc !== orderData.openBalance
//     ) {
//       setOrderData((prev) => ({
//         ...prev,
//         totalBeforeDiscount: totalBeforeDiscountCalc,
//         gstTotal: gstTotalCalc,
//         grandTotal: grandTotalCalc,
//         openBalance: openBalanceCalc,
//       }));
//     }
//   }, [
//     orderData.items,
//     orderData.freight,
//     orderData.rounding,
//     orderData.totalDownPayment,
//     orderData.appliedAmounts,
//     orderData.totalBeforeDiscount,
//     orderData.gstTotal,
//     orderData.grandTotal,
//     orderData.openBalance,
//   ]);

//   const handleCreatePurchaseOrder = async (poData) => {
//     try {
//       const response = await axios.post("/api/purchase-order", poData, {
//         headers: { "Content-Type": "application/json" },
//       });
//       toast.success("Purchase order created successfully!");
//       setOrderData(initialPurchaseOrderState);
//     } catch (error) {
//       console.error("Error creating purchase order:", error);
//       toast.error(error.response?.data?.message || "Error creating purchase order");
//     }
//   };

//   // "Copy From" handler: Map PO data to include GRN-required fields.
//   // IMPORTANT: Do not force default managedBy here; preserve the item master value.
//   const handleCopyFrom = useCallback(() => {
//     const modifiedData = {
//       ...orderData,
//       items: orderData.items.map((item) => ({
//         ...item,
//         managedBy: item.managedBy, // Preserve as is from the item master.
//         batches:
//           item.managedBy && item.managedBy.toLowerCase() === "batch"
//             ? item.batches || []
//             : [],
//         // Map gstType to gstRate for GRN.
//         gstRate: item.gstType,
//         taxOption: "GST",
//         qualityCheckDetails:
//           item.qualityCheckDetails && item.qualityCheckDetails.length > 0
//             ? item.qualityCheckDetails
//             : [
//                 { parameter: "Weight", min: "", max: "", actualValue: "" },
//                 { parameter: "Dimension", min: "", max: "", actualValue: "" },
//               ],
//       })),
//     };
//     sessionStorage.setItem("purchaseOrderData", JSON.stringify(modifiedData));
//     toast.success("Data copied from Purchase Order!");
//   }, [orderData]);

//   // "Copy To" action.
//   const handleCopyTo = useCallback(
//     (destination) => {
//       if (destination === "GRN") {
//         sessionStorage.setItem("grnData", JSON.stringify(orderData));
//         router.push("/admin/GRN");
//       } else if (destination === "PurchaseInvoice") {
//         sessionStorage.setItem("purchaseInvoiceData", JSON.stringify(orderData));
//         router.push("/admin/purchase-invoice");
//       } else if (destination === "DebitNote") {
//         sessionStorage.setItem("debitNoteData", JSON.stringify(orderData));
//         router.push("/admin/debit-note");
//       }
//     },
//     [orderData, router]
//   );

//   // Dropdown component for "Copy To".
//   const CopyToDropdown = ({ handleCopyTo, defaultLabel }) => {
//     const [open, setOpen] = useState(false);
//     const [selected, setSelected] = useState(defaultLabel);
//     const toggleDropdown = () => setOpen((prev) => !prev);
//     const onSelect = (option) => {
//       setSelected(option);
//       setOpen(false);
//       handleCopyTo(option);
//     };
//     const ref = useRef(null);
//     useEffect(() => {
//       const handleClickOutside = (event) => {
//         if (ref.current && !ref.current.contains(event.target)) {
//           setOpen(false);
//         }
//       };
//       document.addEventListener("mousedown", handleClickOutside);
//       return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);
//     return (
//       <div ref={ref} className="relative inline-block text-left">
//         <button onClick={toggleDropdown} className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300 focus:outline-none shadow">
//           {selected}
//         </button>
//         {open && (
//           <div className="absolute right-0 mt-2 w-40 bg-white border border-gray-200 rounded shadow-lg z-10">
//             <button onClick={() => onSelect("GRN")} className="w-full text-left px-4 py-2 hover:bg-gray-100">
//               GRN
//             </button>
//             <button onClick={() => onSelect("PurchaseInvoice")} className="w-full text-left px-4 py-2 hover:bg-gray-100">
//               Purchase Invoice
//             </button>
//             <button onClick={() => onSelect("DebitNote")} className="w-full text-left px-4 py-2 hover:bg-gray-100">
//               Debit Note
//             </button>
//           </div>
//         )}
//       </div>
//     );
//   };
//   CopyToDropdown.defaultProps = {
//     handleCopyTo: () => {},
//     defaultLabel: "Copy To",
//   };

//   // Open warehouse modal for a specific item.
//   const handleSelectWarehouseForItem = useCallback((index) => {
//     setSelectedItemIndex(index);
//     setWarehouseModalOpen(true);
//   }, []);

//   return (
//     <div ref={parentRef} className="m-11 p-5 shadow-xl">
//       <ToastContainer />
//       <h1 className="text-2xl font-bold mb-4">Purchase Order Form</h1>
      // <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
      //   <div className="basis-full md:basis-1/2 px-2 space-y-4">
      //       <div>
      //       <label className="block mb-2 font-medium">Supplier Code</label>
      //       <input type="text" name="supplierCode" value={orderData.supplierCode || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
      //     </div>
      //     {isCopied ? (
      //       <div>
      //         <label className="block mb-2 font-medium">Supplier Name</label>
      //         <input
      //           type="text"
      //           name="supplierName"
      //           value={orderData.supplierName || ""}
      //           onChange={handleInputChange}
      //           placeholder="Enter supplier name"
      //           className="w-full p-2 border rounded"
      //         />
      //       </div>
      //     ) : (
      //       <div>
      //         <label className="block mb-2 font-medium">Supplier Name</label>
      //         <SupplierSearch onSelectSupplier={handleSupplierSelect} />
      //       </div>
      //     )}
        
      //     <div>
      //       <label className="block mb-2 font-medium">Contact Person</label>
      //       <input type="text" name="contactPerson" value={orderData.contactPerson || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
      //     </div>
      //     <div>
      //       <label className="block mb-2 font-medium">Reference Number</label>
      //       <input type="text" name="refNumber" value={orderData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
      //     </div>
      //   </div>
      //   <div className="basis-full md:basis-1/2 px-2 space-y-4">
      //     <div>
      //       <label className="block mb-2 font-medium">Status</label>
      //       <select name="status" value={orderData.status || ""} onChange={handleInputChange} className="w-full p-2 border rounded">
      //         <option value="">Select status (optional)</option>
      //         <option value="Open">Open</option>
      //         <option value="Closed">Closed</option>
      //         <option value="Pending">Pending</option>
      //         <option value="Cancelled">Cancelled</option>
      //       </select>
      //     </div>
      //     <div>
      //       <label className="block mb-2 font-medium">Posting Date</label>
      //       <input type="date" name="postingDate" value={formatDateForInput(orderData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
      //     </div>
      //     <div>
      //       <label className="block mb-2 font-medium">Valid Until</label>
      //       <input type="date" name="validUntil" value={formatDateForInput(orderData.validUntil)} onChange={handleInputChange} className="w-full p-2 border rounded" />
      //     </div>
      //     <div>
      //       <label className="block mb-2 font-medium">Delivery Date</label>
      //       <input type="date" name="documentDate" value={formatDateForInput(orderData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
      //     </div>
      //   </div>
      // </div>
//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={orderData.items}
//           onItemChange={handleItemChange}
//           onItemSelect={handleItemSelect}
//           onWarehouseSelect={(index) => handleSelectWarehouseForItem(index)}
//           onAddItem={(!isCopied) ? addItemRowHandler : undefined}
//           onRemoveItem={removeItemRow}
//         />
//       </div>
      // {/* Warehouse Modal would be rendered here if implemented */}
      // <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
      //   <div>
      //     <label className="block mb-2 font-medium">Sales Employee</label>
      //     <input type="text" name="salesEmployee" value={orderData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
      //   </div>
      //   <div>
      //     <label className="block mb-2 font-medium">Remarks</label>
      //     <textarea name="remarks" value={orderData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea>
      //   </div>
      // </div>
      // <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
      //   <div>
      //     <label className="block mb-2 font-medium">Taxable Amount</label>
      //     <input
      //       type="number"
      //       name="taxableAmount"
      //       value={orderData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
      //       readOnly
      //       className="w-full p-2 border rounded bg-gray-100"
      //     />
      //   </div>
      //   <div>
      //     <label className="block mb-2 font-medium">Rounding</label>
      //     <input type="number" name="rounding" value={orderData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
      //   </div>
      //   <div>
      //     <label className="block mb-2 font-medium">GST Total</label>
      //     <input
      //       type="number"
      //       name="gstTotal"
      //       value={orderData.items.reduce((acc, item) => {
      //         if (item.taxOption === "IGST") {
      //           return acc + (parseFloat(item.igstAmount) || 0);
      //         }
      //         return acc + (parseFloat(item.gstAmount) || 0);
      //       }, 0)}
      //       readOnly
      //       className="w-full p-2 border rounded bg-gray-100"
      //     />
      //   </div>
      //   <div>
      //     <label className="block mb-2 font-medium">Total Amount</label>
      //     <input type="number" name="grandTotal" value={orderData.grandTotal || 0} readOnly className="w-full p-2 border rounded bg-gray-100" />
      //   </div>
      // </div>
//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={() => handleCreatePurchaseOrder(orderData)}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Add
//         </button>
//         <button className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
//           Cancel
//         </button>
//         <button
//           onClick={handleCopyFrom}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Copy From
//         </button>
//         <div className="flex flex-col space-y-2">
//           <div className="flex items-center justify-center">
//             <CopyToDropdown
//               handleCopyTo={handleCopyTo}
//               defaultLabel={supplier ? `Copy To (${supplier.supplierName})` : "Copy To"}
//             />
//           </div>
//         </div>
//       </div>
//       {isCopied && (
//         <div className="flex items-center space-x-2 text-green-600">
//           <FaCheckCircle />
//           <span>Purchase Order data loaded from copy.</span>
//         </div>
//       )}
//       <ToastContainer />
//     </div>
//   );
// }






// "use client";
// import { useState, useEffect, useCallback, useRef } from "react";
// import { useRouter } from "next/navigation";
// import axios from "axios";
// import ItemSection from "@/components/ItemSection";
// import SupplierSearch from "@/components/SupplierSearch";
// import { FaCheckCircle } from "react-icons/fa";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// const demoSuggestions = [
//   { _id: "demo1", name: "Demo Supplier One", code: "DS1", contactPerson: "Alice" },
//   { _id: "demo2", name: "Demo Supplier Two", code: "DS2", contactPerson: "Bob" },
//   { _id: "demo3", name: "Demo Supplier Three", code: "DS3", contactPerson: "Charlie" },
// ];

// const initialPurchaseOrderState = {
//   supplierCode: "",
//   supplierName: "",
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
//       orderedQuantity: 0,
//       unitPrice: 0,
//       discount: 0,
//       freight: 0,
//       gstRate: 0,
//       taxOption: "GST",
//       priceAfterDiscount: 0,
//       totalAmount: 0,
//       gstAmount: 0,
//       cgstAmount: 0,
//       sgstAmount: 0,
//       igstAmount: 0,
//       warehouse: "",
//       warehouseName: "",
//       warehouseCode: "",
//       stockAdded: false,
//       managedBy: "",
//       batches: [],
//       qualityCheckDetails: [
//         { parameter: "Weight", min: "", max: "", actualValue: "" },
//         { parameter: "Dimension", min: "", max: "", actualValue: "" },
//       ],
//       removalReason: "",
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

// function formatDateForInput(dateStr) {
//   if (!dateStr) return "";
//   const ddMmYyyyRegex = /^(\d{2})-(\d{2})-(\d{4})$/;
//   if (ddMmYyyyRegex.test(dateStr)) {
//     const [dd, mm, yyyy] = dateStr.split("-");
//     return `${yyyy}-${mm}-${dd}`;
//   }
//   const d = new Date(dateStr);
//   if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
//   return "";
// }

// export default function PurchaseOrderForm() {
//   const [orderData, setOrderData] = useState(initialPurchaseOrderState);
//   const [isCopied, setIsCopied] = useState(false);
//   const [supplier, setSupplier] = useState(null);
//   const router = useRouter();
//   const parentRef = useRef(null);
//   const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
//   const [selectedItemIndex, setSelectedItemIndex] = useState(null);

//   const handleWarehouseSelect = (warehouse) => {
//     if (selectedItemIndex !== null) {
//       setOrderData((prev) => {
//         const updatedItems = [...prev.items];
//         updatedItems[selectedItemIndex] = {
//           ...updatedItems[selectedItemIndex],
//           warehouse: warehouse._id,
//           warehouseName: warehouse.warehouseName,
//           warehouseCode: warehouse.warehouseCode
//         };
//         return { ...prev, items: updatedItems };
//       });
//     }
//     setWarehouseModalOpen(false);
//     setSelectedItemIndex(null);
//   };

//   useEffect(() => {
//     if (typeof window !== "undefined") {
//       const storedData = sessionStorage.getItem("purchaseOrderData");
//       if (storedData) {
//         try {
//           const parsedData = JSON.parse(storedData);
//           setOrderData(parsedData);
//           setIsCopied(true);
//           sessionStorage.removeItem("purchaseOrderData");
//         } catch (error) {
//           console.error("Error parsing purchaseOrderData:", error);
//           toast.error("Error loading saved Purchase Order data.");
//         }
//       }
//     }
//   }, []);

//   const handleInputChange = useCallback((e) => {
//     const { name, value } = e.target;
//     setOrderData((prev) => ({ ...prev, [name]: value }));
//   }, []);

//   const handleSupplierSelect = useCallback((selectedSupplier) => {
//     setSupplier(selectedSupplier);
//     setOrderData((prev) => ({
//       ...prev,
//       supplierCode: selectedSupplier.supplierCode || "",
//       supplierName: selectedSupplier.supplierName || "",
//       contactPerson: selectedSupplier.contactPersonName || "",
//     }));
//   }, []);

//   useEffect(() => {
//     if (orderData.supplierName) {
//       const matchingSupplier = demoSuggestions.find(
//         (s) => s.name.toLowerCase() === orderData.supplierName.toLowerCase()
//       );
//       if (matchingSupplier) {
//         setOrderData((prev) => ({
//           ...prev,
//           supplierCode: matchingSupplier.code,
//           contactPerson: matchingSupplier.contactPerson,
//         }));
//       }
//     }
//   }, [orderData.supplierName]);

//   const computeItemValues = (item) => {
//     const quantity = parseFloat(item.quantity) || 0;
//     const unitPrice = parseFloat(item.unitPrice) || 0;
//     const discount = parseFloat(item.discount) || 0;
//     const freight = parseFloat(item.freight) || 0;
//     const priceAfterDiscount = unitPrice - discount;
//     const totalAmount = quantity * priceAfterDiscount + freight;

//     if (item.taxOption === "GST") {
//       const gstRate = parseFloat(item.gstRate) || 0;
//       const cgstRate = item.cgstRate !== undefined ? parseFloat(item.cgstRate) : (gstRate / 2);
//       const sgstRate = item.sgstRate !== undefined ? parseFloat(item.sgstRate) : (gstRate / 2);
      
//       const cgstAmount = totalAmount * (cgstRate / 100);
//       const sgstAmount = totalAmount * (sgstRate / 100);
//       const gstAmount = cgstAmount + sgstAmount;
      
//       return { 
//         priceAfterDiscount, 
//         totalAmount, 
//         gstAmount, 
//         cgstAmount, 
//         sgstAmount, 
//         igstAmount: 0 
//       };
//     }
    
//     if (item.taxOption === "IGST") {
//       const igstRate = parseFloat(item.igstRate) || 0;
//       const igstAmount = totalAmount * (igstRate / 100);
//       return { 
//         priceAfterDiscount, 
//         totalAmount, 
//         gstAmount: 0, 
//         cgstAmount: 0, 
//         sgstAmount: 0, 
//         igstAmount 
//       };
//     }
    
//     return { 
//       priceAfterDiscount, 
//       totalAmount, 
//       gstAmount: 0, 
//       cgstAmount: 0, 
//       sgstAmount: 0, 
//       igstAmount: 0 
//     };
//   };

//   const handleItemChange = useCallback((index, e) => {
//     const { name, value } = e.target;
//     setOrderData((prev) => {
//       const updatedItems = [...prev.items];
//       const numericFields = [
//         "quantity", "unitPrice", "discount", "freight", 
//         "gstRate", "cgstRate", "sgstRate", "igstRate", "tdsAmount"
//       ];
      
//       const newValue = numericFields.includes(name) ? parseFloat(value) || 0 : value;
//       updatedItems[index] = { ...updatedItems[index], [name]: newValue };
      
//       // Recalculate all values when tax-related fields change
//       if (name.includes("Rate") || name === "taxOption" || 
//           name === "quantity" || name === "unitPrice" || 
//           name === "discount" || name === "freight") {
//         const computed = computeItemValues(updatedItems[index]);
//         updatedItems[index] = { 
//           ...updatedItems[index],
//           priceAfterDiscount: computed.priceAfterDiscount,
//           totalAmount: computed.totalAmount,
//           gstAmount: computed.gstAmount,
//           cgstAmount: computed.cgstAmount,
//           sgstAmount: computed.sgstAmount,
//           igstAmount: computed.igstAmount
//         };
//       }

//       return { ...prev, items: updatedItems };
//     });
//   }, []);

//   const handleItemSelect = useCallback((index, selectedItem) => {
//     setOrderData((prev) => {
//       const newItems = [...prev.items];
//       newItems[index] = {
//         ...newItems[index],
//         item: selectedItem._id,
//         itemCode: selectedItem.itemCode || "",
//         itemName: selectedItem.itemName,
//         itemDescription: selectedItem.description || "",
//         unitPrice: selectedItem.unitPrice || 0,
//         discount: selectedItem.discount || 0,
//         freight: selectedItem.freight || 0,
//         gstRate: selectedItem.gstType || 0,
//         taxOption: "GST",
//         quantity: 1,
//         managedBy: selectedItem.managedBy,
//         batches: selectedItem.managedBy?.toLowerCase() === "batch" ? [] : [],
//         qualityCheckDetails: selectedItem.qualityCheckDetails?.length > 0
//           ? selectedItem.qualityCheckDetails
//           : [
//               { parameter: "Weight", min: "", max: "", actualValue: "" },
//               { parameter: "Dimension", min: "", max: "", actualValue: "" },
//             ],
//         ...computeItemValues({
//           ...newItems[index],
//           unitPrice: selectedItem.unitPrice || 0,
//           discount: selectedItem.discount || 0,
//           freight: selectedItem.freight || 0,
//           quantity: 1,
//           gstRate: selectedItem.gstType || 0,
//           taxOption: "GST"
//         })
//       };
//       return { ...prev, items: newItems };
//     });
//   }, []);

//   const removeItemRow = useCallback((index) => {
//     setOrderData((prev) => ({
//       ...prev,
//       items: prev.items.filter((_, i) => i !== index),
//     }));
//   }, []);

//   const addItemRow = useCallback(() => {
//     setOrderData((prev) => ({
//       ...prev,
//       items: [
//         ...prev.items,
//         {
//           itemCode: "",
//           itemName: "",
//           itemDescription: "",
//           quantity: 0,
//           orderedQuantity: 0,
//           unitPrice: 0,
//           discount: 0,
//           freight: 0,
//           gstRate: 0,
//           taxOption: "GST",
//           priceAfterDiscount: 0,
//           totalAmount: 0,
//           gstAmount: 0,
//           cgstAmount: 0,
//           sgstAmount: 0,
//           igstAmount: 0,
//           tdsAmount: 0,
//           warehouse: "",
//           warehouseName: "",
//           warehouseCode: "",
//           stockAdded: false,
//           managedBy: "",
//           batches: [],
//           qualityCheckDetails: [
//             { parameter: "Weight", min: "", max: "", actualValue: "" },
//             { parameter: "Dimension", min: "", max: "", actualValue: "" },
//           ],
//           removalReason: "",
//         },
//       ],
//     }));
//   }, []);

//   useEffect(() => {
//     const totalBeforeDiscount = orderData.items.reduce((acc, item) => {
//       return acc + (parseFloat(item.unitPrice) || 0) - (parseFloat(item.discount) || 0) * (parseFloat(item.quantity) || 1);
//     }, 0);

//     const totalItems = orderData.items.reduce(
//       (acc, item) => acc + (parseFloat(item.totalAmount) || 0),
//       0
//     );

//     const gstTotal = orderData.items.reduce((acc, item) => {
//       return acc + (parseFloat(item.taxOption === "IGST" ? item.igstAmount : item.gstAmount) || 0);
//     }, 0);

//     const overallFreight = parseFloat(orderData.freight) || 0;
//     const rounding = parseFloat(orderData.rounding) || 0;
//     const totalDownPayment = parseFloat(orderData.totalDownPayment) || 0;
//     const appliedAmounts = parseFloat(orderData.appliedAmounts) || 0;

//     const grandTotal = totalItems + gstTotal + overallFreight + rounding;
//     const openBalance = grandTotal - (totalDownPayment + appliedAmounts);

//     setOrderData((prev) => ({
//       ...prev,
//       totalBeforeDiscount,
//       gstTotal,
//       grandTotal,
//       openBalance,
//     }));
//   }, [
//     orderData.items,
//     orderData.freight,
//     orderData.rounding,
//     orderData.totalDownPayment,
//     orderData.appliedAmounts,
//   ]);

//   const handleCreatePurchaseOrder = async () => {
//     try {
//       await axios.post("/api/purchase-order", orderData);
//       toast.success("Purchase order created successfully!");
//       setOrderData(initialPurchaseOrderState);
//     } catch (error) {
//       console.error("Error creating purchase order:", error);
//       toast.error(error.response?.data?.message || "Error creating purchase order");
//     }
//   };

//   const handleCopyFrom = useCallback(() => {
//     sessionStorage.setItem("purchaseOrderData", JSON.stringify(orderData));
//     toast.success("Data copied from Purchase Order!");
//   }, [orderData]);

//   const handleCopyTo = useCallback((destination) => {
//     sessionStorage.setItem(`${destination}Data`, JSON.stringify(orderData));
//     router.push(`/admin/${destination}`);
//   }, [orderData, router]);

//   const CopyToDropdown = ({ handleCopyTo, defaultLabel }) => {
//     const [open, setOpen] = useState(false);
//     const [selected, setSelected] = useState(defaultLabel);
//     const ref = useRef(null);

//     useEffect(() => {
//       const handleClickOutside = (event) => {
//         if (ref.current && !ref.current.contains(event.target)) {
//           setOpen(false);
//         }
//       };
//       document.addEventListener("mousedown", handleClickOutside);
//       return () => document.removeEventListener("mousedown", handleClickOutside);
//     }, []);

//     return (
//       <div ref={ref} className="relative inline-block text-left">
//         <button 
//           onClick={() => setOpen(!open)}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           {selected}
//         </button>
//         {open && (
//           <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-10">
//             {["GRN", "PurchaseInvoice", "DebitNote"].map((option) => (
//               <button
//                 key={option}
//                 onClick={() => {
//                   setSelected(option);
//                   setOpen(false);
//                   handleCopyTo(option);
//                 }}
//                 className="w-full text-left px-4 py-2 hover:bg-gray-100"
//               >
//                 {option}
//               </button>
//             ))}
//           </div>
//         )}
//       </div>
//     );
//   };

//   const handleSelectWarehouseForItem = useCallback((index) => {
//     setSelectedItemIndex(index);
//     setWarehouseModalOpen(true);
//   }, []);

//   return (
//     <div ref={parentRef} className="m-11 p-5 shadow-xl">
//       <ToastContainer />
//       <h1 className="text-2xl font-bold mb-4">Purchase Order Form</h1>
      
//          <div className="flex flex-wrap justify-between m-10 p-5 border rounded-lg shadow-lg">
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//             <div>
//             <label className="block mb-2 font-medium">Supplier Code</label>
//             <input type="text" name="supplierCode" value={orderData.supplierCode || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
//           </div>
//           {isCopied ? (
//             <div>
//               <label className="block mb-2 font-medium">Supplier Name</label>
//               <input
//                 type="text"
//                 name="supplierName"
//                 value={orderData.supplierName || ""}
//                 onChange={handleInputChange}
//                 placeholder="Enter supplier name"
//                 className="w-full p-2 border rounded"
//               />
//             </div>
//           ) : (
//             <div>
//               <label className="block mb-2 font-medium">Supplier Name</label>
//               <SupplierSearch onSelectSupplier={handleSupplierSelect} />
//             </div>
//           )}
        
//           <div>
//             <label className="block mb-2 font-medium">Contact Person</label>
//             <input type="text" name="contactPerson" value={orderData.contactPerson || ""} readOnly className="w-full p-2 border rounded bg-gray-100" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Reference Number</label>
//             <input type="text" name="refNumber" value={orderData.refNumber || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//         </div>
//         <div className="basis-full md:basis-1/2 px-2 space-y-4">
//           <div>
//             <label className="block mb-2 font-medium">Status</label>
//             <select name="status" value={orderData.status || ""} onChange={handleInputChange} className="w-full p-2 border rounded">
//               <option value="">Select status (optional)</option>
//               <option value="Open">Open</option>
//               <option value="Closed">Closed</option>
//               <option value="Pending">Pending</option>
//               <option value="Cancelled">Cancelled</option>
//             </select>
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Posting Date</label>
//             <input type="date" name="postingDate" value={formatDateForInput(orderData.postingDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Valid Until</label>
//             <input type="date" name="validUntil" value={formatDateForInput(orderData.validUntil)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//           <div>
//             <label className="block mb-2 font-medium">Delivery Date</label>
//             <input type="date" name="documentDate" value={formatDateForInput(orderData.documentDate)} onChange={handleInputChange} className="w-full p-2 border rounded" />
//           </div>
//         </div>
//       </div>

//       <h2 className="text-xl font-semibold mt-6">Items</h2>
//       <div className="flex flex-col m-10 p-5 border rounded-lg shadow-lg">
//         <ItemSection
//           items={orderData.items}
//           onItemChange={handleItemChange}
//           onItemSelect={handleItemSelect}
//           onWarehouseSelect={handleSelectWarehouseForItem}
//           onAddItem={!isCopied ? addItemRow : undefined}
//           onRemoveItem={removeItemRow}
//         />
//       </div>

//       {/* Other form sections */}
//            {/* Warehouse Modal would be rendered here if implemented */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Sales Employee</label>
//           <input type="text" name="salesEmployee" value={orderData.salesEmployee || ""} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Remarks</label>
//           <textarea name="remarks" value={orderData.remarks || ""} onChange={handleInputChange} className="w-full p-2 border rounded"></textarea>
//         </div>
//       </div>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <div>
//           <label className="block mb-2 font-medium">Taxable Amount</label>
//           <input
//             type="number"
//             name="taxableAmount"
//             value={orderData.items.reduce((acc, item) => acc + (parseFloat(item.totalAmount) || 0), 0)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Rounding</label>
//           <input type="number" name="rounding" value={orderData.rounding || 0} onChange={handleInputChange} className="w-full p-2 border rounded" />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">GST Total</label>
//           <input
//             type="number"
//             name="gstTotal"
//             value={orderData.items.reduce((acc, item) => {
//               if (item.taxOption === "IGST") {
//                 return acc + (parseFloat(item.igstAmount) || 0);
//               }
//               return acc + (parseFloat(item.gstAmount) || 0);
//             }, 0)}
//             readOnly
//             className="w-full p-2 border rounded bg-gray-100"
//           />
//         </div>
//         <div>
//           <label className="block mb-2 font-medium">Total Amount</label>
//           <input type="number" name="grandTotal" value={orderData.grandTotal || 0} readOnly className="w-full p-2 border rounded bg-gray-100" />
//         </div>
//       </div>

//       <div className="flex flex-wrap gap-4 p-8 m-8 border rounded-lg shadow-lg">
//         <button
//           onClick={handleCreatePurchaseOrder}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Add
//         </button>
//         <button className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300">
//           Cancel
//         </button>
//         <button
//           onClick={handleCopyFrom}
//           className="px-4 py-2 bg-orange-400 text-white rounded hover:bg-orange-300"
//         >
//           Copy From
//         </button>
//         <CopyToDropdown
//           handleCopyTo={handleCopyTo}
//           defaultLabel={supplier ? `Copy To (${supplier.supplierName})` : "Copy To"}
//         />
//       </div>

//       {isCopied && (
//         <div className="flex items-center space-x-2 text-green-600">
//           <FaCheckCircle />
//           <span>Purchase Order data loaded from copy.</span>
//         </div>
//       )}
//       <ToastContainer />
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
