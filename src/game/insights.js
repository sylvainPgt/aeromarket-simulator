import { ac } from "./aircraft.js";
import { SEGS, CATS, CAT_SEG, SEG_INFO, TURNS, yearOf, clamp, EVENT_BY_ID } from "./engine.js";

export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;

// What the player sees of the home market: the two home rivals plus all foreign carriers as one competitor
export function homeView(sim, airlines, playerId) {
  const me = airlines.find((a) => a.id === playerId);
  const R = sim.regions[me.region];
  const row = (id, name, kind, ids, strategy) => {
    const pax = ids.reduce((s, i) => s + (R.by[i] || 0), 0);
    const seg = {};
    SEGS.forEach((s) => { seg[s] = R.seg[s].total ? ids.reduce((x, i) => x + (R.seg[s].by[i] || 0), 0) / R.seg[s].total : 0; });
    return { id, name, kind, share: R.total ? pax / R.total : 0, seg, strategy };
  };
  const rows = [row(me.id, me.name, "you", [me.id], me.strategy)];
  airlines.filter((a) => a.region === me.region && a.id !== me.id).forEach((a) => rows.push(row(a.id, a.name, a.arch, [a.id], a.strategy)));
  const foreign = airlines.filter((a) => a.region !== me.region);
  const top = [...foreign].sort((x, y) => (R.by[y.id] || 0) - (R.by[x.id] || 0))[0];
  rows.push({ ...row("foreign", "Foreign carriers", "foreign", foreign.map((a) => a.id), null), lead: top ? top.name : null });
  return { rows, segLoad: sim.byId[me.id].segLoad };
}

