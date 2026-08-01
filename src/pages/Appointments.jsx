import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Reveal from "../components/Reveal";
import { api } from "../lib/api";

export default function Appointments() {
  const [params] = useSearchParams();
  const productSlug = params.get("product") || "";

  const [data, setData] = useState(null);
  const [productName, setProductName] = useState(null);

  useEffect(() => {
    api.stores().then(setData).catch(() => setData({ stores: [], slots: [] }));
    if (productSlug) {
      api.product(productSlug).then((d) => setProductName(d.product.name)).catch(() => {});
    }
  }, [productSlug]);

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Showrooms</span>
          <h1>
            Try it on, <em>in person.</em>
          </h1>
          <p>
            Book a private appointment — {productName ? `we'll keep the ${productName} ready at the counter.` : "your shortlist will be waiting at the counter."}
          </p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem" }}>
        <div className="scheme-variants">
          {(data?.stores || []).map((s, i) => (
            <Reveal key={s.key} delay={i * 0.08}>
              <div className="scheme-card">
                <h3>{s.name}</h3>
                <p className="muted" style={{ fontSize: "0.92rem" }}>{s.address}</p>
                <ul>
                  {s.hours && <li>{s.hours}</li>}
                  {s.phone && <li>{s.phone}</li>}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="scheme-columns">
          <BookingForm data={data} productSlug={productSlug} productName={productName} />
          <MyAppointments />
        </div>
      </div>
    </>
  );
}

function BookingForm({ data, productSlug, productName }) {
  const [form, setForm] = useState({
    store: "",
    date: "",
    slot: "",
    name: "",
    phone: "",
    notes: "",
  });
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  useEffect(() => {
    if (data?.stores?.length && !form.store) {
      setForm((f) => ({ ...f, store: data.stores[0].key, slot: data.slots[0] }));
    }
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await api.bookAppointment({ ...form, productSlug: productSlug || undefined });
      setDone(res);
    } catch (err) {
      setError(err.message);
    }
  };

  if (done) {
    return (
      <div className="summary-card" style={{ position: "static" }}>
        <h3>Appointment requested ✓</h3>
        <p className="muted" style={{ marginBottom: "0.6rem" }}>{done.id}</p>
        <p className="muted" style={{ fontSize: "0.92rem" }}>
          {done.storeName} · {new Date(`${done.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })} · {done.slot}
          {done.productName ? ` · viewing: ${done.productName}` : ""}
        </p>
        <p className="muted" style={{ fontSize: "0.86rem", marginTop: "0.6rem" }}>
          The showroom will confirm on WhatsApp shortly. Check status any time
          under “My appointments”.
        </p>
        <button className="btn btn-maroon" style={{ marginTop: "1.2rem" }} onClick={() => setDone(null)}>
          Book another
        </button>
      </div>
    );
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>Book an appointment</h3>
      {productName && (
        <p className="admin-note">This booking is for viewing the {productName}.</p>
      )}
      <form className="checkout-form" onSubmit={submit}>
        <div className="field">
          <label>Showroom</label>
          <select value={form.store} onChange={set("store")}>
            {(data?.stores || []).map((s) => (
              <option key={s.key} value={s.key}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="form-row">
          <div className="field">
            <label>Date</label>
            <input type="date" required min={today} value={form.date} onChange={set("date")} />
          </div>
          <div className="field">
            <label>Time</label>
            <select value={form.slot} onChange={set("slot")}>
              {(data?.slots || []).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
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
        <div className="field">
          <label>Notes (optional — budget, occasion, pieces to keep ready)</label>
          <textarea rows={2} value={form.notes} onChange={set("notes")} />
        </div>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-maroon">Request appointment</button>
      </form>
    </div>
  );
}

function MyAppointments() {
  const [phone, setPhone] = useState("");
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);

  const lookup = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      setItems(await api.myAppointments(phone));
    } catch (err) {
      setError(err.message);
      setItems(null);
    }
  };

  return (
    <div>
      <h3 className="admin-subhead" style={{ marginTop: 0 }}>My appointments</h3>
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
      {items && items.length === 0 && <p className="muted">No appointments for that number.</p>}
      {(items || []).map((a) => (
        <div key={a.id} className="scheme-status-card">
          <div className="scheme-status-head">
            <strong>{a.storeName}</strong>
            <span className="status-pill">{a.status}</span>
          </div>
          <p className="muted" style={{ fontSize: "0.86rem" }}>
            {new Date(`${a.date}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · {a.slot}
            {a.productName ? ` · viewing: ${a.productName}` : ""}
            {" · "}{a.id}
          </p>
        </div>
      ))}
    </div>
  );
}
