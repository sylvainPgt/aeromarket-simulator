import React, { useEffect, useRef, useState } from "react";
import {
  Activity, TrendingUp, TrendingDown, Scale, Flame, Building2, HeartPulse, Globe, Leaf, Sun, Zap, Shield, Package,
} from "lucide-react";

export const TEAL = "#00b4b4";
export const PINK = "#d30068";
export const NAVY = "#1a2942";
export const EVENT_ICONS = { Activity, TrendingUp, TrendingDown, Scale, Flame, Building2, HeartPulse, Globe, Leaf, Sun, Zap, Shield, Package };

export const money = (m) => {
  const sign = m < 0 ? "−" : "";
  const a = Math.abs(m);
  return a >= 1000 ? `${sign}$${(a / 1000).toFixed(a >= 100000 ? 0 : 1)}B` : `${sign}$${Math.round(a)}M`;
};
export const num = (n) => Math.round(n).toLocaleString("en-US");
export const signed = (x, d = 1) => `${x >= 0 ? "+" : "−"}${Math.abs(x).toFixed(d)}`;

export const GlobalStyle = () => (
  <style>{`
    .aero-root { font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .aero-display { font-family: 'Space Grotesk', 'Inter', ui-sans-serif, system-ui, sans-serif; letter-spacing: -0.01em; }
    .aero-num { font-variant-numeric: tabular-nums; }
    @keyframes aeroIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
    .aero-in { animation: aeroIn .5s cubic-bezier(.2,.7,.2,1) both; }
    .aero-stagger > * { animation: aeroIn .5s cubic-bezier(.2,.7,.2,1) both; }
    .aero-stagger > *:nth-child(2) { animation-delay: .06s; } .aero-stagger > *:nth-child(3) { animation-delay: .12s; }
    .aero-stagger > *:nth-child(4) { animation-delay: .18s; } .aero-stagger > *:nth-child(5) { animation-delay: .24s; }
    .aero-stagger > *:nth-child(6) { animation-delay: .3s; } .aero-stagger > *:nth-child(n+7) { animation-delay: .36s; }
    @keyframes aeroDrift { from { transform: translateX(-12%); } to { transform: translateX(12%); } }
    .aero-cloud { animation: aeroDrift 26s ease-in-out infinite alternate; }
    @keyframes aeroFly { 0% { transform: translate(-12vw, 30px) rotate(-4deg); } 100% { transform: translate(112vw, -50px) rotate(-4deg); } }
    .aero-fly { animation: aeroFly 16s linear infinite; }
    @keyframes aeroPulse { 0% { r: 4; opacity: .9; } 100% { r: 22; opacity: 0; } }
    .aero-pulse { animation: aeroPulse 1.8s ease-out infinite; }
    @keyframes aeroDash { to { stroke-dashoffset: -24; } }
    .aero-dash { animation: aeroDash 1.2s linear infinite; }
    @keyframes aeroPop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
    .aero-pop { animation: aeroPop .28s ease-out; }
    @keyframes aeroGrow { from { transform: scaleY(0); } to { transform: scaleY(1); } }
    .aero-grow { transform-origin: bottom; transform-box: fill-box; animation: aeroGrow .6s cubic-bezier(.2,.7,.2,1) both; }
    @keyframes aeroDraw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    .aero-draw { stroke-dasharray: 1; animation: aeroDraw 1s ease-out both; }
    .aero-hover { transition: transform .25s ease, box-shadow .25s ease; }
    .aero-hover:hover { transform: translateY(-3px); }
    .aero-hover:hover .aero-plane { transform: translateX(6px); }
    .aero-plane { transition: transform .5s cubic-bezier(.2,.7,.2,1); }
    @media (prefers-reduced-motion: reduce) {
      .aero-in, .aero-stagger > *, .aero-cloud, .aero-fly, .aero-pulse, .aero-dash, .aero-pop, .aero-grow, .aero-draw { animation: none; }
      .aero-draw { stroke-dasharray: none; }
    }
  `}</style>
);

