import { useState } from "react";
import { useSelector } from "react-redux";
import ApartmentOutlined from "@mui/icons-material/ApartmentOutlined";
import KeyOutlined from "@mui/icons-material/KeyOutlined";
import ShieldOutlined from "@mui/icons-material/ShieldOutlined";
import {
  useCreatePlatformTenantMutation,
  useGetPlatformSecurityEventsQuery,
  useGetPlatformSigningKeyQuery,
  useGetPlatformSlugAvailabilityQuery,
  useGetPlatformTenantsQuery,
  useRotatePlatformSigningKeyMutation,
  useUpdatePlatformTenantStatusMutation,
} from "../store/api/AuthApi";
import "../style/SuperAdminTenants.css";

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugify = (value) => value
  .normalize("NFKD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
  .slice(0, 90)
  .replace(/-+$/g, "");

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(date);
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(date);
};

function SuperAdminTenants() {
  const user = useSelector((state) => state.auth.user);
  const [section, setSection] = useState("tenants");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [tenantSlug, setTenantSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [formError, setFormError] = useState("");
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copied, setCopied] = useState(false);
  const [statusError, setStatusError] = useState("");
  const [rotateConfirm, setRotateConfirm] = useState(false);
  const [keyMessage, setKeyMessage] = useState("");

  const {
    data: tenantResult,
    isLoading: tenantsLoading,
    isError: tenantsError,
    refetch: refetchTenants,
  } = useGetPlatformTenantsQuery();
  const [createTenant, { isLoading: isCreating }] = useCreatePlatformTenantMutation();
  const [updateTenantStatus, { isLoading: isUpdatingStatus }] = useUpdatePlatformTenantStatusMutation();
  const { data: keyInfo, isLoading: keyLoading, isError: keyError, refetch: refetchKey } =
    useGetPlatformSigningKeyQuery(undefined, { skip: section !== "keys" });
  const [rotateSigningKey, { isLoading: isRotating }] = useRotatePlatformSigningKeyMutation();
  const { data: eventResult, isLoading: eventsLoading, isError: eventsError, refetch: refetchEvents } =
    useGetPlatformSecurityEventsQuery(undefined, { skip: section !== "events" });

  const currentSlug = slugEdited ? tenantSlug : slugify(companyName);
  const slugValid = currentSlug.length >= 2 && currentSlug.length <= 100 && slugPattern.test(currentSlug);
  const { data: slugResult, isFetching: slugChecking } = useGetPlatformSlugAvailabilityQuery(currentSlug, {
    skip: !drawerOpen || !slugValid || Boolean(createdInvite),
  });
  const tenants = tenantResult?.tenants || [];
  const totals = tenantResult?.totals || { tenants: 0, active: 0, suspended: 0, users: 0, properties: 0 };

  const openDrawer = () => {
    setCompanyName("");
    setTenantSlug("");
    setSlugEdited(false);
    setAdminName("");
    setAdminEmail("");
    setFormError("");
    setCreatedInvite(null);
    setCopied(false);
    setDrawerOpen(true);
  };

  const closeDrawer = () => setDrawerOpen(false);

  const submitTenant = async (event) => {
    event.preventDefault();
    setFormError("");
    if (!slugValid || slugResult?.available !== true) {
      setFormError(slugResult?.message || "Choose an available tenant slug.");
      return;
    }

    try {
      const result = await createTenant({
        companyName: companyName.trim(),
        slug: currentSlug,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim().toLowerCase(),
      }).unwrap();
      setCreatedInvite(result);
    } catch (error) {
      setFormError(error?.data?.message || "Could not create the tenant.");
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(createdInvite.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
      setFormError("Clipboard access is unavailable. Select and copy the invite link.");
    }
  };

  const changeTenantStatus = async (tenant) => {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setStatusError("");
    try {
      await updateTenantStatus({ id: tenant.id, status: nextStatus }).unwrap();
    } catch (error) {
      setStatusError(error?.data?.message || "Could not update tenant status.");
    }
  };

  const rotateKey = async () => {
    setKeyMessage("");
    try {
      await rotateSigningKey().unwrap();
      await refetchKey();
      setKeyMessage("Signing key rotated.");
      setRotateConfirm(false);
    } catch (error) {
      setKeyMessage(error?.data?.message || "Could not rotate the signing key.");
    }
  };

  const navigation = [
    { id: "tenants", label: "Tenants", Icon: ApartmentOutlined },
    { id: "keys", label: "Signing keys", Icon: KeyOutlined },
    { id: "events", label: "Security events", Icon: ShieldOutlined },
  ];

  return (
    <div className="platform-console">
      <aside className="platform-sidebar">
        <a className="platform-brand" href="/super-admin/tenants" aria-label="PropFlow platform console">
          <span className="platform-brand-mark" aria-hidden="true" />
          <span>PropFlow</span>
          <small>PLATFORM CONSOLE</small>
        </a>
        <nav className="platform-navigation" aria-label="Platform navigation">
          {navigation.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => setSection(id)}
            >
              <Icon fontSize="small" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="platform-user">
          <strong>Super admin</strong>
          <span>{user?.email || "Platform operator"}</span>
        </div>
      </aside>

      <main className="platform-main">
        {section === "tenants" && (
          <>
            <header className="platform-page-header">
              <div>
                <div className="platform-title-row">
                  <h1>Tenants</h1>
                  <span>{totals.active} active · {totals.suspended} suspended</span>
                </div>
                <p>Platform accounts and usage counts.</p>
              </div>
              <button type="button" className="platform-primary-button" onClick={openDrawer}>
                <span aria-hidden="true">+</span> New tenant
              </button>
            </header>

            <div className="platform-privacy-note">
              Counts only. Property details, owner phones, and chats are never returned to this console. “—” means no CRM tenant mapping exists.
            </div>

            {statusError && <p className="platform-inline-error" role="alert">{statusError}</p>}
            <section className="platform-table-frame" aria-label="Tenant accounts">
              <div className="platform-table-scroll">
                <table className="platform-tenant-table">
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>First admin</th>
                      <th>Users</th>
                      <th>Properties</th>
                      <th>Created</th>
                      <th>Status</th>
                      <th><span className="visually-hidden">Manage</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {tenantsLoading ? (
                      <tr><td colSpan="7" className="platform-table-state">Loading tenants…</td></tr>
                    ) : tenantsError ? (
                      <tr><td colSpan="7" className="platform-table-state">Could not load tenant counts. <button type="button" onClick={refetchTenants}>Retry</button></td></tr>
                    ) : tenants.length ? tenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td><strong>{tenant.name}</strong><span className="platform-tenant-slug">{tenant.slug}</span></td>
                        <td>{tenant.firstAdminEmail || "—"}</td>
                        <td>{Number(tenant.userCount).toLocaleString("en-IN")}</td>
                        <td>{tenant.propertyCount == null ? "—" : Number(tenant.propertyCount).toLocaleString("en-IN")}</td>
                        <td>{formatDate(tenant.createdAt)}</td>
                        <td><span className={`platform-status ${tenant.status === "ACTIVE" ? "active" : "suspended"}`}>{tenant.status === "ACTIVE" ? "Active" : "Suspended"}</span></td>
                        <td>
                          <button
                            type="button"
                            className="platform-manage-button"
                            disabled={isUpdatingStatus}
                            onClick={() => changeTenantStatus(tenant)}
                          >
                            {tenant.status === "ACTIVE" ? "Suspend" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr><td colSpan="7" className="platform-table-state">No tenants yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <dl className="platform-totals" aria-label="Platform totals">
              <div><dt>Tenants</dt><dd>{totals.tenants.toLocaleString("en-IN")}</dd></div>
              <div><dt>Users</dt><dd>{totals.users.toLocaleString("en-IN")}</dd></div>
              <div><dt>Properties</dt><dd>{totals.properties == null ? "—" : totals.properties.toLocaleString("en-IN")}</dd></div>
            </dl>
          </>
        )}

        {section === "keys" && (
          <>
            <header className="platform-page-header">
              <div><h1>Signing keys</h1><p>Authentication token signing metadata.</p></div>
            </header>
            {keyMessage && <p className="platform-inline-status" role="status">{keyMessage}</p>}
            <section className="platform-detail-panel">
              {keyLoading ? <p>Loading key metadata…</p> : keyError ? (
                <p className="platform-inline-error">Could not load signing key metadata. <button type="button" onClick={refetchKey}>Retry</button></p>
              ) : (
                <dl className="platform-key-details">
                  <div><dt>Key ID</dt><dd>{keyInfo?.keyId || "—"}</dd></div>
                  <div><dt>Algorithm</dt><dd>{keyInfo?.algorithm || "—"}</dd></div>
                  <div><dt>Use</dt><dd>{keyInfo?.use || "—"}</dd></div>
                  <div><dt>Created</dt><dd>{formatDateTime(keyInfo?.createdAt)}</dd></div>
                </dl>
              )}
              {rotateConfirm ? (
                <div className="platform-confirm-rotation">
                  <p>Rotating the key can invalidate active sessions. Continue?</p>
                  <button type="button" className="platform-secondary-button" onClick={() => setRotateConfirm(false)}>Cancel</button>
                  <button type="button" className="platform-danger-button" onClick={rotateKey} disabled={isRotating}>{isRotating ? "Rotating…" : "Confirm rotation"}</button>
                </div>
              ) : (
                <button type="button" className="platform-primary-button" onClick={() => setRotateConfirm(true)}>Rotate signing key</button>
              )}
            </section>
          </>
        )}

        {section === "events" && (
          <>
            <header className="platform-page-header">
              <div><h1>Security events</h1><p>Recent platform-level changes.</p></div>
            </header>
            <section className="platform-table-frame" aria-label="Security events">
              <div className="platform-table-scroll">
                <table className="platform-event-table">
                  <thead><tr><th>Event</th><th>Resource</th><th>Time</th></tr></thead>
                  <tbody>
                    {eventsLoading ? (
                      <tr><td colSpan="3" className="platform-table-state">Loading events…</td></tr>
                    ) : eventsError ? (
                      <tr><td colSpan="3" className="platform-table-state">Could not load events. <button type="button" onClick={refetchEvents}>Retry</button></td></tr>
                    ) : eventResult?.events?.length ? eventResult.events.map((event) => (
                      <tr key={event.id}>
                        <td>{event.action.replaceAll("_", " ").toLowerCase()}</td>
                        <td>{event.resourceType.toLowerCase()}</td>
                        <td>{formatDateTime(event.createdAt)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="3" className="platform-table-state">No security events recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      {drawerOpen && (
        <>
          <button type="button" className="platform-drawer-backdrop" aria-label="Close new tenant drawer" onClick={closeDrawer} />
          <aside className="platform-drawer" aria-label="New tenant" aria-modal="true" role="dialog">
            <header className="platform-drawer-header">
              <h2>{createdInvite ? "Tenant created" : "New tenant"}</h2>
              <button type="button" aria-label="Close drawer" onClick={closeDrawer}>×</button>
            </header>
            {createdInvite ? (
              <div className="platform-invite-success">
                <p className="platform-success-label">Tenant and first admin created</p>
                <p>Send this one-time setup link to <strong>{createdInvite.tenant.firstAdminEmail}</strong>. It expires {formatDateTime(createdInvite.inviteExpiresAt)}.</p>
                <label className="platform-form-label" htmlFor="created-invite-link">Invite link</label>
                <textarea id="created-invite-link" readOnly value={createdInvite.inviteUrl} rows={4} onFocus={(event) => event.target.select()} />
                <button type="button" className="platform-primary-button" onClick={copyInvite}>{copied ? "Copied" : "Copy invite link"}</button>
              </div>
            ) : (
              <form className="platform-tenant-form" onSubmit={submitTenant}>
                <label className="platform-form-label" htmlFor="tenant-company">Company name
                  <input id="tenant-company" autoComplete="organization" value={companyName} onChange={(event) => setCompanyName(event.target.value)} required minLength={2} maxLength={150} />
                </label>
                <label className="platform-form-label" htmlFor="tenant-slug">Slug
                  <input
                    id="tenant-slug"
                    value={currentSlug}
                    onChange={(event) => { setSlugEdited(true); setTenantSlug(event.target.value.toLowerCase()); }}
                    aria-invalid={slugValid && slugResult?.available === false}
                    required
                    minLength={2}
                    maxLength={100}
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  />
                  {!slugValid && currentSlug && <span className="platform-field-hint error">Use lowercase letters, numbers, and single hyphens.</span>}
                  {slugValid && slugChecking && <span className="platform-field-hint">Checking slug…</span>}
                  {slugValid && !slugChecking && slugResult?.available === false && <span className="platform-field-hint error">Slug already taken.</span>}
                  {slugValid && !slugChecking && slugResult?.available === true && <span className="platform-field-hint success">Slug available.</span>}
                </label>
                <label className="platform-form-label" htmlFor="tenant-admin-name">First admin · full name
                  <input id="tenant-admin-name" autoComplete="name" value={adminName} onChange={(event) => setAdminName(event.target.value)} required minLength={2} maxLength={150} />
                </label>
                <label className="platform-form-label" htmlFor="tenant-admin-email">Email
                  <input id="tenant-admin-email" type="email" autoComplete="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} required maxLength={255} />
                </label>
                <p className="platform-form-note">Creates the tenant and admin together, then generates a single-use invite link valid for 24 hours.</p>
                {formError && <p className="platform-inline-error" role="alert">{formError}</p>}
                <div className="platform-drawer-footer">
                  <button type="submit" className="platform-primary-button" disabled={isCreating || !slugValid || slugChecking || slugResult?.available !== true}>
                    {isCreating ? "Creating…" : "Create tenant and invite admin"}
                  </button>
                </div>
              </form>
            )}
          </aside>
        </>
      )}
    </div>
  );
}

export default SuperAdminTenants;