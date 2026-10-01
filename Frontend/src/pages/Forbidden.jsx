import { useNavigate } from "react-router-dom";
import "../style/Forbidden.css";

function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="forbidden-page">
      <main className="forbidden-card">
        <span className="forbidden-eyebrow">ROUTE GUARD · ROLE ACCESS</span>
        <span className="forbidden-code">403</span>
        <h1>You don't have access to this page</h1>
        <p>This area is limited to another role. Contact your workspace admin if you need access.</p>
        <button
          type="button"
          onClick={() => navigate("/properties")}
        >
          Back to properties
        </button>
      </main>
    </div>
  );
}

export default Forbidden;