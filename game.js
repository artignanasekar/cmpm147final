const SIZE = 10;
const START_FUEL = 24;
const START_HULL = 6;
const PLANET_COUNT = 8;
const RELIC_GOAL = 3;

const PLANET_TYPES_BY_REGION = {
  nebula: ["gas giant", "crystal", "storm", "lush"],
  asteroid: ["mineral", "rocky", "scarred", "dust"],
  void: ["dead", "ancient", "frozen", "silent"],
  ion: ["plasma", "charged", "storm", "metallic"],
  crimson: ["lava", "desert", "toxic", "ash"]
};

const FIRST_SYLLABLES = ["Ve", "Ka", "Lu", "Or", "Ny", "Xi", "Sa", "Ty", "Ae", "Dro", "Zy", "Sol"];
const SECOND_SYLLABLES = ["lora", "th", "mir", "zen", "dara", "vex", "tune", "rion", "phos", "nix", "gale", "vora"];

const gridEl = document.getElementById("grid");
const messageEl = document.getElementById("message");
const fuelEl = document.getElementById("fuel");
const hullEl = document.getElementById("hull");
const relicsEl = document.getElementById("relics");
const goalEl = document.getElementById("goal");
const turnEl = document.getElementById("turn");
const seedLabelEl = document.getElementById("seedLabel");
const statusLabelEl = document.getElementById("statusLabel");
const regionLabelEl = document.getElementById("regionLabel");
const planetInfoEl = document.getElementById("planetInfo");
const signalInfoEl = document.getElementById("signalInfo");

let state = null;

