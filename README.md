# THERMAL GUARD — Predictive Industrial Digital Twin
**Team AXON · AURIX Hackathon 2026 · Industry 5.0 & Automation · Software**
*See the Heat. Predict the Risk. Act Before Failure.*

A simulated factory with a 40 × 25 thermal grid, an interactive 3D view, rule-based alerts and a
small neural network that estimates the risk of a temperature-limit breach in the next 30 simulation steps.

> **This is a simulation.** It is not a certified industrial safety system and it has not been validated on real plants.

## What is real and what is simulated
| Part | Where it lives | Notes |
|---|---|---|
| Temperatures (40 × 25 grid, 6 zones) | `server/src/simulation` | Fixed-timestep heat diffusion + heat sources + cooling. One source of truth. |
| Rule alerts (NORMAL / WARNING / CRITICAL / RECOVERING) | `server/src/alerts` | Hysteresis, one alert per incident, acknowledge button. |
| AI forecast | `server/src/forecasting` | TensorFlow.js dense network, trained on *generated* simulation data. The browser build runs the same trained weights (`shared/neuralNet.ts`). |
| AI evaluation | `server/src/forecasting/evaluate.ts` | `npm run evaluate`: 300 fresh simulated incidents (different seed than training), compared with the plain WARNING level. Shown on the Analytics page. |
| Guided demo | `client/src/components/tour` | **Guided demo** button (top bar) or `?tour=1` in the URL: a ~3 minute auto-tour with big captions. |
| Fallback estimate | `trendFallback.ts` | Straight-line trend. Always labelled **"Trend estimate (not AI)"**. |
| Early-warning timeline | `server/src/alerts/earlyWarningTimeline.ts` | Computed from real events. Can say "no warning before breach". |
| Dashboard + 3D | `client/` | Only displays server snapshots. No random frontend temperatures. |

## Install
Requirements: Node.js 20 or newer.
```bash
npm install          # installs client + server (npm workspaces)
npm run train        # trains the forecast model (once; see below)
npm run dev          # starts server (port 4000) and client (port 5173)
```
Open **http://localhost:5173**. You can also run them separately: `npm run dev:server`, `npm run dev:client`.

## Train the model
```bash
npm run train
```
* Generates 700 randomised incident runs (cooling failures, machine overheating, fires, different zones, severities, start and recovery times) using the same simulator.
* Trains a small dense network (22 inputs → 48 → 24 → 7 outputs) and saves it to `server/models/thermal-guard-model.json`.
* Prints a held-out check on the *generated* data (true / false warnings, missed breaches).
* Dataset generation, weight initialisation and shuffling are seeded. Training uses the plain-JavaScript TensorFlow.js CPU backend, so there are no native add-ons to install. (You may see a TensorFlow.js message suggesting `tfjs-node`; it is optional and can be ignored.)
* Smaller/faster run (macOS/Linux): `EPISODES=300 EPOCHS=12 npm run train`.
* **You do not have to run this by hand:** `npm run dev` trains the model automatically the first time if the file is missing. The model is your own (about 2,500 numbers, trained on your laptop, no API or cost).
* Commit `server/models/thermal-guard-model.json` to git so teammates do not need to train.
* The server loads the saved model at start-up. It **never trains while the dashboard runs**.
* If the model file is missing or broken, the dashboard shows "AI MODEL UNAVAILABLE · TREND FALLBACK" and uses clearly labelled trend estimates.

**What the network sees:** only the recent peak-temperature history of one zone, that zone's warning/limit values, and which zone it is. It is never told which incident is running.
**What it outputs:** a breach-risk score (0–100 %) and estimated temperature change at +5 … +30 steps. The risk score is a model output, not a calibrated probability.
**How it is checked:** `npm run evaluate` replays 300 fresh simulated incidents the network never saw in training and reports how many breaches it warned about first, the median warning time compared with the plain WARNING level, and warnings in runs that never breached. These numbers describe the simulator only, never a real plant. `npm run train` runs the same check at the end and stores the result inside the model file.

## Guided demo (auto-tour)
Press **Guided demo** in the top bar (or open the page with `?tour=1`). It switches pages, starts the incident, pauses at the AI warning, presses the fix, and shows the result and the evaluation numbers, with big captions: *what you are looking at* and *say this*. About 3 minutes.
**Space** pauses / resumes (the simulation pauses too), **← →** go back / forward, **Esc** stops, and you can click the progress bar to jump to a step. Full script: `docs/DEMO_TOUR.md`.

## 3-minute demo script (manual)
Use **Reset** before every run. Start incidents from the **Fix Center** page. The simulation starts at **0.5× speed (1 step = 1 second)**. Use the top-bar controls to **pause**, **step one tick at a time**, or change speed (0.25×, 0.5×, 1×, 2×). The banner at the top of the 3D view explains in plain English what is happening, and its 5-stage bar shows where you are in the story: Normal → Incident → Warning → Limit crossed → Recovery. Pause at each stage to explain it.

