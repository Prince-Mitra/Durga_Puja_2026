export default function StatCard({ icon, label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-icon" aria-hidden="true">{icon}</span>
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value ?? '-'}</span>
    </div>
  );
}
