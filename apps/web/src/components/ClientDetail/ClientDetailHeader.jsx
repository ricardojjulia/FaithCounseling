const STATUS_COLORS = {
  active: { background: '#d1fae5', color: '#065f46' },
  inactive: { background: '#f3f4f6', color: '#374151' },
  waitlist: { background: '#fef3c7', color: '#92400e' },
  discharged: { background: '#dbeafe', color: '#1e40af' },
};

function calculateAge(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function formatDate(dateString) {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function ClientDetailHeader({ client, onBack }) {
  const displayName = client.preferredName
    ? `${client.preferredName} (${client.firstName} ${client.lastName})`
    : `${client.firstName}${client.middleName ? ' ' + client.middleName : ''} ${client.lastName}`;

  const statusStyle = STATUS_COLORS[client.status] || STATUS_COLORS.inactive;
  const age = calculateAge(client.dateOfBirth);
  const dobFormatted = formatDate(client.dateOfBirth);

  return (
    <div
      style={{
        backgroundColor: '#fff',
        borderBottom: '1px solid #e1e8ed',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <button
        type="button"
        onClick={onBack}
        style={{
          background: 'none',
          border: '1px solid #e1e8ed',
          borderRadius: '4px',
          padding: '6px 12px',
          fontSize: '14px',
          cursor: 'pointer',
          color: '#374151',
          flexShrink: 0,
        }}
      >
        &#8592; Clients
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 700,
              color: '#111827',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {displayName}
          </h1>
          <span
            style={{
              display: 'inline-block',
              padding: '2px 10px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'capitalize',
              flexShrink: 0,
              ...statusStyle,
            }}
          >
            {client.status}
          </span>
        </div>

        <div
          style={{
            marginTop: '4px',
            fontSize: '13px',
            color: '#62708b',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          {dobFormatted && (
            <span>
              DOB: {dobFormatted}
              {age !== null && <span style={{ marginLeft: '4px' }}>({age} yrs)</span>}
            </span>
          )}
          <span>ID: {client.id}</span>
          {client.pronouns && <span>Pronouns: {client.pronouns}</span>}
        </div>
      </div>
    </div>
  );
}
