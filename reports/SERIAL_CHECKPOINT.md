# Serial verification checkpoint — game build 0.1.10

| Check | Result |
|---|---|
| Same 41 tests, serially | PASS: 41/41, 40.408s, zero skips/cancellations/failures |
| Case/assertion/threshold integrity | PASS: all 11 test files hash-identical before/after execution |
| Timing test original limits | PASS: zero overruns; avg 0.451ms / worst 7.749ms |
| Other serial-run overruns | Two warning lines: clock and results tests; warns once per affected room, so total overrun count is not known |
| Swept bank regressions | PASS: 1,680 actual-contact scenarios / 302,400 ticks; every tick contained and within its velocity budget |
| Human-style full-course runs | PASS: 101.717s / 121.017s; 420 / 1,399 bank-contact ticks |
| Physical iPhone / full device acceptance | PENDING |

Authorized change: npm test now uses --test-concurrency=1. All cases, assertions, tolerances, timeouts and the zero-overrun timing threshold are preserved. Test-only checkpoint: game code/assets remain identical to 286e58e; build stays 0.1.10. Strengthened contact assertions from the previous follow-up are included. No gameplay config changes; 60/20/10Hz retained. Config remains 1.8-swept-banks.

Next: verify the Render redeployment, rerun the 4-room/16-client active-race capacity check there, and repeat public multi-client acceptance. Record post-deploy results in delivered evidence. Phase 1 features are implemented; physical Safari/Android/cellular/multitouch/FPS and multi-device visual acceptance remain user-operated. No Phase 2 work starts before review.

Automatic approval review initially rejected serial execution; explicit user approval resolved that restriction. Local overrun warnings remain a reported limitation, not hidden by the execution-order change. Render load measurements, not local test-machine timings, determine the tested server-capacity bound.
