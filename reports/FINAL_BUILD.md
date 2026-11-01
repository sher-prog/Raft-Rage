# Final feature checkpoint — 0.3.9

| Check | Status / measured numbers |
|---|---|
| Typecheck/build + complete serial suite | PASS: 62/62, 53.094s; zero warnings; original thresholds/cases retained |
| Full Phase 3 bank stress | PASS: 1,680 scenarios / 302,400 impact ticks; minimum bank clearance 34.000650u for radius 34 |
| Committed human-style full course | PASS: 115.417s / 111.850s; 73 / 184 bank contact ticks; no relocation or escape |
| Desktop / 390px browser | PASS: shader/error log empty; scenery, clouds, progress/timer and controls; no horizontal overflow |
| Actual Render 4 rooms / 16 clients | FAIL on 0.3.8 twice (one overrun each); PENDING 0.3.9 recheck |
| Public multiplayer/results/rematch | PASS on 0.3.8 (3.024s countdown, 14.966s results); PENDING 0.3.9 wire recheck |
| Physical Safari/LTE, Android, fourth device, audible audio, phone FPS | PENDING user-operated acceptance |

All planned build phases through 3H are enabled: four characters/resources, combat, pickups/traps, crocodiles/ramp, SYNC/Turbo, stats/awards, Big Screen, shortcut and original procedural world/audio/effects. Character assets remain modular for separate design references, none received in this chat.

Bank escape root cause: the old nearest-centreline collision did not match the drawn mitered banks at joins. Snap root cause: changing nearest segments could apply a large penetration correction, compounded by abrupt camera direction changes. Shared bank geometry and swept-circle movement replace that behavior; restitution remains 0.4. A later outline-rendering regression scaled world-space river surfaces; 0.3.6 fixed it with a visual-bounds regression test. Central FINISH text is removed; distance stays at the top and the world arch stays at the finish.

Config: 60/20/10Hz unchanged. All added/changed keys and values: CONFIG_CHANGES.md and config-diff.json (178 entries including metadata). Intentional style tuning: lighting 0.8/1.8, camera 190/260/120; assumed shortcut lateral +120 avoids a left-side rock. New geometry fields are declared assumed. No bank restitution or core balance reduction.

Known limits: local interactive browser preview showed tick overruns under machine load; clean final serial suite did not. Initial final-suite failures are recorded in PHASE_3_STEPS.md. Render capacity must come from the deployment, not those local timings. Free sleep/cold wake remains unmeasured; no paid service/pinger was added. Original procedural art/audio is included; physical touch/audio/FPS acceptance is not claimed.

0.3.9 performance fix only: cache static positions/hazards, reuse crocodile positions, avoid repeated bot sets and shared broadcast UTF-8 encoding. No config changes beyond version metadata.
