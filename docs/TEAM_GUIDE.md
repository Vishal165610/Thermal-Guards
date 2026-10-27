# THERMAL GUARD — Team Guide
How to run it, how it works, and how to explain it. Written so every teammate can present any part.

## 1. The one-sentence pitch
> Thermal Guard is a digital twin of a factory that shows where heat is building up, warns the operator **before** a temperature limit is crossed, and shows which action fixes it.

Everything is **simulated**. No real sensors, no paid APIs. Say this out loud at the start; judges respect it.

## 2. Run it (3 commands)
```bash
npm install
npm run dev        # trains the AI model automatically the first time if it is missing
```
Open **http://localhost:5173** (the dashboard). Port 4000 is the simulation server only.
Before a demo, run `npm run rehearse` and `npm run rehearse:actions` to check everything works without a browser.

## 3. The big picture (draw this on a whiteboard)
```
 SERVER (owns the truth)                                  BROWSER (only shows it)
 ┌───────────────────────────────────────────┐   Socket.IO   ┌──────────────────────────┐
 │ 1 Thermal simulation (40x25 grid)         │  one snapshot │ 3D factory + thermal view │
 │ 2 Rule engine  → alerts (NORMAL/WARNING/…)│ ───────────▶  │ Zone cards, charts        │
 │ 3 AI forecast  → breach risk, next 30 steps│  every step   │ Narrator banner           │
 │ 4 Early-warning timeline                  │               │ "What to do" buttons      │
 │ 5 Recommender + outcome report            │ ◀───────────  │ Incident / action clicks  │
 └───────────────────────────────────────────┘   commands    └──────────────────────────┘
```
Key rule: **the browser never invents a temperature.** Every number comes from the server's snapshot.

## 4. How each part works (plain words)
**Simulation** (`server/src/simulation`). A 40×25 grid of temperatures. Every step each cell: mixes with its neighbours (heat spreads), gains heat from machines near it, and loses heat to the room (more if cooling works). Zones are rectangles on the grid. No random numbers, so every run is repeatable.

**Rule engine** (`server/src/alerts/alertEngine.ts`). Each zone has a *warning level* and a *limit*. Peak temperature ≥ warning → WARNING. ≥ limit → CRITICAL (a real breach). Falling back → RECOVERING → NORMAL. A 2°C gap (hysteresis) stops it flickering. One alert per incident, with an Acknowledge button. **This part is measurement, not AI.**

**AI forecast** (`server/src/forecasting`). A small neural network (about 2,500 numbers, TensorFlow.js) that we trained ourselves on thousands of simulated incidents. Input: the last ~25 temperatures of a zone + its limits. Output: a **risk score** that the limit is crossed within 30 steps, plus estimated temperatures. 50% or more for 3 steps in a row = "AI warning". It never sees which button was pressed. If the model file is missing, a simple straight-line estimate takes over and is always labelled "not AI".

**Early-warning timeline** (`earlyWarningTimeline.ts`). Records two real events: when the AI warning was confirmed, and when the limit was actually crossed. Lead = difference. If the AI was late or never warned, it says so. Nothing is scripted.

**Recommender + actions** (`server/src/actions`). Plain if-then rules (not AI): "cooling output below 90% → suggest Restart cooling", "machine above 1.3× heat → Reduce load", "fire in zone → Sprinklers". Pressing DO IT changes the real simulation. Every action shows its **cost** (production slows, water damage…) because the best fix is a trade-off.

**Outcome report** (`outcomeTracker.ts`). When the incident ends it states facts: breach avoided or not, how many steps above the limit, by how much, what was done, and how many steps passed between the AI warning and the first action.

## 5. How to use the dashboard
| Where | What it does |
|---|---|
| Top bar | LIVE/DISCONNECTED, step counter, **Pause / Step / 0.25×–2× speed**, Reset |
| Banner over the 3D view | Plain-English "what is happening now" + 5-stage bar |
| Left cards | The 6 zones: temperature, status, AI risk. Click to select |
| 3D factory | Click any machine to select its zone. NORMAL / THERMAL view toggle. Orbit, zoom, reset camera |
| Right panel | Selected zone: temperature, forecast in words, **What to do**, alerts, checklist |
| Bottom strip | The incident buttons and Reset. **CHARTS & ALERTS** opens the graphs and the alert feed |
| Card at the bottom of 3D | **Predictive Early Warning Timeline** (your main feature) |

Colours: green normal · amber warning or *forecast* risk (dashed outline = forecast only) · red limit crossed · cyan recovering.

## 6. The 3-minute story (who says what)
1. **(Speaker 1, 0:00)** Problem: factories react to alarms *after* the limit is crossed. We predict. *"This is simulated data."*
2. **(Speaker 1, 0:20)** Show THERMAL VIEW: "this is the server's 40×25 temperature grid, drawn as one texture."
3. **(Speaker 2, 0:45)** Click **COOLING FAILURE** (speed 0.5×). Point at fans slowing and the cooling zone heating.
4. **(Speaker 2, ~1:15)** Banner turns amber: **pause**. *"The AI expects a breach. Nothing has crossed the limit yet."* Show the forecast bar.
5. **(Speaker 3, 1:30)** Show **What to do** → read the reason and the cost → press **DO IT** (Restart cooling). Resume. Zone cools. Banner: *Breach avoided*, with the reaction time.
6. **(Speaker 3, 2:15)** Press RESET, run again **without** acting: limit is crossed, red, RULE alert. Timeline shows AI warning step → breach step → lead. *"Same incident, different outcome, because we acted early."*
7. **(All, 2:45)** Limitations (below), then questions.

