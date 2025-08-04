// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import GroupSearch from "@/components/groupmaster";

// function CustomerManagement({ customerId,customerCode }) {
//   const [customerList, setCustomerList] = useState([]);
//   const [customers, setCustomers] = useState([]);

//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(false);
//   const filteredCustomers = customerList.filter(
//     (customer) =>
//       customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       customer.emailId.toLowerCase().includes(searchTerm.toLowerCase())
//   );
//   const [customerDetails, setCustomerDetails] = useState({
//     customerCode: "",
//     customerName: "",
//     customerType: "",
//     emailId: "",
//     mobileNumber: "",
//     billingAddress1: "",
//     billingAddress2: "",
//     billingCountry: null,
//     billingState: null,
//     billingCity: "",
//     billingZip: "",
//     shippingAddress1: "",
//     shippingAddress2: "",
//     shippingCountry: null,
//     shippingCity: "",
//     shippingState: null,
//     shippingZip: "",
//     paymentTerms: "",
//     gstNumber: "",
//     gstCategory: "",
//     pan: "",
//     contactPersonName: "",
//     commissionRate: "",
//     glAccount: "",
//   });
//   const [isEditing, setIsEditing] = useState(false);
//   useEffect(() => {
//     if (customerId) {
//       const fetchCustomerDetails = async () => {
//         try {
//           const response = await axios.get(`/api/customers/${customerId}`);
//           setCustomerDetails(response.data);
//         } catch (error) {
//           console.error("Error fetching customer details:", error);
//         }
//       };

//       fetchCustomerDetails();
//     } else {
//       // Generate a new customer code if creating new customer
//       generateCustomerCode();
//     }
//   }, [customerId]);

//   const generateCustomerCode = async () => {
//     try {
//       const lastCodeRes = await fetch("/api/lastCustomerCode");
//       const { lastCustomerCode } = await lastCodeRes.json();
//       const lastNumber = parseInt(lastCustomerCode.split("-")[1], 10) || 0;
//       let newNumber = lastNumber + 1;

//       let generatedCode = "";
//       let codeExists = true;

//       while (codeExists) {
//         generatedCode = `CUST-${newNumber.toString().padStart(4, "0")}`;
//         const checkRes = await fetch(
//           `/api/checkCustomerCode?code=${generatedCode}`
//         );
//         const { exists } = await checkRes.json();
//         if (!exists) break;
//         newNumber++;
//       }

//       setCustomerDetails((prev) => ({
//         ...prev,
//         customerCode: generatedCode,
//       }));
//     } catch (error) {
//       console.error("Failed to generate code:", error);
//     }
//   };
//   const [selectedGroup, setSelectedGroup] = useState(null);
//   const handleGroupSelect = (group) => {
//     setSelectedGroup(group);
//     setCustomerDetails((prev) => ({ ...prev, customerGroup: group.name }));
//   };

//   const handleSelectBillingCountry = (country) => {
//     setCustomerDetails((prev) => ({ ...prev, billingCountry: country.name }));
//   };

//   const handleSelectBillingState = (state) => {
//     setCustomerDetails((prev) => ({ ...prev, billingState: state.name }));
//   };

//   const handleSelectShippingCountry = (country) => {
//     setCustomerDetails((prev) => ({ ...prev, shippingCountry: country.name }));
//   };

//   const handleSelectShippingState = (state) => {
//     setCustomerDetails((prev) => ({ ...prev, shippingState: state.name }));
//   };

//   const customerTypeOptions = [
//     { value: "Individual", label: "Individual" },
//     { value: "Business", label: "Business" },
//     { value: "Government", label: "Government" },
//   ];

//   const validate = () => {
//     const requiredFields = [
//       "customerName",
//       "emailId",
//       "billingAddress1",
//       "billingCity",
//       "billingCountry",
//       "billingState",
//       "billingZip",
//       "shippingAddress1",
//       "shippingCity",
//       "shippingCountry",
//       "shippingState",
//       "shippingZip",
//     ];

//     for (const field of requiredFields) {
//       if (!customerDetails[field]) {
//         alert(`Please fill the required field: ${field}`);
//         return false;
//       }
//     }
//     return true;
//   };

//   useEffect(() => {
//     const fetchCustomer = async () => {
//       try {
//         const response = await axios.get("/api/customers");
//         setCustomerList(response.data || []); // Assuming the response contains `accounts`
//       } catch (err) {
//         console.error("Error fetching users:", err);
//         setError("Unable to fetch users. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchCustomer();
//   }, []);

//     const handleSubmit = async (e) => {
//       e.preventDefault();

//       try {
//         if (isEditing) {
//           // ✅ Update existing customer
//           const res = await fetch(`/api/customers/${customerDetails._id}`, {
//             method: "PUT",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(customerDetails), // ✅ Send customer data
//           });

//           const data = await res.json();

//           if (res.ok) {
//             // ✅ Update customer in state (don't remove it)
//             setCustomers(customers.map((customer) =>
//               customer._id === customerDetails._id ? data : customer
//             ));
//             alert("Customer updated successfully!");
//           } else {
//             console.error("Error updating customer:", data.error);
//             alert(data.error || "Error updating customer");
//           }
//         } else {
//           // ✅ Create new customer
//           const res = await axios.post("/api/customers", customerDetails);
//           setCustomers([...customers, res.data]); // ✅ Add new customer to the state
//           alert("Customer created successfully!");
//         }

