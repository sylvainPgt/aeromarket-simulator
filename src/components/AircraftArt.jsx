import React from "react";

// Parametric side view. The outline is driven by seats, range and engine count, so catalogue aircraft and
// aircraft added by the player are drawn by the same rules. No liveries or logos.
export default function AircraftArt({ a, className = "", accent = "#00b4b4" }) {
  const W = 260, H = 84, yc = 40;
  if (a.shape === "bwb") {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`${a.name} side view`}>
        <g className="aero-plane">
          <path d="M34 42 Q50 22 110 24 L196 30 Q226 33 232 38 Q226 46 196 48 L96 52 Q48 52 34 42Z" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
          <path d="M150 48 L214 60 L226 60 L196 46Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="1" />
          <path d="M200 30 L222 12 L232 12 L222 33Z" fill={accent} />
          <rect x="150" y="18" width="30" height="9" rx="4.5" fill="#64748b" />
          <path d="M44 38 Q52 31 64 30 L66 35 Q54 36 48 40Z" fill="#1a2942" />
          <path d="M76 36 L186 38" stroke="#1a2942" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
        </g>
      </svg>
    );
  }
  const k = Math.max(0, Math.min(1, (a.seats - 100) / 350));
  const L = 124 + 108 * k;
  const wide = a.seats >= 250;
  const h = wide ? 20 : 14.5;
  const x0 = (W - L) / 2, x1 = x0 + L, top = yc - h / 2, bot = yc + h / 2;
  const engines = a.engines || 2;
  const xw = x0 + L * 0.4;
  const eng = (x) => <rect key={x} x={x} y={bot + 1.5} width={h * 1.25} height={h * 0.52} rx={h * 0.26} fill="#64748b" stroke="#475569" strokeWidth="0.8" />;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`${a.name} side view`}>
      <g className="aero-plane">
        {/* tail fin and stabiliser */}
        <path d={`M${x1 - h * 2.3} ${top + 1} L${x1 - h * 0.75} ${top - h * 1.45} L${x1 - 1} ${top - h * 1.45} L${x1 - h * 0.35} ${top + 2}Z`} fill={accent} />
        <path d={`M${x1 - h * 1.5} ${yc - 3} L${x1 + 4} ${yc - 7} L${x1 + 6} ${yc - 5} L${x1 - h * 0.4} ${yc}Z`} fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.8" />
        {/* fuselage */}
        <path d={`M${x0} ${yc + 1} Q${x0 + 1} ${top} ${x0 + h * 1.3} ${top} L${x1 - h * 1.2} ${top} Q${x1} ${top} ${x1 + 1} ${top + 3} L${x1 - h * 2.6} ${bot} L${x0 + h * 1.3} ${bot} Q${x0 + 2} ${bot} ${x0} ${yc + 1}Z`}
          fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2" />
        <path d={`M${x0 + h * 0.9} ${bot - 2.5} L${x1 - h * 2.9} ${bot - 2.5}`} stroke={accent} strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
        {/* cockpit and windows */}
        <path d={`M${x0 + h * 0.38} ${yc - h * 0.16} Q${x0 + h * 0.7} ${top + h * 0.16} ${x0 + h * 1.15} ${top + h * 0.2} L${x0 + h * 1.2} ${yc - h * 0.1}Z`} fill="#1a2942" />
        <path d={`M${x0 + h * 1.9} ${yc - h * 0.14} L${x1 - h * 2.4} ${yc - h * 0.14}`} stroke="#1a2942" strokeWidth={wide ? 2.2 : 1.8} strokeDasharray="1.6 3.4" strokeLinecap="round" />
        {a.seats > 400 && <path d={`M${x0 + h * 1.9} ${yc - h * 0.36} L${x0 + L * 0.5} ${yc - h * 0.36}`} stroke="#1a2942" strokeWidth="1.6" strokeDasharray="1.6 3.4" strokeLinecap="round" />}
        {/* engines sit under the wing, ahead of it */}
        {eng(xw - h * 0.9)}
        {engines >= 4 && eng(xw + L * 0.06)}
        {/* wing */}
        <path d={`M${xw} ${yc + h * 0.12} L${xw + L * 0.27} ${bot + h * 0.62} L${xw + L * 0.33} ${bot + h * 0.62} L${xw + L * 0.22} ${yc + h * 0.12}Z`} fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
        <path d={`M${xw + L * 0.3} ${bot + h * 0.62} L${xw + L * 0.345} ${bot + h * 0.2} L${xw + L * 0.365} ${bot + h * 0.2} L${xw + L * 0.33} ${bot + h * 0.62}Z`} fill={accent} />
        {a.co2 === 0 && <text x={x0 + L * 0.72} y={yc + 3} fontSize="7" fontWeight="700" fill="#00b4b4">H₂</text>}
      </g>
    </svg>
  );
}
