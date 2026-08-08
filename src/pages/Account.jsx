import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BagIcon, CardIcon, GemIcon, HeartIcon, PinIcon, UserIcon } from "../components/Icons";
import PaySheet from "../components/PaySheet";
import SchemeCard from "../components/SchemeCard";
import { accountApi, api } from "../lib/api";
import { useSeo } from "../lib/seo";
import { formatINR } from "../lib/format";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const PROFILE_TABS = [
  { key: "profile", label: "Profile", icon: <UserIcon /> },
  { key: "addresses", label: "Addresses", icon: <PinIcon /> },
  { key: "orders", label: "Orders", icon: <BagIcon /> },
  { key: "schemes", label: "Gold Schemes", icon: <GemIcon /> },
  { key: "credit", label: "Credit", icon: <CardIcon /> },
];

export default function Account() {
  useSeo({ title: "My Profile" });
  const [me, setMe] = useState(null);
  const [authed, setAuthed] = useState(accountApi.hasToken());
  const [tab, setTab] = useState("profile");

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
    <div className="container section" style={{ paddingTop: "3rem" }}>
      <h1 className="profile-title">My Profile</h1>
      <div className="profile-layout">
        <nav className="profile-nav" aria-label="Account sections">
          {PROFILE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`pn-item ${tab === t.key ? "active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          <Link to="/wishlist" className="pn-item">
            <HeartIcon />
            Wishlist
          </Link>
        </nav>

        <div className="profile-pane">
          {tab === "profile" && (
            <ProfileCard me={me} onSaved={load} onDeleted={() => setAuthed(false)} />
          )}
          {tab === "addresses" && (
            <div className="profile-card"><AddressBook me={me} onChanged={load} /></div>
          )}
          {tab === "orders" && <div className="profile-card"><History me={me} /></div>}
          {tab === "schemes" && <div className="profile-card"><SchemesPanel me={me} /></div>}
          {tab === "credit" && <div className="profile-card"><Rewards /></div>}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------- profile card */
function ProfileCard({ me, onSaved, onDeleted }) {
  const c = me.customer;
  const [editing, setEditing] = useState(false);
  const initial = (c.name || "D").trim().charAt(0).toUpperCase();
  const since = new Date(c.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  const dash = (v) => v || "—";

  return (
    <div className="profile-card">
      <div className="profile-head">
        <span className="profile-avatar" aria-hidden>{initial}</span>
        <div>
          <h2>{c.name || "Welcome"}</h2>
          <p className="muted" style={{ margin: "0.1rem 0 0.4rem" }}>Member since {since}</p>
          <span className="verified-chip">Phone ✓</span>
        </div>
      </div>

      {!editing ? (
        <>
          <dl className="profile-grid">
            <div><dt>Full name</dt><dd>{dash(c.name)}</dd></div>
            <div><dt>Email</dt><dd>{dash(c.email)}</dd></div>
            <div><dt>Phone</dt><dd>{c.phone}</dd></div>
            <div><dt>Date of birth</dt><dd>{c.dob ? fmtDate(c.dob) : "—"}</dd></div>
            <div><dt>Gender</dt><dd>{dash(c.gender)}</dd></div>
            {c.anniversary && <div><dt>Anniversary</dt><dd>{fmtDate(c.anniversary)}</dd></div>}
            {c.ringSize && <div><dt>Ring size</dt><dd>{c.ringSize}</dd></div>}
          </dl>
          <button className="btn btn-maroon" onClick={() => setEditing(true)}>
            ✎ Edit profile
          </button>
        </>
      ) : (
        <EditProfile
          me={me}
          onDone={() => {
            setEditing(false);
            onSaved();
          }}
          onCancel={() => setEditing(false)}
        />
      )}

      <div style={{ marginTop: "2.2rem", borderTop: "1px solid var(--line-soft)", paddingTop: "1.4rem" }}>
        <Privacy onDeleted={onDeleted} />
      </div>
    </div>
  );
}

function EditProfile({ me, onDone, onCancel }) {
  const [form, setForm] = useState({
    name: me.customer.name || "",
    email: me.customer.email || "",
    dob: me.customer.dob || "",
    gender: me.customer.gender || "",
    anniversary: me.customer.anniversary || "",
    ringSize: me.customer.ringSize || "",
  });
  const [error, setError] = useState(null);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveProfile = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await accountApi.updateProfile(form);
      onDone();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form className="checkout-form" onSubmit={saveProfile} style={{ marginTop: "0.6rem" }}>
      <div className="form-row">
        <div className="field">
          <label>Full name</label>
          <input value={form.name} onChange={set("name")} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={form.email} onChange={set("email")} />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Date of birth</label>
          <input type="date" value={form.dob} onChange={set("dob")} />
        </div>
        <div className="field">
          <label>Gender</label>
          <select value={form.gender} onChange={set("gender")}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Other</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Anniversary</label>
          <input type="date" value={form.anniversary} onChange={set("anniversary")} />
        </div>
        <div className="field">
          <label>Ring size</label>
          <input placeholder="e.g. 12" value={form.ringSize} onChange={set("ringSize")} />
        </div>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: "flex", gap: "0.7rem" }}>
        <button className="btn btn-maroon">Save profile</button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
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

/* ---------------------------------------------------- gold schemes */
/* The scheme dashboard inside My Profile: every enrolled scheme with its
   live status, invested total, accumulated grams, instalment progress,
   next due date and full payment history — refreshed after every
   successful payment. */
function SchemesPanel({ me }) {
  const phone = me.customer.phone;
  const [schemes, setSchemes] = useState(null);
  const [error, setError] = useState(null);
  const [paying, setPaying] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = () =>
    api.mySchemes(phone).then(setSchemes).catch((e) => setError(e.message));

  useEffect(() => {
    if (phone) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phone]);

  const pay = async (outcome, method) => {
    setBusy(true);
    setError(null);
    try {
      await api.paySchemeInstalment(paying.id, outcome, method);
      setPaying(null);
      await load();
    } catch (err) {
      setPaying(null);
      setError(err.message);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const redeem = async (s) => {
    setError(null);
    try {
      await api.redeemScheme(s.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>Gold schemes</h3>
      {error && <p className="form-error" style={{ marginBottom: "0.9rem" }}>{error}</p>}
      {!schemes && !error && <div className="skeleton" style={{ height: 160 }} />}
      {schemes && schemes.length === 0 && (
        <div>
          <p className="muted">
            No gold schemes yet — save in grams, not rupees: every instalment
            converts to gold at that day&#8217;s 22K rate.
          </p>
          <Link to="/gold-scheme" className="btn btn-maroon" style={{ marginTop: "1rem", display: "inline-flex" }}>
            Explore the Gold Scheme &#8594;
          </Link>
        </div>
      )}
      {(schemes || []).map((s) => (
        <SchemeCard key={s.id} scheme={s} onPay={setPaying} onRedeem={redeem} />
      ))}

      {paying && (
        <PaySheet
          amount={paying.monthlyAmount}
          title={
            paying.paidCount === 0
              ? `First instalment - ${paying.variantName} - activates ${paying.id}`
              : `Instalment ${paying.paidCount + 1} of ${paying.tenureMonths} - ${paying.variantName}`
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
