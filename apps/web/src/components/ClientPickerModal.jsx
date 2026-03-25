import { useState, useEffect, useRef } from 'react';

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return '';
}

function resolveClientFullName(client) {
  const firstName = firstString(client?.firstName, client?.first_name);
  const lastName = firstString(client?.lastName, client?.last_name);
  const combined = `${firstName} ${lastName}`.trim();

  return firstString(
    client?.fullName,
    client?.full_name,
    client?.name,
    combined,
    client?.preferredName,
    client?.preferred_name,
  );
}

export default function ClientPickerModal({ isOpen, clients, loading, onSelectClient, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalized = query.toLowerCase().trim();
  const filtered = (clients || []).filter((c) => {
    const name = resolveClientFullName(c).toLowerCase();
    return !normalized || name.includes(normalized);
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet client-picker-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="panel-head">
          <h3>Open Client</h3>
          <button type="button" className="action-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <input
          ref={inputRef}
          type="search"
          className="auth-input client-picker-search"
          placeholder="Search by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading ? (
          <p className="um-muted">Loading clients…</p>
        ) : filtered.length === 0 ? (
          <p className="um-muted">{query ? 'No clients match your search.' : 'No clients found.'}</p>
        ) : (
          <ul className="client-picker-list">
            {filtered.map((c) => {
              const fullName = resolveClientFullName(c) || `Client #${c.id}`;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className="client-picker-item"
                    onClick={() => {
                      onSelectClient(c.id);
                      onClose();
                    }}
                  >
                    <span className="client-picker-name">{fullName}</span>
                    {c.status && <span className="client-picker-status">{c.status}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
