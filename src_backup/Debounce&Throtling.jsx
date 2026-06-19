import React, { useEffect, useRef, useState } from "react";

function App() {
  const [search, setSearch] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [throttledValue, setThrottledValue] = useState("");

  // Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Throttle
  const lastExecuted = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();

    if (now - lastExecuted.current >= 1000) {
      setThrottledValue(search);
      lastExecuted.current = now;
    }
  }, [search]);

  return (
    <div>
      <h3>Debouncing & Throttling</h3>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search item"
      />

      <p>Current Value: {search}</p>
      <p>Debounced Value: {debouncedValue}</p>
      <p>Throttled Value: {throttledValue}</p>
    </div>
  );
}

export default App;