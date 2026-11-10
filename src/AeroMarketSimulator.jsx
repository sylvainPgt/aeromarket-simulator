import React, { useState, useEffect, useMemo } from "react";
import {
  Plane, Globe, TrendingUp, TrendingDown, AlertTriangle, DollarSign, Leaf, BarChart3, ChevronRight, Share2, ArrowLeftRight,
  Users, Target, Activity, Brain, Check, Package, Trophy, Info, Radar, Lock, Eye, Lightbulb, Download, Landmark, CalendarClock,
} from "lucide-react";
import Start from "./screens/Start.jsx";
import Final from "./screens/Final.jsx";
import WorldMap from "./components/WorldMap.jsx";
import Portfolio from "./components/Portfolio.jsx";
import { ShareChart, CapacityOutlook } from "./components/charts.jsx";
import {
  GlobalStyle, Sky, Tag, NavyCard, WhiteCard, Kpi, PrimaryButton, GhostButton, Eyebrow, Count, EVENT_ICONS, money, num, signed, TEAL, PINK,
} from "./components/ui.jsx";
import { REGIONS, REGION_IDS } from "./data/gmf.js";
import { ac, setCustomAircraft, CAT_NAME } from "./game/aircraft.js";
import { ARCHETYPES } from "./game/airlines.js";
import {
  TURNS, SEGS, CATS, STRAT, SEG_INFO, EVENT_BY_ID, CARBON_STEP, LEASE_CAP, LEASE_RATE, SWITCH_COST, yearOf,
  buildScenario, initWorld, periodDemand, baseGrowth, simulate, resolveTurn, advanceAirline,
  seatsOf, countOf, creditLimit, orderCapacity,
} from "./game/engine.js";
import { homeView, buildInsight, pct } from "./game/insights.js";

/* AeroMarket Simulator: The GMF Challenge. 1 turn = 5 years, 2025 to 2075. */

const SAVE_VERSION = 2;
const emptyDraft = (strategy = null) => ({ strategy, orders: {}, leases: {}, returns: {}, retire: false });
const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, n]) => n > 0));

