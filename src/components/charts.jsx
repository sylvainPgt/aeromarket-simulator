import React from "react";
import { TEAL, PINK, NAVY } from "./ui.jsx";
import { TURNS, yearOf } from "../game/engine.js";

const SERIES = [
  { color: TEAL, dash: "", width: 3 }, { color: PINK, dash: "", width: 2 },
  { color: "#ffffff", dash: "5 4", width: 2 }, { color: "#94a3b8", dash: "2 4", width: 2 },
];

// Home-market share of the player, the two home rivals and foreign carriers, period by period
export const ShareChart = ({ history }) => {
  const W = 640, H = 230, L = 38, R = 150, T = 14, B = 26;
  const rows = history[history.length - 1].view.rows;
  const val = (h, i) => (h.view.rows[i] ? h.view.rows[i].share : 0);
  const max = Math.max(0.4, ...history.flatMap((h) => rows.map((_, i) => val(h, i)))) + 0.05;
  const x = (i) => L + (i / (TURNS - 1)) * (W - L - R);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const ticks = [0, 0.2, 0.4, 0.6, 0.8].filter((t) => t <= max);
  const last = history.length - 1;
  const ends = rows.map((r, i) => ({ i, r, y: y(val(history[last], i)) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 14) ends[i].y = ends[i - 1].y + 14;
  const short = (n) => (n.length > 16 ? `${n.slice(0, 15)}…` : n);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Home market share by period">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity="0.1" />
          <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#cbd5e1">{Math.round(t * 100)}%</text>
        </g>
      ))}
      {Array.from({ length: TURNS }, (_, i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill={i < history.length ? "#cbd5e1" : "#64748b"}>{yearOf(i + 1)}</text>
      ))}
      {rows.map((r, i) => (
        <g key={r.id}>
          <polyline fill="none" stroke={SERIES[i].color} strokeWidth={SERIES[i].width} strokeDasharray={SERIES[i].dash} strokeLinejoin="round" strokeLinecap="round"
            points={history.map((h, k) => `${x(k)},${y(val(h, i))}`).join(" ")} />
          <circle cx={x(last)} cy={y(val(history[last], i))} r={i === 0 ? 4.5 : 3.5} fill={SERIES[i].color} stroke={NAVY} strokeWidth="1.5" />
        </g>
      ))}
      {ends.map((e) => (
        <text key={e.r.id} x={x(last) + 9} y={e.y + 4} fontSize="11" fontWeight={e.i === 0 ? 700 : 500} fill={SERIES[e.i].color}>
          {e.i === 0 ? "You" : short(e.r.name)} {Math.round(val(history[last], e.i) * 100)}%
        </text>
      ))}
    </svg>
  );
};

// Fleet timeline and capacity against demand in one view: what will still be flying in each period,
// what is on order, and how many seats the market will need if you hold your share.
export const CapacityOutlook = ({ bars, needed }) => {
  const W = 640, H = 250, L = 46, R = 12, T = 16, B = 44;
  const total = (b) => b.SA + b.LR + b.WB + b.onOrder + b.draft;
  const max = Math.max(...bars.map(total), ...needed) * 1.12 || 1;
  const bw = ((W - L - R) / bars.length) * 0.56;
  const xc = (i) => L + ((i + 0.5) / bars.length) * (W - L - R);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const step = max > 800000 ? 200000 : max > 400000 ? 100000 : max > 150000 ? 50000 : max > 60000 ? 20000 : 10000;
  const ticks = [];
  for (let t = 0; t <= max; t += step) ticks.push(t);
  const parts = [["SA", TEAL], ["LR", PINK], ["WB", "#e2e8f0"]];
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Seats in service against seats needed, by period">
        <defs>
          <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#1a2942" /><rect width="3" height="6" fill="#94a3b8" /></pattern>
          <pattern id="hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#1a2942" /><rect width="3" height="6" fill="#5eead4" /></pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="#ffffff" strokeOpacity="0.1" />
            <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize="10" fill="#cbd5e1">{t / 1000}k</text>
          </g>
        ))}
        {bars.map((b, i) => {
          let acc = 0;
          const seg = (v, fill, key) => {
            if (v <= 0) return null;
            const y1 = y(acc + v), hgt = y(acc) - y1;
            acc += v;
            return <rect key={key} className="aero-grow" x={xc(i) - bw / 2} y={y1} width={bw} height={Math.max(0, hgt - 1)} rx="2" fill={fill} style={{ animationDelay: `${i * 60}ms` }} />;
          };
          return (
            <g key={i}>
              {parts.map(([k, c]) => seg(b[k], c, k))}
              {seg(b.onOrder, "url(#hatch)", "oo")}
              {seg(b.draft, "url(#hatch2)", "dr")}
              <text x={xc(i)} y={H - B + 16} textAnchor="middle" fontSize="11" fontWeight={i === 0 ? 700 : 500} fill={i === 0 ? "#ffffff" : "#cbd5e1"}>{b.label}</text>
              <text x={xc(i)} y={H - B + 30} textAnchor="middle" fontSize="10" fill="#94a3b8">{b.count} aircraft</text>
            </g>
          );
        })}
        <polyline className="aero-draw" pathLength="1" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" points={needed.map((v, i) => `${xc(i)},${y(v)}`).join(" ")} />
        {needed.map((v, i) => <circle key={i} cx={xc(i)} cy={y(v)} r="4" fill="#ffffff" stroke={NAVY} strokeWidth="2" />)}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-300">
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#00b4b4]" />Single-aisle seats</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-[#d30068]" />Long-range single-aisle</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-slate-200" />Widebody</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-slate-400" />Already on order</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-sm bg-teal-300" />This order</span>
        <span><span className="mr-1.5 inline-block h-0.5 w-4 bg-white align-middle" />Seats needed to hold your share</span>
      </div>
    </div>
  );
};
