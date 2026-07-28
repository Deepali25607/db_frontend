import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";

const CATEGORIES = [
  ["rings", "Rings"],
  ["necklaces", "Necklaces"],
  ["earrings", "Earrings"],
  ["bangles", "Bangles"],
  ["bracelets", "Bracelets"],
  ["mangalsutra", "Mangalsutra"],
  ["chains", "Chains"],
];

const METALS = [
  ["gold", "Gold"],
  ["silver", "Silver"],
  ["platinum", "Platinum"],
];

const PURITIES = ["24K", "22K", "18K", "925", "PT950"];

const OCCASIONS = [
  ["wedding", "Wedding"],
  ["engagement", "Engagement"],
  ["festive", "Festive"],
  ["daily", "Daily wear"],
  ["office", "Office"],
  ["gifting", "Gifting"],
  ["anniversary", "Anniversary"],
];

const BUDGETS = [
  { label: "Under ₹25,000", max: 25000 },
  { label: "Under ₹50,000", max: 50000 },
  { label: "Under ₹1,00,000", max: 100000 },
  { label: "Under ₹2,50,000", max: 250000 },
  { label: "Above ₹2,50,000", min: 250000 },
];

function toggleCsv(value, entry) {
  const list = value ? value.split(",") : [];
  const next = list.includes(entry)
    ? list.filter((v) => v !== entry)
    : [...list, entry];
  return next.join(",");
}

export default function Shop() {
  useSeo({
    title: "The Collection",
    description:
      "Browse rings, necklaces, earrings, bangles and mangalsutra — every piece priced live on today's gold rate with a full break-up.",
  });
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const category = params.get("category") || "";
  const metal = params.get("metal") || "";
  const purity = params.get("purity") || "";
  const occasion = params.get("occasion") || "";
  const sort = params.get("sort") || "";
  const minPrice = params.get("minPrice") || "";
  const maxPrice = params.get("maxPrice") || "";

  const query = useMemo(
    () => ({ category, metal, purity, occasion, sort, minPrice, maxPrice }),
    [category, metal, purity, occasion, sort, minPrice, maxPrice]
  );

  useEffect(() => {
    let alive = true;
    api
      .products(query)
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ total: 0, items: [] }));
    return () => {
      alive = false;
    };
  }, [query]);

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const activeBudget = BUDGETS.findIndex(
    (b) =>
      String(b.max ?? "") === String(maxPrice || "") &&
      String(b.min ?? "") === String(minPrice || "")
  );

  const applyBudget = (i) => {
    const next = new URLSearchParams(params);
    if (i === activeBudget) {
      next.delete("minPrice");
      next.delete("maxPrice");
    } else {
      const b = BUDGETS[i];
      b.min ? next.set("minPrice", b.min) : next.delete("minPrice");
      b.max ? next.set("maxPrice", b.max) : next.delete("maxPrice");
    }
    setParams(next, { replace: true });
  };

  const clearAll = () => setParams(new URLSearchParams(), { replace: true });
  const hasFilters = category || metal || purity || occasion || minPrice || maxPrice;

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">The Collection</span>
          <h1>
            Every piece, <em>priced on today's rate.</em>
          </h1>
          <p>
            Live gold pricing · full break-up on every product · BIS hallmark with HUID
          </p>
        </div>
      </div>

      <div className="container shop-layout">
        <aside className={`filters ${filtersOpen ? "open" : ""}`}>
          <div className="filter-group">
            <h4>Budget</h4>
            <div className="budget-chips" style={{ flexDirection: "column", alignItems: "flex-start" }}>
              {BUDGETS.map((b, i) => (
                <button
                  key={b.label}
                  className={`chip ${i === activeBudget ? "active" : ""}`}
                  onClick={() => applyBudget(i)}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <h4>Category</h4>
            {CATEGORIES.map(([key, label]) => (
              <label key={key} className="filter-option">
                <input
                  type="checkbox"
                  checked={category.split(",").includes(key)}
                  onChange={() => setParam("category", toggleCsv(category, key))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Metal</h4>
            {METALS.map(([key, label]) => (
              <label key={key} className="filter-option">
                <input
                  type="checkbox"
                  checked={metal.split(",").includes(key)}
                  onChange={() => setParam("metal", toggleCsv(metal, key))}
                />
                {label}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Purity</h4>
            {PURITIES.map((key) => (
              <label key={key} className="filter-option">
                <input
                  type="checkbox"
                  checked={purity.split(",").includes(key)}
                  onChange={() => setParam("purity", toggleCsv(purity, key))}
                />
                {key === "925" ? "925 Sterling" : key}
              </label>
            ))}
          </div>

          <div className="filter-group">
            <h4>Occasion</h4>
            {OCCASIONS.map(([key, label]) => (
              <label key={key} className="filter-option">
                <input
                  type="checkbox"
                  checked={occasion.split(",").includes(key)}
                  onChange={() => setParam("occasion", toggleCsv(occasion, key))}
                />
                {label}
              </label>
            ))}
          </div>

          {hasFilters && (
            <button className="btn btn-outline" onClick={clearAll}>
              Clear all filters
            </button>
          )}
        </aside>

        <section>
          <div className="shop-toolbar">
            <span className="count">
              {data ? `${data.total} piece${data.total === 1 ? "" : "s"}` : "Loading…"}
            </span>
            <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
              <button
                className="btn btn-outline filters-toggle"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                {filtersOpen ? "Hide filters" : "Filters"}
              </button>
              <div className="select-wrap">
                <select
                  value={sort}
                  onChange={(e) => setParam("sort", e.target.value)}
                  aria-label="Sort products"
                >
                  <option value="">Sort: Relevance</option>
                  <option value="price-asc">Price — low to high</option>
                  <option value="price-desc">Price — high to low</option>
                  <option value="popularity">Popularity</option>
                  <option value="newest">Newest</option>
                  <option value="weight">Weight — light first</option>
                </select>
              </div>
            </div>
          </div>

          {data && data.items.length === 0 ? (
            <div className="empty-state">
              <h3>No pieces match these filters</h3>
              <p>
                Loosen the budget or try another occasion — or let us make it to
                order.
              </p>
              <button className="btn btn-maroon" onClick={clearAll} style={{ marginTop: "1.2rem" }}>
                Reset filters
              </button>
            </div>
          ) : (
            <div className="product-grid">
              {(data?.items || Array.from({ length: 6 })).map((p, i) =>
                p ? (
                  <Reveal key={p.slug} delay={(i % 3) * 0.06}>
                    <ProductCard product={p} />
                  </Reveal>
                ) : (
                  <div key={i} className="skeleton" style={{ aspectRatio: "4/5" }} />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
