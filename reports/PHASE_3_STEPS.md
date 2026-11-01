# Phase 3 checkpoints

| Step | Features | Check |
|---|---|---|
| 3A / 0.3.1 | Authoritative crocodile sweeps/chomp cooldown, solid banks while airborne, ramp threshold, launch/landing events and camera height follow | 56-test suite; dedicated chomp/ramp/airborne tests |

World assets are original procedural 3D shapes; character models remain modular for the user's separate design work. Original Phase 1 and Phase 2 regression rulesets explicitly disable later mechanics; all assertions remain. Later mechanics have additional full-ruleset tests. 60/20/10Hz preserved. Physical mobile, audio audibility and visual sync acceptance remain pending. Continue through remaining requested steps without a new approval gate.

| 3B / 0.3.2 | Toon bands, dark inset outlines, expressive modular faces, sky and centre/edge water gradients | 56/56; browser shader log empty; rendered screenshot checked |

3B intentional visual tuning: ambient_light 2→0.8, sun_light 3→1.8, new sky_top_color/sky_bottom_color. Outlines are inset so the outer art bounds do not enlarge collision geometry. All new tunables are declared assumed; see generated config report. No physics/rate changes.

| 3C / 0.3.3 | SYNC, Turbo charge/trigger/decay, pink-ready UI, third first-race hint, Bear bonus window | 56/56, 60.027s; exact meter and multiplier tests |

| 3D / 0.3.4 | Authoritative scorecard, five award categories, ties and zero-score suppression, close calls across solid/water hazards | 56/56, 45.969s; results UI verification |

| 3E / 0.3.5 | Bank foam, flowing water streaks, wakes, shields, continuous propulsion/Turbo trails, comic event bursts and finite banner lifetime | 56/56, 46.513s; particles capped at configured 300 |

| 3F / 0.3.6 | Big Screen spectator follows both crews with separated views; world-space water/bank geometry excluded from outline scaling | 58/58, 58.666s; spectator authority and visual bounds regression; browser river alignment verified |

3F: one local tick-budget warning outside the unchanged timing test; strict timing test passed. Render capacity measured on final deployment. No config or physics/rate changes.

| 3G / 0.3.7 | Whack-open shortcut gate, timed give-way, fast current channel, seeded once-per-race all-bot choice | 58/58, 76.327s; gate lifetime/pinned tests and full-course mixed bots |

3G intentional assumed geometry tuning: shortcut.lateral -120→120, avoiding the left-side rock at 78%. Rates and existing bank restitution unchanged. Local tick-budget warnings remain outside the strict timing test; final Render race load check pending.

| 3H / 0.3.8 | Mixed trees, boulder banks, docks and cheering spectators, closer camera, distinct propulsion rings/droplets/clouds, heat steam/hiss, narrow HUD and control text polish | 62/62, 50.146s, zero local overrun warnings; desktop/390px browser review; full released-ruleset wall tests |

3H: camera_height 240→190, camera_behind 320→260, camera_ahead 140→120; three assumed effect geometry fields added. Geometry placement for scenery follows the shared mitered bank without changing collision. Static collision/award geometry is cached to reduce allocation. Initial 60/62 run failed the unchanged 16.67ms tick budget and 5s production startup timeout; clean rerun after allocation cleanup passed 62/62, then final visual changes passed 62/62 again. All original cases/assertions remain. Physical Safari/Android, audible audio and phone FPS still need user-operated acceptance.

| Performance fix / 0.3.9 | Cache crate/whirlpool/gate positions; calculate crocodile positions once per tick; reuse hazard arrays and bot seat sets; encode broadcast text once into a shared buffer | 62/62, 53.094s; original wire payloads, rules and 60/20/10Hz retained |

Actual Render 0.3.8 4-room/16-client checks: FAIL twice, one overrun each (24.174ms, then 95.371ms), despite ~60/20Hz and 0.0781 / 0.0691 average CPU cores. Raw reports retained as final-render-load-first.json and final-render-load-repeat.json. Do not call either run passed. Repeat on 0.3.9 before judging capacity.

0.3.9 actual Render recheck PASS: 4 test rooms / 16 clients, 5 active rooms reported; 20.194s, zero overruns, worst tick 0.355ms, ~60/20Hz, 0.0671 total CPU cores. Public flow PASS: 3.030s countdown, identical results after 14.991s. Live 390px browser has no overflow/error entries; 33,938 triangles observed. Physical acceptance remains pending. See FINAL_BUILD.md and raw measurements.

| Readability / carried-item fix / 0.3.10 | Reference-driven closer framing, layered cream/team tubes, plank deck/rope/ties, taller fuller characters; bow-mounted log appears on pickup and disappears on throw | 64/64, 46.075s, zero suite overrun warnings; new authoritative item and complete art-vertex radius tests; browser pickup/throw verified |

0.3.10: existing raft radius 34, restitution 0.4, physics and 60/20/10Hz unchanged. Camera 110/130/80, FOV55; responsive pullback .8 minimum aspect / 1.6 maximum; visual character radius25.5, height1.55. All 12 new visual tunables declared assumed; 190 total config diff entries including metadata. Preview overlap/bounds defects corrected in geometry, without tolerance relaxation. Local interactive preview can stall under machine load; clean final suite did not.

0.3.9 final-boot repeat FAIL: one 41.976ms overrun despite its earlier passing sample. Preserve render-039-final-boot-fail.json; capacity remains intermittent until the next build is measured. The richer benchmark actually sent ~19Hz inputs (10Hz resends plus immediate polling updates); its label is corrected, behavior/thresholds retained. New benchmark-game-input.mjs adds a separate realistic state-change stream; the original benchmark-races.mjs is unchanged.

| Camera/art/performance correction / 0.3.11 | Viewport/river/nearby-rival constrained smooth chase camera; Phase 3 phone view68% / controls32%; squat species-specific animated rigs; batched static art and instanced puffs; host throttle/CPU diagnostics | 69/69, 51.168s, zero suite overrun warnings; projection tests across 5 aspect ratios, both edges/every bend and moving turns; art/effects invariants retained |

Original Phase 1 view constants55/45 stay intact; the new phone proportions are explicit Phase 3 visual tunables. No test assertion/threshold changed. Initial config-guard failure corrected by preserving legacy ruleset values. A prior local countdown timing run failed under machine load; quiescent final full suite passed. Browser full detail:59fps,203 draw calls,62,690 triangles at one sampled view; no shader errors. Those are desktop observations, not physical iPhone evidence.

0.3.10 required original Render4-room/16-client test PASS (20s,0 overruns,worst2.147ms,0.05585cores). Added 60s realistic-input run FAIL (one45.920ms overrun); raw render-game-input.json retained. 0.3.11 adds read-only cgroup counters and per-overrun thread CPU/wall timing to establish the host/engine cause. No rate or threshold relaxation.

| Snapshot pacing / 0.3.12 | Spread independent rooms' snapshots across the three simulation-tick phases; no payload/rate/physics changes | 70/70,54.085s; new three-room real-WS test retains18–22 snapshots/s; one local warning outside strict timing test, which retained zero-overrun requirement |

0.3.11 original Render4-room/16-client20s PASS:zero overruns,worst3.776ms,0.05333CPUcores. Rich60s run FAIL:one20.582ms wall tick used1.053ms actual main-thread CPU. Cgroup quota measured15,000µs per100,000µs (0.15CPU); throttled periods grew55→84 and throttled time grew by2.598s during60.060s. This supports host scheduling/throttling as a contributor, not a20ms physics computation. Snapshot pacing is a burst-reduction fix; no timing threshold was changed. Recheck0.3.12.
