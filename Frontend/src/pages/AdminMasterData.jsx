import { useMemo, useState } from "react";
import {
  useCreateMasterDataMutation,
  useDeleteMasterDataMutation,
  useGetMasterDataQuery,
  useReorderMasterDataMutation,
  useUpdateMasterDataMutation,
} from "../store/api/masterDataApi";
import "../style/AdminMasterData.css";

const categories = [
  { id: "STATUS", label: "Statuses", description: "Property lifecycle stages." },
  { id: "PROPERTY_TYPE", label: "Property types", description: "Property categories used in listings." },
  { id: "LOCALITY", label: "Localities", description: "Areas available for property addresses." },
  { id: "AMENITY", label: "Amenities", description: "Features that can be assigned to properties." },
];

function AdminMasterData() {
  const [activeType, setActiveType] = useState("STATUS");
  const [newValue, setNewValue] = useState("");
  const [newTerminal, setNewTerminal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [draggedId, setDraggedId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const { data: result, isLoading, isError, refetch } = useGetMasterDataQuery();
  const [createValue, { isLoading: isCreating }] = useCreateMasterDataMutation();
  const [updateValue, { isLoading: isUpdating }] = useUpdateMasterDataMutation();
  const [deleteValue, { isLoading: isDeleting }] = useDeleteMasterDataMutation();
  const [reorderValues, { isLoading: isReordering }] = useReorderMasterDataMutation();

  const category = categories.find((item) => item.id === activeType) || categories[0];
  const items = useMemo(
    () => (result?.data || [])
      .filter((item) => item.type === activeType)
      .sort((left, right) => left.sortOrder - right.sortOrder || left.label.localeCompare(right.label)),
    [result?.data, activeType]
  );
  const busy = isCreating || isUpdating || isDeleting || isReordering;

  const addValue = async (event) => {
    event.preventDefault();
    const value = newValue.trim();
    if (!value) return;
    setError("");
    setNotice("");
    try {
      await createValue({
        type: activeType,
        value,
        label: value,
        sortOrder: items.length,
        isTerminal: activeType === "STATUS" && newTerminal,
      }).unwrap();
      setNewValue("");
      setNewTerminal(false);
      setNotice(`${category.label.slice(0, -1)} added.`);
    } catch (requestError) {
      setError(requestError?.data?.message || "Could not add this value. It may already exist.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingValue(item.label || item.value);
    setError("");
  };

  const saveEdit = async (item) => {
    const label = editingValue.trim();
    if (!label) return;
    setError("");
    try {
      await updateValue({
        id: item.id,
        value: label,
        label,
      }).unwrap();
      setEditingId(null);
      setEditingValue("");
      setNotice(`Renamed to ${label}. Matching properties were updated.`);
    } catch (requestError) {
      setError(requestError?.data?.message || "Could not rename this value.");
    }
  };

  const toggleActive = async (item) => {
    setError("");
    setNotice("");
    try {
      await updateValue({ id: item.id, isActive: !item.isActive }).unwrap();
      setNotice(item.isActive ? "Deactivated. Existing properties keep this value." : "Value activated.");
    } catch (requestError) {
      setError(requestError?.data?.message || "Could not update this value.");
    }
  };

  const removeUnusedValue = async (item) => {
    if (item.usageCount > 0) return;
    setError("");
    setNotice("");
    try {
      await deleteValue(item.id).unwrap();
      setNotice("Unused value deleted.");
    } catch (requestError) {
      setError(requestError?.data?.message || "Could not delete this value.");
    }
  };

  const dropOnItem = async (targetId) => {
    if (!draggedId || draggedId === targetId || busy) return;
    const currentOrder = [...items];
    const fromIndex = currentOrder.findIndex((item) => item.id === draggedId);
    const toIndex = currentOrder.findIndex((item) => item.id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const [moved] = currentOrder.splice(fromIndex, 1);
    currentOrder.splice(toIndex, 0, moved);
    setDraggedId(null);
    setError("");
    try {
      await reorderValues({
        type: activeType,
        items: currentOrder.map((item, index) => ({ id: item.id, sortOrder: index })),
      }).unwrap();
      setNotice("Order saved.");
    } catch (requestError) {
      setError(requestError?.data?.message || "Could not save the new order.");
    }
  };

  return (
    <div className="admin-master-data-page">
      <header className="admin-master-data-header">
        <div>
          <p className="admin-master-data-eyebrow">ADMINISTRATION</p>
          <h1>Master data</h1>
        </div>
      </header>

      <div className="admin-master-data-tabs" role="tablist" aria-label="Master data categories">
        {categories.map((item) => (
          <button
            key={item.id}
            id={`master-tab-${item.id}`}
            type="button"
            role="tab"
            aria-selected={activeType === item.id}
            aria-controls="master-data-panel"
            className={activeType === item.id ? "active" : ""}
            onClick={() => {
              setActiveType(item.id);
              setEditingId(null);
              setError("");
              setNotice("");
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <main id="master-data-panel" className="admin-master-data-layout" role="tabpanel" aria-labelledby={`master-tab-${activeType}`}>
        <section className="admin-master-data-list" aria-label={category.label}>
          <header className="admin-master-data-list-header">
            <span>VALUE</span>
            <span>TYPE</span>
            <span>USAGE</span>
            <span>ACTIONS</span>
          </header>
          {isLoading ? (
            <p className="admin-master-data-state">Loading {category.label.toLowerCase()}…</p>
          ) : isError ? (
            <p className="admin-master-data-state">Could not load master data. <button type="button" onClick={refetch}>Retry</button></p>
          ) : items.length ? items.map((item) => (
            <div
              className={`admin-master-data-row ${item.isActive ? "" : "inactive"} ${draggedId === item.id ? "dragging" : ""}`}
              key={item.id}
              draggable
              onDragStart={() => setDraggedId(item.id)}
              onDragEnd={() => setDraggedId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => dropOnItem(item.id)}
            >
              <div className="admin-master-data-value-cell">
                <span className="admin-master-data-drag-handle" aria-label="Drag to reorder" title="Drag to reorder">⋮⋮</span>
                {activeType === "STATUS" && <span className={`admin-master-data-dot dot-${item.sortOrder % 6}`} aria-hidden="true" />}
                {editingId === item.id ? (
                  <input
                    className="admin-master-data-edit-input"
                    aria-label={`Rename ${item.label}`}
                    value={editingValue}
                    onChange={(event) => setEditingValue(event.target.value)}
                    onKeyDown={(event) => { if (event.key === "Enter") saveEdit(item); if (event.key === "Escape") setEditingId(null); }}
                    autoFocus
                  />
                ) : <strong>{item.label || item.value}</strong>}
                {item.isTerminal && <span className="admin-master-data-terminal">Terminal</span>}
                {!item.isActive && <span className="admin-master-data-inactive-tag">Inactive</span>}
              </div>
              <span className="admin-master-data-kind">{item.isTerminal ? "Terminal stage" : activeType === "STATUS" ? "Open" : category.label.slice(0, -1)}</span>
              <span className="admin-master-data-usage">{Number(item.usageCount || 0).toLocaleString("en-IN")} listings</span>
              <div className="admin-master-data-actions">
                {editingId === item.id ? (
                  <>
                    <button type="button" className="admin-master-data-action-button" disabled={busy} onClick={() => saveEdit(item)}>Save</button>
                    <button type="button" className="admin-master-data-muted-button" onClick={() => setEditingId(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button type="button" className="admin-master-data-link-button" disabled={busy} onClick={() => startEdit(item)}>Rename</button>
                    <button type="button" className="admin-master-data-danger-link" disabled={busy} onClick={() => toggleActive(item)}>{item.isActive ? "Deactivate" : "Activate"}</button>
                    {item.usageCount === 0 && <button type="button" className="admin-master-data-muted-button" disabled={busy} onClick={() => removeUnusedValue(item)}>Delete</button>}
                  </>
                )}
              </div>
            </div>
          )) : (
            <p className="admin-master-data-state">No {category.label.toLowerCase()} found.</p>
          )}
          {activeType === "STATUS" && items.length > 1 && <p className="admin-master-data-drag-note">Drag a status to change its display order.</p>}
        </section>

        <aside className="admin-master-data-side-panel">
          <section className="admin-master-data-add-panel">
            <h2>Add {category.label.slice(0, -1).toLowerCase()}</h2>
            <form onSubmit={addValue}>
              <label htmlFor="master-new-value">Name</label>
              <input id="master-new-value" value={newValue} onChange={(event) => setNewValue(event.target.value)} maxLength={150} required />
              {activeType === "STATUS" && (
                <label className="admin-master-data-terminal-toggle">
                  <input type="checkbox" checked={newTerminal} onChange={(event) => setNewTerminal(event.target.checked)} />
                  <span>Terminal stage (e.g. Closed / Withdrawn)</span>
                </label>
              )}
              <button type="submit" className="admin-master-data-add-button" disabled={busy}>{isCreating ? "Adding…" : `Add ${category.label.slice(0, -1).toLowerCase()}`}</button>
            </form>
          </section>
          <aside className="admin-master-data-info">
            Any change clears the tenant master-data cache. Property forms and filters use the updated values on their next request.
          </aside>
          <aside className="admin-master-data-warning">
            Values already used by listings cannot be deleted. Deactivate them to hide them from new listings while preserving existing data.
          </aside>
          {error && <p className="admin-master-data-error" role="alert">{error}</p>}
          {notice && <p className="admin-master-data-notice" role="status">{notice}</p>}
        </aside>
      </main>
    </div>
  );
}

export default AdminMasterData;