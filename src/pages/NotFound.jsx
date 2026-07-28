import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container empty-state" style={{ padding: "8rem 0" }}>
      <h3>This page has been melted down</h3>
      <p>Whatever was here has been recast into something finer.</p>
      <Link to="/" className="btn btn-maroon" style={{ marginTop: "1.4rem" }}>
        Return home
      </Link>
    </div>
  );
}
