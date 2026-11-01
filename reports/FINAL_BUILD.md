# Raft Rage — 0.3.10 checkpoint

| Check | Result |
|---|---|
| Full serial suite / build / typecheck | PASS: 64/64, 46.075s, zero warnings; original tests and thresholds retained |
| Log pickup/throw art | PASS: authoritative snapshots attach/detach the bow log; browser shows LOG AWAY on throw |
| Reference readability | PASS: layered tubes, plank deck, rope/ties, closer camera and taller characters; every art vertex remains within radius34 |
| Full-course human wall stress | PASS: 1,680 impacts plus both full-course committed input runs; no displacement/bank bounds relaxed |
| Render / public deployed checks | PENDING 0.3.10 measurement |
| Physical Safari/LTE, Android, touch/audio/FPS | PENDING user-operated checks |

Cause of missing log: carried item state had no attached raft model; only the projectile had a mesh. The new carried model tracks the authoritative item field, including late snapshots and throw removal.

Config: 60/20/10Hz and collision radius34/restitution0.4 retained. Camera110/130/80, FOV55; responsive pullback, taller character proportions and detailed raft geometry. All 12 new visual keys are declared assumed. CONFIG_CHANGES.md / config-diff.json list all 190 diff entries including metadata. Original modular art uses the user's reference for direction; no source-game meshes/textures copied.

Known issues: 0.3.9 Render capacity is intermittent: one pass then a final-boot failure with a 41.976ms tick. Earlier 0.3.8 failures also remain recorded. No load threshold was relaxed. Original benchmark-races.mjs remains unchanged; richer benchmark-final.mjs retains ~19Hz combined resend/polling stress (label corrected), while benchmark-game-input.mjs separately matches real state-change inputs. Final 0.3.10 measurements follow deployment. Physical mobile/audio acceptance and Free cold wake remain unmeasured; no paid service or pinger added.
