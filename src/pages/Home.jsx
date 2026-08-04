import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import Reveal from "../components/Reveal";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&auto=format&fit=crop";
const STORY_IMAGE =
  "https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1200&auto=format&fit=crop";

const TESTIMONIALS = [
  {
    quote:
      "The price break-up on screen matched the invoice to the rupee. My solitaire arrived in a sealed box with its IGI card — exactly as promised.",
    name: "Isha Malhotra",
    city: "Indore",
  },
  {
    quote:
      "We ordered a polki set for the wedding, made to order in three weeks. It felt like the showroom counter had moved into our living room.",
    name: "Ritika & Sarthak",
    city: "Bhopal",
  },
  {
    quote:
      "I check their gold-rate ticker every morning before the shop opens. Bought jhumkas at a dip — the transparency is addictive.",
    name: "Kavita Rao",
    city: "Pune",
  },
];

// Homepage promotion carousel (Settings → Homepage hero media): rotates
// through the slides; clicking a slide opens the product it promotes.
function HeroSlides({ slides }) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <>
      {slides.map((s, i) => {
        const cls = `hero-slide ${i === idx % slides.length ? "active" : ""}`;
        const img = <img className="hero-img" src={s.image} alt="" aria-hidden={i !== idx} />;
        return s.slug ? (
          <Link key={`${s.image}-${i}`} to={`/product/${s.slug}`} className={cls} aria-label="View this piece">
            {img}
          </Link>
        ) : (
          <div key={`${s.image}-${i}`} className={cls}>{img}</div>
        );
      })}
      {slides.length > 1 && (
        <div className="hero-dots" role="tablist" aria-label="Promotion slides">
          {slides.map((_, i) => (
            <button
              key={i}
              className={i === idx % slides.length ? "on" : ""}
              onClick={() => setIdx(i)}
              aria-label={`Show slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </>
  );
}

// Category-wise sale banners (Admin → Settings → Category promotions): a
// slow marquee under the hero; tapping a banner opens its category in the
// shop. Unknown/blank categories fall back to the full collection.
function PromoMarquee({ banners, categoryKeys }) {
  const live = banners.filter((b) => b.on !== false && b.image);
  if (live.length === 0) return null;
  const linkFor = (b) =>
    b.category && categoryKeys.includes(b.category)
      ? `/shop?category=${encodeURIComponent(b.category)}`
      : "/shop";
  const loop = [...live, ...live];
  return (
    <div className="promo-marquee" aria-label="Current promotions">
      <div className={`promo-track ${live.length < 3 ? "few" : ""}`}>
        {loop.map((b, i) => (
          <Link
            key={i}
            to={linkFor(b)}
            aria-hidden={i >= live.length || undefined}
            tabIndex={i >= live.length ? -1 : undefined}
          >
            <img
              src={b.image}
              alt={b.alt || "Sale promotion"}
              loading="lazy"
              style={{
                "--pb-m": b.hMobile ? `${b.hMobile}px` : undefined,
                "--pb-d": b.hDesktop ? `${b.hDesktop}px` : undefined,
              }}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [featured, setFeatured] = useState(null);
  const [categories, setCategories] = useState(null);
  const { content } = useStore();

  useEffect(() => {
    api
      .products({ featured: "true", limit: 8 })
      .then((d) => setFeatured(d.items))
      .catch(() => setFeatured([]));
    api
      .categories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  // admin-managed copy (Settings → Company branding). House defaults apply
  // only before the content loads — a field saved BLANK stays hidden, so the
  // hero can run as pure film with no words at all.
  const heroEyebrow = content?.heroEyebrow ?? "Est. 1962 · BIS Hallmarked";
  const heroLine1 = content?.heroLine1 ?? "Light,";
  const heroLine2 = content?.heroLine2 ?? "Rendered";
  const heroLine3 = content?.heroLine3 ?? "Eternal.";
  const heroSub =
    content?.heroSub ??
    "Hand-set diamonds and 22K gold, priced live on today's rate and composed by our atelier — three generations in the making.";
  const anyHeadline = heroLine1 || heroLine2 || heroLine3;

  return (
    <>
      {/* --------- hero (media & words managed in Admin → Settings) */}
      <section className="hero">
        {content?.heroVideo ? (
          <video
            className="hero-img"
            src={content.heroVideo}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden
          />
        ) : Array.isArray(content?.heroSlides) && content.heroSlides.length > 0 ? (
          <HeroSlides slides={content.heroSlides} />
        ) : (
          <img className="hero-img" src={content?.heroImage || HERO_IMAGE} alt="" aria-hidden />
        )}
        <div className="container">
          <div className="hero-content">
            {heroEyebrow && <span className="eyebrow">{heroEyebrow}</span>}
            {anyHeadline && (
              <h1 className="hero-title">
                {heroLine1 && <span className="line"><span>{heroLine1}</span></span>}
                {heroLine2 && <span className="line"><span><em>{heroLine2}</em></span></span>}
                {heroLine3 && <span className="line"><span>{heroLine3}</span></span>}
              </h1>
            )}
            {heroSub && <p className="hero-sub">{heroSub}</p>}
            <div className="hero-hallmark">
              <span>BIS · HUID</span>
              <span>IGI / SGL Certified</span>
              <span>Insured Delivery</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------- category-wise sale banners (Settings → Category promotions) */}
      {Array.isArray(content?.promoBanners) && (
        <PromoMarquee
          banners={content.promoBanners}
          categoryKeys={(categories || []).map((c) => c.key)}
        />
      )}

      {/* -------------------------------------------------- categories */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Collections</span>
            <div className="section-cta">
              <Link to="/shop" className="btn btn-green">
                Discover the Collection <span className="arrow">→</span>
              </Link>
              <Link to="/shop?occasion=wedding" className="btn btn-outline">
                Bridal Edit
              </Link>
            </div>
            <h2 className="section-title">
              Shop by <em>category.</em>
            </h2>
            <p className="swipe-hint" aria-hidden>‹ swipe sideways ›</p>
          </Reveal>
          <div className="cat-grid cat-mosaic m-swipe">
            {(categories || Array.from({ length: 5 })).map((c, i) =>
              c ? (
                <Reveal key={c.key} delay={i * 0.06}>
                  <Link to={`/shop?category=${c.key}`} className="cat-card">
                    <img src={c.image} alt={c.label} loading="lazy" />
                    <span className="cat-card-label">
                      <h3>{c.label}</h3>
                      <p>{c.tagline}</p>
                    </span>
                  </Link>
                </Reveal>
              ) : (
                <div key={i} className="skeleton" style={{ aspectRatio: "4/5" }} />
              )
            )}
          </div>
          <div className="center-cta">
            <Link to="/shop" className="btn btn-green">
              View All Collections <span className="arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- best sellers */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">Best Sellers</span>
            <h2 className="section-title">
              Coveted by <em>our clientele.</em>
            </h2>
          </Reveal>
          <div className="product-grid m-swipe">
            {(featured || Array.from({ length: 4 })).map((p, i) =>
              p ? (
                <Reveal key={p.slug} delay={(i % 4) * 0.07}>
                  <ProductCard product={p} />
                </Reveal>
              ) : (
                <div key={i} className="skeleton" style={{ aspectRatio: "4/5" }} />
              )
            )}
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- maison story */}
      <section className="section stats-band" id="maison">
        <div className="container" style={{ padding: "5rem 0" }}>
          <div className="editorial">
            <Reveal className="editorial-media">
              <img src={STORY_IMAGE} alt="A solitaire ring being finished at the DP Jewellers atelier" loading="lazy" />
            </Reveal>
            <Reveal delay={0.1}>
              <span className="eyebrow left">The House</span>
              <h2>
                A century of quiet <em>obsession with light.</em>
              </h2>
              <p>
                Founded as a single counter in the old bazaar, DP Jewellers still
                sets every stone by hand. Each piece is a study in restraint —
                the last unnecessary line always removed.
              </p>
              <p>
                We publish the day's metal rate, itemise every making charge,
                and hallmark every gram. Trust, we believe, is the true luxury —
                the rest is craftsmanship.
              </p>
              <Link to="/shop" className="btn btn-maroon" style={{ marginTop: "0.8rem" }}>
                The Atelier <span className="arrow">→</span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------- testimonials */}
      <section className="section">
        <div className="container">
          <Reveal className="section-head">
            <span className="eyebrow">In Their Words</span>
            <h2 className="section-title">
              From our <em>customers.</em>
            </h2>
          </Reveal>
          <div className="testimonial-grid m-swipe" style={{ "--swipe-w": "84%" }}>
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={t.name} delay={i * 0.09}>
                <figure className="testimonial">
                  <span className="quote-mark">“</span>
                  <p>{t.quote}</p>
                  <footer>
                    <strong>{t.name}</strong>
                    {t.city}
                  </footer>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <NewsletterBand />
    </>
  );
}

function NewsletterBand() {
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { message } = await api.subscribe(email);
      setNote(message);
      setEmail("");
    } catch (err) {
      setNote(err.message);
    }
  };

  return (
    <section className="newsletter">
      <div className="container">
        <Reveal>
          <h2>
            Letters from <em>the atelier.</em>
          </h2>
          <p>Private previews, new pieces, and invitations to our salons.</p>
          <form className="newsletter-form" onSubmit={submit}>
            <input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Email address"
            />
            <button className="btn btn-light" type="submit">
              Subscribe <span className="arrow">→</span>
            </button>
          </form>
          <p className="newsletter-note">{note}</p>
        </Reveal>
      </div>
    </section>
  );
}