/* ----------------- seeded random ----------------- */
function stringToSeed(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function createRng(seedString) {
  const seedGen = stringToSeed(seedString);
  return mulberry32(seedGen());
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function key(x, y) {
  return `${x},${y}`;
}

function inBounds(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

/* ----------------- lightweight noise field ----------------- */
function noiseValue(x, y, seed) {
  const v =
    Math.sin((x * 0.83 + seed * 0.17) * 1.21) +
    Math.cos((y * 0.71 + seed * 0.13) * 1.37) +
    Math.sin((x + y + seed * 0.09) * 0.67) +
    Math.cos((x * 0.31 - y * 0.41 + seed * 0.11) * 2.11);

  return (v + 4) / 8;
}

function regionFromNoise(n) {
  if (n < 0.20) return "void";
  if (n < 0.40) return "asteroid";
  if (n < 0.58) return "nebula";
  if (n < 0.77) return "ion";
  return "crimson";
}

/* ----------------- display helpers ----------------- */
function prettyRegion(region) {
  const names = {
    nebula: "Nebula",
    asteroid: "Asteroid Belt",
    void: "Void",
    ion: "Ion Storm",
    crimson: "Crimson Zone"
  };
  return names[region] || region;
}

function getRegionSignal(region) {
  const signals = {
    nebula: {
      band: "violet haze",
      stability: "unstable",
      note: "Dense particle clouds distort routing and weaken scans."
    },
    asteroid: {
      band: "mineral scatter",
      stability: "rough",
      note: "Fragment clusters increase collision risk and route pressure."
    },
    void: {
      band: "deep quiet",
      stability: "stable",
      note: "Sparse signals and fewer hazards, but little support."
    },
    ion: {
      band: "charged wave",
      stability: "volatile",
      note: "Electrical storms may damage the ship while crossing."
    },
    crimson: {
      band: "thermal flare",
      stability: "hostile",
      note: "High heat signatures and elevated danger readings."
    }
  };

  return signals[region];
}

function setMessage(text) {
  messageEl.textContent = text;
}

/* ----------------- generation ----------------- */
function makePlanetName(rng) {
  const first = pick(rng, FIRST_SYLLABLES);
  const second = pick(rng, SECOND_SYLLABLES);
  const num = randInt(rng, 2, 9);
  return `${first}${second}-${num}`;
}

function makePlanet(rng, x, y, region) {
  const type = pick(rng, PLANET_TYPES_BY_REGION[region]);
  const hasRelic = rng() < 0.42;
  const fuelBonus = randInt(rng, 1, 3);
  const hullBonus = rng() < 0.35 ? 1 : 0;
  const danger = randInt(rng, 1, 3) + (region === "crimson" || region === "ion" ? 1 : 0);

  return {
    x,
    y,
    name: makePlanetName(rng),
    region,
    type,
    hasRelic,
    fuelBonus,
    hullBonus,
    danger,
    visited: false
  };
}

function generateRegionMap(seedNum) {
  const map = [];
  for (let y = 0; y < SIZE; y++) {
    const row = [];
    for (let x = 0; x < SIZE; x++) {
      const n = noiseValue(x, y, seedNum);
      row.push(regionFromNoise(n));
    }
    map.push(row);
  }
  return map;
}

function randomEmptyCell(rng, used) {
  let x, y;
  do {
    x = randInt(rng, 0, SIZE - 1);
    y = randInt(rng, 0, SIZE - 1);
  } while (used.has(key(x, y)));
  used.add(key(x, y));
  return { x, y };
}

function generatePlanets(rng, used, regionMap) {
  const planets = [];

  for (let i = 0; i < PLANET_COUNT; i++) {
    const pos = randomEmptyCell(rng, used);
    const region = regionMap[pos.y][pos.x];
    planets.push(makePlanet(rng, pos.x, pos.y, region));
  }

  let relicCount = planets.filter((p) => p.hasRelic).length;
  while (relicCount < RELIC_GOAL) {
    const p = pick(rng, planets);
    if (!p.hasRelic) {
      p.hasRelic = true;
      relicCount++;
    }
  }

  return planets;
}

function generateHazards(rng, used, regionMap) {
  const hazards = new Set();

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const k = key(x, y);
      if (used.has(k)) continue;

      const region = regionMap[y][x];
      let chance = 0.05;

      if (region === "asteroid") chance = 0.18;
      if (region === "ion") chance = 0.12;
      if (region === "crimson") chance = 0.14;
      if (region === "void") chance = 0.03;
      if (region === "nebula") chance = 0.07;

      if (rng() < chance) {
        hazards.add(k);
      }
    }
  }

  return hazards;
}

/* ----------------- game state helpers ----------------- */
function findPlanetAt(x, y) {
  return state.planets.find((p) => p.x === x && p.y === y);
}

function updateSignalInfo(region, planet = null) {
  const signal = getRegionSignal(region);

  if (planet) {
    signalInfoEl.innerHTML = `
      <strong>Scanner Band:</strong> ${signal.band}<br>
      <strong>Signal Stability:</strong> ${signal.stability}<br>
      <strong>Planet Echo:</strong> ${planet.name} / ${planet.type}<br>
      <strong>Threat Reading:</strong> ${planet.danger}<br>
      <strong>Notes:</strong> ${signal.note}
    `;
  } else {
    signalInfoEl.innerHTML = `
      <strong>Scanner Band:</strong> ${signal.band}<br>
      <strong>Signal Stability:</strong> ${signal.stability}<br>
      <strong>Planet Echo:</strong> none detected<br>
      <strong>Notes:</strong> ${signal.note}
    `;
  }
}

function updatePlanetInfo(planet, regionOverride = null) {
  if (planet) {
    planetInfoEl.innerHTML = `
      <div class="planet-name">${planet.name}</div>
      <div>
        <span class="tag">${planet.type}</span>
        <span class="tag">${prettyRegion(planet.region)}</span>
      </div>
      <div>Danger: ${planet.danger}</div>
      <div>Fuel gain: +${planet.fuelBonus}</div>
      <div>Hull repair: +${planet.hullBonus}</div>
      <div>Relic status: ${planet.hasRelic ? "contains relic" : "no relic / already claimed"}</div>
      <div>Visit status: ${planet.visited ? "visited" : "unvisited"}</div>
    `;
    updateSignalInfo(planet.region, planet);
  } else {
    const region = regionOverride || state.regionMap[state.player.y][state.player.x];
    planetInfoEl.innerHTML = `
      <div class="planet-name">No planet on this tile</div>
      <div><span class="tag">${prettyRegion(region)}</span></div>
      <div>This part of the sector is shaped by the region map rather than a planet node.</div>
    `;
    updateSignalInfo(region, null);
  }
}

/* ----------------- setup ----------------- */
function newGame() {
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  const rng = createRng(seed);
  const seedNum = randInt(rng, 1000, 999999);

  const used = new Set();

  const gate = { x: 0, y: 0 };
  used.add(key(gate.x, gate.y));

  const regionMap = generateRegionMap(seedNum);
  const planets = generatePlanets(rng, used, regionMap);
  const hazards = generateHazards(rng, used, regionMap);

  state = {
    seed,
    seedNum,
    rng,
    gate,
    player: { x: gate.x, y: gate.y },
    regionMap,
    planets,
    hazards,
    visited: new Set([key(gate.x, gate.y)]),
    relics: 0,
    fuel: START_FUEL,
    hull: START_HULL,
    turn: 0,
    over: false,
    won: false
  };

  goalEl.textContent = RELIC_GOAL;
  setMessage("Collect relics from generated planets, then return to the gate.");
  updatePlanetInfo(null, state.regionMap[state.player.y][state.player.x]);
  render();
}

/* ----------------- gameplay ----------------- */
function visitPlanet(planet) {
  const parts = [`Scanned ${planet.name}.`];

  if (!planet.visited) {
    planet.visited = true;
    state.fuel += planet.fuelBonus;

    if (planet.hullBonus > 0) {
      state.hull += planet.hullBonus;
    }

    parts.push(`Refueled +${planet.fuelBonus}.`);

    if (planet.hullBonus > 0) {
      parts.push(`Hull repair +${planet.hullBonus}.`);
    }

    if (planet.hasRelic) {
      planet.hasRelic = false;
      state.relics += 1;
      parts.push("Recovered an ancient relic.");
    }

    if (planet.danger >= 4 && Math.random() < 0.45) {
      state.hull -= 1;
      parts.push("The landing was unstable. Hull -1.");
    }
  } else {
    parts.push("This planet has already been visited.");
  }

  setMessage(parts.join(" "));
  updatePlanetInfo(planet);
}

function applyRegionEffect(region) {
  if (region === "ion" && Math.random() < 0.25) {
    state.hull -= 1;
    setMessage("An ion surge crackles across the hull. Hull -1.");
  } else if (region === "nebula" && Math.random() < 0.2) {
    state.fuel -= 1;
    setMessage("The nebula slows navigation. Fuel -1.");
  }
}

function movePlayer(dx, dy) {
  if (state.over) return;

  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  if (!inBounds(nx, ny)) {
    setMessage("You cannot leave the sector.");
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  state.turn += 1;
  state.fuel -= 1;
  state.visited.add(key(nx, ny));

  const region = state.regionMap[ny][nx];
  const currentKey = key(nx, ny);

  if (state.hazards.has(currentKey)) {
    state.hull -= 1;
    setMessage("You crossed a hazard field. Hull -1.");
  } else {
    setMessage(`You drift into the ${prettyRegion(region)}.`);
  }

  applyRegionEffect(region);

  const planet = findPlanetAt(nx, ny);
  if (planet) {
    visitPlanet(planet);
  } else {
    updatePlanetInfo(null, region);
  }

  if (state.fuel <= 0 && !state.over) {
    state.over = true;
    state.won = false;
    setMessage("Out of fuel. Run failed.");
  }

  if (state.hull <= 0 && !state.over) {
    state.over = true;
    state.won = false;
    setMessage("Your ship was destroyed. Run failed.");
  }

  if (
    nx === state.gate.x &&
    ny === state.gate.y &&
    state.relics >= RELIC_GOAL &&
    !state.over
  ) {
    state.over = true;
    state.won = true;
    setMessage("Mission complete. You returned to the gate with the relics.");
  }

  render();
}

/* ----------------- rendering ----------------- */
function getCellClasses(x, y) {
  const region = state.regionMap[y][x];
  let classes = `cell region-${region}`;

  const k = key(x, y);
  const planet = findPlanetAt(x, y);

  if (state.player.x === x && state.player.y === y) {
    classes += " player";
  } else if (state.gate.x === x && state.gate.y === y) {
    classes += " gate";
  } else if (planet && planet.hasRelic) {
    classes += " relic-planet";
  } else if (planet) {
    classes += " planet";
  } else if (state.hazards.has(k)) {
    classes += " hazard";
  }

  if (state.visited.has(k)) {
    classes += " visited";
  }

  return classes;
}

function getCellSymbol(x, y) {
  const k = key(x, y);
  const planet = findPlanetAt(x, y);

  if (state.player.x === x && state.player.y === y) return "🚀";
  if (state.gate.x === x && state.gate.y === y) return "🌀";
  if (planet && planet.hasRelic) return "🪐";
  if (planet) return "○";
  if (state.hazards.has(k)) return "☄";
  return "·";
}

function render() {
  gridEl.innerHTML = "";

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cell = document.createElement("div");
      cell.className = getCellClasses(x, y);
      cell.textContent = getCellSymbol(x, y);
      gridEl.appendChild(cell);
    }
  }

  fuelEl.textContent = state.fuel;
  hullEl.textContent = state.hull;
  relicsEl.textContent = state.relics;
  turnEl.textContent = state.turn;
  seedLabelEl.textContent = `Seed: ${state.seed}`;

  const currentRegion = state.regionMap[state.player.y][state.player.x];
  regionLabelEl.textContent = `Region: ${prettyRegion(currentRegion)}`;

  if (state.over) {
    statusLabelEl.textContent = state.won ? "Status: victory" : "Status: failed";
  } else {
    statusLabelEl.textContent = "Status: in progress";
  }
}

/* ----------------- input ----------------- */
document.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();

  if (k === "r") {
    newGame();
    return;
  }

  if (k === "arrowup" || k === "w") movePlayer(0, -1);
  if (k === "arrowdown" || k === "s") movePlayer(0, 1);
  if (k === "arrowleft" || k === "a") movePlayer(-1, 0);
  if (k === "arrowright" || k === "d") movePlayer(1, 0);
});

/* ----------------- start ----------------- */
newGame();