# 0.3.14 — finish celebration, crocodile turns and Capybara icon

| Check | Result / measurement |
|---|---|
| Full serial suite/typecheck/build | PASS —80/80 in44.332s; zero failures/skips/overrun warnings; typecheck/build pass; all existing cases/assertions/thresholds retained |
| Finish geometry | PASS — chequered stripe spans400u bank to bank; arch posts outside water |
| Finish run-through | PASS — continuous110u/1.2s visual coast past the stripe; authoritative frozen result/time and15s grace preserved |
| Winner confetti | PASS — winner only,72 particles (24 low effects),4 colours;300 cap, fade/expiry/disposal |
| Crocodile turns | PASS — both travel directions, smooth turn at each reversal; same authoritative sine swim/hit positions |
| Capybara icon | PASS — original labelled inline vector with yellow kit |
| Render4rooms/16clients | Pending deployment |

Causes:180u finish arch covered less than400u river; no water stripe or post-finish run-through/celebration existed. Crocodile art used one fixed heading despite alternating swim velocity. Capybara used a placeholder glyph.

Config: finish arch416u, stripe18u deep/20columns,110u/1.2s coast, confetti72/3s/4colours, crocodile turn softness0.2. All235 baseline diff entries are listed in CONFIG_CHANGES.md/config-diff.json.60/20/10Hz, radius34, restitution0.4 and existing gameplay constants unchanged. No downloaded art/audio.

Known issues: physical mobile retest pending. Prior Render Free scheduling/quota stalls remain a risk even if this measured load run passes. First local attempt could not open sockets due to restricted network access; access restored. New turn test initially caught an abrupt visual reversal; implementation smoothed without relaxing the assertion.
