import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  useCreateTenantInviteMutation,
  useGetTenantInvitesQuery,
  useGetTenantUserSessionsQuery,
  useGetTenantUsersQuery,
  useRevokeTenantUserSessionsMutation,
  useUpdateTenantUserRoleMutation,
  useUpdateTenantUserStatusMutation,
} from "../store/api/AuthApi";
import "../style/AdminUsers.css";

const roleNames = { ADMIN: "Admin", MANAGER: "Manager", AGENT: "Agent" };

const formatLastActive = (value) => {
  if (!value) return "Never";
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "Now";
  if (minutes < 60) return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
};

const formatExpiry = (value) => {
  const hours = Math.max(0, Math.ceil((new Date(value).getTime() - Date.now()) / 3_600_000));
  return hours <= 1 ? "Expires in 1 h" : `Expires in ${hours} h`;
};

const hoursUntilExpiry = (value) => Math.max(1, Math.ceil((new Date(value).getTime() - Date.now()) / 3_600_000));

function AdminUsers() {
  const currentUser = useSelector((state) => state.auth.user);
  const { data: userResult, isLoading: usersLoading, isError: usersError, refetch: refetchUsers } = useGetTenantUsersQuery();
  const { data: inviteResult, isLoading: invitesLoading, isError: invitesError, refetch: refetchInvites } = useGetTenantInvitesQuery();
  const [createInvite, { isLoading: isCreatingInvite }] = useCreateTenantInviteMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateTenantUserRoleMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateTenantUserStatusMutation();
  const [revokeSessions, { isLoading: isRevokingSessions }] = useRevokeTenantUserSessionsMutation();

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("AGENT");
  const [inviteError, setInviteError] = useState("");
  const [createdInvite, setCreatedInvite] = useState(null);
  const [copiedInviteId, setCopiedInviteId] = useState(null);
  const [rowErrors, setRowErrors] = useState({});
  const [sessionsUser, setSessionsUser] = useState(null);
  const [sessionNotice, setSessionNotice] = useState("");

  const { data: sessionResult, isFetching: sessionsLoading, refetch: refetchSessions } = useGetTenantUserSessionsQuery(
    sessionsUser?.id,
    { skip: !sessionsUser }
  );
  const users = userResult?.users || [];
  const invites = inviteResult?.invites || [];
  const totals = userResult?.totals || { users: 0, active: 0, pendingInvites: 0, deactivated: 0 };
  const statusLine = useMemo(
    () => `${totals.active} active · ${totals.pendingInvites} invite pending · ${totals.deactivated} deactivated`,
    [totals.active, totals.pendingInvites, totals.deactivated]
  );

  const openInvite = () => {
    setInviteEmail("");
    setInviteRole("AGENT");
    setInviteError("");
    setCreatedInvite(null);
    setShowInvite(true);
  };

  const closeInvite = () => {
    setShowInvite(false);
    setCreatedInvite(null);
    setInviteError("");
  };

  const submitInvite = async (event) => {
    event.preventDefault();
    setInviteError("");
    try {
      const result = await createInvite({ email: inviteEmail.trim().toLowerCase(), role: inviteRole }).unwrap();
      setCreatedInvite(result.invite);
    } catch (error) {
      setInviteError(error?.data?.message || "Could not create invitation.");
    }
  };

  const copyInvite = async (invite) => {
    const link = `${window.location.origin}/accept-invite?token=${encodeURIComponent(invite.token)}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedInviteId(invite.id);
      window.setTimeout(() => setCopiedInviteId(null), 1800);
    } catch {
      setInviteError("Clipboard access is unavailable. Open the invite to select its link.");
      setCreatedInvite({ ...invite, inviteUrl: link });
      setShowInvite(true);
    }
  };

  const changeRole = async (user, role) => {
    if (role === user.role) return;
    setRowErrors((current) => ({ ...current, [user.id]: "" }));
    try {
      await updateRole({ id: user.id, role }).unwrap();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [user.id]: error?.data?.message || "Could not change role." }));
      refetchUsers();
    }
  };

  const changeStatus = async (user) => {
    const status = user.status === "ACTIVE" ? "DEACTIVATED" : "ACTIVE";
    setRowErrors((current) => ({ ...current, [user.id]: "" }));
    try {
      await updateStatus({ id: user.id, status }).unwrap();
    } catch (error) {
      setRowErrors((current) => ({ ...current, [user.id]: error?.data?.message || "Could not update account status." }));
      refetchUsers();
    }
  };

  const openSessions = (user) => {
    setSessionsUser(user);
    setSessionNotice("");
  };

  const closeSessions = () => {
    setSessionsUser(null);
    setSessionNotice("");
  };

  const handleRevokeSessions = async () => {
    if (!sessionsUser) return;
    try {
      const result = await revokeSessions(sessionsUser.id).unwrap();
      setSessionNotice(`${result.revoked} session${result.revoked === 1 ? "" : "s"} revoked.`);
      refetchSessions();
    } catch (error) {
      setSessionNotice(error?.data?.message || "Could not revoke sessions.");
    }
  };

  return (
    <div className="admin-users-page">
      <header className="admin-users-header">
        <div>
          <p className="admin-users-eyebrow">ADMINISTRATION</p>
          <div className="admin-users-title-row">
            <h1>Users</h1>
            <span>{statusLine}</span>
          </div>
        </div>
        <button type="button" className="admin-users-primary-button" onClick={openInvite}>
          <span aria-hidden="true">+</span> Invite user
        </button>
      </header>

      {(usersError || invitesError) && (
        <div className="admin-users-page-error" role="alert">
          Could not load team data. <button type="button" onClick={() => { refetchUsers(); refetchInvites(); }}>Retry</button>
        </div>
      )}

      <section className="admin-users-section" aria-label="Tenant users">
        <div className="admin-users-table-wrapper">
          <table className="admin-users-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last login</th><th>Actions</th></tr></thead>
            <tbody>
              {usersLoading ? (
                <tr><td colSpan="6" className="admin-users-empty">Loading users…</td></tr>
              ) : users.length ? users.map((user) => (
                <tr key={user.id}>
                  <td><strong className="admin-users-name">{user.name}</strong>{rowErrors[user.id] && <span className="admin-users-row-error" role="alert">{rowErrors[user.id]}</span>}</td>
                  <td>{user.email}</td>
                  <td>
                    <select
                      aria-label={`Role for ${user.name}`}
                      value={user.role}
                      disabled={isUpdatingRole || user.role === "SUPER_ADMIN"}
                      onChange={(event) => changeRole(user, event.target.value)}
                      className="admin-users-role-select"
                    >
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Manager</option>
                      <option value="AGENT">Agent</option>
                      {user.role === "SUPER_ADMIN" && <option value="SUPER_ADMIN">Super admin</option>}
                    </select>
                  </td>
                  <td><span className={`admin-users-status ${user.status === "ACTIVE" ? "admin-users-status-active" : "admin-users-status-inactive"}`}>{user.status === "ACTIVE" ? "Active" : "Deactivated"}</span></td>
                  <td>{formatLastActive(user.lastLoginAt)}</td>
                  <td>
                    <div className="admin-users-actions">
                      <button type="button" className="admin-users-link-button" onClick={() => openSessions(user)}>Sessions</button>
                      {user.role !== "SUPER_ADMIN" && (
                        <button
                          type="button"
                          className="admin-users-link-button"
                          disabled={isUpdatingStatus || (currentUser?.id === user.id && user.role === "ADMIN")}
                          onClick={() => changeStatus(user)}
                        >
                          {user.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" className="admin-users-empty">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-users-section admin-users-invites-section" aria-label="Pending invitations">
        <div className="admin-users-section-header">
          <div><h2>Pending invites</h2></div>
        </div>
        <div className="admin-users-table-wrapper">
          <table className="admin-users-table admin-users-invites-table">
            <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead>
            <tbody>
              {invitesLoading ? (
                <tr><td colSpan="5" className="admin-users-empty">Loading invites…</td></tr>
              ) : invites.length ? invites.map((invite) => (
                <tr key={invite.id}>
                  <td>{invite.email}</td>
                  <td>{roleNames[invite.role] || invite.role}</td>
                  <td><span className="admin-users-status admin-users-status-pending">Pending</span></td>
                  <td>{formatExpiry(invite.expiresAt)}</td>
                  <td><button type="button" className="admin-users-link-button" onClick={() => copyInvite(invite)}>{copiedInviteId === invite.id ? "Copied" : "Copy link"}</button></td>
                </tr>
              )) : (
                <tr><td colSpan="5" className="admin-users-empty">No pending invites.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showInvite && (
        <div className="admin-users-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeInvite(); }}>
          <section className="admin-users-modal" role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title">
            <header className="admin-users-modal-header">
              <div><h2 id="invite-dialog-title">{createdInvite ? "Invite link ready" : "Invite a teammate"}</h2></div>
              <button type="button" className="admin-users-close-button" aria-label="Close invite dialog" onClick={closeInvite}>×</button>
            </header>
            {createdInvite ? (
              <div className="admin-users-invite-result">
                <p>Send this single-use setup link to <strong>{createdInvite.email}</strong>. Expires in {hoursUntilExpiry(createdInvite.expiresAt)} hours.</p>
                {inviteError && <p className="admin-users-modal-error" role="alert">{inviteError}</p>}
                <label htmlFor="invite-link">Invite link</label>
                <textarea id="invite-link" readOnly rows="3" value={createdInvite.inviteUrl || `${window.location.origin}/accept-invite?token=${encodeURIComponent(createdInvite.token)}`} onFocus={(event) => event.target.select()} />
                <div className="admin-users-modal-actions">
                  <button type="button" className="admin-users-secondary-button" onClick={closeInvite}>Done</button>
                  <button type="button" className="admin-users-primary-button" onClick={() => copyInvite(createdInvite)}>{copiedInviteId === createdInvite.id ? "Copied" : "Copy link"}</button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitInvite}>
                <label htmlFor="invite-email">Email
                  <input id="invite-email" type="email" autoComplete="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} required />
                </label>
                <fieldset className="admin-users-role-options">
                  <legend>Role</legend>
                  {[
                    ["MANAGER", "Manager", "All properties, bulk actions, exports, dashboard"],
                    ["AGENT", "Agent", "Only properties assigned to them"],
                  ].map(([value, label, description]) => (
                    <label className={inviteRole === value ? "selected" : ""} key={value}>
                      <input type="radio" name="invite-role" value={value} checked={inviteRole === value} onChange={() => setInviteRole(value)} />
                      <span><strong>{label}</strong><small>{description}</small></span>
                    </label>
                  ))}
                </fieldset>
                <p className="admin-users-invite-note">A single-use setup link will be valid for 24 hours.</p>
                {inviteError && <p className="admin-users-modal-error" role="alert">{inviteError}</p>}
                <div className="admin-users-modal-actions">
                  <button type="button" className="admin-users-secondary-button" onClick={closeInvite}>Cancel</button>
                  <button type="submit" className="admin-users-primary-button" disabled={isCreatingInvite}>{isCreatingInvite ? "Creating invite…" : "Send invite"}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {sessionsUser && (
        <div className="admin-users-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSessions(); }}>
          <section className="admin-users-modal admin-users-sessions-modal" role="dialog" aria-modal="true" aria-labelledby="sessions-dialog-title">
            <header className="admin-users-modal-header">
              <div><h2 id="sessions-dialog-title">Sessions</h2><p>{sessionsUser.name} · {sessionsUser.email}</p></div>
              <button type="button" className="admin-users-close-button" aria-label="Close sessions" onClick={closeSessions}>×</button>
            </header>
            {sessionsLoading ? <p>Loading sessions…</p> : sessionResult?.sessions?.length ? (
              <ul className="admin-users-session-list">
                {sessionResult.sessions.map((session) => <li key={session.id}>Active session <span>Last used {formatLastActive(session.lastUsedAt)}</span></li>)}
              </ul>
            ) : <p className="admin-users-empty">No active sessions.</p>}
            {sessionNotice && <p className="admin-users-session-notice" role="status">{sessionNotice}</p>}
            <div className="admin-users-modal-actions">
              <button type="button" className="admin-users-secondary-button" onClick={closeSessions}>Close</button>
              <button type="button" className="admin-users-danger-button" disabled={isRevokingSessions || !sessionResult?.sessions?.length} onClick={handleRevokeSessions}>{isRevokingSessions ? "Revoking…" : "Revoke all sessions"}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;