export function buildInsight({ view, prev, sim, ev, turn, meta, playerId, isLast }) {
  const me = sim.byId[playerId];
  const mine = view.rows[0], before = prev.rows[0];
  const delta = mine.share - before.share, losing = delta < 0;
  let seg = null;
  SEGS.forEach((s) => { const d = mine.seg[s] - before.seg[s]; if (!seg || (losing ? d < seg.d : d > seg.d)) seg = { s, d }; });
  const s = seg.s;
  let rival = null;
  view.rows.slice(1).forEach((r) => {
    const p = prev.rows.find((x) => x.id === r.id);
    const d = r.seg[s] - (p ? p.seg[s] : 0);
    if (!rival || (losing ? d > rival.d : d < rival.d)) rival = { r, d };
  });
  const rivalName = rival.r.kind === "foreign" ? `Foreign carriers${rival.r.lead ? ` led by ${rival.r.lead}` : ""}` : rival.r.name;
  const segPts = Math.abs(seg.d * 100).toFixed(1);
  const costGap = sim.industryIntensity ? me.intensity / sim.industryIntensity - 1 : 0;
  const pressure = ev.carbonAdd > 0 ? "the new carbon charges" : ev.fuel > 1.15 ? "high fuel prices" : "today's fuel and carbon costs";
  const typeNeeded = { SH: "single-aisle", LT: "long-range single-aisle", LH: "widebody" }[s];
  const m = meta[playerId];
  let reason;
  if (losing) {
    if (view.segLoad[s] >= 0.935) reason = "you ran out of seats: your aircraft were full while demand kept growing, and new orders take five years to arrive";
    else if (me.switchCost > 0) reason = "your network was in the middle of a strategy change, and a half-rebuilt network sells badly";
    else if (s === "LT" && mine.strategy === "HUB") reason = "your Hub & Spoke strategy lacked the required Point-to-Point agility";
    else if (s === "LH" && mine.strategy === "P2P") reason = "your Point-to-Point network could not match the feed and scale of a mega-hub operation";
    else if (costGap > 0.03) reason = `your fleet burns ${(costGap * 100).toFixed(0)}% more fuel per seat than the industry, and under ${pressure} that showed up in your fares`;
    else if (m.retired > 0) reason = `you retired ${m.retired} aircraft before their replacements were in service`;
    else reason = `your active fleet lacked enough ${typeNeeded} capacity where the demand appeared`;
  } else if (s === "LT" && mine.strategy === "P2P") reason = "your Point-to-Point network offered the direct routes this market rewarded";
  else if (s === "LH" && mine.strategy === "HUB") reason = "your Hub & Spoke network funnelled volume through your hubs more efficiently";
  else if (costGap < -0.03) reason = `your fleet burns ${Math.abs(costGap * 100).toFixed(0)}% less fuel per seat than the industry, an advantage under ${pressure}`;
  else reason = `your ${typeNeeded} capacity was in place where the demand appeared`;

  const lines = [];
  if (Math.abs(delta) < 0.003) {
    lines.push(`Your home market share held steady at ${pct(mine.share)}. The biggest movement was on ${SEG_INFO[s].long} routes, where ${losing ? `${rivalName} gained on you` : `you gained on ${rivalName}`} because ${reason}.`);
  } else if (losing) {
    lines.push(`${rivalName} stole your ${SEG_INFO[s].long} market share (${segPts} points in that segment) because ${reason}.`);
  } else {
    lines.push(`You took ${SEG_INFO[s].long} market share from ${rivalName} (${segPts} points in that segment) because ${reason}.`);
  }
  const margin = me.revenue ? me.ebit / me.revenue : 0;
  if (me.load < 0.74) lines.push(`Your load factor was only ${pct(me.load, 0)}: too many empty seats started a fare war and dragged your operating margin to ${pct(margin)}.`);
  else if (me.load >= 0.93) lines.push(`Your aircraft flew full (${pct(me.load, 0)} load factor). That protected a ${pct(margin)} operating margin, but you left unserved demand to competitors.`);
  else if (me.revenue && me.carbon / me.revenue > 0.05) lines.push(`Carbon charges consumed ${pct(me.carbon / me.revenue)} of your revenue, leaving a ${pct(margin)} operating margin.`);
  else if (me.revenue && me.interest / me.revenue > 0.04) lines.push(`Interest on your debt consumed ${pct(me.interest / me.revenue)} of revenue; the operating margin was ${pct(margin)}.`);
  else lines.push(`Your operating margin for the period was ${pct(margin)} at a ${pct(me.load, 0)} load factor.`);
  const ordered = Object.values(m.orders).reduce((x, n) => x + n, 0);
  if (!isLast) {
    lines.push(ordered > 0
      ? `The ${ordered} aircraft you ordered enter service from ${yearOf(turn + 1)}, so they will face the next market, not this one.`
      : `You ordered no aircraft, so your ${yearOf(turn + 1)} fleet will be smaller and older than today's.`);
  }
  return lines;
}

/* ---------- Behavioral analytics ------------------------------------- */

const catSeats = (obj) => {
  const o = { SA: 0, LR: 0, WB: 0 };
  Object.entries(obj || {}).forEach(([t, n]) => { const A = ac(t); if (A) o[A.cat] += n * A.seats; });
  return o;
};

