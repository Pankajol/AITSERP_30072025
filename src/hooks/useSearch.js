import { useState, useCallback, useRef } from "react";

export default function useSearch(searchFn, delay = 300) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  const handleSearch = useCallback(
    (input) => {
      setQuery(input);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      timeoutRef.current = setTimeout(async () => {
        if (!input.trim() && input !== "") {
          setResults([]);
          return;
        }
        setLoading(true);
        try {
          const res = await searchFn(input);
          setResults(res);
        } catch (err) {
          console.error("Search error:", err);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, delay);
    },
    [searchFn, delay]
  );

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return { query, results, loading, handleSearch, reset };
}


// import { useState } from 'react';

// const useSearch = (searchFunction) => {
//   const [query, setQuery] = useState('');
//   const [results, setResults] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);

//   const handleSearch = async (searchQuery) => {
//     setQuery(searchQuery);
//     setLoading(true);
//     setError(null);
//     try {
//       const res = await searchFunction(searchQuery);
//       setResults(res);
//     } catch (err) {
//       setError(err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return {
//     query,
//     setQuery,
//     results,
//     loading,
//     error,
//     handleSearch,
//   };
// };

// export default useSearch;
