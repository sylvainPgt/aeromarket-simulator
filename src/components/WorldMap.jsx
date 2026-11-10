import React from "react";
import { MAP, REGIONS, REGION_IDS } from "../data/gmf.js";
import { TEAL, PINK, NAVY } from "./ui.jsx";

const SHORT = { NA: "N. America", LA: "Latin Am.", EU: "Europe/CIS", AF: "Africa", ME: "Middle East", IN: "India", CN: "PRC", AP: "Asia-Pacific" };
const arc = (a, b) => {
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, d = Math.hypot(b.x - a.x, b.y - a.y);
  return `M${a.x} ${a.y} Q${mx} ${my - d * 0.28} ${b.x} ${b.y}`;
};

// Oceans teal, land magenta. `values` puts a figure on each region; `hot` pulses the regions an event hits;
// `home` draws animated routes from the player's region; `onSelect` makes regions clickable.
export default function WorldMap({ home, selected, onSelect, values = {}, hot = [], routes = false, busy = false, intensity = {} }) {
  const from = home ? REGIONS[home] : null;
  return (
    <svg viewBox={`0 0 ${MAP.width} ${MAP.height}`} className="block w-full" role="img" aria-label="World map by region">
      <path d={MAP.sphere} fill={TEAL} />
      {REGION_IDS.map((r) => {
        const on = r === selected || r === home;
        return (
          <path key={r} d={REGIONS[r].path} fill={PINK} fillOpacity={on ? 1 : 0.55 + 0.4 * (intensity[r] ?? 0.5)} stroke={on ? "#ffffff" : TEAL} strokeWidth={on ? 1.6 : 0.5}
            strokeLinejoin="round" className={onSelect ? "cursor-pointer transition-all duration-300" : "transition-all duration-500"}
            onClick={onSelect ? () => onSelect(r) : undefined} tabIndex={onSelect ? 0 : undefined} role={onSelect ? "button" : undefined}
            aria-label={onSelect ? `Select ${REGIONS[r].name}` : undefined}
            onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(r); } } : undefined} />
        );
      })}
      {routes && from && REGION_IDS.filter((r) => r !== home).map((r, i) => {
        const d = arc(from, REGIONS[r]);
        return (
          <g key={r}>
            <path id={`route-${r}`} d={d} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.2" strokeDasharray="4 4" className="aero-dash" />
            <path d="M-6 -3 L6 0 L-6 3 L-3 0Z" fill="#ffffff" stroke={NAVY} strokeWidth="0.6">
              <animateMotion dur={`${busy ? 2.6 + (i % 3) * 0.5 : 5 + (i % 4)}s`} begin={`${i * 0.35}s`} repeatCount="indefinite" rotate="auto" path={d} />
            </path>
          </g>
        );
      })}
      {hot.map((r) => (
        <circle key={r} className="aero-pulse" cx={REGIONS[r].x} cy={REGIONS[r].y} r="4" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      ))}
      {REGION_IDS.map((r) => {
        const R = REGIONS[r], v = values[r], on = r === selected || r === home;
        const w = Math.max(SHORT[r].length, v ? v.length : 0) * 6.4 + 16;
        return (
          <g key={r} transform={`translate(${R.x} ${R.y})`} pointerEvents="none">
            <rect x={-w / 2} y={v ? -17 : -10} width={w} height={v ? 34 : 20} rx="8" fill={on ? "#ffffff" : NAVY} fillOpacity={on ? 1 : 0.88} stroke={on ? NAVY : "none"} strokeWidth="1.5" />
            <text textAnchor="middle" y={v ? -3 : 4} fontSize="11" fontWeight="600" fill={on ? NAVY : "#ffffff"}>{SHORT[r]}</text>
            {v && <text textAnchor="middle" y="11" fontSize="11.5" fontWeight="700" fill={on ? "#007a7a" : "#5eead4"}>{v}</text>}
          </g>
        );
      })}
    </svg>
  );
}
