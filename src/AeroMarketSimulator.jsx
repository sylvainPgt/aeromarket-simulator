import React, { useState, useEffect, useMemo } from "react";
import {
  Plane, Globe, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Leaf, BarChart3,
  ChevronRight, Share2, ArrowLeftRight, Users, Flame, Zap, Shield, Target, Activity,
  Brain, RotateCcw, Check, Minus, Plus, Clock, Package, Trophy, Info, Copy, Radar,
  Building2, Lock, Eye, Sun, Scale, HeartPulse, Lightbulb,
} from "lucide-react";

/* =====================================================================
   AeroMarket Simulator: The GMF Challenge
   Single-file React app (Tailwind CSS + lucide-react).
   1 turn = 5 years, 2025 -> 2075 (10 turns).
   ===================================================================== */

const TEAL = "#00b4b4";
const PINK = "#d30068";
const NAVY = "#1a2942";
const START_YEAR = 2025;
const TURNS = 10;
const SEG_KEYS = ["SH", "LT", "LH"];
const TYPE_KEYS = ["SA", "LR", "WB"];
const AI_IDS = ["legacy", "disrupter", "green"];

/* ---------- Game data ------------------------------------------------ */

const TYPES = {
  SA: { name: "Single-Aisle", short: "SA", seats: 180, price: 50, opCost: 0.31, carbon: 1.0, seg: "SH",
        blurb: "Short-haul workhorse. Cheap and flexible, but it cannot cross oceans." },
  LR: { name: "Long-Range Single-Aisle", short: "LR-SA", seats: 200, price: 78, opCost: 0.32, carbon: 1.08, seg: "LT",
        blurb: "Opens long, thin direct routes that bypass hubs. The point-to-point enabler." },
  WB: { name: "Wide-Body", short: "WB", seats: 330, price: 175, opCost: 0.3, carbon: 1.4, seg: "LH",
        blurb: "High volume on long-haul trunk routes between mega-hubs. Expensive and carbon-heavy." },
};

const SEGS = {
  SH: { name: "Short-haul", long: "short-haul and regional", yield: 0.48 },
  LT: { name: "Long thin (P2P)", long: "long, thin point-to-point (think secondary transatlantic city pairs)", yield: 0.62 },
  LH: { name: "Long-haul trunk", long: "long-haul trunk (mega-hub to mega-hub)", yield: 0.57 },
};

// How well each aircraft type serves each market segment (0..1)
const CAP = {
  SA: { SH: 1, LT: 0.12, LH: 0 },
  LR: { SH: 0.85, LT: 1, LH: 0.3 },
  WB: { SH: 0.15, LT: 0.5, LH: 1 },
};

const STRAT = {
  HUB: { name: "Hub & Spoke", mult: { SH: 1.05, LT: 0.78, LH: 1.22 }, cost: 0.96,
         blurb: "Concentrate traffic through mega-hubs. Maximum volume and 4% lower unit costs, weaker on direct secondary routes." },
  P2P: { name: "Point-to-Point", mult: { SH: 1.0, LT: 1.25, LH: 0.82 }, cost: 1.0,
         blurb: "Fly direct and bypass the hubs. Premium yield (+6%) on long thin routes, weaker on trunk volume." },
};

const EVENTS = [
  { id: "asia_boom", title: "Asian Middle-Class Boom", tag: "Growth", icon: TrendingUp, region: "asia",
    desc: "High economic growth in Asia creates hundreds of new city pairs. Travellers want direct flights, driving point-to-point demand.",
    cagr: 5.2, d: { SH: -0.03, LT: 0.08, LH: -0.05 }, fuel: 1, carbonAdd: 0, yield: 1.02, crisis: false, favors: "P2P", fav: "LR" },
  { id: "carbon_tax", title: "New Global Carbon Tax", tag: "Regulation", icon: Scale, region: "global",
    desc: "A worldwide carbon price is implemented and it will not go away. Old, fuel-hungry aircraft become a liability on every flight.",
    cagr: 2.4, d: { SH: 0, LT: 0, LH: 0 }, fuel: 1.05, carbonAdd: 0.02, yield: 1, crisis: false, favors: "GREEN", fav: null },
  { id: "fuel_crisis", title: "Fuel Crisis", tag: "Crisis", icon: Flame, region: "mideast",
    desc: "Supply shocks send jet fuel prices up by 70%. Efficient fleets hold their fares; ageing fleets bleed cash and customers.",
    cagr: 1.2, d: { SH: 0.02, LT: 0, LH: -0.02 }, fuel: 1.7, carbonAdd: 0, yield: 1.03, crisis: true, favors: "GREEN", fav: null },
  { id: "megahub", title: "Mega-City Hub Expansion", tag: "Infrastructure", icon: Building2, region: "mideast",
    desc: "New six-runway hubs open in the Gulf and Asia while secondary airports hit slot limits. Volume flows through the mega-hubs.",
    cagr: 4.0, d: { SH: -0.02, LT: -0.05, LH: 0.07 }, fuel: 1, carbonAdd: 0, yield: 1, crisis: false, favors: "HUB", fav: "WB" },
  { id: "pandemic", title: "Global Health Emergency", tag: "Crisis", icon: HeartPulse, region: "global",
    desc: "Borders close for months and long-haul travel collapses. Domestic and regional flying recovers first.",
    cagr: -2.5, d: { SH: 0.08, LT: -0.02, LH: -0.06 }, fuel: 0.9, carbonAdd: 0, yield: 0.9, crisis: true, favors: "NEUTRAL", fav: null },
  { id: "open_skies", title: "Open Skies Wave", tag: "Liberalisation", icon: Globe, region: "atlantic",
    desc: "Bilateral restrictions fall across the Atlantic and Africa. Any airline may fly any city pair, and new entrants rush in.",
    cagr: 4.4, d: { SH: -0.02, LT: 0.06, LH: -0.04 }, fuel: 1, carbonAdd: 0, yield: 0.98, crisis: false, favors: "P2P", fav: "LR" },
  { id: "recession", title: "Global Recession", tag: "Crisis", icon: TrendingDown, region: "namerica",
    desc: "A financial shock freezes corporate travel budgets. Demand stalls and fares fall across every market.",
    cagr: 0.4, d: { SH: 0.02, LT: -0.01, LH: -0.01 }, fuel: 0.95, carbonAdd: 0, yield: 0.92, crisis: true, favors: "NEUTRAL", fav: null },
  { id: "saf", title: "Sustainable Fuel Mandate", tag: "Regulation", icon: Leaf, region: "europe",
    desc: "Regulators require a rising blend of sustainable aviation fuel. Carbon costs step up permanently for every operator.",
    cagr: 3.4, d: { SH: 0, LT: 0.01, LH: -0.01 }, fuel: 1.12, carbonAdd: 0.012, yield: 1.01, crisis: false, favors: "GREEN", fav: null },
  { id: "tourism", title: "Leisure Travel Super-Cycle", tag: "Growth", icon: Sun, region: "europe",
    desc: "A new generation spends on experiences. Short-haul leisure routes boom, and volume beats premium.",
    cagr: 4.8, d: { SH: 0.07, LT: -0.02, LH: -0.05 }, fuel: 1, carbonAdd: 0, yield: 0.99, crisis: false, favors: "NEUTRAL", fav: "SA" },
  { id: "hsr", title: "High-Speed Rail Displacement", tag: "Disruption", icon: Zap, region: "europe",
    desc: "Rail networks and short-flight bans remove air demand under 800 km. Growth shifts to longer sectors.",
    cagr: 2.8, d: { SH: -0.09, LT: 0.04, LH: 0.05 }, fuel: 1, carbonAdd: 0.004, yield: 1, crisis: false, favors: "HUB", fav: "WB" },
  { id: "geopolitics", title: "Airspace Fragmentation", tag: "Crisis", icon: Shield, region: "asia",
    desc: "Geopolitical blocs close airspace corridors. Connecting itineraries through contested hubs become longer and riskier.",
    cagr: 1.6, d: { SH: 0.01, LT: 0.05, LH: -0.06 }, fuel: 1.25, carbonAdd: 0, yield: 1, crisis: true, favors: "P2P", fav: "LR" },
  { id: "steady", title: "Steady Global Growth", tag: "Baseline", icon: Activity, region: "global",
    desc: "No shocks on the horizon. Traffic follows long-run GDP growth across all regions.",
    cagr: 3.6, d: { SH: 0, LT: 0, LH: 0 }, fuel: 1, carbonAdd: 0, yield: 1, crisis: false, favors: "NEUTRAL", fav: null },
];
const EVENT_BY_ID = Object.fromEntries(EVENTS.map((e) => [e.id, e]));

const AIRLINE_META = {
  player: { name: "Your airline", color: TEAL, profile: "You" },
  legacy: { name: "The Legacy", color: PINK, profile: "Hub & Spoke, heavy Wide-Body fleet" },
  disrupter: { name: "The Disrupter", color: "#ffffff", profile: "Point-to-Point, LR-SA fleet" },
  green: { name: "The Green Agile", color: "#94a3b8", profile: "Adaptive, retires old aircraft, mixed fleet" },
};

