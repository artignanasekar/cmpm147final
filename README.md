# Starfall Drift

A small, replayable **space roguelike prototype** where you explore a procedurally generated sector, collect relics, and return safely to the jump gate before running out of fuel or hull.

---

## Overview

In *Starfall Drift*, each run places you in a new 10×10 sector of space. Your goal is to:

- Navigate the grid  
- Scan and land on planets  
- Collect **relics**  
- Manage **fuel** and **hull**  
- Avoid hazards and dangerous regions  
- Return to the **jump gate** to win  

Each run is different due to procedural generation, encouraging exploration and risk-taking.

---

## Core Gameplay Loop

1. Start at the jump gate  
2. Move across the grid (WASD / Arrow Keys)  
3. Explore regions and scan planets  
4. Gain fuel / repair hull / collect relics  
5. Survive hazards and environmental effects  
6. Return to the gate once you have enough relics  

**Lose if:**
- Fuel reaches 0  
- Hull reaches 0  

**Win if:**
- You return to the gate with enough relics  

---

## Procedural Systems

This game uses **live procedural generation** to create a new experience every run:

### Space / Planet Generator (Own Midterm Tool)
- Generates a **region map** using noise (nebula, void, ion, etc.)
- Places **planets** with:
  - names
  - types
  - relic presence
  - fuel/hull bonuses
  - danger levels
- Generates **hazards** based on region type  

This system controls the **structure and survival challenge** of the game.

---

### Pattern Generator (External Midterm Tool)

Inspired by: https://github.com/tyu72/147-Pattern-Generator  

- Generates a **grid-based pattern lattice** using a limited set of shapes  
- Each tile gets a **pattern type** (circle, triangle, hex, etc.)  
- Patterns directly affect gameplay:
  - fuel bonuses  
  - hull repairs  
  - danger levels  
  - hazard likelihood  

This system adds a **second procedural layer** that modifies how the map behaves.

---

## Why This Is Interesting

The game combines **two different procedural systems**:

- **Spatial generation (regions + planets)** → macro structure  
- **Pattern generation (shape lattice)** → micro modifiers  

This creates layered variation where:
- The same region can feel different depending on pattern  
- Players must adapt to both environment **and** pattern behavior  

---

## Controls

- **Move:** Arrow Keys or WASD  
- **Restart Run:** R  

---
## Credits

- **ChatGPT:** Helped with formatting and refining code structure and UI styling

## How to Run

### Option 1 (Recommended)
1. Download or clone the project  
2. Open `index.html` in your browser  

### Option 2 (Local Server)
Run a local server:
python -m http.server
Then open:
http://localhost:8000

```bash
python -m http.server

