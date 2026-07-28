const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatINR = (n) => inr.format(n);

const inrPaise = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatINRPaise = (n) => inrPaise.format(n);

// "Yellow Gold" / "Sterling Silver" / "Platinum"
export function metalDisplayName(metal) {
  if (metal.type === "gold") {
    const c = metal.colour ? `${metal.colour[0].toUpperCase()}${metal.colour.slice(1)} ` : "";
    return `${c}Gold`;
  }
  return metal.type === "silver" ? "Sterling Silver" : "Platinum";
}

// "22K" → "22KT" (jeweller convention); "925" / "PT950" stay as-is
export const purityDisplay = (purity) => (/^\d+K$/.test(purity) ? `${purity}T` : purity);

export function metalLine(product) {
  const { purity, colour, type } = product.metal;
  const metalName =
    type === "gold" ? "Gold" : type === "silver" ? "Sterling Silver" : "Platinum";
  const colourPart =
    type === "gold" ? `${colour[0].toUpperCase()}${colour.slice(1)} ` : "";
  return `${purity} ${colourPart}${metalName} · ${product.metal.netWeight} g`;
}
