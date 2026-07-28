import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import { useSeo } from "../lib/seo";
import { formatINR } from "../lib/format";

const fmtDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

export default function Invoice() {
  const { orderId } = useParams();
  const [params] = useSearchParams();
  const phone = params.get("phone") || "";
  useSeo({ title: `Tax Invoice · ${orderId}` });

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.invoice(orderId, phone).then(setData).catch((e) => setError(e.message));
  }, [orderId, phone]);

  if (error)
    return (
      <div className="container" style={{ maxWidth: 640, padding: "5rem 0 8rem" }}>
        <span className="eyebrow">Tax Invoice</span>
        <h1 className="section-title" style={{ textAlign: "left" }}>
          Not <em>available.</em>
        </h1>
        <p className="muted">{error}</p>
        <Link to="/track" className="btn btn-outline" style={{ marginTop: "1.4rem" }}>
          Back to order tracking
        </Link>
      </div>
    );

  if (!data)
    return (
      <div className="container" style={{ padding: "4rem 0" }}>
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );

  const { invoice, seller, buyer, order, lines, totals } = data;

  return (
    <div className="container invoice-wrap">
      <div className="invoice-actions no-print">
        <Link to="/track" className="link-underline">← Back to tracking</Link>
        <button className="btn btn-maroon" onClick={() => window.print()}>
          Print / save as PDF
        </button>
      </div>

      <div className="invoice-sheet">
        <div className="invoice-head">
          <div>
            <p className="invoice-brand">{seller.name}</p>
            <p className="muted small">{seller.address}</p>
            <p className="muted small">
              GSTIN {seller.gstin} · PAN {seller.pan}
            </p>
            <p className="muted small">{seller.phone} · {seller.email}</p>
          </div>
          <div className="invoice-title">
            <h1>Tax Invoice</h1>
            <p><strong>{invoice.number}</strong></p>
            <p className="muted small">Issued {fmtDateTime(invoice.issuedAt)}</p>
          </div>
        </div>

        <div className="invoice-parties">
          <div>
            <h4>Billed to</h4>
            <p><strong>{buyer.name}</strong></p>
            <p className="muted small">{buyer.address}</p>
            <p className="muted small">Mobile {buyer.phone}</p>
            {buyer.gstin && <p className="muted small">GSTIN {buyer.gstin}</p>}
          </div>
          <div>
            <h4>Order</h4>
            <p><strong>{order.orderId}</strong></p>
            <p className="muted small">Placed {fmtDateTime(order.placedAt)}</p>
            <p className="muted small">
              {order.payment.mode.toUpperCase()} · {order.payment.status}
              {order.fulfilment?.method === "pickup" ? " · store pickup" : " · insured delivery"}
            </p>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="invoice-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>HSN</th>
                <th>Qty</th>
                <th>Taxable value</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td>
                    {l.name}
                    {l.size ? ` — size ${l.size}` : ""}
                    {l.engraving ? ` — engraved “${l.engraving}”` : ""}
                    {l.huid && <span className="muted small block">HUID {l.huid}</span>}
                    {l.estimated && <span className="muted small block">GST break-up estimated (legacy order)</span>}
                  </td>
                  <td>{l.hsn}</td>
                  <td>{l.qty}</td>
                  <td>{formatINR(l.taxable)}</td>
                  <td>{formatINR(l.cgst)}</td>
                  <td>{formatINR(l.sgst)}</td>
                  <td>{formatINR(l.gross)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>Totals</td>
                <td>{formatINR(totals.taxable)}</td>
                <td>{formatINR(totals.cgst)}</td>
                <td>{formatINR(totals.sgst)}</td>
                <td>{formatINR(totals.gross)}</td>
              </tr>
              {totals.discount > 0 && (
                <tr>
                  <td colSpan={6}>Discount{totals.coupon ? ` (${totals.coupon})` : ""}</td>
                  <td>− {formatINR(totals.discount)}</td>
                </tr>
              )}
              <tr className="invoice-grand">
                <td colSpan={6}>Amount payable</td>
                <td>{formatINR(totals.payable)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="invoice-words">{data.amountInWords}</p>

        <div className="invoice-foot">
          <p className="muted small">
            GST charged at 3% on jewellery value and 5% on making charges, split
            equally as CGST and SGST (intra-state supply, Madhya Pradesh).
            {" "}{seller.note}
          </p>
          <p className="muted small">
            This is a computer-generated invoice and needs no signature.
          </p>
        </div>
      </div>
    </div>
  );
}
