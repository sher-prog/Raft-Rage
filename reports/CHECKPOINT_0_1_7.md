# 0.1.7 — iPhone playtest fixes

| Check | Status | Measurement |
|---|---|---|
| Typecheck + full automated suite | PASS | 36/36; 16.208 s |
| Bank angled-impact regression | PASS | Both banks, all segments/bends, 1/10/34u penetrations; correction <= penetration; tangential motion preserved; restitution 0.4 |
| Regression against original implementation | FAIL (expected) | 1u penetration incorrectly moved raft more than 1u |
| Race navigation browser check | PASS | Larger timer, two 18px bars, YOU, percent/distance, persistent FINISH marker; 390px viewport has no horizontal overflow |
| Physical iPhone Safari | PENDING | User retest required |

Cause: bank penetration correction reconstructed position from a clamped centreline projection, discarding tangential displacement at segment endpoints.
Config changes: none. 60/20/10 Hz unchanged. Version 0.1.6 → 0.1.7 (package and lockfile); corresponding version assertion updated.
Known issues: first-race hints and final Phase 1 evidence remain. Browser check is desktop Chromium, not physical Safari. One local preview tick-overrun warning occurred while builds/tests were running; rates were retained. Capacity requires isolated race benchmarking and actual Render measurements.
