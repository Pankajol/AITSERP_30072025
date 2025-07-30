import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LocationSearch = () => {
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedState, setSelectedState] = useState('');

  // Fetch countries on component mount
  useEffect(() => {
    axios.get('https://restcountries.com/v3.1/all')
      .then(response => {
        const countryData = response.data.map(country => ({
          name: country.name.common,
          code: country.cca2,
        }));
        setCountries(countryData.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(err => console.error(err));
  }, []);

  // Fetch states when a country is selected
  const fetchStates = (countryCode) => {
    // Replace with your API for states if necessary
    axios.get(`https://restcountries.com/states/${countryCode}`)
      .then(response => setStates(response.data.states))
      .catch(err => console.error(err));
  };

  // Fetch cities when a state is selected
  const fetchCities = (stateCode) => {
    // Replace with your API for cities if necessary
    axios.get(`https://restcountries.com/cities/${stateCode}`)
      .then(response => setCities(response.data.cities))
      .catch(err => console.error(err));
  };

  // Handle country change
  const handleCountryChange = (event) => {
    const countryCode = event.target.value;
    setSelectedCountry(countryCode);
    setStates([]);
    setCities([]);
    fetchStates(countryCode);
  };

  // Handle state change
  const handleStateChange = (event) => {
    const stateCode = event.target.value;
    setSelectedState(stateCode);
    setCities([]);
    fetchCities(stateCode);
  };

  return (
    <div className="location-search">
      <div>
        <label>Country:</label>
        <select onChange={handleCountryChange} value={selectedCountry}>
          <option value="">Select a Country</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {states.length > 0 && (
        <div>
          <label>State:</label>
          <select onChange={handleStateChange} value={selectedState}>
            <option value="">Select a State</option>
            {states.map((state) => (
              <option key={state.code} value={state.code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {cities.length > 0 && (
        <div>
          <label>City:</label>
          <select>
            <option value="">Select a City</option>
            {cities.map((city) => (
              <option key={city.code} value={city.code}>
                {city.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default LocationSearch;
