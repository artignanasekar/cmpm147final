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

/* ----------------- pattern-generator-inspired system -----------------
   Inspired by the external "Procedural Pattern Generator" tool:
   - grid-based generation
   - limited shape vocabulary
   - different shape-count settings produce different texture/variation
--------------------------------------------------------------------- */
const PATTERN_SHAPES = ["circle", "square", "triangle", "diamond", "hex", "star", "cross", "ring"];
const PATTERN_SYMBOLS = {
  circle: "◌",
  square: "□",
  triangle: "△",
  diamond: "◇",
  hex: "⬡",
  star: "✦",
  cross: "✚",
  ring: "◍"
};

const PATTERN_EFFECTS = {
  circle: {
    name: "orbital loop",
    fuel: 1,
    hull: 0,
    danger: 0,
    note: "Circular lattice pockets trap recoverable energy."
  },
  square: {
    name: "stable grid",
    fuel: 0,
    hull: 1,
    danger: -1,
    note: "Rigid patterning helps ship systems stabilize."
  },
  triangle: {
    name: "spike field",
    fuel: 0,
    hull: 0,
    danger: 1,
    note: "Sharp triangulated interference increases threat."
  },
  diamond: {
    name: "prism mesh",
    fuel: 0,
    hull: 1,
    danger: 0,
    note: "Prismatic refractions support clean scans."
  },
  hex: {
    name: "honeycomb current",
    fuel: 1,
    hull: 0,
    danger: 0,
    note: "Hex channels create efficient movement corridors."
  },
  star: {
    name: "flare cluster",
    fuel: 0,
    hull: 0,
    danger: 2,
    note: "Star-like bursts produce unstable energy spikes."
  },
  cross: {
    name: "cross shear",
    fuel: 0,
    hull: 0,
    danger: 1,
    note: "Cross-pattern turbulence disrupts route planning."
  },
  ring: {
    name: "resonance loop",
    fuel: 2,
    hull: 0,
    danger: 0,
    note: "Resonant loops improve salvage and fuel recovery."
  }
};

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
const patternInfoEl = document.getElementById("patternInfo");

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

