import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";
import { formatINR } from "../lib/format";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Custom() {
  useSeo({
    title: "Custom & Made-to-Order Jewellery",
    description:
      "Commission a custom piece — share your design, get a quotation from our atelier, and follow it through production.",
  });

  const [meta, setMeta] = useState(null);

  useEffect(() => {
    api.enquiryMeta().then(setMeta).catch(() => setMeta({ budgetBands: [], advancePct: 25 }));
  }, []);

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">The Atelier</span>
          <h1>
            Made for <em>one person only.</em>
          </h1>
          <p>
            Describe the piece, set a budget band, and our karigars respond
            with a quotation. A {meta?.advancePct ?? 25}% advance starts production.
          </p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        <div className="scheme-columns">
          <EnquiryForm meta={meta} />
          <MyEnquiries advancePct={meta?.advancePct ?? 25} />
        </div>
      </div>
    </>
  );
}

function EnquiryForm({ meta }) {
  const [form, setForm] = useState({
    name: "", phone: "", email: "", category: "rings",
    budgetBand: "", metal: "gold", purity: "22K",
    stone: "", occasionDate: "", description: "", referenceUrl: "",
  });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (meta?.budgetBands?.length && !form.budgetBand) {
      setForm((f) => ({ ...f, budgetBand: meta.budgetBands[0] }));
    }
  }, [meta]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setDone(await api.submitEnquiry(form));
    } catch (err) {
      setError(err.message);
    }
  };

  if (done) {
    return (
      <div className="summary-card" style={{ position: "static" }}>
        <h3>Enquiry received ✓</h3>
        <p className="muted" style={{ marginBottom: "0.8rem" }}>{done.id}</p>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Our atelier will study the brief and send a quotation — usually
          within two working days. Watch “My commissions” with mobile{" "}
          {done.phone}, and accept the quote there when it arrives.
        </p>
        <button className="btn btn-maroon" style={{ marginTop: "1.2rem" }} onClick={() => setDone(null)}>
          Start another commission
        </button>
      </div>
    );
  }

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>Tell us what you dream of</h3>
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label>Type of piece</label>
            <select value={form.category} onChange={set("category")}>
              {["rings", "necklaces", "earrings", "bangles", "bracelets", "mangalsutra", "other"].map((c) => (
                <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Budget band</label>
            <select value={form.budgetBand} onChange={set("budgetBand")}>
              {(meta?.budgetBands || []).map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Metal</label>
            <select
              value={form.metal}
              onChange={(e) => setForm((f) => ({ ...f, metal: e.target.value, purity: e.target.value === "gold" ? "22K" : e.target.value === "silver" ? "925" : "PT950" }))}
            >
              <option value="gold">Gold</option>
              <option value="silver">Silver</option>
              <option value="platinum">Platinum</option>
            </select>
          </div>
          <div className="field">
            <label>Purity</label>
            <select value={form.purity} onChange={set("purity")}>
              {(form.metal === "gold" ? ["24K", "22K", "18K", "14K"] : form.metal === "silver" ? ["925"] : ["PT950"]).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Stones (optional)</label>
            <input placeholder="e.g. polki, ruby, solitaire" value={form.stone} onChange={set("stone")} />
          </div>
          <div className="field">
            <label>Needed by (optional)</label>
            <input type="date" value={form.occasionDate} onChange={set("occasionDate")} />
          </div>
        </div>
        <div className="field">
          <label>Describe the piece</label>
          <textarea
            required
            rows={3}
            placeholder="The design, the occasion, who it's for…"
            value={form.description}
            onChange={set("description")}
          />
        </div>
        <div className="field">
          <label>Reference image link (optional)</label>
          <input placeholder="https://…" value={form.referenceUrl} onChange={set("referenceUrl")} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Name</label>
            <input required value={form.name} onChange={set("name")} />
          </div>
          <div className="field">
            <label>Mobile</label>
            <input
              required
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) }))}
            />
          </div>
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-maroon">Send to the atelier</button>
      </form>
    </div>
  );
}

function MyEnquiries({ advancePct }) {
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    setError(null);
    try {
      setItems(await api.myEnquiries(phone));
    } catch (err) {
      setError(err.message);
      setItems(null);
    }
  };

  const accept = async (enquiry) => {
    setError(null);
    try {
      const updated = await api.acceptQuote(enquiry.id, phone);
      setPaying(updated);
      await lookup();
    } catch (err) {
      setError(err.message);
    }
  };

  const pay = async (outcome) => {
    setBusy(true);
    setError(null);
    try {
      await api.payAdvance(paying.id, outcome);
      setPaying(null);
      await lookup();
    } catch (err) {
      setPaying(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>My commissions</h3>
      <form className="pin-form" onSubmit={lookup} style={{ marginBottom: "1.2rem" }}>
        <input
          placeholder="Mobile number"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
        <button className="btn btn-green" type="submit">View</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {items && items.length === 0 && <p className="muted">No commissions for that number.</p>}
      {(items || []).map((e) => (
        <div key={e.id} className="scheme-status-card">
          <div className="scheme-status-head">
            <strong>{e.category[0].toUpperCase() + e.category.slice(1)} · {e.purity} {e.metal}</strong>
            <span className="status-pill">{e.status}</span>
          </div>
          <p className="muted" style={{ fontSize: "0.84rem" }}>
            {e.id} · {e.budgetBand}
            {e.stone ? ` · ${e.stone}` : ""}
          </p>
          {e.quote && (
            <p style={{ fontSize: "0.92rem" }}>
              Quoted <strong>{formatINR(e.quote.amount)}</strong> · valid till {fmtDate(e.quote.validUntil)}
              {e.quote.note ? ` · ${e.quote.note}` : ""}
            </p>
          )}
          {e.status === "Quoted" && (
            <button className="btn btn-maroon" style={{ width: "100%" }} onClick={() => accept(e)}>
              Accept & pay {advancePct}% advance · {formatINR(Math.round((e.quote.amount * advancePct) / 100))}
            </button>
          )}
          {e.status === "Advance Pending" && (
            <button className="btn btn-maroon" style={{ width: "100%" }} onClick={() => setPaying(e)}>
              Pay advance · {formatINR(Math.round((e.quote.amount * advancePct) / 100))}
            </button>
          )}
          {e.advance && (
            <p className="muted" style={{ fontSize: "0.82rem" }}>
              Advance {formatINR(e.advance.amount)} paid {fmtDate(e.advance.paidAt)} · balance due on delivery
            </p>
          )}
        </div>
      ))}

      {paying && (
        <div className="modal-backdrop">
          <div className="modal gateway" role="dialog" aria-label="Advance payment">
            <p className="gateway-brand">DPJ Secure Checkout (simulated)</p>
            <h3 style={{ fontSize: "2rem" }}>
              {formatINR(Math.round((paying.quote.amount * advancePct) / 100))}
            </h3>
            <p className="muted" style={{ fontSize: "0.9rem" }}>
              {advancePct}% advance on {paying.id} · quote {formatINR(paying.quote.amount)}
            </p>
            <div style={{ display: "grid", gap: "0.7rem", marginTop: "1.6rem" }}>
              <button className="btn btn-green" disabled={busy} onClick={() => pay("success")}>
                {busy ? "Processing…" : "Pay now (simulate success)"}
              </button>
              <button className="btn btn-outline" disabled={busy} onClick={() => pay("failure")}>
                Simulate a failed payment
              </button>
              <button className="remove-btn" style={{ margin: "0.4rem auto 0" }} onClick={() => setPaying(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
