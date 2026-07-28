import { useSeo } from "../lib/seo";

const SECTIONS = [
  {
    id: "terms",
    title: "Terms of Service",
    body: [
      "DP Jewellers Pvt. Ltd. (“DP Jewellers”, “we”) operates this website and its showrooms in Indore, Bhopal and Ujjain. By placing an order you enter into a contract of sale governed by Indian law, with courts at Indore having jurisdiction.",
      "All prices are computed live from the day's metal rates and are inclusive of GST. A quoted price is locked for 30 minutes once checkout begins; if payment is not completed within that window, the bag re-prices at the prevailing rate.",
      "Every gold piece we sell is BIS-hallmarked and carries a HUID. Product weights are stated to two decimals; the tax invoice records the exact net and gross weight of the piece shipped.",
      "Cash on delivery is available for orders up to ₹50,000. PAN details are mandatory for purchases of ₹2,00,000 and above (Income Tax Rule 114B). Orders of ₹1,50,000 and above are confirmed after a short verification call.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy Policy (DPDP)",
    body: [
      "We collect only what commerce requires: your name, mobile number, delivery address, and — where statute demands — PAN. Sign-in uses a one-time password; we never store passwords.",
      "Your data is used to fulfil orders, service gold schemes, honour warranties and meet tax obligations. We do not sell personal data to third parties.",
      "Under the Digital Personal Data Protection Act, you may download everything we hold against your mobile number, or delete your profile, from the My Account page at any time. Order and invoice records are retained for the statutory period required by GST and PMLA rules even after profile deletion.",
      "Grievances relating to personal data are addressed by the Grievance Officer listed below within 30 days.",
    ],
  },
  {
    id: "returns",
    title: "Return & Refund Policy",
    body: [
      "Ready pieces may be returned or exchanged within 15 days of delivery. Made-to-order commissions and engraved pieces are non-returnable.",
      "Returns travel by our insured reverse pickup. Refunds are released after the piece passes quality check at our warehouse — typically 5–7 working days from pickup — to the original payment method.",
      "Old-gold exchange follows its own assay-based valuation, shown transparently before you commit: 2% melting deduction for hallmarked pieces, 6% for unmarked, with cash payouts attracting a further 2% (exchange credit waives it).",
    ],
  },
  {
    id: "shipping",
    title: "Shipping Policy",
    body: [
      "Every shipment is fully insured door-to-door and handed over only against an OTP shown to the delivery agent, with an ID check for high-value pieces.",
      "Metro pincodes typically receive orders in about 3 working days; other serviceable pincodes in about 6. Serviceability and delivery estimates are shown on each product page before you buy.",
      "You may instead collect from any showroom free of charge — choose store pickup at checkout and bring the order confirmation and an ID.",
    ],
  },
  {
    id: "grievance",
    title: "Grievance Officer",
    body: [
      "Per the Consumer Protection (E-Commerce) Rules 2020 and the DPDP Act: Grievance Officer — Meera Deshpande, DP Jewellers Pvt. Ltd., 12 Palasia Square, A.B. Road, Indore 452001. Email grievance@dpjewellers.example · +91 731 400 1122 (11 am – 6 pm, Mon–Sat).",
      "Complaints are acknowledged within 48 hours and resolved within one month of receipt.",
    ],
  },
];

export default function Policies() {
  useSeo({
    title: "Policies",
    description: "Terms of service, privacy, returns, shipping and grievance redressal at DP Jewellers.",
  });

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">The Fine Print</span>
          <h1>
            Clear terms, kept <em>simply.</em>
          </h1>
          <p>Everything we promise — and what we ask of you — in plain language.</p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 760, padding: "3rem 0 6rem" }}>
        <nav aria-label="Policy sections" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "2.4rem" }}>
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="btn btn-outline" style={{ padding: "0.45rem 1rem", fontSize: "0.78rem" }}>
              {s.title}
            </a>
          ))}
        </nav>
        {SECTIONS.map((s) => (
          <section key={s.id} id={s.id} style={{ marginBottom: "2.8rem" }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: "1.45rem", marginBottom: "0.9rem" }}>
              {s.title}
            </h2>
            {s.body.map((p, i) => (
              <p key={i} className="muted" style={{ marginBottom: "0.8rem", lineHeight: 1.7 }}>
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className="muted" style={{ fontSize: "0.8rem" }}>
          Last updated 27 July 2026. Policies mirror the business rules enforced
          by our systems; where this page and the invoice differ, the invoice governs.
        </p>
      </div>
    </>
  );
}
