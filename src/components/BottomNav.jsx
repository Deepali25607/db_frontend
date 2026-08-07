import { NavLink, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BagIcon, GemIcon, HomeIcon, SearchIcon, UserIcon } from "./Icons";

// App-style floating pill for small screens — the storefront's main stops
// always one thumb-tap away, native-app fashion. Hidden on desktop and in
// the back office (CSS shows it under 860px only).
export default function BottomNav() {
  const { cartCount, setSearchOpen } = useStore();
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;

  const links = [
    { label: "Home", path: "/", icon: <HomeIcon /> },
    { label: "Shop", path: "/shop", icon: <GemIcon /> },
  ];
  const after = [
    { label: "Bag", path: "/cart", icon: <BagIcon />, count: cartCount },
    { label: "Account", path: "/account", icon: <UserIcon /> },
  ];

  const item = (it) => (
    <NavLink
      key={it.path}
      to={it.path}
      end={it.path === "/"}
      className={({ isActive }) => `bn-item ${isActive ? "active" : ""}`}
    >
      <span className="bn-ico">
        {it.icon}
        {it.count > 0 && <span className="badge">{it.count}</span>}
      </span>
      {it.label}
    </NavLink>
  );

  return (
    <nav className="bottom-nav no-print" aria-label="Quick navigation">
      {links.map(item)}
      <button className="bn-item" onClick={() => setSearchOpen(true)}>
        <span className="bn-ico">
          <SearchIcon />
        </span>
        Search
      </button>
      {after.map(item)}
    </nav>
  );
}
