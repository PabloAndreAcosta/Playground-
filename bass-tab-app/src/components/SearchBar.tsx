import { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(query);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, onSearch]);

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder="Sök låtar, artister..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      {query && (
        <button className="search-clear" onClick={() => setQuery('')}>
          &times;
        </button>
      )}
    </div>
  );
}
