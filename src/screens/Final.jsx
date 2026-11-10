import React, { useState } from "react";
import { Brain, Activity, Shield, AlertTriangle, TrendingUp, Radar, BarChart3, Copy, Check, RotateCcw, Download } from "lucide-react";
import { ShareChart } from "../components/charts.jsx";
import { Sky, Tag, NavyCard, WhiteCard, PrimaryButton, GhostButton, Meter, Eyebrow, money, TEAL, PINK } from "../components/ui.jsx";
import { computeAnalytics, pct } from "../game/insights.js";
import { STRAT, EVENT_BY_ID } from "../game/engine.js";
import { REGIONS } from "../data/gmf.js";

export default function Final({ history, scenario, seed, player, bankrupt, onSave, onRestart }) {
  const [copied, setCopied] = useState(false);
  const A = computeAnalytics(history, scenario);
  const last = history[history.length - 1];
  const cumNet = history.reduce((s, h) => s + h.pl.net, 0);
  const rank = [...last.view.rows].sort((a, b) => b.share - a.share).findIndex((r) => r.kind === "you") + 1;
  const worldRank = last.ranking.findIndex((r) => r.id === player.id) + 1;
  const exportData = {
    game: "AeroMarket Simulator: The GMF Challenge", scenarioCode: seed, airline: player.name, region: REGIONS[player.region].name, bankrupt,
    behavioralProfile: {
      archetype: A.archetype, consistencyScore: Math.round(A.consistency), strategySwitches: A.switches,
      riskAversionIndex: Math.round(A.riskAversion), crisisComposure: A.composure == null ? null : Math.round(A.composure),
      crisisVsCalmInvestmentRatio: A.ratio == null ? null : +A.ratio.toFixed(2), panicMoves: A.panicMoves, peakDebtToCreditLimit: +A.peakDebt.toFixed(2),
      longTermAlignment: Math.round(A.alignment), forecastReliance: A.forecastReliance == null ? null : Math.round(A.forecastReliance),
    },
    outcome: { finalHomeShare: +last.share.toFixed(4), cumulativeNetProfitMUSD: Math.round(cumNet), homeRank: rank, worldRank },
    turns: history.map((h) => ({
      period: h.period, event: h.eventId, crisis: h.crisis, earlySignal: h.signalId, strategy: h.strategy, switched: h.switched,
      orders: h.orders, leases: h.leases, spendMUSD: h.spend, investRate: +h.investRate.toFixed(3), earlyRetirement: h.retire,
      homeShare: +h.share.toFixed(4), netProfitMUSD: Math.round(h.pl.net), debtToCreditLimit: +h.debtRatio.toFixed(2), co2Mt: +h.co2Mt.toFixed(1),
    })),
  };
  const json = JSON.stringify(exportData, null, 2);
  const copy = () => {
    try { navigator.clipboard.writeText(json).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); } catch (e) { /* the JSON stays selectable below */ }
  };
  const cards = [
    { icon: Activity, title: "Consistency", score: A.consistency, color: TEAL,
      label: A.consistency >= 75 ? "Steadfast" : A.consistency >= 45 ? "Adaptive" : "Highly reactive",
      text: `${A.switches} network strategy ${A.switches === 1 ? "switch" : "switches"} in ${history.length} periods. The fleet mix you acquired changed by ${pct(A.mixVolatility, 0)} on average from one period to the next.` },
    { icon: Shield, title: "Risk aversion", score: A.riskAversion, color: PINK,
      label: A.riskAversion >= 70 ? "Cash preserver" : A.riskAversion >= 40 ? "Balanced" : "Aggressive investor",
      text: `You committed ${pct(A.overallRate, 0)} of your financing capacity to new aircraft on average (25% or more counts as all-in), and your debt peaked at ${pct(A.peakDebt, 0)} of your credit limit.` },
    { icon: AlertTriangle, title: "Crisis composure", score: A.composure ?? 0, color: TEAL, label: A.crisisLabel,
      text: A.ratio == null ? "Not enough crisis periods with financing capacity to measure."
        : `Across ${A.crisisCount} crisis periods you committed ${pct(A.crisisRate, 0)} of capacity versus ${pct(A.calmRate, 0)} in calm periods, with ${A.panicMoves} abrupt ${A.panicMoves === 1 ? "move" : "moves"} (strategy switch or early retirement) during a crisis.` },
    { icon: TrendingUp, title: "Long-term trend alignment", score: A.alignment, color: PINK,
      label: A.alignment >= 70 ? "Ahead of the trends" : A.alignment >= 50 ? "Partly aligned" : "Behind the trends",
      text: `Decarbonisation ${Math.round(A.decarb)}/100, fleet fit with the final route mix ${Math.round(A.networkFit)}/100, capacity growth versus home demand ${Math.round(A.growthFit)}/100.` },
  ];
  return (
    <div className="aero-root min-h-screen bg-gray-100 px-4 py-6 text-slate-800 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <Sky variant="dusk" plane className="aero-in rounded-3xl p-7 text-white shadow-xl sm:p-10">
          <Tag tone="teal"><Brain size={12} /> Behavioral Analytics · {last.period.slice(-4)}</Tag>
          <h1 className="aero-display mt-3 text-3xl font-bold sm:text-5xl">{A.archetype}</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/90">{A.archetypeText}</p>
          {bankrupt && <p className="mt-3 inline-block rounded-lg bg-black/30 px-3 py-2 text-sm font-semibold">Game ended early: {player.name} breached its debt covenants two periods in a row and was taken over by its creditors.</p>}
          <div className="aero-num mt-6 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
            <div><div className="text-xs uppercase tracking-wider text-white/70">Home share</div><div className="aero-display text-2xl font-semibold">{pct(last.share)}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-white/70">Net profit, all periods</div><div className="aero-display text-2xl font-semibold">{money(cumNet)}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-white/70">Home rank</div><div className="aero-display text-2xl font-semibold">{rank} of {last.view.rows.length}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-white/70">World rank</div><div className="aero-display text-2xl font-semibold">{worldRank} of {last.ranking.length}</div></div>
          </div>
        </Sky>

        <div className="aero-stagger grid gap-4 md:grid-cols-2">
          {cards.map(({ icon: Icon, title, score, color, label, text }) => (
            <NavyCard key={title}>
              <div className="flex items-start justify-between gap-3">
                <Eyebrow icon={Icon} tone={color === PINK ? "pink" : "teal"}>{title}</Eyebrow>
                <div className="aero-display aero-num text-3xl font-semibold">{Math.round(score)}<span className="text-base text-slate-400">/100</span></div>
              </div>
              <div className="mt-3"><Meter value={score} color={color} /></div>
              <div className="mt-3 font-semibold text-white">{label}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-300">{text}</p>
            </NavyCard>
          ))}
        </div>

        <NavyCard>
          <Eyebrow icon={Radar}>Use of forecasts</Eyebrow>
          <p className="mt-2 text-sm leading-relaxed text-slate-200">
            {A.forecastReliance == null ? "No acquisition could be compared against an early signal."
              : `The aircraft category you acquired most matched the early signal ${A.followed} ${A.followed === 1 ? "time" : "times"} out of ${A.eligible} (${Math.round(A.forecastReliance)}%).`}{" "}
            In this scenario {A.signalsAccurate} of {A.signalsTotal} early signals turned out to be correct.
          </p>
        </NavyCard>

        <div className="grid gap-4 lg:grid-cols-5">
          <NavyCard className="lg:col-span-3">
            <Eyebrow icon={BarChart3}>Home market share · {REGIONS[player.region].name}</Eyebrow>
            <div className="mt-3"><ShareChart history={history} /></div>
          </NavyCard>
          <WhiteCard className="lg:col-span-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">World ranking by passengers</div>
            <ol className="aero-num mt-2 flex flex-col text-sm">
              {last.ranking.slice(0, 8).map((r, i) => (
                <li key={r.id} className={`flex items-center justify-between gap-2 border-t border-slate-100 py-1.5 ${r.id === player.id ? "font-semibold text-[#007a7a]" : "text-slate-700"}`}>
                  <span className="min-w-0 truncate">{i + 1}. {r.name} <span className="text-xs text-slate-400">{REGIONS[r.region].name}</span></span><span>{pct(r.worldShare)}</span>
                </li>
              ))}
              {worldRank > 8 && <li className="flex items-center justify-between gap-2 border-t border-slate-100 py-1.5 font-semibold text-[#007a7a]"><span>{worldRank}. {player.name}</span><span>{pct(last.ranking[worldRank - 1].worldShare)}</span></li>}
            </ol>
          </WhiteCard>
        </div>

        <WhiteCard>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Decision log · scenario {seed}</div>
          <div className="mt-3 overflow-x-auto">
            <table className="aero-num w-full min-w-[760px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="py-2 pr-3">Period</th><th className="pr-3">Market event</th><th className="pr-3">Strategy</th><th className="pr-3 text-right">Bought</th><th className="pr-3 text-right">Leased</th><th className="pr-3 text-right">Capacity used</th><th className="pr-3 text-right">Share</th><th className="text-right">Net profit</th></tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.turn} className="border-t border-slate-100">
                    <td className="py-2 pr-3 font-medium">{h.period}</td>
                    <td className="pr-3">{EVENT_BY_ID[h.eventId].title}{h.crisis && <span className="ml-2 rounded bg-[#d30068] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">Crisis</span>}</td>
                    <td className="pr-3">{STRAT[h.strategy].name}{h.switched && <span className="ml-1 text-[#d30068]" title="Strategy switch">↺</span>}{h.retire && <span className="ml-1 text-slate-500">· retired {h.retired}</span>}</td>
                    <td className="pr-3 text-right">{Object.values(h.orders).reduce((s, n) => s + n, 0)}</td>
                    <td className="pr-3 text-right">{Object.values(h.leases).reduce((s, n) => s + n, 0)}</td>
                    <td className="pr-3 text-right">{pct(h.investRate, 0)}</td>
                    <td className="pr-3 text-right">{pct(h.share)}</td>
                    <td className={`text-right font-medium ${h.pl.net < 0 ? "text-[#d30068]" : "text-slate-800"}`}>{money(h.pl.net)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </WhiteCard>

        <WhiteCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Session data</div><div className="text-sm text-slate-600">The behavioral record of this session, ready for analysis.</div></div>
            <div className="flex gap-2">
              <GhostButton id="copy-json" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy JSON"}</GhostButton>
              <GhostButton id="save-final" onClick={onSave}><Download size={16} /> Save game file</GhostButton>
            </div>
          </div>
          <pre className="mt-3 max-h-56 overflow-auto rounded-xl bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">{json}</pre>
        </WhiteCard>
        <div className="flex justify-center pb-6"><PrimaryButton id="play-again" onClick={onRestart}><RotateCcw size={16} /> Play again</PrimaryButton></div>
      </div>
    </div>
  );
}
