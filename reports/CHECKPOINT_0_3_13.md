# 0.3.13 — primary colour kits, clear HUD and stun rescue

| Check | Result / measurement |
|---|---|
| Full serial suite, typecheck/build | PASS — 75/75 in 50.929s, zero skips/failures/overrun warnings; every previous case/assertion/threshold retained. Typecheck/build pass. |
| Clothing | PASS — distinct red Hippo, green Frog, blue Bear, yellow Capybara vests/helmets, both teams and batching |
| Recovery | PASS — unavailable before 6 seconds; recurring stun with no progress unlocks; safe upstream rewind, clears stun/slow, 2 seconds stun protection; idle/moving/recovered cases denied |
| Server ownership | PASS — wrong seat, stale epoch, wrong race and spectator denied |
| Render 4 rooms / 16 clients | Pending deployment |

Root cause: spike contact can reapply stun immediately after recovery clears its contact latch; ordinary whack immunity deliberately does not block spikes. Rescue is an explicit user-authorized exception to normal no-teleport movement and never triggers from ordinary wall contact.

Event banners, resources and first-race hints now stay inside the top progress card, leaving the central race view clear. RESCUE · REWIND appears there only when server eligibility is true. Search moves upstream 160u (further if obstructed), checks banks, logs/gate, rocks/hazards and rival clearance. Protection lasts 2 seconds; no general immunity-rule change.

Config: 60/20/10 Hz, radius34 and bank restitution0.4 unchanged. Primary clothing colours and recovery eligibility/search/protection values declared assumed; 224 diff entries listed in CONFIG_CHANGES.md/config-diff.json.

Known issues: strict Render Free capacity previously intermittent due to measured host scheduling/quota delays. Physical mobile retest remains user-operated; browser phone-size preview is not Safari/LTE evidence.
