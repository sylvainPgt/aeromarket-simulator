import React, { useState } from "react";
import { Plus, Minus, X, Trash2, PenTool, Leaf } from "lucide-react";
import AircraftArt from "./AircraftArt.jsx";
import { Tag, NavyCard, PrimaryButton, GhostButton, PINK, TEAL } from "./ui.jsx";
import { allAircraft, enrich, CAT_NAME } from "../game/aircraft.js";
import { canOrder, canLease, seatCost, SEGS, SEG_INFO, LEASE_RATE, START_YEAR, TURNS, yearOf } from "../game/engine.js";

const CAT_ORDER = { SA: 0, LR: 1, WB: 2 };

const Stepper = ({ id, value, max, onChange, disabled, label }) => (
  <div className="flex items-center gap-1.5">
    <button aria-label={`Fewer: ${label}`} disabled={disabled || value <= 0} onClick={() => onChange(value - 1)}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4] disabled:opacity-30"><Minus size={14} /></button>
    <input id={id} type="number" min="0" max={max} value={value} disabled={disabled} aria-label={label}
      onChange={(e) => onChange(Math.max(0, Math.min(max, Math.floor(Number(e.target.value) || 0))))}
      className="aero-num h-8 w-16 rounded-lg border border-white/15 bg-white/5 px-1 text-center text-sm font-semibold text-white focus:border-[#00b4b4] focus:outline-none disabled:opacity-40" />
    <button aria-label={`More: ${label}`} disabled={disabled || value >= max} onClick={() => onChange(value + 1)}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4] disabled:opacity-30"><Plus size={14} /></button>
    <button disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 10))}
      className="h-8 shrink-0 rounded-lg bg-white/10 px-2 text-xs font-semibold transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4] disabled:opacity-30">+10</button>
  </div>
);

export const Spec = ({ label, value }) => (
  <div className="rounded-lg bg-white/5 px-2 py-1.5"><div className="text-[10px] uppercase tracking-wider text-slate-300">{label}</div><div className="aero-num text-sm font-semibold">{value}</div></div>
);

export const Capability = ({ A }) => (
  <div className="flex flex-col gap-1">
    {SEGS.map((s) => (
      <div key={s} className="flex items-center gap-2 text-[11px] text-slate-300">
        <span className="w-24 shrink-0">{SEG_INFO[s].name}</span>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full transition-all duration-500" style={{ width: `${A.cap[s] * 100}%`, background: s === "LT" ? "#ff4d9d" : s === "LH" ? "#e2e8f0" : TEAL }} /></div>
      </div>
    ))}
  </div>
);

