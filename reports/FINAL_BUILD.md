# Raft Rage — 0.3.9 feature build

Live: https://raft-rage.onrender.com. Phases 1–3H features deployed; physical acceptance remains pending. Tested source commit: c63aa97a4eae45f2627248f71b42ce626a6d5b70.

| Check | Result / measured numbers |
|---|---|
| Typecheck, build, serial suite | PASS — 62/62, 53.094s, zero overrun warnings; no cases/assertions/thresholds removed or relaxed |
| Full released-ruleset banks | PASS — 1,680 impact scenarios / 302,400 ticks; minimum bank clearance 34.000650u, raft radius 34 |
| Committed human-style wall driving | PASS — both full-course runs: 115.417s / 111.850s; 73 / 184 bank-contact ticks; all displacement limits retained |
| Actual Render load | PASS on 0.3.9 — 4 test rooms / 16 clients (server reported 5 active rooms), 20.194s sample; 59.985–60.017Hz sim, 19.983–20.011Hz snapshots, 0 overruns, worst tick 0.355ms |
| Render CPU/network | 0.0671 CPU cores total; RSS 89.31MiB; sockets out 1,012,721B/s / in 49,271B/s; event-loop mean 10.26ms, historical max 103.81ms |
| Public multiplayer/results/rematch | PASS — 3.030s countdown; identical results received 14.991s after first finish; spectator, Ready and retained-seat checks pass |
| Live browser / 390px width | PASS — no error entries or horizontal overflow; control toggle updates; 33,938 triangles observed; desktop FPS sample 54, not phone evidence |
| Physical Safari/LTE, Android, fourth device, touch/audio/FPS | PENDING user-operated checks |

Includes four characters/resources, combat, pickups, logs/whirlpools, crocodiles/ramp, SYNC/Turbo, stats/awards, Big Screen, shortcut gate, procedural scenery/characters, propulsion clouds/rings/droplets, steam and synthesized music/SFX.

Root causes: old bank collision used nearest-centreline segments instead of the drawn mitered banks, leaving incorrect boundaries at turns. Changing nearest segments could then apply a large penetration correction, compounded by abrupt camera turns. Shared banks and swept movement fix both; restitution stays 0.4. The later world-surface outline scaling bug is also fixed and regression-tested. Central FINISH text is gone; distance stays in the top bars.

Config: 60/20/10Hz retained. All 178 config diff entries, including metadata and intentional style tuning, are listed in CONFIG_CHANGES.md / config-diff.json. No performance thresholds or core balance values were reduced; 0.3.9 changes only allocation/encoding and version metadata.

Known limits: both 0.3.8 Render samples failed with one overrun each (24.17ms / 95.37ms); raw failures are retained. The 0.3.9 pass is a short measured sample, not a long-term capacity guarantee. Socket counters exclude Render edge TLS/TCP overhead; event-loop history includes setup. Physical acceptance and Free cold wake remain unmeasured. Character references from the separate design chat have not been supplied; original modular models are included. No paid service or pinger added.
