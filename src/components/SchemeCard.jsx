import { useState } from "react";
import { formatINR } from "../lib/format";

/* One enrolled gold scheme, dashboard-style: live status (pending / active /
   overdue / matured / redeemed), invested vs accumulated grams, instalment
   progress, the next due date, and the full payment history. Used on the
   Gold Scheme page and in My Profile — both feed it fresh schemeView data
   after every successful payment. */

const fmtDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

const STATUS_LABEL = {
  pending: "Awaiting first payment",
  active: "Active",
  overdue: "Overdue",
  matured: "Completed — ready to redeem",
  redeemed: "Redeemed",
};

export default function SchemeCard({ scheme: s, onPay, onRedeem }) {
  const [histOpen, setHistOpen] = useState(false);
  const display = s.displayStatus || s.status;

  return (
    <div className={`scheme-status-card scheme-${display}`}>
      <div className="scheme-status-head">
        <strong>{s.variantName}</strong>
        <span className={`status-pill scheme-pill-${display}`}>{STATUS_LABEL[display] || display}</span>
      </div>
      <p className="muted" style={{ fontSize: "0.8rem" }}>
        {s.id} · {formatINR(s.monthlyAmount)}/month
        {s.startedAt ? ` · started ${fmtDate(s.startedAt)}` : " · enrolled, not yet active"}
        {s.maturityAt ? ` · matures ${fmtDate(s.maturityAt)}` : ""}
      </p>

      {display === "pending" && (
        <p className="scheme-pending-note">
          Your scheme is reserved. Pay the first instalment to activate it —
          your monthly cycle starts from that payment date.
        </p>
      )}
      {display === "overdue" && (
        <p className="scheme-overdue-note">
          Instalment {s.paidCount + 1} was due {fmtDate(s.nextDueAt)} — pay now
          to keep accruing grams.
        </p>
      )}

      <div className="progress">
        <div className="progress-bar" style={{ width: `${(s.paidCount / s.tenureMonths) * 100}%` }} />
      </div>

      <div className="scheme-stats">
        <div><span>{formatINR(s.totalPaid)}</span><label>Invested</label></div>
        <div><span>{s.gramsAccrued} g</span><label>Gold accumulated</label></div>
        <div><span>{formatINR(s.currentValue)}</span><label>Value today</label></div>
        <div><span>{s.paidCount}/{s.tenureMonths}</span><label>Instalments paid</label></div>
        <div><span>{s.remainingCount}</span><label>Remaining</label></div>
        <div><span>{fmtDate(s.nextDueAt)}</span><label>Next due</label></div>
      </div>

      {s.instalments?.length > 0 && (
        <div className="scheme-history">
          <button type="button" className="scheme-history-toggle" onClick={() => setHistOpen((v) => !v)}>
            {histOpen ? "▾ Hide payment history" : `▸ Payment history (${s.instalments.length})`}
          </button>
          {histOpen && (
            <table className="scheme-history-table">
              <thead>
                <tr><th>#</th><th>Paid on</th><th>Amount</th><th>22K rate</th><th>Gold added</th><th>Method</th></tr>
              </thead>
              <tbody>
                {[...s.instalments].reverse().map((i) => (
                  <tr key={i.no}>
                    <td>{i.no}</td>
                    <td>{fmtDate(i.paidAt)}</td>
                    <td>{formatINR(i.amount)}</td>
                    <td>{formatINR(i.rate22K)}/g</td>
                    <td>{i.grams} g</td>
                    <td>{i.method === "netbanking" ? "Net banking" : i.method === "upi" ? "UPI" : i.method === "card" ? "Card" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {display === "pending" && onPay && (
        <button className="btn btn-maroon" style={{ width: "100%" }} onClick={() => onPay(s)}>
          Pay first instalment · {formatINR(s.monthlyAmount)} — activate scheme
        </button>
      )}
      {(display === "active" || display === "overdue") && onPay && (
        <button className="btn btn-maroon" style={{ width: "100%" }} onClick={() => onPay(s)}>
          Pay instalment {s.paidCount + 1} · {formatINR(s.monthlyAmount)}
        </button>
      )}
      {s.status === "matured" && onRedeem && (
        <button className="btn btn-green" style={{ width: "100%" }} onClick={() => onRedeem(s)}>
          Redeem {s.gramsAccrued} g against a purchase
        </button>
      )}
      {s.status === "redeemed" && s.redemption && (
        <p className="admin-note" style={{ marginBottom: 0 }}>
          Redeemed {s.redemption.grams} g ({formatINR(s.redemption.value)}) · code{" "}
          <strong>{s.redemption.code}</strong> · {s.redemption.bonus}
        </p>
      )}
    </div>
  );
}
