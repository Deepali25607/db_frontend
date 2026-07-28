import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { HeartIcon, ShieldIcon, WhatsAppIcon } from "../components/Icons";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatINR, formatINRPaise, metalDisplayName, metalLine, purityDisplay } from "../lib/format";
import { useSeo } from "../lib/seo";
import { useLiveRefresh } from "../lib/useLiveRefresh";

// The enquiry channels are admin-toggled under Settings → Product details;
// the WhatsApp number itself comes from Settings → Customer support.
function EnquiryRow({ product, config, content }) {
  const [cbOpen, setCbOpen] = useState(false);
  const [cbPhone, setCbPhone] = useState("");
  const [cbNote, setCbNote] = useState(null);
  const [cbError, setCbError] = useState(null);
  const [cbBusy, setCbBusy] = useState(false);

  const waDigits = (content?.supportWhatsapp || "").replace(/\D/g, "");
  const showWa = (config?.pdpShowWhatsapp ?? 1) && waDigits;
  const showCall = config?.pdpShowCallback ?? 1;
  const showVisit = config?.pdpShowVisit ?? 1;
  if (!showWa && !showCall && !showVisit) return null;

  const submitCallback = async (e) => {
    e.preventDefault();
    setCbBusy(true);
    setCbError(null);
    try {
      await api.requestCallback({ slug: product.slug, phone: cbPhone });
      setCbNote("Request received — our concierge will call you within 2 hours (10 AM – 8 PM).");
      setCbOpen(false);
    } catch (err) {
      setCbError(err.message);
    } finally {
      setCbBusy(false);
    }
  };

  return (
    <>
      <div className="pdp-secondary">
        {showWa ? (
          <a
            href={`https://wa.me/${waDigits}?text=${encodeURIComponent(
              `I'd like to enquire about ${product.name} (${product.id})`
            )}`}
            target="_blank"
            rel="noreferrer"
          >
            <WhatsAppIcon /> Enquire on WhatsApp
          </a>
        ) : null}
        {showCall ? (
          <button onClick={() => { setCbOpen((o) => !o); setCbNote(null); setCbError(null); }}>
            Request a call back
          </button>
        ) : null}
        {showVisit ? (
          <Link to={`/appointments?product=${product.slug}`}>
            Book a showroom visit for this piece
          </Link>
        ) : null}
      </div>
      {cbNote && <p className="admin-note" style={{ marginTop: "0.6rem" }}>{cbNote}</p>}
      {showCall && cbOpen ? (
        <form className="pin-form" style={{ marginTop: "0.6rem", maxWidth: 420 }} onSubmit={submitCallback}>
          <input
            inputMode="numeric"
            placeholder="10-digit mobile to call you on"
            value={cbPhone}
            onChange={(e) => setCbPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            aria-label="Mobile number for the call back"
            autoFocus
          />
          <button className="btn btn-green" disabled={cbBusy || cbPhone.length !== 10}>
            {cbBusy ? "Sending…" : "Call me"}
          </button>
        </form>
      ) : null}
      {cbError && <p className="form-error" style={{ marginTop: "0.5rem" }}>{cbError}</p>}
    </>
  );
}

function ReviewsBlock({ slug, reviews, onChange }) {
  const [form, setForm] = useState({ name: "", phone: "", rating: 5, title: "", text: "" });
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.submitReview(slug, form);
      onChange(res.summary);
      setNote(
        res.verified
          ? "Thank you — posted as a verified purchase."
          : "Thank you — posted. Reviews from a purchasing mobile number get a verified badge."
      );
      setForm({ name: "", phone: "", rating: 5, title: "", text: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.2rem" }}>
      {(reviews?.reviews || []).length === 0 && (
        <p className="muted">No reviews yet — be the first to write one.</p>
      )}
      {(reviews?.reviews || []).map((r, i) => (
        <div key={i} style={{ borderBottom: "1px dashed var(--line-soft)", paddingBottom: "0.9rem" }}>
          <p>
            <span className="stars" style={{ color: "var(--gold)" }}>{"★".repeat(r.rating)}</span>
            {r.title && <strong style={{ marginLeft: "0.6rem" }}>{r.title}</strong>}
          </p>
          <p style={{ margin: "0.3rem 0" }}>{r.text}</p>
          <p className="muted" style={{ fontSize: "0.78rem" }}>
            {r.name}
            {r.verified && (
              <span className="status-pill" style={{ marginLeft: "0.6rem" }}>✓ Verified purchase</span>
            )}
            {" · "}
            {new Date(r.at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
      ))}

      <form className="checkout-form" onSubmit={submit}>
        <strong style={{ fontFamily: "var(--serif)", fontSize: "1.05rem" }}>Write a review</strong>
        <div className="form-row">
          <div className="field">
            <label>Name</label>
            <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field">
            <label>Mobile (for the verified badge)</label>
            <input
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Rating</label>
            <select value={form.rating} onChange={(e) => setForm((f) => ({ ...f, rating: Number(e.target.value) }))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>{"★".repeat(n)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Title (optional)</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
        </div>
        <div className="field">
          <label>Your review</label>
          <textarea required rows={3} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} />
        </div>
        {error && <p className="form-error">{error}</p>}
        {note && <p className="admin-note">{note}</p>}
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Posting…" : "Post review"}
        </button>
      </form>
    </div>
  );
}

const SIZE_GUIDE = [
  ["8", "48.7 mm", "15.5 mm"],
  ["10", "50.0 mm", "15.9 mm"],
  ["12", "51.2 mm", "16.3 mm"],
  ["14", "52.5 mm", "16.7 mm"],
  ["16", "53.8 mm", "17.1 mm"],
  ["18", "55.1 mm", "17.5 mm"],
];

export default function Product() {
  const { slug } = useParams();
  const { addToCart, toggleWishlist, wishlist, config, content, showToast } = useStore();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [imgIndex, setImgIndex] = useState(0);
  const [size, setSize] = useState(null);
  const [pin, setPin] = useState("");
  const [pinResult, setPinResult] = useState(null);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  const [reviews, setReviews] = useState(null);
  const [engraving, setEngraving] = useState("");
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    setData(null);
    setError(null);
    setImgIndex(0);
    setSize(null);
    setPinResult(null);
    setReviews(null);
    setEngraving("");
    api
      .product(slug)
      .then(setData)
      .catch((e) => setError(e.message));
    api.reviews(slug).then(setReviews).catch(() => {});

    // recently viewed (FR-CAT-12) — keep the last 8, newest first
    try {
      const seen = JSON.parse(localStorage.getItem("dpj_recent") || "[]").filter((s) => s !== slug);
      setRecent(seen.slice(0, 4));
      localStorage.setItem("dpj_recent", JSON.stringify([slug, ...seen].slice(0, 8)));
    } catch { /* ignore */ }
  }, [slug]);

  // live repricing: silently refetch the server-priced product when the tab
  // regains focus or on the poll tick, so a newly published metal rate shows
  // up without a reload (selection state — size, image — is untouched)
  useLiveRefresh(() => {
    api.product(slug).then((d) => setData((prev) => (prev ? d : prev))).catch(() => {});
  }, [slug]);

  const [recentProducts, setRecentProducts] = useState([]);
  useEffect(() => {
    if (recent.length === 0) {
      setRecentProducts([]);
      return;
    }
    api
      .products({})
      .then((d) => setRecentProducts(recent.map((s) => d.items.find((p) => p.slug === s)).filter(Boolean)))
      .catch(() => {});
  }, [recent]);

  // SEO: title, meta description and schema.org Product JSON-LD (BRD 8.6)
  const seoProduct = data?.product;
  useSeo(
    seoProduct
      ? {
          title: seoProduct.name,
          description: seoProduct.description.slice(0, 155),
          jsonLd: {
            "@context": "https://schema.org",
            "@type": "Product",
            name: seoProduct.name,
            image: seoProduct.images,
            description: seoProduct.description,
            sku: seoProduct.id,
            brand: { "@type": "Brand", name: "DP Jewellers" },
            offers: {
              "@type": "Offer",
              priceCurrency: "INR",
              price: seoProduct.price.total,
              availability:
                seoProduct.stock === 0
                  ? "https://schema.org/OutOfStock"
                  : seoProduct.madeToOrder
                    ? "https://schema.org/PreOrder"
                    : "https://schema.org/InStock",
            },
            ...(reviews?.count
              ? {
                  aggregateRating: {
                    "@type": "AggregateRating",
                    ratingValue: reviews.average,
                    reviewCount: reviews.count,
                  },
                }
              : {}),
          },
        }
      : {}
  );

  if (error) {
    return (
      <div className="empty-state container" style={{ padding: "7rem 0" }}>
        <h3>This piece has left the vault</h3>
        <p>{error}</p>
        <Link to="/shop" className="btn btn-maroon" style={{ marginTop: "1.2rem" }}>
          Browse the collection
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container pdp">
        <div className="skeleton" style={{ aspectRatio: "1" }} />
        <div style={{ display: "grid", gap: "1rem", alignContent: "start" }}>
          <div className="skeleton" style={{ height: 44 }} />
          <div className="skeleton" style={{ height: 28, width: "55%" }} />
          <div className="skeleton" style={{ height: 220 }} />
        </div>
      </div>
    );
  }

  const { product, related } = data;
  const { price } = product;
  const wished = wishlist.includes(product.slug);
  const needsSize = product.sizes && product.sizes.length > 0;
  const emiMonths = config?.emiMonths || 12;
  const stone = product.stones[0];

  const checkPin = async (e) => {
    e.preventDefault();
    try {
      const r = await api.pincode(pin);
      setPinResult(r);
    } catch {
      setPinResult({ valid: false });
    }
  };

  const soldOut = product.stock === 0;
  const lowStock = Number.isFinite(product.stock) && product.stock > 0 && product.stock <= 3;

  const handleAdd = () => {
    if (soldOut) return;
    if (needsSize && !size) {
      showToast(`Please choose a ${product.sizeLabel.toLowerCase()}`);
      return;
    }
    addToCart(product.slug, size, 1, engraving.trim() || null);
  };

  return (
    <>
      <div className="container breadcrumb">
        <Link to="/">Home</Link> &nbsp;/&nbsp;{" "}
        <Link to={`/shop?category=${product.category}`}>{product.category}</Link>{" "}
        &nbsp;/&nbsp; {product.name}
      </div>

      <div className="container pdp">
        {/* ------------------------------------ gallery */}
        <div className="gallery">
          <div className="gallery-main">
            <img src={product.images[imgIndex]} alt={product.name} />
          </div>
          <div className="gallery-thumbs">
            {product.images.map((src, i) => (
              <button
                key={i}
                className={i === imgIndex ? "active" : ""}
                onClick={() => setImgIndex(i)}
                aria-label={`View image ${i + 1}`}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        </div>

        {/* ------------------------------------ info */}
        <div className="pdp-info">
          <span className="pdp-collection">{product.collection}</span>
          <h1>{product.name}</h1>
          <p className="pdp-rating">
            <span className="stars">{"★".repeat(Math.round(product.rating))}</span>{" "}
            {product.rating} · {product.reviews} verified reviews
          </p>

          <div className="pdp-price">
            {formatINR(price.total)}
            {price.discountPct > 0 && (
              <>
                <s className="pdp-mrp">{formatINR(price.mrpTotal)}</s>
                <span className="sale-flag">{price.discountPct}% off</span>
              </>
            )}
          </div>
          {(() => {
            // each segment is admin-toggled under Settings → Product details
            const segments = [
              (config?.pdpShowGstNote ?? 1) ? "Inclusive of GST" : null,
              (config?.pdpShowRateNote ?? 1)
                ? `computed at today's ${product.metal.purity} rate of ${formatINR(price.metalRatePerGram)}/g`
                : null,
              (config?.pdpShowLockNote ?? 1)
                ? `price locked for ${config?.priceLockMinutes ?? 30} min once in bag`
                : null,
            ].filter(Boolean);
            return segments.length ? (
              <p className="pdp-price-note">
                <span className="live-dot" />
                {segments.join(" · ")}
              </p>
            ) : null;
          })()}

          <div className="trust-badges">
            {product.hallmarked && (
              <span className="trust-badge" title="BIS hallmark — government-certified purity. The HUID is a unique 6-character code laser-etched on this piece.">
                <ShieldIcon /> BIS Hallmark · HUID {product.huid}
              </span>
            )}
            {stone?.certBody && (
              <span
                className="trust-badge"
                title={`Certificate ${stone.certNo} accompanies this piece.`}
              >
                <ShieldIcon /> {stone.certBody} Certified
              </span>
            )}
            <span className="trust-badge" title="Insured door-to-door shipping with OTP-verified delivery.">
              <ShieldIcon /> Insured Delivery
            </span>
          </div>

          {/* price break-up (BRD FR-PRC-05) */}
          <details className="breakup">
            <summary>Full price break-up</summary>

            {/* structured product details replace the single metal-value line */}
            <div className="pdp-detail-card">
              <h4>Product Details</h4>
              <dl className="pdp-detail-grid">
                <div>
                  <dt>Metal Type</dt>
                  <dd>{metalDisplayName(product.metal)}</dd>
                </div>
                <div>
                  <dt>Purity</dt>
                  <dd>{purityDisplay(product.metal.purity)}</dd>
                </div>
                <div>
                  <dt>Rate</dt>
                  <dd>{formatINR(price.metalRatePerGram)}/g</dd>
                </div>
                <div>
                  <dt>Weight</dt>
                  <dd>{product.metal.netWeight} g</dd>
                </div>
                <div>
                  <dt>Discount</dt>
                  <dd>{price.discountPct > 0 ? `${price.discountPct}%` : "–"}</dd>
                </div>
                <div className="pdp-detail-value">
                  <dt>Value</dt>
                  <dd>{formatINRPaise(product.metal.netWeight * price.metalRatePerGram)}</dd>
                </div>
              </dl>
            </div>

            <table>
              <tbody>
                {price.stoneValue > 0 && (
                  <tr>
                    <td>
                      Stone value
                      {stone
                        ? ` — ${stone.caratTotal} ct ${stone.type}`
                        : ""}
                    </td>
                    <td>{formatINR(price.stoneValue)}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    Making charges
                    {product.making.basis === "percent"
                      ? ` — ${product.making.value}% of metal value`
                      : product.making.basis === "perGram"
                        ? ` — ${formatINR(product.making.value)}/g`
                        : ""}
                  </td>
                  <td>{formatINR(price.makingCharges)}</td>
                </tr>
                {price.otherCharges > 0 && (
                  <tr>
                    <td>Hallmarking & certification</td>
                    <td>{formatINR(price.otherCharges)}</td>
                  </tr>
                )}
                {price.discountPct > 0 && (
                  <tr>
                    <td>Discount — {price.discountPct}% off</td>
                    <td>−{formatINR(price.discountValue)}</td>
                  </tr>
                )}
                <tr>
                  <td>
                    GST — {price.gstDetail.jewelleryGstPct}% on jewellery,{" "}
                    {price.gstDetail.makingGstPct}% on making
                    {price.discountPct > 0 ? " (on the discounted value)" : ""}
                  </td>
                  <td>{formatINR(price.gst)}</td>
                </tr>
                <tr className="total">
                  <td>Total</td>
                  <td>{formatINR(price.total)}</td>
                </tr>
              </tbody>
            </table>
          </details>

          {/* sizes */}
          {needsSize && (
            <div className="size-row">
              <div className="size-head">
                <span>{product.sizeLabel}</span>
                <button onClick={() => setSizeGuideOpen(true)}>Size guide</button>
              </div>
              <div className="size-options">
                {product.sizes.map((s) => (
                  <button
                    key={s}
                    className={size === s ? "active" : ""}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.madeToOrder && (
            <p className="pdp-price-note" style={{ color: "var(--maroon)" }}>
              Made to order — crafted for you in {product.leadTimeDays} days.
            </p>
          )}

          {/* engraving (FR-PDP-12) */}
          {product.engravable && (
            <div className="size-row">
              <div className="size-head">
                <span>Engraving — complimentary (optional)</span>
                <span>{engraving.length}/12</span>
              </div>
              <input
                className="pin-form-input"
                style={{ width: "100%", padding: "0.7rem 1rem", borderRadius: 10, border: "1px solid var(--line)", background: "var(--paper)" }}
                maxLength={12}
                placeholder="e.g. R & A · 14.02.26"
                value={engraving}
                onChange={(e) => setEngraving(e.target.value.replace(/[^A-Za-z0-9 .&'-]/g, ""))}
                aria-label="Engraving text"
              />
              {engraving.trim() && (
                <p style={{ marginTop: "0.6rem", fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "1.1rem", color: "var(--gold)" }}>
                  “{engraving.trim()}” — engraved inside · non-returnable once engraved
                </p>
              )}
            </div>
          )}

          {soldOut && (
            <span className="stock-note out">
              Sold out — book a showroom visit or enquire for a remake
            </span>
          )}
          {lowStock && (
            <span className="stock-note">
              Only {product.stock} left in the vault
            </span>
          )}

          <div className="pdp-actions">
            <button className="btn btn-maroon" onClick={handleAdd} disabled={soldOut}>
              {soldOut ? "Sold out" : product.madeToOrder ? "Commission this piece" : "Add to bag"}
            </button>
            <button
              className="btn btn-outline"
              onClick={() => toggleWishlist(product.slug, price.total)}
              style={wished ? { borderColor: "var(--maroon)", color: "var(--maroon)" } : undefined}
            >
              <HeartIcon filled={wished} /> {wished ? "Saved" : "Wishlist"}
            </button>
          </div>

          <EnquiryRow product={product} config={config} content={content} />

          <p className="emi-line">
            EMI from <strong>{formatINR(Math.ceil(price.total / emiMonths))}/month</strong>{" "}
            for {emiMonths} months · UPI, cards, net-banking accepted
          </p>

          {/* PIN check (BRD FR-PDP-04) */}
          <div className="pin-check">
            <h4>Delivery estimate</h4>
            <form className="pin-form" onSubmit={checkPin}>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="Enter PIN code"
                inputMode="numeric"
                aria-label="PIN code"
              />
              <button className="btn btn-green" type="submit">
                Check
              </button>
            </form>
            {pinResult && (
              <p className={`pin-result ${pinResult.serviceable ? "ok" : "bad"}`}>
                {!pinResult.valid
                  ? "Please enter a valid 6-digit PIN code."
                  : pinResult.serviceable
                    ? `Delivered in ${pinResult.etaDays} days, fully insured, OTP-verified.${pinResult.codAvailable ? " Cash on delivery available." : " Prepaid only for this PIN."}`
                    : "We do not deliver to this PIN code yet — visit a showroom or contact our concierge."}
              </p>
            )}
          </div>

          {/* accordions */}
          <div className="pdp-tabs">
            <details className="accordion" open>
              <summary>Description</summary>
              <div className="accordion-body">{product.description}</div>
            </details>

            <details className="accordion">
              <summary>Specifications</summary>
              <div className="accordion-body">
                <table className="spec-table">
                  <tbody>
                    <tr><td>Design code</td><td>{product.id}</td></tr>
                    <tr><td>Metal</td><td>{metalLine(product)}</td></tr>
                    <tr><td>Gross weight</td><td>{product.metal.grossWeight} g</td></tr>
                    <tr><td>Net metal weight</td><td>{product.metal.netWeight} g</td></tr>
                    {stone && (
                      <>
                        <tr>
                          <td>Stone</td>
                          <td>
                            {stone.count} × {stone.type}, {stone.caratTotal} ct,{" "}
                            {stone.cut}
                          </td>
                        </tr>
                        <tr>
                          <td>Grade</td>
                          <td>
                            {stone.colour} / {stone.clarity}
                          </td>
                        </tr>
                        <tr><td>Setting</td><td>{stone.setting}</td></tr>
                      </>
                    )}
                    <tr><td>HSN</td><td>{product.hsn}</td></tr>
                    <tr><td>Country of origin</td><td>India</td></tr>
                  </tbody>
                </table>
              </div>
            </details>

            <details className="accordion">
              <summary>Certification & hallmark</summary>
              <div className="accordion-body">
                {product.hallmarked && (
                  <p>
                    BIS hallmarked with HUID <strong>{product.huid}</strong>,
                    laser-etched on the piece and printed on your invoice.
                  </p>
                )}
                {stone?.certBody && (
                  <p style={{ marginTop: "0.6rem" }}>
                    Stones certified by {stone.certBody} (certificate{" "}
                    {stone.certNo}) — the physical certificate ships in the box,
                    and a PDF copy is attached to your order email.
                  </p>
                )}
              </div>
            </details>

            <details className="accordion" id="policies">
              <summary>Returns, exchange & buyback</summary>
              <div className="accordion-body">
                <p>15-day return window for ready pieces in unworn condition with certificate and invoice. Made-to-order and engraved pieces are non-returnable.</p>
                <p style={{ marginTop: "0.6rem" }}>Lifetime exchange at prevailing gold rate; buyback per our published policy with deductions shown transparently before you confirm.</p>
              </div>
            </details>

            <details className="accordion">
              <summary>
                Reviews{reviews?.count ? ` (${reviews.count} · ${reviews.average}★)` : ""}
              </summary>
              <div className="accordion-body">
                <ReviewsBlock slug={product.slug} reviews={reviews} onChange={setReviews} />
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* related */}
      {related.length > 0 && (
        <section className="container related">
          <Reveal className="section-head">
            <span className="eyebrow">Complete the look</span>
            <h2 className="section-title">
              Pieces that <em>belong together.</em>
            </h2>
          </Reveal>
          <div className="product-grid">
            {related.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.07}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* recently viewed (FR-CAT-12) */}
      {recentProducts.length > 0 && (
        <section className="container related" style={{ paddingBottom: "4rem" }}>
          <Reveal className="section-head">
            <span className="eyebrow">Recently Viewed</span>
            <h2 className="section-title">
              Still <em>thinking about…</em>
            </h2>
          </Reveal>
          <div className="product-grid">
            {recentProducts.map((p, i) => (
              <Reveal key={p.slug} delay={i * 0.06}>
                <ProductCard product={p} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* size guide modal */}
      {sizeGuideOpen && (
        <div className="modal-backdrop" onClick={() => setSizeGuideOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Size guide">
            <h3>Ring size guide</h3>
            <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
              Wrap a strip of paper around your finger, mark where it overlaps,
              and measure the length — that is the circumference.
            </p>
            <table className="spec-table">
              <tbody>
                <tr>
                  <td><strong>Size</strong></td>
                  <td><strong>Circumference</strong></td>
                  <td><strong>Diameter</strong></td>
                </tr>
                {SIZE_GUIDE.map(([s, c, d]) => (
                  <tr key={s}>
                    <td>{s}</td>
                    <td>{c}</td>
                    <td>{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="close-row">
              <button className="btn btn-maroon" onClick={() => setSizeGuideOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