//         resetForm();

//       } catch (error) {
//         console.error("Error submitting form:", error);
//         alert(error.response?.data?.error || "There was an error submitting the form.");
//       }
//     };

//   const resetForm = () => {
//     setCustomerDetails({
//       customerCode: "",
//       customerName: "",
//       customerGroup: "",
//       customerType: "",
//       emailId: "",
//       mobileNumber: "",
//       billingAddress1: "",
//       billingAddress2: "",
//       billingCity: "",
//       billingZip: "",
//       shippingAddress1: "",
//       shippingAddress2: "",
//       shippingCity: "",
//       shippingZip: "",
//       paymentTerms: "",
//       gstNumber: "",
//       gstCategory: "",
//       pan: "",
//       contactPersonName: "",
//       commissionRate: "",
//       glAccount: "",
//     });
//     setIsEditing(false);
//   };

//   const handleEdit = (customer) => {
//     setCustomerDetails(customer);
//     setIsEditing(true);
//   };

//   const handleDelete = async (id) => {
//         const confirmDelete = confirm('Are you sure you want to delete this customer?');
//         if (confirmDelete) {
//           try {
//             const res = await fetch(`/api/customers/${id}`, {
//               method: 'DELETE',
//             });
//             const data = await res.json();
//             if (res.ok) {
//               setCustomers(customers.filter((customer) => customer._id !== id));
//             } else {
//               console.error('Error deleting customer:', data.error);
//             }
//           } catch (error) {
//             console.error('Error:', error);
//           }
//         }
//       };

//   return (
//     <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
//       <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
//         {isEditing ? "Edit Customer" : "Create Customer"}
//       </h1>

//       <form className="space-y-6" onSubmit={handleSubmit}>
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Customer Code
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.customerCode}
//                 readOnly // Prevent manual editing
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//                 // className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Customer Name <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.customerName}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     customerName: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//                 // className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Customer Group <span className="text-red-500">*</span>
//               </label>
//               <GroupSearch onSelectGroup={handleGroupSelect} className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2" />
//             </div>
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Customer Type <span className="text-red-500">*</span>
//               </label>
//               <select
//                 name="customerType"
//                 value={customerDetails.customerType}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     customerType: e.target.value,
//                   })
//                 }
//                 required
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//                 // className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 {customerTypeOptions.map((option) => (
//                   <option key={option.value} value={option.value}>
//                     {option.label}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Email ID <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="email"
//                 value={customerDetails.emailId}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     emailId: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//                 // className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Mobile Number
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.mobileNumber}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     mobileNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//                 // className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           {/* </div>

//           <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> */}
//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Billing Address
//               </label>
//               <input
//                 type="text"
//                 placeholder="Address Line 1"
//                 value={customerDetails.billingAddress1}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     billingAddress1: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address Line 2"
//                 value={customerDetails.billingAddress2}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     billingAddress2: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="City"
//                 value={customerDetails.billingCity}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     billingCity: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <CountryStateSearch
//                 onSelectCountry={handleSelectBillingCountry}
//                 onSelectState={handleSelectBillingState}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <br />
//               <input
//                 type="text"
//                 placeholder="PIN Code"
//                 value={customerDetails.billingZip}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     billingZip: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Shipping Address
//               </label>
//               <input
//                 type="text"
//                 placeholder="Address Line 1"
//                 value={customerDetails.shippingAddress1}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     shippingAddress1: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="Address Line 2"
//                 value={customerDetails.shippingAddress2}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     shippingAddress2: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <input
//                 type="text"
//                 placeholder="City"
//                 value={customerDetails.shippingCity}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     shippingCity: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <CountryStateSearch
//                 onSelectCountry={handleSelectShippingCountry}
//                 onSelectState={handleSelectShippingState}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
//               />
//               <br />
//               <input
//                 type="text"
//                 placeholder="PIN Code"
//                 value={customerDetails.shippingZip}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     shippingZip: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Payment Terms
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.paymentTerms}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     paymentTerms: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GST Number
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.gstNumber}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     gstNumber: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GST Category
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.gstCategory}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     gstCategory: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 PAN
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.pan}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     pan: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Contact Person Name
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.contactPersonName}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     contactPersonName: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 Commission Rate
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.commissionRate}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     commissionRate: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="text-sm font-medium text-gray-700 mb-2">
//                 GL Account
//               </label>
//               <input
//                 type="text"
//                 value={customerDetails.glAccount}
//                 onChange={(e) =>
//                   setCustomerDetails({
//                     ...customerDetails,
//                     glAccount: e.target.value,
//                   })
//                 }
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>
//         {/* </div> */}

//         <div className="flex gap-3 mt-8">
//           <button
//             type="submit"
//             className={`px-6 py-3 text-white rounded-lg focus:outline-none ${
//               isEditing ? "bg-blue-600" : "bg-green-600"
//             }`}
//           >
//             {isEditing ? "Update Customer" : "Create Customer"}
//           </button>
//           <button
//             type="button"
//             onClick={resetForm}
//             className="bg-gray-600 text-white rounded-lg px-6 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-gray-500"
//           >
//             Cancel
//           </button>
//         </div>
//       </form>

//       {/* <h2 className="text-2xl font-bold text-blue-600 mt-12">Customer List</h2>
//       <div className="mt-6 bg-gray-100 p-6 rounded-lg shadow-lg">

