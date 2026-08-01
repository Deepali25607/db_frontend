import { useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";

const RETURN_REASONS = [
  "Size does not fit",
  "Looks different from the photos",
  "Received damaged",
  "Changed my mind",
  "Ordered wrong variant",
];

export default function Track() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    setError(null);
    if (!e) {
      // silent refresh after a return request
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
          <p>Enter the order ID from your confirmation and the mobile number used at checkout.</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 680, padding: "3rem 0 6rem" }}>
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
              <label htmlFor="t-phone">Mobile</label>
              <input
                id="t-phone"
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
        </form>

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
