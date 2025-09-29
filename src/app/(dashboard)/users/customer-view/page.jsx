// "use client";

// import React, { useEffect, useState } from "react";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import { FaEdit, FaTrash } from "react-icons/fa";

// function ViewUser() {
//   const router = useRouter();

//   const [customers, setCustomers] = useState([]);
//   const [searchTerm, setSearchTerm] = useState("");
//   const [error, setError] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const fetchCustomers = async () => {
//       try {
//         const response = await axios.get("/api/customers");
//         setCustomers(response.data || []);
//       } catch (err) {
//         console.error("Error fetching users:", err);
//         setError("Unable to fetch users. Please try again.");
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchCustomers();
//   }, []);

//   const handleEdit = (customer) => {

//     router.push(`/admin/createCustomers?id=${customer._id}`);
 
//     setIsEditing(true);
//   };

//   const handleDelete = async (id) => {
//     try {
//       await axios.delete(`/api/customers/${id}`);
//       setCustomers(customers.filter((c) => c._id !== id));
//     } catch (err) {
//       console.error("Delete failed:", err);
//       setError("Failed to delete user.");
//     }
//   };

//   const filteredCustomers = customers.filter((customer) =>
//     customer.customerName?.toLowerCase().includes(searchTerm.toLowerCase())
//   );

//   return (
//     <div className="min-h-screen flex justify-center items-start bg-gray-100 py-10">
//       <div className="w-full max-w-6xl p-8 bg-white rounded-lg shadow-lg">
//         <h1 className="text-3xl font-bold text-gray-800 mb-6">Customer List</h1>

//         {error && <p className="text-red-500 mb-4">{error}</p>}

//         {loading ? (
//           <p className="text-gray-600">Loading users...</p>
//         ) : (
//           <>
//             <input
//               type="text"
//               placeholder="Search customers..."
//               className="mb-4 p-2 border border-gray-300 rounded w-full"
//               value={searchTerm}
//               onChange={(e) => setSearchTerm(e.target.value)}
//             />

//             <table className="table-auto w-full text-left border-collapse border border-gray-300">
//               <thead>
//                 <tr className="bg-gray-200 text-gray-700">
//                   <th className="px-4 py-2 border border-gray-300">Customer Code</th>
//                   <th className="px-4 py-2 border border-gray-300">Customer Name</th>
//                   <th className="px-4 py-2 border border-gray-300">Email</th>
//                   <th className="px-4 py-2 border border-gray-300">Actions</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {filteredCustomers.map((customer) => (
//                   <tr key={customer._id} className="hover:bg-gray-50">
//                     <td className="px-4 py-2 border border-gray-300">{customer.customerCode}</td>
//                     <td className="px-4 py-2 border border-gray-300">{customer.customerName}</td>
//                     <td className="px-4 py-2 border border-gray-300">{customer.emailId}</td>
//                     <td className="px-4 py-2 border border-gray-300 flex gap-2">
//                       <button
//                         className="text-blue-500 hover:text-blue-700"
//                         onClick={() => handleEdit(customer)}
//                       >
//                         <FaEdit />
//                       </button>
//                       <button
//                         className="text-red-500 hover:text-red-700"
//                         onClick={() => handleDelete(customer._id)}
//                       >
//                         <FaTrash />
//                       </button>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default ViewUser;


"use client";

import React from "react";
import { Suspense } from "react";
import CustomerManagement from "@/components/sampleofcurd";
import { useSearchParams } from "next/navigation";




function CreateCustomersFormWrapper() {
  return (
<Suspense fallback={<div className="text-center py-10">Loading form data...</div>}>
      <CreateCustomersPage />
    </Suspense>
  );
}

 function CreateCustomersPage() {
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id");

  return (
    <div>
      <CustomerManagement customerId={customerId} />
    </div>
  );
}

export default CreateCustomersFormWrapper;