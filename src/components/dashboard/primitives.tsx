export function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="card-header"><h2 className="card-title">{title}</h2></div>
      <div className="card-body list">{children}</div>
    </div>
  );
}

export function Metric({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="card metric">
      <Icon size={26} color="#236c4a" />
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}
