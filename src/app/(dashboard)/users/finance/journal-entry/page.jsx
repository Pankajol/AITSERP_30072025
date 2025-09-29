'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import axios from 'axios';

export default function JournalEntryPage() {
  const [ledgerOptions, setLedgerOptions] = useState([]);
  const [rows, setRows] = useState([{ ledger: null, debit: '', credit: '', remark: '' }]);
  const [globalRemark, setGlobalRemark] = useState('');
  const [error, setError] = useState('');
  const [documentNo, setDocumentNo] = useState('');

  // Generate auto Document No
  const generateDocumentNo = () => {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return `JE-${datePart}-${randomPart}`;
  };

  // Fetch ledger options from API
useEffect(() => {
  const fetchLedgers = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('/api/bank-head', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = response.data?.data || response.data; 
      console.log("ledger data", data);

      if (Array.isArray(data)) {
        const options = data.map((ledger) => ({
          value: ledger._id,
          label: ledger.accountName,
          accountCode: ledger.accountCode,
        }));
        setLedgerOptions(options);
      } else {
        console.error('Ledger data is not an array:', data);
      }
    } catch (err) {
      console.error('Failed to fetch ledgers:', err);
    }
  };

  fetchLedgers();
  setDocumentNo(generateDocumentNo());
}, []);



  const addRow = () => {
    setRows([...rows, { ledger: null, debit: '', credit: '', remark: '' }]);
  };

  const removeRow = (index) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    setRows(newRows);
  };

  const totalDebit = rows.reduce((sum, row) => sum + Number(row.debit || 0), 0);
  const totalCredit = rows.reduce((sum, row) => sum + Number(row.credit || 0), 0);

  const handleSave = () => {
    if (totalDebit !== totalCredit) {
      setError('Total Debit and Credit must be equal!');
      return;
    }
    setError('');
    // Send journal entry to backend
    console.log({ documentNo, rows, globalRemark });
    alert('Journal Entry Saved Successfully!');
    // Regenerate Document No for next entry
    setDocumentNo(generateDocumentNo());
    // Reset form
    setRows([{ ledger: null, debit: '', credit: '', remark: '' }]);
    setGlobalRemark('');
  };

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Finance Journal Entry</h1>

      <div className="mb-4 flex gap-4 items-center">
        <input type="date" className="border px-2 py-1 rounded" placeholder="Posting Date" />
        <input
          type="text"
          className="border px-2 py-1 rounded bg-gray-200"
          placeholder="Document No"
          value={documentNo}
          readOnly
        />
      </div>

      {error && <div className="text-red-500 mb-2 font-semibold">{error}</div>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Ledger Code</th>
            <th className="border px-4 py-2">Ledger / Account</th>
            <th className="border px-4 py-2">Debit</th>
            <th className="border px-4 py-2">Credit</th>
            <th className="border px-4 py-2">Remark</th>
            <th className="border px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          
          {rows.map((row, index) => (
            <tr key={index} className="bg-white">


                {/* Ledger Code (auto) */}
  <td className="border px-4 py-2">
    <input
      type="text"
      className="w-full border px-2 py-1 rounded bg-gray-200"
      value={row.ledger?.accountCode || ''} // auto-set
      readOnly
      placeholder="Ledger Code"
    />
  </td>
              
              <td className="border px-4 py-2">
                <Select
                  options={ledgerOptions}
                  value={row.ledger}
                  onChange={(selected) => handleChange(index, 'ledger', selected)}
                  placeholder="Select Ledger"
                  isSearchable
                />
              </td>
              <td className="border px-4 py-2">
                <input
                  type="number"
                  className="w-full border px-2 py-1 rounded"
                  value={row.debit}
                  onChange={(e) => handleChange(index, 'debit', e.target.value)}
                  placeholder="Debit"
                />
              </td>
              <td className="border px-4 py-2">
                <input
                  type="number"
                  className="w-full border px-2 py-1 rounded"
                  value={row.credit}
                  onChange={(e) => handleChange(index, 'credit', e.target.value)}
                  placeholder="Credit"
                />
              </td>
              <td className="border px-4 py-2">
                <input
                  type="text"
                  className="w-full border px-2 py-1 rounded"
                  value={row.remark}
                  onChange={(e) => handleChange(index, 'remark', e.target.value)}
                  placeholder="Remark"
                />
              </td>
              <td className="border px-4 py-2 text-center">
                <button
                  onClick={() => removeRow(index)}
                  className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-200 font-bold">
            <td className="border px-4 py-2 text-right">Total</td>
            <td className="border px-4 py-2">{totalDebit}</td>
            <td className="border px-4 py-2">{totalCredit}</td>
            <td className="border px-4 py-2"></td>
            <td className="border px-4 py-2"></td>
          </tr>
        </tfoot>
      </table>

      <div className="mt-4 flex gap-4 items-center">
        <button
          onClick={addRow}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Row
        </button>

        <input
          type="text"
          className="border px-2 py-1 rounded flex-1"
          placeholder="Global Remark"
          value={globalRemark}
          onChange={(e) => setGlobalRemark(e.target.value)}
        />
      </div>

      <div className="mt-4">
        <button
          onClick={handleSave}
          className="bg-green-500 text-white px-6 py-2 rounded hover:bg-green-600"
        >
          Save Journal Entry
        </button>
      </div>
    </div>
  );
}
