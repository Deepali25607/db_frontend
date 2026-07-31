import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api } from "../lib/api";
import { useLiveRefresh } from "../lib/useLiveRefresh";

const StoreContext = createContext(null);

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }) {
  const [cart, setCart] = useState(() => readStorage("dpj_cart", []));
  const [wishlist, setWishlist] = useState(() => readStorage("dpj_wish", []));
  // price at the moment of wishlisting — powers price-drop badges (FR-ACC-06)
  const [wishPrices, setWishPrices] = useState(() => readStorage("dpj_wish_prices", {}));
  const [rates, setRates] = useState(null);
  const [config, setConfig] = useState(null);
  const [content, setContent] = useState(null);
  const [toast, setToast] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem("dpj_cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("dpj_wish", JSON.stringify(wishlist));
  }, [wishlist]);

  useEffect(() => {
    localStorage.setItem("dpj_wish_prices", JSON.stringify(wishPrices));
  }, [wishPrices]);

  useEffect(() => {
    api.rates().then(setRates).catch(() => {});
    api.config().then(setConfig).catch(() => {});
    api.content().then(setContent).catch(() => {});
  }, []);

  // keep the rate ticker and admin-managed copy in step with the back office
  useLiveRefresh(() => {
    api.rates().then(setRates).catch(() => {});
    api.content().then(setContent).catch(() => {});
  }, []);

  // Appearance (admin-managed): the theme swaps background tokens site-wide
  useEffect(() => {
    const theme = content?.theme || "heritage";
    if (theme === "heritage") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [content?.theme]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  const sameLine = (l, slug, size, engraving) =>
    l.slug === slug && (l.size || null) === (size || null) && (l.engraving || null) === (engraving || null);

  const addToCart = useCallback(
    (slug, size = null, qty = 1, engraving = null) => {
      setCart((prev) => {
        const found = prev.find((l) => sameLine(l, slug, size, engraving));
        if (found) {
          return prev.map((l) =>
            l === found ? { ...l, qty: Math.min(5, l.qty + qty) } : l
          );
        }
        return [...prev, { slug, size, qty, engraving }];
      });
      showToast("Added to your bag");
    },
    [showToast]
  );

  const updateQty = useCallback((slug, size, qty, engraving = null) => {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => !sameLine(l, slug, size, engraving))
        : prev.map((l) =>
            sameLine(l, slug, size, engraving) ? { ...l, qty: Math.min(5, qty) } : l
          )
    );
  }, []);

  const removeFromCart = useCallback((slug, size, engraving = null) => {
    setCart((prev) => prev.filter((l) => !sameLine(l, slug, size, engraving)));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    (slug, priceNow = null) => {
      setWishlist((prev) => {
        const has = prev.includes(slug);
        showToast(has ? "Removed from wishlist" : "Saved to wishlist");
        setWishPrices((prices) => {
          const next = { ...prices };
          if (has) delete next[slug];
          else if (priceNow) next[slug] = priceNow;
          return next;
        });
        return has ? prev.filter((s) => s !== slug) : [...prev, slug];
      });
    },
    [showToast]
  );

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      wishPrices,
      rates,
      config,
      content,
      toast,
      searchOpen,
      setSearchOpen,
      cartCount: cart.reduce((n, l) => n + l.qty, 0),
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      showToast,
    }),
    [
      cart,
      wishlist,
      wishPrices,
      rates,
      config,
      content,
      toast,
      searchOpen,
      addToCart,
      updateQty,
      removeFromCart,
      clearCart,
      toggleWishlist,
      showToast,
    ]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}