## 7. Questions judges may ask
- **Is the AI real?** Yes: a small neural network trained by us on simulated data and run live. The "What to do" suggestions are plain rules, labelled as such.
- **How accurate is it?** We do not claim accuracy. `npm run train` prints a check on *generated* data only. It is not validated on real plants.
- **Why not just a threshold alarm?** The threshold alarm is in the product too (RULE alerts). The timeline shows the difference: the forecast can warn earlier, but only when the heat builds gradually.
- **What if the AI is wrong or late?** The timeline and outcome report say so (e.g. "no warning before breach"). Fire rises fast, so the lead can be short.
- **Is this safe to use in a real factory?** No. It is a prototype and not a certified safety system.
- **What would you do next?** Real sensor feeds instead of the simulator, validate on real data, per-machine models, operator feedback loop.

## 8. If something goes wrong on stage
| Problem | Fix |
|---|---|
| Page says "Connecting…" | Server not running. Check the terminal that runs `npm run dev` |
| Red DISCONNECTED banner | Server stopped. Restart it; the page reconnects by itself |
| Cannot GET / on :4000 | Wrong port. Open http://localhost:5173 |
| "AI OFF · TREND" in the top bar | Model file missing. Run `npm run train`, restart the server |
| Demo state is messy | Press RESET (top bar). It restores everything |
| Too fast / too slow | Use the speed buttons or Pause |

## 9. Where to change things
- Zone limits and warning margins: `shared/zones.ts`
- Heat sources, cooling strength, scenario strength: `server/src/simulation/config.ts`
- Actions and their costs: `shared/actions.ts`, effects in `thermalSimulation.ts` (`applyAction`)
- Recommendation rules: `server/src/actions/recommender.ts`
- After editing `shared/features.ts`, retrain: `npm run train`

## 10. Honest limitations (say them before the judges do)
Simulated data only · simple diffusion physics · AI trained and tested on the same simulator · state is kept in memory · one number per zone (hottest cell) drives alerts and the forecast · a prototype, not a safety system.

## 11. How recovery works
Recovery is **physics plus rules**, not a script.

1. **Remove the cause.** Either press a corrective action (right panel, "What to do"), or use NORMAL OPERATION (the test button that restores everything).
2. **The cause fades out over a few steps** (cooling comes back about 5% per step, machine heat falls about 0.06× per step). Temperatures can still rise slightly for a moment.
3. **The zone cools by itself.** Heat leaks to the room, and cooling pulls it out faster. The banner switches to **"LIMIT CROSSED — now cooling down"** and shows the cooling rate and a rough ETA.
4. **RECOVERING** (cyan) starts when the peak is 2°C below the limit. The banner shows a progress bar.
5. **NORMAL** (green) returns when the peak is below *warning level − 4°C* (the "return" temperature, e.g. 66°C for the Production Area). The gap stops flicker.
6. **Incident closed.** When all zones are NORMAL and no forecast warning is active, the outcome report appears.

Measured with default settings (fix applied 10 steps after the breach), steps until NORMAL:

| Incident | Fix | Steps to NORMAL |
|---|---|---|
| Machine overheating | NORMAL OPERATION | 54 |
| Machine overheating | Shut down machine | 43 |
| Machine overheating | Reduce load (machine keeps running at 1.2×) | 71 |
| Cooling failure | Restart cooling | 23 |
| Fire (Storage) | Sprinklers | 23 |

At 0.5× speed one step is one second. The ETA in the banner is a straight-line estimate from the current cooling rate. Right after a fix it is too long (cooling speeds up), and it gets more accurate as the zone cools. Say "roughly" when you present it.

## 12. Pages, themes and the fix model (v5)
**Pages** (top bar): Overview (meters), Live Twin (3D, one or two models), Fix Center, Analytics, Alerts.

**Two models** on the Live Twin page shows the normal factory and the heat map side by side, so you can point at a machine and its temperature at the same time.

**Online fix versus on-site repair.** This is the answer to "tapping Normal day is too magic":
- An **online fix** stops the symptoms right now, but the equipment keeps running degraded.
- Only a **technician** repairs the root cause. He needs time to arrive and repair, and cannot start while the problem is live.
- **Normal day** clears the incident, not the issue. The Fix Center keeps listing it until it is repaired.

Measured with default settings: cooling failure, restart online at the first warning, no breach, cooling stays at 70%. Then a technician: 20 steps travel and 25 steps repair, and cooling returns to 100%.

**Say this to judges:** "Our system separates what an operator can fix from a screen from what needs a person on site, and it shows the cost of each choice."
