import { useEffect, useRef, useState } from "react";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import ProductCard from "./ProductCard";

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setResults(null);
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 60);
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e) => e.key === "Escape" && setSearchOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, setSearchOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .products({ q: query.trim(), limit: 8 })
        .then((data) => setResults(data.items))
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  if (!searchOpen) return null;

  return (
    <div className="search-overlay" role="dialog" aria-label="Search">
      <button className="search-close" onClick={() => setSearchOpen(false)}>
        Close ✕
      </button>
      <div className="search-inner">
        <input
          ref={inputRef}
          className="search-input"
          placeholder="Search solitaire, jhumka, mangalsutra…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search products"
        />
        <p className="search-hint">
          Try a stone, a metal, an occasion — “polki”, “22K”, “engagement”.
        </p>

        {results && results.length > 0 && (
          <div className="search-results" onClick={() => setSearchOpen(false)}>
            {results.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        )}
        {results && results.length === 0 && (
          <div className="empty-state">
            <h3>Nothing found for “{query}”</h3>
            <p>Try “rings”, “diamond”, “pearl” or browse the full collection.</p>
          </div>
        )}
      </div>
    </div>
  );
}
