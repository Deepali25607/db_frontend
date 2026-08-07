import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatINR, metalLine } from "../lib/format";

/* Product discovery — a lounge before you type (recent searches, curated
   ideas, the category tiles) and a live two-pane result view as you type:
   refined rows on the left, the highlighted piece previewed on the right.
   Arrow keys move, Enter opens, Esc leaves. */

const RECENT_KEY = "dpj_recent_searches";
const readRecent = () => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(v) ? v.slice(0, 6) : [];
  } catch {
    return [];
  }
};
const pushRecent = (term) => {
  const t = term.trim();
  if (!t) return;
  const next = [t, ...readRecent().filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
};

/* Curated entry points — pure navigation, everything resolves live. */
const IDEAS = [
  ["Engagement", "/shop?occasion=engagement"],
  ["Wedding", "/shop?occasion=wedding"],
  ["22K gold", "/shop?metal=gold&purity=22K"],
  ["Diamonds", "/shop?q=diamond"],
  ["Pearls", "/shop?q=pearl"],
  ["Under ₹50,000", "/shop?maxPrice=50000"],
  ["Gifting", "/shop?occasion=gifting"],
  ["For men", "/shop?gender=men"],
];

export default function SearchOverlay() {
  const { searchOpen, setSearchOpen } = useStore();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null); // {total, items}
  const [active, setActive] = useState(0);
  const [categories, setCategories] = useState([]);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (searchOpen) {
      setQuery("");
      setResults(null);
      setActive(0);
      setRecent(readRecent());
      document.body.style.overflow = "hidden";
      setTimeout(() => inputRef.current?.focus(), 60);
      if (categories.length === 0) api.categories().then(setCategories).catch(() => {});
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .products({ q: query.trim(), limit: 6 })
        .then((data) => {
          setResults(data);
          setActive(0);
        })
        .catch(() => setResults({ total: 0, items: [] }));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const items = results?.items || [];
  const highlighted = items[Math.min(active, Math.max(0, items.length - 1))];

  const goToAll = () => {
    pushRecent(query);
    setSearchOpen(false);
    navigate(`/shop?q=${encodeURIComponent(query.trim())}`);
  };
  const openPiece = (slug) => {
    pushRecent(query);
    setSearchOpen(false);
    navigate(`/product/${slug}`);
  };

  useEffect(() => {
    if (!searchOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setSearchOpen(false);
      if (!items.length) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + items.length) % items.length);
      }
      if (e.key === "Enter" && highlighted) {
        e.preventDefault();
        openPiece(highlighted.slug);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen, items, highlighted]); // eslint-disable-line react-hooks/exhaustive-deps

  const idle = !query.trim();

  if (!searchOpen) return null;

  return (
    <div className="search-overlay so" role="dialog" aria-label="Search">
      <button className="search-close" onClick={() => setSearchOpen(false)}>
        Close ✕
      </button>
      <div className="so-inner">
        <span className="eyebrow" style={{ display: "block", textAlign: "center" }}>Discover</span>
        <div className="so-inputwrap">
          <input
            ref={inputRef}
            className="search-input"
            placeholder="Search the atelier…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search products"
          />
        </div>
        <p className="search-hint">
          A stone, a metal, an occasion — “polki”, “22K”, “engagement”.
        </p>

        {idle && (
          <div className="so-lounge">
            {recent.length > 0 && (
              <div className="so-block">
                <h4>Recent searches</h4>
                <div className="so-chips">
                  {recent.map((r) => (
                    <button key={r} className="so-chip" onClick={() => setQuery(r)}>{r}</button>
                  ))}
                  <button
                    className="so-chip so-chip-quiet"
                    onClick={() => {
                      localStorage.removeItem(RECENT_KEY);
                      setRecent([]);
                    }}
                  >
                    clear
                  </button>
                </div>
              </div>
            )}
            <div className="so-block">
              <h4>Ideas to begin with</h4>
              <div className="so-chips">
                {IDEAS.map(([label, to]) => (
                  <Link key={label} className="so-chip" to={to} onClick={() => setSearchOpen(false)}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            {categories.length > 0 && (
              <div className="so-block">
                <h4>Browse the houses</h4>
                <div className="so-cats">
                  {categories.map((c) => (
                    <Link
                      key={c.key}
                      className="so-cat"
                      to={`/shop?category=${c.key}`}
                      onClick={() => setSearchOpen(false)}
                    >
                      <img src={c.image} alt="" loading="lazy" />
                      <span>
                        {c.label}
                        <small>{c.count} piece{c.count === 1 ? "" : "s"}</small>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!idle && results && items.length > 0 && (
          <div className="so-results">
            <div className="so-list" role="listbox" aria-label="Matching pieces">
              {items.map((p, i) => (
                <button
                  key={p.slug}
                  role="option"
                  aria-selected={i === active}
                  className={`so-row ${i === active ? "active" : ""}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => openPiece(p.slug)}
                >
                  <img src={p.images?.[0]} alt="" loading="lazy" />
                  <span className="so-row-main">
                    <strong>{p.name}</strong>
                    <small>{p.category} · {metalLine(p)}</small>
                  </span>
                  <span className="so-row-price">{formatINR(p.price.total)}</span>
                </button>
              ))}
              <button className="so-viewall" onClick={goToAll}>
                View all {results.total} result{results.total === 1 ? "" : "s"} →
              </button>
            </div>
            {highlighted && (
              <div className="so-preview" aria-hidden>
                <img src={highlighted.images?.[0]} alt="" />
                <div className="so-preview-body">
                  <strong>{highlighted.name}</strong>
                  <small className="muted">{highlighted.category} · {metalLine(highlighted)}</small>
                  <span className="so-preview-price">{formatINR(highlighted.price.total)}</span>
                  <button className="btn btn-maroon" style={{ padding: "0.45rem 1.2rem" }} onClick={() => openPiece(highlighted.slug)}>
                    View this piece →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!idle && results && items.length === 0 && (
          <div className="empty-state">
            <h3>Nothing found for “{query}”</h3>
            <p>Perhaps one of these paths instead —</p>
            <div className="so-chips" style={{ justifyContent: "center" }}>
              {IDEAS.slice(0, 5).map(([label, to]) => (
                <Link key={label} className="so-chip" to={to} onClick={() => setSearchOpen(false)}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
