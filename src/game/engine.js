import { REGIONS, REGION_IDS } from "../data/gmf.js";
import { ac, allAircraft, FUEL_PRICE } from "./aircraft.js";
import { buildAirlines } from "./airlines.js";
import { EVENTS, EVENT_BY_ID } from "./events.js";

export const START_YEAR = 2025;
export const TURNS = 10;
export const SEGS = ["SH", "LT", "LH"];
export const CATS = ["SA", "LR", "WB"];
export const CAT_SEG = { SA: "SH", LR: "LT", WB: "LH" };
export const yearOf = (turn) => START_YEAR + turn * 5;
export const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));

// Revenue per passenger-seat filled for five years ($M)
export const YIELD = { SH: 1.07, LT: 1.43, LH: 1.79 };
export const SEG_INFO = {
  SH: { name: "Short-haul", long: "short-haul and regional" },
  LT: { name: "Long thin (P2P)", long: "long, thin point-to-point (think secondary transatlantic city pairs)" },
  LH: { name: "Long-haul trunk", long: "long-haul trunk (mega-hub to mega-hub)" },
};
export const STRAT = {
  HUB: { name: "Hub & Spoke", mult: { SH: 1.05, LT: 0.78, LH: 1.22 }, cost: 0.97,
         blurb: "Concentrate traffic through mega-hubs. Maximum volume, 3% lower unit costs and more reach into foreign long-haul markets. Weaker on direct secondary routes." },
  P2P: { name: "Point-to-Point", mult: { SH: 1.0, LT: 1.25, LH: 0.82 }, cost: 1.0,
         blurb: "Fly direct and bypass the hubs. Premium yield (+6%) on long thin routes, weaker on trunk volume." },
};

// Finance (per five-year turn)
export const LEASE_RATE = 0.42;     // rent as a share of aircraft value
export const INTEREST = 0.22;       // on debt (about 4% a year)
export const TAX = 0.25;
export const CREDIT_RATIO = 0.7;    // lenders finance up to 70% of the value of owned and ordered aircraft
export const SWITCH_COST = 0.03;    // of revenue, the turn you change network strategy
export const LEASE_CAP = 0.12;      // new leases per turn, as a share of current fleet
export const CARBON_START = 15;     // $/t
export const CARBON_STEP = 12;      // structural rise per turn

/* ---------- Seeded random scenario ---------------------------------- */

export function hashSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return h >>> 0;
}
export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const randomSeed = () => {
  const words = ["ALPHA", "BRAVO", "CIRRUS", "DELTA", "ECHO", "FOXTROT", "GLIDE", "HORIZON", "JETSTREAM", "KILO", "LIMA", "MISTRAL", "NIMBUS", "ORBIT", "ZEPHYR"];
  return `${words[Math.floor(Math.random() * words.length)]}-${Math.floor(100 + Math.random() * 900)}`;
};

