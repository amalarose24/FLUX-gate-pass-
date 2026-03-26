/**
 * LocationPicker.jsx  –  Fuzzy Autocomplete using Photon API (Komoot)
 * Upgraded for Zero-Lag Typing & Premium Light Theme
 */

import { useState, useRef, useEffect } from 'react';

const PHOTON_URL = 'https://photon.komoot.io/api/';

// Bias center: Angamaly / FISAT area
const BIAS_LAT = 10.196;
const BIAS_LON = 76.386;

export default function LocationPicker({
  value = '',
  onChange,
  onSelect,
  placeholder = 'Search destination...',
  className = '',
}) {
  // ⚡️ LOCAL STATE: This prevents the dashboard from lagging the keyboard
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Sync local state if the parent resets the form entirely
  useEffect(() => {
    if (value === '') setInputValue('');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInputChange = (e) => {
    const text = e.target.value;
    
    // 1. Instantly update the input box so the cursor NEVER lags
    setInputValue(text);

    // Clear previous timer
    clearTimeout(debounceRef.current);

    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      setIsLoading(false);
      onChange(text); // Sync empty box with parent
      return;
    }

    setIsLoading(true);

    // 2. Wait 300ms after the user STOPS typing to ping the parent & API
    debounceRef.current = setTimeout(async () => {
      onChange(text); // Now we safely tell the Dashboard what we typed

      try {
        const params = new URLSearchParams({
          q: text.trim(),
          lat: BIAS_LAT,
          lon: BIAS_LON,
          limit: '5',
          lang: 'en',
        });

        const res = await fetch(`${PHOTON_URL}?${params}`);
        const data = await res.json();

        const features = data.features || [];
        setSuggestions(features);
        setShowDropdown(features.length > 0);
      } catch (error) {
        console.error("Location search failed", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    }, 300); // Fast 300ms delay feels incredibly snappy
  };

  const handleSelect = (feature) => {
    const [lng, lat] = feature.geometry.coordinates; // GeoJSON is [lng, lat]
    const props = feature.properties || {};

    const primary = props.name || '';
    const parts = [primary, props.city || props.county || '', props.state || '']
      .filter(Boolean)
      .slice(0, 2);
    const displayName = parts.join(', ') || props.name || 'Selected Location';

    // Instantly update everything upon click
    setInputValue(displayName);
    onChange(displayName);
    onSelect([lng, lat]);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={inputValue} // Uses local state instead of parent state
        onChange={handleInputChange}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        placeholder={placeholder}
        autoComplete="off"
        className={className || "w-full h-12 px-4 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-teal-500 focus:bg-white outline-none transition-all font-medium shadow-sm"}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute right-4 top-3.5">
          <div className="w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Dropdown Menu */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((feature, idx) => {
            const props = feature.properties || {};
            const primary = props.name || 'Unknown Location';
            const secondary = [props.city || props.county || '', props.state || '']
              .filter(Boolean)
              .join(', ');

            return (
              <li
                key={`${primary}-${idx}`}
                onClick={() => handleSelect(feature)}
                className="px-4 py-3 cursor-pointer hover:bg-teal-50 transition-colors flex flex-col justify-center group"
              >
                <div className="text-slate-800 font-bold text-sm group-hover:text-teal-700 transition-colors">
                  {primary}
                </div>
                {secondary && (
                  <div className="text-slate-500 text-xs mt-0.5 font-medium">
                    {secondary}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}