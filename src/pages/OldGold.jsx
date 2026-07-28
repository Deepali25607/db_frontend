import { useMemo, useState } from "react";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";

// Mirrors the server's published buyback policy for the live estimate;
// the request itself is priced server-side and re-valued at assay.
const POLICY = { hallmarkedPct: 2, unmarkedPct: 6, cashExtraPct: 2 };

const PURITIES = {
  gold: ["24K", "22K", "18K", "14K"],
  silver: ["925"],
  platinum: ["PT950"],
};

export default function OldGold() {
  const { rates } = useStore();
  const [form, setForm] = useState({
    metalType: "gold",
    purity: "22K",
    weight: "",
    hallmarked: true,
    hasInvoice: false,
    payout: "exchange",
    name: "",
    phone: "",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  const estimate = useMemo(() => {
    const rate = rates?.rates?.[form.metalType]?.[form.purity];
    const w = Number(form.weight);
    if (!rate || !(w > 0)) return null;
    const gross = w * rate;
    const assayPct = form.hallmarked ? POLICY.hallmarkedPct : POLICY.unmarkedPct;
    const deductions = [
      { label: `Melting & assay (${assayPct}%)`, amount: Math.round((gross * assayPct) / 100) },
    ];
    if (form.payout === "cash") {
      deductions.push({ label: `Cash payout (${POLICY.cashExtraPct}%)`, amount: Math.round((gross * POLICY.cashExtraPct) / 100) });
    }
    return {
      rate,
      gross: Math.round(gross),
      deductions,
      net: Math.round(gross - deductions.reduce((a, d) => a + d.amount, 0)),
    };
  }, [rates, form.metalType, form.purity, form.weight, form.hallmarked, form.payout]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.submitBuyback({ ...form, weight: Number(form.weight) });
      setDone(res);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Old-Gold Exchange & Buyback</span>
          <h1>
            Your old gold, <em>revalued today.</em>
          </h1>
          <p>
            An indicative valuation from the live rate, deductions shown up
            front — the final figure is set at assay, in front of you.
          </p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        <div className="scheme-columns">
          <div>
            {done ? (
              <div className="summary-card" style={{ position: "static" }}>
                <h3>Request raised ✓</h3>
                <p className="muted" style={{ marginBottom: "0.8rem" }}>{done.id}</p>
                <p className="muted" style={{ fontSize: "0.9rem" }}>
                  Indicative value {formatINR(done.indicative.net)} for{" "}
                  {done.weight} g of {done.purity} {done.metalType}. Bring the
                  item (and invoice, if you have it) to any showroom — assay
                  happens in front of you and the final value is settled as{" "}
                  {done.payout === "exchange" ? "exchange credit" : "a bank transfer"}.
                </p>
                <button className="btn btn-maroon" style={{ marginTop: "1.2rem" }} onClick={() => setDone(null)}>
                  Value another item
                </button>
              </div>
            ) : (
              <>
                <h3 className="admin-subhead" style={{ marginTop: 0 }}>Get an indicative value</h3>
                <form className="checkout-form" onSubmit={submit}>
                  <div className="form-row">
                    <div className="field">
                      <label>Metal</label>
                      <select
                        value={form.metalType}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, metalType: e.target.value, purity: PURITIES[e.target.value][0] }))
                        }
                      >
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="platinum">Platinum</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Purity (as marked / believed)</label>
                      <select value={form.purity} onChange={set("purity")}>
                        {PURITIES[form.metalType].map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="field">
                      <label>Weight (grams)</label>
                      <input
                        required
                        inputMode="decimal"
                        value={form.weight}
                        onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value.replace(/[^\d.]/g, "") }))}
                      />
                    </div>
                    <div className="field">
                      <label>Payout</label>
                      <select value={form.payout} onChange={set("payout")}>
                        <option value="exchange">Exchange credit (best value)</option>
                        <option value="cash">Cash / bank transfer</option>
                      </select>
                    </div>
                  </div>
                  <label className="filter-option">
                    <input type="checkbox" checked={form.hallmarked} onChange={set("hallmarked")} />
                    The item carries a BIS hallmark
                  </label>
                  <label className="filter-option">
                    <input type="checkbox" checked={form.hasInvoice} onChange={set("hasInvoice")} />
                    I have the original invoice
                  </label>
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
                  <div className="field">
                    <label>Describe the item (optional)</label>
                    <textarea rows={2} value={form.notes} onChange={set("notes")} />
                  </div>
                  {error && <p className="form-error">{error}</p>}
                  <button className="btn btn-maroon">Request valuation</button>
                </form>
              </>
            )}
          </div>

          <div>
            <h3 className="admin-subhead" style={{ marginTop: 0 }}>Live estimate</h3>
            {estimate ? (
              <div className="summary-card" style={{ position: "static" }}>
                <div className="summary-row">
                  <span>
                    {form.weight} g × {formatINR(estimate.rate)}/g ({form.purity})
                  </span>
                  <span>{formatINR(estimate.gross)}</span>
                </div>
                {estimate.deductions.map((d) => (
                  <div className="summary-row" key={d.label}>
                    <span>{d.label}</span>
                    <span>− {formatINR(d.amount)}</span>
                  </div>
                ))}
                <div className="summary-row total">
                  <span>Indicative value</span>
                  <span>{formatINR(estimate.net)}</span>
                </div>
                <p className="summary-note">
                  Indicative only — the final value is set by weight and purity
                  at assay, done in front of you at the showroom. Exchange
                  credit waives the cash deduction.
                </p>
              </div>
            ) : (
              <p className="muted">Enter the weight to see today's estimate.</p>
            )}

            <MyBuybacks />
          </div>
        </div>
      </div>
    </>
  );
}

function MyBuybacks() {
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const lookup = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setItems(await api.myBuybacks(phone));
    } catch (err) {
      setError(err.message);
      setItems(null);
    }
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 className="admin-subhead">My requests</h3>
      <form className="pin-form" onSubmit={lookup} style={{ marginBottom: "1rem" }}>
        <input
          placeholder="Mobile number"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
        />
        <button className="btn btn-green" type="submit">View</button>
      </form>
      {error && <p className="form-error">{error}</p>}
      {items && items.length === 0 && <p className="muted">No requests for that number.</p>}
      {(items || []).map((b) => (
        <div key={b.id} className="scheme-status-card">
          <div className="scheme-status-head">
            <strong>
              {b.weight} g · {b.purity} {b.metalType}
            </strong>
            <span className="status-pill">{b.status}</span>
          </div>
          <p className="muted" style={{ fontSize: "0.84rem" }}>
            {b.id} · indicative {formatINR(b.indicative.net)} ·{" "}
            {b.finalValue ? `assayed at ${formatINR(b.finalValue)}` : `payout: ${b.payout}`}
          </p>
        </div>
      ))}
    </div>
  );
}
