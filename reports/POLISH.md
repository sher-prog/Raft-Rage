# Final polish checkpoints

Baseline tag: pre-polish → de47c327d0645d2e019c34fbd39ea291d367fe51. Intermediate pushes skip Render; one final deployment. Feature freeze, bug fixes and small polish only. No changes to physics, simulation, rates, protected constants or test thresholds.

| Item | Build | Full serial suite | Result |
|---|---|---|---|
|1 Rejoin A/B + bounded automatic retry|0.3.16|83/83,60.136s,0 overrun warnings|PASS|
|2 Errors only under entry name field; clear on exit|0.3.17|83/83,62.372s,0 overrun warnings|PASS|
