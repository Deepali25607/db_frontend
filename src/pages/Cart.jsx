import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { accountApi, api } from "../lib/api";
import { formatINR, metalLine } from "../lib/format";

// a customised or sized line prices differently from the catalogue entry —
// this key identifies its exact configuration
const lineKey = (l) =>
  `${l.slug}|${l.size || ""}|${l.custom?.purity || ""}|${l.custom?.quality || ""}`;

export default function Cart() {
  const { cart, updateQty, removeFromCart, clearCart, config } = useStore();
  const [catalog, setCatalog] = useState(null);
  const [quotes, setQuotes] = useState({}); // lineKey → server quote
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
      .filter((l) => l.product)
      .map((l) => ({ ...l, quote: quotes[lineKey(l)] || null }));
  }, [cart, catalog, quotes]);

  // customised / sized lines are re-priced by the server (same engine that
  // will bill the order) — the catalogue price only covers the stock piece
  useEffect(() => {
    for (const l of cart) {
      if (!l.custom && !l.size) continue;
      const key = lineKey(l);
      if (quotes[key]) continue;
      api
        .productQuote(l.slug, {
          purity: l.custom?.purity,
          quality: l.custom?.quality,
          size: l.size,
        })
        .then((q) => setQuotes((prev) => ({ ...prev, [key]: q })))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cart]);

  const totals = useMemo(() => {
    if (!lines) return null;
    let metal = 0, stones = 0, making = 0, other = 0, gst = 0, total = 0;
    for (const l of lines) {
      const p = l.quote?.price || l.product.price;
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
    items: cart.map(({ slug, size, qty, engraving, custom }) => ({
      slug, size, qty, engraving,
      purity: custom?.purity || undefined,
      quality: custom?.quality || undefined,
    })),
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
        <p className="muted" style={{ fontSize: "0.86rem" }}>
          Your details are saved to your DP Jewellers account — sign in anytime
          with just your mobile number to see orders, returns and rewards.
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
              <div className="cart-line" key={lineKey(l) + (l.engraving || "")}>
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
                  {l.quote?.note && (
                    <p className="meta cart-variant">Customised: {l.quote.note}</p>
                  )}
                  <div className="qty-stepper">
                    <button
                      aria-label="Decrease quantity"
                      onClick={() => updateQty(l.slug, l.size, l.qty - 1, l.engraving || null, l.custom || null)}
                    >
                      −
                    </button>
                    <span>{l.qty}</span>
                    <button
                      aria-label="Increase quantity"
                      onClick={() => updateQty(l.slug, l.size, l.qty + 1, l.engraving || null, l.custom || null)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="line-right">
                  <span className="line-price">
                    {formatINR((l.quote?.price || l.product.price).total * l.qty)}
                  </span>
                  <button
                    className="remove-btn"
                    onClick={() => removeFromCart(l.slug, l.size, l.engraving || null, l.custom || null)}
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
        <GatewaySheet
          intent={intent}
          placing={placing}
          onPay={() => resolvePayment("success")}
          onFail={() => resolvePayment("failure")}
          onCancel={() => setIntent(null)}
        />
      )}
    </>
  );
}

/* ------------------------------------------------- simulated gateway sheet
   Stands in while no Razorpay keys are configured. It behaves like a real
   payment sheet — card/UPI/bank details are required and validated — but
   nothing entered here ever leaves the browser or is stored anywhere. */
const luhnOk = (num) => {
  const d = num.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  let dbl = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = +d[i];
    if (dbl) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    dbl = !dbl;
  }
  return sum % 10 === 0;
};

const cardBrand = (num) => {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "Mastercard";
  if (/^(60|65|81|82)/.test(d)) return "RuPay";
  if (/^3[47]/.test(d)) return "American Express";
  return null;
};

const NETBANKS = [
  "State Bank of India", "HDFC Bank", "ICICI Bank", "Axis Bank",
  "Kotak Mahindra Bank", "Punjab National Bank", "Bank of Baroda", "Other bank",
];

