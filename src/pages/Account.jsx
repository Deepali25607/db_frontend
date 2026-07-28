import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { accountApi } from "../lib/api";
import { useSeo } from "../lib/seo";
import { formatINR } from "../lib/format";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function Account() {
  useSeo({ title: "My Account" });
  const [me, setMe] = useState(null);
  const [authed, setAuthed] = useState(accountApi.hasToken());

  const load = () =>
    accountApi
      .me()
      .then(setMe)
      .catch(() => {
        localStorage.removeItem("dpj_token");
        setAuthed(false);
      });

  useEffect(() => {
    if (authed) load();
  }, [authed]);

  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  if (!me)
    return (
      <div className="container" style={{ padding: "4rem 0" }}>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">My Account</span>
          <h1>
            Welcome{me.customer.name ? "," : ""} <em>{me.customer.name || "back"}.</em>
          </h1>
          <p>{me.customer.phone} · member since {fmtDate(me.customer.createdAt)}</p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        <div className="scheme-columns">
          <div>
            <Rewards />
            <Profile me={me} onSaved={load} />
            <AddressBook me={me} onChanged={load} />
            <Privacy onDeleted={() => setAuthed(false)} />
          </div>
          <History me={me} />
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------ login */
function Login({ onDone }) {
  const [phone, setPhone] = useState("");
  const [otpInfo, setOtpInfo] = useState(null);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);

  const sendOtp = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setOtpInfo(await accountApi.requestOtp(phone));
    } catch (err) {
      setError(err.message);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await accountApi.verifyOtp(phone, otp);
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 440, padding: "5rem 0 8rem" }}>
      <span className="eyebrow">My Account</span>
      <h1 className="section-title" style={{ textAlign: "left", marginBottom: "1rem" }}>
        Sign in with <em>your mobile.</em>
      </h1>
      <p className="muted" style={{ marginBottom: "1.6rem" }}>
        No passwords — a one-time code verifies you. Your orders, schemes and
        commissions gather themselves under one roof.
      </p>
      {!otpInfo ? (
        <form className="checkout-form" onSubmit={sendOtp}>
          <div className="field">
            <label htmlFor="login-phone">Mobile number</label>
            <input
              id="login-phone"
              required
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-maroon">Send OTP</button>
        </form>
      ) : (
        <form className="checkout-form" onSubmit={verify}>
          <p className="admin-note">
            Demo OTP: <strong>{otpInfo.demoOtp}</strong> — {otpInfo.note}
          </p>
          <div className="field">
            <label htmlFor="login-otp">Enter the 6-digit code sent to {phone}</label>
            <input
              id="login-otp"
              required
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button className="btn btn-maroon">Verify & sign in</button>
          <button type="button" className="remove-btn" onClick={() => setOtpInfo(null)}>
            Change number
          </button>
        </form>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ rewards */
function Rewards() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    accountApi.loyalty().then(setData).catch(() => {});
  }, []);

  if (!data) return null;

  const copy = () => {
    navigator.clipboard?.writeText(data.referralCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const ledgerLabel = { earned: "Earned", redeemed: "Spent", referral: "Referral bonus", refunded: "Refunded" };

  return (
    <div style={{ marginBottom: "2.4rem" }}>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>
        DPJ Rewards — {data.tier.name}
      </h3>
      <div className="scheme-status-card">
        <div className="scheme-stats">
          <div>
            <span>{data.points}</span>
            <label>points (₹{data.points})</label>
          </div>
          <div>
            <span>{data.tier.multiplier}×</span>
            <label>earn rate</label>
          </div>
          <div>
            <span>{data.referralsEarned}</span>
            <label>referrals</label>
          </div>
        </div>
        {data.nextTier && (
          <p className="muted" style={{ fontSize: "0.82rem", marginTop: "0.8rem" }}>
            Spend {formatINR(data.nextTier.spendAway)} more to reach {data.nextTier.name}.
          </p>
        )}
        <p className="muted" style={{ fontSize: "0.84rem", marginTop: "0.6rem" }}>
          Share your code — friends get ₹500 off their first order (min ₹10,000),
          you earn 500 points when it's delivered.
        </p>
        <div style={{ display: "flex", gap: "0.7rem", alignItems: "center", marginTop: "0.5rem" }}>
          <strong style={{ letterSpacing: "0.1em" }}>{data.referralCode}</strong>
          <button className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} onClick={copy}>
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        {data.ledger.length > 0 && (
          <div style={{ marginTop: "0.9rem", borderTop: "1px solid var(--line-soft)", paddingTop: "0.6rem" }}>
            {data.ledger.slice(0, 5).map((entry, i) => (
              <p key={i} className="muted" style={{ fontSize: "0.8rem", display: "flex", justifyContent: "space-between" }}>
                <span>{ledgerLabel[entry.type] || entry.type}{entry.orderId ? ` · ${entry.orderId}` : ""}</span>
                <span style={{ color: entry.points > 0 ? "var(--green)" : "var(--maroon-bright)" }}>
                  {entry.points > 0 ? "+" : ""}{entry.points}
                </span>
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ profile */
function Profile({ me, onSaved }) {
  const [form, setForm] = useState({
    name: me.customer.name || "",
    email: me.customer.email || "",
    dob: me.customer.dob || "",
    anniversary: me.customer.anniversary || "",
    ringSize: me.customer.ringSize || "",
  });
  const [note, setNote] = useState(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    await accountApi.updateProfile(form);
    setNote("Saved.");
    onSaved();
  };

  return (
    <div style={{ marginBottom: "2.4rem" }}>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>Profile</h3>
      <form className="checkout-form" onSubmit={saveProfile}>
        <div className="form-row">
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={set("name")} />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set("email")} />
          </div>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Birthday</label>
            <input type="date" value={form.dob} onChange={set("dob")} />
          </div>
          <div className="field">
            <label>Anniversary</label>
            <input type="date" value={form.anniversary} onChange={set("anniversary")} />
          </div>
        </div>
        <div className="field">
          <label>Ring size</label>
          <input placeholder="e.g. 12" value={form.ringSize} onChange={set("ringSize")} />
        </div>
        {note && <p className="admin-note">{note}</p>}
        <button className="btn btn-maroon">Save profile</button>
      </form>
    </div>
  );
}

/* ------------------------------------------------------------ addresses */
function AddressBook({ me, onChanged }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "Home", line: "", pincode: "", city: "" });
  const [error, setError] = useState(null);

  const add = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await accountApi.addAddress(form);
      setAdding(false);
      setForm({ label: "Home", line: "", pincode: "", city: "" });
      onChanged();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ marginBottom: "2.4rem" }}>
      <h3 className="admin-subhead">Addresses</h3>
      {me.customer.addresses.length === 0 && !adding && (
        <p className="muted">No saved addresses yet.</p>
      )}
      {me.customer.addresses.map((a) => (
        <div key={a.id} className="scheme-status-card">
          <div className="scheme-status-head">
            <strong>{a.label}{a.isDefault ? " · default" : ""}</strong>
            <button className="remove-btn" onClick={() => accountApi.removeAddress(a.id).then(onChanged)}>
              Remove
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.88rem" }}>
            {a.line}{a.city ? `, ${a.city}` : ""} — {a.pincode}
          </p>
        </div>
      ))}
      {adding ? (
        <form className="checkout-form" onSubmit={add}>
          <div className="form-row">
            <div className="field">
              <label>Label</label>
              <input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="field">
              <label>PIN code</label>
              <input
                required
                inputMode="numeric"
                value={form.pincode}
                onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) }))}
              />
            </div>
          </div>
          <div className="field">
            <label>Address</label>
            <textarea required rows={2} value={form.line} onChange={(e) => setForm((f) => ({ ...f, line: e.target.value }))} />
          </div>
          <div className="field">
            <label>City</label>
            <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div style={{ display: "flex", gap: "0.7rem" }}>
            <button className="btn btn-maroon">Save address</button>
            <button type="button" className="btn btn-outline" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn btn-outline" onClick={() => setAdding(true)}>
          Add an address
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ privacy */
function Privacy({ onDeleted }) {
  const [note, setNote] = useState(null);

  const exportData = async () => {
    const data = await accountApi.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "dpj-my-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const del = async () => {
    if (!window.confirm("Delete your profile and sign-in? Order and invoice records are kept for the statutory period.")) return;
    const res = await accountApi.deleteAccount();
    setNote(res.message);
    setTimeout(onDeleted, 2500);
  };

  return (
    <div>
      <h3 className="admin-subhead">Privacy (DPDP)</h3>
      {note && <p className="admin-note">{note}</p>}
      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
        <button className="btn btn-outline" onClick={exportData}>
          Download my data
        </button>
        <button className="btn btn-outline" style={{ color: "var(--maroon-bright)", borderColor: "var(--maroon-bright)" }} onClick={del}>
          Delete my account
        </button>
        <button
          className="btn btn-outline"
          onClick={async () => {
            await accountApi.logout();
            onDeleted();
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ history */
function History({ me }) {
  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>Orders</h3>
      {me.orders.length === 0 ? (
        <p className="muted">
          No orders yet — <Link to="/shop" className="link-underline">the collection awaits</Link>.
        </p>
      ) : (
        me.orders.map((o) => (
          <div key={o.orderId} className="scheme-status-card">
            <div className="scheme-status-head">
              <strong>{o.orderId}</strong>
              <span className="status-pill">{o.status}</span>
            </div>
            <p className="muted" style={{ fontSize: "0.84rem" }}>
              {o.items} · {formatINR(o.payable)} · {fmtDate(o.placedAt)}
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
              <Link to="/track" className="link-underline" style={{ fontSize: "0.82rem" }}>
                Track this order
              </Link>
              {o.invoiceAvailable && (
                <Link
                  to={`/invoice/${o.orderId}?phone=${encodeURIComponent(me.customer.phone)}`}
                  className="link-underline"
                  style={{ fontSize: "0.82rem" }}
                >
                  Tax invoice
                </Link>
              )}
            </div>
          </div>
        ))
      )}

      {me.schemes.length > 0 && (
        <>
          <h3 className="admin-subhead">Gold schemes</h3>
          {me.schemes.map((s) => (
            <div key={s.id} className="scheme-status-card">
              <div className="scheme-status-head">
                <strong>{s.variantName}</strong>
                <span className="status-pill">{s.status}</span>
              </div>
              <p className="muted" style={{ fontSize: "0.84rem" }}>
                {s.paidCount}/{s.tenureMonths} paid · {s.gramsAccrued} g · {formatINR(s.currentValue)} today
              </p>
            </div>
          ))}
        </>
      )}

      {me.enquiries.length > 0 && (
        <>
          <h3 className="admin-subhead">Commissions</h3>
          {me.enquiries.map((e) => (
            <div key={e.id} className="scheme-status-card">
              <div className="scheme-status-head">
                <strong>{e.category} · {e.purity} {e.metal}</strong>
                <span className="status-pill">{e.status}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {me.appointments.length > 0 && (
        <>
          <h3 className="admin-subhead">Appointments</h3>
          {me.appointments.map((a) => (
            <div key={a.id} className="scheme-status-card">
              <div className="scheme-status-head">
                <strong>{a.storeName}</strong>
                <span className="status-pill">{a.status}</span>
              </div>
              <p className="muted" style={{ fontSize: "0.84rem" }}>
                {a.date} · {a.slot}
              </p>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
