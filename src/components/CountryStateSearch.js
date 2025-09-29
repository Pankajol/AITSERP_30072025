"use client";

import React, { useState, useEffect, useRef } from "react";

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
  const [selectedState, setSelectedState] = useState(valueState || null);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  const countryRef = useRef();
  const stateRef = useRef();

  // Update selectedCountry and selectedState when parent changes
  useEffect(() => setSelectedCountry(valueCountry || null), [valueCountry]);
  useEffect(() => setSelectedState(valueState || null), [valueState]);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (!countryRef.current?.contains(e.target)) setShowCountryDropdown(false);
      if (!stateRef.current?.contains(e.target)) setShowStateDropdown(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // Fetch countries
  useEffect(() => {
    if (!countryQuery) return setCountryResults([]);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`/api/countries?search=${countryQuery}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success) setCountryResults(json.data);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [countryQuery]);

  // Fetch states
  useEffect(() => {
    if (!stateQuery || !selectedCountry) return setStateResults([]);
    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const countryParam = selectedCountry.code || selectedCountry.name;
        const res = await fetch(
          `/api/states?country=${encodeURIComponent(
            countryParam
          )}&search=${stateQuery}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        if (json.success) setStateResults(json.data);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [stateQuery, selectedCountry]);

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setCountryQuery(country.name);
    setStateQuery("");
    setSelectedState(null);
    setStateResults([]);
    onSelectCountry(country);
    onSelectState(null);
    setShowCountryDropdown(false);
  };

  const handleStateSelect = (state) => {
    setSelectedState(state);
    setStateQuery(state.name);
    onSelectState(state);
    setShowStateDropdown(false);
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {/* Country Input */}
      <div className="relative" ref={countryRef}>
        <input
          value={selectedCountry?.name || countryQuery}
          onChange={(e) => {
            setCountryQuery(e.target.value);
            setSelectedCountry(null); // reset selection while typing
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

      {/* State Input */}
      <div className="relative" ref={stateRef}>
        <input
          value={selectedState?.name || stateQuery}
          onChange={(e) => {
            setStateQuery(e.target.value);
            setSelectedState(null);
            setShowStateDropdown(true);
          }}
          placeholder="Search State"
          className="border border-gray-300 p-3 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
          disabled={!selectedCountry}
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




// "use client";

// import React, { useState, useEffect } from "react";

// export default function CountryStateSearch({
//   valueCountry,
//   valueState,
//   onSelectCountry,
//   onSelectState,
// }) {
//   const [countryQuery, setCountryQuery] = useState(valueCountry?.name || "");
//   const [stateQuery, setStateQuery] = useState(valueState?.name || "");
//   const [countryResults, setCountryResults] = useState([]);
//   const [stateResults, setStateResults] = useState([]);
//   const [selectedCountry, setSelectedCountry] = useState(valueCountry || null);
//   const [showCountryDropdown, setShowCountryDropdown] = useState(false);
//   const [showStateDropdown, setShowStateDropdown] = useState(false);

//   // ✅ Update when valueCountry changes (Edit Mode)
//   useEffect(() => {
//     if (valueCountry) {
//       setSelectedCountry(valueCountry);
//       setCountryQuery(valueCountry.name || "");
//     }
//   }, [valueCountry]);

//   // ✅ Update when valueState changes (Edit Mode)
//   useEffect(() => {
//     if (valueState) {
//       setStateQuery(valueState.name || "");
//     }
//   }, [valueState]);

//   // ✅ Fetch countries
//   useEffect(() => {
//     if (!countryQuery) {
//       setCountryResults([]);
//       return;
//     }
//     const fetchCountries = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         const res = await fetch(`/api/countries?search=${countryQuery}`, {
//           headers: { Authorization: `Bearer ${token}` },
//         });
//         const json = await res.json();
//         if (json.success) setCountryResults(json.data);
//       } catch (err) {
//         console.error("Error fetching countries:", err);
//       }
//     };
//     fetchCountries();
//   }, [countryQuery]);

//   // ✅ Fetch states when user types in state input
//   useEffect(() => {
//     if (!stateQuery || !selectedCountry) {
//       setStateResults([]);
//       return;
//     }

//     const fetchStates = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         // ✅ If your API requires country code, fallback to name if missing
//         const countryParam = selectedCountry.code || selectedCountry.name;
//         const res = await fetch(
//           `/api/states?country=${encodeURIComponent(countryParam)}&search=${stateQuery}`,
//           { headers: { Authorization: `Bearer ${token}` } }
//         );
//         const json = await res.json();
//         if (json.success) setStateResults(json.data);
//       } catch (err) {
//         console.error("Error fetching states:", err);
//       }
//     };

//     fetchStates();
//   }, [stateQuery, selectedCountry]);

//   // ✅ Handle country selection
//   const handleCountrySelect = (country) => {
//     setSelectedCountry(country);
//     setCountryQuery(country.name);
//     setStateQuery(""); // reset state input
//     setStateResults([]); // clear state list
//     onSelectCountry(country);
//     onSelectState({ name: "" }); // reset state
//     setShowCountryDropdown(false);
//   };

//   // ✅ Handle state selection
//   const handleStateSelect = (state) => {
//     setStateQuery(state.name);
//     onSelectState(state);
//     setShowStateDropdown(false);
//   };

//   return (
//     <div className="grid sm:grid-cols-2 gap-4">
//       {/* Country Search */}
//       <div className="relative">
//         <input
//           value={countryQuery}
//           onChange={(e) => {
//             setCountryQuery(e.target.value);
//             setShowCountryDropdown(true);
//           }}
//           placeholder="Search Country"
//           className="border border-gray-300 p-3 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
//         />
//         {showCountryDropdown && countryResults.length > 0 && (
//           <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-auto">
//             {countryResults.map((country) => (
//               <li
//                 key={country._id || country.code}
//                 onClick={() => handleCountrySelect(country)}
//                 className="p-2 hover:bg-blue-100 cursor-pointer"
//               >
//                 {country.name}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>

//       {/* State Search */}
//       <div className="relative">
//         <input
//           value={stateQuery}
//           onChange={(e) => {
//             setStateQuery(e.target.value);
//             setShowStateDropdown(true);
//           }}
//           placeholder="Search State"
//           className="border border-gray-300 p-3 rounded-lg w-full focus:ring-blue-500 focus:border-blue-500"
//           disabled={!selectedCountry} // ✅ Disable until country selected
//         />
//         {showStateDropdown && stateResults.length > 0 && (
//           <ul className="absolute z-10 bg-white border border-gray-300 w-full mt-1 rounded-lg shadow-lg max-h-40 overflow-auto">
//             {stateResults.map((state) => (
//               <li
//                 key={state._id}
//                 onClick={() => handleStateSelect(state)}
//                 className="p-2 hover:bg-blue-100 cursor-pointer"
//               >
//                 {state.name}
//               </li>
//             ))}
//           </ul>
//         )}
//       </div>
//     </div>
//   );
// }




