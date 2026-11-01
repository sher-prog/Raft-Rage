# Final polish checkpoints

Baseline tag: pre-polish → de47c327d0645d2e019c34fbd39ea291d367fe51. Intermediate pushes skip Render; one final deployment. Feature freeze, bug fixes and small polish only. No changes to physics, simulation, rates, protected constants or test thresholds.

| Item | Build | Full serial suite | Result |
|---|---|---|---|
|1 Rejoin A/B + bounded automatic retry|0.3.16|83/83,60.136s,0 overrun warnings|PASS|
|2 Errors only under entry name field; clear on exit|0.3.17|83/83,62.372s,0 overrun warnings|PASS|
|3 Phone scorecards|0.3.18|83/83,56.544s,0 overrun warnings|PASS —375px page/viewport,all20 cells fit,★ retained|
|4 Touch-pad fallback|0.3.19|84/84,54.932s,0 overrun warnings|PASS —touch+fine/coarse cases at375/390/780px|
|5 In-page race leave confirmation|0.3.20|84/84,55.483s,0 overrun warnings|PASS —Stay retains race; confirmed Leave returns Home without errors|
|6 Matching lobby portraits/stat lines/banner|0.3.21|85/85,55.845s,0 overrun warnings|PASS —375px,4 portraits,12 separate stat lines; migration banner unchanged|