export default function AeroMarketSimulator() {
  const [screen, setScreen] = useState("start"); // start | play | final
  const [seed, setSeed] = useState("");
  const [scenario, setScenario] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [turn, setTurn] = useState(0);
  const [phase, setPhase] = useState(1);
  const [airlines, setAirlines] = useState([]);
  const [market, setMarket] = useState(null);
  const [carbonPrice, setCarbonPrice] = useState(0);
  const [baseline, setBaseline] = useState(null); // { view, pax } before the first turn
  const [history, setHistory] = useState([]);
  const [custom, setCustom] = useState([]);
  const [draft, setDraft] = useState(emptyDraft());
  const [reveal, setReveal] = useState(0);
  const [bankrupt, setBankrupt] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saved, setSaved] = useState(false);

  /* ---------- Game lifecycle ---------- */
  const startGame = (code, id) => {
    const world = initWorld();
    const steady = EVENT_BY_ID.steady;
    const D0 = {};
    REGION_IDS.forEach((r) => { D0[r] = { SH: world.market[r].sh, LT: world.market[r].long * 0.3, LH: world.market[r].long * 0.7 }; });
    const sim0 = simulate(world.airlines, D0, steady, world.carbonPrice, 0);
    setBaseline({ view: homeView(sim0, world.airlines, id), pax: sim0.byId[id].pax });
    setSeed(code); setScenario(buildScenario(code)); setPlayerId(id);
    setAirlines(world.airlines); setMarket(world.market); setCarbonPrice(world.carbonPrice);
    setHistory([]); setTurn(0); setPhase(1); setBankrupt(false);
    setDraft(emptyDraft()); setScreen("play");
  };

  const saveGame = () => {
    const data = { app: "aeromarket-simulator", version: SAVE_VERSION, savedAt: new Date().toISOString(), seed, playerId, screen,
      turn, phase: phase === 3 ? 4 : phase, airlines, market, carbonPrice, baseline, history, custom, draft, bankrupt };
    try {
      const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = `aeromarket-${seed}-${yearOf(turn)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { /* downloads unavailable in this viewer */ }
  };

  const loadGame = (file) => {
    const reader = new FileReader();
    reader.onerror = () => setLoadError("That file could not be read.");
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (d.app !== "aeromarket-simulator" || d.version !== SAVE_VERSION || !Array.isArray(d.airlines) || !d.airlines.some((a) => a.id === d.playerId)) {
          setLoadError("This is not an AeroMarket Simulator save file from this version."); return;
        }
        setCustomAircraft(d.custom || []); // aircraft must exist before any fleet is drawn
        setCustom(d.custom || []); setSeed(d.seed); setScenario(buildScenario(d.seed)); setPlayerId(d.playerId);
        setAirlines(d.airlines); setMarket(d.market); setCarbonPrice(d.carbonPrice); setBaseline(d.baseline);
        setHistory(d.history || []); setTurn(d.turn); setPhase(d.phase); setDraft(d.draft || emptyDraft()); setBankrupt(!!d.bankrupt);
        setLoadError(""); setScreen(d.screen === "final" ? "final" : "play");
      } catch (e) { setLoadError("That file is not a valid save file."); }
    };
    reader.readAsText(file);
  };

  const addCustom = (a) => {
    const next = [...custom, { ...a, id: `custom_${Date.now().toString(36)}` }];
    setCustomAircraft(next); setCustom(next);
  };
  const deleteCustom = (id) => {
    const next = custom.filter((a) => a.id !== id);
    const strip = (o) => Object.fromEntries(Object.entries(o).filter(([k]) => k !== id));
    setDraft({ ...draft, orders: strip(draft.orders), leases: strip(draft.leases) });
    setCustomAircraft(next); setCustom(next);
  };

  useEffect(() => { try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch (e) { /* not available */ } }, [phase, turn, screen]);

  // Phase 3: staged reveal of the competitive resolution
  useEffect(() => {
    if (screen !== "play" || phase !== 3) return undefined;
    setReveal(0);
    const timers = [1, 2, 3, 4, 5].map((s) => setTimeout(() => setReveal(s), s * 700));
    return () => timers.forEach(clearTimeout);
  }, [phase, screen, turn]);

  /* ---------- Derived state for the current turn ---------- */
  const me = airlines.find((a) => a.id === playerId);
  const ev = scenario ? EVENT_BY_ID[scenario.events[turn]] : null;
  const signal = scenario ? scenario.signals[turn] : null;
  const pd = useMemo(() => (market && ev ? periodDemand(market, turn, ev) : null), [market, turn, ev]);
  const isLast = turn === TURNS - 1;
  const lastEntry = history[history.length - 1];
  const resolved = phase >= 3 && lastEntry && lastEntry.turn === turn;

  if (screen === "start" || !me || !pd) {
    return (<><GlobalStyle /><Start onStart={startGame} onLoad={loadGame} loadError={loadError} /></>);
  }
  if (screen === "final") {
    return (<><GlobalStyle /><Final history={history} scenario={scenario} seed={seed} player={me} bankrupt={bankrupt} onSave={saveGame} onRestart={() => setScreen("start")} /></>);
  }

  const home = me.region, R = REGIONS[home];
  const cp = carbonPrice + ev.carbonAdd;
  const Dh = pd.D[home];
  const homeDemand = Dh.SH + Dh.LT + Dh.LH;
  const homeStart = market[home].sh + market[home].long;
  const w = { SH: Dh.SH / homeDemand, LT: Dh.LT / homeDemand, LH: Dh.LH / homeDemand };
  const annual = (r) => Math.pow((pd.D[r].SH + pd.D[r].LT + pd.D[r].LH) / (market[r].sh + market[r].long), 0.2) - 1;
  const baseAnnual = (r) => { const b = baseGrowth(r, turn), m = market[r]; return (b.sh * m.sh + b.long * m.long) / (m.sh + m.long); };

  // Finance
  const limit = creditLimit(me, turn);
  const capacity = orderCapacity(me, turn);
  const spend = Object.entries(draft.orders).reduce((s, [t, n]) => s + n * ac(t).price, 0);
  const newLeases = Object.values(draft.leases).reduce((s, n) => s + n, 0);
  const leaseBill = Object.entries(draft.leases).reduce((s, [t, n]) => s + n * ac(t).price * LEASE_RATE, 0);
  const leaseCap = Math.max(5, Math.floor(countOf(me.fleet) * LEASE_CAP));
  const cashAfter = me.cash - spend;
  const debtRatio = limit > 0 ? Math.max(0, -me.cash) / limit : 0;
  const switching = draft.strategy && draft.strategy !== me.strategy;

  // Fleet after the draft decisions, and its future
  const fleetNow = (() => {
    let f = me.fleet.map((c) => ({ ...c }));
    if (draft.retire) f = f.filter((c) => c.leased || turn - c.gen < 4);
    Object.entries(draft.returns).forEach(([t, n]) => {
      let left = n;
      f.filter((c) => c.leased && c.type === t).sort((x, y) => x.gen - y.gen).forEach((c) => { const k = Math.min(left, c.count); c.count -= k; left -= k; });
    });
    f = f.filter((c) => c.count > 0);
    Object.entries(draft.leases).forEach(([t, n]) => { if (n > 0) f.push({ type: t, count: n, gen: turn, leased: true }); });
    return f;
  })();
  const oldCount = me.fleet.filter((c) => !c.leased && turn - c.gen >= 4).reduce((s, c) => s + c.count, 0);
  const lastPax = history.length && lastEntry.turn < turn ? lastEntry.pax : history.length > 1 ? history[history.length - 2].pax : baseline.pax;
  const outlook = (() => {
    const bars = [], needed = [];
    let need = (lastPax * homeDemand) / homeStart / 0.84;
    let m = pd.next[home];
    for (let p = 0; p < 5 && turn + p <= TURNS; p++) {
      const T = turn + p;
      const b = { label: `${yearOf(T)}`, SA: 0, LR: 0, WB: 0, onOrder: 0, draft: 0, count: 0 };
      fleetNow.forEach((c) => { if (T - c.gen < 6) { const A = ac(c.type); b[A.cat] += c.count * A.seats; b.count += c.count; } });
      me.pending.forEach((q) => { if (q.due <= T) { b.onOrder += q.count * ac(q.type).seats; b.count += q.count; } });
      if (p >= 1 && !isLast) Object.entries(draft.orders).forEach(([t, n]) => { b.draft += n * ac(t).seats; b.count += n; });
      if (p >= 1) {
        const g = baseGrowth(home, T);
        const f = (m.sh * Math.pow(1 + g.sh, 5) + m.long * Math.pow(1 + g.long, 5)) / (m.sh + m.long);
        m = { sh: m.sh * Math.pow(1 + g.sh, 5), long: m.long * Math.pow(1 + g.long, 5) };
        need *= f;
      }
      bars.push(b); needed.push(need);
    }
    return { bars, needed };
  })();
  const gapNext = outlook.bars[1] ? (outlook.bars[1].SA + outlook.bars[1].LR + outlook.bars[1].WB + outlook.bars[1].onOrder + outlook.bars[1].draft) / outlook.needed[1] - 1 : 0;

  const fleetRows = (() => {
    const map = {};
    me.fleet.forEach((c) => {
      const o = (map[c.type] ||= { type: c.type, owned: 0, leased: 0, ageSum: 0, old: 0 });
      if (c.leased) o.leased += c.count; else o.owned += c.count;
      o.ageSum += c.count * Math.max(0, turn - c.gen) * 5;
      if (!c.leased && turn - c.gen >= 4) o.old += c.count;
    });
    return Object.values(map).sort((a, b) => CATS.indexOf(ac(a.type).cat) - CATS.indexOf(ac(b.type).cat) || b.owned + b.leased - a.owned - a.leased);
  })();
  const catCount = { SA: 0, LR: 0, WB: 0 };
  me.fleet.forEach((c) => { catCount[ac(c.type).cat] += c.count; });
  const pendingCount = me.pending.reduce((s, p) => s + p.count, 0);
  const usedTypes = new Set(airlines.flatMap((a) => [...a.fleet.map((c) => c.type), ...a.pending.map((p) => p.type)]));

  const currentShare = history.length ? lastEntry.share : baseline.view.rows[0].share;
  const prevShare = history.length ? lastEntry.prevShare : currentShare;
  const cumNet = history.reduce((s, h) => s + h.pl.net, 0);

  /* ---------- Turn actions ---------- */
  const confirmDecision = () => {
    const decision = { strategy: draft.strategy, orders: isLast ? {} : clean(draft.orders), leases: clean(draft.leases), returns: clean(draft.returns), retire: draft.retire };
    const res = resolveTurn({ airlines, market, carbonPrice, turn, ev, decision, playerId });
    const prev = history.length ? lastEntry.view : baseline.view;
    const view = homeView(res.sim, res.airlines, playerId);
    const p = res.sim.byId[playerId];
    const after = res.airlines.find((a) => a.id === playerId);
    const m = res.meta[playerId];
    const cs = { SA: 0, LR: 0, WB: 0 };
    after.fleet.forEach((c) => { const A = ac(c.type); cs[A.cat] += c.count * A.seats; });
    const lim = creditLimit(after, turn);
    const entry = {
      turn, period: `${yearOf(turn)}–${yearOf(turn + 1)}`, eventId: ev.id, crisis: ev.crisis, signalId: signal ? signal.id : null,
      strategy: decision.strategy, switched: after.switched, orders: m.orders, leases: m.leases, returns: m.returns, spend: m.spend,
      capacity, investRate: capacity > 0 ? Math.min(1, (m.spend + m.leaseBill) / capacity) : 0, retire: decision.retire, retired: m.retired,
      share: view.rows[0].share, prevShare: prev.rows[0].share, worldShare: p.worldShare, pax: p.pax, load: p.load,
      pl: { revenue: p.revenue, fuel: p.fuel, nonFuel: p.nonFuel, carbon: p.carbon, lease: p.lease, dep: p.dep, switchCost: p.switchCost,
            ebit: p.ebit, interest: p.interest, tax: p.tax, net: p.net, cashFlow: p.cashFlow },
      cashAfter: after.cash, debtRatio: lim > 0 ? Math.max(0, -after.cash) / lim : 0, breach: after.breach,
      co2Mt: p.co2 / 1e6, intensity: p.intensity, industryIntensity: res.sim.industryIntensity,
      seats: p.seats, seatsStart: seatsOf(me.fleet), homeDemand, homeDemandStart: homeStart, w, catSeats: cs,
      view, prevView: prev, nextMarket: res.pd.next, cp: res.cp,
      ranking: res.airlines.map((a) => ({ id: a.id, name: a.name, region: a.region, worldShare: res.sim.byId[a.id].worldShare })).sort((a, b) => b.worldShare - a.worldShare),
      insight: buildInsight({ view, prev, sim: res.sim, ev, turn, meta: res.meta, playerId, isLast }),
    };
    setAirlines(res.airlines);
    setHistory([...history, entry]);
    if (after.breach >= 2) setBankrupt(true);
    setPhase(3);
  };

  const nextTurn = () => {
    if (isLast || bankrupt) { setScreen("final"); return; }
    setAirlines(airlines.map((a) => advanceAirline(a, turn + 1, playerId)));
    setMarket(lastEntry.nextMarket);
    setCarbonPrice(lastEntry.cp + CARBON_STEP);
    setTurn(turn + 1); setPhase(1); setDraft(emptyDraft(draft.strategy));
  };

  const phases = [
    { n: 1, label: "Market Outlook", icon: Globe }, { n: 2, label: "Strategy & Fleet", icon: Target },
    { n: 3, label: "Competition", icon: Users }, { n: 4, label: "Insights", icon: Lightbulb },
  ];
  const EvIcon = EVENT_ICONS[ev.icon] || Activity;
  const sigEvent = signal ? EVENT_BY_ID[signal.id] : null;
  const mapValues = Object.fromEntries(REGION_IDS.map((r) => [r, `${signed(annual(r) * 100)}%/yr`]));
  const maxG = Math.max(0.01, ...REGION_IDS.map((r) => annual(r)));
  const mapIntensity = Object.fromEntries(REGION_IDS.map((r) => [r, Math.max(0, annual(r)) / maxG]));
  const rowColor = [TEAL, PINK, "#ffffff", "#94a3b8"];

  return (
    <div className="aero-root min-h-screen bg-gray-100 px-4 py-5 text-slate-800 sm:px-6">
      <GlobalStyle />
      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        {/* Header banner */}
        <Sky plane className="rounded-3xl px-6 py-5 text-white shadow-xl sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white/80"><Plane size={14} /> AeroMarket Simulator · The GMF Challenge</div>
              <div className="aero-display aero-num mt-1 text-3xl font-bold sm:text-4xl">{yearOf(turn)} – {yearOf(turn + 1)}</div>
              <div className="mt-1 text-sm text-white/90">{me.name} · {R.name} · {ARCHETYPES[me.arch].label}</div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <GhostButton dark id="save-game" onClick={saveGame}>{saved ? <Check size={15} /> : <Download size={15} />} {saved ? "Saved" : "Save game"}</GhostButton>
              <div className="aero-num text-right text-xs text-white/80">Turn {turn + 1} of {TURNS} · scenario {seed}</div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            {Array.from({ length: TURNS }, (_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < turn ? "bg-white" : i === turn ? "bg-[#d30068]" : "bg-white/25"}`} />
            ))}
          </div>
        </Sky>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Kpi icon={DollarSign} label={(phase === 2 ? cashAfter : me.cash) < 0 ? "Debt" : "Cash"} value={Math.abs(phase === 2 ? cashAfter : me.cash)} format={money}
            sub={phase === 2 && spend > 0 ? `${money(spend)} committed to orders` : me.cash < 0 ? `${pct(debtRatio, 0)} of credit limit used` : `Credit limit ${money(limit)}`} />
          <Kpi icon={Plane} label="Active fleet" value={countOf(me.fleet)} sub={`${num(catCount.SA)} SA · ${num(catCount.LR)} LR · ${num(catCount.WB)} WB`} accent="pink" />
          <Kpi icon={Package} label="On order" value={pendingCount} sub={pendingCount ? `Next delivery ${yearOf(Math.min(...me.pending.map((q) => q.due)))}` : "Nothing in production"} />
          <Kpi icon={BarChart3} label="Home market share" value={currentShare * 100} format={(v) => `${v.toFixed(1)}%`}
            sub={history.length ? `${signed((currentShare - prevShare) * 100)} pts last period` : `Starting position in ${R.name}`} accent="pink" />
          <div className="col-span-2 lg:col-span-1"><Kpi icon={Trophy} label="Net profit to date" value={cumNet} format={money} sub="Since 2025" /></div>
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
              <NavyCard className="lg:col-span-2">
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
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Demand in {R.name}</div>
                    <div className={`aero-display aero-num mt-1 text-2xl font-semibold ${annual(home) < 0.015 ? "text-[#ff4d9d]" : "text-[#00b4b4]"}`}>{signed(annual(home) * 100)}%</div>
                    <div className="text-[11px] text-slate-300">CAGR · GMF baseline {signed(baseAnnual(home) * 100)}%{turn > 3 ? " (extrapolated)" : ""}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Fuel price</div>
                    <div className="aero-display aero-num mt-1 text-2xl font-semibold">{ev.fuel === 1 ? "Stable" : `${signed((ev.fuel - 1) * 100, 0)}%`}</div>
                    <div className="text-[11px] text-slate-300">versus long-run level</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Carbon price</div>
                    <div className="aero-display aero-num mt-1 text-2xl font-semibold">${Math.round(cp)}/t</div>
                    <div className="text-[11px] text-slate-300">{ev.carbonAdd > 0 ? `Permanent step of $${ev.carbonAdd}/t` : `Rising $${CARBON_STEP}/t every period`}</div>
                  </div>
                  <div className="rounded-xl bg-white/5 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-slate-300">Fares</div>
                    <div className="aero-display aero-num mt-1 text-2xl font-semibold">{ev.yield === 1 ? "Stable" : `${signed((ev.yield - 1) * 100, 0)}%`}</div>
                    <div className="text-[11px] text-slate-300">before competition effects</div>
                  </div>
                </div>
                <div className="mt-5">
                  <div className="text-[11px] uppercase tracking-wider text-slate-300">Where your home demand will be</div>
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

              <div className="flex flex-col gap-4 lg:col-span-3">
                <WhiteCard className="p-3">
                  <WorldMap home={home} values={mapValues} intensity={mapIntensity} hot={ev.regions || []} routes />
                  <div className="px-1 pt-2 text-xs text-slate-500">Passenger demand growth per year in this period, by region. Pulsing rings mark the regions this event hits; routes start from your home region.</div>
                </WhiteCard>
                <NavyCard>
                  <Eyebrow icon={Radar} tone="pink">Early signal for {yearOf(turn + 1)}–{yearOf(turn + 2)}</Eyebrow>
                  {sigEvent ? (
                    <>
                      <div className="aero-display mt-2 text-lg font-semibold">{sigEvent.title}</div>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">Analysts see this as the most likely next scenario. Early signals are right about three times out of four, and aircraft you buy now arrive in that period.</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-relaxed text-slate-300">Final period. The simulation ends in {yearOf(TURNS)}, so new orders would arrive too late to fly. Leasing still works.</p>
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
              <p className="text-sm text-slate-500">Takes effect immediately. Changing strategy costs {Math.round(SWITCH_COST * 100)}% of this period's revenue and weakens your network while it is rebuilt.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {["HUB", "P2P"].map((k) => {
                const Icon = k === "HUB" ? Share2 : ArrowLeftRight;
                const on = draft.strategy === k;
                return (
                  <button key={k} id={`strategy-${k}`} onClick={() => setDraft({ ...draft, strategy: k })} aria-pressed={on}
                    className={`group overflow-hidden rounded-2xl text-left shadow-lg transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/50 ${
                      on ? "ring-4 ring-[#00b4b4] ring-offset-2 ring-offset-gray-100" : "opacity-90 hover:-translate-y-0.5 hover:opacity-100"}`}>
                    <Sky variant={k === "HUB" ? "hub" : "p2p"} className="h-full p-5 text-white">
                      <Icon size={96} className="pointer-events-none absolute -right-3 -top-3 text-white/10" />
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2"><Icon size={20} /><span className="aero-display text-xl font-semibold">{STRAT[k].name}</span>
                          {me.strategy === k && <span className="rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-semibold">Current network</span>}</div>
                        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition ${on ? "border-[#00b4b4] bg-[#00b4b4] text-[#0c1a2e]" : "border-white/60"}`}>{on && <Check size={14} />}</span>
                      </div>
                      <p className="mt-2 text-sm leading-relaxed text-white/90">{STRAT[k].blurb}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
                        {SEGS.map((s) => <span key={s} className="rounded-full bg-black/25 px-2.5 py-1">{SEG_INFO[s].name} {signed((STRAT[k].mult[s] - 1) * 100, 0)}%</span>)}
                      </div>
                    </Sky>
                  </button>
                );
              })}
            </div>

            <div className="mt-2">
              <h2 className="aero-display text-xl font-semibold text-[#1a2942]">2. Capacity plan</h2>
              <p className="text-sm text-slate-500">What will still be flying, what is on order, and the seats your home market will need. The chart updates as you buy, lease or retire.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-5">
              <NavyCard className="lg:col-span-3">
                <Eyebrow icon={CalendarClock}>Fleet timeline and seats needed</Eyebrow>
                <div className="mt-3"><CapacityOutlook bars={outlook.bars} needed={outlook.needed} /></div>
                {outlook.bars[1] && (
                  <p className={`mt-3 text-sm font-semibold ${Math.abs(gapNext) <= 0.06 ? "text-[#5eead4]" : "text-[#ff4d9d]"}`}>
                    {yearOf(turn + 1)}: {Math.abs(gapNext) <= 0.06 ? "capacity is in line with the seats needed." : gapNext < 0 ? `${pct(-gapNext, 0)} short of the seats needed. Rivals will take the difference.` : `${pct(gapNext, 0)} more seats than needed. Empty seats start fare wars.`}
                  </p>
                )}
              </NavyCard>
              <NavyCard className="lg:col-span-2">
                <Eyebrow icon={Landmark} tone="pink">Financing</Eyebrow>
                <div className="aero-num mt-3 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between gap-2"><span className="text-slate-300">{me.cash < 0 ? "Debt today" : "Cash today"}</span><strong>{money(Math.abs(me.cash))}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-300">Credit limit (70% of fleet value)</span><strong>{money(limit)}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-300">Order capacity</span><strong>{money(capacity)}</strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-300">Orders this period</span><strong className="text-[#5eead4]"><Count value={spend} format={money} /></strong></div>
                  <div className="flex justify-between gap-2"><span className="text-slate-300">New leases, rent per period</span><strong className="text-[#5eead4]"><Count value={leaseBill} format={money} /></strong></div>
                  <div className="flex justify-between gap-2 border-t border-white/10 pt-2"><span className="text-slate-300">{cashAfter < 0 ? "Debt after orders" : "Cash after orders"}</span><strong className={cashAfter < 0 ? "text-[#ff4d9d]" : ""}><Count value={Math.abs(cashAfter)} format={money} /></strong></div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#00b4b4] transition-all duration-500" style={{ width: `${capacity > 0 ? Math.min(100, (spend / capacity) * 100) : 0}%` }} /></div>
                <p className="mt-3 text-xs leading-relaxed text-slate-300">Ordered aircraft count as collateral, so you can order more than your cash. Debt costs 22% interest per period. Debt above the credit limit two periods in a row means bankruptcy.</p>
                {me.breach > 0 && <p className="mt-2 rounded-lg bg-[#d30068] px-3 py-2 text-xs font-semibold text-white">Covenant breach: your debt exceeds your credit limit. One more period like this and creditors take over.</p>}
              </NavyCard>
            </div>

            <div className="mt-2">
              <h2 className="aero-display text-xl font-semibold text-[#1a2942]">3. Aircraft portfolio</h2>
              <p className="text-sm text-slate-500">
                {isLast ? `The order book is closed: aircraft bought now would be delivered after ${yearOf(TURNS)}. You can still lease.`
                  : <>Bought aircraft enter service in <strong className="text-[#d30068]">{yearOf(turn + 1)}</strong>. Leased aircraft fly now; lessors can supply up to {leaseCap} this period ({newLeases} taken).</>}
              </p>
            </div>
            <Portfolio turn={turn} cp={cp} fuel={ev.fuel} me={me} orders={draft.orders} leases={draft.leases} capacity={capacity} leaseCap={leaseCap} isLast={isLast}
              setOrders={(o) => setDraft({ ...draft, orders: o })} setLeases={(l) => setDraft({ ...draft, leases: l })}
              onAddCustom={addCustom} onDeleteCustom={deleteCustom} usedTypes={usedTypes} />

            <div className="mt-2">
              <h2 className="aero-display text-xl font-semibold text-[#1a2942]">4. Fleet in service</h2>
              <p className="text-sm text-slate-500">Aircraft are scrapped automatically at 30 years. Older aircraft burn more fuel and cost more to maintain.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-3">
              <WhiteCard className="lg:col-span-2">
                <div className="overflow-x-auto">
                  <table className="aero-num w-full min-w-[520px] text-sm">
                    <thead className="text-left text-xs text-slate-500"><tr><th className="py-1 font-medium">Type</th><th className="text-right font-medium">Owned</th><th className="text-right font-medium">Leased</th><th className="text-right font-medium">Avg. age</th><th className="text-right font-medium">20+ years</th><th className="text-right font-medium">Return leased</th></tr></thead>
                    <tbody>
                      {fleetRows.map((r) => {
                        const A = ac(r.type), n = r.owned + r.leased;
                        return (
                          <tr key={r.type} className="border-t border-slate-100">
                            <td className="py-1.5 font-medium text-slate-800">{A.name} <span className="text-xs font-normal text-slate-400">{CAT_NAME[A.cat]}</span></td>
                            <td className="text-right">{num(r.owned)}</td><td className="text-right">{num(r.leased)}</td>
                            <td className="text-right">{(r.ageSum / n).toFixed(0)} yrs</td>
                            <td className={`text-right ${r.old ? "font-semibold text-[#d30068]" : ""}`}>{num(r.old)}</td>
                            <td className="text-right">
                              {r.leased > 0 ? (
                                <input type="number" min="0" max={r.leased} value={draft.returns[r.type] || 0} aria-label={`Leased ${A.name} to return`}
                                  onChange={(e) => setDraft({ ...draft, returns: { ...draft.returns, [r.type]: Math.max(0, Math.min(r.leased, Math.floor(Number(e.target.value) || 0))) } })}
                                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm focus:border-[#00b4b4] focus:outline-none" />
                              ) : "–"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </WhiteCard>
              <WhiteCard>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Optional: early retirement</div>
                <label htmlFor="retire-toggle" className={`mt-3 flex items-start gap-3 ${oldCount ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}>
                  <input id="retire-toggle" type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#d30068]" checked={draft.retire} disabled={!oldCount} onChange={(e) => setDraft({ ...draft, retire: e.target.checked })} />
                  <span className="text-sm leading-relaxed text-slate-700">
                    <strong>Retire all {num(oldCount)} owned aircraft aged 20+ years now.</strong> Cuts fuel burn and carbon costs immediately, but you lose the seats this period and recover only 8% of the price.
                  </span>
                </label>
              </WhiteCard>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="aero-num text-sm text-slate-600">
                Orders <strong className="text-[#1a2942]">{money(spend)}</strong> of {money(capacity)} capacity · {newLeases} new leases
                {switching && <span className="ml-2 font-semibold text-[#d30068]">Strategy switch: {Math.round(SWITCH_COST * 100)}% of revenue</span>}
                {!draft.strategy && <span className="ml-2 font-semibold text-[#d30068]">Choose a network strategy to continue</span>}
              </div>
              <div className="flex gap-2">
                <button id="back-outlook" onClick={() => setPhase(1)} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/30">Back to outlook</button>
                <PrimaryButton id="confirm-decision" disabled={!draft.strategy} onClick={confirmDecision}>Commit and compete <ChevronRight size={18} /></PrimaryButton>
              </div>
            </div>
          </div>
        )}

        {/* ---------- Phase 3: Competitive Resolution ---------- */}
        {phase === 3 && resolved && (
          <div key={`p3-${turn}`} className="aero-in flex flex-col gap-4">
            <div className="grid gap-4 lg:grid-cols-5">
              <WhiteCard className="p-3 lg:col-span-3"><WorldMap home={home} hot={[home]} routes busy /></WhiteCard>
              <NavyCard className="lg:col-span-2">
                <Eyebrow icon={Users}>Competitive resolution · {lastEntry.period}</Eyebrow>
                <h2 className="aero-display mt-2 text-2xl font-semibold">{reveal < 5 ? `The battle for ${R.name}…` : "The market has spoken"}</h2>
                <div className="mt-5 flex flex-col gap-4">
                  {lastEntry.view.rows.map((r, i) => {
                    const shown = reveal > i;
                    const before = lastEntry.prevView.rows.find((x) => x.id === r.id);
                    const from = before ? before.share : 0, to = r.share, d = to - from;
                    return (
                      <div key={r.id}>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: rowColor[i] }} />
                            <span className="font-semibold">{r.kind === "you" ? "You" : r.name}</span>
                            <span className="flex items-center gap-1 text-xs text-slate-300">
                              {r.kind === "you" ? STRAT[r.strategy].name : r.kind === "foreign" ? (shown && r.lead ? <><Eye size={12} /> led by {r.lead}</> : "from other regions")
                                : shown ? <><Eye size={12} /> {ARCHETYPES[r.kind].label} · {STRAT[r.strategy].name}</> : <><Lock size={12} /> Strategy hidden</>}
                            </span>
                          </div>
                          <div className="aero-num flex items-center gap-2">
                            <span className="aero-display text-lg font-semibold">{pct(shown ? to : from)}</span>
                            {shown && <span className={`text-xs font-semibold ${d >= 0 ? "text-[#5eead4]" : "text-[#ff4d9d]"}`}>{signed(d * 100)} pts</span>}
                          </div>
                        </div>
                        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-white/10">
                          <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(100, (shown ? to : from) * 150)}%`, background: rowColor[i] }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </NavyCard>
            </div>
            <div className="flex justify-end"><PrimaryButton id="to-insights" disabled={reveal < 5} onClick={() => setPhase(4)}>View insights <ChevronRight size={18} /></PrimaryButton></div>
          </div>
        )}

        {/* ---------- Phase 4: Insights & Analytics ---------- */}
        {phase === 4 && resolved && (() => {
          const h = lastEntry, d = h.share - h.prevShare, pl = h.pl, margin = pl.revenue ? pl.ebit / pl.revenue : 0;
          const rel = h.industryIntensity ? h.intensity / h.industryIntensity - 1 : 0;
          const lines = [
            ["Revenue", pl.revenue, false], ["Fuel", -pl.fuel, false], ["Carbon charges", -pl.carbon, false], ["Crew, maintenance, airports", -pl.nonFuel, false],
            ["Lease rents", -pl.lease, false], ["Depreciation", -pl.dep, false], ...(pl.switchCost > 0 ? [["Network restructuring", -pl.switchCost, false]] : []),
            ["Operating profit", pl.ebit, true], ["Interest", -pl.interest, false], ["Tax", -pl.tax, false], ["Net profit", pl.net, true],
          ];
          return (
            <div key={`p4-${turn}`} className="aero-in flex flex-col gap-4">
              {bankrupt && (
                <div className="rounded-2xl bg-[#d30068] p-4 text-sm font-semibold text-white"><AlertTriangle size={16} className="mr-2 inline" />Your debt has exceeded your credit limit for two periods in a row. Creditors are taking over {me.name}; the game ends here.</div>
              )}
              {!bankrupt && h.breach > 0 && (
                <div className="rounded-2xl bg-[#d30068] p-4 text-sm font-semibold text-white"><AlertTriangle size={16} className="mr-2 inline" />Covenant breach: debt is at {pct(h.debtRatio, 0)} of your credit limit. Bring it back under 100% next period or creditors take over.</div>
              )}
              <div className="aero-stagger grid gap-3 sm:grid-cols-3">
                <NavyCard>
                  <Eyebrow icon={BarChart3}>Home market share</Eyebrow>
                  <div className="aero-display aero-num mt-2 text-4xl font-semibold"><Count value={h.share * 100} format={(v) => `${v.toFixed(1)}%`} /></div>
                  <div className={`aero-num mt-1 flex items-center gap-1 text-sm font-semibold ${d >= 0 ? "text-[#5eead4]" : "text-[#ff4d9d]"}`}>
                    {d >= 0 ? <TrendingUp size={15} /> : <TrendingDown size={15} />}{signed(d * 100)} pts versus previous period
                  </div>
                  <div className="aero-num mt-1 text-xs text-slate-300">{pct(h.worldShare)} of world passengers</div>
                </NavyCard>
                <NavyCard>
                  <Eyebrow icon={DollarSign}>Profitability</Eyebrow>
                  <div className={`aero-display aero-num mt-2 text-4xl font-semibold ${pl.ebit < 0 ? "text-[#ff4d9d]" : ""}`}><Count value={pl.ebit} format={money} /></div>
                  <div className="aero-num mt-1 text-sm text-slate-300">Operating profit · {pct(margin)} margin · {pct(h.load, 0)} load factor</div>
                  <div className="aero-num mt-1 text-xs text-slate-300">Net {money(pl.net)} · cash flow {money(pl.cashFlow)}</div>
                </NavyCard>
                <NavyCard>
                  <Eyebrow icon={Leaf}>Carbon footprint</Eyebrow>
                  <div className="aero-display aero-num mt-2 text-4xl font-semibold"><Count value={h.co2Mt} format={(v) => v.toFixed(0)} /><span className="ml-1 text-lg text-slate-300">Mt CO₂</span></div>
                  <div className={`aero-num mt-1 text-sm font-semibold ${rel <= 0 ? "text-[#5eead4]" : "text-[#ff4d9d]"}`}>
                    {Math.abs(rel) < 0.005 ? "In line with" : `${Math.abs(rel * 100).toFixed(0)}% ${rel <= 0 ? "below" : "above"}`} industry average per seat
                  </div>
                  <div className="aero-num mt-1 text-xs text-slate-300">Over five years · {money(pl.carbon)} carbon bill</div>
                </NavyCard>
              </div>

              <div className="grid gap-4 lg:grid-cols-5">
                <div className="rounded-2xl border-l-4 border-[#d30068] bg-white p-5 shadow-sm lg:col-span-2">
                  <Tag><Lightbulb size={12} /> Insight</Tag>
                  <div className="mt-3 flex flex-col gap-3">
                    {h.insight.map((line, i) => <p key={i} className={`leading-relaxed ${i === 0 ? "text-base font-semibold text-[#1a2942]" : "text-sm text-slate-600"}`}>{line}</p>)}
                  </div>
                  <div className="mt-4 border-t border-slate-100 pt-3">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your home share by segment</div>
                    <div className="aero-num mt-2 flex flex-col gap-1.5 text-sm">
                      {SEGS.map((s) => {
                        const ds = h.view.rows[0].seg[s] - h.prevView.rows[0].seg[s];
                        return (
                          <div key={s} className="flex items-center justify-between gap-2">
                            <span className="text-slate-600">{SEG_INFO[s].name}</span>
                            <span><strong className="text-[#1a2942]">{pct(h.view.rows[0].seg[s])}</strong><span className={`ml-2 text-xs font-semibold ${ds >= 0 ? "text-[#008a8a]" : "text-[#d30068]"}`}>{signed(ds * 100)}</span></span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-4 lg:col-span-3">
                  <NavyCard>
                    <Eyebrow icon={Activity}>Home market share by period · {R.name}</Eyebrow>
                    <div className="mt-3"><ShareChart history={history} /></div>
                  </NavyCard>
                  <WhiteCard>
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Five-year income statement</div>
                    <table className="aero-num mt-2 w-full text-sm">
                      <tbody>
                        {lines.map(([label, v, bold]) => (
                          <tr key={label} className={bold ? "border-t border-slate-200" : ""}>
                            <td className={`py-1 ${bold ? "font-semibold text-[#1a2942]" : "text-slate-600"}`}>{label}</td>
                            <td className={`py-1 text-right ${bold ? "font-semibold" : ""} ${v < 0 && bold ? "text-[#d30068]" : "text-slate-800"}`}>{money(v)}</td>
                            <td className="w-16 py-1 text-right text-xs text-slate-400">{pl.revenue ? pct(Math.abs(v) / pl.revenue, 0) : ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </WhiteCard>
                </div>
              </div>
              <div className="flex justify-end">
                <PrimaryButton id="next-turn" onClick={nextTurn}>
                  {isLast || bankrupt ? <>Open Behavioral Analytics <Brain size={18} /></> : <>Advance to {yearOf(turn + 1)} <ChevronRight size={18} /></>}
                </PrimaryButton>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
