import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { formatINR } from "../lib/format";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";

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

export default function Header() {
  const { cartCount, wishlist, setSearchOpen, content } = useStore();
  const brandName = content?.companyName || "DP Jewellers";
  const brandTagline = content?.companyTagline || "Fine Jewellery";
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      <header className={`site-header ${scrolled ? "scrolled" : ""}`}>
        <div className="container header-inner">
          <button
            className="icon-btn menu-toggle"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <CloseIcon /> : <MenuIcon />}
          </button>

          <nav className={`nav-main ${menuOpen ? "open" : ""}`} onClick={closeMenu}>
            <NavLink to="/" end className={navLink}>
              Home
            </NavLink>
            <NavLink to="/shop" className={navLink}>
              Shop
            </NavLink>
            <NavLink to="/gold-scheme" className={navLink}>
              Gold Scheme
            </NavLink>
            <NavLink to="/custom" className={navLink}>
              Custom
            </NavLink>
            <NavLink to="/#maison" className={() => undefined}>
              The House
            </NavLink>
          </nav>

          <Link to="/" className="logo" aria-label={`${brandName} home`}>
            {brandName}
            <small>{brandTagline}</small>
          </Link>

          <div className="header-actions">
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
      </header>
    </>
  );
}
