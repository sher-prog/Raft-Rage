# Raft Rage — 0.3.11 checkpoint

| Check | Result |
|---|---|
| Full serial suite, typecheck/build | PASS:69/69,51.168s; zero overrun warnings; original cases/assertions/thresholds retained |
| Chase camera | PASS:river banks/nearby rivals fit at phone/desktop ratios, both edges/every bend, moving turns and resize; no authority state changes |
| Art/effects | PASS:squat distinct animated species, carried log lifecycle, all art inside radius34; batching preserves bounds/colors/animation; instanced puffs retain300 cap/fade/expiry |
| Browser full effects | PASS:no shader errors; one desktop sample59fps/203calls/62,690triangles; not phone performance evidence |
| Render/public0.3.11 | PENDING deployed-build checks |
| Physical Safari/LTE, Android, touch/audio/FPS | PENDING user-operated acceptance |

Cause of zoom defect: a fixed close camera ignored the phone's narrow/short race viewport. The replacement fits river/subject bounds, smoothly follows the route and widens with speed. Upright stretched models are replaced by crouched species-specific rigs with bent limbs, recoil/charge/walk/stun poses. Static components and particles are batched to reduce drawing work.

Config:60/20/10Hz and radius34/restitution0.4 unchanged. Phase 3 visual phone layout68/32; original Phase 1 layout55/45 retained. All210 diff entries (including metadata and declared assumed keys) are in CONFIG_CHANGES.md / config-diff.json. Current art is original procedural work informed by the user's reference; no copied source-game assets.

Known limits:0.3.10 original20s4-room/16-client Render check passed, but its richer60s run had one45.920ms wall-time overrun. Previous versions also had intermittent stalls; raw failures remain. New debug-only wall/thread-CPU and cgroup evidence will identify throttling on the deployed build. Physical mobile acceptance and Free cold wake remain unmeasured. No rate, timing tolerance or overrun limit was relaxed; no paid service/pinger added.
