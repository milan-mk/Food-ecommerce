const { round2 } = require('./money');

const utcDay = (d, offsetDays = 0) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + offsetDays));

// First instant (UTC) of the oldest day in a window of `days` days ending today.
const windowStart = (days, end = new Date()) => utcDay(end, -(days - 1));

// Aggregation only returns days that had sales; charts need every day, so fill gaps with zeros.
function fillDays(rows, days, end = new Date()) {
  const byDay = new Map(rows.map((r) => [r._id, r]));
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = utcDay(end, -i).toISOString().slice(0, 10);
    const r = byDay.get(key);
    out.push({ date: key, revenue: r ? round2(r.revenue) : 0, orders: r ? r.orders : 0 });
  }
  return out;
}
module.exports = { fillDays, windowStart };
