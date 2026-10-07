// Picks a tidy top value (1, 2, 5 or 10 times a power of ten) and evenly spaced grid lines for a bar chart.
export function chartScale(values, steps = 4) {
  const max = Math.max(0, ...values);
  if (max <= 0) return { max: steps, ticks: Array.from({ length: steps + 1 }, (_, i) => i) };
  const pow = 10 ** Math.floor(Math.log10(max));
  const f = max / pow;
  const nice = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  return { max: nice, ticks: Array.from({ length: steps + 1 }, (_, i) => (nice / steps) * i) };
}
