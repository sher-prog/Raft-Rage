# Current validation: serial 41/41 PASS

User-approved serial run: 40.408s; all test files unchanged during the run; timing-test overruns 0; two overrun warning lines elsewhere (clock/results). See SERIAL_CHECKPOINT.md. Physical acceptance remains pending.

# Current checkpoint: 0.1.10

The physical 0.1.9 iPhone retest exposed bank defects. See BANK_FIX_0_1_10.md for the fixes, stronger tests and current known issues; physical acceptance is still pending. Historical evidence below retains its measured build/version.

# Phase 1 checkpoint 0.1.9 — Oct 31, 2026

Public URL: https://raft-rage.onrender.com. Render Free, main auto-deploy; Node 24.22.1. Bug-fix build 0.1.7 deployed as fd4b564d583a3581e2e5f78f33eb97c844c5a2d6. Final feature build 0.1.9 includes hints, labels for both stunned rafts, and neutral bot inputs during stunned takeover. No Phase 2/3 work.

| Check | Automated / browser | Physical acceptance |
|---|---|---|
| Build/typecheck/full suite | PASS: 38/38, 16.924s; npm ci succeeds | — |
| P1-1 solo/hints/how-to | PASS: browser walk/fire dismiss hints; visit/rematch lifecycle test | PENDING private iPhone warm start <=10s |
| P1-2 names/code/share | PASS: validation, public lowercase join; source/session isolation | PENDING three-device convergence |
| P1-3 seats/Ready/1v1 refusal | PASS: public corrected Ana Red Left, Lia Red Right, Ben Blue Left | PENDING devices |
| P1-4 countdown/shared clock | PASS: public 3023ms countdown; local identical tick/time snapshots | PENDING visible timer delta <=0.2s |
| P1-5 recoil/walking/input | PASS: corrected ONE 2v2 unit procedure, WS seat/epoch binding, stale release/dedup | PENDING physical multitouch and remote recoil latency |
| P1-6 combat | PASS: windup, block, 1.5s stun, 3s cap, 2s immunity, reach/arc, event dedup; label+stars implemented | PENDING rendered physical combat |
| P1-7 recovery/spectating | PASS: real grace/migration/reclaim/restart; public late spectator | PENDING airplane mode and fourth device |
| P1-8 jump/results/rematch | PASS: public real 95% jump, identical results at 14.963s after first received finish, seats retained, Ready cleared, Dee sits | PENDING devices |
| iPhone reported bugs | PASS: navigation enlarged; bounded bank correction regression fails on old code, passes fix | PENDING iPhone Safari retest |
| Settings/Home/debug | PASS: browser Settings and Hide HUD; jump server authorization tests; old Home label absent | PENDING mobile layout/FPS |

## Measurements

Render Free build 0.1.7: 8-second samples at 1/2/4 rooms, four active human WS clients per room. All passed; 4 rooms / 16 clients is only the largest tested load, not a long-term capacity guarantee. 59.94–59.99Hz sim, 19.94–19.95Hz snapshots, zero tick overruns. At 4 rooms: 0.03282 CPU cores total, 0.00205 cores/user (<0.1 budget); RSS 77.5MiB; socket outbound 489,615B/s, inbound 24,261B/s; event-loop mean 10.13ms / historical worst 80.67ms. Event-loop sampling resolution is 10ms; includes setup history. WS framing counted; edge TLS/TCP/provider overhead excluded. Full per-room tick and serialization averages/worsts: render-race-benchmark.json.

Local 8-room sample passed at ~59.93/19.98Hz, 0.1035 cores including load clients. Local preview had transient tick overruns during UI/build activity; one concurrent full-suite run failed its zero-overrun assertion. A later run exposed stunned bot takeover skipping neutral input acknowledgements; code fixed and regression added. Isolated unchanged tests passed; no rate changes. Desktop browser observed ~60fps; no phone FPS claim. Real process boots and exact restart message tested; 0.0.0.0/PORT/health/start verified.

## Config changes

No tunable changes in 0.1.7, 0.1.8 or 0.1.9. Retained config 1.7-debug-settings and 60/20/10Hz. Historical Phase 1 additions/changes versus preserved original are fully listed in CONFIG_CHANGES.md and config-diff.json. Package and lock version now 0.1.9. No paid services, Render integration, pinger or rate reductions added.

## Known issues / limits

Physical acceptance remains pending; do not label P1 fully accepted. Cold wake and cellular timing unmeasured. Normal-bot 75–85s tuning target remains unverified (P1 uses Chill; inherited Chill runs take ~100–123 simulated seconds). Finish arch direction is a persistent HUD marker; physical arch stays at the actual finish. Public results timing is measured from received snapshots; authoritative grace is exactly 15 seconds. Earlier public script failures were harness seating order / stale queued lobby reads; corrected harness passes without relaxing assertions. Current browser QA used local desktop Chromium, including a 390px viewport without overflow; it is not iPhone Safari evidence.

Manual Render settings retained: Free Web Service, main, build npm ci && npm run build, start npm start, health /healthz, pinned Node, PORT provided by Render. User owns physical checks and optional external pinger. Await user review before Phase 2.

Final visual regression: +180/-180 stern normalization no longer dismisses the walk hint. Both angles identify the same position; covered by hint lifecycle test. Build 0.1.8 deployed at commit 36702a5db413e312ed0a2cc439aec1f723b68c6c; final hint patch is 0.1.9. Public multiplayer evidence was repeated on live 0.1.8.