function AircraftCard({ A, turn, cp, fuel, inFleet, order, lease, maxOrder, maxLease, onOrder, onLease, isLast, onDelete }) {
  const orderable = canOrder(A, turn) && !isLast, leasable = canLease(A, turn);
  const accent = A.custom ? "#ff4d9d" : A.concept ? "#ff4d9d" : TEAL;
  return (
    <NavyCard className={`aero-hover flex min-w-0 flex-col gap-3 ${!canOrder(A, turn) ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <Tag tone={A.cat === "LR" ? "pink" : "teal"}>{CAT_NAME[A.cat]}</Tag>
            {A.concept && <Tag tone="ghost">Concept</Tag>}
            {A.custom && <Tag tone="ghost">Yours</Tag>}
            {A.co2 === 0 && <Tag tone="ghost"><Leaf size={11} /> Zero CO₂</Tag>}
          </div>
          <div className="aero-display mt-2 truncate text-lg font-semibold">{A.name}</div>
          <div className="text-xs text-slate-300">{A.maker} · in service {A.eis <= START_YEAR ? "today" : `from ${A.eis}`}</div>
        </div>
        {A.custom && onDelete && (
          <button aria-label={`Remove ${A.name}`} onClick={onDelete} className="rounded-lg p-1.5 text-slate-300 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4]"><Trash2 size={15} /></button>
        )}
      </div>
      <AircraftArt a={A} accent={accent} className="h-20 w-full" />
      <div className="grid grid-cols-4 gap-1.5">
        <Spec label="Seats" value={A.seats} />
        <Spec label="Range" value={`${(A.range / 1000).toFixed(1)}k nm`} />
        <Spec label="Burn" value={`${A.burn} L`} />
        <Spec label="Price" value={`$${A.price}M`} />
      </div>
      <Capability A={A} />
      <div className="aero-num flex items-center justify-between text-xs text-slate-300">
        <span>Cost per seat-year <strong className="text-white">${Math.round((seatCost(A, cp, fuel) * 1000) / 5)}k</strong></span>
        <span>CO₂ <strong className="text-white">{Math.round(A.co2t / 5)} t</strong>/seat-yr</span>
        <span>In fleet <strong className="text-white">{inFleet}</strong></span>
      </div>
      <div className="mt-auto flex flex-col gap-2 border-t border-white/10 pt-3">
        {canOrder(A, turn) || isLast ? (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs"><div className="font-semibold text-white">Buy</div><div className="text-slate-300">{isLast ? "Order book closed" : `Delivered ${yearOf(turn + 1)}`}</div></div>
            <Stepper id={`order-${A.id}`} value={order} max={maxOrder} onChange={onOrder} disabled={!orderable} label={`${A.name} to buy`} />
          </div>
        ) : (
          <div className="text-xs text-slate-300">Order book opens in {A.eis - 5}.</div>
        )}
        {leasable && (
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs"><div className="font-semibold text-white">Lease</div><div className="text-slate-300">Flying now · ${Math.round(A.price * LEASE_RATE)}M / 5 yrs</div></div>
            <Stepper id={`lease-${A.id}`} value={lease} max={maxLease} onChange={onLease} label={`${A.name} to lease`} />
          </div>
        )}
      </div>
    </NavyCard>
  );
}

const FIELD = "aero-num mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#00b4b4] focus:outline-none focus:ring-2 focus:ring-[#00b4b4]/30";

function Editor({ onClose, onSave, turn, cp, fuel }) {
  const [f, setF] = useState({ name: "", seats: 180, range: 4200, burn: 1.9, price: 70, eis: Math.min(yearOf(turn + 1), yearOf(TURNS - 1)), engines: 2, zero: false });
  const set = (k, v) => setF({ ...f, [k]: v });
  const draft = { id: "preview", name: f.name || "Your aircraft", maker: "Custom design", seats: +f.seats || 100, range: +f.range || 1000, burn: +f.burn || 2, price: +f.price || 50,
    eis: +f.eis, engines: +f.engines, custom: true, ...(f.zero ? { co2: 0, fuelMult: 1.5 } : {}) };
  const A = enrich(draft);
  const peers = allAircraft().filter((x) => x.cat === A.cat && !x.legacy && x.eis <= A.eis);
  const bestPeer = peers.length ? peers.reduce((b, x) => (seatCost(x, cp, fuel) < seatCost(b, cp, fuel) ? x : b)) : null;
  const gap = bestPeer ? seatCost(A, cp, fuel) / seatCost(bestPeer, cp, fuel) - 1 : 0;
  const valid = f.name.trim().length > 1 && A.seats >= 100 && A.seats <= 600 && A.range >= 800 && A.range <= 9500 && A.burn >= 1 && A.burn <= 4 && A.price >= 20 && A.price <= 400;
  const years = [];
  for (let y = yearOf(turn); y <= yearOf(TURNS - 1); y += 5) years.push(y);
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Add an aircraft">
      <div className="aero-in my-6 w-full max-w-3xl rounded-3xl bg-gray-100 p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="aero-display text-xl font-semibold text-[#1a2942]">Add an aircraft to the portfolio</h2>
          <button aria-label="Close" onClick={onClose} className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4]"><X size={18} /></button>
        </div>
        <p className="mt-1 text-sm text-slate-500">The game evaluates it from these figures, exactly like the catalogue aircraft. Rival airlines can order it too.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <form className="grid grid-cols-2 gap-3 text-sm text-slate-700" onSubmit={(e) => { e.preventDefault(); if (valid) onSave(draft); }}>
            <label className="col-span-2" htmlFor="ac-name">Name<input id="ac-name" className={FIELD} value={f.name} maxLength={28} placeholder="e.g. A220-500" onChange={(e) => set("name", e.target.value)} /></label>
            <label htmlFor="ac-seats">Seats (100–600)<input id="ac-seats" type="number" min="100" max="600" className={FIELD} value={f.seats} onChange={(e) => set("seats", e.target.value)} /></label>
            <label htmlFor="ac-range">Range, nm (800–9,500)<input id="ac-range" type="number" min="800" max="9500" step="100" className={FIELD} value={f.range} onChange={(e) => set("range", e.target.value)} /></label>
            <label htmlFor="ac-burn">Fuel, L/seat/100 km (1–4)<input id="ac-burn" type="number" min="1" max="4" step="0.05" className={FIELD} value={f.burn} onChange={(e) => set("burn", e.target.value)} /></label>
            <label htmlFor="ac-price">Price, $M (20–400)<input id="ac-price" type="number" min="20" max="400" className={FIELD} value={f.price} onChange={(e) => set("price", e.target.value)} /></label>
            <label htmlFor="ac-eis">Entry into service
              <select id="ac-eis" className={FIELD} value={f.eis} onChange={(e) => set("eis", e.target.value)}>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
            </label>
            <label htmlFor="ac-engines">Engines
              <select id="ac-engines" className={FIELD} value={f.engines} onChange={(e) => set("engines", e.target.value)}><option value="2">2</option><option value="4">4</option></select>
            </label>
            <label htmlFor="ac-zero" className="col-span-2 flex cursor-pointer items-start gap-2">
              <input id="ac-zero" type="checkbox" className="mt-0.5 h-4 w-4 accent-[#d30068]" checked={f.zero} onChange={(e) => set("zero", e.target.checked)} />
              <span>Zero-carbon propulsion (no CO₂ charge, energy costs 50% more)</span>
            </label>
            <div className="col-span-2 mt-1 flex justify-end gap-2">
              <GhostButton onClick={onClose}>Cancel</GhostButton>
              <PrimaryButton id="ac-save" disabled={!valid} onClick={() => valid && onSave(draft)}>Add to portfolio</PrimaryButton>
            </div>
          </form>
          <NavyCard className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-1.5"><Tag tone={A.cat === "LR" ? "pink" : "teal"}>{CAT_NAME[A.cat]}</Tag><Tag tone="ghost">Evaluation</Tag></div>
            <div className="aero-display text-lg font-semibold">{draft.name}</div>
            <AircraftArt a={A} accent="#ff4d9d" className="h-24 w-full" />
            <Capability A={A} />
            <div className="grid grid-cols-2 gap-1.5">
              <Spec label="Cost per seat-year" value={`$${Math.round((seatCost(A, cp, fuel) * 1000) / 5)}k`} />
              <Spec label="CO₂ per seat-year" value={`${Math.round(A.co2t / 5)} t`} />
            </div>
            <p className="text-sm leading-relaxed text-slate-200">
              {bestPeer
                ? <>Against the best {CAT_NAME[A.cat].toLowerCase()} available by {A.eis} ({bestPeer.name}), each seat costs <strong style={{ color: gap <= 0 ? "#5eead4" : "#ff4d9d" }}>{Math.abs(gap * 100).toFixed(0)}% {gap <= 0 ? "less" : "more"}</strong> at today's fuel and carbon prices.</>
                : <>No comparable aircraft in this category by {A.eis}.</>}
            </p>
            <p className="text-xs leading-relaxed text-slate-300">Category and mission fit come from range and size: long thin routes need about 4,500 nm with up to 240 seats; trunk long-haul needs 6,500 nm and 260 seats or more.</p>
          </NavyCard>
        </div>
      </div>
    </div>
  );
}

export default function Portfolio({ turn, cp, fuel, me, orders, leases, setOrders, setLeases, capacity, leaseCap, isLast, onAddCustom, onDeleteCustom, usedTypes }) {
  const [filter, setFilter] = useState("ALL");
  const [editing, setEditing] = useState(false);
  const list = allAircraft().filter((A) => !A.legacy && (filter === "ALL" || (filter === "NEW" ? A.concept || A.custom : A.cat === filter)))
    .sort((a, b) => CAT_ORDER[a.cat] - CAT_ORDER[b.cat] || a.eis - b.eis || a.seats - b.seats);
  const price = (id) => allAircraft().find((x) => x.id === id).price;
  const spend = Object.entries(orders).reduce((s, [t, n]) => s + n * price(t), 0);
  const leased = Object.values(leases).reduce((s, n) => s + n, 0);
  const inFleet = (id) => me.fleet.filter((c) => c.type === id).reduce((s, c) => s + c.count, 0);
  const tabs = [["ALL", "All"], ["SA", "Single-aisle"], ["LR", "Long-range"], ["WB", "Widebody"], ["NEW", "Concepts & yours"]];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Aircraft categories">
          {tabs.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00b4b4] ${filter === k ? "bg-[#1a2942] text-white shadow" : "bg-white text-slate-600 hover:text-[#1a2942]"}`}>{label}</button>
          ))}
        </div>
        <GhostButton id="add-aircraft" onClick={() => setEditing(true)}><PenTool size={15} /> Add an aircraft</GhostButton>
      </div>
      <div className="aero-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-3" key={filter}>
        {list.map((A) => (
          <AircraftCard key={A.id} A={A} turn={turn} cp={cp} fuel={fuel} inFleet={inFleet(A.id)} isLast={isLast}
            order={orders[A.id] || 0} lease={leases[A.id] || 0}
            maxOrder={(orders[A.id] || 0) + Math.max(0, Math.floor((capacity - spend) / A.price))}
            maxLease={(leases[A.id] || 0) + Math.max(0, leaseCap - leased)}
            onOrder={(n) => setOrders({ ...orders, [A.id]: n })} onLease={(n) => setLeases({ ...leases, [A.id]: n })}
            onDelete={usedTypes.has(A.id) ? null : () => onDeleteCustom(A.id)} />
        ))}
      </div>
      {editing && <Editor turn={turn} cp={cp} fuel={fuel} onClose={() => setEditing(false)} onSave={(a) => { onAddCustom(a); setEditing(false); setFilter("NEW"); }} />}
    </div>
  );
}
