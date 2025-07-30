'use client';

import { useState, useEffect } from 'react';

export default function CityMaster() {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [cityName, setCityName] = useState('');
  const [cityCode, setCityCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch countries
  const fetchCountries = async () => {
    try {
      const res = await fetch('/api/countries');
      const data = await res.json();
      setCountries(data);
    } catch (error) {
      console.error('Error fetching countries:', error.message);
      setError('Failed to load countries.');
    }
  };

  // Fetch states by country
  const fetchStates = async (countryId) => {
    if (!countryId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/states?country=${countryId}`);
      const data = await res.json();
      setStates(data);
    } catch (error) {
      console.error('Error fetching states:', error.message);
      setError('Failed to load states.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch cities by state
  const fetchCities = async (stateId) => {
    if (!stateId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/cities?state=${stateId}`);
      const data = await res.json();
      setCities(data);
    } catch (error) {
      console.error('Error fetching cities:', error.message);
      setError('Failed to load cities.');
    } finally {
      setLoading(false);
    }
  };

  // Add a city
  const addCity = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/cities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cityName, code: cityCode, state }),
      });

      if (!res.ok) {
        throw new Error('Failed to add city');
      }

      setCityName('');
      setCityCode('');
      fetchCities(state);
    } catch (error) {
      console.error('Error adding city:', error.message);
      setError('Failed to add city.');
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">City Master</h1>

      {/* Error Message */}
      {error && <div className="text-red-500 mb-4">{error}</div>}

      {/* Country Dropdown */}
      <select
        value={country}
        onChange={(e) => {
          setCountry(e.target.value);
          setState('');
          setCities([]);
          fetchStates(e.target.value);
        }}
        className="border px-4 py-2 mr-2"
      >
        <option value="">Select a Country</option>
        {countries.map((country) => (
          <option key={country._id} value={country._id}>
            {country.name}
          </option>
        ))}
      </select>

      {/* State Dropdown */}
      {country && (
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            fetchCities(e.target.value);
          }}
          className="border px-4 py-2 mr-2 mt-4"
        >
          <option value="">Select a State</option>
          {states.map((state) => (
            <option key={state._id} value={state._id}>
              {state.name}
            </option>
          ))}
        </select>
      )}

      {/* Add City Form */}
      {state && (
        <form onSubmit={addCity} className="mt-4">
          <input
            type="text"
            placeholder="City Name"
            value={cityName}
            onChange={(e) => setCityName(e.target.value)}
            className="border px-4 py-2 mr-2"
            required
          />
          <input
            type="text"
            placeholder="City Code"
            value={cityCode}
            onChange={(e) => setCityCode(e.target.value)}
            className="border px-4 py-2 mr-2"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2">
            Add City
          </button>
        </form>
      )}

      {/* City List */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <ul className="mt-4">
          {cities.map((city) => (
            <li key={city._id} className="flex justify-between items-center border-b py-2">
              <span>
                {city.name} ({city.code})
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
