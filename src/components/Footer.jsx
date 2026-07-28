import { Link } from "react-router-dom";
import { useStore } from "../context/StoreContext";

export default function Footer() {
  const { content } = useStore();
  const brandName = content?.companyName || "DP Jewellers";
  const phone = (content?.supportPhone || "").trim();
  const whatsapp = (content?.supportWhatsapp || "").trim().replace(/\D/g, "");
  const email = (content?.supportEmail || "").trim();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="logo">
              {brandName}
              <small>{content?.companyTagline || "Fine Jewellery"}</small>
            </div>
            <p>
              Three generations of goldsmiths. Every piece BIS-hallmarked with
              HUID, certified, and priced transparently on the day's metal rate.
            </p>
          </div>

          <div className="footer-col">
            <h4>Shop</h4>
            <ul>
              <li><Link to="/shop?category=rings">Rings</Link></li>
              <li><Link to="/shop?category=necklaces">Necklaces</Link></li>
              <li><Link to="/shop?category=earrings">Earrings</Link></li>
              <li><Link to="/shop?category=bangles,bracelets">Bangles & Bracelets</Link></li>
              <li><Link to="/shop?category=mangalsutra">Mangalsutra</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Client Services</h4>
            <ul>
              <li><Link to="/track">Track an order</Link></li>
              <li><Link to="/gold-scheme">Gold savings scheme</Link></li>
              <li><Link to="/track">Returns & exchange</Link></li>
              <li><Link to="/old-gold">Old-gold exchange & buyback</Link></li>
              <li><Link to="/custom">Custom & made-to-order</Link></li>
              <li><Link to="/guides">Buying guides</Link></li>
              <li><Link to="/guides">Care & repair</Link></li>
              <li><Link to="/account">My account</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>The House</h4>
            <ul>
              <li><Link to="/#maison">Our story</Link></li>
              <li><Link to="/stores">Showrooms</Link></li>
              <li><Link to="/appointments">Book an appointment</Link></li>
              {email && <li><a href={`mailto:${email}`}>{email}</a></li>}
              {phone && <li><a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a></li>}
              {whatsapp && (
                <li>
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer">
                    WhatsApp us
                  </a>
                </li>
              )}
            </ul>
          </div>
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
