import { Fragment, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminApi, api } from "../lib/api";
import { formatINR } from "../lib/format";

const fmtDate = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

/* One tile per admin module — the same catalog the server enforces.
   `nav` is the tab label; `hint` explains the tile when granting it. */
const PERMISSION_DEFINITIONS = [
  { id: "dashboard", nav: "Dashboard", hint: "KPIs, abandoned bags and business reports.", color: "#5b74c0" },
  { id: "orders", nav: "Orders", hint: "Order lifecycle — statuses, documents, delivery.", color: "#b02a45" },
  { id: "customers", nav: "Customers", hint: "Customer directory and full profiles.", color: "#27754c" },
  { id: "rates", nav: "Rate Console", hint: "Publish metal rates and approve proposals.", color: "#9a721a" },
  { id: "catalogue", nav: "Catalogue", hint: "Products, stock, images and CSV bulk edits.", color: "#8c5b3f" },
  { id: "schemes", nav: "Schemes", hint: "Gold savings schemes and instalments.", color: "#7a5c96" },
  { id: "returns", nav: "Returns", hint: "Return requests and refunds.", color: "#3d7d84" },
  { id: "appointments", nav: "Appointments", hint: "Showroom visit bookings.", color: "#a2543c" },
  { id: "callbacks", nav: "Call-backs", hint: "Requested product call-backs.", color: "#5f7d3a" },
  { id: "promos", nav: "Promos", hint: "Coupons and promotional codes.", color: "#b0642a" },
  { id: "buyback", nav: "Buyback", hint: "Old-gold exchange requests.", color: "#6d6d3f" },
  { id: "enquiries", nav: "Enquiries", hint: "Custom-piece enquiries.", color: "#84406b" },
  { id: "notifications", nav: "Notifications", hint: "Outbound message log.", color: "#4f6f8f" },
  { id: "settings", nav: "Settings", hint: "Branding, policies, showrooms — every site setting.", color: "#3a5f52" },
  { id: "admin-users", nav: "Admin Users", hint: "Manage who can access this portal.", color: "#8c1626" },
];
const permDef = (id) => PERMISSION_DEFINITIONS.find((p) => p.id === id) || { id, nav: id, hint: "", color: "#888" };

/* Nav grouping — related modules sit together under a quiet label. */
const NAV_GROUPS = [
  ["Business", ["dashboard", "orders", "customers", "catalogue"]],
  ["Jewellery", ["rates", "schemes", "buyback"]],
  ["Support", ["enquiries", "appointments", "callbacks", "returns"]],
  ["Marketing", ["promos", "notifications"]],
  ["Administration", ["admin-users", "settings"]],
];

