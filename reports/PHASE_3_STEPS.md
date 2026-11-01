# Phase 3 checkpoints

| Step | Features | Check |
|---|---|---|
| 3A / 0.3.1 | Authoritative crocodile sweeps/chomp cooldown, solid banks while airborne, ramp threshold, launch/landing events and camera height follow | 56-test suite; dedicated chomp/ramp/airborne tests |

World assets are original procedural 3D shapes; character models remain modular for the user's separate design work. Original Phase 1 and Phase 2 regression rulesets explicitly disable later mechanics; all assertions remain. Later mechanics have additional full-ruleset tests. 60/20/10Hz preserved. Physical mobile, audio audibility and visual sync acceptance remain pending. Continue through remaining requested steps without a new approval gate.

| 3B / 0.3.2 | Toon bands, dark inset outlines, expressive modular faces, sky and centre/edge water gradients | 56/56; browser shader log empty; rendered screenshot checked |

3B intentional visual tuning: ambient_light 2→0.8, sun_light 3→1.8, new sky_top_color/sky_bottom_color. Outlines are inset so the outer art bounds do not enlarge collision geometry. All new tunables are declared assumed; see generated config report. No physics/rate changes.
