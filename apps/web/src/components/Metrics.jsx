export default function Metrics({ data }) {
  const metrics = [
    {
      label: "Today's Sessions",
      value: data.sessions || 0,
      meta: '+12% from yesterday',
      metaClass: 'positive',
    },
    {
      label: 'Appointment Types',
      value: data.appointmentTypes || 0,
      meta: '3 pending',
      metaClass: 'warning',
    },
    {
      label: 'Audit Event Sync',
      value: data.auditEvents || 0,
      meta: 'Synced 2m ago',
      metaClass: '',
    },
  ];

  return (
    <section className="metrics" aria-label="Key metrics">
      {metrics.map((metric, idx) => (
        <article key={idx} className="metric-card">
          <p className="metric-label">{metric.label}</p>
          <p className="metric-value">{metric.value}</p>
          <p className={`metric-meta ${metric.metaClass}`}>{metric.meta}</p>
        </article>
      ))}
    </section>
  );
}