/* ---------- Helpers --------------------------------------------------- */

const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const clamp = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));
const zeroOrders = () => ({ SA: 0, LR: 0, WB: 0 });
const yearOf = (turn) => START_YEAR + turn * 5;
const money = (m) => {
  const sign = m < 0 ? "−" : "";
  const a = Math.abs(m);
  return a >= 1000 ? `${sign}$${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}B` : `${sign}$${Math.round(a)}M`;
};
const carbonPriceLabel = (p) => `$${Math.round(p * 5000)}/t`;
const orderCost = (o) => TYPE_KEYS.reduce((s, t) => s + o[t] * TYPES[t].price, 0);
const fleetSeats = (fleet) => fleet.reduce((s, c) => s + c.count * TYPES[c.type].seats, 0);
const fleetCount = (fleet) => fleet.reduce((s, c) => s + c.count, 0);
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

/* ---------- Simulation engine ---------------------------------------- */

function buildScenario() {
  const events = shuffle(EVENTS).slice(0, TURNS);
  const firstCalm = events.findIndex((e) => !e.crisis);
  if (firstCalm > 0) [events[0], events[firstCalm]] = [events[firstCalm], events[0]];
  // Early signal about the NEXT period: right 3 times out of 4
  const signals = events.map((_, k) => {
    if (k >= TURNS - 1) return null;
    const truth = events[k + 1];
    if (Math.random() < 0.75) return { id: truth.id, accurate: true };
    const others = EVENTS.filter((e) => e.id !== truth.id && e.id !== events[k].id);
    return { id: others[Math.floor(Math.random() * others.length)].id, accurate: false };
  });
  return { events, signals };
}

function initAirlines() {
  const split = (n, type) =>
    [{ type, count: Math.round(n * 0.6), gen: -1 }, { type, count: n - Math.round(n * 0.6), gen: -3 }].filter((c) => c.count > 0);
  const mk = (id, strategy, sa, lr, wb) => ({
    id, strategy, budget: 2000, pending: zeroOrders(),
    fleet: [...split(sa, "SA"), ...split(lr, "LR"), ...split(wb, "WB")],
  });
  return [mk("player", "HUB", 40, 10, 18), mk("legacy", "HUB", 28, 4, 28), mk("disrupter", "P2P", 36, 38, 0), mk("green", "P2P", 40, 14, 14)];
}

// Structural trend: long thin P2P routes slowly take share from the other segments
function segWeights(turn, ev) {
  const w = { SH: 0.5 - 0.008 * turn + ev.d.SH, LT: 0.18 + 0.012 * turn + ev.d.LT, LH: 0.32 - 0.004 * turn + ev.d.LH };
  const t = w.SH + w.LT + w.LH;
  return { SH: w.SH / t, LT: w.LT / t, LH: w.LH / t };
}

// Fuel burn: each new generation burns ~5.5% less; airframes degrade slightly with age
const burnOf = (c, turn) => Math.max(0.5, 1 - 0.055 * c.gen) * (1 + 0.015 * Math.max(0, turn - c.gen));

function simulate(airlines, ev, w, demand, carbonPrice, turn) {
  const pre = airlines.map((a) => {
    const st = STRAT[a.strategy];
    const seg = { SH: { S: 0, E: 0 }, LT: { S: 0, E: 0 }, LH: { S: 0, E: 0 } };
    let seats = 0, cost = 0, carbon = 0;
    a.fleet.forEach((c) => {
      const T = TYPES[c.type];
      const n = c.count * T.seats;
      if (!n) return;
      const quality = Math.max(0.8, 1 - 0.03 * Math.max(0, turn - c.gen));
      const burn = burnOf(c, turn);
      const raw = {};
      let tot = 0;
      SEG_KEYS.forEach((s) => { raw[s] = CAP[c.type][s] * w[s] * st.mult[s] * SEGS[s].yield; tot += raw[s]; });
      SEG_KEYS.forEach((s) => {
        const al = raw[s] / tot;
        seg[s].S += n * al;
        seg[s].E += n * al * CAP[c.type][s] * quality;
      });
      seats += n;
      cost += n * T.opCost * (0.68 + 0.32 * ev.fuel * burn) * st.cost;
      carbon += n * T.carbon * burn;
    });
    const tax = carbon * carbonPrice;
    return { seg, seats, cost, carbon, tax, unit: seats ? (cost + tax) / seats : 0 };
  });
  const flying = pre.filter((p) => p.seats > 0);
  const avgUnit = flying.reduce((s, p) => s + p.unit, 0) / Math.max(1, flying.length);
  // Attractiveness = effective capacity x network fit x price competitiveness
  const attr = pre.map((p, i) => {
    const st = STRAT[airlines[i].strategy];
    const price = p.seats ? Math.pow(avgUnit / p.unit, 1.5) : 0;
    const o = {};
    SEG_KEYS.forEach((s) => { o[s] = p.seg[s].E * st.mult[s] * price; });
    return o;
  });
  const pax = pre.map(() => ({ SH: 0, LT: 0, LH: 0 }));
  SEG_KEYS.forEach((s) => {
    const tot = attr.reduce((x, a) => x + a[s], 0) || 1;
    pre.forEach((p, i) => { pax[i][s] = Math.min((demand * w[s] * attr[i][s]) / tot, p.seg[s].S * 0.94); });
  });
  const segTot = {};
  SEG_KEYS.forEach((s) => { segTot[s] = pax.reduce((x, p) => x + p[s], 0) || 1; });
  const allPax = SEG_KEYS.reduce((x, s) => x + segTot[s], 0) || 1;
  const byId = {};
  airlines.forEach((a, i) => {
    const p = pre[i];
    const total = SEG_KEYS.reduce((x, s) => x + pax[i][s], 0);
    const revenue = SEG_KEYS.reduce(
      (x, s) => x + pax[i][s] * SEGS[s].yield * ev.yield * (s === "LT" && a.strategy === "P2P" ? 1.06 : 1), 0);
    const segShare = {}, segLoad = {};
    SEG_KEYS.forEach((s) => { segShare[s] = pax[i][s] / segTot[s]; segLoad[s] = p.seg[s].S ? pax[i][s] / p.seg[s].S : 0; });
    byId[a.id] = {
      seats: p.seats, cost: p.cost, tax: p.tax, carbon: p.carbon, unit: p.unit, pax: total, revenue,
      profit: revenue - p.cost - p.tax, share: total / allPax, segShare, segLoad,
      load: p.seats ? total / p.seats : 0, intensity: p.seats ? p.carbon / p.seats : 0, strategy: a.strategy,
    };
  });
  const totSeats = pre.reduce((s, p) => s + p.seats, 0) || 1;
  return { byId, avgUnit, w, industryIntensity: pre.reduce((s, p) => s + p.carbon, 0) / totSeats, industrySeats: totSeats };
}

function aiDecide(a, ev, w) {
  let strategy = a.strategy, mix, spend, retireAge = null;
  if (a.id === "legacy") { strategy = "HUB"; mix = { SA: 0.25, LR: 0.1, WB: 0.65 }; spend = ev.crisis ? 0.6 : 0.95; }
  else if (a.id === "disrupter") { strategy = "P2P"; mix = { SA: 0.4, LR: 0.6, WB: 0 }; spend = ev.crisis ? 0.85 : 0.97; }
  else {
    strategy = ev.favors === "HUB" ? "HUB" : ev.favors === "P2P" ? "P2P" : w.LH > w.LT * 1.5 ? "HUB" : "P2P";
    const raw = { SA: w.SH, LR: w.LT * 1.3, WB: w.LH * 0.9 };
    const t = raw.SA + raw.LR + raw.WB;
    mix = { SA: raw.SA / t, LR: raw.LR / t, WB: raw.WB / t };
    spend = ev.crisis ? 0.8 : 0.95;
    retireAge = 4;
  }
  const cash = Math.max(0, a.budget) * spend;
  const orders = zeroOrders();
  TYPE_KEYS.forEach((t) => { orders[t] = Math.floor((cash * mix[t]) / TYPES[t].price); });
  return { strategy, orders, retireAge };
}

function resolveTurn({ airlines, turn, ev, w, demand, carbonPrice, decision }) {
  const isLast = turn === TURNS - 1;
  const meta = {};
  const next = airlines.map((a) => {
    const d = a.id === "player"
      ? { strategy: decision.strategy, orders: decision.orders, retireAge: decision.retire ? 4 : null }
      : aiDecide(a, ev, w);
    let fleet = a.fleet, budget = a.budget, retired = 0;
    if (d.retireAge != null) {
      fleet.filter((c) => turn - c.gen >= d.retireAge).forEach((c) => { retired += c.count; budget += c.count * TYPES[c.type].price * 0.06; });
      fleet = fleet.filter((c) => turn - c.gen < d.retireAge);
    }
    const orders = isLast ? zeroOrders() : d.orders;
    const spend = orderCost(orders);
    meta[a.id] = { spend, retired, budgetBefore: a.budget, orders };
    return { ...a, strategy: d.strategy, fleet, budget: budget - spend, pending: orders };
  });
  const sim = simulate(next, ev, w, demand, carbonPrice, turn);
  const after = next.map((a) => ({ ...a, budget: a.budget + sim.byId[a.id].profit }));
  return { airlines: after, sim, meta };
}

