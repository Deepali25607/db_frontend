import { Fragment, useCallback, useEffect, useState } from "react";
import { adminApi, api } from "../lib/api";
import { formatINR } from "../lib/format";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

export default function Admin() {
  const [authed, setAuthed] = useState(adminApi.hasKey());
  const [tab, setTab] = useState("dashboard");

  if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;

  return (
    <div className="admin-shell container">
      <header className="admin-head">
        <div>
          <span className="eyebrow left" style={{ marginBottom: "0.2rem" }}>Back Office</span>
          <h1 style={{ fontSize: "1.9rem" }}>DP Jewellers Admin</h1>
        </div>
        <nav className="admin-tabs">
          {[
            ["dashboard", "Dashboard"],
            ["orders", "Orders"],
            ["customers", "Customers"],
            ["rates", "Rate Console"],
            ["catalogue", "Catalogue"],
            ["schemes", "Schemes"],
            ["returns", "Returns"],
            ["appointments", "Appointments"],
            ["callbacks", "Call-backs"],
            ["promos", "Promos"],
            ["buyback", "Buyback"],
            ["enquiries", "Enquiries"],
            ["notifications", "Notifications"],
            ["settings", "Settings"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              adminApi.logout();
              setAuthed(false);
            }}
          >
            Sign out
          </button>
        </nav>
      </header>

      {tab === "dashboard" && <Dashboard goTo={setTab} />}
      {tab === "orders" && <Orders />}
      {tab === "customers" && <Customers />}
      {tab === "rates" && <Rates />}
      {tab === "catalogue" && <Catalogue />}
      {tab === "schemes" && <Schemes />}
      {tab === "returns" && <Returns />}
      {tab === "appointments" && <Appointments />}
      {tab === "callbacks" && <Callbacks />}
      {tab === "promos" && <Promos />}
      {tab === "buyback" && <Buyback />}
      {tab === "enquiries" && <Enquiries />}
      {tab === "notifications" && <Notifications />}
      {tab === "settings" && <Settings />}
    </div>
  );
}

/* ---------------------------------------------------------- settings */
function HeroMediaCard() {
  const [content, setContent] = useState(null);
  const [slides, setSlides] = useState([]);
  const [skus, setSkus] = useState([]);
  const [slideUrl, setSlideUrl] = useState("");
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then((c) => {
      setContent(c);
      setSlides(Array.isArray(c.heroSlides) ? c.heroSlides : []);
    }).catch((e) => setError(e.message));
    adminApi.products().then((rows) => setSkus(rows.filter((r) => r.published))).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await adminApi.patchContent({
        heroVideo: content.heroVideo,
        heroSlides: slides,
      });
      setContent(res.content);
      setSlides(Array.isArray(res.content.heroSlides) ? res.content.heroSlides : []);
      setNote(res.changed === 0 ? "No changes." : "Saved — the homepage shows it immediately.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // video: unchanged behaviour — upload applies immediately and wins over slides
  const uploadVideo = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Keep uploads under 100 MB — compress the video first.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { url } = await adminApi.uploadFile(file);
      const res = await adminApi.patchContent({ heroVideo: url, heroImage: "" });
      setContent(res.content);
      setNote("Video uploaded — live on the homepage now.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  // images: multiple files become promotion slides (linked below, then saved)
  const uploadSlides = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (slides.length + files.length > 6) {
      setError("Up to 6 promotion slides on the homepage.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) throw new Error(`${file.name} is over 100 MB.`);
        const { url } = await adminApi.uploadFile(file);
        setSlides((prev) => [...prev, { image: url, slug: "" }]);
      }
      setNote("Images added below — link each to a piece, then Save.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const addSlideUrl = () => {
    const u = slideUrl.trim();
    if (!u) return;
    if (slides.length >= 6) {
      setError("Up to 6 promotion slides on the homepage.");
      return;
    }
    setSlides((prev) => [...prev, { image: u, slug: "" }]);
    setSlideUrl("");
  };

  if (!content) return null;
  return (
    <>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        <strong>Video</strong> — uploads apply immediately and play full-bleed
        behind the headline. <strong>Promotion slides</strong> — upload one or
        more images, link each to a piece, and the homepage rotates through
        them; clicking a slide opens that product. The video, when set, wins
        over the slides.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginBottom: "1.1rem" }}>
        <label className="btn btn-outline" style={{ cursor: "pointer" }}>
          {busy ? "Working…" : "⤒ Upload video…"}
          <input type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={uploadVideo} disabled={busy} />
        </label>
        <label className="btn btn-outline" style={{ cursor: "pointer" }}>
          {busy ? "Working…" : "⤒ Upload promotion images…"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" multiple hidden onChange={uploadSlides} disabled={busy} />
        </label>
      </div>
      <form className="checkout-form" onSubmit={save}>
        <div className="field">
          <label>Hero video URL (optional — overrides the slides)</label>
          <input
            value={content.heroVideo}
            onChange={(e) => setContent((c) => ({ ...c, heroVideo: e.target.value }))}
            placeholder="https://…/hero.mp4 — leave empty to run the promotion slides"
          />
        </div>
        {content.heroVideo && slides.length > 0 && (
          <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>
            A video is set, so the slides are paused — clear the video field and
            save to run the promotion.
          </p>
        )}
        {slides.length > 0 && (
          <div style={{ display: "grid", gap: "0.6rem" }}>
            {slides.map((s, i) => (
              <div key={`${s.image}-${i}`} style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
                <img src={s.image} alt="" style={{ width: 72, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)", flex: "none" }} />
                <select
                  aria-label={`Product for slide ${i + 1}`}
                  value={s.slug || ""}
                  onChange={(e) => setSlides((prev) => prev.map((x, j) => (j === i ? { ...x, slug: e.target.value } : x)))}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  <option value="">No link — image only</option>
                  {skus.map((p) => (
                    <option key={p.slug} value={p.slug}>{p.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="remove-btn"
                  onClick={() => setSlides((prev) => prev.filter((_, j) => j !== i))}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <input
            style={{ flex: 1 }}
            value={slideUrl}
            onChange={(e) => setSlideUrl(e.target.value)}
            placeholder="…or paste an image URL and press Add"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSlideUrl(); } }}
          />
          <button type="button" className="btn btn-outline" style={{ padding: "0.5rem 1rem" }} onClick={addSlideUrl} disabled={!slideUrl.trim()}>
            Add
          </button>
        </div>
        <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--line-soft)", background: "var(--cream-3)" }}>
          {content.heroVideo ? (
            <video key={content.heroVideo} src={content.heroVideo} muted autoPlay loop playsInline style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
          ) : slides[0] ? (
            <img src={slides[0].image} alt="Hero preview" style={{ width: "100%", height: 150, objectFit: "cover", display: "block" }} />
          ) : null}
        </div>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save hero media"}
        </button>
      </form>
    </>
  );
}

/* Settings hub — a card per topic (Redlook-style); each opens its own panel.
   New settings features land here as new cards. */
const SETTING_GROUPS = [
  {
    key: "checkout",
    glyph: "₹",
    title: "Checkout & payments",
    desc: "COD ceiling, PAN threshold, price lock and the EMI tenure shown.",
    fields: ["codCeiling", "panThreshold", "priceLockMinutes", "emiMonths"],
    chip: (c) => `COD ≤ ₹${Number(c.codCeiling).toLocaleString("en-IN")} · lock ${c.priceLockMinutes}m`,
  },
  {
    key: "thresholds",
    glyph: "≥",
    title: "Order thresholds",
    desc: "Minimum bag value and item count required at checkout.",
    fields: ["minOrderValue", "minOrderQty"],
    chip: (c) =>
      `${c.minOrderValue > 0 ? `₹${Number(c.minOrderValue).toLocaleString("en-IN")}` : "no min value"} / ${c.minOrderQty} item${c.minOrderQty > 1 ? "s" : ""}`,
  },
  {
    key: "rates",
    glyph: "◈",
    title: "Rate console rules",
    desc: "Fat-finger move guard and the maker-checker approval requirement.",
    fields: ["rateGuardPct", "rateMakerChecker"],
    chip: (c) => `±${c.rateGuardPct}% guard · ${c.rateMakerChecker ? "maker-checker on" : "instant publish"}`,
  },
  {
    key: "orders",
    glyph: "⇄",
    title: "Order verification",
    desc: "The high-value verification-call hold before confirmation.",
    fields: ["verificationThreshold"],
    chip: (c) => `hold ≥ ₹${Number(c.verificationThreshold).toLocaleString("en-IN")}`,
  },
  {
    key: "inventory",
    glyph: "▦",
    title: "Inventory",
    desc: "When a piece counts as low-stock across the catalogue and alerts.",
    fields: ["lowStockThreshold"],
    chip: (c) => `alert at ${c.lowStockThreshold} unit${c.lowStockThreshold === 1 ? "" : "s"}`,
  },
];

function RuleGroupPanel({ group, data, onSaved }) {
  const fields = data.fields.filter((f) => group.fields.includes(f.key));
  const [form, setForm] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.key, String(data.config[f.key])]))
  );
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const save = async (e) => {
    e.preventDefault();
    setError(null);
    setNote(null);
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, Number(v)]));
      const res = await adminApi.patchConfig(body);
      setNote(res.changed === 0 ? "No changes." : `${res.changed} rule${res.changed > 1 ? "s" : ""} updated — live immediately.`);
      onSaved();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Enforced server-side on every request. Changes apply immediately and are
        recorded in the audit trail.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        {fields.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={`cfg-${f.key}`}>
              {f.label}{" "}
              <span className="muted" style={{ fontWeight: 400 }}>
                ({f.min.toLocaleString("en-IN")}–{f.max.toLocaleString("en-IN")})
              </span>
            </label>
            <input
              id={`cfg-${f.key}`}
              inputMode="numeric"
              value={form[f.key] ?? ""}
              onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value.replace(/\D/g, "") }))}
            />
          </div>
        ))}
        <button className="btn btn-maroon">Save rules</button>
      </form>
    </div>
  );
}

