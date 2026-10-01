import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAcceptInviteMutation } from "../store/api/AuthApi";
import "../style/InviteAccept.css";

function InviteAccept() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [acceptInvite, { isLoading }] = useAcceptInviteMutation();

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) {
      setError("This invite link is missing its token.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await acceptInvite({ token, name: name.trim(), password }).unwrap();
      setAccepted(true);
    } catch (requestError) {
      setError(requestError?.data?.message || "This invite could not be accepted.");
    }
  };

  return (
    <main className="invite-accept-page">
      <section className="invite-accept-panel">
        <a className="invite-accept-brand" href="/login"><span aria-hidden="true" />PropFlow</a>
        {accepted ? (
          <div className="invite-accept-result">
            <span className="invite-accept-mark" aria-hidden="true">✓</span>
            <h1>Admin account ready</h1>
            <p>Your setup is complete. Sign in to enter your workspace.</p>
            <Link className="invite-accept-submit" to="/login">Go to sign in</Link>
          </div>
        ) : (
          <>
            <p className="invite-accept-eyebrow">FIRST ADMIN INVITE</p>
            <h1>Set up your account</h1>
            <p className="invite-accept-copy">Choose your account name and password to activate your workspace administrator account.</p>
            <form onSubmit={submit}>
              <label htmlFor="invite-name">Full name</label>
              <input id="invite-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} maxLength={150} required />
              <label htmlFor="invite-password">Password</label>
              <input id="invite-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={100} required />
              <label htmlFor="invite-confirm-password">Confirm password</label>
              <input id="invite-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} maxLength={100} required />
              {error && <p className="invite-accept-error" role="alert">{error}</p>}
              <button className="invite-accept-submit" type="submit" disabled={isLoading || !token}>
                {isLoading ? "Setting up account…" : "Activate admin account"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}

export default InviteAccept;