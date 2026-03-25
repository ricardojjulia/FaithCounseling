import { useState, useEffect } from 'react';
import { fetchClient } from '../../lib/clientApi.js';
import ClientDetailHeader from './ClientDetailHeader.jsx';
import ClientDetailTabs from './ClientDetailTabs.jsx';

export default function ClientDetailPage({ clientId, onBack }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchClient(clientId)
      .then((payload) => {
        if (cancelled) return;
        // API may return { item: {...} } or the object directly
        const data = payload.item ?? payload;
        setClient(data);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          color: '#62708b',
          fontSize: '15px',
          padding: '40px',
        }}
      >
        Loading client record...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px', color: '#b42318', fontSize: '15px' }}>
        <p>Failed to load client: {error}</p>
        <button
          type="button"
          onClick={onBack}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            border: '1px solid #e1e8ed',
            borderRadius: '4px',
            background: '#fff',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          &#8592; Back to Clients
        </button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <ClientDetailHeader client={client} onBack={onBack} />
      <ClientDetailTabs client={client} clientId={clientId} />
    </div>
  );
}
