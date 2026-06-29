"use client";

import React, { useState, useEffect, useCallback } from "react";
import { FaPlus, FaEdit, FaTrash, FaSearch, FaCalendarCheck, FaDownload } from "react-icons/fa";
import axios from "axios";

const HolidayPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);

  // External API state
  const [countryCode, setCountryCode] = useState("US");
  const [isFetchingAPI, setIsFetchingAPI] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formHolidayType, setFormHolidayType] = useState("national");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");

  // Token
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ─── Fetch holidays from DB ─────────────────────────────────────────
  const fetchHolidays = useCallback(async () => {
    if (!token) {
      setError("Unauthorized: Token not found");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get("/api/ppc/holidays", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHolidays(response.data.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // ─── Fetch from external API (11holidays) ───────────────────────────
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
        const holidayPayload = {
          name: h.name || h.localName || "Holiday",
          date: h.date,
          description: h.description || h.name || h.localName || "",
          holidayType: "national",
        };
        try {
          await axios.post("/api/ppc/holidays", holidayPayload, {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (err) {
          // Ignore duplicate errors (backend already handles)
          console.warn(`Skipped duplicate holiday: ${holidayPayload.date}`);
        }
      }
      setSuccessMessage("Holidays fetched and saved successfully!");
      await fetchHolidays();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setIsFetchingAPI(false);
    }
  };

  // ─── Modal handlers ─────────────────────────────────────────────────
  const openModal = (holiday = null) => {
    setEditHoliday(holiday);
    if (holiday) {
      setFormName(holiday.name || "");
      setFormDate(holiday.date ? new Date(holiday.date).toISOString().split("T")[0] : "");
      setFormDescription(holiday.description || "");
      setFormHolidayType(holiday.holidayType || "national");
    } else {
      setFormName("");
      setFormDate("");
      setFormDescription("");
      setFormHolidayType("national");
    }
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditHoliday(null);
    setModalError(null);
  };

  // ─── Save (Create / Update) ─────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formName || !formDate || !formDescription) {
      setModalError("Name, Date, and Description are required.");
      return;
    }
    if (!token) {
      setModalError("Unauthorized: Token not found");
      return;
    }
    setSaving(true);
    setModalError(null);
    try {
      const payload = {
        name: formName,
        date: formDate,
        description: formDescription,
        holidayType: formHolidayType,
      };
      if (editHoliday) {
        const res = await axios.put(`/api/ppc/holidays/${editHoliday._id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage(res.data?.message || "Holiday updated successfully!");
      } else {
        const res = await axios.post("/api/ppc/holidays", payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuccessMessage(res.data?.message || "Holiday added successfully!");
      }
      await fetchHolidays();
      closeModal();
    } catch (err) {
      setModalError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────
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

  // ─── Client‑side search filter ──────────────────────────────────────
  const filteredHolidays = holidays.filter((h) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.name?.toLowerCase().includes(q) ||
      new Date(h.date).toLocaleDateString("en-IN").includes(q) ||
      h.holidayType?.toLowerCase().includes(q) ||
      h.description?.toLowerCase().includes(q)
    );
  });

  // ─── UI Helpers ─────────────────────────────────────────────────────
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}
      {req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  // ─── Mobile Card ────────────────────────────────────────────────────
  const HolidayCard = ({ holiday }) => (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-indigo-600">{holiday.name}</p>
          <p className="text-xs text-gray-500">
            {new Date(holiday.date).toLocaleDateString("en-IN")}
          </p>
        </div>
        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
          {holiday.holidayType}
        </span>
      </div>
      <p className="text-xs text-gray-500">{holiday.description}</p>
      <div className="flex gap-2 justify-end pt-1">
        <button
          onClick={() => openModal(holiday)}
          className="p-1.5 text-gray-300 hover:text-indigo-600"
          aria-label="Edit"
        >
          <FaEdit size={14} />
        </button>
        <button
          onClick={() => handleDelete(holiday._id)}
          className="p-1.5 text-gray-300 hover:text-red-500"
          aria-label="Delete"
        >
          <FaTrash size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaCalendarCheck className="text-indigo-600" /> Holiday Management
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Manage holidays and import from external calendars
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> Add Holiday
          </button>
        </div>

        {/* External API + Search */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* External API */}
            <div>
              <Lbl text="Import holidays from API" />
              <div className="flex gap-2 items-center flex-wrap sm:flex-nowrap">
                <input
                  type="text"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="e.g., US, IN"
                  className={`${inputClass} w-20`}
                />
                <button
                  onClick={fetchFromAPI}
                  disabled={isFetchingAPI}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 shadow-md transition-all disabled:opacity-50 whitespace-nowrap"
                >
                  <FaDownload size={12} /> {isFetchingAPI ? "Fetching..." : "Fetch & Save"}
                </button>
              </div>
              <p className="text-[9px] text-gray-400 mt-1.5">
                Uses 11holidays.com – duplicates are skipped automatically
              </p>
            </div>

            {/* Search */}
            <div>
              <Lbl text="Search" />
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  className={`${inputClass} pl-9`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, date, or type..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {successMessage}
          </div>
        )}

        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Type
                  </th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Description
                  </th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">
                      Loading...
                    </td>
                  </tr>
                ) : filteredHolidays.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-gray-400 italic">
                      No holidays found.
                    </td>
                  </tr>
                ) : (
                  filteredHolidays.map((holiday) => (
                    <tr key={holiday._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-indigo-600">
                        {holiday.name}
                      </td>
                      <td className="px-6 py-4 text-gray-800">
                        {new Date(holiday.date).toLocaleDateString("en-IN")}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {holiday.holidayType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 text-xs leading-5 max-w-[200px] truncate">
                        {holiday.description}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(holiday)}
                            className="p-1.5 text-gray-300 hover:text-indigo-600 transition-colors"
                          >
                            <FaEdit size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(holiday._id)}
                            className="p-1.5 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {loading ? (
            <p className="text-center text-gray-400 py-10">Loading...</p>
          ) : filteredHolidays.length === 0 ? (
            <p className="text-center text-gray-400 py-10">No holidays found.</p>
          ) : (
            filteredHolidays.map((holiday) => (
              <HolidayCard key={holiday._id} holiday={holiday} />
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaCalendarCheck size={20} />
              </div>
              <h2 className="text-lg font-black text-gray-900 tracking-tight">
                {editHoliday ? "Edit Holiday" : "Add Holiday"}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {modalError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {modalError}
                </div>
              )}

              <div>
                <Lbl text="Name" req />
                <input
                  type="text"
                  className={inputClass}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div>
                <Lbl text="Date" req />
                <input
                  type="date"
                  className={inputClass}
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <Lbl text="Description" req />
                <input
                  type="text"
                  className={inputClass}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div>
                <Lbl text="Type" />
                <select
                  className={inputClass}
                  value={formHolidayType}
                  onChange={(e) => setFormHolidayType(e.target.value)}
                >
                  <option value="national">National</option>
                  <option value="optional">Optional</option>
                  <option value="observance">Observance</option>
                </select>
              </div>

              <div className="flex justify-end items-center gap-3 pt-3 border-t border-gray-50">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HolidayPage;