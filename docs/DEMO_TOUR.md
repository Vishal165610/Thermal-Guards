# Guided demo: step by step (about 3 minutes)

Start: press **Guided demo** in the top bar, or open the app with `?tour=1` (for example `http://localhost:5173/?tour=1`).
Controls: **Space** pause / resume (the simulation pauses too) · **← →** back / next · **Esc** stop · click the bar on top to jump · the chevron hides the script and keeps only the title.
The tour resets the simulation at step 1, so it can be run again and again. The simulation has no random numbers, so every run is the same.

| # | Page | Seconds | Big title | What happens on screen |
|---|---|---|---|---|
| 1 | Overview | 12 | THERMAL GUARD | Reset. All six zones green. Say: simulated data. |
| 2 | Overview | 14 | Six zones. One big meter each. | Explain the meters and colours. |
| 3 | Live Twin | 12 | The factory as a 3D digital twin | Cooling Unit selected, fans spinning. |
| 4 | Live Twin | 12 | Machines and heat map, side by side | Two models. |
| 5 | Fix Center | 9 | Now we BREAK the cooling unit | Tour presses COOLING FAILURE, simulation runs at 1x. |
| 6 | Live Twin | 7+ | Watch the heat build | Heat map, live temperature and risk. Waits for the AI warning. |
| 7 | Overview | 18 | AI WARNING: before anything breaks | Simulation paused. Limit not crossed, AI risk shown. |
| 8 | Fix Center | 12 | WHAT TO DO, and what it costs | Simulation paused. Suggested fix, cost, rules not AI. |
| 9 | Live Twin | 9+ | The operator presses RESTART COOLING | Tour presses the fix, simulation at 2x, zone cools, timeline closes. |
| 10 | Analytics | 18 | RESULT: the breach was avoided | Early-warning timeline and outcome built from real events. |
| 11 | Analytics | 22 | How good is the AI? (simulated test) | Held-out numbers from `npm run evaluate`. |
| 12 | Alerts | 9 | Everything is logged | Alerts, AI items and operator actions are separate records. |
| 13 | Overview | 14 | See the heat. Predict the risk. Act before failure. | Next steps and the honest limits. |

Steps 6 and 9 wait for a real event (AI warning, zone back to normal), so total time varies by a few seconds.

## Honest talking points
* All data is simulated. The evaluation is on the same simulator with fresh incidents, so it says nothing about real plants.
* For slow cooling failures the amber WARNING level and the AI warning come at almost the same time. The AI gains the most on fast problems (machine overheating, fire). The evaluation table on the Analytics page shows this per incident type.
* Suggestions in the Fix Center are plain rules, not AI. The AI only says WHEN.

## Changing the tour
Everything is in `client/src/components/tour/tourSteps.ts`: titles, the "what you are looking at" lines (they can show live numbers), the "say this" text, durations, and the actions each step performs.