//           <div>
//       <input
//         type="text"
//         placeholder="Search customers..."
//         className="mb-4 p-2 border border-gray-300 rounded w-full"
//         value={searchTerm}
//         onChange={(e) => setSearchTerm(e.target.value)}
//       />
//       <table className="table-auto w-full text-left border-collapse border border-gray-300">
//         <thead>
//           <tr className="bg-gray-200 text-gray-700">
//             <th className="px-4 py-2 border border-gray-300">Customer Code</th>
//             <th className="px-4 py-2 border border-gray-300">Customer Name</th>
//             <th className="px-4 py-2 border border-gray-300">Email</th>
//             <th className="px-4 py-2 border border-gray-300">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {filteredCustomers.map((customer) => (
//             <tr key={customer.customerCode} className="hover:bg-gray-50">
//               <td className="px-4 py-2 border border-gray-300">{customer.customerCode}</td>
//               <td className="px-4 py-2 border border-gray-300">{customer.customerName}</td>
//               <td className="px-4 py-2 border border-gray-300">{customer.emailId}</td>
//               <td className="px-4 py-2 border border-gray-300 flex gap-2">
//                 <button
//                   className="text-blue-500 hover:text-blue-700"
//                   onClick={() => handleEdit(customer)}
//                 >
//                   <FaEdit />
//                 </button>
//                 <button
//                   className="text-red-500 hover:text-red-700"
//                   onClick={() => handleDelete(customer._id)}
//                 >
//                   <FaTrash />
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//       </div>
//       </div> */}
//     </div>
//   );
// }

// export default CustomerManagement;

// Responsive & Enhanced CustomerManagement component
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaEdit, FaTrash, FaPlus, FaSearch, FaMinus } from "react-icons/fa";
import CountryStateSearch from "@/components/CountryStateSearch";
import GroupSearch from "@/components/groupmaster";
import AccountSearch from "@/components/AccountSearch";
 import { toast } from "react-toastify";

export default function CustomerManagement() {
  const [view, setView] = useState("list");
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerDetails, setCustomerDetails] = useState({
    customerCode: "",
    customerName: "",
    customerGroup: "",
    customerType: "",
    emailId: "",
    mobileNumber: "",
    billingAddresses: [
      { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
    ],
    shippingAddresses: [
      { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
    ],
    paymentTerms: "",
    gstNumber: "",
    gstCategory: "",
    pan: "",
    contactPersonName: "",
    commissionRate: "",
    glAccount: null,
  });



const fetchCustomers = async () => {
  setLoading(true);

  try {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("No token found");

    const res = await axios.get("/api/customers", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.data.success) {
      setCustomers(res.data.data || []);
    } else {
      setError(res.data.message || "Failed to load customers.");
    }
  } catch (err) {
    console.error("Fetch error:", err);
    setError("Failed to load customers.");
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchCustomers();
}, []);

const generateCustomerCode = async () => {
  try {
    const token = localStorage.getItem("token"); // Or however you store it

    const res = await fetch("/api/lastCustomerCode", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch last customer code");
    }

    const { lastCustomerCode } = await res.json();
    const num = parseInt(lastCustomerCode.split("-")[1], 10) + 1;

    setCustomerDetails(prev => ({
      ...prev,
      customerCode: `CUST-${num.toString().padStart(4, "0")}`,
    }));
  } catch (err) {
    console.error("Error generating customer code:", err);
  }
};


  // const generateCustomerCode = async () => {
  //   try {
  //     const res = await fetch("/api/lastCustomerCode");
  //     const { lastCustomerCode } = await res.json();
  //     const num = parseInt(lastCustomerCode.split("-")[1], 10) + 1;
  //     setCustomerDetails(prev => ({
  //       ...prev,
  //       customerCode: `CUST-${num.toString().padStart(4, "0")}`,
  //     }));
  //   } catch {}
  // };

  const handleChange = e => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleGroupSelect = group => {
    setCustomerDetails(prev => ({ ...prev, customerGroup: group?.name || "" }));
  };

  const handleAddressChange = (type, idx, field, value) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    const arr = [...customerDetails[key]];
    arr[idx][field] = value;
    setCustomerDetails(prev => ({ ...prev, [key]: arr }));
  };

  const addAddress = type => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    setCustomerDetails(prev => ({
      ...prev,
      [key]: [
        ...prev[key],
        { address1: "", address2: "", country: "", state: "", city: "", pin: "" },
      ],
    }));
  };

  const removeAddress = (type, idx) => {
    const key = type === "billing" ? "billingAddresses" : "shippingAddresses";
    if (customerDetails[key].length === 1) return;
    setCustomerDetails(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== idx),
    }));
  };