// Start of a new period: deliveries arrive, 30-year-old aircraft leave, debt costs interest
function advanceAirline(a, newTurn) {
  const fleet = a.fleet.filter((c) => newTurn - c.gen < 6);
  TYPE_KEYS.forEach((t) => { if (a.pending[t] > 0) fleet.push({ type: t, count: a.pending[t], gen: newTurn }); });
  return { ...a, fleet, pending: zeroOrders(), budget: a.budget < 0 ? a.budget * 1.15 : a.budget };
}

/* ---------- Insight generator ---------------------------------------- */

function buildInsight({ sim, prev, ev, turn, meta, isLast }) {
  const me = sim.byId.player, before = prev.player;
  const delta = me.share - before.share;
  const losing = delta < 0;
  let seg = null;
  SEG_KEYS.forEach((s) => {
    const d = (me.segShare[s] - before.segShare[s]) * sim.w[s];
    if (!seg || (losing ? d < seg.d : d > seg.d)) seg = { s, d };
  });
  const s = seg.s;
  let rival = null;
  AI_IDS.forEach((id) => {
    const d = sim.byId[id].segShare[s] - prev[id].segShare[s];
    if (!rival || (losing ? d > rival.d : d < rival.d)) rival = { id, d };
  });
  const rivalName = AIRLINE_META[rival.id].name;
  const segPts = Math.abs((me.segShare[s] - before.segShare[s]) * 100).toFixed(1);
  const costGap = sim.avgUnit ? me.unit / sim.avgUnit - 1 : 0;
  const pressure = ev.carbonAdd > 0 ? "the new carbon charges" : ev.fuel > 1.15 ? "high fuel prices" : "current cost conditions";
  const typeNeeded = { SH: "Single-Aisle", LT: "Long-Range Single-Aisle", LH: "Wide-Body" }[s];
  let reason;
  if (losing) {
    if (me.segLoad[s] >= 0.935) reason = `you ran out of seats: your aircraft were full while demand kept growing, and new orders take five years to arrive`;
    else if (s === "LT" && me.strategy === "HUB") reason = `your Hub & Spoke strategy lacked the required Point-to-Point agility`;
    else if (s === "LH" && me.strategy === "P2P") reason = `your Point-to-Point network could not match the feed and scale of its mega-hub operation`;
    else if (costGap > 0.025) reason = `your older, thirstier fleet carried a ${(costGap * 100).toFixed(0)}% unit-cost handicap under ${pressure}, and that showed up in your fares`;
    else if (meta.player.retired > 0) reason = `you retired ${meta.player.retired} aircraft before their replacements were in service`;
    else reason = `your active fleet lacked enough ${typeNeeded} capacity where the demand appeared`;
  } else {
    if (s === "LT" && me.strategy === "P2P") reason = `your Point-to-Point network offered the direct routes this market rewarded`;
    else if (s === "LH" && me.strategy === "HUB") reason = `your Hub & Spoke network funnelled volume through mega-hubs more efficiently`;
    else if (costGap < -0.025) reason = `your younger, more efficient fleet gave you a ${Math.abs(costGap * 100).toFixed(0)}% unit-cost advantage under ${pressure}`;
    else if (sim.byId[rival.id].segLoad[s] >= 0.935) reason = `it ran out of seats while your deliveries arrived on time`;
    else reason = `your active ${typeNeeded} capacity was in place where the demand appeared`;
  }
  const lines = [];
  if (Math.abs(delta) < 0.003) {
    lines.push(`Your overall market share held steady at ${pct(me.share)}. The biggest movement was on ${SEGS[s].long} routes, where ${losing ? `${rivalName} gained on you` : `you gained on ${rivalName}`} because ${reason}.`);
  } else if (losing) {
    lines.push(`${rivalName} stole your ${SEGS[s].long} market share (${segPts} points in that segment) because ${reason}.`);
  } else {
    lines.push(`You took ${SEGS[s].long} market share from ${rivalName} (${segPts} points in that segment) because ${reason}.`);
  }
  const margin = me.revenue ? me.profit / me.revenue : 0;
  if (me.load < 0.72) lines.push(`Your load factor was only ${pct(me.load, 0)}: you flew too many empty seats, which dragged your margin to ${pct(margin)}.`);
  else if (me.load >= 0.93) lines.push(`Your aircraft flew full (${pct(me.load, 0)} load factor). That protected a ${pct(margin)} margin, but you left unserved demand to competitors.`);
  else if (me.revenue && me.tax / me.revenue > 0.05) lines.push(`Carbon charges consumed ${pct(me.tax / me.revenue)} of your revenue, leaving a ${pct(margin)} margin.`);
  else if (ev.fuel > 1.2) lines.push(`Fuel costs rose sharply across the industry; your margin ended at ${pct(margin)}.`);
  else lines.push(`Your operating margin for the period was ${pct(margin)} at a ${pct(me.load, 0)} load factor.`);
  const ordered = TYPE_KEYS.reduce((x, t) => x + meta.player.orders[t], 0);
  if (!isLast) {
    lines.push(ordered > 0
      ? `The ${ordered} aircraft you ordered enter service in ${yearOf(turn + 1)}, so they will face the next market, not this one.`
      : `You ordered no aircraft, so your ${yearOf(turn + 1)} fleet will be smaller and older than today's.`);
  }
  return lines;
}

/* ---------- Behavioral analytics ------------------------------------- */

function computeAnalytics(history, scenario) {
  const n = history.length;
  const seatMix = (o) => {
    const tot = TYPE_KEYS.reduce((s, t) => s + o[t] * TYPES[t].seats, 0);
    return tot ? TYPE_KEYS.map((t) => (o[t] * TYPES[t].seats) / tot) : null;
  };
  // 1. Consistency
  const switches = history.filter((h) => h.switched).length;
  const mixes = history.map((h) => seatMix(h.orders)).filter(Boolean);
  let vol = 0;
  for (let i = 1; i < mixes.length; i++) vol += mixes[i].reduce((s, v, k) => s + Math.abs(v - mixes[i - 1][k]), 0) / 2;
  vol = mixes.length > 1 ? vol / (mixes.length - 1) : 0;
  const consistency = clamp(100 - 55 * (switches / Math.max(1, n - 1)) - 45 * vol);

  // 2. Risk aversion and crisis behaviour (last turn excluded: no orders possible)
  const invest = history.filter((h) => h.turn < TURNS - 1 && h.budgetBefore > 0);
  const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
  const calmRate = avg(invest.filter((h) => !h.crisis).map((h) => h.investRate));
  const crisisRate = avg(invest.filter((h) => h.crisis).map((h) => h.investRate));
  const overallRate = avg(invest.map((h) => h.investRate)) ?? 0;
  const crisisTurns = history.filter((h) => h.crisis);
  const panicMoves = crisisTurns.filter((h) => h.switched).length + crisisTurns.filter((h) => h.retire).length;
  const ratio = calmRate && crisisRate != null ? crisisRate / calmRate : null;
  const composure = ratio == null ? null : clamp(100 * Math.min(1, ratio) - 12 * panicMoves);
  const riskAversion = clamp(100 * (1 - overallRate));
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
  const tot = TYPE_KEYS.reduce((s, t) => s + last.fleetSeatsByType[t], 0) || 1;
  const fit = 1 - 0.5 * TYPE_KEYS.reduce((s, t) => s + Math.abs(last.fleetSeatsByType[t] / tot - last.w[TYPES[t].seg]), 0);
  const networkFit = clamp(fit * 100);
  const demandGrowth = last.demand / first.demandStart;
  const capGrowth = last.seats / first.seatsStart;
  const growthFit = clamp((capGrowth / demandGrowth) * 100);
  const alignment = (decarb + networkFit + growthFit) / 3;

  // 4. Reliance on forecasts: did orders follow the early signal?
  let eligible = 0, followed = 0;
  history.forEach((h) => {
    if (!h.signalId) return;
    const fav = EVENT_BY_ID[h.signalId].fav;
    const mix = seatMix(h.orders);
    if (!fav || !mix) return;
    eligible++;
    const top = TYPE_KEYS[mix.indexOf(Math.max(...mix))];
    if (top === fav) followed++;
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
    consistency, switches, mixVolatility: vol, riskAversion, overallRate, calmRate, crisisRate, ratio, composure, panicMoves,
    crisisLabel, crisisCount: crisisTurns.length, decarb, networkFit, growthFit, alignment, forecastReliance, eligible, followed,
    signalsAccurate, signalsTotal: TURNS - 1, archetype, archetypeText,
  };
}

/* ---------- Small UI pieces ------------------------------------------ */

const GlobalStyle = () => (
  <style>{`
    .aero-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .aero-display { font-family: 'Space Grotesk', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
    .aero-num { font-variant-numeric: tabular-nums; }
    @keyframes aeroIn { from { opacity: .0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
    .aero-in { animation: aeroIn .45s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes aeroDrift { from { transform: translateX(-12%); } to { transform: translateX(12%); } }
    .aero-cloud { animation: aeroDrift 26s ease-in-out infinite alternate; }
    @keyframes aeroPulse { 0% { r: 3; opacity: .9; } 100% { r: 16; opacity: 0; } }
    .aero-pulse { animation: aeroPulse 1.8s ease-out infinite; }
    @media (prefers-reduced-motion: reduce) { .aero-in, .aero-cloud, .aero-pulse { animation: none; } }
  `}</style>
);

// CSS-only "photo": sky, sun glow and drifting clouds
const Sky = ({ className = "", children, variant = "day" }) => {
  const bg = {
    day: "linear-gradient(135deg,#1a2942 0%,#1c4f73 42%,#00b4b4 100%)",
    dusk: "linear-gradient(135deg,#1a2942 0%,#5b2a63 55%,#d30068 100%)",
    hub: "linear-gradient(160deg,#1a2942 10%,#23527a 60%,#00b4b4 130%)",
    p2p: "linear-gradient(160deg,#1a2942 10%,#6a2560 70%,#d30068 130%)",
  }[variant];
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: bg }}>
      <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/20 blur-3xl" />
      <div className="aero-cloud pointer-events-none absolute left-[8%] top-[58%] h-10 w-56 rounded-full bg-white/25 blur-xl" />
      <div className="aero-cloud pointer-events-none absolute left-[45%] top-[20%] h-8 w-72 rounded-full bg-white/15 blur-xl" />
      <div className="aero-cloud pointer-events-none absolute left-[62%] top-[72%] h-12 w-64 rounded-full bg-white/20 blur-2xl" />
      <div className="relative">{children}</div>
    </div>
  );
};

