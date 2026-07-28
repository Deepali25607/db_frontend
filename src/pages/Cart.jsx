import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { accountApi, api } from "../lib/api";
import { formatINR, metalLine } from "../lib/format";

export default function Cart() {
  const { cart, updateQty, removeFromCart, clearCart, config } = useStore();
  const [catalog, setCatalog] = useState(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [intent, setIntent] = useState(null); // simulated gateway modal
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState(null); // {code, discount, description}
  const [couponError, setCouponError] = useState(null);
  const [rewards, setRewards] = useState(null); // signed-in loyalty balance
  const [pointsInput, setPointsInput] = useState("");
  const [pointsToUse, setPointsToUse] = useState(0);
  const [referralInput, setReferralInput] = useState("");

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    pincode: "",
    address: "",
    pan: "",
    payMode: "upi",
    gstin: "",
  });
  const [fulfil, setFulfil] = useState({ method: "ship", store: "" });
  const [stores, setStores] = useState([]);
  const [gift, setGift] = useState({ wrap: false, message: "", hideInvoiceValue: false });

  // stores for pickup + prefill from the signed-in account
  useEffect(() => {
    if (!checkoutOpen) return;
    api.stores().then((d) => {
      setStores(d.stores);
      setFulfil((f) => (f.store ? f : { ...f, store: d.stores[0]?.key || "" }));
    }).catch(() => {});
    if (accountApi.hasToken()) {
      accountApi.me().then((me) => {
        const def = me.customer.addresses.find((a) => a.isDefault) || me.customer.addresses[0];
        setForm((f) => ({
          ...f,
          name: f.name || me.customer.name || "",
          phone: f.phone || me.customer.phone || "",
          email: f.email || me.customer.email || "",
          address: f.address || (def ? `${def.line}${def.city ? `, ${def.city}` : ""}` : ""),
          pincode: f.pincode || def?.pincode || "",
        }));
      }).catch(() => {});
    }
  }, [checkoutOpen]);

  // abandoned-cart capture (FR-CHK-10) — debounced snapshot once we can reach them
  useEffect(() => {
    if (!checkoutOpen || form.phone.length !== 10 || cart.length === 0) return;
    const t = setTimeout(() => {
      api.abandonCart({
        phone: form.phone,
        name: form.name,
        items: cart.map((l) => `${l.slug}${l.size ? ` (${l.size})` : ""} x${l.qty}`),
        value: totals ? totals.total - (coupon?.discount || 0) : 0,
      }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutOpen, form.phone, form.name, cart]);

  // DPJ Rewards balance for signed-in shoppers
  useEffect(() => {
    if (accountApi.hasToken()) accountApi.loyalty().then(setRewards).catch(() => {});
  }, []);

  // Escape closes the gateway modal (a11y) — bag stays untouched
  useEffect(() => {
    if (!intent) return;
    const onKey = (e) => e.key === "Escape" && setIntent(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [intent]);

  // Re-price the bag at current rates (BRD FR-CHK-02)
  useEffect(() => {
    api
      .products({})
      .then((d) => {
        const map = {};
        for (const p of d.items) map[p.slug] = p;
        setCatalog(map);
      })
      .catch(() => setCatalog({}));
  }, []);

  const lines = useMemo(() => {
    if (!catalog) return null;
    return cart
      .map((l) => ({ ...l, product: catalog[l.slug] }))
      .filter((l) => l.product);
  }, [cart, catalog]);

  const totals = useMemo(() => {
    if (!lines) return null;
    let metal = 0, stones = 0, making = 0, other = 0, gst = 0, total = 0;
    for (const l of lines) {
      const p = l.product.price;
      metal += p.metalValue * l.qty;
      stones += p.stoneValue * l.qty;
      making += p.makingCharges * l.qty;
      other += p.otherCharges * l.qty;
      gst += p.gst * l.qty;
      total += p.total * l.qty;
    }
    return { metal, stones, making, other, gst, total };
  }, [lines]);

  const discount = coupon?.discount || 0;
  // Order thresholds (admin Settings) — mirrored client-side to gate checkout
  const itemCount = lines ? lines.reduce((s, l) => s + l.qty, 0) : 0;
  const belowMinValue = totals && config?.minOrderValue > 0 && totals.total < config.minOrderValue;
  const belowMinQty = lines && config?.minOrderQty > 1 && itemCount < config.minOrderQty;
  // Points cover at most 25% of the bag after coupons (server re-validates).
  const pointsCap = totals ? Math.floor(((totals.total - discount) * 25) / 100) : 0;
  const pointsValue = Math.min(pointsToUse, pointsCap, rewards?.points || 0);
  const payable = totals ? totals.total - discount - pointsValue : 0;
  const needsPan = totals && config && payable >= config.panThreshold;
  const codBlocked =
    totals && config && form.payMode === "cod" && payable > config.codCeiling;

  const applyCoupon = async (e) => {
    e.preventDefault();
    setCouponError(null);
    try {
      const res = await api.validateCoupon(
        couponInput,
        cart.map(({ slug, qty }) => ({ slug, qty }))
      );
      setCoupon(res);
      setCouponInput("");
    } catch (err) {
      setCouponError(err.message);
    }
  };

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Delivery-area check (admin Settings): active when a firm location is set
  const radiusActive =
    config?.deliveryLat != null && config?.deliveryLng != null && config?.deliveryRadiusKm > 0;

  const captureLocation = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation)
        return reject(new Error("This browser can't share a location — choose store pickup instead."));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () =>
          reject(
            new Error(
              `We deliver within ${config.deliveryRadiusKm} km of our showroom — allow location access to continue, or choose store pickup.`
            )
          ),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
      );
    });

  const orderPayload = (location) => ({
    location: location || undefined,
    items: cart.map(({ slug, size, qty, engraving }) => ({ slug, size, qty, engraving })),
    coupon: coupon?.code || undefined,
    redeemPoints: pointsValue > 0 ? pointsValue : undefined,
    referralCode: referralInput.trim() || undefined,
    fulfilment: fulfil.method === "pickup" ? { method: "pickup", store: fulfil.store } : { method: "ship" },
    gift: gift.wrap ? gift : undefined,
    gstin: form.gstin || undefined,
    customer: {
      name: form.name,
      phone: form.phone,
      email: form.email,
      address: form.address,
      pincode: form.pincode,
      pan: form.pan,
    },
    payment: { mode: form.payMode },
  });

  // Live Razorpay Checkout (activates when the server has keys): loads the
  // official script on demand and resolves with the payment credentials.
  const openRazorpay = (created) =>
    new Promise((resolve, reject) => {
      const launch = () => {
        const rzp = new window.Razorpay({
          key: created.keyId,
          order_id: created.gatewayOrderId,
          amount: Math.round(created.amount * 100),
          currency: "INR",
          name: "DP Jewellers",
          description: "Fine jewellery",
          prefill: { name: form.name, contact: form.phone, email: form.email },
          theme: { color: "#5a0e1a" },
          handler: resolve,
          modal: { ondismiss: () => reject(new Error("Payment window closed — your bag is untouched.")) },
        });
        rzp.open();
      };
      if (window.Razorpay) return launch();
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = launch;
      s.onerror = () => reject(new Error("Could not load the payment gateway — please retry."));
      document.body.appendChild(s);
    });

  const placeOrder = async (e) => {
    e.preventDefault();
    setError(null);
    if (codBlocked) {
      setError(
        `Cash on delivery is available up to ${formatINR(config.codCeiling)}. Please choose an online payment mode.`
      );
      return;
    }
    setPlacing(true);
    try {
      let location;
      if (radiusActive && fulfil.method !== "pickup") location = await captureLocation();
      if (form.payMode === "cod") {
        const res = await api.placeOrder(orderPayload(location));
        setSuccess(res);
        clearCart();
      } else {
        const created = await api.createIntent(orderPayload(location));
        if (created.gateway === "razorpay") {
          // real gateway — signature comes back from Checkout, server verifies
          const resp = await openRazorpay(created);
          const res = await api.confirmPayment(created.intentId, {
            razorpayPaymentId: resp.razorpay_payment_id,
            razorpaySignature: resp.razorpay_signature,
          });
          setSuccess(res);
          clearCart();
        } else {
          setIntent(created); // keyless demo — simulated modal
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  const resolvePayment = async (outcome) => {
    if (!intent) return;
    setPlacing(true);
    try {
      const res = await api.confirmPayment(intent.intentId, outcome);
      setIntent(null);
      setSuccess(res);
      clearCart();
    } catch (err) {
      // Failed payment: bag is preserved for retry (BRD FR-PAY-05)
      setIntent(null);
      setError(err.message);
    } finally {
      setPlacing(false);
    }
  };

  if (success) {
    return (
      <div className="container order-success">
        <div className="tick">✓</div>
        <h1>
          Thank you — it's <em>yours.</em>
        </h1>
        <p className="order-id">Order {success.orderId}</p>
        <p>
          Confirmation is on its way by SMS, email and WhatsApp. Your piece
          ships fully insured with OTP-verified delivery in about{" "}
          {success.etaDays} days.
        </p>
        <p className="muted" style={{ fontSize: "0.86rem" }}>
          Amount payable: {formatINR(success.total)} · GST invoice with HUID
          details will accompany the shipment.
        </p>
        <div style={{ display: "flex", gap: "0.8rem", justifyContent: "center", marginTop: "1.6rem", flexWrap: "wrap" }}>
          <Link to="/track" className="btn btn-outline">
            Track this order
          </Link>
          <Link to="/shop" className="btn btn-maroon">
            Continue browsing
          </Link>
        </div>
      </div>
    );
  }

  if (lines && lines.length === 0) {
    return (
      <div className="container empty-state" style={{ padding: "7rem 0" }}>
        <h3>Your bag is empty</h3>
        <p>The vault, however, is full.</p>
        <Link to="/shop" className="btn btn-maroon" style={{ marginTop: "1.4rem" }}>
          Discover the collection
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Your Selection</span>
          <h1>
            The <em>bag.</em>
          </h1>
          <p>
            Prices are re-validated at today's metal rate before payment · lock
            holds {config?.priceLockMinutes ?? 30} minutes
          </p>
        </div>
      </div>

      <div className="container cart-layout">
        <div className="cart-lines">
          {(lines || Array.from({ length: 2 })).map((l, i) =>
            l ? (
              <div className="cart-line" key={`${l.slug}-${l.size}-${l.engraving || ""}`}>
                <Link to={`/product/${l.slug}`}>
                  <img src={l.product.images[0]} alt={l.product.name} />
                </Link>
                <div>
                  <h3>
                    <Link to={`/product/${l.slug}`}>{l.product.name}</Link>
                  </h3>
                  <p className="meta">
                    {metalLine(l.product)}
                    {l.size ? ` · ${l.product.sizeLabel}: ${l.size}` : ""}
                    {l.engraving ? ` · engraved “${l.engraving}”` : ""}
                  </p>
                  <div className="qty-stepper">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => updateQty(l.slug, l.size, l.qty - 1, l.engraving || null)}
                    >
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => updateQty(l.slug, l.size, l.qty + 1, l.engraving || null)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="line-right">
                  <span className="line-price">
                    {formatINR(l.product.price.total * l.qty)}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(l.slug, l.size, l.engraving || null)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div key={i} className="skeleton" style={{ height: 150 }} />
            )
          )}
        </div>

        <aside className="summary-card">
          <h3>Order summary</h3>
          {totals && (
            <>
              <div className="summary-row">
                <span>Metal value</span>
                <span>{formatINR(totals.metal)}</span>
              </div>
              {totals.stones > 0 && (
                <div className="summary-row">
                  <span>Stone value</span>
                  <span>{formatINR(totals.stones)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>Making charges</span>
                <span>{formatINR(totals.making)}</span>
              </div>
              {totals.other > 0 && (
                <div className="summary-row">
                  <span>Hallmarking & certification</span>
                  <span>{formatINR(totals.other)}</span>
                </div>
              )}
              <div className="summary-row">
                <span>GST</span>
                <span>{formatINR(totals.gst)}</span>
              </div>
              <div className="summary-row">
                <span>Insured shipping</span>
                <span>Free</span>
              </div>
              {coupon && (
                <div className="summary-row" style={{ color: "var(--green)" }}>
                  <span>
                    Coupon {coupon.code}{" "}
                    <button
                      className="remove-btn"
                      style={{ marginLeft: "0.4rem" }}
                      onClick={() => setCoupon(null)}
                    >
                      remove
                    </button>
                  </span>
                  <span>− {formatINR(coupon.discount)}</span>
                </div>
              )}
              {pointsValue > 0 && (
                <div className="summary-row" style={{ color: "var(--green)" }}>
                  <span>
                    DPJ points ({pointsValue}){" "}
                    <button
                      className="remove-btn"
                      style={{ marginLeft: "0.4rem" }}
                      onClick={() => { setPointsToUse(0); setPointsInput(""); }}
                    >
                      remove
                    </button>
                  </span>
                  <span>− {formatINR(pointsValue)}</span>
                </div>
              )}
              <div className="summary-row total">
                <span>Total</span>
                <span>{formatINR(payable)}</span>
              </div>
            </>
          )}

          {!coupon && (
            <form className="pin-form" onSubmit={applyCoupon} style={{ marginTop: "1rem" }}>
              <input
                placeholder="Coupon code (try WELCOME10)"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                aria-label="Coupon code"
              />
              <button className="btn btn-green" type="submit" disabled={!couponInput.trim()}>
                Apply
              </button>
            </form>
          )}
          {couponError && (
            <p className="form-error" style={{ marginTop: "0.7rem" }}>{couponError}</p>
          )}
          {coupon?.description && (
            <p className="admin-note" style={{ marginTop: "0.7rem", marginBottom: 0 }}>
              {coupon.description}
            </p>
          )}

          {rewards && rewards.points > 0 && pointsValue === 0 && (
            <form
              className="pin-form"
              style={{ marginTop: "0.8rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                setPointsToUse(Math.floor(Number(pointsInput)) || 0);
              }}
            >
              <input
                inputMode="numeric"
                placeholder={`Use points — ${Math.min(rewards.points, pointsCap)} available`}
                value={pointsInput}
                onChange={(e) => setPointsInput(e.target.value.replace(/\D/g, ""))}
                aria-label="Points to redeem"
              />
              <button className="btn btn-green" type="submit" disabled={!pointsInput}>
                Redeem
              </button>
            </form>
          )}

          {(!rewards || rewards.lifetimeSpend === 0) && (
            <div style={{ marginTop: "0.8rem" }}>
              <input
                placeholder="Referral code? First order gets ₹500 off"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                aria-label="Referral code"
                style={{ width: "100%", padding: "0.65rem 0.9rem", borderRadius: 10, border: "1px solid var(--line)", background: "var(--cream)", fontSize: "0.88rem" }}
              />
            </div>
          )}

          <p className="summary-note">
            Fully insured transit · OTP-verified delivery · 15-day returns on
            ready pieces
          </p>

          {!checkoutOpen ? (
            <>
              {belowMinValue && (
                <p className="form-error" style={{ marginBottom: "0.7rem" }}>
                  Minimum order value is {formatINR(config.minOrderValue)} — add{" "}
                  {formatINR(config.minOrderValue - totals.total)} more to check out.
                </p>
              )}
              {belowMinQty && (
                <p className="form-error" style={{ marginBottom: "0.7rem" }}>
                  Orders need at least {config.minOrderQty} items — this bag has {itemCount}.
                </p>
              )}
              <button
                className="btn btn-maroon"
                disabled={belowMinValue || belowMinQty}
                onClick={() => setCheckoutOpen(true)}
              >
                Proceed to checkout
              </button>
            </>
          ) : (
            <form className="checkout-form" onSubmit={placeOrder}>
              <div className="field">
                <label htmlFor="co-name">Full name</label>
                <input id="co-name" required value={form.name} onChange={setField("name")} />
              </div>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="co-phone">Mobile</label>
                  <input
                    id="co-phone"
                    required
                    inputMode="numeric"
                    placeholder="10-digit mobile"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        phone: e.target.value.replace(/\D/g, "").slice(0, 10),
                      }))
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="co-pin">PIN code</label>
                  <input
                    id="co-pin"
                    required
                    inputMode="numeric"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        pincode: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="co-email">Email</label>
                <input id="co-email" type="email" value={form.email} onChange={setField("email")} />
              </div>
              {/* fulfilment: ship or store pickup (FR-CHK-11) */}
              <div className="pay-modes">
                <label className={`pay-mode ${fulfil.method === "ship" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="fulfil"
                    checked={fulfil.method === "ship"}
                    onChange={() => setFulfil((f) => ({ ...f, method: "ship" }))}
                  />
                  Insured home delivery
                  <span className="sub">Free · OTP-verified</span>
                </label>
                <label className={`pay-mode ${fulfil.method === "pickup" ? "active" : ""}`}>
                  <input
                    type="radio"
                    name="fulfil"
                    checked={fulfil.method === "pickup"}
                    onChange={() => setFulfil((f) => ({ ...f, method: "pickup" }))}
                  />
                  Pick up at a showroom
                  <span className="sub">Try before you take it</span>
                </label>
              </div>
              {fulfil.method === "pickup" ? (
                <div className="field">
                  <label htmlFor="co-store">Showroom</label>
                  <select
                    id="co-store"
                    value={fulfil.store}
                    onChange={(e) => setFulfil((f) => ({ ...f, store: e.target.value }))}
                  >
                    {stores.map((s) => (
                      <option key={s.key} value={s.key}>{s.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="co-address">Delivery address</label>
                  <textarea id="co-address" required rows={3} value={form.address} onChange={setField("address")} />
                </div>
              )}

              {/* gift options (FR-CHK-05) */}
              <label className="filter-option">
                <input
                  type="checkbox"
                  checked={gift.wrap}
                  onChange={(e) => setGift((g) => ({ ...g, wrap: e.target.checked }))}
                />
                This is a gift — wrap it beautifully (complimentary)
              </label>
              {gift.wrap && (
                <>
                  <div className="field">
                    <label htmlFor="co-gift-msg">Gift message (optional)</label>
                    <textarea
                      id="co-gift-msg"
                      rows={2}
                      maxLength={200}
                      value={gift.message}
                      onChange={(e) => setGift((g) => ({ ...g, message: e.target.value }))}
                    />
                  </div>
                  <label className="filter-option">
                    <input
                      type="checkbox"
                      checked={gift.hideInvoiceValue}
                      onChange={(e) => setGift((g) => ({ ...g, hideInvoiceValue: e.target.checked }))}
                    />
                    Hide the price on the packing slip (GST invoice emails to you)
                  </label>
                </>
              )}

              {/* GSTIN for business purchases (FR-CHK-07) */}
              <div className="field">
                <label htmlFor="co-gstin">GSTIN — business purchase (optional)</label>
                <input
                  id="co-gstin"
                  placeholder="23ABCDE1234F1Z5"
                  maxLength={15}
                  style={{ textTransform: "uppercase" }}
                  value={form.gstin}
                  onChange={setField("gstin")}
                />
              </div>

              {needsPan && (
                <div className="field">
                  <label htmlFor="co-pan">
                    PAN (required above {formatINR(config.panThreshold)})
                  </label>
                  <input
                    id="co-pan"
                    required
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    style={{ textTransform: "uppercase" }}
                    value={form.pan}
                    onChange={setField("pan")}
                  />
                </div>
              )}

              <div className="pay-modes">
                {[
                  ["upi", "UPI", "Instant"],
                  ["card", "Credit / Debit card", "EMI available"],
                  ["netbanking", "Net banking", ""],
                  [
                    "cod",
                    "Cash on delivery",
                    config ? `Up to ${formatINR(config.codCeiling)}` : "",
                  ],
                ].map(([mode, label, sub]) => (
                  <label
                    key={mode}
                    className={`pay-mode ${form.payMode === mode ? "active" : ""}`}
                  >
                    <input
                      type="radio"
                      name="payMode"
                      value={mode}
                      checked={form.payMode === mode}
                      onChange={setField("payMode")}
                    />
                    {label}
                    {sub && <span className="sub">{sub}</span>}
                  </label>
                ))}
              </div>

              {codBlocked && (
                <p className="form-error">
                  This order exceeds the cash-on-delivery limit of{" "}
                  {formatINR(config.codCeiling)} — please pick an online mode.
                </p>
              )}
              {error && <p className="form-error">{error}</p>}

              <button className="btn btn-maroon" type="submit" disabled={placing}>
                {placing ? "Placing order…" : `Place order · ${totals ? formatINR(payable) : ""}`}
              </button>
            </form>
          )}
        </aside>
      </div>

      {/* simulated payment gateway */}
      {intent && (
        <div className="modal-backdrop">
          <div className="modal gateway" role="dialog" aria-label="Payment">
            <p className="gateway-brand">{intent.gateway}</p>
            <h3 style={{ fontSize: "2rem" }}>{formatINR(intent.amount)}</h3>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              Paying DP Jewellers via{" "}
              {intent.mode === "upi" ? "UPI" : intent.mode === "card" ? "card" : "net banking"} ·
              ref {intent.intentId}
            </p>
            {intent.lockedUntil && (
              <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.4rem" }}>
                Price locked at today's rate until{" "}
                {new Date(intent.lockedUntil).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                ({intent.priceLockMinutes} min)
              </p>
            )}
            <div style={{ display: "grid", gap: "0.7rem", marginTop: "1.6rem" }}>
              <button
                className="btn btn-green"
                disabled={placing}
                onClick={() => resolvePayment("success")}
              >
                {placing ? "Processing…" : "Pay now (simulate success)"}
              </button>
              <button
                className="btn btn-outline"
                disabled={placing}
                onClick={() => resolvePayment("failure")}
              >
                Simulate a failed payment
              </button>
              <button
                className="remove-btn"
                style={{ margin: "0.4rem auto 0" }}
                onClick={() => setIntent(null)}
              >
                Cancel and return to bag
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
