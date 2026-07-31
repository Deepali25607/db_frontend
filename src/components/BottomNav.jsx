import { NavLink, useLocation } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { BagIcon, GemIcon, HeartIcon, HomeIcon, UserIcon } from "./Icons";

// App-style bottom bar for small screens — the storefront's main stops always
// one thumb-tap away, Android bottom-navigation fashion. Hidden on desktop
// and in the back office (CSS shows it under 860px only).
export default function BottomNav() {
  const { cartCount, wishlist } = useStore();
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin")) return null;

  const items = [
    { label: "Home", path: "/", icon: <HomeIcon /> },
    { label: "Shop", path: "/shop", icon: <GemIcon /> },
    { label: "Wishlist", path: "/wishlist", icon: <HeartIcon />, count: wishlist.length },
    { label: "Bag", path: "/cart", icon: <BagIcon />, count: cartCount },
    { label: "Account", path: "/account", icon: <UserIcon /> },
  ];

  return (
    <nav className="bottom-nav no-print" aria-label="Quick navigation">
      {items.map((it) => (
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
      ))}
    </nav>
  );
}
