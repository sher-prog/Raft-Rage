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
