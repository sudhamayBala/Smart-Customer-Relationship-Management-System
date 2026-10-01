import "../style/ConflictDialog.css";

function ConflictDialog({
  open,
  onDiscard,
  onSaveMerged,
  onChoose,
  propertyName = "this property",
  version,
  fields = [],
  choices = {},
  saving = false,
}) {
  if (!open) return null;

  return (
    <div className="conflict-dialog-overlay">
      <section className="conflict-dialog" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <header className="conflict-dialog-heading">
          <div>
            <span className="conflict-dialog-eyebrow">409 · VERSION CONFLICT</span>
            <h2 id="conflict-title">Someone else saved {propertyName}</h2>
            <p>Choose which value to keep for each field changed by both versions.</p>
          </div>
        </header>

        <div className="conflict-dialog-table-wrap">
          <table className="conflict-dialog-table">
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Theirs (v{version})</th>
                <th scope="col">Yours</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field) => (
                <tr key={field.key}>
                  <th scope="row">
                    {field.label}
                    {!field.conflict && <span className="conflict-dialog-no-conflict">No conflict</span>}
                  </th>
                  <td>
                    {field.conflict ? (
                      <label className="conflict-dialog-choice">
                        <input
                          type="radio"
                          name={`merge-${field.key}`}
                          value="theirs"
                          checked={choices[field.key] === "theirs"}
                          onChange={() => onChoose(field.key, "theirs")}
                          disabled={saving}
                        />
                        <span>{field.theirs}</span>
                      </label>
                    ) : field.theirs}
                  </td>
                  <td>
                    {field.conflict ? (
                      <label className="conflict-dialog-choice">
                        <input
                          type="radio"
                          name={`merge-${field.key}`}
                          value="yours"
                          checked={choices[field.key] === "yours"}
                          onChange={() => onChoose(field.key, "yours")}
                          disabled={saving}
                        />
                        <span>{field.yours}</span>
                      </label>
                    ) : field.yoursChanged ? field.yours : "—"}
                  </td>
                </tr>
              ))}
              {!fields.length && (
                <tr><td className="conflict-dialog-empty" colSpan="3">Your edits do not overlap with the latest changes.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="conflict-dialog-actions">
          <button type="button" className="conflict-dialog-secondary" onClick={onDiscard} disabled={saving}>
            Discard my changes
          </button>
          <button type="button" className="conflict-dialog-primary" onClick={() => onSaveMerged(choices)} disabled={saving}>
            {saving ? "Saving…" : `Save merged as v${version}`}
          </button>
        </footer>
      </section>
    </div>
  );
}

export default ConflictDialog;