// Animated number: eases from the previous value to the new one
export function useCountUp(value, ms = 650) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current, t0 = performance.now();
    if (start === value || (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) {
      from.current = value; setShown(value); return undefined;
    }
    let raf;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
      const v = start + (value - start) * e;
      from.current = v; setShown(v);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}
export const Count = ({ value, format = num }) => <>{format(useCountUp(value))}</>;

// CSS-only "photo": sky, sun glow and drifting clouds
export const Sky = ({ className = "", children, variant = "day", plane = false }) => {
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
      {plane && (
        <svg className="aero-fly pointer-events-none absolute left-0 top-[38%] opacity-80" width="64" height="24" viewBox="0 0 64 24" aria-hidden="true">
          <path d="M2 13 Q4 9 12 9 L50 9 Q60 9 62 12 Q60 15 50 15 L12 15 Q4 15 2 13Z" fill="#fff" />
          <path d="M8 9 L3 1 L9 1 L16 9Z M26 14 L18 23 L24 23 L38 14Z" fill="#e2e8f0" />
        </svg>
      )}
      <div className="relative">{children}</div>
    </div>
  );
};

export const Tag = ({ children, tone = "pink" }) => (
  <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
    tone === "pink" ? "bg-[#d30068] text-white" : tone === "teal" ? "bg-[#00b4b4] text-[#0c1a2e]" : "bg-white/10 text-white"}`}>
    {children}
  </span>
);

export const NavyCard = ({ children, className = "" }) => (
  <div className={`min-w-0 rounded-2xl bg-[#1a2942] p-5 text-white shadow-lg shadow-slate-900/10 ${className}`}>{children}</div>
);
export const WhiteCard = ({ children, className = "" }) => (
  <div className={`min-w-0 rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</div>
);
export const Eyebrow = ({ icon: Icon, children, tone = "teal", light = false }) => (
  <div className={`flex items-center gap-2 text-xs font-medium uppercase tracking-wider ${light ? "text-slate-500" : "text-slate-300"}`}>
    {Icon && <Icon size={15} className={tone === "teal" ? "text-[#00b4b4]" : "text-[#ff4d9d]"} />}<span>{children}</span>
  </div>
);

export const Kpi = ({ icon: Icon, label, value, format, sub, accent = "teal" }) => (
  <NavyCard className="min-w-0">
    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-slate-300">
      <Icon size={15} className={accent === "teal" ? "text-[#00b4b4]" : "text-[#ff4d9d]"} />
      <span className="truncate">{label}</span>
    </div>
    <div className="aero-display aero-num mt-2 text-2xl font-semibold"><Count value={value} format={format} /></div>
    <div className="mt-1 truncate text-xs text-slate-300">{sub}</div>
  </NavyCard>
);

export const PrimaryButton = ({ children, onClick, disabled, id, className = "" }) => (
  <button id={id} onClick={onClick} disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#00b4b4] px-6 py-3 text-sm font-semibold text-[#0c1a2e] shadow-md shadow-teal-900/20 transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#12c9c9] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/40 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:hover:translate-y-0 ${className}`}>
    {children}
  </button>
);
export const GhostButton = ({ children, onClick, id, dark = false, disabled }) => (
  <button id={id} onClick={onClick} disabled={disabled}
    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-4 focus-visible:ring-[#00b4b4]/30 disabled:opacity-40 ${
      dark ? "border-white/30 text-white hover:bg-white/10" : "border-slate-300 text-slate-700 hover:border-[#00b4b4] hover:text-[#008a8a]"}`}>
    {children}
  </button>
);

export const Meter = ({ value, color = TEAL, track = "bg-white/10" }) => (
  <div className={`h-2 w-full overflow-hidden rounded-full ${track}`}>
    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
  </div>
);
