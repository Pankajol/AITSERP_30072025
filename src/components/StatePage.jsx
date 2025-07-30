'use client';

import { useState, useEffect } from 'react';

export default function StatePage() {
  const [states, setStates] = useState([]);
  const [countries, setCountries] = useState([]); // ✅ Country List
  const [selectedCountry, setSelectedCountry] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

const fetchCountries = async () => {
  setLoading(true);
  setError('');

  try {
    const token = localStorage.getItem('token'); // ✅ Get JWT token
    if (!token) {
      setError('You are not logged in.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/countries', {
      headers: {
        Authorization: `Bearer ${token}`, // ✅ Pass token
      },
    });

    const data = await res.json();

    if (data.success && Array.isArray(data.data)) {
      setCountries(data.data);
    } else {
      setError(data.message || 'Failed to fetch countries');
      setCountries([]);
    }
  } catch (err) {
    console.error('Error fetching countries:', err.message);
    setError('Error fetching countries');
  } finally {
    setLoading(false);
  }
};


  /* ✅ Fetch States */
  const fetchStates = async () => {
    if (!selectedCountry) return; // Wait until country selected
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/states?country=${selectedCountry}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setStates(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch states');
      }
    } catch (err) {
      console.error('Error fetching states:', err.message);
      setError('Error fetching states');
    } finally {
      setLoading(false);
    }
  };

  /* ✅ Add State */
  const addState = async (e) => {
    e.preventDefault();
    if (!selectedCountry) {
      alert('Please select a country first!');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/states', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, code, country: selectedCountry }),
      });

      const data = await res.json();
      if (data.success) {
        setName('');
        setCode('');
        fetchStates();
        alert('State added successfully!');
      } else {
        alert(data.message || 'Failed to add state');
      }
    } catch (error) {
      console.error('Error adding state:', error.message);
      alert('Error adding state');
    }
  };

  /* ✅ Delete State */
  const deleteState = async (id) => {
    if (!confirm('Are you sure you want to delete this state?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/states?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        fetchStates();
        alert('State deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete state');
      }
    } catch (error) {
      console.error('Error deleting state:', error.message);
      alert('Error deleting state');
    }
  };

  /* ✅ Load countries and states on mount */
  useEffect(() => {
    fetchCountries();
  }, []);

  useEffect(() => {
    fetchStates();
  }, [selectedCountry]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">State Master</h1>

      {/* ✅ Select Country */}
      <div className="mb-4">
        <select
          className="border px-4 py-2 w-full"
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
        >
          <option value="">Select Country</option>
          {countries.map((country) => (
            <option key={country._id} value={country.code}>
              {country.name} ({country.code})
            </option>
          ))}
        </select>
      </div>

      {/* ✅ Show loading & error */}
      {loading && <p className="text-blue-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* ✅ Add State Form */}
      <form onSubmit={addState} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="State Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 flex-1"
          required
        />
        <input
          type="text"
          placeholder="State Code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="border px-4 py-2 flex-1"
          required
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add
        </button>
      </form>

      {/* ✅ State List */}
      <ul className="divide-y">
        {states.map((state) => (
          <li
            key={state._id}
            className="flex justify-between items-center py-2"
          >
            <span>
              {state.name} ({state.code})
            </span>
            <button
              onClick={() => deleteState(state._id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