// Same seed, same 50 years: colleagues can compare decisions on an identical scenario
export function buildScenario(seed) {
  const rnd = mulberry32(hashSeed(String(seed).trim().toUpperCase()));
  const ids = EVENTS.map((e) => e.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  const events = ids.slice(0, TURNS);
  const calm = events.findIndex((id) => !EVENT_BY_ID[id].crisis);
  if (calm > 0) [events[0], events[calm]] = [events[calm], events[0]];
  const signals = events.map((_, k) => {
    if (k >= TURNS - 1) return null;
    const truth = events[k + 1];
    if (rnd() < 0.75) return { id: truth, accurate: true };
    const others = EVENTS.filter((e) => e.id !== truth && e.id !== events[k]);
    return { id: others[Math.floor(rnd() * others.length)].id, accurate: false };
  });
  return { events, signals };
}

/* ---------- Demand: GMF baseline plus events ------------------------- */

// GMF gives 2025-2045 growth. Beyond 2045 the game extrapolates: growth fades by 20% per period as markets mature.
export function baseGrowth(r, turn) {
  const taper = turn <= 3 ? 1 : Math.pow(0.8, turn - 3);
  return { sh: Math.max(0.008, REGIONS[r].cagr * taper), long: Math.max(0.01, REGIONS[r].lhCagr * taper) };
}
export function periodGrowth(r, turn, ev) {
  const b = baseGrowth(r, turn);
  const here = !ev.regions || ev.regions.includes(r);
  const sh = b.sh + (ev.all || 0) + (here ? ev.sh || 0 : 0);
  const long = b.long + (ev.all || 0) + (ev.longAll || 0) + (here ? ev.long || 0 : 0);
  return { sh, long, base: b, fsh: Math.pow(1 + sh, 5), flong: Math.pow(1 + long, 5) };
}
// Structural trend: long thin routes take a growing part of long-haul
export const ltShare = (turn, ev) => clamp(0.3 + 0.03 * turn + (ev.lt || 0), 0.1, 0.7);

export function periodDemand(market, turn, ev) {
  const D = {}, growth = {}, next = {};
  const lt = ltShare(turn, ev);
  REGION_IDS.forEach((r) => {
    const g = periodGrowth(r, turn, ev);
    const sh = market[r].sh * g.fsh, long = market[r].long * g.flong;
    D[r] = { SH: sh, LT: long * lt, LH: long * (1 - lt) };
    next[r] = { sh, long };
    growth[r] = g;
  });
  return { D, growth, next, lt };
}

/* ---------- World set-up --------------------------------------------- */

export const seatsOf = (fleet) => fleet.reduce((s, c) => s + c.count * ac(c.type).seats, 0);
export const countOf = (fleet) => fleet.reduce((s, c) => s + c.count, 0);
export const fleetValue = (a, turn) =>
  a.fleet.reduce((s, c) => s + (c.leased ? 0 : c.count * ac(c.type).price * Math.max(0.1, 1 - 0.14 * Math.max(0, turn - c.gen))), 0) +
  a.pending.reduce((s, p) => s + p.count * ac(p.type).price, 0);
export const creditLimit = (a, turn) => CREDIT_RATIO * fleetValue(a, turn);
export const fundsOf = (a, turn) => a.cash + creditLimit(a, turn);
// An order is itself collateral, so each $1 of free funds supports 1 / (1 - 0.7) dollars of orders
export const orderCapacity = (a, turn) => Math.max(0, fundsOf(a, turn)) / (1 - CREDIT_RATIO);

export function initWorld() {
  const airlines = buildAirlines();
  const market = {};
  REGION_IDS.forEach((r) => {
    let seats = 0, long = 0;
    airlines.filter((a) => a.region === r).forEach((a) => a.fleet.forEach((c) => {
      const A = ac(c.type), n = c.count * A.seats;
      seats += n;
      long += n * (A.cat === "WB" ? 1 : A.cat === "LR" ? 0.8 : 0);
    }));
    // 2025 demand is set so that, after the first period of GMF growth, the existing fleets fly about 84% full
    market[r] = { sh: 0.75 * (seats - long), long: 0.75 * long };
  });
  airlines.forEach((a) => { a.cash = 0.08 * fleetValue(a, 0); });
  return { airlines, market, carbonPrice: CARBON_START };
}

/* ---------- Market simulation ---------------------------------------- */

export function simulate(airlines, D, ev, cp, turn) {
  const mk = {};
  REGION_IDS.forEach((r) => SEGS.forEach((s) => { mk[r + s] = { r, s, S: 0, C: 0, rows: [] }; }));
  const foreignShare = (a) => (a.strategy === "HUB" ? 0.32 : 0.2) + (a.region === "ME" ? 0.2 : 0);

  const acc = airlines.map((a) => {
    const st = STRAT[a.strategy], Dh = D[a.region];
    const tot = Dh.SH + Dh.LT + Dh.LH;
    const w = { SH: Dh.SH / tot, LT: Dh.LT / tot, LH: Dh.LH / tot };
    const o = { seats: 0, count: 0, fuel: 0, nonFuel: 0, co2: 0, lease: 0, dep: 0,
                seg: { SH: { S: 0, E: 0, C: 0 }, LT: { S: 0, E: 0, C: 0 }, LH: { S: 0, E: 0, C: 0 } } };
    a.fleet.forEach((c) => {
      const A = ac(c.type);
      if (!A || !c.count) return;
      const n = c.count * A.seats, age = Math.max(0, turn - c.gen), ageF = 1 + 0.01 * age;
      const fuel = n * A.fuelL * FUEL_PRICE * ev.fuel * (A.fuelMult || 1) * ageF;
      const co2 = n * A.co2t * ageF;
      const nonFuel = n * A.nonFuel * st.cost * (1 + 0.02 * age);
      const lease = c.leased ? c.count * A.price * LEASE_RATE * Math.max(0.5, 1 - 0.1 * age) : 0;
      const dep = !c.leased && age < 5 ? (c.count * A.price) / 5 : 0;
      const unit = (fuel + nonFuel + co2 * cp * 1e-6 + lease + dep) / n;
      const quality = Math.max(0.8, 1 - 0.03 * age);
      const raw = {};
      let rt = 0;
      // Each aircraft mostly flies the missions it was designed for
      SEGS.forEach((s) => { raw[s] = Math.pow(A.cap[s], 3) * Math.sqrt(w[s]) * st.mult[s] * YIELD[s] * (CAT_SEG[A.cat] === s ? 2.5 : 1); rt += raw[s]; });
      SEGS.forEach((s) => {
        const S = (n * raw[s]) / rt;
        o.seg[s].S += S; o.seg[s].E += S * A.cap[s] * quality; o.seg[s].C += S * unit;
      });
      o.seats += n; o.count += c.count; o.fuel += fuel; o.nonFuel += nonFuel; o.co2 += co2; o.lease += lease; o.dep += dep;
    });
    return o;
  });

  airlines.forEach((a, i) => {
    const o = acc[i], st = STRAT[a.strategy], trans = a.switched ? 0.92 : 1, f = foreignShare(a);
    const put = (r, s, share, home) => {
      const g = o.seg[s], S = g.S * share;
      if (S <= 0) return;
      const m = mk[r + s];
      m.S += S; m.C += g.C * share;
      m.rows.push({ i, S, home, unit: g.C / g.S, E: g.E * share * st.mult[s] * trans * (home ? 1 : 0.6) });
    };
    put(a.region, "SH", 1, true);
    ["LT", "LH"].forEach((s) => {
      put(a.region, s, 1 - f, true);
      const others = REGION_IDS.filter((r) => r !== a.region);
      const tot = others.reduce((x, r) => x + D[r][s], 0) || 1;
      others.forEach((r) => put(r, s, (f * D[r][s]) / tot, false));
    });
  });

  // Industry-wide cost shocks reach the ticket price: 80% of the average carbon bill and of any fuel-price spike
  // is passed on to passengers. Fleets cleaner than average keep the difference; dirtier fleets pay it.
  const allSeats = acc.reduce((s, o) => s + o.seats, 0) || 1;
  const shock = acc.reduce((s, o) => s + o.co2 * cp * 1e-6 + o.fuel * (1 - 1 / ev.fuel), 0) / allSeats;
  const surcharge = { SH: 0.8, LT: 1.2, LH: 1.6 };
  const res = airlines.map(() => ({ pax: 0, revenue: 0, homePax: 0, seg: {} }));
  const regions = {};
  REGION_IDS.forEach((r) => { regions[r] = { total: 0, by: {}, seg: {} }; });
  Object.values(mk).forEach((m) => {
    const avg = m.S ? m.C / m.S : 1;
    let totA = 0;
    m.rows.forEach((x) => { x.A = x.E * Math.pow(avg / x.unit, 1.2); totA += x.A; });
    const Dm = D[m.r][m.s];
    // Fares respond to how tight the market is: overcapacity starts a fare war
    const yAdj = clamp(1 + 0.5 * ((m.S ? Dm / m.S : 1) - 0.86), 0.88, 1.05);
    const seg = { total: 0, by: {}, yAdj };
    m.rows.forEach((x) => {
      const a = airlines[x.i];
      const pax = totA ? Math.min((Dm * x.A) / totA, x.S * 0.94) : 0;
      seg.total += pax; seg.by[a.id] = (seg.by[a.id] || 0) + pax;
      res[x.i].pax += pax;
      res[x.i].revenue += pax * (YIELD[m.s] * ev.yield * yAdj * (m.s === "LT" && a.strategy === "P2P" ? 1.06 : 1) + (0.8 * shock * surcharge[m.s]) / 0.84);
      if (x.home) { res[x.i].homePax += pax; res[x.i].seg[m.s] = { pax, load: pax / x.S }; }
    });
    const R = regions[m.r];
    R.seg[m.s] = seg; R.total += seg.total;
    Object.entries(seg.by).forEach(([id, p]) => { R.by[id] = (R.by[id] || 0) + p; });
  });

  const worldPax = res.reduce((s, r) => s + r.pax, 0) || 1;
  const byId = {};
  let wSeats = 0, wCo2 = 0;
  airlines.forEach((a, i) => {
    const o = acc[i], r = res[i], R = regions[a.region];
    // When demand is short, airlines park aircraft: fuel and part of the other costs follow the flying actually done
    const load = o.seats ? r.pax / o.seats : 0;
    const util = clamp(load / 0.82, 0.75, 1);
    o.fuel *= util; o.co2 *= util; o.nonFuel *= 0.6 + 0.4 * util;
    const carbon = o.co2 * cp * 1e-6;
    const switchCost = a.switched ? SWITCH_COST * r.revenue : 0;
    const opCash = r.revenue - o.fuel - o.nonFuel - carbon - o.lease;
    const interest = Math.max(0, -a.cash) * INTEREST;
    const ebit = opCash - o.dep - switchCost;
    const pretax = ebit - interest;
    const tax = Math.max(0, TAX * pretax);
    const segShare = {}, segLoad = {};
    SEGS.forEach((s) => {
      segShare[s] = R.seg[s].total ? (R.seg[s].by[a.id] || 0) / R.seg[s].total : 0;
      segLoad[s] = r.seg[s] ? r.seg[s].load : 0;
    });
    wSeats += o.seats; wCo2 += o.co2;
    byId[a.id] = {
      seats: o.seats, count: o.count, pax: r.pax, revenue: r.revenue, fuel: o.fuel, nonFuel: o.nonFuel, carbon, lease: o.lease,
      dep: o.dep, switchCost, interest, tax, ebit, net: pretax - tax, cashFlow: opCash - switchCost - interest - tax,
      co2: o.co2, intensity: o.seats ? o.co2 / o.seats : 0, load,
      share: R.total ? (R.by[a.id] || 0) / R.total : 0, worldShare: r.pax / worldPax, segShare, segLoad, strategy: a.strategy,
    };
  });
  return { byId, regions, industryIntensity: wSeats ? wCo2 / wSeats : 0, worldSeats: wSeats };
}

/* ---------- Aircraft choice and AI airlines -------------------------- */

export const canOrder = (A, turn) => !A.legacy && A.eis <= yearOf(turn + 1);
export const canLease = (A, turn) => !A.legacy && A.eis <= yearOf(turn);

// Full cost of a seat for five years: fuel, other operating costs, carbon, and a fifth of the price
export const seatCost = (A, cp, fuel = 1) =>
  A.fuelL * FUEL_PRICE * fuel * (A.fuelMult || 1) + A.nonFuel + A.co2t * cp * 1e-6 + A.price / A.seats / 5;

function bestType(cat, turn, cp, fuel, lease = false) {
  let best = null;
  allAircraft().forEach((A) => {
    if (A.cat !== cat || !(lease ? canLease(A, turn) : canOrder(A, turn))) return;
    const s = seatCost(A, cp, fuel);
    if (!best || s < best.s) best = { A, s };
  });
  return best ? best.A : null;
}

function aiDecide(a, { D, turn, ev, cp, isLast }) {
  let wb = 0, all = 0;
  a.fleet.forEach((c) => { const A = ac(c.type), n = c.count * A.seats; all += n; if (A.cat === "WB") wb += n; });
  const strategy = a.arch === "legacy" ? "HUB" : a.arch === "disrupter" ? "P2P"
    : ev.favors === "HUB" ? "HUB" : ev.favors === "P2P" ? "P2P" : wb / (all || 1) > 0.35 ? "HUB" : "P2P";
  const retire = a.arch === "green" && !ev.crisis;
  const out = { strategy, retire, orders: {}, leases: {}, returns: {} };
  if (isLast) return { ...out, retire: false };
  let now = 0, remain = 0, count = 0;
  a.fleet.forEach((c) => {
    const s = c.count * ac(c.type).seats;
    if (retire && !c.leased && turn - c.gen >= 5) return;
    now += s; count += c.count;
    if (turn + 1 - c.gen < 6) remain += s;
  });
  a.pending.forEach((p) => { remain += p.count * ac(p.type).seats; });
  const gN = baseGrowth(a.region, turn + 1), Dh = D[a.region];
  const L = (Dh.LT + Dh.LH) / (Dh.SH + Dh.LT + Dh.LH);
  const gf = (1 - L) * Math.pow(1 + gN.sh, 5) + L * Math.pow(1 + gN.long, 5);
  const aggr = { legacy: 1, disrupter: 1.04, green: 1.04 }[a.arch] * (ev.crisis && a.arch === "legacy" ? 0.93 : 1);
  const desired = now * gf * clamp((a.lastLoad ?? 0.84) / 0.84, 0.8, 1.2) * aggr;
  const need = Math.max(0, desired - remain);
  const pref = { legacy: { SA: 0.9, LR: 0.5, WB: 1.4 }, disrupter: { SA: 1.2, LR: 1.5, WB: 0.1 }, green: { SA: 1, LR: 1.2, WB: 0.9 } }[a.arch];
  const raw = { SA: Dh.SH * pref.SA, LR: Dh.LT * pref.LR, WB: Dh.LH * pref.WB };
  const rt = raw.SA + raw.LR + raw.WB;
  let cost = 0;
  const plan = [];
  CATS.forEach((cat) => {
    const A = bestType(cat, turn, cp, ev.fuel);
    if (!A) return;
    const n = Math.floor((need * raw[cat]) / rt / A.seats);
    if (n > 0) { plan.push({ A, n }); cost += n * A.price; }
  });
  const k = { legacy: ev.crisis ? 0.25 : 0.5, disrupter: 0.7, green: 0.6 }[a.arch];
  const avail = orderCapacity(a, turn) * k;
  const scale = cost > avail ? avail / cost : 1;
  let got = 0;
  plan.forEach(({ A, n }) => { const m = Math.floor(n * scale); if (m > 0) { out.orders[A.id] = m; got += m * A.seats; } });
  // Short of seats today: lease. Disrupters lean on lessors the most.
  if ((a.lastLoad ?? 0) > 0.9 && !ev.crisis) {
    const A = bestType(a.arch === "legacy" && Dh.LH > Dh.SH ? "WB" : "SA", turn, cp, ev.fuel, true);
    const n = A ? Math.floor(count * (a.arch === "disrupter" ? 0.08 : 0.04) * (170 / A.seats)) : 0;
    if (n > 0) out.leases[A.id] = n;
  }
  return out;
}

/* ---------- Turn resolution ------------------------------------------ */

export function resolveTurn({ airlines, market, carbonPrice, turn, ev, decision, playerId }) {
  const isLast = turn === TURNS - 1;
  const pd = periodDemand(market, turn, ev);
  const cp = carbonPrice + ev.carbonAdd;
  const meta = {};
  const next = airlines.map((a) => {
    const d = a.id === playerId ? decision : aiDecide(a, { D: pd.D, turn, ev, cp, isLast });
    let fleet = a.fleet.map((c) => ({ ...c })), cash = a.cash, retired = 0;
    if (d.retire) {
      const minAge = a.id === playerId ? 4 : 5;
      fleet = fleet.filter((c) => {
        if (c.leased || turn - c.gen < minAge) return true;
        retired += c.count; cash += c.count * ac(c.type).price * 0.08;
        return false;
      });
    }
    Object.entries(d.returns || {}).forEach(([t, n]) => {
      let left = n;
      fleet.filter((c) => c.leased && c.type === t).sort((x, y) => x.gen - y.gen).forEach((c) => { const k = Math.min(left, c.count); c.count -= k; left -= k; });
    });
    fleet = fleet.filter((c) => c.count > 0);
    let leaseBill = 0;
    Object.entries(d.leases || {}).forEach(([t, n]) => { if (n > 0) { fleet.push({ type: t, count: n, gen: turn, leased: true }); leaseBill += n * ac(t).price * LEASE_RATE; } });
    const orders = isLast ? {} : d.orders || {};
    const pending = [...a.pending];
    let spend = 0;
    Object.entries(orders).forEach(([t, n]) => {
      if (n <= 0) return;
      spend += n * ac(t).price;
      const late = ev.delay ? Math.round(n * ev.delay) : 0;
      if (n - late > 0) pending.push({ type: t, count: n - late, due: turn + 1 });
      if (late > 0) pending.push({ type: t, count: late, due: turn + 2 });
    });
    meta[a.id] = { spend, leaseBill, retired, cashBefore: a.cash, fundsBefore: fundsOf(a, turn), orders, leases: d.leases || {}, returns: d.returns || {} };
    return { ...a, strategy: d.strategy, switched: d.strategy !== a.strategy, fleet, pending, cash: cash - spend };
  });
  const sim = simulate(next, pd.D, ev, cp, turn);
  const after = next.map((a) => {
    const cash = a.cash + sim.byId[a.id].cashFlow;
    const b = { ...a, cash, lastLoad: sim.byId[a.id].load };
    b.breach = -cash > creditLimit(b, turn) ? a.breach + 1 : 0;
    return b;
  });
  return { airlines: after, sim, meta, pd, cp };
}

// Start of a new period: deliveries arrive, 30-year-old aircraft leave, insolvent AI airlines restructure
export function advanceAirline(a, newTurn, playerId) {
  let fleet = a.fleet.filter((c) => newTurn - c.gen < 6);
  const pending = [];
  a.pending.forEach((p) => { if (p.due <= newTurn) fleet.push({ type: p.type, count: p.count, gen: newTurn, leased: false }); else pending.push(p); });
  let cash = a.cash, breach = a.breach, restructured = false;
  if (a.id !== playerId && breach >= 2) {
    cash = -0.5 * creditLimit({ fleet, pending }, newTurn); // creditors take a haircut, the airline keeps flying
    breach = 0; restructured = true;
  }
  return { ...a, fleet, pending, cash, breach, restructured, switched: false };
}

export { EVENT_BY_ID };
