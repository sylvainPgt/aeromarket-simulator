// Aircraft catalogue. Figures are indicative, rounded public orders of magnitude
// (typical two-class seating, range in nautical miles, fuel burn in litres per seat per 100 km,
// approximate market value in $M). They are game parameters, not manufacturer data.
export const CATALOG = [
  { id: "e195e2", name: "E195-E2", maker: "Embraer", seats: 132, range: 2600, burn: 2.5, price: 36, eis: 2019 },
  { id: "a220", name: "A220-300", maker: "Airbus", seats: 135, range: 3400, burn: 2.4, price: 40, eis: 2016 },
  { id: "c919", name: "C919", maker: "COMAC", seats: 164, range: 2200, burn: 2.7, price: 45, eis: 2023 },
  { id: "a320neo", name: "A320neo", maker: "Airbus", seats: 165, range: 3400, burn: 2.3, price: 52, eis: 2016 },
  { id: "b7378", name: "737 MAX 8", maker: "Boeing", seats: 170, range: 3500, burn: 2.35, price: 51, eis: 2017 },
  { id: "a321neo", name: "A321neo", maker: "Airbus", seats: 200, range: 4000, burn: 2.15, price: 60, eis: 2017 },
  { id: "b73710", name: "737 MAX 10", maker: "Boeing", seats: 200, range: 3100, burn: 2.2, price: 57, eis: 2030 },
  { id: "a321xlr", name: "A321XLR", maker: "Airbus", seats: 190, range: 4700, burn: 2.3, price: 68, eis: 2024 },
  { id: "a339", name: "A330-900", maker: "Airbus", seats: 290, range: 7200, burn: 2.75, price: 115, eis: 2018 },
  { id: "b789", name: "787-9", maker: "Boeing", seats: 290, range: 7550, burn: 2.6, price: 145, eis: 2014 },
  { id: "b7810", name: "787-10", maker: "Boeing", seats: 330, range: 6300, burn: 2.5, price: 155, eis: 2018 },
  { id: "a359", name: "A350-900", maker: "Airbus", seats: 325, range: 8300, burn: 2.5, price: 160, eis: 2015 },
  { id: "a35k", name: "A350-1000", maker: "Airbus", seats: 370, range: 8700, burn: 2.45, price: 180, eis: 2018 },
  { id: "b779", name: "777-9", maker: "Boeing", seats: 420, range: 7300, burn: 2.55, price: 205, eis: 2030 },
  // Fleets already flying in 2025; no longer orderable
  { id: "old_sa", name: "Previous-gen single-aisle", maker: "A320ceo / 737NG class", seats: 165, range: 3000, burn: 2.9, price: 30, eis: 2000, legacy: true },
  { id: "old_wb", name: "Previous-gen widebody", maker: "A330ceo / 777 class", seats: 300, range: 6500, burn: 3.2, price: 90, eis: 2000, legacy: true },
  // Hypothetical future aircraft so that technology keeps moving after the 2030s
  { id: "ngsa", name: "Next-gen single-aisle", maker: "Concept", seats: 190, range: 3800, burn: 1.8, price: 72, eis: 2040, concept: true },
  { id: "ngwb", name: "Next-gen widebody", maker: "Concept", seats: 330, range: 8500, burn: 2.0, price: 195, eis: 2045, concept: true },
  { id: "h2sa", name: "Hydrogen single-aisle", maker: "Concept", seats: 150, range: 1800, burn: 2.2, price: 88, eis: 2050, concept: true, co2: 0, fuelMult: 1.5 },
  { id: "bwb", name: "Blended-wing widebody", maker: "Concept", seats: 350, range: 8000, burn: 1.6, price: 235, eis: 2060, concept: true, shape: "bwb" },
];

const ramp = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
const NONFUEL = { SA: 0.5, LR: 0.62, WB: 0.78 }; // $M per seat per 5 years: crew, maintenance, airports, overheads
const REF_SEATS = { SA: 170, LR: 200, WB: 320 };
const KM_YEAR = { SA: 2.3e6, LR: 3.4e6, WB: 4.3e6 }; // typical annual distance flown

// Everything the simulation needs is derived from seats, range, burn and price,
// so an aircraft added by the player is evaluated exactly like a catalogue one.
export function enrich(a) {
  const cap = {
    SH: (a.range < 1200 ? 0.6 : 1) * (a.seats <= 240 ? 1 : a.seats <= 300 ? 0.6 : 0.35),
    LT: ramp(a.range, 3300, 4500) * (a.seats <= 240 ? 1 : a.seats <= 340 ? 0.6 : 0.35),
    LH: ramp(a.range, 4500, 6500) * (a.seats < 200 ? 0.3 : a.seats < 260 ? 0.55 : 1),
  };
  const cat = cap.LH >= 0.6 && a.seats >= 250 ? "WB" : cap.LT >= 0.5 ? "LR" : "SA";
  const fuelL = a.burn * (KM_YEAR[cat] / 100) * 5; // litres per seat per 5-year turn
  return {
    ...a, cap, cat, fuelL,
    nonFuel: NONFUEL[cat] * Math.pow(REF_SEATS[cat] / a.seats, 0.25),
    co2t: fuelL * 2.53e-3 * (a.co2 ?? 1), // tonnes CO2 per seat per turn
  };
}

let REG = Object.fromEntries(CATALOG.map((a) => [a.id, enrich(a)]));
export const setCustomAircraft = (list) => {
  REG = Object.fromEntries([...CATALOG, ...list.map((a) => ({ ...a, custom: true }))].map((a) => [a.id, enrich(a)]));
};
export const ac = (id) => REG[id];
export const allAircraft = () => Object.values(REG);
export const CAT_NAME = { SA: "Single-aisle", LR: "Long-range single-aisle", WB: "Widebody" };
export const FUEL_PRICE = 0.75e-6; // $M per litre
