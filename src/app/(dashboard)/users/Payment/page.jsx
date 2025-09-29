// "use client";
// import React, { useState, useEffect } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";
// import CustomerSearch from "@/components/CustomerSearch";
// import SupplierSearch from "@/components/SupplierSearch";
// import BankComponent from "@/components/BankComponent";

// // Helper to generate a unique key for an invoice.
// const getInvoiceKey = (invoice, index) => invoice._id ? invoice._id : index;

// const InvoiceRow = ({
//   invoice,
//   invoiceKey,
//   isSelected,
//   onSelect,
//   currentAmount,
//   onAmountChange,
// }) => {
//   // Calculate remaining amount: grandTotal - paidAmount.
//   const defaultEditableValue = invoice.remainingAmount !== undefined
//     ? invoice.remainingAmount
//     : invoice.grandTotal - (invoice.paidAmount || 0);
//   const newRemaining =
//     isSelected && currentAmount !== undefined
//       ? defaultEditableValue - Number(currentAmount)
//       : defaultEditableValue;
//   return (
//     <tr key={invoiceKey}>
//       <td className="px-4 py-2 text-center">
//         <input
//           type="checkbox"
//           onChange={() => onSelect(invoiceKey, defaultEditableValue)}
//           checked={isSelected}
//           className="form-checkbox h-5 w-5 text-blue-600"
//         />
//       </td>
//       <td className="px-4 py-2">{invoice.refNumber}</td>
//       <td className="px-4 py-2">{new Date(invoice.orderDate).toLocaleDateString()}</td>
//       <td className="px-4 py-2">${invoice.grandTotal}</td>
//       <td className="px-4 py-2">${defaultEditableValue}</td>
//       <td className="px-4 py-2">
//         <input
//           type="number"
//           value={currentAmount ?? defaultEditableValue}
//           onChange={(e) =>
//             onAmountChange(invoiceKey, e.target.value, defaultEditableValue)
//           }
//           disabled={!isSelected}
//           className="w-full p-1 border rounded-md text-sm"
//         />
//       </td>
//       <td className="px-4 py-2">${newRemaining}</td>
//     </tr>
//   );
// };

// const PaymentForm = () => {
//   const initialFormData = {
//     paymentType: "",
//     code: "",
//     customerVendor: "",
//     name: "",
//     postDate: "",
//     modeOfPayment: "",
//     bankName: "",
//     accountCode: "", // new field for bank account code
//     ledgerAccount: "",
//     paidTo: "",
//     paymentDate: "",
//     remarks: "",
//     selectedInvoices: [],
//   };

//   const [purchaseInvoices, setPurchaseInvoices] = useState([]);
//   const [salesInvoices, setSalesInvoices] = useState([]);
//   const [formData, setFormData] = useState(initialFormData);
//   const [invoiceAmounts, setInvoiceAmounts] = useState({});

//   // Render Customer or Supplier search component.
//   const renderMasterComponent = () => {
//     if (formData.paymentType === "Incoming") {
//       return (
//         <CustomerSearch
//           onSelectCustomer={(selectedMaster) =>
//             setFormData((prev) => ({
//               ...prev,
//               code: selectedMaster.customerCode,
//               customerVendor: selectedMaster.customerName,
//             }))
//           }
//         />
//       );
//     } else if (formData.paymentType === "Outgoing") {
//       return (
//         <SupplierSearch
//           onSelectSupplier={(selectedMaster) =>
//             setFormData((prev) => ({
//               ...prev,
//               code: selectedMaster.supplierCode,
//               customerVendor: selectedMaster.supplierName,
//             }))
//           }
//         />
//       );
//     }
//     return null;
//   };

//   // New: Handle bank selection to update bank name and account code.
//   const handleBankChange = (event) => {
//     setFormData({
//       ...formData,
//       [event.target.name]: event.target.value, // Update bankName in formData
//       accountCode: accountCode || "",
//     });
//   };


//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     const { accountCode } = e;
  
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//       accountCode: accountCode || "",
//     }));
//   };
  

