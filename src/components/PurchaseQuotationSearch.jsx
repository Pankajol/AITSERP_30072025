"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaSearch, FaTimes } from "react-icons/fa";

const PurchaseQuotationSearch = ({ onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const delay = setTimeout(() => {
      if (query.trim()) searchQuotations(query);
      else setResults([]);
    }, 300);
    return () => clearTimeout(delay);
  }, [query]);

  const searchQuotations = async (searchQuery) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`/api/purchase-quotation?search=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setResults(res.data.data);
        setShowDropdown(true);
      } else setResults([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (pq) => {
    setQuery(pq.documentNumber);
    setShowDropdown(false);
    if (onSelect) onSelect(pq);
  };

  const handleClear = () => {
    setQuery("");
    if (onSelect) onSelect(null);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 text-xs" />
        <input
          type="text"
          placeholder="Search by PQ number..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowDropdown(true)}
          className="w-full pl-8 pr-8 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none"
        />
        {query && (
          <button onClick={handleClear} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500">
            <FaTimes className="text-xs" />
          </button>
        )}
      </div>
      {showDropdown && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {loading && <div className="p-3 text-center text-gray-400">Searching...</div>}
          {!loading && results.length === 0 && query && <div className="p-3 text-center text-gray-400">No quotations found</div>}
          {results.map(pq => (
            <div key={pq._id} onClick={() => handleSelect(pq)} className="p-3 hover:bg-indigo-50 cursor-pointer border-b border-gray-100 last:border-0">
              <div className="font-semibold text-gray-800">{pq.documentNumber}</div>
              <div className="text-xs text-gray-500">{pq.supplierName}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PurchaseQuotationSearch;