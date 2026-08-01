import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";
import Reveal from "../components/Reveal";

export default function Stores() {
  useSeo({
    title: "Our Showrooms",
    description:
      "Visit DP Jewellers in Indore, Bhopal or Ujjain — three generations of goldsmiths, every piece BIS-hallmarked.",
  });
  const [stores, setStores] = useState(null);

  useEffect(() => {
    api.stores().then((d) => setStores(d.stores)).catch(() => setStores([]));
  }, []);

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Visit Us</span>
          <h1>
            Three cities, one <em>standard.</em>
          </h1>
          <p>
            Walk in for a chai and a closer look — every showroom keeps a live
            rate board, an assay bench for old gold, and pieces reserved from
            your online wishlist.
          </p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        {!stores ? (
          <div className="skeleton" style={{ height: 300 }} />
        ) : (
          <div className="testimonial-grid" style={{ alignItems: "stretch" }}>
            {stores.map((s, i) => (
              <Reveal key={s.key} delay={i * 90}>
                <div className="scheme-card" style={{ height: "100%" }}>
                  <h3 style={{ fontFamily: "var(--serif)", fontSize: "1.3rem", marginBottom: "0.5rem" }}>
                    {s.name}
                  </h3>
                  <p className="muted" style={{ marginBottom: "0.6rem" }}>{s.address}</p>
                  {s.hours && (
                    <p style={{ fontSize: "0.9rem", marginBottom: "0.3rem" }}>
                      Open daily · {s.hours}
                    </p>
                  )}
                  {s.phone && <p style={{ fontSize: "0.9rem", marginBottom: "1.2rem" }}>{s.phone}</p>}
                  <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
                    <Link to={`/appointments`} className="btn btn-maroon" style={{ padding: "0.6rem 1.2rem" }}>
                      Book a visit
                    </Link>
                    <a
                      className="btn btn-outline"
                      style={{ padding: "0.6rem 1.2rem" }}
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`DP Jewellers, ${s.address}`)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Directions
                    </a>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <div className="section-intro" style={{ marginTop: "4rem" }}>
          <span className="eyebrow">At the counter</span>
          <h2 className="section-title">
            What the showroom <em>adds.</em>
          </h2>
          <p className="muted" style={{ maxWidth: 640, margin: "0 auto" }}>
            Try pieces against skin tone and outfit, watch the assay of your old
            gold in front of you, collect online orders the same day with store
            pickup, and settle gold-scheme redemptions in person.
          </p>
        </div>
      </div>
    </>
  );
}