//   // Fetch invoices when code and payment type change.
//   useEffect(() => {
//     if (!formData.code || !formData.paymentType) return;
//     const fetchInvoices = async () => {
//       try {
//         if (formData.paymentType === "Outgoing") {
//           const response = await fetch(
//             `/api/purchaseInvoice?supplierCode=${formData.code}`
//           );
//           if (response.status === 404) {
//             setPurchaseInvoices([]);
//           } else {
//             const json = await response.json();
//             setPurchaseInvoices(Array.isArray(json.data) ? json.data : []);
//           }
//         } else if (formData.paymentType === "Incoming") {
//           const response = await fetch(
//             `/api/sales-invoice?customerCode=${formData.code}`
//           );
//           if (response.status === 404) {
//             setSalesInvoices([]);
//           } else {
//             const json = await response.json();
//             setSalesInvoices(Array.isArray(json.data) ? json.data : []);
//           }
//         }
//       } catch (error) {
//         console.error("Error fetching invoices:", error);
//       }
//     };
//     fetchInvoices();
//   }, [formData.code, formData.paymentType]);

//   // Filter invoices to display only those that are not fully paid.
//   const displayedInvoices =
//     formData.paymentType === "Incoming"
//       ? Array.isArray(salesInvoices)
//         ? salesInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
//         : []
//       : formData.paymentType === "Outgoing"
//       ? Array.isArray(purchaseInvoices)
//         ? purchaseInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
//         : []
//       : [];

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     if (name === "paymentType") {
//       setFormData((prev) => ({
//         ...prev,
//         paymentType: value,
//         code: "",
//         customerVendor: "",
//         selectedInvoices: [],
//       }));
//       setPurchaseInvoices([]);
//       setSalesInvoices([]);
//       setInvoiceAmounts({});
//     } else {
//       setFormData((prev) => ({ ...prev, [name]: value }));
//     }
//   };

//   const handleCheckboxChange = (invoiceKey, invoiceDefaultValue) => {
//     const { selectedInvoices } = formData;
//     let newSelected;
//     if (selectedInvoices.includes(invoiceKey)) {
//       newSelected = selectedInvoices.filter((key) => key !== invoiceKey);
//     } else {
//       if (invoiceAmounts[invoiceKey] === undefined) {
//         setInvoiceAmounts((prev) => ({
//           ...prev,
//           [invoiceKey]: invoiceDefaultValue,
//         }));
//       }
//       newSelected = [...selectedInvoices, invoiceKey];
//     }
//     setFormData((prev) => ({
//       ...prev,
//       selectedInvoices: newSelected,
//     }));
//   };

//   const handleInvoiceAmountChange = (invoiceKey, newAmount, invoiceDefaultValue) => {
//     const numericValue = Number(newAmount);
//     if (numericValue > Number(invoiceDefaultValue)) {
//       toast.error(`Amount cannot exceed ${invoiceDefaultValue}`);
//       return;
//     }
//     setInvoiceAmounts((prev) => ({
//       ...prev,
//       [invoiceKey]: newAmount,
//     }));
//   };

//   const totalSelectedAmount = displayedInvoices.reduce((acc, invoice, index) => {
//     const invoiceKey = getInvoiceKey(invoice, index);
//     if (formData.selectedInvoices.includes(invoiceKey)) {
//       const defaultEditableValue = invoice.remainingAmount !== undefined
//         ? invoice.remainingAmount
//         : invoice.grandTotal - (invoice.paidAmount || 0);
//       const amount =
//         invoiceAmounts[invoiceKey] !== undefined
//           ? Number(invoiceAmounts[invoiceKey])
//           : Number(defaultEditableValue);
//       return acc + amount;
//     }
//     return acc;
//   }, 0);

//   const validateForm = () => {
//     if (!formData.paymentType) {
//       toast.error("Please select a payment type");
//       return false;
//     }
//     if (!formData.customerVendor) {
//       toast.error("Please select a customer or supplier");
//       return false;
//     }
//     if (formData.selectedInvoices.length === 0) {
//       toast.error("Please select at least one invoice");
//       return false;
//     }
//     return true;
//   };

//   const handleSubmit = async () => {
//     if (!validateForm()) return;
//     const invoiceModel =
//       formData.paymentType === "Incoming" ? "SalesInvoice" : "PurchaseInvoice";
//     const references = formData.selectedInvoices.map((invoiceId) => ({
//       invoiceId,
//       model: invoiceModel,
//       paidAmount: Number(invoiceAmounts[invoiceId] ?? 0),
//     }));

//     const submissionData = {
//       paymentType: formData.paymentType === "Incoming" ? "Customer" : "Supplier",
//       code: formData.code,
//       customerVendor: formData.customerVendor,
//       postDate: formData.postDate,
//       paymentDate: formData.paymentDate,
//       modeOfPayment: formData.modeOfPayment,
//       bankName: formData.bankName,
//       accountCode: formData.accountCode, // newly set account code from the bank selection
//       ledgerAccount: formData.ledgerAccount,
//       paidTo: formData.paidTo,
//       remarks: formData.remarks,
//       amount: totalSelectedAmount,
//       references,
//     };

//     try {
//       const res = await fetch("/api/payment", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(submissionData),
//       });
//       const result = await res.json();
//       if (res.ok) {
//         toast.success(result.message || "Payment submitted successfully!");
//         // Clear the form after submission.
//         setFormData(initialFormData);
//         setInvoiceAmounts({});
//       } else {
//         toast.error(result.message || "Payment submission failed.");
//       }
//     } catch (err) {
//       toast.error("Network error during payment submission.");
//       console.error(err);
//     }
//   };

//   const handleClose = () => {
//     console.log("Form closed");
//     toast.info("Form closed");
//   };

//   return (
//     <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
//       <ToastContainer />
//       <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Form</h2>
//       <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
//         <h3 className="text-lg font-semibold text-gray-800 mb-2">
//           Purchase & Sales Payment Details
//         </h3>
//       </div>
//       <div className="space-y-4">
//         {/* Payment Type */}
//         <div className="grid grid-cols-1 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Payment Type (Incoming / Outgoing)
//             </label>
//             <select
//               name="paymentType"
//               value={formData.paymentType}
//               onChange={handleInputChange}
//               className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//             >
//               <option value="">Select Payment Type</option>
//               <option value="Incoming">Incoming</option>
//               <option value="Outgoing">Outgoing</option>
//             </select>
//           </div>
//         </div>
//         {/* Render Customer or Supplier Selection */}
//         {formData.paymentType && renderMasterComponent()}
//         {/* Auto-filled Code and Customer/Supplier Name */}
//         <div className="grid grid-cols-2 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Code
//             </label>
//             <input
//               type="text"
//               name="code"
//               value={formData.code}
//               readOnly
//               className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//               placeholder="Auto-filled code"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               {formData.paymentType === "Incoming"
//                 ? "Customer Name"
//                 : "Supplier Name"}
//             </label>
//             <input
//               type="text"
//               name="customerVendor"
//               value={formData.customerVendor}
//               readOnly
//               className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//               placeholder="Auto-filled name"
//             />
//           </div>
//         </div>
//         {/* Additional Dates and Payment Details */}
//         <div className="grid grid-cols-3 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Post Date
//             </label>
//             <input
//               type="date"
//               name="postDate"
//               value={formData.postDate}
//               onChange={handleInputChange}
//               className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Payment Date
//             </label>
//             <input
//               type="date"
//               name="paymentDate"
//               value={formData.paymentDate}
//               onChange={handleInputChange}
//               className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Mode of Payment
//             </label>
//             <select
//               name="modeOfPayment"
//               value={formData.modeOfPayment}
//               onChange={handleInputChange}
//               className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//             >
//               <option value="">Select Mode</option>
//               <option value="Cash">Cash</option>
//               <option value="Bank">Bank</option>
//               <option value="NEFT">NEFT</option>
//               <option value="RTGS">RTGS</option>
//               <option value="Cheque">Cheque</option>
//             </select>
//           </div>
//         </div>
//         {/* Bank Component: Capture bank selection and account code */}
//         <div className="grid grid-cols-3 gap-4">
//         <BankComponent
//           bankName={formData.bankName} // Pass the current bank ID to BankComponent
//           onChange={handleChange}  // Handle change to update formData
//         />
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Bank Account Code
//             </label>
//             <input
//               type="text"
//               name="accountCode"
//               value={formData.accountCode}
              
//               readOnly
//               className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//               placeholder="Auto-filled from bank selection"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700">
//               Paid To (Cheque/Reference)
//             </label>
//             <input
//               type="text"
//               name="paidTo"
//               value={formData.paidTo}
//               onChange={handleInputChange}
//               className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
//               placeholder="Enter cheque/reference"
//             />
//           </div>
//         </div>
//         {/* Invoice Table with Multiple Selection */}
//         {formData.paymentType && (
//           <div>
//             <h3 className="text-md font-medium text-gray-800 mb-2">
//               {formData.paymentType === "Incoming"
//                 ? "Select Sales Invoices"
//                 : "Select Purchase Invoices"}
//             </h3>
//             {formData.code ? (
//               displayedInvoices.length > 0 ? (
//                 <table className="w-full text-sm text-left text-gray-700 border-collapse">
//                   <thead className="bg-gray-100 border-b">
//                     <tr>
//                       <th className="px-4 py-2">Select</th>
//                       <th className="px-4 py-2">Invoice Number</th>
//                       <th className="px-4 py-2">Invoice Date</th>
//                       <th className="px-4 py-2">Invoice Amount</th>
//                       <th className="px-4 py-2">Remaining Amount</th>
//                       <th className="px-4 py-2">Editable Amount</th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {displayedInvoices.map((invoice, index) => {
//                       const invoiceKey = getInvoiceKey(invoice, index);
//                       const defaultEditableValue =
//                         invoice.remainingAmount !== undefined
//                           ? invoice.remainingAmount
//                           : invoice.grandTotal - (invoice.paidAmount || 0);
//                       const currentAmount =
//                         invoiceAmounts[invoiceKey] !== undefined
//                           ? invoiceAmounts[invoiceKey]
//                           : defaultEditableValue;
//                       return (
//                         <InvoiceRow
//                           key={invoiceKey}
//                           invoice={invoice}
//                           invoiceKey={invoiceKey}
//                           isSelected={formData.selectedInvoices.includes(invoiceKey)}
//                           onSelect={handleCheckboxChange}
//                           currentAmount={currentAmount}
//                           onAmountChange={handleInvoiceAmountChange}
//                         />
//                       );
//                     })}
//                   </tbody>
//                 </table>
//               ) : (
//                 <p className="text-sm text-gray-500">No invoices available.</p>
//               )
//             ) : (
//               <p className="text-sm text-gray-500">
//                 Please select a customer or supplier to view invoices.
//               </p>
//             )}
//           </div>
//         )}
//         {/* Total Amount to Pay */}
//         <div>
//           <label className="block text-sm font-medium text-gray-700">
//             Amount to Pay
//           </label>
//           <input
//             type="number"
//             name="amountToPay"
//             value={totalSelectedAmount}
//             readOnly
//             className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
//             placeholder="Amount to pay"
//           />
//         </div>
//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <button
//             onClick={handleSubmit}
//             className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
//           >
//             Add
//           </button>
//           <button
//             onClick={handleClose}
//             className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
//           >
//             Close
//           </button>
//         </div>
//       </div>
//       <ToastContainer />
//     </div>
//   );
// };

// export default PaymentForm;


  

  "use client";
  import React, { useState, useEffect } from "react";
  import { toast, ToastContainer } from "react-toastify";
  import "react-toastify/dist/ReactToastify.css";

  import CustomerSearch from "@/components/CustomerSearch";
  import SupplierSearch from "@/components/SupplierSearch";
  import BankComponent from "@/components/BankComponent";

  // Helper to generate a unique key for an invoice.
  const getInvoiceKey = (invoice, index) => {
    return invoice._id ? invoice._id : index;
  };

  const InvoiceRow = ({
    invoice,
    invoiceKey,
    isSelected,
    onSelect,
    currentAmount,
    onAmountChange,
  }) => {
    // Use remainingAmount from backend (fallback to computed value if undefined)
    const defaultEditableValue =
      invoice.remainingAmount !== undefined
        ? invoice.remainingAmount
        : invoice.grandTotal - (invoice.paidAmount || 0);
    // Compute new remaining amount based on entered amount.
    const newRemaining =
      isSelected && currentAmount !== undefined
        ? defaultEditableValue - Number(currentAmount)
        : defaultEditableValue;
    return (
      <tr key={invoiceKey}>
        <td className="px-4 py-2 text-center">
          <input
            type="checkbox"
            onChange={() => onSelect(invoiceKey, defaultEditableValue)}
            checked={isSelected}
            className="form-checkbox h-5 w-5 text-blue-600"
          />
        </td>
        <td className="px-4 py-2">{invoice.refNumber}</td>
        <td className="px-4 py-2">
          {new Date(invoice.orderDate).toLocaleDateString()}
        </td>
        <td className="px-4 py-2">${invoice.grandTotal}</td>
        <td className="px-4 py-2">${defaultEditableValue}</td>
        <td className="px-4 py-2">
          <input
            type="number"
            value={currentAmount ?? defaultEditableValue}
            onChange={(e) =>
              onAmountChange(invoiceKey, e.target.value, defaultEditableValue)
            }
            disabled={!isSelected}
            className="w-full p-1 border rounded-md text-sm"
          />
        </td>
        <td className="px-4 py-2">${newRemaining}</td>
      </tr>
    );
  };

  const PaymentForm = () => {
    const initialFormData = {
      paymentType: "", // "Incoming" or "Outgoing"
      code: "",
      customerVendor: "",
      name: "",
      postDate: "",
      modeOfPayment: "",
      bankName: "",
      ledgerAccount: "",
      paidTo: "",
      paymentDate: "",
      remarks: "",
      selectedInvoices: [],
    };

    const [purchaseInvoices, setPurchaseInvoices] = useState([]);
    const [salesInvoices, setSalesInvoices] = useState([]);
    const [formData, setFormData] = useState(initialFormData);
    const [invoiceAmounts, setInvoiceAmounts] = useState({});

    // Render Customer or Supplier search based on payment type.
    const renderMasterComponent = () => {
      if (formData.paymentType === "Incoming") {
        return (
          <CustomerSearch
            onSelectCustomer={(selectedMaster) => {
              setFormData((prev) => ({
                ...prev,
                code: selectedMaster.customerCode,
                customerVendor: selectedMaster.customerName,
              }));
            }}
          />
        );
      } else if (formData.paymentType === "Outgoing") {
        return (
          <SupplierSearch
            onSelectSupplier={(selectedMaster) => {
              setFormData((prev) => ({
                ...prev,
                code: selectedMaster.supplierCode,
                customerVendor: selectedMaster.supplierName,
              }));
            }}
          />
        );
      }
      return null;
    };

    // Fetch invoices when code and payment type change.
    useEffect(() => {
      if (!formData.code || !formData.paymentType) return;
      const token = localStorage.getItem("token");

      const fetchInvoices = async () => {
        try {
          if (formData.paymentType === "Outgoing" ) {
            const response = await fetch(
              `/api/purchaseInvoice?supplierCode=${formData.code}` ,
                {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
            );
            if (response.status === 404) {
              setPurchaseInvoices([]);
            } else {
              const json = await response.json();
              console.log("JSON Response:", json);
              const invoiceData = json.data;
              console.log("Invoice Data:", invoiceData);
              setPurchaseInvoices(Array.isArray(invoiceData) ? invoiceData : []);
            }
          } else if (formData.paymentType === "Incoming") {
         const response = await fetch(
  `/api/sales-invoice?customerCode=${formData.code}`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  }
);

            if (response.status === 404) {
              setSalesInvoices([]);
            } else {

              const json = await response.json();
              console.log("JSON Response:", json);
              const invoiceData = json.data;
              console.log("Invoice Data:", invoiceData);

             setSalesInvoices(Array.isArray(invoiceData) ? invoiceData : []);
              console.log("Sales Invoices:", invoiceData);
            }
          }
        } catch (error) {
          console.error("Error fetching invoices:", error);
        }
      };

      fetchInvoices();
    }, [formData.code, formData.paymentType]);

    console.log("Fetching invoices for code:", formData.code, "type:", formData.paymentType);


    // Filter invoices to show only those that are not fully paid.
    // Using remainingAmount from backend.
    const displayedInvoices =
      formData.paymentType === "Incoming"
        ? Array.isArray(salesInvoices)
          ? salesInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
          : []
        : formData.paymentType === "Outgoing"
        ? Array.isArray(purchaseInvoices)
          ? purchaseInvoices.filter((invoice) => Number(invoice.remainingAmount) > 0)
          : []
        : [];

    const handleInputChange = (e) => {
      const { name, value } = e.target;
      if (name === "paymentType") {
        setFormData((prev) => ({
          ...prev,
          paymentType: value,
          code: "",
          customerVendor: "",
          selectedInvoices: [],
        }));
        setPurchaseInvoices([]);
        setSalesInvoices([]);
        setInvoiceAmounts({});
      } else {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    };

    const handleCheckboxChange = (invoiceKey, invoiceDefaultValue) => {
      const { selectedInvoices } = formData;
      let newSelected;
      if (selectedInvoices.includes(invoiceKey)) {
        newSelected = selectedInvoices.filter((key) => key !== invoiceKey);
      } else {
        if (invoiceAmounts[invoiceKey] === undefined) {
          setInvoiceAmounts((prev) => ({
            ...prev,
            [invoiceKey]: invoiceDefaultValue,
          }));
        }
        newSelected = [...selectedInvoices, invoiceKey];
      }
      setFormData((prev) => ({
        ...prev,
        selectedInvoices: newSelected,
      }));
    };

    const handleInvoiceAmountChange = (invoiceKey, newAmount, invoiceDefaultValue) => {
      const numericValue = Number(newAmount);
      if (numericValue > Number(invoiceDefaultValue)) {
        toast.error(`Amount cannot exceed ${invoiceDefaultValue}`);
        return;
      }
      setInvoiceAmounts((prev) => ({
        ...prev,
        [invoiceKey]: newAmount,
      }));
    };

    const totalSelectedAmount = displayedInvoices.reduce((acc, invoice, index) => {
      const invoiceKey = getInvoiceKey(invoice, index);
      if (formData.selectedInvoices.includes(invoiceKey)) {
        const defaultEditableValue = invoice.remainingAmount !== undefined
          ? invoice.remainingAmount
          : invoice.grandTotal - (invoice.paidAmount || 0);
        const amount =
          invoiceAmounts[invoiceKey] !== undefined
            ? Number(invoiceAmounts[invoiceKey])
            : Number(defaultEditableValue);
        return acc + amount;
      }
      return acc;
    }, 0);

    const validateForm = () => {
      if (!formData.paymentType) {
        toast.error("Please select a payment type");
        return false;
      }
      if (!formData.customerVendor) {
        toast.error("Please select a customer or supplier");
        return false;
      }
      if (formData.selectedInvoices.length === 0) {
        toast.error("Please select at least one invoice");
        return false;
      }
      return true;
    };

    const handleSubmit = async () => {
      const token = localStorage.getItem("token");
      if (!validateForm()) return;
      const invoiceModel =
        formData.paymentType === "Incoming" ? "SalesInvoice" : "PurchaseInvoice";
      const references = formData.selectedInvoices.map((invoiceId) => ({
        invoiceId,
        model: invoiceModel,
        paidAmount: Number(invoiceAmounts[invoiceId] ?? 0),
      }));

      const submissionData = {
        paymentType: formData.paymentType === "Incoming" ? "Customer" : "Supplier",
        code: formData.code,
        customerVendor: formData.customerVendor,
        postDate: formData.postDate,
        paymentDate: formData.paymentDate,
        modeOfPayment: formData.modeOfPayment,
        bankName: formData.bankName,
        ledgerAccount: formData.ledgerAccount,
        paidTo: formData.paidTo,
        remarks: formData.remarks,
        amount: totalSelectedAmount,
        references,
      };

      try {
        const res = await fetch("/api/payment", {
          method: "POST",
          headers: { "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
           },
          body: JSON.stringify(submissionData),
        });
        const result = await res.json();
        if (res.ok) {
          toast.success(result.message || "Payment submitted successfully!");
          // Clear the form after successful submission.
          setFormData(initialFormData);
          setInvoiceAmounts({});
        } else {
          toast.error(result.message || "Payment submission failed.");
        }
      } catch (err) {
        toast.error("Network error during payment submission.");
        console.error(err);
      }
    };

    const handleClose = () => {
      console.log("Form closed");
      toast.info("Form closed");
    };

    return (
      <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6">
        <ToastContainer />
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Payment Form</h2>
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            Purchase & Sales Payment Details
          </h3>
        </div>
        <div className="space-y-4">
          {/* Payment Type */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment Type (Incoming / Outgoing)
              </label>
              <select
                name="paymentType"
                value={formData.paymentType}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select Payment Type</option>
                <option value="Incoming">Incoming</option>
                <option value="Outgoing">Outgoing</option>
              </select>
            </div>
          </div>
          {/* Render Customer or Supplier Selection */}
          {formData.paymentType && renderMasterComponent()}
          {/* Auto-filled Code and Customer/Supplier Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Code</label>
              <input
                type="text"
                name="code"
                value={formData.code}
                readOnly
                className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
                placeholder="Auto-filled code"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {formData.paymentType === "Incoming" ? "Customer Name" : "Supplier Name"}
              </label>
              <input
                type="text"
                name="customerVendor"
                value={formData.customerVendor}
                readOnly
                className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
                placeholder="Auto-filled name"
              />
            </div>
          </div>
          {/* Additional Dates and Payment Details */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Post Date</label>
              <input
                type="date"
                name="postDate"
                value={formData.postDate}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Payment Date</label>
              <input
                type="date"
                name="paymentDate"
                value={formData.paymentDate}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Mode of Payment</label>
              <select
                name="modeOfPayment"
                value={formData.modeOfPayment}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">Select Mode</option>
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
                <option value="NEFT">NEFT</option>
                <option value="RTGS">RTGS</option>
                <option value="Cheque">Cheque</option>
              </select>
            </div>
          </div>
          {/* Additional Payment Details using BankComponent */}
          <div className="grid grid-cols-3 gap-4">
            <BankComponent bankName={formData.bankName} onChange={handleInputChange} />
            <div>
              <label className="block text-sm font-medium text-gray-700">Ledger Account</label>
              <input
                type="text"
                name="ledgerAccount"
                value={formData.ledgerAccount}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter ledger account"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Paid To (Cheque/Reference)</label>
              <input
                type="text"
                name="paidTo"
                value={formData.paidTo}
                onChange={handleInputChange}
                className="mt-1 block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Enter cheque/reference"
              />
            </div>
          </div>
          {/* Invoice Table with Multiple Selection */}
          {formData.paymentType && (
            <div>
              <h3 className="text-md font-medium text-gray-800 mb-2">
                {formData.paymentType === "Incoming"
                  ? "Select Sales Invoices"
                  : "Select Purchase Invoices"}
              </h3>
              {formData.code ? (
                displayedInvoices.length > 0 ? (
                  <table className="w-full text-sm text-left text-gray-700 border-collapse">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="px-4 py-2">Select</th>
                        <th className="px-4 py-2">Invoice Number</th>
                        <th className="px-4 py-2">Invoice Date</th>
                        <th className="px-4 py-2">Invoice Amount</th>
                        <th className="px-4 py-2">Remaining Amount</th>
                        <th className="px-4 py-2">Editable Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedInvoices.map((invoice, index) => {
                        const invoiceKey = getInvoiceKey(invoice, index);
                        // Use remainingAmount from the DB as the default editable value.
                        const defaultEditableValue =
                          invoice.remainingAmount !== undefined
                            ? invoice.remainingAmount
                            : invoice.grandTotal - (invoice.paidAmount || 0);
                        const currentAmount =
                          invoiceAmounts[invoiceKey] !== undefined
                            ? invoiceAmounts[invoiceKey]
                            : defaultEditableValue;
                        return (
                          <InvoiceRow
                            key={invoiceKey}
                            invoice={invoice}
                            invoiceKey={invoiceKey}
                            isSelected={formData.selectedInvoices.includes(invoiceKey)}
                            onSelect={handleCheckboxChange}
                            currentAmount={currentAmount}
                            onAmountChange={handleInvoiceAmountChange}
                          />
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-gray-500">No invoices available.</p>
                )
              ) : (
                <p className="text-sm text-gray-500">
                  Please select a customer or supplier to view invoices.
                </p>
              )}
            </div>
          )}
          {/* Total Amount to Pay */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount to Pay</label>
            <input
              type="number"
              name="amountToPay"
              value={totalSelectedAmount}
              readOnly
              className="mt-1 block w-full p-2 border rounded-md bg-gray-100 sm:text-sm"
              placeholder="Amount to pay"
            />
          </div>
          {/* Form Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              onClick={handleSubmit}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  };

  export default PaymentForm;