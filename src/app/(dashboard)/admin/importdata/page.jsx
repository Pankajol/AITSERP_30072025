"use client";

// -----------------------------------------------------------------------------
// Next.js page for importing Sales Invoices from CSV or JSON files
// -----------------------------------------------------------------------------
//  • Batch columns are OPTIONAL – default template excludes them.
//  • Drag‑and‑drop or click upload, preview first 50 rows, POST to backend.
//  • Downloadable CSV & JSON templates.
// -----------------------------------------------------------------------------

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ImportSalesInvoicePage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [importing, setImporting] = useState(false);

  // ---------------------------------------------------------------------------
  // CSV/JSON templates (batch‑less by default)
  // ---------------------------------------------------------------------------
  const csvHeaders = [
    "invoiceNumber",
    "customerCode",
    "customerName",
    "contactPerson",
    "refNumber",
    "salesEmployee",
    "orderDate",
    "expectedDeliveryDate",
    "remarks",
    "freight",
    "rounding",
    "totalDownPayment",
    "appliedAmounts",
    "totalBeforeDiscount",
    "gstTotal",
    "grandTotal",
    "openBalance",
    "paymentStatus",
    "itemCode",
    "itemName",
    "itemDescription",
    "quantity",
    "unitPrice",
    "discount",
    "priceAfterDiscount",
    "totalAmount",
    "gstAmount",
    "igstAmount",
    "warehouseName",
    "warehouseCode",
    "taxOption",
    "managedByBatch" // true/false – leave empty or false for non‑batch
  ];

  const sampleCsvRow = [
    "SALE-001",
    "CUST001",
    "ABC Ltd.",
    "John Doe",
    "REF123",
    "Emp1",
    "2025-06-30",
    "2025-07-05",
    "First invoice",
    50,
    0,
    0,
    0,
    1000,
    180,
    1230,
    1230,
    "Pending",
    "ITEM001",
    "Item A",
    "Description of item",
    10,
    100,
    0,
    100,
    1000,
    180,
    0,
    "Main WH",
    "WH001",
    "GST",
    false
  ];

  const downloadCSVTemplate = () => {
    const csv = Papa.unparse([csvHeaders, sampleCsvRow]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-invoice-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const sampleJson = [
    {
      invoiceNumber: "SALE-001",
      customerCode: "CUST001",
      customerName: "ABC Ltd.",
      contactPerson: "John Doe",
      refNumber: "REF123",
      salesEmployee: "Emp1",
      orderDate: "2025-06-30T00:00:00.000Z",
      expectedDeliveryDate: "2025-07-05T00:00:00.000Z",
      remarks: "First invoice",
      freight: 50,
      rounding: 0,
      totalDownPayment: 0,
      appliedAmounts: 0,
      totalBeforeDiscount: 1000,
      gstTotal: 180,
      grandTotal: 1230,
      openBalance: 1230,
      paymentStatus: "Pending",
      items: [
        {
          itemCode: "ITEM001",
          itemName: "Item A",
          itemDescription: "Description of item",
          quantity: 10,
          unitPrice: 100,
          discount: 0,
          priceAfterDiscount: 100,
          totalAmount: 1000,
          gstAmount: 180,
          igstAmount: 0,
          warehouseName: "Main WH",
          warehouseCode: "WH001",
          taxOption: "GST",
          managedByBatch: false
        }
      ]
    }
  ];

  const downloadJSONTemplate = () => {
    const blob = new Blob([JSON.stringify(sampleJson, null, 2)], {
      type: "application/json;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sales-invoice-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ---------------------------------------------------------------------------
  // Handle file upload & parse
  // ---------------------------------------------------------------------------
  const handleFile = useCallback((f) => {
    if (!f) return;
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      const trimmed = text.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        // JSON
        try {
          const json = JSON.parse(trimmed);
          setRows(Array.isArray(json) ? json : [json]);
        } catch {
          toast.error("Invalid JSON file");
          setRows([]);
        }
      } else {
        // CSV
        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (result) => {
            if (result.errors.length) {
              toast.error(`CSV parse error: ${result.errors[0].message}`);
              setRows([]);
            } else {
              setRows(result.data);
            }
          }
        });
      }
    };

    reader.readAsText(f);
    setFile(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };
  const onChoose = (e) => handleFile(e.target.files[0]);

  // ---------------------------------------------------------------------------
  // Import API call
  // ---------------------------------------------------------------------------
  const startImport = async () => {
    if (!rows.length) return toast.warn("No data to import");
    setImporting(true);
    try {
      const res = await fetch("/api/importdata/sales-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: rows }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`${data.count} invoice(s) imported successfully`);
        setTimeout(() => router.push("/admin/sales-invoice-view"), 1200);
      } else {
        toast.error(data.error || "Import failed");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setImporting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <ToastContainer position="top-center" />

      {/* Header & template buttons */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Import Sales Invoices new</h1>
        <div className="flex flex-wrap gap-3">
          <button onClick={downloadCSVTemplate} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">CSV Template</button>
          <button onClick={downloadJSONTemplate} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm">JSON Template</button>
        </div>
      </div>

      {/* Upload box */}
      <label onDrop={onDrop} onDragOver={(e) => e.preventDefault()} className="flex flex-col items-center justify-center w-full h-48 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
        <input type="file" accept=".csv,application/json" onChange={onChoose} className="hidden" />
        {!file ? (
          <p className="text-gray-600 text-center">Drag & drop CSV/JSON here, or click to browse</p>
        ) : (
          <p className="text-green-700 font-medium truncate max-w-full">{file.name} selected</p>
        )}
      </label>

      {/* Preview & import */}
      {rows.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mt-8 mb-2">Preview ({rows.length} rows)</h2>
          <div className="overflow-auto max-h-72 border rounded">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {Object.keys(rows[0]).map((h) => (
                    <th key={h} className="px-2 py-2 border-b whitespace-nowrap text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 50).map((row, i) => (
                  <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
                    {Object.keys(rows[0]).map((h) => (
                      <td key={h} className="px-2 py-1 border-b whitespace-nowrap">{String(row[h] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 50 && <p className="text-xs text-gray-500 mt-1">Showing first 50 rows…</p>}

          <button
            disabled={importing}
            onClick={startImport}
            className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
          >
            {importing ? "Importing…" : "Start Import"}
          </button>
        </>
      )}
    </div>
  );
}



















// "use client";

// // -----------------------------------------------------------------------------
// // Next.js (App Router) page for importing Sales Invoices from CSV or JSON files
// // -----------------------------------------------------------------------------
// // ▸ Downloadable CSV & JSON templates so users can fill data quickly.
// // ▸ Drag‑and‑drop or click upload; parses with PapaParse.
// // ▸ Preview first 50 rows; imports via POST /api/import/sales-invoice.
// // -----------------------------------------------------------------------------
// // TailwindCSS styling – consistent with the rest of Pankaj's dashboard.
// // -----------------------------------------------------------------------------

// import React, { useState, useCallback } from "react";
// import { useRouter } from "next/navigation";
// import Papa from "papaparse";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// export default function ImportSalesInvoicePage() {
//   const router = useRouter();

//   // Local UI state
//   const [file, setFile] = useState(null);
//   const [rows, setRows] = useState([]); // parsed objects
//   const [importing, setImporting] = useState(false);

//   // ---------------------------------------------------------------------------
//   // Template helpers
//   // ---------------------------------------------------------------------------
//   const csvHeaders = [
//     "invoiceNumber",
//     "customerCode",
//     "customerName",
//     "contactPerson",
//     "refNumber",
//     "salesEmployee",
//     "orderDate",
//     "expectedDeliveryDate",
//     "remarks",
//     "freight",
//     "rounding",
//     "totalDownPayment",
//     "appliedAmounts",
//     "totalBeforeDiscount",
//     "gstTotal",
//     "grandTotal",
//     "openBalance",
//     "paymentStatus",
//     "itemCode",
//     "itemName",
//     "itemDescription",
//     "quantity",
//     "unitPrice",
//     "discount",
//     "priceAfterDiscount",
//     "totalAmount",
//     "gstAmount",
//     "igstAmount",
//     "warehouseName",
//     "warehouseCode",
//     "taxOption",
//     "managedByBatch",
//     "manufacturer",
//     "batchCode",
//     "expiryDate",
//     "allocatedQuantity",
//     "availableQuantity",
//   ];

//   const sampleCsvRow = [
//     "SALE-001",
//     "CUST001",
//     "ABC Ltd.",
//     "John Doe",
//     "REF123",
//     "Emp1",
//     "2025-06-30",
//     "2025-07-05",
//     "First invoice",
//     50,
//     0,
//     0,
//     0,
//     1000,
//     180,
//     1230,
//     1230,
//     "Pending",
//     "ITEM001",
//     "Item A",
//     "Description of item",
//     10,
//     100,
//     0,
//     100,
//     1000,
//     180,
//     0,
//     "Main WH",
//     "WH001",
//     "GST",
//     true,
//     "ACME",
//     "BATCH-01",
//     "2025-12-31",
//     10,
//     20,
//   ];

//   const downloadCSVTemplate = () => {
//     const csv = Papa.unparse([csvHeaders, sampleCsvRow]);
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "sales-invoice-template.csv";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   const sampleJson = [
//     {
//       invoiceNumber: "SALE-001",
//       customerCode: "CUST001",
//       customerName: "ABC Ltd.",
//       contactPerson: "John Doe",
//       refNumber: "REF123",
//       salesEmployee: "Emp1",
//       orderDate: "2025-06-30T00:00:00.000Z",
//       expectedDeliveryDate: "2025-07-05T00:00:00.000Z",
//       remarks: "First invoice",
//       freight: 50,
//       rounding: 0,
//       totalDownPayment: 0,
//       appliedAmounts: 0,
//       totalBeforeDiscount: 1000,
//       gstTotal: 180,
//       grandTotal: 1230,
//       openBalance: 1230,
//       paymentStatus: "Pending",
//       items: [
//         {
//           itemCode: "ITEM001",
//           itemName: "Item A",
//           itemDescription: "Description of item",
//           quantity: 10,
//           unitPrice: 100,
//           discount: 0,
//           priceAfterDiscount: 100,
//           totalAmount: 1000,
//           gstAmount: 180,
//           igstAmount: 0,
//           warehouseName: "Main WH",
//           warehouseCode: "WH001",
//           taxOption: "GST",
//           managedByBatch: true,
//           manufacturer: "ACME",
//           batches: [
//             {
//               batchCode: "BATCH-01",
//               expiryDate: "2025-12-31T00:00:00.000Z",
//               manufacturer: "ACME",
//               allocatedQuantity: 10,
//               availableQuantity: 20,
//             },
//           ],
//         },
//       ],
//     },
//   ];

//   const downloadJSONTemplate = () => {
//     const blob = new Blob([JSON.stringify(sampleJson, null, 2)], {
//       type: "application/json;charset=utf-8;",
//     });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url;
//     a.download = "sales-invoice-template.json";
//     document.body.appendChild(a);
//     a.click();
//     document.body.removeChild(a);
//     URL.revokeObjectURL(url);
//   };

//   // ---------------------------------------------------------------------------
//   // Handle file upload & parse
//   // ---------------------------------------------------------------------------
//   const handleFile = useCallback((f) => {
//     if (!f) return;
//     const reader = new FileReader();

//     reader.onload = (e) => {
//       const text = e.target.result;
//       const trimmed = text.trim();
//       if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
//         // JSON
//         try {
//           const json = JSON.parse(trimmed);
//           setRows(Array.isArray(json) ? json : [json]);
//         } catch {
//           toast.error("Invalid JSON file");
//           setRows([]);
//         }
//       } else {
//         // CSV
//         Papa.parse(text, {
//           header: true,
//           skipEmptyLines: true,
//           complete: (result) => {
//             if (result.errors.length) {
//               toast.error(`CSV parse error: ${result.errors[0].message}`);
//               setRows([]);
//             } else {
//               setRows(result.data);
//             }
//           },
//         });
//       }
//     };

//     reader.readAsText(f);
//     setFile(f);
//   }, []);

//   const onDrop = (e) => {
//     e.preventDefault();
//     handleFile(e.dataTransfer.files[0]);
//   };

//   const onChoose = (e) => handleFile(e.target.files[0]);

//   // ---------------------------------------------------------------------------
//   // Import API call
//   // ---------------------------------------------------------------------------
//   const startImport = async () => {
//     if (!rows.length) return toast.warn("No data to import");

//     setImporting(true);
//     try {
//       const res = await fetch("/api/sales-invoice", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ invoices: rows }),
//       });
//       const data = await res.json();
//       if (res.ok && data.success) {
//         toast.success(`${data.count} invoice(s) imported successfully`);
//         setTimeout(() => router.push("/admin/sales-invoice-view"), 1200);
//       } else {
//         toast.error(data.error || "Import failed");
//       }
//     } catch (err) {
//       toast.error(err.message);
//     } finally {
//       setImporting(false);
//     }
//   };

//   // ---------------------------------------------------------------------------
//   // UI
//   // ---------------------------------------------------------------------------
//   return (
//     <div className="p-8 max-w-4xl mx-auto">
//       <ToastContainer position="top-center" />

//       {/* Header & template buttons */}
//       <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
//         <h1 className="text-3xl font-bold">Import Sales Invoices</h1>
//         <div className="flex flex-wrap gap-3">
//           <button
//             onClick={downloadCSVTemplate}
//             className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
//           >
//             Download CSV Template
//           </button>
//           <button
//             onClick={downloadJSONTemplate}
//             className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm"
//           >
//             Download JSON Template
//           </button>
//         </div>
//       </div>

//       {/* Upload box */}
//       <label
//         onDrop={onDrop}
//         onDragOver={(e) => e.preventDefault()}
//         className="flex flex-col items-center justify-center w-full h-48 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50"
//       >
//         <input
//           type="file"
//           accept=".csv,application/json"
//           onChange={onChoose}
//           className="hidden"
//         />
//         {!file ? (
//           <p className="text-gray-600 text-center">Drag & drop CSV/JSON here, or click to browse</p>
//         ) : (
//           <p className="text-green-700 font-medium truncate max-w-full">{file.name} selected</p>
//         )}
//       </label>

//       {/* Preview & import button */}
//       {rows.length > 0 && (
//         <>
//           <h2 className="text-xl font-semibold mt-8 mb-2">Preview ({rows.length} rows)</h2>
//           <div className="overflow-auto max-h-72 border rounded">
//             <table className="min-w-full text-xs">
//               <thead className="bg-gray-100 sticky top-0">
//                 <tr>
//                   {Object.keys(rows[0]).map((h) => (
//                     <th key={h} className="px-2 py-2 border-b whitespace-nowrap text-left">
//                       {h}
//                     </th>
//                   ))}
//                 </tr>
//               </thead>
//               <tbody>
//                 {rows.slice(0, 50).map((row, i) => (
//                   <tr key={i} className={i % 2 ? "bg-gray-50" : ""}>
//                     {Object.keys(rows[0]).map((h) => (
//                       <td key={h} className="px-2 py-1 border-b whitespace-nowrap">
//                         {String(row[h] ?? "")}
//                       </td>
//                     ))}
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//           {rows.length > 50 && (
//             <p className="text-xs text-gray-500 mt-1">Showing first 50 rows…</p>
//           )}

//           <button
//             disabled={importing}
//             onClick={startImport}
//             className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
//           >
//             {importing ? "Importing…" : "Start Import"}
//           </button>
//         </>
//       )}
//     </div>
//   );
// }