const Tag = ({ children, tone = "pink" }) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
    tone === "pink" ? "bg-[#d30068] text-white" : tone === "teal" ? "bg-[#00b4b4] text-[#0c1a2e]" : "bg-white/10 text-white"}`}>
    {children}
  </span>
);

const NavyCard = ({ children, className = "" }) => (
  <div className={`rounded-2xl bg-[#1a2942] p-5 text-white shadow-lg shadow-slate-900/10 ${className}`}>{children}</div>
);

const Kpi = ({ icon: Icon, label, value, sub, accent = "teal" }) => (
  <NavyCard className="min-w-0">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300">
      <Icon size={15} className={accent === "teal" ? "text-[#00b4b4]" : "text-[#ff4d9d]"} />
      <span className="truncate">{label}</span>
    </div>
    <div className="aero-display aero-num mt-2 text-2xl font-semibold transition-all duration-500">{value}</div>
    <div className="mt-1 truncate text-xs text-slate-300">{sub}</div>
  </NavyCard>
);

const PrimaryButton = ({ children, onClick, disabled, id }) => (
  <button id={id} onClick={onClick} disabled={disabled}
    className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00b4b4] px-6 py-3 text-sm font-semibold text-[#0c1a2e] shadow-md shadow-teal-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#12c9c9] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0">
    {children}
  </button>
);

