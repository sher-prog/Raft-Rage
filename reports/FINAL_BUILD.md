# Raft Rage — 9:10 PM PT status

Live: https://raft-rage.onrender.com · build **0.3.12** · tested code commit `86f2d083cd42b3dbca8dffc6706fd31de93a5835` (9:01:27 PM PT). Reload the page once to load the updated client.

| Check | Result / measured numbers |
|---|---|
| Complete serial suite/typecheck/build | PASS — 70/70,54.085s; no deleted/skipped/relaxed cases or thresholds |
| Strict local timing check | PASS — zero overruns; one separate local integration warning occurred |
| Full Phase 3 bank stress | PASS — 1,680 impact scenarios /302,400ticks; minimum clearance34.000650u for radius34; both human-style full-course runs pass |
| Camera/art/client rendering | PASS — viewport/river/nearby-rival projection tests, crouched animated species, carried-log lifecycle and art bounds; desktop browser error log empty |
| Render4rooms/16clients — realistic60s | PASS — 60.054s;0overruns;worst3.074ms;59.995–60.013Hz sim;~19.999Hz snapshots;0.05682CPUcores total |
| Render4rooms/16clients — retained extra traffic | PASS — 20.077s;0overruns;worst0.421ms;~60.02/20.02Hz;one additional active room reported |
| Render4rooms/16clients — original20s | **FAIL — one41.326ms overrun**;~59.97/19.97Hz;0.05531CPUcores total |
| Public race flow | PASS — countdown3.061s;identical results received14.963s after first finish; spectator/rematch/seats pass |
| Physical Safari/LTE,Android,touch/audio/FPS | PENDING user-operated acceptance |

The close fixed zoom is replaced by a smooth, route-aligned chase camera that fits the river width and nearby opponents, with speed widening. Phone race view is68%/controls32% in Phase3; original Phase1 layout55/45 is retained. Animals now have distinct crouched silhouettes, bent limbs and animated walk/charge/recoil/stun poses. Layered raft/deck/rope art and the visible bow log remain; throwing clears the carried model. Static art and puffs are batched. One full-detail desktop sample was59fps/203draw calls/62,690triangles; this is not an iPhone FPS claim.

**Remaining issue:** strict Render capacity is intermittent, so full acceptance is not claimed. A previous overrun was20.582ms wall time but1.053ms actual thread CPU; Linux counters measured quota15,000µs/100,000µs and CPU throttling. The final60s run also recorded throttling despite zero tick overruns. These measurements support host scheduling/quota delays as a contributor; snapshot pacing reduces bursts but does not guarantee zero future stalls on Free hosting.

Config:60/20/10Hz,34radius and0.4bank restitution retained. All210 config diff entries, including metadata and declared assumed visual/debug keys, are in CONFIG_CHANGES.md/config-diff.json. Earlier failed runs remain in reports. No rates, timing tolerances or overrun limits weakened; no paid service or pinger added. Physical mobile acceptance and Free cold wake remain unmeasured.