function BrandingPanel({ onSaved }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then(setContent).catch((e) => setError(e.message));
  }, []);

  const FIELDS = [
    ["companyName", "Company name", "Shown in the header, footer and copyright."],
    ["companyTagline", "Tagline", "The small line under the company name."],
    ["heroEyebrow", "Hero eyebrow", "The small capitals line above the headline."],
    ["heroLine1", "Headline — line 1", ""],
    ["heroLine2", "Headline — line 2 (rendered in gold italic)", ""],
    ["heroLine3", "Headline — line 3", ""],
  ];

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const body = Object.fromEntries(
        ["companyName", "companyTagline", "heroEyebrow", "heroLine1", "heroLine2", "heroLine3", "heroSub"].map(
          (k) => [k, content[k]]
        )
      );
      const res = await adminApi.patchContent(body);
      setContent(res.content);
      setNote(res.changed === 0 ? "No changes." : "Saved — live across the site. Leave a field empty to restore its original wording.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !content) return <p className="form-error">{error}</p>;
  if (!content) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        These words appear on the storefront the moment you save. Leaving a
        field empty restores the original wording.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        {FIELDS.map(([key, label, hint]) => (
          <div className="field" key={key}>
            <label htmlFor={`content-${key}`}>
              {label}
              {hint ? <span className="muted" style={{ fontWeight: 400 }}> — {hint}</span> : null}
            </label>
            <input
              id={`content-${key}`}
              value={content[key] ?? ""}
              onChange={(e) => setContent((c) => ({ ...c, [key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="content-heroSub">Hero sentence — the paragraph under the headline</label>
          <textarea
            id="content-heroSub"
            rows={3}
            value={content.heroSub ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, heroSub: e.target.value }))}
          />
        </div>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save wording"}
        </button>
      </form>
    </div>
  );
}

// Mirrors the backend ORDER_FLOW — cutoff options start at "Confirmed"
// (a cutoff of "Confirmed" means only just-placed orders can be cancelled).
const CANCEL_CUTOFFS = [
  "Confirmed", "Under Quality Check", "Packed", "Shipped", "Out for Delivery", "Delivered",
];

function OrderPolicyPanel({ config, onSaved }) {
  const [cutoff, setCutoff] = useState(config.cancelCutoffStatus || "Shipped");
  const [windowDays, setWindowDays] = useState(String(config.returnWindowDays ?? 15));
  const [message, setMessage] = useState(null); // loaded from content
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then((c) => setMessage(c.returnPolicyMessage || "")).catch(() => setMessage(""));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const a = await adminApi.patchConfig({
        cancelCutoffStatus: cutoff,
        returnWindowDays: Number(windowDays),
      });
      const b = await adminApi.patchContent({ returnPolicyMessage: message });
      setNote(
        a.changed + b.changed === 0
          ? "No changes."
          : "Saved — applies to cancellations and returns from this moment."
      );
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (message === null) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div style={{ maxWidth: 560 }}>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="op-cutoff">
            Cancellation cutoff{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — the first status at which an order can no longer be cancelled. Applies to
              customers on the tracking page and to admin status moves alike.
            </span>
          </label>
          <select id="op-cutoff" value={cutoff} onChange={(e) => setCutoff(e.target.value)}>
            {CANCEL_CUTOFFS.map((s, i) => (
              <option key={s} value={s}>
                {s} — customer can cancel up to "{i === 0 ? "Placed" : CANCEL_CUTOFFS[i - 1]}".
                {s === "Shipped" ? " (Default)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="op-window">
            Return window (days after delivery){" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — 0 to 30. Set to 0 to disable returns entirely; the tracking page hides the
              return form and the server refuses requests.
            </span>
          </label>
          <input
            id="op-window"
            inputMode="numeric"
            value={windowDays}
            onChange={(e) => setWindowDays(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        <div className="field">
          <label htmlFor="op-message">
            Return policy message (shown to customers){" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — free-form copy on the tracking page's return form. Leave blank to hide the line.
            </span>
          </label>
          <textarea
            id="op-message"
            rows={3}
            maxLength={500}
            placeholder="e.g. Returns accepted for unworn pieces with the HUID tag intact."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <span className="muted" style={{ fontSize: "0.75rem", justifySelf: "end" }}>
            {message.length} / 500
          </span>
        </div>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save order policy"}
        </button>
      </form>
    </div>
  );
}

function DiscountsPanel({ config, onSaved }) {
  const [on, setOn] = useState(config.siteDiscountOn === 1);
  const [pct, setPct] = useState(String(config.siteDiscountPct ?? 0));
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await adminApi.patchConfig({
        siteDiscountOn: on ? 1 : 0,
        siteDiscountPct: Number(pct || 0),
      });
      setNote(
        res.changed === 0
          ? "No changes."
          : on && Number(pct) > 0
            ? `Saved — every piece now shows ${pct}% off, repriced live.`
            : "Saved — no site-wide markdown is applied."
      );
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        A flat markdown applied to every published piece — the pre-tax value is
        reduced and GST is charged on what the customer actually pays. Useful
        for festival sales; toggle off to revert with one click (the percent
        below is kept).
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        <label
          htmlFor="disc-on"
          style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", fontSize: "0.92rem" }}
        >
          <input
            id="disc-on"
            type="checkbox"
            checked={on}
            onChange={(e) => setOn(e.target.checked)}
          />
          <span><strong>Site-wide discount</strong></span>
        </label>
        <div className="field">
          <label htmlFor="disc-pct">Percent off (0–75)</label>
          <input
            id="disc-pct"
            inputMode="numeric"
            value={pct}
            onChange={(e) => setPct(e.target.value.replace(/\D/g, "").slice(0, 2))}
          />
        </div>
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          <strong>How discounts combine:</strong> a piece is never discounted
          twice — the customer pays the largest single percentage among this
          site-wide setting and any per-piece discount. Coupons at checkout
          apply on top of the marked price, as today.
        </p>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save discount"}
        </button>
      </form>
    </div>
  );
}

const PDP_TOGGLES = [
  {
    group: "Price note (under the price)",
    items: [
      ["pdpShowGstNote", "“Inclusive of GST”"],
      ["pdpShowRateNote", "“computed at today's rate of ₹X/g” — the live metal rate"],
      ["pdpShowLockNote", "“price locked for N min once in bag” — N follows the Checkout price-lock setting"],
    ],
  },
  {
    group: "Enquiry actions (under Add to bag)",
    items: [
      ["pdpShowWhatsapp", "Enquire on WhatsApp — uses the number from Customer support; hidden while that is blank"],
      ["pdpShowCallback", "Request a call back"],
      ["pdpShowVisit", "Book a showroom visit for this piece"],
    ],
  },
];

function PdpDetailsPanel({ config, onSaved }) {
  const [form, setForm] = useState(() =>
    Object.fromEntries(
      PDP_TOGGLES.flatMap((g) => g.items).map(([key]) => [key, config[key] !== 0])
    )
  );
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const body = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v ? 1 : 0]));
      const res = await adminApi.patchConfig(body);
      setNote(res.changed === 0 ? "No changes." : "Saved — product pages update immediately.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Show or hide the informational elements on every product page. Values
        inside them (metal rate, lock minutes, WhatsApp number) always come
        from their own live settings — nothing is hardcoded.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        {PDP_TOGGLES.map((g) => (
          <div key={g.group}>
            <p style={{ fontWeight: 600, fontSize: "0.86rem", marginBottom: "0.5rem" }}>{g.group}</p>
            {g.items.map(([key, label]) => (
              <label
                key={key}
                htmlFor={`pdp-${key}`}
                style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", padding: "0.3rem 0", fontSize: "0.88rem", fontWeight: 400 }}
              >
                <input
                  id={`pdp-${key}`}
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        ))}
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save product details"}
        </button>
      </form>
    </div>
  );
}

/* Header & footer — nav links, footer blurb and link columns, editable
   without code. Empty lists restore the house defaults server-side. */
const KNOWN_PATHS = [
  "/", "/shop", "/shop?occasion=wedding", "/shop?category=rings",
  "/shop?category=necklaces", "/shop?category=earrings", "/gold-scheme",
  "/custom", "/track", "/stores", "/appointments", "/guides", "/old-gold",
  "/account", "/wishlist", "/cart", "/policies", "/#maison",
];

function LinkRow({ link, labelMax, onChange, onRemove, className = "" }) {
  return (
    <div className={className} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
      <input
        style={{ flex: "0 1 180px" }}
        placeholder="Label"
        maxLength={labelMax}
        value={link.label}
        onChange={(e) => onChange({ ...link, label: e.target.value })}
      />
      <input
        style={{ flex: "1 1 200px" }}
        placeholder="/path or https://…"
        list="hf-known-paths"
        value={link.path}
        onChange={(e) => onChange({ ...link, path: e.target.value })}
      />
      <button type="button" className="remove-btn" onClick={onRemove} aria-label="Remove link">✕</button>
    </div>
  );
}

// Upload-from-disk control for one background field (header or footer bar).
function BgUploadRow({ label, field, value, onApplied, onError, busy, setBusy }) {
  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      onError("Keep the picture under 100 MB.");
      return;
    }
    setBusy(true);
    onError(null);
    try {
      const { url } = await adminApi.uploadFile(file);
      await adminApi.patchContent({ [field]: url });
      onApplied(url);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    onError(null);
    try {
      await adminApi.patchContent({ [field]: "" });
      onApplied("");
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ flex: "0 0 150px", fontSize: "0.86rem", fontWeight: 600 }}>{label}</span>
      <label className="btn btn-outline" style={{ cursor: "pointer", padding: "0.4rem 1rem" }}>
        {busy ? "Working…" : "⤒ Upload picture…"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={upload} disabled={busy} />
      </label>
      {value ? (
        <>
          <img src={value} alt={`${label} preview`} style={{ width: 84, height: 40, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
          <button type="button" className="remove-btn" onClick={clear} disabled={busy}>Remove picture</button>
        </>
      ) : (
        <span className="muted" style={{ fontSize: "0.8rem" }}>plain surface</span>
      )}
    </div>
  );
}

function HeaderFooterPanel({ onSaved }) {
  const [nav, setNav] = useState(null);
  const [blurb, setBlurb] = useState("");
  const [cols, setCols] = useState([]);
  const [headerBg, setHeaderBg] = useState("");
  const [footerBg, setFooterBg] = useState("");
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then((c) => {
      setNav(Array.isArray(c.navLinks) ? c.navLinks : []);
      setBlurb(c.footerBlurb || "");
      setCols(Array.isArray(c.footerColumns) ? c.footerColumns : []);
      setHeaderBg(c.headerBgImage || "");
      setFooterBg(c.footerBgImage || "");
    }).catch((e) => setError(e.message));
  }, []);

  const save = async (restore = false) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await adminApi.patchContent(
        restore
          ? { navLinks: [], footerColumns: [], footerBlurb: "" }
          : { navLinks: nav, footerBlurb: blurb, footerColumns: cols }
      );
      setNav(res.content.navLinks);
      setBlurb(res.content.footerBlurb);
      setCols(res.content.footerColumns);
      setNote(
        res.changed === 0
          ? "No changes."
          : restore
            ? "Restored the standard header & footer — live everywhere."
            : "Saved — the header and footer update across the site immediately."
      );
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && nav === null) return <p className="form-error">{error}</p>;
  if (nav === null) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div style={{ maxWidth: 640 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        The header menu and footer are yours to arrange — links can point to any
        page of this site (/path) or an outside https:// address. The legal row
        and the support contacts (Customer support setting) stay automatic.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <datalist id="hf-known-paths">
        {KNOWN_PATHS.map((p) => <option key={p} value={p} />)}
      </datalist>

      <form className="checkout-form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
        <h3 className="admin-subhead" style={{ margin: 0 }}>Header menu ({nav.length}/7)</h3>
        {nav.map((l, i) => (
          <LinkRow
            key={i}
            link={l}
            className="hf-nav-row"
            labelMax={24}
            onChange={(next) => setNav((prev) => prev.map((x, j) => (j === i ? next : x)))}
            onRemove={() => setNav((prev) => prev.filter((_, j) => j !== i))}
          />
        ))}
        {nav.length < 7 && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: "0.4rem 1rem", justifySelf: "start" }}
            onClick={() => setNav((prev) => [...prev, { label: "", path: "/" }])}
          >
            + Add menu link
          </button>
        )}

        <h3 className="admin-subhead" style={{ margin: "1rem 0 0" }}>Footer</h3>
        <div className="field">
          <label htmlFor="hf-blurb">
            Brand paragraph{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — under the logo. Leave empty to restore the original wording.
            </span>
          </label>
          <textarea
            id="hf-blurb"
            rows={2}
            maxLength={300}
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
          />
        </div>

        {cols.map((col, i) => (
          <div
            key={i}
            style={{ border: "1px solid var(--line)", borderRadius: 12, padding: "0.9rem", display: "grid", gap: "0.55rem" }}
          >
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <input
                style={{ flex: "0 1 220px", fontWeight: 600 }}
                placeholder="Column title"
                maxLength={30}
                value={col.title}
                onChange={(e) => setCols((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
              />
              <button
                type="button"
                className="remove-btn"
                style={{ marginLeft: "auto" }}
                onClick={() => setCols((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove column
              </button>
            </div>
            {col.links.map((l, k) => (
              <LinkRow
                key={k}
                link={l}
                className="hf-col-row"
                labelMax={40}
                onChange={(next) =>
                  setCols((prev) => prev.map((x, j) => (j === i ? { ...x, links: x.links.map((y, m) => (m === k ? next : y)) } : x)))
                }
                onRemove={() =>
                  setCols((prev) => prev.map((x, j) => (j === i ? { ...x, links: x.links.filter((_, m) => m !== k) } : x)))
                }
              />
            ))}
            {col.links.length < 8 && (
              <button
                type="button"
                className="remove-btn"
                style={{ justifySelf: "start" }}
                onClick={() =>
                  setCols((prev) => prev.map((x, j) => (j === i ? { ...x, links: [...x.links, { label: "", path: "/" }] } : x)))
                }
              >
                + Add link
              </button>
            )}
          </div>
        ))}
        {cols.length < 4 && (
          <button
            type="button"
            className="btn btn-outline"
            style={{ padding: "0.4rem 1rem", justifySelf: "start" }}
            onClick={() => setCols((prev) => [...prev, { title: "", links: [{ label: "", path: "/" }] }])}
          >
            + Add footer column
          </button>
        )}

        <h3 className="admin-subhead" style={{ margin: "1rem 0 0" }}>Backgrounds</h3>
        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
          Pictures from your computer behind the header bar and the footer —
          shown under the same soft wash as the site background. These apply the
          moment the upload finishes.
        </p>
        <BgUploadRow
          label="Header background"
          field="headerBgImage"
          value={headerBg}
          onApplied={(url) => { setHeaderBg(url); setNote(url ? "Header background is live." : "Header back to the plain surface."); onSaved(); }}
          onError={setError}
          busy={busy}
          setBusy={setBusy}
        />
        <BgUploadRow
          label="Footer background"
          field="footerBgImage"
          value={footerBg}
          onApplied={(url) => { setFooterBg(url); setNote(url ? "Footer background is live." : "Footer back to the plain surface."); onSaved(); }}
          onError={setError}
          busy={busy}
          setBusy={setBusy}
        />

        <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap" }}>
          <button className="btn btn-maroon" disabled={busy}>
            {busy ? "Saving…" : "Save header & footer"}
          </button>
          <button type="button" className="btn btn-outline" disabled={busy} onClick={() => save(true)}>
            Restore standard layout
          </button>
        </div>
      </form>
    </div>
  );
}

/* Appearance — curated background palettes; keys must match the
   :root[data-theme=…] blocks in index.css and SITE_THEMES on the server. */
const SITE_THEMES = [
  { key: "heritage", name: "Heritage Cream", desc: "The house look — warm cream and parchment.", swatches: ["#f6efde", "#fbf6ea", "#e9dec0"] },
  { key: "pearl", name: "Pearl", desc: "Cooler ivory — quieter, gallery-like.", swatches: ["#f6f4ef", "#fcfbf7", "#e5e1d3"] },
  { key: "champagne", name: "Champagne", desc: "A golden pour — festive and warm.", swatches: ["#f6edd2", "#fbf4e0", "#e7d7a4"] },
  { key: "sage", name: "Sage", desc: "Soft green-tinted ivory — fresh, botanical.", swatches: ["#eff2e4", "#f7f9ef", "#d9dfc2"] },
  { key: "blush", name: "Blush", desc: "Rosy ivory — bridal and romantic.", swatches: ["#f8efe8", "#fcf6f0", "#e9d4c4"] },
  { key: "midnight", name: "Midnight", desc: "Dark mode — candlelit gold and rose on deep espresso.", swatches: ["#1b1611", "#221b15", "#322920"] },
];

function AppearancePanel({ onSaved }) {
  const [theme, setTheme] = useState(null);
  const [bgImage, setBgImage] = useState("");
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then((c) => {
      setTheme(c.theme || "heritage");
      setBgImage(c.backgroundImage || "");
    }).catch((e) => setError(e.message));
  }, []);

  // applies the picture in this window immediately, ahead of the live refresh
  const stampBg = (img) => {
    if (img) {
      document.documentElement.style.setProperty("--site-bg", `url("${img}")`);
      document.body.classList.add("has-bg");
    } else {
      document.documentElement.style.removeProperty("--site-bg");
      document.body.classList.remove("has-bg");
    }
  };

  const uploadBg = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 100 * 1024 * 1024) {
      setError("Keep the picture under 100 MB.");
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { url } = await adminApi.uploadFile(file);
      await adminApi.patchContent({ backgroundImage: url });
      setBgImage(url);
      stampBg(url);
      setNote("Background picture is live across the site — it sits under a soft wash of the theme colour so text stays readable.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const clearBg = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await adminApi.patchContent({ backgroundImage: "" });
      setBgImage("");
      stampBg("");
      setNote("Background picture removed — back to the plain theme.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const apply = async (key) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await adminApi.patchContent({ theme: key });
      setTheme(key);
      // reflect immediately in this very window, ahead of the live refresh
      if (key === "heritage") delete document.documentElement.dataset.theme;
      else document.documentElement.dataset.theme = key;
      setNote(`${SITE_THEMES.find((t) => t.key === key).name} is live across the site.`);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && theme === null) return <p className="form-error">{error}</p>;
  if (theme === null) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div style={{ maxWidth: 640 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Changes the background palette of the entire website — storefront and
        back office — the moment you pick one. Lettering, maroon and gold stay
        on-brand in every theme. Visitors also get a ☾ switch in the header to
        flip between your theme and the Midnight dark look for themselves.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <div style={{ display: "grid", gap: "0.7rem" }}>
        {SITE_THEMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => apply(t.key)}
            disabled={busy}
            aria-pressed={theme === t.key}
            style={{
              display: "flex", alignItems: "center", gap: "0.9rem", textAlign: "left",
              padding: "0.8rem 1rem", cursor: "pointer", background: "var(--paper)",
              border: theme === t.key ? "2px solid var(--gold)" : "1px solid var(--line)",
              borderRadius: 12, font: "inherit", color: "inherit",
            }}
          >
            <span style={{ display: "flex", flex: "none" }}>
              {t.swatches.map((c) => (
                <span key={c} style={{ width: 26, height: 26, borderRadius: "50%", background: c, border: "1px solid var(--line)", marginLeft: c === t.swatches[0] ? 0 : -8 }} />
              ))}
            </span>
            <span>
              <strong style={{ display: "block", fontSize: "0.95rem" }}>
                {t.name}{t.key === "heritage" ? " · default" : ""}{theme === t.key ? " — live" : ""}
              </strong>
              <span className="muted" style={{ fontSize: "0.8rem" }}>{t.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <h3 className="admin-subhead" style={{ marginTop: "1.6rem" }}>Background picture</h3>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "0.9rem" }}>
        Optional — a picture from your computer shown behind the whole site,
        softened by a wash of the theme colour above. Remove it any time to go
        back to the plain theme.
      </p>
      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center" }}>
        <label className="btn btn-outline" style={{ cursor: "pointer", padding: "0.5rem 1.1rem" }}>
          {busy ? "Working…" : "⤒ Upload background picture…"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={uploadBg} disabled={busy} />
        </label>
        {bgImage && (
          <>
            <img src={bgImage} alt="Background preview" style={{ width: 96, height: 54, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line)" }} />
            <button type="button" className="remove-btn" onClick={clearBg} disabled={busy}>
              Remove picture
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function SupportPanel({ onSaved }) {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then(setContent).catch((e) => setError(e.message));
  }, []);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await adminApi.patchContent({
        supportPhone: content.supportPhone,
        supportWhatsapp: content.supportWhatsapp,
        supportEmail: content.supportEmail,
        supportMessage: content.supportMessage,
      });
      setContent(res.content);
      setNote(res.changed === 0 ? "No changes." : "Saved — live on the storefront's Help button and footer.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !content) return <p className="form-error">{error}</p>;
  if (!content) return <div className="skeleton" style={{ height: 240 }} />;

  const msgLen = (content.supportMessage || "").length;

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Surfaced on the storefront's floating Help button and in the footer.
        Leave any field blank to hide that channel from customers.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        <div className="field">
          <label htmlFor="sup-phone">Support phone (Call)</label>
          <input
            id="sup-phone"
            placeholder="+91 98765 43210"
            value={content.supportPhone ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, supportPhone: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="sup-whatsapp">
            WhatsApp number (Chat){" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — used to build a wa.me link. Include country code; spaces and dashes are fine.
            </span>
          </label>
          <input
            id="sup-whatsapp"
            placeholder="+91 98765 43210"
            value={content.supportWhatsapp ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, supportWhatsapp: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="sup-email">Support email</label>
          <input
            id="sup-email"
            placeholder="care@dpjewellers.example"
            value={content.supportEmail ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, supportEmail: e.target.value }))}
          />
        </div>
        <div className="field">
          <label htmlFor="sup-message">
            Message shown to customers{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — a short note in the help popover: hours, response times, anything they should
              know before reaching out.
            </span>
          </label>
          <textarea
            id="sup-message"
            rows={3}
            maxLength={500}
            value={content.supportMessage ?? ""}
            onChange={(e) => setContent((c) => ({ ...c, supportMessage: e.target.value }))}
          />
          <span className="muted" style={{ fontSize: "0.75rem", justifySelf: "end" }}>
            {msgLen} / 500
          </span>
        </div>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save support details"}
        </button>
      </form>
    </div>
  );
}

function DeliveryAreaPanel({ config, onSaved }) {
  const [form, setForm] = useState({
    lat: config.deliveryLat ?? "",
    lng: config.deliveryLng ?? "",
    radius: String(config.deliveryRadiusKm ?? 9),
  });
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  const numeric = (v) => v.replace(/[^0-9.\-]/g, "");

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("This browser can't provide a location — enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setForm((f) => ({
          ...f,
          lat: pos.coords.latitude.toFixed(6),
          lng: pos.coords.longitude.toFixed(6),
        })),
      () => setError("Location permission was denied — enter coordinates manually.")
    );
  };

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await adminApi.patchConfig({
        deliveryLat: form.lat === "" ? "" : Number(form.lat),
        deliveryLng: form.lng === "" ? "" : Number(form.lng),
        deliveryRadiusKm: Number(form.radius),
      });
      setNote(res.changed === 0 ? "No changes." : "Saved — new orders are checked immediately.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 560 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Customers can only place <strong>shipped</strong> orders from within the
        delivery radius of the firm location (checked via their device location
        at checkout). Store pickup is always allowed. Leave latitude and
        longitude blank to disable the check entirely.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}
      <form className="checkout-form" onSubmit={save}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="da-lat">Firm latitude</label>
            <input
              id="da-lat"
              inputMode="decimal"
              placeholder="e.g. 22.7196"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: numeric(e.target.value) }))}
            />
          </div>
          <div className="field">
            <label htmlFor="da-lng">Firm longitude</label>
            <input
              id="da-lng"
              inputMode="decimal"
              placeholder="e.g. 75.8577"
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: numeric(e.target.value) }))}
            />
          </div>
        </div>
        <button type="button" className="remove-btn" style={{ justifySelf: "start" }} onClick={useMyLocation}>
          Use my current location
        </button>
        <div className="field">
          <label htmlFor="da-radius">Delivery radius (km)</label>
          <input
            id="da-radius"
            inputMode="numeric"
            value={form.radius}
            onChange={(e) => setForm((f) => ({ ...f, radius: e.target.value.replace(/\D/g, "") }))}
          />
        </div>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save delivery area"}
        </button>
      </form>
    </div>
  );
}

function Settings() {
  const [data, setData] = useState(null);
  const [content, setContent] = useState(null);
  const [auditRows, setAuditRows] = useState(null);
  const [error, setError] = useState(null);
  const [view, setView] = useState(null); // null = hub

  const refresh = useCallback(() => {
    adminApi.config().then(setData).catch((e) => setError(e.message));
    api.content().then(setContent).catch(() => {});
    adminApi.auditLog().then(setAuditRows).catch(() => {});
  }, []);

  useEffect(refresh, [refresh]);

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const cards = [
    ...SETTING_GROUPS.map((g) => ({
      key: g.key,
      glyph: g.glyph,
      title: g.title,
      desc: g.desc,
      chip: g.chip(data.config),
    })),
    {
      key: "delivery",
      glyph: "◎",
      title: "Delivery area",
      desc: "Firm location and the radius (km) shipped orders may come from.",
      chip:
        data.config.deliveryLat != null && data.config.deliveryLng != null
          ? `${data.config.deliveryRadiusKm} km radius`
          : "not configured",
    },
    {
      key: "branding",
      glyph: "✎",
      title: "Company branding",
      desc: "Company name, tagline, and the homepage headline & sentence.",
      chip: content?.companyName || "DP Jewellers",
    },
    {
      key: "policy",
      glyph: "↩",
      title: "Order policy",
      desc: "Cancellation cutoff, return window and the customer policy line.",
      chip: `cancel before ${data.config.cancelCutoffStatus || "Shipped"} · ${
        data.config.returnWindowDays > 0 ? `${data.config.returnWindowDays}-day returns` : "returns off"
      }`,
    },
    {
      key: "support",
      glyph: "✆",
      title: "Customer support",
      desc: "Phone, WhatsApp and email surfaced on the Help button and footer.",
      chip: content?.supportPhone || content?.supportWhatsapp || content?.supportEmail
        ? content.supportPhone || content.supportWhatsapp || content.supportEmail
        : "hidden from customers",
    },
    {
      key: "discounts",
      glyph: "%",
      title: "Discounts",
      desc: "Site-wide markdown applied to every published piece, priced live.",
      chip:
        data.config.siteDiscountOn === 1 && data.config.siteDiscountPct > 0
          ? `${data.config.siteDiscountPct}% off site-wide`
          : "no markdown",
    },
    {
      key: "pdp",
      glyph: "◇",
      title: "Product details",
      desc: "The price note and enquiry links shown on every product page.",
      chip: (() => {
        const keys = ["pdpShowGstNote", "pdpShowRateNote", "pdpShowLockNote", "pdpShowWhatsapp", "pdpShowCallback", "pdpShowVisit"];
        const on = keys.filter((k) => data.config[k] !== 0).length;
        return `${on} of ${keys.length} elements shown`;
      })(),
    },
    {
      key: "headerfooter",
      glyph: "⌘",
      title: "Header & footer",
      desc: "The menu links, footer paragraph and footer link columns.",
      chip: `${content?.navLinks?.length ?? 5} menu links · ${content?.footerColumns?.length ?? 3} columns`,
    },
    {
      key: "appearance",
      glyph: "◐",
      title: "Appearance",
      desc: "The background palette of the entire website, storefront and admin.",
      chip:
        ((content?.theme && content.theme !== "heritage")
          ? content.theme.charAt(0).toUpperCase() + content.theme.slice(1)
          : "Heritage Cream") + (content?.backgroundImage ? " + picture" : ""),
    },
    {
      key: "hero",
      glyph: "▶",
      title: "Homepage hero media",
      desc: "The looping video or clickable promotion slides behind the headline.",
      chip: content?.heroVideo
        ? "video live"
        : content?.heroSlides?.length
          ? `${content.heroSlides.length} promotion slide${content.heroSlides.length > 1 ? "s" : ""}`
          : "image live",
    },
    {
      key: "backup",
      glyph: "⤓",
      title: "Backup & data",
      desc: "Full operational snapshot of orders, catalogue and settings.",
      chip: "JSON snapshot",
    },
    {
      key: "audit",
      glyph: "☰",
      title: "Audit trail",
      desc: "Every admin action — rates, rules, catalogue, uploads.",
      chip: auditRows?.length ? `last: ${auditRows[0].action}` : "no actions yet",
    },
  ];

  if (view) {
    const card = cards.find((c) => c.key === view);
    const group = SETTING_GROUPS.find((g) => g.key === view);
    return (
      <div>
        <button className="settings-back" onClick={() => { setView(null); refresh(); }}>
          ← All settings
        </button>
        <h3 className="admin-subhead" style={{ marginTop: 0 }}>{card.title}</h3>
        {group && <RuleGroupPanel group={group} data={data} onSaved={refresh} />}
        {view === "delivery" && <DeliveryAreaPanel config={data.config} onSaved={refresh} />}
        {view === "branding" && <BrandingPanel onSaved={refresh} />}
        {view === "support" && <SupportPanel onSaved={refresh} />}
        {view === "policy" && <OrderPolicyPanel config={data.config} onSaved={refresh} />}
        {view === "appearance" && <AppearancePanel onSaved={refresh} />}
        {view === "headerfooter" && <HeaderFooterPanel onSaved={refresh} />}
        {view === "pdp" && <PdpDetailsPanel config={data.config} onSaved={refresh} />}
        {view === "discounts" && <DiscountsPanel config={data.config} onSaved={refresh} />}
        {view === "hero" && <div style={{ maxWidth: 560 }}><HeroMediaCard /></div>}
        {view === "backup" && (
          <div style={{ maxWidth: 560 }}>
            <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "0.9rem" }}>
              Human-readable JSON of the entire store — orders, catalogue,
              schemes, settings. For database-level backups, use pg_dump on the
              dpj-postgres container.
            </p>
            <a className="btn btn-outline" href={adminApi.backupUrl()}>Download backup</a>
          </div>
        )}
        {view === "audit" && (
          !auditRows ? (
            <div className="skeleton" style={{ height: 200 }} />
          ) : auditRows.length === 0 ? (
            <p className="muted">No admin actions recorded yet.</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr><th>When</th><th>Action</th><th>Detail</th></tr>
              </thead>
              <tbody>
                {auditRows.map((r, i) => (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.at)}</td>
                    <td><span className="status-pill">{r.action}</span></td>
                    <td>{r.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: "0.88rem", marginBottom: "1.4rem" }}>
        Everything configurable about the store, grouped by topic. Open a card
        to edit — changes apply live and land in the audit trail.
      </p>
      <div className="settings-grid">
        {cards.map((c) => (
          <button key={c.key} className="settings-card" onClick={() => setView(c.key)}>
            <h4><span className="settings-icon">{c.glyph}</span>{c.title}</h4>
            <p>{c.desc}</p>
            <span className="settings-chip">{c.chip}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- customers */
function CustomerProfile({ phone, onBack }) {
  const [p, setP] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.customer(phone).then(setP).catch((e) => setError(e.message));
  }, [phone]);

  if (error) return <><button className="settings-back" onClick={onBack}>← All customers</button><p className="form-error">{error}</p></>;
  if (!p) return <div className="skeleton" style={{ height: 300 }} />;

  const chip = (label, value) => (
    <div className="kpi" key={label}><span>{value}</span><label>{label}</label></div>
  );

  return (
    <div>
      <button className="settings-back" onClick={onBack}>← All customers</button>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>
        {p.name || "Unnamed customer"}{" "}
        <span className="muted" style={{ fontWeight: 400, fontSize: "0.9rem" }}>· {p.phone}</span>
      </h3>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        {p.account
          ? `Registered account since ${fmtDate(p.account.createdAt)}${p.account.email ? ` · ${p.account.email}` : ""}${p.account.ringSize ? ` · ring size ${p.account.ringSize}` : ""}`
          : "Guest — has transacted without creating an account."}
      </p>

      <div className="kpi-grid" style={{ marginBottom: "1.4rem" }}>
        {chip("Orders", p.stats.orders)}
        {chip("Lifetime value", formatINR(p.stats.spend))}
        {chip("Reward points", p.loyalty ? `${p.loyalty.points} · ${p.loyalty.tier}` : "—")}
        {chip("Gold schemes", p.schemes.length)}
      </div>

      {p.account?.addresses?.length > 0 && (
        <>
          <h3 className="admin-subhead">Addresses</h3>
          <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
            <tbody>
              {p.account.addresses.map((a) => (
                <tr key={a.id}>
                  <td>{a.label || "Address"}{a.isDefault ? <small>default</small> : null}</td>
                  <td>{a.line}, {a.city || ""} {a.pincode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      <h3 className="admin-subhead">Orders</h3>
      {p.orders.length === 0 ? (
        <p className="muted" style={{ marginBottom: "1.4rem" }}>No orders yet.</p>
      ) : (
        <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
          <thead>
            <tr><th>Order</th><th>When</th><th>Items</th><th>Paid</th><th>Status</th></tr>
          </thead>
          <tbody>
            {p.orders.map((o) => (
              <tr key={o.orderId}>
                <td>{o.orderId}</td>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(o.placedAt)}</td>
                <td>{o.items}</td>
                <td>{formatINR(o.payable)}<small>{o.payMode.toUpperCase()}</small></td>
                <td><span className="status-pill">{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {p.returns.length > 0 && (
        <>
          <h3 className="admin-subhead">Returns & exchanges</h3>
          <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
            <tbody>
              {p.returns.map((r) => (
                <tr key={r.id}>
                  <td>{r.id}<small>{r.orderId}</small></td>
                  <td>{r.itemName} · {r.type}</td>
                  <td>{formatINR(r.refundAmount)}</td>
                  <td><span className="status-pill">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {p.schemes.length > 0 && (
        <>
          <h3 className="admin-subhead">Gold schemes</h3>
          <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
            <tbody>
              {p.schemes.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}<small>since {fmtDate(s.startedAt)}</small></td>
                  <td>{s.variant} · {formatINR(s.monthly)}/month</td>
                  <td>{s.instalmentsPaid} instalment{s.instalmentsPaid === 1 ? "" : "s"}</td>
                  <td><span className="status-pill">{s.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(p.appointments.length > 0 || p.callbacks.length > 0 || p.enquiries.length > 0) && (
        <>
          <h3 className="admin-subhead">Touchpoints</h3>
          <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
            <tbody>
              {p.appointments.map((a) => (
                <tr key={a.id}>
                  <td>Showroom visit</td>
                  <td>{a.date} · {a.slot} · {a.storeName}{a.productName ? ` — ${a.productName}` : ""}</td>
                  <td><span className="status-pill">{a.status}</span></td>
                </tr>
              ))}
              {p.callbacks.map((c) => (
                <tr key={c.id}>
                  <td>Call-back</td>
                  <td>{fmtDate(c.at)} — {c.productName}</td>
                  <td><span className="status-pill">{c.status}</span></td>
                </tr>
              ))}
              {p.enquiries.map((e) => (
                <tr key={e.id}>
                  <td>Custom enquiry</td>
                  <td>{e.budgetBand} — {e.description}…</td>
                  <td><span className="status-pill">{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {p.loyalty?.ledger?.length > 0 && (
        <>
          <h3 className="admin-subhead">Recent reward activity</h3>
          <table className="admin-table">
            <tbody>
              {p.loyalty.ledger.map((l, i) => (
                <tr key={i}>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(l.at)}</td>
                  <td>{l.type}{l.orderId ? <small>{l.orderId}</small> : null}</td>
                  <td style={{ color: l.points >= 0 ? "var(--green)" : "var(--maroon-bright)" }}>
                    {l.points >= 0 ? "+" : ""}{l.points} pts
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function RegionalFootfall() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.footfall().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 260 }} />;
  if (data.regions.length === 0) return <p className="muted">No orders yet — regions appear as customers buy.</p>;

  const max = Math.max(...data.regions.map((r) => r.customers), 1);

  return (
    <>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "0.9rem" }}>
        Regions come from the delivery PIN code on each order (Indian postal
        circles); showroom footfall counts visit bookings.
      </p>
      <table className="admin-table" style={{ marginBottom: "1.6rem" }}>
        <thead>
          <tr><th>Region</th><th style={{ width: "34%" }}>Customers</th><th>Orders</th><th>Revenue</th></tr>
        </thead>
        <tbody>
          {data.regions.map((r) => (
            <tr key={r.region}>
              <td>{r.region}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <div
                    aria-hidden
                    style={{
                      width: `${Math.max(4, (r.customers / max) * 100)}%`,
                      maxWidth: "80%",
                      height: 10,
                      background: "var(--maroon)",
                      borderRadius: "0 4px 4px 0",
                      flex: "none",
                    }}
                  />
                  <span>{r.customers}</span>
                </div>
              </td>
              <td>{r.orders}</td>
              <td>{formatINR(r.revenue)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="admin-subhead">Showroom footfall — visit bookings</h3>
      {data.showrooms.length === 0 ? (
        <p className="muted">No showroom visits booked yet.</p>
      ) : (
        <table className="admin-table">
          <tbody>
            {data.showrooms.map((s) => (
              <tr key={s.storeName}>
                <td>{s.storeName}</td>
                <td>{s.visits} booking{s.visits === 1 ? "" : "s"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Customers() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("directory"); // directory | footfall
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    adminApi.customers().then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  if (error && !rows) return <p className="form-error">{error}</p>;
  if (!rows) return <div className="skeleton" style={{ height: 300 }} />;
  if (selected) return <CustomerProfile phone={selected} onBack={() => { setSelected(null); refresh(); }} />;

  const needle = q.trim().toLowerCase();
  const shown = needle
    ? rows.filter((r) =>
        [r.name, r.phone, r.email].some((v) => v && String(v).toLowerCase().includes(needle))
      )
    : rows;

  return (
    <div>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.9rem" }}>
        <h3 className="admin-subhead" style={{ margin: 0 }}>
          Customers ({rows.length})
        </h3>
        <div style={{ marginLeft: "auto", display: "flex", gap: "0.5rem" }}>
          <button
            className={view === "directory" ? "btn btn-maroon" : "btn btn-outline"}
            style={{ padding: "0.4rem 1rem" }}
            onClick={() => setView("directory")}
          >
            Directory
          </button>
          <button
            className={view === "footfall" ? "btn btn-maroon" : "btn btn-outline"}
            style={{ padding: "0.4rem 1rem" }}
            onClick={() => setView("footfall")}
          >
            Regional footfall
          </button>
        </div>
      </div>
      {view === "footfall" && <RegionalFootfall />}
      {view === "footfall" ? null : (
      <>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "0.9rem" }}>
        Everyone who has transacted or signed in — registered accounts and guest
        buyers alike. Open a row for the full profile.
      </p>
      <div className="field" style={{ maxWidth: 360, marginBottom: "1rem" }}>
        <input
          placeholder="Search name, mobile or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search customers"
        />
      </div>
      {shown.length === 0 ? (
        <p className="muted">No customers match that search.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Customer</th><th>Type</th><th>Orders</th><th>Lifetime value</th><th>Rewards</th><th>Last order</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.phone} onClick={() => setSelected(r.phone)} style={{ cursor: "pointer" }}>
                <td>{r.name || "—"}<small>{r.phone}{r.email ? ` · ${r.email}` : ""}</small></td>
                <td><span className="status-pill">{r.registered ? "Account" : "Guest"}</span></td>
                <td>{r.orders}</td>
                <td>{formatINR(r.spend)}</td>
                <td>{r.points > 0 ? `${r.points} · ${r.tier}` : "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r.lastOrderAt ? fmtDate(r.lastOrderAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- call-backs */
function Callbacks() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    adminApi.callbacks().then(setRows).catch((e) => setError(e.message));
  }, []);
  useEffect(refresh, [refresh]);

  const markCalled = async (id) => {
    setError(null);
    try {
      await adminApi.markCallbackCalled(id);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !rows) return <p className="form-error">{error}</p>;
  if (!rows) return <div className="skeleton" style={{ height: 240 }} />;

  const pending = rows.filter((r) => r.status === "New").length;

  return (
    <div>
      <p className="muted" style={{ fontSize: "0.86rem", marginBottom: "1rem" }}>
        Customers who tapped “Request a call back” on a product page — the
        storefront promises a call within 2 hours.
        {pending > 0 ? ` ${pending} waiting.` : " Nothing waiting."}
      </p>
      {error && <p className="form-error">{error}</p>}
      {rows.length === 0 ? (
        <p className="muted">No call-back requests yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>When</th><th>Mobile</th><th>Piece</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.at)}</td>
                <td>{r.phone}{r.name ? <small>{r.name}</small> : null}</td>
                <td>{r.productName}<small>{r.slug}</small></td>
                <td>
                  <span className="status-pill">{r.status}</span>
                  {r.calledAt ? <small>{fmtDate(r.calledAt)}</small> : null}
                </td>
                <td>
                  {r.status === "New" && (
                    <button className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} onClick={() => markCalled(r.id)}>
                      Mark as called
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- notifications */
function Notifications() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState("");

  useEffect(() => {
    adminApi.notifications(event ? { event } : {}).then(setData).catch((e) => setError(e.message));
  }, [event]);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <>
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1rem" }}>
        <h3 className="admin-subhead" style={{ margin: 0 }}>
          Message log ({data.total})
        </h3>
        <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>
          Simulated transport — a live SMS/WhatsApp/email gateway replaces one function.
        </p>
        <select
          value={event}
          onChange={(e) => setEvent(e.target.value)}
          style={{ marginLeft: "auto", padding: "0.45rem 0.7rem", borderRadius: 8, border: "1px solid var(--line)", background: "var(--cream)" }}
        >
          <option value="">All events</option>
          {data.events.map((ev) => (
            <option key={ev} value={ev}>{ev}</option>
          ))}
        </select>
      </div>
      {data.notifications.length === 0 ? (
        <p className="muted">Nothing sent yet — customer activity will appear here.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>When</th><th>To</th><th>Event</th><th>Channels</th><th>Message</th></tr>
          </thead>
          <tbody>
            {data.notifications.map((n) => (
              <tr key={n.id}>
                <td style={{ whiteSpace: "nowrap" }}>{fmtDate(n.at)}</td>
                <td>{n.phone || "—"}</td>
                <td><span className="status-pill">{n.event}</span></td>
                <td>{n.channels.join(", ")}</td>
                <td style={{ maxWidth: 460 }}>{n.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- enquiries */
function Enquiries() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const refresh = useCallback(() => {
    adminApi.enquiries().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const act = async (enquiry, action) => {
    if (!action) return;
    setError(null);
    setNote(null);
    try {
      const body = { action };
      if (action === "quote") {
        const amount = window.prompt(`Quote amount (₹) for ${enquiry.id} — budget ${enquiry.budgetBand}:`);
        if (!amount) return;
        body.amount = Number(amount.replace(/\D/g, ""));
        body.validityDays = Number(window.prompt("Quote validity (days):", "7")) || 7;
        body.note = window.prompt("Note to customer (optional):") || null;
      }
      await adminApi.patchEnquiry(enquiry.id, body);
      setNote(`${enquiry.id}: ${action} done`);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const actions = (status) =>
    ({
      New: ["quote", "decline"],
      Quoted: ["quote", "decline"],
      "In Production": ["ready"],
      Ready: ["complete"],
    }[status] || []);

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {data.enquiries.length === 0 ? (
        <p className="muted">No custom-design enquiries yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Enquiry</th><th>Customer</th><th>Brief</th><th>Budget</th><th>Quote</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {data.enquiries.map((e) => (
              <tr key={e.id}>
                <td>{e.id}<small>{fmtDate(e.history[0].at)}</small></td>
                <td>{e.name}<small>{e.phone}</small></td>
                <td>
                  {e.category} · {e.purity} {e.metal}
                  {e.stone ? ` · ${e.stone}` : ""}
                  <small>“{e.description.slice(0, 80)}{e.description.length > 80 ? "…" : ""}”</small>
                </td>
                <td>{e.budgetBand}</td>
                <td>
                  {e.quote ? formatINR(e.quote.amount) : <span className="muted">—</span>}
                  {e.advance ? <small>advance {formatINR(e.advance.amount)} paid</small> : null}
                </td>
                <td><span className="status-pill">{e.status}</span></td>
                <td>
                  {actions(e.status).length > 0 ? (
                    <select defaultValue="" onChange={(ev) => act(e, ev.target.value)}>
                      <option value="" disabled>Choose…</option>
                      {actions(e.status).map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- promos */
function Promos() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [form, setForm] = useState({
    code: "", type: "percent", value: "", minTotal: "", maxDiscount: "", maxUses: "", expiresAt: "", description: "",
  });

  const refresh = useCallback(() => {
    adminApi.coupons().then(setItems).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async (e) => {
    e.preventDefault();
    setError(null);
    setNote(null);
    try {
      await adminApi.createCoupon(form);
      setNote(`Coupon ${form.code.toUpperCase()} created.`);
      setForm({ code: "", type: "percent", value: "", minTotal: "", maxDiscount: "", maxUses: "", expiresAt: "", description: "" });
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggle = async (code, active) => {
    setError(null);
    try {
      await adminApi.patchCoupon(code, active);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !items) return <p className="form-error">{error}</p>;
  if (!items) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <div className="rates-layout">
      <div>
        <h3 className="admin-subhead" style={{ marginTop: 0 }}>Create a coupon</h3>
        {note && <p className="admin-note">{note}</p>}
        {error && <p className="form-error">{error}</p>}
        <form className="checkout-form" onSubmit={create}>
          <div className="form-row">
            <div className="field">
              <label>Code</label>
              <input required style={{ textTransform: "uppercase" }} value={form.code} onChange={set("code")} />
            </div>
            <div className="field">
              <label>Type</label>
              <select value={form.type} onChange={set("type")}>
                <option value="percent">% off the bag</option>
                <option value="flat">Flat ₹ off</option>
                <option value="makingWaiver">% off making charges</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>{form.type === "flat" ? "Amount (₹)" : "Value (%)"}</label>
              <input required inputMode="numeric" value={form.value} onChange={set("value")} />
            </div>
            <div className="field">
              <label>Min bag value (₹, optional)</label>
              <input inputMode="numeric" value={form.minTotal} onChange={set("minTotal")} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Max discount (₹, optional)</label>
              <input inputMode="numeric" value={form.maxDiscount} onChange={set("maxDiscount")} />
            </div>
            <div className="field">
              <label>Max uses (optional)</label>
              <input inputMode="numeric" value={form.maxUses} onChange={set("maxUses")} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Expires (optional)</label>
              <input type="date" value={form.expiresAt} onChange={set("expiresAt")} />
            </div>
            <div className="field">
              <label>Description (shown to customer)</label>
              <input value={form.description} onChange={set("description")} />
            </div>
          </div>
          <button className="btn btn-maroon">Create coupon</button>
        </form>
      </div>

      <div>
        <h3 className="admin-subhead" style={{ marginTop: 0 }}>Coupons</h3>
        <table className="admin-table">
          <thead>
            <tr><th>Code</th><th>Offer</th><th>Rules</th><th>Uses</th><th>Active</th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.code} style={c.active ? undefined : { opacity: 0.5 }}>
                <td>{c.code}{c.description ? <small>{c.description}</small> : null}</td>
                <td>
                  {c.type === "percent" ? `${c.value}% off` : c.type === "flat" ? `${formatINR(c.value)} off` : `${c.value}% off making`}
                  {c.maxDiscount ? <small>cap {formatINR(c.maxDiscount)}</small> : null}
                </td>
                <td>
                  {c.minTotal ? `min ${formatINR(c.minTotal)}` : "—"}
                  {c.expiresAt ? <small>till {c.expiresAt.slice(0, 10)}</small> : null}
                </td>
                <td>{c.uses}{c.maxUses ? `/${c.maxUses}` : ""}</td>
                <td>
                  <input type="checkbox" checked={c.active} onChange={(e) => toggle(c.code, e.target.checked)} aria-label={`Toggle ${c.code}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- buyback */
function Buyback() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const refresh = useCallback(() => {
    adminApi.buybacks().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const move = async (b, status) => {
    if (!status) return;
    setError(null);
    setNote(null);
    try {
      const body = { status };
      if (status === "Assayed") {
        const v = window.prompt(`Assayed final value for ${b.id} (indicative was ₹${b.indicative.net.toLocaleString("en-IN")}):`);
        if (!v) return;
        body.finalValue = Number(v.replace(/\D/g, ""));
      }
      await adminApi.patchBuyback(b.id, body);
      setNote(`${b.id} → ${status}`);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const nextOptions = (status) =>
    ({ Requested: ["Item Received", "Cancelled"], "Item Received": ["Assayed", "Cancelled"], Assayed: ["Settled"] }[status] || []);

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {data.buybacks.length === 0 ? (
        <p className="muted">No buyback requests yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Request</th><th>Customer</th><th>Item</th><th>Indicative</th><th>Final</th><th>Payout</th><th>Status</th><th>Move to</th></tr>
          </thead>
          <tbody>
            {data.buybacks.map((b) => (
              <tr key={b.id}>
                <td>{b.id}<small>{fmtDate(b.history[0].at)}</small></td>
                <td>{b.name}<small>{b.phone}</small></td>
                <td>
                  {b.weight} g {b.purity} {b.metalType}
                  <small>{b.hallmarked ? "hallmarked" : "non-hallmarked"}{b.hasInvoice ? " · invoice" : ""}</small>
                </td>
                <td>{formatINR(b.indicative.net)}</td>
                <td>{b.finalValue ? formatINR(b.finalValue) : <span className="muted">—</span>}</td>
                <td>{b.payout}</td>
                <td><span className="status-pill">{b.status}</span></td>
                <td>
                  {nextOptions(b.status).length > 0 ? (
                    <select defaultValue="" onChange={(e) => move(b, e.target.value)}>
                      <option value="" disabled>Choose…</option>
                      {nextOptions(b.status).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- returns */
function Returns() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const refresh = useCallback(() => {
    adminApi.returns().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const move = async (id, status) => {
    if (!status) return;
    setError(null);
    setNote(null);
    try {
      const noteText =
        status === "QC Failed"
          ? window.prompt("QC failure note (recorded on the request):") || "QC failed"
          : null;
      await adminApi.patchReturn(id, status, noteText);
      setNote(`${id} → ${status}`);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const nextOptions = (current) => {
    const fi = data.flow.indexOf(current);
    const opts = [];
    if (fi !== -1 && fi + 1 < data.flow.length) opts.push(data.flow[fi + 1]);
    if (current === "Received at Warehouse") opts.push("QC Failed");
    if (["Requested", "Pickup Scheduled"].includes(current)) opts.push("Cancelled");
    return opts;
  };

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {data.returns.length === 0 ? (
        <p className="muted">No return requests yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Request</th><th>Order / item</th><th>Type</th><th>Reason</th><th>Refund value</th><th>Status</th><th>Move to</th></tr>
          </thead>
          <tbody>
            {data.returns.map((r) => (
              <tr key={r.id}>
                <td>{r.id}<small>{fmtDate(r.history[0].at)}</small></td>
                <td>
                  {r.orderId}
                  <small>{r.itemName}{r.size ? ` (${r.size})` : ""} × {r.qty}</small>
                </td>
                <td>{r.type}</td>
                <td>{r.reason}{r.comments ? <small>“{r.comments}”</small> : null}</td>
                <td>{formatINR(r.refundAmount)}</td>
                <td><span className="status-pill">{r.status}</span></td>
                <td>
                  {nextOptions(r.status).length > 0 ? (
                    <select defaultValue="" onChange={(e) => move(r.id, e.target.value)}>
                      <option value="" disabled>Choose…</option>
                      {nextOptions(r.status).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- appointments */
function Appointments() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    adminApi.appointments().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const move = async (id, status) => {
    setError(null);
    try {
      await adminApi.patchAppointment(id, status);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {data.appointments.length === 0 ? (
        <p className="muted">No appointments booked yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Appointment</th><th>Customer</th><th>Showroom</th><th>When</th><th>Viewing</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {data.appointments.map((a) => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td>{a.name}<small>{a.phone}</small></td>
                <td>{a.storeName}</td>
                <td>{a.date}<small>{a.slot}</small></td>
                <td>{a.productName || <span className="muted">—</span>}{a.notes ? <small>“{a.notes}”</small> : null}</td>
                <td><span className="status-pill">{a.status}</span></td>
                <td>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {a.status === "Requested" && (
                      <button className="btn btn-green" style={{ padding: "0.4rem 0.9rem" }} onClick={() => move(a.id, "Confirmed")}>Confirm</button>
                    )}
                    {a.status === "Confirmed" && (
                      <button className="btn btn-green" style={{ padding: "0.4rem 0.9rem" }} onClick={() => move(a.id, "Completed")}>Complete</button>
                    )}
                    {["Requested", "Confirmed"].includes(a.status) && (
                      <button className="btn btn-outline" style={{ padding: "0.4rem 0.9rem" }} onClick={() => move(a.id, "Cancelled")}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- login */
function AdminLogin({ onAuthed }) {
  const [key, setKey] = useState("");
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      await adminApi.login(key);
      onAuthed();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420, padding: "6rem 0 8rem" }}>
      <span className="eyebrow">Back Office</span>
      <h1 className="section-title" style={{ marginBottom: "2rem" }}>
        Admin <em>sign in.</em>
      </h1>
      <form className="checkout-form" onSubmit={submit}>
        <div className="field">
          <label htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            type="password"
            required
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-maroon">Enter</button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------- dashboard */
function Dashboard({ goTo }) {
  const [data, setData] = useState(null);
  const [abandoned, setAbandoned] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.summary().then(setData).catch((e) => setError(e.message));
    adminApi.abandoned().then(setAbandoned).catch(() => {});
    adminApi.analytics().then(setAnalytics).catch(() => {});
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><span>{data.orders}</span><label>Orders</label></div>
        <div className="kpi"><span>{formatINR(data.revenue)}</span><label>Revenue</label></div>
        <div className="kpi"><span>{data.skus}</span><label>Live SKUs</label></div>
        <div className="kpi accent" onClick={() => goTo("rates")} role="button" tabIndex={0}>
          <span>{data.pendingRateProposals}</span><label>Rate proposals pending</label>
        </div>
        <div className="kpi accent" onClick={() => goTo("callbacks")} role="button" tabIndex={0}>
          <span>{data.callbacksNew ?? 0}</span><label>Call-backs waiting</label>
        </div>
        <div className="kpi"><span>{data.newsletterSubscribers}</span><label>Newsletter subscribers</label></div>
        <div className="kpi accent" onClick={() => goTo("notifications")} role="button" tabIndex={0}>
          <span>{data.notificationsSent ?? 0}</span><label>Messages sent</label>
        </div>
      </div>

      {data.providers && (
        <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "1.4rem" }}>
          Integrations — payments: <strong>{data.providers.payments}</strong> ·
          sms: <strong>{data.providers.sms}</strong> ·
          rate feed: <strong>{data.providers.rates}</strong>
          {" "}(go live via environment variables — see README "Going live")
        </p>
      )}

      {analytics && <Analytics a={analytics} loyalty={data.loyalty} />}

      {data.lowStock?.length > 0 && (
        <>
          <h3 className="admin-subhead">Low stock — reorder soon (FR-INV)</h3>
          <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
            <thead>
              <tr><th>Piece</th><th>Units left</th></tr>
            </thead>
            <tbody>
              {data.lowStock.map((p) => (
                <tr key={p.slug}>
                  <td>{p.name}<small>{p.slug}</small></td>
                  <td style={p.stock === 0 ? { color: "var(--maroon-bright)", fontWeight: 600 } : undefined}>
                    {p.stock === 0 ? "Sold out" : p.stock}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {abandoned.length > 0 && (
        <>
          <h3 className="admin-subhead">Abandoned bags — follow up (FR-CHK-10)</h3>
          <table className="admin-table" style={{ marginBottom: "1.4rem" }}>
            <thead>
              <tr><th>Customer</th><th>Bag</th><th>Value</th><th>When</th></tr>
            </thead>
            <tbody>
              {abandoned.map((a) => (
                <tr key={a.phone}>
                  <td>{a.name || "—"}<small>{a.phone}</small></td>
                  <td>{a.items.join(", ")}</td>
                  <td>{formatINR(a.value)}</td>
                  <td>{fmtDate(a.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {(data.topSearches?.length > 0 || data.zeroResultSearches?.length > 0) && (
        <div className="rates-layout" style={{ marginBottom: "1.4rem" }}>
          <div>
            <h3 className="admin-subhead">Top searches</h3>
            {data.topSearches.length === 0 ? (
              <p className="muted">No searches logged yet.</p>
            ) : (
              <table className="admin-table">
                <tbody>
                  {data.topSearches.map((s) => (
                    <tr key={s.term}>
                      <td>“{s.term}”</td>
                      <td>{s.count}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <h3 className="admin-subhead">Zero-result searches</h3>
            {data.zeroResultSearches.length === 0 ? (
              <p className="muted">None — every search found something.</p>
            ) : (
              <table className="admin-table">
                <tbody>
                  {data.zeroResultSearches.map((s) => (
                    <tr key={s.term}>
                      <td>“{s.term}”</td>
                      <td>{s.zero}×</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center" }}>
        <h3 className="admin-subhead" style={{ margin: 0 }}>Recent orders</h3>
        <a className="btn btn-outline" style={{ padding: "0.4rem 1rem", marginLeft: "auto" }} href={adminApi.exportUrl("orders")}>
          Export orders CSV
        </a>
        <a className="btn btn-outline" style={{ padding: "0.4rem 1rem" }} href={adminApi.exportUrl("schemes")}>
          Export schemes CSV
        </a>
      </div>
      {data.recentOrders.length === 0 ? (
        <p className="muted">No orders yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Placed</th><th>Status</th><th>Total</th></tr>
          </thead>
          <tbody>
            {data.recentOrders.map((o) => (
              <tr key={o.orderId}>
                <td>{o.orderId}</td>
                <td>{o.customer}</td>
                <td>{fmtDate(o.placedAt)}</td>
                <td><span className="status-pill">{o.status}</span></td>
                <td>{formatINR(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- analytics */
function Analytics({ a, loyalty }) {
  const maxRev = Math.max(...a.byDay.map((d) => d.revenue), 1);
  const maxCat = Math.max(...a.categories.map((c) => c.revenue), 1);
  const W = 560, H = 120, gap = 6;
  const barW = (W - gap * 13) / 14;

  return (
    <>
      <h3 className="admin-subhead">Trading — last 14 days</h3>
      <div className="rates-layout" style={{ marginBottom: "1.6rem" }}>
        <div className="kpi" style={{ padding: "1.2rem 1.4rem" }}>
          <svg viewBox={`0 0 ${W} ${H + 22}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Daily revenue, last 14 days">
            {a.byDay.map((d, i) => {
              const h = Math.max(2, (d.revenue / maxRev) * H);
              return (
                <g key={d.day}>
                  <rect
                    x={i * (barW + gap)}
                    y={H - h}
                    width={barW}
                    height={h}
                    rx={3}
                    fill={d.revenue > 0 ? "var(--maroon)" : "var(--line)"}
                  >
                    <title>{`${d.day}: ₹${d.revenue.toLocaleString("en-IN")} (${d.orders} orders)`}</title>
                  </rect>
                  {i % 2 === 1 && (
                    <text x={i * (barW + gap) + barW / 2} y={H + 16} textAnchor="middle" fontSize="9" fill="var(--ink-faint)">
                      {d.day.slice(8)}/{d.day.slice(5, 7)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <label style={{ fontSize: "0.72rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
            Daily revenue (hover bars)
          </label>
        </div>
        <div>
          <div className="kpi-grid" style={{ marginBottom: "0.9rem" }}>
            <div className="kpi"><span>{formatINR(a.aov)}</span><label>Avg order value</label></div>
            <div className="kpi"><span>{a.repeatRatePct}%</span><label>Repeat buyers</label></div>
            <div className="kpi"><span>{a.pickupSharePct}%</span><label>Store pickup share</label></div>
            <div className="kpi"><span>{loyalty?.members ?? 0}</span><label>Rewards members</label></div>
            <div className="kpi"><span>{(loyalty?.pointsOutstanding ?? 0).toLocaleString("en-IN")}</span><label>Points outstanding</label></div>
            <div className="kpi"><span>{a.couponsUsed}</span><label>Coupon orders</label></div>
          </div>
          {a.categories.slice(0, 5).map((c) => (
            <div key={c.category} style={{ marginBottom: "0.45rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 2 }}>
                <span style={{ textTransform: "capitalize" }}>{c.category}</span>
                <span className="muted">{formatINR(c.revenue)}</span>
              </div>
              <div className="progress" style={{ height: 6 }}>
                <div className="progress-bar" style={{ width: `${(c.revenue / maxCat) * 100}%`, height: "100%" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------- orders */
function Orders() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  const refresh = useCallback(() => {
    adminApi.orders().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const move = async (orderId, status) => {
    if (!status) return;
    setError(null);
    setNote(null);
    try {
      await adminApi.setOrderStatus(orderId, status);
      setNote(`${orderId} → ${status}`);
      refresh();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {data.orders.length === 0 ? (
        <p className="muted">No orders yet — place one from the storefront.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th><th>Move to</th></tr>
          </thead>
          <tbody>
            {data.orders.map((o) => (
              <tr key={o.orderId}>
                <td>
                  {o.orderId}
                  <small>{fmtDate(o.placedAt)}</small>
                  {(o.invoice || o.payment.status === "paid" || !["Placed", "Verification Pending", "Cancelled"].includes(o.status)) && (
                    <small>
                      <a
                        className="link-underline"
                        href={`/invoice/${o.orderId}?phone=${encodeURIComponent(o.customer.phone)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {o.invoice ? o.invoice.number : "Tax invoice"}
                      </a>
                    </small>
                  )}
                  <small>
                    <a
                      className="link-underline"
                      href={`/packing-slip/${o.orderId}?phone=${encodeURIComponent(o.customer.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Packing slip{o.gift?.hideInvoiceValue ? " (no values)" : ""}
                    </a>
                  </small>
                </td>
                <td>
                  {o.customer.name}
                  <small>{o.customer.phone}</small>
                </td>
                <td>
                  {o.lines.map((l) => (
                    <div key={l.slug + (l.size || "")}>
                      {l.name}
                      {l.size ? ` (${l.size})` : ""} × {l.qty}
                    </div>
                  ))}
                </td>
                <td>
                  {o.payment.mode.toUpperCase()}
                  <small>{o.payment.status}</small>
                </td>
                <td>{formatINR(o.total)}</td>
                <td>
                  <span
                    className="status-pill"
                    style={o.status === "Verification Pending" ? { background: "rgba(140,22,38,.12)", color: "var(--maroon-bright)" } : undefined}
                  >
                    {o.status}
                  </span>
                </td>
                <td>
                  {(o.nextStatuses || []).length > 0 ? (
                    <select defaultValue="" onChange={(e) => move(o.orderId, e.target.value)}>
                      <option value="" disabled>Choose…</option>
                      {o.nextStatuses.map((s) => (
                        <option key={s} value={s}>
                          {o.status === "Verification Pending" && s === "Confirmed" ? "Verified — Confirm" : s}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- catalogue */
const PURITIES = { gold: ["24K", "22K", "18K", "14K"], silver: ["925"], platinum: ["PT950"] };

function AddProduct({ onCreated, onError }) {
  const [open, setOpen] = useState(false);
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const blank = {
    name: "", slug: "", category: "rings", metalType: "gold", purity: "22K",
    colour: "yellow", grossWeight: "", netWeight: "", makingBasis: "perGram",
    makingValue: "", imageUrl: "", extraImages: "", sizes: "", stock: "6", description: "",
    collection: "", gender: "women", sizeLabel: "",
    stoneType: "", stoneCarat: "", stoneRate: "", stoneCertBody: "", stoneCertNo: "",
    hallmarkingCharge: "45", certificationCharge: "", huid: "", leadTimeDays: "",
    engravable: false, featured: false,
  };
  const [form, setForm] = useState(blank);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    api.categories().then(setCats).catch(() => {});
  }, []);

  // multi-file upload: first file becomes the cover (if empty), the rest
  // join the extra-images list
  const uploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    onError(null);
    try {
      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) throw new Error(`${file.name} is over 100 MB.`);
        const { url } = await adminApi.uploadFile(file);
        setForm((f) =>
          !f.imageUrl
            ? { ...f, imageUrl: url }
            : { ...f, extraImages: f.extraImages ? `${f.extraImages};${url}` : url }
        );
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const set = (k) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: value };
      // keep purity valid when the metal changes
      if (k === "metalType" && !PURITIES[value].includes(f.purity)) next.purity = PURITIES[value][0];
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      const res = await adminApi.createProduct({
        name: form.name,
        slug: form.slug,
        category: form.category,
        metalType: form.metalType,
        purity: form.purity,
        colour: form.colour,
        grossWeight: Number(form.grossWeight),
        netWeight: Number(form.netWeight),
        making: { basis: form.makingBasis, value: Number(form.makingValue) },
        imageUrl: form.imageUrl || undefined,
        extraImages: form.extraImages
          ? form.extraImages.split(";").map((t) => t.trim()).filter(Boolean)
          : undefined,
        sizes: form.sizes,
        stock: form.stock === "" ? undefined : Number(form.stock),
        description: form.description,
        collection: form.collection || undefined,
        gender: form.gender,
        sizeLabel: form.sizeLabel || undefined,
        stone: form.stoneType
          ? {
              type: form.stoneType,
              caratTotal: Number(form.stoneCarat),
              ratePerCarat: Number(form.stoneRate),
              certBody: form.stoneCertBody || undefined,
              certNo: form.stoneCertNo || undefined,
            }
          : undefined,
        hallmarkingCharge: form.hallmarkingCharge === "" ? undefined : Number(form.hallmarkingCharge),
        certificationCharge: form.certificationCharge === "" ? undefined : Number(form.certificationCharge),
        huid: form.huid || undefined,
        leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
        madeToOrder: Number(form.leadTimeDays) > 0,
        engravable: form.engravable,
        featured: form.featured,
      });
      setForm(blank);
      setOpen(false);
      onCreated(res);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open)
    return (
      <button className="btn btn-maroon" style={{ marginBottom: "1.4rem" }} onClick={() => setOpen(true)}>
        + Add a piece
      </button>
    );

  return (
    <form className="checkout-form" onSubmit={submit} style={{ marginBottom: "2rem", maxWidth: 720 }}>
      <div className="form-row">
        <div className="field">
          <label>Name</label>
          <input required value={form.name} onChange={set("name")} placeholder="Kaveri Gold Band" />
        </div>
        <div className="field">
          <label>Slug (optional — derived from name)</label>
          <input value={form.slug} onChange={set("slug")} placeholder="kaveri-gold-band" />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Category</label>
          <select value={form.category} onChange={set("category")}>
            {(cats.length ? cats : [{ key: "rings", label: "Rings" }]).map((c) => (
              <option key={c.key} value={c.key}>{c.label || c.key}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Metal</label>
          <select value={form.metalType} onChange={set("metalType")}>
            <option value="gold">Gold</option>
            <option value="silver">Silver</option>
            <option value="platinum">Platinum</option>
          </select>
        </div>
        <div className="field">
          <label>Purity</label>
          <select value={form.purity} onChange={set("purity")}>
            {PURITIES[form.metalType].map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Gross weight (g)</label>
          <input required inputMode="decimal" value={form.grossWeight} onChange={set("grossWeight")} />
        </div>
        <div className="field">
          <label>Net metal weight (g)</label>
          <input required inputMode="decimal" value={form.netWeight} onChange={set("netWeight")} />
        </div>
        <div className="field">
          <label>Colour</label>
          <select value={form.colour} onChange={set("colour")}>
            <option value="yellow">Yellow</option>
            <option value="white">White</option>
            <option value="rose">Rose</option>
            <option value="two-tone">Two-tone</option>
          </select>
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label>Making basis</label>
          <select value={form.makingBasis} onChange={set("makingBasis")}>
            <option value="perGram">₹ per gram</option>
            <option value="percent">% of metal value</option>
            <option value="flat">Flat ₹</option>
          </select>
        </div>
        <div className="field">
          <label>Making value</label>
          <input required inputMode="numeric" value={form.makingValue} onChange={set("makingValue")} />
        </div>
        <div className="field">
          <label>Opening stock</label>
          <input inputMode="numeric" value={form.stock} onChange={set("stock")} />
        </div>
      </div>
      <div className="field">
        <label>
          Images{" "}
          <span className="muted" style={{ fontWeight: 400 }}>
            — the first is the cover; upload from your computer or paste URLs
          </span>
        </label>
        <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
          <input
            style={{ flex: "1 1 260px" }}
            value={form.imageUrl}
            onChange={set("imageUrl")}
            placeholder="https://…  (defaults to a house image)"
          />
          <label className="btn btn-outline" style={{ padding: "0.5rem 1rem", cursor: "pointer" }}>
            {uploading ? "Uploading…" : "⤒ Upload images…"}
            <input type="file" accept="image/*" multiple hidden onChange={uploadImages} disabled={uploading} />
          </label>
        </div>
        <input
          value={form.extraImages}
          onChange={set("extraImages")}
          placeholder="More image URLs, separated by ; (optional)"
        />
      </div>
      <div className="form-row">
        <div className="field">
          <label>Sizes (comma-separated, optional)</label>
          <input value={form.sizes} onChange={set("sizes")} placeholder="10, 12, 14" />
        </div>
      </div>
      <div className="field">
        <label>Description (optional)</label>
        <textarea rows={2} value={form.description} onChange={set("description")} />
      </div>

      <details style={{ margin: "0.4rem 0 0.8rem" }}>
        <summary style={{ cursor: "pointer", fontSize: "0.82rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          More details — collection, stone, charges, HUID (optional)
        </summary>
        <div style={{ paddingTop: "0.9rem" }}>
          <div className="form-row">
            <div className="field">
              <label>Collection</label>
              <input value={form.collection} onChange={set("collection")} placeholder="Atelier" />
            </div>
            <div className="field">
              <label>Gender</label>
              <select value={form.gender} onChange={set("gender")}>
                <option value="women">Women</option>
                <option value="men">Men</option>
                <option value="unisex">Unisex</option>
              </select>
            </div>
            <div className="field">
              <label>Size label</label>
              <input value={form.sizeLabel} onChange={set("sizeLabel")} placeholder="Ring size" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Stone type</label>
              <input value={form.stoneType} onChange={set("stoneType")} placeholder="diamond" />
            </div>
            <div className="field">
              <label>Carat total</label>
              <input inputMode="decimal" value={form.stoneCarat} onChange={set("stoneCarat")} placeholder="0.25" />
            </div>
            <div className="field">
              <label>Rate per carat (₹)</label>
              <input inputMode="numeric" value={form.stoneRate} onChange={set("stoneRate")} placeholder="180000" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Cert body</label>
              <input value={form.stoneCertBody} onChange={set("stoneCertBody")} placeholder="IGI / GIA" />
            </div>
            <div className="field">
              <label>Cert number</label>
              <input value={form.stoneCertNo} onChange={set("stoneCertNo")} placeholder="IGI-2026-118" />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Hallmarking charge (₹)</label>
              <input inputMode="numeric" value={form.hallmarkingCharge} onChange={set("hallmarkingCharge")} />
            </div>
            <div className="field">
              <label>Certification charge (₹)</label>
              <input inputMode="numeric" value={form.certificationCharge} onChange={set("certificationCharge")} placeholder="0" />
            </div>
            <div className="field">
              <label>HUID (blank = auto)</label>
              <input value={form.huid} onChange={set("huid")} placeholder="K4M7P2" maxLength={6} />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>Lead time, days (made-to-order if &gt; 0)</label>
              <input inputMode="numeric" value={form.leadTimeDays} onChange={set("leadTimeDays")} placeholder="0" />
            </div>
            <div className="field" style={{ justifyContent: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                <input
                  type="checkbox"
                  checked={form.engravable}
                  onChange={(e) => setForm((f) => ({ ...f, engravable: e.target.checked }))}
                />
                Engravable
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", textTransform: "none" }}>
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
                />
                Featured on home
              </label>
            </div>
          </div>
        </div>
      </details>

      <div style={{ display: "flex", gap: "0.7rem" }}>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Creating…" : "Create piece"}
        </button>
        <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function StockCell({ product, onSaved, onError }) {
  const [value, setValue] = useState(String(product.stock));

  const commit = async () => {
    const s = Number(value);
    if (s === product.stock) return;
    try {
      await adminApi.patchProduct(product.slug, { stock: s });
      onSaved();
    } catch (e) {
      setValue(String(product.stock));
      onError(e.message);
    }
  };

  return (
    <input
      type="number"
      min={0}
      max={999}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
      aria-label={`Stock for ${product.name}`}
      style={{
        width: 64,
        padding: "0.35rem 0.5rem",
        borderRadius: 8,
        border: `1px solid ${product.stock === 0 ? "var(--maroon-bright)" : "var(--line)"}`,
        background: "var(--cream)",
        fontSize: "0.84rem",
      }}
    />
  );
}

const CSV_TEMPLATE =
  "slug,name,category,metalType,purity,colour,grossWeight,netWeight,makingBasis,makingValue,imageUrl" +
  " (+ optional: stock,sizes,description,collection,gender,stoneType,stoneCarat,stoneRatePerCarat,stoneCertBody,stoneCertNo," +
  "hallmarkingCharge,certificationCharge,hsn,huid,madeToOrder,leadTimeDays,engravable,sizeLabel,featured,published,extraImages,occasion)";

/* Per-product image gallery editor — first image is the cover shown on
   cards, in the bag and on invoices; the rest become PDP thumbnails. */
function ImagesEditor({ product, onSaved, onError }) {
  const [imgs, setImgs] = useState(product.images || []);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (imgs.length + files.length > 8) {
      onError("A piece can carry at most 8 images.");
      return;
    }
    setUploading(true);
    onError(null);
    try {
      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) throw new Error(`${file.name} is over 100 MB.`);
        const { url: uploaded } = await adminApi.uploadFile(file);
        setImgs((prev) => [...prev, uploaded]);
      }
    } catch (err) {
      onError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const addUrl = () => {
    const u = url.trim();
    if (!u) return;
    if (imgs.length >= 8) {
      onError("A piece can carry at most 8 images.");
      return;
    }
    setImgs((prev) => [...prev, u]);
    setUrl("");
  };

  const save = async () => {
    setBusy(true);
    onError(null);
    try {
      await adminApi.patchProduct(product.slug, { images: imgs });
      onSaved(imgs.length);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: "0.9rem 0.4rem", display: "grid", gap: "0.9rem" }}>
      <div style={{ display: "flex", gap: "0.8rem", flexWrap: "wrap" }}>
        {imgs.map((src, i) => (
          <figure key={`${src}-${i}`} style={{ margin: 0, width: 92, textAlign: "center" }}>
            <img
              src={src}
              alt=""
              style={{
                width: 92, height: 92, objectFit: "cover", borderRadius: 8, display: "block",
                border: i === 0 ? "2px solid var(--gold)" : "1px solid var(--line)",
              }}
            />
            <figcaption style={{ fontSize: "0.68rem", marginTop: "0.25rem", display: "flex", justifyContent: "center", gap: "0.5rem" }}>
              {i === 0 ? (
                <span style={{ color: "var(--gold)", fontWeight: 600 }}>Cover</span>
              ) : (
                <button className="remove-btn" onClick={() => setImgs((prev) => [prev[i], ...prev.filter((_, j) => j !== i)])}>
                  Make cover
                </button>
              )}
              {imgs.length > 1 && (
                <button className="remove-btn" onClick={() => setImgs((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </button>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", alignItems: "center" }}>
        <label className="btn btn-outline" style={{ padding: "0.45rem 1rem", cursor: "pointer" }}>
          {uploading ? "Uploading…" : "⤒ Upload images…"}
          <input type="file" accept="image/*" multiple hidden onChange={uploadFiles} disabled={uploading} />
        </label>
        <input
          style={{ flex: "1 1 240px", padding: "0.5rem 0.8rem", border: "1px solid var(--line)", borderRadius: 8, background: "var(--cream)" }}
          placeholder="…or paste an image URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
        />
        <button className="btn btn-outline" style={{ padding: "0.45rem 1rem" }} onClick={addUrl} disabled={!url.trim()}>
          Add URL
        </button>
        <button className="btn btn-maroon" style={{ padding: "0.45rem 1.2rem" }} onClick={save} disabled={busy || uploading || imgs.length === 0}>
          {busy ? "Saving…" : `Save ${imgs.length} image${imgs.length === 1 ? "" : "s"}`}
        </button>
      </div>
      <p className="muted" style={{ fontSize: "0.76rem", margin: 0 }}>
        1–8 images. The gold-framed first image is the cover (cards, bag,
        invoices); the others appear as thumbnails on the product page.
      </p>
    </div>
  );
}

function Catalogue() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [csv, setCsv] = useState("");
  const [fileInfo, setFileInfo] = useState(null); // {name, rows}
  const [report, setReport] = useState(null);
  const [imagesFor, setImagesFor] = useState(null); // slug with the images editor open

  const refresh = useCallback(() => {
    adminApi.products().then(setItems).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const toggle = async (slug, field, value) => {
    setError(null);
    try {
      await adminApi.patchProduct(slug, { [field]: value });
      setItems((prev) => prev.map((p) => (p.slug === slug ? { ...p, [field]: value } : p)));
      setNote(`${slug}: ${field} → ${value ? "on" : "off"}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const importCsv = async (e) => {
    e.preventDefault();
    setError(null);
    setReport(null);
    try {
      const r = await adminApi.uploadCsv(csv);
      setReport(r);
      setCsv("");
      setFileInfo(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const readFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setReport(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsv(text);
      const rows = text.split(/\r?\n/).filter((l) => l.trim()).length;
      setFileInfo({ name: file.name, rows: Math.max(0, rows - 1) });
    };
    reader.onerror = () => setError("Could not read that file — is it a plain .csv?");
    reader.readAsText(file);
    e.target.value = ""; // allow re-choosing the same file
  };

  if (error && !items) return <p className="form-error">{error}</p>;
  if (!items) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}

      <h3 className="admin-subhead" style={{ marginTop: 0 }}>
        Catalogue ({items.length} SKUs)
      </h3>
      <AddProduct
        onCreated={(r) => {
          setNote(`${r.slug} created — priced ${formatINR(r.price)} at today's rate, live on the storefront.`);
          refresh();
        }}
        onError={setError}
      />
      <table className="admin-table">
        <thead>
          <tr><th>Product</th><th>Category</th><th>Purity</th><th>Net wt</th><th>Making</th><th>Price today</th><th>Stock</th><th>Images</th><th>Published</th><th>Featured</th></tr>
        </thead>
        <tbody>
          {items.map((p) => (
            <Fragment key={p.slug}>
              <tr style={p.published ? undefined : { opacity: 0.5 }}>
                <td>{p.name}<small>{p.slug}</small></td>
                <td>{p.category}</td>
                <td>{p.purity}</td>
                <td>{p.netWeight} g</td>
                <td>
                  {p.making.basis === "perGram"
                    ? `₹${p.making.value}/g`
                    : p.making.basis === "percent"
                      ? `${p.making.value}%`
                      : `₹${p.making.value} flat`}
                </td>
                <td>{formatINR(p.price)}</td>
                <td>
                  {p.stock === null ? (
                    <span className="muted" title="Made to order">MTO</span>
                  ) : (
                    <StockCell product={p} onSaved={refresh} onError={setError} />
                  )}
                </td>
                <td>
                  <button
                    className="btn btn-outline"
                    style={{ padding: "0.3rem 0.8rem" }}
                    onClick={() => setImagesFor(imagesFor === p.slug ? null : p.slug)}
                    aria-expanded={imagesFor === p.slug}
                  >
                    {imagesFor === p.slug ? "Close" : `${p.images?.length ?? 1} ▤`}
                  </button>
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={p.published}
                    onChange={(e) => toggle(p.slug, "published", e.target.checked)}
                    aria-label={`Publish ${p.name}`}
                  />
                </td>
                <td>
                  <input
                    type="checkbox"
                    checked={p.featured}
                    onChange={(e) => toggle(p.slug, "featured", e.target.checked)}
                    aria-label={`Feature ${p.name}`}
                  />
                </td>
              </tr>
              {imagesFor === p.slug && (
                <tr>
                  <td colSpan={10} style={{ background: "var(--paper)" }}>
                    <ImagesEditor
                      product={p}
                      onSaved={(n) => {
                        setNote(`${p.slug}: ${n} image${n > 1 ? "s" : ""} saved — live on the product page.`);
                        setImagesFor(null);
                        refresh();
                      }}
                      onError={setError}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <h3 className="admin-subhead">Bulk upload & download (CSV)</h3>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "0.9rem" }}>
        Workflow: download the <strong>template</strong> (or the <strong>current
        catalogue</strong>), fill or edit it in Excel / Google Sheets, then upload
        it back. Existing slugs are updated; new slugs are created as published
        pieces. Put multiple sizes in one cell separated by semicolons
        (e.g. <code>10;12;14</code>); stock and description are optional.
      </p>
      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <a className="btn btn-outline" style={{ padding: "0.5rem 1.1rem" }} href={adminApi.exportUrl("template")}>
          ⤓ Download template
        </a>
        <a className="btn btn-outline" style={{ padding: "0.5rem 1.1rem" }} href={adminApi.exportUrl("catalogue")}>
          ⤓ Download current catalogue ({items.length} SKUs)
        </a>
      </div>
      <form onSubmit={importCsv} className="checkout-form">
        <div style={{ display: "flex", gap: "0.9rem", alignItems: "center", flexWrap: "wrap" }}>
          <label className="btn btn-outline" style={{ padding: "0.5rem 1.1rem", cursor: "pointer" }}>
            Choose CSV file…
            <input type="file" accept=".csv,text/csv" onChange={readFile} style={{ display: "none" }} />
          </label>
          {fileInfo && (
            <span className="muted" style={{ fontSize: "0.86rem" }}>
              <strong>{fileInfo.name}</strong> — {fileInfo.rows} row{fileInfo.rows === 1 ? "" : "s"} ready
            </span>
          )}
          <button className="btn btn-maroon" disabled={!csv.trim()}>
            Validate & import
          </button>
        </div>
        <details style={{ marginTop: "0.6rem" }}>
          <summary className="muted" style={{ cursor: "pointer", fontSize: "0.84rem" }}>
            …or paste CSV text instead
          </summary>
          <textarea
            rows={6}
            placeholder={CSV_TEMPLATE}
            value={csv}
            onChange={(e) => { setCsv(e.target.value); setFileInfo(null); }}
            style={{ width: "100%", marginTop: "0.6rem", padding: "0.8rem 1rem", borderRadius: 10, border: "1px solid var(--line)", background: "var(--cream)", fontFamily: "monospace", fontSize: "0.82rem" }}
          />
        </details>
      </form>
      {report && (
        <div className="admin-note" style={{ marginTop: "1rem" }}>
          Created {report.created}, updated {report.updated}, errors {report.errors.length}.
          {report.errors.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0 1.2rem" }}>
              {report.errors.map((e, i) => (
                <li key={i}>Row {e.row}: {e.error}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}

/* ---------------------------------------------------------- schemes */
function Schemes() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminApi.schemes().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  return (
    <>
      <div className="kpi-grid">
        <div className="kpi"><span>{data.totals.enrolments}</span><label>Enrolments</label></div>
        <div className="kpi"><span>{data.totals.active}</span><label>Active</label></div>
        <div className="kpi"><span>{formatINR(data.totals.collected)}</span><label>Collected</label></div>
        <div className="kpi"><span>{data.totals.gramsLiability} g</span><label>Gold liability</label></div>
        <div className="kpi"><span>{formatINR(data.totals.valueLiability)}</span><label>Value liability today</label></div>
      </div>

      <h3 className="admin-subhead">Scheme ledger</h3>
      {data.schemes.length === 0 ? (
        <p className="muted">No enrolments yet.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Scheme</th><th>Customer</th><th>Monthly</th><th>Paid</th><th>Grams</th><th>Value today</th><th>Status</th></tr>
          </thead>
          <tbody>
            {data.schemes.map((s) => (
              <tr key={s.id}>
                <td>{s.variantName}<small>{s.id}</small></td>
                <td>{s.customer.name}<small>{s.customer.phone}{s.customer.pan ? ` · PAN ${s.customer.pan}` : ""}</small></td>
                <td>{formatINR(s.monthlyAmount)}</td>
                <td>{s.paidCount}/{s.tenureMonths} · {formatINR(s.totalPaid)}</td>
                <td>{s.gramsAccrued} g</td>
                <td>{formatINR(s.currentValue)}</td>
                <td><span className="status-pill">{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

/* ---------------------------------------------------------- rate console */
function Rates() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [form, setForm] = useState({ metal: "gold", purity: "22K", value: "", maker: "", note: "" });
  const [checker, setChecker] = useState("");

  const refresh = useCallback(() => {
    adminApi.rates().then(setData).catch((e) => setError(e.message));
  }, []);

  useEffect(refresh, [refresh]);

  const purities = data ? Object.keys(data.rates[form.metal] || {}) : [];

  const instant = data ? !data.makerChecker : false;

  const propose = async (e) => {
    e.preventDefault();
    setError(null);
    setNote(null);
    try {
      await adminApi.proposeRate({ ...form, value: Number(form.value) });
      setNote(
        instant
          ? "Rate published. Catalogue reprices immediately."
          : "Proposal submitted — awaiting checker approval."
      );
      setForm((f) => ({ ...f, value: "", note: "" }));
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  const resolve = async (id, action) => {
    setError(null);
    setNote(null);
    if (!checker.trim()) {
      setError("Enter the checker's name first (maker-checker requires a second person).");
      return;
    }
    try {
      await adminApi.resolveProposal(id, action, checker.trim());
      setNote(action === "approve" ? "Rate published. Catalogue reprices immediately." : "Proposal rejected.");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const pending = data.proposals.filter((p) => p.status === "pending");

  return (
    <div className="rates-layout">
      <div>
        <h3 className="admin-subhead">Live rates (₹/g)</h3>
        <table className="admin-table">
          <tbody>
            {Object.entries(data.rates).flatMap(([metal, table]) =>
              Object.entries(table).map(([purity, v]) => (
                <tr key={metal + purity}>
                  <td style={{ textTransform: "capitalize" }}>{metal} {purity}</td>
                  <td>{formatINR(v)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
          {data.updatedAt ? `Last published ${fmtDate(data.updatedAt)}` : "No rate change published yet"} ·
          guard blocks moves beyond ±{data.guardPct}%
        </p>

        <h3 className="admin-subhead">{instant ? "Update a rate" : "Propose a change (maker)"}</h3>
        {instant && (
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "-0.4rem", marginBottom: "0.8rem" }}>
            Single-operator mode: changes publish instantly. Re-enable second-person
            approval in Settings → “Rate maker-checker”.
          </p>
        )}
        <form className="checkout-form" onSubmit={propose}>
          <div className="form-row">
            <div className="field">
              <label>Metal</label>
              <select
                value={form.metal}
                onChange={(e) => {
                  const metal = e.target.value;
                  setForm((f) => ({ ...f, metal, purity: Object.keys(data.rates[metal])[0] }));
                }}
              >
                {Object.keys(data.rates).map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Purity</label>
              <select value={form.purity} onChange={(e) => setForm((f) => ({ ...f, purity: e.target.value }))}>
                {purities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                {form.metal === "gold" && <option value="ALL">All purities (enter 24K)</option>}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label>{form.purity === "ALL" ? "New 24K rate (₹/g)" : "New rate (₹/g)"}</label>
              <input
                required
                inputMode="numeric"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value.replace(/\D/g, "") }))}
              />
              {form.purity === "ALL" && form.value > 0 && data.purityFactors && (
                <small className="muted" style={{ display: "block", marginTop: "0.35rem" }}>
                  Derives:{" "}
                  {Object.entries(data.purityFactors)
                    .filter(([p]) => p !== "24K")
                    .map(([p, f]) => `${p} ${formatINR(Math.round(form.value * f))}`)
                    .join(" · ")}
                </small>
              )}
            </div>
            <div className="field">
              <label>Maker name</label>
              <input required value={form.maker} onChange={(e) => setForm((f) => ({ ...f, maker: e.target.value }))} />
            </div>
          </div>
          <div className="field">
            <label>Note (optional)</label>
            <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </div>
          <button className="btn btn-maroon">{instant ? "Publish rate" : "Submit proposal"}</button>
        </form>
      </div>

      <div>
        {error && <p className="form-error">{error}</p>}
        {note && <p className="admin-note">{note}</p>}

        <h3 className="admin-subhead">Pending approval (checker)</h3>
        {(!instant || pending.length > 0) && (
          <div className="field" style={{ marginBottom: "1rem" }}>
            <label>Checker name</label>
            <input
              placeholder="Must differ from maker"
              value={checker}
              onChange={(e) => setChecker(e.target.value)}
            />
          </div>
        )}
        {pending.length === 0 ? (
          <p className="muted">Nothing waiting.</p>
        ) : (
          pending.map((p) => (
            <div key={p.id} className="proposal-card">
              <div>
                <strong style={{ textTransform: "capitalize" }}>
                  {p.metal} {p.purity === "ALL" ? "all purities (24K)" : p.purity}: {formatINR(p.from)} → {formatINR(p.to)}
                </strong>
                <small>
                  by {p.maker} · {fmtDate(p.createdAt)}
                  {p.note ? ` · “${p.note}”` : ""}
                </small>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn btn-green" onClick={() => resolve(p.id, "approve")}>Approve</button>
                <button className="btn btn-outline" onClick={() => resolve(p.id, "reject")}>Reject</button>
              </div>
            </div>
          ))
        )}

        <h3 className="admin-subhead">Audit trail</h3>
        {data.audit.length === 0 ? (
          <p className="muted">No published changes yet.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>When</th><th>Rate</th><th>From → To</th><th>Maker / Checker</th></tr>
            </thead>
            <tbody>
              {data.audit.map((a, i) => (
                <tr key={i}>
                  <td>{fmtDate(a.at)}</td>
                  <td style={{ textTransform: "capitalize" }}>{a.metal} {a.purity}</td>
                  <td>{formatINR(a.from)} → {formatINR(a.to)}</td>
                  <td>{a.maker} / {a.checker}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
