
import React, { useState, useEffect } from 'react';

// Assuming these data are fetched from API or some data source
const countries = [{ code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }];
const states = {
  US: [{ code: 'NY', name: 'New York' }, { code: 'CA', name: 'California' }],
  CA: [{ code: 'ON', name: 'Ontario' }, { code: 'QC', name: 'Quebec' }],
};
const cities = {
  NY: [{ code: 'NYC', name: 'New York City' }],
  CA: [{ code: 'LA', name: 'Los Angeles' }],
  ON: [{ code: 'TO', name: 'Toronto' }],
  QC: [{ code: 'MTL', name: 'Montreal' }],
};

const AddressForm = () => {
  // Form data state
  const [formData, setFormData] = useState({
    billingCountry: '',
    billingState: '',
    billingCity: '',
    shippingCountry: '',
    shippingState: '',
    shippingCity: '',
  });

  // Search term state
  const [searchTerm, setSearchTerm] = useState({
    billingCountry: '',
    billingState: '',
    billingCity: '',
    shippingCountry: '',
    shippingState: '',
    shippingCity: '',
  });

  // Dropdown open state
  const [isDropdownOpen, setIsDropdownOpen] = useState({
    billingCountry: false,
    billingState: false,
    billingCity: false,
    shippingCountry: false,
    shippingState: false,
    shippingCity: false,
  });

  // Filtered options
  const [filteredCountries, setFilteredCountries] = useState({
    billing: countries,
    shipping: countries,
  });
  const [filteredStates, setFilteredStates] = useState({
    billing: [],
    shipping: [],
  });
  const [filteredCities, setFilteredCities] = useState({
    billing: [],
    shipping: [],
  });

  // Handle input search changes
  const handleSearch = (e, type, field) => {
    const value = e.target.value.toLowerCase();
    setSearchTerm((prev) => ({ ...prev, [field]: value }));

    if (field.includes('Country')) {
      const filtered = countries.filter((country) =>
        country.name.toLowerCase().includes(value) || country.code.toLowerCase().includes(value)
      );
      setFilteredCountries((prev) => ({ ...prev, [type]: filtered }));
    }

    if (field.includes('State')) {
      const filtered = states[formData[`${type}Country`]].filter((state) =>
        state.name.toLowerCase().includes(value)
      );
      setFilteredStates((prev) => ({ ...prev, [type]: filtered }));
    }

    if (field.includes('City')) {
      const filtered = cities[formData[`${type}State`]].filter((city) =>
        city.name.toLowerCase().includes(value)
      );
      setFilteredCities((prev) => ({ ...prev, [type]: filtered }));
    }

    setIsDropdownOpen((prev) => ({ ...prev, [`${type}${field}`]: true }));
  };

  // Handle select country
  const handleSelectCountry = (country, type) => {
    setFormData((prev) => ({
      ...prev,
      [`${type}Country`]: country.name,
      [`${type}State`]: '', // Reset state
      [`${type}City`]: '',  // Reset city
    }));
    setSearchTerm((prev) => ({ ...prev, [`${type}Country`]: country.name }));
    setIsDropdownOpen((prev) => ({ ...prev, [`${type}Country`]: false }));
    setFilteredStates((prev) => ({ ...prev, [type]: states[country.code] || [] }));
    setFilteredCities((prev) => ({ ...prev, [type]: [] }));
  };

  // Handle select state
  const handleSelectState = (state, type) => {
    setFormData((prev) => ({
      ...prev,
      [`${type}State`]: state.name,
      [`${type}City`]: '', // Reset city
    }));
    setSearchTerm((prev) => ({ ...prev, [`${type}State`]: state.name }));
    setIsDropdownOpen((prev) => ({ ...prev, [`${type}State`]: false }));
    setFilteredCities((prev) => ({ ...prev, [type]: cities[state.code] || [] }));
  };

  // Handle select city
  const handleSelectCity = (city, type) => {
    setFormData((prev) => ({
      ...prev,
      [`${type}City`]: city.name,
    }));
    setSearchTerm((prev) => ({ ...prev, [`${type}City`]: city.name }));
    setIsDropdownOpen((prev) => ({ ...prev, [`${type}City`]: false }));
  };

  // Render searchable dropdowns
  const SearchableDropdown = ({ label, searchTerm, onSearch, filteredOptions, onSelect, isDropdownOpen }) => (
    <div className="dropdown-container">
      <label>{label}</label>
      <input
        type="text"
        value={searchTerm}
        onChange={onSearch}
        className="dropdown-input"
        placeholder={`Search ${label}`}
      />
      {isDropdownOpen && filteredOptions.length > 0 && (
        <ul className="dropdown-list">
          {filteredOptions.map((option, idx) => (
            <li key={idx} onClick={() => onSelect(option)}>
              {option.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div>
      <h4 className="font-medium mb-2">Address - Bill To</h4>
      <div>
        <SearchableDropdown
          label="Country"
          searchTerm={searchTerm.billingCountry}
          onSearch={(e) => handleSearch(e, 'billing', 'Country')}
          filteredOptions={filteredCountries.billing}
          onSelect={(country) => handleSelectCountry(country, 'billing')}
          isDropdownOpen={isDropdownOpen.billingCountry}
        />
        <SearchableDropdown
          label="State"
          searchTerm={searchTerm.billingState}
          onSearch={(e) => handleSearch(e, 'billing', 'State')}
          filteredOptions={filteredStates.billing}
          onSelect={(state) => handleSelectState(state, 'billing')}
          isDropdownOpen={isDropdownOpen.billingState}
        />
        <SearchableDropdown
          label="City"
          searchTerm={searchTerm.billingCity}
          onSearch={(e) => handleSearch(e, 'billing', 'City')}
          filteredOptions={filteredCities.billing}
          onSelect={(city) => handleSelectCity(city, 'billing')}
          isDropdownOpen={isDropdownOpen.billingCity}
        />
      </div>

      <h4 className="font-medium mb-2">Address - Ship To</h4>
      <div>
        <SearchableDropdown
          label="Country"
          searchTerm={searchTerm.shippingCountry}
          onSearch={(e) => handleSearch(e, 'shipping', 'Country')}
          filteredOptions={filteredCountries.shipping}
          onSelect={(country) => handleSelectCountry(country, 'shipping')}
          isDropdownOpen={isDropdownOpen.shippingCountry}
        />
        <SearchableDropdown
          label="State"
          searchTerm={searchTerm.shippingState}
          onSearch={(e) => handleSearch(e, 'shipping', 'State')}
          filteredOptions={filteredStates.shipping}
          onSelect={(state) => handleSelectState(state, 'shipping')}
          isDropdownOpen={isDropdownOpen.shippingState}
        />
        <SearchableDropdown
          label="City"
          searchTerm={searchTerm.shippingCity}
          onSearch={(e) => handleSearch(e, 'shipping', 'City')}
          filteredOptions={filteredCities.shipping}
          onSelect={(city) => handleSelectCity(city, 'shipping')}
          isDropdownOpen={isDropdownOpen.shippingCity}
        />
      </div>
    </div>
  );
};

export default AddressForm;
