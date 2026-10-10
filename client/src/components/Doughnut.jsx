const PALETTE = ['#7c6cff', '#ff6bb5', '#38bdf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#94a3b8'];

/** Dependency-free SVG doughnut chart. data = [{ label, value, color? }] */
export default function Doughnut({ data, centerValue, centerLabel, size = 180 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const radius = 15.915; // circumference = 100 -> dash lengths are plain percentages
  let offset = 25; // start at 12 o'clock

  return (
    <figure className="doughnut">
      <svg viewBox="0 0 42 42" width={size} height={size} role="img" aria-label={`${centerLabel || 'Chart'}: ${centerValue}`}>
        <circle cx="21" cy="21" r={radius} fill="none" stroke="var(--track)" strokeWidth="5" />
        {total > 0 &&
          data.map((slice, i) => {
            const pct = (slice.value / total) * 100;
            const el = (
              <circle
                key={slice.label}
                cx="21"
                cy="21"
                r={radius}
                fill="none"
                stroke={slice.color || PALETTE[i % PALETTE.length]}
                strokeWidth="5"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset={offset}
              />
            );
            offset -= pct;
            return el;
          })}
        <text x="21" y="21.5" textAnchor="middle" className="doughnut-value">{centerValue}</text>
        <text x="21" y="26.5" textAnchor="middle" className="doughnut-label">{centerLabel}</text>
      </svg>
      <figcaption className="doughnut-legend">
        {data.map((slice, i) => (
          <span key={slice.label}>
            <i style={{ background: slice.color || PALETTE[i % PALETTE.length] }} /> {slice.label} ({slice.value})
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
