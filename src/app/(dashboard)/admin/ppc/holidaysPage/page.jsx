"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Plus, Edit, Trash2, Download } from "lucide-react";
import axios from "axios";

const HolidayPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentHoliday, setCurrentHoliday] = useState(null);

  const [countryCode, setCountryCode] = useState("US");
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState(null);
  const [isFetchingAPI, setIsFetchingAPI] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Fetch holidays from DB
  const fetchHolidays = useCallback(async () => {
    if (!token) {
      setError("Unauthorized: Token not found");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get("/api/ppc/holidays", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHolidays(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  // Fetch from external API and save to DB
const fetchFromAPI = async () => {
  if (!token) {
    setError("Unauthorized: Token not found");
    return;
  }

  setIsFetchingAPI(true);
  setError(null);
  setSuccessMessage(null);

  try {
    const year = new Date().getFullYear();
    const apiRes = await axios.get(
      `https://api.11holidays.com/v1/holidays?country=${countryCode}&year=${year}`
    );

    const holidaysFromAPI = apiRes.data || [];

    for (const h of holidaysFromAPI) {
      // Prepare payload
      const holidayPayload = {
        name: h.name || h.localName || "Holiday",
        date: h.date,
        description: h.description || h.name || h.localName || "",
        holidayType: "national"
      };

      try {
        // Attempt to insert into DB, backend handles duplicates
        await axios.post("/api/ppc/holidays", holidayPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        // Ignore duplicate key errors (backend already handles this)
        console.warn(`Skipped duplicate holiday: ${holidayPayload.date}`);
      }
    }

    setSuccessMessage("Holidays fetched and saved successfully!");
    await fetchHolidays(); // Refresh the list
  } catch (err) {
    setError(err.response?.data?.message || err.message);
  } finally {
    setIsFetchingAPI(false);
  }
};


  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  const openModal = (holiday = null) => {
    const holidayDate = holiday?.date ? new Date(holiday.date).toISOString().split("T")[0] : "";
    setCurrentHoliday(
      holiday
        ? { ...holiday, date: holidayDate }
        : { name: "", date: "", description: "", holidayType: "national" }
    );
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentHoliday(null);
    setModalError(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentHoliday((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!currentHoliday.name || !currentHoliday.date || !currentHoliday.description) {
      setModalError("Name, Date, and Description are required.");
      return;
    }

    if (!token) {
      setModalError("Unauthorized: Token not found");
      return;
    }

    setIsSaving(true);
    setModalError(null);

    try {
      if (currentHoliday._id) {
        // Update existing holiday
        const res = await axios.put(
          `/api/ppc/holidays/${currentHoliday._id}`,
          currentHoliday,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setSuccessMessage(res.data?.message || "Holiday updated successfully!");
      } else {
        // Create new holiday
        const res = await axios.post("/api/ppc/holidays", currentHoliday, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage(res.data?.message || "Holiday added successfully!");
      }

      await fetchHolidays();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!token) {
      setError("Unauthorized: Token not found");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this holiday?")) return;

    try {
      await axios.delete(`/api/ppc/holidays/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage("Holiday deleted successfully!");
      fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    }
  };

  return (
    <div className="p-8 font-sans bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Holiday Management</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 items-center">
          <label htmlFor="country" className="text-sm font-medium">Country</label>
          <input
            id="country"
            type="text"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="border p-2 rounded-md"
          />
          <button
            onClick={fetchFromAPI}
            disabled={isFetchingAPI}
            className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center gap-2"
          >
            <Download size={16} /> {isFetchingAPI ? "Fetching..." : "Fetch & Save"}
          </button>
        </div>

        <button
          onClick={() => openModal()}
          className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2"
        >
          <Plus size={18} /> Add Holiday
        </button>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      {successMessage && <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">{successMessage}</div>}

      {isLoading ? (
        <p className="text-center">Loading...</p>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4">Name</th>
                <th className="p-4">Date</th>
                <th className="p-4">Type</th>
                <th className="p-4">Description</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {holidays.map((holiday) => (
                <tr key={holiday._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{holiday.name}</td>
                  <td className="p-4">{new Date(holiday.date).toLocaleDateString("en-in")}</td>
                  <td className="p-4">{holiday.holidayType}</td>
                  <td className="p-4">{holiday.description}</td>
                  <td className="p-4 flex gap-2">
                    <button onClick={() => openModal(holiday)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
                    <button onClick={() => handleDelete(holiday._id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg relative">
            <h2 className="text-xl font-bold mb-4">{currentHoliday._id ? "Edit Holiday" : "Add Holiday"}</h2>
            {modalError && <p className="text-red-500 mb-2">{modalError}</p>}

            <div className="flex flex-col gap-3">
              <input
                type="text"
                name="name"
                placeholder="Holiday Name"
                value={currentHoliday.name}
                onChange={handleInputChange}
                className="border p-2 rounded"
              />
              <input
                type="date"
                name="date"
                value={currentHoliday.date}
                onChange={handleInputChange}
                className="border p-2 rounded"
              />
              <input
                type="text"
                name="description"
                placeholder="Description"
                value={currentHoliday.description}
                onChange={handleInputChange}
                className="border p-2 rounded"
              />
              <select
                name="holidayType"
                value={currentHoliday.holidayType}
                onChange={handleInputChange}
                className="border p-2 rounded"
              >
                <option value="national">National</option>
                <option value="optional">Optional</option>
                <option value="observance">Observance</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
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

export default HolidayPage;









// "use client";

// import React, { useState, useEffect, useCallback } from 'react';
// import { Plus, Edit, Trash2 } from 'lucide-react';

// const HolidayPage = () => {
//   const [holidays, setHolidays] = useState([]);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [currentHoliday, setCurrentHoliday] = useState(null);

//   const [startDate, setStartDate] = useState('');
//   const [endDate, setEndDate] = useState('');

//   const [isSaving, setIsSaving] = useState(false);
//   const [modalError, setModalError] = useState(null);

//   // Get token from localStorage
//   const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

//   // Fetch holidays
//   const fetchHolidays = useCallback(async () => {
//     if (!token) {
//       setError("Unauthorized: Token not found");
//       return;
//     }

//     setIsLoading(true);
//     setError(null);
//     try {
//       const query = new URLSearchParams({
//         ...(startDate && { startDate }),
//         ...(endDate && { endDate }),
//       }).toString();

//       const response = await fetch(`/api/ppc/holidays?${query}`, {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       });

//       if (!response.ok) throw new Error('Failed to fetch holidays');
//       const data = await response.json();
//       setHolidays(data.data || []);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [startDate, endDate, token]);

//   useEffect(() => {
//     const year = new Date().getFullYear();
//     setStartDate(`${year}-01-01`);
//     setEndDate(`${year}-12-31`);
//   }, []);

//   useEffect(() => {
//     if (startDate && endDate) fetchHolidays();
//   }, [fetchHolidays, startDate, endDate]);

//   const handleSearch = (e) => {
//     e.preventDefault();
//     fetchHolidays();
//   };

//   const openModal = (holiday = null) => {
//     const holidayDate = holiday?.date ? new Date(holiday.date).toISOString().split('T')[0] : '';
//     setCurrentHoliday(
//       holiday
//         ? { ...holiday, date: holidayDate }
//         : { name: '', date: '', description: '', holidayType: 'national' }
//     );
//     setModalError(null);
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setCurrentHoliday(null);
//     setModalError(null);
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setCurrentHoliday(prev => ({ ...prev, [name]: value }));
//   };

//   const handleSave = async () => {
//     if (!currentHoliday.name || !currentHoliday.date || !currentHoliday.description) {
//       setModalError("Name, Date, and Description are required.");
//       return;
//     }

//     if (!token) {
//       setModalError("Unauthorized: Token not found");
//       return;
//     }

//     setIsSaving(true);
//     setModalError(null);

//     const method = currentHoliday._id ? 'PUT' : 'POST';
//     const url = currentHoliday._id ? `/api/ppc/holidays/${currentHoliday._id}` : '/api/ppc/holidays';

//     try {
//       const response = await fetch(url, {
//         method,
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${token}`,
//         },
//         body: JSON.stringify(currentHoliday),
//       });
//       if (!response.ok) {
//         const errData = await response.json();
//         throw new Error(errData.message || 'Failed to save holiday');
//       }
//       await fetchHolidays();
//       closeModal();
//     } catch (err) {
//       setModalError(err.message);
//     } finally {
//       setIsSaving(false);
//     }
//   };

//   const handleDelete = async (id) => {
//     if (!token) {
//       setError("Unauthorized: Token not found");
//       return;
//     }

//     if (window.confirm('Are you sure you want to delete this holiday?')) {
//       try {
//         const response = await fetch(`/api/ppc/holidays/${id}`, {
//           method: 'DELETE',
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         if (!response.ok) {
//           const errData = await response.json();
//           throw new Error(errData.message || 'Failed to delete holiday');
//         }
//         await fetchHolidays();
//       } catch (err) {
//         setError(err.message);
//       }
//     }
//   };

//   return (
//     <div className="p-8 font-sans bg-gray-50 min-h-screen">
//       <h1 className="text-3xl font-bold text-gray-800 mb-6">Holiday Management</h1>

//       <div className="bg-white p-6 rounded-lg shadow-md mb-6">
//         <div className="flex justify-between items-center">
//           <form onSubmit={handleSearch} className="flex items-center gap-4">
//             <div>
//               <label htmlFor="startDate" className="text-sm font-medium text-gray-700 mr-2">From</label>
//               <input
//                 id="startDate"
//                 type="date"
//                 value={startDate}
//                 onChange={(e) => setStartDate(e.target.value)}
//                 className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
//               />
//             </div>
//             <div>
//               <label htmlFor="endDate" className="text-sm font-medium text-gray-700 mr-2">To</label>
//               <input
//                 id="endDate"
//                 type="date"
//                 value={endDate}
//                 onChange={(e) => setEndDate(e.target.value)}
//                 className="border p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
//               />
//             </div>
//             <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 self-end">
//               Search
//             </button>
//           </form>
//           <button onClick={() => openModal()} className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 flex items-center gap-2 self-end">
//             <Plus size={18} />
//             Add Holiday
//           </button>
//         </div>
//       </div>

//       {isLoading && <p className="text-center">Loading...</p>}
//       {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}

//       {!isLoading && !error && (
//         <div className="bg-white rounded-lg shadow-md overflow-x-auto">
//           <table className="w-full text-left">
//             <thead className="bg-gray-100">
//               <tr>
//                 <th className="p-4">Name</th>
//                 <th className="p-4">Date</th>
//                 <th className="p-4">Type</th>
//                 <th className="p-4">Description</th>
//                 <th className="p-4">Actions</th>
//               </tr>
//             </thead>
//             <tbody>
//               {holidays.map((holiday) => (
//                 <tr key={holiday._id} className="border-b hover:bg-gray-50">
//                   <td className="p-4">{holiday.name}</td>
//                   <td className="p-4">{new Date(holiday.date).toLocaleDateString()}</td>
//                   <td className="p-4">{holiday.holidayType}</td>
//                   <td className="p-4">{holiday.description}</td>
//                   <td className="p-4 flex gap-2">
//                     <button onClick={() => openModal(holiday)} className="text-blue-500 hover:text-blue-700"><Edit size={18} /></button>
//                     <button onClick={() => handleDelete(holiday._id)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>
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
//             <h2 className="text-2xl font-bold mb-4">{currentHoliday?._id ? 'Edit Holiday' : 'Add Holiday'}</h2>

//             {modalError && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{modalError}</div>}

//             <div className="space-y-4">
//               <input
//                 name="name"
//                 type="text"
//                 placeholder="Holiday Name"
//                 value={currentHoliday.name}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />
//               <input
//                 name="date"
//                 type="date"
//                 value={currentHoliday.date}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />
//               <select
//                 name="holidayType"
//                 value={currentHoliday.holidayType}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md bg-white"
//               >
//                 <option value="national">National</option>
//                 <option value="regional">Regional</option>
//                 <option value="company">Company</option>
//               </select>
//               <input
//                 name="description"
//                 type="text"
//                 placeholder="Description"
//                 value={currentHoliday.description || ''}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded-md"
//               />
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

// export default HolidayPage;