| Time | Do | What to point out |
|---|---|---|
| 0:00 | Open dashboard. Zone **Cooling Unit** is preselected. | All six zones green. Fans on the cooling unit are spinning. Header says SIMULATED DATA. |
| 0:25 | Click **THERMAL VIEW**. | Heat map on the floor (one texture, driven by the server grid). Click zones in the 3D scene to inspect them. |
| 0:45 | Click **COOLING FAILURE**. | Cooling effectiveness drops, fans slow down, the cooling zone heats up. Neighbouring zones warm slightly. |
| 0:55–1:15 | Watch the **forecast chart** and the **Predictive Early Warning Timeline** at the bottom of the 3D view. | When the model's risk score stays above 50 % for 3 steps in a row, the zone turns **amber** and an `AI` item appears in the alert feed. Observed (solid) and forecast (dashed) are different lines. |
| ~1:15 | The cooling zone crosses 45 °C (about 60 steps after the failure starts: ~1 minute at 0.5×, ~15 s at 2×). | Zone turns **red**. A `RULE` alert appears: this is the reactive threshold alarm. The timeline now shows **AI warning step → actual breach step → lead in steps**. If the AI was late, or never warned, it says so. |
| 2:00 | Click **ACKNOWLEDGE**, read the operator guidance in the right panel. | Rule alerts and AI predictions are kept separate. |
| 2:15 | Click **NORMAL OPERATION**. | Cooling returns, status goes RECOVERING (cyan) then NORMAL (green). |
| 2:45 | Optionally click **FIRE SCENARIO** (applies to the selected zone), then **RESET**. | Fast rise: expect a much shorter lead, possibly none. That is honest behaviour. |

Kill the server mid-demo to show the red **DISCONNECTED** banner: the screen dims and values are marked stale.

## Pages
| Page | What it is for |
|---|---|
| **Overview** | One big meter per zone, four key numbers, the plain-English banner and the early-warning timeline |
| **Live Twin** | The 3D factory. Switch between **One model** (Factory or Heat map) and **Two models** side by side |
| **Fix Center** | Open issues, online fixes, technician dispatch, and the buttons that start a test incident |
| **Analytics** | Measured and forecast charts, the AI model card, the incident report |
| **Alerts** | The activity log: alerts, AI predictions and operator actions |

Playback controls (pause, step, 0.25x to 2x speed) are in the top bar on every page.

## Fixing problems: online first, then on site
Every incident creates an **open issue** (a root cause), for example a cooling pump fault.

1. **Online fix** (from the Fix Center, instant): restart cooling remotely, reduce or stop a machine, sprinklers, extra ventilation. This contains the symptoms, but the equipment keeps running **degraded** (for example cooling at about 70%).
2. **Send technician** (on site, takes time): travel (20 steps), then repair (15 to 30 steps). A technician cannot start while the problem is still active or the zone is above its limit, so contain it online first.
3. **Fixed:** the root cause is repaired and the equipment returns to full operation.

The **Normal day** button clears the incident, but open issues stay open and equipment stays degraded until a technician repairs it. Suggestions are plain if-then rules, not AI. Each action lists its cost.
`npm run rehearse:actions` runs each incident with no action, an immediate online fix and a late one, headless.

See `docs/TEAM_GUIDE.md` for how everything works and how to present it.

## Reset
Top-bar **RESET** or **RESET SIMULATION** restores the settled initial state and clears alerts, history and the timeline. Everything is repeatable: the simulation has no random numbers.

## Headless rehearsal (no browser)
```bash
npm run rehearse
```
Runs normal → cooling failure → recovery and prints temperatures, status, risk and the timeline. Useful to check the model before presenting.

## Project structure
```
thermal-guard/
  shared/            types, zone config, feature builder (used by client, server and training)
  server/src/
    simulation/      thermal grid, heat sources, scenarios
    alerts/          rule engine, early-warning timeline
    forecasting/     dataset generator, train.ts, model IO, forecaster, trend fallback
    scripts/         rehearse.ts
    service.ts       owns all state; index.ts = Express + Socket.IO
  client/src/
    components/factory/    3D scene, zone models, thermal overlay
    components/dashboard/  top bar, zone cards, details, alerts, timeline card
    components/charts/     history + forecast charts
    components/controls/   incident buttons
    hooks/useSimulation.ts Socket.IO connection
```

## Tuning
* Zone limits and warning margins: `shared/zones.ts`.
* Heat sources, cooling strength, scenario severity: `server/src/simulation/config.ts`.
* AI warning threshold (50 %) and confirmation steps (3): `shared/zones.ts` (`AI_WARN_RISK`, `AI_CONFIRM_STEPS`). After changing `shared/features.ts` you must retrain.

## Known limitations
* Simulated data only; the physics is a simple diffusion model, not a validated plant model.
* The network is trained on data from the same simulator it is tested on, so its performance on real equipment is unknown.
* Alert state, history and the timeline live in memory and are lost when the server restarts.
* Fire scenario: the temperature rises quickly, so the forecast may warn only a few steps ahead, or not at all.
* One zone value (the hottest cell) drives alerts and the forecast. Cell-level hot spots are visible only in the thermal view.
* Desktop layout (≥ 1180 px wide). No authentication, database or deployment setup by design.