function chance(rng, amount) {
  return rng() < amount;
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

function getPatternAt(x, y) {
  return state.patternMap[y][x];
}

function getPatternEffect(shape) {
  return PATTERN_EFFECTS[shape];
}

/* ----------------- generation ----------------- */
function makePlanetName(rng) {
  const first = pick(rng, FIRST_SYLLABLES);
  const second = pick(rng, SECOND_SYLLABLES);
  const num = randInt(rng, 2, 9);
  return `${first}${second}-${num}`;
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

/* Pattern-generator-inspired live system */
function generatePatternConfig(rng) {
  const width = SIZE;
  const height = SIZE;
  const shapeCount = randInt(rng, 3, 6);
  const allowedShapes = PATTERN_SHAPES.slice(0, shapeCount);

  return {
    width,
    height,
    shapeCount,
    allowedShapes
  };
}

function generatePatternMap(rng, config) {
  const map = [];

  for (let y = 0; y < config.height; y++) {
    const row = [];
    for (let x = 0; x < config.width; x++) {
      // Create clustered motifs so it feels like patterned structure rather than pure noise
      const left = x > 0 ? row[x - 1] : null;
      const up = y > 0 ? map[y - 1][x] : null;

      let shape;
      if (left && up && chance(rng, 0.45)) {
        shape = chance(rng, 0.5) ? left : up;
      } else if (left && chance(rng, 0.28)) {
        shape = left;
      } else if (up && chance(rng, 0.28)) {
        shape = up;
      } else {
        shape = pick(rng, config.allowedShapes);
      }

      row.push(shape);
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

function makePlanet(rng, x, y, region, patternShape) {
  const type = pick(rng, PLANET_TYPES_BY_REGION[region]);
  const effect = getPatternEffect(patternShape);

  let hasRelic = chance(rng, 0.42);
  let fuelBonus = randInt(rng, 1, 3) + effect.fuel;
  let hullBonus = chance(rng, 0.35) ? 1 : 0;
  hullBonus += effect.hull;
  let danger = randInt(rng, 1, 3) + (region === "crimson" || region === "ion" ? 1 : 0) + effect.danger;

  if (danger < 1) danger = 1;
  if (fuelBonus < 1) fuelBonus = 1;
  if (hullBonus < 0) hullBonus = 0;

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
    patternShape,
    visited: false
  };
}

function generatePlanets(rng, used, regionMap, patternMap) {
  const planets = [];

  for (let i = 0; i < PLANET_COUNT; i++) {
    const pos = randomEmptyCell(rng, used);
    const region = regionMap[pos.y][pos.x];
    const patternShape = patternMap[pos.y][pos.x];
    planets.push(makePlanet(rng, pos.x, pos.y, region, patternShape));
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

function generateHazards(rng, used, regionMap, patternMap) {
  const hazards = new Set();

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const k = key(x, y);
      if (used.has(k)) continue;

      const region = regionMap[y][x];
      const patternShape = patternMap[y][x];
      const effect = getPatternEffect(patternShape);

      let chanceValue = 0.05;

      if (region === "asteroid") chanceValue = 0.18;
      if (region === "ion") chanceValue = 0.12;
      if (region === "crimson") chanceValue = 0.14;
      if (region === "void") chanceValue = 0.03;
      if (region === "nebula") chanceValue = 0.07;

      // Pattern lattice modifies risk
      if (effect.danger >= 2) chanceValue += 0.08;
      else if (effect.danger === 1) chanceValue += 0.04;
      else if (effect.hull > 0) chanceValue -= 0.03;
      else if (effect.fuel > 0) chanceValue -= 0.01;

      chanceValue = Math.max(0.01, Math.min(0.35, chanceValue));

      if (chance(rng, chanceValue)) {
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

function updatePatternInfo(x, y) {
  const patternShape = state.patternMap[y][x];
  const effect = getPatternEffect(patternShape);

  patternInfoEl.innerHTML = `
    <strong>Lattice Shape:</strong> ${patternShape} ${PATTERN_SYMBOLS[patternShape]}<br>
    <strong>Pattern Effect:</strong> ${effect.name}<br>
    <strong>Fuel Influence:</strong> ${effect.fuel >= 0 ? "+" : ""}${effect.fuel}<br>
    <strong>Hull Influence:</strong> ${effect.hull >= 0 ? "+" : ""}${effect.hull}<br>
    <strong>Danger Influence:</strong> ${effect.danger >= 0 ? "+" : ""}${effect.danger}<br>
    <strong>Notes:</strong> ${effect.note}
  `;
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
  const px = state.player.x;
  const py = state.player.y;
  const currentPattern = getPatternAt(px, py);

  if (planet) {
    planetInfoEl.innerHTML = `
      <div class="planet-name">${planet.name}</div>
      <div>
        <span class="tag">${planet.type}</span>
        <span class="tag">${prettyRegion(planet.region)}</span>
        <span class="tag">${planet.patternShape}</span>
      </div>
      <div>Danger: ${planet.danger}</div>
      <div>Fuel gain: +${planet.fuelBonus}</div>
      <div>Hull repair: +${planet.hullBonus}</div>
      <div>Relic status: ${planet.hasRelic ? "contains relic" : "no relic / already claimed"}</div>
      <div>Visit status: ${planet.visited ? "visited" : "unvisited"}</div>
      <div>Pattern lattice: ${currentPattern} ${PATTERN_SYMBOLS[currentPattern]}</div>
    `;
    updateSignalInfo(planet.region, planet);
  } else {
    const region = regionOverride || state.regionMap[py][px];
    planetInfoEl.innerHTML = `
      <div class="planet-name">No planet on this tile</div>
      <div>
        <span class="tag">${prettyRegion(region)}</span>
        <span class="tag">${currentPattern}</span>
      </div>
      <div>This sector tile is shaped by the region map and the live pattern lattice.</div>
      <div>Pattern symbol: ${PATTERN_SYMBOLS[currentPattern]}</div>
    `;
    updateSignalInfo(region, null);
  }

  updatePatternInfo(px, py);
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
  const patternConfig = generatePatternConfig(rng);
  const patternMap = generatePatternMap(rng, patternConfig);
  const planets = generatePlanets(rng, used, regionMap, patternMap);
  const hazards = generateHazards(rng, used, regionMap, patternMap);

  state = {
    seed,
    seedNum,
    rng,
    gate,
    player: { x: gate.x, y: gate.y },
    regionMap,
    patternConfig,
    patternMap,
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
  setMessage("Collect relics from generated planets, survive hazards, and return to the gate.");
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

    if (planet.danger >= 4 && chance(state.rng, 0.45)) {
      state.hull -= 1;
      parts.push("The landing was unstable. Hull -1.");
    }
  } else {
    parts.push("This planet has already been visited.");
  }

  setMessage(parts.join(" "));
  updatePlanetInfo(planet);
}

function applyRegionAndPatternEffect(region, patternShape) {
  const parts = [];
  const effect = getPatternEffect(patternShape);

  if (region === "ion" && chance(state.rng, 0.25)) {
    state.hull -= 1;
    parts.push("An ion surge crackles across the hull. Hull -1.");
  } else if (region === "nebula" && chance(state.rng, 0.20)) {
    state.fuel -= 1;
    parts.push("The nebula slows navigation. Fuel -1.");
  }

  if ((patternShape === "circle" || patternShape === "ring") && chance(state.rng, 0.22)) {
    state.fuel += 1;
    parts.push("The lattice resonates with stored energy. Fuel +1.");
  }

  if ((patternShape === "triangle" || patternShape === "star" || patternShape === "cross") && chance(state.rng, 0.18)) {
    state.hull -= 1;
    parts.push("Pattern turbulence shakes the ship. Hull -1.");
  }

  if ((patternShape === "square" || patternShape === "diamond") && chance(state.rng, 0.16)) {
    state.hull += 1;
    parts.push("The stable lattice reinforces your systems. Hull +1.");
  }

  return parts;
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
  const patternShape = state.patternMap[ny][nx];
  const parts = [`You drift into the ${prettyRegion(region)}.`];

  if (state.hazards.has(currentKey)) {
    state.hull -= 1;
    parts.push("You crossed a hazard field. Hull -1.");
  }

  parts.push(...applyRegionAndPatternEffect(region, patternShape));

  const planet = findPlanetAt(nx, ny);
  if (planet) {
    if (!planet.visited) {
      planet.visited = false;
    }
    setMessage(parts.join(" "));
    visitPlanet(planet);
  } else {
    setMessage(parts.join(" "));
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
  const patternShape = state.patternMap[y][x];

  classes += ` pattern-${patternShape}`;

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
  const patternShape = state.patternMap[y][x];

  if (state.player.x === x && state.player.y === y) return "🚀";
  if (state.gate.x === x && state.gate.y === y) return "🌀";
  if (planet && planet.hasRelic) return "🪐";
  if (planet) return "○";
  if (state.hazards.has(k)) return "☄";
  return PATTERN_SYMBOLS[patternShape];
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
