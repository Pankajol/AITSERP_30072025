"use client";
import React, { useState } from "react";
import axios from "axios";
import { FiUpload, FiFile, FiCheck } from "react-icons/fi";

export default function VoterImportPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]); // parsed rows
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");
    // CSV पार्स करें (Papa Parse का उपयोग करें, लेकिन यहाँ सादा JS से करते हैं)
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const rows = text.split("\n").filter(line => line.trim());
      if (rows.length === 0) return setError("Empty file");
      const headers = rows[0].split(",").map(h => h.trim().toLowerCase());
      const required = ["firstname", "booth"]; // minimum required fields
      const missing = required.filter(f => !headers.includes(f));
      if (missing.length > 0) return setError(`Missing columns: ${missing.join(", ")}`);
      
      const data = rows.slice(1).map((line, idx) => {
        const values = line.split(",").map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i] || "";
        });
        obj.rowNum = idx + 1;
        return obj;
      }).filter(obj => obj.firstname && obj.booth);
      
      setPreview(data);
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = async () => {
    if (!preview.length) return setError("No valid rows to import");
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post("/api/election/voter/import", { voters: preview }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setSuccessCount(data.count);
        setFile(null);
        setPreview([]);
      } else {
        setError(data.message || "Import failed");
      }
    } catch (e) {
      setError(e.response?.data?.message || "Error importing voters");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Import Voters from CSV</h1>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}
        {successCount > 0 && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl mb-4 text-sm">
            Successfully imported {successCount} voters!
          </div>
        )}

        <div className="mb-4">
          <label className="text-xs font-bold uppercase text-gray-500 mb-1.5 block">CSV File *</label>
          <div className="relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer hover:border-indigo-300">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            {file ? (
              <div className="flex items-center justify-center gap-2">
                <FiFile className="text-indigo-500" />
                <span className="font-semibold text-gray-700">{file.name}</span>
              </div>
            ) : (
              <div>
                <FiUpload className="mx-auto text-3xl text-gray-300 mb-2" />
                <p className="text-sm font-semibold text-gray-500">Click to select a CSV file</p>
                <p className="text-xs text-gray-400 mt-1">Columns: firstName, lastName, voterId, phone, booth, supportLevel, etc.</p>
              </div>
            )}
          </div>
        </div>

        {preview.length > 0 && (
          <>
            <div className="max-h-60 overflow-y-auto border rounded-xl mb-4">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {Object.keys(preview[0]).filter(k => k !== "rowNum").map(key => (
                      <th key={key} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400">{key}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b">
                      {Object.entries(row).filter(([k]) => k !== "rowNum").map(([key, val]) => (
                        <td key={key} className="px-3 py-2 text-xs text-gray-700">{val}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FiCheck /> {loading ? "Importing..." : `Import ${preview.length} Voters`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}