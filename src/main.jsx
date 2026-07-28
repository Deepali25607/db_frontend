import { StrictMode, lazy } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { StoreProvider } from "./context/StoreContext.jsx";
import Home from "./pages/Home.jsx"; // eager — instant first paint on the landing page

// Everything else is code-split: each page loads on first visit (App
// provides the Suspense fallback). Admin alone is ~a third of the app.
const Shop = lazy(() => import("./pages/Shop.jsx"));
const Product = lazy(() => import("./pages/Product.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Track = lazy(() => import("./pages/Track.jsx"));
const Invoice = lazy(() => import("./pages/Invoice.jsx"));
const PackingSlip = lazy(() => import("./pages/PackingSlip.jsx"));
const GoldScheme = lazy(() => import("./pages/GoldScheme.jsx"));
const Appointments = lazy(() => import("./pages/Appointments.jsx"));
const OldGold = lazy(() => import("./pages/OldGold.jsx"));
const Custom = lazy(() => import("./pages/Custom.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const Guides = lazy(() => import("./pages/Guides.jsx"));
const Stores = lazy(() => import("./pages/Stores.jsx"));
const Policies = lazy(() => import("./pages/Policies.jsx"));
const Admin = lazy(() => import("./pages/Admin.jsx"));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "shop", element: <Shop /> },
      { path: "product/:slug", element: <Product /> },
      { path: "cart", element: <Cart /> },
      { path: "wishlist", element: <Wishlist /> },
      { path: "track", element: <Track /> },
      { path: "invoice/:orderId", element: <Invoice /> },
      { path: "packing-slip/:orderId", element: <PackingSlip /> },
      { path: "gold-scheme", element: <GoldScheme /> },
      { path: "appointments", element: <Appointments /> },
      { path: "old-gold", element: <OldGold /> },
      { path: "custom", element: <Custom /> },
      { path: "account", element: <Account /> },
      { path: "guides", element: <Guides /> },
      { path: "stores", element: <Stores /> },
      { path: "policies", element: <Policies /> },
      { path: "admin", element: <Admin /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </StrictMode>
);

// PWA: offline shell + asset cache (production builds only; /api stays live).
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
