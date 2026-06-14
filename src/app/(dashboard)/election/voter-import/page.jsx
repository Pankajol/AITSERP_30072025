"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { FiUpload, FiFile, FiCheck } from "react-icons/fi";

export default function VoterImportPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successCount, setSuccessCount] = useState(0);
  const [assigned, setAssigned] = useState({
    constituencyId: null,
    blockId: null,
    wardId: null,
    boothIds: [],
    isRestricted: false,
  });
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // Decode JWT to get assigned areas
  useEffect(() => {
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const constituency = payload.assignedConstituency;
      const block = payload.assignedBlock;
      const ward = payload.assignedWard;
      const booths = payload.assignedBooths || [];

      setAssigned({
        constituencyId: constituency?._id || null,
        blockId: block?._id || null,
        wardId: ward?._id || null,
        boothIds: booths.map(b => b._id),
        isRestricted: !!(constituency || block || ward || booths.length),
      });
    } catch (err) {
      console.error("Failed to decode token", err);
    }
  }, [token]);

  // CSV parser (handles quoted fields)
  const parseCSV = (text) => {
    const rows = [];
    let row = [];
    let field = "";
    let inQuotes = false;
    let i = 0;
    const len = text.length;

    while (i < len) {
      const ch = text[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        i++;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        row.push(field.trim());
        field = "";
        i++;
        continue;
      }
      if ((ch === '\n' || ch === '\r') && !inQuotes) {
        if (field || row.length) {
          row.push(field.trim());
          if (row.some(cell => cell !== "")) rows.push(row);
          row = [];
          field = "";
        }
        if (ch === '\r' && text[i + 1] === '\n') i++;
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    if (field || row.length) {
      row.push(field.trim());
      if (row.some(cell => cell !== "")) rows.push(row);
    }
    return rows;
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setError("");
    setSuccessCount(0);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      try {
        const rows = parseCSV(text);
        if (rows.length < 2) {
          setError("File must contain at least a header row and one data row");
          return;
        }

        let headers = rows[0].map(h => h.toLowerCase().trim());

        if (!headers.includes("firstname")) {
          setError("Missing required column: firstName");
          return;
        }

        // For unrestricted users, they must provide a location column
        if (!assigned.isRestricted) {
          const hasBooth = headers.includes("booth");
          const hasBlock = headers.includes("block");
          const hasWard = headers.includes("ward");
          if (!hasBooth && !hasBlock && !hasWard) {
            setError("CSV must include at least one of: booth, block, or ward column");
            return;
          }
        } else {
          // For restricted users, remove location columns so they don't conflict
          headers = headers.filter(h => !["booth", "block", "ward", "constituencyid"].includes(h));
        }

        const dataRows = rows.slice(1);
        const parsed = dataRows
          .map((row, idx) => {
            const obj = {};
            headers.forEach((h, i) => {
              obj[h] = row[i] ? row[i].replace(/^"|"$/g, '') : "";
            });
            obj.rowNum = idx + 1;
            return obj;
          })
          .filter(row => row.firstname);

        if (parsed.length === 0) {
          setError("No valid rows: each row must have firstName");
        }
        setPreview(parsed);
      } catch (err) {
        setError("Failed to parse CSV: " + err.message);
      }
    };
    reader.readAsText(selectedFile);
  };

  const downloadTemplate = () => {
    let headers = [
      "firstName", "middleName", "lastName", "voterId", "aadhaar", "phone", "altPhone",
      "email", "age", "dob", "gender", "caste", "religion", "occupation", "education",
      "addressLine1", "village", "postOffice", "pincode", "supportLevel", "influenceRating", "tags", "membershipNumber"
    ];

    if (!assigned.isRestricted) {
      headers = [
        "firstName", "middleName", "lastName", "voterId", "aadhaar", "phone", "altPhone",
        "email", "age", "dob", "gender", "caste", "religion", "occupation", "education",
        "addressLine1", "village", "postOffice", "pincode", "constituencyId",
        "block", "ward", "booth", "supportLevel", "influenceRating", "tags", "membershipNumber"
      ];
    }

    const sample = assigned.isRestricted
      ? ["Rahul", "Kumar", "Sharma", "V1234567", "123412341234", "9876543210", "",
         "rahul@example.com", "35", "1988-05-10", "Male", "General", "Hindu", "Farmer", "Graduate",
         "12 MG Road", "Model Village", "Central PO", "411001", "StrongSupporter", "4", "tag1;tag2", "MEM123"]
      : [
          "Rahul", "Kumar", "Sharma", "V1234567", "123412341234", "9876543210", "",
          "rahul@example.com", "35", "1988-05-10", "Male", "General", "Hindu", "Farmer", "Graduate",
          "12 MG Road", "Model Village", "Central PO", "411001", "CONST_ID", "BLOCK_ID", "WARD_ID", "BOOTH_ID",
          "StrongSupporter", "4", "tag1;tag2", "MEM123"
        ];

    const csv = [headers.join(","), sample.map(v => `"${v}"`).join(",")].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "voter-import-template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!preview.length) {
      setError("No valid rows to import");
      return;
    }
    setLoading(true);
    setError("");

    let votersToImport = preview;
    if (assigned.isRestricted) {
      // If multiple booths assigned, we cannot pick automatically – show error
      if (assigned.boothIds.length > 1) {
        setError("You are assigned to multiple booths. Please specify booth column in CSV or contact admin.");
        setLoading(false);
        return;
      }
      votersToImport = preview.map(row => ({
        ...row,
        constituencyId: assigned.constituencyId,
        block: assigned.blockId,
        ward: assigned.wardId,
        booth: assigned.boothIds[0] || null,
      }));
    }

    try {
      const { data } = await axios.post("/api/election/voter/import", { voters: votersToImport }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setSuccessCount(data.imported ?? 0);
        setFile(null);
        setPreview([]);
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) fileInput.value = "";
      } else {
        setError(data.message || "Import failed");
        if (data.details?.invalidRows?.length) {
          const example = data.details.invalidRows.slice(0, 3);
          console.error("Invalid rows:", example);
          setError(prev => prev + ` (e.g., row ${example[0]?.row}: ${example[0]?.reason})`);
        }
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

      {assigned.isRestricted && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 text-sm text-amber-700">
          🔒 You are restricted to:
          {assigned.constituencyId && " Constituency (assigned)"}
          {assigned.blockId && " Block (assigned)"}
          {assigned.wardId && " Ward (assigned)"}
          {assigned.boothIds.length === 1 && " Booth (assigned)"}
          {assigned.boothIds.length > 1 && ` ${assigned.boothIds.length} booths assigned – please use CSV with booth column`}
          . {assigned.boothIds.length !== 1 && "The CSV must include booth column."}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-sm border">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
        )}
        {successCount > 0 && (
          <div className="bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl mb-4 text-sm">
            ✅ Successfully imported {successCount} voters!
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between gap-4 mb-2">
            <label className="text-xs font-bold uppercase text-gray-500">CSV File *</label>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <FiFile /> Download template
            </button>
          </div>
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
                <p className="text-xs text-gray-400 mt-1">
                  {assigned.isRestricted && assigned.boothIds.length === 1
                    ? "Only firstName is required. Your assigned location will be applied automatically."
                    : "Required: firstName + (booth OR block OR ward). Download template for format."}
                </p>
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
                    {Object.keys(preview[0])
                      .filter(k => k !== "rowNum")
                      .map(key => (
                        <th key={key} className="px-3 py-2 text-left text-[10px] font-bold uppercase text-gray-400">
                          {key}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-b">
                      {Object.entries(row)
                        .filter(([k]) => k !== "rowNum")
                        .map(([key, val]) => (
                          <td key={key} className="px-3 py-2 text-xs text-gray-700 truncate max-w-[150px]">
                            {val}
                          </td>
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
              <FiCheck /> {loading ? "Importing..." : `Import ${preview.length} Voter(s)`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}