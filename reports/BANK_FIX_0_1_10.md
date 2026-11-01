# 0.1.10 — physical iPhone retest fixes

| Check | Result | Measured evidence |
|---|---|---|
| Existing tests retained + full suite | PASS | 41/41; 17.307s; original test command/concurrency and assertions retained |
| Both banks + all outer turns | PASS | 1,680 scenarios / 302,400 ticks; speeds 27.5, 55, 120, 240, 430u/s; seven approach angles |
| Containment / no teleport | PASS | Minimum drawn-edge clearance 34u (floating error <1e-9); max displacement 7.166667u, never exceeds incoming velocity × dt |
| Restitution | PASS | Exact 0.4 normal bounce; tangential velocity preserved |
| Full-course human-style streams | PASS | No bots/jumps/rescues; FIRE held and walk held during steering; finish 101.717s / 121.017s; 420 / 1,399 bank-contact ticks |
| Old build regression | FAIL (expected) | Same input exposes 15.49u clearance; 18.63u tick against 2.75u velocity budget |
| Real-time suite tick timing | PASS | Avg 0.781ms / worst 12.275ms; zero overruns in passing run |
| iPhone Safari/LTE retest | PENDING | User-operated physical evidence required |

Problem 1 root cause: collision checked lateral distance to a nearest centreline segment instead of the mitered bank actually drawn, leaving gaps/incorrect boundaries at joins.

Problem 2 root cause: after entering those gaps, a change in nearest segment could apply a large sideways penetration correction; the chase camera also changed direction abruptly at segment joins.

Problem 3: removed the central FINISH/distance overlay; distance and FINISH text remain only in the top progress bars, with the physical arch at the course end.

Position-write audit: normal integration now sweeps the 34u raft circle against the shared drawn-bank edges/endpoints and rocks; bounce uses remaining tick travel only. Raft-to-raft separation is clipped by the same walls. Speed is capped before travel. Keel only changes angular velocity. Bot stuck logic only changes aim after configured no-progress window; it never assigns position. Spawn and explicitly authorized debug-host jumps are the only deliberate relocations. Old direct overlap helpers remain solely for existing invalid-state test fixtures and have no normal gameplay callers. Camera direction now blends with the existing follow-rate settings.

Config: `_version` → `1.8-swept-banks (2026-10-31)`; added `course.bank_end_extension=600` and `simulation.collision_iterations=8`, both declared in group `_assumed`. The extension is shared by drawing and collision behind start / beyond finish. At the collision iteration limit, movement stops at the last safe contact. All previous gameplay values preserved; 60/20/10Hz unchanged. No auto-rescue or teleport added.

Known issues: physical retest still pending; full Phase 1 device acceptance remains open. Earlier local runs hit the unchanged zero-overrun assertion; broad-phase culling was added before the passing run. Automatic approval review rejected a proposed serial test command as conflicting with the no-weakening rule; the command remains unchanged. Render deployment/performance evidence will be appended to the delivered copy after verification. Phase 1 features already exist; remaining independent work is public multi-client acceptance and final-load verification, followed by user-operated physical checks.
