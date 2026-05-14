"use client";
import { useState } from "react";
import Papa from "papaparse";

const modelNames = ["CustomerModel", "ItemModels", "AccountHead", "SupplierModels"];

export default function TemplateGeneratorPage() {
  const [output, setOutput] = useState(null);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);

  const fetchTemplate = async (model) => {
    const res = await fetch(`/api/template-schema/${model}`);
    const result = await res.json();
    setOutput({ model, ...result });
    setRows([]);
  };

  const downloadCSV = () => {
    if (!output?.csvHeaders || !output?.sampleRow) return;
    const row = output.csvHeaders.map((key) => output.sampleRow[key] || "");
    const csv = `${output.csvHeaders.join(",")}\n${row.join(",")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${output.model}-template.csv`;
    a.click();
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      if (text.trim().startsWith("[")) {
        const json = JSON.parse(text);
        setRows(Array.isArray(json) ? json : [json]);
      } else {
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => setRows(res.data)
        });
      }
    };
    reader.readAsText(file);
  };

 const handleImport = async () => {
  if (!rows.length || !output?.model) return alert("No data to import");

  setImporting(true);
  try {
    const token = localStorage.getItem("token");

    const res = await fetch(`/api/importdata/${output.model}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ data: rows })
    });

    const result = await res.json();
    alert(result.success ? `${result.count} record(s) imported.` : result.error);
  } catch (err) {
    alert("Import failed: " + err.message);
  } finally {
    setImporting(false);
  }
};


  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">📦 Template Generator</h1>

      <div className="mb-4 flex flex-wrap gap-3">
        {modelNames.map((model) => (
          <button
            key={model}
            onClick={() => fetchTemplate(model)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {model}
          </button>
        ))}
      </div>

      {output && (
        <div className="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">
          <h2 className="font-bold text-lg mb-2">Model: {output.model}</h2>
          <p><strong>csvHeaders:</strong></p>
          <pre>{JSON.stringify(output.csvHeaders, null, 2)}</pre>
          <p><strong>sampleRow:</strong></p>
          <pre>{JSON.stringify(output.sampleRow, null, 2)}</pre>

          <button
            onClick={downloadCSV}
            className="mt-4 bg-green-700 text-white px-4 py-2 rounded"
          >
            ⬇️ Download CSV Template
          </button>

          <div className="mt-6">
            <label className="block mb-2 font-medium">Upload CSV or JSON file</label>
            <input type="file" accept=".csv,.json" onChange={handleFileUpload} className="mb-2" />
            {rows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={importing}
                className="bg-indigo-600 text-white px-4 py-2 rounded"
              >
                {importing ? "Importing..." : `Import ${rows.length} row(s)`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
