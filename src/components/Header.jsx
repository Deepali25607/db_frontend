import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, MoonIcon, SearchIcon, SunIcon, UserIcon } from "./Icons";

function RateTicker() {
  const { rates } = useStore();
  if (!rates) return null;

  const entries = [
    ["Gold 24K", rates.rates.gold["24K"]],
    ["Gold 22K", rates.rates.gold["22K"]],
    ["Gold 18K", rates.rates.gold["18K"]],
    ["Silver 925", rates.rates.silver["925"]],
    ["Platinum PT950", rates.rates.platinum.PT950],
  ];

  const items = entries.map(([label, v]) => `${label} ${formatINR(v)}/g`);
  const line = [...items, "BIS Hallmarked · HUID on every piece", "Insured shipping across India", "Lifetime exchange"];

  return (
    <div className="ticker" aria-label="Today's metal rates">
      <div className="ticker-track">
        {[0, 1].map((copy) => (
          <span key={copy} aria-hidden={copy === 1}>
            {line.map((text, i) => (
              <span key={i}>
                {text}
                <span className="sep">&nbsp;&nbsp;✦&nbsp;&nbsp;</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}

/* Category mega-menu (desktop): a dark band under the header — every
   category opens a panel of popular styles, price ranges, metals with live
   "starting at" prices, and a visual card. Data comes from /api/menu,
   computed on the day's rates with current discounts. */
const OCC_LABELS = {
  wedding: "Wedding", festive: "Festive", daily: "Everyday",
  party: "Party", office: "Office wear", gifting: "Gifting",
};
const METAL_LABELS = { gold: "Gold", silver: "Silver", platinum: "Platinum" };
const PRICE_BANDS = [
  { label: "Below ₹25,000", max: 25000 },
  { label: "₹25,000 – ₹50,000", min: 25000, max: 50000 },
  { label: "₹50,000 – ₹1,00,000", min: 50000, max: 100000 },
  { label: "₹1,00,000 – ₹2,50,000", min: 100000, max: 250000 },
  { label: "₹2,50,000 & above", min: 250000 },
];

function MegaMenu({ menu }) {
  if (menu.length === 0) return null;
  return (
    <nav className="mega-band" aria-label="Shop by category">
      <div className="container mega-items">
        {menu.map((m) => (
          <div key={m.key} className="mega-item">
            <Link to={`/shop?category=${m.key}`} className="mega-top">
              {m.label} <span aria-hidden>▾</span>
            </Link>
            <div className="mega-panel">
              <div className="container mega-cols">
                <div className="mega-col">
                  <h5>Popular {m.label.toLowerCase()} styles</h5>
                  {m.occasions.map((o) => (
                    <Link key={o.key} to={`/shop?category=${m.key}&occasion=${o.key}`}>
                      {OCC_LABELS[o.key] || o.key.charAt(0).toUpperCase() + o.key.slice(1)}
                      <small>{o.count}</small>
                    </Link>
                  ))}
                  <Link to={`/shop?category=${m.key}`} className="mega-view-all">
                    View all {m.count} {m.label.toLowerCase()} design{m.count === 1 ? "" : "s"}
                  </Link>
                </div>
                <div className="mega-col">
                  <h5>By price range</h5>
                  {PRICE_BANDS.map((b) => (
                    <Link
                      key={b.label}
                      to={`/shop?category=${m.key}${b.min ? `&minPrice=${b.min}` : ""}${b.max ? `&maxPrice=${b.max}` : ""}`}
                    >
                      {b.label}
                    </Link>
                  ))}
                </div>
                <div className="mega-col">
                  <h5>By metal &amp; purity</h5>
                  {m.metals.map((x) => (
                    <Link key={x.type} to={`/shop?category=${m.key}&metal=${x.type}`}>
                      {METAL_LABELS[x.type] || x.type}
                      <small>from {formatINR(x.from)}</small>
                    </Link>
                  ))}
                  {m.purities.map((x) => (
                    <Link key={x.purity} to={`/shop?category=${m.key}&purity=${encodeURIComponent(x.purity)}`}>
                      {x.purity} pieces
                      <small>from {formatINR(x.from)}</small>
                    </Link>
                  ))}
                </div>
                <div className="mega-col mega-visual">
                  <img src={m.image} alt={m.label} loading="lazy" />
                  <p className="muted">{m.tagline}</p>
                  <Link to="/appointments" className="link-underline">
                    Book a try-on at a showroom →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </nav>
  );
}

// fallback while /api/content loads — mirrors DEFAULT_CONTENT.navLinks
const DEFAULT_NAV = [
  { label: "Home", path: "/" },
  { label: "Shop", path: "/shop" },
  { label: "Gold Scheme", path: "/gold-scheme" },
  { label: "Custom", path: "/custom" },
  { label: "The House", path: "/#maison" },
];

export default function Header() {
  const { cartCount, wishlist, setSearchOpen, content, dark, toggleDark } = useStore();
  const brandName = content?.companyName || "DP Jewellers";
  const brandTagline = content?.companyTagline || "Fine Jewellery";
  const navLinks =
    Array.isArray(content?.navLinks) && content.navLinks.length > 0
      ? content.navLinks
      : DEFAULT_NAV;
  const headerBg = (content?.headerBgImage || "").trim();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [megaMenu, setMegaMenu] = useState([]);

  useEffect(() => {
    api.menu().then((d) => setMegaMenu(d.menu)).catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLink = ({ isActive }) => (isActive ? "active" : undefined);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <RateTicker />
      <header
        className={`site-header ${scrolled ? "scrolled" : ""}`}
        style={
          headerBg
            ? { background: `linear-gradient(var(--bg-wash), var(--bg-wash)), url("${headerBg}") center/cover` }
            : undefined
        }
      >
        <div className="container header-inner">
          <button
            className="icon-btn menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <nav className={`nav-main ${menuOpen ? "open" : ""}`} onClick={closeMenu}>
            {navLinks.map((l) =>
              /^https?:\/\//i.test(l.path) ? (
                <a key={`${l.label}-${l.path}`} href={l.path} target="_blank" rel="noreferrer">
                  {l.label}
                </a>
              ) : l.path.includes("#") ? (
                <NavLink key={`${l.label}-${l.path}`} to={l.path} className={() => undefined}>
                  {l.label}
                </NavLink>
              ) : (
                <NavLink
                  key={`${l.label}-${l.path}`}
                  to={l.path}
                  end={l.path === "/"}
                  className={navLink}
                >
                  {l.label}
                </NavLink>
              )
            )}
          </nav>

          <Link to="/" className="logo" aria-label={`${brandName} home`}>
            {brandName}
            <small>{brandTagline}</small>
          </Link>

          <div className="header-actions">
            <button
              className="icon-btn"
              aria-label={dark ? "Switch to light look" : "Switch to dark look"}
              aria-pressed={dark}
              title={dark ? "Light look" : "Dark look"}
              onClick={toggleDark}
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              className="icon-btn"
              aria-label="Search"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon />
            </button>
            <Link to="/account" className="icon-btn" aria-label="My account">
              <UserIcon />
            </Link>
            <Link to="/wishlist" className="icon-btn" aria-label="Wishlist">
              <HeartIcon />
              {wishlist.length > 0 && <span className="badge">{wishlist.length}</span>}
            </Link>
            <Link to="/cart" className="icon-btn" aria-label="Shopping bag">
              <BagIcon />
              {cartCount > 0 && <span className="badge">{cartCount}</span>}
            </Link>
          </div>
        </div>
        <MegaMenu menu={megaMenu} />
      </header>
    </>
  );
}
