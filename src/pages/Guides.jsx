import Reveal from "../components/Reveal";
import { useSeo } from "../lib/seo";

export default function Guides() {
  useSeo({
    title: "Buying Guides — 4Cs, Gold Purity & Hallmarking",
    description:
      "How to read a diamond certificate, what 22K really means, and how to verify a BIS hallmark — the honest guide to buying fine jewellery.",
  });

  return (
    <>
      <div className="page-band">
        <div className="container">
          <span className="eyebrow">Buying Guides</span>
          <h1>
            Know exactly <em>what you're buying.</em>
          </h1>
          <p>The 4Cs, gold purity, hallmarking and care — explained without the sales talk.</p>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: "3rem", maxWidth: 860 }}>
        <Reveal>
          <h2 className="admin-subhead" style={{ fontSize: "1.6rem", marginTop: 0 }}>The diamond 4Cs</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Four measures set a diamond's price. They trade against each other —
            a well-cut smaller stone will outshine a poorly-cut larger one.
          </p>
          <table className="spec-table" style={{ marginBottom: "2.6rem" }}>
            <tbody>
              <tr><td><strong>Cut</strong></td><td>How well the facets return light. The only C made by human hands — and the one we refuse to compromise on.</td></tr>
              <tr><td><strong>Colour</strong></td><td>Graded D (colourless) to Z (tinted). D–F is colourless; G–H near-colourless and the sweet spot for value.</td></tr>
              <tr><td><strong>Clarity</strong></td><td>Internal inclusions under 10× magnification. FL/IF → VVS → VS → SI. VS and above is eye-clean.</td></tr>
              <tr><td><strong>Carat</strong></td><td>Weight, not size — 0.2 g per carat. Price steps jump at 0.50, 0.75 and 1.00 ct; buying just under a step saves real money.</td></tr>
            </tbody>
          </table>
        </Reveal>

        <Reveal>
          <h2 className="admin-subhead" style={{ fontSize: "1.6rem" }}>Gold purity, plainly</h2>
          <table className="spec-table" style={{ marginBottom: "1rem" }}>
            <tbody>
              <tr><td><strong>24K (999)</strong></td><td>99.9% pure. Too soft for jewellery you wear; the standard for coins and bars.</td></tr>
              <tr><td><strong>22K (916)</strong></td><td>91.6% pure. The Indian jewellery standard — rich colour with enough alloy to hold a form.</td></tr>
              <tr><td><strong>18K (750)</strong></td><td>75% pure. The setting standard for diamonds — strong enough to grip stones for a lifetime.</td></tr>
              <tr><td><strong>14K (585)</strong></td><td>58.5% pure. Hardest wearing, lighter colour, kindest on budget.</td></tr>
            </tbody>
          </table>
          <p className="muted" style={{ marginBottom: "2.6rem" }}>
            Every DP Jewellers price is computed live: net metal weight × today's
            per-purity rate, plus making charges and stones — itemised on every
            product page, always.
          </p>
        </Reveal>

        <Reveal>
          <h2 className="admin-subhead" style={{ fontSize: "1.6rem" }}>Reading a BIS hallmark</h2>
          <p className="muted" style={{ marginBottom: "1rem" }}>
            Since 2021, gold jewellery sold in India must carry three marks —
            find them with a loupe, usually inside the band or on the clasp:
          </p>
          <table className="spec-table" style={{ marginBottom: "2.6rem" }}>
            <tbody>
              <tr><td><strong>BIS logo</strong></td><td>The triangle mark of the Bureau of Indian Standards.</td></tr>
              <tr><td><strong>Purity mark</strong></td><td>916 for 22K, 750 for 18K, 585 for 14K.</td></tr>
              <tr><td><strong>HUID</strong></td><td>A unique 6-character code laser-etched on the piece. Verify any HUID in the BIS Care app — ours are printed on your invoice too.</td></tr>
            </tbody>
          </table>
        </Reveal>

        <Reveal>
          <h2 className="admin-subhead" style={{ fontSize: "1.6rem" }}>Caring for fine jewellery</h2>
          <table className="spec-table">
            <tbody>
              <tr><td><strong>Daily</strong></td><td>Jewellery goes on last, comes off first — after perfume, before the shower.</td></tr>
              <tr><td><strong>Cleaning</strong></td><td>Warm water, a drop of mild soap, a soft brush. Never toothpaste, never ultrasonic for emeralds and pearls.</td></tr>
              <tr><td><strong>Storage</strong></td><td>Separate pouches — diamonds scratch gold. Pearls breathe; don't seal them in plastic.</td></tr>
              <tr><td><strong>Yearly</strong></td><td>Bring pieces in for free prong-check and re-polish at any showroom.</td></tr>
            </tbody>
          </table>
        </Reveal>
      </div>
    </>
  );
}
