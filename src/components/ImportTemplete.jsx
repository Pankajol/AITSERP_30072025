"use client";
import React, { useState, useCallback } from "react";
import Papa from "papaparse";
import { toast, ToastContainer } from "react-toastify";
import { useRouter } from "next/navigation";
import "react-toastify/dist/ReactToastify.css";

export default function ImportTemplate({ modelName, csvHeaders = [], sampleRow = {}, sampleJson = [] }) {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);

  const downloadCSVTemplate = () => {
    const csv = Papa.unparse([csvHeaders, Object.values(sampleRow)]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modelName}-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadJSONTemplate = () => {
    const blob = new Blob([JSON.stringify(sampleJson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${modelName}-template.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (text.trim().startsWith("[")) {
        try {
          const json = JSON.parse(text);
          setRows(Array.isArray(json) ? json : [json]);
        } catch {
          toast.error("Invalid JSON file");
        }
      } else {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            if (res.errors.length) {
              toast.error("CSV parse error: " + res.errors[0].message);
            } else {
              setRows(res.data);
            }
          },
        });
      }
    };
    reader.readAsText(file);
    setFile(file);
  }, []);

  const startImport = async () => {
    if (!rows.length) return toast.warning("No data to import");

    setImporting(true);
    try {
      const res = await fetch(`/api/importdata/${modelName.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: rows }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(`${result.count} ${modelName} record(s) imported successfully`);
        setTimeout(() => router.push(`/admin/${modelName.toLowerCase()}-view`), 1200);
      } else {
        toast.error(result.error || "Import failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <ToastContainer position="top-center" />
      <h1 className="text-2xl font-bold mb-4">Import {modelName}</h1>

      <div className="flex gap-4 mb-4">
        <button onClick={downloadCSVTemplate} className="bg-green-600 text-white px-4 py-2 rounded">CSV Template</button>
        <button onClick={downloadJSONTemplate} className="bg-blue-600 text-white px-4 py-2 rounded">JSON Template</button>
      </div>

      <label className="block border-2 border-dashed p-6 rounded text-center cursor-pointer">
        <input type="file" hidden accept=".csv,.json" onChange={(e) => handleFile(e.target.files[0])} />
        {file ? (
          <span className="text-green-700 font-medium">{file.name} selected</span>
        ) : (
          "Drag and drop or click to upload CSV/JSON file"
        )}
      </label>

      {rows.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-6 mb-2">Preview ({rows.length} rows)</h2>
          <div className="overflow-auto max-h-72 border rounded text-sm">
            <table className="w-full">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {Object.keys(rows[0]).map((key) => (
                    <th key={key} className="p-2 text-left">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    {Object.keys(rows[0]).map((key) => (
                      <td key={key} className="p-2">{row[key]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={startImport}
            disabled={importing}
            className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded disabled:opacity-50"
          >
            {importing ? "Importing..." : "Start Import"}
          </button>
        </>
      )}
    </div>
  );
}