export function computeAnalytics(history, scenario) {
  const n = history.length;
  const mixOf = (h) => {
    const a = catSeats(h.orders), b = catSeats(h.leases);
    const v = CATS.map((c) => a[c] + b[c]);
    const tot = v[0] + v[1] + v[2];
    return tot ? v.map((x) => x / tot) : null;
  };
  // 1. Consistency
  const switches = history.filter((h) => h.switched).length;
  const mixes = history.map(mixOf).filter(Boolean);
  let vol = 0;
  for (let i = 1; i < mixes.length; i++) vol += mixes[i].reduce((s, v, k) => s + Math.abs(v - mixes[i - 1][k]), 0) / 2;
  vol = mixes.length > 1 ? vol / (mixes.length - 1) : 0;
  const consistency = clamp(100 - 55 * (switches / Math.max(1, n - 1)) - 45 * vol);

  // 2. Risk aversion and crisis behaviour (final turn excluded: the order book is closed)
  const invest = history.filter((h) => h.turn < TURNS - 1 && h.capacity > 0);
  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const calmRate = avg(invest.filter((h) => !h.crisis).map((h) => h.investRate));
  const crisisRate = avg(invest.filter((h) => h.crisis).map((h) => h.investRate));
  const overallRate = avg(invest.map((h) => h.investRate)) ?? 0;
  const crisisTurns = history.filter((h) => h.crisis);
  const panicMoves = crisisTurns.filter((h) => h.switched).length + crisisTurns.filter((h) => h.retire).length;
  const ratio = calmRate && crisisRate != null ? crisisRate / calmRate : null;
  const composure = ratio == null ? null : clamp(100 * Math.min(1, ratio) - 12 * panicMoves);
  // Orders are leveraged about 3x on free funds, so committing a quarter of capacity is already an all-in bet
  const riskAversion = clamp(100 * (1 - overallRate / 0.25));
  const peakDebt = Math.max(0, ...history.map((h) => h.debtRatio));
  let crisisLabel = "No crisis data";
  if (ratio != null) {
    crisisLabel = ratio < 0.5 ? "Panic response: investment frozen during crises"
      : ratio < 0.9 ? "Cautious: investment cut back during crises"
      : ratio <= 1.15 ? "Steady hand: crises did not change the plan"
      : "Counter-cyclical: invested more during crises";
  }

  // 3. Alignment with long-term trends
  const last = history[n - 1], first = history[0];
  const decarb = clamp(50 + ((last.industryIntensity - last.intensity) / last.industryIntensity) * 250);
  const tot = CATS.reduce((s, c) => s + last.catSeats[c], 0) || 1;
  const fit = 1 - 0.5 * CATS.reduce((s, c) => s + Math.abs(last.catSeats[c] / tot - last.w[CAT_SEG[c]]), 0);
  const networkFit = clamp(fit * 100);
  const demandGrowth = last.homeDemand / first.homeDemandStart;
  const capGrowth = last.seats / first.seatsStart;
  const growthFit = clamp((capGrowth / demandGrowth) * 100);
  const alignment = (decarb + networkFit + growthFit) / 3;

  // 4. Use of forecasts: did the largest order follow the early signal?
  let eligible = 0, followed = 0;
  history.forEach((h) => {
    if (!h.signalId) return;
    const fav = EVENT_BY_ID[h.signalId].fav;
    const mix = mixOf(h);
    if (!fav || !mix) return;
    eligible++;
    if (CATS[mix.indexOf(Math.max(...mix))] === fav) followed++;
  });
  const forecastReliance = eligible ? (followed / eligible) * 100 : null;
  const signalsAccurate = scenario.signals.filter((s) => s && s.accurate).length;

  let archetype, archetypeText;
  if (ratio != null && ratio < 0.5) { archetype = "The Cautious Reactor"; archetypeText = "Shocks drive your decisions. You protect cash when the outlook darkens, which costs capacity once demand returns five years later."; }
  else if (ratio != null && ratio > 1.15) { archetype = "The Contrarian Investor"; archetypeText = "You buy when others hesitate. Because deliveries lag by five years, ordering in a downturn often lands capacity in the recovery."; }
  else if (consistency >= 70 && alignment >= 60) { archetype = "The Long-Range Strategist"; archetypeText = "You commit to a direction and hold it through turbulence, and that direction matched where the market was heading."; }
  else if (consistency >= 70) { archetype = "The Steadfast Operator"; archetypeText = "You hold your course regardless of the outlook. Predictable, but the market's structural shifts moved away from your plan."; }
  else if (forecastReliance != null && forecastReliance >= 60) { archetype = "The Forecast Follower"; archetypeText = "You re-shape the fleet around each new signal. Responsive, but exposed whenever a forecast turns out wrong."; }
  else { archetype = "The Pragmatic Adapter"; archetypeText = "You adjust strategy and fleet mix frequently, reacting to each period rather than following a fixed doctrine."; }

  return {
    consistency, switches, mixVolatility: vol, riskAversion, overallRate, calmRate, crisisRate, ratio, composure, panicMoves, peakDebt,
    crisisLabel, crisisCount: crisisTurns.length, decarb, networkFit, growthFit, alignment, forecastReliance, eligible, followed,
    signalsAccurate, signalsTotal: TURNS - 1, archetype, archetypeText,
  };
}

export { catSeats };