const Meter = ({ value, color = TEAL }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${clamp(value)}%`, background: color }} />
  </div>
);

/* ---------- World map (teal ocean, magenta land) ---------------------- */

const LAND = [
  [-105, 52, 30, 16], [-98, 32, 15, 9], [-150, 63, 12, 6], [-88, 16, 7, 5], [-42, 72, 11, 7],
  [-60, -8, 14, 13], [-66, -34, 7, 15], [14, 50, 19, 9], [18, 63, 8, 7], [-3, 54, 3, 4],
  [14, 14, 20, 15], [25, -16, 11, 15], [47, -19, 2, 5], [92, 56, 50, 14], [84, 36, 30, 11],
  [78, 18, 7, 9], [104, 13, 7, 9], [48, 25, 10, 8], [116, -3, 14, 4], [138, 37, 3, 6],
  [134, -25, 16, 9], [173, -42, 3, 5],
];
const MAP_DOTS = (() => {
  const dots = [];
  for (let lat = 78; lat >= -54; lat -= 5.5) {
    for (let lon = -174; lon <= 178; lon += 5.5) {
      if (LAND.some(([cx, cy, rx, ry]) => ((lon - cx) / rx) ** 2 + ((lat - cy) / ry) ** 2 <= 1)) dots.push([lon, lat]);
    }
  }
  return dots;
})();
const HOTSPOTS = {
  asia: [[105, 30], [78, 20], [120, 5]], europe: [[10, 49]], namerica: [[-95, 40]], mideast: [[50, 25]],
  atlantic: [[-40, 42], [-10, 20]], global: [[-95, 40], [10, 49], [105, 30], [-58, -15], [25, -5]],
};
const px = (lon) => ((lon + 180) / 360) * 720;
const py = (lat) => ((82 - lat) / 140) * 280;

const WorldMap = ({ region }) => (
  <svg viewBox="0 0 720 280" className="block w-full rounded-xl" role="img" aria-label="World demand map">
    <rect x="0" y="0" width="720" height="280" fill={TEAL} />
    {MAP_DOTS.map(([lon, lat], i) => <circle key={i} cx={px(lon)} cy={py(lat)} r="3.6" fill={PINK} />)}
    {(HOTSPOTS[region] || []).map(([lon, lat], i) => (
      <g key={i}>
        <circle className="aero-pulse" cx={px(lon)} cy={py(lat)} r="3" fill="none" stroke="#ffffff" strokeWidth="2" />
        <circle cx={px(lon)} cy={py(lat)} r="5" fill="#ffffff" stroke={NAVY} strokeWidth="2" />
      </g>
    ))}
  </svg>
);

/* ---------- Market-share history chart -------------------------------- */

const ShareChart = ({ history }) => {
  const W = 640, H = 220, L = 38, R = 118, T = 14, B = 26;
  const ids = ["player", ...AI_IDS];
  const max = Math.max(0.4, ...history.flatMap((h) => ids.map((id) => h.shares[id]))) + 0.04;
  const x = (i) => L + (history.length === 1 ? 0 : (i / (TURNS - 1)) * (W - L - R));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const dash = { player: "", legacy: "", disrupter: "5 4", green: "2 4" };
  const ticks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].filter((t) => t <= max);
  // spread end labels so they never overlap
  const ends = ids.map((id) => ({ id, y: y(history[history.length - 1].shares[id]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 13) ends[i].y = ends[i - 1].y + 13;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Market share by period">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity="0.1" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#cbd5e1">{Math.round(t * 100)}%</text>
        </g>
      ))}
      {Array.from({ length: TURNS }, (_, i) => (
        <text key={i} x={L + (i / (TURNS - 1)) * (W - L - R)} y={H - 6} textAnchor="middle" fontSize="10" fill={i < history.length ? "#cbd5e1" : "#64748b"}>
          {yearOf(i + 1)}
        </text>
      ))}
      {ids.map((id) => (
        <g key={id}>
          <polyline fill="none" stroke={AIRLINE_META[id].color} strokeWidth={id === "player" ? 3 : 2} strokeDasharray={dash[id]}
            strokeLinejoin="round" strokeLinecap="round" points={history.map((h, i) => `${x(i)},${y(h.shares[id])}`).join(" ")} />
          <circle cx={x(history.length - 1)} cy={y(history[history.length - 1].shares[id])} r={id === "player" ? 4.5 : 3.5}
            fill={AIRLINE_META[id].color} stroke={NAVY} strokeWidth="1.5" />
        </g>
      ))}
      {ends.map((e) => (
        <text key={e.id} x={x(history.length - 1) + 9} y={e.y + 4} fontSize="11" fontWeight={e.id === "player" ? 700 : 500} fill={AIRLINE_META[e.id].color}>
          {e.id === "player" ? "You" : AIRLINE_META[e.id].name.replace("The ", "")} {pct(history[history.length - 1].shares[e.id], 0)}
        </text>
      ))}
    </svg>
  );
};

/* =====================================================================
   Main component
   ===================================================================== */

export default function App() {
  const [screen, setScreen] = useState("intro"); // intro | play | final
  const [scenario, setScenario] = useState(null);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState(1);
  const [airlines, setAirlines] = useState(initAirlines);
  const [market, setMarket] = useState({ demand: 0, carbonPrice: 0.002 });
  const [baseline, setBaseline] = useState(null);
  const [history, setHistory] = useState([]);
  // Draft decisions for the current turn
  const [strategy, setStrategy] = useState(null);
  const [orders, setOrders] = useState(zeroOrders);
  const [retire, setRetire] = useState(false);
  const [reveal, setReveal] = useState(0);
  const [copied, setCopied] = useState(false);

  const startGame = () => {
    const sc = buildScenario();
    const fresh = initAirlines();
    const demand0 = 0.84 * fresh.reduce((s, a) => s + fleetSeats(a.fleet), 0);
    const steady = EVENT_BY_ID.steady;
    setBaseline(simulate(fresh, steady, segWeights(0, steady), demand0, 0.002, 0).byId);
    setScenario(sc); setAirlines(fresh); setMarket({ demand: demand0, carbonPrice: 0.002 });
    setHistory([]); setTurn(0); setPhase(1); setStrategy(null); setOrders(zeroOrders()); setRetire(false);
    setScreen("play");
  };

  // Smooth scroll back to the top on every phase change
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { /* not available */ }
  }, [phase, turn, screen]);

  // Phase 3: staged reveal of the competitive resolution
  useEffect(() => {
    if (screen !== "play" || phase !== 3) return undefined;
    setReveal(0);
    const timers = [1, 2, 3, 4, 5].map((s) => setTimeout(() => setReveal(s), s * 650));
    return () => timers.forEach(clearTimeout);
  }, [phase, screen, turn]);

  const me = airlines.find((a) => a.id === "player");
  const ev = scenario ? scenario.events[turn] : null;
  const signal = scenario ? scenario.signals[turn] : null;
  const w = useMemo(() => (ev ? segWeights(turn, ev) : null), [ev, turn]);
  const growth = ev ? Math.pow(1 + ev.cagr / 100, 5) : 1;
  const demandEnd = market.demand * growth;
  const carbonNow = market.carbonPrice + (ev ? ev.carbonAdd : 0);
  const isLast = turn === TURNS - 1;
  const lastEntry = history[history.length - 1];
  const prevShare = history.length ? (phase >= 3 && history.length > 1 ? history[history.length - 2].share : phase >= 3 ? baseline.player.share : lastEntry.share) : baseline ? baseline.player.share : 0.25;
  const currentShare = history.length ? lastEntry.share : baseline ? baseline.player.share : 0.25;
  const cumProfit = history.reduce((s, h) => s + h.profit, 0);

  const spendNow = orderCost(orders);
  const cashLeft = me.budget - spendNow;
  const oldCount = me.fleet.filter((c) => turn - c.gen >= 4).reduce((s, c) => s + c.count, 0);

  const setOrder = (t, v) => {
    const others = spendNow - orders[t] * TYPES[t].price;
    const maxN = Math.max(0, Math.floor((me.budget - others) / TYPES[t].price));
    setOrders({ ...orders, [t]: Math.max(0, Math.min(maxN, v)) });
  };

  const confirmDecision = () => {
    const decision = { strategy, orders: isLast ? zeroOrders() : orders, retire };
    const fleetBefore = me.fleet;
    const res = resolveTurn({ airlines, turn, ev, w, demand: demandEnd, carbonPrice: carbonNow, decision });
    const prev = history.length ? lastEntry.byId : baseline;
    const p = res.sim.byId.player;
    const playerAfter = res.airlines.find((a) => a.id === "player");
    const byType = zeroOrders();
    playerAfter.fleet.forEach((c) => { byType[c.type] += c.count * TYPES[c.type].seats; });
    const prevStrategy = history.length ? lastEntry.strategy : null;
    const entry = {
      turn, period: `${yearOf(turn)}–${yearOf(turn + 1)}`, eventId: ev.id, crisis: ev.crisis, signalId: signal ? signal.id : null,
      strategy, switched: prevStrategy != null && prevStrategy !== strategy, orders: decision.orders, spend: res.meta.player.spend,
      budgetBefore: me.budget, investRate: me.budget > 0 ? res.meta.player.spend / me.budget : 0, retire, retired: res.meta.player.retired,
      share: p.share, prevShare: prev.player.share, profit: p.profit, revenue: p.revenue, tax: p.tax, load: p.load,
      carbonMt: p.carbon / 1000, intensity: p.intensity, industryIntensity: res.sim.industryIntensity,
      seats: p.seats, seatsStart: fleetSeats(fleetBefore), demand: demandEnd, demandStart: market.demand, w,
      fleetSeatsByType: byType, shares: Object.fromEntries(Object.entries(res.sim.byId).map(([id, r]) => [id, r.share])),
      byId: res.sim.byId, prevById: prev,
      insight: buildInsight({ sim: res.sim, prev, ev, turn, meta: res.meta, isLast }),
    };
    setAirlines(res.airlines);
    setHistory([...history, entry]);
    setPhase(3);
  };

  const nextTurn = () => {
    if (isLast) { setScreen("final"); return; }
    setAirlines(airlines.map((a) => advanceAirline(a, turn + 1)));
    setMarket({ demand: demandEnd, carbonPrice: carbonNow + 0.0025 });
    setTurn(turn + 1); setPhase(1); setOrders(zeroOrders()); setRetire(false);
  };

  /* ---------------- Intro ------------------------------------------- */
  if (screen === "intro") {
    return (
      <div className="aero-root min-h-screen bg-gray-100 px-4 py-6 text-slate-800 sm:px-6">
        <GlobalStyle />
        <div className="mx-auto flex max-w-5xl flex-col gap-5">
          <Sky className="aero-in rounded-3xl p-8 text-white shadow-xl sm:p-12">
            <Tag tone="teal"><Plane size={12} /> Serious game</Tag>
            <h1 className="aero-display mt-4 text-4xl font-bold leading-tight sm:text-6xl">AeroMarket Simulator</h1>
            <p className="aero-display mt-1 text-xl text-white/90 sm:text-2xl">The GMF Challenge</p>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/90">
              You are the CEO of a global airline. Read the market forecast, choose your network strategy, order aircraft,
              and defend your market share against three rival airlines from 2025 to 2075.
            </p>
            <div className="mt-8"><PrimaryButton id="start-game" onClick={startGame}>Take the controls <ChevronRight size={18} /></PrimaryButton></div>
          </Sky>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Globe, t: "1. Market Outlook", d: "Each turn covers 5 years and opens with a market event and a demand forecast." },
              { icon: Target, t: "2. Strategy & Fleet", d: "Pick Hub & Spoke or Point-to-Point, then spend your budget on new aircraft." },
              { icon: Clock, t: "3. Five-year lead time", d: "Aircraft ordered now are only delivered next turn. Plan for the market after this one." },
              { icon: Brain, t: "4. Insights", d: "See your share, profit and carbon footprint, and a behavioral profile in 2075." },
            ].map(({ icon: Icon, t, d }, i) => (
              <NavyCard key={t} className="aero-in" >
                <Icon size={22} className={i % 2 ? "text-[#ff4d9d]" : "text-[#00b4b4]"} />
                <div className="aero-display mt-3 text-base font-semibold">{t}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{d}</p>
              </NavyCard>
            ))}
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your rivals</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {AI_IDS.map((id) => (
                <div key={id} className="flex items-start gap-3">
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full border border-slate-300" style={{ background: AIRLINE_META[id].color }} />
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-800">{AIRLINE_META[id].name}</div>
                    <div className="text-sm text-slate-500">{AIRLINE_META[id].profile}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Final: Behavioral Analytics ---------------------- */
  if (screen === "final") {
    const A = computeAnalytics(history, scenario);
    const ranking = [...airlines].map((a) => ({ id: a.id, share: lastEntry.shares[a.id], budget: a.budget })).sort((a, b) => b.share - a.share);
    const rank = ranking.findIndex((r) => r.id === "player") + 1;
    const exportData = {
      game: "AeroMarket Simulator: The GMF Challenge",
      behavioralProfile: {
        archetype: A.archetype, consistencyScore: Math.round(A.consistency), strategySwitches: A.switches,
        riskAversionIndex: Math.round(A.riskAversion), crisisComposure: A.composure == null ? null : Math.round(A.composure),
        crisisVsCalmInvestmentRatio: A.ratio == null ? null : +A.ratio.toFixed(2), panicMoves: A.panicMoves,
        longTermAlignment: Math.round(A.alignment), forecastReliance: A.forecastReliance == null ? null : Math.round(A.forecastReliance),
      },
      outcome: { finalMarketShare: +lastEntry.share.toFixed(4), cumulativeProfitMUSD: Math.round(cumProfit), rank },
      turns: history.map((h) => ({
        period: h.period, event: h.eventId, crisis: h.crisis, earlySignal: h.signalId, strategy: h.strategy, switched: h.switched,
        orders: h.orders, spendMUSD: h.spend, investRate: +h.investRate.toFixed(3), earlyRetirement: h.retire,
        marketShare: +h.share.toFixed(4), profitMUSD: Math.round(h.profit), carbonMt: +h.carbonMt.toFixed(2),
      })),
    };
    const json = JSON.stringify(exportData, null, 2);
    const copy = () => {
      try {
        navigator.clipboard.writeText(json).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {});
      } catch (e) { /* clipboard unavailable: the JSON stays selectable below */ }
    };
    const cards = [
      { icon: Activity, title: "Consistency", score: A.consistency, color: TEAL,
        label: A.consistency >= 75 ? "Steadfast" : A.consistency >= 45 ? "Adaptive" : "Highly reactive",
        text: `${A.switches} network strategy ${A.switches === 1 ? "switch" : "switches"} in ${history.length} periods. Order mix changed by ${pct(A.mixVolatility, 0)} on average from one order to the next.` },
      { icon: Shield, title: "Risk aversion", score: A.riskAversion, color: PINK,
        label: A.riskAversion >= 60 ? "Cash preserver" : A.riskAversion >= 30 ? "Balanced" : "Aggressive investor",
        text: `You committed ${pct(A.overallRate, 0)} of available budget to new aircraft on average. A higher index means more cash held back.` },
      { icon: AlertTriangle, title: "Crisis composure", score: A.composure ?? 0, color: TEAL, label: A.crisisLabel,
        text: A.ratio == null ? "Not enough crisis periods with available budget to measure."
          : `Across ${A.crisisCount} crisis periods you invested ${pct(A.crisisRate, 0)} of budget versus ${pct(A.calmRate, 0)} in calm periods, with ${A.panicMoves} abrupt ${A.panicMoves === 1 ? "move" : "moves"} (strategy switch or early retirement) during a crisis.` },
      { icon: TrendingUp, title: "Long-term trend alignment", score: A.alignment, color: PINK,
        label: A.alignment >= 70 ? "Ahead of the trends" : A.alignment >= 50 ? "Partly aligned" : "Behind the trends",
        text: `Decarbonisation ${Math.round(A.decarb)}/100, fleet fit with the 2075 route mix ${Math.round(A.networkFit)}/100, capacity growth versus demand ${Math.round(A.growthFit)}/100.` },
    ];
    return (
      <div className="aero-root min-h-screen bg-gray-100 px-4 py-6 text-slate-800 sm:px-6">
        <GlobalStyle />
        <div className="mx-auto flex max-w-6xl flex-col gap-5">
          <Sky variant="dusk" className="aero-in rounded-3xl p-7 text-white shadow-xl sm:p-10">
            <Tag tone="teal"><Brain size={12} /> Behavioral Analytics · 2075</Tag>
            <h1 className="aero-display mt-3 text-3xl font-bold sm:text-5xl">{A.archetype}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/90">{A.archetypeText}</p>
            <div className="mt-6 grid max-w-2xl grid-cols-3 gap-4">
              <div><div className="text-xs uppercase tracking-wider text-white/70">Final share</div><div className="aero-display aero-num text-2xl font-semibold">{pct(lastEntry.share)}</div></div>
              <div><div className="text-xs uppercase tracking-wider text-white/70">50-year profit</div><div className="aero-display aero-num text-2xl font-semibold">{money(cumProfit)}</div></div>
              <div><div className="text-xs uppercase tracking-wider text-white/70">Rank</div><div className="aero-display aero-num text-2xl font-semibold">{rank} of 4</div></div>
            </div>
          </Sky>

          <div className="grid gap-4 md:grid-cols-2">
            {cards.map(({ icon: Icon, title, score, color, label, text }) => (
              <NavyCard key={title} className="aero-in">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-300">
                    <Icon size={16} style={{ color: color === PINK ? "#ff4d9d" : TEAL }} /> <span>{title}</span>
                  </div>
                  <div className="aero-display aero-num text-3xl font-semibold">{Math.round(score)}<span className="text-base text-slate-400">/100</span></div>
                </div>
                <div className="mt-3"><Meter value={score} color={color} /></div>
                <div className="mt-3 font-semibold text-white">{label}</div>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
              </NavyCard>
            ))}
          </div>

          <NavyCard className="aero-in">
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-300"><Radar size={16} className="text-[#00b4b4]" /> Use of forecasts</div>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              {A.forecastReliance == null
                ? "No orders could be compared against an early signal."
                : `Your largest order matched the early signal ${A.followed} ${A.followed === 1 ? "time" : "times"} out of ${A.eligible} (${Math.round(A.forecastReliance)}%).`}{" "}
              In this game {A.signalsAccurate} of {A.signalsTotal} early signals turned out to be correct.
            </p>
          </NavyCard>

          <NavyCard className="aero-in">
            <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-wider text-slate-300"><BarChart3 size={16} className="text-[#00b4b4]" /> Market share, 2030–2075</div>
            <div className="mt-3"><ShareChart history={history} /></div>
          </NavyCard>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Decision log</div>
            <div className="mt-3 overflow-x-auto">
              <table className="aero-num w-full min-w-[720px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-slate-500">
                  <tr><th className="py-2 pr-3">Period</th><th className="pr-3">Market event</th><th className="pr-3">Strategy</th><th className="pr-3">Orders SA / LR-SA / WB</th><th className="pr-3 text-right">Invested</th><th className="pr-3 text-right">Share</th><th className="text-right">Profit</th></tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.turn} className="border-t border-slate-100">
                      <td className="py-2 pr-3 font-medium">{h.period}</td>
                      <td className="pr-3">{EVENT_BY_ID[h.eventId].title}{h.crisis && <span className="ml-2 rounded bg-[#d30068] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Crisis</span>}</td>
                      <td className="pr-3">{STRAT[h.strategy].name}{h.switched && <span className="ml-1 text-[#d30068]">↺</span>}{h.retire && <span className="ml-1 text-slate-500">· retired {h.retired}</span>}</td>
                      <td className="pr-3">{h.orders.SA} / {h.orders.LR} / {h.orders.WB}</td>
                      <td className="pr-3 text-right">{pct(h.investRate, 0)}</td>
                      <td className="pr-3 text-right">{pct(h.share)}</td>
                      <td className={`text-right font-medium ${h.profit < 0 ? "text-[#d30068]" : "text-slate-800"}`}>{money(h.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session data</div>
                <div className="text-sm text-slate-600">The behavioral record of this session, ready for analysis.</div>
              </div>
              <button id="copy-json" onClick={copy} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#00b4b4] hover:text-[#008a8a] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/30">
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{json}</pre>
          </div>

          <div className="flex justify-center pb-6">
            <PrimaryButton id="play-again" onClick={() => setScreen("intro")}><RotateCcw size={16} /> Play again</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Play --------------------------------------------- */
  const pendingCount = TYPE_KEYS.reduce((s, t) => s + me.pending[t], 0);
  const shareDelta = currentShare - prevShare;
  const phases = [
    { n: 1, label: "Market Outlook", icon: Globe }, { n: 2, label: "Strategy & Fleet", icon: Target },
    { n: 3, label: "Competition", icon: Users }, { n: 4, label: "Insights", icon: Lightbulb },
  ];
  const fleetRows = TYPE_KEYS.map((t) => {
    const cs = me.fleet.filter((c) => c.type === t);
    const n = cs.reduce((s, c) => s + c.count, 0);
    const age = n ? cs.reduce((s, c) => s + c.count * (turn - c.gen) * 5, 0) / n : 0;
    const old = cs.filter((c) => turn - c.gen >= 4).reduce((s, c) => s + c.count, 0);
    return { t, n, age, old };
  });
  const EvIcon = ev.icon;
  const sigEvent = signal ? EVENT_BY_ID[signal.id] : null;

  return (
    <div className="aero-root min-h-screen bg-gray-100 px-4 py-5 text-slate-800 sm:px-6">
      <GlobalStyle />
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Header banner */}
        <Sky className="rounded-3xl px-6 py-5 text-white shadow-xl sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80"><Plane size={14} /> AeroMarket Simulator · The GMF Challenge</div>
              <div className="aero-display aero-num mt-1 text-3xl font-bold sm:text-4xl">{yearOf(turn)} – {yearOf(turn + 1)}</div>
            </div>
            <div className="text-right text-sm text-white/90">Turn {turn + 1} of {TURNS}</div>
          </div>
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TURNS }, (_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < turn ? "bg-white" : i === turn ? "bg-[#d30068]" : "bg-white/25"}`} />
            ))}
          </div>
        </Sky>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi icon={DollarSign} label="Budget" value={money(phase === 2 ? cashLeft : me.budget)} sub={phase === 2 && spendNow > 0 ? `${money(spendNow)} committed` : me.budget < 0 ? "In debt: 15% interest per turn" : "Available to invest"} />
          <Kpi icon={Plane} label="Active fleet" value={`${fleetCount(me.fleet)}`} sub={fleetRows.map((r) => `${r.n} ${TYPES[r.t].short}`).join(" · ")} accent="pink" />
          <Kpi icon={Package} label="On order" value={`${pendingCount}`} sub={pendingCount ? `Delivery in ${yearOf(turn + 1)}` : "Nothing in production"} />
          <Kpi icon={BarChart3} label="Market share" value={pct(currentShare)} sub={history.length ? `${shareDelta >= 0 ? "+" : "−"}${Math.abs(shareDelta * 100).toFixed(1)} pts last period` : "Starting position"} accent="pink" />
          <div className="col-span-2 lg:col-span-1"><Kpi icon={Trophy} label="Cumulative profit" value={money(cumProfit)} sub={`Since ${START_YEAR}`} /></div>
        </div>

        {/* Phase stepper */}
        <div className="flex flex-wrap gap-2">
          {phases.map(({ n, label, icon: Icon }) => (
            <div key={n} className={`flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-300 ${
              n === phase ? "bg-[#1a2942] text-white shadow" : n < phase ? "bg-[#00b4b4]/15 text-[#007a7a]" : "bg-white text-slate-400"}`}>
              {n < phase ? <Check size={13} /> : <Icon size={13} />} <span>{label}</span>
            </div>
          ))}
        </div>

        {/* ---------- Phase 1: Market Outlook ---------- */}
        {phase === 1 && (
          <div key={`p1-${turn}`} className="aero-in flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-5">
              <NavyCard className="lg:col-span-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag tone={ev.crisis ? "pink" : "teal"}>{ev.crisis ? <AlertTriangle size={12} /> : <Info size={12} />} {ev.tag}</Tag>
                  <span className="text-xs uppercase tracking-wider text-slate-300">Outlook {yearOf(turn)}–{yearOf(turn + 1)}</span>
                </div>
                <div className="mt-4 flex items-start gap-4">
                  <div className="rounded-xl bg-white/10 p-3"><EvIcon size={28} className={ev.crisis ? "text-[#ff4d9d]" : "text-[#00b4b4]"} /></div>
                  <div className="min-w-0">
                    <h2 className="aero-display text-2xl font-semibold">{ev.title}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{ev.desc}</p>
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Passenger demand</div>
                    <div className={`aero-display aero-num mt-1 text-2xl font-semibold ${ev.cagr < 1.5 ? "text-[#ff4d9d]" : "text-[#00b4b4]"}`}>{ev.cagr > 0 ? "+" : "−"}{Math.abs(ev.cagr).toFixed(1)}%</div>
                    <div className="text-[11px] text-slate-300">CAGR, {growth >= 1 ? "+" : "−"}{Math.abs((growth - 1) * 100).toFixed(0)}% over 5 years</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Fuel price</div>
                    <div className="aero-display aero-num mt-1 text-2xl font-semibold">{ev.fuel === 1 ? "Stable" : `${ev.fuel > 1 ? "+" : "−"}${Math.abs((ev.fuel - 1) * 100).toFixed(0)}%`}</div>
                    <div className="text-[11px] text-slate-300">versus long-run level</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Carbon price</div>
                    <div className="aero-display aero-num mt-1 text-2xl font-semibold">{carbonPriceLabel(carbonNow)}</div>
                    <div className="text-[11px] text-slate-300">{ev.carbonAdd > 0 ? "Permanent step up" : "Rising every period"}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Fares</div>
                    <div className="aero-display aero-num mt-1 text-2xl font-semibold">{ev.yield === 1 ? "Stable" : `${ev.yield > 1 ? "+" : "−"}${Math.abs((ev.yield - 1) * 100).toFixed(0)}%`}</div>
                    <div className="text-[11px] text-slate-300">average yield</div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-300">Where the demand will be</div>
                  <div className="mt-2 flex h-7 w-full overflow-hidden rounded-lg text-[11px] font-semibold">
                    <div className="flex items-center justify-center bg-[#00b4b4] text-[#0c1a2e] transition-all duration-700" style={{ width: pct(w.SH) }}>{pct(w.SH, 0)}</div>
                    <div className="flex items-center justify-center bg-[#d30068] text-white transition-all duration-700" style={{ width: pct(w.LT) }}>{pct(w.LT, 0)}</div>
                    <div className="flex items-center justify-center bg-slate-200 text-[#1a2942] transition-all duration-700" style={{ width: pct(w.LH) }}>{pct(w.LH, 0)}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
                    <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#00b4b4]" />Short-haul</span>
                    <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-[#d30068]" />Long thin routes (P2P)</span>
                    <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-slate-200" />Long-haul trunk (hubs)</span>
                  </div>
                </div>
              </NavyCard>

              <div className="flex flex-col gap-4 lg:col-span-2">
                <div className="rounded-2xl bg-white p-3 shadow-sm">
                  <WorldMap region={ev.region} />
                  <div className="px-1 pt-2 text-xs text-slate-500">White markers show where this period's event is centred.</div>
                </div>
                <NavyCard>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300"><Radar size={15} className="text-[#ff4d9d]" /> Early signal for {yearOf(turn + 1)}–{yearOf(turn + 2)}</div>
                  {sigEvent ? (
                    <>
                      <div className="aero-display mt-2 text-lg font-semibold">{sigEvent.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">Analysts see this as the most likely next scenario. Early signals are right about three times out of four, and aircraft you order now arrive in that period.</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">Final period. The simulation ends in {yearOf(TURNS)}, so new orders would arrive too late to fly.</p>
                  )}
                </NavyCard>
              </div>
            </div>
            <div className="flex justify-end"><PrimaryButton id="to-strategy" onClick={() => setPhase(2)}>Plan your strategy <ChevronRight size={18} /></PrimaryButton></div>
          </div>
        )}

        {/* ---------- Phase 2: Strategy & Fleet ---------- */}
        {phase === 2 && (
          <div key={`p2-${turn}`} className="aero-in flex flex-col gap-4">
            <div>
              <h2 className="aero-display text-xl font-semibold text-[#1a2942]">1. Network strategy focus</h2>
              <p className="text-sm text-slate-500">Takes effect immediately for {yearOf(turn)}–{yearOf(turn + 1)}.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {["HUB", "P2P"].map((k) => {
                const Icon = k === "HUB" ? Share2 : ArrowLeftRight;
                const on = strategy === k;
                return (
                  <button key={k} id={`strategy-${k}`} onClick={() => setStrategy(k)} aria-pressed={on}
                    className={`group overflow-hidden rounded-2xl text-left shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/50 ${
                      on ? "ring-4 ring-[#00b4b4] ring-offset-2 ring-offset-gray-100" : "opacity-90 hover:-translate-y-0.5 hover:opacity-100"}`}>
                    <Sky variant={k === "HUB" ? "hub" : "p2p"} className="p-5 text-white">
                      <Icon size={96} className="pointer-events-none absolute -right-3 -top-3 text-white/10" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2"><Icon size={20} /><span className="aero-display text-xl font-semibold">{STRAT[k].name}</span></div>
                        <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition ${on ? "border-[#00b4b4] bg-[#00b4b4] text-[#0c1a2e]" : "border-white/60"}`}>{on && <Check size={14} />}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/90">{STRAT[k].blurb}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                        {SEG_KEYS.map((s) => (
                          <span key={s} className="rounded-full bg-black/25 px-2.5 py-1">{SEGS[s].name} {STRAT[k].mult[s] >= 1 ? "+" : "−"}{Math.abs((STRAT[k].mult[s] - 1) * 100).toFixed(0)}%</span>
                        ))}
                      </div>
                    </Sky>
                  </button>
                );
              })}
            </div>

            <div className="mt-2">
              <h2 className="aero-display text-xl font-semibold text-[#1a2942]">2. Fleet orders</h2>
              <p className="text-sm text-slate-500">
                {isLast ? `The order book is closed: aircraft ordered now would be delivered after ${yearOf(TURNS)}.`
                  : <>Manufacturing takes five years. Aircraft ordered now enter service in <strong className="text-[#d30068]">{yearOf(turn + 1)}</strong>.</>}
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              {TYPE_KEYS.map((t) => {
                const T = TYPES[t];
                const others = spendNow - orders[t] * T.price;
                const maxN = Math.max(0, Math.floor((me.budget - others) / T.price));
                const row = fleetRows.find((r) => r.t === t);
                return (
                  <NavyCard key={t} className={isLast ? "opacity-50" : ""}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <Tag tone={t === "LR" ? "pink" : "teal"}>{T.short}</Tag>
                        <div className="aero-display mt-2 text-lg font-semibold">{T.name}</div>
                      </div>
                      <Plane size={t === "WB" ? 40 : t === "LR" ? 32 : 26} className="shrink-0 text-white/30" />
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{T.blurb}</p>
                    <div className="aero-num mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-300">Price</div><div className="font-semibold">${T.price}M</div></div>
                      <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-300">Seats</div><div className="font-semibold">{T.seats}</div></div>
                      <div className="rounded-lg bg-white/5 p-2"><div className="text-slate-300">In fleet</div><div className="font-semibold">{row.n}</div></div>
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button aria-label={`Order fewer ${T.short}`} disabled={isLast || orders[t] <= 0} onClick={() => setOrder(t, orders[t] - 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4] disabled:opacity-30"><Minus size={16} /></button>
                      <input id={`order-${t}`} type="range" min="0" max={Math.max(maxN, 1)} value={orders[t]} disabled={isLast || maxN === 0}
                        onChange={(e) => setOrder(t, Number(e.target.value))} aria-label={`${T.name} to order`}
                        className="h-2 min-w-0 flex-1 cursor-pointer accent-[#00b4b4] disabled:cursor-not-allowed" />
                      <button aria-label={`Order more ${T.short}`} disabled={isLast || orders[t] >= maxN} onClick={() => setOrder(t, orders[t] + 1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4] disabled:opacity-30"><Plus size={16} /></button>
                    </div>
                    <div className="mt-3 flex items-end justify-between">
                      <div><span className="aero-display aero-num text-3xl font-semibold text-[#00b4b4]">{orders[t]}</span><span className="ml-1.5 text-sm text-slate-300">ordered</span></div>
                      <div className="aero-num text-sm text-slate-300">{money(orders[t] * T.price)} · max {maxN}</div>
                    </div>
                  </NavyCard>
                );
              })}
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active fleet in {yearOf(turn)}</div>
                <table className="aero-num mt-2 w-full text-sm">
                  <thead className="text-left text-xs text-slate-500"><tr><th className="py-1 font-medium">Type</th><th className="text-right font-medium">Aircraft</th><th className="text-right font-medium">Avg. age</th><th className="text-right font-medium">20+ years</th></tr></thead>
                  <tbody>
                    {fleetRows.map((r) => (
                      <tr key={r.t} className="border-t border-slate-100">
                        <td className="py-1.5 font-medium text-slate-800">{TYPES[r.t].name}</td>
                        <td className="text-right">{r.n}</td><td className="text-right">{r.n ? `${r.age.toFixed(0)} yrs` : "–"}</td>
                        <td className={`text-right ${r.old ? "font-semibold text-[#d30068]" : ""}`}>{r.old}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs text-slate-500">Aircraft are scrapped automatically at 30 years. Each new generation burns about 5% less fuel.</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Optional: early retirement</div>
                <label htmlFor="retire-toggle" className={`mt-3 flex items-start gap-3 ${oldCount ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                  <input id="retire-toggle" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#d30068]" checked={retire} disabled={!oldCount} onChange={(e) => setRetire(e.target.checked)} />
                  <span className="text-sm leading-relaxed text-slate-700">
                    <strong>Retire all {oldCount} aircraft aged 20+ years now.</strong> Cuts fuel burn and carbon costs immediately, but you lose the seats this period and recover only 6% of the list price.
                  </span>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="aero-num text-sm text-slate-600">
                Committed <strong className="text-[#1a2942]">{money(spendNow)}</strong> of {money(Math.max(0, me.budget))}
                {me.budget <= 0 && <span className="ml-2 font-semibold text-[#d30068]">No cash available for orders</span>}
                {!strategy && <span className="ml-2 font-semibold text-[#d30068]">Choose a network strategy to continue</span>}
              </div>
              <div className="flex gap-2">
                <button id="back-outlook" onClick={() => setPhase(1)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/30">Back to outlook</button>
                <PrimaryButton id="confirm-decision" disabled={!strategy} onClick={confirmDecision}>Commit and compete <ChevronRight size={18} /></PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Phase 3: Competitive Resolution ---------- */}
        {phase === 3 && lastEntry && (
          <div key={`p3-${turn}`} className="aero-in flex flex-col gap-4">
            <NavyCard>
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300"><Users size={15} className="text-[#00b4b4]" /> Competitive resolution · {lastEntry.period}</div>
              <h2 className="aero-display mt-2 text-2xl font-semibold">{reveal < 5 ? "Four airlines, one market…" : "The market has spoken"}</h2>
              <div className="mt-5 flex flex-col gap-4">
                {["player", ...AI_IDS].map((id, i) => {
                  const shown = reveal > i;
                  const from = lastEntry.prevById[id].share, to = lastEntry.byId[id].share;
                  const d = to - from;
                  return (
                    <div key={id}>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: AIRLINE_META[id].color }} />
                          <span className="font-semibold">{AIRLINE_META[id].name}</span>
                          <span className="flex items-center gap-1 text-xs text-slate-300">
                            {id === "player" ? STRAT[lastEntry.strategy].name : shown ? <><Eye size={12} /> {STRAT[lastEntry.byId[id].strategy].name}</> : <><Lock size={12} /> Strategy hidden</>}
                          </span>
                        </div>
                        <div className="aero-num flex items-center gap-2">
                          <span className="aero-display text-lg font-semibold">{shown ? pct(to) : pct(from)}</span>
                          {shown && <span className={`text-xs font-semibold ${d >= 0 ? "text-[#00b4b4]" : "text-[#ff4d9d]"}`}>{d >= 0 ? "+" : "−"}{Math.abs(d * 100).toFixed(1)} pts</span>}
                        </div>
                      </div>
                      <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${(shown ? to : from) * 200}%`, maxWidth: "100%", background: AIRLINE_META[id].color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </NavyCard>
            <div className="flex justify-end"><PrimaryButton id="to-insights" disabled={reveal < 5} onClick={() => setPhase(4)}>View insights <ChevronRight size={18} /></PrimaryButton></div>
          </div>
        )}

        {/* ---------- Phase 4: Insights & Analytics ---------- */}
        {phase === 4 && lastEntry && (() => {
          const h = lastEntry, d = h.share - h.prevShare, margin = h.revenue ? h.profit / h.revenue : 0;
          const greener = h.intensity <= h.industryIntensity;
          return (
            <div key={`p4-${turn}`} className="aero-in flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <NavyCard>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300"><BarChart3 size={15} className="text-[#00b4b4]" /> Market share</div>
                  <div className="aero-display aero-num mt-2 text-4xl font-semibold">{pct(h.share)}</div>
                  <div className={`aero-num mt-1 flex items-center gap-1 text-sm font-semibold ${d >= 0 ? "text-[#00b4b4]" : "text-[#ff4d9d]"}`}>
                    {d >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{d >= 0 ? "+" : "−"}{Math.abs(d * 100).toFixed(1)} pts versus previous period
                  </div>
                </NavyCard>
                <NavyCard>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300"><DollarSign size={15} className="text-[#00b4b4]" /> Profitability</div>
                  <div className={`aero-display aero-num mt-2 text-4xl font-semibold ${h.profit < 0 ? "text-[#ff4d9d]" : ""}`}>{money(h.profit)}</div>
                  <div className="aero-num mt-1 text-sm text-slate-300">{pct(margin)} margin · {pct(h.load, 0)} load factor</div>
                </NavyCard>
                <NavyCard>
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300"><Leaf size={15} className="text-[#00b4b4]" /> Carbon footprint</div>
                  <div className="aero-display aero-num mt-2 text-4xl font-semibold">{h.carbonMt.toFixed(1)}<span className="ml-1 text-lg text-slate-300">Mt CO₂</span></div>
                  <div className={`aero-num mt-1 text-sm font-semibold ${greener ? "text-[#00b4b4]" : "text-[#ff4d9d]"}`}>
                    {Math.abs(h.intensity / h.industryIntensity - 1) < 0.005 ? "In line with" : `${Math.abs((h.intensity / h.industryIntensity - 1) * 100).toFixed(0)}% ${greener ? "below" : "above"}`} industry average per seat · {money(h.tax)} carbon bill
                  </div>
                </NavyCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <div className="rounded-2xl border-l-4 border-[#d30068] bg-white p-5 shadow-sm lg:col-span-2">
                  <Tag><Lightbulb size={12} /> Insight</Tag>
                  <div className="mt-3 flex flex-col gap-3">
                    {h.insight.map((line, i) => (
                      <p key={i} className={`leading-relaxed ${i === 0 ? "text-base font-semibold text-[#1a2942]" : "text-sm text-slate-600"}`}>{line}</p>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your share by segment</div>
                    <div className="aero-num mt-2 flex flex-col gap-1.5 text-sm">
                      {SEG_KEYS.map((s) => {
                        const ds = h.byId.player.segShare[s] - h.prevById.player.segShare[s];
                        return (
                          <div key={s} className="flex items-center justify-between gap-2">
                            <span className="text-slate-600">{SEGS[s].name}</span>
                            <span><strong className="text-[#1a2942]">{pct(h.byId.player.segShare[s])}</strong>
                              <span className={`ml-2 text-xs font-semibold ${ds >= 0 ? "text-[#008a8a]" : "text-[#d30068]"}`}>{ds >= 0 ? "+" : "−"}{Math.abs(ds * 100).toFixed(1)}</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <NavyCard className="lg:col-span-3">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300"><Activity size={15} className="text-[#00b4b4]" /> Market share by period</div>
                  <div className="mt-3"><ShareChart history={history} /></div>
                </NavyCard>
              </div>
              <div className="flex justify-end">
                <PrimaryButton id="next-turn" onClick={nextTurn}>
                  {isLast ? <>Open Behavioral Analytics <Brain size={18} /></> : <>Advance to {yearOf(turn + 1)} <ChevronRight size={18} /></>}
                </PrimaryButton>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
