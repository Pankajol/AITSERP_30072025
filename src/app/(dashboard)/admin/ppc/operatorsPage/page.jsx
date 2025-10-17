"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import Select from "react-select";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const OperatorPage = () => {
  const [operators, setOperators] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentOperator, setCurrentOperator] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // ✅ Generate Operator Code Automatically
  const generateOperatorCode = (count) => {
    const nextNum = count + 1;
    return `OPR${String(nextNum).padStart(3, "0")}`; // OPR001, OPR002...
  };

  // ✅ Fetch Operators
  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Authentication token missing.");

      const res = await fetch(`/api/ppc/operators?searchQuery=${searchQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch operators");

      const data = await res.json();
      setOperators(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  // ✅ Fetch Employees
  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("/api/company/users", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rawUsers = Array.isArray(res.data.data)
        ? res.data.data
        : res.data;

      const employeeOptions = rawUsers
        .filter((u) => u.roles?.includes("Employee"))
        .map((emp) => ({
          value: emp._id,
          label: emp.name || `${emp.firstName} ${emp.lastName}`,
          code: emp.code || emp.employeeCode || "",
        }));

      setEmployees(employeeOptions);
    } catch (err) {
      console.error("Error fetching employees:", err);
      toast.error("Failed to load employees.");
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    fetchOperators();
    fetchEmployees();
  }, [fetchOperators]);

  // ✅ Search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchOperators();
  };

  // ✅ Open Modal
  const openModal = (operator = null) => {
    setCurrentOperator(
      operator
        ? { ...operator }
        : { employeeId: "", operatorCode: "", name: "", cost: "" }
    );
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentOperator(null);
    setModalError(null);
  };

  // ✅ Input Handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentOperator((prev) => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (selectedOption) => {
    if (!selectedOption) {
      setCurrentOperator((prev) => ({
        ...prev,
        employeeId: "",
        name: "",
      }));
      return;
    }
    setCurrentOperator((prev) => ({
      ...prev,
      employeeId: selectedOption.value,
      name: selectedOption.label,
    }));
  };

  // ✅ Save (POST or PUT)
  const handleSave = async () => {
    const token = localStorage.getItem("token");
    if (!token) return setModalError("Authentication token not found.");

    setIsSaving(true);
    setModalError(null);

    try {
      let payload = { ...currentOperator };

      // Generate unique operatorCode if missing
      if (!payload.operatorCode) {
        payload.operatorCode = generateOperatorCode(operators.length);
      }

      const method = payload._id ? "PUT" : "POST";
      const url = payload._id
        ? `/api/ppc/operators/${payload._id}`
        : "/api/ppc/operators";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to save operator");
      }

      await fetchOperators();
      closeModal();
      toast.success("✅ Operator saved successfully!");
    } catch (err) {
      setModalError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Delete
  const handleDelete = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return setError("Authentication token missing.");

    if (window.confirm("Are you sure you want to delete this operator?")) {
      try {
        const res = await fetch(`/api/ppc/operators/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to delete operator");
        await fetchOperators();
        toast.success("🗑️ Operator deleted successfully!");
      } catch (err) {
        setError(err.message);
      }
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Operator Management
      </h1>

      {/* Search + Add */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex justify-between items-center">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or code..."
            className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Search
          </button>
        </form>

        <button
          onClick={() => openModal()}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
        >
          <Plus size={18} /> Add Operator
        </button>
      </div>

      {/* Table */}
      {isLoading ? (
        <p className="text-center">Loading...</p>
      ) : error ? (
        <div className="text-red-600 text-center">{error}</div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Operator Code</th>
                <th className="p-4">Name</th>
                <th className="p-4">Cost/Hour</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {operators.map((op) => (
                <tr key={op._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{op.operatorCode}</td>
                  <td className="p-4">{op.name}</td>
                  <td className="p-4">{`$${op.cost}`}</td>
                  <td className="p-4 flex gap-3">
                    <button
                      onClick={() => openModal(op)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(op._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {currentOperator?._id ? "Edit Operator" : "Add Operator"}
            </h2>

            {modalError && (
              <div className="bg-red-100 text-red-700 p-2 rounded mb-3">
                {modalError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm font-medium">
                  Select Employee
                </label>
                <Select
                  options={employees}
                  value={
                    employees.find(
                      (emp) => emp.value === currentOperator?.employeeId
                    ) || null
                  }
                  onChange={handleEmployeeSelect}
                  isClearable
                  isLoading={loadingEmployees}
                  placeholder="Search employee..."
                />
              </div>

              <input
                name="operatorCode"
                type="text"
                placeholder="Operator Code"
                value={currentOperator?.operatorCode || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />

              <input
                name="name"
                type="text"
                placeholder="Name"
                value={currentOperator?.name || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />

              <input
                name="cost"
                type="number"
                placeholder="Cost per Hour"
                value={currentOperator?.cost || ""}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorPage;



// "use client";
// import React, { useState, useEffect, useCallback } from "react";
// import { Plus, Edit, Trash2 } from "lucide-react";
// import Select from "react-select";
// import axios from "axios";
// import { toast } from "react-toastify";

// const OperatorPage = () => {
//   const [operators, setOperators] = useState([]);
//   const [employees, setEmployees] = useState([]);
//   const [loadingEmployees, setLoadingEmployees] = useState(true);

//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentOperator, setCurrentOperator] = useState(null);
//   const [searchQuery, setSearchQuery] = useState("");
//   const [isSaving, setIsSaving] = useState(false);
//   const [modalError, setModalError] = useState(null);

//   // ✅ Fetch Operators
//   const fetchOperators = useCallback(async () => {
//     setIsLoading(true);
//     setError(null);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Authentication token missing.");

//       const res = await fetch(`/api/ppc/operators?searchQuery=${searchQuery}`, {
//         headers: { Authorization: `Bearer ${token}` },
//       });
//       if (!res.ok) throw new Error("Failed to fetch operators");

//       const data = await res.json();
//       setOperators(data.data || []);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [searchQuery]);

//   // ✅ Fetch Employees (for dropdown)
//   const fetchEmployees = async () => {
//     setLoadingEmployees(true);
//     try {
//       const token = localStorage.getItem("token");
//       if (!token) throw new Error("Authentication token missing.");

//       const res = await axios.get("/api/company/users", {
//         headers: { Authorization: `Bearer ${token}` },
//       });

//       const rawUsers = Array.isArray(res.data.data)
//         ? res.data.data
//         : res.data;

//       const employeeOptions = rawUsers
//         .filter((u) => u.roles?.includes("Employee"))
//         .map((emp) => ({
//           value: emp._id,
//           label: emp.name || `${emp.firstName} ${emp.lastName}` || "Unnamed",
//           code: emp.code || emp.employeeCode || "", // optional field mapping
//         }));

//       setEmployees(employeeOptions);
//     } catch (err) {
//       console.error("Error fetching employees:", err);
//       toast.error("Failed to load employees.");
//     } finally {
//       setLoadingEmployees(false);
//     }
//   };

//   useEffect(() => {
//     fetchOperators();
//     fetchEmployees();
//   }, [fetchOperators]);

//   const handleSearch = (e) => {
//     e.preventDefault();
//     fetchOperators();
//   };

//   const openModal = (operator = null) => {
//     setCurrentOperator(
//       operator
//         ? { ...operator }
//         : { employeeId: "", code: "", name: "", cost: "" }
//     );
//     setModalError(null);
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setCurrentOperator(null);
//     setModalError(null);
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentOperator((prev) => ({ ...prev, [name]: value }));
//   };

//   // ✅ When employee selected
//   const handleEmployeeSelect = (selectedOption) => {
//     if (!selectedOption) {
//       setCurrentOperator((prev) => ({
//         ...prev,
//         employeeId: "",
//         code: "",
//         name: "",
//       }));
//       return;
//     }
//     setCurrentOperator((prev) => ({
//       ...prev,
//       employeeId: selectedOption.value,
//       name: selectedOption.label,
//       code: selectedOption.code || "",
//     }));
//   };

//   const handleSave = async () => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setModalError("Authentication token not found. Please log in again.");
//       return;
//     }

//     setIsSaving(true);
//     setModalError(null);
//     const method = currentOperator._id ? "PUT" : "POST";
//     const url = currentOperator._id
//       ? `/api/ppc/operators/${currentOperator._id}`
//       : "/api/ppc/operators";

//     try {
//       const res = await fetch(url, {
//         method,
//         headers: {
//           "Content-Type": "application/json",
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(currentOperator),
//       });

//       if (!res.ok) {
//         const errData = await res.json();
//         throw new Error(errData.message || "Failed to save operator");
//       }

//       await fetchOperators();
//       closeModal();
//       toast.success("Operator saved successfully!");
//     } catch (err) {
//       setModalError(err.message);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setError("Authentication token missing.");
//       return;
//     }

//     if (window.confirm("Are you sure you want to delete this operator?")) {
//       try {
//         const res = await fetch(`/api/ppc/operators/${id}`, {
//           method: "DELETE",
//           headers: { Authorization: `Bearer ${token}` },
//         });

//         if (!res.ok) throw new Error("Failed to delete operator");

//         await fetchOperators();
//         toast.success("Operator deleted successfully!");
//       } catch (err) {
//         setError(err.message);
//       }
//     }
//   };

//   return (
//     <div className="p-8 font-sans bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">
//         Operator Management
//       </h1>

//       {/* Search and Add */}
//       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//         <div className="flex justify-between items-center">
//           <form onSubmit={handleSearch} className="flex gap-2">
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search by name or code..."
//               className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
//             />
//             <button
//               type="submit"
//               className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
//             >
//               Search
//             </button>
//           </form>

//           <button
//             onClick={() => openModal()}
//             className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
//           >
//             <Plus size={18} />
//             Add Operator
//           </button>
//         </div>
//       </div>

//       {/* Operator Table */}
//       {isLoading ? (
//         <p className="text-center">Loading...</p>
//       ) : error ? (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
//           {error}
//         </div>
//       ) : (
//         <div className="bg-white rounded-lg shadow-md overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-4">Code</th>
//                 <th className="p-4">Name</th>
//                 <th className="p-4">Cost/Hour</th>
//                 <th className="p-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {operators.map((op) => (
//                 <tr key={op._id} className="border-b hover:bg-gray-50">
//                   <td className="p-4">{op.code}</td>
//                   <td className="p-4">{op.name}</td>
//                   <td className="p-4">{`$${op.cost}`}</td>
//                   <td className="p-4 flex gap-2">
//                     <button
//                       onClick={() => openModal(op)}
//                       className="text-blue-500 hover:text-blue-700"
//                     >
//                       <Edit size={18} />
//                     </button>
//                     <button
//                       onClick={() => handleDelete(op._id)}
//                       className="text-red-500 hover:text-red-700"
//                     >
//                       <Trash2 size={18} />
//                     </button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
//             <h2 className="text-2xl font-bold mb-4">
//               {currentOperator?._id ? "Edit Operator" : "Add Operator"}
//             </h2>

//             {modalError && (
//               <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
//                 {modalError}
//               </div>
//             )}

//             <div className="space-y-4">
//               {/* ✅ Searchable Employee Select */}
//               <div>
//                 <label className="block mb-1 text-sm font-medium">
//                   Select Employee
//                 </label>
//                 <Select
//                   options={employees}
//                   value={
//                     employees.find(
//                       (emp) => emp.value === currentOperator?.employeeId
//                     ) || null
//                   }
//                   onChange={handleEmployeeSelect}
//                   isClearable
//                   isLoading={loadingEmployees}
//                   placeholder="Search and select employee..."
//                 />
//               </div>

//               <input
//                 name="code"
//                 type="text"
//                 placeholder="Code"
//                 value={currentOperator?.code || ""}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />

//               <input
//                 name="name"
//                 type="text"
//                 placeholder="Name"
//                 value={currentOperator?.name || ""}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />

//               <input
//                 name="cost"
//                 type="number"
//                 placeholder="Cost per Hour"
//                 value={currentOperator?.cost || ""}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />
//             </div>

//             <div className="mt-6 flex justify-end gap-4">
//               <button
//                 onClick={closeModal}
//                 className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
//                 disabled={isSaving}
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleSave}
//                 className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
//                 disabled={isSaving}
//               >
//                 {isSaving ? "Saving..." : "Save"}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OperatorPage;




// "use client";
// import React, { useState, useEffect, useCallback } from 'react';
// import { Plus, Edit, Trash2 } from 'lucide-react';

// const OperatorPage = () => {
//   const [operators, setOperators] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null); // For fetch/delete errors
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentOperator, setCurrentOperator] = useState(null);
//   const [searchQuery, setSearchQuery] = useState('');
  
//   // New state for modal actions
//   const [isSaving, setIsSaving] = useState(false);
//   const [modalError, setModalError] = useState(null);

//   const fetchOperators = useCallback(async () => {
//     setIsLoading(true);
//     setError(null); // Clear previous errors
//     try {
//         const token = localStorage.getItem('token');
//         if (!token) {
//             setError('Authentication token not found. Please log in again.');
//             setIsLoading(false);
//             return;
//         }
//       const response = await fetch(`/api/ppc/operators?searchQuery=${searchQuery}`, {
//         headers: { 'Authorization': `Bearer ${token}` }
//       });
//       if (!response.ok) throw new Error('Failed to fetch operators');
//       const data = await response.json();
//       setOperators(data.data || []);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [searchQuery]);

//   useEffect(() => {
//     fetchOperators();
//   }, [fetchOperators]);
  
//   const handleSearch = (e) => {
//     e.preventDefault();
//     fetchOperators();
//   };

//   const openModal = (operator = null) => {
//     setCurrentOperator(operator ? { ...operator } : { code: '', name: '', cost: '' });
//     setModalError(null); // Clear previous modal errors
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setCurrentOperator(null);
//     setModalError(null);
//   };
  
//   // Consolidated input change handler
//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentOperator(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async () => {
//     const token = localStorage.getItem('token'); // Adjust as needed for your auth
//       if (!token) {
//         setModalError('Authentication token not found. Please log in again.');
//         return;
//       }
      
//     setIsSaving(true);
//     setModalError(null);
//     const method = currentOperator._id ? 'PUT' : 'POST';
//     const url = currentOperator._id ? `/api/ppc/operators/${currentOperator._id}` : '/api/ppc/operators';

//     try {
//       const response = await fetch(url, {
//         method,
//         headers: { 
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(currentOperator),
//       });
//       if (!response.ok) {
//         const errData = await response.json();
//         throw new Error(errData.message || 'Failed to save operator');
//       }
//       await fetchOperators();
//       closeModal();
//     } catch (err) {
//       setModalError(err.message);
//     } finally {
//         setIsSaving(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     const token = localStorage.getItem('token');
//     if (!token) {
//         setError('Authentication token not found. Please log in again.');
//         return;
//     }

//     if (window.confirm('Are you sure you want to delete this operator?')) {
//       try {
//         const response = await fetch(`/api/ppc/operators/${id}`, { 
//             method: 'DELETE',
//             headers: { 'Authorization': `Bearer ${token}` }
//         });
//         if (!response.ok) {
//            const errData = await response.json();
//            throw new Error(errData.message || 'Failed to delete operator');
//         }
//         await fetchOperators();
//       } catch (err) {
//         setError(err.message); // Show delete error on the main page
//       }
//     }
//   };

//   return (
//     <div className="p-8 font-sans bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">Operator Management</h1>
      
//       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//         <div className="flex justify-between items-center">
//           <form onSubmit={handleSearch} className="flex gap-2">
//             <input
//               type="text"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               placeholder="Search by name or code..."
//               className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
//             />
//              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
//               Search
//             </button>
//           </form>
//           <button onClick={() => openModal()} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2">
//             <Plus size={18} />
//             Add Operator
//           </button>
//         </div>
//       </div>

//       {isLoading && <p className="text-center">Loading...</p>}
//       {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{error}</div>}
      
//       {!isLoading && !error && (
//         <div className="bg-white rounded-lg shadow-md overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-4">Code</th>
//                 <th className="p-4">Name</th>
//                 <th className="p-4">Cost per Hour</th>
//                 <th className="p-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {operators.map((operator) => (
//                 <tr key={operator._id} className="border-b hover:bg-gray-50">
//                   <td className="p-4">{operator.code}</td>
//                   <td className="p-4">{operator.name}</td>
//                   <td className="p-4">{`$${operator.cost}`}</td>
//                   <td className="p-4 flex gap-2">
//                     <button onClick={() => openModal(operator)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
//                     <button onClick={() => handleDelete(operator._id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       )}

//       {isModalOpen && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//           <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
//             <h2 className="text-2xl font-bold mb-4">{currentOperator?._id ? 'Edit Operator' : 'Add Operator'}</h2>
            
//             {modalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">{modalError}</div>}

//             <div className="space-y-4">
//               <input name="code" type="text" placeholder="Code" value={currentOperator.code} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
//               <input name="name" type="text" placeholder="Name" value={currentOperator.name} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
//               <input name="cost" type="number" placeholder="Cost per Hour" value={currentOperator.cost} onChange={handleInputChange} className="w-full p-2 border rounded-md" />
//             </div>
//             <div className="mt-6 flex justify-end gap-4">
//               <button onClick={closeModal} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400" disabled={isSaving}>Cancel</button>
//               <button onClick={handleSave} className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300" disabled={isSaving}>
//                 {isSaving ? 'Saving...' : 'Save'}
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default OperatorPage;

