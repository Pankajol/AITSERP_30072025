"use client";

import React, { useState, useEffect } from "react";

export default function CountryStateSearch({
  valueCountry,
  valueState,
  onSelectCountry,
  onSelectState,
}) {
  const [countryQuery, setCountryQuery] = useState(valueCountry?.name || "");
  const [stateQuery, setStateQuery] = useState(valueState?.name || "");
  const [countryResults, setCountryResults] = useState([]);
  const [stateResults, setStateResults] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(valueCountry || null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  // ✅ Update when valueCountry changes (Edit Mode)
  useEffect(() => {
    if (valueCountry) {
      setSelectedCountry(valueCountry);
      setCountryQuery(valueCountry.name || "");
    }
  }, [valueCountry]);

  // ✅ Update when valueState changes (Edit Mode)
  useEffect(() => {
    if (valueState) {
      setStateQuery(valueState.name || "");
    }
  }, [valueState]);

  // ✅ Fetch countries
  useEffect(() => {
    if (!countryQuery) {
      setCountryResults([]);
      return;
    }
    const fetchCountries = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/countries?search=${countryQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setCountryResults(json.data);
      } catch (err) {
        console.error("Error fetching countries:", err);
      }
    };
    fetchCountries();
  }, [countryQuery]);

  // ✅ Fetch states when user types in state input
  useEffect(() => {
    if (!stateQuery || !selectedCountry) {
      setStateResults([]);
      return;
    }

    const fetchStates = async () => {
      try {
        const token = localStorage.getItem("token");
        // ✅ If your API requires country code, fallback to name if missing
        const countryParam = selectedCountry.code || selectedCountry.name;
        const res = await fetch(
          `/api/states?country=${encodeURIComponent(countryParam)}&search=${stateQuery}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.success) setStateResults(json.data);
      } catch (err) {
        console.error("Error fetching states:", err);
      }
    };

    fetchStates();
  }, [stateQuery, selectedCountry]);

  // ✅ Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setCountryQuery(country.name);
    setStateQuery(""); // reset state input
    setStateResults([]); // clear state list
    onSelectCountry(country);
    onSelectState({ name: "" }); // reset state
    setShowCountryDropdown(false);
  };

  // ✅ Handle state selection
  const handleStateSelect = (state) => {
    setStateQuery(state.name);
    onSelectState(state);
    setShowStateDropdown(false);
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Country Search */}
      <div className="relative">
        <input
          value={countryQuery}
          onChange={(e) => {
            setCountryQuery(e.target.value);
            setShowCountryDropdown(true);
          }}
          placeholder="Search Country"
          className="border border-gray-300 p-3 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
        />
        {showCountryDropdown && countryResults.length > 0 && (
          <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-auto">
            {countryResults.map((country) => (
              <li
                key={country._id || country.code}
                onClick={() => handleCountrySelect(country)}
                className="p-2 hover:bg-blue-100 cursor-pointer"
              >
                {country.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* State Search */}
      <div className="relative">
        <input
          value={stateQuery}
          onChange={(e) => {
            setStateQuery(e.target.value);
            setShowStateDropdown(true);
          }}
          placeholder="Search State"
          className="border border-gray-300 p-3 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
          disabled={!selectedCountry} // ✅ Disable until country selected
        />
        {showStateDropdown && stateResults.length > 0 && (
          <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-auto">
            {stateResults.map((state) => (
              <li
                key={state._id}
                onClick={() => handleStateSelect(state)}
                className="p-2 hover:bg-blue-100 cursor-pointer"
              >
                {state.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}





// import React, { useState } from 'react';
// import useSearch from '../hooks/useSearch';

// const CountryStateSearch = ({ onSelectCountry, onSelectState }) => {
//   const [showCountryDropdown, setShowCountryDropdown] = useState(false);
//   const [showStateDropdown, setShowStateDropdown] = useState(false);
//   const [selectedCountry, setSelectedCountry] = useState(null);
//   const [selectedState, setSelectedState] = useState(null);

//   const countrySearch = useSearch(async (query) => {
//     const res = await fetch(`/api/countries?search=${query}`);
//     return res.ok ? await res.json() : [];
//   });

//   const stateSearch = useSearch(async (query) => {
//     const res = await fetch(`/api/states?country=${selectedCountry?.code}&search=${query}`);
//     return res.ok ? await res.json() : [];
//   });

//   const handleCountrySelect = (country) => {
//     setSelectedCountry(country);
//     setSelectedState(null); // Reset state if the country changes
//     onSelectCountry(country); // Prop callback
//     setShowCountryDropdown(false); // Hide dropdown
//   };

//   const handleStateSelect = (state) => {
//     setSelectedState(state);
//     onSelectState(state); // Prop callback
//     setShowStateDropdown(false); // Hide dropdown
//   };

//   return (
//     <div>
//       {/* Country Search */}
//       <div className="relative mb-4">
//         <input
//           type="text"
//           placeholder="Search Country"
//           value={selectedCountry?.name || countrySearch.query}
//           onChange={(e) => {
//             countrySearch.handleSearch(e.target.value);
//             setShowCountryDropdown(true);
//           }}
//           onFocus={() => setShowCountryDropdown(true)}
//           className="border px-4 py-2 w-full"
//         />
//         {showCountryDropdown && (
//           <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
//             {countrySearch.loading && <p className="p-2">Loading...</p>}
//             {countrySearch.results.map((country) => (
//               <div
//                 key={country.code}
//                 onClick={() => handleCountrySelect(country)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedCountry?.code === country.code ? 'bg-blue-100' : ''
//                 }`}
//               >
//                 {country.name}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>

//       {/* State Search */}
//       <div className="relative">
//         <input
//           type="text"
//           placeholder="Search State"
//           value={selectedState?.name || stateSearch.query}
//           onChange={(e) => {
//             stateSearch.handleSearch(e.target.value);
//             setShowStateDropdown(true);
//           }}
//           onFocus={() => setShowStateDropdown(true)}
//           className="border px-4 py-2 w-full"
//           disabled={!selectedCountry} // Disable state search if no country is selected
//         />
//         {showStateDropdown && selectedCountry && (
//           <div className="absolute border bg-white w-full max-h-40 overflow-y-auto z-10">
//             {stateSearch.loading && <p className="p-2">Loading...</p>}
//             {stateSearch.results.map((state) => (
//               <div
//                 key={state._id}
//                 onClick={() => handleStateSelect(state)}
//                 className={`p-2 cursor-pointer hover:bg-gray-200 ${
//                   selectedState?._id === state._id ? 'bg-blue-100' : ''
//                 }`}
//               >
//                 {state.name}
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default CountryStateSearch;
