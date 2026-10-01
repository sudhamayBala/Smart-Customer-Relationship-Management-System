import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/MyProperties.css";

const properties = [
  {
    id: 1,
    title: "3 BHK, Skyline Towers B-1204",
    location: "Rajarhat",
    listingType: "Sale",
    price: "₹ 11.2 Cr",
    status: "Negotiation",
    ownerName: "Ritu Sharma",
    ownerPhone: "98300 12345",
    nextVisit: "26 Sep, 10:00",
    siteVisit: "Overdue by 2 days",
    badge: "OVERDUE",
  },
  {
    id: 2,
    title: "3 BHK, Lake View A-302",
    location: "Rajarhat",
    listingType: "Sale",
    price: "₹ 8.8 L",
    status: "Site visit",
    ownerName: "Amit Das",
    ownerPhone: "98760 44187",
    nextVisit: "Today, 14:00",
    siteVisit: "Today",
    badge: "TODAY",
  },
  {
    id: 3,
    title: "2 BHK, DTC South E-405",
    location: "Behala",
    listingType: "Sale",
    price: "₹ 52 L",
    status: "Site visit",
    ownerName: "Madhuri Sen",
    ownerPhone: "98370 48211",
    nextVisit: "Overdue 23 Sep",
    siteVisit: "Overdue",
    badge: "OVERDUE",
  },
  {
    id: 4,
    title: "3 BHK, Uniworld City T-901",
    location: "New Town",
    listingType: "Sale",
    price: "₹ 35.5 Cr",
    status: "Listed",
    ownerName: "Nitin Roy",
    ownerPhone: "91234 55678",
    nextVisit: "8 Oct, 11:00",
    siteVisit: "Scheduled",
    badge: "UPCOMING",
  },
  {
    id: 5,
    title: "2 BHK, Eden Court B-208",
    location: "Salt Lake",
    listingType: "Rent",
    price: "₹ 12 k / mo",
    status: "Listed",
    ownerName: "Pooja Ghosh",
    ownerPhone: "98710 66889",
    nextVisit: "Not scheduled",
    siteVisit: "Pending",
    badge: "NEW",
  },
  {
    id: 6,
    title: "Shop, City Centre G-14",
    location: "Salt Lake",
    listingType: "Rent",
    price: "₹ 85 k / mo",
    status: "Closed",
    ownerName: "Indranil Saha",
    ownerPhone: "97321 44590",
    nextVisit: "—",
    siteVisit: "Closed",
    badge: "CLOSED",
  },
  {
    id: 7,
    title: "Plot 12, Howrah Greens",
    location: "Howrah",
    listingType: "Sale",
    price: "₹ 38 L",
    status: "Listed",
    ownerName: "Tania Chowdhury",
    ownerPhone: "90032 44488",
    nextVisit: "29 Sep, 11:30",
    siteVisit: "Scheduled",
    badge: "UPCOMING",
  },
  {
    id: 8,
    title: "1 BHK, Ideal Union B-506",
    location: "Tollygunge",
    listingType: "Rent",
    price: "₹ 18 k / mo",
    status: "Draft",
    ownerName: "Rupam Banerjee",
    ownerPhone: "98990 27112",
    nextVisit: "Not scheduled",
    siteVisit: "Draft",
    badge: "DRAFT",
  },
  {
    id: 9,
    title: "4 BHK, Garden Vista L-704",
    location: "New Town",
    listingType: "Sale",
    price: "₹ 93 L",
    status: "Negotiation",
    ownerName: "Sanjay Deb",
    ownerPhone: "98112 33445",
    nextVisit: "4 Oct, 17:00",
    siteVisit: "Scheduled",
    badge: "UPCOMING",
  },
  {
    id: 10,
    title: "2 BHK, Pearl Residency F-111",
    location: "Jadavpur",
    listingType: "Sale",
    price: "₹ 67 L",
    status: "Site visit",
    ownerName: "Anita Nandi",
    ownerPhone: "98300 77881",
    nextVisit: "Today, 18:30",
    siteVisit: "Today",
    badge: "TODAY",
  },
];

