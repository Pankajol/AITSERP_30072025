'use client';

import { useState, useEffect } from 'react';

export default function CityPage() {
  const [cities, setCities] = useState([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');

  // Fetch countries from the API
  const fetchCountries = async () => {
    const res = await fetch('/api/states');
    const data = await res.json();
    setCountries(data);
  };

  // Fetch states for the selected country
  const fetchStates = async (countryId) => {
    if (!countryId) return;
    const res = await fetch(`/api/states?country=${countryId}`);
    const data = await res.json();
    setStates(data);
  };

  // Fetch cities for the selected state
  const fetchCities = async (stateId) => {
    if (!stateId) return;
    try {
      const res = await fetch(`/api/cities?state=${stateId}`);
      const data = await res.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error.message);
    }
  };

  // Add a new city
  const addCity = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, state }),
      });
      if (res.ok) {
        setStatusMessage('City added successfully!');
        setName('');
        setCode('');
        fetchCities(state);
      } else {
        setStatusMessage('Failed to add city.');
      }
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    }
  };

  // Delete a city
  const deleteCity = async (id) => {
    try {
      const res = await fetch(`/api/cities?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setStatusMessage('City deleted successfully!');
        fetchCities(state);
      } else {
        setStatusMessage('Failed to delete city.');
      }
    } catch (error) {
      setStatusMessage(`Error: ${error.message}`);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">City Master</h1>

      {/* Display status message */}
      {statusMessage && <div className="mb-4 text-red-500">{statusMessage}</div>}

      {/* Country dropdown */}
      <div className="mb-6">
        <select
          onChange={(e) => {
            setCountry(e.target.value);
            fetchStates(e.target.value);
          }}
          value={country}
          className="border px-4 py-2 mr-2"
        >
          <option value="">Select a Country</option>
          {countries.map((countryItem) => (
            <option key={countryItem._id} value={countryItem._id}>
              {countryItem.name}
            </option>
          ))}
        </select>
      </div>

      {/* State dropdown */}
      <div className="mb-6">
        <select
          onChange={(e) => {
            setState(e.target.value);
            fetchCities(e.target.value);
          }}
          value={state}
          className="border px-4 py-2 mr-2"
        >
          <option value="">Select a State</option>
          {states.map((stateItem) => (
            <option key={stateItem._id} value={stateItem._id}>
              {stateItem.name}
            </option>
          ))}
        </select>
      </div>

      {/* Add city form */}
      {state && (
        <>
          <form onSubmit={addCity} className="mb-6">
            <input
              type="text"
              placeholder="City Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border px-4 py-2 mr-2"
              required
            />
            <input
              type="text"
              placeholder="City Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="border px-4 py-2 mr-2"
              required
            />
            <button type="submit" className="bg-blue-500 text-white px-4 py-2">
              Add City
            </button>
          </form>

          {/* List of cities */}
          <ul>
            {cities.length > 0 ? (
              cities.map((city) => (
                <li key={city._id} className="flex justify-between items-center border-b py-2">
                  <span>
                    {city.name} ({city.code})
                  </span>
                  <button
                    onClick={() => deleteCity(city._id)}
                    className="bg-red-500 text-white px-2 py-1"
                  >
                    Delete
                  </button>
                </li>
              ))
            ) : (
              <li>No cities found</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
