import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { accountApi, api } from "../lib/api";
import { formatINR } from "../lib/format";

const RETURN_REASONS = [
  "Size does not fit",
  "Looks different from the photos",
  "Received damaged",
  "Changed my mind",
  "Ordered wrong variant",
];

export default function Track() {
  const [params] = useSearchParams();
  const wanted = params.get("order") || "";
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState(null); // phone-first: all orders
  const [result, setResult] = useState(null); // one order, full detail
  const [byId, setById] = useState(false); // optional order-ID mode
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [me, setMe] = useState(null); // signed-in customer, if any
  const [booted, setBooted] = useState(!accountApi.hasToken());

  // A signed-in customer never types anything — their phone comes from the
  // session, and ?order=<id> (the profile's Track links) opens that order's
  // full detail directly, Flipkart-fashion.
  useEffect(() => {
    if (!accountApi.hasToken()) return;
    let alive = true;
    (async () => {
      try {
        const res = await accountApi.me();
        if (!alive) return;
        const ph = res.customer.phone;
        setMe(res.customer);
        setPhone(ph);
        if (wanted) {
          setOrderId(wanted);
          setResult(await api.track(wanted, ph));
        } else {
          const { orders: mine } = await api.trackMy(ph);
          if (!alive) return;
          setOrders(mine);
          if (mine.length === 1) {
            setOrderId(mine[0].orderId);
            setResult(await api.track(mine[0].orderId, ph));
          }
        }
      } catch {
        // stale/failed session — fall back to the manual forms
      } finally {
        if (alive) setBooted(true);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const useAnotherNumber = () => {
    setMe(null);
    setOrders(null);
    setResult(null);
    setError(null);
    setPhone("");
    setOrderId("");
  };

  // phone is all it takes — list every order, piece by piece
  const lookupMine = async (e) => {
    e?.preventDefault();
    setError(null);
    setResult(null);
    setOrders(null);
    setLoading(true);
    try {
      const { orders: mine } = await api.trackMy(phone);
      setOrders(mine);
      if (mine.length === 0) setError("No orders yet under this mobile number.");
      else if (mine.length === 1) openDetail(mine[0].orderId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (id) => {
    setError(null);
    setLoading(true);
    try {
      setOrderId(id);
      setResult(await api.track(id, phone));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const lookup = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!e) {
      // silent refresh after a cancel/return request
      try {
        setResult(await api.track(orderId, phone));
      } catch { /* keep old view */ }
      return;
    }
    setResult(null);
    setLoading(true);
    try {
      setResult(await api.track(orderId, phone));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Client Services</span>
          <h1>
            Track your <em>order.</em>
          </h1>
          <p>Just the mobile number used at checkout — every order appears, piece by piece.</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 680, padding: "3rem 0 6rem" }}>
        {!booted ? (
          <div className="skeleton" style={{ height: 220 }} />
        ) : me ? (
          <p className="muted" style={{ fontSize: "0.86rem", marginBottom: "0.4rem" }}>
            Signed in as <strong>{me.name || me.phone}</strong> ({me.phone}) — your orders
            appear automatically ·{" "}
            <button
              className="link-underline"
              style={{ font: "inherit", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--maroon)" }}
              onClick={useAnotherNumber}
            >
              track a different number
            </button>
            {error && <span className="form-error" style={{ display: "block", marginTop: "0.7rem" }}>{error}</span>}
          </p>
        ) : !byId ? (
          <form className="checkout-form" onSubmit={lookupMine}>
            <div className="field">
              <label htmlFor="t-phone">Mobile number</label>
              <input
                id="t-phone"
                required
                inputMode="numeric"
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              />
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-maroon" disabled={loading}>
              {loading ? "Searching…" : "Show my orders"}
            </button>
            <button type="button" className="remove-btn" style={{ justifySelf: "start" }} onClick={() => { setById(true); setError(null); }}>
              Have an order ID? Track a single order
            </button>
          </form>
        ) : (
          <form className="checkout-form" onSubmit={lookup}>
            <div className="form-row">
              <div className="field">
                <label htmlFor="t-order">Order ID</label>
                <input
                  id="t-order"
                  required
                  placeholder="DPJ260726-XXXXXX"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                />
              </div>
              <div className="field">
                <label htmlFor="t-phone2">Mobile</label>
                <input
                  id="t-phone2"
                  required
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button className="btn btn-maroon" disabled={loading}>
              {loading ? "Searching…" : "Track order"}
            </button>
            <button type="button" className="remove-btn" style={{ justifySelf: "start" }} onClick={() => { setById(false); setError(null); }}>
              ← Track everything with just my mobile number
            </button>
          </form>
        )}

        {orders && orders.length > 0 && !result && (
          <div style={{ marginTop: "2.4rem", display: "grid", gap: "1.2rem" }}>
            {orders.map((o) => (
              <div key={o.orderId} className="summary-card" style={{ position: "static" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "1rem", flexWrap: "wrap" }}>
                  <h3 style={{ margin: 0 }}>{o.orderId} · {formatINR(o.total)}</h3>
                  <span className="status-pill">{o.status}</span>
                </div>
                <p className="muted" style={{ fontSize: "0.82rem", margin: "0.3rem 0 1rem" }}>
                  Placed {new Date(o.placedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
                <ul className="track-lines">
                  {o.lines.map((l, i) => (
                    <li key={i}>
                      <img src={l.image} alt="" loading="lazy" />
                      <span className="tl-info">
                        <Link to={`/product/${l.slug}`} className="tl-name">{l.name}</Link>
                        <span className="muted">{l.size ? `Size ${l.size} · ` : ""}Qty {l.qty}</span>
                      </span>
                      <span className="tl-right">
                        {typeof l.lineTotal === "number" && <strong>{formatINR(l.lineTotal)}</strong>}
                        <span className="status-pill">{o.status}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <button className="link-underline" style={{ font: "inherit", fontSize: "0.86rem", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--maroon)" }} onClick={() => openDetail(o.orderId)}>
                    Full timeline{o.cancellable ? ", cancellation" : ""} & returns →
                  </button>
                  {o.invoiceAvailable && (
                    <Link to={`/invoice/${o.orderId}?phone=${encodeURIComponent(phone)}`} className="link-underline" style={{ fontSize: "0.86rem" }}>
                      Tax invoice
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {result && orders && orders.length > 1 && (
          <p style={{ marginTop: "2rem" }}>
            <button className="link-underline" style={{ font: "inherit", background: "none", border: "none", cursor: "pointer", padding: 0, color: "var(--maroon)" }} onClick={() => setResult(null)}>
              ← All my orders
            </button>
          </p>
        )}

        {result && (
          <>
            <div className="summary-card" style={{ position: "static", marginTop: "2.4rem" }}>
              <h3>
                {result.orderId} · {formatINR(result.total)}
              </h3>
              <p className="muted" style={{ fontSize: "0.86rem", marginBottom: "1rem" }}>
                {result.payment.mode.toUpperCase()} ({result.payment.status})
              </p>
              {/* the order, piece by piece — each line with its own state */}
              <ul className="track-lines">
                {result.lines.map((l, i) => {
                  const ret = result.returns.find((r) => r.slug === l.slug && (r.size || null) === (l.size || null));
                  return (
                    <li key={i}>
                      <img src={l.image} alt="" loading="lazy" />
                      <span className="tl-info">
                        <Link to={`/product/${l.slug}`} className="tl-name">{l.name}</Link>
                        <span className="muted">
                          {l.size ? `Size ${l.size} · ` : ""}Qty {l.qty}
                        </span>
                      </span>
                      <span className="tl-right">
                        {typeof l.lineTotal === "number" && <strong>{formatINR(l.lineTotal)}</strong>}
                        <span className={`status-pill ${ret ? "alt" : ""}`}>
                          {ret ? `${ret.type} — ${ret.status}` : result.status}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
              {result.invoiceAvailable && (
                <p style={{ marginBottom: "1.2rem" }}>
                  <Link
                    to={`/invoice/${result.orderId}?phone=${encodeURIComponent(phone)}`}
                    className="link-underline"
                    style={{ fontSize: "0.86rem" }}
                  >
                    View GST tax invoice →
                  </Link>
                </p>
              )}
              <ol className="timeline">
                {result.statusTimeline.map((t, i) => (
                  <li key={i} className={i === result.statusTimeline.length - 1 ? "current" : ""}>
                    <strong>{t.status}</strong>
                    <span>
                      {new Date(t.at).toLocaleString("en-IN", {
                        day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            {result.returns.length > 0 && (
              <div className="summary-card" style={{ position: "static", marginTop: "1.2rem" }}>
                <h3>Returns & exchanges</h3>
                {result.returns.map((r) => (
                  <div className="summary-row" key={r.id}>
                    <span>
                      {r.itemName}
                      {r.size ? ` (${r.size})` : ""} · {r.type} · {r.id}
                    </span>
                    <span className="status-pill">{r.status}</span>
                  </div>
                ))}
              </div>
            )}

            {result.cancellable && (
              <CancelSection orderId={result.orderId} phone={phone} onDone={() => lookup()} />
            )}

            {result.status === "Delivered" && result.returnWindowDays > 0 && (
              <ReturnSection result={result} orderId={orderId} phone={phone} onDone={() => lookup()} />
            )}
          </>
        )}
      </div>
    </>
  );
}

function CancelSection({ orderId, phone, onDone }) {
  const [arming, setArming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const cancel = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.cancelOrder(orderId, phone);
      setNote("Your order is cancelled. Any payment made will be refunded to the source within 5–7 working days.");
      setArming(false);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="summary-card" style={{ position: "static", marginTop: "1.2rem" }}>
      <h3>Need to cancel?</h3>
      <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
        This order can still be cancelled — pieces return to the atelier and any
        payment is refunded to the source.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      {!note && (
        arming ? (
          <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
            <button className="btn btn-maroon" disabled={busy} onClick={cancel}>
              {busy ? "Cancelling…" : "Yes, cancel this order"}
            </button>
            <button className="btn btn-outline" disabled={busy} onClick={() => setArming(false)}>
              Keep my order
            </button>
          </div>
        ) : (
          <button className="btn btn-outline" onClick={() => setArming(true)}>
            Cancel this order
          </button>
        )
      )}
    </div>
  );
}

function ReturnSection({ result, orderId, phone, onDone }) {
  const { content } = useStore();
  const [openLine, setOpenLine] = useState(null);
  const [form, setForm] = useState({ type: "return", reason: RETURN_REASONS[0], comments: "" });
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const openReturns = new Set(
    result.returns.filter((r) => !["Cancelled", "QC Failed", "Refunded"].includes(r.status)).map((r) => `${r.slug}|${r.size || ""}`)
  );

  const submit = async (line) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.submitReturn({
        orderId,
        phone,
        slug: line.slug,
        size: line.size,
        type: form.type,
        reason: form.reason,
        comments: form.comments,
      });
      setNote(`Request ${r.id} raised — reverse pickup will be scheduled and QC happens at the warehouse before ${form.type === "return" ? "refund" : "exchange"}.`);
      setOpenLine(null);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="summary-card" style={{ position: "static", marginTop: "1.2rem" }}>
      <h3>Request a return or exchange</h3>
      <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1rem" }}>
        {result.returnWindowDays}-day window from delivery · made-to-order and
        engraved pieces are non-returnable · refunds release after warehouse QC.
      </p>
      {content?.returnPolicyMessage && (
        <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "1rem", fontStyle: "italic" }}>
          {content.returnPolicyMessage}
        </p>
      )}
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      {result.lines.map((line) => {
        const key = `${line.slug}|${line.size || ""}`;
        const already = openReturns.has(key);
        return (
          <div key={key} style={{ borderTop: "1px solid var(--line-soft)", padding: "0.8rem 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
              <span>
                {line.name}
                {line.size ? ` (${line.size})` : ""}
              </span>
              {already ? (
                <span className="muted" style={{ fontSize: "0.82rem" }}>Return in progress</span>
              ) : (
                <button
                  className="btn btn-outline"
                  style={{ padding: "0.5rem 1.1rem" }}
                  onClick={() => setOpenLine(openLine === key ? null : key)}
                >
                  {openLine === key ? "Close" : "Return / exchange"}
                </button>
              )}
            </div>
            {openLine === key && (
              <div className="checkout-form" style={{ marginTop: "0.9rem" }}>
                <div className="form-row">
                  <div className="field">
                    <label>Type</label>
                    <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                      <option value="return">Return for refund</option>
                      <option value="exchange">Exchange for another piece</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Reason</label>
                    <select value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}>
                      {RETURN_REASONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label>Anything we should know? (optional)</label>
                  <textarea
                    rows={2}
                    value={form.comments}
                    onChange={(e) => setForm((f) => ({ ...f, comments: e.target.value }))}
                  />
                </div>
                <button className="btn btn-maroon" disabled={busy} onClick={() => submit(line)}>
                  {busy ? "Submitting…" : "Submit request"}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
