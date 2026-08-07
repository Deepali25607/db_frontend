import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

// Fallbacks while /api/content loads — mirror DEFAULT_CONTENT on the server.
const DEFAULT_BLURB =
  "Three generations of goldsmiths. Every piece BIS-hallmarked with HUID, certified, and priced transparently on the day's metal rate.";
const DEFAULT_COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "Rings", path: "/shop?category=rings" },
      { label: "Necklaces", path: "/shop?category=necklaces" },
      { label: "Earrings", path: "/shop?category=earrings" },
      { label: "Bangles & Bracelets", path: "/shop?category=bangles,bracelets" },
      { label: "Mangalsutra", path: "/shop?category=mangalsutra" },
    ],
  },
  {
    title: "Client Services",
    links: [
      { label: "Track an order", path: "/track" },
      { label: "Gold savings scheme", path: "/gold-scheme" },
      { label: "Returns & exchange", path: "/track" },
      { label: "Old-gold exchange & buyback", path: "/old-gold" },
      { label: "Custom & made-to-order", path: "/custom" },
      { label: "Buying guides", path: "/guides" },
      { label: "My account", path: "/account" },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "Our story", path: "/#maison" },
      { label: "Showrooms", path: "/stores" },
      { label: "Book an appointment", path: "/appointments" },
    ],
  },
];

function FooterLink({ link }) {
  return /^https?:\/\//i.test(link.path) ? (
    <a href={link.path} target="_blank" rel="noreferrer">{link.label}</a>
  ) : (
    <Link to={link.path}>{link.label}</Link>
  );
}

export default function Footer() {
  const { content } = useStore();
  const brandName = content?.companyName || "DP Jewellers";
  const phone = (content?.supportPhone || "").trim();
  const whatsapp = (content?.supportWhatsapp || "").trim().replace(/\D/g, "");
  const email = (content?.supportEmail || "").trim();
  const blurb = content?.footerBlurb || DEFAULT_BLURB;
  const columns =
    Array.isArray(content?.footerColumns) && content.footerColumns.length > 0
      ? content.footerColumns
      : DEFAULT_COLUMNS;
  const footerBg = (content?.footerBgImage || "").trim();

  return (
    <footer
      className="site-footer"
      style={
        footerBg
          ? { background: `linear-gradient(var(--header-wash), var(--header-wash)), url("${footerBg}") center/cover` }
          : undefined
      }
    >
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              {brandName}
              <small>{content?.companyTagline || "Fine Jewellery"}</small>
            </div>
            <p>{blurb}</p>
          </div>

          {columns.map((col, i) => (
            <div className="footer-col" key={`${col.title}-${i}`}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l, j) => (
                  <li key={`${l.label}-${j}`}><FooterLink link={l} /></li>
                ))}
                {/* support channels (Settings → Customer support) ride the last column */}
                {i === columns.length - 1 && (
                  <>
                    {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
                    {phone && <li><a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></li>}
                    {whatsapp && (
                      <li>
                        <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                          WhatsApp us
                        </a>
                      </li>
                    )}
                  </>
                )}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-legal">
          <span>© {new Date().getFullYear()} {brandName}. All prices inclusive of GST.</span>
          <span>
            <Link to="/policies#terms">Terms</Link> ·{" "}
            <Link to="/policies#privacy">Privacy</Link> ·{" "}
            <Link to="/policies#returns">Return & Refund Policy</Link> ·{" "}
            <Link to="/policies#shipping">Shipping Policy</Link> ·{" "}
            <Link to="/policies#grievance">Grievance Officer</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}
