import { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import Footer from "./components/Footer";
import Header from "./components/Header";
import HelpWidget from "./components/HelpWidget";
import SearchOverlay from "./components/SearchOverlay";
import { useStore } from "./context/StoreContext";

export default function App() {
  const { toast } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, location.hash]);

  return (
    <>
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />
      <main id="main" className="page" key={location.pathname + location.search}>
        <Suspense
          fallback={
            <div className="container" style={{ padding: "4rem 0" }}>
              <div className="skeleton" style={{ height: 360 }} />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
      <HelpWidget />
      <SearchOverlay />
      {toast && <div className="toast" role="status">{toast}</div>}
    </>
  );
}
