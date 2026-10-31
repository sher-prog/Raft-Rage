# Raft Rage — deploy-first checkpoint 0.1.0

Prepared October 31, 2026 in ChatGPT Work. This is an intermediate lobby checkpoint, **not Phase 1 completion or a public Render deployment**. Both complete source documents are materialized under `docs/source/`; the JSON retains its original semantic values/documentation with condensed whitespace. Direct human overrides are recorded in `docs/APPROVED_OVERRIDES.md`.

## Build and access state

- Application version: **0.1.0**; config: **1.1-skeleton (2026-10-31)**.
- Exact runtime verified locally: **Node v24.22.1**, npm **11.9.0**. `.node-version` pins 24.22.1; engines are bounded `>=24.22.1 <25`.
- Exact build command `npm ci && npm run build` succeeded. TypeScript checks succeeded. Start command `npm start` exercised by automated real-process test; HTTP and WS work on `0.0.0.0` with `PORT` honored. Tiny `/healthz` returns constant `ok` without inspecting rooms or measuring anything.
- GitHub connected and authenticated account verified as `sher-prog`; **repository URL still absent and repository-specific write permission unverified**. Nothing has been pushed anywhere.
- Public Render URL, Render deployment ID/version/commit: **not available**. User must manually create the Free Web Service after the tested source is in their repository; no Render integration or pinger is installed/created.
- Internal browser preview was used only for QA. It is not a public Render deployment and does not satisfy the cellular checkpoint.

## Automated result

**15 tests passed, zero failures** in **7968.65ms** in the final saved run (`reports/automated-checks.txt`). It includes real HTTP/WS clients and actual npm-start subprocesses, not only mocked functions. Accelerated idle expiry and name-reclaim unit scenarios explicitly override config in isolated test copies; the main clean/unclean disconnect tests use the real configured 3-second period. The 20-minute wall-clock idle window has not been waited out physically.

Measured timings from final run:

| Check | Actual local time |
|---|---:|
| create_and_second_client_join_and_host_broadcast | 11.09 ms |
| disconnect_to_bot_and_host_migration_real_grace | 3073.85 ms |
| unclean_heartbeat_loss_to_bot_and_migration | 3171.76 ms |
| Actual npm start: first process ready through HTTP and WS | 229.06 ms |
| Actual npm start: second process ready through HTTP and WS | 193.98 ms |

The tests cover health/assets, names and blocked/taken names, lowercase/spaced code, two independent credentials, no active-name/token takeover, ready/seats, 1v1 refusal with >2 humans, host-only authorization, explicit and grace-expiry host promotion, old host ordinary reclaim, reconnect before grace, name reclaim after grace and token rotation, boot mismatch vs ordinary missing-room error, empty-room retention and expiry, four seats plus eight spectator capacity, foreign-origin rejection, malformed-message containment, and unchanged original config values with all additions declared assumed.

Browser QA also observed connected Home, Create/Join, lowercase link prefill, visible invalid-name error, independent own-player markers in two tabs, Ready broadcasts, reload preserving the original identity despite another tab changing the name prefill, exact host promotion banner and **actual preview process restart → Home with exact restart text**. See `reports/browser-qa.json`. A browser Create flow took **1949ms** including Home click/name fill; join-submit to own lobby took **1007ms**, including automation overhead. These do not measure cellular network or remote recoil latency. Desktop content fit without horizontal overflow; visible lobby buttons measured at least 44px tall. No phone emulation or physical testing is claimed.

## Phase 1 acceptance status — not final acceptance

| ID | Checkpoint status | Remaining evidence/work |
|---|---|---|
| P1-1 | Pending; solo lobby and How to play only | Public/private iPhone, race Start and bot motion, hints, <=10s warm start; Free cold wake reported separately |
| P1-2 | Partial local automated/browser | Name/code/share-prefill flows tested; public three-device convergence and phone checks pending |
| P1-3 | Partial local automated/browser | Seats/Ready/host mode and >2 refusal tested; Start/readiness gate not implemented |
| P1-4 | Not implemented | Countdown, authoritative clock and measured cross-client timer delta |
| P1-5 | Not implemented | Corrected ONE-room 2v2 recoil/walking and multitouch procedure, input lighting, remote-kick latency |
| P1-6 | Not implemented | Whack/block/stun/immunity and label+stars |
| P1-7 | Partial local lifecycle tests | Clean/silent loss, bot designation and reclaim/host migration pass in lobby; no bot race driving, airplane mode or late-race spectator yet |
| P1-8 | Not implemented | Jump both95%, first-finish+15s results, identical times, rematch/seat retention/Ready reset/Dee seat |

