import { Link, useNavigate } from "react-router-dom";
import { useStore } from "../context/StoreContext";
import { formatINR, metalLine } from "../lib/format";
import { HeartIcon } from "./Icons";

export default function ProductCard({ product }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const navigate = useNavigate();
  const wished = wishlist.includes(product.slug);
  const hasSizes = product.sizes && product.sizes.length > 0;

  const soldOut = product.stock === 0;

  const quickAdd = (e) => {
    e.preventDefault();
    if (soldOut || hasSizes || product.madeToOrder) {
      navigate(`/product/${product.slug}`);
    } else {
      addToCart(product.slug, null, 1);
    }
  };

  return (
    <Link to={`/product/${product.slug}`} className="product-card">
      <div className="product-media">
        <img src={product.images[0]} alt={product.name} loading="lazy" />
        {soldOut && <span className="flag soldout">Sold out</span>}
        {!soldOut && product.madeToOrder && <span className="flag">Made to order</span>}
        {!soldOut && !product.madeToOrder && product.featured && (
          <span className="flag">Best seller</span>
        )}
        <button
          className={`wish-btn ${wished ? "active" : ""}`}
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.slug, product.price.total);
          }}
        >
          <HeartIcon filled={wished} />
        </button>
        <button className="quick-add" onClick={quickAdd}>
          {soldOut || hasSizes || product.madeToOrder ? "View piece" : "Add to bag"}
        </button>
      </div>
      <div className="product-info">
        <h3>{product.name}</h3>
        <p className="product-meta">{metalLine(product)}</p>
        <p className="product-price">
          {formatINR(product.price.total)}
          {product.price.discountPct > 0 && (
            <>
              <s className="card-mrp">{formatINR(product.price.mrpTotal)}</s>
              <span className="sale-flag">{product.price.discountPct}% off</span>
            </>
          )}
          <span className="live-dot" title="Priced at today's metal rate" />
        </p>
      </div>
    </Link>
  );
}
