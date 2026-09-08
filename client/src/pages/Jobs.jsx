import React from "react";
import { Link } from "react-router-dom";
import { Icon } from "../components/Icons.jsx";

// Placeholder until the Jobs board itself is built — keeps the nav entry
// live and on-brand rather than a dead link or a 404.
function Jobs() {
  return (
    <main className="msj-page">
      <div className="wrap py-lg">
        <div className="msj-empty-state" style={{ padding: "96px 20px" }}>
          <Icon name="building" size={30} />
          <h3>Coming soon</h3>
          <p>We're building a jobs board to connect masjids and Muslim organizations with people looking to serve their community. Check back soon.</p>
          <Link to="/" className="btn btn-outline-ink">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}

export default Jobs;