No P1 test is marked fully passed on the basis of the lobby skeleton. Stale input release, seq/whack/event dedup, rendered clock/interpolation sync, race bot movement, results/rematch, full debug and physical checks remain for the next checkpoint. No P2/P3 mechanics or disabled future debug controls exist.

## Local process/network baseline (NOT 60Hz race capacity)

Each load point ran about 6 seconds with four connected clients per room. Application data uses real WS ping/pong exchanges at the configured 2-second application clock-ping interval and server WS control heartbeats. Full report is `reports/skeleton-benchmark.json`.

| Lobby rooms | Connected clients | CPU, % of one core | RSS, MiB | App outbound, B/s | App inbound, B/s | Event-loop mean / worst, ms |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 4 | 0.567% | 43.19 | 92.0 | 56.0 | 10.10 / 10.88 |
| 8 | 32 | 0.770% | 48.18 | 735.9 | 447.9 | 10.11 / 13.11 |
| 16 | 64 | 0.728% | 52.55 | 1471.9 | 895.9 | 10.11 / 11.58 |

CPU is measured with `process.cpuUsage` and **includes both server and load clients in one process**. Host is a Work container on AMD EPYC 9V74, with 8 reported available logical CPUs. Event-loop numbers come from `monitorEventLoopDelay` with 10ms sampling resolution, so the ~10ms baseline must not be interpreted as a 10ms physics tick. Byte counters count serialized application payloads only: **WS framing/control bytes, TLS and TCP overhead are excluded**. No physics runs and actual snapshot frequency is **0Hz** at this checkpoint; no raw-tick/average/worst tick capacity result can yet be given. Config remains 60Hz sim / 20Hz snapshots / 10Hz resend.

**60Hz race-room capacity: not measured. Actual Render Free CPU, event loop, network/snapshot overhead and capacity: not measured.** The 64-room/256-connection safety caps are assumed operational limits, not benchmark-backed capacity promises. The 0.1 CPU per-user budget must be verified with full physics + serialization + input and socket traffic later on the actual Free instance. Average and worst tick timing overlay is still required when simulation is added. Report any overruns before changing rates; no existing rate was changed here.

## Config and privacy

See `reports/CONFIG_CHANGES.md` for EVERY added/changed key, including `_version` and `_assumed` documentation additions. Existing gameplay values are preserved. New heartbeat policy uses a 3-second last-traffic deadline for silent drops and counts its grace from last traffic, avoiding detection delay plus another 3 seconds. Cellular false-positive behavior must still be checked physically.

Room state and names are memory-only, deleted when their room closes. localStorage has only display-name prefill; sessionStorage has per-tab room/reconnect identity. Application logs contain only startup version/port, no names, tokens, input content or network metadata. Hosting still processes connection metadata. There are no trackers, analytics, ads, payments, account flows or persistent player database. System installed rounded font is used; no font asset is redistributed. Home poster is original inline SVG; eventual race art is original Three.js geometry. No audio exists yet.

## Blocker and next gate

1. User sends the EMPTY GitHub repo URL; verify that the connected GitHub app has write access to it. No pasted secrets.
2. Put the whole tested checkpoint into that repo and only then advance main. No broken/intermediate main pushes.
3. User manually creates Render Free Web Service with `main`, blank root, `npm ci && npm run build`, `npm start`, `/healthz`, one instance, Node24.22.1 and Render PORT. See `docs/RENDER_FREE_SETUP.md`. Confirm zero-spend settings and do not add paid resources.
4. User sends actual Render HTTPS URL. Builder validates HTTP/WS/create/join on it and shares the verified URL immediately. User confirms private iPhone over cellular; report cold/warm behavior separately. User owns the optional free external 10-minute pinger.
5. Build remaining P1 on the live checkpoint and redeploy tested milestones. Keep Phase2/3 gated on full P1 deployed report + user review.

The original handoff was 1:25pm PT; this checkpoint was prepared before 2pm PT. The 5pm P1 target remains conditional on prompt repository/manual hosting access and subsequent successful tests. Delays must shift the estimate rather than cut checks. Feature cut is 7:59pm PT; deadline is 11:59pm PT October31. Free sleep, quotas and restarts remain; uninterrupted availability is not promised.
