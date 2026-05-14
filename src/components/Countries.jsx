'use client';

import { useState, useEffect } from 'react';

export default function CountryPage() {
  const [countries, setCountries] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ Fetch countries
  const fetchCountries = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/countries', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setCountries(data.data || []);
      } else {
        setError(data.message || 'Failed to fetch countries');
      }
    } catch (err) {
      console.error('Error fetching countries:', err.message);
      setError('Error fetching countries');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Add new country
  const addCountry = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/countries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, code }),
      });
      const data = await res.json();

      if (data.success) {
        setName('');
        setCode('');
        fetchCountries();
        alert('Country added successfully!');
      } else {
        alert(data.message || 'Failed to add country');
      }
    } catch (error) {
      console.error('Error adding country:', error.message);
      alert('Error adding country');
    }
  };

  // ✅ Delete country
  const deleteCountry = async (id) => {
    if (!confirm('Are you sure you want to delete this country?')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/countries?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        fetchCountries();
        alert('Country deleted successfully!');
      } else {
        alert(data.message || 'Failed to delete country');
      }
    } catch (error) {
      console.error('Error deleting country:', error.message);
      alert('Error deleting country');
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Country Master</h1>

      {/* ✅ Show loading & error */}
      {loading && <p className="text-blue-500">Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {/* ✅ Add Country Form */}
      <form onSubmit={addCountry} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Country Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border px-4 py-2 flex-1"
          required
        />
        <input
          type="text"
          placeholder="Country Code"
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

      {/* ✅ Country List */}
      <ul className="divide-y">
        {countries.map((country) => (
          <li
            key={country._id}
            className="flex justify-between items-center py-2"
          >
            <span>{country.name} ({country.code})</span>
            <button
              onClick={() => deleteCountry(country._id)}
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
