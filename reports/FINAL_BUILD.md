# 0.3.15 — live, Nov1 1:11 AM ET

https://raft-rage.onrender.com · tested code `688db7f6947df4902f88efed8fea62d77b5b826d` · boot `c3b3cbaa-497b-4ac6-946a-0e87cdb5965d`. Reload once.

| Check | Result / measurement |
|---|---|
| Full serial suite/typecheck/build | PASS —80/80 in52.494s; zero failures/skips/overrun warnings; typecheck/build pass; all previous cases/assertions/thresholds retained |
| Finish geometry | PASS — chequered stripe spans400u bank to bank; arch posts outside water |
| Finish run-through | PASS — continuous110u/1.2s visual coast past the stripe; authoritative frozen result/time and15s grace preserved |
| Winner confetti | PASS — winner only,72 particles (24 low effects),4 colours;300 cap, fade/expiry/disposal |
| Crocodile turns | PASS — both travel directions, smooth turn at each reversal; same authoritative sine swim/hit positions |
| Capybara icon | PASS — original labelled inline vector with yellow kit |
| Render4rooms/16clients | **FAIL strict scheduling limit** —20.024s;102.313ms lateness exceeds100ms; zero tick overruns; worst tick2.885ms;~59.98/20.00Hz;0.05314CPUcores total |
| Live public race flow | PASS —countdown3.064s; identical results14.977s after first finish; spectator, seats and rematch pass |
| Browser visual check | PASS —readable sign, raft beyond stripe, visible confetti, Capybara icon; zero console errors. Local near-finish placement fixture, not physical mobile evidence |

Causes:180u finish arch covered less than400u river; no water stripe or post-finish run-through/celebration existed. Crocodile art used one fixed heading despite alternating swim velocity. Capybara used a placeholder glyph.

Config: finish arch416u, stripe18u deep/20columns,110u/1.2s coast, confetti72/3s/4colours, crocodile turn softness0.2. All235 baseline diff entries are listed in CONFIG_CHANGES.md/config-diff.json.60/20/10Hz, radius34, restitution0.4 and existing gameplay constants unchanged. FINISH sign raised24u above the beam using existing arch-post size. No downloaded art/audio.

Known issues: physical mobile retest pending. Render Free scheduling stalls remain unresolved: this capacity run exceeded its existing100ms threshold despite zero simulation tick overruns. No test threshold, tolerance or rate was changed. A new turn test caught abrupt reversal; the implementation was smoothed without relaxing the assertion.
