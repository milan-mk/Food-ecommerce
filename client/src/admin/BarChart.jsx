import { chartScale } from './chartScale';

// A dependency-free bar chart. Screen readers get the same numbers as a table.
export default function BarChart({ data, format = String, ariaLabel }) {
  const W = 640, H = 240, L = 56, R = 12, T = 12, B = 30;
  const innerW = W - L - R, innerH = H - T - B;
  const { max, ticks } = chartScale(data.map((d) => d.value));
  const step = innerW / Math.max(data.length, 1);
  const bw = Math.max(4, step * 0.62);
  const every = data.length > 14 ? Math.ceil(data.length / 10) : data.length > 8 ? 2 : 1;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
        {ticks.map((t) => {
          const y = T + innerH - (t / max) * innerH;
          return (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y} y2={y} stroke="#E4E1DB" />
              <text x={L - 8} y={y + 4} textAnchor="end" fontSize="11" fill="#6B645E">{format(t)}</text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = L + i * step + (step - bw) / 2;
          return (
            <g key={d.label}>
              <rect x={x} y={T + innerH - h} width={bw} height={Math.max(h, d.value > 0 ? 2 : 0)} rx="3" fill="#D93A2B"><title>{d.title || `${d.label}: ${format(d.value)}`}</title></rect>
              {i % every === 0 && <text x={x + bw / 2} y={H - 10} textAnchor="middle" fontSize="11" fill="#6B645E">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <tbody>{data.map((d) => <tr key={d.label}><th scope="row">{d.label}</th><td>{d.title || format(d.value)}</td></tr>)}</tbody>
      </table>
    </figure>
  );
}