function MyProperties() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const filteredProperties = useMemo(() => {
    const value = search.trim().toLowerCase();

    return properties.filter((property) => {
      if (!value) {
        return true;
      }

      return [
        property.title,
        property.location,
        property.ownerName,
        property.ownerPhone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value);
    });
  }, [search]);

  return (
    <div className="agent-page-shell">
      <aside className="agent-sidebar">
        <div className="agent-brand">
          <span className="agent-brand-mark" aria-hidden="true" />
          <span>PropFlow</span>
        </div>

        <nav className="agent-nav" aria-label="Agent navigation">
          <button type="button" className="agent-nav-item active">
            My properties
          </button>
          <button type="button" className="agent-nav-item">
            My site visits
          </button>
        </nav>

        <div className="agent-user-box">
          <span>Skyline Estates</span>
          <strong>Kabir Dutta</strong>
        </div>
      </aside>

      <main className="agent-main-area">
        <header className="agent-header-row">
          <div className="agent-page-title-wrap">
            <div className="agent-page-title">10 · My properties</div>
            <span className="agent-role-pill">Agent</span>
          </div>
        </header>

        <section className="agent-white-panel">
          <div className="agent-panel-topbar">
            <div className="agent-panel-heading">My properties <span>142 assigned to you</span></div>
            <div className="agent-top-actions">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search my properties"
                className="agent-search-input"
              />
              <button type="button" className="agent-primary-button" onClick={() => navigate("/properties/new")}>+ Add property</button>
            </div>
          </div>

          <div className="agent-stat-row">
            <div className="agent-stat-card">
              <span className="agent-stat-label">OVERDUE VISIT · 23 Sep</span>
              <strong>2 BHK, DTC Southern E-405</strong>
              <small>Behala · visitor: Mr. Paul</small>
            </div>
            <div className="agent-stat-card">
              <span className="agent-stat-label">TODAY · 14:00 IST</span>
              <strong>3 BHK, Lake View A-302</strong>
              <small>Rajarhat · visitor: Ms. Das</small>
            </div>
            <div className="agent-stat-card">
              <span className="agent-stat-label">TOMORROW · 10:00 IST</span>
              <strong>3 BHK, Skyline Towers B-1204</strong>
              <small>Rajarhat · second visit</small>
            </div>
          </div>

          <div className="agent-table-toolbar">
            <span>Filters:</span>
            <span className="agent-filter-chip">Status: Any</span>
            <span className="agent-filter-chip">Sale</span>
            <span className="agent-filter-chip">Rent</span>
            <span className="agent-filter-chip muted">No agent filter, no bulk selection, no export button</span>
          </div>

          <div className="agent-table-wrap">
            <table className="agent-table">
              <thead>
                <tr>
                  <th>PROPERTY</th>
                  <th>LOCALITY</th>
                  <th>LISTING</th>
                  <th>PRICE</th>
                  <th>STATUS</th>
                  <th>OWNER PHONE</th>
                  <th>NEXT VISIT</th>
                </tr>
              </thead>
              <tbody>
                {filteredProperties.map((property) => (
                  <tr key={property.id}>
                    <td className="property-name-cell">
                      <button type="button" className="property-row-link" onClick={() => navigate(`/properties/${property.id}`)}>
                        {property.title}
                      </button>
                    </td>
                    <td>{property.location}</td>
                    <td>{property.listingType}</td>
                    <td>{property.price}</td>
                    <td>
                      <span className={`agent-status-badge status-${property.status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {property.status}
                      </span>
                    </td>
                    <td>{property.ownerPhone}</td>
                    <td>{property.nextVisit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="agent-notes">
          <ul>
            <li>Only listings assigned to the agent; today&apos;s and overdue site visits pinned on top.</li>
            <li>No agent filter, no bulk selection, no export button (and the API refuses them).</li>
            <li>Owner phone unmasked here because these are the agent&apos;s own listings.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

export default MyProperties;
