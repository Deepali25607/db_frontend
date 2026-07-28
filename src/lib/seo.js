import { useEffect } from "react";

const SITE = "DP Jewellers";
const DEFAULT_DESCRIPTION =
  "Fine gold, diamond and gemstone jewellery. BIS-hallmarked, certified, priced live on today's gold rate.";

// Per-page title/description + optional JSON-LD structured data (BRD 8.6).
export function useSeo({ title, description, jsonLd } = {}) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : `${SITE} — Fine Gold & Diamond Jewellery`;

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "description";
      document.head.appendChild(meta);
    }
    meta.content = description || DEFAULT_DESCRIPTION;

    let script = null;
    if (jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(jsonLd);
      document.head.appendChild(script);
    }
    return () => {
      if (script) script.remove();
    };
  }, [title, description, JSON.stringify(jsonLd)]); // eslint-disable-line react-hooks/exhaustive-deps
}
