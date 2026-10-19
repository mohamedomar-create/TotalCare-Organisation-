// Single-series horizontal bars: one hue, value printed in text colour, hover shows the exact figure.
interface Props {
  items: { label: string; value: number; detail?: string }[]
  max?: number
  format?: (v: number) => string
  empty?: string
}

export default function BarList({ items, max, format = (v) => String(v), empty = 'No data yet.' }: Props) {
  if (items.length === 0 || items.every((i) => i.value === 0)) return <p className="muted small">{empty}</p>
  const top = max ?? Math.max(...items.map((i) => i.value))
  return (
    <ul className="barlist">
      {items.map((i) => (
        <li key={i.label} title={`${i.label}: ${format(i.value)}${i.detail ? ` (${i.detail})` : ''}`}>
          <span className="barlist-label">{i.label}</span>
          <span className="barlist-track">
            <span className="barlist-fill" style={{ width: `${top ? Math.max((i.value / top) * 100, i.value > 0 ? 2 : 0) : 0}%` }} />
          </span>
          <span className="barlist-value">{format(i.value)}</span>
        </li>
      ))}
    </ul>
  )
}
