import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";
import { formatINR } from "../lib/format";

export default function PackingSlip() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const phone = params.get("phone") || "";
  useSeo({ title: `Packing Slip · ${orderId}` });

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.packingSlip(orderId, phone).then(setData).catch((e) => setError(e.message));
  }, [orderId, phone]);

  if (error)
    return (
      <div className="container" style={{ maxWidth: 640, padding: "5rem 0 8rem" }}>
        <span className="eyebrow">Packing Slip</span>
        <h1 className="section-title" style={{ textAlign: "left" }}>Not <em>available.</em></h1>
        <p className="muted">{error}</p>
      </div>
    );

  if (!data)
    return (
      <div className="container" style={{ padding: "4rem 0" }}>
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    );

  return (
    <div className="container invoice-wrap">
      <div className="invoice-actions no-print">
        <Link to="/admin" className="link-underline">← Back</Link>
        <button className="btn btn-maroon" onClick={() => window.print()}>Print</button>
      </div>

      <div className="invoice-sheet">
        <div className="invoice-head">
          <div>
            <p className="invoice-brand">{data.seller.name}</p>
            <p className="muted small">{data.seller.address}</p>
            <p className="muted small">{data.seller.phone}</p>
          </div>
          <div className="invoice-title">
            <h1>Packing Slip</h1>
            <p><strong>{data.orderId}</strong></p>
            {!data.showPrices && (
              <p className="muted small">Gift packing — no values shown</p>
            )}
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <h4>{data.fulfilment.method === "pickup" ? "Pickup at" : "Deliver to"}</h4>
            <p><strong>{data.deliverTo.name}</strong></p>
            <p className="muted small">{data.deliverTo.address}</p>
            {data.deliverTo.pincode && <p className="muted small">PIN {data.deliverTo.pincode}</p>}
          </div>
          <div>
            <h4>Handling</h4>
            <p className="muted small">
              {data.gift ? "Gift wrap — complimentary" : "Standard tamper-evident packing"}
            </p>
            <p className="muted small">Insured transit · OTP-verified handover</p>
            {data.codDue ? <p><strong>Collect on delivery: {formatINR(data.codDue)}</strong></p> : null}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>HUID</th>
                <th>Qty</th>
                {data.showPrices && <th>Amount</th>}
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    {l.name}
                    {l.size ? ` — size ${l.size}` : ""}
                    {l.engraving ? <span className="muted small block">Engraved “{l.engraving}”</span> : null}
                  </td>
                  <td>{l.huid || "—"}</td>
                  <td>{l.qty}</td>
                  {data.showPrices && <td>{formatINR(l.lineTotal)}</td>}
                </tr>
              ))}
            </tbody>
            {data.showPrices && (
              <tfoot>
                <tr className="invoice-grand">
                  <td colSpan={3}>Total</td>
                  <td>{formatINR(data.payable)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {data.gift?.message && (
          <div style={{ margin: "1.6rem 0", padding: "1.2rem 1.4rem", border: "1px solid var(--line)", borderRadius: 12 }}>
            <h4 style={{ fontSize: "0.72rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ink-faint)", marginBottom: "0.5rem" }}>
              Gift message
            </h4>
            <p style={{ fontFamily: "var(--serif)", fontStyle: "italic", fontSize: "1.05rem" }}>
              “{data.gift.message}”
            </p>
          </div>
        )}

        <div className="invoice-foot">
          <p className="muted small">
            Check the piece against its HUID at handover. Every item leaves the
            atelier weighed, photographed and sealed.
          </p>
        </div>
      </div>
    </div>
  );
}
