import { REGIONS, REGION_IDS } from "../data/gmf.js";

// 24 fictional airline groups, three per region. Each one stands for a family of similar real carriers;
// together their 2025 fleets add up to the GMF 2026 fleet in service of the region (100+ seat passenger aircraft).
const NAMES = {
  NA: ["Transcontinental Airways", "Liberty Wings", "Cascadia Air"],
  LA: ["Aerovias del Sur", "Rapido Air", "Selva Verde"],
  EU: ["EuroAtlas Group", "SkyHopper", "Nordlys Air"],
  AF: ["PanAfrica Airways", "Baobab Express", "Savanna Green"],
  ME: ["Gulf Meridian", "Dune Air", "Oasis Connect"],
  IN: ["Bharat Global", "Monsoon Express", "Kaveri Air"],
  CN: ["Great River Airlines", "Lantern Air", "Jade Sky"],
  AP: ["Pacific Crown", "Archipelago Air", "Southern Cross Blue"],
};
export const ARCHETYPES = {
  legacy: { label: "The Legacy", strategy: "HUB", blurb: "Network carrier. Hub & Spoke, widebody-heavy, slow to change.", difficulty: "Standard" },
  disrupter: { label: "The Disrupter", strategy: "P2P", blurb: "Low-cost challenger. Point-to-Point, single-aisle fleet, half of it leased.", difficulty: "Hard: thin margins, no long-haul" },
  green: { label: "The Green Agile", strategy: "P2P", blurb: "Young mixed fleet, adapts quickly, retires old aircraft early.", difficulty: "Easier: efficient fleet, smaller scale" },
};
// Share of each region's fleet held by [legacy, disrupter, green]
const SPLIT = { NA: [0.5, 0.32, 0.18], LA: [0.42, 0.38, 0.2], EU: [0.42, 0.38, 0.2], AF: [0.5, 0.28, 0.22], ME: [0.6, 0.22, 0.18], IN: [0.25, 0.55, 0.2], CN: [0.5, 0.28, 0.22], AP: [0.42, 0.36, 0.22] };
// Widebody share of each region's fleet (aircraft count), in line with the GMF delivery mix
const WB_SHARE = { NA: 0.15, LA: 0.08, EU: 0.17, AF: 0.19, ME: 0.45, IN: 0.09, CN: 0.14, AP: 0.25 };
const WB_HOLD = { legacy: 0.75, disrupter: 0, green: 0.25 };
const OLD = { legacy: 0.6, disrupter: 0.45, green: 0.2 }; // share of previous-generation aircraft
const LEASED = { legacy: 0.2, disrupter: 0.5, green: 0.3 };

function buildFleet(arch, region, total) {
  const wb = Math.round(REGIONS[region].fleet25 * WB_SHARE[region] * WB_HOLD[arch]);
  const sa = Math.max(0, total - wb);
  const cohorts = [];
  const add = (type, count, gens) => gens.forEach(([gen, f]) => {
    const n = Math.round(count * f);
    const leased = Math.round(n * (gen >= -1 ? LEASED[arch] : LEASED[arch] * 0.4));
    if (n - leased > 0) cohorts.push({ type, count: n - leased, gen, leased: false });
    if (leased > 0) cohorts.push({ type, count: leased, gen, leased: true });
  });
  const oldGens = [[-4, 0.3], [-3, 0.35], [-2, 0.35]], newGens = [[-1, 0.6], [0, 0.4]];
  const saNew = sa * (1 - OLD[arch]);
  add("old_sa", sa * OLD[arch], oldGens);
  const lr = arch === "legacy" ? 0.04 : 0.08;
  const local = region === "CN" ? 0.2 : 0;
  add("a320neo", saNew * (0.34 - local / 2), newGens);
  add("b7378", saNew * (0.3 - local / 2), newGens);
  if (local) add("c919", saNew * local, newGens);
  add("a321neo", saNew * (0.26 - lr / 2), newGens);
  add("a220", saNew * (0.1 - lr / 2), newGens);
  add("a321xlr", saNew * lr, [[0, 1]]);
  add("old_wb", wb * (arch === "green" ? 0.35 : 0.6), oldGens);
  const wbNew = wb * (arch === "green" ? 0.65 : 0.4);
  add("a359", wbNew * 0.4, newGens);
  add("b789", wbNew * 0.4, newGens);
  add("a339", wbNew * 0.2, newGens);
  return cohorts;
}

export function buildAirlines() {
  const list = [];
  REGION_IDS.forEach((r) => ["legacy", "disrupter", "green"].forEach((arch, i) => {
    const total = Math.round(REGIONS[r].fleet25 * SPLIT[r][i]);
    list.push({ id: `${r}_${arch}`, name: NAMES[r][i], region: r, arch, strategy: ARCHETYPES[arch].strategy,
      fleet: buildFleet(arch, r, total), pending: [], cash: 0, breach: 0, switched: false });
  }));
  return list;
}
