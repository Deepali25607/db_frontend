import { useState } from "react";
import { formatINR } from "../lib/format";

/* Instalment payment sheet for the gold scheme — same simulated-gateway
   discipline as the cart's checkout: the customer picks card / UPI / net
   banking, details are validated in this window only (never stored or
   sent anywhere), and the chosen method is recorded on the instalment. */

const NETBANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra", "Punjab National Bank"];

const luhnOk = (num) => {
  const d = num.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = +d[d.length - 1 - i];
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
};

const cardBrand = (num) => {
  const d = num.replace(/\D/g, "");
  if (/^4/.test(d)) return "Visa";
  if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return "Mastercard";
  if (/^(60|65|81|82)/.test(d)) return "RuPay";
  if (/^3[47]/.test(d)) return "Amex";
  return "";
};

const MODES = [
  ["card", "Card"],
  ["upi", "UPI"],
  ["netbanking", "Net banking"],
];

export default function PaySheet({ amount, title, subline, busy, onPay, onFail, onCancel }) {
  const [mode, setMode] = useState("card");
  const [card, setCard] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upiId, setUpiId] = useState("");
  const [bank, setBank] = useState("");
  const [touched, setTouched] = useState(false);

  const setCardField = (field) => (e) => {
    let v = e.target.value;
    if (field === "number") v = v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
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
    mode === "card"
      ? [
          !luhnOk(card.number) && "Enter a valid card number.",
          !card.name.trim() && "Enter the name on the card.",
          !expiryOk && "Expiry must be a future MM/YY.",
          !/^\d{3,4}$/.test(card.cvv) && "Enter the 3–4 digit CVV.",
        ].filter(Boolean)
      : mode === "upi"
        ? [!/^[a-z0-9][a-z0-9._-]+@[a-z]{2,}$/i.test(upiId.trim()) && "Enter a valid UPI ID — e.g. name@okbank."].filter(Boolean)
        : [!bank && "Choose your bank."].filter(Boolean);
  const valid = problems.length === 0;

  const submit = (e) => {
    e.preventDefault();
    setTouched(true);
    if (valid && !busy) onPay(mode);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal gateway" role="dialog" aria-label="Instalment payment">
        <p className="gateway-brand">DPJ Secure Checkout (simulated)</p>
        <h3 style={{ fontSize: "2rem" }}>{formatINR(amount)}</h3>
        {title && <p className="muted" style={{ fontSize: "0.9rem" }}>{title}</p>}
        {subline && <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.3rem" }}>{subline}</p>}

        <div className="pay-modes" role="tablist" aria-label="Payment method">
          {MODES.map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              className={`pay-mode ${mode === key ? "active" : ""}`}
              onClick={() => { setMode(key); setTouched(false); }}
            >
              {label}
            </button>
          ))}
        </div>

        <form className="gw-form" onSubmit={submit}>
          {mode === "card" && (
            <>
              <label>
                Card number{brand ? ` · ${brand}` : ""}
                <input inputMode="numeric" autoComplete="off" placeholder="0000 0000 0000 0000" value={card.number} onChange={setCardField("number")} />
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
          {mode === "upi" && (
            <label>
              UPI ID
              <input autoComplete="off" placeholder="name@okbank" value={upiId} onChange={(e) => setUpiId(e.target.value)} />
            </label>
          )}
          {mode === "netbanking" && (
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
            <button className="btn btn-green" type="submit" disabled={busy}>
              {busy ? "Processing…" : `Pay ${formatINR(amount)}`}
            </button>
            <button className="btn btn-outline" type="button" disabled={busy} onClick={() => onFail(mode)}>
              Simulate a failed payment
            </button>
            <button className="remove-btn" type="button" style={{ margin: "0.4rem auto 0" }} onClick={onCancel}>
              Cancel
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
