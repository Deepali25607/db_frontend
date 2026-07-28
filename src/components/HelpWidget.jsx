import { useEffect, useRef, useState } from "react";
import { useStore } from "../context/StoreContext";

// Floating "Help" button — channels come from Admin → Settings → Customer
// support. A blank field hides that channel; all blank hides the button.
export default function HelpWidget() {
  const { content } = useStore();
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  const phone = (content?.supportPhone || "").trim();
  const whatsapp = (content?.supportWhatsapp || "").trim();
  const email = (content?.supportEmail || "").trim();
  const message = (content?.supportMessage || "").trim();

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!phone && !whatsapp && !email) return null;

  const waDigits = whatsapp.replace(/\D/g, "");

  return (
    <div className="help-widget" ref={boxRef}>
      {open && (
        <div className="help-pop" role="dialog" aria-label="Customer support">
          <p className="help-title">We're here to help</p>
          {message && <p className="help-msg">{message}</p>}
          <div className="help-channels">
            {phone && (
              <a className="help-channel" href={`tel:${phone.replace(/[^\d+]/g, "")}`}>
                <span className="help-glyph">✆</span>
                <span>
                  <strong>Call us</strong>
                  <small>{phone}</small>
                </span>
              </a>
            )}
            {waDigits && (
              <a
                className="help-channel"
                href={`https://wa.me/${waDigits}`}
                target="_blank"
                rel="noreferrer"
              >
                <span className="help-glyph">✉</span>
                <span>
                  <strong>WhatsApp us</strong>
                  <small>{whatsapp}</small>
                </span>
              </a>
            )}
            {email && (
              <a className="help-channel" href={`mailto:${email}`}>
                <span className="help-glyph">@</span>
                <span>
                  <strong>Email us</strong>
                  <small>{email}</small>
                </span>
              </a>
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        className="help-fab"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? "×" : "✆"} <span>{open ? "Close" : "Help"}</span>
      </button>
    </div>
  );
}
