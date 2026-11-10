import React, { useMemo, useRef, useState } from "react";
import { Plane, ChevronRight, Upload, Shuffle, Check, Globe, Target, Clock, Brain } from "lucide-react";
import WorldMap from "../components/WorldMap.jsx";
import { Sky, Tag, NavyCard, WhiteCard, PrimaryButton, GhostButton, num } from "../components/ui.jsx";
import { REGIONS, REGION_IDS, WORLD } from "../data/gmf.js";
import { ARCHETYPES } from "../game/airlines.js";
import { ac } from "../game/aircraft.js";
import { initWorld, randomSeed, countOf } from "../game/engine.js";

export default function Start({ onStart, onLoad, loadError }) {
  const world = useMemo(() => initWorld(), []);
  const [region, setRegion] = useState("EU");
  const [pick, setPick] = useState(null);
  const [seed, setSeed] = useState(randomSeed);
  const file = useRef(null);
  const R = REGIONS[region];
  const groups = world.airlines.filter((a) => a.region === region);
  const values = Object.fromEntries(REGION_IDS.map((r) => [r, `+${(REGIONS[r].cagr * 100).toFixed(1)}%/yr`]));
  const maxG = Math.max(...REGION_IDS.map((r) => REGIONS[r].cagr));
  const intensity = Object.fromEntries(REGION_IDS.map((r) => [r, REGIONS[r].cagr / maxG]));
  const stats = (a) => {
    const n = countOf(a.fleet);
    const wb = a.fleet.filter((c) => ac(c.type).cat === "WB").reduce((s, c) => s + c.count, 0);
    const leased = a.fleet.filter((c) => c.leased).reduce((s, c) => s + c.count, 0);
    const age = a.fleet.reduce((s, c) => s + c.count * -c.gen * 5, 0) / n;
    return { n, wb, leased: leased / n, age };
  };
  return (
    <div className="aero-root min-h-screen bg-gray-100 px-4 py-6 text-slate-800 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <Sky plane className="aero-in rounded-3xl p-8 text-white shadow-xl sm:p-12">
          <Tag tone="teal"><Plane size={12} /> Serious game</Tag>
          <h1 className="aero-display mt-4 text-4xl font-bold leading-tight sm:text-6xl">AeroMarket Simulator</h1>
          <p className="aero-display mt-1 text-xl text-white/90 sm:text-2xl">The GMF Challenge</p>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-white/90">
            Take control of an airline group. Read the market forecast, choose your network strategy, build your fleet from a
            portfolio of real aircraft, and defend your home market from 2025 to 2075.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <input ref={file} id="load-file" type="file" accept="application/json,.json" className="hidden" onChange={(e) => { if (e.target.files[0]) onLoad(e.target.files[0]); e.target.value = ""; }} />
            <GhostButton dark id="load-game" onClick={() => file.current.click()}><Upload size={15} /> Load a saved game</GhostButton>
            {loadError && <span className="rounded-lg bg-[#d30068] px-3 py-1.5 text-sm font-semibold text-white">{loadError}</span>}
          </div>
        </Sky>

        <div className="aero-stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Globe, t: "Market Outlook", d: "Traffic growth by region follows the Airbus GMF 2026 forecast, plus one market event per five-year turn." },
            { icon: Target, t: "Strategy & Fleet", d: "Hub & Spoke or Point-to-Point, then buy or lease aircraft with cash and asset-backed debt." },
            { icon: Clock, t: "Five-year lead time", d: "Aircraft you buy arrive next turn. Leased aircraft fly now, at a higher cost." },
            { icon: Brain, t: "Behavioral profile", d: "In 2075 the game reports your consistency, risk appetite and alignment with long-term trends." },
          ].map(({ icon: Icon, t, d }, i) => (
            <NavyCard key={t}>
              <Icon size={22} className={i % 2 ? "text-[#ff4d9d]" : "text-[#00b4b4]"} />
              <div className="aero-display mt-3 text-base font-semibold">{t}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{d}</p>
            </NavyCard>
          ))}
        </div>

        <div>
          <h2 className="aero-display text-xl font-semibold text-[#1a2942]">1. Choose your home region</h2>
          <p className="text-sm text-slate-500">Figures on the map: growth of passengers originating from the region, 2025–2045 (GMF 2026).</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <WhiteCard className="p-3 lg:col-span-2"><WorldMap selected={region} onSelect={(r) => { setRegion(r); setPick(null); }} values={values} intensity={intensity} /></WhiteCard>
          <NavyCard className="aero-in" key={region}>
            <Tag tone="teal">{R.name}</Tag>
            <div className="aero-num mt-4 flex flex-col gap-3 text-sm">
              <div><div className="text-xs uppercase tracking-wider text-slate-300">Passengers per year</div><div className="aero-display text-xl font-semibold">{num(R.trips25)}M → {num(R.trips45)}M</div><div className="text-xs text-slate-300">2025 → 2045, +{(R.cagr * 100).toFixed(1)}% a year</div></div>
              <div><div className="text-xs uppercase tracking-wider text-slate-300">Fleet in service</div><div className="aero-display text-xl font-semibold">{num(R.fleet25)} → {num(R.fleet45)}</div><div className="text-xs text-slate-300">passenger aircraft, 100+ seats</div></div>
              <div><div className="text-xs uppercase tracking-wider text-slate-300">New deliveries 2026–2045</div><div className="aero-display text-xl font-semibold">{num(R.delSA + R.delWB)}</div><div className="text-xs text-slate-300">{num(R.delSA)} single-aisle · {num(R.delWB)} widebody</div></div>
              <div><div className="text-xs uppercase tracking-wider text-slate-300">Long-haul flows</div><div className="aero-display text-xl font-semibold">+{(R.lhCagr * 100).toFixed(1)}% a year</div><div className="text-xs text-slate-300">World fleet: {num(WORLD.fleet25)} → {num(WORLD.fleet45)}</div></div>
            </div>
          </NavyCard>
        </div>

        <div>
          <h2 className="aero-display text-xl font-semibold text-[#1a2942]">2. Choose the airline group you will run</h2>
          <p className="text-sm text-slate-500">Fictional groups. Each stands for a family of similar real carriers; together they add up to the region's 2025 fleet. The two others become your home rivals.</p>
        </div>
        <div className="aero-stagger grid gap-4 md:grid-cols-3" key={`g-${region}`}>
          {groups.map((a) => {
            const s = stats(a), on = pick === a.id, T = ARCHETYPES[a.arch];
            return (
              <button key={a.id} id={`pick-${a.arch}`} onClick={() => setPick(a.id)} aria-pressed={on}
                className={`aero-hover rounded-2xl text-left focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/50 ${on ? "ring-4 ring-[#00b4b4] ring-offset-2 ring-offset-gray-100" : ""}`}>
                <NavyCard className="h-full">
                  <div className="flex items-start justify-between gap-2">
                    <Tag tone={a.arch === "disrupter" ? "pink" : "teal"}>{T.label}</Tag>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#00b4b4] bg-[#00b4b4] text-[#0c1a2e]" : "border-white/50"}`}>{on && <Check size={14} />}</span>
                  </div>
                  <div className="aero-display mt-3 text-xl font-semibold">{a.name}</div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{T.blurb}</p>
                  <div className="aero-num mt-4 grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-white/5 p-2"><div className="text-[11px] uppercase tracking-wider text-slate-300">Aircraft</div><div className="font-semibold">{num(s.n)}</div></div>
                    <div className="rounded-lg bg-white/5 p-2"><div className="text-[11px] uppercase tracking-wider text-slate-300">Widebodies</div><div className="font-semibold">{num(s.wb)}</div></div>
                    <div className="rounded-lg bg-white/5 p-2"><div className="text-[11px] uppercase tracking-wider text-slate-300">Average age</div><div className="font-semibold">{s.age.toFixed(0)} years</div></div>
                    <div className="rounded-lg bg-white/5 p-2"><div className="text-[11px] uppercase tracking-wider text-slate-300">Leased</div><div className="font-semibold">{Math.round(s.leased * 100)}%</div></div>
                  </div>
                  <div className="mt-3 text-xs text-slate-300">{T.difficulty}</div>
                </NavyCard>
              </button>
            );
          })}
        </div>

        <WhiteCard className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <label htmlFor="seed" className="aero-display text-xl font-semibold text-[#1a2942]">3. Scenario code</label>
            <p className="text-sm text-slate-500">The same code always produces the same 50 years of events. Share it so colleagues face the identical scenario.</p>
            <div className="mt-2 flex gap-2">
              <input id="seed" value={seed} maxLength={24} onChange={(e) => setSeed(e.target.value.toUpperCase())}
                className="aero-num w-48 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold tracking-wider text-slate-800 focus:border-[#00b4b4] focus:outline-none focus:ring-2 focus:ring-[#00b4b4]/30" />
              <GhostButton onClick={() => setSeed(randomSeed())}><Shuffle size={15} /> New code</GhostButton>
            </div>
          </div>
          <PrimaryButton id="begin" disabled={!pick || !seed.trim()} onClick={() => onStart(seed.trim(), pick)}>
            {pick ? "Take the controls" : "Choose an airline group"} <ChevronRight size={18} />
          </PrimaryButton>
        </WhiteCard>
        <p className="pb-4 text-xs leading-relaxed text-slate-500">
          Traffic, fleet and delivery figures: Airbus Global Market Forecast 2026–2045 public dataset, aggregated into eight regions. Growth after 2045 is the game's own extrapolation.
          Aircraft figures are indicative public orders of magnitude. Airline groups, events and financial results are fictional.
        </p>
      </div>
    </div>
  );
}
