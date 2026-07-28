import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";

import { formatINR } from "../lib/format";

export default function Wishlist() {
  const { wishlist, wishPrices } = useStore();
  const [catalog, setCatalog] = useState(null);

  useEffect(() => {
    api
      .products({})
      .then((d) => setCatalog(d.items))
      .catch(() => setCatalog([]));
  }, []);

  const items = useMemo(
    () => (catalog ? catalog.filter((p) => wishlist.includes(p.slug)) : null),
    [catalog, wishlist]
  );

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Saved Pieces</span>
          <h1>
            Your <em>wishlist.</em>
          </h1>
          <p>Prices update with the metal rate — a saved piece is not a locked price.</p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        {items && items.length === 0 ? (
          <div className="empty-state">
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any piece to keep it here.</p>
            <Link to="/shop" className="btn btn-maroon" style={{ marginTop: "1.4rem" }}>
              Browse the collection
            </Link>
          </div>
        ) : (
          <div className="product-grid">
            {(items || Array.from({ length: 4 })).map((p, i) =>
              p ? (
                <Reveal key={p.slug} delay={(i % 4) * 0.06}>
                  <ProductCard product={p} />
                  {wishPrices[p.slug] && p.price.total < wishPrices[p.slug] && (
                    <p className="admin-note" style={{ marginTop: "0.6rem", marginBottom: 0, fontSize: "0.8rem" }}>
                      Price dropped — was {formatINR(wishPrices[p.slug])} when you saved it,
                      now {formatINR(p.price.total)}.
                    </p>
                  )}
                  {wishPrices[p.slug] && p.price.total > wishPrices[p.slug] && (
                    <p className="muted" style={{ marginTop: "0.6rem", fontSize: "0.8rem" }}>
                      Up {formatINR(p.price.total - wishPrices[p.slug])} since you saved it (gold rate moved).
                    </p>
                  )}
                </Reveal>
              ) : (
                <div key={i} className="skeleton" style={{ aspectRatio: "4/5" }} />
              )
            )}
          </div>
        )}
      </div>
    </>
  );
}
