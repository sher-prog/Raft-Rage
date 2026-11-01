# Approved human instructions — controlling implementation record

The direct human instructions in the Work handoff override docs/source/RAFT_RAGE_BUILD_SPEC.md. Architecture and Phase 1 are already approved. All code is written originally in ChatGPT Work. No prototype code is copied. No Phase 2 or 3 starts before Phase 1 is deployed, tested, reported and reviewed by the user.

1. Render Free only; no paid services. Builder manually configures Render. Do not install or use Render integration. Free sleeps after 15 minutes without inbound traffic, wakes in roughly one minute and may restart. `/healthz` is a constant tiny GET with no simulation/storage work. Builder supplies an external free 10-minute pinger; do not create it. No uninterrupted-availability promise.
2. Budget 0.1 CPU per user; lean single Node process, in-memory rooms, same-origin secure WebSockets and one authoritative fixed-step 60Hz simulation per active room. Preserve 60Hz simulation, 20Hz snapshots and 10Hz input resend. Warn user about overruns BEFORE changing ANY rate. Debug must show average AND worst per-room tick time. Benchmark real CPU, event-loop and network/snapshot overhead; distinguish local from actual Render Free. Lobby-only measurements are not race-capacity measurements.
3. Per-boot identifier exchanged initially and on reconnect. Changed boot: exact message `The server restarted. Start a new room.` and Home. Missing/closed rooms have a different error. No account tracking.
4. User creates an EMPTY GitHub repo and sends URL. Verify authenticated write access in THIS Work environment; URL alone is insufficient. No pasted secrets. Render auto-deploys main; push main only at tested checkpoints. Prepare while access is pending.
5. Pin Node 24.22.1 with `.node-version` and bounded engines. Verify actual `npm ci && npm run build`, `npm start`, `/healthz`, binding `0.0.0.0` and `PORT`.
6. Work migration is complete; write all code here.
7. Every tunable is config driven. Preserve existing values except intentional documented tuning. Every added config key must appear in its group's `_assumed`, bump `_version`, list EVERY added/changed key in Phase 1 report. Add quantization, reconnect/backoff/stale-input, initial state, geometry and timings when implemented. Preserve original source JSON separately.
8. Corrected P1-5 uses ONE 2v2 room, one player acting at a time: Ana Red Left on phone walks stern + fires => forward; walks HER LEFT SIDE + fires => slide RIGHT; holds left-walk + SPOUT => multitouch. Lia Red Right on laptop walks HER RIGHT SIDE + fires => slide LEFT. No substitute 1v1 test.
9. P1: keel, walking zones, stern gap; Hippo only; basic STUNNED label and stars. P2: zone stripes and heat. P3: SYNC/Turbo. Hide debug actions for nonexistent mechanics, including pickups/turbo. P1 debug includes Jump Red/Blue/both and Hide HUD.
10. Host migration required: lost host connection gets the same 3-second grace and bot replacement/seat reclaim as any player. Explicit Leave OR grace expiry promotes earliest-joined connected remaining HUMAN. Example exact banner: `Lia left. Ana is now host.` Returning ex-host is ordinary player. Enforce all role authorization server-side and update clients. Room survives when no connected humans remain until configured 20-minute idle expiry, permitting rejoin. Never close solely because host left.
11. Exclude two local players and section 7 split view from P1. One keyboard player uses A/D/W/S. Big Screen remains P3.
12. MP-6: separate browser tabs/windows are separate players. Per-player session/reconnect token and sequence state belong in sessionStorage, NEVER localStorage. localStorage only prefills display name. Safe reconnect sequence/counter handling, no active-seat name takeover. Test independent clients.
13. Automate all feasible multi-client checks BEFORE asking user for physical checks. Record actual timings. Real iPhone Safari, Android Chrome and fourth-device checks are operated by the user. Browser emulation is not physical Safari or cellular evidence.
14. Names exist only for room lifetime. Never log names or input contents. Hosting connection metadata is acknowledged. No analytics, tracking, accounts, ads, payments or persistent player DB. Original procedural art and later browser-synthesized audio only; system rounded or appropriately licensed font.
15. DEPLOY FIRST: first tested checkpoint must be LIVE on Render: responsive page, cellular load, WebSocket open, create and join by code. Send public URL immediately once working; user must confirm phone/cellular. Build the race on top and redeploy at each tested checkpoint. Do not finish the whole game before initial live URL. While awaiting access/hosting, complete skeleton and checks, describe blocker, continue independent preparation.
16. Oct 31, 2026 schedule (Pacific): initial handoff 1:25pm / 20:25 UTC, target P1 live/passing 5:00pm, feature cut 7:59pm, deadline 11:59pm. Timestamp each step; communicate concise progress. Estimates (not guarantees): access 10m, skeleton+deploy 30m, simulation 60m, controls/screens 40m, recovery/host migration 35m, automated final checks 25m, physical user checks 15m. Total 3h35 if access prompt. Flag risk instead of weakening tests.
17. Before P2 report exact build/deploy versions, measured P1-1..8 statuses, config change list, CPU capacity/limits, public URL/manual settings, remaining defects. Wait for user review.

## Required Phase 1 evidence

- P1-1: real private iPhone, no login/install, solo race within 10s; report Free cold wake separately if pinger unavailable.
- P1-2: names, lowercase code and share prefill.
- P1-3: seats, Ready, refusal of 1v1 with more than 2 seated humans.
- P1-4: authoritative countdown/timer within about 0.2s; actual timestamps.
- P1-5: corrected 2v2 procedure above; instant buttons, multitouch, remote recoil ~150ms target.
- P1-6: whack, block, stun, immunity, label plus stars.
- P1-7: disconnect for 5s => bot about 3s, same-code/name reclaim, late spectator.
- P1-8: debug jump both95%; results within 15s OF FIRST FINISH, identical times/results; rematch retains seats and clears Ready; Dee can sit.
- Additional automated: host migration, real boot restart, stale release, dedup, independent tabs. Never label pending tests passed.

## Oct 31 serial-test execution approval

The user explicitly approved running all 41 tests serially, preserving every case, assertion and threshold. No test deletion, skip, tolerance/timeout relaxation or tick-overrun threshold change is allowed. Report count, total time and any overruns. Keep real capacity measurement on Render at 4 rooms / 16 clients and rerun it on the deployed build. Preserve 60/20/10 Hz. Push only after the full suite passes, then continue remaining Phase 1 checks.

## Full-build authorization

The user requested completion of all remaining phases, including all characters, original propulsion effects, hazards, pickups, visuals and audio, with tested checkpoints and periodic reports. This authorizes proceeding through Phase 2 and Phase 3 without another phase-review permission gate. The user is using a separate chat for design references; keep character models modular and continue the game build here without waiting. The existing feature cut and deadline remain in force.