export default function Admin() {
  const [authed, setAuthed] = useState(adminApi.hasKey());
  const [me, setMe] = useState(null); // hash-stripped admin + catalog, from /me
  // the active module lives in the URL (?tab=…) so a refresh stays on the same page
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab");
  const tab = PERMISSION_DEFINITIONS.some((p) => p.id === rawTab) ? rawTab : "dashboard";
  const setTab = useCallback(
    (id) => setParams(id && id !== "dashboard" ? { tab: id } : {}),
    [setParams]
  );
  const [badges, setBadges] = useState({});

  // the storefront wallpaper glows; the back office needs calm — a strong
  // veil goes over the underlay while /admin is mounted
  useEffect(() => {
    document.body.classList.add("admin-calm");
    return () => document.body.classList.remove("admin-calm");
  }, []);

  // nav badges: things waiting for a person (best-effort, permission-aware)
  useEffect(() => {
    if (!me || !me.admin.permissions.includes("dashboard")) return;
    adminApi
      .summary()
      .then((s) => setBadges({ rates: s.pendingRateProposals, callbacks: s.callbacksNew }))
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    if (!authed) return;
    adminApi
      .me()
      .then((d) => {
        setMe(d);
        if (!d.admin.permissions.includes(tab)) {
          const first = PERMISSION_DEFINITIONS.find((p) => d.admin.permissions.includes(p.id));
          if (first) setTab(first.id);
        }
      })
      .catch(() => {
        // stored credential no longer valid — clear it and show the login
        adminApi.logout();
        setMe(null);
        setAuthed(false);
      });
  }, [authed]);

  if (!authed) return <AdminLogin onAuthed={() => setAuthed(true)} />;
  if (!me)
    return (
      <div className="admin-shell container">
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );

  const can = (tile) => me.admin.permissions.includes(tile);

  return (
    <div className="admin-shell container">
      <header className="admin-head">
        <div>
          <span className="eyebrow left" style={{ marginBottom: "0.2rem" }}>Back Office</span>
          <h1 style={{ fontSize: "1.9rem" }}>DP Jewellers Admin</h1>
          <p className="muted" style={{ fontSize: "0.78rem", margin: "0.2rem 0 0" }}>
            Signed in as {me.admin.master ? "the master key" : `${me.admin.name} (${me.admin.email})`}
          </p>
        </div>
      </header>

      <nav className="admin-nav" aria-label="Admin modules">
        {NAV_GROUPS.map(([group, ids]) => {
          const visible = ids.filter((id) => can(id));
          if (visible.length === 0) return null;
          return (
            <div key={group} className="admin-nav-group">
              <small>{group}</small>
              <div className="admin-nav-btns">
                {visible.map((id) => {
                  const n = badges[id];
                  return (
                    <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                      {permDef(id).nav}
                      {n > 0 && <span className="admin-badge">{n}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        <button
          className="admin-signout"
          onClick={() => {
            adminApi.logout();
            setAuthed(false);
            setMe(null);
          }}
        >
          Sign out
        </button>
      </nav>

      {!can(tab) ? (
        <NoAccess tile={tab} goHome={() => setTab(PERMISSION_DEFINITIONS.find((p) => can(p.id))?.id || "dashboard")} />
      ) : (
        <>
          {tab === "dashboard" && <Dashboard goTo={setTab} can={can} />}
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
          {tab === "admin-users" && <AdminUsersPage me={me.admin} />}
        </>
      )}
    </div>
  );
}

function NoAccess({ tile, goHome }) {
  const def = permDef(tile);
  return (
    <div className="rc-card" style={{ maxWidth: 520, margin: "3rem auto", textAlign: "center" }}>
      <h3 style={{ marginTop: 0 }}>No access to this area</h3>
      <p className="muted" style={{ fontSize: "0.9rem" }}>
        Ask an admin who manages admin accounts to grant you the “{def.nav}” tile.
      </p>
      <button className="btn btn-maroon" style={{ padding: "0.5rem 1.4rem" }} onClick={goHome}>
        Back to my dashboard
      </button>
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
    ["heroEyebrow", "Hero eyebrow", "The small capitals line above the headline. Leave blank to hide it."],
    ["heroLine1", "Headline — line 1", "Hero lines left blank stay hidden — a words-free hero is fine."],
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
          <label htmlFor="content-heroSub">Hero sentence — the paragraph under the headline. Leave blank to hide it.</label>
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

/* Targeted discount rules — the flexible engine beneath the flat site-wide
   markdown. Each rule picks its base (whole price or making charges only),
   its conditions, audience, validity window and priority; the server always
   applies exactly ONE discount per piece: highest priority, then the
   largest saving, with the site-wide/per-piece markdown competing at
   priority 0. */
const RULE_AUDIENCE_OPTIONS = [
  ["all", "Everyone"],
  ["scheme", "Gold-scheme holders (applies at billing)"],
  ["first", "First order (applies at billing)"],
  ["returning", "Returning customers (applies at billing)"],
];

function DiscountRulesEditor({ onSaved }) {
  const [rows, setRows] = useState(null);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    adminApi.discountRules().then((d) => setRows(d.rules.map((r) => ({ ...r })))).catch((e) => setError(e.message));
    api.categories().then((c) => setCats(c.map((x) => x.key))).catch(() => {});
  }, []);

  const set = (i, field, value) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { rules } = await adminApi.patchDiscountRules(
        rows.map((r) => ({ ...r, pct: Number(r.pct), minTotal: Number(r.minTotal || 0), priority: Number(r.priority || 0) }))
      );
      setRows(rules.map((r) => ({ ...r })));
      setNote(rules.length === 0 ? "All rules removed — only the flat markdowns above remain." : "Rules saved — prices across the site follow them immediately.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && rows === null) return <p className="form-error">{error}</p>;
  if (rows === null) return <div className="skeleton" style={{ height: 120, marginTop: "1.6rem" }} />;

  const lbl = { display: "grid", gap: "0.2rem", fontSize: "0.68rem", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" };

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3 className="admin-subhead">Discount rules</h3>
      <p className="muted" style={{ fontSize: "0.82rem", marginBottom: "0.9rem" }}>
        Targeted offers beyond the flat markdown: off the whole price or the
        making charges only, filtered by metal, purity, category, collection,
        occasion or minimum value, limited to an audience and a date window.
        A piece still gets exactly <strong>one</strong> discount — the highest
        priority wins, then the biggest saving; the flat markdowns above
        compete at priority 0. The rule's name appears on the price break-up.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && rows !== null && <p className="form-error">{error}</p>}

      <div style={{ display: "grid", gap: "0.9rem" }}>
        {rows.map((r, i) => (
          <div key={i} className="dr-row" style={{ display: "grid", gap: "0.55rem", padding: "0.9rem 1rem", background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: 12, opacity: r.on === false ? 0.65 : 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto 2fr 70px 1.4fr 90px", gap: "0.55rem", alignItems: "end" }}>
              <label style={{ ...lbl, textAlign: "center" }}>
                Active
                <input type="checkbox" checked={r.on !== false} onChange={(e) => set(i, "on", e.target.checked)} style={{ height: 38 }} />
              </label>
              <label style={lbl}>
                Rule name (shown to customers)
                <input value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="e.g. Diwali making offer" maxLength={40} />
              </label>
              <label style={lbl}>
                % off
                <input type="number" min={1} max={75} value={r.pct} onChange={(e) => set(i, "pct", e.target.value)} />
              </label>
              <label style={lbl}>
                Comes off
                <select value={r.target} onChange={(e) => set(i, "target", e.target.value)}>
                  <option value="price">Whole price</option>
                  <option value="making">Making charges only</option>
                </select>
              </label>
              <label style={lbl}>
                Priority
                <input type="number" min={0} max={100} value={r.priority} onChange={(e) => set(i, "priority", e.target.value)} />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 1fr 1fr", gap: "0.55rem" }}>
              <label style={lbl}>
                Audience
                <select value={r.audience} onChange={(e) => set(i, "audience", e.target.value)}>
                  {RULE_AUDIENCE_OPTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </label>
              <label style={lbl}>
                Metal
                <select value={r.metal} onChange={(e) => set(i, "metal", e.target.value)}>
                  <option value="">Any metal</option>
                  <option value="gold">Gold</option>
                  <option value="silver">Silver</option>
                  <option value="platinum">Platinum</option>
                </select>
              </label>
              <label style={lbl}>
                Purity
                <input value={r.purity} onChange={(e) => set(i, "purity", e.target.value)} placeholder="Any — e.g. 22K" list="dr-purities" />
              </label>
              <label style={lbl}>
                Category
                <input value={r.category} onChange={(e) => set(i, "category", e.target.value)} placeholder="Any" list="dr-categories" />
              </label>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: "0.55rem", alignItems: "end" }}>
              <label style={lbl}>
                Collection
                <input value={r.collection} onChange={(e) => set(i, "collection", e.target.value)} placeholder="Any" maxLength={40} />
              </label>
              <label style={lbl}>
                Occasion
                <input value={r.occasion} onChange={(e) => set(i, "occasion", e.target.value)} placeholder="Any — e.g. wedding" list="dr-occasions" />
              </label>
              <label style={lbl}>
                Min value ₹
                <input type="number" min={0} step={1000} value={r.minTotal} onChange={(e) => set(i, "minTotal", e.target.value)} />
              </label>
              <label style={lbl}>
                Valid from
                <input type="date" value={r.startsAt} onChange={(e) => set(i, "startsAt", e.target.value)} />
              </label>
              <label style={lbl}>
                Until (incl.)
                <input type="date" value={r.endsAt} onChange={(e) => set(i, "endsAt", e.target.value)} />
              </label>
              <button type="button" className="btn btn-outline" style={{ padding: "0.45rem 0.9rem" }} disabled={busy} onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="muted" style={{ fontSize: "0.84rem" }}>No rules yet — only the flat markdowns above apply.</p>
        )}
      </div>
      <datalist id="dr-purities">
        {["24K", "22K", "18K", "14K", "925", "PT950"].map((p) => <option key={p} value={p} />)}
      </datalist>
      <datalist id="dr-categories">
        {cats.map((c) => <option key={c} value={c} />)}
      </datalist>
      <datalist id="dr-occasions">
        {["wedding", "festive", "daily", "party", "gifting", "office"].map((o) => <option key={o} value={o} />)}
      </datalist>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: "0.5rem 1.1rem" }}
          disabled={busy || rows.length >= 20}
          onClick={() => setRows((prev) => [...prev, { name: "", on: true, pct: 10, target: "price", audience: "all", metal: "", purity: "", category: "", collection: "", occasion: "", minTotal: 0, priority: 0, startsAt: "", endsAt: "" }])}
        >
          + Add a rule
        </button>
        <button type="button" className="btn btn-maroon" style={{ padding: "0.5rem 1.4rem" }} disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save rules"}
        </button>
      </div>
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
          twice — one winner among this site-wide setting, any per-piece
          discount and the rules below (highest priority, then biggest
          saving). Coupons at checkout apply on top of the marked price, as
          today.
        </p>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save discount"}
        </button>
      </form>

      <DiscountRulesEditor onSaved={onSaved} />
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
  {
    group: "Financing",
    items: [
      ["pdpShowEmi", "EMI line — bank plans from the EMI & bank partners setting, or the simple tenure line"],
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

/* Size & weight scaling — per-category %/size-step the customisation engine
   uses (default 2%), plus a live table showing exactly how one piece's
   weight and price walk across its size range. */
function SizeScalingPanel({ config, cats, onSaved }) {
  const DEFAULT_STEP = 2;
  const [steps, setSteps] = useState(() => {
    const m = {};
    for (const c of cats) {
      const v = (config.sizeStepPcts || {})[c.key];
      m[c.key] = v === undefined ? "" : String(v);
    }
    return m;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);

  // preview: sized pieces only; quotes fetched per size so the prices in the
  // table are the server's own derivation, not client arithmetic
  const [sized, setSized] = useState([]);
  const [slug, setSlug] = useState("");
  const [preview, setPreview] = useState(null); // {product, cz, rows:[{size,steps,factor,netWeight,price}]}

  useEffect(() => {
    api.products({}).then((d) => {
      const list = d.items.filter((p) => (p.sizes || []).length > 1);
      setSized(list);
      setSlug((s) => s || list[0]?.slug || "");
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!slug) return;
    let stale = false;
    setPreview(null);
    (async () => {
      try {
        const d = await api.product(slug);
        const cz = d.customization;
        const sizes = d.product.sizes || [];
        const baseIdx = sizes.indexOf(cz?.baseSize);
        const rows = await Promise.all(
          sizes.map(async (size) => {
            const q = await api.productQuote(slug, { size });
            const st = sizes.indexOf(size) - baseIdx;
            return {
              size,
              steps: st,
              factor: 1 + (st * (cz?.sizeStepPct || 0)) / 100,
              netWeight: q.netWeight,
              price: q.price.total,
            };
          })
        );
        if (!stale) setPreview({ product: d.product, cz, rows });
      } catch (e) {
        if (!stale) setError(e.message);
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, note]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const map = {};
      for (const [k, v] of Object.entries(steps))
        if (String(v).trim() !== "") map[k] = Number(v);
      await adminApi.patchConfig({ sizeStepPcts: map });
      setNote("Saved — sized pieces re-price immediately on the storefront.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      <p className="muted" style={{ fontSize: "0.86rem", marginBottom: "1.1rem" }}>
        A bigger ring or bangle carries more metal. Each size step away from a
        piece's anchor size (the <strong>middle</strong> of its listed range —
        that size is the catalogued weight) moves the metal weight by the
        percentage below, and the price re-derives from the new weight at
        today's rate. Blank = the house default of {DEFAULT_STEP}% ·
        0 = size never changes the price for that category.
      </p>

      <form onSubmit={save}>
        <table className="admin-table" style={{ marginBottom: "1rem" }}>
          <thead>
            <tr><th>Category</th><th>Weight change per size step</th></tr>
          </thead>
          <tbody>
            {cats.map((c) => (
              <tr key={c.key}>
                <td style={{ textTransform: "capitalize" }}>{c.label || c.key}</td>
                <td>
                  <input
                    inputMode="decimal"
                    value={steps[c.key] ?? ""}
                    onChange={(e) =>
                      setSteps((s) => ({ ...s, [c.key]: e.target.value.replace(/[^\d.]/g, "") }))
                    }
                    placeholder={`${DEFAULT_STEP} (default)`}
                    aria-label={`Weight step percent for ${c.key}`}
                    style={{ width: 110, padding: "0.4rem 0.6rem", borderRadius: 8, border: "1px solid var(--line)", background: "var(--cream)" }}
                  />{" "}
                  <span className="muted" style={{ fontSize: "0.8rem" }}>% per step (0–10)</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="btn btn-maroon" disabled={busy}>
          {busy ? "Saving…" : "Save scaling"}
        </button>
      </form>

      <h4 className="admin-subhead" style={{ marginTop: "2rem" }}>See the calculation, piece by piece</h4>
      <div className="field" style={{ maxWidth: 380 }}>
        <label>Piece</label>
        <select value={slug} onChange={(e) => setSlug(e.target.value)}>
          {sized.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name} ({p.category})</option>
          ))}
        </select>
      </div>
      {!preview ? (
        <div className="skeleton" style={{ height: 180 }} />
      ) : (
        <>
          <p className="muted" style={{ fontSize: "0.82rem" }}>
            {preview.product.sizeLabel || "Size"} anchor <strong>{preview.cz?.baseSize}</strong> ·
            catalogued net weight <strong>{preview.product.metal.netWeight} g</strong> ·
            scaling <strong>{preview.cz?.sizeStepPct}% per step</strong> — prices below are the
            server's live derivation at today's rate.
          </p>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{preview.product.sizeLabel || "Size"}</th>
                <th>Steps from anchor</th>
                <th>Weight factor</th>
                <th>Net weight</th>
                <th>Price today</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((r) => (
                <tr key={r.size} style={r.steps === 0 ? { background: "color-mix(in srgb, var(--gold) 12%, transparent)" } : undefined}>
                  <td>{r.size}{r.steps === 0 ? " ★" : ""}</td>
                  <td>{r.steps > 0 ? `+${r.steps}` : r.steps}</td>
                  <td>×{r.factor.toFixed(2)}</td>
                  <td>{r.netWeight} g</td>
                  <td>{formatINR(r.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

/* Category promotions — sale-banner images marquee-ing under the homepage
   hero, each linked to a category listing. Disable a row to end a sale
   without losing the upload; ▲▼ set the on-screen order. */
/* Per-category promotional banner — crowns the category page and fronts the
   homepage mosaic / mega-menu / search tiles. Stored apart from the
   catalogue, so the picture and the product listings never touch. */
function CategoryBannersPanel({ onSaved }) {
  const [cats, setCats] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(null); // key currently updating

  const load = () => api.categories().then(setCats).catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);

  const apply = async (key, image, label) => {
    setBusy(key);
    setError(null);
    setNote(null);
    try {
      await adminApi.patchCategoryImage(key, image);
      await load();
      setNote(image ? `${label} banner updated — live on the category page.` : `${label} restored to the house picture.`);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const upload = (key, label) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(key);
    setError(null);
    try {
      const { url } = await adminApi.uploadFile(file);
      await apply(key, url, label);
    } catch (err) {
      setError(err.message);
      setBusy(null);
    }
  };

  if (error && !cats) return <p className="form-error">{error}</p>;
  if (!cats) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div style={{ maxWidth: 680 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Each category page opens with this picture as its fixed promotional
        banner; it also fronts the homepage mosaic, the mega-menu and the
        search tiles. Banners live apart from the catalogue — updating one
        never changes the product listings, and editing products never
        changes the banner.
      </p>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {cats.map((c) => (
        <div key={c.key} className="catb-row">
          <img src={c.image} alt="" loading="lazy" />
          <div className="catb-main">
            <strong>{c.label}</strong>
            <small className="muted">
              {c.count} piece{c.count === 1 ? "" : "s"} · {c.custom ? "custom banner" : "house picture"}
            </small>
          </div>
          <label className="btn btn-outline catb-btn">
            {busy === c.key ? "Working…" : "⤒ Upload banner…"}
            <input type="file" accept="image/*" hidden onChange={upload(c.key, c.label)} disabled={busy === c.key} />
          </label>
          {c.custom && (
            <button className="remove-btn" disabled={busy === c.key} onClick={() => apply(c.key, "", c.label)}>
              Restore default
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function CategoryPromoPanel({ onSaved }) {
  const [rows, setRows] = useState(null);
  const [cats, setCats] = useState([]);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.content().then((c) => setRows((c.promoBanners || []).map((b) => ({ ...b })))).catch((e) => setError(e.message));
    api.categories().then(setCats).catch(() => {});
  }, []);

  const set = (i, field, value) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: value } : r)));
  };

  const move = (i, dir) => {
    setRows((prev) => {
      const next = [...prev];
      const j = i + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const upload = (i) => async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await adminApi.uploadFile(file);
      if (i === null) setRows((prev) => [...prev, { image: url, category: "", alt: "", on: true, hMobile: 0, hDesktop: 0 }]);
      else set(i, "image", url);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      await adminApi.patchContent({
        promoBanners: rows.map((r) => ({
          image: r.image, category: r.category || "", alt: r.alt || "",
          on: r.on !== false, hMobile: Number(r.hMobile) || 0, hDesktop: Number(r.hDesktop) || 0,
        })),
      });
      const live = rows.filter((r) => r.on !== false).length;
      setNote(rows.length === 0 ? "No banners — the homepage marquee is hidden." : `Saved — ${live} of ${rows.length} live on the homepage.`);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && rows === null) return <p className="form-error">{error}</p>;
  if (rows === null) return <div className="skeleton" style={{ height: 220 }} />;

  const lbl = { display: "grid", gap: "0.2rem", fontSize: "0.68rem", color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.06em" };
  const catKeys = cats.map((c) => c.key);

  return (
    <div style={{ maxWidth: 680 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Sale-banner images that scroll across the homepage under the hero —
        tapping one opens its category in the shop. Disable a row to hide it
        without losing the upload; ▲▼ set the order; heights are optional
        (blank = auto).
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      <div style={{ display: "grid", gap: "0.9rem" }}>
        {rows.map((r, i) => (
          <div key={i} className="cp-row" style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "0.8rem", padding: "0.9rem 1rem", background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: 12, opacity: r.on === false ? 0.65 : 1 }}>
            <div style={{ display: "grid", gap: "0.4rem", alignContent: "start" }}>
              <img src={r.image} alt="" style={{ width: 110, height: 74, objectFit: "cover", borderRadius: 8, border: "1px solid var(--line-soft)" }} />
              <label className="btn btn-outline" style={{ cursor: "pointer", padding: "0.3rem 0.6rem", fontSize: "0.68rem" }}>
                Replace
                <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={upload(i)} disabled={busy} />
              </label>
            </div>
            <div style={{ display: "grid", gap: "0.55rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr auto", gap: "0.55rem", alignItems: "end" }}>
                <label style={lbl}>
                  Links to category
                  <select value={r.category || ""} onChange={(e) => set(i, "category", e.target.value)}>
                    <option value="">All products</option>
                    {cats.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                    {r.category && !catKeys.includes(r.category) && (
                      <option value={r.category}>⚠ {r.category} (not in catalogue)</option>
                    )}
                  </select>
                </label>
                <label style={lbl}>
                  Image alt text (accessibility)
                  <input value={r.alt || ""} onChange={(e) => set(i, "alt", e.target.value)} placeholder="e.g. Diwali sale — 10% off rings" maxLength={80} />
                </label>
                <label style={{ ...lbl, textAlign: "center" }}>
                  Live
                  <input type="checkbox" checked={r.on !== false} onChange={(e) => set(i, "on", e.target.checked)} style={{ height: 34 }} />
                </label>
              </div>
              {r.category && !catKeys.includes(r.category) && (
                <p className="muted" style={{ fontSize: "0.76rem", margin: 0, color: "var(--maroon-bright)" }}>
                  “{r.category}” isn't in your catalogue — clicks fall back to
                  All products until you pick a current category.
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto auto auto", gap: "0.55rem", alignItems: "end" }}>
                <label style={lbl}>
                  Mobile height px (blank = auto)
                  <input type="number" min={40} max={600} value={r.hMobile || ""} onChange={(e) => set(i, "hMobile", e.target.value)} placeholder="auto" />
                </label>
                <label style={lbl}>
                  Desktop height px (blank = auto)
                  <input type="number" min={40} max={600} value={r.hDesktop || ""} onChange={(e) => set(i, "hDesktop", e.target.value)} placeholder="auto" />
                </label>
                <button type="button" className="btn btn-outline" style={{ padding: "0.4rem 0.7rem" }} disabled={busy || i === 0} onClick={() => move(i, -1)} aria-label="Move up">▲</button>
                <button type="button" className="btn btn-outline" style={{ padding: "0.4rem 0.7rem" }} disabled={busy || i === rows.length - 1} onClick={() => move(i, 1)} aria-label="Move down">▼</button>
                <button type="button" className="btn btn-outline" style={{ padding: "0.4rem 0.9rem" }} disabled={busy} onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="muted" style={{ fontSize: "0.84rem" }}>No banners yet — upload the first sale image below.</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "1.1rem", alignItems: "center" }}>
        <label className="btn btn-outline" style={{ cursor: "pointer", padding: "0.5rem 1.1rem", opacity: rows.length >= 6 ? 0.5 : 1 }}>
          {busy ? "Working…" : "⤒ Upload banner…"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden onChange={upload(null)} disabled={busy || rows.length >= 6} />
        </label>
        <button type="button" className="btn btn-maroon" style={{ padding: "0.5rem 1.4rem" }} disabled={busy} onClick={save}>
          {busy ? "Saving…" : "Save banners"}
        </button>
      </div>
    </div>
  );
}

/* Gold scheme plans — the instalment plans customers enrol in on the Gold
   Scheme page. Keys stay stable across renames; a plan customers hold
   schemes on can be edited but never removed (the server enforces it). */
function SchemeVariantsPanel({ onSaved }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.schemes().then((v) => setRows(v.map((x) => ({ ...x })))).catch((e) => setError(e.message));
  }, []);

  const set = (i, field) => (e) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: e.target.value } : r)));
  };

  const save = async (restore = false) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { variants } = await adminApi.patchSchemeVariants(
        restore
          ? []
          : rows.map((r) => ({
              key: r.key || "",
              name: r.name,
              tenureMonths: Number(r.tenureMonths),
              minMonthly: Number(r.minMonthly),
              bonus: r.bonus || "",
              blurb: r.blurb || "",
            }))
      );
      setRows(variants.map((x) => ({ ...x })));
      setNote(restore ? "Standard plans restored." : "Plans saved — live on the Gold Scheme page.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && rows === null) return <p className="form-error">{error}</p>;
  if (rows === null) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div style={{ maxWidth: 680 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        The instalment plans on the Gold Scheme page. Grams always accrue at
        the day's 22K rate — a plan defines the tenure, the minimum monthly
        instalment, and the bonus promised at redemption. Plans customers
        already hold schemes on can be renamed and re-worded, but not removed.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      <div style={{ display: "grid", gap: "0.9rem" }}>
        {rows.map((r, i) => (
          <div
            key={i}
            className="gsv-row"
            style={{ display: "grid", gap: "0.55rem", padding: "0.9rem 1rem", background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: 12 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "0.55rem" }}>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                Plan name
                <input value={r.name} onChange={set(i, "name")} placeholder="e.g. Swarna 11+1" maxLength={40} />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                Tenure (months)
                <input type="number" min={3} max={60} value={r.tenureMonths} onChange={set(i, "tenureMonths")} />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                Min monthly ₹
                <input type="number" min={500} max={100000} step={500} value={r.minMonthly} onChange={set(i, "minMonthly")} />
              </label>
            </div>
            <input value={r.bonus} onChange={set(i, "bonus")} placeholder="Redemption bonus — e.g. Making charges waived up to 50%" maxLength={120} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.55rem", alignItems: "center" }}>
              <input value={r.blurb} onChange={set(i, "blurb")} placeholder="One-line description shown on the plan card" maxLength={160} />
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "0.45rem 0.9rem" }}
                disabled={busy || rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove plan
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: "0.5rem 1.1rem" }}
          disabled={busy || rows.length >= 6}
          onClick={() => setRows((prev) => [...prev, { key: "", name: "", tenureMonths: 12, minMonthly: 1000, bonus: "", blurb: "" }])}
        >
          + Add a plan
        </button>
        <button type="button" className="btn btn-maroon" style={{ padding: "0.5rem 1.4rem" }} disabled={busy} onClick={() => save(false)}>
          {busy ? "Saving…" : "Save plans"}
        </button>
        <button type="button" className="btn btn-outline" style={{ padding: "0.5rem 1.1rem" }} disabled={busy} onClick={() => save(true)}>
          Restore standard plans
        </button>
      </div>
    </div>
  );
}

/* EMI & bank partners — financing schemes shown on every product page.
   The PDP headlines the cheapest eligible plan; with no plans it shows the
   simple interest-free line using the Checkout & payments tenure. */
function EmiPlansPanel({ onSaved }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.config()
      .then((c) => setRows((c.emiPlans || []).map((p) => ({ ...p }))))
      .catch((e) => setError(e.message));
  }, []);

  const set = (i, field) => (e) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: e.target.value } : r)));
  };

  const save = async (clear = false) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { plans } = await adminApi.patchEmiPlans(
        clear
          ? []
          : rows.map((r) => ({
              bank: r.bank,
              months: Number(r.months),
              ratePct: Number(r.ratePct || 0),
              minAmount: Number(r.minAmount || 0),
            }))
      );
      setRows(plans.map((p) => ({ ...p })));
      setNote(
        clear
          ? "Plans cleared — product pages show the simple EMI line again."
          : "Plans saved — every product page now quotes the cheapest eligible scheme."
      );
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && rows === null) return <p className="form-error">{error}</p>;
  if (rows === null) return <div className="skeleton" style={{ height: 220 }} />;

  return (
    <div style={{ maxWidth: 680 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        Financing schemes agreed with your bank partners. Product pages headline
        the cheapest plan the piece qualifies for and list the rest under
        “View bank plans”. Interest is a flat rate per year (0 = no-cost EMI);
        minimum amount hides a plan on cheaper pieces. With no plans here, the
        page falls back to the simple line using the tenure from
        Checkout &amp; payments. The line can be hidden entirely under
        Product details.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      <div style={{ display: "grid", gap: "0.9rem" }}>
        {rows.map((r, i) => (
          <div
            key={i}
            className="emi-row"
            style={{ display: "grid", gap: "0.55rem", padding: "0.9rem 1rem", background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: 12 }}
          >
            <input value={r.bank} onChange={set(i, "bank")} placeholder="Bank / partner — e.g. HDFC Bank" maxLength={40} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.55rem", alignItems: "center" }}>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                Tenure (months)
                <input type="number" min={3} max={36} value={r.months} onChange={set(i, "months")} placeholder="12" />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                Interest % / year
                <input type="number" min={0} max={30} step={0.1} value={r.ratePct} onChange={set(i, "ratePct")} placeholder="0 = no-cost" />
              </label>
              <label style={{ display: "grid", gap: "0.2rem", fontSize: "0.72rem", color: "var(--ink-faint)" }}>
                Minimum amount ₹
                <input type="number" min={0} step={1000} value={r.minAmount} onChange={set(i, "minAmount")} placeholder="0" />
              </label>
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "0.45rem 0.9rem", alignSelf: "end" }}
                disabled={busy}
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="muted" style={{ fontSize: "0.84rem" }}>
            No bank plans yet — product pages are showing the simple
            interest-free line.
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: "0.5rem 1.1rem" }}
          disabled={busy || rows.length >= 10}
          onClick={() => setRows((prev) => [...prev, { bank: "", months: 12, ratePct: 0, minAmount: 0 }])}
        >
          + Add a plan
        </button>
        <button type="button" className="btn btn-maroon" style={{ padding: "0.5rem 1.4rem" }} disabled={busy || rows.length === 0} onClick={() => save(false)}>
          {busy ? "Saving…" : "Save plans"}
        </button>
        {rows.length > 0 && (
          <button type="button" className="btn btn-outline" style={{ padding: "0.5rem 1.1rem" }} disabled={busy} onClick={() => save(true)}>
            Clear all plans
          </button>
        )}
      </div>
    </div>
  );
}

/* Showrooms — the branch list behind /stores, the appointment booking form,
   store pickup at checkout and the footfall report. Wholesale save, same as
   the header/footer links; an empty list restores the standard branches. */
function ShowroomsPanel({ onSaved }) {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.stores().then((d) => setRows(d.stores.map((s) => ({ ...s })))).catch((e) => setError(e.message));
  }, []);

  const set = (i, field) => (e) => {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, [field]: e.target.value } : r)));
  };

  const save = async (restore = false) => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const { stores } = await adminApi.patchStores(
        restore ? [] : rows.map(({ name, address, hours, phone }) => ({ name, address, hours, phone }))
      );
      setRows(stores.map((s) => ({ ...s })));
      setNote(restore ? "Standard branches restored." : "Branches saved — live on the Showrooms and appointment pages.");
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && rows === null) return <p className="form-error">{error}</p>;
  if (rows === null) return <div className="skeleton" style={{ height: 240 }} />;

  return (
    <div style={{ maxWidth: 680 }}>
      <p className="muted" style={{ fontSize: "0.84rem", marginBottom: "1rem" }}>
        These branches appear on the Showrooms page, the appointment booking
        form, and as pickup choices at checkout. Past appointments and orders
        keep the branch they were made with, even after edits.
      </p>
      {note && <p className="admin-note">{note}</p>}
      {error && <p className="form-error">{error}</p>}

      <div style={{ display: "grid", gap: "0.9rem" }}>
        {rows.map((r, i) => (
          <div
            key={i}
            className="shr-row"
            style={{ display: "grid", gap: "0.55rem", padding: "0.9rem 1rem", background: "var(--paper)", border: "1px solid var(--line-soft)", borderRadius: 12 }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.55rem" }}>
              <input value={r.name} onChange={set(i, "name")} placeholder="Branch name — e.g. Indore — Palasia" maxLength={60} />
              <input value={r.phone} onChange={set(i, "phone")} placeholder="Phone (optional)" maxLength={20} />
            </div>
            <input value={r.address} onChange={set(i, "address")} placeholder="Full address" maxLength={140} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.55rem", alignItems: "center" }}>
              <input value={r.hours} onChange={set(i, "hours")} placeholder="Opening hours — e.g. 10:30 am – 8:30 pm (optional)" maxLength={40} />
              <button
                type="button"
                className="btn btn-outline"
                style={{ padding: "0.45rem 0.9rem" }}
                disabled={busy || rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
              >
                Remove branch
              </button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.7rem", flexWrap: "wrap", marginTop: "1.1rem" }}>
        <button
          type="button"
          className="btn btn-outline"
          style={{ padding: "0.5rem 1.1rem" }}
          disabled={busy || rows.length >= 8}
          onClick={() => setRows((prev) => [...prev, { name: "", address: "", hours: "", phone: "" }])}
        >
          + Add a branch
        </button>
        <button type="button" className="btn btn-maroon" style={{ padding: "0.5rem 1.4rem" }} disabled={busy} onClick={() => save(false)}>
          {busy ? "Saving…" : "Save branches"}
        </button>
        <button type="button" className="btn btn-outline" style={{ padding: "0.5rem 1.1rem" }} disabled={busy} onClick={() => save(true)}>
          Restore standard branches
        </button>
      </div>
    </div>
  );
}

function Settings() {
  const [data, setData] = useState(null);
  const [content, setContent] = useState(null);
  const [auditRows, setAuditRows] = useState(null);
  const [storeRows, setStoreRows] = useState(null);
  const [emiPlans, setEmiPlans] = useState(null);
  const [schemeVariants, setSchemeVariants] = useState(null);
  const [discountRules, setDiscountRules] = useState(null);
  const [cats, setCats] = useState(null);
  const [error, setError] = useState(null);
  // the open settings card lives in the URL (?panel=…) so a refresh stays on it
  const [params, setParams] = useSearchParams();
  const rawView = params.get("panel");
  const setView = (v) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v) next.set("panel", v);
      else next.delete("panel");
      return next;
    });

  const refresh = useCallback(() => {
    adminApi.config().then(setData).catch((e) => setError(e.message));
    api.categories().then(setCats).catch(() => {});
    api.content().then(setContent).catch(() => {});
    adminApi.auditLog().then(setAuditRows).catch(() => {});
    api.stores().then((d) => setStoreRows(d.stores)).catch(() => {});
    api.config().then((c) => setEmiPlans(c.emiPlans || [])).catch(() => {});
    api.schemes().then(setSchemeVariants).catch(() => {});
    adminApi.discountRules().then((d) => setDiscountRules(d.rules)).catch(() => {});
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
      key: "goldplans",
      glyph: "◈",
      title: "Gold scheme plans",
      desc: "The instalment plans customers enrol in on the Gold Scheme page.",
      chip: schemeVariants
        ? `${schemeVariants.length} plan${schemeVariants.length === 1 ? "" : "s"}`
        : "…",
    },
    {
      key: "emi",
      glyph: "◷",
      title: "EMI & bank partners",
      desc: "Financing schemes quoted on every product page, by bank partner.",
      chip: emiPlans?.length
        ? `${emiPlans.length} bank plan${emiPlans.length === 1 ? "" : "s"}`
        : `simple line · ${data.config.emiMonths} months`,
    },
    {
      key: "showrooms",
      glyph: "⌂",
      title: "Showrooms",
      desc: "The branch cards on the Showrooms and appointment pages, and pickup.",
      chip: storeRows
        ? `${storeRows.length} branch${storeRows.length === 1 ? "" : "es"}`
        : "…",
    },
    {
      key: "discounts",
      glyph: "%",
      title: "Discounts",
      desc: "Site-wide markdown applied to every published piece, priced live.",
      chip: (() => {
        const flat =
          data.config.siteDiscountOn === 1 && data.config.siteDiscountPct > 0
            ? `${data.config.siteDiscountPct}% off site-wide`
            : "no markdown";
        const active = discountRules?.filter((r) => r.on !== false).length || 0;
        return active > 0 ? `${flat} · ${active} rule${active === 1 ? "" : "s"}` : flat;
      })(),
    },
    {
      key: "pdp",
      glyph: "◇",
      title: "Product details",
      desc: "The price note and enquiry links shown on every product page.",
      chip: (() => {
        const keys = ["pdpShowGstNote", "pdpShowRateNote", "pdpShowLockNote", "pdpShowWhatsapp", "pdpShowCallback", "pdpShowVisit", "pdpShowEmi"];
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
      key: "catpromo",
      glyph: "▧",
      title: "Category promotions",
      desc: "Sale banners scrolling on the homepage, each opening a category.",
      chip: (() => {
        const all = content?.promoBanners || [];
        const live = all.filter((b) => b.on !== false).length;
        return all.length ? `${live} of ${all.length} live` : "none yet";
      })(),
    },
    {
      key: "catbanners",
      glyph: "▤",
      title: "Category banners",
      desc: "The promotional picture crowning each category page and its tiles.",
      chip: cats
        ? `${cats.filter((c) => c.custom).length} of ${cats.length} custom`
        : "…",
    },
    {
      key: "sizescale",
      glyph: "⚖",
      title: "Size & weight scaling",
      desc: "How much metal weight one size step adds per category, with a live per-piece calculation table.",
      chip: (() => {
        const n = Object.keys(data.config.sizeStepPcts || {}).length;
        return n ? `${n} categor${n > 1 ? "ies" : "y"} customised` : "2% per step everywhere";
      })(),
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

  const view = cards.some((c) => c.key === rawView) ? rawView : null;

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
        {view === "showrooms" && <ShowroomsPanel onSaved={refresh} />}
        {view === "emi" && <EmiPlansPanel onSaved={refresh} />}
        {view === "goldplans" && <SchemeVariantsPanel onSaved={refresh} />}
        {view === "catpromo" && <CategoryPromoPanel onSaved={refresh} />}
        {view === "catbanners" && <CategoryBannersPanel onSaved={refresh} />}
        {view === "sizescale" && <SizeScalingPanel config={data.config} cats={cats || []} onSaved={refresh} />}
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

/* Customer directory — CRM view over everyone who has transacted or signed
   in. Headline KPIs, segment filters, sortable ordering and a CSV export;
   a row opens the full profile (orders, schemes, rewards, appointments). */
const TIER_TINT = {
  Silver: { background: "rgba(120,120,120,.14)" },
  Gold: { background: "rgba(176,141,87,.22)", color: "#6d5226" },
  Platinum: { background: "rgba(70,90,140,.16)", color: "#33466f" },
};

const CUST_SORTS = {
  recent: { label: "Recent activity", fn: null }, // server order
  ltv: { label: "Lifetime value", fn: (a, b) => b.spend - a.spend },
  orders: { label: "Most orders", fn: (a, b) => b.orders - a.orders },
  points: { label: "Reward points", fn: (a, b) => b.points - a.points },
  name: { label: "Name A–Z", fn: (a, b) => String(a.name || "").localeCompare(String(b.name || "")) },
  newest: { label: "Newest members", fn: (a, b) => String(b.since || "").localeCompare(String(a.since || "")) },
};

function Customers() {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [tier, setTier] = useState("");
  const [minOrders, setMinOrders] = useState("");
  const [sort, setSort] = useState("recent");
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

  // headline numbers over the whole book, not the filtered slice
  const accounts = rows.filter((r) => r.registered).length;
  const repeat = rows.filter((r) => r.orders >= 2).length;
  const buyers = rows.filter((r) => r.orders > 0).length;
  const revenue = rows.reduce((s, r) => s + r.spend, 0);
  const orderCount = rows.reduce((s, r) => s + r.orders, 0);
  const month = new Date().toISOString().slice(0, 7);
  const newThisMonth = rows.filter((r) => (r.since || "").slice(0, 7) === month).length;

  const needle = q.trim().toLowerCase();
  let shown = rows.filter((r) => {
    if (needle && ![r.name, r.phone, r.email].some((v) => v && String(v).toLowerCase().includes(needle))) return false;
    if (type === "account" && !r.registered) return false;
    if (type === "guest" && r.registered) return false;
    if (tier && r.tier !== tier) return false;
    if (minOrders && r.orders < Number(minOrders)) return false;
    return true;
  });
  if (CUST_SORTS[sort].fn) shown = [...shown].sort(CUST_SORTS[sort].fn);

  const sel = {
    padding: "0.5rem 0.65rem", border: "1px solid var(--line)", borderRadius: 9,
    background: "var(--cream)", font: "inherit", fontSize: "0.86rem",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap", marginBottom: "0.9rem" }}>
        <h3 className="admin-subhead" style={{ margin: 0 }}>
          Customers
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
      <div className="kpi-grid" style={{ marginBottom: "1.4rem" }}>
        <div className="kpi"><span>{rows.length}</span><label>Customers</label></div>
        <div className="kpi"><span>{accounts} / {rows.length - accounts}</span><label>Accounts / guests</label></div>
        <div className="kpi"><span>{repeat}{buyers ? ` · ${Math.round((repeat / buyers) * 100)}%` : ""}</span><label>Repeat buyers</label></div>
        <div className="kpi"><span>{newThisMonth}</span><label>New this month</label></div>
        <div className="kpi"><span>{formatINR(revenue)}</span><label>Lifetime revenue</label></div>
        <div className="kpi"><span>{orderCount ? formatINR(Math.round(revenue / orderCount)) : "—"}</span><label>Avg order value</label></div>
      </div>

      <div className="cust-toolbar">
        <input
          style={{ ...sel, flex: "1 1 220px" }}
          placeholder="Search name, mobile or email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search customers"
        />
        <select style={sel} value={type} onChange={(e) => setType(e.target.value)} aria-label="Customer type">
          <option value="">All types</option>
          <option value="account">Accounts</option>
          <option value="guest">Guests</option>
        </select>
        <select style={sel} value={tier} onChange={(e) => setTier(e.target.value)} aria-label="Rewards tier">
          <option value="">All tiers</option>
          {["Silver", "Gold", "Platinum"].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select style={sel} value={minOrders} onChange={(e) => setMinOrders(e.target.value)} aria-label="Minimum orders">
          <option value="">Any orders</option>
          <option value="1">Has ordered</option>
          <option value="2">Repeat (2+)</option>
          <option value="5">Loyal (5+)</option>
        </select>
        <select style={sel} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort customers">
          {Object.entries(CUST_SORTS).map(([k, s]) => <option key={k} value={k}>Sort: {s.label}</option>)}
        </select>
        <a className="btn btn-outline" style={{ padding: "0.45rem 1rem" }} href={adminApi.exportUrl("customers")}>
          ⤓ Export CSV
        </a>
      </div>

      {shown.length === 0 ? (
        <p className="muted">No customers match those filters.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Customer</th><th>Type</th><th>Tier</th><th>Orders</th><th>Lifetime value</th><th>Avg order</th><th>Last order</th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.phone} onClick={() => setSelected(r.phone)} style={{ cursor: "pointer" }}>
                <td>
                  <span className="cust-cell">
                    <span className="cust-avatar" aria-hidden>{(r.name || r.phone).trim().charAt(0).toUpperCase()}</span>
                    <span>
                      {r.name || "—"}
                      <small>{r.phone}{r.email ? ` · ${r.email}` : ""}</small>
                    </span>
                  </span>
                </td>
                <td><span className="status-pill">{r.registered ? "Account" : "Guest"}</span></td>
                <td>
                  <span className="status-pill" style={TIER_TINT[r.tier]}>{r.tier}</span>
                  {r.points > 0 && <small style={{ display: "block" }}>{r.points} pts</small>}
                </td>
                <td>{r.orders}</td>
                <td>{formatINR(r.spend)}</td>
                <td>{r.orders > 0 ? formatINR(Math.round(r.spend / r.orders)) : "—"}</td>
                <td style={{ whiteSpace: "nowrap" }}>{r.lastOrderAt ? fmtDate(r.lastOrderAt) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="muted" style={{ fontSize: "0.78rem" }}>
        Showing {shown.length} of {rows.length} customers · click a row for the
        full profile — orders, gold schemes, rewards and appointments.
      </p>
      </>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- call-backs */
function Callbacks() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

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
  const statuses = [...new Set(rows.map((r) => r.status))];
  const needle = q.trim().toLowerCase();
  const shown = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (!needle) return true;
    return [r.phone, r.name, r.productName, r.slug].some(
      (v) => String(v || "").toLowerCase().includes(needle)
    );
  });

  return (
    <div>
      <p className="muted" style={{ fontSize: "0.86rem", marginBottom: "1rem" }}>
        Customers who tapped “Request a call back” on a product page — the
        storefront promises a call within 2 hours.
        {pending > 0 ? ` ${pending} waiting.` : " Nothing waiting."}
      </p>
      {error && <p className="form-error">{error}</p>}
      {rows.length > 0 && (
        <div className="od-filterbar" style={{ maxWidth: 640 }}>
          <input
            placeholder="Search mobile / name / piece…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search call-backs"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="muted">No call-back requests yet.</p>
      ) : shown.length === 0 ? (
        <p className="muted">
          No call-backs match —{" "}
          <button className="link-underline" onClick={() => { setQ(""); setStatus(""); }}>
            clear the filters
          </button>
          .
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>When</th><th>Mobile</th><th>Piece</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {shown.map((r) => (
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
      {rows.length > 0 && shown.length > 0 && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
          Showing {shown.length} of {rows.length} request{rows.length === 1 ? "" : "s"}
        </p>
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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

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

  const statuses = [...new Set(data.enquiries.map((e) => e.status))];
  const needle = q.trim().toLowerCase();
  const shown = data.enquiries.filter((e) => {
    if (status && e.status !== status) return false;
    if (!needle) return true;
    return [e.id, e.name, e.phone, e.description, e.category, e.stone, e.metal].some(
      (v) => String(v || "").toLowerCase().includes(needle)
    );
  });

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {data.enquiries.length > 0 && (
        <div className="od-filterbar" style={{ maxWidth: 640 }}>
          <input
            placeholder="Search name / mobile / enquiry ID / brief…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search enquiries"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      {data.enquiries.length === 0 ? (
        <p className="muted">No custom-design enquiries yet.</p>
      ) : shown.length === 0 ? (
        <p className="muted">
          No enquiries match —{" "}
          <button className="link-underline" onClick={() => { setQ(""); setStatus(""); }}>
            clear the filters
          </button>
          .
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Enquiry</th><th>Customer</th><th>Brief</th><th>Budget</th><th>Quote</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {shown.map((e) => (
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
      {data.enquiries.length > 0 && shown.length > 0 && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
          Showing {shown.length} of {data.enquiries.length} enquir{data.enquiries.length === 1 ? "y" : "ies"}
        </p>
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
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [store, setStore] = useState("");

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

  const statuses = [...new Set(data.appointments.map((a) => a.status))];
  const stores = [...new Set(data.appointments.map((a) => a.storeName).filter(Boolean))];
  const needle = q.trim().toLowerCase();
  const shown = data.appointments.filter((a) => {
    if (status && a.status !== status) return false;
    if (store && a.storeName !== store) return false;
    if (!needle) return true;
    return [a.id, a.name, a.phone, a.productName, a.date, a.storeName].some(
      (v) => String(v || "").toLowerCase().includes(needle)
    );
  });

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {data.appointments.length > 0 && (
        <div className="od-filterbar" style={{ maxWidth: 820 }}>
          <input
            placeholder="Search name / mobile / appointment ID / piece / date…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search appointments"
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {stores.length > 1 && (
            <select value={store} onChange={(e) => setStore(e.target.value)} aria-label="Filter by showroom">
              <option value="">All showrooms</option>
              {stores.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {data.appointments.length === 0 ? (
        <p className="muted">No appointments booked yet.</p>
      ) : shown.length === 0 ? (
        <p className="muted">
          No appointments match —{" "}
          <button className="link-underline" onClick={() => { setQ(""); setStatus(""); setStore(""); }}>
            clear the filters
          </button>
          .
        </p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Appointment</th><th>Customer</th><th>Showroom</th><th>When</th><th>Viewing</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {shown.map((a) => (
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
      {data.appointments.length > 0 && shown.length > 0 && (
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
          Showing {shown.length} of {data.appointments.length} appointment{data.appointments.length === 1 ? "" : "s"}
        </p>
      )}
    </>
  );
}

/* ---------------------------------------------------------- login */
function AdminLogin({ onAuthed }) {
  const [mode, setMode] = useState("account"); // account | key
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await adminApi.login(mode === "key" ? key : { email, password });
      onAuthed();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420, padding: "6rem 0 8rem" }}>
      <span className="eyebrow">Back Office</span>
      <h1 className="section-title" style={{ marginBottom: "1.4rem" }}>
        Admin <em>sign in.</em>
      </h1>
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.4rem" }}>
        <button
          type="button"
          className={mode === "account" ? "btn btn-maroon" : "btn btn-outline"}
          style={{ padding: "0.4rem 1rem" }}
          onClick={() => setMode("account")}
        >
          Email &amp; password
        </button>
        <button
          type="button"
          className={mode === "key" ? "btn btn-maroon" : "btn btn-outline"}
          style={{ padding: "0.4rem 1rem" }}
          onClick={() => setMode("key")}
        >
          Master key
        </button>
      </div>
      <form className="checkout-form" onSubmit={submit}>
        {mode === "account" ? (
          <>
            <div className="field">
              <label htmlFor="admin-email">Email</label>
              <input id="admin-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="admin-key">Admin key</label>
            <input id="admin-key" type="password" required value={key} onChange={(e) => setKey(e.target.value)} />
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-maroon" disabled={busy}>{busy ? "Signing in…" : "Enter"}</button>
      </form>
    </div>
  );
}

/* ------------------------------------------------ Admin Users (tile) */
function TilePicker({ value, onChange, disabled, hint }) {
  const all = PERMISSION_DEFINITIONS.map((p) => p.id);
  const flip = (id) =>
    onChange(value.includes(id) ? value.filter((k) => k !== id) : [...value, id]);
  return (
    <div>
      <div className="au-tilehead">
        <span className="muted" style={{ fontSize: "0.78rem" }}>
          {hint || "Pick every dashboard tile this admin should be able to see and act on."}
        </span>
        <span style={{ display: "inline-flex", gap: "0.6rem", alignItems: "center" }}>
          <small className="muted">{value.length} of {all.length} selected</small>
          {!disabled && (
            <>
              <button type="button" className="link-underline au-mini" onClick={() => onChange([...all])}>Select all</button>
              <button type="button" className="link-underline au-mini" onClick={() => onChange([])}>Clear</button>
            </>
          )}
        </span>
      </div>
      <div className="au-tiles">
        {PERMISSION_DEFINITIONS.map((p) => {
          const on = value.includes(p.id);
          return (
            <label key={p.id} className={`au-tile ${on ? "on" : ""} ${disabled ? "locked" : ""}`}>
              <input type="checkbox" checked={on} disabled={disabled} onChange={() => flip(p.id)} />
              <span>
                <span className="au-chip" style={{ background: `${p.color}22`, color: p.color }}>{p.nav}</span>
                <small className="muted">{p.hint}</small>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function FieldErrors({ errors }) {
  if (!errors?.length) return null;
  return <p className="form-error" style={{ margin: "0.3rem 0 0" }}>{errors.join(" · ")}</p>;
}

const PW_HINT = "Min 8 chars, with uppercase, number, and special character.";

function AdminUserModal({ mode, user, me, onClose, onDone }) {
  const editing = mode === "edit";
  const self = editing && user.id === me.id;
  const [name, setName] = useState(editing ? user.name : "");
  const [email, setEmail] = useState(editing ? user.email : "");
  const [password, setPassword] = useState("");
  const [tiles, setTiles] = useState(editing ? [...user.permissions] : []);
  const [status, setStatus] = useState(editing ? user.status : "Active");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setErrors({});
    if (!editing && tiles.length === 0) {
      setErrors({ permissions: ["Pick at least one tile"] });
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        const patch = {};
        if (name.trim() !== user.name) patch.name = name.trim();
        if (!self && JSON.stringify([...tiles].sort()) !== JSON.stringify([...user.permissions].sort()))
          patch.permissions = tiles;
        if (!self && status !== user.status) patch.status = status;
        if (Object.keys(patch).length === 0) {
          onClose();
          return;
        }
        await adminApi.patchAdminUser(user.id, patch);
        onDone("Admin updated");
      } else {
        await adminApi.createAdminUser({ name: name.trim(), email: email.trim(), password, permissions: tiles });
        onDone(`${email.trim().toLowerCase()} created`);
      }
    } catch (err) {
      if (err.fieldErrors) setErrors(err.fieldErrors);
      else setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="od-overlay" style={{ zIndex: 242 }} onClick={onClose} />
      <div className="od-modal" style={{ width: "min(640px, calc(100vw - 2rem))" }} role="dialog" aria-label={editing ? `Edit ${user.email}` : "Add admin"}>
        <h3>{editing ? `Edit ${user.email}` : "Add admin"}</h3>
        <form onSubmit={submit} className="checkout-form" style={{ display: "grid", gap: "0.8rem" }}>
          <div className="field">
            <label>Full name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} />
            <FieldErrors errors={errors.name} />
          </div>
          <div className="field">
            <label>Email {editing && <span className="muted">— cannot be changed</span>}</label>
            <input type="email" required={!editing} value={email} disabled={editing} onChange={(e) => setEmail(e.target.value)} />
            <FieldErrors errors={errors.email} />
          </div>
          {!editing && (
            <div className="field">
              <label>Initial password <span className="muted">— {PW_HINT}</span></label>
              <input required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Visible so you can copy it" />
              <FieldErrors errors={errors.password} />
            </div>
          )}
          <div className="field">
            <label>Dashboard tiles</label>
            <TilePicker
              value={tiles}
              onChange={setTiles}
              disabled={self}
              hint={self ? "You cannot change your own permissions." : undefined}
            />
            <FieldErrors errors={errors.permissions} />
          </div>
          {editing && (
            <div className="field">
              <label>Status {self && <span className="muted">— you cannot disable yourself</span>}</label>
              <select value={status} disabled={self} onChange={(e) => setStatus(e.target.value)}>
                <option>Active</option>
                <option>Disabled</option>
              </select>
            </div>
          )}
          {error && <p className="form-error">{error}</p>}
          <div className="od-actions">
            <button className="btn btn-maroon" style={{ padding: "0.5rem 1.3rem" }} disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create admin"}
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: "0.5rem 1.3rem" }} onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function ResetPasswordModal({ user, onClose, onDone }) {
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors(null);
    try {
      await adminApi.resetAdminPassword(user.id, password);
      onDone(`Password reset for ${user.email}. Their sessions have been ended.`);
    } catch (err) {
      if (err.fieldErrors?.password) setErrors(err.fieldErrors.password);
      else setError(err.message);
      setBusy(false);
    }
  };

  return (
    <>
      <div className="od-overlay" style={{ zIndex: 242 }} onClick={onClose} />
      <div className="od-modal" role="dialog" aria-label={`Reset password for ${user.email}`}>
        <h3>Reset password for {user.email}</h3>
        <p className="od-warn" style={{ background: "rgba(176,141,87,.14)", borderColor: "rgba(176,141,87,.45)", color: "#7a5c2e" }}>
          This admin's existing sessions will be revoked immediately. Share the
          new password through a secure channel.
        </p>
        <form onSubmit={submit} className="checkout-form" style={{ display: "grid", gap: "0.8rem" }}>
          <div className="field">
            <label>New password <span className="muted">— {PW_HINT}</span></label>
            <input required value={password} onChange={(e) => setPassword(e.target.value)} />
            <FieldErrors errors={errors} />
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="od-actions">
            <button className="btn btn-maroon" style={{ padding: "0.5rem 1.3rem" }} disabled={busy}>
              {busy ? "Resetting…" : "Reset password"}
            </button>
            <button type="button" className="btn btn-outline" style={{ padding: "0.5rem 1.3rem" }} onClick={onClose} disabled={busy}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function AdminUsersPage({ me }) {
  const [data, setData] = useState(null);
  const [f, setF] = useState({ q: "", permission: "", status: "" });
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [modal, setModal] = useState(null); // {type, user?}

  useEffect(() => {
    const t = setTimeout(() => {
      adminApi
        .adminUsers({ q: f.q.trim(), permission: f.permission, status: f.status, page, limit: 20 })
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }, 300);
    return () => clearTimeout(t);
  }, [f, page, version]);

  const reload = () => setVersion((v) => v + 1);
  const set = (k) => (e) => {
    const value = e.target.value;
    setPage(1);
    setF((prev) => ({ ...prev, [k]: value }));
  };

  const disable = async (u) => {
    if (!window.confirm(`Disable ${u.name} (${u.email})? Their sessions will be ended immediately.`)) return;
    setError(null);
    setNote(null);
    try {
      await adminApi.disableAdminUser(u.id);
      setNote(`${u.email} disabled — their sessions are ended.`);
      reload();
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const meta = data.meta || { page: 1, total: data.users.length, totalPages: 1 };
  const sel = {
    padding: "0.5rem 0.65rem", border: "1px solid var(--line)", borderRadius: 9,
    background: "var(--cream)", font: "inherit", fontSize: "0.86rem",
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.8rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        <div style={{ marginRight: "auto" }}>
          <h3 className="admin-subhead" style={{ margin: 0 }}>Admin Users</h3>
          <p className="muted" style={{ fontSize: "0.82rem", margin: "0.15rem 0 0" }}>
            Master list of accounts with portal access.
          </p>
        </div>
        <a className="btn btn-outline" style={{ padding: "0.45rem 1rem" }} href={adminApi.exportUrl("admin-users")}>
          ⤓ Export CSV
        </a>
        <button className="btn btn-maroon" style={{ padding: "0.45rem 1.1rem" }} onClick={() => setModal({ type: "add" })}>
          + Add admin
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}

      <div className="od-filterbar" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <input style={sel} placeholder="Search name or email…" value={f.q} onChange={set("q")} aria-label="Search admins" />
        <select style={sel} value={f.permission} onChange={set("permission")} aria-label="Filter by permission">
          <option value="">All permissions</option>
          {PERMISSION_DEFINITIONS.map((p) => <option key={p.id} value={p.id}>{p.nav}</option>)}
        </select>
        <select style={sel} value={f.status} onChange={set("status")} aria-label="Filter by status">
          <option value="">All status</option>
          <option>Active</option>
          <option>Disabled</option>
        </select>
      </div>

      {data.users.length === 0 ? (
        <p className="muted">No admins match these filters.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Permissions</th><th>Status</th><th>Last login</th><th style={{ textAlign: "right" }}>Actions</th></tr>
          </thead>
          <tbody>
            {data.users.map((u) => {
              const self = u.id === me.id;
              return (
                <tr key={u.id} style={u.status === "Disabled" ? { opacity: 0.55 } : undefined}>
                  <td>
                    <strong>{u.name}</strong>
                    {self && <small style={{ display: "block" }}><span className="status-pill" style={{ background: "rgba(63,108,76,.18)", color: "var(--green)" }}>YOU</span></small>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span className="au-chips">
                      {u.permissions.length === 0 ? "—" : u.permissions.map((k) => {
                        const p = permDef(k);
                        return <span key={k} className="au-chip" style={{ background: `${p.color}22`, color: p.color }}>{p.nav}</span>;
                      })}
                    </span>
                  </td>
                  <td>
                    <span className="status-pill" style={u.status === "Active" ? { background: "rgba(63,108,76,.18)", color: "var(--green)" } : { background: "rgba(120,120,120,.18)" }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{u.lastLogin ? fmtDate(u.lastLogin) : "—"}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn btn-outline au-act" title="Edit" onClick={() => setModal({ type: "edit", user: u })}>✎</button>
                    <button
                      className="btn btn-outline au-act"
                      title={self ? "Use My Profile to change your password" : "Reset password"}
                      disabled={self}
                      onClick={() => setModal({ type: "reset", user: u })}
                    >⚿</button>
                    <button
                      className="btn btn-outline au-act od-danger"
                      title={self ? "Cannot disable yourself" : u.status === "Disabled" ? "Already disabled" : "Disable"}
                      disabled={self || u.status === "Disabled"}
                      onClick={() => disable(u)}
                    >⊘</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <div className="od-listfoot">
        <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>
          Page {meta.page} of {meta.totalPages} · {meta.total} admin{meta.total === 1 ? "" : "s"} · disabled accounts stay on record and can be re-activated from Edit.
        </p>
        {meta.totalPages > 1 && (
          <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
            <button className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>← Prev</button>
            <button className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>Next →</button>
          </span>
        )}
      </div>

      {modal?.type === "add" && (
        <AdminUserModal mode="add" me={me} onClose={() => setModal(null)} onDone={(msg) => { setModal(null); setNote(msg); reload(); }} />
      )}
      {modal?.type === "edit" && (
        <AdminUserModal mode="edit" user={modal.user} me={me} onClose={() => setModal(null)} onDone={(msg) => { setModal(null); setNote(msg); reload(); }} />
      )}
      {modal?.type === "reset" && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} onDone={(msg) => { setModal(null); setNote(msg); }} />
      )}
    </div>
  );
}

/* ---------------------------------------------------------- dashboard */
/* One glance = the state of the business. Every widget is permission-aware:
   fetches that 403 for this admin simply hide their section. */
const QUICK_ACTIONS = [
  ["◈", "Update gold rate", "rates"],
  ["▤", "Orders console", "orders"],
  ["✚", "Add a piece", "catalogue"],
  ["％", "Create a coupon", "promos"],
  ["▧", "Category promotions", "settings"],
  ["◷", "Appointments", "appointments"],
  ["✉", "Message log", "notifications"],
  ["☖", "Manage admins", "admin-users"],
];

function Dashboard({ goTo, can = () => true }) {
  const [data, setData] = useState(null);
  const [abandoned, setAbandoned] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [rates, setRates] = useState(null);
  const [error, setError] = useState(null);
  const [loadedAt] = useState(() => new Date());

  useEffect(() => {
    adminApi.summary().then(setData).catch((e) => setError(e.message));
    adminApi.abandoned().then(setAbandoned).catch(() => {});
    adminApi.analytics().then(setAnalytics).catch(() => {});
    adminApi.rates().then(setRates).catch(() => {}); // hidden without the tile
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const byDay = analytics?.byDay || [];
  const today = byDay[byDay.length - 1];
  const yesterday = byDay[byDay.length - 2];
  const deltaPct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null);
  const spark = (key) => byDay.map((d, i) => ({ t: i, v: d[key] }));
  const pendingOrders = Object.entries(data.byStatus || {})
    .filter(([s]) => !["Delivered", "Cancelled", "Refunded", "Returned"].includes(s))
    .reduce((n, [, c]) => n + c, 0);
  const updated = loadedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

  const Delta = ({ now, prev }) => {
    const d = deltaPct(now, prev);
    if (d === null) return <small className="muted">vs yesterday —</small>;
    return (
      <small className={`rc-delta ${d >= 0 ? "up" : "down"}`}>
        {d >= 0 ? "▲" : "▼"} {Math.abs(d)}% vs yesterday
      </small>
    );
  };

  const lastRateChange = (m, p) => {
    const h = rates?.history || [];
    for (let i = h.length - 1; i >= 0; i--) if (h[i].metal === m && h[i].purity === p) return h[i];
    return null;
  };
  const rateSpark = (m, p) => {
    const pts = (rates?.history || []).filter((h) => h.metal === m && h.purity === p).slice(-10).map((h, i) => ({ t: i, v: h.to }));
    pts.push({ t: pts.length, v: rates.rates[m][p] });
    return pts;
  };

  const actions = QUICK_ACTIONS.filter(([, , tile]) => can(tile));

  return (
    <>
      {/* ---- headline: money and movement first */}
      <div className="dash-hero">
        <div className="dash-kpi">
          <div className="dk-top"><span className="dk-ico">₹</span><label>Today's revenue</label><small>at {updated}</small></div>
          <span className="dk-value">{formatINR(today?.revenue ?? 0)}</span>
          <div className="dk-foot">
            <Delta now={today?.revenue ?? 0} prev={yesterday?.revenue} />
            {byDay.length > 1 && <Sparkline points={spark("revenue")} color="#b02a45" />}
          </div>
        </div>
        <div className="dash-kpi">
          <div className="dk-top"><span className="dk-ico">▤</span><label>Today's orders</label><small>at {updated}</small></div>
          <span className="dk-value">{today?.orders ?? 0}</span>
          <div className="dk-foot">
            <Delta now={today?.orders ?? 0} prev={yesterday?.orders} />
            {byDay.length > 1 && <Sparkline points={spark("orders")} color="#9a721a" />}
          </div>
        </div>
        <div className="dash-kpi" onClick={() => can("orders") && goTo("orders")} role="button" tabIndex={0}>
          <div className="dk-top"><span className="dk-ico">◷</span><label>Open orders</label><small>to fulfil</small></div>
          <span className="dk-value">{pendingOrders}</span>
          <div className="dk-foot"><small className="muted">everything not yet delivered</small></div>
        </div>
        <div className="dash-kpi">
          <div className="dk-top"><span className="dk-ico">◈</span><label>Avg order value</label><small>lifetime</small></div>
          <span className="dk-value">{analytics ? formatINR(analytics.aov) : "—"}</span>
          <div className="dk-foot"><small className="muted">{analytics ? `${analytics.buyers} buyers · ${analytics.repeatRatePct}% repeat` : ""}</small></div>
        </div>
      </div>

      {/* ---- live market strip (needs the rates tile) */}
      {rates && (
        <div className="dash-rates" onClick={() => can("rates") && goTo("rates")} role="button" tabIndex={0}>
          {[["gold", "24K"], ["gold", "22K"], ["gold", "18K"], ["silver", "925"], ["platinum", "PT950"]].map(([m, p]) => {
            const v = rates.rates[m]?.[p];
            if (v === undefined) return null;
            const chg = lastRateChange(m, p);
            const pct = chg ? ((chg.to - chg.from) / chg.from) * 100 : null;
            return (
              <div className="dash-rate" key={m + p}>
                <label>{m} {p}</label>
                <strong>{formatINR(v)}<small>/g</small></strong>
                {pct === null ? (
                  <small className="muted">no change yet</small>
                ) : (
                  <small className={`rc-delta ${pct >= 0 ? "up" : "down"}`}>
                    {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% · {new Date(chg.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </small>
                )}
                <Sparkline points={rateSpark(m, p)} color={pct !== null && pct < 0 ? "#27754c" : "#9a721a"} />
              </div>
            );
          })}
          <small className="muted dash-rates-note">
            {rates.updatedAt ? `last published ${fmtDate(rates.updatedAt)}` : "no publish yet"} · open the Rate Console →
          </small>
        </div>
      )}

      {/* ---- quick actions */}
      {actions.length > 0 && (
        <div className="dash-actions">
          {actions.map(([ico, label, tile]) => (
            <button key={tile} className="dash-act" onClick={() => goTo(tile)}>
              <span aria-hidden>{ico}</span> {label}
            </button>
          ))}
        </div>
      )}

      {/* ---- trend + category mix */}
      {analytics && byDay.length > 1 && (
        <div className="dash-row">
          <section className="rc-card">
            <div className="rc-cardhead"><h3>Sales trend — last 14 days</h3></div>
            <RateChart
              series={[{ key: "₹", color: "#b02a45", points: byDay.map((d) => ({ t: Date.parse(d.day), v: d.revenue })) }]}
              formatTick={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${Math.round(v)}`)}
            />
          </section>
          <section className="rc-card">
            <div className="rc-cardhead"><h3>Top categories</h3></div>
            {analytics.categories.length === 0 ? (
              <p className="muted">No sales yet.</p>
            ) : (
              <div className="dash-cats">
                {analytics.categories.slice(0, 6).map((c) => {
                  const max = analytics.categories[0].revenue || 1;
                  return (
                    <div key={c.category} className="dash-cat">
                      <span style={{ textTransform: "capitalize" }}>{c.category}</span>
                      <div className="dash-cat-bar"><i style={{ width: `${Math.max(4, (c.revenue / max) * 100)}%` }} /></div>
                      <small>{formatINR(c.revenue)}</small>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      <div className="kpi-grid">
        <div className="kpi"><span>{data.orders}</span><label>Orders all-time</label></div>
        <div className="kpi"><span>{formatINR(data.revenue)}</span><label>Revenue all-time</label></div>
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
/* Order lifecycle console. The list is searchable and filterable; a row
   opens the side drawer with the full order — status controls, customer,
   delivery, items, totals, documents and the timeline. Transitions go
   through PATCH /status, which also notifies the customer by SMS,
   restores stock on cancellation and raises the invoice when due. */
const STATUS_TINT = {
  Placed: { background: "rgba(176,141,87,.16)", color: "#7a5c2e" },
  "Verification Pending": { background: "rgba(140,22,38,.12)", color: "var(--maroon-bright)" },
  Confirmed: { background: "rgba(63,108,76,.14)", color: "var(--green, #3f6c4c)" },
  "Under Quality Check": { background: "rgba(176,141,87,.16)", color: "#7a5c2e" },
  Packed: { background: "rgba(176,141,87,.2)", color: "#6d5226" },
  Shipped: { background: "rgba(70,90,140,.14)", color: "#3d517e" },
  "Out for Delivery": { background: "rgba(70,90,140,.2)", color: "#33466f" },
  Delivered: { background: "rgba(63,108,76,.2)", color: "#2f5a3c" },
  Cancelled: { background: "rgba(140,22,38,.14)", color: "var(--maroon-bright)" },
  Returned: { background: "rgba(120,120,120,.16)", color: "inherit" },
  Refunded: { background: "rgba(120,120,120,.16)", color: "inherit" },
};

function StatusPill({ status }) {
  return (
    <span className="status-pill" style={STATUS_TINT[status]}>
      {status}
    </span>
  );
}

const invoiceReady = (o) =>
  o.invoice || o.payment.status === "paid" || !["Placed", "Verification Pending", "Cancelled"].includes(o.status);

function OrderDrawer({ order: o, onClose, onMove, busy }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const forward = (o.nextStatuses || []).filter((s) => !["Cancelled", "Returned", "Refunded"].includes(s));
  const special = (o.nextStatuses || []).filter((s) => ["Cancelled", "Returned", "Refunded"].includes(s));
  const pickup = o.fulfilment?.method === "pickup";

  return (
    <>
      <div className="od-overlay" onClick={onClose} />
      <aside className="od-drawer" role="dialog" aria-label={`Order details ${o.orderId}`}>
        <header className="od-head">
          <div>
            <h3>Order details</h3>
            <code>{o.orderId}</code>
          </div>
          <button className="icon-btn" aria-label="Close order details" onClick={onClose}>✕</button>
        </header>

        <div className="od-chips">
          <StatusPill status={o.status} />
          <span className="status-pill" style={{ background: o.payment.status === "paid" ? "rgba(63,108,76,.14)" : "rgba(176,141,87,.16)" }}>
            {o.payment.status}
          </span>
          <span className="status-pill">{o.payment.mode.toUpperCase()}</span>
          <span className="od-placed muted">Placed {fmtDate(o.placedAt)}</span>
        </div>

        {(forward.length > 0 || special.length > 0) && (
          <section className="od-card">
            <h4>Move to next status</h4>
            <div className="od-actions">
              {forward.map((s, i) => (
                <button
                  key={s}
                  className={`btn ${i === 0 ? "btn-maroon" : "btn-outline"}`}
                  style={{ padding: "0.5rem 1.1rem" }}
                  disabled={busy}
                  onClick={() => onMove(o.orderId, s)}
                >
                  {o.status === "Verification Pending" && s === "Confirmed" ? "Verified — Confirm" : `Mark ${s}`}
                </button>
              ))}
              {special.map((s) => (
                <button
                  key={s}
                  className="btn btn-outline od-danger"
                  style={{ padding: "0.5rem 1.1rem" }}
                  disabled={busy}
                  onClick={() => onMove(o.orderId, s)}
                >
                  {s === "Cancelled" ? "Cancel order" : `Mark ${s}`}
                </button>
              ))}
            </div>
            <p className="muted od-fine">
              Cancelling restores stock for every line item. The customer is
              notified by SMS on every transition.
            </p>
          </section>
        )}

        <section className="od-card">
          <h4>Customer</h4>
          <strong>{o.customer.name}</strong>
          {o.customer.email && <div className="muted">{o.customer.email}</div>}
          <div className="muted">{o.customer.phone}</div>
        </section>

        <section className="od-card">
          <h4>{pickup ? "Fulfilment" : "Delivery address"}</h4>
          {pickup ? (
            <div>Store pickup — {o.fulfilment.store?.name}</div>
          ) : (
            <div>
              <strong>{o.customer.name} · {o.customer.phone}</strong>
              <div className="muted">
                {o.customer.address}
                {o.customer.pincode ? ` — ${o.customer.pincode}` : ""}
              </div>
            </div>
          )}
          {o.location && (
            <p className="od-fine" style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <a
                className="link-underline"
                href={`https://www.google.com/maps?q=${o.location.lat},${o.location.lng}`}
                target="_blank"
                rel="noreferrer"
              >
                Open in Google Maps ↗
              </a>
              <span className="status-pill" style={{ background: "rgba(63,108,76,.14)" }}>Live GPS pin</span>
            </p>
          )}
          {o.gift && (
            <p className="muted od-fine">
              Gift-wrapped{o.gift.hideInvoiceValue ? " · packing slip hides values" : ""}
              {o.gift.message ? ` · “${o.gift.message}”` : ""}
            </p>
          )}
        </section>

        <section className="od-card">
          <h4>Items ({o.lines.reduce((s, l) => s + l.qty, 0)})</h4>
          {o.lines.map((l) => (
            <div className="od-item" key={l.slug + (l.size || "")}>
              <img src={l.image} alt="" loading="lazy" />
              <div>
                <a className="link-underline" href={`/product/${l.slug}`} target="_blank" rel="noreferrer">{l.name}</a>
                <small className="muted">
                  {l.qty} × {formatINR(l.unitPrice)}
                  {l.size ? ` · size ${l.size}` : ""}
                  {l.variantNote ? ` · ${l.variantNote}` : ""}
                  {l.engraving ? ` · engraved “${l.engraving}”` : ""}
                </small>
              </div>
              <strong>{formatINR(l.lineTotal)}</strong>
            </div>
          ))}
        </section>

        {(o.deliveryPhotos || []).length > 0 && (
          <section className="od-card">
            <h4>Open-box delivery photos</h4>
            <div className="od-photos">
              {o.deliveryPhotos.map((p, i) => (
                <figure key={i}>
                  <a href={p.url} target="_blank" rel="noreferrer">
                    <img src={p.url} alt={`Delivery photo ${i + 1}`} loading="lazy" />
                  </a>
                  <figcaption className="muted">
                    {fmtDate(p.uploadedAt)} · {p.uploadedBy}
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        <section className="od-card">
          <h4>Totals</h4>
          <dl className="od-totals">
            <dt>Subtotal</dt><dd>{formatINR(o.total)}</dd>
            <dt>Discount{o.coupon ? ` (${o.coupon})` : ""}</dt><dd>{o.discount ? `− ${formatINR(o.discount)}` : "₹0"}</dd>
            {o.redeemed && (<><dt>Points redeemed</dt><dd>− {formatINR(o.redeemed.value)}</dd></>)}
            <dt className="od-grand">Total</dt><dd className="od-grand">{formatINR(o.payable ?? o.total)}</dd>
          </dl>
          <p className="muted od-fine">GST included — the break-up is on the tax invoice.</p>
          <div className="od-actions">
            {invoiceReady(o) && (
              <a className="btn btn-outline" style={{ padding: "0.45rem 1rem" }} href={`/invoice/${o.orderId}?phone=${encodeURIComponent(o.customer.phone)}`} target="_blank" rel="noreferrer">
                {o.invoice ? o.invoice.number : "Tax invoice"}
              </a>
            )}
            <a className="btn btn-outline" style={{ padding: "0.45rem 1rem" }} href={`/packing-slip/${o.orderId}?phone=${encodeURIComponent(o.customer.phone)}`} target="_blank" rel="noreferrer">
              Packing slip{o.gift?.hideInvoiceValue ? " (no values)" : ""}
            </a>
          </div>
        </section>

        <section className="od-card">
          <h4>Timeline</h4>
          <ol className="od-timeline">
            {[...o.statusTimeline].reverse().map((t, i) => (
              <li key={i}>
                <strong>{t.status}</strong>
                <span className="muted">
                  {fmtDate(t.at)}
                  {t.by ? ` · by ${t.by}` : ""}
                  {t.note ? ` · ${t.note}` : ""}
                  {t.paymentCollected ? " · COD collected at the door" : ""}
                  {t.photoCount ? ` · ${t.photoCount} open-box photo${t.photoCount > 1 ? "s" : ""}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </section>
      </aside>
    </>
  );
}

/* Confirmation step for every transition — optional note for the timeline,
   a red warning when cancelling, and on Delivered an open-box photo
   uploader plus a heads-up that a pending COD flips to paid. */
function TransitionModal({ order: o, to, onClose, onConfirm, busy }) {
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]); // [{url}]
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState(null);
  const delivering = to === "Delivered";
  const codPending = delivering && o.payment.mode === "cod" && o.payment.status !== "paid";

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    if (photos.length + files.length > 8) {
      setErr("At most 8 open-box photos per delivery.");
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      for (const file of files) {
        if (file.size > 100 * 1024 * 1024) throw new Error(`${file.name} is over 100 MB.`);
        const { url } = await adminApi.uploadFile(file);
        setPhotos((prev) => [...prev, { url }]);
      }
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="od-overlay" style={{ zIndex: 242 }} onClick={onClose} />
      <div className="od-modal" role="dialog" aria-label={`Confirm status change to ${to}`}>
        <h3>Update order status</h3>
        <p className="od-fromto">
          <StatusPill status={o.status} /> <span aria-hidden>→</span> <StatusPill status={to} />
        </p>
        {to === "Cancelled" && (
          <p className="od-warn">
            Cancelling returns every piece to stock and cannot be undone. The
            customer is notified immediately.
          </p>
        )}
        {codPending && (
          <p className="od-info">
            Cash-on-delivery order — marking it delivered records the payment
            as collected and raises the tax invoice.
          </p>
        )}
        <label className="field" style={{ display: "block" }}>
          <span className="muted" style={{ fontSize: "0.78rem" }}>
            Note for the order timeline (optional, {500 - note.length} left)
          </span>
          <textarea
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={to === "Cancelled" ? "Reason for cancellation…" : "e.g. handed to courier, AWB 1234…"}
            style={{ width: "100%", marginTop: "0.3rem" }}
          />
        </label>
        {delivering && (
          <div style={{ marginTop: "0.7rem" }}>
            <span className="muted" style={{ fontSize: "0.78rem" }}>
              Open-box photos at handover (optional, up to 8)
            </span>
            <div className="od-photo-stage">
              {photos.map((p, i) => (
                <span key={p.url} className="od-photo-thumb">
                  <img src={p.url} alt={`Open-box photo ${i + 1}`} />
                  <button aria-label="Remove photo" onClick={() => setPhotos((prev) => prev.filter((x) => x.url !== p.url))}>✕</button>
                </span>
              ))}
              {photos.length < 8 && (
                <label className="btn btn-outline" style={{ padding: "0.45rem 0.9rem", cursor: "pointer" }}>
                  {uploading ? "Uploading…" : "⤒ Add photos"}
                  <input type="file" accept="image/*" capture="environment" multiple hidden onChange={upload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        )}
        {err && <p className="form-error">{err}</p>}
        <div className="od-actions" style={{ marginTop: "1rem" }}>
          <button
            className={`btn ${to === "Cancelled" ? "btn-outline od-danger" : "btn-maroon"}`}
            style={{ padding: "0.5rem 1.2rem" }}
            disabled={busy || uploading}
            onClick={() => onConfirm({ status: to, note: note.trim() || undefined, deliveryPhotos: photos.length ? photos : undefined })}
          >
            {busy ? "Updating…" : to === "Cancelled" ? "Cancel this order" : `Confirm — ${to}`}
          </button>
          <button className="btn btn-outline" style={{ padding: "0.5rem 1.2rem" }} onClick={onClose} disabled={busy}>
            Keep as is
          </button>
        </div>
      </div>
    </>
  );
}

function Orders() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [open, setOpen] = useState(null); // orderId shown in the drawer
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ q: "", cust: "", status: "", pay: "", from: "", to: "" });
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState(null); // {orderId, to} awaiting the modal

  // server-side filtering + pagination; the short debounce keeps typing smooth
  useEffect(() => {
    const t = setTimeout(() => {
      adminApi
        .orders({ q: f.q.trim(), customer: f.cust.trim(), status: f.status, payment: f.pay, from: f.from, to: f.to, page, limit: 20 })
        .then((d) => {
          setData(d);
          setError(null);
        })
        .catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [f, page]);

  // any filter change restarts from page 1
  const set = (k) => (e) => {
    const value = e.target.value;
    setPage(1);
    setF((prev) => ({ ...prev, [k]: value }));
  };

  const move = async (orderId, body) => {
    setError(null);
    setNote(null);
    setBusy(true);
    try {
      const res = await adminApi.setOrderStatus(orderId, body);
      // splice the updated order in place — filters and page stay put
      setData((prev) => {
        if (!prev) return prev;
        const before = prev.orders.find((o) => o.orderId === orderId);
        const counts = { ...prev.meta?.counts };
        if (before && counts[before.status]) {
          counts[before.status] -= 1;
          counts[res.order.status] = (counts[res.order.status] || 0) + 1;
        }
        return {
          ...prev,
          orders: prev.orders.map((o) => (o.orderId === orderId ? res.order : o)),
          meta: prev.meta ? { ...prev.meta, counts } : prev.meta,
        };
      });
      setNote(`${orderId} → ${body.status} — the customer has been notified.`);
      setConfirm(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const filtered = data.orders;
  const meta = data.meta || { page: 1, total: filtered.length, totalPages: 1, counts: {} };
  const counts = meta.counts || {};
  const everPlaced = Object.values(counts).reduce((s, n) => s + n, 0);
  const payStates = ["unpaid", "cod-pending", "paid", "failed", "refunded"];
  const current = open && data.orders.find((o) => o.orderId === open);
  const confirming = confirm && data.orders.find((o) => o.orderId === confirm.orderId);
  const lbl = { fontSize: "0.72rem", letterSpacing: "0.06em", textTransform: "uppercase", display: "grid", gap: "0.25rem" };

  return (
    <>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}
      {everPlaced === 0 ? (
        <p className="muted">No orders yet — place one from the storefront.</p>
      ) : (
        <>
          <div className="od-filterbar">
            <label style={lbl}>
              Order ID contains
              <input value={f.q} onChange={set("q")} placeholder="e.g. DPJ2608" />
            </label>
            <label style={lbl}>
              Customer contains
              <input value={f.cust} onChange={set("cust")} placeholder="name, phone or email" />
            </label>
            <label style={lbl}>
              Status
              <select value={f.status} onChange={set("status")}>
                <option value="">All</option>
                {[...new Set(["Verification Pending", ...data.flow, ...data.special, ...Object.keys(counts)])].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label style={lbl}>
              Payment
              <select value={f.pay} onChange={set("pay")}>
                <option value="">All</option>
                {payStates.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label style={lbl}>
              From
              <input type="date" value={f.from} onChange={set("from")} />
            </label>
            <label style={lbl}>
              To
              <input type="date" value={f.to} onChange={set("to")} />
            </label>
            {(f.q || f.cust || f.status || f.pay || f.from || f.to) && (
              <button className="btn btn-outline" style={{ padding: "0.45rem 1rem", alignSelf: "end" }} onClick={() => setF({ q: "", cust: "", status: "", pay: "", from: "", to: "" })}>
                Clear
              </button>
            )}
          </div>

          <div className="od-counts">
            {Object.entries(counts).map(([s, n]) => (
              <button
                key={s}
                className="status-pill"
                style={{ ...STATUS_TINT[s], border: "none", cursor: "pointer", opacity: f.status && f.status !== s ? 0.45 : 1 }}
                onClick={() => {
                  setPage(1);
                  setF((prev) => ({ ...prev, status: prev.status === s ? "" : s }));
                }}
                title={`Show only ${s}`}
              >
                {s} · {n}
              </button>
            ))}
          </div>

          <table className="admin-table od-table">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.orderId} className="od-row" onClick={() => setOpen(o.orderId)} tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setOpen(o.orderId)}>
                  <td>
                    {o.orderId}
                    <small>{fmtDate(o.placedAt)}</small>
                  </td>
                  <td>
                    {o.customer.name}
                    <small>{o.customer.phone}</small>
                  </td>
                  <td>{o.lines.reduce((s, l) => s + l.qty, 0)} item{o.lines.reduce((s, l) => s + l.qty, 0) === 1 ? "" : "s"}</td>
                  <td>
                    {o.payment.mode.toUpperCase()}
                    <small>{o.payment.status}</small>
                  </td>
                  <td>{formatINR(o.payable ?? o.total)}</td>
                  <td><StatusPill status={o.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: "center", padding: "1.4rem" }}>No orders match those filters.</td></tr>
              )}
            </tbody>
          </table>
          <div className="od-listfoot">
            <p className="muted" style={{ fontSize: "0.78rem", margin: 0 }}>
              Showing {filtered.length} of {meta.total} order{meta.total === 1 ? "" : "s"} · click a row for full details and status controls.
            </p>
            <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
              {meta.totalPages > 1 && (
                <span style={{ display: "inline-flex", gap: "0.4rem", alignItems: "center" }}>
                  <button className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} disabled={meta.page <= 1} onClick={() => setPage(meta.page - 1)}>
                    ← Prev
                  </button>
                  <span className="muted" style={{ fontSize: "0.78rem" }}>Page {meta.page} of {meta.totalPages}</span>
                  <button className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} disabled={meta.page >= meta.totalPages} onClick={() => setPage(meta.page + 1)}>
                    Next →
                  </button>
                </span>
              )}
              <a className="btn btn-outline" style={{ padding: "0.35rem 0.9rem" }} href={adminApi.exportUrl("orders")}>
                ⤓ Export CSV
              </a>
            </div>
          </div>
        </>
      )}
      {current && (
        <OrderDrawer
          order={current}
          onClose={() => setOpen(null)}
          onMove={(orderId, to) => setConfirm({ orderId, to })}
          busy={busy}
        />
      )}
      {confirming && (
        <TransitionModal
          order={confirming}
          to={confirm.to}
          onClose={() => setConfirm(null)}
          onConfirm={(body) => move(confirming.orderId, body)}
          busy={busy}
        />
      )}
    </>
  );
}

/* ---------------------------------------------------------- catalogue */
const PURITIES = { gold: ["24K", "22K", "18K", "14K"], silver: ["925"], platinum: ["PT950"] };

/* Occasion tags — they group the header mega-menu ("Popular styles") and
   feed the /shop occasion filter. The canonical set below matches the
   storefront labels; a piece keeps any custom tag it already carries. */
const OCCASIONS = [
  ["wedding", "Wedding"], ["engagement", "Engagement"], ["anniversary", "Anniversary"],
  ["festive", "Festive"], ["daily", "Everyday"], ["office", "Office wear"],
  ["party", "Party"], ["gifting", "Gifting"],
];

function OccasionChips({ value, onChange }) {
  const known = OCCASIONS.map(([k]) => k);
  const custom = value.filter((t) => !known.includes(t));
  const flip = (k) =>
    onChange(value.includes(k) ? value.filter((t) => t !== k) : [...value, k]);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
      {OCCASIONS.concat(custom.map((t) => [t, t])).map(([k, label]) => {
        const on = value.includes(k);
        return (
          <label
            key={k}
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.35rem",
              padding: "0.32rem 0.7rem", borderRadius: 999, cursor: "pointer",
              fontSize: "0.8rem", textTransform: "none", letterSpacing: 0,
              border: `1px solid ${on ? "var(--maroon)" : "var(--line)"}`,
              background: on ? "var(--maroon)" : "var(--cream)",
              color: on ? "var(--cream)" : "inherit",
            }}
          >
            <input type="checkbox" hidden checked={on} onChange={() => flip(k)} />
            {on ? "✓ " : ""}{label}
          </label>
        );
      })}
    </div>
  );
}

/* Diamond quality bands (must mirror the server's diamondGradeOf): the
   clarity/colour stored on the stone anchor which band the catalogued
   per-carat rate belongs to — the PDP customisation pills price relative
   to it. The admin picks a band; we store a representative clarity+colour. */
const QUALITY_BANDS = [
  { key: "SI-IJ", label: "SI IJ", clarity: "SI1", colour: "I" },
  { key: "SI-GH", label: "SI GH", clarity: "SI1", colour: "G" },
  { key: "VS-GH", label: "VS GH", clarity: "VS1", colour: "G" },
  { key: "VVS-EF", label: "VVS EF", clarity: "VVS1", colour: "E" },
];
function bandOf(clarity, colour) {
  const c = String(clarity || "VS").toUpperCase();
  const col = String(colour || "G").toUpperCase()[0];
  if (/^(VVS|IF|FL)/.test(c)) return "VVS-EF";
  if (c.startsWith("VS")) return "VS-GH";
  return "EFGH".includes(col) ? "SI-GH" : "SI-IJ";
}

const BLANK_PRODUCT_FORM = {
  name: "", slug: "", category: "rings", metalType: "gold", purity: "22K",
  colour: "yellow", grossWeight: "", netWeight: "", makingBasis: "perGram",
  makingValue: "", imageUrl: "", extraImages: "", sizes: "", stock: "6", description: "",
  collection: "", gender: "women", sizeLabel: "", occasion: ["daily"],
  stoneType: "", stoneCarat: "", stoneRate: "", stoneClarity: "", stoneColour: "",
  stoneCertBody: "", stoneCertNo: "",
  hallmarkingCharge: "45", certificationCharge: "", huid: "", leadTimeDays: "",
  engravable: false, featured: false,
};

// raw stored product → form values (edit mode)
function productToForm(p) {
  const s = (p.stones || [])[0];
  return {
    ...BLANK_PRODUCT_FORM,
    name: p.name, slug: p.slug, category: p.category,
    metalType: p.metal.type, purity: p.metal.purity, colour: p.metal.colour || "yellow",
    grossWeight: String(p.metal.grossWeight), netWeight: String(p.metal.netWeight),
    makingBasis: p.making.basis, makingValue: String(p.making.value),
    sizes: (p.sizes || []).join(", "), sizeLabel: p.sizeLabel || "",
    description: p.description || "", collection: p.collection || "",
    gender: p.gender || "women", occasion: p.occasion || ["daily"],
    stoneType: s?.type || "", stoneCarat: s ? String(s.caratTotal) : "",
    stoneRate: s ? String(s.ratePerCarat) : "",
    stoneClarity: s?.clarity || "", stoneColour: s?.colour || "",
    stoneCertBody: s?.certBody || "", stoneCertNo: s?.certNo || "",
    hallmarkingCharge: String(p.otherCharges?.hallmarking ?? 45),
    certificationCharge: p.otherCharges?.certification ? String(p.otherCharges.certification) : "",
    huid: p.huid || "", leadTimeDays: p.leadTimeDays ? String(p.leadTimeDays) : "",
    engravable: !!p.engravable, featured: !!p.featured,
  };
}

function AddProduct({ onCreated, onError }) {
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <button className="btn btn-maroon" style={{ marginBottom: "1.4rem" }} onClick={() => setOpen(true)}>
        + Add a piece
      </button>
    );
  return (
    <ProductForm
      onCancel={() => setOpen(false)}
      onSaved={(r) => {
        setOpen(false);
        onCreated(r);
      }}
      onError={onError}
    />
  );
}

// One form, two modes: no `initial` creates; `initial` (the raw stored
// product) edits in place — slug immutable, images/occasions/stock keep
// their dedicated inline editors.
function ProductForm({ initial, onSaved, onCancel, onError }) {
  const edit = !!initial;
  const [cats, setCats] = useState([]);
  const [busy, setBusy] = useState(false);
  const blank = BLANK_PRODUCT_FORM;
  const [form, setForm] = useState(edit ? productToForm(initial) : blank);
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
      const stone = form.stoneType
        ? {
            type: form.stoneType,
            caratTotal: Number(form.stoneCarat),
            ratePerCarat: Number(form.stoneRate),
            clarity: form.stoneClarity || undefined,
            colour: form.stoneColour || undefined,
            certBody: form.stoneCertBody || undefined,
            certNo: form.stoneCertNo || undefined,
          }
        : undefined;
      const common = {
        name: form.name,
        category: form.category,
        metalType: form.metalType,
        purity: form.purity,
        colour: form.colour,
        grossWeight: Number(form.grossWeight),
        netWeight: Number(form.netWeight),
        making: { basis: form.makingBasis, value: Number(form.makingValue) },
        sizes: form.sizes,
        collection: form.collection || undefined,
        gender: form.gender,
        sizeLabel: form.sizeLabel || undefined,
        hallmarkingCharge: form.hallmarkingCharge === "" ? undefined : Number(form.hallmarkingCharge),
        certificationCharge: form.certificationCharge === "" ? undefined : Number(form.certificationCharge),
        huid: form.huid || undefined,
        leadTimeDays: form.leadTimeDays === "" ? undefined : Number(form.leadTimeDays),
        madeToOrder: Number(form.leadTimeDays) > 0,
        engravable: form.engravable,
        featured: form.featured,
      };
      let res;
      if (edit) {
        res = await adminApi.patchProduct(initial.slug, {
          ...common,
          // in edit, a cleared stone field genuinely removes the stone
          stone: stone || null,
          ...(form.description.trim() ? { description: form.description } : {}),
        });
        res = { ...res, slug: initial.slug };
      } else {
        res = await adminApi.createProduct({
          ...common,
          slug: form.slug,
          stone,
          description: form.description,
          occasion: form.occasion,
          imageUrl: form.imageUrl || undefined,
          extraImages: form.extraImages
            ? form.extraImages.split(";").map((t) => t.trim()).filter(Boolean)
            : undefined,
          stock: form.stock === "" ? undefined : Number(form.stock),
        });
        setForm(blank);
      }
      onSaved(res);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="checkout-form" onSubmit={submit} style={{ marginBottom: "2rem", maxWidth: 720 }}>
      <div className="form-row">
        <div className="field">
          <label>Name</label>
          <input required value={form.name} onChange={set("name")} placeholder="Kaveri Gold Band" />
        </div>
        <div className="field">
          <label>{edit ? "Slug (fixed)" : "Slug (optional — derived from name)"}</label>
          <input value={form.slug} onChange={set("slug")} placeholder="kaveri-gold-band" disabled={edit} />
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
        {!edit && (
          <div className="field">
            <label>Opening stock</label>
            <input inputMode="numeric" value={form.stock} onChange={set("stock")} />
          </div>
        )}
      </div>
      {!edit && (
        <div className="field">
          <label>
            Occasions{" "}
            <span className="muted" style={{ fontWeight: 400 }}>
              — where the piece appears in the header menu and shop filters
            </span>
          </label>
          <OccasionChips
            value={form.occasion}
            onChange={(occ) => setForm((f) => ({ ...f, occasion: occ }))}
          />
        </div>
      )}
      {!edit && (
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
      )}
      {edit && (
        <p className="muted" style={{ fontSize: "0.78rem", margin: "0.2rem 0 0.6rem" }}>
          Images, occasion tags, stock and publish/feature flags keep their inline
          editors in the catalogue table — everything else saves from here.
        </p>
      )}
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
          {form.stoneType.trim().toLowerCase().includes("diamond") && (
            <div className="field">
              <label>
                Diamond quality band{" "}
                <span className="muted" style={{ fontWeight: 400 }}>
                  — the rate above is the price OF this band; customers customise
                  to the other bands and the price re-derives from it
                </span>
              </label>
              <select
                value={bandOf(form.stoneClarity, form.stoneColour)}
                onChange={(e) => {
                  const band = QUALITY_BANDS.find((b) => b.key === e.target.value);
                  if (band)
                    setForm((f) => ({ ...f, stoneClarity: band.clarity, stoneColour: band.colour }));
                }}
              >
                {QUALITY_BANDS.map((b) => (
                  <option key={b.key} value={b.key}>{b.label}</option>
                ))}
              </select>
            </div>
          )}
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
          {busy ? "Saving…" : edit ? "Save changes" : "Create piece"}
        </button>
        <button type="button" className="btn btn-outline" onClick={onCancel}>
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

/* Retag an existing piece — the mega-menu and shop filters follow the
   saved tags on the next load. */
function OccasionsEditor({ product, onSaved, onError }) {
  const [tags, setTags] = useState(product.occasion || []);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    onError(null);
    try {
      await adminApi.patchProduct(product.slug, { occasion: tags });
      onSaved(tags);
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "0.7rem", padding: "0.5rem 0.2rem" }}>
      <OccasionChips value={tags} onChange={setTags} />
      <div style={{ display: "flex", gap: "0.7rem", alignItems: "center" }}>
        <button
          className="btn btn-maroon"
          style={{ padding: "0.45rem 1.2rem" }}
          onClick={save}
          disabled={busy || tags.length === 0}
        >
          {busy ? "Saving…" : "Save occasions"}
        </button>
        {tags.length === 0 && (
          <span className="muted" style={{ fontSize: "0.78rem" }}>
            Pick at least one — every piece needs a home in the menu.
          </span>
        )}
      </div>
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
  const [occFor, setOccFor] = useState(null); // slug with the occasions editor open
  const [editFor, setEditFor] = useState(null); // {slug, product} with the edit form open
  const [deleting, setDeleting] = useState(null); // slug awaiting delete confirmation

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

  const openEdit = async (slug) => {
    setError(null);
    try {
      const { product } = await adminApi.getProduct(slug);
      setEditFor({ slug, product });
      setImagesFor(null);
      setOccFor(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const doDelete = async (slug) => {
    setError(null);
    try {
      await adminApi.deleteProduct(slug);
      setDeleting(null);
      setNote(`${slug} deleted — past orders and invoices keep their own copies.`);
      refresh();
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
          <tr><th>Product</th><th>Category</th><th>Purity</th><th>Net wt</th><th>Making</th><th>Price today</th><th>Stock</th><th>Images</th><th>Occasions</th><th>Published</th><th>Featured</th><th>Actions</th></tr>
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
                  <button
                    className="btn btn-outline"
                    style={{ padding: "0.3rem 0.8rem" }}
                    onClick={() => setOccFor(occFor === p.slug ? null : p.slug)}
                    aria-expanded={occFor === p.slug}
                    title={(p.occasion || []).join(", ") || "No tags yet"}
                  >
                    {occFor === p.slug ? "Close" : `${p.occasion?.length ?? 0} ✦`}
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
                <td style={{ whiteSpace: "nowrap" }}>
                  <button
                    className="btn btn-outline"
                    style={{ padding: "0.3rem 0.8rem", marginRight: "0.4rem" }}
                    onClick={() => (editFor?.slug === p.slug ? setEditFor(null) : openEdit(p.slug))}
                    aria-expanded={editFor?.slug === p.slug}
                  >
                    {editFor?.slug === p.slug ? "Close" : "✎ Edit"}
                  </button>
                  {deleting === p.slug ? (
                    <>
                      <button
                        className="btn btn-maroon"
                        style={{ padding: "0.3rem 0.8rem", marginRight: "0.3rem" }}
                        onClick={() => doDelete(p.slug)}
                      >
                        Confirm delete
                      </button>
                      <button
                        className="btn btn-outline"
                        style={{ padding: "0.3rem 0.8rem" }}
                        onClick={() => setDeleting(null)}
                      >
                        Keep
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn btn-outline"
                      style={{ padding: "0.3rem 0.8rem", color: "var(--maroon-bright, #a02040)" }}
                      onClick={() => setDeleting(p.slug)}
                      title="Remove this piece from the catalogue permanently"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
              {editFor?.slug === p.slug && (
                <tr>
                  <td colSpan={12} style={{ background: "var(--paper)" }}>
                    <ProductForm
                      initial={editFor.product}
                      onCancel={() => setEditFor(null)}
                      onSaved={() => {
                        setEditFor(null);
                        setNote(`${p.slug} updated — repriced live on the storefront.`);
                        refresh();
                      }}
                      onError={setError}
                    />
                  </td>
                </tr>
              )}
              {imagesFor === p.slug && (
                <tr>
                  <td colSpan={12} style={{ background: "var(--paper)" }}>
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
              {occFor === p.slug && (
                <tr>
                  <td colSpan={12} style={{ background: "var(--paper)" }}>
                    <OccasionsEditor
                      product={p}
                      onSaved={(tags) => {
                        setNote(`${p.slug}: tagged ${tags.join(", ")} — the header menu follows on its next load.`);
                        setOccFor(null);
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
        (e.g. <code>10;12;14</code>) and occasion tags the same way
        (e.g. <code>wedding;gifting</code>); stock and description are optional.
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
  const [q, setQ] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    adminApi.schemes().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="form-error">{error}</p>;
  if (!data) return <div className="skeleton" style={{ height: 300 }} />;

  const plans = [...new Set(data.schemes.map((s) => s.variantName))];
  const statuses = [...new Set(data.schemes.map((s) => s.status))];
  const needle = q.trim().toLowerCase();
  const rows = data.schemes.filter((s) => {
    if (plan && s.variantName !== plan) return false;
    if (status && s.status !== status) return false;
    if (!needle) return true;
    return [s.customer.name, s.customer.phone, s.customer.email, s.customer.pan, s.id].some(
      (v) => String(v || "").toLowerCase().includes(needle)
    );
  });
  const hasFilters = needle || plan || status;

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
      {data.schemes.length > 0 && (
        <div className="od-filterbar" style={{ maxWidth: 760 }}>
          <input
            placeholder="Search name / mobile / scheme ID / PAN…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search schemes"
          />
          <select value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Filter by plan">
            <option value="">All plans</option>
            {plans.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      )}
      {rows.length === 0 ? (
        <p className="muted">
          {data.schemes.length === 0 ? (
            "No enrolments yet."
          ) : (
            <>
              No schemes match —{" "}
              <button className="link-underline" onClick={() => { setQ(""); setPlan(""); setStatus(""); }}>
                clear the filters
              </button>
              .
            </>
          )}
        </p>
      ) : (
        <>
          <table className="admin-table">
            <thead>
              <tr><th>Scheme</th><th>Customer</th><th>Monthly</th><th>Paid</th><th>Grams</th><th>Value today</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((s) => (
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
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.6rem" }}>
            Showing {rows.length} of {data.schemes.length} scheme{data.schemes.length === 1 ? "" : "s"}
            {hasFilters && (
              <>
                {" · "}
                <button className="link-underline" onClick={() => { setQ(""); setPlan(""); setStatus(""); }}>
                  clear filters
                </button>
              </>
            )}
          </p>
        </>
      )}
    </>
  );
}

/* ---------------------------------------------------------- rate console */
/* Chart palette: validated for CVD + contrast on the cream and midnight
   surfaces (dataviz six-checks). Colors are pinned to the purity — they
   never re-cycle when a series is filtered out. */
const RATE_COLORS = { "24K": "#9a721a", "22K": "#b02a45", "18K": "#5b74c0", "14K": "#27754c", "925": "#5b74c0", PT950: "#27754c" };
const RANGE_DAYS = { "7d": 7, "30d": 30, All: null };

function rateSeries(history, rates, metal) {
  return Object.keys(rates[metal] || {}).map((purity) => {
    const rows = history.filter((h) => h.metal === metal && h.purity === purity);
    const points = rows.map((h) => ({ t: Date.parse(h.at), v: h.to }));
    if (rows.length) points.unshift({ t: Date.parse(rows[0].at) - 60000, v: rows[0].from });
    points.push({ t: Date.now(), v: rates[metal][purity] });
    return { key: purity, color: RATE_COLORS[purity] || "#b02a45", points };
  });
}

function Sparkline({ points, color }) {
  if (!points || points.length < 2) return null;
  const w = 96, h = 26;
  const ts = points.map((p) => p.t), vs = points.map((p) => p.v);
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const v0 = Math.min(...vs), v1 = Math.max(...vs);
  const x = (t) => (t1 === t0 ? w / 2 : ((t - t0) / (t1 - t0)) * (w - 4) + 2);
  const y = (v) => (v1 === v0 ? h / 2 : h - 3 - ((v - v0) / (v1 - v0)) * (h - 6));
  const d = points.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  return (
    <svg className="rc-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(last.t)} cy={y(last.v)} r="2.6" fill={color} />
    </svg>
  );
}

/* Price-history line chart: crosshair + tooltip on hover, legend chips that
   toggle purities, direct labels at the line ends, and a data-table view. */
function RateChart({ series, formatTick }) {
  const [hover, setHover] = useState(null); // {t, px}
  const W = 720, H = 250, L = 70, R = 64, T = 14, B = 28;
  const visible = series.filter((s) => s.points.length >= 2);
  if (visible.length === 0)
    return <p className="muted" style={{ padding: "1.4rem 0" }}>Not enough published changes in this window yet — publish a rate and the graph begins.</p>;

  const ts = visible.flatMap((s) => s.points.map((p) => p.t));
  const vs = visible.flatMap((s) => s.points.map((p) => p.v));
  const t0 = Math.min(...ts), t1 = Math.max(...ts);
  const rawMin = Math.min(...vs), rawMax = Math.max(...vs);
  const padV = Math.max((rawMax - rawMin) * 0.08, rawMax * 0.004, 1);
  const v0 = rawMin - padV, v1 = rawMax + padV;
  const x = (t) => L + ((t - t0) / (t1 - t0 || 1)) * (W - L - R);
  const y = (v) => T + (1 - (v - v0) / (v1 - v0 || 1)) * (H - T - B);
  const ticksY = [0, 1, 2, 3].map((i) => v0 + ((v1 - v0) / 3) * i);
  const ticksX = [t0, (t0 + t1) / 2, t1];
  const fmtDay = (t) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * W;
    if (px < L || px > W - R) return setHover(null);
    setHover({ t: t0 + ((px - L) / (W - L - R)) * (t1 - t0), px });
  };
  const valueAt = (s, t) => {
    let best = s.points[0];
    for (const p of s.points) if (Math.abs(p.t - t) < Math.abs(best.t - t)) best = p;
    return best;
  };

  return (
    <div className="rc-chartwrap">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="rc-chart"
        role="img"
        aria-label="Rate history"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        {ticksY.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="rc-gridline" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" className="rc-ticktext">{formatTick(v)}</text>
          </g>
        ))}
        {ticksX.map((t) => (
          <text key={t} x={x(t)} y={H - 8} textAnchor="middle" className="rc-ticktext">{fmtDay(t)}</text>
        ))}
        {visible.map((s) => (
          <g key={s.key}>
            <polyline
              points={s.points.map((p) => `${x(p.t).toFixed(1)},${y(p.v).toFixed(1)}`).join(" ")}
              fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            />
            <circle cx={x(s.points.at(-1).t)} cy={y(s.points.at(-1).v)} r="3.4" fill={s.color} />
            <text x={W - R + 10} y={y(s.points.at(-1).v) + 4} className="rc-endlabel">{s.key}</text>
          </g>
        ))}
        {hover && <line x1={x(hover.t)} x2={x(hover.t)} y1={T} y2={H - B} className="rc-crosshair" />}
      </svg>
      {hover && (
        <div className="rc-tooltip" style={{ left: `${Math.min(86, Math.max(6, (hover.px / W) * 100))}%` }}>
          <strong>{fmtDay(hover.t)}</strong>
          {visible.map((s) => {
            const p = valueAt(s, hover.t);
            return (
              <span key={s.key}>
                <i style={{ background: s.color }} /> {s.key} {formatINR(p.v)}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Rates() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(null);
  const [form, setForm] = useState({ metal: "gold", purity: "22K", value: "", maker: "", note: "" });
  const [checker, setChecker] = useState("");
  const [metal, setMetal] = useState("gold");
  const [range, setRange] = useState("30d");
  const [showTable, setShowTable] = useState(false);
  const [hidden, setHidden] = useState([]); // purities toggled off the chart
  const [aMetal, setAMetal] = useState("");
  const [aWho, setAWho] = useState("");
  const [histOpen, setHistOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);

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
  const history = data.history || [];
  const fmtDay = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const lastChange = (m, p) => {
    for (let i = history.length - 1; i >= 0; i--)
      if (history[i].metal === m && history[i].purity === p) return history[i];
    return null;
  };

  // headline cards — pinned selection, sparkline over the recent history
  const CARD_PAIRS = [["gold", "24K"], ["gold", "22K"], ["gold", "18K"], ["silver", "925"], ["platinum", "PT950"]];
  const sparkFor = (m, p) => {
    const pts = history.filter((h) => h.metal === m && h.purity === p).slice(-12).map((h) => ({ t: Date.parse(h.at), v: h.to }));
    pts.push({ t: Date.now(), v: data.rates[m][p] });
    return pts;
  };

  // chart series for the picked metal + window; colors stay pinned per purity
  const cutoff = RANGE_DAYS[range] ? Date.now() - RANGE_DAYS[range] * 864e5 : 0;
  const allSeries = rateSeries(history, data.rates, metal).map((s) => ({
    ...s,
    points: s.points.filter((pt) => pt.t >= cutoff),
  }));
  const series = allSeries.filter((s) => !hidden.includes(s.key));
  const chartHistory = history.filter((h) => h.metal === metal && Date.parse(h.at) >= cutoff);
  const compactTick = (v) => (v >= 1000 ? `₹${(v / 1000).toFixed(1)}k` : `₹${Math.round(v)}`);

  const shownAudit = data.audit.filter((a) => {
    if (aMetal && a.metal !== aMetal) return false;
    if (aWho) {
      const needle = aWho.trim().toLowerCase();
      if (!`${a.maker} ${a.checker}`.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  const chip = (on) => ({
    padding: "0.3rem 0.85rem", borderRadius: 999, cursor: "pointer", fontSize: "0.76rem",
    letterSpacing: "0.04em", border: `1px solid ${on ? "var(--maroon)" : "var(--line)"}`,
    background: on ? "var(--maroon)" : "transparent", color: on ? "var(--cream)" : "inherit",
  });

  return (
    <div>
      {error && <p className="form-error">{error}</p>}
      {note && <p className="admin-note">{note}</p>}

      <div className="rc-cards">
        {CARD_PAIRS.map(([m, p]) => {
          const v = data.rates[m]?.[p];
          if (v === undefined) return null;
          const chg = lastChange(m, p);
          const pct = chg ? ((chg.to - chg.from) / chg.from) * 100 : null;
          return (
            <div className="rc-stat" key={m + p}>
              <label>{m} {p}</label>
              <span className="rc-value">{formatINR(v)}</span>
              <span className="rc-under">
                {pct === null ? (
                  <small className="muted">no change yet</small>
                ) : (
                  <small className={`rc-delta ${pct >= 0 ? "up" : "down"}`}>
                    {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}% · {fmtDay(chg.at)}
                  </small>
                )}
                <Sparkline points={sparkFor(m, p)} color={RATE_COLORS[p]} />
              </span>
            </div>
          );
        })}
      </div>
      <p className="muted" style={{ fontSize: "0.78rem", margin: "0.5rem 0 1.2rem" }}>
        {data.updatedAt ? `Last published ${fmtDate(data.updatedAt)}` : "No rate change published yet"} · the
        guard blocks moves beyond ±{data.guardPct}% · every publish reprices the whole catalogue instantly.
      </p>

      <div className="rc-grid">
        <section className="rc-card">
          <div className="rc-cardhead">
            <h3>Price history (₹/g)</h3>
            {!histOpen && (
              <small className="muted">
                {history.length} change{history.length === 1 ? "" : "s"} on record
                {data.updatedAt ? ` · last ${fmtDay(data.updatedAt)}` : ""}
              </small>
            )}
            {histOpen && (
              <div className="rc-chips">
                {Object.keys(data.rates).map((m) => (
                  <button key={m} style={{ ...chip(metal === m), textTransform: "capitalize" }} onClick={() => { setMetal(m); setHidden([]); }}>
                    {m}
                  </button>
                ))}
                <span className="rc-sep" aria-hidden>·</span>
                {Object.keys(RANGE_DAYS).map((r) => (
                  <button key={r} style={chip(range === r)} onClick={() => setRange(r)}>{r}</button>
                ))}
                <span className="rc-sep" aria-hidden>·</span>
                <button style={chip(showTable)} onClick={() => setShowTable((v) => !v)} aria-pressed={showTable}>
                  ⊞ Data
                </button>
                <a
                  style={{ ...chip(false), textDecoration: "none" }}
                  href={`${adminApi.exportUrl("rates")}&metal=${metal}${RANGE_DAYS[range] ? `&days=${RANGE_DAYS[range]}` : ""}`}
                  title="Download this window as a CSV report"
                >
                  ⤓ Report
                </a>
              </div>
            )}
            <button className="rc-expand" onClick={() => setHistOpen((v) => !v)} aria-expanded={histOpen}>
              {histOpen ? "▾ Collapse" : "▸ Expand"}
            </button>
          </div>
          {histOpen && allSeries.length > 1 && !showTable && (
            <div className="rc-legend">
              {allSeries.map((s) => {
                const off = hidden.includes(s.key);
                return (
                  <button
                    key={s.key}
                    className={`rc-legend-chip ${off ? "off" : ""}`}
                    onClick={() => setHidden((prev) => (off ? prev.filter((k) => k !== s.key) : [...prev, s.key]))}
                    aria-pressed={!off}
                  >
                    <i style={{ background: s.color }} /> {s.key}
                  </button>
                );
              })}
            </div>
          )}
          {histOpen && (showTable ? (
            chartHistory.length === 0 ? (
              <p className="muted" style={{ padding: "1rem 0" }}>No published changes in this window.</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr><th>When</th><th>Purity</th><th>From → To</th><th>Move</th></tr>
                </thead>
                <tbody>
                  {[...chartHistory].reverse().map((h, i) => (
                    <tr key={i}>
                      <td>{fmtDate(h.at)}</td>
                      <td>{h.purity}</td>
                      <td>{formatINR(h.from)} → {formatINR(h.to)}</td>
                      <td>{h.to >= h.from ? "▲" : "▼"} {(Math.abs((h.to - h.from) / h.from) * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <RateChart series={series} formatTick={compactTick} />
          ))}
        </section>

        <section className="rc-card">
          <div className="rc-cardhead">
            <h3>Publish workflow</h3>
            <span className="status-pill" style={instant ? { background: "rgba(176,141,87,.2)", color: "#6d5226" } : { background: "rgba(63,108,76,.16)" }}>
              {instant ? "Instant publish" : "Maker-checker"}
            </span>
          </div>
          <p className="muted" style={{ fontSize: "0.78rem", marginTop: 0 }}>
            {instant
              ? "Single-operator mode — changes go live immediately, guard-checked and audited. Re-enable dual control in Settings → “Rate maker-checker”."
              : "Dual control — a maker proposes, a different person approves before anything goes live."}
          </p>

          {(!instant || pending.length > 0) && (
            <div className="field" style={{ marginBottom: "0.9rem" }}>
              <label>Checker name</label>
              <input placeholder="Must differ from maker" value={checker} onChange={(e) => setChecker(e.target.value)} />
            </div>
          )}
          {pending.length === 0 ? (
            <p className="muted" style={{ fontSize: "0.82rem" }}>Nothing waiting for approval.</p>
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

          <h4 className="rc-formhead">{instant ? "Quick rate update" : "Propose a change (maker)"}</h4>
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
        </section>
      </div>

      <section className="rc-card" style={{ marginTop: "1rem" }}>
        <div className="rc-cardhead">
          <h3>Audit trail</h3>
          {!auditOpen && (
            <small className="muted">
              last {data.audit.length} published change{data.audit.length === 1 ? "" : "s"} · maker &amp; checker on every row
            </small>
          )}
          {auditOpen && (
            <div className="rc-chips">
              <select
                value={aMetal}
                onChange={(e) => setAMetal(e.target.value)}
                aria-label="Filter audit by metal"
                style={{ padding: "0.35rem 0.6rem", borderRadius: 9, border: "1px solid var(--line)", background: "var(--cream)", fontSize: "0.8rem" }}
              >
                <option value="">All metals</option>
                {Object.keys(data.rates).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
              <input
                placeholder="Search maker / checker…"
                value={aWho}
                onChange={(e) => setAWho(e.target.value)}
                aria-label="Search audit people"
                style={{ padding: "0.35rem 0.6rem", borderRadius: 9, border: "1px solid var(--line)", background: "var(--cream)", fontSize: "0.8rem" }}
              />
            </div>
          )}
          <button className="rc-expand" onClick={() => setAuditOpen((v) => !v)} aria-expanded={auditOpen}>
            {auditOpen ? "▾ Collapse" : "▸ Expand"}
          </button>
        </div>
        {auditOpen && (shownAudit.length === 0 ? (
          <p className="muted">No published changes{data.audit.length ? " match those filters" : " yet"}.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>When</th><th>Rate</th><th>From → To</th><th>Move</th><th>Maker / Checker</th></tr>
            </thead>
            <tbody>
              {shownAudit.map((a, i) => {
                const pct = ((a.to - a.from) / a.from) * 100;
                return (
                  <tr key={i}>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(a.at)}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      <i className="rc-dot" style={{ background: RATE_COLORS[a.purity] || "var(--ink-faint)" }} /> {a.metal} {a.purity}
                    </td>
                    <td>{formatINR(a.from)} → {formatINR(a.to)}</td>
                    <td>
                      <small className={`rc-delta ${pct >= 0 ? "up" : "down"}`}>
                        {pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
                      </small>
                    </td>
                    <td>{a.maker} / {a.checker}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}
        {auditOpen && (
          <p className="muted" style={{ fontSize: "0.76rem", marginBottom: 0 }}>
            Showing {shownAudit.length} of the last {data.audit.length} published changes — the full history stays on record.
          </p>
        )}
      </section>
    </div>
  );
}
