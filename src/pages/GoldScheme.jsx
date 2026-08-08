import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaySheet from "../components/PaySheet";
import Reveal from "../components/Reveal";
import SchemeCard from "../components/SchemeCard";
import { useStore } from "../context/StoreContext";
import { api } from "../lib/api";
import { formatINR } from "../lib/format";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function GoldScheme() {
  const [variants, setVariants] = useState(null);
  const { rates } = useStore();
  const rate22 = rates?.rates?.gold?.["22K"];

  useEffect(() => {
    api.schemes().then(setVariants).catch(() => setVariants([]));
  }, []);

  return (
    <>
      <div className="gs-hero">
        <div className="gs-orb one" />
        <div className="gs-orb two" />
        <div className="container">
          <span className="eyebrow">Gold Savings Scheme</span>
          <h1>
            Save in <em>grams,</em> not rupees.
          </h1>
          <p>
            Every instalment converts to gold at that day's 22K rate — your
            savings rise with the metal, not the bank.
          </p>
          {rate22 && (
            <span className="gs-live">
              <span className="gs-live-dot" />
              Live · 22K {formatINR(rate22)}/g
            </span>
          )}
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        <div className="scheme-variants">
          {(variants || []).map((v, i) => (
            <Reveal key={v.key} delay={i * 0.08}>
              <div className="scheme-card">
                <span className="gs-index">{String(i + 1).padStart(2, "0")}</span>
                <h3>{v.name}</h3>
                <p className="muted">{v.blurb}</p>
                <ul>
                  <li>{v.tenureMonths} monthly instalments</li>
                  <li>From {formatINR(v.minMonthly)}/month</li>
                  <li className="bonus">{v.bonus}</li>
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="scheme-columns">
          <EnrolForm variants={variants || []} rate22={rate22} />
          <MySchemes />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ enrol */
function EnrolForm({ variants, rate22 }) {
  const [form, setForm] = useState({
    variant: "swarna-11-1",
    monthlyAmount: "5000",
    name: "",
    phone: "",
    email: "",
    pan: "",
    acceptTerms: false,
  });
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(null); // enrolled, awaiting first payment
  const [paying, setPaying] = useState(false); // PaySheet open for the first instalment
  const [payBusy, setPayBusy] = useState(false);
  const [payNote, setPayNote] = useState(null);
  const [done, setDone] = useState(null); // activated scheme view

  const variant = variants.find((v) => v.key === form.variant);
  const committed = variant ? Number(form.monthlyAmount || 0) * variant.tenureMonths : 0;
  const needsPan = committed >= 200000;

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.enrollScheme({
        variant: form.variant,
        monthlyAmount: Number(form.monthlyAmount),
        customer: { name: form.name, phone: form.phone, email: form.email, pan: form.pan },
        acceptTerms: form.acceptTerms,
      });
      // enrolment reserves the scheme; the first instalment activates it
      setPending(res);
      setPaying(true);
      setPayNote(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const payFirst = async (outcome, method) => {
    setPayBusy(true);
    setPayNote(null);
    try {
      const updated = await api.paySchemeInstalment(pending.id, outcome, method);
      setPaying(false);
      setDone(updated);
    } catch (err) {
      setPayNote(err.message);
    } finally {
      setPayBusy(false);
    }
  };

  if (done) {
    return (
      <div className="summary-card" style={{ position: "static" }}>
        <h3>Scheme active ✓</h3>
        <p className="muted" style={{ marginBottom: "0.8rem" }}>
          {done.variantName} · {done.id}
        </p>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          First instalment received — {done.gramsAccrued} g added at{" "}
          {formatINR(done.instalments?.[0]?.rate22K || done.rate22)}/g. Next
          instalment due {fmtDate(done.nextDueAt)}; maturity {fmtDate(done.maturityAt)}.
          Track everything under{" "}
          <Link to="/account" className="link-underline">My Profile → Gold Schemes</Link>{" "}
          or “My schemes” beside this form.
        </p>
        <button className="btn btn-maroon" style={{ marginTop: "1.2rem" }} onClick={() => { setDone(null); setPending(null); }}>
          Enrol another
        </button>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="summary-card" style={{ position: "static" }}>
        <h3>Almost there —</h3>
        <p className="muted" style={{ marginBottom: "0.8rem" }}>
          {pending.variantName} · {pending.id} · reserved for {form.name}
        </p>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Your scheme activates when the first instalment of{" "}
          <strong>{formatINR(pending.monthlyAmount)}</strong> is paid — the
          monthly cycle starts from that payment date, and the amount converts
          to grams at that day's 22K rate.
        </p>
        {payNote && <p className="form-error" style={{ marginTop: "0.7rem" }}>{payNote}</p>}
        <button className="btn btn-maroon" style={{ marginTop: "1.2rem", width: "100%" }} onClick={() => setPaying(true)}>
          Pay first instalment · {formatINR(pending.monthlyAmount)}
        </button>
        <p className="muted" style={{ fontSize: "0.78rem", marginTop: "0.7rem" }}>
          Not now? The scheme stays reserved — pay any time from “My schemes”
          or My Profile to activate it.
        </p>
        {paying && (
          <PaySheet
            amount={pending.monthlyAmount}
            title={`First instalment · ${pending.variantName} · activates ${pending.id}`}
            subline={`Converts to gold at today's 22K rate`}
            busy={payBusy}
            onPay={(method) => payFirst("success", method)}
            onFail={(method) => payFirst("failure", method)}
            onCancel={() => setPaying(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>Enrol now</h3>
      <form className="checkout-form" onSubmit={submit}>
        <div className="form-row">
          <div className="field">
            <label>Scheme</label>
            <select value={form.variant} onChange={set("variant")}>
              {variants.map((v) => (
                <option key={v.key} value={v.key}>{v.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Monthly amount (₹)</label>
            <input
              required
              inputMode="numeric"
              value={form.monthlyAmount}
              onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value.replace(/\D/g, "") }))}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Full name</label>
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
          <label>Email (optional)</label>
          <input type="email" value={form.email} onChange={set("email")} />
        </div>
        {needsPan && (
          <div className="field">
            <label>PAN (required — committed value {formatINR(committed)})</label>
            <input
              required
              maxLength={10}
              style={{ textTransform: "uppercase" }}
              placeholder="ABCDE1234F"
              value={form.pan}
              onChange={set("pan")}
            />
          </div>
        )}
        <label className="filter-option" style={{ alignItems: "flex-start" }}>
          <input type="checkbox" checked={form.acceptTerms} onChange={set("acceptTerms")} style={{ marginTop: 4 }} />
          <span style={{ fontSize: "0.86rem" }}>
            I accept the scheme terms: instalments accrue grams at the day's
            22K rate; redemption is against purchase at any DP Jewellers
            store or online; pre-closure per published policy.
          </span>
        </label>
        {rate22 && variant && Number(form.monthlyAmount) > 0 && (
          <div className="gs-calc">
            <small>At today's live 22K rate ({formatINR(rate22)}/g)</small>
            <strong>≈ {(Number(form.monthlyAmount) / rate22).toFixed(3)} g every month</strong>
            <small>
              ~{((Number(form.monthlyAmount) / rate22) * variant.tenureMonths).toFixed(1)} g over{" "}
              {variant.tenureMonths} instalments · {variant.bonus}
            </small>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-maroon" disabled={!form.acceptTerms}>
          Enrol · {variant ? `${variant.tenureMonths} × ${formatINR(Number(form.monthlyAmount || 0))}` : ""}
        </button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------ dashboard */
function MySchemes() {
  const [phone, setPhone] = useState("");
  const [schemes, setSchemes] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(null); // scheme being paid (modal)
  const [busy, setBusy] = useState(false);

  const lookup = async (e) => {
    e?.preventDefault();
    setError(null);
    try {
      setSchemes(await api.mySchemes(phone));
    } catch (err) {
      setError(err.message);
      setSchemes(null);
    }
  };

  const pay = async (outcome, method) => {
    setBusy(true);
    setError(null);
    try {
      await api.paySchemeInstalment(paying.id, outcome, method);
      setPaying(null);
      await lookup();
    } catch (err) {
      setPaying(null);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const redeem = async (id) => {
    setError(null);
    try {
      await api.redeemScheme(id);
      await lookup();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>My schemes</h3>
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
      {schemes && schemes.length === 0 && (
        <p className="muted">No schemes found for that number yet.</p>
      )}
      {(schemes || []).map((s) => (
        <SchemeCard key={s.id} scheme={s} onPay={setPaying} onRedeem={(v) => redeem(v.id)} />
      ))}

      {paying && (
        <PaySheet
          amount={paying.monthlyAmount}
          title={
            paying.paidCount === 0
              ? `First instalment · ${paying.variantName} · activates ${paying.id}`
              : `Instalment ${paying.paidCount + 1} of ${paying.tenureMonths} · ${paying.variantName}`
          }
          subline={`Converts to gold at today's 22K rate (${formatINR(paying.rate22)}/g)`}
          busy={busy}
          onPay={(method) => pay("success", method)}
          onFail={(method) => pay("failure", method)}
          onCancel={() => setPaying(null)}
        />
      )}
    </div>
  );
}