const validate = () => {
  
  const reqFields = [
    { field: "customerName", label: "Customer Name" },
    { field: "customerGroup", label: "Customer Group" },
    { field: "customerType", label: "Customer Type" },
    { field: "glAccount", label: "GL Account" },
    { field: "gstCategory", label: "GST Category" },
    { field: "gstNumber", label: "GST Number" },
    { field: "pan", label: "PAN" },
    { field: "mobileNumber", label: "mobileNumber" },
    { field: "emailId", label: "Email ID" },
  ];

  for (let { field, label } of reqFields) {
  const value = customerDetails[field];

  if (!value || (field === "glAccount" && !customerDetails.glAccount?._id)) {
    toast.error(`${label} is required`);
    return false;
  }

  if (field === "mobileNumber" && !/^\d{10}$/.test(value)) {
    toast.error("Mobile Number must be exactly 10 digits");
    return false;
  }

  if (field === "emailId" && value && !/^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/.test(value)) {
    toast.error("Invalid email format");
    return false;
  }

  if (field === "pan" && value && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value)) {
    toast.error("Invalid PAN format. Example: ABCDE1234F");
    return false;
  }

  if (field === "gstNumber" && value && !/^\d{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(value)) {
    toast.error("Invalid GST Number. Example: 22ABCDE1234F1Z5");
    return false;
  }
}
  return true;
};


  // const validate = () => {
  //   const reqFields = [
  //     { field: "customerName", label: "Customer Name" },
  //     { field: "customerGroup", label: "Customer Group" },
  //     { field: "customerType", label: "Customer Type" },
  //     { field: "glAccount", label: "GL Account" },
  //     // { field: "emailId", label: "Email ID" },
  //     { field: "gstCategory", label: "GST Category" },
  //     { field: "pan", label: "PAN" },
  //   ];
  //   for (let { field, label } of reqFields) {
  //     if (
  //       !customerDetails[field] ||
  //       (field === "glAccount" && !customerDetails.glAccount?._id)
  //     ) {
  //       alert(`${label} is required`);
  //       return false;
  //     }
  //   }
  //   // ... other validations
  //   return true;
  // };

  // const handleSubmit = async e => {
  //   e.preventDefault();
  //   if (!validate()) return;

  //   const token = localStorage.getItem("token");

  //   if (!token) {
  //     throw new Error("User is not authenticated");
  //   }

  //   const headers = {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${token}`,
  //   };
  //   try {
  //     // Prepare payload: replace glAccount object with its _id
  //     const payload = {
  //       ...customerDetails,
  //       glAccount: customerDetails.glAccount?._id || null,
  //     };
  //     let res;
  //     if (customerDetails._id) {
  //       res = await axios.put(`/api/customers/${customerDetails._id}`, payload,headers);
  //       setCustomers(customers.map(c => (c._id === customerDetails._id ? res.data : c)));
  //     } else {
  //       res = await axios.post("/api/customers", payload,headers);
  //       setCustomers(prev => [...prev, res.data]);
  //     }
  //     setView("list");
  //   } catch (err) {
  //     console.error(err);
  //     alert("Submit failed: " + err.response?.data?.message || err.message);
  //   }
  // };




  const handleSubmit = async e => {
  e.preventDefault();
  if (!validate()) return;

  const token = localStorage.getItem("token");
  if (!token) {
    throw new Error("User is not authenticated");
  }



  const config = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };

  try {
    // Prepare payload: replace glAccount object with its _id
    const payload = {
      ...customerDetails,
      glAccount: customerDetails.glAccount?._id || null,
    };

    let res;
    if (customerDetails._id) {
      res = await axios.put(`/api/customers/${customerDetails._id}`, payload, config);
      setCustomers(customers.map(c => (c._id === customerDetails._id ? res.data.data : c)));
    } else {
      res = await axios.post("/api/customers", payload, config);
      setCustomers(prev => [...prev, res.data.data]);
      
    }
  
    setView("list");
    resetForm();
  } catch (err) {
    console.error(err);
    alert("Submit failed: " + (err.response?.data?.message || err.message));
  }
};

  const resetForm = () => {
    setCustomerDetails({
      customerCode: "",
      customerName: "",
      customerGroup: "",
      customerType: "",
      emailId: "",
      mobileNumber: "",
      billingAddresses: [{ address1: "", address2: "", country: "", state: "", city: "", pin: "" }],
      shippingAddresses: [{ address1: "", address2: "", country: "", state: "", city: "", pin: "" }],
      paymentTerms: "",
      gstNumber: "",
      gstCategory: "",
      pan: "",
      contactPersonName: "",
      commissionRate: "",
      glAccount: null,
    });
    setView("list");
  };

  const handleEdit = c => {
    setCustomerDetails(c);
    setView("form");
  };

  const handleDelete = async id => {
    if (!confirm("Are you sure?")) return;
    await axios.delete(`/api/customers/${id}`);
    setCustomers(prev => prev.filter(c => c._id !== id));
  };

  const filtered = customers.filter(c =>
    [
      c.customerCode,
      c.customerName,
      c.emailId,
      c.customerGroup,
      c.customerType,
      c.glAccount?.accountCode,
    ].some(v => v?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const renderListView = () => (
    <div className="p-6 sm:p-8">
      <div className="flex flex-col sm:flex-row justify-between mb-6">
        <h1 className="text-2xl font-bold">Customer Management</h1>
        <button
          onClick={() => {
            generateCustomerCode();
            setView("form");
          }}
          className="mt-4 sm:mt-0 inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
        >
          <FaPlus className="mr-2" />
          Add Customer
        </button>
      </div>
      <div className="mb-4 relative max-w-md">
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search customers..."
          className="w-full border rounded-md py-2 pl-4 pr-10 focus:ring-2 focus:ring-blue-500"
        />
        <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {[
                "Code",
                "Name",
                "Email",
                "Group",
                "Type",
                "GL Account",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-2 text-left text-sm font-medium text-gray-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((c) => (
              <tr key={c._id} className="hover:bg-gray-50">
                <td className="px-4 py-2">{c.customerCode}</td>
                <td className="px-4 py-2">{c.customerName}</td>
                <td className="px-4 py-2">{c.emailId}</td>
                <td className="px-4 py-2">{c.customerGroup}</td>
                <td className="px-4 py-2">{c.customerType}</td>
                <td className="px-4 py-2">{c.glAccount?.accountName || 'N/A'}</td>
                <td className="px-4 py-2 flex space-x-3">
                  <button
                    onClick={() => handleEdit(c)}
                    className="text-blue-600"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(c._id)}
                    className="text-red-600"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

const renderFormView = () => (
  <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
    <h2 className="text-2xl font-semibold mb-6 text-center">
      {customerDetails._id ? "Edit Customer" : "New Customer"}
    </h2>

    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
          <input
            name="customerCode"
            value={customerDetails.customerCode || ""}
            readOnly
            className="w-full border rounded-md p-2 bg-gray-100"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Name <span className="text-red-500">*</span>
          </label>
          <input
            name="customerName"
            value={customerDetails.customerName || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Group and Type */}
      <div className="grid sm:grid-cols-2 gap-4">
     <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Customer Group <span className="text-red-500">*</span>
  </label>
  <GroupSearch
    value={customerDetails.customerGroup}
    onSelectGroup={(name) =>
      setCustomerDetails((prev) => ({ ...prev, customerGroup: name }))
    }
  />
  {!customerDetails.customerGroup && (
    <p className="text-red-500 text-sm mt-1">Customer Group is required</p>
  )}
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer Type <span className="text-red-500">*</span>
          </label>
          <select
            name="customerType"
            value={customerDetails.customerType || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            <option>Individual</option>
            <option>Business</option>
            <option>Government</option>
          </select>
        </div>
      </div>

      {/* Contact Info */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Email ID <span className="text-red-500">*</span>
          </label>
          <input
            name="emailId"
            type="email"
            value={customerDetails.emailId || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
     <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    Mobile Number
  </label>
  <input
    name="mobileNumber"
    type="text"
    placeholder="Mobile Number"
    maxLength={10}
    value={customerDetails.mobileNumber || ""}
    onChange={(e) => {
      const input = e.target.value;
      if (/^\d{0,10}$/.test(input)) {
        handleChange(e); // only allow up to 10 digits
      }
    }}
    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
          <input
            name="contactPersonName"
            value={customerDetails.contactPersonName || ""}
            onChange={handleChange}
            placeholder="Contact Person"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Billing Addresses */}
      <h3 className="text-lg font-semibold">Billing Addresses</h3>
      {customerDetails.billingAddresses?.map((addr, i) => (
        <div key={i} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Billing Address {i + 1}</span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAddress("billing", i)}
                className="text-red-600"
              >
                <FaMinus />
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={addr.address1 || ""}
              onChange={(e) => handleAddressChange("billing", i, "address1", e.target.value)}
              placeholder="Line 1"
              className="border p-2 rounded"
            />
            <input
              value={addr.address2 || ""}
              onChange={(e) => handleAddressChange("billing", i, "address2", e.target.value)}
              placeholder="Line 2"
              className="border p-2 rounded"
            />
            <input
              value={addr.city || ""}
              onChange={(e) => handleAddressChange("billing", i, "city", e.target.value)}
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              value={addr.pin || ""}
               type="Number"
              onChange={(e) => handleAddressChange("billing", i, "pin", e.target.value)}
              placeholder="PIN"
              className="border p-2 rounded"
            />
       <CountryStateSearch
  valueCountry={addr.country ? { name: addr.country } : null}
  valueState={addr.state ? { name: addr.state } : null}
  onSelectCountry={(c) => handleAddressChange("billing", i, "country", c?.name || "")}
  onSelectState={(s) => handleAddressChange("billing", i, "state", s?.name || "")}
/>

          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAddress("billing")}
        className="inline-flex items-center text-blue-600 mb-6"
      >
        <FaPlus className="mr-1" /> Add Billing Address
      </button>

      {/* Shipping Addresses */}
      <h3 className="text-lg font-semibold">Shipping Addresses</h3>
      {customerDetails.shippingAddresses?.map((addr, i) => (
        <div key={i} className="border p-4 rounded mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Shipping Address {i + 1}</span>
            {i > 0 && (
              <button
                type="button"
                onClick={() => removeAddress("shipping", i)}
                className="text-red-600"
              >
                <FaMinus />
              </button>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <input
              value={addr.address1 || ""}
              onChange={(e) => handleAddressChange("shipping", i, "address1", e.target.value)}
              placeholder="Line 1"
              className="border p-2 rounded"
            />
            <input
              value={addr.address2 || ""}
              onChange={(e) => handleAddressChange("shipping", i, "address2", e.target.value)}
              placeholder="Line 2"
              className="border p-2 rounded"
            />
            <input
              value={addr.city || ""}
              onChange={(e) => handleAddressChange("shipping", i, "city", e.target.value)}
              placeholder="City"
              className="border p-2 rounded"
            />
            <input
              value={addr.pin || ""}
               type="Number"
              onChange={(e) => handleAddressChange("shipping", i, "pin", e.target.value)}
              placeholder="PIN"
              className="border p-2 rounded"
            />
          <CountryStateSearch
  valueCountry={addr.country ? { name: addr.country } : null}
  valueState={addr.state ? { name: addr.state } : null}
  onSelectCountry={(c) => handleAddressChange("shipping", i, "country", c?.name || "")}
  onSelectState={(s) => handleAddressChange("shipping", i, "state", s?.name || "")}
/>

          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => addAddress("shipping")}
        className="inline-flex items-center text-blue-600 mb-6"
      >
        <FaPlus className="mr-1" /> Add Shipping Address
      </button>

      {/* Other Details */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms In (Day)</label>
          <input
            name="paymentTerms"
            type="Number"
            value={customerDetails.paymentTerms || ""}
            onChange={handleChange}
            placeholder="Payment Terms"
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    GST Number
  </label>
  <input
    name="gstNumber"
    type="text"
    placeholder="Enter GST Number"
    value={customerDetails.gstNumber || ""}
    onChange={(e) => {
      const input = e.target.value.toUpperCase();
      if (/^[A-Z0-9]{0,15}$/.test(input)) {
        handleChange({ target: { name: "gstNumber", value: input } });
      }
    }}
    maxLength={15}
    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GST Category <span className="text-red-500">*</span>
          </label>
          <select
            name="gstCategory"
            value={customerDetails.gstCategory || ""}
            onChange={handleChange}
            className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
           
          >
            <option value="">Select GST Category</option>
            <option value="Registered Regular">Registered Regular</option>
            <option value="Registered Composition">Registered Composition</option>
            <option value="Unregistered">Unregistered</option>
            <option value="SEZ">SEZ</option>
            <option value="Overseas">Overseas</option>
            <option value="Deemed Export">Deemed Export</option>
            <option value="UIN Holders">UIN Holders</option>
            <option value="Tax Deductor">Tax Deductor</option>
            <option value="Tax Collector">Tax Collector</option>
            <option value="Input Service Distributor">Input Service Distributor</option>
          </select>
        </div>
    <div>
  <label className="block text-sm font-medium text-gray-700 mb-1">
    PAN Number
  </label>
  <input
    name="pan"
    type="text"
    placeholder="Enter PAN Number"
    value={customerDetails.pan || ""}
    onChange={(e) => {
      const input = e.target.value.toUpperCase();
      if (/^[A-Z0-9]{0,10}$/.test(input)) {
        handleChange({ target: { name: "pan", value: input } });
      }
    }}
    maxLength={10}
    className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500"
  />
</div>

        <div>
        
          <AccountSearch
            value={customerDetails.glAccount}
            onSelect={(selected) =>
              setCustomerDetails((prev) => ({
                ...prev,
                glAccount: selected,
              }))
            }
          />
        </div>
      </div>

      {/* Footer Buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={resetForm}
          className="px-4 py-2 bg-gray-500 text-white rounded-md"
        >
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
          {customerDetails._id ? "Update" : "Create"}
        </button>
      </div>
    </form>
  </div>
);


  return view === "list" ? renderListView() : renderFormView();
}

// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { FaEdit, FaTrash, FaPlus, FaSearch } from "react-icons/fa";
// import CountryStateSearch from "@/components/CountryStateSearch";
// import GroupSearch from "@/components/groupmaster";

// function CustomerManagement() {
//   // State management
//   const [view, setView] = useState("list"); // 'list' or 'form'
//   const [customers, setCustomers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   const [customerDetails, setCustomerDetails] = useState({
//     customerCode: "",
//     customerName: "",
//     customerGroup: "",
//     customerType: "",
//     emailId: "",
//     mobileNumber: "",
//     billingAddress1: "",
//     billingAddress2: "",
//     billingCountry: "",
//     billingState: "",
//     billingCity: "",
//     billingZip: "",
//     shippingAddress1: "",
//     shippingAddress2: "",
//     shippingCountry: "",
//     shippingCity: "",
//     shippingState: "",
//     shippingZip: "",
//     paymentTerms: "",
//     gstNumber: "",
//     gstCategory: "",
//     pan: "",
//     contactPersonName: "",
//     commissionRate: "",
//     glAccount: "",
//   });

//   // Fetch customers on mount
//   useEffect(() => {
//     fetchCustomers();
//   }, []);

//   const fetchCustomers = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get("/api/customers");
//       setCustomers(response.data || []);
//     } catch (err) {
//       setError("Unable to fetch customers. Please try again.");
//       console.error("Error fetching customers:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Generate customer code for new customers
//   const generateCustomerCode = async () => {
//     try {
//       const lastCodeRes = await fetch("/api/lastCustomerCode");
//       const { lastCustomerCode } = await lastCodeRes.json();
//       const lastNumber = parseInt(lastCustomerCode.split("-")[1], 10) || 0;
//       let newNumber = lastNumber + 1;

//       let generatedCode = "";
//       let codeExists = true;

//       while (codeExists) {
//         generatedCode = `CUST-${newNumber.toString().padStart(4, "0")}`;
//         const checkRes = await fetch(
//           `/api/checkCustomerCode?code=${generatedCode}`
//         );
//         const { exists } = await checkRes.json();
//         if (!exists) break;
//         newNumber++;
//       }

//       setCustomerDetails(prev => ({
//         ...prev,
//         customerCode: generatedCode,
//       }));
//     } catch (error) {
//       console.error("Failed to generate code:", error);
//     }
//   };

//   // Handle group selection
//   const handleGroupSelect = (group) => {
//     setCustomerDetails(prev => ({
//       ...prev,
//       customerGroup: group.name
//     }));
//   };

//   // Handle form field changes
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setCustomerDetails(prev => ({ ...prev, [name]: value }));
//   };

//   // Form validation
//   const validate = () => {
//     const requiredFields = [
//       "customerName",
//       "emailId",
//       "billingAddress1",
//       "billingCity",
//       "billingCountry",
//       "billingState",
//       "billingZip",
//     ];

//     for (const field of requiredFields) {
//       if (!customerDetails[field]) {
//         alert(`Please fill the required field: ${field}`);
//         return false;
//       }
//     }
//     return true;
//   };

//   // Form submission
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!validate()) return;

//     try {
//       if (customerDetails._id) {
//         // Update existing customer
//         const res = await axios.put(
//           `/api/customers/${customerDetails._id}`,
//           customerDetails
//         );
//         setCustomers(customers.map(c =>
//           c._id === customerDetails._id ? res.data : c
//         ));
//         alert("Customer updated successfully!");
//       } else {
//         // Create new customer
//         const res = await axios.post("/api/customers", customerDetails);
//         setCustomers([...customers, res.data]);
//         alert("Customer created successfully!");
//       }
//       setView("list");
//     } catch (error) {
//       console.error("Error submitting form:", error);
//       alert(error.response?.data?.error || "There was an error submitting the form.");
//     }
//   };

//   // Reset form and switch to list view
//   const resetForm = () => {
//     setCustomerDetails({
//       customerCode: "",
//       customerName: "",
//       customerGroup: "",
//       customerType: "",
//       emailId: "",
//       mobileNumber: "",
//       billingAddress1: "",
//       billingAddress2: "",
//       billingCountry: "",
//       billingState: "",
//       billingCity: "",
//       billingZip: "",
//       shippingAddress1: "",
//       shippingAddress2: "",
//       shippingCountry: "",
//       shippingCity: "",
//       shippingState: "",
//       shippingZip: "",
//       paymentTerms: "",
//       gstNumber: "",
//       gstCategory: "",
//       pan: "",
//       contactPersonName: "",
//       commissionRate: "",
//       glAccount: "",
//     });
//     setView("list");
//   };

//   // Edit customer handler
//   const handleEdit = (customer) => {
//     setCustomerDetails(customer);
//     setView("form");
//   };

//   // Delete customer handler
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this customer?")) return;

//     try {
//       await axios.delete(`/api/customers/${id}`);
//       setCustomers(customers.filter(customer => customer._id !== id));
//       alert("Customer deleted successfully!");
//     } catch (error) {
//       console.error("Error deleting customer:", error);
//       alert("Failed to delete customer. Please try again.");
//     }
//   };

//   // Filter customers based on search term
//   const filteredCustomers = customers.filter(
//     (customer) =>
//       customer.customerCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       customer.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       customer.emailId?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   // Customer type options
//   const customerTypeOptions = [
//     { value: "Individual", label: "Individual" },
//     { value: "Business", label: "Business" },
//     { value: "Government", label: "Government" },
//   ];

//   // Render customer list view
//   const renderListView = () => (
//     <div className="p-6 bg-white rounded-lg shadow-lg">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold text-gray-800">Customer Management</h1>
//         <button
//           onClick={() => {
//             generateCustomerCode();
//             setView("form");
//           }}
//           className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg flex items-center"
//         >
//           <FaPlus className="mr-2" /> Create Customer
//         </button>
//       </div>

//       <div className="mb-6 relative">
//         <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
//           <input
//             type="text"
//             placeholder="Search customers..."
//             value={searchTerm}
//             onChange={(e) => setSearchTerm(e.target.value)}
//             className="py-2 px-4 w-full focus:outline-none"
//           />
//           <FaSearch className="text-gray-500 mx-4" />
//         </div>
//       </div>

//       {loading ? (
//         <p>Loading customers...</p>
//       ) : error ? (
//         <p className="text-red-500">{error}</p>
//       ) : (
//         <div className="overflow-x-auto">
//           <table className="min-w-full bg-white">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="py-3 px-4 text-left">Code</th>
//                 <th className="py-3 px-4 text-left">Name</th>
//                 <th className="py-3 px-4 text-left">Email</th>
//                 <th className="py-3 px-4 text-left">Phone</th>
//                 <th className="py-3 px-4 text-left">Group</th>
//                 <th className="py-3 px-4 text-left">Type</th>
//                 <th className="py-3 px-4 text-left">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {filteredCustomers.map((customer) => (
//                 <tr key={customer._id} className="border-b hover:bg-gray-50">
//                   <td className="py-3 px-4">{customer.customerCode}</td>
//                   <td className="py-3 px-4">{customer.customerName}</td>
//                   <td className="py-3 px-4">{customer.emailId}</td>
//                   <td className="py-3 px-4">{customer.mobileNumber}</td>
//                   <td className="py-3 px-4">{customer.customerGroup}</td>
//                   <td className="py-3 px-4">{customer.customerType}</td>
//                   <td className="py-3 px-4 flex space-x-2">
//                     <button
//                       onClick={() => handleEdit(customer)}
//                       className="text-blue-600 hover:text-blue-800"
//                     >
//                       <FaEdit />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(customer._id)}
//                       className="text-red-600 hover:text-red-800"
//                     >
//                       <FaTrash />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}
//     </div>
//   );

// // Render customer form view
// const renderFormView = () => (
//   <div className="p-8 bg-white rounded-lg shadow-lg max-w-5xl mx-auto">
//     <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">
//       {customerDetails._id ? "Edit Customer" : "Create Customer"}
//     </h1>

//     <form className="space-y-6" onSubmit={handleSubmit}>
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Customer Code
//           </label>
//           <input
//             type="text"
//             value={customerDetails.customerCode}
//             readOnly
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full bg-gray-100"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Customer Name <span className="text-red-500">*</span>
//           </label>
//           <input
//             type="text"
//             name="customerName"
//             value={customerDetails.customerName}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Customer Group <span className="text-red-500">*</span>
//           </label>
//           <GroupSearch
//             onSelectGroup={handleGroupSelect}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Customer Type <span className="text-red-500">*</span>
//           </label>
//           <select
//             name="customerType"
//             value={customerDetails.customerType}
//             onChange={handleChange}
//             required
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             <option value="">Select Type</option>
//             {customerTypeOptions.map((option) => (
//               <option key={option.value} value={option.value}>
//                 {option.label}
//               </option>
//             ))}
//           </select>
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Email ID <span className="text-red-500">*</span>
//           </label>
//           <input
//             type="email"
//             name="emailId"
//             value={customerDetails.emailId}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//             required
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Mobile Number
//           </label>
//           <input
//             type="text"
//             name="mobileNumber"
//             value={customerDetails.mobileNumber}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
//         <div className="border p-4 rounded-lg">
//           <h3 className="text-lg font-semibold mb-4">Billing Address</h3>
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Address Line 1 <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 name="billingAddress1"
//                 value={customerDetails.billingAddress1}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Address Line 2
//               </label>
//               <input
//                 type="text"
//                 name="billingAddress2"
//                 value={customerDetails.billingAddress2}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 City <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 name="billingCity"
//                 value={customerDetails.billingCity}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Country/State <span className="text-red-500">*</span>
//               </label>
//               <CountryStateSearch
//                 onSelectCountry={(country) =>
//                   setCustomerDetails(prev => ({
//                     ...prev,
//                     billingCountry: country.name
//                   }))
//                 }
//                 onSelectState={(state) =>
//                   setCustomerDetails(prev => ({
//                     ...prev,
//                     billingState: state.name
//                   }))
//                 }
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 ZIP Code <span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 name="billingZip"
//                 value={customerDetails.billingZip}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 required
//               />
//             </div>
//           </div>
//         </div>

//         <div className="border p-4 rounded-lg">
//           <h3 className="text-lg font-semibold mb-4">Shipping Address</h3>
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Address Line 1
//               </label>
//               <input
//                 type="text"
//                 name="shippingAddress1"
//                 value={customerDetails.shippingAddress1}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Address Line 2
//               </label>
//               <input
//                 type="text"
//                 name="shippingAddress2"
//                 value={customerDetails.shippingAddress2}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 City
//               </label>
//               <input
//                 type="text"
//                 name="shippingCity"
//                 value={customerDetails.shippingCity}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 Country/State
//               </label>
//               <CountryStateSearch
//                 onSelectCountry={(country) =>
//                   setCustomerDetails(prev => ({
//                     ...prev,
//                     shippingCountry: country.name
//                   }))
//                 }
//                 onSelectState={(state) =>
//                   setCustomerDetails(prev => ({
//                     ...prev,
//                     shippingState: state.name
//                   }))
//                 }
//               />
//             </div>

//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-2">
//                 ZIP Code
//               </label>
//               <input
//                 type="text"
//                 name="shippingZip"
//                 value={customerDetails.shippingZip}
//                 onChange={handleChange}
//                 className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>
//         </div>
//       </div>

//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Payment Terms
//           </label>
//           <input
//             type="text"
//             name="paymentTerms"
//             value={customerDetails.paymentTerms}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             GST Number
//           </label>
//           <input
//             type="text"
//             name="gstNumber"
//             value={customerDetails.gstNumber}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             GST Category
//           </label>
//           <input
//             type="text"
//             name="gstCategory"
//             value={customerDetails.gstCategory}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             PAN
//           </label>
//           <input
//             type="text"
//             name="pan"
//             value={customerDetails.pan}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Contact Person
//           </label>
//           <input
//             type="text"
//             name="contactPersonName"
//             value={customerDetails.contactPersonName}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             Commission Rate (%)
//           </label>
//           <input
//             type="number"
//             name="commissionRate"
//             value={customerDetails.commissionRate}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div className="md:col-span-2">
//           <label className="block text-sm font-medium text-gray-700 mb-2">
//             GL Account
//           </label>
//           <input
//             type="text"
//             name="glAccount"
//             value={customerDetails.glAccount}
//             onChange={handleChange}
//             className="border border-gray-300 rounded-lg px-4 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//         </div>
//       </div>

//       <div className="flex gap-3 mt-8">
//         <button
//           type="submit"
//           className={`px-6 py-3 text-white rounded-lg focus:outline-none ${
//             customerDetails._id ? "bg-blue-600" : "bg-green-600"
//           } hover:${customerDetails._id ? "bg-blue-700" : "bg-green-700"}`}
//         >
//           {customerDetails._id ? "Update Customer" : "Create Customer"}
//         </button>
//         <button
//           type="button"
//           onClick={resetForm}
//           className="bg-gray-600 text-white rounded-lg px-6 py-3 font-semibold hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   </div>
// );

//   return view === "list" ? renderListView() : renderFormView();
// }

// export default CustomerManagement;