function GatewaySheet({ intent, placing, onPay, onFail, onCancel }) {
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upiId, setUpiId] = useState("");
  const [bank, setBank] = useState("");
  const [touched, setTouched] = useState(false);

  const setCardField = (field) => (e) => {
    let v = e.target.value;
    if (field === "number") v = v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();
    if (field === "expiry") {
      v = v.replace(/\D/g, "").slice(0, 4);
      if (v.length > 2) v = `${v.slice(0, 2)}/${v.slice(2)}`;
    }
    if (field === "cvv") v = v.replace(/\D/g, "").slice(0, 4);
    setCard((c) => ({ ...c, [field]: v }));
  };

  const expiryOk = (() => {
    const m = card.expiry.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return false;
    const mm = +m[1];
    if (mm < 1 || mm > 12) return false;
    const now = new Date();
    const yy = 2000 + +m[2];
    return yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1);
  })();

  const brand = cardBrand(card.number);
  const problems =
    intent.mode === "card"
      ? [
          !luhnOk(card.number) && "Enter a valid card number.",
          !card.name.trim() && "Enter the name on the card.",
          !expiryOk && "Expiry must be a future MM/YY.",
          !/^\d{3,4}$/.test(card.cvv) && "Enter the 3–4 digit CVV.",
        ].filter(Boolean)
      : intent.mode === "upi"
        ? [!/^[a-z0-9][a-z0-9._-]+@[a-z]{2,}$/i.test(upiId.trim()) && "Enter a valid UPI ID — e.g. name@okbank."].filter(Boolean)
        : [!bank && "Choose your bank."].filter(Boolean);
  const valid = problems.length === 0;

  const pay = (e) => {
    e.preventDefault();
    setTouched(true);
    if (valid && !placing) onPay();
  };

  return (
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

        <form className="gw-form" onSubmit={pay}>
          {intent.mode === "card" && (
            <>
              <label>
                Card number{brand ? ` · ${brand}` : ""}
                <input
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="0000 0000 0000 0000"
                  value={card.number}
                  onChange={setCardField("number")}
                />
              </label>
              <label>
                Name on card
                <input autoComplete="off" placeholder="As printed on the card" value={card.name} onChange={setCardField("name")} />
              </label>
              <div className="gw-two">
                <label>
                  Expiry (MM/YY)
                  <input inputMode="numeric" autoComplete="off" placeholder="MM/YY" value={card.expiry} onChange={setCardField("expiry")} />
                </label>
                <label>
                  CVV
                  <input type="password" inputMode="numeric" autoComplete="off" placeholder="•••" value={card.cvv} onChange={setCardField("cvv")} />
                </label>
              </div>
            </>
          )}
          {intent.mode === "upi" && (
            <label>
              UPI ID
              <input autoComplete="off" placeholder="name@okbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </label>
          )}
          {intent.mode !== "card" && intent.mode !== "upi" && (
            <label>
              Bank
              <select value={bank} onChange={(e) => setBank(e.target.value)}>
                <option value="">Choose your bank…</option>
                {NETBANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
          )}
          {touched && !valid && <p className="form-error" style={{ margin: 0 }}>{problems[0]}</p>}

          <div style={{ display: "grid", gap: "0.7rem", marginTop: "0.5rem" }}>
            <button className="btn btn-green" type="submit" disabled={placing}>
              {placing ? "Processing…" : `Pay ${formatINR(intent.amount)}`}
            </button>
            <button className="btn btn-outline" type="button" disabled={placing} onClick={onFail}>
              Simulate a failed payment
            </button>
            <button className="remove-btn" type="button" style={{ margin: "0.4rem auto 0" }} onClick={onCancel}>
              Cancel and return to bag
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.72rem", marginTop: "0.6rem" }}>
            Test mode — details are checked in this window only; nothing is
            stored or charged.
          </p>
        </form>
      </div>
    </div>
  );
}
