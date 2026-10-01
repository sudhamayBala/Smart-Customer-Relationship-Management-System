import { useNavigate } from "react-router-dom";
import "../style/NotFound.css";

function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <main className="not-found-card">
        <span className="not-found-eyebrow">PROPERTY ACCESS</span>
        <span className="not-found-code">404</span>
        <h1>Property not found</h1>
        <p>It may have been deleted, or you may not have access to it.</p>

        <button
          type="button"
          onClick={() => navigate("/properties")}
        >
          Go to properties
        </button>
      </main>
    </div>
  );
}

export default NotFound;